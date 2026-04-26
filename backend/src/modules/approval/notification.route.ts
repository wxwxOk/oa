import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationActor,
  type NotificationListFilters,
  type NotificationListItem,
  type NotificationListResult,
} from './notification.service';

type RouteDate = Date | string | null;

export type NotificationRouteItem = Omit<NotificationListItem, 'createdAt' | 'readAt'> & {
  readAt: RouteDate;
  createdAt: Date | string;
};

export const notificationListQuerySchema = t.Object({
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  read: t.Optional(t.Union([t.Boolean(), t.String()])),
  readStatus: t.Optional(t.Union([t.Literal('read'), t.Literal('unread'), t.Literal('all')])),
});

const paramsSchema = t.Object({
  id: t.String(),
});

export const markNotificationReadBodySchema = t.Object({}, { additionalProperties: false });
export const markAllNotificationsReadBodySchema = t.Object({}, { additionalProperties: false });

function toIso(value: RouteDate): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toActor(currentUser: { id: number; realName?: string; username?: string }): NotificationActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
  };
}

export function serializeNotificationItem(row: NotificationRouteItem) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    targetRoute: row.targetRoute,
    read: row.read,
    readAt: toIso(row.readAt),
    createdAt: toIso(row.createdAt),
  };
}

export function serializeNotificationListResponse(response: {
  rows: NotificationRouteItem[];
  total: number;
  page: number;
  size: number;
}) {
  return {
    rows: response.rows.map(serializeNotificationItem),
    total: response.total,
    page: response.page,
    size: response.size,
  };
}

export function serializeUnreadNotificationCount(count: number) {
  return { unread: count };
}

export const notificationModule = new Elysia({ prefix: '/notifications' })
  .use(authGuard())
  .get(
    '/',
    async ({ query, currentUser }: any) =>
      serializeNotificationListResponse(
        (await listNotifications(
          toActor(currentUser),
          query as NotificationListFilters,
        )) as NotificationListResult,
      ),
    { query: notificationListQuerySchema },
  )
  .get('/unread-count', async ({ currentUser }: any) => {
    const unread = await getUnreadNotificationCount(toActor(currentUser));
    return {
      ...serializeUnreadNotificationCount(unread),
      unreadCount: unread,
    };
  })
  .patch(
    '/:id/read',
    async ({ params, currentUser }: any) => {
      const result = await markNotificationRead(toActor(currentUser), Number(params.id));
      if ('updatedCount' in result) return result;
      return serializeNotificationItem(result);
    },
    { params: paramsSchema, body: markNotificationReadBodySchema },
  )
  .post(
    '/mark-all-read',
    async ({ currentUser }: any) => markAllNotificationsRead(toActor(currentUser)),
    { body: markAllNotificationsReadBodySchema },
  );
