import { describe, expect, it } from 'bun:test';

import {
  channelPartnerAdminModule,
  channelPartnerCreateBody,
  channelPartnerListQuery,
  channelPartnerPatchBody,
} from '../channel-partner-admin.route';

const createWritableFields = ['username', 'password', 'realName', 'phone', 'primaryRecipientId'];
const patchWritableFields = ['realName', 'phone', 'primaryRecipientId'];
// Trusted fields that must never appear on partner-create/patch bodies.
const trustedFields = [
  'id',
  'roleIds',
  'roles',
  'status',
  'departmentId',
  'createdAt',
  'updatedAt',
  'channelPartnerProfile',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function routeSignatures() {
  return ((channelPartnerAdminModule as any).routes ?? [])
    .map((route: { method: string; path: string }) => {
      const path = route.path.replace(/^\/admin\/channel-partners/, '') || '/';
      return `${route.method} ${path}`;
    })
    .filter((signature: string) => !signature.startsWith('HEAD '));
}

describe('channel-partner admin route contract', () => {
  it('exports the channelPartnerAdminModule under /admin/channel-partners', () => {
    expect(channelPartnerAdminModule.config.prefix).toBe('/admin/channel-partners');
  });

  it('declares the partner lifecycle route signatures', () => {
    expect(routeSignatures()).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /',
        'GET /:id',
        'PATCH /:id',
        'POST /:id/disable',
        'POST /:id/enable',
      ]),
    );
  });

  it('hardens create body — exactly 5 writable fields, additionalProperties=false', () => {
    expect(schemaPropertyNames(channelPartnerCreateBody)).toEqual(createWritableFields);
    expect((channelPartnerCreateBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);

    for (const field of trustedFields) {
      expect(schemaPropertyNames(channelPartnerCreateBody)).not.toContain(field);
    }
  });

  it('hardens patch body — only realName/phone/primaryRecipientId, no status', () => {
    expect(schemaPropertyNames(channelPartnerPatchBody)).toEqual(patchWritableFields);
    expect((channelPartnerPatchBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    // Status changes go through /disable and /enable, never PATCH.
    expect(schemaPropertyNames(channelPartnerPatchBody)).not.toContain('status');
    expect(schemaPropertyNames(channelPartnerPatchBody)).not.toContain('username');
    expect(schemaPropertyNames(channelPartnerPatchBody)).not.toContain('password');
  });

  it('exposes controlled list query filters', () => {
    expect(schemaPropertyNames(channelPartnerListQuery)).toEqual(
      expect.arrayContaining(['page', 'size', 'status', 'keyword']),
    );
  });

  it('pins authGuard scopes (user:* reused, no new admin perm) and CHANNEL_PARTNER role binding', async () => {
    const routeSource = await Bun.file(new URL('../channel-partner-admin.route.ts', import.meta.url)).text();

    // PERM-03: authGuards reuse the existing user:* scope.
    expect(routeSource).toContain("authGuard('user:create')");
    expect(routeSource).toContain("authGuard('user:list')");
    expect(routeSource).toContain("authGuard('user:read')");
    expect(routeSource).toContain("authGuard('user:update')");

    // PARTNER-01: role + profile binding visible in route OR delegated service source.
    const serviceSource = await Bun.file(
      new URL('../channel-partner-admin.service.ts', import.meta.url),
    ).text();
    const combined = routeSource + '\n' + serviceSource;

    expect(combined).toContain("'CHANNEL_PARTNER'");
    expect(combined).toContain('ChannelPartnerProfile');
    expect(combined).toContain('primaryRecipientId');
  });

  it('pins assertRecipientCanReceivePushes (DISABLED + partner-role rejection)', async () => {
    const serviceSource = await Bun.file(
      new URL('../channel-partner-admin.service.ts', import.meta.url),
    ).text();

    expect(serviceSource).toContain('assertRecipientCanReceivePushes');
    expect(serviceSource).toMatch(/status === 'DISABLED'|status\s*===\s*['"]DISABLED['"]/);
    // Recipient must not itself be a CHANNEL_PARTNER role holder.
    expect(serviceSource).toMatch(/CHANNEL_PARTNER/);
  });

  it('pins disable/enable status toggle and PARTNER-03 history-preserved invariant', async () => {
    const serviceSource = await Bun.file(
      new URL('../channel-partner-admin.service.ts', import.meta.url),
    ).text();

    expect(serviceSource).toMatch(/status:\s*['"]DISABLED['"]/);
    expect(serviceSource).toMatch(/status:\s*['"]ACTIVE['"]/);

    // PARTNER-03 negatives: disabling a partner MUST NOT delete history.
    expect(serviceSource).not.toMatch(/channelPush\.deleteMany/);
    expect(serviceSource).not.toMatch(/deleteMany.*channelPush/);
    expect(serviceSource).not.toMatch(/channelPushAttachment\.deleteMany/);
    expect(serviceSource).not.toMatch(/channelPushReviewAction\.deleteMany/);
    expect(serviceSource).not.toMatch(/channelPartnerProfile\.delete\b/);
  });
});
