# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 自定义表单收集** — Phases 7-9 (shipped 2026-04-20) → [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 模板管理优化** — Phases 10-14 (shipped 2026-04-22) → [archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 到访信息管理** — Phases 15-18 (planned)

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

### 🚧 v1.3 到访信息管理 (Planned)

**Milestone Goal:** 新增固定的到访信息管理模块，承接渠道往来测试表中的学员到访、咨询接待、试听跟进和成交状态管理。

- [ ] **Phase 15: 到访数据模型 + 后端 API** (3 plans) — VisitRecord 模型、权限种子、CRUD/筛选/统计/导入端点骨架
- [ ] **Phase 16: 到访管理页面 + CRUD 筛选** (3 plans) — 独立菜单、PC 表格、移动卡片、新建/编辑/详情、筛选项
- [ ] **Phase 17: Excel 导入解析 + 预览入库** (2 plans) — SheetJS 解析第 2 行表头、导入预览、重复提醒、批量创建
- [ ] **Phase 18: 统计面板 + 转化汇总** (2 plans) — 渠道/人员/状态维度统计、日期筛选、图表和摘要卡片

## Phase Details

### Phase 15: 到访数据模型 + 后端 API
**Goal**: 建立到访固定业务模块的数据层、权限体系和后端接口，供前端页面和导入功能复用。
**Depends on**: Phase 14 (v1.2 complete)
**Requirements**: VISIT-01, PERM-01, PERM-02
**Success Criteria**:
1. `VisitRecord` Prisma model 映射样表 15 列字段，并包含 `creatorId`、`createdAt`、`updatedAt` 与常用筛选索引。
2. seed 权限包含 `visit:list/create/update/delete/import/stats`，ADMIN 可获得全部到访权限。
3. `visitModule` 注册到 `/api/v1/visits`，提供列表、详情、新建、编辑、删除、筛选项、统计、导入端点。
4. 后端端点按权限码分别鉴权，写入接口使用 Elysia `t.Object` 做请求体验证。

### Phase 16: 到访管理页面 + CRUD 筛选
**Goal**: 交付可日常使用的到访管理页面，支持记录维护、筛选和响应式查看。
**Depends on**: Phase 15
**Requirements**: VISIT-02, VISIT-03, VISIT-04, QUERY-01, QUERY-02, QUERY-03, QUERY-04
**Success Criteria**:
1. `/visits` 独立菜单按 `visit:list` 显示，页面可分页加载到访记录。
2. PC 端使用 QTable，移动端使用卡片列表；长文本字段在列表中摘要展示，详情/编辑弹窗完整展示。
3. 筛选支持关键词、渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别、接待日期区间。
4. 新建、编辑、删除按钮分别按 `visit:create/update/delete` 控制显隐并调用对应 API。

### Phase 17: Excel 导入解析 + 预览入库
**Goal**: 支持导入《渠道往来测试表.xlsx》格式，将存量 Excel 台账安全转为系统到访记录。
**Depends on**: Phase 15, Phase 16
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04
**Success Criteria**:
1. 前端安装并使用 `xlsx`，通过 FileReader `readAsArrayBuffer` 解析首个 sheet。
2. 导入逻辑忽略第 1 行合并标题，严格校验第 2 行 15 列表头，第 3 行起解析数据。
3. 导入预览展示有效行、无效行、错误原因和按「姓名 + 接待日期 + 咨询师」识别的潜在重复提醒。
4. 用户确认后仅提交有效标准化 rows，后端二次校验并批量创建，返回导入数量。

### Phase 18: 统计面板 + 转化汇总
**Goal**: 为管理者提供渠道、人员和状态维度的到访质量与转化概览。
**Depends on**: Phase 15, Phase 16
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria**:
1. 统计接口按接待日期区间过滤，并返回渠道商、咨询师、接待人、状态分布聚合数据。
2. 统计面板展示到访数量、意向数量、签约类数量和转化概览。
3. 状态分布覆盖咨询后状态、状态类别、试听课后状态。
4. 图表和摘要卡片复用现有 Quasar + vue-chartjs 模式，按钮入口按 `visit:stats` 控制。

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
| 15. 到访数据模型 + 后端 API | v1.3 | 0/3 | Planned | — |
| 16. 到访管理页面 + CRUD 筛选 | v1.3 | 0/3 | Planned | — |
| 17. Excel 导入解析 + 预览入库 | v1.3 | 0/2 | Planned | — |
| 18. 统计面板 + 转化汇总 | v1.3 | 0/2 | Planned | — |

## Current Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| VISIT-01 | Phase 15 | Pending |
| VISIT-02 | Phase 16 | Pending |
| VISIT-03 | Phase 16 | Pending |
| VISIT-04 | Phase 16 | Pending |
| QUERY-01 | Phase 16 | Pending |
| QUERY-02 | Phase 16 | Pending |
| QUERY-03 | Phase 16 | Pending |
| QUERY-04 | Phase 16 | Pending |
| IMPORT-01 | Phase 17 | Pending |
| IMPORT-02 | Phase 17 | Pending |
| IMPORT-03 | Phase 17 | Pending |
| IMPORT-04 | Phase 17 | Pending |
| STAT-01 | Phase 18 | Pending |
| STAT-02 | Phase 18 | Pending |
| STAT-03 | Phase 18 | Pending |
| STAT-04 | Phase 18 | Pending |
| PERM-01 | Phase 15 | Pending |
| PERM-02 | Phase 15 | Pending |

**Coverage:** 18/18 v1.3 requirements mapped, 0 unmapped.
