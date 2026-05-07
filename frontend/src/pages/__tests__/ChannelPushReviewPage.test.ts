import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve(__dirname, '../ChannelPushReviewPage.vue'), 'utf8');
const storeSource = readFileSync(resolve(__dirname, '../../stores/channelPush.ts'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../router/routes.ts'), 'utf8');
const menuSource = readFileSync(resolve(__dirname, '../../layouts/MainLayout.vue'), 'utf8');

describe('ChannelPushReviewPage contract', () => {
  it('pins title, tabs, filters, and status rendering', () => {
    for (const copy of ['待我审核', '已审核', '渠道商', '开始日期', '结束日期', '查看详情']) {
      expect(pageSource).toContain(copy);
    }
    expect(pageSource).toContain('q-tabs');
    expect(pageSource).toContain('ChannelPushStatusChip');
  });

  it('uses q-table on desktop and q-card rows on mobile', () => {
    expect(pageSource).toContain('v-if="isDesktop"');
    expect(pageSource).toContain('<q-table');
    expect(pageSource).toContain('v-for="row in rows"');
    expect(pageSource).toContain('review-card');
  });

  it('keeps list actions view-only and navigates to detail', () => {
    expect(pageSource).toContain('review-row-action');
    expect(pageSource).toContain("router.push(`/review/channel-push/${row.id}`)");
    expect(pageSource).not.toContain('approveReview(');
    expect(pageSource).not.toContain('rejectReview(');
  });

  it('pins responsive filter sheet and touch-safe selectors', () => {
    for (const selector of [
      'review-mobile-filter-trigger',
      'review-filter-reset',
      'review-filter-apply',
      'review-row-action',
      'min-height: 44px',
    ]) {
      expect(pageSource).toContain(selector);
    }
  });

  it('uses review store actions and review state only', () => {
    expect(pageSource).toContain('fetchReviewPending');
    expect(pageSource).toContain('fetchReviewHandled');
    expect(pageSource).toContain('reviewPendingRows');
    expect(pageSource).toContain('reviewHandledRows');
    expect(storeSource).toContain('/review/channel-push/pending');
    expect(storeSource).toContain('/review/channel-push/handled');
  });

  it('opens review routes and menu for reviewer or viewScope users while staying read-only on the list', () => {
    const reviewPermAny = "permAny: ['channelPush:review', 'channelPush:viewScope']";
    expect(routeSource).toContain(reviewPermAny);
    expect(menuSource).toContain(reviewPermAny);
    expect(pageSource).toContain('只读查看');
    expect(pageSource).toContain('viewScope');
    expect(pageSource).toContain("auth.hasPerm('channelPush:viewScope')");
    expect(pageSource).toContain("!auth.hasPerm('channelPush:review')");
  });
});
