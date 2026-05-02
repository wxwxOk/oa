import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type {
  MarkAllNotificationsReadResponse,
  NotificationListFilters,
  NotificationListResponse,
  NotificationRow,
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
    rows: [] as NotificationRow[],
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
        this.unreadCount = Number(data.unreadCount ?? 0);
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
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
        this.lastFetchedAt = new Date().toISOString();
        return data as NotificationListResponse;
      } finally {
        this.loading = false;
      }
    },
    async markRead(id: number) {
      this.actionLoading = true;
      try {
        const { data } = await api.patch(`/notifications/${id}/read`);
        const row = data as NotificationRow;
        this.rows = this.rows.map((item) => (item.id === id ? row : item));
        this.unreadCount = Math.max(0, this.unreadCount - (row.read ? 1 : 0));
        return row;
      } finally {
        this.actionLoading = false;
      }
    },
    async markAllRead() {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/notifications/mark-all-read');
        this.rows = this.rows.map((item) => ({ ...item, read: true }));
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
