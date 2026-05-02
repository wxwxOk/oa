# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.2 已交付完整的组织架构管理 + 自定义表单收集系统，含 12 列栅格布局设计器、分组标题、动态行表格、PDF 保真输出、PC/Mobile 响应式填写页和 Docker 一键部署。v2.0 已扩展为表单驱动的 OA 审批中心：员工通过动态表单提交内部申请，系统按模板绑定流程流转到审批人，并把申请、审批、备注、编辑、归档导出和统计串成闭环。v1.3 已交付固定的到访信息管理模块，用于沉淀渠道往来测试表中的学员到访、咨询接待、试听跟进和成交状态管理。

## Core Value
中小企业能用自定义表单快速上线可追踪、可审批、可归档的内部业务流程，并能通过固定业务模块沉淀高频台账数据 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)
✅ v1.1 自定义表单收集 shipped (2026-04-20)
✅ v1.2 模板管理优化 shipped (2026-04-22)
✅ v2.0 表单驱动 OA 审批中心 implemented through Phase 19; milestone verification remains open for Phase 18 closure (2026-04-26)
✅ v1.3 到访信息管理 shipped (2026-05-02; manual testing passed)

## Current Milestone

No active milestone. v1.3 到访信息管理已在 2026-05-02 经过自动化冒烟/构建检查和人工测试后归档。下一里程碑通过 `$gsd-new-milestone` 重新定义需求。

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
- ✓ CFG-01 模板可切换“仅收集”和“需要审批”，并绑定可配置审批流程 — v2.0 Phase 16
- ✓ CFG-02 单步审批流程配置，审批人来源支持固定用户、角色和提交人部门负责人 — v2.0 Phase 16
- ✓ CFG-03 串行多步审批流程配置，节点包含名称、顺序、审批人来源和固定通过/驳回动作 — v2.0 Phase 16
- ✓ CFG-04 部门负责人/默认审批人维护并可被流程配置引用 — v2.0 Phase 16
- ✓ CFG-05 审批相关 RBAC 权限、后端校验和前端菜单/按钮控制 — v2.0 Phase 16
- ✓ DYN-01 模板必填字段在 PC/Mobile 提交页一致校验 — v2.0 Phase 16
- ✓ DYN-02 发布后字段变更形成新 schema 版本，提交保存版本快照 — v2.0 Phase 16
- ✓ APP-01 登录员工可通过 PC/Mobile 提交内部审批申请并保存申请人/部门/模板/流程快照 — v2.0 Phase 17
- ✓ APP-02 申请草稿可保存、继续编辑和正式提交，草稿不创建待办任务 — v2.0 Phase 17
- ✓ APP-03 “我的申请”按状态和日期范围筛选，PC 表格与 Mobile 卡片均可用 — v2.0 Phase 17
- ✓ APP-04 申请详情展示历史表单快照、当前状态/节点、时间线、意见和本人可见性提示 — v2.0 Phase 17
- ✓ APP-05 申请人可撤销审批中申请，撤销关闭待办并写入时间线 — v2.0 Phase 17
- ✓ APR-01 审批人可通过 PC/Mobile 处理待办，审批/驳回并填写意见 — v2.0 Phase 18
- ✓ APR-02 审批人可打开审批详情，查看按 schema 快照渲染的表单数据、当前节点和完整时间线 — v2.0 Phase 18
- ✓ APR-03 审批人可对待办执行通过或驳回，系统推进下一节点或进入最终状态 — v2.0 Phase 18
- ✓ APR-04 审批人可查看已处理审批历史 — v2.0 Phase 18
- ✓ APR-05 Mobile 审批详情页提供可读时间线和 sticky 操作区 — v2.0 Phase 18
- ✓ APR-06 审批人可添加内部处理备注 — v2.0 Phase 18
- ✓ OPS-01 授权人员可给申请或收集记录添加标签/标记 — v2.0 Phase 19
- ✓ OPS-02 授权人员可在审计轨迹下做提交后受控编辑 — v2.0 Phase 19
- ✓ OPS-03 管理员可为模板启用处理字段 — v2.0 Phase 19
- ✓ OPS-04 管理员/负责人可查询归档数据 — v2.0 Phase 19
- ✓ OPS-05 授权人员可导出 Excel/PDF — v2.0 Phase 19
- ✓ OPS-06 管理员可查看基础统计 — v2.0 Phase 19
- ✓ OPS-07 用户可收到站内通知并看到未读数量 — v2.0 Phase 19
- ✓ 到访记录固定业务模块，独立菜单与权限控制 — v1.3
- ✓ Excel 导入渠道往来测试表格式并生成到访记录 — v1.3
- ✓ 到访列表支持常用业务维度筛选与分页 — v1.3
- ✓ 到访详情可维护咨询、接待、试听后的跟进信息 — v1.3
- ✓ 到访统计支持渠道、人员、状态维度汇总 — v1.3

### Active
- [ ] Next milestone requirements pending definition via `$gsd-new-milestone`

### Out of Scope
- 考勤打卡规则、工资/绩效、公告、文件管理 — 非 v2.0 审批中心 MVP
- BPMN 可视化流程设计器、并行/会签、条件分支、委托、超时升级 — 等基础审批闭环稳定后再评估
- 企业微信/钉钉/SMS/邮件外部通知 — v2.x 集成方向，v2.0 先做站内通知
- SSO/LDAP、多租户 — 企业版方向
- 平台级审计日志 — v2.0 只做审批/编辑相关的业务时间线与审计事件
- 条件逻辑/字段显隐 — 独立规则引擎，暂不纳入审批 MVP
- 文件/图片上传字段 — 需要文件存储基础设施，除非客户确认首版强依赖
- Excel 导出 — v1.3 只解决导入和系统内管理
- 自动去重合并 — 样表缺少手机号、微信或线索编号，自动合并风险高
- 跟进提醒 / 待办 — 需要通知和任务体系，超出固定台账 MVP 范围
- 渠道商字典管理 — 先从记录中提取筛选项，避免新增维护成本
- 销售阶段工作流 — 当前需求是记录状态，不是强制流程编排
- 公开渠道报名页 — 可由现有表单系统覆盖，不纳入固定到访模块

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
v1.3 于 2026-05-02 交付固定的到访信息管理模块，以《渠道往来测试表.xlsx》为业务样本，表格标题为「学员到访跟踪表」，字段包括姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期、咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间；本里程碑采用固定业务模块，不复用自定义表单模板作为主数据模型。
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
| 审批流程配置采用单步/串行节点模型，先不引入 BPMN/并行/条件流 | ✓ Phase 16 流程配置 API 和 UI 完成 |
| 发布中的需审批模板绑定流程后，流程停用/删除/完整编辑停用都必须被阻止 | ✓ Phase 16 16-09 gap closure 已回归覆盖 |
| 内部审批申请必须走 authenticated `/api/v1/approval/applications`，不复用公开 `/f/:code` | ✓ Phase 17 service/routes/store/UI 完成 |
| 我的申请详情始终渲染提交时 `schemaSnapshot` + `formData`，不读取当前模板 schema | ✓ Phase 17 detail page 完成 |
| v2.0 MVP 外部通知集成和附件字段后置 | — Pending |
| 到访信息采用固定 `VisitRecord` 模型 | ✓ 样表字段稳定，筛选和统计维度明确，比复用 JSONB 表单更直接 |
| Excel 导入由前端解析后提交标准化 JSON | ✓ 不引入后端文件存储，降低部署复杂度 |
| 到访状态字段先按字符串存储 | ✓ 避免过早枚举化丢失业务表达 |
| 到访导入只提示潜在重复，不自动合并 | ✓ 样表缺少唯一线索标识，避免误伤数据 |
| 到访统计口径由后端统一计算 | ✓ 意向/签约计数和转化率由 `/visits/stats` 产出，前端只格式化 |
| 到访统计空值统一归入 `未填写` | ✓ 避免渠道、人员和状态维度合计难以解释 |

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
*Last updated: 2026-05-02 after v1.3 milestone archival; v2.0 history preserved from 2026-04-25/26*
