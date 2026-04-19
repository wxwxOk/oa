# Phase 3: 组织架构 CRUD - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

交付部门（无限层级树）与用户 CRUD 的后端 API + 前端管理页面。用户可挂载到部门，创建/编辑时可顺手分配角色。角色本身的 CRUD 与权限分配留给 Phase 4。

Phase 1 脚手架已生成 department/user 后端路由 + 前端页面骨架，本阶段核心工作是**验证、补全、打磨**这些已有代码使其端到端可用。

</domain>

<decisions>
## Implementation Decisions

### 用户删除语义与禁用切换
- **D-01:** 硬删除 + 禁用并存。保留现有 `DELETE /:id` 端点作为硬删除，同时在用户列表加"启用/禁用"快捷按钮（PATCH status）
- **D-02:** 前端删除按钮加二次确认"此操作不可恢复"；禁用/启用按钮无需二次确认
- **D-03:** 列表增加 status 筛选（全部/启用/禁用），配合禁用并存决策

### 权限码规范
- **D-04:** Phase 3 锁定 `module:action` 命名规范，前后端统一使用以下权限码：
  - user: `user:list` / `user:create` / `user:update` / `user:delete` / `user:reset-password`
  - department: `department:list` / `department:create` / `department:update` / `department:delete`
- **D-05:** 后端 authGuard 和前端 v-perm 必须使用完全一致的权限码。重置密码端点改用 `user:reset-password`（当前后端用 `user:update` 保护，需修正）

### 表单校验策略
- **D-06:** 前端使用 Quasar 的 `rules` prop 做实时校验（失焦时触发），必填字段加红星号
- **D-07:** 校验规则：用户名必填 ≥2 字符、真实姓名必填、邮箱用 email 正则、手机号用简单数字校验、密码 ≥4 字符
- **D-08:** 后端 Elysia `t.Object` 保持现有严格度，与前端规则对齐

### 部门树交互
- **D-09:** 编辑对话框增加父部门选择器（q-select 树形下拉），支持编辑时修改父部门
- **D-10:** 排序保留数字输入，不做拖拽排序
- **D-11:** 编辑时父部门选择器排除自身及其子部门（防止循环引用）

### 密码策略
- **D-12:** 创建用户时默认密码 `123456`，重置密码也回 `123456`
- **D-13:** 创建/重置成功后弹窗显示密码并提供复制按钮

### 角色边界（与 Phase 4）
- **D-14:** Phase 3 保留用户编辑对话框中的角色选择器（roleIds），创建/编辑用户时可顺手挂角色
- **D-15:** 角色本身的 CRUD + 权限分配是 Phase 4 的范围

### 列表 UX
- **D-16:** 用户列表筛选维度：keyword + departmentId + status（新增）
- **D-17:** 排序保持 `id desc`，分页默认 20 条/页
- **D-18:** 空态显示"暂无用户"+ 新建按钮

### 移动端定位
- **D-19:** UserPage 已有的 PC 表格/移动卡片切换保留现状，不额外打磨
- **D-20:** DepartmentPage 不做移动适配（q-tree 在小屏可用）
- **D-21:** 响应式双布局统一在 Phase 5 处理

### Claude's Discretion
- 具体 Quasar rules 校验函数的写法
- 父部门选择器的 UI 细节（树形下拉 vs 级联选择）
- 空态插图/图标选择
- 错误提示的具体文案
- 后端错误响应的格式细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 用户管理
- `.planning/REQUIREMENTS.md` §FR-2 — 用户 CRUD 需求（FR-2.1 ~ FR-2.4）
- `.planning/REQUIREMENTS.md` §NFR-1 — 列表接口 p95 < 500ms
- `.planning/REQUIREMENTS.md` §NFR-3 — ESLint + Prettier、路由按 module 分文件、Swagger 文档

### 部门管理
- `.planning/REQUIREMENTS.md` §FR-3 — 部门树 CRUD 需求（FR-3.1 ~ FR-3.3）

### 认证与权限（已完成，需对齐）
- `.planning/phases/02-data-layer-auth/02-01-SUMMARY.md` — 双 JWT 实例 + authGuard 模式
- `.planning/phases/02-data-layer-auth/02-RESEARCH.md` §Architecture Patterns — authGuard derive 模式

### 验收用例
- `.planning/REQUIREMENTS.md` §验收用例 — UAT-3（部门树层级）、UAT-4（用户分配部门+角色）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/department/department.route.ts` — 部门 CRUD + /tree 端点已齐备，含 buildTree 工具函数和删除时子部门/用户校验
- `backend/src/modules/user/user.route.ts` — 用户分页列表 + CRUD + 重置密码已齐备，含 userSelect 常量
- `frontend/src/pages/DepartmentPage.vue` — q-tree 展示 + 新建/编辑/删除对话框骨架
- `frontend/src/pages/UserPage.vue` — q-table + 移动卡片 + 搜索 + 重置密码骨架
- `backend/src/middlewares/auth.ts` — authGuard 支持权限码参数
- `frontend/src/boot/perm.ts` — v-perm 指令已就绪
- `backend/prisma/schema.prisma` — User/Department/Role/Permission 模型完整，含 UserRole 多对多

### Established Patterns
- 后端路由按 module 分文件（`modules/{name}/{name}.route.ts`）
- Elysia `t.Object` 做请求体校验
- 前端用 `api.get/post/put/delete` 调用后端（axios 实例 + token 拦截器）
- Quasar Dialog/Notify 做确认和提示
- v-perm 指令控制按钮显隐

### Integration Points
- `backend/src/index.ts` — 已注册 userModule + departmentModule 到 `/api/v1`
- `frontend/src/router/routes.ts` — 已配置 `/departments` 和 `/users` 路由，含 meta.perm
- `frontend/src/boot/axios.ts` — API 基础路径 `/api/v1`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- 角色 CRUD + 权限分配 — Phase 4
- 响应式双布局（PC 侧边栏 + 移动底部 Tab）— Phase 5
- 用户头像上传 — 未规划
- 部门拖拽排序 — 未规划

</deferred>

---

*Phase: 03-crud*
*Context gathered: 2026-04-19*
