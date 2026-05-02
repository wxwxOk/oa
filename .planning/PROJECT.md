# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.2 交付完整的组织架构管理 + 自定义表单收集系统，含 12 列栅格布局设计器（分组标题 + 动态行表格）、PDF 保真输出、PC/Mobile 响应式填写页和 Docker 一键部署。

## Core Value
开箱即用的组织架构管理 + 表单收集 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)
✅ v1.1 自定义表单收集 shipped (2026-04-20)
✅ v1.2 模板管理优化 shipped (2026-04-22)
◆ v1.3 到访信息管理 planning (2026-05-02)

## Current Milestone: v1.3 到访信息管理

**Goal:** 新增固定的到访信息管理模块，承接渠道往来测试表中的学员到访、咨询接待、试听跟进和成交状态管理。

**Target features:**
- 到访记录 CRUD：登记、编辑、删除、详情查看学员到访记录
- Excel 导入：支持导入当前《渠道往来测试表.xlsx》的 15 列格式
- 列表筛选：按渠道商、咨询师、接待人、接待日期、咨询后状态、状态类别筛选
- 跟进管理：维护状态说明、试听课后状态、解决方案、试听课时间
- 基础统计：按渠道商、咨询师、接待人和状态汇总到访与转化情况

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
- ✓ FR-15 字段分组 + 分组标题 — v1.2
- ✓ FR-16 12 列栅格布局引擎 — v1.2
- ✓ FR-17 动态行表格 — v1.2
- ✓ FR-18 PDF 保真输出 — v1.2
- ✓ FR-19 填写页响应式布局还原 — v1.2

### Active
- [ ] 到访记录固定业务模块，独立菜单与权限控制
- [ ] Excel 导入渠道往来测试表格式并生成到访记录
- [ ] 到访列表支持常用业务维度筛选与分页
- [ ] 到访详情可维护咨询、接待、试听后的跟进信息
- [ ] 到访统计支持渠道、人员、状态维度汇总

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
v1.2 新增 17,172 LOC，~50 commits，2 天内完成（5 phases, 16 plans）。
v1.3 以《渠道往来测试表.xlsx》为业务样本，表格标题为「学员到访跟踪表」，字段包括姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期、咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间；本里程碑采用固定业务模块，不复用自定义表单模板作为主数据模型。
技术亮点：Bun 全链路构建、Quasar 双布局响应式、Prisma ORM、vue-draggable-plus 表单设计器、signature_pad 手写签名、html2canvas PDF 导出、vue-chartjs 统计图表、12 列栅格布局引擎、智能分页 PDF、QExpansionItem 移动端卡片。

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
| Row-based 层级 schema（非 x/y/w/h 坐标） | ✓ 序列化简单，行顺序即位置 |
| grid-layout-plus 设计器画布 | ✓ 拖拽 + 调整跨列，Vue3 兼容 |
| PrintableForm table HTML 绕过 CSS Grid | ✓ html2canvas 不支持 CSS Grid，table 方案稳定 |
| DOM 坐标分页算法 | ✓ 精确分页，避免截断分组/表格行 |
| QExpansionItem 移动端卡片布局 | ✓ 动态表格触控友好，折叠/展开自然 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-02 after milestone v1.3 started*
