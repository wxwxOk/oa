import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';

export const submissionModule = new Elysia({ prefix: '/templates/:templateId/submissions' })
  .use(authGuard('form:submission:list'))
  // 列表端点
  .get('/', async ({ params, query }: any) => {
    const templateId = Number(params.templateId);
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 20;
    const where: any = { templateId };

    if (query.submitterName) {
      where.submitterName = { contains: query.submitterName };
    }
    if (query.submitterPhone) {
      where.submitterPhone = { contains: query.submitterPhone };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }
    if (query.sharerId) {
      where.shareLink = { creatorId: Number(query.sharerId) };
    }

    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          shareLink: {
            include: { creator: { select: { id: true, realName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.submission.count({ where }),
    ]);

    return { rows, total, page, size };
  })
  // 分享人列表端点（供前端筛选下拉框使用）
  .get('/sharers', async ({ params }: any) => {
    const templateId = Number(params.templateId);
    const links = await prisma.shareLink.findMany({
      where: { templateId },
      select: { creator: { select: { id: true, realName: true } } },
      distinct: ['creatorId'],
    });
    return links.map((l) => l.creator);
  })
  // 详情端点
  .get('/:id', async ({ params }: any) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(params.id) },
      include: {
        shareLink: {
          include: { creator: { select: { id: true, realName: true } } },
        },
        template: {
          select: { name: true, schema: true, schemaVersion: true },
        },
      },
    });
    if (!submission) throw notFound('提交记录不存在');
    return submission;
  });
