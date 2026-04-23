// 数据库种子 - 内置 admin/admin123 + 全部权限
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 权限定义：按模块分组
const PERMISSIONS = [
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
  { code: 'form:stats:view', name: '查看表单统计', module: 'form' },
  { code: 'form:link-stats:view', name: '查看分享链接统计', module: 'form' },
];

async function main() {
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

  // 4. EMPLOYEE 角色（仅查看）
  const employeeRole = await prisma.role.upsert({
    where: { code: 'EMPLOYEE' },
    update: { name: '普通员工' },
    create: { code: 'EMPLOYEE', name: '普通员工', description: '仅可查看' },
  });
  const listPerms = allPerms.filter((p) => p.code.endsWith(':list'));
  await prisma.rolePermission.deleteMany({ where: { roleId: employeeRole.id } });
  await prisma.rolePermission.createMany({
    data: listPerms.map((p) => ({ roleId: employeeRole.id, permissionId: p.id })),
  });

  // 5. admin 用户
  const hash = bcrypt.hashSync('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
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

  console.log('✅ seed 完成: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
