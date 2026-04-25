import type { Prisma } from '@prisma/client';
import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import { type ProcessNodeInput, validateProcessStructure } from './process-config.service';

const REQUIRED_ACTIONS = ['APPROVE', 'REJECT'] as const;

type ProcessConfigClient = Prisma.TransactionClient | typeof prisma;

type ApprovalProcessDetail = Prisma.ApprovalProcessGetPayload<{
  include: {
    creator: { select: { id: true; realName: true } };
    _count: { select: { nodes: true } };
    nodes: {
      include: {
        approverUser: { select: { id: true; realName: true; status: true } };
        approverRole: { select: { id: true; code: true; name: true } };
      };
    };
  };
}>;

export type SaveApprovalProcessInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  creatorId: number;
  nodes: ProcessNodeInput[];
};

export type UpdateApprovalProcessInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  nodes: ProcessNodeInput[];
};

const ProcessNodeBody = t.Object({
  name: t.String(),
  order: t.Number(),
  approverSourceType: t.Union([
    t.Literal('USER'),
    t.Literal('ROLE'),
    t.Literal('DEPARTMENT_MANAGER'),
  ]),
  approverUserId: t.Optional(t.Nullable(t.Number())),
  approverRoleId: t.Optional(t.Nullable(t.Number())),
});

const ProcessBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
  description: t.Optional(t.Nullable(t.String())),
  isActive: t.Optional(t.Boolean()),
  nodes: t.Array(ProcessNodeBody),
});

function getProcessInclude() {
  return {
    creator: { select: { id: true, realName: true } },
    _count: { select: { nodes: true } },
    nodes: {
      include: {
        approverUser: { select: { id: true, realName: true, status: true } },
        approverRole: { select: { id: true, code: true, name: true } },
      },
      orderBy: { order: 'asc' as const },
    },
  };
}

function assertNodeOrder(nodes: ProcessNodeInput[]): void {
  if (nodes.length === 0) return;

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

function assertDepartmentManagerNode(node: ProcessNodeInput): void {
  if (node.approverSourceType !== 'DEPARTMENT_MANAGER') return;
  if (node.approverUserId || node.approverRoleId) {
    throw new BizError(
      '部门负责人节点不能配置固定用户或角色',
      400,
      'DEPARTMENT_MANAGER_NODE_INVALID',
    );
  }
}

function normalizeNode(processId: number, node: ProcessNodeInput) {
  assertDepartmentManagerNode(node);

  return {
    processId,
    name: node.name,
    order: node.order,
    approverSourceType: node.approverSourceType,
    approverUserId: node.approverSourceType === 'USER' ? (node.approverUserId ?? null) : null,
    approverRoleId: node.approverSourceType === 'ROLE' ? (node.approverRoleId ?? null) : null,
  };
}

async function loadProcessDetail(
  client: ProcessConfigClient,
  processId: number,
): Promise<ApprovalProcessDetail> {
  const process = await client.approvalProcess.findUnique({
    where: { id: processId },
    include: getProcessInclude(),
  });
  if (!process) {
    throw notFound('审批流程不存在');
  }
  return process;
}

function serializeNode(node: ApprovalProcessDetail['nodes'][number]) {
  return {
    ...node,
    requiredActions: REQUIRED_ACTIONS,
  };
}

function serializeProcess(process: ApprovalProcessDetail) {
  return {
    ...process,
    nodeCount: process._count.nodes,
    nodes: process.nodes.map(serializeNode),
  };
}

async function assertNotBoundByPublishedApprovalTemplate(processId: number): Promise<void> {
  const count = await prisma.formTemplate.count({
    where: {
      approvalProcessId: processId,
      businessMode: 'APPROVAL_REQUIRED',
      status: 'PUBLISHED',
    },
  });

  if (count > 0) {
    throw new BizError(
      '已发布需审批模板正在引用该流程，不能停用',
      400,
      'APPROVAL_PROCESS_BOUND_BY_PUBLISHED_TEMPLATE',
    );
  }
}

export async function createApprovalProcessConfig(
  input: SaveApprovalProcessInput,
): Promise<ApprovalProcessDetail> {
  assertNodeOrder(input.nodes);

  return prisma.$transaction(async (tx) => {
    const process = await tx.approvalProcess.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        creatorId: input.creatorId,
      },
    });

    if (input.nodes.length > 0) {
      await tx.approvalProcessNode.createMany({
        data: input.nodes.map((node) => normalizeNode(process.id, node)),
      });
    }

    await validateProcessStructure(process.id, tx);
    return loadProcessDetail(tx, process.id);
  });
}

export async function updateApprovalProcessConfig(
  processId: number,
  input: UpdateApprovalProcessInput,
): Promise<ApprovalProcessDetail> {
  assertNodeOrder(input.nodes);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.approvalProcess.findUnique({ where: { id: processId } });
    if (!existing) {
      throw notFound('审批流程不存在');
    }

    if (existing.isActive && input.isActive === false) {
      await assertNotBoundByPublishedApprovalTemplate(processId);
    }

    await tx.approvalProcess.update({
      where: { id: processId },
      data: {
        name: input.name,
        description: input.description ?? null,
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
    await tx.approvalProcessNode.deleteMany({ where: { processId } });

    if (input.nodes.length > 0) {
      await tx.approvalProcessNode.createMany({
        data: input.nodes.map((node) => normalizeNode(processId, node)),
      });
    }

    await validateProcessStructure(processId, tx);
    return loadProcessDetail(tx, processId);
  });
}

export const approvalProcessModule = new Elysia({ prefix: '/approval/processes' })
  .use(authGuard('approval:process:list'))
  .get(
    '/',
    async ({ query }: any) => {
      const page = Number(query.page) || 1;
      const size = Number(query.size) || 10;
      const where: Prisma.ApprovalProcessWhereInput = {};

      if (query.isActive !== undefined && query.isActive !== '') {
        where.isActive = query.isActive === true || query.isActive === 'true';
      }
      if (query.keyword?.trim()) {
        const keyword = query.keyword.trim();
        where.OR = [
          { name: { contains: keyword } },
          { description: { contains: keyword } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.approvalProcess.findMany({
          where,
          include: getProcessInclude(),
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * size,
          take: size,
        }),
        prisma.approvalProcess.count({ where }),
      ]);

      return { rows: rows.map(serializeProcess), total, page, size };
    },
    {
      query: t.Object({
        isActive: t.Optional(t.String()),
        keyword: t.Optional(t.String()),
        page: t.Optional(t.String()),
        size: t.Optional(t.String()),
      }),
    },
  )
  .get('/:id', async ({ params }: any) => serializeProcess(await loadProcessDetail(prisma, Number(params.id))), {
    params: t.Object({ id: t.String() }),
  })
  .guard({}, (app) =>
    app.use(authGuard('approval:process:create')).post(
      '/',
      async ({ body, currentUser }: any) =>
        serializeProcess(
          await createApprovalProcessConfig({
            name: body.name,
            description: body.description ?? null,
            isActive: body.isActive,
            creatorId: currentUser.id,
            nodes: body.nodes,
          }),
        ),
      { body: ProcessBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('approval:process:update')).put(
      '/:id',
      async ({ params, body }: any) =>
        serializeProcess(
          await updateApprovalProcessConfig(Number(params.id), {
            name: body.name,
            description: body.description ?? null,
            isActive: body.isActive,
            nodes: body.nodes,
          }),
        ),
      {
        params: t.Object({ id: t.String() }),
        body: ProcessBody,
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('approval:process:update')).patch(
      '/:id/status',
      async ({ params, body }: any) => {
        const id = Number(params.id);
        const process = await prisma.approvalProcess.findUnique({ where: { id } });
        if (!process) throw notFound('审批流程不存在');

        if (body.isActive === false) {
          await assertNotBoundByPublishedApprovalTemplate(id);
        } else {
          await validateProcessStructure(id);
        }

        const updated = await prisma.approvalProcess.update({
          where: { id },
          data: { isActive: body.isActive },
          include: getProcessInclude(),
        });
        return serializeProcess(updated);
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({ isActive: t.Boolean() }),
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('approval:process:delete')).delete(
      '/:id',
      async ({ params }: any) => {
        const id = Number(params.id);
        const process = await prisma.approvalProcess.findUnique({ where: { id } });
        if (!process) throw notFound('审批流程不存在');

        await assertNotBoundByPublishedApprovalTemplate(id);
        await prisma.approvalProcess.delete({ where: { id } });
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    ),
  )
  .post(
    '/:id/validate',
    async ({ params }: any) => {
      await validateProcessStructure(Number(params.id));
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
