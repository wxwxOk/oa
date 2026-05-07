import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from 'src/boot/axios';
import { useChannelPushStore } from '../channelPush';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  patch: Mock;
  delete: Mock;
};

describe('useChannelPushStore — batchImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('posts strict { rows } envelope to /channel-push/batch-import', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { createdCount: 1, total: 1, failedRows: [], duplicateHints: [] },
    });
    // fetchMine is called after success — stub the GET it triggers
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useChannelPushStore();

    await store.batchImport([
      { studentName: '张三', studentPhone: '13800138000' },
    ]);

    expect(mockedApi.post).toHaveBeenCalledWith('/channel-push/batch-import', {
      rows: [{ studentName: '张三', studentPhone: '13800138000' }],
    });
    const callArgs = mockedApi.post.mock.calls[0]!;
    const body = callArgs[1] as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(['rows']);
  });

  it('toggles importLoading false → true → false during the request', async () => {
    let observedDuringPost = false;
    mockedApi.post.mockImplementationOnce(async () => {
      observedDuringPost = store.importLoading;
      return { data: { createdCount: 0, total: 0, failedRows: [], duplicateHints: [] } };
    });
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useChannelPushStore();

    expect(store.importLoading).toBe(false);
    const promise = store.batchImport([
      { studentName: '李四', studentPhone: '13900139000' },
    ]);
    await promise;

    expect(observedDuringPost).toBe(true);
    expect(store.importLoading).toBe(false);
  });

  it('returns the full response { createdCount, total, failedRows, duplicateHints }', async () => {
    const response = {
      createdCount: 3,
      total: 5,
      failedRows: [
        { index: 3, reason: '学员姓名 不能为空', code: 'CHANNEL_PUSH_FIELD_REQUIRED' },
        { index: 4, reason: '手机号格式不正确', code: 'CHANNEL_PUSH_PHONE_INVALID' },
      ],
      duplicateHints: [
        {
          id: 100,
          studentName: '张三',
          studentPhone: '13800138000',
          status: 'PENDING',
          submittedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    };
    mockedApi.post.mockResolvedValueOnce({ data: response });
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useChannelPushStore();

    const result = await store.batchImport([
      { studentName: '张三', studentPhone: '13800138000' },
    ]);

    expect(result).toEqual(response);
  });

  it('calls fetchMine(currentFilters) once after a successful import', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { createdCount: 1, total: 1, failedRows: [], duplicateHints: [] },
    });
    mockedApi.get.mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useChannelPushStore();
    // Seed current filters so we can assert they propagate into fetchMine's GET
    store.filters = { keyword: 'foo', status: 'PENDING', dateFrom: '', dateTo: '' };

    await store.batchImport([{ studentName: '甲', studentPhone: '13800138001' }]);

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get.mock.calls[0]![0]).toBe('/channel-push/mine');
    const params = mockedApi.get.mock.calls[0]![1].params as Record<string, unknown>;
    expect(params.keyword).toBe('foo');
    expect(params.status).toBe('PENDING');
  });

  it('re-throws axios errors so the global interceptor handles Notify', async () => {
    const err = Object.assign(new Error('Request failed with status code 422'), {
      response: { status: 422, data: { code: 'CHANNEL_PARTNER_NOT_BOUND', message: '未绑定接收人' } },
    });
    mockedApi.post.mockRejectedValueOnce(err);
    const store = useChannelPushStore();

    await expect(
      store.batchImport([{ studentName: '甲', studentPhone: '13800138001' }]),
    ).rejects.toThrow();
    // fetchMine MUST NOT be called when the post rejected
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('resets importLoading to false even when the request rejects', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('boom'));
    const store = useChannelPushStore();

    await expect(
      store.batchImport([{ studentName: '甲', studentPhone: '13800138001' }]),
    ).rejects.toThrow('boom');

    expect(store.importLoading).toBe(false);
  });
});

describe('useChannelPushStore — review API', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches pending and handled review queues with isolated filters', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { rows: [], total: 0, page: 2, size: 20 } })
      .mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, size: 10 } });
    const store = useChannelPushStore();

    await store.fetchReviewPending({ page: 2, size: 20, channelPartnerKeyword: '渠道A', status: 'PENDING' });
    await store.fetchReviewHandled({ status: 'APPROVED', dateFrom: '2026-05-01', dateTo: '2026-05-07' });

    expect(mockedApi.get.mock.calls[0]![0]).toBe('/review/channel-push/pending');
    expect(mockedApi.get.mock.calls[0]![1].params).toMatchObject({
      page: 2,
      size: 20,
      channelPartnerKeyword: '渠道A',
      status: 'PENDING',
    });
    expect(mockedApi.get.mock.calls[1]![0]).toBe('/review/channel-push/handled');
    expect(mockedApi.get.mock.calls[1]![1].params).toMatchObject({
      status: 'APPROVED',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-07',
    });
    expect(store.filters).toEqual({ keyword: '', status: '', dateFrom: '', dateTo: '' });
    expect(store.reviewPendingFilters.channelPartnerKeyword).toBe('渠道A');
    expect(store.reviewHandledFilters.status).toBe('APPROVED');
  });

  it('loads review detail and saves internal fields through review endpoints', async () => {
    const detail = { id: 10, status: 'PENDING', attachments: [], reviewActions: [], duplicateHints: [] };
    mockedApi.get.mockResolvedValueOnce({ data: detail });
    mockedApi.patch.mockResolvedValueOnce({ data: { ...detail, internalNote: '备注' } });
    const store = useChannelPushStore();

    await store.fetchReviewDetail(10);
    await store.saveReviewInternalFields(10, {
      internalScheduledReceiverId: 3,
      internalScheduledDate: '2026-05-10',
      internalNote: '备注',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/review/channel-push/10');
    expect(mockedApi.patch).toHaveBeenCalledWith('/review/channel-push/10/internal-fields', {
      internalScheduledReceiverId: 3,
      internalScheduledDate: '2026-05-10',
      internalNote: '备注',
    });
    expect(store.reviewCurrent?.internalNote).toBe('备注');
  });

  it('posts approve/reject payloads and toggles reviewActionLoading', async () => {
    let observedDuringApprove = false;
    mockedApi.post.mockImplementationOnce(async () => {
      observedDuringApprove = store.reviewActionLoading;
      return { data: { id: 10, status: 'APPROVED' } };
    });
    mockedApi.post.mockResolvedValueOnce({ data: { id: 10, status: 'REJECTED' } });
    const store = useChannelPushStore();

    await store.approveReview(10, { comment: '同意' });
    await store.rejectReview(10, { comment: '资料不全' });

    expect(observedDuringApprove).toBe(true);
    expect(store.reviewActionLoading).toBe(false);
    expect(mockedApi.post.mock.calls[0]).toEqual(['/review/channel-push/10/approve', { comment: '同意' }]);
    expect(mockedApi.post.mock.calls[1]).toEqual(['/review/channel-push/10/reject', { comment: '资料不全' }]);
  });

  it('uses review-specific blob endpoints for preview and download', async () => {
    const blob = new Blob(['demo']);
    mockedApi.get.mockResolvedValue({ data: blob });
    const store = useChannelPushStore();

    await store.previewReviewAttachmentBlob(10, 20);
    await store.downloadReviewAttachmentBlob(10, 20);

    expect(mockedApi.get.mock.calls[0]).toEqual([
      '/review/channel-push/10/attachments/20/preview',
      { responseType: 'blob' },
    ]);
    expect(mockedApi.get.mock.calls[1]).toEqual([
      '/review/channel-push/10/attachments/20/download',
      { responseType: 'blob' },
    ]);
  });
});
