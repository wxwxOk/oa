import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export interface ShareLinkStatsRow {
  id: number;
  code: string;
  createdAt: string;
  template: { id: number; name: string };
  creator: { id: number; realName: string };
  submissionCount: number;
}

export const useShareLinkStatsStore = defineStore('shareLinkStats', {
  state: () => ({
    rows: [] as ShareLinkStatsRow[],
    total: 0,
    loading: false,
    page: 1,
    size: 20,
  }),
  actions: {
    async fetchList(filters?: Record<string, any>) {
      this.loading = true;
      try {
        const { data } = await api.get('/share-link-stats', {
          params: { page: this.page, size: this.size, ...filters },
        });
        this.rows = data.rows;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
  },
});
