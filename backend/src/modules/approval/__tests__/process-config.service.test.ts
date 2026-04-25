import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  resolveDepartmentApprover,
  resolveProcessSnapshot,
  validateProcessDefinition,
  validateProcessStructure,
} from '../process-config.service';

async function setupProcessConfigFixture() {
  const fixedApprover = await prisma.user.create({
    data: {
      username: 'fixed-approver',
      password: 'hashed-password',
      realName: '固定审批人',
    },
  });

  const disabledFixedApprover = await prisma.user.create({
    data: {
      username: 'disabled-fixed-approver',
      password: 'hashed-password',
      realName: '停用审批人',
      status: 'DISABLED',
    },
  });

  const parentDepartment = await prisma.department.create({
    data: {
      name: '总部',
      defaultApproverId: fixedApprover.id,
    },
  });

  const applicant = await prisma.user.create({
    data: {
      username: 'applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: parentDepartment.id,
    },
  });

  const childDepartment = await prisma.department.create({
    data: {
      name: '研发部',
      parentId: parentDepartment.id,
      defaultApproverId: fixedApprover.id,
    },
  });

  await prisma.user.update({
    where: { id: applicant.id },
    data: { departmentId: childDepartment.id },
  });

  const roleWithZeroActiveUsers = await prisma.role.create({
    data: { code: 'ROLE_ZERO_ACTIVE', name: '无启用成员角色' },
  });
  const roleWithOneActiveUser = await prisma.role.create({
    data: { code: 'ROLE_ONE_ACTIVE', name: '单启用成员角色' },
  });
  const roleWithTwoActiveUsers = await prisma.role.create({
    data: { code: 'ROLE_TWO_ACTIVE', name: '多启用成员角色' },
  });

  const roleApprover = await prisma.user.create({
    data: {
      username: 'role-approver',
      password: 'hashed-password',
      realName: '角色审批人',
    },
  });
  const roleApproverA = await prisma.user.create({
    data: {
      username: 'role-approver-a',
      password: 'hashed-password',
      realName: '角色审批人A',
    },
  });
  const roleApproverB = await prisma.user.create({
    data: {
      username: 'role-approver-b',
      password: 'hashed-password',
      realName: '角色审批人B',
    },
  });

  await prisma.userRole.createMany({
    data: [
      { userId: roleApprover.id, roleId: roleWithOneActiveUser.id },
      { userId: roleApproverA.id, roleId: roleWithTwoActiveUsers.id },
      { userId: roleApproverB.id, roleId: roleWithTwoActiveUsers.id },
    ],
  });

  return {
    applicant,
    fixedApprover,
    disabledFixedApprover,
    parentDepartment,
    childDepartment,
    roleWithZeroActiveUsers,
    roleWithOneActiveUser,
    roleWithTwoActiveUsers,
  };
}

async function createProcess(
  creatorId: number,
  nodes: Array<{
    name: string;
    order: number;
    approverSourceType: 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
    approverUserId?: number | null;
    approverRoleId?: number | null;
  }>,
  isActive = true,
) {
  const process = await prisma.approvalProcess.create({
    data: {
      name: `流程-${Date.now()}-${Math.random()}`,
      creatorId,
      isActive,
    },
  });

  if (nodes.length) {
    await prisma.approvalProcessNode.createMany({
      data: nodes.map((node) => ({
        processId: process.id,
        name: node.name,
        order: node.order,
        approverSourceType: node.approverSourceType,
        approverUserId: node.approverUserId ?? null,
        approverRoleId: node.approverRoleId ?? null,
      })),
    });
  }

  return process;
}

describe('process config service', () => {
  beforeEach(async () => {
    await prisma.approvalTimelineEvent.deleteMany();
    await prisma.approvalAction.deleteMany();
    await prisma.approvalTask.deleteMany();
    await prisma.approvalApplication.deleteMany();
    await prisma.approvalProcessNode.deleteMany();
    await prisma.approvalProcess.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.shareLink.deleteMany();
    await prisma.formTemplate.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.role.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accepts single-node fixed-user process with active user', async () => {
    const { applicant, fixedApprover } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, [
      {
        name: '固定审批',
        order: 1,
        approverSourceType: 'USER',
        approverUserId: fixedApprover.id,
      },
    ]);

    await expect(validateProcessDefinition(process.id)).resolves.toBeUndefined();
  });

  it('accepts serial multi-node process', async () => {
    const { applicant, fixedApprover, roleWithOneActiveUser } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, [
      {
        name: '角色审批',
        order: 2,
        approverSourceType: 'ROLE',
        approverRoleId: roleWithOneActiveUser.id,
      },
      {
        name: '固定审批',
        order: 1,
        approverSourceType: 'USER',
        approverUserId: fixedApprover.id,
      },
    ]);

    await expect(validateProcessDefinition(process.id)).resolves.toBeUndefined();

    const snapshot = await resolveProcessSnapshot(process.id, applicant.id);

    expect(snapshot.nodes.map((node) => node.order)).toEqual([1, 2]);
  });

  it('rejects no-node process', async () => {
    const { applicant } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, []);

    await expect(validateProcessDefinition(process.id)).rejects.toThrow('至少添加 1 个审批节点');
  });

  it('rejects disabled fixed user', async () => {
    const { applicant, disabledFixedApprover } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, [
      {
        name: '停用固定审批',
        order: 1,
        approverSourceType: 'USER',
        approverUserId: disabledFixedApprover.id,
      },
    ]);

    await expect(validateProcessDefinition(process.id)).rejects.toThrow('固定用户');
  });

  it('rejects role source with zero active users', async () => {
    const { applicant, roleWithZeroActiveUsers } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, [
      {
        name: '空角色审批',
        order: 1,
        approverSourceType: 'ROLE',
        approverRoleId: roleWithZeroActiveUsers.id,
      },
    ]);

    await expect(validateProcessDefinition(process.id)).rejects.toThrow('角色审批人必须恰好 1 个启用用户');
  });

  it('rejects role source with more than one active user', async () => {
    const { applicant, roleWithTwoActiveUsers } = await setupProcessConfigFixture();
    const process = await createProcess(applicant.id, [
      {
        name: '多角色审批',
        order: 1,
        approverSourceType: 'ROLE',
        approverRoleId: roleWithTwoActiveUsers.id,
      },
    ]);

    await expect(validateProcessDefinition(process.id)).rejects.toThrow('角色审批人必须恰好 1 个启用用户');
  });

  it('resolves department manager by current department', async () => {
    const { applicant, childDepartment, fixedApprover } = await setupProcessConfigFixture();

    const approver = await resolveDepartmentApprover(childDepartment.id, applicant.id);

    expect(approver).toEqual({ id: fixedApprover.id, realName: fixedApprover.realName });
  });

  it('walks parent departments when child has no default approver', async () => {
    const { applicant, childDepartment, parentDepartment, fixedApprover } = await setupProcessConfigFixture();
    await prisma.department.update({
      where: { id: childDepartment.id },
      data: { defaultApproverId: null },
    });

    const approver = await resolveDepartmentApprover(childDepartment.id, applicant.id);

    expect(approver).toEqual({ id: fixedApprover.id, realName: fixedApprover.realName });
    expect(parentDepartment.defaultApproverId).toBe(fixedApprover.id);
  });

  it('avoids applicant self-approval and throws when no alternative exists', async () => {
    const { applicant, childDepartment, parentDepartment } = await setupProcessConfigFixture();
    await prisma.department.update({
      where: { id: childDepartment.id },
      data: { defaultApproverId: applicant.id },
    });
    await prisma.department.update({
      where: { id: parentDepartment.id },
      data: { defaultApproverId: null },
    });

    const process = await createProcess(applicant.id, [
      {
        name: '部门负责人审批',
        order: 1,
        approverSourceType: 'DEPARTMENT_MANAGER',
      },
    ]);

    await expect(resolveProcessSnapshot(process.id, applicant.id)).rejects.toThrow('不能解析提交人部门负责人');
  });

  it('allows inactive process to pass structural validation', async () => {
    const { applicant, fixedApprover } = await setupProcessConfigFixture();
    const process = await createProcess(
      applicant.id,
      [
        {
          name: '固定审批',
          order: 1,
          approverSourceType: 'USER',
          approverUserId: fixedApprover.id,
        },
      ],
      false,
    );

    await expect(validateProcessStructure(process.id)).resolves.toBeUndefined();
  });

  it('rejects inactive process for active runtime validation', async () => {
    const { applicant, fixedApprover } = await setupProcessConfigFixture();
    const process = await createProcess(
      applicant.id,
      [
        {
          name: '固定审批',
          order: 1,
          approverSourceType: 'USER',
          approverUserId: fixedApprover.id,
        },
      ],
      false,
    );

    await expect(validateProcessDefinition(process.id)).rejects.toThrow('审批流程已停用');
  });
});
