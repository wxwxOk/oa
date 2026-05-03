# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 自定义表单收集** — Phases 7-9 (shipped 2026-04-20) → [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 模板管理优化** — Phases 10-14 (shipped 2026-04-22) → [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v2.0 表单驱动 OA 审批中心** — Phases 15-19 (implemented through 2026-04-26; Phase 18 verification pending)
- ✅ **v1.3 到访信息管理** — Phases 20-23 (shipped 2026-05-02) → [archive](milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 报销管理** — Phases 24-27 (requirements defined 2026-05-02)

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

### 🚧 v1.4 报销管理 (Active)

**Milestone Goal:** 新增固定报销管理模块，让员工提交报销申请、上传发票附件，并通过部门初审与财务复核两级审核签字形成可追踪闭环；本期交付明细导出，不做 OCR、付款和统计看板。

- [x] **Phase 24: 报销数据模型 + 附件上传 API** - schema/seed/API/附件已完成；Phase 24 focused backend verification green（completed 2026-05-03）
- [x] **Phase 25: 员工报销申请与详情页面** - PC/Mobile 申请表单、我的申请、附件预览下载、筛选和状态展示（completed 2026-05-03）
- [x] **Phase 26: 两级审核与手写签字** - 部门初审、财务复核、Canvas 签名、驳回原因和审核轨迹（completed 2026-05-03）
- [ ] **Phase 27: 报销导出 + 验证收尾** - 按筛选导出 Excel、权限校验、端到端 UAT 和文档归档

### Phase 24: 报销数据模型 + 附件上传 API
**Goal**: 建立报销固定业务模块的数据层、权限体系和后端接口，支撑提交、附件、查询和后续审核。
**Depends on**: Phase 23 (v1.3 shipped), Phase 19 (Excel export and RBAC patterns)
**Requirements**: REIM-01, REIM-02, REIM-03, REIM-04, INV-01, INV-02, INV-03, INV-04, PERM-01, PERM-02, PERM-03, NFR-01, NFR-02
**Success Criteria** (what must be TRUE):
  1. Prisma schema 可表达报销申请、附件、审核动作/轨迹和部门/财务审核状态，并通过 migration
  2. 后端权限码和菜单种子覆盖申请创建、查看、部门审核、财务审核、附件访问和导出
  3. API 支持创建/提交报销申请、分页筛选列表、详情、附件上传、图片预览和原文件下载
  4. 后端校验金额、必填字段、文件类型/大小和附件访问权限，禁止越权查看他人申请或附件
  5. 列表查询保持分页，常用筛选字段具备索引或可控查询条件
**Plans:** 4/4 complete; focused backend verification passed, with unrelated approval full-suite failures documented in `24-VERIFICATION.md`

Plans:
- [x] 24-01-PLAN.md — Wave 0 backend contracts for reimbursement seed, schema, route and file safety
- [x] 24-02-PLAN.md — Wave 1 schema, migration, seed and upload storage baseline
- [x] 24-03-PLAN.md — Wave 2 reimbursement application state/service/routes and `/api/v1` registration
- [x] 24-04-PLAN.md — Wave 3 attachment file service, upload/preview/download/delete and final backend gate

### Phase 25: 员工报销申请与详情页面
**Goal**: 员工可在 PC/Mobile 完成报销填写、上传发票并追踪自己的申请状态。
**Depends on**: Phase 24
**Requirements**: REIM-01, REIM-02, REIM-03, REIM-04, INV-01, INV-03, UX-01, UX-02, PERM-01, PERM-02
**Success Criteria** (what must be TRUE):
  1. 报销管理入口按权限显示，员工可创建申请并上传多张图片/PDF 附件
  2. 表单校验与后端口径一致，提交成功后进入部门初审且核心字段不可直接修改
  3. “我的报销”支持状态、类别、日期区间和关键词筛选，普通员工只看到自己的申请
  4. 详情页展示申请信息、附件列表、图片预览/PDF 下载和当前审核状态
  5. 移动端可完成提交、查看详情和附件操作，上传/提交失败有明确反馈
**Plans:** 4/4 complete; focused frontend verification and build passed
**Verification:** passed — focused Phase 25 contracts and `bun run build` green; full frontend suite has existing browser-global environment failures documented in `25-04-SUMMARY.md`

Plans:
- [x] 25-01-PLAN.md — Wave 0 frontend contracts for reimbursement types, store and page/source boundaries
- [x] 25-02-PLAN.md — Wave 1 reimbursement types, store, routes and menu
- [x] 25-03-PLAN.md — Wave 2 reimbursement fixed form and authenticated attachment UX
- [x] 25-04-PLAN.md — Wave 3 reimbursement list, detail, timeline and final frontend validation
**UI hint**: yes

### Phase 26: 两级审核与手写签字
**Goal**: 部门审核人员和财务审核人员可按两级流程完成报销审核、签字和驳回。
**Depends on**: Phase 25
**Requirements**: APPROVAL-01, APPROVAL-02, APPROVAL-03, APPROVAL-04, APPROVAL-05, PERM-01, PERM-02, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. 部门审核列表只展示待部门初审且当前用户有权处理的申请
  2. 部门初审通过后申请进入财务复核，驳回后申请进入已驳回并关闭后续待办
  3. 财务复核通过后申请进入已通过并记录最终通过时间，驳回后记录财务节点驳回信息
  4. 两个通过节点均必须采集 Canvas 手写签名，并保存签名图片、审核人、动作、意见和时间
  5. 申请详情展示提交、部门初审、财务复核、签字和驳回的完整审核轨迹
**Plans:** 4/4 complete

Plans:
- [x] 26-01-PLAN.md — Wave 0 review/signature contracts
- [x] 26-02-PLAN.md — Backend review queues/actions/signature routes
- [x] 26-03-PLAN.md — Frontend review types/store/signature/timeline
- [x] 26-04-PLAN.md — Reviewer queue/detail UX and final validation
**UI hint**: yes

### Phase 27: 报销导出 + 验证收尾
**Goal**: 财务或授权人员可按筛选条件导出报销明细，并完成 v1.4 端到端验证与归档。
**Depends on**: Phase 26
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, PERM-01, PERM-02, UX-02
**Success Criteria** (what must be TRUE):
  1. 有权限用户可按当前列表筛选条件导出 Excel，普通员工不能越权导出全部数据
  2. 导出列包含申请基础信息、附件数量、当前状态、部门审核结果、财务审核结果和最终通过时间
  3. 导出功能复用既有 Excel 工具链，返回文件名和错误信息清晰
  4. UAT 覆盖提交、附件访问、部门通过/驳回、财务通过/驳回和导出权限
  5. 完成 v1.4 需求覆盖检查、里程碑归档材料和后续需求记录
**Plans:** 2/4 complete

Plans:
- [x] 27-01-PLAN.md — Wave 0 export contracts
- [x] 27-02-PLAN.md — Backend export service and route
- [ ] 27-03-PLAN.md — Frontend export store and toolbar UX
- [ ] 27-04-PLAN.md — Final validation, UAT and v1.4 archive closeout
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
| 27. 报销导出 + 验证收尾 | v1.4 | 2/4 | Executing |  |

## Current Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| REIM-01 | Phase 24 + Phase 25 | Complete — backend + employee UI |
| REIM-02 | Phase 24 + Phase 25 | Complete — backend + employee UI |
| REIM-03 | Phase 24 + Phase 25 | Complete — backend + employee UI |
| REIM-04 | Phase 24 + Phase 25 | Complete — backend + employee UI |
| INV-01 | Phase 24 + Phase 25 | Complete — backend + employee upload UI |
| INV-02 | Phase 24 | Complete |
| INV-03 | Phase 24 + Phase 25 | Complete — authenticated preview/download backend + UI |
| INV-04 | Phase 24 | Complete |
| APPROVAL-01 | Phase 26 | Complete — department review queue and permission filtering |
| APPROVAL-02 | Phase 26 | Complete — department approve/reject transitions |
| APPROVAL-03 | Phase 26 | Complete — finance approve/reject transitions and completed time |
| APPROVAL-04 | Phase 26 | Complete — Canvas signature capture and protected signature evidence |
| APPROVAL-05 | Phase 26 | Complete — full submit/review/signature/reject timeline |
| EXPORT-01 | Phase 27 | Planned |
| EXPORT-02 | Phase 27 | Planned |
| EXPORT-03 | Phase 27 | Planned |
| PERM-01 | Phase 24 + Phase 25 + Phase 26 + Phase 27 | Phase 24 backend + Phase 25 frontend + Phase 26 review usage complete; Phase 27 export usage planned |
| PERM-02 | Phase 24 + Phase 25 + Phase 26 + Phase 27 | Phase 24 backend + Phase 25 frontend + Phase 26 review authorization complete; Phase 27 export authorization planned |
| PERM-03 | Phase 24 | Complete |
| UX-01 | Phase 25 + Phase 26 | Complete — employee UI and reviewer UI |
| UX-02 | Phase 25 + Phase 26 + Phase 27 | Phase 25 upload/submit feedback + Phase 26 review feedback complete; Phase 27 export feedback planned |
| NFR-01 | Phase 24 | Complete |
| NFR-02 | Phase 24 | Complete |

**Coverage:** 23/23 v1.4 requirements mapped, 0 unmapped.
