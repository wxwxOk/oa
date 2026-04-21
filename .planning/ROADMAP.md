# Roadmap - OA 管理系统

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-20) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 自定义表单收集** — Phases 7-9 (shipped 2026-04-20) → [archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 模板管理优化** — Phases 10-14 (in progress)

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

### 🚧 v1.2 模板管理优化 (In Progress)

**Milestone Goal:** 升级表单设计器为 12 列栅格布局引擎，支持分组标题、动态行表格、PDF 保真输出、响应式填写页

- [x] **Phase 10: Schema 与核心渲染器** - 新 schema 类型定义 + 统一 GridFormRenderer + 版本分发 (completed 2026-04-21)
- [ ] **Phase 11: 设计器栅格编辑** - DesignerCanvas 重写为 12 列栅格编辑器 + 拖拽/调整跨列
- [ ] **Phase 12: 分组与动态行表格** - 分组区块 + 动态行表格的设计器/填写/打印三模式
- [ ] **Phase 13: PDF 保真输出** - PrintableForm 表格化渲染 + 中文字体 + 分页控制
- [ ] **Phase 14: 响应式填写页** - PC 端栅格还原 + 移动端自动单列 + 动态表格卡片布局

## Phase Details

### Phase 10: Schema 与核心渲染器
**Goal**: 建立 v1.2 schema 类型体系和统一渲染引擎，使新旧模板均可正确渲染
**Depends on**: Phase 9 (v1.1 complete)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03
**Success Criteria** (what must be TRUE):
  1. 新建模板保存的 schema 为 version:2 层级结构（rows/cols/span），后端校验通过
  2. v1.1 旧模板的已有提交数据仍可正常查看（版本分发路由到旧渲染路径）
  3. GridFormRenderer 在 fill 模式下按 col-{span} 渲染字段行，布局与 schema 定义一致
  4. FieldRenderer 在 designer/fill/print 三种模式下正确渲染所有 7 种字段类型
**Plans:** 4/4 plans complete
Plans:
- [x] 10-01-PLAN.md — v2 schema 类型定义 + TypeBox 后端校验
- [x] 10-02-PLAN.md — GridFormRenderer/FieldRenderer/GroupRenderer + store 重构
- [x] 10-03-PLAN.md — 设计器组件链重构（fieldRegistry/FieldPalette/PropertyEditor/DesignerCanvas）
- [x] 10-04-PLAN.md — 填写页/提交详情重构 + FormFieldRenderer 清理

### Phase 11: 设计器栅格编辑
**Goal**: 用户可在设计器中通过拖拽创建多列布局，实时预览栅格效果
**Depends on**: Phase 10
**Requirements**: DESIGN-01, DESIGN-04
**Success Criteria** (what must be TRUE):
  1. 用户可从字段面板拖拽字段到设计器画布的指定行/列位置
  2. 用户可通过属性面板调整字段跨列数（1-12），画布实时反映宽度变化
  3. 用户可拖拽调整行顺序，添加/删除行
  4. 设计器预览区域按栅格布局渲染，与最终填写页一致（所见即所得）
**Plans:** 3/3 plans executed
Plans:
- [x] 11-01-PLAN.md — Grid 工具函数 + useColResize 组合式函数（TDD）
- [x] 11-02-PLAN.md — DesignerCanvas 重写为 12 列栅格编辑器 + FieldPalette 组名同步
- [x] 11-03-PLAN.md — PropertyEditor 动态 colSpan 上限 + 视觉验收
**UI hint**: yes

### Phase 12: 分组与动态行表格
**Goal**: 用户可在表单中创建带标题的分组区块和可增删行的动态表格
**Depends on**: Phase 10 (renderer), Phase 11 (designer)
**Requirements**: DESIGN-02, DESIGN-03, RENDER-03
**Success Criteria** (what must be TRUE):
  1. 用户可在设计器中添加分组区块，设置分组标题（如"教育经历"），组内独立栅格布局
  2. 用户可在设计器中添加动态行表格，定义列结构（列名/列类型/列宽）
  3. 填写者在填写页可对动态行表格增删行，每行按列结构渲染输入控件
  4. 动态行表格数据正确存储为数组格式，提交详情页可查看表格数据
**Plans**: TBD
**UI hint**: yes

### Phase 13: PDF 保真输出
**Goal**: PDF 导出 1:1 还原栅格布局、分组标题、动态表格，中文无乱码
**Depends on**: Phase 12 (groups + tables must be stable)
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. PDF 导出的栅格布局与填写页一致（字段对齐、跨列宽度、分组标题、表格边框）
  2. PDF 正确处理分页，分组和表格行不被截断
  3. PDF 中文字体正常显示，无乱码或方块字
**Plans**: TBD

### Phase 14: 响应式填写页
**Goal**: PC 端填写页还原设计稿栅格布局，移动端自动降级为单列触控友好布局
**Depends on**: Phase 10 (renderer), Phase 12 (dynamic table mobile view)
**Requirements**: RENDER-01, RENDER-02
**Success Criteria** (what must be TRUE):
  1. PC 端填写页按设计稿栅格布局渲染，多列字段并排显示，与设计器预览一致
  2. 移动端填写页所有字段自动降级为单列全宽布局，触控体验良好
  3. 动态行表格在移动端以卡片布局展示，每行数据可折叠/展开
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 25/25 | Complete | 2026-04-20 |
| 7. 模板管理 + 表单设计器 | v1.1 | 5/5 | Complete | 2026-04-20 |
| 8. 分享链接 + 公开填写 | v1.1 | 4/4 | Complete | 2026-04-20 |
| 9. 数据查看 + 打印 + 统计 | v1.1 | 4/4 | Complete | 2026-04-20 |
| 10. Schema 与核心渲染器 | v1.2 | 4/4 | Complete    | 2026-04-21 |
| 11. 设计器栅格编辑 | v1.2 | 3/3 | Verify |  |
| 12. 分组与动态行表格 | v1.2 | 0/? | Not started | - |
| 13. PDF 保真输出 | v1.2 | 0/? | Not started | - |
| 14. 响应式填写页 | v1.2 | 0/? | Not started | - |
