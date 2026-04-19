# Project: OA 管理系统

## Vision
为中小企业提供轻量、开源的 OA 平台。v1.0 聚焦组织架构（用户+部门+RBAC），后续扩展考勤、工作流、公告。

## Scope (v1.0)
- 登录 / JWT 刷新 / 登出
- 用户 CRUD + 重置密码 + 启/禁用
- 部门树 CRUD
- 角色 CRUD + 权限分配
- 前端菜单/按钮级权限控制
- PC + 移动端响应式（Quasar）

## Out of Scope (v1.0)
考勤打卡、请假审批、工作流引擎、公告、文件管理、SSO/LDAP、多租户、审计日志。

## Tech Stack
Vue3 + Quasar + TS / Bun + Elysia + Prisma / PostgreSQL 16 / JWT / Docker Compose

## Constraints
- Windows 本地开发环境
- Bun 作为后端运行时（非 Node）
- 部署目标：Docker Compose 单机

## Progress
- ✅ Phase 1: 基础架构（Elysia + Prisma + LoginPage 骨架）
- ✅ Phase 2: 数据层 + 认证（双 JWT 实例 + JWT_SECRET 启动校验 + E2E 登录链路实测通过；FR-1.1/1.2/1.3/1.4 + NFR-2/4 已验证）

_Last updated: 2026-04-19_
