import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListQuery,
} from './channel-push-notification.service';
import type { ChannelPushActor } from './channel-push.service';

export const notificationListQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  size: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
  read: t.Optional(t.Union([t.Boolean(), t.String()])),
});

const idParams = t.Object({ id: t.String() });

function toActor(currentUser: {
  id: number;
  username?: string;
  realName?: string;
  roleCodes?: string[];
  permissions?: string[];
}): ChannelPushActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
    roleCodes: currentUser.roleCodes ?? [],
    permissions: currentUser.permissions ?? [],
  };
}

// GET /notifications
// GET /notifications/unread-count
// POST /notifications/:id/read
// POST /notifications/read-all
export const channelPushNotificationModule = new Elysia({ prefix: '/notifications' })
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/',
      async ({ query, currentUser }: any) => listNotifications(toActor(currentUser), query as NotificationListQuery),
      { query: notificationListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get('/unread-count', async ({ currentUser }: any) =>
      getUnreadNotificationCount(toActor(currentUser)),
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).post(
      '/:id/read',
      async ({ params, currentUser }: any) => markNotificationRead(toActor(currentUser), Number(params.id)),
      { params: idParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).post('/read-all', async ({ currentUser }: any) => markAllNotificationsRead(toActor(currentUser))),
  );
