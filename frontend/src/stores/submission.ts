import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export interface SubmissionRow {
  id: number;
  data: Record<string, any>;
  schemaVersion: number;
  submitterName: string | null;
  submitterPhone: string | null;
  createdAt: string;
  shareLink: {
    id: number;
    creator: { id: number; realName: string };
  };
}

export interface SubmissionDetail extends SubmissionRow {
  template: {
    name: string;
    schema: any[];
    schemaVersion: number;
  };
}

export interface SharerOption {
  id: number;
  realName: string;
}

export const useSubmissionStore = defineStore('submission', {
  state: () => ({
    rows: [] as SubmissionRow[],
    total: 0,
    loading: false,
    page: 1,
    size: 20,
  }),
  actions: {
    async fetchList(templateId: number, filters?: Record<string, any>) {
      this.loading = true;
      try {
        const params: Record<string, unknown> = {
          page: this.page,
          size: this.size,
          ...filters,
        };
        const { data } = await api.get(
          `/templates/${templateId}/submissions`,
          { params },
        );
        this.rows = data.rows;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(templateId: number, submissionId: number): Promise<SubmissionDetail> {
      const { data } = await api.get(
        `/templates/${templateId}/submissions/${submissionId}`,
      );
      return data;
    },
    async fetchSharers(templateId: number): Promise<SharerOption[]> {
      const { data } = await api.get(
        `/templates/${templateId}/submissions/sharers`,
      );
      return data;
    },
  },
});
