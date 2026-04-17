import { Elysia } from 'elysia';
import { prisma } from '../plugins/prisma';
import { unauthorized, forbidden } from '../utils/errors';

// 从 header 解析 JWT 并加载当前用户 + 权限码
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ jwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const token = auth.slice(7);
      const payload = await jwt.verify(token);
      if (!payload || !payload.sub) throw unauthorized('令牌无效');

      const userId = Number(payload.sub);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      });
      if (!user || user.status === 'DISABLED') throw unauthorized('账号不存在或已禁用');

      const permCodes = new Set<string>();
      const roleCodes: string[] = [];
      for (const ur of user.roles) {
        roleCodes.push(ur.role.code);
        for (const rp of ur.role.permissions) permCodes.add(rp.permission.code);
      }

      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }

      return {
        currentUser: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          roleCodes,
          permissions: Array.from(permCodes),
        },
      };
    });
