import type { ChannelPushReviewActionType, ChannelPushStatus } from '@prisma/client';

import {
  CHANNEL_PARTNER_PERMISSION_CODES,
  CHANNEL_PUSH_PERMISSION_CODES,
} from '../../../prisma/seed';

export const CHANNEL_PUSH_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const satisfies ReadonlyArray<ChannelPushStatus>;

export const CHANNEL_PUSH_REVIEW_ACTION_VALUES = [
  'SUBMIT',
  'EDIT',
  'CANCEL',
  'APPROVE',
  'REJECT',
] as const satisfies ReadonlyArray<ChannelPushReviewActionType>;

/**
 * Statuses where a channel partner is allowed to mutate (edit / cancel /
 * delete attachments) their own push. Anything outside this set is read-only
 * for the partner.
 */
export const CHANNEL_PUSH_OWNER_MUTABLE_STATUSES = [
  'PENDING',
] as const satisfies ReadonlyArray<ChannelPushStatus>;

export { CHANNEL_PARTNER_PERMISSION_CODES, CHANNEL_PUSH_PERMISSION_CODES };

export type DuplicateHint = {
  id: number;
  studentName: string;
  studentPhone: string;
  status: ChannelPushStatus;
  submittedAt: Date;
};
