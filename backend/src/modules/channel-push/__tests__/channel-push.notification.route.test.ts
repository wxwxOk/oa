import { describe, expect, it } from 'bun:test';

async function routeSource() {
  return Bun.file(new URL('../channel-push-notification.route.ts', import.meta.url)).text();
}

async function serviceSource() {
  return Bun.file(new URL('../channel-push-notification.service.ts', import.meta.url)).text();
}

async function schemaSource() {
  return Bun.file(new URL('../../../../prisma/schema.prisma', import.meta.url)).text();
}

function block(source: string, kind: 'enum' | 'model', name: string) {
  const match = source.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  expect(match?.[0]).toBeTruthy();
  return match![0];
}

describe('channel-push notification route and schema contract', () => {
  it('pins notification schema and channel-push enum names', async () => {
    const schema = await schemaSource();
    const notificationType = block(schema, 'enum', 'UserNotificationType');
    const notification = block(schema, 'model', 'UserNotification');
    const user = block(schema, 'model', 'User');

    expect(notificationType).toContain('CHANNEL_PUSH_PENDING_REVIEW');
    expect(notificationType).toContain('CHANNEL_PUSH_REVIEWED');
    expect(notification).toContain('userId');
    expect(notification).toContain('targetRoute');
    expect(notification).toContain('sourceType');
    expect(notification).toContain('sourceId');
    expect(notification).toContain('@@index([userId, readAt])');
    expect(notification).toContain('@@index([userId, createdAt])');
    expect(user).toContain('notifications');
  });

  it('exports user-scoped notification endpoints under /notifications', async () => {
    const source = await routeSource();

    expect(source).toContain("new Elysia({ prefix: '/notifications' })");
    expect(source).toContain('GET /notifications');
    expect(source).toContain('GET /notifications/unread-count');
    expect(source).toContain('POST /notifications/:id/read');
    expect(source).toContain('POST /notifications/read-all');
    expect(source).toContain("'/unread-count'");
    expect(source).toContain("'/:id/read'");
    expect(source).toContain("'/read-all'");
    expect(source).toContain('authGuard()');
  });

  it('does not accept client userId and delegates all scoping to currentUser', async () => {
    const route = await routeSource();
    const service = await serviceSource();

    expect(route).not.toMatch(/\buserId\b[\s\S]*t\./);
    expect(route).toContain('toActor(currentUser)');
    expect(service).toContain('userId: actor.id');
    expect(service).toContain('readAt: null');
    expect(service).toContain('targetRoute');
    expect(service).toContain('CHANNEL_PUSH_PENDING_REVIEW');
    expect(service).toContain('CHANNEL_PUSH_REVIEWED');
  });

  it('pins route registration in backend index', async () => {
    const source = await Bun.file(new URL('../../../index.ts', import.meta.url)).text();

    expect(source).toContain('channelPushNotificationModule');
    expect(source).toContain("from './modules/channel-push/channel-push-notification.route'");
  });
});
