import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type {
  ApplicationListFilters,
  ApprovalApplicationDetail,
  ApprovalApplicationRow,
  AvailableApprovalTemplate,
  CreateDraftPayload,
} from 'src/types/approvalApplication';

export const useApprovalApplicationStore = defineStore('approvalApplication', {
  state: () => ({
    templates: [] as AvailableApprovalTemplate[],
    rows: [] as ApprovalApplicationRow[],
    total: 0,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    page: 1,
    size: 10,
    statusFilter: '' as ApplicationListFilters['status'],
    dateFrom: '',
    dateTo: '',
    current: null as ApprovalApplicationDetail | null,
  }),
  actions: {
    async fetchTemplates() {
      const { data } = await api.get('/approval/applications/templates');
      this.templates = data;
      return data as AvailableApprovalTemplate[];
    },
    async createDraft(payload: CreateDraftPayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/approval/applications/drafts', payload);
        return data as ApprovalApplicationRow;
      } finally {
        this.actionLoading = false;
      }
    },
    async updateDraft(id: number, formData: Record<string, unknown>) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/approval/applications/${id}/draft`, { formData });
        if (this.current?.id === id) {
          this.current = { ...this.current, ...data };
        }
        return data as ApprovalApplicationRow;
      } finally {
        this.actionLoading = false;
      }
    },
    async submit(id: number, formData?: Record<string, unknown>) {
      this.actionLoading = true;
      try {
        const payload = formData === undefined ? {} : { formData };
        const { data } = await api.post(`/approval/applications/${id}/submit`, payload);
        if (this.current?.id === id) {
          this.current = { ...this.current, ...data };
        }
        return data as ApprovalApplicationRow;
      } finally {
        this.actionLoading = false;
      }
    },
    async fetchList(filters?: ApplicationListFilters) {
      this.loading = true;
      try {
        const requestParams: Record<string, unknown> = {
          page: filters?.page ?? this.page,
          size: filters?.size ?? this.size,
        };

        const status = filters?.status ?? this.statusFilter;
        if (status) requestParams.status = status;

        const dateFrom = filters?.dateFrom ?? this.dateFrom;
        if (dateFrom) requestParams.dateFrom = dateFrom;

        const dateTo = filters?.dateTo ?? this.dateTo;
        if (dateTo) requestParams.dateTo = dateTo;

        const { data } = await api.get('/approval/applications', { params: requestParams });
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
        return data as {
          rows: ApprovalApplicationRow[];
          total: number;
          page: number;
          size: number;
        };
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(id: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/approval/applications/${id}`);
        this.current = data;
        return data as ApprovalApplicationDetail;
      } finally {
        this.detailLoading = false;
      }
    },
    async cancel(id: number, reason?: string) {
      this.actionLoading = true;
      try {
        const payload = reason === undefined ? {} : { reason };
        const { data } = await api.post(`/approval/applications/${id}/cancel`, payload);
        if (this.current?.id === id) {
          this.current = { ...this.current, ...data };
        }
        return data as ApprovalApplicationRow;
      } finally {
        this.actionLoading = false;
      }
    },
  },
});
