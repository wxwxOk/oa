import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useNotificationStore } from '../notification';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
};

const notification = {
  id: 7,
  type: 'CHANNEL_PUSH_PENDING_REVIEW',
  title: '渠道推送待审核',
  summary: '渠道A · 张三 · 等待审核',
  sourceType: 'CHANNEL_PUSH',
  sourceId: 17,
  targetRoute: '/review/channel-push/17',
  readAt: null,
  createdAt: '2026-05-07T09:30:00.000Z',
};

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
  });

  it('fetches the current user unread count from GET /notifications/unread-count', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { count: 3 } });

    const store = useNotificationStore();
    const result = await store.fetchUnreadCount();

    expect(mockedApi.get).toHaveBeenCalledWith('/notifications/unread-count');
    expect(result).toBe(3);
    expect(store.unreadCount).toBe(3);
  });

  it('fetches the current user notifications without sending a client-side userId', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { rows: [notification], total: 1, page: 1, size: 20 },
    });

    const store = useNotificationStore();
    await store.fetchList({ page: 1, size: 20, read: false });

    expect(mockedApi.get).toHaveBeenCalledWith('/notifications', {
      params: { page: 1, size: 20, read: false },
    });
    expect(mockedApi.get.mock.calls[0]![1].params).not.toHaveProperty('userId');
    expect(store.rows).toEqual([notification]);
    expect(store.loading).toBe(false);
  });

  it('uses POST read endpoints and keeps target users server-derived', async () => {
    mockedApi.post
      .mockResolvedValueOnce({
        data: { ...notification, readAt: '2026-05-07T10:00:00.000Z' },
      })
      .mockResolvedValueOnce({ data: { updated: 3 } });

    const store = useNotificationStore();
    store.rows = [notification];
    store.unreadCount = 4;

    await store.markRead(7);
    await store.markAllRead();

    expect(mockedApi.post.mock.calls[0]).toEqual(['/notifications/7/read']);
    expect(mockedApi.post.mock.calls[1]).toEqual(['/notifications/read-all']);
    expect(store.unreadCount).toBe(0);

    const serializedCalls = JSON.stringify(mockedApi.post.mock.calls);
    expect(serializedCalls).not.toContain('userId');
    expect(serializedCalls).not.toContain('targetUserId');
  });

  it('resets loading and actionLoading when notification requests fail', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('unread'))
      .mockRejectedValueOnce(new Error('list'));
    mockedApi.post
      .mockRejectedValueOnce(new Error('read'))
      .mockRejectedValueOnce(new Error('all-read'));

    const store = useNotificationStore();
    await expect(store.fetchUnreadCount()).rejects.toThrow('unread');
    await expect(store.fetchList()).rejects.toThrow('list');
    await expect(store.markRead(7)).rejects.toThrow('read');
    await expect(store.markAllRead()).rejects.toThrow('all-read');

    expect(store.loading).toBe(false);
    expect(store.actionLoading).toBe(false);
  });
});
