import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { unauthorized } from '../../utils/errors';

export const authModule = new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body, jwt }: any) => {
      const { username, password } = body;
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!user || user.status === 'DISABLED') throw unauthorized('用户不存在或已禁用');
      if (!bcrypt.compareSync(password, user.password)) throw unauthorized('用户名或密码错误');

      const accessToken = await jwt.sign({ sub: String(user.id), type: 'access' });
      const refreshToken = await jwt.sign({ sub: String(user.id), type: 'refresh' });

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
    async ({ body, jwt }: any) => {
      const payload = await jwt.verify(body.refreshToken);
      if (!payload || payload.type !== 'refresh') throw unauthorized('refresh token 无效');
      const accessToken = await jwt.sign({ sub: payload.sub, type: 'access' });
      return { accessToken };
    },
    { body: t.Object({ refreshToken: t.String() }) },
  )
  .use(authGuard())
  .get('/profile', ({ currentUser }: any) => currentUser);
