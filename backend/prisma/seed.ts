// 数据库种子 - 创建 admin 用户 + 全部权限
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const VISIT_PERMISSION_CODES = [
  'visit:list',
  'visit:create',
  'visit:update',
  'visit:delete',
  'visit:import',
  'visit:stats',
];

export const REIMBURSEMENT_PERMISSION_CODES = [
  'reimbursement:create',
  'reimbursement:own',
  'reimbursement:list',
  'reimbursement:department-review',
  'reimbursement:finance-review',
  'reimbursement:attachment',
  'reimbursement:export',
];

export const CHANNEL_PUSH_PERMISSION_CODES = [
  'channelPush:create',
  'channelPush:viewOwn',
  'channelPush:cancel',
  'channelPush:review',
  'channelPush:viewScope',
];

export const CHANNEL_PARTNER_PERMISSION_CODES = [
  'channelPush:create',
  'channelPush:viewOwn',
  'channelPush:cancel',
];

export const EMPLOYEE_PERMISSION_CODES = [
  'user:list',
  'department:list',
  'role:list',
  'form:template:list',
  'form:submission:list',
  'reimbursement:create',
  'reimbursement:own',
  'reimbursement:attachment',
];

// 权限定义：按模块分组
export const PERMISSIONS = [
  // 用户模块
  { code: 'user:list', name: '用户列表', module: 'user' },
  { code: 'user:create', name: '创建用户', module: 'user' },
  { code: 'user:update', name: '编辑用户', module: 'user' },
  { code: 'user:delete', name: '删除用户', module: 'user' },
  { code: 'user:reset-password', name: '重置密码', module: 'user' },
  // 部门模块
  { code: 'department:list', name: '部门列表', module: 'department' },
  { code: 'department:create', name: '创建部门', module: 'department' },
  { code: 'department:update', name: '编辑部门', module: 'department' },
  { code: 'department:delete', name: '删除部门', module: 'department' },
  // 角色模块
  { code: 'role:list', name: '角色列表', module: 'role' },
  { code: 'role:create', name: '创建角色', module: 'role' },
  { code: 'role:update', name: '编辑角色', module: 'role' },
  { code: 'role:delete', name: '删除角色', module: 'role' },
  { code: 'role:assign-permission', name: '分配权限', module: 'role' },
  // 表单模板模块
  { code: 'form:template:list', name: '模板列表', module: 'form' },
  { code: 'form:template:create', name: '创建模板', module: 'form' },
  { code: 'form:template:edit', name: '编辑模板', module: 'form' },
  { code: 'form:template:delete', name: '删除模板', module: 'form' },
  { code: 'form:template:publish', name: '发布/下线模板', module: 'form' },
  { code: 'form:template:share', name: '分享模板', module: 'form' },
  { code: 'form:submission:list', name: '查看提交数据', module: 'form' },
  { code: 'form:archive:mark', name: '归档标签/备注', module: 'form' },
  { code: 'form:archive:edit', name: '归档受控编辑', module: 'form' },
  { code: 'form:archive:stats', name: '归档统计', module: 'form' },
  { code: 'form:archive:export', name: '导出归档数据', module: 'form' },
  { code: 'form:stats:view', name: '查看表单统计', module: 'form' },
  // 到访模块
  { code: 'visit:list', name: '到访列表', module: 'visit' },
  { code: 'visit:create', name: '创建到访', module: 'visit' },
  { code: 'visit:update', name: '编辑到访', module: 'visit' },
  { code: 'visit:delete', name: '删除到访', module: 'visit' },
  { code: 'visit:import', name: '导入到访', module: 'visit' },
  { code: 'visit:stats', name: '到访统计', module: 'visit' },
  // 报销模块
  { code: 'reimbursement:create', name: '创建报销申请', module: 'reimbursement' },
  { code: 'reimbursement:own', name: '查看我的报销', module: 'reimbursement' },
  { code: 'reimbursement:list', name: '查看全部报销', module: 'reimbursement' },
  { code: 'reimbursement:department-review', name: '部门审核报销', module: 'reimbursement' },
  { code: 'reimbursement:finance-review', name: '财务复核报销', module: 'reimbursement' },
  { code: 'reimbursement:attachment', name: '访问报销附件', module: 'reimbursement' },
  { code: 'reimbursement:export', name: '导出报销数据', module: 'reimbursement' },
  // 渠道商推送模块（v1.6）
  { code: 'channelPush:create', name: '渠道商提交推送', module: 'channelPush' },
  { code: 'channelPush:viewOwn', name: '渠道商查看自己推送', module: 'channelPush' },
  { code: 'channelPush:cancel', name: '渠道商撤回推送', module: 'channelPush' },
  { code: 'channelPush:review', name: '主接收人审核推送', module: 'channelPush' },
  { code: 'channelPush:viewScope', name: '按部门/管理员只读查看推送', module: 'channelPush' },
];

function resolveAdminPassword(): string {
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD is required for seeding the admin user');
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  }
  return password;
}

export async function seedDatabase(): Promise<void> {
  console.log('🌱 开始 seed...');

  // 1. 权限
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }
  const allPerms = await prisma.permission.findMany();

  // 2. 顶级部门
  const root = await prisma.department.upsert({
    where: { id: 1 },
    update: { name: '总公司' },
    create: { name: '总公司', sort: 0 },
  });

  // 3. ADMIN 角色（拥有全部权限）
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: { name: '超级管理员' },
    create: { code: 'ADMIN', name: '超级管理员', description: '拥有所有权限' },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  // 4. EMPLOYEE 角色（查看基础数据 + 报销）
  const employeeRole = await prisma.role.upsert({
    where: { code: 'EMPLOYEE' },
    update: { name: '普通员工' },
    create: { code: 'EMPLOYEE', name: '普通员工', description: '仅可查看' },
  });
  const employeePerms = allPerms.filter((p) => EMPLOYEE_PERMISSION_CODES.includes(p.code));
  await prisma.rolePermission.deleteMany({ where: { roleId: employeeRole.id } });
  await prisma.rolePermission.createMany({
    data: employeePerms.map((p) => ({ roleId: employeeRole.id, permissionId: p.id })),
  });

  // 4.5 CHANNEL_PARTNER 角色（v1.6 外部渠道商，仅可推送 / 查看自己 / 撤回）
  const channelPartnerRole = await prisma.role.upsert({
    where: { code: 'CHANNEL_PARTNER' },
    update: { name: '渠道商', description: '外部渠道商账号，仅可推送学员信息' },
    create: { code: 'CHANNEL_PARTNER', name: '渠道商', description: '外部渠道商账号，仅可推送学员信息' },
  });
  const channelPartnerPerms = allPerms.filter((p) => CHANNEL_PARTNER_PERMISSION_CODES.includes(p.code));
  await prisma.rolePermission.deleteMany({ where: { roleId: channelPartnerRole.id } });
  await prisma.rolePermission.createMany({
    data: channelPartnerPerms.map((p) => ({ roleId: channelPartnerRole.id, permissionId: p.id })),
  });

  // 5. admin 用户
  const hash = bcrypt.hashSync(resolveAdminPassword(), 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hash,
    },
    create: {
      username: 'admin',
      password: hash,
      realName: '超级管理员',
      email: 'admin@oa.local',
      departmentId: root.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log('✅ seed 完成: admin 用户已创建或更新');
}

if (import.meta.main) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
