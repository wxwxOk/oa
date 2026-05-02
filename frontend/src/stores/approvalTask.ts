import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type {
  ApprovalTaskDetail,
  ApprovalTaskFilterOptions,
  ApprovalTaskListFilters,
  ApprovalTaskListView,
  ApprovalTaskRow,
} from 'src/types/approvalTask';

function buildCommentPayload(comment?: string) {
  return comment === undefined ? {} : { comment };
}

export const useApprovalTaskStore = defineStore('approvalTask', {
  state: () => ({
    rows: [] as ApprovalTaskRow[],
    total: 0,
    page: 1,
    size: 10,
    view: 'pending' as ApprovalTaskListView,
    filters: {
      templateId: null,
      applicantName: '',
      departmentId: null,
      status: '',
      dateFrom: '',
      dateTo: '',
    } as ApprovalTaskListFilters,
    filterOptions: {
      templates: [],
      departments: [],
    } as ApprovalTaskFilterOptions,
    current: null as ApprovalTaskDetail | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
  }),
  actions: {
    async fetchMeta() {
      const { data } = await api.get('/approval/tasks/meta');
      this.filterOptions = data;
      return data as ApprovalTaskFilterOptions;
    },
    async fetchList(filters?: ApprovalTaskListFilters) {
      this.loading = true;
      try {
        if (filters?.view) this.view = filters.view;
        if (filters?.page) this.page = filters.page;
        if (filters?.size) this.size = filters.size;

        const activeFilters = { ...this.filters, ...filters };
        const params: Record<string, unknown> = {
          view: activeFilters.view ?? this.view,
          page: activeFilters.page ?? this.page,
          size: activeFilters.size ?? this.size,
        };
        if (activeFilters.templateId) params.templateId = activeFilters.templateId;
        if (activeFilters.applicantName) params.applicantName = activeFilters.applicantName;
        if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
        if (activeFilters.status) params.status = activeFilters.status;
        if (activeFilters.dateFrom) params.dateFrom = activeFilters.dateFrom;
        if (activeFilters.dateTo) params.dateTo = activeFilters.dateTo;

        const { data } = await api.get('/approval/tasks', { params });
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
        if (data.view) this.view = data.view;
        return data as {
          rows: ApprovalTaskRow[];
          total: number;
          page: number;
          size: number;
          view: ApprovalTaskListView;
        };
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(id: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/approval/tasks/${id}`);
        this.current = data;
        return data as ApprovalTaskDetail;
      } finally {
        this.detailLoading = false;
      }
    },
    async approve(id: number, comment?: string) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/tasks/${id}/approve`, buildCommentPayload(comment));
        if (this.current?.id === id) this.current = data;
        return data as ApprovalTaskDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async reject(id: number, comment: string) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/tasks/${id}/reject`, { comment });
        if (this.current?.id === id) this.current = data;
        return data as ApprovalTaskDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async comment(id: number, comment: string) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/tasks/${id}/comment`, { comment });
        if (this.current?.id === id) this.current = data;
        return data as ApprovalTaskDetail;
      } finally {
        this.actionLoading = false;
      }
    },
  },
});
