import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../plugins/prisma';
import {
  APPROVAL_PERMISSION_CODES,
  EMPLOYEE_PERMISSION_CODES,
  seedDatabase,
} from '../../../../prisma/seed';

const phase19ApprovalCodes = [
  'approval:process:list',
  'approval:process:create',
  'approval:process:update',
  'approval:process:delete',
  'approval:template:bind',
  'approval:application:create',
  'approval:application:own',
  'approval:application:department',
  'approval:application:all',
  'approval:task:list',
  'approval:task:handle',
  'approval:export',
  'approval:archive:edit',
  'approval:archive:mark',
  'approval:archive:stats',
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

describe('approval permission seed data', () => {
  beforeEach(async () => {
    process.env.SEED_ADMIN_PASSWORD = 'phase19-admin-password';
    await prisma.approvalTimelineEvent.deleteMany();
    await prisma.approvalAction.deleteMany();
    await prisma.approvalTask.deleteMany();
    await prisma.approvalApplication.deleteMany();
    await prisma.approvalProcessNode.deleteMany();
    await prisma.approvalProcess.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.shareLink.deleteMany();
    await prisma.formTemplate.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.role.deleteMany();
  });

  afterAll(async () => {
    if (originalSeedAdminPassword === undefined) {
      delete process.env.SEED_ADMIN_PASSWORD;
    } else {
      process.env.SEED_ADMIN_PASSWORD = originalSeedAdminPassword;
    }
    await prisma.$disconnect();
  });

  it('requires an explicit admin password for seeding', async () => {
    delete process.env.SEED_ADMIN_PASSWORD;

    await expect(seedDatabase()).rejects.toThrow('SEED_ADMIN_PASSWORD');
  });

  it('seeded permission list includes all Phase 19 approval and archive operation codes', async () => {
    expect(APPROVAL_PERMISSION_CODES).toEqual(phase19ApprovalCodes);
    expect(APPROVAL_PERMISSION_CODES).toContain('approval:export');

    await seedDatabase();

    const permissions = await prisma.permission.findMany({
      where: { code: { in: phase19ApprovalCodes } },
      orderBy: { code: 'asc' },
    });

    expect(permissions.map((permission) => permission.code).sort()).toEqual([...phase19ApprovalCodes].sort());
  });

  it('ADMIN receives all approval permissions', async () => {
    await seedDatabase();

    const adminCodes = await rolePermissionCodes('ADMIN');

    expect(adminCodes).toEqual(expect.arrayContaining(APPROVAL_PERMISSION_CODES));
  });

  it('updates an existing admin password from SEED_ADMIN_PASSWORD', async () => {
    process.env.SEED_ADMIN_PASSWORD = 'phase19-first-admin-password';
    await seedDatabase();

    process.env.SEED_ADMIN_PASSWORD = 'phase19-rotated-admin-password';
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

    expect(bcrypt.compareSync('phase19-rotated-admin-password', admin.password)).toBe(true);
    expect(bcrypt.compareSync('phase19-first-admin-password', admin.password)).toBe(false);
  });

  it('EMPLOYEE receives approval application create and own permissions but not archive operations', async () => {
    expect(EMPLOYEE_PERMISSION_CODES).toEqual(
      expect.arrayContaining(['approval:application:create', 'approval:application:own']),
    );
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('approval:task:handle');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('approval:export');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('approval:archive:edit');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('approval:archive:mark');
    expect(EMPLOYEE_PERMISSION_CODES).not.toContain('approval:archive:stats');

    await seedDatabase();

    const employeeCodes = await rolePermissionCodes('EMPLOYEE');

    expect(employeeCodes).toContain('approval:application:create');
    expect(employeeCodes).toContain('approval:application:own');
    expect(employeeCodes).not.toContain('approval:task:handle');
    expect(employeeCodes).not.toContain('approval:export');
    expect(employeeCodes).not.toContain('approval:archive:edit');
    expect(employeeCodes).not.toContain('approval:archive:mark');
    expect(employeeCodes).not.toContain('approval:archive:stats');
  });
});
