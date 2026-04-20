---
phase: 02-data-layer-auth
depth: standard
status: issues_found
files_reviewed: 4
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
generated: 2026-04-19
scope_source: SUMMARY.md (02-01-SUMMARY key-files.modified)
---

# Phase 02 Code Review

审查范围：Plan 01 修改的 4 个源文件（Plan 02 为验证型，无源码改动）。

- `backend/src/index.ts`
- `backend/src/modules/auth/auth.route.ts`
- `backend/src/middlewares/auth.ts`
- `backend/Dockerfile`

## 审查摘要

双 JWT 实例、JWT_SECRET 启动校验、authGuard 类型校验 三项核心设计正确落地。无 critical 问题。3 个 warning 与 4 个 info，均不阻塞 Phase 2 完成，但建议在后续 phase 处理。

## Findings

### WR-01 登录端点错误消息允许用户名枚举
**Severity:** warning
**File:** `backend/src/modules/auth/auth.route.ts:18-19`
**Category:** security

```ts
if (!user || user.status === 'DISABLED') throw unauthorized('用户不存在或已禁用');
if (!bcrypt.compareSync(password, user.password)) throw unauthorized('用户名或密码错误');
```

两条错误消息不同，攻击者可通过消息差异枚举合法用户名（有效用户名 + 错误密码 → "用户名或密码错误"；不存在或禁用的用户名 → "用户不存在或已禁用"）。

**Fix:** 统一为 `'用户名或密码错误'`。对 DISABLED 用户可在 compare 后单独判定返回该消息，或保留同一文案但 log 到 audit。

### WR-02 Dockerfile 以 root 身份运行容器进程
**Severity:** warning
**File:** `backend/Dockerfile:10-17`
**Category:** hardening

运行阶段未切换到非 root 用户。若容器内应用出现 RCE，攻击者直接获得 root，进一步放大影响面。

**Fix:** 添加
```dockerfile
RUN adduser -D -s /bin/sh oa
USER oa
```
或使用 `oven/bun:1.3-alpine` 自带的 `bun` 用户（需确认镜像内是否已创建）。

### WR-03 容器启动自动跑 seed
**Severity:** warning
**File:** `backend/Dockerfile:17`
**Category:** operations / data integrity

```dockerfile
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run prisma/seed.ts && bun run src/index.ts"]
```

每次容器启动都执行 `bun run prisma/seed.ts`。当前 seed.ts 虽为幂等 upsert，但：
- 任意重启都会刷新 admin 密码，若未来运维修改了 admin 密码，容器重启将把它覆盖回默认 `admin123`
- 增加启动时间与数据库写入

**Fix:** 将 seed 拆成独立一次性任务（比如 `docker compose run --rm backend bun run prisma/seed.ts`），或 seed 内部增加 "数据库已初始化过则跳过" 守卫。

### IN-01 Elysia 路由/中间件大量使用 `any` 类型
**Severity:** info
**Files:**
- `backend/src/modules/auth/auth.route.ts:10,52`
- `backend/src/middlewares/auth.ts:8`

```ts
async ({ body, accessJwt, refreshJwt }: any) => { ... }
.derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => { ... })
```

绕过了 Elysia 的类型推断，未来重构、重命名、拼写错误（如把 `accessJwt` 写成 `accesJwt`）将在运行时才报错。

**Fix:** 后续 phase 引入 Elysia `Context` / `t.Object` 派生类型，或为 plugin chain 建立显式 Type 别名。当前 MVP 阶段可以接受。

### IN-02 bcrypt.compareSync 阻塞事件循环
**Severity:** info
**File:** `backend/src/modules/auth/auth.route.ts:19`

`bcrypt.compareSync` 为同步 API，在 login 路径阻塞 Bun 事件循环（默认 cost=10 约 60–100ms）。高并发下会影响所有并发请求的尾延迟。

**Fix:** 切换到 `await bcrypt.compare(password, user.password)`。影响面小，纯改一行。

### IN-03 authGuard 每次请求都做嵌套 Prisma include
**Severity:** info
**File:** `backend/src/middlewares/auth.ts:16-27`

每次受保护请求都运行 `user → roles → role → permissions → permission` 四层 include 查询。对典型 OA 的 QPS 足够，但：
- 结果对同一 user 在 token 生命周期内基本不变
- 可缓存（in-memory LRU / Redis）或在 accessToken payload 内携带 roleCodes/permissions 快照并在 login 时生成（代价是权限变更后需要重新登录才生效）

**Fix:** 建议在后续 dashboard / 权限管理 phase 评估。

### IN-04 Dockerfile 缺少 HEALTHCHECK
**Severity:** info
**File:** `backend/Dockerfile` (end of file)
**Category:** operations

`docker-compose.yml` 中上游服务依赖 backend 时，若无 `HEALTHCHECK` 指令，`depends_on: condition: service_healthy` 无法自动生效。

**Fix:** 在 Dockerfile 结尾添加：
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
```
（alpine 自带 wget；若镜像没有则用 `bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1))"`）

## 未列入正式 finding 但值得记录

- CORS `origin: true` + `credentials: true`：当前内部 OA，风险可接受；如果将来暴露到不可信网络，需要把 origin 切换为白名单
- Refresh token 无轮换（rotation）：被盗的 refresh token 在 7 天内持续可用。对 MVP 可以接受；若需要更严格的安全模型，后续可在 refresh 端点签发新 refresh + 旧 token 标记失效
- 登录无速率限制 / 账号锁定：同一来源可无限尝试。后续加反爬 / 登录审计时再考虑

## 总结

| 类别 | 数量 |
|------|------|
| Critical | 0 |
| Warning | 3 |
| Info | 4 |
| Total | 7 |

结论：Phase 2 可以进入验证与完成流程；warning 项列入后续优化列表（建议新建 phase 或 backlog 条目），不建议在 Phase 2 内处理以免 scope 蔓延。
