import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { unauthorized } from '../../utils/errors';

export const authModule = new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body, accessJwt, refreshJwt }: any) => {
      const { username, password } = body;
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!user || user.status === 'DISABLED') throw unauthorized('用户不存在或已禁用');
      if (!bcrypt.compareSync(password, user.password)) throw unauthorized('用户名或密码错误');

      const accessToken = await accessJwt.sign({ sub: String(user.id), type: 'access' });
      const refreshToken = await refreshJwt.sign({ sub: String(user.id), type: 'refresh' });

      const permCodes = new Set<string>();
      const roleCodes: string[] = [];
      for (const ur of user.roles) {
        roleCodes.push(ur.role.code);
        for (const rp of ur.role.permissions) permCodes.add(rp.permission.code);
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          avatar: user.avatar,
          roles: roleCodes,
          permissions: Array.from(permCodes),
        },
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 2 }),
        password: t.String({ minLength: 4 }),
      }),
    },
  )
  .post(
    '/refresh',
    async ({ body, accessJwt, refreshJwt }: any) => {
      // 必须使用 refreshJwt 实例验证 refresh token：
      // access token 签名用的是 accessJwt 的 exp/secret 上下文，无法通过 refreshJwt.verify
      const payload = await refreshJwt.verify(body.refreshToken);
      if (!payload || payload.type !== 'refresh') throw unauthorized('refresh token 无效');
      const accessToken = await accessJwt.sign({ sub: payload.sub, type: 'access' });
      return { accessToken };
    },
    { body: t.Object({ refreshToken: t.String() }) },
  )
  .use(authGuard())
  .get('/profile', ({ currentUser }: any) => ({
    id: currentUser.id,
    username: currentUser.username,
    realName: currentUser.realName,
    avatar: currentUser.avatar ?? null,
    // 与 /auth/login 返回体字段对齐：前端 UserInfo 统一使用 roles 字段
    roles: currentUser.roleCodes,
    permissions: currentUser.permissions,
  }));
