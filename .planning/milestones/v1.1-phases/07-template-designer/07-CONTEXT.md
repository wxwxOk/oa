# Phase 7: 模板管理 + 表单设计器 — Context

> Downstream agents: read this BEFORE planning or implementing.
> Every decision here is LOCKED — do not re-ask or override.

## Scope

**In scope (from ROADMAP.md):**
- TMPL-01: 创建模板（名称+描述）
- TMPL-02: 编辑和删除模板
- TMPL-03: RBAC 权限控制
- TMPL-04: 发布/下线模板
- TMPL-05: 修改已发布模板时 schema 版本自动递增
- DSGN-01: 拖拽添加和排序字段
- DSGN-02: 基础字段类型（文本、多行文本、单选、多选、日期、手机号）
- DSGN-03: 手写签名字段
- DSGN-04: 字段属性配置（必填、提示文字、选项列表）
- DSGN-05: 实时预览

**Out of scope:**
- 分享链接、公开填写 → Phase 8
- 数据查看、打印、统计 → Phase 9
- 条件逻辑、文件上传、多列布局 → v2.0

## Decisions

### 设计器布局

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 面板数量 | 3 面板（字段库 + 画布 + 属性编辑） | 功能最完整，专业设计器体验 |
| 移动端策略 | PC 专属，移动端不提供设计器 | 3 面板在小屏不可用，移动端仅展示模板列表（只读） |
| 字段库展示 | 分组折叠（基础字段 / 特殊字段） | 7 种字段类型分组更清晰 |
| 预览方式 | WYSIWYG 画布 | 中间画布本身即所见即所得，无需额外预览区域 |

### 模板生命周期

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 版本号策略 | 自增整数（1, 2, 3...） | 简单直接，JSONB schema 存整数版本即可 |
| 草稿保存 | 手动保存（点击"保存"按钮） | 用户对保存时机有控制感，实现简单 |
| 状态流转 | 三态循环：草稿 → 已发布 → 已下线 → 可重新发布 | 覆盖完整生命周期，下线后可恢复 |
| 编辑已发布模板 | 就地编辑，保存时版本自动 +1 | 简单直接，编辑期间旧版本仍对外可填写 |

### 签名字段交互

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 存储格式 | PNG base64 字符串存入 JSONB | 简单直接，打印时直接渲染 `<img>`，Phase 9 PDF 导出兼容 |
| 签名板尺寸 | 固定尺寸（如 400x200px） | 签名比例一致，设计器预览和实际填写体验统一 |
| 操作按钮 | 仅"清除"按钮 | 一键清空重签，无撤销功能，降低复杂度 |

### 模板列表与管理

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 列表布局 | 表格布局 | 与 v1.0 用户/角色管理页保持一致 |
| 筛选排序 | 状态筛选 + 更新时间排序 | 覆盖主要场景，不过度设计 |
| 删除策略 | 仅可删除草稿状态模板 | 已发布/已下线模板可能有提交数据，数据安全优先 |

### 继承决策（来自 STATE.md，已锁定）

| Decision | Source |
|----------|--------|
| JSONB 存储表单 schema | v1.1 milestone research |
| vue-draggable-plus 做拖拽 | v1.1 milestone research |
| signature_pad 做手写签名 | v1.1 milestone research |
| Schema 版本化 — 提交时快照 | v1.1 milestone research |

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据层
- `backend/prisma/schema.prisma` — 现有数据模型（User, Department, Role, Permission），新增 FormTemplate 等模型需在此扩展
- `.planning/REQUIREMENTS.md` §模板管理 + §表单设计器 — TMPL-01~05, DSGN-01~05 完整需求定义

### 后端模块
- `backend/src/index.ts` — Elysia 应用入口，模块注册方式（.use(xxxModule)）
- `backend/src/modules/` — 现有模块结构（auth, user, department, role, dashboard），新模块需遵循相同模式
- `backend/src/utils/errors.ts` — BizError 错误处理

### 前端
- `frontend/src/pages/` — 现有页面结构，新增 TemplatePage.vue + FormDesigner 组件
- `frontend/src/router/routes.ts` — 路由定义，meta.perm 权限控制
- `frontend/src/components/` — 共享组件（EmptyState, FilterSheet）
- `frontend/src/composables/` — 现有 hooks（useDarkMode, useResponsive）
- `frontend/src/stores/` — Pinia store 结构

### 第三方库
- `vue-draggable-plus` — 拖拽排序库，用于设计器画布字段排序
- `signature_pad` — 手写签名库，Canvas 实现

## Existing Code Insights

### Reusable Assets
- `EmptyState.vue`: 空状态组件，模板列表为空时可复用
- `FilterSheet.vue`: 筛选面板组件，模板列表筛选可参考
- `useDarkMode` / `useResponsive`: 暗色模式和响应式 hooks，设计器需适配

### Established Patterns
- 后端模块化：每个模块一个 `xxx.route.ts`，通过 `.use()` 注册到主 app
- 前端页面：每个功能一个 `XxxPage.vue`，配合 Pinia store 管理状态
- 路由权限：`meta.perm` 控制页面访问，`meta.public` 标记公开页面
- 表格页面：v1.0 的 UserPage/RolePage 使用 QTable + 分页 + 筛选模式

### Integration Points
- Prisma schema 扩展：新增 FormTemplate 模型，关联 User（创建者）
- Elysia 路由注册：新增 formTemplateModule
- 前端路由：新增 /templates 和 /templates/:id/design 路由
- RBAC 权限：新增 form:template:create/edit/delete/publish 权限码

## Specific Ideas

- 设计器字段分组：基础字段（文本、多行文本、单选、多选、日期、手机号）+ 特殊字段（手写签名）
- 画布 WYSIWYG：字段在画布上的渲染样式应接近最终填写效果
- 签名板固定 400x200px，白色背景，黑色笔触

## Deferred Ideas

None — discussion stayed within phase scope

---

*Phase: 07-模板管理+表单设计器*
*Context gathered: 2026-04-20*
