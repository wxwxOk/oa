import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError } from '../../utils/errors';

export const shareLinkStatsModule = new Elysia({ prefix: '/share-link-stats' })
  .use(authGuard('form:link-stats:view'))
  .get('/', async ({ query }: any) => {
    const page = Math.max(1, Number(query.page) || 1);
    const size = Math.min(100, Math.max(1, Number(query.size) || 20));
    const templateName = query.templateName?.trim() || undefined;
    const sharerName = query.sharerName?.trim() || undefined;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : undefined;

    if (dateFrom && isNaN(dateFrom.getTime())) throw new BizError(400, 'INVALID_DATE', 'dateFrom 日期格式无效');
    if (dateTo && isNaN(dateTo.getTime())) throw new BizError(400, 'INVALID_DATE', 'dateTo 日期格式无效');
    if (dateFrom && dateTo && dateFrom > dateTo) throw new BizError(400, 'INVALID_DATE_RANGE', 'dateFrom 不能晚于 dateTo');

    const where: any = {};
    if (templateName) where.template = { name: { contains: templateName, mode: 'insensitive' } };
    if (sharerName) where.creator = { realName: { contains: sharerName, mode: 'insensitive' } };
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.shareLink.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          creator: { select: { id: true, realName: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.shareLink.count({ where }),
    ]);

    return {
      rows: rows.map(({ _count, ...rest }) => ({
        ...rest,
        submissionCount: _count.submissions,
      })),
      total,
      page,
      size,
    };
  });
