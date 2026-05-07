import { describe, expect, it } from 'bun:test';

import { channelPushModule, channelPushWriteBody } from '../channel-push.route';

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
    .filter((sig: string) => !sig.startsWith('HEAD '));
}

describe('channel-push batch-import route contract', () => {
  it('declares POST /batch-import in channelPushModule signatures', () => {
    expect(routeSignatures()).toEqual(
      expect.arrayContaining(['POST /batch-import']),
    );
  });

  it('exports channelPushBatchImportBody schema with rows envelope', async () => {
    const mod = await import('../channel-push.route');
    expect((mod as any).channelPushBatchImportBody).toBeTruthy();
    const body = (mod as any).channelPushBatchImportBody;
    expect(schemaPropertyNames(body)).toEqual(['rows']);
    // additionalProperties: false at envelope level
    expect((body as { additionalProperties?: boolean }).additionalProperties).toBe(false);
  });

  it('rows array inherits channelPushWriteBody shape with maxItems 500 / minItems 1', async () => {
    const mod = await import('../channel-push.route');
    const body = (mod as any).channelPushBatchImportBody;
    const rowsArr = (body as any).properties?.rows;
    expect(rowsArr).toBeTruthy();
    expect(rowsArr.minItems).toBe(1);
    expect(rowsArr.maxItems).toBe(500);
    // Items schema should match channelPushWriteBody (same property keys)
    const itemKeys = schemaPropertyNames(rowsArr.items);
    expect(itemKeys).toEqual(schemaPropertyNames(channelPushWriteBody));
    expect((rowsArr.items as { additionalProperties?: boolean }).additionalProperties).toBe(false);
  });

  it('pins authGuard, JSON-only body, batch service wiring, no createMany/skipDuplicates in route source', async () => {
    const source = await Bun.file(
      new URL('../channel-push.route.ts', import.meta.url),
    ).text();

    // POST /batch-import endpoint declared
    expect(source).toContain('/batch-import');
    expect(source).toMatch(/\.post\(\s*['"]\/batch-import['"]/);

    // PERM-03: reuses channelPush:create (no new permission code)
    expect(source).toContain("authGuard('channelPush:create')");
    // batchCreateChannelPushes service is wired in
    expect(source).toContain('batchCreateChannelPushes');
    expect(source).toContain('channelPushBatchImportBody');

    // Negative-grep: no Excel parsing / multipart for batch-import
    // (createChannelPush still has multipart for single-row attachments — that's OK,
    // we only forbid these in the BATCH context which is JSON-only.)
    // The new schema must not introduce t.Files/t.File for batch-import:
    expect(source).not.toMatch(/channelPushBatchImportBody[\s\S]*t\.Files/);
    expect(source).not.toMatch(/channelPushBatchImportBody[\s\S]*t\.File\(/);

    // Forbidden DB shortcuts (D-15)
    expect(source).not.toContain('createMany');
    expect(source).not.toContain('skipDuplicates');

    // Identity comes from JWT, never body
    expect(source).not.toMatch(/channelPartnerId:\s*body/);
  });

  it('documents per-row error codes the service may surface (CHANNEL_PUSH_PHONE_INVALID, CHANNEL_PARTNER_NOT_BOUND, additionalProperties extraField)', async () => {
    // Negative-grep contract: the service test pins these codes; this assertion
    // exists so a future refactor that renames the codes also has to update
    // the batch-import test (otherwise grep here will need to change).
    const serviceSource = await Bun.file(
      new URL('../channel-push.service.ts', import.meta.url),
    ).text();
    expect(serviceSource).toContain('CHANNEL_PUSH_PHONE_INVALID');
    expect(serviceSource).toContain('CHANNEL_PARTNER_NOT_BOUND');
    // additionalProperties: false at envelope level rejects extraField at top
    expect(
      await Bun.file(new URL('../channel-push.route.ts', import.meta.url)).text(),
    ).toContain('additionalProperties: false');
  });
});
