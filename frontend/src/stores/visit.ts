import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  VISIT_LIST_FILTER_KEYS,
  createEmptyVisitFilterOptions,
  createEmptyVisitFilters,
  normalizeVisitPayload,
  type VisitDetail,
  type VisitFilterOptions,
  type VisitImportResponse,
  type VisitListFilters,
  type VisitListRequest,
  type VisitListResponse,
  type VisitRow,
  type VisitStats,
  type VisitStatsFilters,
  type VisitWritePayload,
} from 'src/types/visit';

function mergeFilters(base: VisitListFilters, filters?: VisitListRequest): VisitListFilters {
  const next = { ...base };
  if (!filters) return next;
  for (const key of VISIT_LIST_FILTER_KEYS) {
    if (key in filters) next[key] = filters[key] ?? '';
  }
  return next;
}

function buildListParams(filters: VisitListFilters, page: number, size: number) {
  const params: Record<string, unknown> = { page, size };
  for (const key of VISIT_LIST_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) params[key] = value;
  }
  return params;
}

function buildStatsParams(filters?: VisitStatsFilters) {
  const params: Record<string, string> = {};
  const dateFrom = filters?.dateFrom?.trim();
  const dateTo = filters?.dateTo?.trim();
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  return params;
}

export const useVisitStore = defineStore('visit', {
  state: () => ({
    rows: [] as VisitRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: createEmptyVisitFilters(),
    filterOptions: createEmptyVisitFilterOptions() as VisitFilterOptions,
    current: null as VisitDetail | null,
    stats: null as VisitStats | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    importLoading: false,
    statsLoading: false,
  }),
  actions: {
    async fetchList(filters?: VisitListRequest) {
      this.loading = true;
      try {
        const page = Number(filters?.page ?? this.page) || 1;
        const size = Number(filters?.size ?? this.size) || 10;
        const nextFilters = mergeFilters(this.filters, filters);
        const { data } = await api.get('/visits', { params: buildListParams(nextFilters, page, size) });
        const response = data as VisitListResponse;
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

    async fetchFilterOptions() {
      const { data } = await api.get('/visits/filter-options');
      this.filterOptions = data as VisitFilterOptions;
      return this.filterOptions;
    },

    async fetchDetail(id: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/visits/${id}`);
        this.current = data as VisitDetail;
        return this.current;
      } finally {
        this.detailLoading = false;
      }
    },

    async createVisit(payload: VisitWritePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.post('/visits', normalizeVisitPayload(payload));
        return data as VisitDetail;
      } finally {
        this.actionLoading = false;
      }
    },

    async importVisits(rows: VisitWritePayload[]) {
      this.importLoading = true;
      try {
        const { data } = await api.post('/visits/import', { rows: rows.map(normalizeVisitPayload) });
        return data as VisitImportResponse;
      } finally {
        this.importLoading = false;
      }
    },

    async fetchStats(filters?: VisitStatsFilters) {
      this.statsLoading = true;
      try {
        const { data } = await api.get('/visits/stats', { params: buildStatsParams(filters) });
        this.stats = data as VisitStats;
        return this.stats;
      } finally {
        this.statsLoading = false;
      }
    },

    async updateVisit(id: number, payload: VisitWritePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/visits/${id}`, normalizeVisitPayload(payload));
        this.current = data as VisitDetail;
        return this.current;
      } finally {
        this.actionLoading = false;
      }
    },

    async deleteVisit(id: number) {
      this.actionLoading = true;
      try {
        await api.delete(`/visits/${id}`);
      } finally {
        this.actionLoading = false;
      }
    },
  },
});
