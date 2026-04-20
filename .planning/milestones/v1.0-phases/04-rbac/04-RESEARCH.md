# Phase 4: RBAC - Research

**Researched:** 2026-04-19
**Domain:** RBAC 后端保护 + 前端权限刷新 + 路由守卫
**Confidence:** HIGH

## Summary

Phase 4 的核心工作是**补全和加固**已有 RBAC 骨架，而非从零搭建。Phase 1 脚手架已生成 `role.route.ts`（角色 CRUD + 权限分配）、`RolePage.vue`（双栏布局）、`v-perm` 指令、`authGuard` 中间件、`MainLayout` 菜单过滤、`Router.beforeEach` 权限校验。seed 已内置 14 个权限码和 ADMIN/EMPLOYEE 两个角色。

本阶段需要做三件事：(1) 后端加固 —— ADMIN 角色锁死防护 + 角色删除挂载检查 + 角色列表返回 userCount；(2) 前端 RolePage 补全 —— 成员数展示 + 按钮禁用逻辑；(3) 前端权限刷新 —— `authStore.maybeRefreshProfile()` 60s 防抖 + `Router.beforeEach` 异步调用 + 失权限重定向。最后一个 plan 是手动 UAT 清单，对齐 Phase 3 `03-05` 风格。

**Primary recommendation:** 严格按 CONTEXT.md D-01~D-17 的 17 条锁定决策实施，不引入新设计。后端改动集中在 `role.route.ts` 一个文件（约 30 行新增），前端改动分散在 `auth.ts`（store）、`router/index.ts`、`RolePage.vue` 三个文件。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** ADMIN 角色禁止被删除。后端 `DELETE /roles/:id` 检查 `role.code === 'ADMIN'` 时返回 400；前端 RolePage 列表里 ADMIN 行的删除按钮禁用 + tooltip "系统角色不可删除"
- **D-02:** ADMIN 角色权限允许增减，但 `PUT /roles/:id/permissions` 对 ADMIN 的 `permissionIds=[]` 一律拒绝（即"非空约束"，不是"完全锁定"）。前端权限保存按钮在 ADMIN 且当前 checkedIds 为空时禁用
- **D-03:** 前端 + 后端双保险 —— 前端禁用按钮改善体验，后端硬校验防绕过
- **D-04:** 用硬编码 `role.code === 'ADMIN'` 识别，不引入 `role.isSystem` 字段（schema 不改）
- **D-05:** 仅保护 ADMIN。EMPLOYEE 及用户新建的角色完全自由删改
- **D-06:** 角色被用户挂载时，后端 `DELETE /roles/:id` 拒绝返回 400 "该角色仍有 N 个用户，请先解绑"
- **D-07:** 角色列表接口 `GET /roles` 增加 `userCount` 字段（`_count.users`）。前端角色列表每行展示"成员: N"
- **D-08:** ADMIN 保护优先于挂载检查
- **D-09:** 删除确认沿用 Phase 3 D-02 风格 —— Quasar `Dialog.create`
- **D-10:** 在 `Router.beforeEach` 中对已登录用户调 `GET /auth/profile` 刷新权限
- **D-11:** 防抖 60 秒 —— `authStore` 加 `lastProfileFetch` 时间戳
- **D-12:** 刷新后若 `meta.perm` 不满足，Notify 提示后重定向到 `/403`
- **D-13:** 用户被禁用借用已有 axios 401 拦截器，无需额外改动
- **D-14:** `/auth/profile` 已返回 `{ permissions, roles }`，直接复用
- **D-15:** Phase 4 拆 5 plans（后端 1 + 前端 3 + E2E 1）
- **D-16:** Plan 大纲：04-01~04-05
- **D-17:** 不引入 Playwright / API 集成测试基础设施

### Claude's Discretion
- `authStore.maybeRefreshProfile()` 具体实现（时间戳存储位置、并发去重）
- 前端禁用按钮 tooltip 文案细节
- RolePage 挂载人数展示样式
- 后端错误响应字段名与 HTTP 状态码映射
- UAT-05 端到端清单步骤措辞

### Deferred Ideas (OUT OF SCOPE)
- Playwright / API 集成测试基础设施
- 权限分配 UX 细化（全选/清空/未保存提示）
- `role.isSystem` schema 字段
- 权限码运行时 CRUD、数据权限、SSO、WebSocket 实时推送
- 菜单数据源去重（MainLayout vs routes.ts）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-2.4 | 为用户分配部门与多个角色 | UserPage 角色选择器已实现 —— 仅需验证 |
| FR-4.1 | 角色 CRUD（code 唯一） | `role.route.ts` 已有完整 CRUD，需加 ADMIN 删除保护 + 挂载检查 |
| FR-4.2 | 权限为扁平列表，按 module 分组 | `permissionModule` + RolePage 已实现 —— 仅需验证 |
| FR-4.3 | 角色-权限多对多分配 | `PUT /roles/:id/permissions` 已实现，需加 ADMIN 空分配拒绝 |
| FR-4.4 | ADMIN 角色拥有全部权限 | seed + authGuard ADMIN bypass 已实现 —— 仅需验证 |
| FR-5.1 | 登录后拉取权限码列表 | login 已返回 permissions，需加 `maybeRefreshProfile()` |
| FR-5.2 | 路由守卫：无权限跳转 403 | `Router.beforeEach` 已有基础，需加异步权限刷新 |
| FR-5.3 | `v-perm` 指令控制按钮显隐 | `boot/perm.ts` 已实现 —— 仅需验证一致性 |
| NFR-1 | 列表接口 p95 < 500ms | 角色列表加 `_count.users` 后需验证 |
| NFR-3 | ESLint + Prettier；路由按 module 分文件 | 已有规范，遵循即可 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ADMIN 角色锁死 | API / Backend | Frontend (UX) | 后端硬校验防绕过是安全底线，前端禁用按钮仅改善体验 |
| 角色删除挂载检查 | API / Backend | Frontend (UX) | 同上，后端 400 拒绝是权威，前端 tooltip 是辅助 |
| 角色列表 userCount | API / Backend | — | 数据聚合在数据库层完成 |
| 权限刷新 60s 防抖 | Frontend (Router) | API / Backend | 前端控制刷新频率，后端 `/auth/profile` 被动响应 |
| 路由守卫 meta.perm | Frontend (Router) | — | 纯前端路由层逻辑 |
| v-perm 指令 | Frontend (Client) | — | DOM 级别按钮显隐 |
| 菜单动态过滤 | Frontend (Client) | — | `MainLayout` computed 已实现 |

## API 契约变更点

### `GET /api/v1/roles` — 增加 `_count.users`

**当前实现** (`role.route.ts:8-13`):
```typescript
prisma.role.findMany({
  include: { permissions: { include: { permission: { select: { id: true, code: true } } } } },
  orderBy: { id: 'asc' },
})
```

**变更后**:
```typescript
prisma.role.findMany({
  include: {
    permissions: { include: { permission: { select: { id: true, code: true } } } },
    _count: { select: { users: true } },
  },
  orderBy: { id: 'asc' },
})
```

返回体每个 role 对象新增 `_count: { users: number }`。前端通过 `r._count.users` 读取。[VERIFIED: Prisma _count 是 include 级别的聚合，不需要额外 SQL join]

### `DELETE /api/v1/roles/:id` — 增加两层保护

**检查顺序**（D-08 锁定：ADMIN 优先）:
1. 查询 `role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } })`
2. `role.code === 'ADMIN'` → 400 `{ code: 'BIZ_ERROR', message: '系统角色不可删除' }`
3. `role._count.users > 0` → 400 `{ code: 'BIZ_ERROR', message: '该角色仍有 N 个用户，请先解绑' }`
4. 通过 → `prisma.role.delete()`

**错误响应格式**对齐已有 `BizError` 工具类 (`utils/errors.ts`)。使用 `throw new BizError('系统角色不可删除', 400)` 即可。[VERIFIED: BizError 构造函数签名 `(message, status=400, code='BIZ_ERROR')`]

### `PUT /api/v1/roles/:id/permissions` — ADMIN 空分配拒绝

**新增检查** (`role.route.ts:53-69` 区域):
```typescript
const role = await prisma.role.findUnique({ where: { roleId } });
if (role?.code === 'ADMIN' && body.permissionIds.length === 0) {
  throw new BizError('ADMIN 角色不能清空所有权限', 400);
}
```

仅拒绝 `permissionIds=[]`（空数组），允许 ADMIN 增减权限。[VERIFIED: D-02 锁定"非空约束"而非"完全锁定"]

## Architecture Patterns

### 权限刷新时序图

```
用户点击菜单 → Router.beforeEach 触发
  │
  ├─ to.meta.public === true → next() 直接放行
  │
  ├─ !auth.isLogin → next('/login')
  │
  └─ auth.isLogin:
      │
      ├─ await auth.maybeRefreshProfile()
      │   │
      │   ├─ Date.now() - lastProfileFetch < 60_000 → 跳过（防抖）
      │   │
      │   ├─ 已有 pendingRefresh Promise → 返回同一 Promise（并发去重）
      │   │
      │   └─ 发起 GET /auth/profile
      │       ├─ 成功 → 更新 store.user.permissions + lastProfileFetch
      │       └─ 失败(401) → axios 拦截器接管 → refresh → 重试 or logout
      │
      ├─ 检查 to.meta.perm
      │   ├─ auth.hasPerm(perm) → next()
      │   └─ !hasPerm → Notify('您的权限已更新') → next('/403')
      │
      └─ 无 meta.perm → next()
```

### `maybeRefreshProfile()` 实现建议

**推荐：store 内存时间戳 + Promise 去重**

理由：
- 时间戳存 store 内存（非 localStorage）—— 页面刷新后首次路由跳转必定触发一次 profile 拉取，确保权限最新
- localStorage 时间戳会导致刷新页面后仍跳过拉取，可能使用过期权限
- 并发去重用 `pendingRefresh: Promise | null` 字段，多个 beforeEach 同时触发时共享同一请求

```typescript
// stores/auth.ts 新增字段和方法
state: () => ({
  // ...existing...
  lastProfileFetch: 0,        // 内存时间戳，页面刷新归零
  _pendingRefresh: null as Promise<void> | null,
}),
actions: {
  async maybeRefreshProfile() {
    if (!this.accessToken) return;
    if (Date.now() - this.lastProfileFetch < 60_000) return;
    if (this._pendingRefresh) return this._pendingRefresh;
    this._pendingRefresh = this._doRefreshProfile();
    try {
      await this._pendingRefresh;
    } finally {
      this._pendingRefresh = null;
    }
  },
  async _doRefreshProfile() {
    try {
      await this.fetchProfile();  // 复用已有方法
      this.lastProfileFetch = Date.now();
    } catch {
      // 401 由 axios 拦截器处理，此处静默
    }
  },
}
```

[VERIFIED: `fetchProfile()` 已存在于 `stores/auth.ts:39-42`，调用 `GET /auth/profile` 并更新 `this.user`]

### Router.beforeEach 改造

**当前实现** (`router/index.ts:19-26`):
```typescript
Router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) return next();
  if (!auth.isLogin) return next({ path: '/login', query: { redirect: to.fullPath } });
  const perm = to.meta.perm as string | undefined;
  if (perm && !auth.hasPerm(perm)) return next({ path: '/403' });
  next();
});
```

**改造后**（同步 → 异步）:
```typescript
Router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isLogin) return { path: '/login', query: { redirect: to.fullPath } };

  await auth.maybeRefreshProfile();

  const perm = to.meta.perm as string | undefined;
  if (perm && !auth.hasPerm(perm)) {
    Notify.create({ type: 'warning', message: '您的权限已更新' });
    return { path: '/403' };
  }
  return true;
});
```

关键变化：
1. 回调签名从 `(to, from, next)` 改为 `async (to)` + 返回值（Vue Router 4 推荐写法）[VERIFIED: Vue Router 4 支持 async beforeEach 返回 `true | RouteLocationRaw`]
2. `await auth.maybeRefreshProfile()` 在 perm 检查之前
3. 失败时 Notify 提示 + 返回 `/403`


## 前端改动点（文件锚点）

### `frontend/src/stores/auth.ts`
- **新增 state**: `lastProfileFetch: 0`, `_pendingRefresh: null`
- **新增 action**: `maybeRefreshProfile()`, `_doRefreshProfile()`
- **不改动**: `login()`, `doRefresh()`, `fetchProfile()`, `logout()`, `hasPerm()` 均保持原样

### `frontend/src/router/index.ts`
- **改造 `beforeEach`**: 同步 → async，插入 `await auth.maybeRefreshProfile()`
- **新增 import**: `Notify` from `quasar`（用于权限变更提示）
- **锚点**: 第 19~26 行整体替换

### `frontend/src/pages/RolePage.vue`
- **角色列表项**: 在 `<q-item-label caption>` 下方加 `成员: {{ r._count?.users ?? 0 }}` 展示
- **删除按钮**: 加 `:disable` + `<q-tooltip>` 条件逻辑
  - `r.code === 'ADMIN'` → disabled + tooltip "系统角色不可删除"
  - `r._count?.users > 0` → disabled + tooltip "请先解绑 N 个用户"
  - 其他 → 正常可点击
- **保存权限按钮**: 加 `:disable="isAdminSelected && checkedIds.length === 0"` 条件
- **新增 computed**: `isAdminSelected = computed(() => selected.value?.code === 'ADMIN')`
- **锚点**: 第 27 行删除按钮区域、第 48 行保存权限按钮

### `frontend/src/layouts/MainLayout.vue`
- **无代码改动**。`visibleMenus` computed 已基于 `auth.hasPerm()` 过滤，权限刷新后 store 更新会自动触发重新计算。仅需 UAT 验证。

### `frontend/src/boot/perm.ts`
- **无代码改动**。`v-perm` 指令在 `mounted` 时一次性判断，不响应后续权限变化。这是已知限制但 v1.0 可接受 —— 权限变更后用户切换路由时 beforeEach 会刷新权限，新页面的 v-perm 会用最新权限判断。

### `frontend/src/pages/ForbiddenPage.vue`
- **可选微调**: 当前文案"无权限访问此页面"已足够。如需可加"返回首页"按钮（已有 `<q-btn to="/">`）。无必要改动。

### `frontend/src/pages/UserPage.vue`
- **无代码改动**。角色选择器 `q-select multiple` 已实现 `roleIds` 绑定（第 131 行），后端 `PUT /users/:id` 已处理 roleIds（`user.route.ts:93-101`）。仅需 UAT 验证。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 角色用户计数 | 手动 COUNT SQL | Prisma `_count: { select: { users: true } }` | 一行配置，Prisma 生成优化 SQL |
| 并发请求去重 | 自定义锁/队列 | Promise 缓存模式（`_pendingRefresh`） | 3 行代码解决，无需引入库 |
| 权限刷新防抖 | setTimeout/debounce 库 | 时间戳比较 `Date.now() - last < 60_000` | 比 lodash.debounce 更简单直接 |
| 错误响应格式 | 自定义 error handler | 已有 `BizError` + `onError` 全局处理 | Phase 2 已建立模式 |
| 按钮禁用 + tooltip | 自定义 directive | Quasar `q-btn :disable` + `q-tooltip` | 框架原生组件 |

## Common Pitfalls

### Pitfall 1: v-perm 指令不响应权限变化
**What goes wrong:** `v-perm` 在 `mounted` 时移除 DOM 元素，权限变更后不会恢复
**Why it happens:** 指令只在 `mounted` 钩子执行一次，没有 `updated` 钩子
**How to avoid:** v1.0 接受此限制。权限变更后用户切换路由，新页面 mount 时用最新权限判断。不需要改 v-perm 实现
**Warning signs:** 用户在同一页面停留时权限变更不生效 —— 这是预期行为

### Pitfall 2: beforeEach 异步导致白屏
**What goes wrong:** `maybeRefreshProfile()` 网络慢时路由跳转卡住
**Why it happens:** await 阻塞了路由导航
**How to avoid:** 60s 防抖确保大多数跳转不触发网络请求。首次加载时 profile 请求通常 < 200ms。失败时 catch 静默，不阻塞导航
**Warning signs:** 路由跳转延迟 > 1s

### Pitfall 3: ADMIN 检查遗漏 —— 先查挂载再查 code
**What goes wrong:** 如果先检查 `_count.users > 0`，ADMIN 被挂载时返回"请先解绑"而非"系统角色不可删除"
**Why it happens:** 检查顺序错误
**How to avoid:** D-08 锁定：ADMIN 检查必须在挂载检查之前。后端 `if (role.code === 'ADMIN')` 放在 `if (role._count.users > 0)` 之前
**Warning signs:** curl 删除 ADMIN 角色时返回"请先解绑"而非"系统角色不可删除"

### Pitfall 4: Prisma _count 与 include 混用
**What goes wrong:** `_count` 和 `include` 同时使用时返回结构不符预期
**Why it happens:** Prisma 的 `_count` 是顶层字段，不在 `include` 内部
**How to avoid:** 正确写法是 `include: { permissions: {...}, _count: { select: { users: true } } }`，`_count` 与 `permissions` 同级
**Warning signs:** TypeScript 类型错误或运行时 `r._count` 为 undefined

### Pitfall 5: 权限刷新与 axios 401 拦截器竞争
**What goes wrong:** `maybeRefreshProfile()` 发起 `/auth/profile` 请求，access token 恰好过期，触发 401 → axios 拦截器 refresh → 重试 → 成功。但 `maybeRefreshProfile` 的 catch 可能吞掉重试后的成功响应
**Why it happens:** axios 拦截器的 401 重试是透明的，`fetchProfile()` 最终会收到成功响应
**How to avoid:** `_doRefreshProfile` 的 catch 只需静默处理最终失败（refresh token 也过期的情况），正常的 401→refresh→重试 流程由 axios 拦截器透明处理，`fetchProfile` 会正常返回
**Warning signs:** 无 —— axios 拦截器已正确实现（`boot/axios.ts:19-56`）


## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 无自动化测试框架（D-17 锁定不引入） |
| Config file | N/A |
| Quick run command | 手动 curl + 浏览器验证 |
| Full suite command | UAT 清单人工执行 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method | 自动化? |
|--------|----------|-----------|---------------------|---------|
| FR-4.1 | ADMIN 角色不可删除 | 手动 curl | `curl -X DELETE /api/v1/roles/{adminId}` → 400 | 否 |
| FR-4.1 | 挂载用户的角色不可删除 | 手动 curl | 创建角色→挂载用户→`curl -X DELETE` → 400 | 否 |
| FR-4.3 | ADMIN 权限不能清空 | 手动 curl | `curl -X PUT /api/v1/roles/{adminId}/permissions -d '{"permissionIds":[]}'` → 400 | 否 |
| FR-4.1 | 角色列表返回 userCount | 手动 curl | `curl /api/v1/roles` → 检查 `_count.users` 字段 | 否 |
| FR-5.1 | 权限刷新 60s 防抖 | 手动浏览器 | 修改角色权限→等 60s→切换路由→检查菜单变化 | 否 |
| FR-5.2 | 路由守卫跳 403 | 手动浏览器 | 撤销 `role:list` 权限→切换到 /roles→应跳 403 | 否 |
| FR-5.3 | v-perm 按钮显隐 | 手动浏览器 | 撤销 `user:create` 权限→刷新→"新建用户"按钮消失 | 否 |
| NFR-1 | p95 < 500ms | 手动 curl + time | `time curl /api/v1/roles` 多次取 p95 | 否 |

### UAT 场景分解

#### UAT-1: admin/admin123 登录 → 跳转首页，侧边栏显示「系统管理」菜单
**步骤:**
1. 访问 http://localhost:9000，用 admin/admin123 登录
2. 验证跳转到 /dashboard
3. 验证侧边栏显示 4 个菜单：首页、部门、用户、角色
4. 验证所有菜单均可点击进入

**验证点:** `MainLayout.vue` 的 `visibleMenus` 对 ADMIN 用户返回全部 4 项（`hasPerm` 对 ADMIN 始终返回 true）

#### UAT-2: 普通用户登录 → 仅显示自己有权限的菜单
**步骤:**
1. 用 admin 创建测试用户 test1，分配 EMPLOYEE 角色（仅 `*:list` 权限）
2. 用 test1 登录
3. 验证侧边栏显示 4 个菜单（EMPLOYEE 有所有 `:list` 权限）
4. 验证"新建用户"、"新建部门"、"新建角色"按钮不可见（无 `:create` 权限）
5. 创建新角色 TEST_ROLE，仅分配 `user:list`
6. 将 test1 改为 TEST_ROLE
7. test1 重新登录（或等 60s 后切换路由）
8. 验证侧边栏仅显示：首页、用户（无部门、角色菜单）

**验证点:** `v-perm` 指令隐藏无权限按钮；`visibleMenus` 过滤无权限菜单

#### UAT-5: 撤销 HR 的 `user:create` 权限 → HR 登录后「新建用户」按钮消失
**步骤:**
1. 创建 HR 角色，分配 `user:list` + `user:create`
2. 创建 test2 用户，分配 HR 角色
3. test2 登录，进入用户页，验证"新建用户"按钮可见
4. 用 admin 在角色管理页撤销 HR 的 `user:create` 权限
5. test2 等待 60s 后切换路由（或刷新页面）
6. 进入用户页，验证"新建用户"按钮消失

**验证点:** 权限刷新 → v-perm 在新页面 mount 时用最新权限判断

### p95 < 500ms 本地验证方法

```bash
# 在 Docker 环境中执行 10 次角色列表请求，取 p95
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{time_total}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/api/v1/roles
done | sort -n | tail -2 | head -1
# p95 ≈ 第 10 次排序后的第 9 个值（10 次取 95th percentile）
```

角色表数据量极小（seed 2 行 + 用户创建的少量角色），`_count.users` 是 Prisma 生成的子查询，不会显著影响性能。预期 p95 < 50ms。[ASSUMED: 基于小数据量推断]


## Code Examples

### 后端: DELETE /roles/:id 完整保护逻辑

```typescript
// Source: 基于 role.route.ts:72-76 改造
// 文件: backend/src/modules/role/role.route.ts
import { BizError } from '../../utils/errors';

// 在 delete handler 中:
async ({ params }: any) => {
  const id = Number(params.id);
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw notFound('角色不存在');
  // D-08: ADMIN 检查优先
  if (role.code === 'ADMIN') throw new BizError('系统角色不可删除');
  // D-06: 挂载检查
  if (role._count.users > 0) {
    throw new BizError(`该角色仍有 ${role._count.users} 个用户，请先解绑`);
  }
  await prisma.role.delete({ where: { id } });
  return { ok: true };
}
```

### 后端: PUT /roles/:id/permissions ADMIN 空分配拒绝

```typescript
// Source: 基于 role.route.ts:53-69 改造
async ({ params, body }: any) => {
  const roleId = Number(params.id);
  // D-02: ADMIN 非空约束
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (role?.code === 'ADMIN' && body.permissionIds.length === 0) {
    throw new BizError('ADMIN 角色不能清空所有权限');
  }
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (body.permissionIds.length) {
    await prisma.rolePermission.createMany({
      data: body.permissionIds.map((permissionId: number) => ({ roleId, permissionId })),
    });
  }
  return { ok: true };
}
```

### 后端: GET /roles 增加 _count

```typescript
// Source: 基于 role.route.ts:8-13 改造
.get('/', async () =>
  prisma.role.findMany({
    include: {
      permissions: { include: { permission: { select: { id: true, code: true } } } },
      _count: { select: { users: true } },
    },
    orderBy: { id: 'asc' },
  }),
)
```

### 前端: RolePage 删除按钮禁用逻辑

```vue
<!-- Source: 基于 RolePage.vue:27 改造 -->
<q-btn
  v-perm="'role:delete'"
  size="sm" flat dense icon="delete" color="negative"
  :disable="r.code === 'ADMIN' || (r._count?.users ?? 0) > 0"
  @click.stop="onDelete(r)"
>
  <q-tooltip v-if="r.code === 'ADMIN'">系统角色不可删除</q-tooltip>
  <q-tooltip v-else-if="(r._count?.users ?? 0) > 0">
    请先解绑 {{ r._count.users }} 个用户
  </q-tooltip>
</q-btn>
```

### 前端: 保存权限按钮 ADMIN 空分配禁用

```vue
<!-- Source: 基于 RolePage.vue:48 改造 -->
<q-btn
  v-perm="'role:assign-permission'"
  color="primary"
  label="保存权限"
  :disable="isAdminSelected && checkedIds.length === 0"
  @click="savePerms"
>
  <q-tooltip v-if="isAdminSelected && checkedIds.length === 0">
    ADMIN 角色不能清空所有权限
  </q-tooltip>
</q-btn>

<!-- script 中新增 -->
<script>
const isAdminSelected = computed(() => selected.value?.code === 'ADMIN');
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next()` 回调式 beforeEach | `async (to) => RouteLocation` 返回值式 | Vue Router 4.0 (2020) | 更清晰的异步控制流 |
| 手动 SQL COUNT | Prisma `_count` include | Prisma 3.x+ (2022) | 一行配置替代手动查询 |
| 全局 mixin 做权限 | 自定义指令 `v-perm` + Pinia store | Vue 3 Composition API | 更精确的权限控制粒度 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 角色表数据量极小，`_count.users` 不影响 p95 | Validation Architecture | 如果角色数 > 1000 可能需要索引优化，但 OA 系统不太可能 |
| A2 | `v-perm` 不响应权限变化是 v1.0 可接受的限制 | Pitfall 1 | 如果用户要求同页面实时更新，需改 v-perm 加 `updated` 钩子 |
| A3 | `maybeRefreshProfile` 失败时静默处理不影响用户体验 | Architecture Patterns | 如果网络持续不可用，用户会使用过期权限直到 access token 过期 |

## Open Questions

1. **`_pendingRefresh` 的 Pinia 序列化问题**
   - What we know: Pinia state 默认可序列化，Promise 不可序列化
   - What's unclear: `_pendingRefresh` 作为 state 字段是否会导致 Pinia devtools 警告
   - Recommendation: 将 `_pendingRefresh` 放在 store 外部的模块级变量中（`let pendingRefresh: Promise<void> | null = null`），而非 Pinia state

2. **Notify 提示时机**
   - What we know: D-12 要求权限变更后 Notify 提示
   - What's unclear: 如果用户从 /dashboard（无 meta.perm）跳到 /users（有 meta.perm），权限刷新发现 user:list 被撤销，Notify 在跳转前还是跳转后显示
   - Recommendation: 在 `return { path: '/403' }` 之前调用 `Notify.create`，用户会在 403 页面看到提示

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | 否（Phase 2 已完成） | 双 JWT + authGuard |
| V3 Session Management | 否（Phase 2 已完成） | access 2h + refresh 7d |
| V4 Access Control | 是 | authGuard 权限码校验 + ADMIN bypass + 前端路由守卫 |
| V5 Input Validation | 是 | Elysia `t.Object` body 校验 |
| V6 Cryptography | 否 | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 绕过前端禁用按钮直接 curl 删除 ADMIN | Tampering | 后端硬校验 `role.code === 'ADMIN'`（D-03 双保险） |
| 清空 ADMIN 权限导致系统不可管理 | Elevation of Privilege | 后端拒绝 `permissionIds=[]`（D-02） |
| 权限变更后用户继续使用旧权限 | Information Disclosure | 60s 防抖刷新 + 路由切换触发（D-10/D-11） |
| 并发删除角色绕过挂载检查 | Race Condition | Prisma 事务级别保证（单次 findUnique + delete 在同一请求中） |

## Sources

### Primary (HIGH confidence)
- `backend/src/modules/role/role.route.ts` — 角色 CRUD 现有实现
- `backend/src/middlewares/auth.ts` — authGuard 现有实现
- `backend/src/utils/errors.ts` — BizError 工具类
- `frontend/src/stores/auth.ts` — auth store 现有实现
- `frontend/src/router/index.ts` — Router.beforeEach 现有实现
- `frontend/src/pages/RolePage.vue` — 角色管理页现有实现
- `frontend/src/boot/perm.ts` — v-perm 指令现有实现
- `frontend/src/boot/axios.ts` — axios 401 拦截器现有实现
- `backend/prisma/schema.prisma` — 数据模型定义
- `backend/prisma/seed.ts` — 14 权限码 + ADMIN/EMPLOYEE 角色

### Secondary (MEDIUM confidence)
- Vue Router 4 async navigation guards — [VERIFIED: Vue Router 4 官方支持 async beforeEach]
- Prisma `_count` include — [VERIFIED: Prisma 官方文档支持 `_count` 在 include 中使用]

### Tertiary (LOW confidence)
- 无

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部基于已有代码，无新依赖引入
- Architecture: HIGH — 权限刷新模式是标准 SPA 实践，代码改动量小
- Pitfalls: HIGH — 基于对现有代码的逐行审查

**Research date:** 2026-04-19
**Valid until:** 2026-05-19（稳定期 30 天，无外部依赖变化风险）
