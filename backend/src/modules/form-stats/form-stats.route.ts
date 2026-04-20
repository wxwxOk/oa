import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

export const formStatsModule = new Elysia({ prefix: '/form-stats' })
  .use(authGuard('form:stats:view'))
  // 员工统计聚合端点
  .get('/', async ({ query }: any) => {
    // 构建日期过滤条件
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : undefined;
    const dateFilter = dateFrom || dateTo
      ? { createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {};

    // 分享次数聚合：按 creatorId 分组
    const shareGroups = await prisma.shareLink.groupBy({
      by: ['creatorId'],
      _count: { id: true },
      where: dateFilter,
    });

    // 收集数量聚合：按 shareLinkId 分组
    const submissionGroups = await prisma.submission.groupBy({
      by: ['shareLinkId'],
      _count: { id: true },
      where: dateFilter,
    });

    // shareLinkId -> creatorId 映射
    const linkIds = submissionGroups.map((g) => g.shareLinkId);
    const links = linkIds.length > 0
      ? await prisma.shareLink.findMany({
          where: { id: { in: linkIds } },
          select: { id: true, creatorId: true },
        })
      : [];
    const linkCreatorMap = new Map(links.map((l) => [l.id, l.creatorId]));

    // 按 creatorId 汇总
    const statsMap = new Map<number, { shareCount: number; submissionCount: number }>();

    for (const sg of shareGroups) {
      statsMap.set(sg.creatorId, { shareCount: sg._count.id, submissionCount: 0 });
    }

    for (const sub of submissionGroups) {
      const creatorId = linkCreatorMap.get(sub.shareLinkId);
      if (creatorId === undefined) continue;
      const existing = statsMap.get(creatorId);
      if (existing) {
        existing.submissionCount += sub._count.id;
      } else {
        statsMap.set(creatorId, { shareCount: 0, submissionCount: sub._count.id });
      }
    }

    // 查询用户名
    const userIds = Array.from(statsMap.keys());
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, realName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.realName]));

    // 组装返回结果，按提交数量降序排列并限制条数
    const limit = Math.min(Number(query.limit) || 100, 500);
    return Array.from(statsMap.entries())
      .map(([userId, stats]) => ({
        userId,
        realName: userMap.get(userId) ?? '',
        shareCount: stats.shareCount,
        submissionCount: stats.submissionCount,
      }))
      .sort((a, b) => b.submissionCount - a.submissionCount)
      .slice(0, limit);
  });
