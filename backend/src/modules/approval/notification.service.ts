import type {
  ApprovalApplication,
  ApprovalTask,
  ArchiveSourceType,
  Prisma,
  UserNotification,
  UserNotificationType,
} from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';

export type NotificationActor = {
  id: number;
  name?: string;
};

export type NotificationListFilters = {
  page?: number | string;
  size?: number | string;
  read?: boolean | string | null;
  readStatus?: 'read' | 'unread' | 'all' | '' | undefined;
};

export type NotificationListItem = {
  id: number;
  type: UserNotificationType;
  title: string;
  summary: string;
  sourceType: 'approval' | 'collection' | null;
  sourceId: number | null;
  targetRoute: string;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationListResult = {
  rows: NotificationListItem[];
  total: number;
  page: number;
  size: number;
};

export type NotifyTaskAssignedInput = {
  task?: Pick<ApprovalTask, 'id' | 'applicationId'>;
  application?: Pick<
    ApprovalApplication,
    'id' | 'applicationNo' | 'templateName' | 'applicantName'
  >;
  taskId?: number;
  applicationId?: number;
  assigneeId: number;
  applicantName?: string | null;
  templateName?: string | null;
  applicationNo?: string | null;
};

export type NotifyApplicationFinalizedInput = {
  application?: Pick<
    ApprovalApplication,
    'id' | 'applicationNo' | 'templateName' | 'applicantId'
  >;
  applicationId?: number;
  applicantId?: number;
  status: string;
  templateName?: string | null;
  applicationNo?: string | null;
  actorName?: string | null;
  comment?: string | null;
};

type NotificationDelegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  findMany?: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst?: (args: Record<string, unknown>) => Promise<unknown | null>;
  count?: (args: Record<string, unknown>) => Promise<number>;
  updateMany?: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

type NotificationClient = {
  userNotification?: NotificationDelegate;
  notification?: NotificationDelegate;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizePage(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function getNotificationDelegate(client: NotificationClient): {
  delegate: NotificationDelegate;
  isLegacyMock: boolean;
} {
  if (client.userNotification) {
    return { delegate: client.userNotification, isLegacyMock: false };
  }
  if (client.notification) {
    return { delegate: client.notification, isLegacyMock: true };
  }
  throw new BizError('通知服务未初始化', 500, 'NOTIFICATION_CLIENT_MISSING');
}

function buildSummary(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('，');
}

function buildCreateData(
  data: {
    user: NotificationActor;
    type: UserNotificationType;
    title: string;
    summary: string;
    applicationId: number;
    taskId?: number | null;
    targetRoute: string;
  },
  isLegacyMock: boolean,
): Record<string, unknown> {
  const base = {
    userId: data.user.id,
    type: data.type,
    title: data.title,
    summary: data.summary,
    sourceType: 'APPROVAL' satisfies ArchiveSourceType,
    approvalApplicationId: data.applicationId,
    approvalTaskId: data.taskId ?? null,
    targetRoute: data.targetRoute,
    readAt: null,
  };

  if (!isLegacyMock) return base;

  return {
    ...base,
    sourceType: 'approval',
    sourceId: data.applicationId,
  };
}

function normalizeReadFilter(
  filters: NotificationListFilters,
): Prisma.UserNotificationWhereInput['readAt'] | undefined {
  if (filters.readStatus === 'unread') return null;
  if (filters.readStatus === 'read') return { not: null };
  if (typeof filters.read === 'boolean') return filters.read ? { not: null } : null;
  if (filters.read === 'true') return { not: null };
  if (filters.read === 'false') return null;
  return undefined;
}

function toSourceType(value: unknown): NotificationListItem['sourceType'] {
  if (value === 'APPROVAL' || value === 'approval') return 'approval';
  if (value === 'COLLECTION' || value === 'collection') return 'collection';
  return null;
}

function serializeNotification(row: unknown): NotificationListItem {
  const notification = row as Partial<UserNotification> & {
    sourceId?: number | null;
    read?: boolean;
  };
  const sourceType = toSourceType(notification.sourceType);
  const sourceId =
    notification.sourceId ??
    notification.approvalApplicationId ??
    notification.approvalTaskId ??
    null;
  const createdAt =
    notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt ?? Date.now());
  const readAt = notification.readAt instanceof Date ? notification.readAt : notification.readAt ? new Date(notification.readAt) : null;

  return {
    id: Number(notification.id),
    type: notification.type as UserNotificationType,
    title: String(notification.title ?? ''),
    summary: String(notification.summary ?? ''),
    sourceType,
    sourceId,
    targetRoute: String(notification.targetRoute ?? ''),
    read: Boolean(notification.read ?? readAt),
    readAt,
    createdAt,
  };
}

export async function notifyTaskAssigned(
  tx: NotificationClient | Pick<Prisma.TransactionClient, 'userNotification'>,
  input: NotifyTaskAssignedInput,
): Promise<void> {
  const { delegate, isLegacyMock } = getNotificationDelegate(tx);
  const taskId = input.task?.id ?? input.taskId;
  const applicationId = input.application?.id ?? input.applicationId ?? input.task?.applicationId;
  if (!taskId || !applicationId) {
    throw new BizError('通知缺少审批任务信息', 500, 'NOTIFICATION_TASK_MISSING');
  }

  const actor = { id: input.assigneeId };
  const templateName = input.application?.templateName ?? input.templateName ?? '审批申请';
  const applicationNo = input.application?.applicationNo ?? input.applicationNo;
  const applicantName = input.application?.applicantName ?? input.applicantName;
  const summary = buildSummary([
    applicantName ? `${applicantName}提交了${templateName}` : `${templateName}待审批`,
    applicationNo ? `编号 ${applicationNo}` : null,
  ]);

  await delegate.create({
    data: buildCreateData(
      {
        user: actor,
        type: 'NEW_TASK',
        title: '新待办审批',
        summary,
        applicationId,
        taskId,
        targetRoute: `/approval/tasks/${taskId}`,
      },
      isLegacyMock,
    ),
  });
}

export async function notifyApplicationFinalized(
  tx: NotificationClient | Pick<Prisma.TransactionClient, 'userNotification'>,
  input: NotifyApplicationFinalizedInput,
): Promise<void> {
  if (input.status !== 'APPROVED' && input.status !== 'REJECTED') return;

  const { delegate, isLegacyMock } = getNotificationDelegate(tx);
  const applicationId = input.application?.id ?? input.applicationId;
  const applicantId = input.application?.applicantId ?? input.applicantId;
  if (!applicationId || !applicantId) {
    throw new BizError('通知缺少审批申请信息', 500, 'NOTIFICATION_APPLICATION_MISSING');
  }

  const actor = { id: applicantId };
  const templateName = input.application?.templateName ?? input.templateName ?? '审批申请';
  const applicationNo = input.application?.applicationNo ?? input.applicationNo;
  const isApproved = input.status === 'APPROVED';
  const title = isApproved ? '申请已通过' : '申请已驳回';
  const summary = buildSummary([
    applicationNo ? `${templateName}（${applicationNo}）${isApproved ? '已通过' : '已驳回'}` : `${templateName}${isApproved ? '已通过' : '已驳回'}`,
    !isApproved && input.actorName ? `处理人 ${input.actorName}` : null,
    !isApproved && input.comment ? input.comment : null,
  ]);

  await delegate.create({
    data: buildCreateData(
      {
        user: actor,
        type: input.status,
        title,
        summary,
        applicationId,
        taskId: null,
        targetRoute: `/approval/applications/${applicationId}`,
      },
      isLegacyMock,
    ),
  });
}

export async function listNotifications(
  actor: NotificationActor,
  filters: NotificationListFilters = {},
  client: NotificationClient = prisma,
): Promise<NotificationListResult> {
  const { delegate } = getNotificationDelegate(client);
  const page = normalizePage(filters.page, 1);
  const size = normalizeSize(filters.size, DEFAULT_PAGE_SIZE);
  const readAt = normalizeReadFilter(filters);
  const where: Prisma.UserNotificationWhereInput = {
    userId: actor.id,
    ...(readAt !== undefined ? { readAt } : {}),
  };

  const [rows, total] = await Promise.all([
    delegate.findMany?.({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * size,
      take: size,
    }) ?? [],
    delegate.count?.({ where }) ?? 0,
  ]);

  return {
    rows: rows.map(serializeNotification),
    total,
    page,
    size,
  };
}

export async function getUnreadNotificationCount(
  actor: NotificationActor,
  client: NotificationClient = prisma,
): Promise<number> {
  const { delegate } = getNotificationDelegate(client);
  return delegate.count?.({
    where: { userId: actor.id, readAt: null },
  }) ?? 0;
}

export async function markNotificationRead(
  actor: NotificationActor,
  notificationId: number,
  client: NotificationClient = prisma,
): Promise<NotificationListItem | { updatedCount: number }> {
  const { delegate } = getNotificationDelegate(client);
  const updated = await delegate.updateMany?.({
    where: { id: notificationId, userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  const count = updated?.count ?? 0;

  if (!delegate.findFirst) {
    return { updatedCount: count };
  }

  const row = await delegate.findFirst({
    where: { id: notificationId, userId: actor.id },
  });
  if (!row) {
    throw new BizError('通知不存在', 404, 'NOTIFICATION_NOT_FOUND');
  }
  return serializeNotification(row);
}

export async function markAllNotificationsRead(
  actor: NotificationActor,
  client: NotificationClient = prisma,
): Promise<{ updatedCount: number }> {
  const { delegate } = getNotificationDelegate(client);
  const updated = await delegate.updateMany?.({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: updated?.count ?? 0 };
}
