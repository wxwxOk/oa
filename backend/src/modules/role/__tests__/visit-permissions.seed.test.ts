import { describe, expect, it } from 'bun:test';

import {
  EMPLOYEE_PERMISSION_CODES,
  PERMISSIONS,
  VISIT_PERMISSION_CODES,
  seedDatabase,
} from '../../../../prisma/seed';

const visitPermissionCodes = [
  'visit:list',
  'visit:create',
  'visit:update',
  'visit:delete',
  'visit:import',
  'visit:stats',
];

describe('visit permission seed data', () => {
  it('exports the exact Phase 20 visit permission codes', () => {
    expect(VISIT_PERMISSION_CODES).toEqual(visitPermissionCodes);
  });

  it('defines each visit permission once under the visit module', () => {
    const visitPermissions = PERMISSIONS.filter((permission) => permission.code.startsWith('visit:'));

    expect(visitPermissions.map((permission) => permission.code)).toEqual(visitPermissionCodes);
    expect(new Set(visitPermissions.map((permission) => permission.code)).size).toBe(visitPermissionCodes.length);
    for (const permission of visitPermissions) {
      expect(permission.module).toBe('visit');
    }
  });

  it('ADMIN receives all visit permissions through the all-permissions seed flow', async () => {
    expect(typeof seedDatabase).toBe('function');

    const seedSource = await Bun.file(new URL('../../../../prisma/seed.ts', import.meta.url)).text();

    expect(seedSource).toContain('const allPerms = await prisma.permission.findMany()');
    expect(seedSource).toContain("where: { code: 'ADMIN' }");
    expect(seedSource).toContain('allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id }))');
  });

  it('EMPLOYEE receives no visit permissions by default', () => {
    for (const code of VISIT_PERMISSION_CODES) {
      expect(EMPLOYEE_PERMISSION_CODES).not.toContain(code);
    }
  });
});
