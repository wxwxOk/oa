import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import type { ChannelPushActor } from './channel-push.service';

export const CHANNEL_PUSH_NOTIFICATION_SOURCE_TYPE = 'CHANNEL_PUSH';
export const MAX_NOTIFICATION_PAGE_SIZE = 50;

type NotificationTx = {
  userNotification: {
    create(args: any): Promise<any>;
  };
};

export type NotificationListQuery = {
  page?: number | string;
  size?: number | string;
  read?: boolean | string;
};

export type ChannelPushPendingReviewNotificationInput = {
  recipientUserId: number;
  pushId: number;
  studentName?: string | null;
  channelPartnerName?: string | null;
};

export type ChannelPushReviewedNotificationInput = {
  channelPartnerId: number;
  pushId: number;
  decision: 'APPROVED' | 'REJECTED';
  studentName?: string | null;
  reviewerName?: string | null;
};

function notificationModel() {
  return (prisma as any).userNotification;
}

function normalizePage(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(Math.floor(parsed), MAX_NOTIFICATION_PAGE_SIZE);
}

function normalizeReadFilter(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new BizError('通知已读筛选值无效', 400, 'USER_NOTIFICATION_READ_FILTER_INVALID');
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function compactSummary(parts: Array<string | null | undefined>) {
  const text = parts.map((part) => part?.trim()).filter(Boolean).join(' · ');
  return text || null;
}

export async function notifyChannelPushPendingReview(tx: NotificationTx, input: ChannelPushPendingReviewNotificationInput) {
  return tx.userNotification.create({
    data: {
      userId: input.recipientUserId,
      type: 'CHANNEL_PUSH_PENDING_REVIEW',
      title: '渠道推送待审核',
      summary: compactSummary([input.channelPartnerName, input.studentName, '等待审核']),
      targetRoute: `/review/channel-push/${input.pushId}`,
      sourceType: CHANNEL_PUSH_NOTIFICATION_SOURCE_TYPE,
      sourceId: input.pushId,
    },
  });
}

export async function notifyChannelPushReviewed(tx: NotificationTx, input: ChannelPushReviewedNotificationInput) {
  const decisionText = input.decision === 'APPROVED' ? '已通过' : '已驳回';
  return tx.userNotification.create({
    data: {
      userId: input.channelPartnerId,
      type: 'CHANNEL_PUSH_REVIEWED',
      title: '我的推送已审核',
      summary: compactSummary([input.studentName, decisionText, input.reviewerName]),
      targetRoute: `/channel-push/${input.pushId}`,
      sourceType: CHANNEL_PUSH_NOTIFICATION_SOURCE_TYPE,
      sourceId: input.pushId,
    },
  });
}

export function serializeNotificationRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary ?? null,
    targetRoute: row.targetRoute,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    readAt: toIso(row.readAt),
    createdAt: toIso(row.createdAt),
  };
}

export async function listNotifications(actor: ChannelPushActor, query: NotificationListQuery = {}) {
  const page = normalizePage(query.page);
  const size = normalizeSize(query.size);
  const read = normalizeReadFilter(query.read);
  const where: Record<string, unknown> = { userId: actor.id };
  if (read === true) where.readAt = { not: null };
  if (read === false) where.readAt = null;

  const [total, rows] = await Promise.all([
    notificationModel().count({ where }),
    notificationModel().findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return { rows: rows.map(serializeNotificationRow), total, page, size };
}

export async function getUnreadNotificationCount(actor: ChannelPushActor) {
  const count = await notificationModel().count({
    where: { userId: actor.id, readAt: null },
  });
  return { count };
}

export async function markNotificationRead(actor: ChannelPushActor, id: number) {
  const now = new Date();
  const result = await notificationModel().updateMany({
    where: { id, userId: actor.id, readAt: null },
    data: { readAt: now },
  });
  if (result.count === 0) {
    const existing = await notificationModel().findFirst({ where: { id, userId: actor.id } });
    if (!existing) throw new BizError('通知不存在', 404, 'USER_NOTIFICATION_NOT_FOUND');
    return serializeNotificationRow(existing);
  }
  const row = await notificationModel().findFirst({ where: { id, userId: actor.id } });
  return serializeNotificationRow(row);
}

export async function markAllNotificationsRead(actor: ChannelPushActor) {
  const result = await notificationModel().updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
