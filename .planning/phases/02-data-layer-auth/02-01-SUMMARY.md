---
phase: 02-data-layer-auth
plan: 01
subsystem: auth
tags: [jwt, elysia, bun, dockerfile, secret-validation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Elysia app shell、prisma 客户端、LoginPage / auth store、单 jwt 实例
provides:
  - 后端 accessJwt (2h) + refreshJwt (7d) 双实例
  - JWT_SECRET 启动硬校验（< 32 字符即 exit 1）
  - authGuard 强制 payload.type === 'access'，杜绝 refresh token 冒充
  - Dockerfile 对齐 oven/bun:1.3-alpine
affects: [02-02 e2e 验证, 后续所有受 authGuard 保护的模块, 部署相关 phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "双 JWT 实例 (accessJwt/refreshJwt) 命名注入 Elysia plugin 上下文"
    - "启动期配置守卫：关键 env 不满足约束直接 exit 1"

key-files:
  created:
    - .planning/phases/02-data-layer-auth/02-01-SUMMARY.md
  modified:
    - backend/src/index.ts
    - backend/src/modules/auth/auth.route.ts
    - backend/src/middlewares/auth.ts
    - backend/Dockerfile

key-decisions:
  - "JWT_SECRET 不足 32 字符时后端直接 exit(1)，不再提供 'dev-secret-change-me' 回退，避免弱 secret 潜伏到部署环境"
  - "除签名隔离外，再在业务侧显式校验 payload.type：authGuard 拒绝 type !== 'access'，refresh 端点拒绝 type !== 'refresh'，双保险"
  - "路由/中间件改用 ({ accessJwt, refreshJwt } : any) 解构，显式声明依赖的 JWT 实例"

patterns-established:
  - "双 JWT 实例：access 短、refresh 长；每处只使用对应实例"
  - "启动期 fail-fast 校验：env 缺失或弱值直接终止进程"

requirements-completed: [FR-1.1, FR-1.2, FR-1.4, NFR-2]

# Metrics
duration: 15min
completed: 2026-04-19
---

# Phase 02 Plan 01: 双 JWT 实例 + 启动校验 + Dockerfile 对齐 Summary

**后端 accessJwt/refreshJwt 双实例落地，启动期强制校验 JWT_SECRET，Dockerfile 升至 Bun 1.3，修复 access/refresh 共享 2h 过期的核心缺陷。**

## Performance

- **Duration:** ~15 min (inline execution)
- **Started:** 2026-04-19T02:40:00Z (approx)
- **Completed:** 2026-04-19T02:55:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `backend/src/index.ts` 注册 accessJwt (exp=2h) 与 refreshJwt (exp=7d) 双实例，启动前硬校验 `JWT_SECRET` 长度
- `auth.route.ts` login 用 accessJwt+refreshJwt 分别签发；refresh 仅用 refreshJwt.verify 并显式校验 `payload.type === 'refresh'`，再用 accessJwt 签新 access token
- `middlewares/auth.ts` authGuard 改用 accessJwt.verify，并新增 `payload.type !== 'access'` 拒绝逻辑
- `backend/Dockerfile` 两处 `oven/bun:1.1-alpine` → `oven/bun:1.3-alpine`，与本地 Bun 1.3.12 对齐

## Task Commits

1. **Task 1: 注册双 JWT 实例 + JWT_SECRET 启动校验** - `050e403` (feat)
2. **Task 2: auth 路由 / guard 迁移到双 JWT 实例** - `2b36921` (feat)
3. **Task 3: Dockerfile Bun 版本升级** - `1542e3c` (chore)

## Files Created/Modified
- `backend/src/index.ts` — JWT_SECRET 启动硬校验 + 双 JWT 实例注册
- `backend/src/modules/auth/auth.route.ts` — login 双实例签发，refresh 强制 refreshJwt.verify + type 校验
- `backend/src/middlewares/auth.ts` — authGuard 改用 accessJwt.verify 并校验 payload.type === 'access'
- `backend/Dockerfile` — Bun 1.1-alpine → 1.3-alpine

## Decisions Made
- 启动期 fail-fast：JWT_SECRET 缺失或不足 32 字符立即 `process.exit(1)`，不提供 dev 默认值回退
- 双保险策略：accessJwt/refreshJwt 已在签名层隔离，但仍在业务逻辑中显式校验 `payload.type`，防止未来某处误用
- 解构参数显式声明依赖的 jwt 实例（`{ accessJwt, refreshJwt }`），不再使用通用 `jwt` 名称

## Deviations from Plan

None — plan executed exactly as written。

## Issues Encountered

编排阶段：初次尝试在 worktree 中以 gsd-executor 子代理执行 plan，连续两次被上游 API 错误（1M 上下文错误 / new-api 500 panic）中断。已按 workflow `<runtime_compatibility>` 的回退策略转为 orchestrator 内联顺序执行，清理失败 worktree 后在主工作树继续推进，符合 <failure_handling> 的约定。

## User Setup Required

None — 无需额外外部服务配置。`.env` / `backend/.env` 中现有 JWT_SECRET 已满足 ≥ 32 字符（42 和 46 字符）。

## Next Phase Readiness
- 所有 8 项 plan 级 verification grep 校验通过（详见 02-01-PLAN.md `<verification>` 段）
- 下一 Plan 02-02 可直接进入端到端 e2e 验证：Docker Compose → Prisma migrate/seed → login/refresh/profile 链路
- 无遗留 TODO，未引入新依赖

---
*Phase: 02-data-layer-auth*
*Completed: 2026-04-19*
