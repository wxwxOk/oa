# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.1 交付完整的组织架构管理 + 自定义表单收集系统（模板设计、链接分享、外部填写、数据查看打印统计），含 PC/Mobile 双布局响应式界面和 Docker 一键部署。

## Core Value
开箱即用的组织架构管理 + 表单收集 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)
✅ v1.1 自定义表单收集 shipped (2026-04-20)
🔧 v1.2 模板管理优化 — in progress (Phase 10 complete — schema 类型体系 + 渲染器引擎就绪)

## Current Milestone: v1.2 模板管理优化

**Goal:** 升级表单设计器为 12 列栅格布局引擎，支持分组标题、复杂排版、动态行表格，PDF 保真输出，填写页 PC 端还原布局 + 移动端自动单列。

**Target features:**
- 字段分组 + 分组标题（如"教育经历"、"工作经验"），每组带可视标题栏
- 12 列栅格布局引擎，字段可跨列放置，支持行/列组合
- 动态行表格（可重复填写的子表，支持增删行）
- PDF 保真输出，1:1 还原设计稿布局
- 填写页响应式：PC 端按设计稿布局渲染，移动端自动单列

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
- ✓ FR-7 表单模板管理：创建/编辑/删除模板，RBAC 权限控制 — v1.1
- ✓ FR-8 表单设计器：7 种字段类型 + 拖拽排序 + 手写签名 — v1.1
- ✓ FR-9 模板配置：可选是否要求填写者提供身份信息 — v1.1
- ✓ FR-10 分享链接：生成唯一链接 + 二维码，记录分享人和时间 — v1.1
- ✓ FR-11 外部填写：免登录通过浏览器打开链接填写表单 — v1.1
- ✓ FR-12 数据归档：收集数据存储，有权限用户可查看全部数据 — v1.1
- ✓ FR-13 打印导出：浏览器打印 + PDF 导出 — v1.1
- ✓ FR-14 基础统计：员工分享次数、收集数量统计 — v1.1

### Active
- FR-15 字段分组 + 分组标题 — v1.2
- FR-16 12 列栅格布局引擎 — v1.2
- FR-17 动态行表格 — v1.2
- FR-18 PDF 保真输出 — v1.2
- FR-19 填写页响应式布局还原 — v1.2

### Out of Scope
- 考勤打卡、请假审批、工作流引擎 — v2.0+ 考虑
- 公告、文件管理 — v2.0+ 考虑
- SSO/LDAP、多租户 — 企业版方向
- 审计日志 — v2.0 候选
- 条件逻辑/分支表单 — 复杂度高，v2.0 考虑
- 文件/图片上传字段 — 需要文件存储基础设施
- 多列表单布局 — ~~单列足够覆盖纸质表格场景~~ v1.2 实现
- Excel 导出 — v2.0 考虑

## Tech Stack
Vue3 + Quasar + TS / Bun + Elysia + Prisma / PostgreSQL 16 / JWT / Docker Compose

## Constraints
- Windows 本地开发环境
- Bun 作为后端运行时（非 Node）
- 部署目标：Docker Compose 单机

## Context
v1.0 以 2,404 LOC (TS/Vue) 在 3 天内完成，113 commits。
v1.1 新增 15,228 LOC，73 commits，1 天内完成（3 phases, 13 plans）。
技术亮点：Bun 全链路构建、Quasar 双布局响应式、Prisma ORM、vue-draggable-plus 表单设计器、signature_pad 手写签名、html2canvas PDF 导出、vue-chartjs 统计图表。

## Key Decisions

| Decision | Outcome |
|---|---|
| Bun 替代 Node 作为后端运行时 | ✓ 构建速度快，Docker 镜像小 |
| Quasar 作为 UI 框架 | ✓ 内置响应式组件，减少自定义 CSS |
| 双 JWT 实例（access + refresh） | ✓ 安全性好，无感续签体验佳 |
| Prisma ORM | ✓ 类型安全，migration 管理方便 |
| Docker 多阶段构建 | ✓ 生产镜像精简 |
| JSONB 存储表单 schema | ✓ 灵活，支持版本快照 |
| vue-draggable-plus 拖拽设计器 | ✓ 轻量，Vue3 兼容好 |
| nanoid 分享链接 token | ✓ URL-safe，碰撞概率极低 |
| 浏览器端 print + html2canvas PDF | ✓ 无需服务端依赖，部署简单 |
| Public routes 独立 Elysia group | ✓ 安全隔离，无 JWT 泄露风险 |

| 12 列栅格布局引擎 | ✓ 类 Bootstrap 栅格，兼顾复杂排版与响应式 |
| 不兼容 v1.1 旧模板 schema | ✓ 全新设计器替换，简化维护 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-21 after v1.2 milestone started*
