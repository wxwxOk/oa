export const NOTIFICATION_TYPES = [
  'CHANNEL_PUSH_PENDING_REVIEW',
  'CHANNEL_PUSH_REVIEWED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  summary: string | null;
  targetRoute: string;
  sourceType: string;
  sourceId: number;
  readAt: string | null;
  createdAt: string | null;
}

export interface NotificationListFilters {
  page?: number;
  size?: number;
  read?: boolean | null;
}

export interface NotificationListResponse {
  rows: NotificationItem[];
  total: number;
  page: number;
  size: number;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface MarkAllNotificationsReadResponse {
  updated: number;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CHANNEL_PUSH_PENDING_REVIEW: '渠道推送待审核',
  CHANNEL_PUSH_REVIEWED: '我的推送已审核',
};

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function notificationTargetRoute(notification: Pick<NotificationItem, 'targetRoute'>): string {
  return notification.targetRoute;
}

export function isNotificationUnread(notification: Pick<NotificationItem, 'readAt'>): boolean {
  return !notification.readAt;
}

export function formatNotificationDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function notificationCreatedAt(notification: Pick<NotificationItem, 'createdAt'>): string {
  return formatNotificationDate(notification.createdAt);
}

export function notificationReadAt(notification: Pick<NotificationItem, 'readAt'>): string {
  return formatNotificationDate(notification.readAt);
}
