import { describe, expect, it } from 'bun:test';

import {
  CHANNEL_PARTNER_PERMISSION_CODES,
  CHANNEL_PUSH_PERMISSION_CODES,
  EMPLOYEE_PERMISSION_CODES,
  PERMISSIONS,
  seedDatabase,
} from '../../../../prisma/seed';

const channelPushPermissionCodes = [
  'channelPush:create',
  'channelPush:viewOwn',
  'channelPush:cancel',
  'channelPush:review',
  'channelPush:viewScope',
];

const channelPartnerDefaultGrants = [
  'channelPush:create',
  'channelPush:viewOwn',
  'channelPush:cancel',
];

describe('channel-push permission seed data', () => {
  it('exports the exact Phase 32 channel-push permission codes', () => {
    expect(CHANNEL_PUSH_PERMISSION_CODES).toEqual(channelPushPermissionCodes);
  });

  it('exports the CHANNEL_PARTNER default-grant subset (create / viewOwn / cancel only)', () => {
    expect(CHANNEL_PARTNER_PERMISSION_CODES).toEqual(channelPartnerDefaultGrants);
    for (const code of CHANNEL_PARTNER_PERMISSION_CODES) {
      expect(CHANNEL_PUSH_PERMISSION_CODES).toContain(code);
    }
    expect(CHANNEL_PARTNER_PERMISSION_CODES).not.toContain('channelPush:review');
    expect(CHANNEL_PARTNER_PERMISSION_CODES).not.toContain('channelPush:viewScope');
  });

  it('defines each channel-push permission once under the channelPush module', () => {
    const channelPushPermissions = PERMISSIONS.filter((permission) => permission.code.startsWith('channelPush:'));

    expect(channelPushPermissions.map((permission) => permission.code)).toEqual(channelPushPermissionCodes);
    expect(new Set(channelPushPermissions.map((permission) => permission.code)).size).toBe(
      channelPushPermissionCodes.length,
    );
    for (const permission of channelPushPermissions) {
      expect(permission.module).toBe('channelPush');
    }
  });

  it('ADMIN receives all channel-push permissions through the all-permissions seed flow', async () => {
    expect(typeof seedDatabase).toBe('function');

    const seedSource = await Bun.file(new URL('../../../../prisma/seed.ts', import.meta.url)).text();

    expect(seedSource).toContain('const allPerms = await prisma.permission.findMany()');
    expect(seedSource).toContain("where: { code: 'ADMIN' }");
    expect(seedSource).toContain('allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id }))');
  });

  it('EMPLOYEE receives no channel-push permissions by default', () => {
    for (const code of CHANNEL_PUSH_PERMISSION_CODES) {
      expect(EMPLOYEE_PERMISSION_CODES).not.toContain(code);
    }
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('channelPush:create');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('channelPush:viewOwn');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('channelPush:cancel');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('channelPush:review');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('channelPush:viewScope');
  });

  it("seeds a CHANNEL_PARTNER role granted only CHANNEL_PARTNER_PERMISSION_CODES", async () => {
    const seedSource = await Bun.file(new URL('../../../../prisma/seed.ts', import.meta.url)).text();

    expect(seedSource).toContain("'CHANNEL_PARTNER'");
    expect(seedSource).toContain('CHANNEL_PARTNER_PERMISSION_CODES');
    expect(seedSource).toMatch(/where:\s*\{\s*code:\s*'CHANNEL_PARTNER'\s*\}/);
    expect(seedSource).toMatch(
      /CHANNEL_PARTNER_PERMISSION_CODES\.includes\(p\.code\)/,
    );
    expect(seedSource).toMatch(/channelPartnerRole\.id/);
  });
});
