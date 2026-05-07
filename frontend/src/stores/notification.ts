import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  isNotificationUnread,
  type MarkAllNotificationsReadResponse,
  type NotificationItem,
  type NotificationListFilters,
  type NotificationListResponse,
  type NotificationUnreadCount,
} from 'src/types/notification';

function buildNotificationParams(filters?: NotificationListFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!filters) return params;
  if (filters.page) params.page = filters.page;
  if (filters.size) params.size = filters.size;
  if (typeof filters.read === 'boolean') params.read = filters.read;
  return params;
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    rows: [] as NotificationItem[],
    total: 0,
    page: 1,
    size: 20,
    unreadCount: 0,
    loading: false,
    actionLoading: false,
    lastFetchedAt: null as string | null,
  }),
  actions: {
    async fetchUnreadCount() {
      this.loading = true;
      try {
        const { data } = await api.get('/notifications/unread-count');
        const response = data as NotificationUnreadCount;
        this.unreadCount = Number(response.count) || 0;
        return this.unreadCount;
      } finally {
        this.loading = false;
      }
    },

    async fetchList(filters?: NotificationListFilters) {
      this.loading = true;
      try {
        const params = buildNotificationParams({
          page: filters?.page ?? this.page,
          size: filters?.size ?? this.size,
          read: filters?.read,
        });
        const { data } = await api.get('/notifications', { params });
        const response = data as NotificationListResponse;
        this.rows = response.rows;
        this.total = Number(response.total) || 0;
        this.page = Number(response.page) || this.page;
        this.size = Number(response.size) || this.size;
        this.lastFetchedAt = new Date().toISOString();
        return response;
      } finally {
        this.loading = false;
      }
    },

    async markRead(id: number) {
      this.actionLoading = true;
      try {
        const wasUnread = this.rows.some((item) => item.id === id && isNotificationUnread(item));
        const { data } = await api.post(`/notifications/${id}/read`);
        const row = data as NotificationItem;
        this.rows = this.rows.map((item) => (item.id === id ? row : item));
        if (wasUnread && !isNotificationUnread(row)) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        return row;
      } finally {
        this.actionLoading = false;
      }
    },

    async markAllRead() {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/notifications/read-all');
        const readAt = new Date().toISOString();
        this.rows = this.rows.map((item) => (isNotificationUnread(item) ? { ...item, readAt } : item));
        this.unreadCount = 0;
        return data as MarkAllNotificationsReadResponse;
      } finally {
        this.actionLoading = false;
      }
    },

    reset() {
      this.rows = [];
      this.total = 0;
      this.page = 1;
      this.size = 20;
      this.unreadCount = 0;
      this.loading = false;
      this.actionLoading = false;
      this.lastFetchedAt = null;
    },
  },
});
