import type { ChannelPushStatus } from '@prisma/client';

import { BizError } from '../../utils/errors';

const ALLOWED: Record<ChannelPushStatus, ReadonlyArray<ChannelPushStatus>> = {
  PENDING: ['CANCELLED', 'APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionChannelPush(
  from: ChannelPushStatus,
  to: ChannelPushStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertChannelPushTransition(
  from: ChannelPushStatus,
  to: ChannelPushStatus,
): void {
  if (!canTransitionChannelPush(from, to)) {
    throw new BizError(
      `不允许从 ${from} 切换到 ${to}`,
      422,
      'CHANNEL_PUSH_ILLEGAL_TRANSITION',
    );
  }
}

export function isPartnerMutable(status: ChannelPushStatus): boolean {
  return status === 'PENDING';
}
