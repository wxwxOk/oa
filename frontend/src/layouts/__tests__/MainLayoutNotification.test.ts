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

  it('pins notification menu copy and mark-read controls', () => {
    expect(source).toContain('站内通知');
    expect(source).toContain('全部标为已读');
    expect(source).toContain('暂无站内通知');
    expect(source).toContain('新的待办和审批结果会显示在这里。');
    expect(source).toContain('markAllRead');
  });

  it('refreshes notification counts on page focus and fixed interval polling', () => {
    expect(source).toMatch(/addEventListener\(['"]focus['"]/);
    expect(source).toContain('setInterval');
    expect(source).toContain('clearInterval');
  });

  it('keeps the Phase 19 notification contract polling-only, without WebSocket or SSE', () => {
    expect(source).not.toContain('WebSocket');
    expect(source).not.toContain('EventSource');
  });
});
