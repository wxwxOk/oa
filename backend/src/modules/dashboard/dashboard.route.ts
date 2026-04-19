import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard())
  .get('/stats', async () => {
    const [userCount, deptCount, roleCount] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.department.count(),
      prisma.role.count(),
    ]);
    return { userCount, deptCount, roleCount };
  });
