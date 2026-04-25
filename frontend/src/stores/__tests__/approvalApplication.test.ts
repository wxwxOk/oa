import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useApprovalApplicationStore } from '../approvalApplication';

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

const row = {
  id: 17,
  applicationNo: 'APP-20260425-ABCDEFGH',
  status: 'DRAFT',
  templateId: 3,
  templateName: '请假申请',
  templateVersion: 5,
  processId: 8,
  processName: '请假审批流程',
  applicantName: '申请人',
  applicantDepartmentName: '研发部',
  currentNodeOrder: null,
  currentNodeName: null,
  submittedAt: null,
  completedAt: null,
  createdAt: '2026-04-25T07:30:00.000Z',
  updatedAt: '2026-04-25T08:00:00.000Z',
  canCancel: false,
};

describe('approval application store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
  });

  it('fetches available approval templates', async () => {
    const template = {
      id: 3,
      name: '请假申请',
      description: null,
      schemaVersion: 5,
      approvalProcessId: 8,
      approvalProcessName: '请假审批流程',
      updatedAt: '2026-04-25T08:00:00.000Z',
    };
    mockedApi.get.mockResolvedValueOnce({ data: [template] });

    const store = useApprovalApplicationStore();
    const result = await store.fetchTemplates();

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/applications/templates');
    expect(result).toEqual([template]);
    expect(store.templates).toEqual([template]);
  });

  it('creates, updates, submits, and cancels through authenticated application endpoints', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: row })
      .mockResolvedValueOnce({ data: { ...row, status: 'APPROVING' } })
      .mockResolvedValueOnce({ data: { ...row, status: 'CANCELED' } });
    mockedApi.put.mockResolvedValueOnce({ data: { ...row, formData: { reason: '更新' } } });

    const store = useApprovalApplicationStore();
    await store.createDraft({ templateId: 3, formData: { reason: '草稿' } });
    await store.updateDraft(17, { reason: '更新' });
    await store.submit(17, { reason: '提交' });
    await store.cancel(17, '撤销原因');

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/approval/applications/drafts', {
      templateId: 3,
      formData: { reason: '草稿' },
    });
    expect(mockedApi.put).toHaveBeenCalledWith('/approval/applications/17/draft', {
      formData: { reason: '更新' },
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/approval/applications/17/submit', {
      formData: { reason: '提交' },
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/approval/applications/17/cancel', {
      reason: '撤销原因',
    });
    expect(store.actionLoading).toBe(false);
  });

  it('fetches list with page, size, status, and date filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        rows: [row],
        total: 1,
        page: 2,
        size: 20,
      },
    });

    const store = useApprovalApplicationStore();
    store.page = 2;
    store.size = 20;
    await store.fetchList({
      status: 'IN_PROGRESS',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-25',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/applications', {
      params: {
        page: 2,
        size: 20,
        status: 'IN_PROGRESS',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-25',
      },
    });
    expect(store.rows).toEqual([row]);
    expect(store.total).toBe(1);
    expect(store.loading).toBe(false);
  });

  it('fetches detail and resets loading flags when actions fail', async () => {
    const detail = {
      ...row,
      formData: { reason: '草稿' },
      schemaSnapshot: { version: 2, items: [] },
      processSnapshot: { processId: 8, processName: '请假审批流程', nodes: [] },
      timeline: [],
      tasks: [],
    };
    mockedApi.get.mockResolvedValueOnce({ data: detail });
    mockedApi.post.mockRejectedValueOnce(new Error('network'));

    const store = useApprovalApplicationStore();
    const result = await store.fetchDetail(17);

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/applications/17');
    expect(result).toEqual(detail);
    expect(store.current).toEqual(detail);
    expect(store.detailLoading).toBe(false);

    await expect(store.createDraft({ templateId: 3 })).rejects.toThrow('network');
    expect(store.actionLoading).toBe(false);
  });
});
