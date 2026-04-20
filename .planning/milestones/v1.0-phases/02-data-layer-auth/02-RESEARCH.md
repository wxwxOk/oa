# Phase 2: 数据层 + 认证 - Research

**Researched:** 2026-04-17
**Domain:** Prisma ORM + JWT Authentication (Bun + Elysia)
**Confidence:** HIGH

## Summary

Phase 1 的脚手架已经完成了 Phase 2 大部分代码的初始版本：Prisma schema（含完整 RBAC 模型）、init migration、seed 脚本、auth 路由（login/refresh/profile）、前端 LoginPage + auth store + axios 拦截器。Phase 2 的核心工作不是从零开始，而是**验证、修复、补全**这些已有代码，使其端到端可运行。

最关键的发现：当前 `@elysiajs/jwt` 只注册了一个实例，access token 和 refresh token 共享同一个 `exp: '2h'`，这意味着 refresh token 也只有 2 小时有效期，不满足 FR-1.1 要求的 7 天。必须注册两个 JWT 实例（`accessJwt` + `refreshJwt`），分别配置不同的过期时间。

**Primary recommendation:** 注册双 JWT 实例解决过期时间差异问题，验证 docker compose 全链路可运行（postgres → prisma migrate → seed → backend → frontend），确保 login/refresh/logout 端到端通过。

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-1.1 | 用户名+密码登录，返回 access token (2h) + refresh token (7d) | 双 JWT 实例模式（accessJwt exp=2h, refreshJwt exp=7d），已有 auth.route.ts login 端点需修改 |
| FR-1.2 | access token 过期后可用 refresh token 换取新 token | 已有 /refresh 端点 + 前端 axios 拦截器，需修改为使用 refreshJwt.verify |
| FR-1.3 | 登出：前端清除 token；后端无状态 | 已有 auth store logout()，清除 localStorage，后端无需改动 |
| FR-1.4 | 密码使用 bcrypt 哈希存储 | 已有 bcryptjs，seed.ts 使用 hashSync(pwd, 10)，auth.route.ts 使用 compareSync |
| NFR-2 | JWT secret >= 32 字符；防 SQL 注入（Prisma 参数化） | .env 中 JWT_SECRET 需验证长度；Prisma 天然参数化查询 |
| NFR-4 | docker compose up -d 一条命令启动 | 已有 docker-compose.yml，Dockerfile CMD 含 migrate deploy + seed + start |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JWT 签发/验证 | API (Elysia) | — | 令牌生成和验证必须在服务端完成 |
| 密码哈希 | API (Elysia) | — | bcrypt 运算在服务端，前端只传明文 |
| Token 存储 | Browser (localStorage) | — | 无状态 JWT，前端持有 token |
| Token 刷新 | Browser (axios interceptor) | API (Elysia) | 前端检测 401 自动刷新，后端验证 refresh token |
| 数据持久化 | Database (PostgreSQL) | — | Prisma ORM 管理 schema 和 migration |
| 登录 UI | Browser (Vue3 + Quasar) | — | LoginPage.vue 已有基础实现 |
| 路由守卫 | Browser (vue-router) | — | beforeEach 检查 auth.isLogin |

## Standard Stack

### Core
| Library | Version (installed) | Version (latest) | Purpose | Why Standard |
|---------|-------------------|-----------------|---------|--------------|
| elysia | 1.4.x | 1.4.28 | Web 框架 | Bun 原生，类型安全 [VERIFIED: npm registry] |
| @elysiajs/jwt | 1.4.1 | 1.4.1 | JWT 签发/验证 | 官方插件，基于 jose [VERIFIED: npm registry] |
| @prisma/client | 5.22.0 | 7.7.0 | ORM | 类型安全查询，自动参数化防注入 [VERIFIED: npm registry] |
| bcryptjs | 2.4.3 | 3.0.3 | 密码哈希 | 纯 JS 实现，Bun 兼容 [VERIFIED: npm registry] |
| vue | 3.5.x | — | 前端框架 | 项目选型 |
| quasar | 2.17.x | — | UI 框架 | 项目选型，含 Notify/Dialog/LoadingBar |
| pinia | 2.2.x | — | 状态管理 | Vue3 官方推荐 |
| axios | 1.7.x | — | HTTP 客户端 | 拦截器支持 token 刷新 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @elysiajs/cors | 1.4.1 | 跨域 | 开发环境前后端分离 [VERIFIED: npm registry] |
| @elysiajs/swagger | 1.3.1 | API 文档 | 自动生成 OpenAPI 文档 [VERIFIED: npm registry] |
| prisma (CLI) | 5.22.0 | Migration/Generate | 开发时 schema 变更 [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | Bun.password (内置) | Bun.password 性能更好但 API 不同，bcryptjs 已在用且跨平台 |
| localStorage | httpOnly cookie | Cookie 更安全但增加 CSRF 复杂度，当前无状态方案更简单 |
| 单 JWT 实例 | 双 JWT 实例 | 必须用双实例才能实现不同过期时间 |

### Version Notes

项目当前锁定 Prisma 5.22.0 和 Elysia 1.4.x。npm registry 显示 Prisma 最新为 7.7.0（大版本跳跃），但项目 package.json 锁定 `^5.22.0`，不建议在此阶段升级。Elysia 1.4.28 是兼容更新，可安全升级。[VERIFIED: npm registry + bun.lock]

## Architecture Patterns

### System Architecture Diagram

```
[Browser]                          [Docker Network]
   |                                    |
   |  POST /api/v1/auth/login          |
   |  { username, password }            |
   |----------------------------------->|
   |                          [Elysia Backend :3000]
   |                               |         |
   |                               |  Prisma |
   |                               |  Query  |
   |                               |-------->|
   |                               |    [PostgreSQL :5432]
   |                               |<--------|
   |                               |
   |                          bcrypt.compare
   |                               |
   |                          accessJwt.sign (2h)
   |                          refreshJwt.sign (7d)
   |                               |
   |  { accessToken, refreshToken, |
   |    user: { id, roles, perms }}|
   |<------------------------------|
   |                               |
   |  localStorage.setItem(...)    |
   |                               |
   |  [401 on any API call]        |
   |  POST /api/v1/auth/refresh    |
   |  { refreshToken }             |
   |--(axios interceptor)--------->|
   |                          refreshJwt.verify
   |                          accessJwt.sign (new)
   |  { accessToken }             |
   |<------------------------------|
   |                               |
   |  [Logout]                     |
   |  localStorage.clear()        |
   |  redirect /login              |
```

### Pattern 1: 双 JWT 实例（关键修改）
**What:** 注册两个 `@elysiajs/jwt` 插件实例，分别命名 `accessJwt` 和 `refreshJwt`
**When to use:** 需要不同过期时间的 access/refresh token
**Example:**
```typescript
// Source: https://elysiajs.com/plugins/jwt + elysia-jwt README
// index.ts
import { jwt } from '@elysiajs/jwt';

const app = new Elysia()
  .use(jwt({
    name: 'accessJwt',
    secret: process.env.JWT_SECRET!,
    exp: process.env.JWT_EXPIRES_IN ?? '2h',
  }))
  .use(jwt({
    name: 'refreshJwt',
    secret: process.env.JWT_SECRET!,
    exp: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  }))
```

### Pattern 2: Auth Guard with derive
**What:** 使用 Elysia derive 在 scoped 级别注入当前用户
**When to use:** 需要认证的路由组
**Example:**
```typescript
// Source: 已有 auth.ts middleware
// 修改点：jwt → accessJwt
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const token = auth.slice(7);
      const payload = await accessJwt.verify(token);
      // ... 加载用户和权限
    });
```

### Pattern 3: Axios Token 刷新队列
**What:** 401 时自动用 refresh token 换取新 access token，并重放排队请求
**When to use:** 前端所有 API 调用
**Status:** 已在 boot/axios.ts 中实现，逻辑正确

### Recommended Project Structure (已有，无需改动)
```
backend/
├── prisma/
│   ├── schema.prisma      # 数据模型（已完成）
│   ├── migrations/        # 迁移文件（已有 init）
│   └── seed.ts            # 种子数据（已完成）
├── src/
│   ├── index.ts           # 入口（需修改：双 JWT）
│   ├── middlewares/
│   │   └── auth.ts        # 认证守卫（需修改：accessJwt）
│   ├── modules/
│   │   └── auth/
│   │       └── auth.route.ts  # 登录/刷新（需修改：双 JWT）
│   ├── plugins/
│   │   └── prisma.ts      # Prisma 客户端（已完成）
│   └── utils/
│       └── errors.ts      # 错误类（已完成）
frontend/
├── src/
│   ├── boot/
│   │   ├── axios.ts       # HTTP 拦截器（已完成）
│   │   └── perm.ts        # v-perm 指令（已完成）
│   ├── pages/
│   │   └── LoginPage.vue  # 登录页（已完成）
│   ├── stores/
│   │   └── auth.ts        # 认证状态（已完成）
│   └── router/
│       ├── index.ts       # 路由守卫（已完成）
│       └── routes.ts      # 路由表（已完成）
```

### Anti-Patterns to Avoid
- **单 JWT 实例处理双 token:** 当前代码的核心问题，access 和 refresh 共享 exp
- **在 refresh 端点使用 accessJwt.verify:** refresh token 必须用 refreshJwt.verify 验证
- **seed 脚本不幂等:** 当前 seed 使用 upsert，已正确处理幂等性
- **前端存储密码:** 只存 token 和用户信息，不存密码（已正确）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT 签发/验证 | 手写 HMAC | @elysiajs/jwt (基于 jose) | jose 处理了 JWK/JWS/JWE 的所有边界情况 |
| 密码哈希 | 手写 hash | bcryptjs | 自动 salt，防彩虹表，经过时间验证 |
| SQL 查询 | 拼接字符串 | Prisma 参数化查询 | 天然防 SQL 注入 |
| Token 刷新队列 | 简单重试 | axios interceptor + Promise 队列 | 已实现，处理并发 401 |
| 数据库迁移 | 手写 SQL | prisma migrate | 版本化、可回滚、类型安全 |

**Key insight:** 这个阶段的所有核心功能都有成熟的库支持，不需要手写任何加密或安全相关代码。

## Common Pitfalls

### Pitfall 1: 单 JWT 实例导致 refresh token 过期时间错误
**What goes wrong:** access token 和 refresh token 使用相同的 exp 配置
**Why it happens:** @elysiajs/jwt 的 exp 是在插件级别配置的，不是在 sign() 调用时
**How to avoid:** 注册两个 JWT 实例，分别配置 exp
**Warning signs:** refresh token 在 2 小时后失效，用户被迫重新登录

### Pitfall 2: refresh 端点用错 JWT 实例验证
**What goes wrong:** 用 accessJwt 验证 refresh token，或反过来
**Why it happens:** 两个实例使用相同 secret 但不同 exp，verify 时不会报错但 token 类型混淆
**How to avoid:** 在 payload 中加入 `type: 'access' | 'refresh'` 字段并校验（已有）
**Warning signs:** 用 access token 调用 /refresh 也能成功

### Pitfall 3: Docker 中 DATABASE_URL 主机名错误
**What goes wrong:** 本地开发用 localhost，Docker 内需要用服务名 postgres
**Why it happens:** docker-compose 网络中容器间通过服务名通信
**How to avoid:** .env 中 DATABASE_URL 使用 `postgres` 作为主机名（docker-compose 用），backend/.env 使用 `localhost`（本地开发用）
**Warning signs:** backend 容器启动后连不上数据库

### Pitfall 4: Prisma Client 未生成
**What goes wrong:** 运行时报 `@prisma/client did not initialize yet`
**Why it happens:** 安装依赖后未执行 `prisma generate`
**How to avoid:** Dockerfile 中已有 `bunx prisma generate`；本地开发需在 `bun install` 后手动执行
**Warning signs:** import PrismaClient 时类型缺失

### Pitfall 5: Seed 脚本在 Docker 中重复执行
**What goes wrong:** 每次容器重启都执行 seed，可能产生重复数据
**Why it happens:** Dockerfile CMD 中包含 seed
**How to avoid:** 当前 seed 使用 upsert，已幂等。但更好的做法是将 seed 从 CMD 分离，仅首次运行
**Warning signs:** 数据库中出现重复记录（当前不会，因为 upsert）

### Pitfall 6: JWT_SECRET 长度不足
**What goes wrong:** 不满足 NFR-2 要求的至少 32 字符
**Why it happens:** 开发者使用短字符串作为 secret
**How to avoid:** 启动时校验 JWT_SECRET 长度，不足则拒绝启动
**Warning signs:** .env 中 JWT_SECRET 少于 32 字符

## Code Examples

### 双 JWT 实例注册（核心修改）
```typescript
// Source: https://elysiajs.com/plugins/jwt [VERIFIED: Context7]
// backend/src/index.ts - 替换当前单 JWT 实例
import { jwt } from '@elysiajs/jwt';

const app = new Elysia()
  .use(jwt({
    name: 'accessJwt',
    secret: process.env.JWT_SECRET!,
    exp: process.env.JWT_EXPIRES_IN ?? '2h',
  }))
  .use(jwt({
    name: 'refreshJwt',
    secret: process.env.JWT_SECRET!,
    exp: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  }))
```

### Login 端点修改
```typescript
// backend/src/modules/auth/auth.route.ts
// 修改点：jwt → accessJwt / refreshJwt
const accessToken = await accessJwt.sign({ sub: String(user.id), type: 'access' });
const refreshToken = await refreshJwt.sign({ sub: String(user.id), type: 'refresh' });
```

### Refresh 端点修改
```typescript
// 修改点：jwt.verify → refreshJwt.verify, jwt.sign → accessJwt.sign
const payload = await refreshJwt.verify(body.refreshToken);
if (!payload || payload.type !== 'refresh') throw unauthorized('refresh token 无效');
const accessToken = await accessJwt.sign({ sub: payload.sub, type: 'access' });
```

### JWT Secret 长度校验
```typescript
// backend/src/index.ts - 启动前校验
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET 必须至少 32 字符');
  process.exit(1);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @elysiajs/jwt sign() 不支持 per-call exp | 使用多实例解决 | 一直如此 | 必须注册多个 JWT 插件实例 |
| Prisma 5.x | Prisma 7.x 已发布 | 2025-2026 | 项目锁定 5.22.0，暂不升级 |
| bcryptjs 2.x | bcryptjs 3.0.3 | 2025 | 可选升级，API 兼容 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 双 JWT 实例使用相同 secret 是安全的（通过 payload.type 区分） | Architecture Patterns | 低 — jose 签名包含 exp，即使 secret 相同，token 内容不同 |
| A2 | Bun 1.3.12 完全兼容 Prisma 5.22.0 | Standard Stack | 中 — 如不兼容需降级 Bun 或升级 Prisma |
| A3 | 前端 localStorage 存储 token 对此项目安全等级足够 | Architecture | 低 — 内部 OA 系统，非公网高安全场景 |

## Open Questions

1. **Dockerfile Bun 版本不匹配**
   - What we know: 本地 Bun 1.3.12，Dockerfile 使用 `oven/bun:1.1-alpine`
   - What's unclear: 是否需要更新 Dockerfile 到 1.3.x
   - Recommendation: 更新为 `oven/bun:1.3-alpine` 保持一致

2. **Prisma 版本差距**
   - What we know: 项目用 5.22.0，最新 7.7.0
   - What's unclear: 是否有 breaking changes 影响当前用法
   - Recommendation: Phase 2 不升级，保持 5.22.0 稳定

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | 后端运行时 | Yes | 1.3.12 | — |
| Docker | 容器化部署 | Yes | 29.4.0 | — |
| Docker Compose | 编排 | Yes | 5.1.1 | — |
| Node.js | 前端构建 (Quasar CLI) | Yes | 22.20.0 | — |
| PostgreSQL CLI (psql) | 数据库调试 | No | — | 通过 Docker exec 进入容器 |

**Missing dependencies with fallback:**
- psql 未安装，可通过 `docker exec -it oa-postgres psql -U oa -d oa_db` 替代

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | bcryptjs 哈希 + JWT 双 token |
| V3 Session Management | Yes | 无状态 JWT，前端 localStorage |
| V4 Access Control | Partial (Phase 4) | authGuard + RBAC（本阶段仅基础认证） |
| V5 Input Validation | Yes | Elysia t.Object schema 验证 |
| V6 Cryptography | Yes | jose (HS256)，bcryptjs (cost=10) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 暴力破解密码 | Spoofing | bcrypt cost factor（当前 10，可接受） |
| JWT 泄露 | Information Disclosure | 短 access token (2h) + HTTPS |
| SQL 注入 | Tampering | Prisma 参数化查询 |
| XSS 窃取 token | Information Disclosure | localStorage 无 httpOnly 保护，依赖 CSP |
| Refresh token 重放 | Spoofing | 当前无状态设计不防重放，可接受（内部系统） |

## Sources

### Primary (HIGH confidence)
- Context7 /elysiajs/elysia-jwt — JWT 插件配置、sign/verify API、多实例模式
- Context7 /llmstxt/elysiajs_llms-full_txt — Elysia 框架 JWT 集成模式、Bearer Auth
- Context7 /prisma/prisma — migration deploy、seed 配置、prisma.config.ts
- npm registry — 各包最新版本验证

### Secondary (MEDIUM confidence)
- [ElysiaJS JWT Plugin 官方文档](https://elysiajs.com/plugins/jwt) — exp 配置说明
- [elysia-jwt GitHub README](https://github.com/elysiajs/elysia-jwt/blob/main/README.md) — 多实例示例
- [elysia-jwt Issue #25](https://github.com/elysiajs/elysia-jwt/issues/25) — per-call exp 限制确认

### Tertiary (LOW confidence)
- 无

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 所有包版本已通过 npm registry 验证，代码已在项目中
- Architecture: HIGH — 双 JWT 实例模式有官方文档支持，已有代码只需小幅修改
- Pitfalls: HIGH — 基于实际代码审查发现的真实问题

**Research date:** 2026-04-17
**Valid until:** 2026-05-17（稳定技术栈，30 天有效）
