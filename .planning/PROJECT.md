# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.2 已交付完整的组织架构管理 + 自定义表单收集系统，含 12 列栅格布局设计器、分组标题、动态行表格、PDF 保真输出、PC/Mobile 响应式填写页和 Docker 一键部署。v2.0 正在扩展为表单驱动的 OA 审批中心：员工通过动态表单提交内部申请，系统按模板绑定流程流转到审批人，并把申请、审批、备注、编辑、归档导出和统计串成闭环。

## Core Value
中小企业能用自定义表单快速上线可追踪、可审批、可归档的内部业务流程 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)
✅ v1.1 自定义表单收集 shipped (2026-04-20)
✅ v1.2 模板管理优化 shipped (2026-04-22)
🚧 v2.0 表单驱动 OA 审批中心 in progress: Phase 15 审批数据模型与状态机 complete; Phase 16 流程配置与模板绑定 next (2026-04-25)

## Current Milestone: v2.0 表单驱动 OA 审批中心

**Goal:** 在既有模板、填写、PDF 和组织架构基础上，建立登录用户可用的 OA 审批闭环，让内部表单从“收集数据”升级为“提交申请、流转审批、跟进处理、归档统计”。

**Target features:**
- 审批模式与模板绑定：模板可选择仅收集或需要审批，审批配置随提交生成快照。
- 审批流程：支持单步/串行审批，审批人来源覆盖固定用户、角色和提交人部门负责人。
- 我的申请：员工可在 PC/Mobile 提交、保存草稿、查看状态、查看时间线，并在规则允许时撤销。
- 待我审批：审批人可筛选待办，查看表单详情，审批/驳回并填写意见，移动端有明确操作区。
- 收集后编辑：授权人员可在审计轨迹下修正已提交数据、维护处理字段和编辑原因。
- 标记备注：审批人和处理人员可添加内部备注、标签/标记，且不静默覆盖原始提交。
- 动态提交字段：模板必填字段、后续字段版本和处理字段均无需开发改表单代码。
- 归档导出统计：按模板、部门、申请人、状态、时间、标签查询，支持 Excel/PDF 导出和基础统计。

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
- ✓ MODEL-01 审批流程/节点/实例/任务/动作/时间线数据模型 — v2.0 Phase 15
- ✓ MODEL-02 表单 schema 与审批流程快照持久化 — v2.0 Phase 15
- ✓ MODEL-03 审批实例合法状态机 — v2.0 Phase 15
- ✓ MODEL-04 提交/分配/审批/驳回/撤销/编辑/标记/备注不可变业务事件 — v2.0 Phase 15

### Active
- [ ] **CFG-01**: 模板可切换“仅收集”和“需要审批”，并绑定可配置审批流程
- [ ] **APP-01**: 登录员工可通过 PC/Mobile 提交申请、保存草稿、查看“我的申请”
- [ ] **APR-01**: 审批人可通过 PC/Mobile 处理待办，审批/驳回并填写意见
- [ ] **OPS-01**: 授权人员可给申请或收集记录添加标签/标记
- [ ] **OPS-02**: 授权人员可在审计轨迹下做提交后受控编辑
- [ ] **OPS-04**: 管理员/负责人可查询归档数据
- [ ] **OPS-05**: 授权人员可导出 Excel/PDF
- [ ] **OPS-06**: 管理员可查看基础统计

### Out of Scope
- 考勤打卡规则、工资/绩效、公告、文件管理 — 非 v2.0 审批中心 MVP
- BPMN 可视化流程设计器、并行/会签、条件分支、委托、超时升级 — 等基础审批闭环稳定后再评估
- 企业微信/钉钉/SMS/邮件外部通知 — v2.x 集成方向，v2.0 先做站内通知
- SSO/LDAP、多租户 — 企业版方向
- 平台级审计日志 — v2.0 只做审批/编辑相关的业务时间线与审计事件
- 条件逻辑/字段显隐 — 独立规则引擎，暂不纳入审批 MVP
- 文件/图片上传字段 — 需要文件存储基础设施，除非客户确认首版强依赖

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
v2.0 scope 来自客户沟通整理：`.planning/research/CLIENT_CHAT_NEXT_FEATURES.md`（2026-04-25）。客户重点从“公开表单收集”转向“内部纸质审批在线化”，首版优先实用审批闭环，不做复杂企业级流程平台。
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
| v2.0 先做显式状态机，不引入 BPMN 引擎 | ✓ Phase 15 建立集中状态机 |
| 申请提交时快照表单 schema 与审批流程配置 | ✓ Phase 15 `ApprovalApplication` 保存 schema/process/template/applicant/department 快照 |
| 原始提交、处理字段、备注/标签、审计事件分开建模 | ✓ Phase 15 建立 `ApprovalAction` + `ApprovalTimelineEvent` 追加事件基础 |
| v2.0 MVP 外部通知集成和附件字段后置 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after Phase 15 completion*
