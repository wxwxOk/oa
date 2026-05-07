import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../MainLayout.vue'), 'utf8');

describe('MainLayout notification contract', () => {
  it('adds an accessible header notification button with capped unread badge', () => {
    expect(source).toContain('useNotificationStore');
    expect(source).toContain('icon="notifications"');
    expect(source).toContain('aria-label="站内通知"');
    expect(source).toContain('<q-badge');
    expect(source).toContain('floating');
    expect(source).toContain('99+');
  });

  it('pins desktop menu, mobile dialog, empty copy, and mark-all-read controls', () => {
    expect(source).toContain('<q-menu');
    expect(source).toContain('width: 360px');
    expect(source).toContain('<q-dialog');
    expect(source).toContain('maximized');
    expect(source).toContain('全部标为已读');
    expect(source).toContain('暂无站内通知');
    expect(source).toContain('新的待办和审批结果会显示在这里。');
    expect(source).toContain('markAllRead');
  });

  it('refreshes notification counts on page focus and fixed interval polling', () => {
    expect(source).toMatch(/addEventListener\(['"]focus['"]/);
    expect(source).toMatch(/removeEventListener\(['"]focus['"]/);
    expect(source).toContain('setInterval');
    expect(source).toContain('clearInterval');
    expect(source).toContain('60_000');
  });

  it('navigates to targetRoute before marking a notification read', () => {
    expect(source).toContain('targetRoute');
    expect(source).toContain('router.push(item.targetRoute)');
    expect(source).toContain('notification.markRead(item.id)');
    expect(source.indexOf('router.push(item.targetRoute)')).toBeLessThan(
      source.indexOf('notification.markRead(item.id)'),
    );
  });

  it('keeps mobile notification rows touch-safe without WebSocket or SSE', () => {
    expect(source).toContain('notification-row--mobile');
    expect(source).toContain('min-height: 64px');
    expect(source).not.toContain('WebSocket');
    expect(source).not.toContain('EventSource');
  });
});
