import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useNotificationStore } from '../notification';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  patch: Mock;
  post: Mock;
};

const notification = {
  id: 7,
  type: 'TASK_ASSIGNED',
  title: '新的待办审批',
  summary: '请处理请假申请',
  sourceType: 'approval',
  sourceId: 17,
  targetRoute: '/approval/tasks/9',
  read: false,
  createdAt: '2026-04-26T09:30:00.000Z',
};

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.patch.mockReset();
    mockedApi.post.mockReset();
  });

  it('fetches the current user unread count from GET /notifications/unread-count', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { unreadCount: 3 } });

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
    expect(mockedApi.get.mock.calls[0][1].params).not.toHaveProperty('userId');
    expect(store.rows).toEqual([notification]);
    expect(store.loading).toBe(false);
  });

  it('uses PATCH /notifications/{id}/read and POST mark-all-read through scoped endpoints', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { ...notification, read: true } });
    mockedApi.post.mockResolvedValueOnce({ data: { updatedCount: 3 } });

    const store = useNotificationStore();
    await store.markRead(7);
    await store.markAllRead();

    expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/7/read');
    expect(mockedApi.post).toHaveBeenCalledWith('/notifications/mark-all-read');
    expect(mockedApi.patch.mock.calls[0]).not.toContainEqual(expect.objectContaining({ userId: expect.anything() }));
    expect(mockedApi.post.mock.calls[0]).not.toContainEqual(expect.objectContaining({ userId: expect.anything() }));
  });

  it('documents T-19-NOTIFICATION-LEAK by keeping target users server-derived', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 20 } });
    mockedApi.patch.mockResolvedValueOnce({ data: { ...notification, read: true } });
    mockedApi.post.mockResolvedValueOnce({ data: { updatedCount: 0 } });

    const store = useNotificationStore();
    await store.fetchList();
    await store.markRead(7);
    await store.markAllRead();

    const serializedCalls = JSON.stringify([
      mockedApi.get.mock.calls,
      mockedApi.patch.mock.calls,
      mockedApi.post.mock.calls,
    ]);
    expect(serializedCalls).not.toContain('userId');
    expect(serializedCalls).not.toContain('targetUserId');
  });

  it('resets loading and actionLoading when notification requests fail', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('unread'))
      .mockRejectedValueOnce(new Error('list'));
    mockedApi.patch.mockRejectedValueOnce(new Error('read'));
    mockedApi.post.mockRejectedValueOnce(new Error('all-read'));

    const store = useNotificationStore();
    await expect(store.fetchUnreadCount()).rejects.toThrow('unread');
    await expect(store.fetchList()).rejects.toThrow('list');
    await expect(store.markRead(7)).rejects.toThrow('read');
    await expect(store.markAllRead()).rejects.toThrow('all-read');

    expect(store.loading).toBe(false);
    expect(store.actionLoading).toBe(false);
  });
});
