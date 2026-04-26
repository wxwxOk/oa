import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useApprovalArchiveStore } from '../approvalArchive';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
};

const archiveRow = {
  archiveKey: 'approval:17',
  sourceType: 'approval',
  id: 17,
  sourceId: 17,
  archiveNo: 'APP-20260426-ABCDEFGH',
  templateId: 3,
  templateName: '请假申请',
  templateVersion: 5,
  personName: '申请人',
  personPhone: '13800000000',
  departmentId: 2,
  departmentName: '研发部',
  status: 'APPROVED',
  tags: ['待跟进'],
  processingSummary: '待回访',
  submittedAt: '2026-04-26T08:00:00.000Z',
  completedAt: '2026-04-26T09:00:00.000Z',
  updatedAt: '2026-04-26T09:30:00.000Z',
};

const archiveDetail = {
  ...archiveRow,
  formData: { reason: '年度调休' },
  effectiveData: { reason: '年度调休' },
  schemaSnapshot: { version: 2, items: [] },
  processingData: { followResult: '待回访' },
  notes: [],
  corrections: [],
  timeline: [],
  canMark: true,
  canEdit: true,
};

describe('approval archive store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
  });

  it('fetches archive filter metadata from GET /approval/archive/meta', async () => {
    const meta = {
      templates: [{ label: '请假申请 v5', value: 3, version: 5 }],
      departments: [{ label: '研发部', value: 2 }],
      recommendedTags: ['待跟进', '已核对', '资料不全', '重点'],
    };
    mockedApi.get.mockResolvedValueOnce({ data: meta });

    const store = useApprovalArchiveStore();
    const result = await store.fetchMeta();

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/archive/meta');
    expect(result).toEqual(meta);
    expect(store.filterOptions).toEqual(meta);
  });

  it('fetches GET /approval/archive with source, template, department, person, status, date, and tag filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        rows: [archiveRow],
        total: 1,
        page: 2,
        size: 20,
      },
    });

    const store = useApprovalArchiveStore();
    await store.fetchList({
      page: 2,
      size: 20,
      sourceType: 'collection',
      templateId: 3,
      departmentId: 2,
      personName: '申请人',
      status: 'COLLECTED',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-26',
      tags: ['待跟进', '重点'],
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/archive', {
      params: {
        page: 2,
        size: 20,
        sourceType: 'collection',
        templateId: 3,
        departmentId: 2,
        personName: '申请人',
        status: 'COLLECTED',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-26',
        tags: ['待跟进', '重点'],
      },
    });
    expect(store.rows).toEqual([archiveRow]);
    expect(store.loading).toBe(false);
  });

  it('fetches source-specific archive detail routes to prevent IDOR-prone generic IDs', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: archiveDetail });

    const store = useApprovalArchiveStore();
    const result = await store.fetchDetail('approval', 17);

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/archive/approval/17');
    expect(result).toEqual(archiveDetail);
    expect(store.detail).toEqual(archiveDetail);
    expect(store.detailLoading).toBe(false);
  });

  it('writes tags, notes, processing data, and corrections to operation-only endpoints', async () => {
    const tagsPayload = { tags: ['已核对', '重点'] };
    const notePayload = { content: '电话确认过资料。' };
    const processingPayload = { processingData: { followResult: '已回访' } };
    const correctionPayload = {
      changes: [{ fieldId: 'reason', value: '年假' }],
      reason: '申请人补充材料后修正',
    };

    mockedApi.put.mockResolvedValueOnce({ data: { ...archiveDetail, tags: tagsPayload.tags } });
    mockedApi.post
      .mockResolvedValueOnce({ data: { ...archiveDetail, notes: [notePayload] } })
      .mockResolvedValueOnce({ data: { ...archiveDetail, corrections: [correctionPayload] } });
    mockedApi.put.mockResolvedValueOnce({
      data: { ...archiveDetail, processingData: processingPayload.processingData },
    });

    const store = useApprovalArchiveStore();
    await store.updateTags('approval', 17, tagsPayload);
    await store.addNote('collection', 22, notePayload);
    await store.updateProcessing('approval', 17, processingPayload);
    await store.createCorrection('approval', 17, correctionPayload);

    expect(mockedApi.put).toHaveBeenNthCalledWith(1, '/approval/archive/approval/17/tags', tagsPayload);
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/approval/archive/collection/22/notes', notePayload);
    expect(mockedApi.put).toHaveBeenNthCalledWith(2, '/approval/archive/approval/17/processing', processingPayload);
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/approval/archive/approval/17/corrections', correctionPayload);
    expect(store.actionLoading).toBe(false);
  });

  it('exports Excel with current filters through GET /approval/archive/export as a blob', async () => {
    const filters = {
      sourceType: 'approval',
      templateId: 3,
      departmentId: 2,
      personName: '申请人',
      status: 'APPROVED',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-26',
      tags: ['资料不全'],
    };
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['xlsx']) });

    const store = useApprovalArchiveStore();
    await store.exportExcel(filters);

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/archive/export', {
      params: filters,
      responseType: 'blob',
    });
    expect(store.exportLoading).toBe(false);
  });

  it('fetches basic archive statistics from GET /approval/archive/stats', async () => {
    const stats = {
      byTemplate: [{ templateId: 3, templateName: '请假申请', count: 4 }],
      byStatus: [{ status: 'COLLECTED', count: 8 }],
      byDepartment: [{ departmentId: 2, departmentName: '研发部', count: 5 }],
      byMonth: [{ month: '2026-04', count: 12 }],
    };
    mockedApi.get.mockResolvedValueOnce({ data: stats });

    const store = useApprovalArchiveStore();
    const result = await store.fetchStats({ sourceType: 'collection', dateFrom: '2026-04-01' });

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/archive/stats', {
      params: { sourceType: 'collection', dateFrom: '2026-04-01' },
    });
    expect(result).toEqual(stats);
    expect(store.stats).toEqual(stats);
  });

  it('resets loading, actionLoading, and exportLoading when archive requests fail', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('list'))
      .mockRejectedValueOnce(new Error('detail'))
      .mockRejectedValueOnce(new Error('export'));
    mockedApi.put.mockRejectedValueOnce(new Error('action'));

    const store = useApprovalArchiveStore();
    await expect(store.fetchList()).rejects.toThrow('list');
    await expect(store.fetchDetail('approval', 17)).rejects.toThrow('detail');
    await expect(store.updateTags('approval', 17, { tags: ['待跟进'] })).rejects.toThrow('action');
    await expect(store.exportExcel()).rejects.toThrow('export');

    expect(store.loading).toBe(false);
    expect(store.detailLoading).toBe(false);
    expect(store.actionLoading).toBe(false);
    expect(store.exportLoading).toBe(false);
  });
});
