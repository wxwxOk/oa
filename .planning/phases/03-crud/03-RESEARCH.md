# Phase 3: 组织架构 CRUD - Research

**Researched:** 2026-04-19
**Domain:** 部门树 CRUD + 用户 CRUD（Elysia + Prisma + Vue3 + Quasar）
**Confidence:** HIGH

## Summary

Phase 1 脚手架已生成部门和用户的后端路由（`department.route.ts`、`user.route.ts`）以及前端页面（`DepartmentPage.vue`、`UserPage.vue`），Phase 2 完成了双 JWT 实例 + authGuard 模式。Phase 3 的核心工作是**验证、修复、补全**这些已有代码，使其满足 CONTEXT.md 中的 21 项决策。

代码审查发现 5 个必须修复的问题：(1) 用户列表缺少 `status` 筛选参数（D-03/D-16）；(2) 重置密码端点被 `user:update` 权限保护而非 `user:reset-password`（D-05）；(3) 部门编辑时仅校验直接自引用，未排除所有子孙部门作为父部门（D-11）；(4) 前端表单缺少 Quasar rules 校验（D-06/D-07）；(5) 部门编辑对话框缺少父部门选择器（D-09）。UI 层面需要对齐 03-UI-SPEC.md 的设计契约（色彩、空态、状态徽章等）。

**Primary recommendation:** 按"后端修复 → 前端补全 → UI 对齐"三阶段推进。后端改动量小（权限码修正、status 筛选、循环引用校验），前端改动量中等（表单校验、父部门树选择器、状态筛选、空态、设计契约对齐）。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: 硬删除 + 禁用并存。保留现有 DELETE /:id 端点作为硬删除，同时在用户列表加"启用/禁用"快捷按钮（PATCH status）
- D-02: 前端删除按钮加二次确认"此操作不可恢复"；禁用/启用按钮无需二次确认
- D-03: 列表增加 status 筛选（全部/启用/禁用），配合禁用并存决策
- D-04: Phase 3 锁定 module:action 命名规范，权限码：user:list/create/update/delete/reset-password, department:list/create/update/delete
- D-05: 后端 authGuard 和前端 v-perm 必须使用完全一致的权限码。重置密码端点改用 user:reset-password
- D-06: 前端使用 Quasar 的 rules prop 做实时校验（失焦时触发），必填字段加红星号
- D-07: 校验规则：用户名必填 ≥2 字符、真实姓名必填、邮箱用 email 正则、手机号用简单数字校验、密码 ≥4 字符
- D-08: 后端 Elysia t.Object 保持现有严格度，与前端规则对齐
- D-09: 编辑对话框增加父部门选择器（q-select 树形下拉），支持编辑时修改父部门
- D-10: 排序保留数字输入，不做拖拽排序
- D-11: 编辑时父部门选择器排除自身及其子部门（防止循环引用）
- D-12: 创建用户时默认密码 123456，重置密码也回 123456
- D-13: 创建/重置成功后弹窗显示密码并提供复制按钮
- D-14: Phase 3 保留用户编辑对话框中的角色选择器（roleIds），创建/编辑用户时可顺手挂角色
- D-15: 角色本身的 CRUD + 权限分配是 Phase 4 的范围
- D-16: 用户列表筛选维度：keyword + departmentId + status（新增）
- D-17: 排序保持 id desc，分页默认 20 条/页
- D-18: 空态显示"暂无用户"+ 新建按钮
- D-19: UserPage 已有的 PC 表格/移动卡片切换保留现状，不额外打磨
- D-20: DepartmentPage 不做移动适配（q-tree 在小屏可用）
- D-21: 响应式双布局统一在 Phase 5 处理

### Claude's Discretion
- 具体 Quasar rules 校验函数的写法
- 父部门选择器的 UI 细节（树形下拉 vs 级联选择）
- 空态插图/图标选择
- 错误提示的具体文案
- 后端错误响应的格式细节

### Deferred Ideas (OUT OF SCOPE)
- 角色 CRUD + 权限分配 — Phase 4
- 响应式双布局（PC 侧边栏 + 移动底部 Tab）— Phase 5
- 用户头像上传 — 未规划
- 部门拖拽排序 — 未规划
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-2.1 | 创建/查询/更新/删除用户（软字段：status=DISABLED 视为禁用） | 后端 user.route.ts 已有 CRUD，需补 status 筛选 + 权限码修正 |
| FR-2.2 | 分页列表 + 按用户名/真实姓名/部门筛选 | 已有 keyword + departmentId 筛选，需新增 status 筛选（D-03） |
| FR-2.3 | 重置密码（管理员操作，生成随机密码或指定） | 已有端点，需修正权限码为 user:reset-password（D-05），加密码显示弹窗（D-13） |
| FR-3.1 | 无限层级树形部门 | 已有 buildTree + /tree 端点，Prisma schema 支持自引用 |
| FR-3.2 | CRUD；删除时若存在子部门或用户则拒绝 | 已有完整实现，需补循环引用深度校验（D-11） |
| FR-3.3 | /departments/tree 返回嵌套结构 | 已实现，无需改动 |
| NFR-1 | 列表接口 p95 < 500ms（本地 docker 环境） | Prisma 查询已有索引（departmentId, parentId），数据量小无性能风险 |
| NFR-3 | ESLint + Prettier；后端路由按 module 分文件；API 有 Swagger 文档 | 已有 ESLint/Prettier 配置 + Swagger 插件，路由按 module 分文件 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 用户 CRUD API | API (Elysia) | Database (PostgreSQL) | 业务逻辑在 Elysia 路由，Prisma 负责持久化 |
| 部门树 CRUD API | API (Elysia) | Database (PostgreSQL) | buildTree 在内存构建，数据来自 Prisma |
| 权限校验 | API (Elysia) | Browser (v-perm) | authGuard 做服务端强制校验，v-perm 做前端 UI 隐藏 |
| 表单校验 | Browser (Quasar rules) | API (Elysia t.Object) | 前端实时反馈，后端兜底校验 |
| 循环引用检测 | API (Elysia) | — | 必须在服务端校验，前端仅做 UI 过滤辅助 |
| 分页/筛选 | API (Elysia) | Browser (q-table) | 服务端分页，前端 q-table 触发 @request |
| 状态管理 | Browser (Vue reactive) | — | 页面级 ref/reactive，无需 Pinia store |
| 部门树选择器 | Browser (Quasar q-select) | — | 前端将 flat 列表转树形 options |

## Standard Stack

### Core（已安装，无需新增依赖）
| Library | Version (installed) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| elysia | ^1.1.24 | Web 框架 + 路由 | Bun 原生，类型安全 [VERIFIED: package.json] |
| @elysiajs/jwt | ^1.1.1 | JWT 认证 | Phase 2 已配置双实例 [VERIFIED: package.json] |
| @prisma/client | ^5.22.0 | ORM | 类型安全查询，自动参数化 [VERIFIED: package.json] |
| bcryptjs | ^2.4.3 | 密码哈希 | 重置密码需要 [VERIFIED: package.json] |
| quasar | ^2.17.0 | UI 框架 | q-table/q-tree/q-dialog/q-select [VERIFIED: package.json] |
| vue | ^3.5.12 | 前端框架 | 项目选型 [VERIFIED: package.json] |
| pinia | ^2.2.4 | 状态管理 | auth store [VERIFIED: package.json] |
| axios | ^1.7.7 | HTTP 客户端 | token 拦截器 [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @elysiajs/swagger | ^1.1.5 | API 文档 | NFR-3 要求 [VERIFIED: package.json] |
| @elysiajs/cors | ^1.1.1 | 跨域 | 开发环境 [VERIFIED: package.json] |

### New Dependencies
无。Phase 3 不需要引入任何新依赖。所有功能均可用现有 Quasar 组件实现。

**Installation:** 无需安装新包。

## Architecture Patterns

### System Architecture Diagram

```
[Browser]                                [Elysia Backend :3000]
   |                                           |
   |  GET /api/v1/users?page&keyword&status   |
   |----------------------------------------->|
   |                                    authGuard('user:list')
   |                                    accessJwt.verify
   |                                    load user + perms
   |                                           |
   |                                    Prisma.user.findMany
   |                                    (where: keyword+dept+status)
   |                                           |
   |  { total, items, page, pageSize }        |
   |<------------------------------------------|
   |                                           |
   |  GET /api/v1/departments/tree             |
   |----------------------------------------->|
   |                                    authGuard('department:list')
   |                                    Prisma.department.findMany
   |                                    buildTree(rows) in memory
   |                                           |
   |  [{ id, name, children: [...] }]         |
   |<------------------------------------------|
   |                                           |
   |  PUT /api/v1/departments/:id              |
   |  { parentId: X }                          |
   |----------------------------------------->|
   |                                    authGuard('department:update')
   |                                    getDescendantIds(id) ← 新增
   |                                    if parentId in descendants → 400
   |                                    Prisma.department.update
   |                                           |
   |  { id, name, parentId, sort }             |
   |<------------------------------------------|
```

### Pattern 1: 后端权限码分离（D-05 修复）
**What:** 将 reset-password 端点从 `user:update` guard 中独立出来，使用 `user:reset-password`
**When to use:** 不同操作需要不同权限码时
**Example:**
```typescript
// backend/src/modules/user/user.route.ts
// 修复前：reset-password 在 user:update guard 内
// 修复后：独立 guard
.guard({}, (app) =>
  app
    .use(authGuard('user:reset-password'))  // D-05: 独立权限码
    .post('/:id/reset-password', async ({ params, body }: any) => {
      const id = Number(params.id);
      const newPwd = body.password || '123456';
      await prisma.user.update({
        where: { id },
        data: { password: bcrypt.hashSync(newPwd, 10) },
      });
      return { password: newPwd };
    }, { body: t.Object({ password: t.Optional(t.String()) }) }),
)
```
[VERIFIED: 代码审查 user.route.ts 第 54-121 行]

### Pattern 2: 循环引用深度校验（D-11）
**What:** 编辑部门时，校验新 parentId 不是自身或任何子孙部门
**When to use:** 树形结构的父节点变更
**Example:**
```typescript
// backend/src/modules/department/department.route.ts
// 获取某部门的所有子孙 ID（递归）
async function getDescendantIds(deptId: number): Promise<Set<number>> {
  const all = await prisma.department.findMany({
    select: { id: true, parentId: true },
  });
  const ids = new Set<number>();
  const collect = (pid: number) => {
    for (const d of all) {
      if (d.parentId === pid && !ids.has(d.id)) {
        ids.add(d.id);
        collect(d.id);
      }
    }
  };
  collect(deptId);
  return ids;
}

// 在 PUT /:id 中使用
if (body.parentId !== undefined && body.parentId !== null) {
  if (body.parentId === id) throw new BizError('上级部门不能是自己');
  const descendants = await getDescendantIds(id);
  if (descendants.has(body.parentId)) {
    throw new BizError('不能将部门移动到其子部门下');
  }
}
```
[VERIFIED: 代码审查 department.route.ts 第 52-54 行，当前仅校验直接自引用]

### Pattern 3: 用户列表 status 筛选（D-03/D-16）
**What:** 在用户列表 API 增加 status 查询参数
**When to use:** 需要按启用/禁用状态过滤用户
**Example:**
```typescript
// user.route.ts GET / 增加 status 参数
const status = query.status as string | undefined;
if (status && (status === 'ACTIVE' || status === 'DISABLED')) {
  where.status = status;
}
// query schema 增加：status: t.Optional(t.String())
```
[VERIFIED: 代码审查 user.route.ts 第 26-51 行，当前无 status 筛选]

### Pattern 4: Quasar q-select 树形下拉（D-09 父部门选择器）
**What:** 用 q-select + flat options 模拟树形下拉，通过缩进 label 表达层级
**When to use:** 需要从树形数据中选择单个节点
**Recommendation:** 使用 q-select 的 flat options，将树形数据扁平化为带缩进前缀的选项列表
**Example:**
```typescript
// 将树形数据扁平化为 q-select options
function flattenTree(
  nodes: DeptNode[],
  depth = 0,
  excludeIds = new Set<number>()
): Array<{ label: string; value: number }> {
  const result: Array<{ label: string; value: number }> = [];
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue;
    const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : '';
    result.push({ label: prefix + node.name, value: node.id });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1, excludeIds));
    }
  }
  return result;
}
```
[ASSUMED: Quasar 无内置 tree-select 组件，需手动扁平化。Context7 确认 q-select 支持 option slot 自定义渲染]

### Pattern 5: 前端表单校验（D-06/D-07）
**What:** 使用 Quasar q-input 的 `:rules` prop 做实时校验
**When to use:** 所有表单输入
**Example:**
```vue
<q-input
  v-model="form.username"
  label="用户名"
  outlined
  :rules="[
    (v: string) => !!v || '请输入用户名',
    (v: string) => v.length >= 2 || '至少 2 个字符',
  ]"
>
  <template #label>用户名 <span class="text-negative">*</span></template>
</q-input>
```
[VERIFIED: 03-UI-SPEC.md Form Validation Contract 已定义完整 rules]

### Pattern 6: 密码显示弹窗 + 复制按钮（D-13）
**What:** 创建用户或重置密码成功后，弹窗显示密码并提供复制功能
**When to use:** 创建用户成功、重置密码成功
**Example:**
```typescript
// 使用 navigator.clipboard API 复制
Dialog.create({
  title: '密码已重置',
  message: `新密码：123456`,
  html: true,
  ok: '关闭',
}).onOk(() => {});

// 或自定义组件实现复制按钮
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  Notify.create({ type: 'positive', message: '已复制到剪贴板' });
}
```
[ASSUMED: navigator.clipboard 在现代浏览器中广泛支持]

### Anti-Patterns to Avoid
- **前端做权限强制校验:** v-perm 只控制 UI 显隐，真正的权限校验必须在后端 authGuard 完成
- **前端信任 parentId 合法性:** 循环引用检测必须在后端执行，前端过滤仅为 UX 辅助
- **在 q-select options 中嵌套 q-tree:** 过度复杂，flat options + 缩进前缀足够
- **用 Pinia store 管理页面级临时状态:** 用户列表和部门树是页面级数据，用 ref/reactive 即可

### Recommended Project Structure（增量变更）
```
backend/src/modules/
├── department/
│   └── department.route.ts  # 修改：循环引用校验、parentId 编辑
├── user/
│   └── user.route.ts        # 修改：status 筛选、权限码分离
frontend/src/
├── css/
│   ├── quasar.variables.scss  # 修改：UI-SPEC 色彩覆盖
│   └── app.scss               # 修改：CSS 变量 + 字体栈
├── pages/
│   ├── DepartmentPage.vue     # 修改：父部门选择器、表单校验、空态、UI 对齐
│   └── UserPage.vue           # 修改：status 筛选、表单校验、空态、密码弹窗、UI 对齐
```

## Code Audit: 现有代码 vs CONTEXT.md 决策差距

### 后端差距（必须修复）

| 文件 | 问题 | 决策 | 修复方案 |
|------|------|------|---------|
| `user.route.ts:54-121` | reset-password 在 `user:update` guard 内 | D-05 | 独立为 `user:reset-password` guard |
| `user.route.ts:26-51` | GET / 缺少 status 查询参数 | D-03/D-16 | 增加 `status` 参数到 where 条件和 query schema |
| `department.route.ts:52-54` | PUT /:id 仅校验 `parentId === id` | D-11 | 增加 getDescendantIds 递归校验 |

### 前端差距（必须补全）

| 文件 | 问题 | 决策 | 修复方案 |
|------|------|------|---------|
| `UserPage.vue` | 表单无 rules 校验 | D-06/D-07 | 添加 :rules prop |
| `UserPage.vue` | 无 status 筛选 UI | D-03 | 添加 q-btn-toggle（全部/启用/禁用） |
| `UserPage.vue` | 无空态展示 | D-18 | 添加 q-banner 空态 |
| `UserPage.vue` | 删除确认文案不符 | D-02 | 改为"此操作不可恢复" |
| `UserPage.vue` | 重置密码无复制弹窗 | D-13 | 改为 Dialog 显示密码 + 复制按钮 |
| `UserPage.vue` | 无状态徽章 | UI-SPEC | 添加 q-chip 显示启用/禁用 |
| `DepartmentPage.vue` | 编辑对话框无父部门选择器 | D-09 | 添加 q-select 树形下拉 |
| `DepartmentPage.vue` | 编辑时不传 parentId | D-09 | onSave 时包含 parentId |
| `DepartmentPage.vue` | 表单无 rules 校验 | D-06 | 添加 :rules prop |
| `DepartmentPage.vue` | 无空态展示 | UI-SPEC | 添加 q-banner 空态 |
| `quasar.variables.scss` | 默认 Quasar 色彩 | UI-SPEC | 覆盖为 Slate + Indigo 色系 |
| `app.scss` | 仅有 .full-page | UI-SPEC | 添加 CSS 变量 + 字体栈 |

### 已正确实现（无需改动）

| 功能 | 文件 | 状态 |
|------|------|------|
| 部门 CRUD 后端 | department.route.ts | 完整（create/read/update/delete/tree） |
| 部门删除校验（子部门/用户） | department.route.ts:67-78 | 正确 |
| 用户 CRUD 后端 | user.route.ts | 基本完整（需微调） |
| 用户创建默认密码 123456 | user.route.ts:60 | 正确（D-12） |
| 角色选择器 | UserPage.vue:57 | 已有（D-14） |
| 部门选择器 | UserPage.vue:56 | 已有 |
| PC/移动切换 | UserPage.vue:12-45 | 已有（D-19 保持现状） |
| v-perm 指令 | perm.ts | 正确 |
| authGuard 权限校验 | auth.ts | 正确（ADMIN 跳过检查） |
| 分页 20 条/页 | UserPage.vue:91 | 正确（D-17） |
| 排序 id desc | user.route.ts:48 | 正确（D-17） |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 树形下拉选择器 | 自定义 tree-select 组件 | q-select + flattenTree 辅助函数 | Quasar 无内置 tree-select，但 q-select flat options + 缩进前缀足够简单 |
| 表单校验 | 手写 validate 函数 | Quasar q-input :rules prop | 内置失焦触发、错误提示、formRef.validate() |
| 服务端分页 | 手写 offset/limit | Prisma skip/take + q-table @request | 两端已有成熟模式 |
| 权限控制 | 手写 if/else | authGuard(permCode) + v-perm | 已有统一模式 |
| 剪贴板复制 | 手写 execCommand | navigator.clipboard.writeText | 现代浏览器标准 API |
| 循环引用检测 | 手写 SQL 递归 CTE | 内存递归（数据量小） | 部门数通常 < 1000，全量查询 + 内存递归足够 |

**Key insight:** Phase 3 不需要引入任何新库或复杂模式。所有功能都可以用现有 Quasar 组件 + 简单辅助函数实现。

## Common Pitfalls

### Pitfall 1: 权限码前后端不一致
**What goes wrong:** 后端用 `user:update` 保护 reset-password，前端用 `user:reset-password` 控制按钮显隐，导致有权限的用户看不到按钮或无权限的用户能调 API
**Why it happens:** Phase 1 脚手架生成时未严格对齐权限码
**How to avoid:** D-05 明确要求前后端权限码完全一致。修改后端 reset-password 端点的 guard 为 `user:reset-password`
**Warning signs:** 前端按钮显示但 API 返回 403，或按钮隐藏但直接调 API 能成功
**Current status:** 已确认存在此问题（user.route.ts 第 54 行 guard 为 user:update）

### Pitfall 2: 部门循环引用导致无限递归
**What goes wrong:** 将部门 A 的父部门设为 A 的子部门 B，buildTree 产生无限循环或丢失节点
**Why it happens:** 当前后端仅校验 `parentId === id`（直接自引用），未校验间接子孙
**How to avoid:** 在 PUT /:id 中递归收集所有子孙 ID，校验 parentId 不在其中
**Warning signs:** 部门树显示异常、API 超时、节点消失
**Current status:** 已确认存在此问题（department.route.ts 第 53 行）

### Pitfall 3: q-table 服务端分页 rowsNumber 未同步
**What goes wrong:** 翻页后总数不更新，分页器显示错误
**Why it happens:** q-table 的 `pagination.rowsNumber` 必须在每次 @request 回调中更新
**How to avoid:** 确保 load() 函数中 `pagination.value.rowsNumber = data.total`
**Warning signs:** 分页器显示"第 1 页 / 共 0 页"
**Current status:** 已正确实现（UserPage.vue 第 100 行）

### Pitfall 4: 编辑部门时丢失 parentId
**What goes wrong:** 编辑部门保存时未传 parentId，导致父部门被清空
**Why it happens:** 当前 DepartmentPage.vue onSave 编辑时只传 name 和 sort，不传 parentId
**How to avoid:** 编辑时也传 parentId（D-09 要求增加父部门选择器）
**Warning signs:** 编辑部门名称后，部门从子部门变成顶级部门
**Current status:** 已确认存在此问题（DepartmentPage.vue 第 67 行）

### Pitfall 5: 前端 loadMeta 调用 /roles 但 Phase 3 不做角色 CRUD
**What goes wrong:** 如果 roles 表为空或 API 报错，用户编辑对话框的角色选择器无数据
**Why it happens:** seed.ts 已创建 ADMIN 和 EMPLOYEE 角色，/roles API 已存在
**How to avoid:** 保持现状即可。seed 数据保证有角色可选，D-14 明确保留角色选择器
**Warning signs:** 角色下拉为空
**Current status:** 无问题（seed 已创建角色，/roles API 正常）

### Pitfall 6: Quasar q-select emit-value + map-options 与 null 值
**What goes wrong:** clearable 的 q-select 清空后 model 变为 undefined 而非 null，后端收到 undefined 不处理
**Why it happens:** Quasar q-select clearable 清空时 emit undefined
**How to avoid:** 在提交时将 undefined 转为 null：`departmentId: form.departmentId ?? null`
**Warning signs:** 清空部门后保存，用户仍关联旧部门
**Current status:** UserPage.vue 第 153 行用 `?? undefined` 处理，需改为 `?? null` 以正确清空

## Code Examples

### 完整的 status 筛选实现（后端）
```typescript
// Source: 代码审查 + D-03/D-16
// user.route.ts GET / 修改
async ({ query }: any) => {
  const page = Number(query.page ?? 1);
  const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
  const keyword = query.keyword as string | undefined;
  const departmentId = query.departmentId ? Number(query.departmentId) : undefined;
  const status = query.status as string | undefined;

  const where: any = {};
  if (keyword) {
    where.OR = [
      { username: { contains: keyword, mode: 'insensitive' } },
      { realName: { contains: keyword, mode: 'insensitive' } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (status === 'ACTIVE' || status === 'DISABLED') where.status = status;

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: userSelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'desc' },
    }),
  ]);
  return { total, items, page, pageSize };
}
```
[VERIFIED: 基于现有 user.route.ts 代码扩展]

### 前端 status 筛选 UI（q-btn-toggle）
```vue
<!-- Source: D-03 + UI-SPEC -->
<q-btn-toggle
  v-model="statusFilter"
  toggle-color="primary"
  flat
  bordered
  :options="[
    { label: '全部', value: '' },
    { label: '启用', value: 'ACTIVE' },
    { label: '禁用', value: 'DISABLED' },
  ]"
  @update:model-value="load(1)"
/>
```
[VERIFIED: UI-SPEC Component Inventory 指定 q-btn-toggle]

### 父部门树形选择器（前端）
```typescript
// Source: D-09/D-11
// DepartmentPage.vue 中的辅助函数
interface DeptOption { label: string; value: number | null }

function flattenTreeForSelect(
  nodes: DeptNode[],
  depth = 0,
  excludeIds = new Set<number>()
): DeptOption[] {
  const result: DeptOption[] = [];
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue;
    const indent = depth > 0 ? '\u3000'.repeat(depth) + '└ ' : '';
    result.push({ label: indent + node.name, value: node.id });
    if (node.children?.length) {
      result.push(...flattenTreeForSelect(node.children, depth + 1, excludeIds));
    }
  }
  return result;
}

// 编辑时排除自身及子孙（D-11）
function getExcludeIds(nodeId: number, nodes: DeptNode[]): Set<number> {
  const ids = new Set<number>([nodeId]);
  const collect = (children: DeptNode[]) => {
    for (const c of children) {
      ids.add(c.id);
      if (c.children?.length) collect(c.children);
    }
  };
  // 找到目标节点并收集其子孙
  const findAndCollect = (nodes: DeptNode[]) => {
    for (const n of nodes) {
      if (n.id === nodeId) { collect(n.children); return; }
      if (n.children?.length) findAndCollect(n.children);
    }
  };
  findAndCollect(nodes);
  return ids;
}
```
[ASSUMED: 基于 Quasar q-select flat options 模式，无内置 tree-select]

### 密码复制弹窗（D-13）
```typescript
// Source: D-13 + UI-SPEC Copywriting Contract
function showPasswordDialog(password: string, title = '密码已重置') {
  Dialog.create({
    title,
    message: `新密码：<code>${password}</code>`,
    html: true,
    ok: '关闭',
    persistent: true,
  });
  // 自动复制到剪贴板
  navigator.clipboard?.writeText(password).then(() => {
    Notify.create({ type: 'positive', message: '密码已复制到剪贴板' });
  });
}
```
[ASSUMED: navigator.clipboard 在 HTTPS 或 localhost 下可用]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quasar q-select 无 tree 模式 | 仍无内置 tree-select | 一直如此 | 需手动 flattenTree 辅助 |
| Prisma 5.x | Prisma 7.x 已发布 | 2025-2026 | 项目锁定 5.22.0，不升级 |
| Elysia 1.1.x | Elysia 1.4.x 已发布 | 2025-2026 | package.json 锁定 ^1.1.24，bun.lock 可能已解析到更高版本 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Quasar 无内置 tree-select 组件，需手动扁平化 | Pattern 4 | 低 — 即使有也可用 flat options 方案 |
| A2 | navigator.clipboard.writeText 在 localhost 开发环境可用 | Pattern 6 | 低 — 可降级为 document.execCommand('copy') |
| A3 | 部门数量 < 1000，全量查询 + 内存递归性能可接受 | Pattern 2 | 低 — OA 系统部门数通常远小于此 |
| A4 | Elysia guard 嵌套可以为同一路由前缀下的不同端点设置不同权限 | Pattern 1 | 低 — Phase 2 已验证此模式 |

## Open Questions

1. **Elysia 实际解析版本**
   - What we know: package.json 声明 `^1.1.24`，但 bun.lock 可能解析到 1.4.x
   - What's unclear: 实际运行版本是否为 1.4.x
   - Recommendation: 不影响 Phase 3 功能，保持现状

2. **密码复制弹窗的最佳 UX**
   - What we know: D-13 要求弹窗显示密码 + 复制按钮
   - What's unclear: 用 Dialog.create 的 html 模式还是自定义 Vue 组件
   - Recommendation: Dialog.create + html 模式足够简单，Claude's Discretion 范围

## Environment Availability

Step 2.6: SKIPPED（Phase 3 为纯代码/配置变更，无新外部依赖。所有工具在 Phase 2 已验证可用）

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | 否（Phase 2 已完成） | — |
| V3 Session Management | 否（Phase 2 已完成） | — |
| V4 Access Control | 是 | authGuard(permCode) 服务端强制校验 |
| V5 Input Validation | 是 | Elysia t.Object 后端校验 + Quasar rules 前端校验 |
| V6 Cryptography | 否（密码哈希 Phase 2 已完成） | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 越权操作（无权限用户调 CRUD API） | Elevation of Privilege | authGuard 每个端点独立校验权限码 |
| 部门循环引用导致 DoS | Denial of Service | 后端 getDescendantIds 递归校验 |
| 批量删除用户 | Tampering | 单条删除 + 二次确认（D-02） |
| XSS via 用户名/部门名 | Tampering | Prisma 参数化 + Vue 模板自动转义 |
| 密码明文泄露 | Information Disclosure | 仅在创建/重置时一次性显示，不存储明文 |

## Sources

### Primary (HIGH confidence)
- 代码审查：`backend/src/modules/user/user.route.ts` — 用户 CRUD 完整实现
- 代码审查：`backend/src/modules/department/department.route.ts` — 部门 CRUD + buildTree
- 代码审查：`backend/src/middlewares/auth.ts` — authGuard 模式
- 代码审查：`frontend/src/pages/UserPage.vue` — 用户管理页面
- 代码审查：`frontend/src/pages/DepartmentPage.vue` — 部门管理页面
- 代码审查：`backend/prisma/schema.prisma` — 数据模型
- 代码审查：`backend/prisma/seed.ts` — 种子数据（权限码定义）
- `.planning/phases/03-crud/03-CONTEXT.md` — 21 项用户决策
- `.planning/phases/03-crud/03-UI-SPEC.md` — UI 设计契约
- `.planning/phases/02-data-layer-auth/02-01-SUMMARY.md` — Phase 2 完成状态

### Secondary (MEDIUM confidence)
- Context7 /quasarframework/quasar — q-select API、q-table server-side pagination
- `package.json` (frontend + backend) — 依赖版本确认

### Tertiary (LOW confidence)
- 无

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 所有依赖已安装，版本通过 package.json 验证
- Architecture: HIGH — 基于现有代码审查，修改点明确
- Pitfalls: HIGH — 基于实际代码 vs CONTEXT.md 决策的逐条对比

**Research date:** 2026-04-19
**Valid until:** 2026-05-19（稳定技术栈，30 天有效）
