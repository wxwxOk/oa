import type { ArchiveSourceType } from './approvalArchive';

export type NotificationType = 'NEW_TASK' | 'TASK_ASSIGNED' | 'APPROVED' | 'REJECTED';

export interface NotificationRow {
  id: number;
  type: NotificationType;
  title: string;
  summary: string;
  sourceType: ArchiveSourceType | 'task' | null;
  sourceId: number | null;
  targetRoute: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationListFilters {
  page?: number;
  size?: number;
  read?: boolean | null;
}

export interface NotificationListResponse {
  rows: NotificationRow[];
  total: number;
  page: number;
  size: number;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  NEW_TASK: '新的待办审批',
  TASK_ASSIGNED: '新的待办审批',
  APPROVED: '申请已通过',
  REJECTED: '申请已驳回',
};

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function notificationTargetRoute(notification: Pick<NotificationRow, 'targetRoute'>): string {
  return notification.targetRoute;
}
