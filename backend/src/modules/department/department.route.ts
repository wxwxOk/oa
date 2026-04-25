import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

type DeptNode = {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  defaultApproverId: number | null;
  defaultApprover: { id: number; username: string; realName: string } | null;
  children: DeptNode[];
};

type DeptRow = {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  defaultApproverId: number | null;
  defaultApprover: { id: number; username: string; realName: string } | null;
};

function buildTree(rows: DeptRow[]): DeptNode[] {
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

async function assertActiveDefaultApprover(defaultApproverId: number | null | undefined) {
  if (defaultApproverId === undefined || defaultApproverId === null) return;
  const approver = await prisma.user.findUnique({
    where: { id: defaultApproverId },
    select: { id: true, status: true },
  });
  if (!approver || approver.status !== 'ACTIVE') {
    throw new BizError('负责人必须是启用用户', 400, 'DEPARTMENT_APPROVER_INVALID');
  }
}

// 获取某部门的所有子孙 ID（全量查询 + 内存递归，部门数 < 1000 性能可接受）
async function getDescendantIds(deptId: number): Promise<Set<number>> {
  const all = await prisma.department.findMany({
    select: { id: true, parentId: true },
  });
  const ids = new Set<number>();
  const collect = (pid: number) => {
    for (const d of all) {
      if (d.parentId === pid && !ids.has(d.id)) {
        ids.add(d.id);
        collect(d.id);
      }
    }
  };
  collect(deptId);
  return ids;
}

export const departmentModule = new Elysia({ prefix: '/departments' })
  .use(authGuard('department:list'))
  .get('/', async () =>
    prisma.department.findMany({
      include: { defaultApprover: { select: { id: true, username: true, realName: true } } },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    }),
  )
  .get('/tree', async () => {
    const rows = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
        sort: true,
        defaultApproverId: true,
        defaultApprover: { select: { id: true, username: true, realName: true } },
      },
    });
    return buildTree(rows);
  })
  .guard({}, (app) =>
    app.use(authGuard('department:update')).get('/approver-options', async () =>
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, username: true, realName: true, departmentId: true },
        orderBy: [{ realName: 'asc' }, { id: 'asc' }],
      }),
    ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('department:create'))
      .post('/', async ({ body }: any) => {
        await assertActiveDefaultApprover(body.defaultApproverId);
        return prisma.department.create({ data: body });
      }, {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          parentId: t.Optional(t.Nullable(t.Number())),
          sort: t.Optional(t.Number()),
          defaultApproverId: t.Optional(t.Nullable(t.Number())),
        }),
      }),
  )
  .guard({}, (app) =>
    app.use(authGuard('department:update')).put(
      '/:id',
      async ({ params, body }: any) => {
        const id = Number(params.id);
        if (body.parentId !== undefined && body.parentId !== null) {
          if (body.parentId === id) throw new BizError('上级部门不能是自己');
          const descendants = await getDescendantIds(id);
          if (descendants.has(body.parentId)) {
            throw new BizError('不能将部门移动到其子部门下');
          }
        }
        await assertActiveDefaultApprover(body.defaultApproverId);
        return prisma.department.update({ where: { id }, data: body });
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String()),
          parentId: t.Optional(t.Nullable(t.Number())),
          sort: t.Optional(t.Number()),
          defaultApproverId: t.Optional(t.Nullable(t.Number())),
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
