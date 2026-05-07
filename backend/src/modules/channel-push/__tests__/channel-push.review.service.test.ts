import { describe, expect, it, mock } from 'bun:test';

const findUniquePushMock = mock(async (_args: any) => null as any);
const findManyPushMock = mock(async (_args: any) => [] as any[]);
const countPushMock = mock(async (_args: any) => 0);
const updatePushMock = mock(async (args: any) => ({
  ...reviewPushRow(),
  ...args.data,
  id: args.where?.id,
}));
const createReviewActionMock = mock(async (args: any) => ({
  id: 99,
  ...args.data,
  createdAt: args.data?.createdAt ?? new Date('2026-05-08T00:00:00.000Z'),
}));
const visitCreateMock = mock(async () => {
  throw new Error('VisitRecord must NOT be created by review service');
});
const approvalCreateMock = mock(async () => {
  throw new Error('ApprovalApplication must NOT be created by review service');
});
const notificationCreateMock = mock(async () => {
  throw new Error('Notification must NOT be created by review service');
});

const transactionMock = mock(async (cb: any) => {
  if (typeof cb === 'function') {
    return cb({
      channelPush: {
        update: updatePushMock,
        findUnique: findUniquePushMock,
      },
      channelPushReviewAction: { create: createReviewActionMock },
    });
  }
  return Promise.all(cb);
});

mock.module('../../../plugins/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    channelPush: {
      findUnique: findUniquePushMock,
      findMany: findManyPushMock,
      count: countPushMock,
      update: updatePushMock,
    },
    channelPushReviewAction: { create: createReviewActionMock },
    visitRecord: { create: visitCreateMock },
    approvalApplication: { create: approvalCreateMock },
    userNotification: { create: notificationCreateMock },
  },
}));

const {
  approveReviewChannelPush,
  getReviewChannelPush,
  listReviewHandledChannelPushes,
  listReviewPendingChannelPushes,
  normalizeReviewListFilters,
  rejectReviewChannelPush,
  saveReviewInternalFields,
  serializeChannelPushReviewDetail,
  serializeChannelPushReviewRow,
} = await import('../channel-push-review.service');

import { BizError } from '../../../utils/errors';

function actor(overrides: Partial<any> = {}) {
  return {
    id: 99,
    name: '接收人',
    roleCodes: ['USER'],
    permissions: ['channelPush:review'],
    ...overrides,
  };
}

function reviewPushRow(overrides: Partial<any> = {}) {
  return {
    id: 11,
    channelPartnerId: 5,
    channelPartner: { id: 5, username: 'partner-a', realName: '渠道商A' },
    recipientUserId: 99,
    studentName: '张三',
    studentPhone: '13800138000',
    studentAge: 20,
    studentEducation: '本科',
    studentGender: '男',
    intentStatus: '高意向',
    intentNote: '想了解课程',
    remark: '原始备注',
    status: 'PENDING',
    submittedAt: new Date('2026-05-05T00:00:00.000Z'),
    lastEditedAt: null,
    cancelledAt: null,
    internalScheduledReceiverId: 77,
    internalScheduledReceiver: { id: 77, username: 'receiver-a', realName: '计划接待人' },
    internalScheduledDate: new Date('2026-05-09T00:00:00.000Z'),
    internalNote: '内部备注',
    attachments: [
      {
        id: 1,
        originalName: 'id.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        relativePath: '11/id.jpg',
        storedName: 'id.jpg',
        createdAt: new Date('2026-05-05T01:00:00.000Z'),
      },
    ],
    reviewActions: [
      {
        id: 1,
        channelPushId: 11,
        actorId: 5,
        actorName: '渠道商A',
        type: 'SUBMIT',
        comment: null,
        createdAt: new Date('2026-05-05T00:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-05-05T00:00:00.000Z'),
    updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    ...overrides,
  };
}

describe('channel-push review service', () => {
  it('normalizes reviewer list filters', () => {
    const filters = normalizeReviewListFilters({
      page: '0',
      size: '999',
      channelPartnerKeyword: ' 渠道 ',
      status: 'APPROVED',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-02',
    });
    expect(filters.page).toBe(1);
    expect(filters.size).toBe(100);
    expect(filters.channelPartnerKeyword).toBe('渠道');
    expect(filters.status).toBe('APPROVED');
    expect(filters.dateFrom?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(filters.dateTo?.toISOString()).toBe('2026-05-02T23:59:59.999Z');
  });

  it('filters pending queue by recipient, status, partner keyword, and submitted date', async () => {
    await listReviewPendingChannelPushes(actor(), {
      channelPartnerKeyword: '渠道',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-07',
    });

    const where = countPushMock.mock.calls.at(-1)?.[0]?.where;
    expect(where.recipientUserId).toBe(99);
    expect(where.status).toBe('PENDING');
    expect(where.channelPartner.OR[0].realName.contains).toBe('渠道');
    expect(where.submittedAt.gte).toBeInstanceOf(Date);
    expect(where.submittedAt.lte).toBeInstanceOf(Date);
  });

  it('filters handled queue to APPROVED / REJECTED only and supports status narrowing', async () => {
    await listReviewHandledChannelPushes(actor(), { status: 'REJECTED' });

    const where = countPushMock.mock.calls.at(-1)?.[0]?.where;
    expect(where.recipientUserId).toBe(99);
    expect(where.status).toBe('REJECTED');
  });

  it('serializes reviewer rows with partner name, derived review fields, internal fields, and attachment count', () => {
    const dto = serializeChannelPushReviewRow(
      reviewPushRow({
        status: 'REJECTED',
        reviewActions: [
          { id: 1, type: 'SUBMIT', actorName: '渠道商A', comment: null, createdAt: new Date('2026-05-05T00:00:00.000Z') },
          { id: 2, type: 'REJECT', actorName: '接收人', comment: '资料不全', createdAt: new Date('2026-05-06T00:00:00.000Z') },
        ],
      }),
    );

    expect(dto.channelPartnerName).toBe('渠道商A');
    expect(dto.reviewedAt).toBe('2026-05-06T00:00:00.000Z');
    expect(dto.reviewComment).toBe('资料不全');
    expect(dto.internalScheduledReceiverName).toBe('计划接待人');
    expect(dto.internalScheduledDate).toBe('2026-05-09T00:00:00.000Z');
    expect(dto.internalNote).toBe('内部备注');
    expect(dto.attachmentCount).toBe(1);
  });

  it('serializes reviewer detail with attachments, actions, and duplicateHints', () => {
    const detail = serializeChannelPushReviewDetail(reviewPushRow(), [
      {
        id: 88,
        studentName: '张三',
        studentPhone: '13800138000',
        status: 'PENDING',
        submittedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);

    expect(detail.attachments[0]).toMatchObject({ id: 1, originalName: 'id.jpg' });
    expect((detail.attachments[0] as any).relativePath).toBeUndefined();
    expect(detail.reviewActions[0]).toMatchObject({ type: 'SUBMIT' });
    expect(detail.duplicateHints[0]).toMatchObject({ id: 88, submittedAt: '2026-05-01T00:00:00.000Z' });
  });

  it('rejects detail access for non-recipient actors', async () => {
    findUniquePushMock.mockResolvedValueOnce(reviewPushRow({ recipientUserId: 123 }));
    let caught: BizError | null = null;
    try {
      await getReviewChannelPush(11, actor());
    } catch (e) {
      caught = e as BizError;
    }
    expect(caught?.code).toBe('CHANNEL_PUSH_REVIEW_FORBIDDEN');
    expect(caught?.status).toBe(403);
  });

  it('persists only internal fields on ChannelPush', async () => {
    findUniquePushMock.mockResolvedValueOnce(reviewPushRow());
    updatePushMock.mockResolvedValueOnce(reviewPushRow({
      internalScheduledReceiverId: 100,
      internalScheduledDate: new Date('2026-05-10T00:00:00.000Z'),
      internalNote: '跟进',
    }));

    await saveReviewInternalFields(11, actor(), {
      internalScheduledReceiverId: 100,
      internalScheduledDate: '2026-05-10',
      internalNote: ' 跟进 ',
      studentName: '恶意改名',
    } as any);

    const data = updatePushMock.mock.calls.at(-1)?.[0]?.data;
    expect(data).toEqual({
      internalScheduledReceiverId: 100,
      internalScheduledDate: new Date('2026-05-10T00:00:00.000Z'),
      internalNote: '跟进',
    });
    expect(data.studentName).toBeUndefined();
  });

  it('approves PENDING push, appends APPROVE action, and does not create side effects', async () => {
    findUniquePushMock
      .mockResolvedValueOnce(reviewPushRow())
      .mockResolvedValueOnce(reviewPushRow({
        status: 'APPROVED',
        reviewActions: [
          ...reviewPushRow().reviewActions,
          { id: 2, type: 'APPROVE', actorName: '接收人', comment: '同意', createdAt: new Date('2026-05-07T00:00:00.000Z') },
        ],
      }));
    const visitBefore = visitCreateMock.mock.calls.length;
    const approvalBefore = approvalCreateMock.mock.calls.length;
    const notificationBefore = notificationCreateMock.mock.calls.length;

    await approveReviewChannelPush(11, actor(), { comment: ' 同意 ' });

    const updateCall = updatePushMock.mock.calls.at(-1)?.[0];
    expect(updateCall.data.status).toBe('APPROVED');
    const actionCall = createReviewActionMock.mock.calls.at(-1)?.[0];
    expect(actionCall.data.type).toBe('APPROVE');
    expect(actionCall.data.comment).toBe('同意');
    expect(visitCreateMock.mock.calls.length).toBe(visitBefore);
    expect(approvalCreateMock.mock.calls.length).toBe(approvalBefore);
    expect(notificationCreateMock.mock.calls.length).toBe(notificationBefore);
  });

  it('rejects require a comment and append REJECT action', async () => {
    findUniquePushMock.mockResolvedValueOnce(reviewPushRow());

    let caught: BizError | null = null;
    try {
      await rejectReviewChannelPush(11, actor(), { comment: '   ' });
    } catch (e) {
      caught = e as BizError;
    }
    expect(caught?.code).toBe('CHANNEL_PUSH_REJECT_COMMENT_REQUIRED');

    findUniquePushMock
      .mockResolvedValueOnce(reviewPushRow())
      .mockResolvedValueOnce(reviewPushRow({ status: 'REJECTED' }));

    await rejectReviewChannelPush(11, actor(), { comment: '资料不全' });
    const actionCall = createReviewActionMock.mock.calls.at(-1)?.[0];
    expect(actionCall.data.type).toBe('REJECT');
    expect(actionCall.data.comment).toBe('资料不全');
  });

  it('rejects terminal pushes through the shared state machine', async () => {
    findUniquePushMock.mockResolvedValueOnce(reviewPushRow({ status: 'APPROVED' }));
    let caught: BizError | null = null;
    try {
      await approveReviewChannelPush(11, actor(), {});
    } catch (e) {
      caught = e as BizError;
    }
    expect(caught?.code).toBe('CHANNEL_PUSH_ILLEGAL_TRANSITION');
  });
});
