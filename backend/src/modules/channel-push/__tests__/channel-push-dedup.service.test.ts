import { describe, expect, it, mock } from 'bun:test';

let lastFindManyArgs: any = null;
let mockResult: any[] = [];

mock.module('../../../plugins/prisma', () => ({
  prisma: {
    channelPush: {
      findMany: async (args: any) => {
        lastFindManyArgs = args;
        return mockResult;
      },
      create: async () => {
        throw new Error('findChannelPushDuplicates must NOT call channelPush.create');
      },
      update: async () => {
        throw new Error('findChannelPushDuplicates must NOT call channelPush.update');
      },
      delete: async () => {
        throw new Error('findChannelPushDuplicates must NOT call channelPush.delete');
      },
    },
  },
}));

const { findChannelPushDuplicates } = await import('../channel-push-dedup.service');

describe('channel-push dedup helper contract', () => {
  it('queries by partner + name + phone, sorted desc, capped at 10', async () => {
    mockResult = [];
    lastFindManyArgs = null;

    await findChannelPushDuplicates({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
    });

    expect(lastFindManyArgs).toBeTruthy();
    expect(lastFindManyArgs.where).toMatchObject({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
    });
    expect(lastFindManyArgs.orderBy).toEqual({ submittedAt: 'desc' });
    expect(lastFindManyArgs.take).toBe(10);
    // Read-only: select projection keeps payload narrow
    expect(lastFindManyArgs.select).toMatchObject({
      id: true,
      studentName: true,
      studentPhone: true,
      status: true,
      submittedAt: true,
    });
  });

  it('excludes the current record id when excludeId is provided', async () => {
    mockResult = [];
    lastFindManyArgs = null;

    await findChannelPushDuplicates({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
      excludeId: 42,
    });

    expect(lastFindManyArgs.where).toMatchObject({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
      id: { not: 42 },
    });
  });

  it('omits the excludeId clause when not provided', async () => {
    mockResult = [];
    lastFindManyArgs = null;

    await findChannelPushDuplicates({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
    });

    expect(lastFindManyArgs.where.id).toBeUndefined();
  });

  it('returns [] when no rows match without throwing', async () => {
    mockResult = [];

    const hints = await findChannelPushDuplicates({
      channelPartnerId: 7,
      studentName: '李四',
      studentPhone: '13800138001',
    });

    expect(hints).toEqual([]);
  });

  it('does NOT filter out CANCELLED or REJECTED rows (DEDUP-02 includes all conflicts)', async () => {
    mockResult = [
      { id: 1, studentName: '张三', studentPhone: '13800138000', status: 'PENDING', submittedAt: new Date() },
      { id: 2, studentName: '张三', studentPhone: '13800138000', status: 'CANCELLED', submittedAt: new Date() },
      { id: 3, studentName: '张三', studentPhone: '13800138000', status: 'REJECTED', submittedAt: new Date() },
    ];
    lastFindManyArgs = null;

    const hints = await findChannelPushDuplicates({
      channelPartnerId: 7,
      studentName: '张三',
      studentPhone: '13800138000',
    });

    expect(hints).toHaveLength(3);
    expect(lastFindManyArgs.where.status).toBeUndefined(); // no status filter applied
  });

  it('source is read-only: never mutates channelPush rows', async () => {
    const source = await Bun.file(new URL('../channel-push-dedup.service.ts', import.meta.url)).text();

    expect(source).toContain('findChannelPushDuplicates');
    expect(source).not.toMatch(/channelPush\.create\b/);
    expect(source).not.toMatch(/channelPush\.update\b/);
    expect(source).not.toMatch(/channelPush\.delete\b/);
    expect(source).not.toMatch(/channelPush\.upsert\b/);
  });
});
