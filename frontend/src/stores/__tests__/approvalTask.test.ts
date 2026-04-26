import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useApprovalTaskStore } from '../approvalTask';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
};

const row = {
  id: 9,
  applicationId: 17,
  applicationNo: 'APP-20260426-ABCDEFGH',
  taskStatus: 'PENDING',
  applicationStatus: 'APPROVING',
  templateId: 3,
  templateName: '请假申请',
  templateVersion: 5,
  processId: 8,
  processName: '请假审批流程',
  applicantName: '申请人',
  applicantDepartmentId: 2,
  applicantDepartmentName: '研发部',
  currentNodeOrder: 1,
  currentNodeName: '部门负责人审批',
  nodeOrder: 1,
  nodeName: '部门负责人审批',
  assigneeId: 20,
  assigneeName: '审批人',
  assignedAt: '2026-04-26T08:00:00.000Z',
  handledAt: null,
  taskComment: null,
  submittedAt: '2026-04-26T07:59:00.000Z',
  completedAt: null,
  createdAt: '2026-04-26T07:30:00.000Z',
  updatedAt: '2026-04-26T08:00:00.000Z',
  canHandle: true,
  canComment: true,
};

describe('approval task store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
  });

  it('fetches task filter metadata from GET /approval/tasks/meta', async () => {
    const meta = {
      templates: [{ label: '请假申请 v5', value: 3, version: 5 }],
      departments: [{ label: '研发部', value: 2 }],
    };
    mockedApi.get.mockResolvedValueOnce({ data: meta });

    const store = useApprovalTaskStore();
    const result = await store.fetchMeta();

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/tasks/meta');
    expect(result).toEqual(meta);
    expect(store.filterOptions).toEqual(meta);
  });

  it('fetches GET /approval/tasks with view, pagination, and filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        rows: [row],
        total: 1,
        page: 2,
        size: 20,
        view: 'handled',
      },
    });

    const store = useApprovalTaskStore();
    await store.fetchList({
      view: 'handled',
      page: 2,
      size: 20,
      templateId: 3,
      applicantName: '申请人',
      departmentId: 2,
      status: 'APPROVED',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-26',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/tasks', {
      params: {
        view: 'handled',
        page: 2,
        size: 20,
        templateId: 3,
        applicantName: '申请人',
        departmentId: 2,
        status: 'APPROVED',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-26',
      },
    });
    expect(store.rows).toEqual([row]);
    expect(store.loading).toBe(false);
  });

  it('fetches detail and posts approve/reject/comment task actions', async () => {
    const detail = {
      ...row,
      formData: { reason: '年度调休' },
      schemaSnapshot: { version: 2, items: [] },
      processSnapshot: { processId: 8, processName: '请假审批流程', nodes: [] },
      timeline: [],
      tasks: [],
    };
    mockedApi.get.mockResolvedValueOnce({ data: detail });
    mockedApi.post
      .mockResolvedValueOnce({ data: { ...detail, taskStatus: 'APPROVED' } })
      .mockResolvedValueOnce({ data: { ...detail, taskStatus: 'REJECTED' } })
      .mockResolvedValueOnce({ data: detail });

    const store = useApprovalTaskStore();
    await store.fetchDetail(9);
    await store.approve(9, '同意');
    await store.reject(9, '资料不完整');
    await store.comment(9, '内部备注');

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/tasks/9');
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/approval/tasks/9/approve', { comment: '同意' });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/approval/tasks/9/reject', { comment: '资料不完整' });
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/approval/tasks/9/comment', { comment: '内部备注' });
    expect(store.detailLoading).toBe(false);
    expect(store.actionLoading).toBe(false);
  });

  it('resets loading, detailLoading, and actionLoading when requests fail', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('list')).mockRejectedValueOnce(new Error('detail'));
    mockedApi.post.mockRejectedValueOnce(new Error('action'));

    const store = useApprovalTaskStore();
    await expect(store.fetchList()).rejects.toThrow('list');
    await expect(store.fetchDetail(9)).rejects.toThrow('detail');
    await expect(store.approve(9)).rejects.toThrow('action');

    expect(store.loading).toBe(false);
    expect(store.detailLoading).toBe(false);
    expect(store.actionLoading).toBe(false);
  });
});
