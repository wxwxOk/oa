import { describe, expect, it } from 'vitest';

import {
  CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS,
  CHANNEL_PUSH_REVIEW_VIEW_MODES,
  CHANNEL_PUSH_STATUSES,
  channelPushReviewViewLabel,
  channelPushStatusColor,
  channelPushStatusLabel,
  createEmptyChannelPushReviewFilters,
} from '../channelPush';

describe('channelPush type helpers', () => {
  it('pins channel push statuses and labels', () => {
    expect(CHANNEL_PUSH_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
    expect(channelPushStatusLabel('PENDING')).toBe('待审核');
    expect(channelPushStatusColor('APPROVED')).toBe('positive');
  });

  it('pins review view modes and labels', () => {
    expect(CHANNEL_PUSH_REVIEW_VIEW_MODES).toEqual(['pending', 'handled']);
    expect(channelPushReviewViewLabel('pending')).toBe('待我审核');
    expect(channelPushReviewViewLabel('handled')).toBe('已审核');
  });

  it('pins review list filters separately from partner filters', () => {
    expect(CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS).toEqual([
      'channelPartnerKeyword',
      'status',
      'dateFrom',
      'dateTo',
    ]);
    expect(createEmptyChannelPushReviewFilters()).toEqual({
      channelPartnerKeyword: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  });
});
