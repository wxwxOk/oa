import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import { appendApplicationEvent, approveTask } from '../application.service';
import {
  cancelOwnApplication,
  createApplicationDraft,
  getOwnApplicationDetail,
  listAvailableApprovalTemplates,
  listOwnApplications,
  submitDraftApplication,
  updateDraftApplication,
} from '../application-submission.service';

const requiredSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'reason', type: 'text', label: '申请事由', required: true, colSpan: 12 },
        { id: 'phone', type: 'phone', label: '手机号', required: false, colSpan: 12 },
      ],
    },
  ],
};

const validFormData = {
  reason: '年度调休',
  phone: '13800138000',
};

async function setupApplicationSubmissionFixture() {
  const department = await prisma.department.create({
    data: { name: '研发部' },
  });

  const applicant = await prisma.user.create({
    data: {
      username: 'phase17-applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: department.id,
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      username: 'phase17-other',
      password: 'hashed-password',
      realName: '其他员工',
      departmentId: department.id,
    },
  });

  const approver = await prisma.user.create({
    data: {
      username: 'phase17-approver',
      password: 'hashed-password',
      realName: '审批人',
      departmentId: department.id,
    },
  });

  const inactiveProcess = await prisma.approvalProcess.create({
    data: {
      name: '停用审批流程',
      isActive: false,
      creatorId: applicant.id,
    },
  });

  const process = await prisma.approvalProcess.create({
    data: {
      name: '请假审批流程',
      creatorId: applicant.id,
    },
  });

  await prisma.approvalProcessNode.create({
    data: {
      processId: process.id,
      name: '部门负责人审批',
      order: 1,
      approverSourceType: 'USER',
      approverUserId: approver.id,
    },
  });

  const template = await prisma.formTemplate.create({
    data: {
      name: '请假申请',
      description: '员工请假审批',
      schema: requiredSchema,
      schemaVersion: 5,
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: process.id,
      creatorId: applicant.id,
    },
  });

  await prisma.formTemplate.create({
    data: {
      name: '公开收集表',
      schema: requiredSchema,
      status: 'PUBLISHED',
      businessMode: 'COLLECTION_ONLY',
      creatorId: applicant.id,
    },
  });

  await prisma.formTemplate.create({
    data: {
      name: '停用流程模板',
      schema: requiredSchema,
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: inactiveProcess.id,
      creatorId: applicant.id,
    },
  });

  return {
    department,
    applicant,
    otherUser,
    approver,
    process,
    template,
  };
}

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

describe('employee approval application submission service', () => {
  beforeEach(async () => {
    await cleanApprovalData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists available approval templates and creates server-derived drafts without workflow side effects', async () => {
    const { applicant, department, process, template, approver } =
      await setupApplicationSubmissionFixture();

    const templates = await listAvailableApprovalTemplates();
    expect(templates.map((item) => item.name)).toEqual(['请假申请']);
    expect(JSON.stringify(templates)).not.toContain('shareLinks');

    const draft = await createApplicationDraft(
      { id: applicant.id, name: '伪造姓名' },
      { templateId: template.id, formData: { reason: '先保存' } },
    );

    expect(draft.status).toBe('DRAFT');
    expect(draft.applicationNo).toMatch(/^APP-/);
    expect(draft.templateId).toBe(template.id);
    expect(draft.templateName).toBe(template.name);
    expect(draft.templateVersion).toBe(template.schemaVersion);
    expect(draft.applicantName).toBe(applicant.realName);
    expect(draft.applicantDepartmentId).toBe(department.id);
    expect(draft.applicantDepartmentName).toBe(department.name);
    expect(draft.schemaSnapshot).toEqual(requiredSchema);
    expect(draft.processSnapshot).toEqual({
      processId: process.id,
      processName: process.name,
      nodes: [
        {
          order: 1,
          name: '部门负责人审批',
          approverSourceType: 'USER',
          approverUserId: approver.id,
          approverRoleId: null,
          assigneeId: approver.id,
          assigneeName: approver.realName,
          approverSourceLabel: '固定用户: 审批人',
        },
      ],
    });
    expect(await prisma.approvalTask.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalAction.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalTimelineEvent.count({ where: { applicationId: draft.id } })).toBe(0);
  });

  it('updates only applicant-owned draft records and preserves submitted form data', async () => {
    const { applicant, otherUser, template } = await setupApplicationSubmissionFixture();
    const draft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: { reason: '旧内容' } },
    );

    const updated = await updateDraftApplication(
      { id: applicant.id, name: applicant.realName },
      draft.id,
      { reason: '更新后的草稿' },
    );
    expect(updated.formData).toEqual({ reason: '更新后的草稿' });

    await expect(
      updateDraftApplication(
        { id: otherUser.id, name: otherUser.realName },
        draft.id,
        { reason: '越权覆盖' },
      ),
    ).rejects.toThrow('无权编辑该审批申请');

    await submitDraftApplication(
      { id: applicant.id, name: applicant.realName },
      draft.id,
      validFormData,
    );
    await expect(
      updateDraftApplication(
        { id: applicant.id, name: applicant.realName },
        draft.id,
        { reason: '提交后修改' },
      ),
    ).rejects.toThrow('仅草稿申请可编辑');

    const reloaded = await prisma.approvalApplication.findUniqueOrThrow({ where: { id: draft.id } });
    expect(reloaded.formData).toEqual(validFormData);
  });

  it('validates required fields before formal submit and then creates exactly one pending task', async () => {
    const { applicant, template, approver } = await setupApplicationSubmissionFixture();
    const draft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: {} },
    );

    await expect(
      submitDraftApplication({ id: applicant.id, name: applicant.realName }, draft.id, {}),
    ).rejects.toThrow('申请事由: 此项为必填');
    expect(await prisma.approvalTask.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalAction.count({ where: { applicationId: draft.id } })).toBe(0);
    expect(await prisma.approvalTimelineEvent.count({ where: { applicationId: draft.id } })).toBe(0);

    const submitted = await submitDraftApplication(
      { id: applicant.id, name: applicant.realName },
      draft.id,
      validFormData,
    );
    const tasks = await prisma.approvalTask.findMany({ where: { applicationId: draft.id } });
    const timeline = await prisma.approvalTimelineEvent.findMany({
      where: { applicationId: draft.id },
      orderBy: { id: 'asc' },
    });

    expect(submitted.status).toBe('APPROVING');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      status: 'PENDING',
      nodeName: '部门负责人审批',
      assigneeId: approver.id,
    });
    expect(timeline.map((item) => item.type)).toEqual(['SUBMIT', 'ASSIGN']);
  });

  it('lists own applications with status/date filters and excludes other applicants', async () => {
    const { applicant, otherUser, template } = await setupApplicationSubmissionFixture();
    const ownDraft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: { reason: '草稿' } },
    );
    const oldDraft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: { reason: '旧草稿' } },
    );
    await prisma.approvalApplication.update({
      where: { id: oldDraft.id },
      data: { createdAt: new Date('2025-01-01T00:00:00.000Z') },
    });
    const submittedDraft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: validFormData },
    );
    await submitDraftApplication(
      { id: applicant.id, name: applicant.realName },
      submittedDraft.id,
      validFormData,
    );
    await createApplicationDraft(
      { id: otherUser.id, name: otherUser.realName },
      { templateId: template.id, formData: { reason: '别人' } },
    );

    const draftList = await listOwnApplications(
      { id: applicant.id, name: applicant.realName },
      { status: 'DRAFT' },
    );
    expect(draftList.rows.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      [ownDraft.id, oldDraft.id].sort((a, b) => a - b),
    );

    const inProgress = await listOwnApplications(
      { id: applicant.id, name: applicant.realName },
      { status: 'IN_PROGRESS' },
    );
    expect(inProgress.rows).toHaveLength(1);
    expect(inProgress.rows[0]).toMatchObject({
      id: submittedDraft.id,
      status: 'APPROVING',
      canCancel: true,
    });

    const recent = await listOwnApplications(
      { id: applicant.id, name: applicant.realName },
      { dateFrom: '2026-01-01' },
    );
    expect(recent.rows.map((row) => row.id)).not.toContain(oldDraft.id);
  });

  it('returns own detail with snapshots, tasks, timeline, and applicant-only cancellation', async () => {
    const { applicant, otherUser, template } = await setupApplicationSubmissionFixture();
    const draft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: validFormData },
    );
    const submitted = await submitDraftApplication(
      { id: applicant.id, name: applicant.realName },
      draft.id,
      validFormData,
    );

    const detail = await getOwnApplicationDetail(
      { id: applicant.id, name: applicant.realName },
      submitted.id,
    );
    expect(detail.schemaSnapshot).toEqual(requiredSchema);
    expect(detail.formData).toEqual(validFormData);
    expect(detail.timeline).toHaveLength(2);
    expect(detail.tasks).toHaveLength(1);
    expect(detail.canCancel).toBe(true);

    await expect(
      getOwnApplicationDetail({ id: otherUser.id, name: otherUser.realName }, submitted.id),
    ).rejects.toThrow('无权查看该审批申请');
    await expect(
      cancelOwnApplication({ id: otherUser.id, name: otherUser.realName }, submitted.id, '越权撤销'),
    ).rejects.toThrow('无权撤销该审批申请');

    const canceled = await cancelOwnApplication(
      { id: applicant.id, name: applicant.realName },
      submitted.id,
      `${'撤销'.repeat(120)}  `,
    );
    const canceledTask = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id },
    });
    const cancelEvent = await prisma.approvalTimelineEvent.findFirstOrThrow({
      where: { applicationId: submitted.id, type: 'CANCEL' },
    });

    expect(canceled.status).toBe('CANCELED');
    expect(canceledTask.status).toBe('CANCELED');
    expect(cancelEvent.comment?.length).toBe(200);
    await expect(
      cancelOwnApplication({ id: applicant.id, name: applicant.realName }, submitted.id, '再次撤销'),
    ).rejects.toThrow('非法状态流转');
  });

  it('internal remark hidden from own detail when payload.visibility === \'INTERNAL\'', async () => {
    const { applicant, approver, template } = await setupApplicationSubmissionFixture();
    const draft = await createApplicationDraft(
      { id: applicant.id, name: applicant.realName },
      { templateId: template.id, formData: validFormData },
    );
    const submitted = await submitDraftApplication(
      { id: applicant.id, name: applicant.realName },
      draft.id,
      validFormData,
    );
    const task = await prisma.approvalTask.findFirstOrThrow({
      where: { applicationId: submitted.id, assigneeId: approver.id },
    });

    await appendApplicationEvent({
      applicationId: submitted.id,
      taskId: task.id,
      actor: { id: approver.id, name: approver.realName },
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      type: 'COMMENT',
      title: '内部备注',
      comment: '申请人不应看到这条备注',
      payload: { visibility: 'INTERNAL' },
    });
    await appendApplicationEvent({
      applicationId: submitted.id,
      taskId: task.id,
      actor: { id: approver.id, name: approver.realName },
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      type: 'COMMENT',
      title: '公开备注',
      comment: '普通备注仍可见',
      payload: { visibility: 'PUBLIC' },
    });
    await approveTask(task.id, { id: approver.id, name: approver.realName }, '审批通过');

    const detail = await getOwnApplicationDetail(
      { id: applicant.id, name: applicant.realName },
      submitted.id,
    );

    expect(
      detail.timeline.some((event) => {
        const payload = event.payload as { visibility?: string } | null;
        return event.type === 'COMMENT' && payload !== null && payload.visibility === 'INTERNAL';
      }),
    ).toBe(false);
    expect(detail.timeline.map((event) => event.comment)).toContain('普通备注仍可见');
    expect(detail.timeline.map((event) => event.type)).toContain('APPROVE');
  });
});
