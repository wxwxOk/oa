import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import { BizError } from '../../../utils/errors';
import { updateTemplate, normalizeWatermarkText, WATERMARK_MAX_LENGTH } from '../template.route';

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

const SUITE_TAG = 'watermark-suite';

async function createCreator() {
  return prisma.user.create({
    data: {
      username: `${SUITE_TAG}-${Date.now()}-${Math.random()}`,
      password: 'hashed-password',
      realName: '模板管理员',
    },
  });
}

async function createTemplate(creatorId: number, watermarkText?: string | null) {
  return prisma.formTemplate.create({
    data: {
      name: `${SUITE_TAG}-tpl-${Date.now()}-${Math.random()}`,
      schema: baseSchema,
      creatorId,
      watermarkText: watermarkText ?? null,
    },
  });
}

async function cleanupSuiteData() {
  // 项目并发测试间会有 prisma.$disconnect 互相干扰；这里仅尽力清理，断开后吞错。
  try {
    await prisma.formTemplate.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: SUITE_TAG } } });
  } catch {
    /* ignore */
  }
}

describe('template watermarkText service', () => {
  beforeEach(cleanupSuiteData);
  afterAll(cleanupSuiteData);

  it('writes a 50-char watermark via updateTemplate and reads it back', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id);
    const text = 'x'.repeat(WATERMARK_MAX_LENGTH);

    const updated = await updateTemplate(tpl.id, { watermarkText: text });
    expect(updated.watermarkText).toBe(text);

    const reloaded = await prisma.formTemplate.findUniqueOrThrow({ where: { id: tpl.id } });
    expect(reloaded.watermarkText).toBe(text);
  });

  it('clears watermark when null is passed', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id, '已有水印');

    const updated = await updateTemplate(tpl.id, { watermarkText: null });
    expect(updated.watermarkText).toBeNull();
  });

  it('leaves watermarkText untouched when the field is omitted', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id, '保持不变');

    const updated = await updateTemplate(tpl.id, { description: '仅改描述' });
    expect(updated.watermarkText).toBe('保持不变');
  });

  it('rejects 51-char watermark even via direct service call (sink-layer enforcement)', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id);
    const tooLong = 'x'.repeat(WATERMARK_MAX_LENGTH + 1);

    await expect(updateTemplate(tpl.id, { watermarkText: tooLong })).rejects.toBeInstanceOf(BizError);
  });

  it('normalizes empty string and whitespace-only input to null', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id, '原值');

    expect((await updateTemplate(tpl.id, { watermarkText: '' })).watermarkText).toBeNull();
    expect((await updateTemplate(tpl.id, { watermarkText: '   ' })).watermarkText).toBeNull();
  });

  it('trims surrounding whitespace before persisting', async () => {
    const creator = await createCreator();
    const tpl = await createTemplate(creator.id);

    const updated = await updateTemplate(tpl.id, { watermarkText: '  内部资料  ' });
    expect(updated.watermarkText).toBe('内部资料');
  });
});

describe('normalizeWatermarkText helper', () => {
  it('returns null for null/undefined/empty/whitespace', () => {
    expect(normalizeWatermarkText(null)).toBeNull();
    expect(normalizeWatermarkText(undefined)).toBeNull();
    expect(normalizeWatermarkText('')).toBeNull();
    expect(normalizeWatermarkText('   ')).toBeNull();
  });

  it('trims and accepts up to WATERMARK_MAX_LENGTH chars', () => {
    expect(normalizeWatermarkText('  hi  ')).toBe('hi');
    expect(normalizeWatermarkText('x'.repeat(WATERMARK_MAX_LENGTH))).toBe('x'.repeat(WATERMARK_MAX_LENGTH));
  });

  it('throws BizError(400) when trimmed length exceeds the limit', () => {
    expect(() => normalizeWatermarkText('x'.repeat(WATERMARK_MAX_LENGTH + 1))).toThrow(BizError);
  });
});
