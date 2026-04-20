import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  sort: number;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: FormField[];
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  creatorId: number;
  creator: { id: number; realName: string };
  createdAt: string;
  updatedAt: string;
}

export const useTemplateStore = defineStore('template', {
  state: () => ({
    rows: [] as Template[],
    total: 0,
    loading: false,
    page: 1,
    size: 10,
    statusFilter: '' as string,
    current: null as Template | null,
    selectedFieldId: null as string | null,
  }),
  getters: {
    selectedField(s): FormField | null {
      if (!s.current || !s.selectedFieldId) return null;
      return s.current.schema.find((f) => f.id === s.selectedFieldId) ?? null;
    },
  },
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        const params: Record<string, unknown> = { page: this.page, size: this.size };
        if (this.statusFilter) params.status = this.statusFilter;
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
    async update(id: number, payload: { name?: string; description?: string; schema?: FormField[]; requireIdentity?: boolean }) {
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
