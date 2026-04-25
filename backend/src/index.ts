import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { swagger } from '@elysiajs/swagger';
import { BizError } from './utils/errors';
import { authModule } from './modules/auth/auth.route';
import { userModule } from './modules/user/user.route';
import { departmentModule } from './modules/department/department.route';
import { roleModule, permissionModule } from './modules/role/role.route';
import { dashboardModule } from './modules/dashboard/dashboard.route';
import { formTemplateModule } from './modules/template/template.route';
import { submissionModule } from './modules/submission/submission.route';
import { formStatsModule } from './modules/form-stats/form-stats.route';
import { shareLinkStatsModule } from './modules/share-link-stats/share-link-stats.route';
import { publicFillModule } from './modules/public/public.route';
import { approvalProcessModule } from './modules/approval/process.route';

// 启动前强制校验 JWT_SECRET：长度不足 32 字符直接拒绝启动，
// 杜绝使用开发默认值或弱 secret 的情况。
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET 必须至少 32 字符，当前长度:', JWT_SECRET?.length ?? 0);
  process.exit(1);
}

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  // access token：短生命周期，用于接口鉴权
  .use(
    jwt({
      name: 'accessJwt',
      secret: JWT_SECRET,
      exp: process.env.JWT_EXPIRES_IN ?? '2h',
    }),
  )
  // refresh token：长生命周期，用于换发 access token
  .use(
    jwt({
      name: 'refreshJwt',
      secret: JWT_SECRET,
      exp: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
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
  .group('/api', (app) =>
    app
      .group('/v1', (app) =>
        app
          .use(authModule)
          .use(userModule)
          .use(departmentModule)
          .use(roleModule)
          .use(permissionModule)
          .use(dashboardModule)
          .use(approvalProcessModule)
          .use(formTemplateModule)
          .use(submissionModule)
          .use(formStatsModule)
          .use(shareLinkStatsModule),
      )
      .use(publicFillModule),
  )
  .listen(Number(process.env.PORT ?? 3000));

console.log(`🚀 OA backend running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📚 Swagger: http://localhost:${app.server?.port}/swagger`);
