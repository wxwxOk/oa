import { describe, expect, it, mock } from 'bun:test';

const createNotificationMock = mock(async (args: any) => ({
  id: 1,
  ...args.data,
  readAt: null,
  createdAt: new Date('2026-05-07T00:00:00.000Z'),
}));
const countNotificationMock = mock(async (_args: any) => 2);
const findManyNotificationMock = mock(async (_args: any) => [
  {
    id: 1,
    type: 'CHANNEL_PUSH_PENDING_REVIEW',
    title: '渠道推送待审核',
    summary: '渠道商A · 张三 · 等待审核',
    targetRoute: '/review/channel-push/11',
    sourceType: 'CHANNEL_PUSH',
    sourceId: 11,
    readAt: null,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
  },
]);
const updateManyNotificationMock = mock(async (_args: any) => ({ count: 1 }));
const findFirstNotificationMock = mock(async (_args: any) => ({
  id: 1,
  type: 'CHANNEL_PUSH_PENDING_REVIEW',
  title: '渠道推送待审核',
  summary: '渠道商A · 张三 · 等待审核',
  targetRoute: '/review/channel-push/11',
  sourceType: 'CHANNEL_PUSH',
  sourceId: 11,
  readAt: new Date('2026-05-07T01:00:00.000Z'),
  createdAt: new Date('2026-05-07T00:00:00.000Z'),
}));

mock.module('../../../plugins/prisma', () => ({
  prisma: {
    userNotification: {
      create: createNotificationMock,
      count: countNotificationMock,
      findMany: findManyNotificationMock,
      updateMany: updateManyNotificationMock,
      findFirst: findFirstNotificationMock,
    },
  },
}));

const {
  notifyChannelPushPendingReview,
  notifyChannelPushReviewed,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  serializeNotificationRow,
} = await import('../channel-push-notification.service');

function actor(overrides: Partial<any> = {}) {
  return {
    id: 99,
    name: '接收人',
    roleCodes: ['USER'],
    permissions: [],
    ...overrides,
  };
}

describe('channel-push notification service', () => {
  it('creates pending-review notifications with recipient user scope and review target route', async () => {
    await notifyChannelPushPendingReview(
      { userNotification: { create: createNotificationMock } },
      { recipientUserId: 99, pushId: 11, studentName: '张三', channelPartnerName: '渠道商A' },
    );

    const data = createNotificationMock.mock.calls.at(-1)?.[0]?.data;
    expect(data).toMatchObject({
      userId: 99,
      type: 'CHANNEL_PUSH_PENDING_REVIEW',
      title: '渠道推送待审核',
      targetRoute: '/review/channel-push/11',
      sourceType: 'CHANNEL_PUSH',
      sourceId: 11,
    });
    expect(data.summary).toContain('张三');
  });

  it('creates reviewed notifications for the partner with own-detail target route', async () => {
    await notifyChannelPushReviewed(
      { userNotification: { create: createNotificationMock } },
      { channelPartnerId: 5, pushId: 11, decision: 'APPROVED', studentName: '张三', reviewerName: '接收人' },
    );

    const data = createNotificationMock.mock.calls.at(-1)?.[0]?.data;
    expect(data).toMatchObject({
      userId: 5,
      type: 'CHANNEL_PUSH_REVIEWED',
      title: '我的推送已审核',
      targetRoute: '/channel-push/11',
      sourceType: 'CHANNEL_PUSH',
      sourceId: 11,
    });
    expect(data.summary).toContain('已通过');
  });

  it('lists newest notifications and scopes all queries by actor.id', async () => {
    const result = await listNotifications(actor({ id: 123 }), { page: '2', size: '99', read: 'false' });

    const countWhere = countNotificationMock.mock.calls.at(-1)?.[0]?.where;
    const findArgs = findManyNotificationMock.mock.calls.at(-1)?.[0];
    expect(countWhere).toEqual({ userId: 123, readAt: null });
    expect(findArgs.where).toEqual({ userId: 123, readAt: null });
    expect(findArgs.orderBy).toEqual({ createdAt: 'desc' });
    expect(findArgs.take).toBe(50);
    expect(result.rows[0]?.createdAt).toBe('2026-05-07T00:00:00.000Z');
  });

  it('counts unread notifications using only current user scope', async () => {
    const result = await getUnreadNotificationCount(actor({ id: 123 }));

    expect(countNotificationMock.mock.calls.at(-1)?.[0]?.where).toEqual({ userId: 123, readAt: null });
    expect(result).toEqual({ count: 2 });
  });

  it('marks a single notification read without accepting userId from caller input', async () => {
    await markNotificationRead(actor({ id: 123 }), 7);

    const args = updateManyNotificationMock.mock.calls.at(-1)?.[0];
    expect(args.where).toEqual({ id: 7, userId: 123, readAt: null });
    expect(args.data.readAt).toBeInstanceOf(Date);
  });

  it('marks all notifications read for the current user only', async () => {
    await markAllNotificationsRead(actor({ id: 123 }));

    const args = updateManyNotificationMock.mock.calls.at(-1)?.[0];
    expect(args.where).toEqual({ userId: 123, readAt: null });
    expect(args.data.readAt).toBeInstanceOf(Date);
  });

  it('serializes dates to ISO and never exposes userId', () => {
    const dto = serializeNotificationRow({
      id: 1,
      userId: 123,
      type: 'CHANNEL_PUSH_REVIEWED',
      title: '我的推送已审核',
      summary: null,
      targetRoute: '/channel-push/11',
      sourceType: 'CHANNEL_PUSH',
      sourceId: 11,
      readAt: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
    });

    expect((dto as any).userId).toBeUndefined();
    expect(dto.createdAt).toBe('2026-05-07T00:00:00.000Z');
  });
});
