import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  createTemplateShareLink,
  publishTemplate,
  updateTemplate,
} from '../template.route';

const baseSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'reason', type: 'text', label: '申请原因', required: true, colSpan: 12 },
      ],
    },
  ],
};

const changedSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'reason', type: 'textarea', label: '申请原因', required: true, colSpan: 12 },
      ],
    },
  ],
};

async function createCreator() {
  return prisma.user.create({
    data: {
      username: `creator-${Date.now()}-${Math.random()}`,
      password: 'hashed-password',
      realName: '模板管理员',
    },
  });
}

async function createActiveProcess(creatorId: number) {
  const approver = await prisma.user.create({
    data: {
      username: `template-approver-${Date.now()}-${Math.random()}`,
      password: 'hashed-password',
      realName: '模板审批人',
    },
  });

  const process = await prisma.approvalProcess.create({
    data: {
      name: '有效审批流程',
      creatorId,
      isActive: true,
    },
  });

  await prisma.approvalProcessNode.create({
    data: {
      processId: process.id,
      name: '固定审批',
      order: 1,
      approverSourceType: 'USER',
      approverUserId: approver.id,
    },
  });

  return process;
}

async function createTemplate(
  creatorId: number,
  data: Record<string, unknown> = {},
) {
  return prisma.formTemplate.create({
    data: {
      name: `模板-${Date.now()}-${Math.random()}`,
      schema: baseSchema,
      schemaVersion: 1,
      creatorId,
      ...data,
    } as any,
  });
}

describe('template approval mode behavior', () => {
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

  it('existing templates default to COLLECTION_ONLY', async () => {
    const creator = await createCreator();

    const template = await createTemplate(creator.id);
    const reloaded = await prisma.formTemplate.findUniqueOrThrow({ where: { id: template.id } });

    expect((reloaded as any).businessMode).toBe('COLLECTION_ONLY');
  });

  it('approval-required template publish fails without active valid process', async () => {
    const creator = await createCreator();
    const noProcessTemplate = await createTemplate(creator.id, {
      businessMode: 'APPROVAL_REQUIRED',
    });
    const inactiveProcess = await prisma.approvalProcess.create({
      data: {
        name: '停用审批流程',
        creatorId: creator.id,
        isActive: false,
      },
    });
    const inactiveProcessTemplate = await createTemplate(creator.id, {
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: inactiveProcess.id,
    });

    await expect(publishTemplate(noProcessTemplate.id)).rejects.toThrow('请选择启用且有效的审批流程');
    await expect(publishTemplate(inactiveProcessTemplate.id)).rejects.toThrow('请选择启用且有效的审批流程');
  });

  it('collection-only published template can still create share links', async () => {
    const creator = await createCreator();
    const template = await createTemplate(creator.id, {
      businessMode: 'COLLECTION_ONLY',
      status: 'PUBLISHED',
    });

    const link = await createTemplateShareLink(template.id, creator.id);

    expect(link.templateId).toBe(template.id);
    expect(link.creatorId).toBe(creator.id);
    expect(await prisma.shareLink.count({ where: { templateId: template.id } })).toBe(1);
  });

  it('approval-required template cannot create share links', async () => {
    const creator = await createCreator();
    const process = await createActiveProcess(creator.id);
    const template = await createTemplate(creator.id, {
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: process.id,
      status: 'PUBLISHED',
    });

    await expect(createTemplateShareLink(template.id, creator.id)).rejects.toThrow('需审批模板不生成公开分享链接');
  });

  it('published collection template with share links cannot switch to approval-required without explicit confirmation or offline status', async () => {
    const creator = await createCreator();
    const process = await createActiveProcess(creator.id);
    const template = await createTemplate(creator.id, {
      businessMode: 'COLLECTION_ONLY',
      status: 'PUBLISHED',
    });
    await prisma.shareLink.create({
      data: {
        code: 'shared-public-1',
        templateId: template.id,
        creatorId: creator.id,
      },
    });

    await expect(
      updateTemplate(template.id, {
        businessMode: 'APPROVAL_REQUIRED',
        approvalProcessId: process.id,
      }),
    ).rejects.toThrow('断开公开收集入口');

    const reloaded = await prisma.formTemplate.findUniqueOrThrow({ where: { id: template.id } });
    expect((reloaded as any).businessMode).toBe('COLLECTION_ONLY');
  });

  it('schema changes on a published template increment schemaVersion', async () => {
    const creator = await createCreator();
    const template = await createTemplate(creator.id, {
      businessMode: 'COLLECTION_ONLY',
      status: 'PUBLISHED',
    });

    const updated = await updateTemplate(template.id, { schema: changedSchema });

    expect(updated.schemaVersion).toBe(2);
  });

  it('approval mode and process binding changes do not increment schemaVersion', async () => {
    const creator = await createCreator();
    const process = await createActiveProcess(creator.id);
    const template = await createTemplate(creator.id, {
      businessMode: 'COLLECTION_ONLY',
      status: 'PUBLISHED',
      schemaVersion: 1,
    });

    const updated = await updateTemplate(template.id, {
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: process.id,
      disconnectPublicCollection: true,
    });

    expect((updated as any).businessMode).toBe('APPROVAL_REQUIRED');
    expect((updated as any).approvalProcessId).toBe(process.id);
    expect(updated.schemaVersion).toBe(1);
  });
});
