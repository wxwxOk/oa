import { describe, expect, it, mock } from 'bun:test';

const findUniqueProfileMock = mock(async (_args: any) => ({
  id: 1,
  userId: 5,
  primaryRecipientId: 99,
}));
const findUniquePushMock = mock(async (_args: any) => null as any);
const findManyPushMock = mock(async (_args: any) => [] as any[]);
const countPushMock = mock(async (_args: any) => 0);
const updatePushMock = mock(async (args: any) => ({ id: args.where?.id, ...args.data }));
const createPushMock = mock(async (args: any) => ({ id: 1, ...args.data }));
const createReviewActionMock = mock(async (_args: any) => ({}));
const createAttachmentMock = mock(async (_args: any) => ({}));

const visitCreateMock = mock(async () => {
  throw new Error('visit.create must NOT be called from channel-push service');
});
const approvalCreateMock = mock(async () => {
  throw new Error('approvalApplication.create must NOT be called from channel-push service');
});
const notificationCreateMock = mock(async (_args: any) => {
  return {};
});

const transactionMock = mock(async (cb: any) => {
  if (typeof cb === 'function') {
    return cb({
      channelPush: {
        create: createPushMock,
        update: updatePushMock,
        findUnique: findUniquePushMock,
      },
      channelPushAttachment: { create: createAttachmentMock },
      channelPushReviewAction: { create: createReviewActionMock },
      userNotification: { create: notificationCreateMock },
    });
  }
  return Promise.all(cb);
});

mock.module('../../../plugins/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    channelPush: {
      create: createPushMock,
      update: updatePushMock,
      findUnique: findUniquePushMock,
      findMany: findManyPushMock,
      count: countPushMock,
    },
    channelPushAttachment: { create: createAttachmentMock },
    channelPushReviewAction: { create: createReviewActionMock },
    channelPartnerProfile: { findUnique: findUniqueProfileMock },
    visitRecord: { create: visitCreateMock },
    approvalApplication: { create: approvalCreateMock },
    userNotification: { create: notificationCreateMock },
  },
}));

const {
  assertCanMutateOwnChannelPush,
  batchCreateChannelPushes,
  cancelChannelPush,
  createChannelPush,
  normalizeChannelPushListFilters,
  normalizeChannelPushWriteInput,
  serializeChannelPushDetail,
} = await import('../channel-push.service');

import { BizError } from '../../../utils/errors';

function actor(overrides: Partial<any> = {}) {
  return {
    id: 5,
    name: 'partner-a',
    roleCodes: ['CHANNEL_PARTNER'],
    permissions: ['channelPush:create', 'channelPush:viewOwn', 'channelPush:cancel'],
    ...overrides,
  } as any;
}

function pushRow(overrides: Partial<any> = {}) {
  return {
    id: 11,
    channelPartnerId: 5,
    recipientUserId: 99,
    studentName: '张三',
    studentPhone: '13800138000',
    studentAge: null,
    studentEducation: null,
    studentGender: null,
    intentStatus: null,
    intentNote: null,
    remark: null,
    status: 'PENDING',
    submittedAt: new Date('2026-05-05T00:00:00.000Z'),
    lastEditedAt: null,
    cancelledAt: null,
    internalScheduledReceiverId: null,
    internalScheduledReceiver: null,
    internalScheduledDate: null,
    internalNote: null,
    attachments: [],
    reviewActions: [],
    createdAt: new Date('2026-05-05T00:00:00.000Z'),
    updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('channel-push service helpers', () => {
  describe('normalizeChannelPushWriteInput', () => {
    it('trims strings and normalizes phone to digit-only', () => {
      const out = normalizeChannelPushWriteInput({
        studentName: ' 张三 ',
        studentPhone: '+86 138-0013-8000',
        studentAge: 20,
        intentNote: '  备注  ',
        remark: '   ',
      });
      expect(out.studentName).toBe('张三');
      expect(out.studentPhone).toBe('13800138000');
      expect(out.intentNote).toBe('备注');
      expect(out.remark).toBeNull(); // empty after trim → null
    });

    it('rejects empty studentName', () => {
      expect(() =>
        normalizeChannelPushWriteInput({ studentName: '   ', studentPhone: '13800138000' }),
      ).toThrow(BizError);
    });

    it('rejects studentName longer than 64 chars', () => {
      expect(() =>
        normalizeChannelPushWriteInput({
          studentName: 'a'.repeat(65),
          studentPhone: '13800138000',
        }),
      ).toThrow(BizError);
    });

    it('rejects invalid Chinese mobile phone', () => {
      let caught: BizError | null = null;
      try {
        normalizeChannelPushWriteInput({ studentName: '张三', studentPhone: '12345' });
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PUSH_PHONE_INVALID');
    });

    it('rejects studentAge outside 1..120', () => {
      expect(() =>
        normalizeChannelPushWriteInput({
          studentName: '张三',
          studentPhone: '13800138000',
          studentAge: 0,
        }),
      ).toThrow(BizError);
      expect(() =>
        normalizeChannelPushWriteInput({
          studentName: '张三',
          studentPhone: '13800138000',
          studentAge: 121,
        }),
      ).toThrow(BizError);
    });

    it('passes valid optional fields through', () => {
      const out = normalizeChannelPushWriteInput({
        studentName: '李四',
        studentPhone: '13900139000',
        studentAge: 25,
        studentEducation: '本科',
        studentGender: '男',
        intentStatus: '高意向',
      });
      expect(out.studentAge).toBe(25);
      expect(out.studentEducation).toBe('本科');
      expect(out.studentGender).toBe('男');
      expect(out.intentStatus).toBe('高意向');
    });
  });

  describe('normalizeChannelPushListFilters', () => {
    it('clamps page / size and normalizes date range + keyword', () => {
      const filters = normalizeChannelPushListFilters({
        page: '0',
        size: '999',
        status: 'PENDING',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-02',
        keyword: '  ABC  ',
      });
      expect(filters.page).toBe(1);
      expect(filters.size).toBe(100);
      expect(filters.status).toBe('PENDING');
      expect(filters.dateFrom?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(filters.dateTo?.toISOString()).toBe('2026-05-02T23:59:59.999Z');
      expect(filters.keyword).toBe('ABC');
    });

    it('drops invalid status filter', () => {
      const filters = normalizeChannelPushListFilters({ status: 'BOGUS' as any });
      expect(filters.status).toBeUndefined();
    });

    it('handles missing dates gracefully', () => {
      const filters = normalizeChannelPushListFilters({});
      expect(filters.dateFrom).toBeUndefined();
      expect(filters.dateTo).toBeUndefined();
    });
  });

  describe('assertCanMutateOwnChannelPush', () => {
    it('throws CHANNEL_PUSH_NOT_OWNER when partner ids differ', () => {
      let caught: BizError | null = null;
      try {
        assertCanMutateOwnChannelPush(pushRow({ channelPartnerId: 7 }), actor({ id: 5 }));
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PUSH_NOT_OWNER');
      expect(caught?.status).toBe(403);
    });

    it('throws CHANNEL_PUSH_NOT_PENDING when status is not PENDING', () => {
      let caught: BizError | null = null;
      try {
        assertCanMutateOwnChannelPush(pushRow({ status: 'CANCELLED' }), actor());
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PUSH_NOT_PENDING');
      expect(caught?.status).toBe(422);
    });

    it('returns void when partner owns and status is PENDING', () => {
      expect(() => assertCanMutateOwnChannelPush(pushRow(), actor())).not.toThrow();
    });
  });

  describe('createChannelPush', () => {
    it('snapshots recipientUserId from profile.primaryRecipientId, never from body', async () => {
      findUniqueProfileMock.mockResolvedValueOnce({
        id: 1,
        userId: 5,
        primaryRecipientId: 99,
      });

      await createChannelPush(actor(), {
        studentName: '王五',
        studentPhone: '13700137000',
        // body deliberately includes a different recipientUserId — service MUST ignore it
        recipientUserId: 12345,
      } as any);

      const txCall = transactionMock.mock.calls.at(-1)?.[0];
      expect(typeof txCall).toBe('function');

      // Inspect the data passed to channelPush.create
      const createCall = createPushMock.mock.calls.at(-1)?.[0];
      expect(createCall.data.recipientUserId).toBe(99); // from profile, NOT 12345
      expect(createCall.data.channelPartnerId).toBe(5); // from currentUser.id
    });

    it('creates pending-review notification inside the same create transaction', async () => {
      findUniqueProfileMock.mockResolvedValueOnce({
        id: 1,
        userId: 5,
        primaryRecipientId: 99,
      });

      await createChannelPush(actor(), {
        studentName: '王五',
        studentPhone: '13700137000',
      } as any);

      const notificationCall = notificationCreateMock.mock.calls.at(-1)?.[0];
      expect(notificationCall.data).toMatchObject({
        userId: 99,
        type: 'CHANNEL_PUSH_PENDING_REVIEW',
        title: '渠道推送待审核',
        targetRoute: '/review/channel-push/1',
        sourceType: 'CHANNEL_PUSH',
        sourceId: 1,
      });
    });

    it('throws CHANNEL_PARTNER_NOT_BOUND when no profile exists for partner', async () => {
      findUniqueProfileMock.mockResolvedValueOnce(null as any);
      let caught: BizError | null = null;
      try {
        await createChannelPush(actor({ id: 999 }), {
          studentName: '王五',
          studentPhone: '13700137000',
        } as any);
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PARTNER_NOT_BOUND');
    });

    it('appends a SUBMIT review action atomically with the create', async () => {
      findUniqueProfileMock.mockResolvedValueOnce({
        id: 1,
        userId: 5,
        primaryRecipientId: 99,
      });

      await createChannelPush(actor(), {
        studentName: '王五',
        studentPhone: '13700137000',
      } as any);

      const submitAction = createReviewActionMock.mock.calls.find(
        (c) => c[0]?.data?.type === 'SUBMIT',
      );
      expect(submitAction).toBeTruthy();
    });
  });

  describe('cancelChannelPush', () => {
    it('sets status to CANCELLED and appends CANCEL review action', async () => {
      findUniquePushMock.mockResolvedValueOnce(pushRow());

      await cancelChannelPush(11, actor());

      const updateCall = updatePushMock.mock.calls.at(-1)?.[0];
      expect(updateCall.data.status).toBe('CANCELLED');
      expect(updateCall.data.cancelledAt).toBeInstanceOf(Date);

      const cancelAction = createReviewActionMock.mock.calls.find(
        (c) => c[0]?.data?.type === 'CANCEL',
      );
      expect(cancelAction).toBeTruthy();
    });

    it('REVIEW-06: cancel does NOT call visitRecord/approvalApplication/notification create', async () => {
      findUniquePushMock.mockResolvedValueOnce(pushRow());
      const visitBefore = visitCreateMock.mock.calls.length;
      const approvalBefore = approvalCreateMock.mock.calls.length;
      const notifBefore = notificationCreateMock.mock.calls.length;

      await cancelChannelPush(11, actor());

      expect(visitCreateMock.mock.calls.length).toBe(visitBefore);
      expect(approvalCreateMock.mock.calls.length).toBe(approvalBefore);
      expect(notificationCreateMock.mock.calls.length).toBe(notifBefore);
    });

    it('throws when push is not in PENDING status', async () => {
      findUniquePushMock.mockResolvedValueOnce(pushRow({ status: 'APPROVED' }));
      let caught: BizError | null = null;
      try {
        await cancelChannelPush(11, actor());
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PUSH_NOT_PENDING');
    });

    it('throws when partner does not own the push', async () => {
      findUniquePushMock.mockResolvedValueOnce(pushRow({ channelPartnerId: 9999 }));
      let caught: BizError | null = null;
      try {
        await cancelChannelPush(11, actor());
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PUSH_NOT_OWNER');
    });
  });

  describe('serializeChannelPushDetail', () => {
    it('returns ISO date strings + narrow attachment / reviewActions shape', () => {
      const dto = serializeChannelPushDetail(
        {
          ...pushRow(),
          attachments: [
            {
              id: 1,
              originalName: 'id.jpg',
              mimeType: 'image/jpeg',
              size: 1024,
              relativePath: '/secret/path.jpg',
              storedName: 'abc.jpg',
              uploaderId: 5,
              createdAt: new Date('2026-05-05T01:00:00.000Z'),
            },
          ],
          reviewActions: [
            {
              id: 1,
              type: 'SUBMIT',
              actorName: '张三',
              actorId: 5,
              comment: null,
              createdAt: new Date('2026-05-05T01:00:00.000Z'),
            },
          ],
        },
        'partner',
      );

      expect(typeof dto.submittedAt).toBe('string');
      expect(dto.submittedAt).toBe('2026-05-05T00:00:00.000Z');
      expect(dto.attachments).toHaveLength(1);
      // never expose internal storage path
      expect((dto.attachments[0] as any).relativePath).toBeUndefined();
      expect((dto.attachments[0] as any).storedName).toBeUndefined();
      expect(dto.attachments[0]).toMatchObject({
        id: 1,
        originalName: 'id.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
      });
      expect(dto.reviewActions).toHaveLength(1);
      expect(dto.reviewActions[0]).toMatchObject({
        id: 1,
        type: 'SUBMIT',
        actorName: '张三',
      });
    });

    it('hides internal scheduled fields from partner audience', () => {
      const dto = serializeChannelPushDetail(
        pushRow({
          internalScheduledReceiverId: 77,
          internalScheduledDate: new Date(),
          internalNote: '内部备注',
        }),
        'partner',
      );
      expect((dto as any).internalScheduledReceiverId).toBeUndefined();
      expect((dto as any).internalScheduledDate).toBeUndefined();
      expect((dto as any).internalNote).toBeUndefined();
    });

    it('exposes internal scheduled fields to recipient/admin audience', () => {
      const dto = serializeChannelPushDetail(
        pushRow({
          internalScheduledReceiverId: 77,
          internalScheduledDate: new Date('2026-05-06T00:00:00.000Z'),
          internalNote: '内部备注',
        }),
        'recipient',
      );
      expect((dto as any).internalScheduledReceiverId).toBe(77);
      expect((dto as any).internalScheduledDate).toBe('2026-05-06T00:00:00.000Z');
      expect((dto as any).internalNote).toBe('内部备注');
    });
  });
});

describe('batchCreateChannelPushes', () => {
  it('throws CHANNEL_PARTNER_NOT_BOUND before iterating rows when partner has no profile', async () => {
    findUniqueProfileMock.mockResolvedValueOnce(null as any);
    let caught: BizError | null = null;
    try {
      await batchCreateChannelPushes(actor({ id: 999 }), [
        { studentName: '甲', studentPhone: '13800138001' },
        { studentName: '乙', studentPhone: '13800138002' },
      ] as any);
    } catch (e) {
      caught = e as BizError;
    }
    expect(caught?.code).toBe('CHANNEL_PARTNER_NOT_BOUND');
    expect(caught?.status).toBe(422);
  });

  it('partial-success: 3 valid + 2 invalid → createdCount=3, failedRows preserves index/code', async () => {
    // Pre-flight + 3 successful per-row dedup queries (default mock returns [])
    // Note: findUniqueProfileMock is set to resolve with a profile by default (line 3-7)
    const result = await batchCreateChannelPushes(actor(), [
      { studentName: '张三', studentPhone: '13800138001' },
      { studentName: '李四', studentPhone: '13800138002' },
      { studentName: '王五', studentPhone: '13800138003' },
      { studentName: '', studentPhone: '13800138004' }, // missing name → CHANNEL_PUSH_FIELD_REQUIRED
      { studentName: '赵六', studentPhone: '12345678901' }, // bad phone → CHANNEL_PUSH_PHONE_INVALID
    ] as any);

    expect(result.total).toBe(5);
    expect(result.createdCount).toBe(3);
    expect(result.failedRows).toHaveLength(2);
    expect(result.failedRows[0]).toMatchObject({
      index: 3,
      code: 'CHANNEL_PUSH_FIELD_REQUIRED',
    });
    expect(result.failedRows[1]).toMatchObject({
      index: 4,
      code: 'CHANNEL_PUSH_PHONE_INVALID',
    });
    expect(result.failedRows[0]?.reason).toBeTruthy();
    expect(result.failedRows[1]?.reason).toBeTruthy();
  });

  it('aggregates duplicateHints across rows by id (Map dedup)', async () => {
    // Seed dedup query: every row sees the same existing push (id=100)
    const seededHint = {
      id: 100,
      studentName: '张三',
      studentPhone: '13800138000',
      status: 'PENDING' as const,
      submittedAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    findManyPushMock.mockResolvedValue([seededHint]);

    const result = await batchCreateChannelPushes(actor(), [
      { studentName: '张三', studentPhone: '13800138000' },
      { studentName: '张三', studentPhone: '13800138000' },
      { studentName: '张三', studentPhone: '13800138000' },
    ] as any);

    expect(result.createdCount).toBe(3);
    expect(result.duplicateHints).toHaveLength(1);
    expect(result.duplicateHints[0]?.id).toBe(100);

    // Reset for next test
    findManyPushMock.mockResolvedValue([]);
  });

  it('mixed dedup: keeps unique duplicateHints per existing record', async () => {
    const hintA = {
      id: 100,
      studentName: '张三',
      studentPhone: '13800138000',
      status: 'PENDING' as const,
      submittedAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    const hintB = {
      id: 200,
      studentName: '李四',
      studentPhone: '13800138001',
      status: 'PENDING' as const,
      submittedAt: new Date('2026-05-02T00:00:00.000Z'),
    };
    findManyPushMock
      .mockResolvedValueOnce([hintA])
      .mockResolvedValueOnce([hintB])
      .mockResolvedValueOnce([hintA]);

    const result = await batchCreateChannelPushes(actor(), [
      { studentName: '张三', studentPhone: '13800138000' },
      { studentName: '李四', studentPhone: '13800138001' },
      { studentName: '张三', studentPhone: '13800138000' },
    ] as any);

    expect(result.createdCount).toBe(3);
    expect(result.duplicateHints).toHaveLength(2);
    const ids = result.duplicateHints.map((h: any) => h.id).sort();
    expect(ids).toEqual([100, 200]);

    findManyPushMock.mockResolvedValue([]);
  });

  it('does NOT call prisma.channelPush.createMany (D-15: per-row creation only)', async () => {
    const before = (createPushMock as any).mock.calls.length;
    await batchCreateChannelPushes(actor(), [
      { studentName: '甲', studentPhone: '13800138001' },
      { studentName: '乙', studentPhone: '13800138002' },
    ] as any);
    // Each row goes through createChannelPush → tx.channelPush.create (not createMany)
    expect((createPushMock as any).mock.calls.length).toBeGreaterThan(before);
  });
});
