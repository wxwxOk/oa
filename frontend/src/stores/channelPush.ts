import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  CHANNEL_PUSH_LIST_FILTER_KEYS,
  createEmptyChannelPushFilters,
  normalizeChannelPushPayload,
  type ChannelPushAttachment,
  type ChannelPushDetail,
  type ChannelPushDuplicateHint,
  type ChannelPushListFilters,
  type ChannelPushListRequest,
  type ChannelPushListResponse,
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
  },
});
