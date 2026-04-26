import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  appendApplicationEvent,
  approveTask,
  cancelApplication,
  createDraftApplication,
  rejectTask,
  submitApplication,
} from '../application.service';

const formSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'reason', type: 'text', label: 'Reason', required: true, colSpan: 12 },
      ],
    },
  ],
};

const formData = {
  reason: 'Annual leave',
  phone: '1',
};

async function setupApprovalFixture() {
  const department = await prisma.department.create({
    data: { name: '研发部' },
  });

  const applicant = await prisma.user.create({
    data: {
      username: 'applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: department.id,
    },
  });

  const approver1 = await prisma.user.create({
    data: {
      username: 'approver1',
      password: 'hashed-password',
      realName: '一级审批人',
      departmentId: department.id,
    },
  });

  const approver2 = await prisma.user.create({
    data: {
      username: 'approver2',
      password: 'hashed-password',
      realName: '二级审批人',
      departmentId: department.id,
    },
  });

  const template = await prisma.formTemplate.create({
    data: {
      name: '请假申请',
      schema: formSchema,
      schemaVersion: 3,
      creatorId: applicant.id,
    },
  });

  const process = await prisma.approvalProcess.create({
    data: {
      name: '请假审批流程',
      creatorId: applicant.id,
    },
  });

  await prisma.approvalProcessNode.createMany({
    data: [
      {
        processId: process.id,
        name: '部门负责人审批',
        order: 1,
        approverSourceType: 'USER',
        approverUserId: approver1.id,
      },
      {
        processId: process.id,
        name: '总经理审批',
        order: 2,
        approverSourceType: 'USER',
        approverUserId: approver2.id,
      },
    ],
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

  const draftInput = {
    applicationNo: `APP-${Date.now()}`,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.schemaVersion,
    applicantId: applicant.id,
    applicantName: applicant.realName,
    applicantDepartmentId: department.id,
    applicantDepartmentName: department.name,
    formData,
    schemaSnapshot: formSchema,
    processSnapshot,
  };

  return {
    department,
    applicant,
    approver1,
    approver2,
    template,
    process,
    processSnapshot,
    draftInput,
  };
}

async function actionTypes(applicationId: number) {
  const actions = await prisma.approvalAction.findMany({
    where: { applicationId },
    orderBy: { id: 'asc' },
  });

  return actions.map((action) => action.type);
}

async function timelineTypes(applicationId: number) {
  const events = await prisma.approvalTimelineEvent.findMany({
    where: { applicationId },
    orderBy: { id: 'asc' },
  });

  return events.map((event) => event.type);
}

describe('approval application service', () => {
  beforeEach(async () => {
    await prisma.userNotification.deleteMany();
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

  it('creates a draft application with schema and process snapshots', async () => {
    const { draftInput, processSnapshot, template, applicant, department } = await setupApprovalFixture();

    const application = await createDraftApplication(draftInput);

    expect(application.status).toBe('DRAFT');
    expect(application.schemaSnapshot).toEqual(formSchema);
    expect(application.processSnapshot).toEqual(processSnapshot);
    expect(application.templateName).toBe(template.name);
    expect(application.templateVersion).toBe(template.schemaVersion);
    expect(application.applicantName).toBe(applicant.realName);
    expect(application.applicantDepartmentName).toBe(department.name);
    expect(await prisma.approvalTask.count({ where: { applicationId: application.id } })).toBe(0);
  });

  it('submit creates the first pending task and submit/assign events', async () => {
    const { draftInput, applicant, approver1 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);

    const application = await submitApplication(draft.id, {
      id: applicant.id,
      name: applicant.realName,
    });

    const tasks = await prisma.approvalTask.findMany({
      where: { applicationId: application.id },
      orderBy: { id: 'asc' },
    });

    expect(application.status).toBe('APPROVING');
    expect(application.currentNodeOrder).toBe(1);
    expect(application.currentNodeName).toBe('部门负责人审批');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('PENDING');
    expect(tasks[0].assigneeId).toBe(approver1.id);
    expect(tasks[0].nodeOrder).toBe(1);
    expect(await actionTypes(application.id)).toEqual(['SUBMIT', 'ASSIGN']);
    expect(await timelineTypes(application.id)).toEqual(['SUBMIT', 'ASSIGN']);
    expect(
      await prisma.userNotification.count({
        where: {
          userId: approver1.id,
          type: 'NEW_TASK',
          approvalApplicationId: application.id,
          approvalTaskId: tasks[0].id,
          targetRoute: `/approval/tasks/${tasks[0].id}`,
        },
      }),
    ).toBe(1);
  });

  it('serial approval creates the next task then approves the final node', async () => {
    const { draftInput, applicant, approver1, approver2 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });
    const firstTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, nodeOrder: 1 },
    });

    await approveTask(firstTask.id, { id: approver1.id, name: approver1.realName }, '一级通过');

    const approvedFirstTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: firstTask.id } });
    const secondTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, status: 'PENDING' },
    });
    expect(approvedFirstTask.status).toBe('APPROVED');
    expect(secondTask.nodeOrder).toBe(2);
    expect(secondTask.assigneeId).toBe(approver2.id);
    expect(
      await prisma.userNotification.count({
        where: {
          userId: approver2.id,
          type: 'NEW_TASK',
          approvalApplicationId: submitted.id,
          approvalTaskId: secondTask.id,
        },
      }),
    ).toBe(1);

    const approved = await approveTask(secondTask.id, { id: approver2.id, name: approver2.realName }, '二级通过');

    expect(approved.status).toBe('APPROVED');
    expect(await prisma.approvalTask.count({ where: { applicationId: submitted.id, status: 'PENDING' } })).toBe(0);
    expect(await actionTypes(submitted.id)).toEqual(['SUBMIT', 'ASSIGN', 'APPROVE', 'ASSIGN', 'APPROVE']);
    expect(
      await prisma.userNotification.count({
        where: {
          userId: applicant.id,
          type: 'APPROVED',
          approvalApplicationId: submitted.id,
          targetRoute: `/approval/applications/${submitted.id}`,
        },
      }),
    ).toBe(1);
  });

  it('reject closes pending tasks and records rejection', async () => {
    const { draftInput, applicant, approver1 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });
    const task = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, status: 'PENDING' },
    });

    const rejected = await rejectTask(task.id, { id: approver1.id, name: approver1.realName }, '资料不全');
    const rejectedTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: task.id } });

    expect(rejected.status).toBe('REJECTED');
    expect(await prisma.approvalTask.count({ where: { applicationId: submitted.id, status: 'PENDING' } })).toBe(0);
    expect(rejectedTask.status).toBe('REJECTED');
    expect(await timelineTypes(submitted.id)).toContain('REJECT');
    expect(
      await prisma.userNotification.count({
        where: {
          userId: applicant.id,
          type: 'REJECTED',
          approvalApplicationId: submitted.id,
          targetRoute: `/approval/applications/${submitted.id}`,
        },
      }),
    ).toBe(1);
  });

  it('cancel closes pending tasks and records cancellation', async () => {
    const { draftInput, applicant } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });
    const task = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, status: 'PENDING' },
    });

    const canceled = await cancelApplication(submitted.id, { id: applicant.id, name: applicant.realName }, '申请人撤销');
    const canceledTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: task.id } });

    expect(canceled.status).toBe('CANCELED');
    expect(await prisma.approvalTask.count({ where: { applicationId: submitted.id, status: 'PENDING' } })).toBe(0);
    expect(canceledTask.status).toBe('CANCELED');
    expect(await timelineTypes(submitted.id)).toContain('CANCEL');
    expect(
      await prisma.userNotification.count({
        where: {
          userId: applicant.id,
          type: { in: ['APPROVED', 'REJECTED'] },
          approvalApplicationId: submitted.id,
        },
      }),
    ).toBe(0);
  });

  it('rejects illegal operations on terminal applications', async () => {
    const { draftInput, applicant, approver1, approver2 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });
    const firstTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, nodeOrder: 1 },
    });
    await approveTask(firstTask.id, { id: approver1.id, name: approver1.realName }, '一级通过');
    const secondTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, nodeOrder: 2 },
    });
    const approved = await approveTask(secondTask.id, { id: approver2.id, name: approver2.realName }, '二级通过');

    await expect(cancelApplication(approved.id, { id: applicant.id, name: applicant.realName })).rejects.toThrow('非法状态流转');
    await expect(approveTask(secondTask.id, { id: approver2.id, name: approver2.realName })).rejects.toThrow('不可处理');
  });

  it('rejects task handling by non-assignee actors', async () => {
    const { draftInput, applicant, approver1, approver2 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });
    const task = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, assigneeId: approver1.id, status: 'PENDING' },
    });

    await expect(approveTask(task.id, { id: approver2.id, name: approver2.realName }, '越权通过')).rejects.toThrow('无权处理该审批任务');
    await expect(rejectTask(task.id, { id: approver2.id, name: approver2.realName }, '越权驳回')).rejects.toThrow('无权处理该审批任务');

    const unchangedTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(unchangedTask.status).toBe('PENDING');
  });

  it('rejects cancellation by non-applicant actors', async () => {
    const { draftInput, applicant, approver1 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);
    const submitted = await submitApplication(draft.id, { id: applicant.id, name: applicant.realName });

    await expect(cancelApplication(submitted.id, { id: approver1.id, name: approver1.realName }, '越权撤销')).rejects.toThrow('无权撤销该审批申请');

    const unchangedApplication = await prisma.approvalApplication.findUniqueOrThrow({
      where: { id: submitted.id },
    });
    expect(unchangedApplication.status).toBe('APPROVING');
  });

  it('rejects submission by non-applicant actors', async () => {
    const { draftInput, approver1 } = await setupApprovalFixture();
    const draft = await createDraftApplication(draftInput);

    await expect(submitApplication(draft.id, { id: approver1.id, name: approver1.realName })).rejects.toThrow('无权提交该审批申请');

    const unchangedApplication = await prisma.approvalApplication.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(unchangedApplication.status).toBe('DRAFT');
    expect(await prisma.approvalTask.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalAction.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalTimelineEvent.count({ where: { applicationId: draft.id } })).toBe(0);
  });

  it('appends comment mark and edit events without mutating form data', async () => {
    const { draftInput, applicant } = await setupApprovalFixture();
    const application = await createDraftApplication(draftInput);
    const actor = { id: applicant.id, name: applicant.realName };

    await appendApplicationEvent({
      applicationId: application.id,
      actor,
      type: 'COMMENT',
      title: '内部备注',
      comment: '内部备注',
      payload: { text: '内部备注' },
    });
    await appendApplicationEvent({
      applicationId: application.id,
      actor,
      type: 'MARK',
      title: '重点',
      comment: '重点',
      payload: { mark: '重点' },
    });
    await appendApplicationEvent({
      applicationId: application.id,
      actor,
      type: 'EDIT',
      title: '修正手机号',
      comment: '修正手机号',
      payload: { field: 'phone', before: '1', after: '2' },
    });

    expect(await actionTypes(application.id)).toEqual(['COMMENT', 'MARK', 'EDIT']);
    expect(await timelineTypes(application.id)).toEqual(['COMMENT', 'MARK', 'EDIT']);

    const reloaded = await prisma.approvalApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(reloaded.formData).toEqual(formData);
  });
});
