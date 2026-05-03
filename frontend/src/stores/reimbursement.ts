import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  REIMBURSEMENT_LIST_FILTER_KEYS,
  createEmptyReimbursementFilters,
  normalizeReimbursementPayload,
  type ReimbursementAttachment,
  type ReimbursementDetail,
  type ReimbursementListFilters,
  type ReimbursementListRequest,
  type ReimbursementListResponse,
  type ReimbursementRow,
  type ReimbursementWritePayload,
} from 'src/types/reimbursement';

function mergeFilters(base: ReimbursementListFilters, filters?: ReimbursementListRequest): ReimbursementListFilters {
  const next = { ...base };
  if (!filters) return next;
  for (const key of REIMBURSEMENT_LIST_FILTER_KEYS) {
    if (key in filters) next[key] = filters[key] ?? '';
  }
  return next;
}

function buildListParams(filters: ReimbursementListFilters, page: number, size: number) {
  const params: Record<string, unknown> = { page, size };
  for (const key of REIMBURSEMENT_LIST_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) params[key] = value;
  }
  return params;
}

export const useReimbursementStore = defineStore('reimbursement', {
  state: () => ({
    rows: [] as ReimbursementRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: createEmptyReimbursementFilters(),
    current: null as ReimbursementDetail | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    uploadLoading: false,
    downloadLoading: false,
  }),
  actions: {
    async fetchList(filters?: ReimbursementListRequest) {
      this.loading = true;
      try {
        const page = Number(filters?.page ?? this.page) || 1;
        const size = Number(filters?.size ?? this.size) || 10;
        const nextFilters = mergeFilters(this.filters, filters);
        const { data } = await api.get('/reimbursements', { params: buildListParams(nextFilters, page, size) });
        const response = data as ReimbursementListResponse;
        this.rows = response.rows;
        this.total = Number(response.total) || 0;
        this.page = Number(response.page) || page;
        this.size = Number(response.size) || size;
        this.filters = nextFilters;
        return response;
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(id: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/reimbursements/${id}`);
        this.current = data as ReimbursementDetail;
        return this.current;
      } finally {
        this.detailLoading = false;
      }
    },

    async createDraft(payload: ReimbursementWritePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/reimbursements', normalizeReimbursementPayload(payload));
        return data as ReimbursementRow;
      } finally {
        this.actionLoading = false;
      }
    },

    async updateDraft(id: number, payload: ReimbursementWritePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/reimbursements/${id}`, normalizeReimbursementPayload(payload));
        if (this.current?.id === id) this.current = { ...this.current, ...(data as ReimbursementRow) };
        return data as ReimbursementRow;
      } finally {
        this.actionLoading = false;
      }
    },

    async submitDraft(id: number) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/reimbursements/${id}/submit`);
        if (this.current?.id === id) this.current = { ...this.current, ...(data as ReimbursementRow) };
        return data as ReimbursementRow;
      } finally {
        this.actionLoading = false;
      }
    },

    async uploadAttachment(id: number, file: File) {
      this.uploadLoading = true;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post(`/reimbursements/${id}/attachments`, formData);
        const attachment = data as ReimbursementAttachment;
        if (this.current?.id === id) {
          this.current.attachments = [attachment, ...this.current.attachments];
          this.current.attachmentCount = this.current.attachments.length;
        }
        return attachment;
      } finally {
        this.uploadLoading = false;
      }
    },

    async previewAttachmentBlob(id: number, attachmentId: number) {
      this.downloadLoading = true;
      try {
        const { data } = await api.get(`/reimbursements/${id}/attachments/${attachmentId}/preview`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.downloadLoading = false;
      }
    },

    async downloadAttachment(id: number, attachmentId: number) {
      this.downloadLoading = true;
      try {
        const { data } = await api.get(`/reimbursements/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.downloadLoading = false;
      }
    },

    async deleteAttachment(id: number, attachmentId: number) {
      this.actionLoading = true;
      try {
        await api.delete(`/reimbursements/${id}/attachments/${attachmentId}`);
        if (this.current?.id === id) {
          this.current.attachments = this.current.attachments.filter((item) => item.id !== attachmentId);
          this.current.attachmentCount = this.current.attachments.length;
        }
      } finally {
        this.actionLoading = false;
      }
    },
  },
});
