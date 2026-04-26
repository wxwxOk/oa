import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  addArchiveNote,
  correctArchiveData,
  getArchiveDetail,
  listArchiveRecords,
  setArchiveTags,
  updateProcessingData,
} from '../archive.service';

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

const processingData = {
  followUpResult: '已电话回访',
  followUpAt: '2026-04-26',
};

type ArchiveActor = {
  id: number;
  name: string;
  departmentId?: number | null;
  permissions: string[];
};

function actor(user: { id: number; realName: string; departmentId?: number | null }, permissions: string[]): ArchiveActor {
  return {
    id: user.id,
    name: user.realName,
    departmentId: user.departmentId ?? null,
    permissions,
  };
}

async function cleanArchiveFixture() {
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

async function setupArchiveFixture() {
  const department = await prisma.department.create({ data: { name: '研发部' } });
  const otherDepartment = await prisma.department.create({ data: { name: '财务部' } });

  const applicant = await prisma.user.create({
    data: {
      username: 'phase19-applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: department.id,
    },
  });
  const otherApplicant = await prisma.user.create({
    data: {
      username: 'phase19-other-applicant',
      password: 'hashed-password',
      realName: '其他申请人',
      departmentId: otherDepartment.id,
    },
  });
  const operator = await prisma.user.create({
    data: {
      username: 'phase19-operator',
      password: 'hashed-password',
      realName: '运营人员',
      departmentId: department.id,
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
  const collectionTemplate = await prisma.formTemplate.create({
    data: {
      name: '客户回访',
      schema: requiredSchema,
      schemaVersion: 1,
      status: 'PUBLISHED',
      businessMode: 'COLLECTION_ONLY',
      creatorId: operator.id,
    },
  });
  const shareLink = await prisma.shareLink.create({
    data: {
      code: 'phase19-archive',
      templateId: collectionTemplate.id,
      creatorId: operator.id,
    },
  });

  const approval = await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-APPROVED',
      status: 'APPROVED',
      formData: { reason: '年度调休', phone: '13800138000' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.schemaVersion,
      applicantId: applicant.id,
      applicantName: applicant.realName,
      applicantDepartmentId: department.id,
      applicantDepartmentName: department.name,
      submittedAt: new Date('2026-04-25T02:00:00.000Z'),
      completedAt: new Date('2026-04-25T03:00:00.000Z'),
    },
  });
  const draftApproval = await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-DRAFT',
      status: 'DRAFT',
      formData: { reason: '草稿不归档' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.schemaVersion,
      applicantId: applicant.id,
      applicantName: applicant.realName,
      applicantDepartmentId: department.id,
      applicantDepartmentName: department.name,
    },
  });
  const foreignApproval = await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-FOREIGN',
      status: 'REJECTED',
      formData: { reason: '其他部门申请' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.schemaVersion,
      applicantId: otherApplicant.id,
      applicantName: otherApplicant.realName,
      applicantDepartmentId: otherDepartment.id,
      applicantDepartmentName: otherDepartment.name,
      submittedAt: new Date('2026-04-24T02:00:00.000Z'),
      completedAt: new Date('2026-04-24T03:00:00.000Z'),
    },
  });
  const collection = await prisma.submission.create({
    data: {
      templateId: collectionTemplate.id,
      shareLinkId: shareLink.id,
      schemaVersion: collectionTemplate.schemaVersion,
      submitterName: '客户甲',
      submitterPhone: '13900139000',
      data: { reason: '售后回访', phone: '13900139000' },
      createdAt: new Date('2026-04-25T04:00:00.000Z'),
    },
  });

  return {
    department,
    otherDepartment,
    applicant,
    otherApplicant,
    operator,
    template,
    collectionTemplate,
    approval,
    draftApproval,
    foreignApproval,
    collection,
  };
}

describe('approval archive service contract', () => {
  beforeEach(async () => {
    await cleanArchiveFixture();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('T-19-IDOR lists approval and collection archive records as normalized source rows under source-specific permissions', async () => {
    const { approval, draftApproval, collection, operator, department, template } = await setupArchiveFixture();

    const fullAccess = await listArchiveRecords(
      actor(operator, ['approval:application:all', 'form:submission:list']),
      {
        sourceType: undefined,
        templateId: undefined,
        departmentId: undefined,
        personName: undefined,
        status: undefined,
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        tags: undefined,
      },
    );
    expect(fullAccess.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: 'approval', sourceId: approval.id }),
        expect.objectContaining({ sourceType: 'collection', sourceId: collection.id }),
      ]),
    );
    expect(fullAccess.rows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceType: 'approval', sourceId: draftApproval.id })]),
    );

    const departmentApprovalOnly = await listArchiveRecords(
      actor(operator, ['approval:application:department']),
      {
        sourceType: 'approval',
        templateId: template.id,
        departmentId: department.id,
        personName: '申请人',
        status: 'APPROVED',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        tags: ['待跟进'],
      },
    );
    expect(departmentApprovalOnly.rows.every((row) => row.sourceType === 'approval')).toBe(true);
    expect(departmentApprovalOnly.rows.every((row) => row.departmentId === department.id)).toBe(true);

    await expect(
      getArchiveDetail(actor(operator, ['approval:application:department']), 'approval', collection.id),
    ).rejects.toThrow('无权查看归档记录');
  });

  it('T-19-AUDIT stores tags and internal notes as operations metadata with append-only events for both sources', async () => {
    const { approval, collection, operator } = await setupArchiveFixture();
    const archiveActor = actor(operator, ['approval:archive:mark', 'approval:application:all', 'form:submission:list']);

    const taggedApproval = await setArchiveTags(archiveActor, 'approval', approval.id, {
      tags: ['待跟进', '资料不全', '重点'],
    });
    const approvalNote = await addArchiveNote(archiveActor, 'approval', approval.id, {
      comment: '需要在归档前复核原始资料',
    });
    const taggedCollection = await setArchiveTags(archiveActor, 'collection', collection.id, {
      tags: ['已核对'],
    });

    expect(taggedApproval.tags).toEqual(['待跟进', '资料不全', '重点']);
    expect(approvalNote.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'MARK', sourceType: 'approval', sourceId: approval.id, actorId: operator.id }),
        expect.objectContaining({ type: 'COMMENT', sourceType: 'approval', sourceId: approval.id, actorId: operator.id }),
      ]),
    );
    expect(taggedCollection.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'MARK', sourceType: 'collection', sourceId: collection.id, actorId: operator.id }),
      ]),
    );

    const reloadedApproval = await prisma.approvalApplication.findUniqueOrThrow({ where: { id: approval.id } });
    const reloadedCollection = await prisma.submission.findUniqueOrThrow({ where: { id: collection.id } });
    expect(reloadedApproval.formData).toEqual({ reason: '年度调休', phone: '13800138000' });
    expect(reloadedCollection.data).toEqual({ reason: '售后回访', phone: '13900139000' });
  });

  it('T-19-DATA-SEPARATION keeps processing values outside submitted data and exposes them on internal detail only', async () => {
    const { approval, collection, operator } = await setupArchiveFixture();
    const archiveActor = actor(operator, ['approval:archive:edit', 'approval:application:all', 'form:submission:list']);

    const approvalDetail = await updateProcessingData(archiveActor, 'approval', approval.id, {
      processingData,
    });
    const collectionDetail = await updateProcessingData(archiveActor, 'collection', collection.id, {
      processingData: { followUpResult: '客户已确认' },
    });

    expect(approvalDetail.processingData).toEqual(processingData);
    expect(collectionDetail.processingData).toEqual({ followUpResult: '客户已确认' });
    expect(approvalDetail.formData).toEqual({ reason: '年度调休', phone: '13800138000' });
    expect(collectionDetail.formData).toEqual({ reason: '售后回访', phone: '13900139000' });

    const reloadedApproval = await prisma.approvalApplication.findUniqueOrThrow({ where: { id: approval.id } });
    const reloadedCollection = await prisma.submission.findUniqueOrThrow({ where: { id: collection.id } });
    expect(reloadedApproval.formData).toEqual({ reason: '年度调休', phone: '13800138000' });
    expect(reloadedCollection.data).toEqual({ reason: '售后回访', phone: '13900139000' });
  });

  it('T-19-TAMPER requires non-empty correction reasons and records field-level before/after history without overwriting originals', async () => {
    const { approval, operator } = await setupArchiveFixture();
    const archiveActor = actor(operator, ['approval:archive:edit', 'approval:application:all']);

    await expect(
      correctArchiveData(archiveActor, 'approval', approval.id, {
        changes: { phone: '13999999999' },
        reason: ' ',
      }),
    ).rejects.toThrow('编辑原因');
    await expect(
      correctArchiveData(archiveActor, 'approval', approval.id, {
        changes: { phone: '13800138000' },
        reason: '无变化修正',
      }),
    ).rejects.toThrow('无变化');

    const corrected = await correctArchiveData(archiveActor, 'approval', approval.id, {
      changes: { phone: '13999999999' },
      reason: '申请人电话录入错误，按复核结果修正',
    });

    expect(corrected.effectiveData).toEqual({ reason: '年度调休', phone: '13999999999' });
    expect(corrected.correctionHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'phone',
          before: '13800138000',
          after: '13999999999',
          reason: '申请人电话录入错误，按复核结果修正',
          actorId: operator.id,
        }),
      ]),
    );
    expect(corrected.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'EDIT', sourceType: 'approval', sourceId: approval.id }),
      ]),
    );

    const reloadedApproval = await prisma.approvalApplication.findUniqueOrThrow({ where: { id: approval.id } });
    expect(reloadedApproval.formData).toEqual({ reason: '年度调休', phone: '13800138000' });
  });
});
