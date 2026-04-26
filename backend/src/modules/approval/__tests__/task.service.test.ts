import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  approveTask,
  createDraftApplication,
  submitApplication,
} from '../application.service';
import {
  approveApprovalTask,
  commentApprovalTask,
  getApprovalTaskDetail,
  listApprovalTasks,
  rejectApprovalTask,
} from '../task.service';

const requiredSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'reason', type: 'text', label: '申请事由', required: true, colSpan: 12 },
      ],
    },
  ],
};

const validFormData = { reason: '年度调休' };

async function cleanApprovalData() {
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
}

async function setupTaskFixture() {
  const department = await prisma.department.create({ data: { name: '研发部' } });
  const otherDepartment = await prisma.department.create({ data: { name: '财务部' } });

  const applicant = await prisma.user.create({
    data: {
      username: 'phase18-applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: department.id,
    },
  });
  const otherApplicant = await prisma.user.create({
    data: {
      username: 'phase18-other-applicant',
      password: 'hashed-password',
      realName: '其他申请人',
      departmentId: otherDepartment.id,
    },
  });
  const approver1 = await prisma.user.create({
    data: {
      username: 'phase18-approver1',
      password: 'hashed-password',
      realName: '一级审批人',
      departmentId: department.id,
    },
  });
  const approver2 = await prisma.user.create({
    data: {
      username: 'phase18-approver2',
      password: 'hashed-password',
      realName: '二级审批人',
      departmentId: otherDepartment.id,
    },
  });

  const template = await prisma.formTemplate.create({
    data: {
      name: '请假申请',
      schema: requiredSchema,
      schemaVersion: 5,
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      creatorId: applicant.id,
    },
  });
  const process = await prisma.approvalProcess.create({
    data: { name: '请假审批流程', creatorId: applicant.id },
  });

  const processSnapshot = {
    processId: process.id,
    processName: process.name,
    nodes: [
      {
        order: 1,
        name: '部门负责人审批',
        approverSourceType: 'USER' as const,
        approverUserId: approver1.id,
        assigneeId: approver1.id,
        assigneeName: approver1.realName,
        approverSourceLabel: '固定用户: 一级审批人',
      },
      {
        order: 2,
        name: '总经理审批',
        approverSourceType: 'USER' as const,
        approverUserId: approver2.id,
        assigneeId: approver2.id,
        assigneeName: approver2.realName,
        approverSourceLabel: '固定用户: 二级审批人',
      },
    ],
  };

  const draft = await createDraftApplication({
    applicationNo: `APP-${Date.now()}-${Math.random()}`,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.schemaVersion,
    applicantId: applicant.id,
    applicantName: applicant.realName,
    applicantDepartmentId: department.id,
    applicantDepartmentName: department.name,
    formData: validFormData,
    schemaSnapshot: requiredSchema,
    processSnapshot,
  });
  const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });

  const foreignDraft = await createDraftApplication({
    applicationNo: `APP-${Date.now()}-${Math.random()}-FOREIGN`,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.schemaVersion,
    applicantId: otherApplicant.id,
    applicantName: otherApplicant.realName,
    applicantDepartmentId: otherDepartment.id,
    applicantDepartmentName: otherDepartment.name,
    formData: { reason: '其他申请' },
    schemaSnapshot: requiredSchema,
    processSnapshot: {
      ...processSnapshot,
      nodes: [{ ...processSnapshot.nodes[0], assigneeId: approver2.id, assigneeName: approver2.realName }],
    },
  });
  await submitApplication(foreignDraft.id, { id: otherApplicant.id, name: otherApplicant.realName });

  const firstTask = await prisma.approvalTask.findFirstOrThrow({
    where: { applicationId: submitted.id, nodeOrder: 1 },
  });

  return { department, applicant, otherApplicant, approver1, approver2, template, submitted, firstTask };
}

describe('approval task service', () => {
  beforeEach(async () => {
    await cleanApprovalData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pending assignee list returns only current approver tasks with filters', async () => {
    const { approver1, approver2, template, department } = await setupTaskFixture();

    const pending = await listApprovalTasks(
      { id: approver1.id, name: approver1.realName },
      {
        view: 'pending',
        templateId: template.id,
        applicantName: '申请人',
        departmentId: department.id,
        dateFrom: '2026-01-01',
      },
    );
    const foreignPending = await listApprovalTasks({ id: approver2.id, name: approver2.realName }, { view: 'pending' });

    expect(pending.rows).toHaveLength(1);
    expect(pending.rows[0]).toMatchObject({
      taskStatus: 'PENDING',
      applicantName: '申请人',
      assigneeId: approver1.id,
      canHandle: true,
    });
    expect(foreignPending.rows.every((row) => row.assigneeId === approver2.id)).toBe(true);
    expect(foreignPending.rows.map((row) => row.assigneeId)).not.toContain(approver1.id);
  });

  it('handled history separates approved tasks from pending and defaults away from canceled', async () => {
    const { approver1, approver2, firstTask } = await setupTaskFixture();
    await approveTask(firstTask.id, { id: approver1.id, name: approver1.realName }, '一级通过');

    const handled = await listApprovalTasks({ id: approver1.id, name: approver1.realName }, { view: 'handled' });
    const pendingForSecond = await listApprovalTasks({ id: approver2.id, name: approver2.realName }, { view: 'pending' });

    expect(handled.rows).toHaveLength(1);
    expect(handled.rows[0].taskStatus).toBe('APPROVED');
    expect(handled.rows[0].applicationStatus).toBe('APPROVING');
    expect(handled.rows[0].canHandle).toBe(false);
    expect(pendingForSecond.rows.some((row) => row.nodeName === '总经理审批')).toBe(true);
  });

  it('getApprovalTaskDetail rejects foreign tasks and returns schemaSnapshot timeline data', async () => {
    const { approver1, approver2, firstTask } = await setupTaskFixture();

    const detail = await getApprovalTaskDetail({ id: approver1.id, name: approver1.realName }, firstTask.id);

    expect(detail.schemaSnapshot).toEqual(requiredSchema);
    expect(detail.formData).toEqual(validFormData);
    expect(detail.timeline.map((event) => event.type)).toEqual(['SUBMIT', 'ASSIGN']);
    await expect(
      getApprovalTaskDetail({ id: approver2.id, name: approver2.realName }, firstTask.id),
    ).rejects.toThrow('无权查看该审批任务');
  });

  it('approveApprovalTask and rejectApprovalTask delegate state changes and enforce assignee scope', async () => {
    const { approver1, approver2, firstTask } = await setupTaskFixture();

    await expect(
      approveApprovalTask({ id: approver2.id, name: approver2.realName }, firstTask.id, '越权通过'),
    ).rejects.toThrow('无权处理该审批任务');

    await approveApprovalTask({ id: approver1.id, name: approver1.realName }, firstTask.id, '一级通过');
    const secondTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: firstTask.applicationId, nodeOrder: 2 },
    });

    await rejectApprovalTask({ id: approver2.id, name: approver2.realName }, secondTask.id, '资料不完整');

    const rejectedTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: secondTask.id } });
    const application = await prisma.approvalApplication.findUniqueOrThrow({
      where: { id: firstTask.applicationId },
    });
    expect(rejectedTask.status).toBe('REJECTED');
    expect(application.status).toBe('REJECTED');
  });

  it('commentApprovalTask stores internal remark hidden from own detail', async () => {
    const { approver1, firstTask } = await setupTaskFixture();

    const detail = await commentApprovalTask(
      { id: approver1.id, name: approver1.realName },
      firstTask.id,
      '  需要补充说明  ',
    );
    const comment = await prisma.approvalTimelineEvent.findFirstOrThrow({
      where: { applicationId: firstTask.applicationId, type: 'COMMENT' },
    });

    expect(detail.timeline.some((event) => event.title === '内部备注')).toBe(true);
    expect(comment.title).toBe('内部备注');
    expect(comment.comment).toBe('需要补充说明');
    expect(comment.payload).toEqual({ visibility: 'INTERNAL' });
  });
});
