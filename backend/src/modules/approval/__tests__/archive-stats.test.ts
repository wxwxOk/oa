import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import { getArchiveStats } from '../archive-stats.service';

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

async function cleanStatsFixture() {
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
}

async function setupStatsFixture() {
  const department = await prisma.department.create({ data: { name: '研发部' } });
  const otherDepartment = await prisma.department.create({ data: { name: '财务部' } });
  const admin = await prisma.user.create({
    data: {
      username: 'phase19-stats-admin',
      password: 'hashed-password',
      realName: '统计管理员',
      departmentId: department.id,
    },
  });
  const applicant = await prisma.user.create({
    data: {
      username: 'phase19-stats-applicant',
      password: 'hashed-password',
      realName: '申请人',
      departmentId: department.id,
    },
  });
  const otherApplicant = await prisma.user.create({
    data: {
      username: 'phase19-stats-other',
      password: 'hashed-password',
      realName: '其他申请人',
      departmentId: otherDepartment.id,
    },
  });
  const approvalTemplate = await prisma.formTemplate.create({
    data: {
      name: '请假申请',
      schema: requiredSchema,
      schemaVersion: 5,
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      creatorId: admin.id,
    },
  });
  const collectionTemplate = await prisma.formTemplate.create({
    data: {
      name: '客户回访',
      schema: requiredSchema,
      schemaVersion: 1,
      status: 'PUBLISHED',
      businessMode: 'COLLECTION_ONLY',
      creatorId: admin.id,
    },
  });
  const shareLink = await prisma.shareLink.create({
    data: {
      code: 'phase19-stats',
      templateId: collectionTemplate.id,
      creatorId: admin.id,
    },
  });

  const approved = await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-STATS-APPROVED',
      status: 'APPROVED',
      formData: { reason: '年度调休' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: approvalTemplate.id,
      templateName: approvalTemplate.name,
      templateVersion: approvalTemplate.schemaVersion,
      applicantId: applicant.id,
      applicantName: applicant.realName,
      applicantDepartmentId: department.id,
      applicantDepartmentName: department.name,
      createdAt: new Date('2026-04-03T02:00:00.000Z'),
      submittedAt: new Date('2026-04-03T03:00:00.000Z'),
      completedAt: new Date('2026-04-03T04:00:00.000Z'),
    },
  });
  await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-STATS-DRAFT',
      status: 'DRAFT',
      formData: { reason: '草稿' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: approvalTemplate.id,
      templateName: approvalTemplate.name,
      templateVersion: approvalTemplate.schemaVersion,
      applicantId: applicant.id,
      applicantName: applicant.realName,
      applicantDepartmentId: department.id,
      applicantDepartmentName: department.name,
      createdAt: new Date('2026-04-04T02:00:00.000Z'),
    },
  });
  await prisma.approvalApplication.create({
    data: {
      applicationNo: 'APP-PHASE19-STATS-REJECTED',
      status: 'REJECTED',
      formData: { reason: '其他部门' },
      schemaSnapshot: requiredSchema,
      processSnapshot: { nodes: [] },
      templateId: approvalTemplate.id,
      templateName: approvalTemplate.name,
      templateVersion: approvalTemplate.schemaVersion,
      applicantId: otherApplicant.id,
      applicantName: otherApplicant.realName,
      applicantDepartmentId: otherDepartment.id,
      applicantDepartmentName: otherDepartment.name,
      createdAt: new Date('2026-05-03T02:00:00.000Z'),
      submittedAt: new Date('2026-05-03T03:00:00.000Z'),
      completedAt: new Date('2026-05-03T04:00:00.000Z'),
    },
  });
  const collection = await prisma.submission.create({
    data: {
      templateId: collectionTemplate.id,
      shareLinkId: shareLink.id,
      schemaVersion: collectionTemplate.schemaVersion,
      submitterName: '客户甲',
      data: { reason: '售后回访' },
      createdAt: new Date('2026-04-05T02:00:00.000Z'),
    },
  });

  return { admin, department, otherDepartment, approvalTemplate, collectionTemplate, approved, collection };
}

describe('approval archive stats contract', () => {
  beforeEach(async () => {
    await cleanStatsFixture();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('T-19-IDOR requires approval:archive:stats and source visibility before returning aggregate counts', async () => {
    const { admin } = await setupStatsFixture();

    await expect(
      getArchiveStats(
        { id: admin.id, name: admin.realName, departmentId: admin.departmentId, permissions: [] },
        { dateFrom: '2026-04-01', dateTo: '2026-04-30' },
      ),
    ).rejects.toThrow('缺少权限');
  });

  it('excludes DRAFT approvals, maps collection rows to COLLECTED, and groups by template/status/department/month/sourceType', async () => {
    const { admin, department, approvalTemplate, collectionTemplate } = await setupStatsFixture();

    const stats = await getArchiveStats(
      {
        id: admin.id,
        name: admin.realName,
        departmentId: admin.departmentId,
        permissions: ['approval:archive:stats', 'approval:application:all', 'form:submission:list'],
      },
      { dateFrom: '2026-04-01', dateTo: '2026-05-31' },
    );

    expect(stats.byTemplate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ templateId: approvalTemplate.id, templateName: '请假申请', count: 2 }),
        expect.objectContaining({ templateId: collectionTemplate.id, templateName: '客户回访', count: 1 }),
      ]),
    );
    expect(stats.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'APPROVED', count: 1 }),
        expect.objectContaining({ status: 'REJECTED', count: 1 }),
        expect.objectContaining({ status: 'COLLECTED', count: 1 }),
      ]),
    );
    expect(stats.byStatus).not.toEqual(expect.arrayContaining([expect.objectContaining({ status: 'DRAFT' })]));
    expect(stats.byDepartment).toEqual(
      expect.arrayContaining([expect.objectContaining({ departmentId: department.id, departmentName: '研发部', count: 1 })]),
    );
    expect(stats.byMonth).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ month: '2026-04', count: 2 }),
        expect.objectContaining({ month: '2026-05', count: 1 }),
      ]),
    );
    expect(stats.bySourceType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: 'approval', count: 2 }),
        expect.objectContaining({ sourceType: 'collection', count: 1 }),
      ]),
    );
  });
});
