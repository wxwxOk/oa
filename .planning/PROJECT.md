# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.0 交付完整的组织架构管理（用户 + 部门 + RBAC），含 PC/Mobile 双布局响应式界面和 Docker 一键部署。

## Core Value
开箱即用的组织架构管理 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)

## Requirements

### Validated
- ✓ FR-1 认证：双 JWT + bcrypt + 无感续签 — v1.0
- ✓ FR-2 用户管理：CRUD + 分页筛选 + 重置密码 + 角色分配 — v1.0
- ✓ FR-3 部门管理：无限层级树 + 循环引用校验 — v1.0
- ✓ FR-4 RBAC：角色 CRUD + 权限分配 + ADMIN 锁死 — v1.0
- ✓ FR-5 前端权限控制：路由守卫 + v-perm 指令 — v1.0
- ✓ FR-6 响应式：PC/Mobile 双布局 + 暗色模式 — v1.0
- ✓ NFR-1 性能：列表 p95 < 500ms — v1.0
- ✓ NFR-2 安全：JWT secret 校验 + Prisma 参数化 — v1.0
- ✓ NFR-3 可维护性：ESLint + 模块化路由 — v1.0
- ✓ NFR-4 部署：docker compose up -d 一条命令 — v1.0

### Active
(Next milestone TBD)

### Out of Scope
- 考勤打卡、请假审批、工作流引擎 — v2.0+ 考虑
- 公告、文件管理 — v2.0+ 考虑
- SSO/LDAP、多租户 — 企业版方向
- 审计日志 — v1.1 候选

## Tech Stack
Vue3 + Quasar + TS / Bun + Elysia + Prisma / PostgreSQL 16 / JWT / Docker Compose

## Constraints
- Windows 本地开发环境
- Bun 作为后端运行时（非 Node）
- 部署目标：Docker Compose 单机

## Context
v1.0 以 2,404 LOC (TS/Vue) 在 3 天内完成，113 commits。
技术亮点：Bun 全链路构建（后端运行 + 前端打包）、Quasar 双布局响应式、Prisma ORM。

## Key Decisions

| Decision | Outcome |
|---|---|
| Bun 替代 Node 作为后端运行时 | ✓ 构建速度快，Docker 镜像小 |
| Quasar 作为 UI 框架 | ✓ 内置响应式组件，减少自定义 CSS |
| 双 JWT 实例（access + refresh） | ✓ 安全性好，无感续签体验佳 |
| Prisma ORM | ✓ 类型安全，migration 管理方便 |
| Docker 多阶段构建 | ✓ 生产镜像精简 |
| Bash + PowerShell 双份脚本 | ✓ 跨平台部署支持 |

---
*Last updated: 2026-04-20 after v1.0 milestone*
