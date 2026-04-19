import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard())
  .get('/stats', async () => {
    const [userCount, departmentCount, roleCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.role.count(),
    ]);
    return { userCount, departmentCount, roleCount };
  });
