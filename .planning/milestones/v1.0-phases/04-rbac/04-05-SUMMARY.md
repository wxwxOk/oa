---
phase: 4
plan: "04-05"
subsystem: "uat-e2e"
tags: [uat, e2e-verification, performance, gap-closure]
dependency_graph:
  requires: ["04-01", "04-02", "04-03", "04-04"]
  provides: ["phase-4-uat-sign-off"]
  affects: ["backend/src/modules/auth/auth.route.ts", "frontend/src/pages/UserPage.vue"]
tech_stack:
  added: []
  patterns: ["按钮级权限组合判断 (AND 语义)", "对话框元数据懒加载"]
key_files:
  created: []
  modified:
    - backend/src/modules/auth/auth.route.ts
    - frontend/src/pages/UserPage.vue
decisions:
  - "UAT 过程中发现并修复 2 个 gap，直接在 04-05 内提交（而非走独立 gap 计划），减少循环开销"
  - "/auth/profile 返回字段与 /auth/login 对齐（roles 代替 roleCodes），单一前端 UserInfo 契约"
  - "新建/编辑用户按钮可见性 = user:write + role:list + department:list，避免只有部分权限时对话框下拉为空"
  - "UserPage 元数据懒加载到对话框：onMounted 只在有 department:list 时加载部门 tree，roles 延后到 openEdit"
metrics:
  duration: "human-verified"
  completed: "2026-04-19T13:00:00Z"
  tasks_completed: 4
  tasks_total: 4
  files_modified: 2
---

# Phase 4 Plan 05: 端到端人工 UAT + p95 性能 Summary

执行 UAT-1（admin 看全菜单）、UAT-2（普通用户限菜单）、UAT-5（撤权后按钮消失）人工验证 + Task 4 后端 curl 自动验证。过程中发现 2 个 gap 并就地修复。

## Task Completion

| Task | Name | Type | Result |
|------|------|------|--------|
| 1 | UAT-1 — admin 登录看全菜单 | human-verify | PASS |
| 2 | UAT-2 — 普通用户限菜单 + v-perm | human-verify | PASS（修复 UserPage 元数据 403 后） |
| 3 | UAT-5 — 撤权后按钮消失 + 权限刷新 | human-verify | PASS（修复 profile 字段契约后） |
| 4 | 后端 curl — ADMIN 删除保护 + 空权限拒绝 + p95 | auto | PASS |

## Task 4 后端 curl 验证结果

```
Test 1: DELETE /roles/1 (ADMIN) → HTTP 400 {"code":"BIZ_ERROR","message":"系统角色不可删除"} ✓
Test 2: PUT /roles/1/permissions [] → HTTP 400 {"code":"BIZ_ERROR","message":"ADMIN 角色不能清空所有权限"} ✓
Test 3: GET /roles → 每项包含 _count.users（超级管理员: users=1 / 普通员工: users=1）✓
Test 4: p95 性能（10 次采样）= 8.72ms，远低于 500ms 阈值 ✓
```

## UAT 过程发现的 Gap 与修复

### Gap 1: DashboardPage.vue 崩溃 "Cannot read properties of undefined (reading 'join')"

**根因**：后端 `/auth/login` 返回 `user.roles`，但 `/auth/profile` 返回 `roleCodes`——字段不一致。04-03 引入的 `maybeRefreshProfile → fetchProfile` 在路由守卫首次主动调用后，用 `{roleCodes, permissions}` 覆盖 `authStore.user`，导致 `user.roles.join()` 崩溃。

**Phase 4 之前为何未暴露**：`fetchProfile` 方法虽早存在但从未被调用；04-03 的 `maybeRefreshProfile` 是首个调用者。

**修复**（commit `09e57d6`）：`/auth/profile` 端点映射 `roleCodes → roles`，与 login 响应契约对齐。middleware 内部 `currentUser.roleCodes` 保持不变。

### Gap 2: UserPage 进页面就弹 "缺少权限: role:list"

**根因**：`UserPage.vue` 的 `loadMeta()` 在 `onMounted` 里无条件并发请求 `/departments/tree` 和 `/roles`。只有 `user:list`（无 `role:list`/`department:list`）的用户进页面就会立刻收到 403 Notify。

**修复**（commit `56cd904`）：
- 新建/编辑用户按钮改用组合权限判断（`user:write` + `role:list` + `department:list`），避免下拉为空的断手状态
- 部门筛选器按 `department:list` 权限显示
- 拆分 `loadDeptFilter`（有权限时 onMounted 加载）+ `loadDialogMeta`（openEdit 时按权限懒加载 roles）
- 重置密码、删除按钮保持 `v-perm` 单权限判断（不依赖 meta）

## Changes Made

### backend/src/modules/auth/auth.route.ts

`/auth/profile` 从 `currentUser` 原样返回改为显式字段映射，确保 `roles` 字段名与登录响应一致。

### frontend/src/pages/UserPage.vue

- 引入 `useAuthStore` + 三个 computed（`canCreateUser` / `canUpdateUser` / `canListDept`）
- 替换模板中新建/编辑按钮的 `v-perm` 为 `v-if="canXxxUser"`
- 拆分 `loadMeta` 为 `loadDeptFilter`（筛选器用）+ `loadDialogMeta`（对话框按需懒加载）
- `openEdit` 改为 async，打开对话框前 await 加载 meta
- `onMounted` 不再无条件拉 roles，仅在有 dept 权限时加载部门 tree

## Deviations from Plan

原 04-05-PLAN 只定义了 UAT 执行和 curl 验证，未预期会发现 2 个 gap。按 GSD checkpoint-then-fix 惯例，就地修复并记录在本 SUMMARY 中，替代额外的 gap closure 计划。

## Verification Artifacts

- UAT-1/2/5 人工验证：通过（用户确认）
- curl Test 1-4 自动验证：全部通过（含 p95=8.72ms）
- 2 个 gap 修复后再次复测：通过
