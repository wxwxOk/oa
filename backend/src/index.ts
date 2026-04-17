import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { swagger } from '@elysiajs/swagger';
import { BizError } from './utils/errors';
import { authModule } from './modules/auth/auth.route';
import { userModule } from './modules/user/user.route';
import { departmentModule } from './modules/department/department.route';
import { roleModule, permissionModule } from './modules/role/role.route';

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      exp: process.env.JWT_EXPIRES_IN ?? '2h',
    }),
  )
  .use(swagger({ path: '/swagger', documentation: { info: { title: 'OA API', version: '1.0.0' } } }))
  .onError(({ error, set }: any) => {
    if (error instanceof BizError) {
      set.status = error.status;
      return { code: error.code, message: error.message };
    }
    console.error('[ERR]', error);
    set.status = 500;
    return { code: 'INTERNAL', message: error.message ?? 'Server error' };
  })
  .get('/health', () => ({ ok: true, ts: Date.now() }))
  .group('/api/v1', (app) =>
    app
      .use(authModule)
      .use(userModule)
      .use(departmentModule)
      .use(roleModule)
      .use(permissionModule),
  )
  .listen(Number(process.env.PORT ?? 3000));

console.log(`🚀 OA backend running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📚 Swagger: http://localhost:${app.server?.port}/swagger`);
