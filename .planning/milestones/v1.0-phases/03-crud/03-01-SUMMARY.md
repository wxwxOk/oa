---
phase: 03-crud
plan: 01
subsystem: backend-api
tags: [bugfix, user-route, department-route, permission, circular-reference]
dependency_graph:
  requires: []
  provides: [user-status-filter, reset-password-permission, department-circular-check]
  affects: [frontend-user-list, frontend-department-edit]
tech_stack:
  added: []
  patterns: [enum-whitelist-filter, recursive-descendant-check]
key_files:
  created: []
  modified:
    - backend/src/modules/user/user.route.ts
    - backend/src/modules/department/department.route.ts
decisions:
  - "status 参数仅接受 ACTIVE/DISABLED 枚举值，其他值静默忽略（安全白名单模式）"
  - "getDescendantIds 使用全量查询+内存递归，部门数 < 1000 性能可接受"
  - "reset-password 拆为独立 guard 块，使用 user:reset-password 权限码"
metrics:
  duration: 158s
  completed: "2026-04-19T08:18:54Z"
  tasks: 2
  files: 2
---

# Phase 3 Plan 1: 后端路由缺陷修复 Summary

用户路由增加 status 枚举白名单筛选 + reset-password 权限码独立拆分；部门路由增加 getDescendantIds 递归子孙校验防止循环引用。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 用户路由修复 — status 筛选 + reset-password 权限码分离 | b1b9645 | backend/src/modules/user/user.route.ts |
| 2 | 部门路由修复 — 循环引用深度校验 | b58cd99 | backend/src/modules/department/department.route.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. status 参数仅接受 ACTIVE/DISABLED 枚举值，其他值静默忽略（安全白名单模式，对应 T-03-03 威胁缓解）
2. getDescendantIds 使用全量查询+内存递归，部门数 < 1000 性能可接受（对应 T-03-02 风险接受）
3. reset-password 拆为独立 guard 块，使用 user:reset-password 权限码（对应 T-03-01 权限提升缓解）

## Known Stubs

None.

## Self-Check: PASSED
