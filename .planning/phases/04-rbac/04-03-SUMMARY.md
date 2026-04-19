---
phase: 4
plan: "04-03"
title: "前端路由守卫 + 权限刷新 — maybeRefreshProfile 60s 防抖"
subsystem: frontend-auth
tags: [rbac, router-guard, permission-refresh, debounce]
dependency_graph:
  requires: []
  provides: [maybeRefreshProfile, async-router-guard, permission-notify]
  affects: [frontend/src/stores/auth.ts, frontend/src/router/index.ts]
tech_stack:
  added: []
  patterns: [promise-dedup, 60s-debounce, vue-router-4-return-style]
key_files:
  created: []
  modified:
    - frontend/src/stores/auth.ts
    - frontend/src/router/index.ts
decisions:
  - "pendingRefresh 放模块级变量而非 Pinia state，避免序列化 Promise"
  - "beforeEach 从 next 回调式改为 async 返回值式（Vue Router 4 推荐写法）"
  - "_doRefreshProfile catch 静默处理，401 由 axios 拦截器统一处理"
metrics:
  duration: "108s"
  completed: "2026-04-19T10:47:33Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 4 Plan 03: 前端路由守卫 + 权限刷新 Summary

auth.ts 新增 maybeRefreshProfile action（60s 防抖 + Promise 并发去重），router beforeEach 改造为 async 返回值式，perm 检查前刷新权限，失权限时 Notify 提示并重定向 /403。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | auth.ts — maybeRefreshProfile + lastProfileFetch + pendingRefresh | 3378fd0 | frontend/src/stores/auth.ts |
| 2 | router/index.ts — async beforeEach + maybeRefreshProfile + Notify | bef5334 | frontend/src/router/index.ts |

## Implementation Details

### auth.ts 变更
- 模块级 `pendingRefresh` 变量：避免 Pinia 序列化 Promise
- state 新增 `lastProfileFetch: 0`：记录上次 profile 刷新时间戳
- `maybeRefreshProfile()` 三层防护：无 token 跳过 -> 60s 防抖跳过 -> 并发去重
- `_doRefreshProfile()` 复用已有 `fetchProfile()`，catch 静默处理

### router/index.ts 变更
- beforeEach 从 `(to, _from, next)` 改为 `async (to)` + 返回值式
- perm 检查前 `await auth.maybeRefreshProfile()`
- 失权限时 `Notify.create({ type: 'warning', message: '您的权限已更新' })` 后 `return { path: '/403' }`
- `next` 回调完全移除

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-04-06 | 60s 防抖刷新确保权限最迟 60s 内更新 |
| T-04-07 | 60s 防抖 + Promise 去重，避免频繁 /auth/profile 请求 |
| T-04-08 | catch 静默处理，401 由 axios 拦截器统一处理 |
