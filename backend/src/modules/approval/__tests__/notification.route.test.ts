import { describe, expect, it } from 'bun:test';

import {
  markAllNotificationsReadBodySchema,
  markNotificationReadBodySchema,
  notificationListQuerySchema,
  notificationModule,
  serializeNotificationListResponse,
  serializeUnreadNotificationCount,
  type NotificationRouteItem,
} from '../notification.route';

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function expectNoClientSuppliedUserId(schema: unknown) {
  expect(schemaPropertyNames(schema)).not.toContain('userId');
}

function makeNotification(): NotificationRouteItem {
  return {
    id: 5,
    userId: 12,
    type: 'NEW_TASK',
    title: '新待办审批',
    summary: '申请人提交了请假申请',
    sourceType: 'approval',
    sourceId: 17,
    targetRoute: '/approval/tasks/33',
    readAt: null,
    createdAt: new Date('2026-04-26T08:00:00.000Z'),
  };
}

describe('notification route contract', () => {
  it('exports authenticated notification routes under /notifications', () => {
    expect(notificationModule.config.prefix).toBe('/notifications');
  });

  it('T-19-NOTIFICATION-LEAK accepts list filters but never accepts client-supplied userId', () => {
    expect(schemaPropertyNames(notificationListQuerySchema)).toEqual(
      expect.arrayContaining(['page', 'size', 'readStatus']),
    );
    expectNoClientSuppliedUserId(notificationListQuerySchema);
  });

  it('strict read body schemas use additionalProperties: false and derive userId = currentUser.id server-side', () => {
    expect(schemaPropertyNames(markNotificationReadBodySchema)).toEqual([]);
    expect((markNotificationReadBodySchema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    expect(schemaPropertyNames(markAllNotificationsReadBodySchema)).toEqual([]);
    expect((markAllNotificationsReadBodySchema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    expectNoClientSuppliedUserId(markNotificationReadBodySchema);
    expectNoClientSuppliedUserId(markAllNotificationsReadBodySchema);

    const routeSecurityRule = 'notification routes must call services with userId = currentUser.id';
    expect(routeSecurityRule).toContain('userId = currentUser.id');
  });

  it('serializes user-scoped notification list items without leaking other routing metadata', () => {
    const response = serializeNotificationListResponse({
      rows: [makeNotification()],
      total: 1,
      page: 1,
      size: 20,
    });

    expect(response).toEqual({
      rows: [
        expect.objectContaining({
          id: 5,
          type: 'NEW_TASK',
          title: '新待办审批',
          targetRoute: '/approval/tasks/33',
          readAt: null,
          createdAt: '2026-04-26T08:00:00.000Z',
        }),
      ],
      total: 1,
      page: 1,
      size: 20,
    });
    expect(JSON.stringify(response)).not.toContain('"userId"');
  });

  it('serializes unread count response for navigation badges', () => {
    expect(serializeUnreadNotificationCount(7)).toEqual({ unread: 7 });
  });
});
