# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 自定义表单收集** — Phases 7-9 (shipped 2026-04-20) → [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 模板管理优化** — Phases 10-14 (shipped 2026-04-22) → [archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v2.0 表单驱动 OA 审批中心** — Phases 15-19 (defining requirements)

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

### 🚧 v2.0 表单驱动 OA 审批中心 (Defining Requirements)

**Milestone Goal:** 在既有模板、填写、PDF 和组织架构基础上，建立登录用户可用的 OA 审批闭环，让内部表单从“收集数据”升级为“提交申请、流转审批、跟进处理、归档统计”。

- [x] **Phase 15: 审批数据模型与状态机** - 流程定义、审批实例、任务、动作、时间线、快照和合法状态流转 (completed 2026-04-25)
- [ ] **Phase 16: 流程配置与模板绑定** - 审批模式、单步/串行流程配置、部门负责人、RBAC 和动态必填/schema 版本
- [ ] **Phase 17: 我的申请与动态提交** - 登录提交、草稿、我的申请、申请详情、状态跟踪和撤销
- [ ] **Phase 18: 待我审批与移动审批** - 待办列表、筛选、审批详情、通过/驳回/意见、已办历史和移动端操作
- [ ] **Phase 19: 收集后处理、归档导出统计** - 标签/标记、备注、受控编辑、处理字段、站内通知、归档查询、Excel/PDF 导出和统计

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
**Plans:** 1/8 plans executed
Plans:
- [x] 16-01-PLAN.md — Wave 0 backend tests for process config, template mode, required validation, and approval RBAC
- [ ] 16-02-PLAN.md — Prisma schema, migration, and blocking generate/migrate gate
- [ ] 16-03-PLAN.md — Backend approval process validation, snapshot resolution, and process routes
- [ ] 16-04-PLAN.md — Department default approver API and approval permission seed data
- [ ] 16-05-PLAN.md — Template binding backend, public collection safeguards, and backend required-field validation
- [ ] 16-06-PLAN.md — Frontend approval process store, page, route, and navigation
- [ ] 16-07-PLAN.md — Frontend template purpose badges, filters, designer binding, and disconnect confirmation
- [ ] 16-08-PLAN.md — Frontend department approver UI and shared required-field validation
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
**Plans:** pending
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
**Plans:** pending
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
**Plans:** pending
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
| 16. 流程配置与模板绑定 | v2.0 | 1/8 | In Progress|  |
| 17. 我的申请与动态提交 | v2.0 | 0/? | Pending |  |
| 18. 待我审批与移动审批 | v2.0 | 0/? | Pending |  |
| 19. 收集后处理、归档导出统计 | v2.0 | 0/? | Pending |  |
