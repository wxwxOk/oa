import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  CHANNEL_PUSH_LIST_FILTER_KEYS,
  CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS,
  createEmptyChannelPushFilters,
  createEmptyChannelPushReviewFilters,
  normalizeChannelPushPayload,
  type ChannelPushAttachment,
  type ChannelPushBatchImportResponse,
  type ChannelPushDetail,
  type ChannelPushDuplicateHint,
  type ChannelPushListFilters,
  type ChannelPushListRequest,
  type ChannelPushListResponse,
  type ChannelPushReviewDecisionPayload,
  type ChannelPushReviewDetail,
  type ChannelPushReviewInternalFieldsPayload,
  type ChannelPushReviewListFilters,
  type ChannelPushReviewListRequest,
  type ChannelPushReviewListResponse,
  type ChannelPushRow,
  type ChannelPushSubmitResponse,
  type ChannelPushWritePayload,
} from 'src/types/channelPush';

function mergeFilters(base: ChannelPushListFilters, filters?: ChannelPushListRequest) {
  const next = { ...base };
  if (!filters) return next;
  for (const key of CHANNEL_PUSH_LIST_FILTER_KEYS) {
    if (key in filters) next[key] = (filters[key] ?? '') as string;
  }
  return next;
}

function buildListParams(filters: ChannelPushListFilters, page: number, size: number) {
  const params: Record<string, unknown> = { page, size };
  for (const key of CHANNEL_PUSH_LIST_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) params[key] = value;
  }
  return params;
}

function mergeReviewFilters(base: ChannelPushReviewListFilters, filters?: ChannelPushReviewListRequest) {
  const next = { ...base };
  if (!filters) return next;
  for (const key of CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS) {
    if (key in filters) next[key] = (filters[key] ?? '') as string;
  }
  return next;
}

function buildReviewListParams(filters: ChannelPushReviewListFilters, page: number, size: number) {
  const params: Record<string, unknown> = { page, size };
  for (const key of CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) params[key] = value;
  }
  return params;
}

function buildCreateFormData(payload: ChannelPushWritePayload, files: File[]) {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(normalizeChannelPushPayload(payload)));
  for (const file of files) formData.append('attachments', file);
  return formData;
}

function buildAttachmentFormData(files: File[]) {
  const formData = new FormData();
  for (const file of files) formData.append('attachments', file);
  return formData;
}

export const useChannelPushStore = defineStore('channelPush', {
  state: () => ({
    rows: [] as ChannelPushRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: createEmptyChannelPushFilters(),
    current: null as ChannelPushDetail | null,
    lastDuplicateHints: [] as ChannelPushDuplicateHint[],
    loading: false,
    detailLoading: false,
    actionLoading: false,
    uploadLoading: false,
    downloadLoading: false,
    importLoading: false,
    reviewPendingRows: [] as ChannelPushReviewListResponse['rows'],
    reviewHandledRows: [] as ChannelPushReviewListResponse['rows'],
    reviewPendingTotal: 0,
    reviewHandledTotal: 0,
    reviewPendingPage: 1,
    reviewHandledPage: 1,
    reviewPendingSize: 10,
    reviewHandledSize: 10,
    reviewPendingFilters: createEmptyChannelPushReviewFilters(),
    reviewHandledFilters: createEmptyChannelPushReviewFilters(),
    reviewCurrent: null as ChannelPushReviewDetail | null,
    reviewLoading: false,
    reviewDetailLoading: false,
    reviewActionLoading: false,
    reviewDownloadLoading: false,
  }),
  actions: {
    async fetchMine(filters?: ChannelPushListRequest) {
      this.loading = true;
      try {
        const page = Number(filters?.page ?? this.page) || 1;
        const size = Number(filters?.size ?? this.size) || 10;
        const nextFilters = mergeFilters(this.filters, filters);
        const { data } = await api.get('/channel-push/mine', { params: buildListParams(nextFilters, page, size) });
        const response = data as ChannelPushListResponse;
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
        const { data } = await api.get(`/channel-push/${id}`);
        this.current = data as ChannelPushDetail;
        return this.current;
      } finally {
        this.detailLoading = false;
      }
    },

    async create(payload: ChannelPushWritePayload, files: File[] = []) {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/channel-push', buildCreateFormData(payload, files));
        const response = data as ChannelPushSubmitResponse;
        this.lastDuplicateHints = response.duplicateHints ?? [];
        this.current = response.push;
        return response;
      } finally {
        this.actionLoading = false;
      }
    },

    // Phase 34: Excel batch import. Body is strictly { rows } (D-21).
    // Errors propagate so the global axios interceptor handles 4xx Notify (D-23).
    // After success, refresh the list so imported rows appear immediately (M5).
    // @see PLAN 34-02 task 02 — batchImport action contract.
    async batchImport(rows: ChannelPushWritePayload[]): Promise<ChannelPushBatchImportResponse> {
      this.importLoading = true;
      try {
        const { data } = await api.post('/channel-push/batch-import', { rows });
        const response = data as ChannelPushBatchImportResponse;
        await this.fetchMine(this.filters);
        return response;
      } finally {
        this.importLoading = false;
      }
    },

    async update(id: number, payload: ChannelPushWritePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.patch(`/channel-push/${id}`, normalizeChannelPushPayload(payload));
        const response = data as ChannelPushSubmitResponse;
        this.lastDuplicateHints = response.duplicateHints ?? [];
        if (this.current?.id === id) this.current = response.push;
        return response;
      } finally {
        this.actionLoading = false;
      }
    },

    async cancel(id: number) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/channel-push/${id}/cancel`);
        const detail = data as ChannelPushDetail;
        if (this.current?.id === id) this.current = detail;
        return detail;
      } finally {
        this.actionLoading = false;
      }
    },

    async addAttachments(id: number, files: File[]) {
      this.uploadLoading = true;
      try {
        const { data } = await api.post(`/channel-push/${id}/attachments`, buildAttachmentFormData(files));
        return data as { push: ChannelPushDetail; attachments: ChannelPushAttachment[] };
      } finally {
        this.uploadLoading = false;
      }
    },

    async previewAttachmentBlob(id: number, attachmentId: number) {
      this.downloadLoading = true;
      try {
        const { data } = await api.get(`/channel-push/${id}/attachments/${attachmentId}/preview`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.downloadLoading = false;
      }
    },

    async downloadAttachment(id: number, attachmentId: number) {
      this.downloadLoading = true;
      try {
        const { data } = await api.get(`/channel-push/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.downloadLoading = false;
      }
    },

    async deleteAttachment(id: number, attachmentId: number) {
      this.actionLoading = true;
      try {
        await api.delete(`/channel-push/${id}/attachments/${attachmentId}`);
        if (this.current?.id === id) {
          this.current.attachments = this.current.attachments.filter((a) => a.id !== attachmentId);
          this.current.attachmentCount = this.current.attachments.length;
        }
      } finally {
        this.actionLoading = false;
      }
    },

    async fetchReviewPending(filters?: ChannelPushReviewListRequest) {
      this.reviewLoading = true;
      try {
        const page = Number(filters?.page ?? this.reviewPendingPage) || 1;
        const size = Number(filters?.size ?? this.reviewPendingSize) || 10;
        const nextFilters = mergeReviewFilters(this.reviewPendingFilters, filters);
        const { data } = await api.get('/review/channel-push/pending', {
          params: buildReviewListParams(nextFilters, page, size),
        });
        const response = data as ChannelPushReviewListResponse;
        this.reviewPendingRows = response.rows;
        this.reviewPendingTotal = Number(response.total) || 0;
        this.reviewPendingPage = Number(response.page) || page;
        this.reviewPendingSize = Number(response.size) || size;
        this.reviewPendingFilters = nextFilters;
        return response;
      } finally {
        this.reviewLoading = false;
      }
    },

    async fetchReviewHandled(filters?: ChannelPushReviewListRequest) {
      this.reviewLoading = true;
      try {
        const page = Number(filters?.page ?? this.reviewHandledPage) || 1;
        const size = Number(filters?.size ?? this.reviewHandledSize) || 10;
        const nextFilters = mergeReviewFilters(this.reviewHandledFilters, filters);
        const { data } = await api.get('/review/channel-push/handled', {
          params: buildReviewListParams(nextFilters, page, size),
        });
        const response = data as ChannelPushReviewListResponse;
        this.reviewHandledRows = response.rows;
        this.reviewHandledTotal = Number(response.total) || 0;
        this.reviewHandledPage = Number(response.page) || page;
        this.reviewHandledSize = Number(response.size) || size;
        this.reviewHandledFilters = nextFilters;
        return response;
      } finally {
        this.reviewLoading = false;
      }
    },

    async fetchReviewDetail(id: number) {
      this.reviewDetailLoading = true;
      try {
        const { data } = await api.get(`/review/channel-push/${id}`);
        this.reviewCurrent = data as ChannelPushReviewDetail;
        return this.reviewCurrent;
      } finally {
        this.reviewDetailLoading = false;
      }
    },

    async saveReviewInternalFields(id: number, payload: ChannelPushReviewInternalFieldsPayload) {
      this.reviewActionLoading = true;
      try {
        const { data } = await api.patch(`/review/channel-push/${id}/internal-fields`, payload);
        this.reviewCurrent = data as ChannelPushReviewDetail;
        return this.reviewCurrent;
      } finally {
        this.reviewActionLoading = false;
      }
    },

    async approveReview(id: number, payload: ChannelPushReviewDecisionPayload = {}) {
      this.reviewActionLoading = true;
      try {
        const { data } = await api.post(`/review/channel-push/${id}/approve`, payload);
        this.reviewCurrent = data as ChannelPushReviewDetail;
        return this.reviewCurrent;
      } finally {
        this.reviewActionLoading = false;
      }
    },

    async rejectReview(id: number, payload: ChannelPushReviewDecisionPayload) {
      this.reviewActionLoading = true;
      try {
        const { data } = await api.post(`/review/channel-push/${id}/reject`, payload);
        this.reviewCurrent = data as ChannelPushReviewDetail;
        return this.reviewCurrent;
      } finally {
        this.reviewActionLoading = false;
      }
    },

    async previewReviewAttachmentBlob(id: number, attachmentId: number) {
      this.reviewDownloadLoading = true;
      try {
        const { data } = await api.get(`/review/channel-push/${id}/attachments/${attachmentId}/preview`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.reviewDownloadLoading = false;
      }
    },

    async downloadReviewAttachmentBlob(id: number, attachmentId: number) {
      this.reviewDownloadLoading = true;
      try {
        const { data } = await api.get(`/review/channel-push/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
        return data as Blob;
      } finally {
        this.reviewDownloadLoading = false;
      }
    },
  },
});
