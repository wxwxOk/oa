import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import type {
  ArchiveCorrectionHistory,
  ArchiveDetail,
  ArchiveFilterOptions,
  ArchiveListFilters,
  ArchiveNote,
  ArchiveProcessingField,
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

type RawArchiveCorrection =
  | ArchiveCorrectionHistory
  | {
      id: number;
      field: string;
      before: unknown;
      after: unknown;
      reason: string;
      actorId: number | null;
      actorName: string;
      createdAt: string;
    };

function buildArchiveParams(filters: ArchiveListFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.page) params.page = filters.page;
  if (filters.size) params.size = filters.size;
  if (filters.sourceType) params.sourceType = filters.sourceType;
  if (filters.templateId) params.templateId = filters.templateId;
  if (filters.personName) params.personName = filters.personName;
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.tags && filters.tags.length > 0) params.tags = filters.tags.join(',');
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

function normalizeMeta(data: ArchiveFilterOptions & { tags?: string[] }): ArchiveFilterOptions {
  return {
    templates: data.templates ?? [],
    departments: data.departments ?? [],
    recommendedTags: data.recommendedTags ?? data.tags ?? [],
  };
}

function normalizeNote(note: ArchiveNote & { comment?: string }): ArchiveNote {
  return {
    ...note,
    content: note.content ?? note.comment ?? '',
  };
}

function normalizeCorrections(items: RawArchiveCorrection[] | undefined): ArchiveCorrectionHistory[] {
  return (items ?? []).map((item): ArchiveCorrectionHistory => {
    if ('changes' in item && Array.isArray(item.changes)) {
      return item as ArchiveCorrectionHistory;
    }
    const flat = item as {
      id: number;
      field: string;
      before: unknown;
      after: unknown;
      reason: string;
      actorId: number | null;
      actorName: string;
      createdAt: string;
    };
    return {
      id: flat.id,
      changes: [
        {
          fieldId: flat.field,
          fieldLabel: flat.field,
          beforeValue: flat.before,
          afterValue: flat.after,
        },
      ],
      reason: flat.reason,
      actorId: flat.actorId,
      actorName: flat.actorName,
      createdAt: flat.createdAt,
    };
  });
}

function normalizeDetail(data: ArchiveDetail & { createdAt?: string; events?: unknown[] }): ArchiveDetail {
  const auth = useAuthStore();
  const correctionHistory = normalizeCorrections(data.correctionHistory ?? data.corrections);
  const canMark = auth.hasPerm('form:submission:list');
  const canEdit = auth.hasPerm('form:submission:list');
  return {
    ...data,
    id: data.id ?? data.sourceId,
    templateVersion: data.templateVersion ?? 1,
    personPhone: data.personPhone ?? null,
    submittedAt: data.submittedAt ?? data.createdAt ?? null,
    completedAt: data.completedAt ?? null,
    processingSummary: data.processingSummary ?? null,
    processingFields: (data.processingFields ?? []) as ArchiveProcessingField[],
    notes: (data.notes ?? []).map(normalizeNote),
    corrections: correctionHistory,
    correctionHistory,
    timeline: data.timeline ?? (data.events as ArchiveDetail['timeline'] | undefined) ?? [],
    canMark: data.canMark ?? canMark,
    canEdit: data.canEdit ?? canEdit,
  };
}

export const useSubmissionArchiveStore = defineStore('submissionArchive', {
  state: () => ({
    rows: [] as ArchiveRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: {
      sourceType: 'collection',
      templateId: null,
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
      this.filterOptions = normalizeMeta(data);
      return this.filterOptions;
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
        const detail = normalizeDetail(data as ArchiveDetail);
        this.current = detail;
        this.detail = detail;
        return detail;
      } finally {
        this.detailLoading = false;
      }
    },
    async saveTags(sourceType: ArchiveSourceType, sourceId: number, payload: UpdateArchiveTagsPayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.put(`/approval/archive/${sourceType}/${sourceId}/tags`, payload);
        const detail = normalizeDetail(data as ArchiveDetail);
        this.current = detail;
        this.detail = detail;
        return detail;
      } finally {
        this.actionLoading = false;
      }
    },
    async addNote(sourceType: ArchiveSourceType, sourceId: number, payload: CreateArchiveNotePayload) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/archive/${sourceType}/${sourceId}/notes`, payload);
        const detail = normalizeDetail(data as ArchiveDetail);
        this.current = detail;
        this.detail = detail;
        return detail;
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
        const detail = normalizeDetail(data as ArchiveDetail);
        this.current = detail;
        this.detail = detail;
        return detail;
      } finally {
        this.actionLoading = false;
      }
    },
    async saveCorrection(
      sourceType: ArchiveSourceType,
      sourceId: number,
      payload: CreateArchiveCorrectionPayload,
    ) {
      this.actionLoading = true;
      try {
        const { data } = await api.post(`/approval/archive/${sourceType}/${sourceId}/corrections`, payload);
        const detail = normalizeDetail(data as ArchiveDetail);
        this.current = detail;
        this.detail = detail;
        return detail;
      } finally {
        this.actionLoading = false;
      }
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
