import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
  .get('/', async ({ query }: any) => {
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 10;
    const where: any = {};
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      prisma.formTemplate.findMany({
        where,
        include: { creator: { select: { id: true, realName: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.formTemplate.count({ where }),
    ]);
    return { rows, total, page, size };
  })
  .get('/:id', async ({ params }: any) => {
    const tpl = await prisma.formTemplate.findUnique({
      where: { id: Number(params.id) },
      include: { creator: { select: { id: true, realName: true } } },
    });
    if (!tpl) throw notFound('模板不存在');
    return tpl;
  })
  // Create
  .guard({}, (app) =>
    app.use(authGuard('form:template:create')).post(
      '/',
      async ({ body, currentUser }: any) =>
        prisma.formTemplate.create({
          data: { name: body.name, description: body.description, creatorId: currentUser.id },
        }),
      {
        body: t.Object({
          name: t.String({ minLength: 1, maxLength: 50 }),
          description: t.Optional(t.String()),
        }),
      },
    ),
  )
  // Update: if PUBLISHED and schema changed, bump schemaVersion
  .guard({}, (app) =>
    app.use(authGuard('form:template:edit')).put(
      '/:id',
      async ({ params, body }: any) => {
        const id = Number(params.id);
        const tpl = await prisma.formTemplate.findUnique({ where: { id } });
        if (!tpl) throw notFound('模板不存在');
        const data: any = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.description !== undefined) data.description = body.description;
        if (body.schema !== undefined) {
          data.schema = body.schema;
          if (tpl.status === 'PUBLISHED') {
            data.schemaVersion = tpl.schemaVersion + 1;
          }
        }
        return prisma.formTemplate.update({ where: { id }, data });
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
          description: t.Optional(t.String()),
          schema: t.Optional(
            t.Array(
              t.Object({
                id: t.String(),
                type: t.String(),
                label: t.String(),
                required: t.Boolean(),
                placeholder: t.Optional(t.String()),
                options: t.Optional(t.Array(t.String())),
                sort: t.Number(),
              }),
            ),
          ),
        }),
      },
    ),
  )
  // Delete (DRAFT only)
  .guard({}, (app) =>
    app.use(authGuard('form:template:delete')).delete('/:id', async ({ params }: any) => {
      const id = Number(params.id);
      const tpl = await prisma.formTemplate.findUnique({ where: { id } });
      if (!tpl) throw notFound('模板不存在');
      if (tpl.status !== 'DRAFT') throw new BizError('仅可删除草稿状态的模板');
      await prisma.formTemplate.delete({ where: { id } });
      return { ok: true };
    }),
  )
  // Status transition: DRAFT->PUBLISHED, PUBLISHED->OFFLINE, OFFLINE->PUBLISHED
  .guard({}, (app) =>
    app.use(authGuard('form:template:publish')).patch(
      '/:id/status',
      async ({ params, body }: any) => {
        const id = Number(params.id);
        const tpl = await prisma.formTemplate.findUnique({ where: { id } });
        if (!tpl) throw notFound('模板不存在');
        const transitions: Record<string, string> = {
          DRAFT: 'PUBLISHED',
          PUBLISHED: 'OFFLINE',
          OFFLINE: 'PUBLISHED',
        };
        const target = body.action === 'publish' ? 'PUBLISHED' : 'OFFLINE';
        if (transitions[tpl.status] !== target) {
          throw new BizError(`当前状态 ${tpl.status} 不可转为 ${target}`);
        }
        return prisma.formTemplate.update({
          where: { id },
          data: { status: target as any },
        });
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          action: t.Union([t.Literal('publish'), t.Literal('offline')]),
        }),
      },
    ),
  );
