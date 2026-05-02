import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useVisitStore } from '../visit';
import type { VisitStats } from 'src/types/visit';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
};

const visitRow = {
  id: 1,
  name: '张三',
  age: 12,
  education: null,
  gender: '女',
  channelPartner: '渠道A',
  consultant: '李老师',
  receptionStatus: '已接待',
  receptionist: '王老师',
  receptionDate: '2026-05-02T00:00:00.000Z',
  consultationStatus: '已咨询',
  statusCategory: '重点',
  statusDescription: '需要跟进',
  trialStatus: null,
  solution: null,
  trialDate: null,
  creatorId: 1,
  creator: null,
  createdAt: '2026-05-02T08:00:00.000Z',
  updatedAt: '2026-05-02T08:30:00.000Z',
};

const visitStats: VisitStats = {
  total: 10,
  intentCount: 4,
  signedCount: 2,
  intentRate: 40,
  signedRate: 20,
  byChannelPartner: [{ name: '渠道A', count: 5, total: 5, intentCount: 3, signedCount: 1, intentRate: 60, signedRate: 20 }],
  byConsultant: [{ name: '李老师', count: 4, total: 4, intentCount: 2, signedCount: 1, intentRate: 50, signedRate: 25 }],
  byReceptionist: [{ name: '王老师', count: 3, total: 3, intentCount: 1, signedCount: 1, intentRate: 33.3, signedRate: 33.3 }],
  byReceptionStatus: [{ name: '已接待', count: 8 }],
  byConsultationStatus: [{ name: '已咨询', count: 4 }],
  byStatusCategory: [{ name: '重点', count: 3 }],
  byTrialStatus: [{ name: '已试听', count: 2 }],
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('useVisitStore', () => {
  it('fetches visits with Phase 20 filter params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [visitRow], total: 1, page: 2, size: 20 } });
    const store = useVisitStore();

    await store.fetchList({
      page: 2,
      size: 20,
      keyword: '张',
      channelPartner: '渠道A',
      consultant: '李老师',
      receptionist: '王老师',
      receptionStatus: '已接待',
      consultationStatus: '已咨询',
      statusCategory: '重点',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/visits', {
      params: {
        page: 2,
        size: 20,
        keyword: '张',
        channelPartner: '渠道A',
        consultant: '李老师',
        receptionist: '王老师',
        receptionStatus: '已接待',
        consultationStatus: '已咨询',
        statusCategory: '重点',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
      },
    });
    expect(store.rows).toEqual([visitRow]);
    expect(store.total).toBe(1);
    expect(store.page).toBe(2);
    expect(store.size).toBe(20);
  });

  it('omits empty filters from list params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useVisitStore();

    await store.fetchList({
      page: 1,
      size: 10,
      keyword: '',
      channelPartner: '',
      consultant: '',
      receptionist: '',
      receptionStatus: '',
      consultationStatus: '',
      statusCategory: '',
      dateFrom: '',
      dateTo: '',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/visits', { params: { page: 1, size: 10 } });
  });

  it('fetches filter options and detail', async () => {
    const options = {
      channelPartners: ['渠道A'],
      consultants: ['李老师'],
      receptionists: ['王老师'],
      receptionStatuses: ['已接待'],
      consultationStatuses: ['已咨询'],
      statusCategories: ['重点'],
    };
    mockedApi.get.mockResolvedValueOnce({ data: options }).mockResolvedValueOnce({ data: visitRow });
    const store = useVisitStore();

    await store.fetchFilterOptions();
    await store.fetchDetail(1);

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/visits/filter-options');
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/visits/1');
    expect(store.filterOptions).toEqual(options);
    expect(store.current).toEqual(visitRow);
  });

  it('creates, updates, and deletes visits through Phase 20 paths', async () => {
    const payload = { name: '张三', age: 12 };
    mockedApi.post.mockResolvedValueOnce({ data: visitRow });
    mockedApi.put.mockResolvedValueOnce({ data: { ...visitRow, name: '李四' } });
    mockedApi.delete.mockResolvedValueOnce({ data: { ok: true } });
    const store = useVisitStore();

    await store.createVisit(payload);
    await store.updateVisit(1, { ...payload, name: '李四' });
    await store.deleteVisit(1);

    expect(mockedApi.post).toHaveBeenCalledWith('/visits', { name: '张三', age: 12 });
    expect(mockedApi.put).toHaveBeenCalledWith('/visits/1', { name: '李四', age: 12 });
    expect(mockedApi.delete).toHaveBeenCalledWith('/visits/1');
  });

  it('imports normalized visit rows through the Phase 20 JSON contract', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { createdCount: 1, total: 1 } });
    const store = useVisitStore();

    const result = await store.importVisits([
      { name: ' 张三 ', age: 18, receptionDate: '2026-05-02', consultant: ' 李老师 ' },
    ]);

    expect(mockedApi.post).toHaveBeenCalledWith('/visits/import', {
      rows: [{ name: '张三', age: 18, receptionDate: '2026-05-02', consultant: '李老师' }],
    });
    expect(result).toEqual({ createdCount: 1, total: 1 });
    const payload = mockedApi.post.mock.calls[0][1] as { rows: Array<Record<string, unknown>> };
    expect(payload.rows[0]).not.toHaveProperty('file');
    expect(payload.rows[0]).not.toHaveProperty('rawRows');
    expect(payload.rows[0]).not.toHaveProperty('invalidRows');
    expect(payload.rows[0]).not.toHaveProperty('duplicateWarnings');
    expect(payload.rows[0]).not.toHaveProperty('creatorId');
  });

  it('fetches stats with date-only params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: visitStats });
    const store = useVisitStore();

    const result = await store.fetchStats({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(mockedApi.get).toHaveBeenCalledWith('/visits/stats', {
      params: { dateFrom: '2026-05-01', dateTo: '2026-05-31' },
    });
    expect(result).toEqual(visitStats);
    expect(store.stats).toEqual(visitStats);
  });

  it('omits blank stats date params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: visitStats });
    const store = useVisitStore();

    await store.fetchStats({ dateFrom: ' ', dateTo: '' });

    expect(mockedApi.get).toHaveBeenCalledWith('/visits/stats', { params: {} });
  });

  it('resets loading flags when requests reject', async () => {
    const store = useVisitStore();
    mockedApi.get.mockRejectedValueOnce(new Error('list'));
    await expect(store.fetchList()).rejects.toThrow('list');

    mockedApi.get.mockRejectedValueOnce(new Error('detail'));
    await expect(store.fetchDetail(1)).rejects.toThrow('detail');

    mockedApi.post.mockRejectedValueOnce(new Error('action'));
    await expect(store.createVisit({ name: '张三' })).rejects.toThrow('action');

    mockedApi.post.mockRejectedValueOnce(new Error('import'));
    await expect(store.importVisits([{ name: '张三' }])).rejects.toThrow('import');

    mockedApi.get.mockRejectedValueOnce(new Error('stats'));
    await expect(store.fetchStats()).rejects.toThrow('stats');

    expect(store.loading).toBe(false);
    expect(store.detailLoading).toBe(false);
    expect(store.actionLoading).toBe(false);
    expect(store.importLoading).toBe(false);
    expect(store.statsLoading).toBe(false);
  });
});
