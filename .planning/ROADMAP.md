# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 自定义表单收集** — Phases 7-9 (shipped 2026-04-20) → [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 模板管理优化** — Phases 10-14 (shipped 2026-04-22) → [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v2.0 表单驱动 OA 审批中心** — Phases 15-19 (implemented through 2026-04-26; Phase 18 verification pending)
- ✅ **v1.3 到访信息管理** — Phases 20-23 (shipped 2026-05-02) → [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 报销管理** — Phases 24-27 (shipped 2026-05-03; manual UAT passed) → [archive](milestones/v1.4-ROADMAP.md)
- ⏸️ **v1.5 工作记录管理** — Phases 28-31 (deferred 2026-05-05; planning only, no code) → [archive](milestones/v1.5-ROADMAP.md)
- 🚧 **v1.6 渠道商信息推送** — Phases 32-36 (planning started 2026-05-05)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: 基础脚手架 — docker-compose + backend/frontend 骨架 + /health
- [x] Phase 2: 数据层 + 认证 (2 plans) — 双 JWT 实例 + Prisma schema + 前端登录
- [x] Phase 3: 组织架构 CRUD (5 plans) — 部门树 + 用户 CRUD + 设计系统
- [x] Phase 4: RBAC (5 plans) — 角色管理 + 权限分配 + v-perm 指令
- [x] Phase 5: 响应式体验 (5 plans) — PC/Mobile 双布局 + 暗色模式
- [x] Phase 6: Docker 化 + 文档 (3 plans) — Dockerfile + 部署脚本 + README

</details>

<details>
<summary>✅ v1.1 自定义表单收集 (Phases 7-9) — SHIPPED 2026-04-20</summary>

- [x] Phase 7: 模板管理 + 表单设计器 (5 plans) — 3-panel 拖拽设计器 + 7 种字段类型 + 签名
- [x] Phase 8: 分享链接 + 公开填写 (4 plans) — 分享链接/二维码 + 免登录填写 + 数据归档
- [x] Phase 9: 数据查看 + 打印 + 统计 (4 plans) — 列表/详情 + 打印/PDF + 统计面板

</details>

<details>
<summary>✅ v1.2 模板管理优化 (Phases 10-14) — SHIPPED 2026-04-22</summary>

- [x] Phase 10: Schema 与核心渲染器 (4 plans) — v2 schema 类型 + GridFormRenderer + 版本分发
- [x] Phase 11: 设计器栅格编辑 (3 plans) — 12 列栅格画布 + 拖拽/调整跨列
- [x] Phase 12: 分组与动态行表格 (4 plans) — 分组区块 + 动态行表格三模式
- [x] Phase 13: PDF 保真输出 (3 plans) — table 转换 + 智能分页 + 中文字体栈
- [x] Phase 14: 响应式填写页 (2 plans) — PC 栅格还原 + 移动端单列 + 卡片布局

</details>

### ✅ v2.0 表单驱动 OA 审批中心 (Implemented; Phase 18 verification pending)

**Milestone Goal:** 在既有模板、填写、PDF 和组织架构基础上，建立登录用户可用的 OA 审批闭环，让内部表单从“收集数据”升级为“提交申请、流转审批、跟进处理、归档统计”。

- [x] **Phase 15: 审批数据模型与状态机** - 流程定义、审批实例、任务、动作、时间线、快照和合法状态流转 (completed 2026-04-25)
- [x] **Phase 16: 流程配置与模板绑定** - 审批模式、单步/串行流程配置、部门负责人、RBAC 和动态必填/schema 版本 (completed 2026-04-25)
- [x] **Phase 17: 我的申请与动态提交** - 登录提交、草稿、我的申请、申请详情、状态跟踪和撤销 (completed 2026-04-25)
- [ ] **Phase 18: 待我审批与移动审批** - 待办列表、筛选、审批详情、通过/驳回/意见、已办历史和移动端操作 (implemented; verification pending 2026-04-26)
- [x] **Phase 19: 收集后处理、归档导出统计** - 标签/标记、备注、受控编辑、处理字段、站内通知、归档查询、Excel/PDF 导出和统计 (completed 2026-04-26)

## Phase Details

### Phase 15: 审批数据模型与状态机
**Goal**: 建立 v2.0 审批中心的后端基础，使申请、流程、任务、时间线和状态流转有可信数据模型
**Depends on**: Phase 14 (v1.2 responsive fill complete)
**Requirements**: MODEL-01, MODEL-02, MODEL-03, MODEL-04
**Success Criteria** (what must be TRUE):
  1. Prisma schema 可表达流程定义、节点、审批实例、任务、动作和时间线事件，并通过 migration
  2. 审批申请创建时保存表单 schema 快照和流程配置快照
  3. 状态机拒绝非法状态跳转，并覆盖 draft/submitted/approving/approved/rejected/canceled
  4. 提交、分配、审批、驳回、撤销、编辑、标记和备注事件都可追加记录操作者、节点、动作、意见和时间
  5. 后端服务/API 测试覆盖首个任务创建、串行推进、终态关闭待办和非法操作拒绝
**Plans:** 3/3 plans complete

### Phase 16: 流程配置与模板绑定
**Goal**: 管理员可无代码配置审批流程并绑定到模板，同时保留既有仅收集模板
**Depends on**: Phase 15
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, DYN-01, DYN-02
**Success Criteria** (what must be TRUE):
  1. 模板可选择 `COLLECTION_ONLY` 或 `APPROVAL_REQUIRED`，既有公开收集路径不回归
  2. 管理员可配置单步审批和串行多步审批，节点支持固定用户、角色和提交人部门负责人
  3. 部门负责人/默认审批人可在组织架构中维护，并可被流程配置引用
  4. 审批相关 RBAC 权限完成种子数据、后端校验和前端菜单/按钮控制
  5. 模板必填字段在 PC/Mobile 一致校验，发布后字段变更形成新的 schema 版本
**Plans:** 9/9 plans complete
**Verification:** passed — 12/12 must-haves verified after 16-09 gap closure; see `16-VERIFICATION.md`
Plans:
- [x] 16-01-PLAN.md — Wave 0 backend tests for process config, template mode, required validation, and approval RBAC
- [x] 16-02-PLAN.md — Prisma schema, migration, and blocking generate/migrate gate
- [x] 16-03-PLAN.md — Backend approval process validation, snapshot resolution, and process routes
- [x] 16-04-PLAN.md — Department default approver API and approval permission seed data
- [x] 16-05-PLAN.md — Template binding backend, public collection safeguards, and backend required-field validation
- [x] 16-06-PLAN.md — Frontend approval process store, page, route, and navigation
- [x] 16-07-PLAN.md — Frontend template purpose badges, filters, designer binding, and disconnect confirmation
- [x] 16-08-PLAN.md — Frontend department approver UI and shared required-field validation
- [x] 16-09-PLAN.md — Gap closure for full process edit deactivation guard
**UI hint**: yes

### Phase 17: 我的申请与动态提交
**Goal**: 登录员工可用已有表单渲染能力提交内部申请、保存草稿并追踪自己的申请状态
**Depends on**: Phase 15, Phase 16
**Requirements**: APP-01, APP-02, APP-03, APP-04, APP-05
**Success Criteria** (what must be TRUE):
  1. 登录用户可从审批模板创建申请，申请记录绑定申请人、部门、模板、状态、当前节点和申请编号
  2. 草稿可保存、继续编辑和提交，草稿不会创建待审批任务
  3. “我的申请”支持按草稿、审批中、已通过、已驳回、已撤销和时间范围筛选
  4. 申请详情展示表单数据、当前状态、当前节点、审批时间线和意见
  5. 申请人可在规则允许时撤销未终审申请，撤销后待办关闭且时间线可见
**Plans:** 5/5 plans complete
**Verification:** passed — APP-01 through APP-05 verified with backend service/route tests, frontend store tests, builds, and mocked responsive Playwright smoke; see `17-VERIFICATION.md`
Plans:
- [x] 17-01-PLAN.md — Backend employee application service helpers and tests
- [x] 17-02-PLAN.md — Authenticated approval application API routes
- [x] 17-03-PLAN.md — Frontend DTOs, status helpers, and Pinia store
- [x] 17-04-PLAN.md — My Applications list, template picker, form, routes, and navigation
- [x] 17-05-PLAN.md — Application detail, timeline, cancel flow, and responsive smoke
**UI hint**: yes

### Phase 18: 待我审批与移动审批
**Goal**: 审批人可在 PC/Mobile 上高效处理待办，完整查看申请内容、时间线并提交审批意见
**Depends on**: Phase 17
**Requirements**: APR-01, APR-02, APR-03, APR-04, APR-05, APR-06
**Success Criteria** (what must be TRUE):
  1. “待我审批”列表只展示当前用户有权处理的任务，并支持模板、申请人、部门、状态和日期筛选
  2. 审批详情按提交时 schema 快照渲染表单数据，并展示当前节点和完整时间线
  3. 审批人可通过/驳回并填写意见，系统正确推进下一节点或进入终态
  4. 审批人可查看已处理历史，已办记录与待办清晰分离
  5. 移动端审批详情有可读时间线和 sticky 操作区，长表单、动态表格、签名字段不遮挡操作
  6. 审批人可添加内部处理备注，备注不修改原始提交数据
**Plans:** 5/5 plans complete
Plans:
- [x] 18-01-PLAN.md — Wave 0 backend/frontend regression contracts for task queue, action APIs, mobile detail, and internal remark visibility
- [x] 18-02-PLAN.md — Backend `/approval/tasks` service/routes, delegated action wrappers, and applicant-side internal remark filtering
- [x] 18-03-PLAN.md — Frontend approval-task DTOs, helpers, and Pinia store
- [x] 18-04-PLAN.md — Responsive approver inbox page plus `/approval/tasks` route and menu integration
- [x] 18-05-PLAN.md — Approval task detail, timeline/internal remark rendering, and sticky mobile action flows
**UI hint**: yes

### Phase 19: 收集后处理、归档导出统计
**Goal**: 授权人员可对审批/收集记录做后续处理、归档查询、导出和统计，形成业务闭环
**Depends on**: Phase 18
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07
**Success Criteria** (what must be TRUE):
  1. 授权人员可添加标签/标记和内部备注，列表与详情均可查看和筛选
  2. 授权人员可按规则编辑提交后数据或处理字段，必须填写原因并记录字段级 before/after 历史
  3. 管理员可为模板启用处理字段，处理字段默认不改变申请人正式提交内容
  4. 归档视图支持按模板、部门、申请人、状态、日期、标签/标记查询
  5. 授权人员可导出列表 Excel，并复用现有 PDF/打印能力导出单个申请详情
  6. 管理员可查看按模板、状态、部门和月份聚合的基础统计
  7. 站内通知覆盖新待办、通过、驳回和未读数量
**Plans:** 10/10 plans complete
**Verification:** passed — 9/9 must-haves verified after applicant internal-event visibility gap closure; see `19-VERIFICATION.md`
Plans:
- [x] 19-01-PLAN.md — Wave 0 backend contracts for archive operations, export, stats, notifications, and permissions
- [x] 19-02-PLAN.md — Wave 0 frontend contracts for archive DTO/store/page/detail and notifications
- [x] 19-03-PLAN.md — Data model, ExcelJS dependency, permissions, and blocking Prisma generate/migrate gate
- [x] 19-04-PLAN.md — Frontend archive/notification DTOs, stores, and any-permission route guard support
- [x] 19-05-PLAN.md — Backend archive operations, template processing config, and archive route registration
- [x] 19-06-PLAN.md — Backend transaction-bound in-app notifications and notification routes
- [x] 19-07-PLAN.md — Backend Excel export and archive statistics routes
- [x] 19-08-PLAN.md — Archive query/detail/statistics UI, route wiring, and navigation entry
- [x] 19-09-PLAN.md — Template processing-field configuration UI
- [x] 19-10-PLAN.md — Header notification badge, list, polling, navigation, and mark-read UI
**UI hint**: yes

### ✅ v1.3 到访信息管理 (Shipped 2026-05-02)

Archived to [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) and [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md).

<details>
<summary>✅ v1.4 报销管理 (Phases 24-27) — SHIPPED 2026-05-03</summary>

- [x] Phase 24: 报销数据模型 + 附件上传 API (4/4 plans) — completed 2026-05-03
- [x] Phase 25: 员工报销申请与详情页面 (4/4 plans) — completed 2026-05-03
- [x] Phase 26: 两级审核与手写签字 (4/4 plans) — completed 2026-05-03
- [x] Phase 27: 报销导出 + 验证收尾 (4/4 plans) — completed 2026-05-03; manual UAT passed

Archived to [v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) and [v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md).

</details>

### ⏸️ v1.5 工作记录管理 (Deferred 2026-05-05)

Deferred before implementation — Phase 28 planning artefacts were produced (CONTEXT/RESEARCH/PLAN/TASKS/LOG), but no code was shipped. Phases 29-31 never passed planning.

Archived to [v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md) and [v1.5-REQUIREMENTS.md](milestones/v1.5-REQUIREMENTS.md). Planning files kept under `milestones/v1.5-phases/28-api/` for resume.

**Resume path:** 见 `milestones/v1.5-ROADMAP.md` 中 "Resume Path" 小节。

### 🚧 v1.6 渠道商信息推送 (Planning started 2026-05-05)

**Milestone Goal:** 让外部渠道商通过本系统向绑定的内部接收人推送学员信息，由接收人审核闭环；推送数据独立沉淀和查询，不与 v1.3 到访记录混用。

- [x] **Phase 32: 渠道推送数据模型 + 后端 API + RBAC** — ChannelPush Prisma 模型、CHANNEL_PARTNER 角色、5 个权限码、渠道商 CRUD/绑定接收人、推送提交/查询/编辑/撤回 API、附件存储复用 v1.4 模式 (completed 2026-05-05)
- [x] **Phase 33: 渠道商提交体验 + 我的推送 UI** — 渠道商专用菜单和路由守卫、单条提交表单、附件上传、我的推送列表、详情、编辑/撤回、重复提示 UI (completed 2026-05-06)
- [x] **Phase 34: Excel 批量推送导入** — 复用 v1.3 解析体验、表头约定、预览、有效/无效行展示、批量提交、独立审核流 (completed 2026-05-07)
- [ ] **Phase 35: 接收人审核 UI + 内部补充字段** — 「待我审核」列表/详情、内部补充字段 UI、通过/驳回 + 必填驳回意见、已审核历史、PC 表格 + Mobile 卡片
- [ ] **Phase 36: 站内通知集成 + 跨角色可见性 + 验证收尾** — 渠道推送通知类型、铃铛跳转、渠道商通知接收、部门负责人/上级/ADMIN 只读可见性、端到端验证与归档


### Phase 32: 渠道推送数据模型 + 后端 API + RBAC

**Goal**: 建立 v1.6 渠道商信息推送的后端基础——固定 ChannelPush 数据模型、CHANNEL_PARTNER 角色与 5 个权限码、渠道商账号开通与接收人绑定 API、推送提交/查询/编辑/撤回端点和附件存储管线。
**Depends on**: Phase 27 (v1.4 shipped — 报销附件存储与 RBAC 模式可复用)
**Requirements**: PARTNER-01, PARTNER-02, PARTNER-03, PUSH-01, PUSH-02, PUSH-05, PUSH-06, DEDUP-01, REVIEW-04, REVIEW-06, PERM-01, PERM-02, PERM-03
**Plans**: 4 plans (estimated)
**Success Criteria** (what must be TRUE):
  1. Prisma `ChannelPush`、`ChannelPushAttachment`、`ChannelPushReviewAction` 模型与 migration 落地，包含状态机字段和审核时间线
  2. CHANNEL_PARTNER 角色和 channelPush:create / viewOwn / cancel / review / viewScope 权限码完成种子数据
  3. 管理员可通过 API 开通渠道商账号、绑定 1 个内部主接收人并支持禁用/启用
  4. 渠道商可通过 `/api/v1/channel-push` 提交（含附件）、查询自己的推送、编辑和撤回（仅待审核状态）
  5. 后端按 (姓名, 手机号) 在响应中返回潜在重复提示数据，但不阻止提交
  6. 后端服务/路由测试覆盖创建/查询/编辑/撤回/重复检测和非法状态拒绝
**UI hint**: no

### Phase 33: 渠道商提交体验 + 我的推送 UI

**Goal**: 渠道商可在 PC/Mobile 完成推送提交、附件上传，并在「我的推送」列表/详情中追踪自己的推送状态、编辑/撤回待审核记录、看到重复提示。
**Depends on**: Phase 32
**Requirements**: PARTNER-04, PARTNER-05, PUSH-01, PUSH-02, PUSH-05, PUSH-06, DEDUP-01, DEDUP-02, NOTIF-03
**Plans**: 4 plans (estimated)
**Success Criteria** (what must be TRUE):
  1. 渠道商登录后只可见「我的推送」相关菜单，访问员工业务路径被前端守卫和后端权限拦截
  2. PC/Mobile 提交表单覆盖学员姓名、手机号、年龄、学历、性别、意向、备注和附件 0~N 上传
  3. 提交时按 (姓名, 手机号) 命中重复立即提示冲突条目，但允许继续提交
  4. 「我的推送」列表支持关键字搜索、状态筛选、时间范围筛选，并能进入详情查看处理状态、驳回原因和审核时间
  5. 待审核状态记录可编辑/撤回，终态记录按钮禁用并提示原因
**UI hint**: yes

### Phase 34: Excel 批量推送导入

**Goal**: 渠道商可使用 Excel 批量推送学员信息，复用 v1.3 解析与预览体验，每条推送独立进入审核流。
**Depends on**: Phase 33
**Requirements**: PUSH-03, PUSH-04
**Plans**: 2 plans (estimated)
**Success Criteria** (what must be TRUE):
  1. 渠道商可上传 `.xlsx`，系统按约定的标题/表头/数据行解析并提供预览，标识有效行/无效行和错误原因
  2. 用户确认后系统按行批量创建独立 ChannelPush 记录，并返回成功/失败计数和失败原因
  3. 批量提交结果在「我的推送」列表中出现，每条独立可审核、可编辑/撤回（仅待审核态）
  4. 重复提示对批量导入同样适用（DEDUP-01 复用），不会自动跳过或合并
**UI hint**: yes

### Phase 35: 接收人审核 UI + 内部补充字段

**Goal**: 主接收人可在 PC/Mobile 处理「待我审核」推送，补充内部字段、通过/驳回（必填意见）并查看已审核历史。
**Depends on**: Phase 34
**Requirements**: REVIEW-01, REVIEW-03, REVIEW-04, REVIEW-05, REVIEW-06, REVIEW-07, PERM-04
**Plans**: 4 plans (estimated)
**Success Criteria** (what must be TRUE):
  1. 主接收人在「待我审核」列表看到当前作为主接收人的待审推送，可按渠道商、状态、时间范围筛选
  2. 推送详情页展示渠道商提交字段、附件预览、重复提示信息和审核时间线
  3. 主接收人可在审核前补充内部字段（计划接待人、预期接待日期、内部备注）；补充字段不修改原始提交，仅对内部可见
  4. 通过/驳回操作仅对当前主接收人开放；驳回必须填写意见，通过可选填备注；操作后状态机转为终态
  5. 「已审核」历史按状态/时间筛选，PC 表格 + Mobile 卡片均可用
  6. 审核结果只更新推送记录与时间线，不创建到访记录或与 VisitRecord 联动
**UI hint**: yes

### Phase 36: 站内通知集成 + 跨角色可见性 + 验证收尾

**Goal**: 完成 v1.6 通知闭环（双向）、跨角色只读可见性（部门负责人/上级/ADMIN）、端到端 UAT 与归档。
**Depends on**: Phase 35
**Requirements**: REVIEW-02, NOTIF-01, NOTIF-02, NOTIF-04
**Plans**: 3 plans (estimated)
**Success Criteria** (what must be TRUE):
  1. 渠道商提交推送后主接收人立即收到「渠道推送待审核」站内通知，铃铛未读数 +1，点击跳转到审核详情
  2. 渠道商在自己推送被通过/驳回时收到「我的推送已审核」站内通知，跳转到我的推送详情
  3. 主接收人所在部门负责人、上级部门负责人和超级管理员可只读查看名下/全部推送，但通过/驳回操作按钮和 API 仅对主接收人放行
  4. v1.6 端到端验证：focused 后端测试 + 前端 contract/build + 手动 UAT，并将 v1.6 closeout 摘要写入 MILESTONES.md
**UI hint**: yes


## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 25/25 | Complete | 2026-04-20 |
| 7. 模板管理 + 表单设计器 | v1.1 | 5/5 | Complete | 2026-04-20 |
| 8. 分享链接 + 公开填写 | v1.1 | 4/4 | Complete | 2026-04-20 |
| 9. 数据查看 + 打印 + 统计 | v1.1 | 4/4 | Complete | 2026-04-20 |
| 10. Schema 与核心渲染器 | v1.2 | 4/4 | Complete | 2026-04-21 |
| 11. 设计器栅格编辑 | v1.2 | 3/3 | Complete | 2026-04-21 |
| 12. 分组与动态行表格 | v1.2 | 4/4 | Complete | 2026-04-21 |
| 13. PDF 保真输出 | v1.2 | 3/3 | Complete | 2026-04-22 |
| 14. 响应式填写页 | v1.2 | 2/2 | Complete | 2026-04-22 |
| 15. 审批数据模型与状态机 | v2.0 | 3/3 | Complete    | 2026-04-25 |
| 16. 流程配置与模板绑定 | v2.0 | 9/9 | Complete    | 2026-04-25 |
| 17. 我的申请与动态提交 | v2.0 | 5/5 | Complete | 2026-04-25 |
| 18. 待我审批与移动审批 | v2.0 | 5/5 | Verification Pending |  |
| 19. 收集后处理、归档导出统计 | v2.0 | 10/10 | Complete   | 2026-04-26 |
| 20. 到访数据模型 + 后端 API | v1.3 | 3/3 | Complete | 2026-05-02 |
| 21. 到访管理页面 + CRUD 筛选 | v1.3 | 3/3 | Complete | 2026-05-02 |
| 22. Excel 导入解析 + 预览入库 | v1.3 | 2/2 | Complete    | 2026-05-02 |
| 23. 统计面板 + 转化汇总 | v1.3 | 2/2 | Complete | 2026-05-02 |
| 24. 报销数据模型 + 附件上传 API | v1.4 | 4/4 | Complete | 2026-05-03 |
| 25. 员工报销申请与详情页面 | v1.4 | 4/4 | Complete | 2026-05-03 |
| 26. 两级审核与手写签字 | v1.4 | 4/4 | Complete | 2026-05-03 |
| 27. 报销导出 + 验证收尾 | v1.4 | 4/4 | Complete | 2026-05-03 |
| 28. 工作记录数据模型 + 后端 API | v1.5 | 0/4 | Deferred |  |
| 29. 员工填报页面 + 我的记录 | v1.5 | 0/4 | Deferred |  |
| 30. 部门汇总 + 管理视图 | v1.5 | 0/4 | Deferred |  |
| 31. 工作记录导出 + 验证收尾 | v1.5 | 0/3 | Deferred |  |
| 32. 渠道推送数据模型 + 后端 API + RBAC | v1.6 | 4/4 | Complete    | 2026-05-05 |
| 33. 渠道商提交体验 + 我的推送 UI | v1.6 | 4/4 | Complete    | 2026-05-06 |
| 34. Excel 批量推送导入 | v1.6 | 2/2 | Complete    | 2026-05-07 |
| 35. 接收人审核 UI + 内部补充字段 | v1.6 | 0/4 | Planned    |  |
| 36. 站内通知集成 + 跨角色可见性 + 验证收尾 | v1.6 | 0/3 | Pending |  |

## Current Coverage

**Active milestone:** v1.6 渠道商信息推送 (Phases 32-36) — 28 v1 requirements mapped across 5 phases (100% coverage). See [REQUIREMENTS.md](REQUIREMENTS.md) for detail; v1.5 archive remains at [milestones/v1.5-REQUIREMENTS.md](milestones/v1.5-REQUIREMENTS.md).
