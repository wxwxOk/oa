import { describe, expect, it, mock } from 'bun:test';

const findUniqueMock = mock(async (_args: any) => null as any);
const findFirstMock = mock(async (_args: any) => null as any);
const userCreateMock = mock(async (args: any) => ({ id: 1, ...args.data }));
const userUpdateMock = mock(async (args: any) => ({ id: args.where?.id ?? 1, ...args.data }));
const roleFindUniqueMock = mock(async (_args: any) => ({ id: 99, code: 'CHANNEL_PARTNER', name: '渠道商' }));
const userRoleCreateMock = mock(async (_args: any) => ({}));
const profileCreateMock = mock(async (_args: any) => ({}));
const profileUpdateMock = mock(async (_args: any) => ({}));
const transactionMock = mock(async (cb: any) => {
  if (typeof cb === 'function') {
    return cb({
      user: { create: userCreateMock, update: userUpdateMock },
      role: { findUnique: roleFindUniqueMock },
      userRole: { create: userRoleCreateMock },
      channelPartnerProfile: { create: profileCreateMock, update: profileUpdateMock },
    });
  }
  return Promise.all(cb);
});

const channelPushDeleteManyMock = mock(async (_args: any) => ({ count: 0 }));
const channelPartnerProfileDeleteMock = mock(async (_args: any) => ({}));

mock.module('../../../plugins/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    user: {
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      create: userCreateMock,
      update: userUpdateMock,
    },
    role: { findUnique: roleFindUniqueMock },
    userRole: { create: userRoleCreateMock, deleteMany: mock(async () => ({ count: 0 })) },
    channelPartnerProfile: {
      findUnique: mock(async () => ({ id: 1, userId: 5, primaryRecipientId: 10 })),
      create: profileCreateMock,
      update: profileUpdateMock,
      delete: channelPartnerProfileDeleteMock,
    },
    channelPush: { deleteMany: channelPushDeleteManyMock },
  },
}));

const {
  assertRecipientCanReceivePushes,
  createChannelPartner,
  disableChannelPartner,
  enableChannelPartner,
  patchChannelPartner,
  serializeChannelPartner,
} = await import('../channel-partner-admin.service');

import { BizError } from '../../../utils/errors';

function recipientCandidate(overrides: Partial<any> = {}) {
  return {
    id: 10,
    username: 'recv',
    realName: '内部接收人',
    phone: null,
    status: 'ACTIVE',
    departmentId: 2,
    department: { id: 2, name: '销售部' },
    roles: [{ role: { id: 5, code: 'EMPLOYEE', name: '员工' } }],
    ...overrides,
  };
}

function partnerRow(overrides: Partial<any> = {}) {
  return {
    id: 21,
    username: 'partner-a',
    realName: '渠道 A',
    phone: '13800000001',
    status: 'ACTIVE',
    createdAt: new Date('2026-05-05T08:00:00.000Z'),
    channelPartnerProfile: {
      primaryRecipient: {
        id: 10,
        realName: '内部接收人',
        departmentId: 2,
        department: { id: 2, name: '销售部' },
      },
    },
    ...overrides,
  };
}

describe('channel-partner admin service', () => {
  describe('assertRecipientCanReceivePushes', () => {
    it('throws CHANNEL_PARTNER_RECIPIENT_NOT_FOUND when user is missing', async () => {
      findUniqueMock.mockResolvedValueOnce(null);
      let caught: BizError | null = null;
      try {
        await assertRecipientCanReceivePushes(99);
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught).toBeInstanceOf(BizError);
      expect(caught?.code).toBe('CHANNEL_PARTNER_RECIPIENT_NOT_FOUND');
    });

    it('throws CHANNEL_PARTNER_RECIPIENT_DISABLED for DISABLED users', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate({ status: 'DISABLED' }));
      let caught: BizError | null = null;
      try {
        await assertRecipientCanReceivePushes(10);
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PARTNER_RECIPIENT_DISABLED');
      expect(caught?.status).toBe(422);
    });

    it('throws CHANNEL_PARTNER_RECIPIENT_IS_PARTNER when candidate holds CHANNEL_PARTNER role', async () => {
      findUniqueMock.mockResolvedValueOnce(
        recipientCandidate({ roles: [{ role: { id: 99, code: 'CHANNEL_PARTNER' } }] }),
      );
      let caught: BizError | null = null;
      try {
        await assertRecipientCanReceivePushes(11);
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PARTNER_RECIPIENT_IS_PARTNER');
    });

    it('returns the candidate when valid', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate());
      const result = await assertRecipientCanReceivePushes(10);
      expect(result.id).toBe(10);
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('createChannelPartner', () => {
    it('hashes password before persisting and never writes plain text', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate()); // recipient validation
      userCreateMock.mockResolvedValueOnce({ id: 21, username: 'p1', realName: 'P1', phone: null, status: 'ACTIVE', createdAt: new Date() });

      await createChannelPartner({
        username: 'p1',
        password: 'plaintext-secret',
        realName: 'P1',
        phone: null,
        primaryRecipientId: 10,
      });

      const userCreateCall = userCreateMock.mock.calls.at(-1)?.[0];
      expect(userCreateCall.data.password).not.toBe('plaintext-secret');
      expect(typeof userCreateCall.data.password).toBe('string');
      expect(userCreateCall.data.password.length).toBeGreaterThan(20);
    });

    it('binds user to CHANNEL_PARTNER role and creates ChannelPartnerProfile', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate());
      userCreateMock.mockResolvedValueOnce({ id: 22, username: 'p2', realName: 'P2', phone: null, status: 'ACTIVE', createdAt: new Date() });

      await createChannelPartner({
        username: 'p2',
        password: 'a-strong-password',
        realName: 'P2',
        primaryRecipientId: 10,
      });

      // role binding
      const roleLookup = roleFindUniqueMock.mock.calls.find((c) => c[0]?.where?.code === 'CHANNEL_PARTNER');
      expect(roleLookup).toBeTruthy();
      const userRoleCall = userRoleCreateMock.mock.calls.at(-1)?.[0];
      expect(userRoleCall.data.roleId).toBe(99);

      // profile creation
      const profileCall = profileCreateMock.mock.calls.at(-1)?.[0];
      expect(profileCall.data.primaryRecipientId).toBe(10);
    });

    it('wraps role + profile writes in a single $transaction', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate());
      const txCallsBefore = transactionMock.mock.calls.length;

      await createChannelPartner({
        username: 'p3',
        password: 'a-strong-password',
        realName: 'P3',
        primaryRecipientId: 10,
      });

      expect(transactionMock.mock.calls.length).toBeGreaterThan(txCallsBefore);
    });

    it('runs assertRecipientCanReceivePushes BEFORE any write', async () => {
      findUniqueMock.mockResolvedValueOnce(recipientCandidate({ status: 'DISABLED' }));
      const userCreateCallsBefore = userCreateMock.mock.calls.length;

      let threw = false;
      try {
        await createChannelPartner({
          username: 'p4',
          password: 'a-strong-password',
          realName: 'P4',
          primaryRecipientId: 10,
        });
      } catch {
        threw = true;
      }

      expect(threw).toBe(true);
      expect(userCreateMock.mock.calls.length).toBe(userCreateCallsBefore);
    });
  });

  describe('disableChannelPartner / enableChannelPartner', () => {
    it('toggles User.status to DISABLED on disable', async () => {
      findFirstMock.mockResolvedValueOnce(partnerRow());
      userUpdateMock.mockResolvedValueOnce({ id: 21, status: 'DISABLED' });
      await disableChannelPartner(21);
      const updateCall = userUpdateMock.mock.calls.at(-1)?.[0];
      expect(updateCall.data.status).toBe('DISABLED');
    });

    it('toggles User.status to ACTIVE on enable', async () => {
      findFirstMock.mockResolvedValueOnce(partnerRow({ status: 'DISABLED' }));
      userUpdateMock.mockResolvedValueOnce({ id: 21, status: 'ACTIVE' });
      await enableChannelPartner(21);
      const updateCall = userUpdateMock.mock.calls.at(-1)?.[0];
      expect(updateCall.data.status).toBe('ACTIVE');
    });

    it('PARTNER-03: never deletes ChannelPush rows when disabling a partner', async () => {
      findFirstMock.mockResolvedValueOnce(partnerRow());
      const deleteCallsBefore = channelPushDeleteManyMock.mock.calls.length;
      const profileDeleteCallsBefore = channelPartnerProfileDeleteMock.mock.calls.length;

      await disableChannelPartner(21);

      expect(channelPushDeleteManyMock.mock.calls.length).toBe(deleteCallsBefore);
      expect(channelPartnerProfileDeleteMock.mock.calls.length).toBe(profileDeleteCallsBefore);
    });

    it('throws when target user is not a CHANNEL_PARTNER (no profile)', async () => {
      findFirstMock.mockResolvedValueOnce(null);
      let threw = false;
      try {
        await disableChannelPartner(99);
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });

  describe('patchChannelPartner', () => {
    it('updates realName / phone via prisma.user.update', async () => {
      findFirstMock.mockResolvedValueOnce(partnerRow());
      findFirstMock.mockResolvedValueOnce(partnerRow({ realName: '渠道 A 改名' }));

      await patchChannelPartner(21, { realName: '渠道 A 改名', phone: '13900000000' });

      const userUpdate = userUpdateMock.mock.calls.find((c) => c[0]?.data?.realName === '渠道 A 改名');
      expect(userUpdate).toBeTruthy();
    });

    it('runs assertRecipientCanReceivePushes when primaryRecipientId changes', async () => {
      findFirstMock.mockResolvedValueOnce(partnerRow());
      findUniqueMock.mockResolvedValueOnce(recipientCandidate({ id: 11, status: 'ACTIVE' }));
      findFirstMock.mockResolvedValueOnce(partnerRow());

      await patchChannelPartner(21, { primaryRecipientId: 11 });

      const profileUpdate = profileUpdateMock.mock.calls.find(
        (c) => c[0]?.data?.primaryRecipientId === 11,
      );
      expect(profileUpdate).toBeTruthy();
    });

    it('throws CHANNEL_PARTNER_NOT_FOUND when partner does not exist', async () => {
      findFirstMock.mockResolvedValueOnce(null);
      let caught: BizError | null = null;
      try {
        await patchChannelPartner(999, { realName: 'X' });
      } catch (e) {
        caught = e as BizError;
      }
      expect(caught?.code).toBe('CHANNEL_PARTNER_NOT_FOUND');
    });
  });

  describe('serializeChannelPartner', () => {
    it('exposes only safe fields and never the password', () => {
      const dto = serializeChannelPartner({
        ...partnerRow(),
        password: 'should-not-leak',
      });
      expect(dto).toMatchObject({
        id: 21,
        username: 'partner-a',
        realName: '渠道 A',
        phone: '13800000001',
        status: 'ACTIVE',
      });
      expect((dto as any).password).toBeUndefined();
      expect((dto as any).roles).toBeUndefined();
      expect(dto.primaryRecipient).toMatchObject({
        id: 10,
        realName: '内部接收人',
        departmentId: 2,
        departmentName: '销售部',
      });
    });

    it('returns null primaryRecipient when no profile binding exists', () => {
      const dto = serializeChannelPartner({
        ...partnerRow({ channelPartnerProfile: null }),
      });
      expect(dto.primaryRecipient).toBeNull();
    });
  });
});
