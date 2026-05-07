import { describe, expect, it } from 'bun:test';

const fullReviewRouteSignatures = [
  'GET /review/channel-push/pending',
  'GET /review/channel-push/handled',
  'GET /review/channel-push/:id',
  'PATCH /review/channel-push/:id/internal-fields',
  'POST /review/channel-push/:id/approve',
  'POST /review/channel-push/:id/reject',
  'GET /review/channel-push/:id/attachments/:attachmentId/preview',
  'GET /review/channel-push/:id/attachments/:attachmentId/download',
];

async function routeSource() {
  return Bun.file(new URL('../channel-push-review.route.ts', import.meta.url)).text();
}

function sourceIndex(source: string, needle: string) {
  const index = source.indexOf(needle);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('channel-push review route contract', () => {
  it('exports the reviewer module under /review/channel-push', async () => {
    const source = await routeSource();
    expect(source).toContain("new Elysia({ prefix: '/review/channel-push' })");
    expect(source).toContain('channelPushReviewModule');
  });

  it('declares reviewer route signatures in safe order', async () => {
    const source = await routeSource();

    expect(fullReviewRouteSignatures).toEqual(
      expect.arrayContaining([
        'GET /review/channel-push/pending',
        'GET /review/channel-push/handled',
        'GET /review/channel-push/:id',
        'PATCH /review/channel-push/:id/internal-fields',
        'POST /review/channel-push/:id/approve',
        'POST /review/channel-push/:id/reject',
        'GET /review/channel-push/:id/attachments/:attachmentId/preview',
        'GET /review/channel-push/:id/attachments/:attachmentId/download',
      ]),
    );

    expect(sourceIndex(source, ".get(\n      '/pending'")).toBeLessThan(
      sourceIndex(source, ".get(\n      '/handled'"),
    );
    expect(sourceIndex(source, ".get(\n      '/handled'")).toBeLessThan(
      sourceIndex(source, ".get(\n      '/:id'"),
    );
    expect(source).toContain(".patch(\n      '/:id/internal-fields'");
    expect(source).toContain(".post(\n      '/:id/approve'");
    expect(source).toContain(".post(\n      '/:id/reject'");
    expect(source).toContain("attachments/:attachmentId/preview'");
    expect(source).toContain("attachments/:attachmentId/download'");
  });

  it('exposes controlled review list filters and minimal mutation bodies', async () => {
    const source = await routeSource();

    expect(source).toContain('channelPushReviewListQuery');
    expect(source).toContain('channelPartnerKeyword');
    expect(source).toContain("t.Literal('PENDING')");
    expect(source).toContain("t.Literal('APPROVED')");
    expect(source).toContain("t.Literal('REJECTED')");
    expect(source).toContain('internalScheduledReceiverId');
    expect(source).toContain('internalScheduledDate');
    expect(source).toContain('internalNote');
    expect(source).toContain('channelPushReviewApproveBody');
    expect(source).toContain('channelPushReviewRejectBody');
    expect(source).toContain('additionalProperties: false');
  });

  it('pins guards, service wiring, route order, and attachment access', async () => {
    const source = await routeSource();

    expect(source).toContain("authGuard('channelPush:review')");
    expect(source).toContain('authGuard()');
    expect(source).toContain('channelPush:viewScope');
    expect(source).toMatch(/authGuard\(\)\)\.get\(\s*['"]\/pending['"]/);
    expect(source).toMatch(/authGuard\(\)\)\.get\(\s*['"]\/handled['"]/);
    expect(source).toMatch(/authGuard\(\)\)\.get\(\s*['"]\/:id['"]/);
    expect(source).toMatch(/authGuard\('channelPush:review'\)\)\.patch/);
    expect(source).toMatch(/authGuard\('channelPush:review'\)\)\.post/);
    expect(source).toContain('pending before handled before :id');
    expect(source).toContain('listReviewPendingChannelPushes');
    expect(source).toContain('listReviewHandledChannelPushes');
    expect(source).toContain('getReviewChannelPush');
    expect(source).toContain('saveReviewInternalFields');
    expect(source).toContain('approveReviewChannelPush');
    expect(source).toContain('rejectReviewChannelPush');
    expect(source).toContain('buildChannelPushPreviewHeaders');
    expect(source).toContain('buildChannelPushDownloadHeaders');
    expect(source).toContain('resolveSafeChannelPushPath');
    expect(source).not.toContain('upload');
    expect(source).not.toContain('deleteChannelPushAttachmentRecord');
  });
});
