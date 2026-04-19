import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

// Dashboard 统计接口 — 仅需登录，不需要特定权限码
export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard())
  .get('/stats', async () => {
    // 并行查询 3 个 count，满足 NFR-1 p95 < 500ms
    const [userCount, departmentCount, roleCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.role.count(),
    ]);
    return { userCount, departmentCount, roleCount };
  });
