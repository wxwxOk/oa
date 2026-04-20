# Phase 3: 组织架构 CRUD - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 6 (modified)
**Analogs found:** 6 / 6 (all self-analog — Phase 3 modifies existing files)

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `backend/src/modules/user/user.route.ts` | controller | request-response (CRUD) | self (existing code) | exact |
| `backend/src/modules/department/department.route.ts` | controller | request-response (CRUD) | self (existing code) | exact |
| `frontend/src/pages/UserPage.vue` | component (page) | request-response (CRUD) | self (existing code) | exact |
| `frontend/src/pages/DepartmentPage.vue` | component (page) | request-response (CRUD) | self (existing code) | exact |
| `frontend/src/css/quasar.variables.scss` | config (theme) | N/A | self (existing code) | exact |
| `frontend/src/css/app.scss` | config (style) | N/A | self (existing code) | exact |

> Phase 3 不创建新文件，全部为修改现有文件。每个文件的 analog 就是自身——需要在现有模式上增量修补。

---

## Pattern Assignments

### `backend/src/modules/user/user.route.ts` (controller, CRUD)

**Analog:** self — 已有完整 CRUD 骨架，需增量修改

**Imports pattern** (lines 1-5):
```typescript
import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';
```

**Auth guard pattern — 按操作独立 guard** (lines 21-22, 54-56, 85-87, 122-124):
```typescript
// 顶层 guard 保护列表
export const userModule = new Elysia({ prefix: '/users' })
  .use(authGuard('user:list'))
  .get('/', async ({ query }: any) => { /* ... */ })
  // 每个写操作用独立 .guard() 块包裹
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:create'))
      .post('/', /* ... */)
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:update'))
      .put('/:id', /* ... */)
      // ⚠️ BUG: reset-password 在 user:update guard 内，D-05 要求独立
      .post('/:id/reset-password', /* ... */)
  )
```
**修改要点:** reset-password 需从 `user:update` guard 中拆出，独立为 `user:reset-password` guard。

**分页列表 pattern** (lines 25-52):
```typescript
async ({ query }: any) => {
  const page = Number(query.page ?? 1);
  const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
  const keyword = query.keyword as string | undefined;
  const departmentId = query.departmentId ? Number(query.departmentId) : undefined;

  const where: any = {};
  if (keyword) {
    where.OR = [
      { username: { contains: keyword, mode: 'insensitive' } },
      { realName: { contains: keyword, mode: 'insensitive' } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  // ⚠️ 缺少 status 筛选，D-03/D-16 要求新增

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: userSelect, skip: (page - 1) * pageSize, take: pageSize, orderBy: { id: 'desc' } }),
  ]);
  return { total, items, page, pageSize };
},
{ query: t.Object({ page: t.Optional(t.String()), pageSize: t.Optional(t.String()), keyword: t.Optional(t.String()), departmentId: t.Optional(t.String()) }) },
```
**修改要点:** 在 where 构建中增加 `status` 筛选，query schema 增加 `status: t.Optional(t.String())`。

**Error handling pattern** (line 94):
```typescript
const exists = await prisma.user.findUnique({ where: { id } });
if (!exists) throw notFound('用户不存在');
```
> 使用 `utils/errors.ts` 的工厂函数抛出 BizError，由 `index.ts` 的 onError 统一捕获返回。

---

### `backend/src/modules/department/department.route.ts` (controller, CRUD)

**Analog:** self — 已有完整 CRUD + buildTree

**Imports pattern** (lines 1-4):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';
```

**buildTree 工具函数 pattern** (lines 14-28):
```typescript
function buildTree(rows: { id: number; name: string; parentId: number | null; sort: number }[]): DeptNode[] {
  const map = new Map<number, DeptNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
  const sortRec = (arr: DeptNode[]) => {
    arr.sort((a, b) => a.sort - b.sort || a.id - b.id);
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
```
> 此函数不需要修改，但新增的 `getDescendantIds` 应遵循相同的"全量查询 + 内存递归"模式。

**循环引用校验 — 当前实现** (lines 51-53):
```typescript
const id = Number(params.id);
if (body.parentId === id) throw new BizError('上级部门不能是自己');
return prisma.department.update({ where: { id }, data: body });
```
**修改要点:** 仅校验直接自引用，D-11 要求递归排除所有子孙。需新增 `getDescendantIds` 函数。

**删除校验 pattern** (lines 67-78):
```typescript
const dept = await prisma.department.findUnique({
  where: { id },
  include: { _count: { select: { children: true, users: true } } },
});
if (!dept) throw notFound('部门不存在');
if (dept._count.children > 0) throw new BizError('存在子部门，无法删除');
if (dept._count.users > 0) throw new BizError('部门下存在用户，无法删除');
```
> 此模式正确，无需修改。

---

### `frontend/src/pages/UserPage.vue` (component, CRUD)

**Analog:** self — 已有完整页面骨架

**Imports pattern** (lines 70-72):
```typescript
import { ref, reactive, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { Dialog, Notify } from 'quasar';
```

**API 调用 pattern** (lines 93-105):
```typescript
async function load(page = pagination.value.page) {
  loading.value = true;
  try {
    const { data } = await api.get('/users', {
      params: { page, pageSize: pagination.value.rowsPerPage, keyword: keyword.value || undefined },
    });
    rows.value = data.items;
    pagination.value.rowsNumber = data.total;
    pagination.value.page = data.page;
  } finally {
    loading.value = false;
  }
}
```
**修改要点:** params 中增加 `status: statusFilter.value || undefined`。

**Dialog 确认 pattern** (lines 162-168):
```typescript
function onDelete(row: any) {
  Dialog.create({ title: '确认删除', message: `删除用户 ${row.username}?`, cancel: true }).onOk(async () => {
    await api.delete(`/users/${row.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}
```
**修改要点:** message 改为 `将永久删除用户 ${row.username}。此操作不可恢复。`（D-02）。

**表单对话框 pattern** (lines 47-65 template, 119-134 script):
```vue
<q-dialog v-model="dialog">
  <q-card style="min-width: 360px">
    <q-card-section class="text-h6">{{ form.id ? '编辑' : '新建' }}用户</q-card-section>
    <q-card-section class="q-gutter-sm">
      <q-input v-model="form.username" label="用户名" outlined />
      <!-- ... -->
    </q-card-section>
    <q-card-actions align="right">
      <q-btn flat label="取消" v-close-popup />
      <q-btn color="primary" label="保存" @click="onSave" />
    </q-card-actions>
  </q-card>
</q-dialog>
```
**修改要点:** 所有 q-input 增加 `:rules` prop（D-06/D-07），必填字段 label 加红星号。

**重置密码 pattern** (lines 170-175):
```typescript
function onReset(row: any) {
  Dialog.create({ title: '重置密码', message: '将密码重置为 123456?', cancel: true }).onOk(async () => {
    const { data } = await api.post(`/users/${row.id}/reset-password`, {});
    Notify.create({ type: 'positive', message: `新密码: ${data.password}`, timeout: 5000 });
  });
}
```
**修改要点:** 成功后改为 Dialog 显示密码 + 复制按钮（D-13），而非 Notify。

---

### `frontend/src/pages/DepartmentPage.vue` (component, CRUD)

**Analog:** self — 已有 q-tree + 对话框骨架

**q-tree 节点模板 pattern** (lines 9-27):
```vue
<q-tree :nodes="tree" node-key="id" label-key="name" children-key="children" default-expand-all>
  <template #default-header="props">
    <div class="row items-center full-width">
      <q-icon name="folder" class="q-mr-sm text-amber" />
      <div>{{ props.node.name }}</div>
      <q-space />
      <q-btn v-perm="'department:create'" size="sm" flat dense icon="add" @click.stop="openEdit({ parentId: props.node.id })" />
      <q-btn v-perm="'department:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(props.node)" />
      <q-btn v-perm="'department:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(props.node.id)" />
    </div>
  </template>
</q-tree>
```
> 此模式正确，无需修改。

**对话框表单 pattern** (lines 29-41):
```vue
<q-dialog v-model="dialog">
  <q-card style="min-width: 320px">
    <q-card-section class="text-h6">{{ form.id ? '编辑' : '新建' }}部门</q-card-section>
    <q-card-section class="q-gutter-sm">
      <q-input v-model="form.name" label="名称" outlined />
      <q-input v-model.number="form.sort" label="排序" type="number" outlined />
    </q-card-section>
    <!-- ... -->
  </q-card>
</q-dialog>
```
**修改要点:**
1. 增加父部门 q-select 树形下拉（D-09）
2. 编辑时排除自身及子部门（D-11）
3. q-input 增加 `:rules`（D-06）
4. 必填字段 label 加红星号

**onSave pattern** (lines 66-69):
```typescript
async function onSave() {
  if (form.id) await api.put(`/departments/${form.id}`, { name: form.name, sort: form.sort });
  else await api.post('/departments', { name: form.name, parentId: form.parentId, sort: form.sort });
  // ...
}
```
**修改要点:** 编辑时也传 `parentId`（当前只传 name + sort）。

---

### `frontend/src/css/quasar.variables.scss` (config, theme)

**Analog:** self — 当前为 Quasar 默认色彩

**当前内容** (lines 1-12):
```scss
$primary   : #1976d2;
$secondary : #26a69a;
$accent    : #9c27b0;
$dark      : #1d1d1d;
$dark-page : #121212;
$positive  : #21ba45;
$negative  : #c10015;
$info      : #31ccec;
$warning   : #f2c037;
```
**修改要点:** 全部替换为 UI-SPEC 定义的 Slate + Indigo 色系：
```scss
$primary   : #4F46E5;  // indigo-600
$secondary : #475569;  // slate-600
$accent    : #6366F1;  // indigo-500
$dark      : #0F172A;  // slate-900
$dark-page : #0F172A;  // slate-900
$positive  : #16A34A;  // green-600
$negative  : #DC2626;  // red-600
$info      : #3B82F6;  // blue-500
$warning   : #F59E0B;  // amber-500
```

---

### `frontend/src/css/app.scss` (config, style)

**Analog:** self — 当前仅有 `.full-page`

**当前内容** (line 1-3):
```scss
.full-page {
  min-height: 100vh;
}
```
**修改要点:** 追加 UI-SPEC 定义的 CSS 变量、字体栈、typography 覆盖：
- `:root` + `.body--dark` CSS 自定义属性（--oa-bg, --oa-surface, --oa-border 等）
- `body { font-family: ... }` 中文优先字体栈
- `.text-h6` 覆盖为 20px/600/1.2
- 表格行 hover、focus ring 等微交互样式

---

## Shared Patterns

### Authentication / Authorization
**Source:** `backend/src/middlewares/auth.ts` (lines 6-53)
**Apply to:** 所有后端路由文件（user.route.ts, department.route.ts）

```typescript
// authGuard 使用方式：每个操作独立 guard
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      // ... JWT 验证 + 权限码检查
      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }
      return { currentUser: { /* ... */ } };
    });
```
> ADMIN 角色跳过权限检查。前端 v-perm 指令使用相同权限码做 UI 隐藏。

### Error Handling
**Source:** `backend/src/utils/errors.ts` (lines 1-14) + `backend/src/index.ts` (lines 44-52)
**Apply to:** 所有后端路由文件

```typescript
// 抛出业务异常
throw new BizError('上级部门不能是自己');       // 400
throw notFound('用户不存在');                    // 404
throw unauthorized('令牌无效');                  // 401
throw forbidden('缺少权限: user:delete');        // 403

// index.ts onError 统一捕获
.onError(({ error, set }: any) => {
  if (error instanceof BizError) {
    set.status = error.status;
    return { code: error.code, message: error.message };
  }
  set.status = 500;
  return { code: 'INTERNAL', message: error.message ?? 'Server error' };
})
```

### Frontend API + Notification
**Source:** `frontend/src/boot/axios.ts` (lines 1-62) + `frontend/src/pages/UserPage.vue`
**Apply to:** 所有前端页面组件

```typescript
// API 调用
import { api } from 'src/boot/axios';
const { data } = await api.get('/users', { params: { ... } });

// 成功通知
Notify.create({ type: 'positive', message: '保存成功' });

// 确认对话框
Dialog.create({ title: '确认删除', message: '...', cancel: true }).onOk(async () => { ... });

// 错误由 axios 拦截器统一处理（Notify negative）
```

### v-perm Directive
**Source:** `frontend/src/boot/perm.ts` (lines 1-16)
**Apply to:** 所有前端页面中需要权限控制的按钮

```vue
<q-btn v-perm="'user:create'" color="primary" label="新建" @click="..." />
<q-btn v-perm="'user:delete'" icon="delete" color="negative" @click="..." />
```
> 权限码必须与后端 authGuard 完全一致（D-05）。

### Elysia Request Validation
**Source:** `backend/src/modules/user/user.route.ts` (lines 73-82)
**Apply to:** 所有后端 POST/PUT 端点

```typescript
{
  body: t.Object({
    username: t.String({ minLength: 2 }),
    password: t.Optional(t.String({ minLength: 4 })),
    realName: t.String({ minLength: 1 }),
    email: t.Optional(t.String()),
    phone: t.Optional(t.String()),
    departmentId: t.Optional(t.Number()),
    roleIds: t.Optional(t.Array(t.Number())),
  }),
}
```
> Elysia t.Object 做后端兜底校验，与前端 Quasar rules 对齐（D-08）。

---

## No Analog Found

本阶段无需创建全新文件，所有修改都在现有文件上进行，因此不存在"无 analog"的情况。

---

## Metadata

**Analog search scope:** `backend/src/modules/`, `backend/src/middlewares/`, `backend/src/utils/`, `frontend/src/pages/`, `frontend/src/css/`, `frontend/src/boot/`
**Files scanned:** 10 (6 modified targets + 4 shared pattern sources)
**Pattern extraction date:** 2026-04-19
