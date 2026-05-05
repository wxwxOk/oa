import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import { publicFillModule } from '../public.route';

const baseSchema = { version: 2, items: [] };
const SUITE_TAG = 'public-watermark-suite';

async function createCreator() {
  return prisma.user.create({
    data: {
      username: `${SUITE_TAG}-${Date.now()}-${Math.random()}`,
      password: 'hashed-password',
      realName: '公开模板管理员',
    },
  });
}

async function createPublishedTemplate(creatorId: number, watermarkText: string | null) {
  return prisma.formTemplate.create({
    data: {
      name: `${SUITE_TAG}-tpl-${Date.now()}-${Math.random()}`,
      schema: baseSchema,
      creatorId,
      status: 'PUBLISHED',
      watermarkText,
    },
  });
}

async function createShareLink(templateId: number, creatorId: number) {
  return prisma.shareLink.create({
    data: {
      code: `${SUITE_TAG}-${Date.now()}-${Math.random()}`,
      templateId,
      creatorId,
    },
  });
}

async function getPublicTemplate(code: string) {
  const res = await publicFillModule.handle(
    new Request(`http://localhost/public/f/${code}`),
  );
  expect(res.status).toBe(200);
  return res.json();
}

async function cleanupSuiteData() {
  try {
    await prisma.shareLink.deleteMany({ where: { code: { startsWith: SUITE_TAG } } });
    await prisma.formTemplate.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: SUITE_TAG } } });
  } catch {
    /* ignore */
  }
}

describe('public fill endpoint watermarkText', () => {
  beforeEach(cleanupSuiteData);
  afterAll(cleanupSuiteData);

  it('returns configured watermarkText to anonymous filler', async () => {
    const creator = await createCreator();
    const tpl = await createPublishedTemplate(creator.id, '内部资料 · 严禁外传');
    const link = await createShareLink(tpl.id, creator.id);

    const body = await getPublicTemplate(link.code);
    expect(body.watermarkText).toBe('内部资料 · 严禁外传');
  });

  it('returns null watermarkText when template has no watermark', async () => {
    const creator = await createCreator();
    const tpl = await createPublishedTemplate(creator.id, null);
    const link = await createShareLink(tpl.id, creator.id);

    const body = await getPublicTemplate(link.code);
    expect(body.watermarkText).toBeNull();
  });
});
