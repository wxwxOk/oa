import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type { SchemaV2, SchemaField, SchemaGroup, SchemaDynamicTable } from 'src/types/schema';
import type { ArchiveProcessingField as ProcessingFieldConfig } from 'src/types/approvalArchive';
import { flattenFields } from 'src/types/schema';

/** @deprecated Use SchemaField from 'src/types/schema' instead */
export type { SchemaField as FormField } from 'src/types/schema';

export type TemplateBusinessMode = 'COLLECTION_ONLY' | 'APPROVAL_REQUIRED';

export interface TemplateApprovalProcessSummary {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: SchemaV2;
  processingSchema: ProcessingFieldConfig[];
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  watermarkText?: string | null;
  businessMode: TemplateBusinessMode;
  approvalProcessId: number | null;
  approvalProcess?: TemplateApprovalProcessSummary | null;
  creatorId: number;
  creator: { id: number; realName: string };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateUpdatePayload {
  name?: string;
  description?: string;
  schema?: SchemaV2;
  processingSchema?: ProcessingFieldConfig[];
  requireIdentity?: boolean;
  watermarkText?: string | null;
  businessMode?: TemplateBusinessMode;
  approvalProcessId?: number | null;
  disconnectPublicCollection?: boolean;
}

export const useTemplateStore = defineStore('template', {
  state: () => ({
    rows: [] as Template[],
    total: 0,
    loading: false,
    page: 1,
    size: 10,
    statusFilter: '' as string,
    businessModeFilter: '' as '' | TemplateBusinessMode,
    current: null as Template | null,
    selectedFieldId: null as string | null,
  }),
  getters: {
    selectedField(s): SchemaField | null {
      if (!s.current || !s.selectedFieldId) return null;
      return flattenFields(s.current.schema).find(f => f.id === s.selectedFieldId) ?? null;
    },
    selectedItem(s): SchemaField | SchemaGroup | SchemaDynamicTable | null {
      if (!s.current || !s.selectedFieldId) return null;
      // 先查找普通字段
      const field = flattenFields(s.current.schema).find(f => f.id === s.selectedFieldId);
      if (field) return field;
      // 再查找分组和动态表格
      for (const item of s.current.schema.items) {
        if ((item.type === 'group' || item.type === 'dynamic-table') && item.id === s.selectedFieldId) {
          return item;
        }
      }
      return null;
    },
  },
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        const params: Record<string, unknown> = { page: this.page, size: this.size };
        if (this.statusFilter) params.status = this.statusFilter;
        if (this.businessModeFilter) params.businessMode = this.businessModeFilter;
        const { data } = await api.get('/templates', { params });
        this.rows = data.rows;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
    async fetchOne(id: number) {
      const { data } = await api.get(`/templates/${id}`);
      this.current = data;
      return data;
    },
    async create(name: string, description?: string) {
      const { data } = await api.post('/templates', { name, description });
      return data;
    },
    async update(id: number, payload: TemplateUpdatePayload) {
      const { data } = await api.put(`/templates/${id}`, payload);
      if (this.current?.id === id) this.current = data;
      return data;
    },
    async remove(id: number) {
      await api.delete(`/templates/${id}`);
    },
    async changeStatus(id: number, action: 'publish' | 'offline') {
      const { data } = await api.patch(`/templates/${id}/status`, { action });
      if (this.current?.id === id) this.current = data;
      return data;
    },
    async createShareLink(templateId: number) {
      const { data } = await api.post(`/templates/${templateId}/share-links`);
      return data;
    },
    selectField(fieldId: string | null) {
      this.selectedFieldId = fieldId;
    },
  },
});
