import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';

const userSelect = {
  id: true,
  username: true,
  realName: true,
  email: true,
  phone: true,
  avatar: true,
  status: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  roles: { select: { role: { select: { id: true, code: true, name: true } } } },
  createdAt: true,
} as const;

export const userModule = new Elysia({ prefix: '/users' })
  .use(authGuard('user:list'))
  .get(
    '/',
    async ({ query }: any) => {
      const page = Number(query.page ?? 1);
      const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
      const keyword = query.keyword as string | undefined;
      const departmentId = query.departmentId ? Number(query.departmentId) : undefined;
      const status = query.status as string | undefined;

      const where: any = {};
      if (keyword) {
        where.OR = [
          { username: { contains: keyword, mode: 'insensitive' } },
          { realName: { contains: keyword, mode: 'insensitive' } },
        ];
      }
      if (departmentId) where.departmentId = departmentId;
      if (status === 'ACTIVE' || status === 'DISABLED') where.status = status;

      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: userSelect,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { id: 'desc' },
        }),
      ]);
      return { total, items, page, pageSize };
    },
    { query: t.Object({ page: t.Optional(t.String()), pageSize: t.Optional(t.String()), keyword: t.Optional(t.String()), departmentId: t.Optional(t.String()), status: t.Optional(t.String()) }) },
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:create'))
      .post(
        '/',
        async ({ body }: any) => {
          const hash = bcrypt.hashSync(body.password ?? '123456', 10);
          const { roleIds = [], password, ...rest } = body;
          const user = await prisma.user.create({
            data: {
              ...rest,
              password: hash,
              roles: { create: roleIds.map((roleId: number) => ({ roleId })) },
            },
            select: userSelect,
          });
          return user;
        },
        {
          body: t.Object({
            username: t.String({ minLength: 2 }),
            password: t.Optional(t.String({ minLength: 4 })),
            realName: t.String({ minLength: 1 }),
            email: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            departmentId: t.Optional(t.Number()),
            roleIds: t.Optional(t.Array(t.Number())),
          }),
        },
      ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:update'))
      .put(
        '/:id',
        async ({ params, body }: any) => {
          const id = Number(params.id);
          const { roleIds, ...rest } = body;
          const exists = await prisma.user.findUnique({ where: { id } });
          if (!exists) throw notFound('用户不存在');
          if (roleIds) {
            await prisma.userRole.deleteMany({ where: { userId: id } });
            if (roleIds.length) {
              await prisma.userRole.createMany({ data: roleIds.map((roleId: number) => ({ userId: id, roleId })) });
            }
          }
          return prisma.user.update({ where: { id }, data: rest, select: userSelect });
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            realName: t.Optional(t.String()),
            email: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('DISABLED')])),
            departmentId: t.Optional(t.Nullable(t.Number())),
            roleIds: t.Optional(t.Array(t.Number())),
          }),
        },
      ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:reset-password'))
      .post('/:id/reset-password', async ({ params, body }: any) => {
        const id = Number(params.id);
        const newPwd = body.password || '123456';
        await prisma.user.update({ where: { id }, data: { password: bcrypt.hashSync(newPwd, 10) } });
        return { password: newPwd };
      }, { body: t.Object({ password: t.Optional(t.String()) }) }),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:delete'))
      .delete('/:id', async ({ params }: any) => {
        await prisma.user.delete({ where: { id: Number(params.id) } });
        return { ok: true };
      }),
  );
