import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

type DeptNode = {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  children: DeptNode[];
};

function buildTree(rows: { id: number; name: string; parentId: number | null; sort: number }[]): DeptNode[] {
  const map = new Map<number, DeptNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
  const sortRec = (arr: DeptNode[]) => {
    arr.sort((a, b) => a.sort - b.sort || a.id - b.id);
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export const departmentModule = new Elysia({ prefix: '/departments' })
  .use(authGuard('department:list'))
  .get('/', async () => prisma.department.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }))
  .get('/tree', async () => {
    const rows = await prisma.department.findMany({ select: { id: true, name: true, parentId: true, sort: true } });
    return buildTree(rows);
  })
  .guard({}, (app) =>
    app
      .use(authGuard('department:create'))
      .post('/', async ({ body }: any) => prisma.department.create({ data: body }), {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          parentId: t.Optional(t.Nullable(t.Number())),
          sort: t.Optional(t.Number()),
        }),
      }),
  )
  .guard({}, (app) =>
    app.use(authGuard('department:update')).put(
      '/:id',
      async ({ params, body }: any) => {
        const id = Number(params.id);
        if (body.parentId === id) throw new BizError('上级部门不能是自己');
        return prisma.department.update({ where: { id }, data: body });
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String()),
          parentId: t.Optional(t.Nullable(t.Number())),
          sort: t.Optional(t.Number()),
        }),
      },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('department:delete')).delete('/:id', async ({ params }: any) => {
      const id = Number(params.id);
      const dept = await prisma.department.findUnique({
        where: { id },
        include: { _count: { select: { children: true, users: true } } },
      });
      if (!dept) throw notFound('部门不存在');
      if (dept._count.children > 0) throw new BizError('存在子部门，无法删除');
      if (dept._count.users > 0) throw new BizError('部门下存在用户，无法删除');
      await prisma.department.delete({ where: { id } });
      return { ok: true };
    }),
  );
