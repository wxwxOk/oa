import { Elysia } from 'elysia';
import { prisma } from '../plugins/prisma';
import { unauthorized, forbidden } from '../utils/errors';

// 从 header 解析 JWT 并加载当前用户 + 权限码
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const token = auth.slice(7);
      // 仅接受 access token：refresh token 经由独立 refreshJwt 实例签发，
      // accessJwt.verify 会因 payload 不匹配而拒绝；双保险再校验 payload.type
      const payload = await accessJwt.verify(token);
      if (!payload || !payload.sub) throw unauthorized('令牌无效');
      if (payload.type !== 'access') throw unauthorized('请使用 access token');

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
