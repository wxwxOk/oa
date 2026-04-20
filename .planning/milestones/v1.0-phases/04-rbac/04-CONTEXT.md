# Phase 4: RBAC - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

交付角色 CRUD + 权限分配 + 用户-角色挂载 + 前端路由守卫与 `v-perm` 指令，使 UAT-1/UAT-2/UAT-5 端到端可用。

Phase 1 骨架与 Phase 3 已完成了大部分结构（`role.route.ts`、`auth.ts` authGuard、`RolePage.vue`、`v-perm`、路由守卫、`MainLayout` 菜单过滤、UserPage 角色选择器、seed 内置 ADMIN/EMPLOYEE + 14 个权限码）。**本阶段核心工作是验证、补全、打磨这些已有代码，并补齐系统安全边界**（ADMIN 锁死、角色删除约束、权限刷新）。

权限码运行时 CRUD、数据权限、SSO 等超出 FR-4 / FR-5 范围的能力留在 v1.0 之外。

</domain>

<decisions>
## Implementation Decisions

### ADMIN 锁死防护
- **D-01:** ADMIN 角色禁止被删除。后端 `DELETE /roles/:id` 检查 `role.code === 'ADMIN'` 时返回 400；前端 RolePage 列表里 ADMIN 行的删除按钮禁用 + tooltip "系统角色不可删除"
- **D-02:** ADMIN 角色权限允许增减，但 `PUT /roles/:id/permissions` 对 ADMIN 的 `permissionIds=[]` 一律拒绝（即"非空约束"，不是"完全锁定"）。前端权限保存按钮在 ADMIN 且当前 checkedIds 为空时禁用
- **D-03:** 前端 + 后端双保险 —— 前端禁用按钮改善体验，后端硬校验防绕过（curl / 绕 UI）
- **D-04:** 用硬编码 `role.code === 'ADMIN'` 识别，不引入 `role.isSystem` 字段（schema 不改）
- **D-05:** 仅保护 ADMIN。EMPLOYEE 及用户新建的角色完全自由删改

### 角色删除约束
- **D-06:** 角色被用户挂载时，后端 `DELETE /roles/:id` 拒绝返回 400 "该角色仍有 N 个用户，请先解绑"（对齐 Phase 3 D-03 部门删除拒绝风格）。不做 cascade 也不做"确认后 cascade"
- **D-07:** 角色列表接口 `GET /roles` 增加 `userCount` 字段（`_count.users`）。前端角色列表每行展示"成员: N"；N > 0 时删除按钮禁用 + tooltip "请先解绑 N 个用户"
- **D-08:** ADMIN 保护优先于挂载检查。当 ADMIN 且同时被用户挂载时，后端/前端都以"系统角色不可删除"为拒绝消息
- **D-09:** 删除确认沿用 Phase 3 D-02 风格 —— Quasar `Dialog.create` 弹"删除角色 X? 此操作不可恢复"

### 权限变更生效
- **D-10:** 主策略 —— 在 `Router.beforeEach` 中对已登录用户调 `GET /auth/profile` 刷新 `authStore.user.permissions`，之后再做 `meta.perm` 校验
- **D-11:** 防抖 60 秒 —— `authStore` 加 `lastProfileFetch` 时间戳，距上次 < 60s 跳过刷新。兼顾实时性和请求量
- **D-12:** 刷新后若当前路由 `meta.perm` 已不满足，调 `Notify.create` 提示"您的权限已更新"后重定向到 `/403` 或首页（视目标菜单是否仍可访问）
- **D-13:** 用户被禁用 (`status=DISABLED`) 的感知借用已有 axios 拦截器：authGuard 返回 401 → 拦截器尝试 refresh → 失败 → `auth.logout()` + 跳 `/login`。无需额外改动
- **D-14:** `/auth/profile` 已在 Phase 2 返回 `currentUser { permissions, roles }`（见 `auth.route.ts:63-64`），直接复用

### Plans 拆分约
- **D-15:** Phase 4 拆 5 plans（后端 1 + 前端 3 + E2E 1），对齐 Phase 3 粒度
- **D-16:** Plan 大纲：
  - `04-01` 后端 RBAC 保护 —— ADMIN 锁死 (D-01/02) + 角色删除拒绝 (D-06) + 角色列表返回 userCount (D-07)
  - `04-02` 前端 RolePage 补全 —— 挂载人数展示 + ADMIN/被挂载按钮禁用 + 保存权限按钮对 ADMIN 空分配禁用
  - `04-03` 前端路由守卫 + 权限刷新 —— `authStore.maybeRefreshProfile()` (60s 防抖) + `Router.beforeEach` 调用 + 失权限 Notify + 重定向
  - `04-04` 前端收尾补全 —— MainLayout 菜单验证 + UserPage 角色选择器验证 + RolePage v-perm 一致性 + 403 页微调
  - `04-05` 端到端人工验证 —— UAT-1 admin 登录看全菜单 / UAT-2 普通用户限菜单 / UAT-5 撤权后按钮消失
- **D-17:** 最后 plan 是手动 UAT 清单（Phase 3 D-02 风格），不引入 Playwright / API 集成测试基础设施 —— 超出 v1.0 范围

### Claude's Discretion
- `authStore.maybeRefreshProfile()` 的具体实现（时间戳存 localStorage 还是 store 内存，并发请求去重）
- 前端禁用按钮 tooltip 的文案细节（"系统角色不可删除" / "请先解绑 N 个用户"等具体遣词）
- RolePage 挂载人数的展示样式（放在角色名右侧 chip / 左下 caption / 独立列）
- 后端错误响应字段名与 HTTP 状态码的具体映射（400 vs 409）
- UAT-05 端到端清单的步骤措辞和验证点粒度

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RBAC 需求
- `.planning/REQUIREMENTS.md` §FR-4 — 角色 CRUD、权限扁平列表、角色-权限多对多、ADMIN 全权限
- `.planning/REQUIREMENTS.md` §FR-5 — 前端拉权限码、路由守卫、v-perm 指令
- `.planning/REQUIREMENTS.md` §FR-2.4 — 用户-角色挂载

### 验收用例
- `.planning/REQUIREMENTS.md` §验收用例 — UAT-1（admin 看全菜单）、UAT-2（普通用户限菜单）、UAT-5（撤权后按钮消失）

### 非功能需求
- `.planning/REQUIREMENTS.md` §NFR-1 — 列表接口 p95 < 500ms
- `.planning/REQUIREMENTS.md` §NFR-3 — ESLint + Prettier、路由按 module 分文件、Swagger 文档

### 前序 phase 决策（需对齐）
- `.planning/phases/03-crud/03-CONTEXT.md` §Implementation Decisions — D-02 删除二次确认、D-04/05 权限码规范（`module:action`）、D-06~D-08 校验策略、D-14/15 用户-角色挂载边界
- `.planning/phases/02-data-layer-auth/02-01-SUMMARY.md` — 双 JWT + authGuard derive 模式

### 数据模型与 seed
- `backend/prisma/schema.prisma` — Role / Permission / UserRole / RolePermission 模型（均带 `onDelete: Cascade`）
- `backend/prisma/seed.ts` — 14 个权限码定义、ADMIN（全权限）+ EMPLOYEE（仅 `*:list`）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/role/role.route.ts` — Role CRUD (GET list / GET :id / POST / PUT / DELETE) + `PUT /:id/permissions` 权限分配 + `permissionModule` (`GET /permissions`) 已齐备
- `backend/src/middlewares/auth.ts` — `authGuard(requiredPerm?)` 已读取 `user.roles → permCodes` 并做 ADMIN bypass（`roleCodes.includes('ADMIN')`）
- `backend/src/modules/auth/auth.route.ts` — `/auth/profile` 已返回 `{ id, username, realName, roleCodes, permissions }`，前端刷新权限直接调用
- `backend/prisma/seed.ts` — 已定义权限码清单、ADMIN/EMPLOYEE 角色与 admin 用户
- `frontend/src/pages/RolePage.vue` — 双栏布局（角色列表 + 按 module 分组权限 checkbox）+ 新建/编辑/删除/保存权限 已齐备
- `frontend/src/boot/perm.ts` — `v-perm` 指令（无权限移除 DOM）
- `frontend/src/stores/auth.ts` — `hasPerm(code)` 带 ADMIN bypass、`fetchProfile()` 可拉最新权限
- `frontend/src/router/index.ts` — `beforeEach` 已检查 `isLogin` + `meta.perm`；未权限跳 `/403`
- `frontend/src/layouts/MainLayout.vue` — `allMenus` + `visibleMenus = allMenus.filter(m => !m.perm || auth.hasPerm(m.perm))` 动态菜单已就绪
- `frontend/src/pages/UserPage.vue` — 新建/编辑对话框已有 `q-select` 多选角色（`roleIds` 绑定），列表也展示角色
- `frontend/src/pages/ForbiddenPage.vue` — 403 页已存在（独立 q-layout，无侧栏）

### Established Patterns
- 权限码规范 `module:action`（Phase 3 D-04 锁定；role 模块已用 `role:list / role:create / role:update / role:delete / role:assign-permission`）
- 前后端权限码完全对齐（Phase 3 D-05；seed 写入即前端 v-perm/路由 meta 一致）
- 删除二次确认弹窗（Phase 3 D-02）—— RolePage `onDelete` 已使用
- Prisma 级联：`UserRole` 和 `RolePermission` 均 `onDelete: Cascade`（Phase 4 需注意角色被删会静默撕权限）
- Elysia `t.Object` body 校验（Phase 3 D-08）
- Quasar `Dialog.create` / `Notify.create` 做确认与反馈
- axios 拦截器：401 自动 refresh；refresh 失败 logout + 跳 `/login`

### Integration Points
- `backend/src/index.ts` — `roleModule` + `permissionModule` 应已挂载到 `/api/v1`（需验证）
- `frontend/src/router/routes.ts:22` — `/roles` 路由 `meta.perm: 'role:list'` 已配
- `frontend/src/router/index.ts:19-26` — `Router.beforeEach` 是权限刷新注入点
- `frontend/src/stores/auth.ts` — `fetchProfile()` 是刷新权限的复用点，需加 `lastProfileFetch` + `maybeRefreshProfile()`
- `frontend/src/layouts/MainLayout.vue:69-74` — `allMenus` 硬编码 4 项菜单（dashboard/departments/users/roles），与 `routes.ts` 重复但已按权限过滤

</code_context>

<specifics>
## Specific Ideas

- Phase 4 验证风格对齐 Phase 3：最后一个 plan 是人工 UAT 清单 + 截图存档，不做自动化测试基础设施
- RolePage 双栏布局体验良好，本阶段不重构 UI，仅加入"成员: N"展示与按钮禁用

</specifics>

<deferred>
## Deferred Ideas

- **Playwright / API 集成测试基础设施** — 超出 v1.0，留待后续稳定性建设
- **权限分配 UX 细化**（全选本模块 / 清空 / 未保存提示 / 变更 diff 高亮）— 当前体验可用，属打磨
- **`role.isSystem` 字段** — 未来若内置角色数超过 1 个（目前仅 ADMIN 需保护）再考虑加 schema 字段
- **权限码运行时 CRUD** — 权限码是代码-数据库约定，不提供 UI 创建
- **数据权限**（如"只能看本部门的用户"）— FR-4.2 明确权限为扁平列表，不做数据级
- **`/auth/refresh` 未校验 `status=DISABLED`** — 当前 refresh 只验 JWT 签名，DISABLED 用户能刷出新 access token；下次 authGuard 会 401。理论上可优化（refresh 时重查 user 状态），但不影响 v1.0 功能
- **菜单数据源去重** — `MainLayout.allMenus` 与 `routes.ts` 的 meta 重复，可统一。属打磨项
- **权限变更的"立即推送"** — WebSocket / SSE 实时推送超出 v1.0 范围

</deferred>

---

*Phase: 04-rbac*
*Context gathered: 2026-04-19*
