# Phase 4: RBAC - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 4 (modified)
**Analogs found:** 4 / 4

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `backend/src/modules/role/role.route.ts` | route | request-response (CRUD) | `backend/src/modules/department/department.route.ts` | exact |
| `frontend/src/stores/auth.ts` | store | user-action → API → state-update | `frontend/src/boot/axios.ts` (Promise 去重模式) | role-match |
| `frontend/src/router/index.ts` | router-guard | navigation → async-check → redirect | 自身现有实现 (lines 19-26) | exact (改造) |
| `frontend/src/pages/RolePage.vue` | page/component | user-action → API → UI-update | `frontend/src/pages/DepartmentPage.vue` | role-match |

## Pattern Assignments

### `backend/src/modules/role/role.route.ts` (route, CRUD)

**Analog:** `backend/src/modules/department/department.route.ts`

**Imports pattern** (department.route.ts lines 1-4):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';
```
> role.route.ts 当前 line 4 只导入了 `notFound`，需补充 `BizError`。

**Prisma `_count` include pattern** (department.route.ts lines 93-95):
```typescript
const dept = await prisma.department.findUnique({
  where: { id },
  include: { _count: { select: { children: true, users: true } } },
});
```
> 这是项目中唯一的 `_count` 用例。role.route.ts 需在两处使用：
> 1. `GET /` findMany — `include: { ..., _count: { select: { users: true } } }` 与 `permissions` 同级
> 2. `DELETE /:id` findUnique — `include: { _count: { select: { users: true } } }`

**删除前校验 pattern** (department.route.ts lines 91-102):
```typescript
app.use(authGuard('department:delete')).delete('/:id', async ({ params }: any) => {
  const id = Number(params.id);
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { children: true, users: true } } },
  });
  if (!dept) throw notFound('部门不存在');
  if (dept._count.children > 0) throw new BizError('存在子部门，无法删除');
  if (dept._count.users > 0) throw new BizError('部门下存在用户，无法删除');
  await prisma.department.delete({ where: { id } });
  return { ok: true };
}),
```
> role DELETE 需复制此模式，检查顺序改为：
> 1. `!role` → `throw notFound('角色不存在')`
> 2. `role.code === 'ADMIN'` → `throw new BizError('系统角色不可删除')` (D-08 优先)
> 3. `role._count.users > 0` → `throw new BizError(...)` (D-06)

**BizError 构造签名** (utils/errors.ts lines 2-10):
```typescript
export class BizError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BIZ_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
```
> 默认 status=400, code='BIZ_ERROR'。直接 `throw new BizError('...')` 即可，无需传额外参数。

**Elysia guard + authGuard 嵌套 pattern** (role.route.ts lines 71-76, 当前 DELETE):
```typescript
.guard({}, (app) =>
  app.use(authGuard('role:delete')).delete('/:id', async ({ params }: any) => {
    await prisma.role.delete({ where: { id: Number(params.id) } });
    return { ok: true };
  }),
)
```
> 保持 `.guard({}, (app) => app.use(authGuard(...)).delete(...))` 结构不变，仅在 handler 内部加校验逻辑。

---

### `frontend/src/stores/auth.ts` (store, state-management)

**Analog:** 自身 + `frontend/src/boot/axios.ts` (Promise 去重模式)

**现有 store 结构** (auth.ts lines 1-58 完整):
```typescript
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('oa_access') || '',
    refreshToken: localStorage.getItem('oa_refresh') || '',
    user: JSON.parse(localStorage.getItem('oa_user') || 'null') as UserInfo | null,
  }),
  // ...
});
```
> 新增 state 字段 `lastProfileFetch: 0` 放在 `user` 之后。

**axios.ts Promise 去重 pattern** (axios.ts lines 19-20, 28-35):
```typescript
let isRefreshing = false;
let waiters: Array<(t: string) => void> = [];

// 在拦截器内:
if (isRefreshing) {
  return new Promise((resolve) => {
    waiters.push((t) => { ... resolve(api(original)); });
  });
}
```
> `maybeRefreshProfile()` 的并发去重应采用类似的模块级变量模式。
> RESEARCH.md Open Question #1 建议：`_pendingRefresh` 放在 store 外部模块级变量，避免 Pinia 序列化问题。

**推荐实现模式 — 模块级变量 + store action**:
```typescript
// store 文件顶部，defineStore 之前
let pendingRefresh: Promise<void> | null = null;

// state 新增:
lastProfileFetch: 0,

// actions 新增:
async maybeRefreshProfile() {
  if (!this.accessToken) return;
  if (Date.now() - this.lastProfileFetch < 60_000) return;
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = this._doRefreshProfile();
  try { await pendingRefresh; } finally { pendingRefresh = null; }
},
async _doRefreshProfile() {
  try {
    await this.fetchProfile();   // 复用已有 line 39-42
    this.lastProfileFetch = Date.now();
  } catch { /* 401 由 axios 拦截器处理 */ }
},
```

**已有 `fetchProfile()` 签名** (auth.ts lines 39-43):
```typescript
async fetchProfile() {
  const { data } = await api.get('/auth/profile');
  this.user = data;
  localStorage.setItem('oa_user', JSON.stringify(data));
},
```
> `maybeRefreshProfile` 内部直接调用 `this.fetchProfile()`，不重复实现。

---

### `frontend/src/router/index.ts` (router-guard, navigation)

**Analog:** 自身现有实现 (lines 19-26)

**当前 beforeEach** (router/index.ts lines 19-26):
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

**改造为 async 返回值式** (Vue Router 4 推荐):
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

**关键变化点:**
1. `(to, _from, next)` → `async (to)` — 去掉 `next` 回调
2. `return next()` → `return true`
3. `return next({ path: '...' })` → `return { path: '...' }`
4. 新增 `await auth.maybeRefreshProfile()` 在 perm 检查之前
5. 新增 `import { Notify } from 'quasar'`

**Notify.create 用法** (DepartmentPage.vue line 208, RolePage.vue line 120):
```typescript
Notify.create({ type: 'positive', message: '保存成功' });
// 路由守卫中用 warning 类型:
Notify.create({ type: 'warning', message: '您的权限已更新' });
```

---

### `frontend/src/pages/RolePage.vue` (page, CRUD-UI)

**Analog:** `frontend/src/pages/DepartmentPage.vue`

**Dialog.create 删除确认 pattern** (DepartmentPage.vue lines 213-224):
```typescript
function onDelete(node: any) {
  Dialog.create({
    title: '删除部门',
    message: `将永久删除部门 ${node.name}。子部门或用户存在时删除会失败。此操作不可恢复。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    await api.delete(`/departments/${node.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}
```
> RolePage 现有 `onDelete` (line 124-130) 已使用 Dialog.create，但缺少 `ok: { label, color }` 配置。
> Phase 4 不需要改 onDelete 逻辑（后端 400 会被 axios 拦截器 Notify.create negative 展示），只需加按钮禁用。

**q-btn disable + q-tooltip pattern** (项目中尚无此组合，但 Quasar 标准写法):
```vue
<q-btn
  :disable="someCondition"
  @click.stop="handler"
>
  <q-tooltip v-if="someCondition">提示文案</q-tooltip>
</q-btn>
```
> RolePage 删除按钮 (line 27) 需加 `:disable` 和条件 `<q-tooltip>`。
> 注意：`v-perm` 指令在 `mounted` 时移除 DOM，与 `:disable` 不冲突 — 有权限时元素存在但可能 disabled。

**RolePage 现有删除按钮** (RolePage.vue line 27):
```vue
<q-btn v-perm="'role:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(r)" />
```
> 改造为:
```vue
<q-btn
  v-perm="'role:delete'" size="sm" flat dense icon="delete" color="negative"
  :disable="r.code === 'ADMIN' || (r._count?.users ?? 0) > 0"
  @click.stop="onDelete(r)"
>
  <q-tooltip v-if="r.code === 'ADMIN'">系统角色不可删除</q-tooltip>
  <q-tooltip v-else-if="(r._count?.users ?? 0) > 0">
    请先解绑 {{ r._count.users }} 个用户
  </q-tooltip>
</q-btn>
```

**RolePage 现有保存权限按钮** (RolePage.vue line 48):
```vue
<q-btn v-perm="'role:assign-permission'" color="primary" label="保存权限" @click="savePerms" />
```
> 改造为:
```vue
<q-btn
  v-perm="'role:assign-permission'" color="primary" label="保存权限"
  :disable="isAdminSelected && checkedIds.length === 0"
  @click="savePerms"
>
  <q-tooltip v-if="isAdminSelected && checkedIds.length === 0">
    ADMIN 角色不能清空所有权限
  </q-tooltip>
</q-btn>
```

**RolePage 成员数展示位置** (RolePage.vue lines 21-22):
```vue
<q-item-label>{{ r.name }}</q-item-label>
<q-item-label caption>{{ r.code }}</q-item-label>
```
> 在 caption 行追加成员数:
```vue
<q-item-label caption>{{ r.code }} · 成员: {{ r._count?.users ?? 0 }}</q-item-label>
```

**新增 computed** (script 区域):
```typescript
const isAdminSelected = computed(() => selected.value?.code === 'ADMIN');
```

---

## Shared Patterns

### BizError 错误抛出
**Source:** `backend/src/utils/errors.ts` lines 2-10
**Apply to:** `role.route.ts` DELETE handler, PUT permissions handler
```typescript
// 用法统一：直接 throw，默认 400 + BIZ_ERROR
throw new BizError('系统角色不可删除');
throw new BizError('该角色仍有 N 个用户，请先解绑');
throw new BizError('ADMIN 角色不能清空所有权限');
```
> axios 拦截器 (axios.ts line 52-53) 会自动读取 `error.response.data.message` 并 Notify.create negative。

### Quasar Dialog.create 删除确认
**Source:** `frontend/src/pages/DepartmentPage.vue` lines 213-224
**Apply to:** RolePage `onDelete` (已有，无需改动)
```typescript
Dialog.create({
  title: '确认删除',
  message: `删除角色 ${r.name}? 此操作不可恢复`,
  cancel: true,
  ok: { label: '确认删除', color: 'negative' },
}).onOk(async () => { ... });
```

### Quasar Notify.create 反馈
**Source:** `frontend/src/pages/RolePage.vue` line 120, DepartmentPage.vue line 208
**Apply to:** router/index.ts (权限变更提示)
```typescript
Notify.create({ type: 'warning', message: '您的权限已更新' });
```

### authGuard ADMIN bypass
**Source:** `backend/src/middlewares/auth.ts` line 40
**Apply to:** 仅验证，不改动
```typescript
if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
  throw forbidden(`缺少权限: ${requiredPerm}`);
}
```
> ADMIN 用户绕过所有权限检查，Phase 4 不改此逻辑。

### /auth/profile 返回结构
**Source:** `backend/src/modules/auth/auth.route.ts` lines 63-64
**Apply to:** 仅验证，不改动
```typescript
.use(authGuard())
.get('/profile', ({ currentUser }: any) => currentUser);
// currentUser 结构: { id, username, realName, roleCodes, permissions }
```
> `fetchProfile()` 调用此端点，`maybeRefreshProfile()` 复用 `fetchProfile()`。

---

## Grep-Verifiable Signatures

实施完成后可用以下命令验证关键模式是否到位：

| 验证项 | Grep 命令 |
|--------|-----------|
| role.route.ts 导入 BizError | `grep "BizError" backend/src/modules/role/role.route.ts` |
| DELETE handler ADMIN 检查 | `grep "role.code.*ADMIN" backend/src/modules/role/role.route.ts` |
| DELETE handler 挂载检查 | `grep "_count.users" backend/src/modules/role/role.route.ts` |
| GET list 返回 _count | `grep "_count.*select.*users" backend/src/modules/role/role.route.ts` |
| PUT permissions ADMIN 空分配 | `grep "permissionIds.length === 0" backend/src/modules/role/role.route.ts` |
| auth.ts lastProfileFetch | `grep "lastProfileFetch" frontend/src/stores/auth.ts` |
| auth.ts maybeRefreshProfile | `grep "maybeRefreshProfile" frontend/src/stores/auth.ts` |
| auth.ts 模块级 pendingRefresh | `grep "let pendingRefresh" frontend/src/stores/auth.ts` |
| router async beforeEach | `grep "async (to)" frontend/src/router/index.ts` |
| router Notify import | `grep "Notify" frontend/src/router/index.ts` |
| router maybeRefreshProfile 调用 | `grep "maybeRefreshProfile" frontend/src/router/index.ts` |
| RolePage isAdminSelected | `grep "isAdminSelected" frontend/src/pages/RolePage.vue` |
| RolePage _count.users 展示 | `grep "_count" frontend/src/pages/RolePage.vue` |
| RolePage 删除按钮 disable | `grep "r.code.*ADMIN" frontend/src/pages/RolePage.vue` |

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (无) | — | — | 所有 4 个修改文件均有精确或角色匹配的 analog |

## Metadata

**Analog search scope:** `backend/src/`, `frontend/src/`
**Files scanned:** 12 (role.route.ts, department.route.ts, auth.route.ts, auth.ts middleware, errors.ts, auth.ts store, router/index.ts, routes.ts, RolePage.vue, DepartmentPage.vue, MainLayout.vue, axios.ts, perm.ts, ForbiddenPage.vue)
**Pattern extraction date:** 2026-04-19
