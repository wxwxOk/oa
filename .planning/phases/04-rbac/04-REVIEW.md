---
phase: 04-rbac
reviewed: 2026-04-19T12:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/src/modules/auth/auth.route.ts
  - backend/src/modules/role/role.route.ts
  - frontend/src/pages/RolePage.vue
  - frontend/src/pages/UserPage.vue
  - frontend/src/router/index.ts
  - frontend/src/stores/auth.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-19T12:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

对 RBAC 阶段的 6 个核心文件进行了标准深度审查，涵盖后端 auth/role 路由、前端 auth store、路由守卫、v-perm 指令及 RolePage/UserPage。

整体实现质量较好：后端 ADMIN 保护（删除拦截、权限清空拦截）逻辑完整，authGuard 中间件的权限校验链路清晰，前端 `hasPerm` + `v-perm` 指令 + 路由守卫三层防线配合合理，`maybeRefreshProfile` 的去重和节流设计也很稳健。

发现 1 个 Critical 级别问题（密码重置响应中通过 innerHTML 渲染存在 XSS 风险）、4 个 Warning 和 3 个 Info。

## Critical Issues

### CR-01: 密码重置对话框使用 `html: true` 渲染服务端返回值 — XSS 风险

**File:** `frontend/src/pages/UserPage.vue:339`
**Issue:** `onReset` 函数将服务端返回的 `data.password` 直接拼接进 HTML 字符串，并通过 `Dialog.create({ html: true })` 渲染。如果后端返回值被篡改（中间人攻击、后端 bug 等），攻击者可注入任意 HTML/JS。
**Fix:**
```typescript
// 方案 1：不使用 html: true，改用纯文本
Dialog.create({
  title: '密码已重置',
  message: `新密码：${data.password}`,
  ok: '关闭',
  persistent: true,
});

// 方案 2：若需保留样式，对 data.password 做转义
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
Dialog.create({
  title: '密码已重置',
  message: `新密码：<code style="...">${escapeHtml(data.password)}</code>`,
  html: true,
  ok: '关闭',
  persistent: true,
});
```

## Warnings

### WR-01: v-perm 指令仅在 `mounted` 时检查，权限变更后不会响应式更新

**File:** `frontend/src/boot/perm.ts:7-15`
**Issue:** 指令只注册了 `mounted` 钩子。如果用户在页面停留期间权限被刷新（通过 `maybeRefreshProfile`），已渲染的按钮不会被移除或重新显示。这与 UserPage 中使用 `computed` + `v-if` 的 `canCreateUser`/`canUpdateUser` 模式不一致 — 后者是响应式的，前者不是。
**Fix:**
```typescript
app.directive('perm', {
  mounted(el: HTMLElement, binding) {
    checkPerm(el, binding);
  },
  updated(el: HTMLElement, binding) {
    checkPerm(el, binding);
  },
});

function checkPerm(el: HTMLElement, binding: any) {
  const auth = useAuthStore();
  const codes = Array.isArray(binding.value) ? binding.value : [binding.value];
  const has = codes.some((c: string) => auth.hasPerm(c));
  // 使用 display 控制而非 removeChild，以便权限恢复时可重新显示
  el.style.display = has ? '' : 'none';
}
```
注意：当前 `removeChild` 方式一旦移除节点就无法恢复，即使后续 `updated` 也无法操作已脱离 DOM 的元素。建议改用 `display:none` 或 `v-if` 包装。

### WR-02: RolePage 模板中 `r._count.users` 缺少可选链保护

**File:** `frontend/src/pages/RolePage.vue:35`
**Issue:** 第 30 行和第 34 行正确使用了 `r._count?.users ?? 0`，但第 35 行的模板插值 `{{ r._count.users }}` 没有使用可选链。如果 `_count` 为 `undefined`（例如 API 响应结构变化），会抛出运行时错误。
**Fix:**
```vue
请先解绑 {{ r._count?.users ?? 0 }} 个用户
```

### WR-03: role.route.ts 的 `PUT /:id` 直接透传 body 到 Prisma update

**File:** `backend/src/modules/role/role.route.ts:45`
**Issue:** `prisma.role.update({ where: { id: Number(params.id) }, data: body })` 将经过 Elysia schema 校验后的 body 直接作为 `data` 传入。虽然 Elysia 的 `t.Object` 会过滤未声明字段，但如果 schema 定义与 Prisma model 不完全匹配（例如未来新增字段），可能导致意外字段写入。此外，此端点没有阻止修改 ADMIN 角色的 `code` 字段（schema 中未包含 code，所以当前安全），但缺少对 ADMIN 角色 name 修改的业务保护。
**Fix:** 建议显式提取字段：
```typescript
async ({ params, body }: any) => {
  const id = Number(params.id);
  return prisma.role.update({
    where: { id },
    data: { name: body.name, description: body.description },
  });
},
```

### WR-04: UserPage 密码校验规则在编辑模式下逻辑有误

**File:** `frontend/src/pages/UserPage.vue:124`
**Issue:** 密码输入框的第一条校验规则 `(v: string) => !form.id && !v ? '请输入密码' : true` 在新建模式（`form.id` 为 null）下，如果密码为空会报错。但密码输入框仅在 `!form.id` 时显示（第 123 行 `v-if="!form.id"`），所以编辑模式下不会触发。然而，当 `form.id` 为 `0`（falsy 值）时，`!form.id` 为 true，会错误地要求输入密码。虽然数据库 ID 通常从 1 开始，但这是一个潜在的边界条件。
**Fix:**
```typescript
(v: string) => form.id === null && !v ? '请输入密码' : true
```

## Info

### IN-01: RolePage 和 UserPage 大量使用 `any` 类型

**File:** `frontend/src/pages/RolePage.vue:95-100`, `frontend/src/pages/UserPage.vue:171-175`
**Issue:** `roles`、`permissions`、`selected`、`form` 等核心状态变量均声明为 `any` 或 `any[]`，丧失了 TypeScript 的类型安全保护。
**Fix:** 建议定义接口类型（如 `Role`、`Permission`、`RoleForm`），替换 `any` 声明。

### IN-02: auth store 的 `_doRefreshProfile` 静默吞掉非 401 错误

**File:** `frontend/src/stores/auth.ts:76-78`
**Issue:** `catch {}` 块注释说明 401 由 axios 拦截器处理，但其他错误（网络超时、500 等）也会被静默忽略，可能导致用户权限数据过期而无感知。
**Fix:** 建议至少在开发环境下输出日志：
```typescript
catch (e: any) {
  if (import.meta.env.DEV) console.warn('[auth] profile refresh failed:', e?.message);
}
```

### IN-03: 路由守卫中权限不足时的提示信息不够准确

**File:** `frontend/src/router/index.ts:29`
**Issue:** 当用户权限不足被拦截到 403 页面时，提示消息为"您的权限已更新"。但实际场景可能是用户从未拥有该权限（例如手动输入 URL），此时"权限已更新"会造成误导。
**Fix:**
```typescript
Notify.create({ type: 'warning', message: '无权访问该页面' });
```

---

_Reviewed: 2026-04-19T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
