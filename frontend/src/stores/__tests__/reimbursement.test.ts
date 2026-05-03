import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useReimbursementStore } from '../reimbursement';

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

const row = {
  id: 25,
  applicationNo: 'REIM-20260503-0001',
  title: '交通费报销',
  category: '差旅',
  occurredAt: '2026-05-03T00:00:00.000Z',
  amount: '123.40',
  reason: '客户拜访',
  payeeInfo: null,
  remark: null,
  status: 'DRAFT',
  applicantId: 3,
  applicantName: '张三',
  applicantDepartmentId: 2,
  applicantDepartmentName: '销售部',
  submittedAt: null,
  completedAt: null,
  attachmentCount: 0,
  createdAt: '2026-05-03T08:00:00.000Z',
  updatedAt: '2026-05-03T08:30:00.000Z',
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('useReimbursementStore', () => {
  it('fetches reimbursements with Phase 24 filters and omits blanks', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [row], total: 1, page: 2, size: 20 } });
    const store = useReimbursementStore();

    await store.fetchList({
      page: 2,
      size: 20,
      status: 'DRAFT',
      category: '差旅',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      keyword: '交通',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/reimbursements', {
      params: {
        page: 2,
        size: 20,
        status: 'DRAFT',
        category: '差旅',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        keyword: '交通',
      },
    });
    expect(store.rows).toEqual([row]);
    expect(store.total).toBe(1);
    expect(store.page).toBe(2);
    expect(store.size).toBe(20);

    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    await store.fetchList({ page: 1, size: 10, status: '', category: '', dateFrom: '', dateTo: '', keyword: '' });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/reimbursements', { params: { page: 1, size: 10 } });
  });

  it('fetches detail and creates, updates, submits drafts through fixed endpoints', async () => {
    const detail = { ...row, attachments: [], actions: [] };
    mockedApi.get.mockResolvedValueOnce({ data: detail });
    mockedApi.post.mockResolvedValueOnce({ data: detail }).mockResolvedValueOnce({ data: { ...detail, status: 'DEPARTMENT_REVIEW' } });
    mockedApi.put.mockResolvedValueOnce({ data: { ...detail, title: '更新标题' } });
    const store = useReimbursementStore();

    await store.fetchDetail(25);
    await store.createDraft({ title: ' 交通费报销 ', category: ' 差旅 ', occurredAt: '2026-05-03', amount: '123.4', reason: ' 拜访 ' });
    await store.updateDraft(25, { title: ' 更新标题 ', category: ' 差旅 ', occurredAt: '2026-05-03', amount: 456, reason: ' 拜访 ' });
    await store.submitDraft(25);

    expect(mockedApi.get).toHaveBeenCalledWith('/reimbursements/25');
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/reimbursements', {
      title: '交通费报销',
      category: '差旅',
      occurredAt: '2026-05-03',
      amount: '123.40',
      reason: '拜访',
      payeeInfo: null,
      remark: null,
    });
    expect(mockedApi.put).toHaveBeenCalledWith('/reimbursements/25', {
      title: '更新标题',
      category: '差旅',
      occurredAt: '2026-05-03',
      amount: '456.00',
      reason: '拜访',
      payeeInfo: null,
      remark: null,
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/reimbursements/25/submit');
  });

  it('fetches department and finance review queues through fixed endpoints', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { rows: [{ ...row, status: 'DEPARTMENT_REVIEW' }], total: 1, page: 1, size: 10 } })
      .mockResolvedValueOnce({ data: { rows: [{ ...row, status: 'FINANCE_REVIEW' }], total: 1, page: 2, size: 20 } });
    const store = useReimbursementStore();

    await store.fetchDepartmentReviewList({ page: 1, size: 10, status: 'DEPARTMENT_REVIEW', keyword: '交通' });
    await store.fetchFinanceReviewList({ page: 2, size: 20, status: 'FINANCE_REVIEW', category: '差旅', keyword: '' });

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/reimbursements/review/department', {
      params: { page: 1, size: 10, status: 'DEPARTMENT_REVIEW', keyword: '交通' },
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/reimbursements/review/finance', {
      params: { page: 2, size: 20, status: 'FINANCE_REVIEW', category: '差旅' },
    });
  });

  it('submits review actions with signature multipart or reject JSON payloads', async () => {
    const store = useReimbursementStore();
    const signature = new File(['png'], 'signature.png', { type: 'image/png' });
    mockedApi.post
      .mockResolvedValueOnce({ data: { ...row, status: 'FINANCE_REVIEW' } })
      .mockResolvedValueOnce({ data: { ...row, status: 'REJECTED' } })
      .mockResolvedValueOnce({ data: { ...row, status: 'APPROVED' } })
      .mockResolvedValueOnce({ data: { ...row, status: 'REJECTED' } });

    await store.departmentApprove(25, { signature, comment: ' 同意 ' });
    await store.departmentReject(25, { comment: ' 资料不完整 ' });
    await store.financeApprove(25, { signature, comment: '' });
    await store.financeReject(25, { comment: ' 金额有误 ' });

    const departmentApproveForm = mockedApi.post.mock.calls[0][1] as FormData;
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/reimbursements/25/department-review/approve', expect.any(FormData));
    expect((departmentApproveForm.get('signature') as File).name).toBe('signature.png');
    expect(departmentApproveForm.get('comment')).toBe('同意');
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/reimbursements/25/department-review/reject', { comment: '资料不完整' });

    const financeApproveForm = mockedApi.post.mock.calls[2][1] as FormData;
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/reimbursements/25/finance-review/approve', expect.any(FormData));
    expect((financeApproveForm.get('signature') as File).type).toBe('image/png');
    expect(financeApproveForm.has('comment')).toBe(false);
    expect(mockedApi.post).toHaveBeenNthCalledWith(4, '/reimbursements/25/finance-review/reject', { comment: '金额有误' });
  });

  it('uploads attachments with multipart file key and downloads blobs through authenticated paths', async () => {
    const store = useReimbursementStore();
    const file = new File(['demo'], 'invoice.pdf', { type: 'application/pdf' });
    const blob = new Blob(['demo'], { type: 'application/pdf' });
    mockedApi.post.mockResolvedValueOnce({ data: { id: 9, originalName: 'invoice.pdf' } });
    mockedApi.get.mockResolvedValueOnce({ data: blob }).mockResolvedValueOnce({ data: blob });
    mockedApi.delete.mockResolvedValueOnce({ data: { ok: true } });

    await store.uploadAttachment(25, file);
    await store.previewAttachmentBlob(25, 9);
    await store.downloadAttachment(25, 9);
    await store.deleteAttachment(25, 9);

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    const uploadedFile = formData.get('file') as File;
    expect(mockedApi.post).toHaveBeenCalledWith('/reimbursements/25/attachments', expect.any(FormData));
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/reimbursements/25/attachments/9/preview', { responseType: 'blob' });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/reimbursements/25/attachments/9/download', { responseType: 'blob' });
    expect(mockedApi.delete).toHaveBeenCalledWith('/reimbursements/25/attachments/9');
  });

  it('loads protected action signatures as authenticated blobs', async () => {
    const store = useReimbursementStore();
    const blob = new Blob(['signature'], { type: 'image/png' });
    mockedApi.get.mockResolvedValueOnce({ data: blob });

    await expect(store.previewSignatureBlob(25, 19)).resolves.toBe(blob);

    expect(mockedApi.get).toHaveBeenCalledWith('/reimbursements/25/actions/19/signature', { responseType: 'blob' });
  });

  it('resets loading flags when requests reject', async () => {
    const store = useReimbursementStore();
    mockedApi.get.mockRejectedValueOnce(new Error('list'));
    await expect(store.fetchList()).rejects.toThrow('list');

    mockedApi.get.mockRejectedValueOnce(new Error('detail'));
    await expect(store.fetchDetail(25)).rejects.toThrow('detail');

    mockedApi.post.mockRejectedValueOnce(new Error('action'));
    await expect(store.createDraft({ title: 'a', category: 'b', occurredAt: '2026-05-03', amount: 1, reason: 'c' })).rejects.toThrow('action');

    mockedApi.post.mockRejectedValueOnce(new Error('upload'));
    await expect(store.uploadAttachment(25, new File(['demo'], 'invoice.pdf'))).rejects.toThrow('upload');

    mockedApi.get.mockRejectedValueOnce(new Error('preview'));
    await expect(store.previewAttachmentBlob(25, 9)).rejects.toThrow('preview');

    mockedApi.get.mockRejectedValueOnce(new Error('signature'));
    await expect(store.previewSignatureBlob(25, 19)).rejects.toThrow('signature');

    expect(store.loading).toBe(false);
    expect(store.detailLoading).toBe(false);
    expect(store.actionLoading).toBe(false);
    expect(store.uploadLoading).toBe(false);
    expect(store.downloadLoading).toBe(false);
  });
});
