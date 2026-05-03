import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { prisma } from '../../../plugins/prisma';
import {
  EMPLOYEE_PERMISSION_CODES,
  PERMISSIONS,
  REIMBURSEMENT_PERMISSION_CODES,
  seedDatabase,
} from '../../../../prisma/seed';

const reimbursementPermissionCodes = [
  'reimbursement:create',
  'reimbursement:own',
  'reimbursement:list',
  'reimbursement:department-review',
  'reimbursement:finance-review',
  'reimbursement:attachment',
  'reimbursement:export',
];

const originalSeedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

async function rolePermissionCodes(roleCode: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: roleCode },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return role.permissions.map((item) => item.permission.code).sort();
}

describe('reimbursement permission seed data', () => {
  beforeEach(async () => {
    process.env.SEED_ADMIN_PASSWORD = 'phase24-admin-password';
  });

  afterAll(async () => {
    if (originalSeedAdminPassword === undefined) {
      delete process.env.SEED_ADMIN_PASSWORD;
    } else {
      process.env.SEED_ADMIN_PASSWORD = originalSeedAdminPassword;
    }
    await prisma.$disconnect();
  });

  it('exports the exact Phase 24 reimbursement permission codes', () => {
    expect(REIMBURSEMENT_PERMISSION_CODES).toEqual(reimbursementPermissionCodes);
  });

  it('defines each reimbursement permission once under the reimbursement module', () => {
    const reimbursementPermissions = PERMISSIONS.filter((permission) => permission.code.startsWith('reimbursement:'));

    expect(reimbursementPermissions.map((permission) => permission.code)).toEqual(reimbursementPermissionCodes);
    expect(new Set(reimbursementPermissions.map((permission) => permission.code)).size).toBe(
      reimbursementPermissionCodes.length,
    );
    for (const permission of reimbursementPermissions) {
      expect(permission.module).toBe('reimbursement');
    }
  });

  it('ADMIN receives all reimbursement permissions through the all-permissions seed flow', async () => {
    await seedDatabase();

    const adminCodes = await rolePermissionCodes('ADMIN');

    expect(adminCodes).toEqual(expect.arrayContaining(REIMBURSEMENT_PERMISSION_CODES));
  });

  it('EMPLOYEE receives only create, own, and attachment reimbursement permissions by default', async () => {
    expect(EMPLOYEE_PERMISSION_CODES).toEqual(
      expect.arrayContaining(['reimbursement:create', 'reimbursement:own', 'reimbursement:attachment']),
    );
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('reimbursement:list');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('reimbursement:department-review');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('reimbursement:finance-review');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('reimbursement:export');

    await seedDatabase();

    const employeeCodes = await rolePermissionCodes('EMPLOYEE');

    expect(employeeCodes).toContain('reimbursement:create');
    expect(employeeCodes).toContain('reimbursement:own');
    expect(employeeCodes).toContain('reimbursement:attachment');
    expect(employeeCodes).not.toContain('reimbursement:list');
    expect(employeeCodes).not.toContain('reimbursement:department-review');
    expect(employeeCodes).not.toContain('reimbursement:finance-review');
    expect(employeeCodes).not.toContain('reimbursement:export');
  });
});
