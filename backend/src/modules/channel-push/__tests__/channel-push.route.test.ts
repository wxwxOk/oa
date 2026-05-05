import { describe, expect, it } from 'bun:test';

import {
  channelPushListQuery,
  channelPushModule,
  channelPushWriteBody,
} from '../channel-push.route';

const writableFields = [
  'studentName',
  'studentPhone',
  'studentAge',
  'studentEducation',
  'studentGender',
  'intentStatus',
  'intentNote',
  'remark',
];

const trustedFields = [
  'id',
  'channelPartnerId',
  'channelPartnerName',
  'recipientUserId',
  'status',
  'submittedAt',
  'lastEditedAt',
  'cancelledAt',
  'internalScheduledReceiverId',
  'internalScheduledDate',
  'internalNote',
  'attachments',
  'reviewActions',
  'createdAt',
  'updatedAt',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function routeSignatures() {
  return ((channelPushModule as any).routes ?? [])
    .map((route: { method: string; path: string }) => {
      const path = route.path.replace(/^\/channel-push/, '') || '/';
      return `${route.method} ${path}`;
    })
    .filter((signature: string) => !signature.startsWith('HEAD '));
}

describe('channel-push route contract', () => {
  it('exports the channelPushModule under /channel-push', () => {
    expect(channelPushModule.config.prefix).toBe('/channel-push');
  });

  it('declares the partner-side push and attachment route signatures', () => {
    expect(routeSignatures()).toEqual(
      expect.arrayContaining([
        'GET /mine',
        'GET /:id',
        'POST /',
        'PATCH /:id',
        'POST /:id/cancel',
        'POST /:id/attachments',
        'GET /:id/attachments/:attachmentId/preview',
        'GET /:id/attachments/:attachmentId/download',
        'DELETE /:id/attachments/:attachmentId',
      ]),
    );

    expect(routeSignatures().indexOf('GET /mine')).toBeLessThan(routeSignatures().indexOf('GET /:id'));
  });

  it('exposes controlled list query filters and pagination fields', () => {
    expect(schemaPropertyNames(channelPushListQuery)).toEqual(
      expect.arrayContaining(['page', 'size', 'status', 'dateFrom', 'dateTo', 'keyword']),
    );
  });

  it('hardens write schema against trusted-field tampering', () => {
    expect(schemaPropertyNames(channelPushWriteBody)).toEqual(writableFields);
    expect((channelPushWriteBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);

    for (const field of trustedFields) {
      expect(schemaPropertyNames(channelPushWriteBody)).not.toContain(field);
    }
  });

  it('pins authGuard scopes, dedup wiring, ownership helper and date normalization in route source', async () => {
    const source = await Bun.file(new URL('../channel-push.route.ts', import.meta.url)).text();

    // PERM-03: authGuard scopes
    expect(source).toContain("authGuard('channelPush:create')");
    expect(source).toContain("authGuard('channelPush:viewOwn')");
    expect(source).toContain("authGuard('channelPush:cancel')");
    // viewScope is referenced in source (reserved for Phase 35) but NOT applied to /mine
    expect(source).toContain("channelPush:viewScope");

    // Ownership + state guard helper
    expect(source).toMatch(/assertCanMutateOwnChannelPush|assertChannelPushOwnership/);
    expect(source).toContain('currentUser.id');
    expect(source).toMatch(/status === 'PENDING'/);

    // DEDUP-01 wiring: create/edit responses include duplicateHints
    expect(source).toContain('duplicateHints');

    // Date normalization mirror visit/reimbursement
    expect(source).toContain("dateTo + 'T23:59:59.999Z'");

    // Negative: no mass-assignment of trusted fields
    expect(source).not.toMatch(/\bdata:\s*body\b/);
    expect(source).not.toMatch(/\bchannelPartnerId:\s*body\b/);
    expect(source).not.toMatch(/\brecipientUserId:\s*body\b/);
    expect(source).not.toMatch(/\bstatus:\s*body\b/);

    // REVIEW-06 negative: cancel/edit MUST NOT touch VisitRecord
    expect(source).not.toContain('prisma.visitRecord.create');
    expect(source).not.toContain("'visit:create'");
  });

  it('does not apply channelPush:viewScope guard to the partner-only /mine endpoint', async () => {
    const source = await Bun.file(new URL('../channel-push.route.ts', import.meta.url)).text();

    // viewScope is reserved for Phase 35 inbox; /mine uses viewOwn instead.
    // Heuristic: there is no immediate authGuard('channelPush:viewScope') near .get('/mine'.
    const mineHandler = source.match(/\.get\(\s*['"]\/mine['"][\s\S]*?\)/);
    expect(mineHandler?.[0]).toBeTruthy();
    expect(mineHandler![0]).toContain("authGuard('channelPush:viewOwn')");
    expect(mineHandler![0]).not.toContain("authGuard('channelPush:viewScope')");
  });
});
