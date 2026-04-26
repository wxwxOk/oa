import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type {
  ArchiveDetail,
  ArchiveFilterOptions,
  ArchiveListFilters,
  ArchiveRow,
  ArchiveSourceType,
  ArchiveStats,
  CreateArchiveCorrectionPayload,
  CreateArchiveNotePayload,
  UpdateArchiveProcessingPayload,
  UpdateArchiveTagsPayload,
} from 'src/types/approvalArchive';

interface ArchiveListResponse {
  rows: ArchiveRow[];
  total: number;
  page: number;
  size: number;
}

function buildArchiveParams(filters: ArchiveListFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.page) params.page = filters.page;
  if (filters.size) params.size = filters.size;
  if (filters.sourceType) params.sourceType = filters.sourceType;
  if (filters.templateId) params.templateId = filters.templateId;
  if (filters.departmentId) params.departmentId = filters.departmentId;
  if (filters.personName) params.personName = filters.personName;
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.tags && filters.tags.length > 0) params.tags = filters.tags;
  return params;
}

function mergeFilters(
  defaults: ArchiveListFilters,
  page: number,
  size: number,
  filters?: ArchiveListFilters,
): ArchiveListFilters {
  return {
    ...defaults,
    ...filters,
    page: filters?.page ?? page,
    size: filters?.size ?? size,
  };
}

export const useApprovalArchiveStore = defineStore('approvalArchive', {
  state: () => ({
    rows: [] as ArchiveRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: {
      sourceType: '',
      templateId: null,
      departmentId: null,
      personName: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      tags: [],
    } as ArchiveListFilters,
    filterOptions: {
      templates: [],
      departments: [],
      recommendedTags: [],
    } as ArchiveFilterOptions,
    current: null as ArchiveDetail | null,
    detail: null as ArchiveDetail | null,
    stats: null as ArchiveStats | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    exportLoading: false,
    statsLoading: false,
  }),
  actions: {
    async fetchMeta() {
      const { data } = await api.get('/approval/archive/meta');
      this.filterOptions = data;
      return data as ArchiveFilterOptions;
    },
    async fetchList(filters?: ArchiveListFilters) {
      this.loading = true;
      try {
        const activeFilters = mergeFilters(this.filters, this.page, this.size, filters);
        const params = buildArchiveParams(activeFilters);
        const { data } = await api.get('/approval/archive', { params });
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
        this.filters = { ...this.filters, ...filters };
        return data as ArchiveListResponse;
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(sourceType: ArchiveSourceType, sourceId: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/approval/archive/${sourceType}/${sourceId}`);
        this.current = data;
        this.detail = data;
        return data as ArchiveDetail;
      } finally {
        this.detailLoading = false;
      }
    },
    async saveTags(sourceType: ArchiveSourceType, sourceId: number, payload: UpdateArchiveTagsPayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/approval/archive/${sourceType}/${sourceId}/tags`, payload);
        this.current = data;
        this.detail = data;
        return data as ArchiveDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async updateTags(sourceType: ArchiveSourceType, sourceId: number, payload: UpdateArchiveTagsPayload) {
      return this.saveTags(sourceType, sourceId, payload);
    },
    async addNote(sourceType: ArchiveSourceType, sourceId: number, payload: CreateArchiveNotePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/archive/${sourceType}/${sourceId}/notes`, payload);
        this.current = data;
        this.detail = data;
        return data as ArchiveDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async saveProcessing(
      sourceType: ArchiveSourceType,
      sourceId: number,
      payload: UpdateArchiveProcessingPayload,
    ) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/approval/archive/${sourceType}/${sourceId}/processing`, payload);
        this.current = data;
        this.detail = data;
        return data as ArchiveDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async updateProcessing(
      sourceType: ArchiveSourceType,
      sourceId: number,
      payload: UpdateArchiveProcessingPayload,
    ) {
      return this.saveProcessing(sourceType, sourceId, payload);
    },
    async saveCorrection(
      sourceType: ArchiveSourceType,
      sourceId: number,
      payload: CreateArchiveCorrectionPayload,
    ) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/archive/${sourceType}/${sourceId}/corrections`, payload);
        this.current = data;
        this.detail = data;
        return data as ArchiveDetail;
      } finally {
        this.actionLoading = false;
      }
    },
    async createCorrection(
      sourceType: ArchiveSourceType,
      sourceId: number,
      payload: CreateArchiveCorrectionPayload,
    ) {
      return this.saveCorrection(sourceType, sourceId, payload);
    },
    async exportExcel(filters?: ArchiveListFilters) {
      this.exportLoading = true;
      try {
        const activeFilters = filters ?? this.filters;
        const { data } = await api.get('/approval/archive/export', {
          params: buildArchiveParams(activeFilters),
          responseType: 'blob',
        });
        return data as Blob;
      } finally {
        this.exportLoading = false;
      }
    },
    async fetchStats(filters?: ArchiveListFilters) {
      this.statsLoading = true;
      try {
        const { data } = await api.get('/approval/archive/stats', {
          params: buildArchiveParams(filters ?? this.filters),
        });
        this.stats = data;
        return data as ArchiveStats;
      } finally {
        this.statsLoading = false;
      }
    },
  },
});
