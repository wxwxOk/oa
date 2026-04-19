import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

export const roleModule = new Elysia({ prefix: '/roles' })
  .use(authGuard('role:list'))
  .get('/', async () =>
    prisma.role.findMany({
      include: {
        permissions: { include: { permission: { select: { id: true, code: true } } } },
        _count: { select: { users: true } },
      },
      orderBy: { id: 'asc' },
    }),
  )
  .get('/:id', async ({ params }: any) => {
    const role = await prisma.role.findUnique({
      where: { id: Number(params.id) },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw notFound('角色不存在');
    return role;
  })
  .guard({}, (app) =>
    app.use(authGuard('role:create')).post(
      '/',
      async ({ body }: any) =>
        prisma.role.create({
          data: { code: body.code, name: body.name, description: body.description },
        }),
      {
        body: t.Object({
          code: t.String({ minLength: 2 }),
          name: t.String({ minLength: 1 }),
          description: t.Optional(t.String()),
        }),
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('role:update')).put(
      '/:id',
      async ({ params, body }: any) =>
        prisma.role.update({
          where: { id: Number(params.id) },
          // 显式提取字段，避免 body 透传在 schema 扩展后把未预期字段写入 DB
          data: { name: body.name, description: body.description },
        }),
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String()),
          description: t.Optional(t.String()),
        }),
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('role:assign-permission')).put(
      '/:id/permissions',
      async ({ params, body }: any) => {
        const roleId = Number(params.id);
        // D-02: ADMIN 角色不能清空所有权限
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (role?.code === 'ADMIN' && body.permissionIds.length === 0) {
          throw new BizError('ADMIN 角色不能清空所有权限');
        }
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        if (body.permissionIds.length) {
          await prisma.rolePermission.createMany({
            data: body.permissionIds.map((permissionId: number) => ({ roleId, permissionId })),
          });
        }
        return { ok: true };
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({ permissionIds: t.Array(t.Number()) }),
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('role:delete')).delete('/:id', async ({ params }: any) => {
      const id = Number(params.id);
      const role = await prisma.role.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
      });
      if (!role) throw notFound('角色不存在');
      // D-08: ADMIN 检查优先于挂载检查
      if (role.code === 'ADMIN') throw new BizError('系统角色不可删除');
      // D-06: 挂载用户检查
      if (role._count.users > 0) {
        throw new BizError(`该角色仍有 ${role._count.users} 个用户，请先解绑`);
      }
      await prisma.role.delete({ where: { id } });
      return { ok: true };
    }),
  );

export const permissionModule = new Elysia({ prefix: '/permissions' })
  .use(authGuard('role:list'))
  .get('/', async () => prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { id: 'asc' }] }));
