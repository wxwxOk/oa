import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export type ApproverSourceType = 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
export type ApprovalAction = 'APPROVE' | 'REJECT';

export interface ApprovalProcessNodeDraft {
  id?: number;
  name: string;
  order: number;
  approverSourceType: ApproverSourceType;
  approverUserId?: number | null;
  approverRoleId?: number | null;
  requiredActions?: ['APPROVE', 'REJECT'];
}

export interface ApprovalProcess {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  nodes: ApprovalProcessNodeDraft[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalProcessPayload {
  name: string;
  description?: string | null;
  isActive: boolean;
  nodes: ApprovalProcessNodeDraft[];
}

export interface ApprovalProcessListParams {
  isActive?: boolean | '';
  keyword?: string;
}

export const useApprovalProcessStore = defineStore('approvalProcess', {
  state: () => ({
    rows: [] as ApprovalProcess[],
    total: 0,
    loading: false,
    page: 1,
    size: 10,
    statusFilter: '' as '' | 'true' | 'false',
    keyword: '',
    current: null as ApprovalProcess | null,
  }),
  actions: {
    async fetchList(params?: ApprovalProcessListParams) {
      this.loading = true;
      try {
        const requestParams: Record<string, unknown> = {
          page: this.page,
          size: this.size,
        };

        const status = params?.isActive ?? this.statusFilter;
        if (status === true || status === 'true') requestParams.isActive = true;
        if (status === false || status === 'false') requestParams.isActive = false;

        const keyword = params?.keyword ?? this.keyword;
        if (keyword.trim()) requestParams.keyword = keyword.trim();

        const { data } = await api.get('/approval/processes', { params: requestParams });
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
      } finally {
        this.loading = false;
      }
    },
    async fetchOne(id: number) {
      const { data } = await api.get(`/approval/processes/${id}`);
      this.current = data;
      return data as ApprovalProcess;
    },
    async create(payload: ApprovalProcessPayload) {
      const { data } = await api.post('/approval/processes', payload);
      return data as ApprovalProcess;
    },
    async update(id: number, payload: ApprovalProcessPayload) {
      const { data } = await api.put(`/approval/processes/${id}`, payload);
      if (this.current?.id === id) this.current = data;
      return data as ApprovalProcess;
    },
    async changeStatus(id: number, isActive: boolean) {
      const { data } = await api.patch(`/approval/processes/${id}/status`, { isActive });
      if (this.current?.id === id) this.current = data;
      return data as ApprovalProcess;
    },
    async remove(id: number) {
      await api.delete(`/approval/processes/${id}`);
    },
    async validate(id: number) {
      const { data } = await api.post(`/approval/processes/${id}/validate`);
      return data;
    },
  },
});
