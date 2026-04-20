# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 自定义表单收集** — Phases 7-9 (in progress)

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

### 🚧 v1.1 自定义表单收集 (In Progress)

**Milestone Goal:** 将线下纸质信息登记表数字化 — 自定义模板、链接分享、外部免登录填写、数据归档查看打印、员工工作量统计

- [ ] **Phase 7: 模板管理 + 表单设计器** — DB 模型 + 模板 CRUD + 拖拽设计器 + 全字段类型 + 签名 + RBAC
- [ ] **Phase 8: 分享链接 + 公开填写** — 分享链接生成 + 二维码 + 免登录填写页 + 身份配置 + 数据归档
- [ ] **Phase 9: 数据查看 + 打印 + 统计** — 提交列表/详情 + 浏览器打印 + PDF 导出 + 员工统计

## Phase Details

### Phase 7: 模板管理 + 表单设计器
**Goal**: 管理员可创建、设计、发布表单模板，设计器支持拖拽排序和全部字段类型（含手写签名），模板修改自动版本化
**Depends on**: Phase 6 (v1.0 RBAC + 认证基础)
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05
**Success Criteria** (what must be TRUE):
  1. 用户可创建模板（填写名称和描述），可编辑和删除自己的模板，操作受 RBAC 权限控制
  2. 用户可在设计器中通过拖拽添加和排序字段，支持文本、多行文本、单选、多选、日期、手机号、手写签名全部字段类型
  3. 用户可配置每个字段的属性（必填、提示文字、选项列表），设计器右侧实时预览表单效果
  4. 用户可发布/下线模板，下线后模板不可被分享填写
  5. 修改已发布模板后 schema 版本自动递增，已收集的历史数据仍按原版本展示不受影响
**Plans**: 5 plans
Plans:
- [x] 07-01-PLAN.md — Backend: Prisma FormTemplate model + CRUD/publish API + permission seeds
- [x] 07-02-PLAN.md — Frontend: Template list page (QTable) + Pinia store + route registration
- [x] 07-03-PLAN.md — Frontend: 3-panel form designer (palette + canvas + property editor)
- [x] 07-04-PLAN.md — Frontend: SignatureField component + dependency install + sidebar nav
- [x] 07-05-PLAN.md — Checkpoint: End-to-end human verification walkthrough
**UI hint**: yes

### Phase 8: 分享链接 + 公开填写
**Goal**: 员工可为已发布模板生成分享链接和二维码，外部人员通过链接免登录填写表单（含签名），提交数据自动归档
**Depends on**: Phase 7
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05
**Success Criteria** (what must be TRUE):
  1. 用户可为已发布模板生成唯一分享链接，系统记录分享人和分享时间
  2. 分享链接可生成二维码，扫码后直接打开填写页面
  3. 外部人员通过浏览器打开分享链接，无需登录即可填写表单并提交（含手写签名）
  4. 模板可配置是否要求填写者提供身份信息（姓名/手机号），配置后填写页相应展示身份字段
  5. 填写者提交后数据自动归档存储，关联模板版本快照和分享记录
**Plans**: 4 plans
Plans:
- [x] 08-01-PLAN.md — 数据层：Prisma ShareLink + Submission 模型 + 依赖安装 + DB push
- [x] 08-02-PLAN.md — 后端 API：分享链接创建端点 + 公开填写/提交 API
- [x] 08-03-PLAN.md — 前端管理端：ShareDialog + 分享按钮 + 身份信息开关
- [x] 08-04-PLAN.md — 公开填写页：FormFieldRenderer + PublicFillPage + 路由 + 端到端验证
**UI hint**: yes

### Phase 9: 数据查看 + 打印 + 统计
**Goal**: 有权限的用户可查看、筛选、打印所有提交数据，并查看员工分享/收集工作量统计
**Depends on**: Phase 8
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. 有权限的用户可查看某模板下所有提交数据列表，支持分页和按填写者/日期筛选
  2. 用户可点击查看单条提交的完整详情（含签名图片和所有字段值）
  3. 用户可通过浏览器打印提交数据，打印排版接近纸质表格效果
  4. 用户可将提交数据导出为 PDF 文件保存
  5. 用户可查看基础统计面板：每个员工的分享次数和收集数量
**Plans**: 4 plans
Plans:
- [x] 09-01-PLAN.md — 后端 API：权限种子 + 提交数据查询 + 员工统计聚合
- [x] 09-02-PLAN.md — 前端基础层：npm 依赖安装 + submission store + 打印样式 + PDF 导出
- [x] 09-03-PLAN.md — 前端页面：SubmissionPage 列表+详情抽屉+打印+PDF 导出+路由+入口
- [x] 09-04-PLAN.md — 统计面板：FormStatsPanel 表格+图表 + Dashboard 嵌入
**UI hint**: yes

## Progress

**Execution Order:** Phase 7 → Phase 8 → Phase 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 25/25 | Complete | 2026-04-20 |
| 7. 模板管理 + 表单设计器 | v1.1 | 5/5 | Complete | 2026-04-20 |
| 8. 分享链接 + 公开填写 | v1.1 | 0/4 | Planning complete | - |
| 9. 数据查看 + 打印 + 统计 | v1.1 | 0/4 | Planning complete | - |
