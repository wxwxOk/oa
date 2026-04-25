import type { Prisma } from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import type { ApprovalProcessSnapshot } from './application.service';

export type ProcessNodeInput = {
  name: string;
  order: number;
  approverSourceType: 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
  approverUserId?: number | null;
  approverRoleId?: number | null;
};

type ProcessConfigClient = Prisma.TransactionClient | typeof prisma;

type ProcessWithNodes = Prisma.ApprovalProcessGetPayload<{
  include: {
    nodes: {
      include: {
        approverUser: true;
        approverRole: true;
      };
    };
  };
}>;

async function loadProcessWithNodes(
  processId: number,
  client: ProcessConfigClient = prisma,
): Promise<ProcessWithNodes> {
  const process = await client.approvalProcess.findUnique({
    where: { id: processId },
    include: {
      nodes: {
        include: {
          approverUser: true,
          approverRole: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!process) {
    throw notFound('审批流程不存在');
  }

  return process;
}

async function getActiveRoleUsers(roleId: number, client: ProcessConfigClient = prisma) {
  return client.userRole.findMany({
    where: {
      roleId,
      user: { status: 'ACTIVE' },
    },
    include: {
      user: {
        select: {
          id: true,
          realName: true,
          status: true,
        },
      },
    },
    orderBy: { userId: 'asc' },
  });
}

function assertValidNodeOrder(nodes: ProcessWithNodes['nodes']): void {
  const orders = nodes.map((node) => node.order);
  const uniqueOrders = new Set(orders);
  const contiguous = [...orders].sort((a, b) => a - b).every((order, index) => order === index + 1);

  if (orders.some((order) => order <= 0) || uniqueOrders.size !== orders.length || !contiguous) {
    throw new BizError(
      '审批节点顺序必须从 1 开始且不能重复',
      400,
      'APPROVAL_PROCESS_NODE_ORDER_INVALID',
    );
  }
}

export async function validateProcessStructure(
  processId: number,
  client: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
): Promise<void> {
  const activeClient = client as ProcessConfigClient;
  const process = await loadProcessWithNodes(processId, activeClient);

  if (process.nodes.length === 0) {
    throw new BizError('至少添加 1 个审批节点', 400, 'APPROVAL_PROCESS_NO_NODES');
  }

  assertValidNodeOrder(process.nodes);

  for (const node of process.nodes) {
    if (!node.name.trim()) {
      throw new BizError('审批节点名称不能为空', 400, 'APPROVAL_PROCESS_NODE_NAME_REQUIRED');
    }

    if (node.approverSourceType === 'USER') {
      if (!node.approverUser || node.approverUser.status !== 'ACTIVE') {
        throw new BizError('固定用户审批节点必须选择启用用户', 400, 'APPROVER_USER_INVALID');
      }
      continue;
    }

    if (node.approverSourceType === 'ROLE') {
      if (!node.approverRoleId) {
        throw new BizError('角色审批人必须恰好 1 个启用用户', 400, 'APPROVER_ROLE_USER_COUNT_INVALID');
      }

      const users = await getActiveRoleUsers(node.approverRoleId, activeClient);
      if (users.length !== 1) {
        throw new BizError(
          '角色审批人必须恰好 1 个启用用户',
          400,
          'APPROVER_ROLE_USER_COUNT_INVALID',
        );
      }
      continue;
    }

    if (node.approverUserId || node.approverRoleId) {
      throw new BizError(
        '部门负责人节点不能配置固定用户或角色',
        400,
        'DEPARTMENT_MANAGER_NODE_INVALID',
      );
    }
  }
}

export async function validateProcessDefinition(
  processId: number,
  client: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
): Promise<void> {
  const activeClient = client as ProcessConfigClient;
  await validateProcessStructure(processId, client);

  const process = await activeClient.approvalProcess.findUnique({
    where: { id: processId },
    select: { isActive: true },
  });
  if (!process) {
    throw notFound('审批流程不存在');
  }
  if (!process.isActive) {
    throw new BizError('审批流程已停用', 400, 'APPROVAL_PROCESS_INACTIVE');
  }
}

export async function resolveDepartmentApprover(
  departmentId: number | null,
  applicantId: number,
): Promise<{ id: number; realName: string }> {
  if (departmentId == null) {
    throw new BizError(
      '不能解析提交人部门负责人，请维护部门负责人',
      400,
      'DEPARTMENT_MANAGER_NOT_RESOLVED',
    );
  }

  let currentDepartmentId: number | null = departmentId;

  while (currentDepartmentId != null) {
    const department = await prisma.department.findUnique({
      where: { id: currentDepartmentId },
      include: {
        defaultApprover: {
          select: {
            id: true,
            realName: true,
            status: true,
          },
        },
      },
    });

    if (!department) {
      break;
    }

    const approver = department.defaultApprover;
    if (approver?.status === 'ACTIVE' && approver.id !== applicantId) {
      return { id: approver.id, realName: approver.realName };
    }

    currentDepartmentId = department.parentId;
  }

  throw new BizError(
    '不能解析提交人部门负责人，请维护部门负责人',
    400,
    'DEPARTMENT_MANAGER_NOT_RESOLVED',
  );
}

export async function resolveProcessSnapshot(
  processId: number,
  applicantId: number,
): Promise<ApprovalProcessSnapshot> {
  await validateProcessDefinition(processId);

  const [process, applicant] = await Promise.all([
    loadProcessWithNodes(processId),
    prisma.user.findUnique({
      where: { id: applicantId },
      select: {
        id: true,
        departmentId: true,
      },
    }),
  ]);

  if (!applicant) {
    throw notFound('提交人不存在');
  }

  const nodes: ApprovalProcessSnapshot['nodes'] = [];

  for (const node of process.nodes) {
    if (node.approverSourceType === 'USER') {
      const user = node.approverUser;
      if (!user || user.status !== 'ACTIVE') {
        throw new BizError('固定用户审批节点必须选择启用用户', 400, 'APPROVER_USER_INVALID');
      }

      nodes.push({
        order: node.order,
        name: node.name,
        approverSourceType: node.approverSourceType,
        approverUserId: user.id,
        approverRoleId: null,
        assigneeId: user.id,
        assigneeName: user.realName,
        approverSourceLabel: `固定用户: ${user.realName}`,
      });
      continue;
    }

    if (node.approverSourceType === 'ROLE') {
      if (!node.approverRoleId || !node.approverRole) {
        throw new BizError('角色审批人必须恰好 1 个启用用户', 400, 'APPROVER_ROLE_USER_COUNT_INVALID');
      }

      const roleUsers = await getActiveRoleUsers(node.approverRoleId);
      if (roleUsers.length !== 1) {
        throw new BizError(
          '角色审批人必须恰好 1 个启用用户',
          400,
          'APPROVER_ROLE_USER_COUNT_INVALID',
        );
      }

      const assignee = roleUsers[0].user;
      nodes.push({
        order: node.order,
        name: node.name,
        approverSourceType: node.approverSourceType,
        approverUserId: null,
        approverRoleId: node.approverRoleId,
        assigneeId: assignee.id,
        assigneeName: assignee.realName,
        approverSourceLabel: `角色: ${node.approverRole.name}`,
      });
      continue;
    }

    const assignee = await resolveDepartmentApprover(applicant.departmentId, applicantId);
    nodes.push({
      order: node.order,
      name: node.name,
      approverSourceType: node.approverSourceType,
      approverUserId: null,
      approverRoleId: null,
      assigneeId: assignee.id,
      assigneeName: assignee.realName,
      approverSourceLabel: '提交人部门负责人',
    });
  }

  return {
    processId: process.id,
    processName: process.name,
    nodes: nodes.sort((a, b) => a.order - b.order),
  };
}
