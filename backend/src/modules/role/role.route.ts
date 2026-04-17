import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';

export const roleModule = new Elysia({ prefix: '/roles' })
  .use(authGuard('role:list'))
  .get('/', async () =>
    prisma.role.findMany({
      include: { permissions: { include: { permission: { select: { id: true, code: true } } } } },
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
        prisma.role.update({ where: { id: Number(params.id) }, data: body }),
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
      await prisma.role.delete({ where: { id: Number(params.id) } });
      return { ok: true };
    }),
  );

export const permissionModule = new Elysia({ prefix: '/permissions' })
  .use(authGuard('role:list'))
  .get('/', async () => prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { id: 'asc' }] }));
