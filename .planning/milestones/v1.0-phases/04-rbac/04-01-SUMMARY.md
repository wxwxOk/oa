---
phase: 4
plan: "04-01"
subsystem: "backend-rbac"
tags: [rbac, admin-protection, role-delete-guard, user-count]
dependency_graph:
  requires: []
  provides: ["admin-role-lock", "role-delete-mount-check", "role-usercount-aggregate"]
  affects: ["role.route.ts"]
tech_stack:
  added: []
  patterns: ["BizError throw for business validation", "Prisma _count aggregate in include"]
key_files:
  created: []
  modified:
    - backend/src/modules/role/role.route.ts
decisions:
  - "ADMIN 检查优先于挂载检查 (D-08 顺序)"
  - "仅拒绝 permissionIds 为空数组，允许 ADMIN 增减权限"
metrics:
  duration: "76s"
  completed: "2026-04-19T10:42:12Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 4 Plan 01: 后端 RBAC 保护 — ADMIN 锁死 + 角色删除拒绝 + userCount Summary

role.route.ts 增加三层后端硬校验：ADMIN 角色不可删除、挂载用户角色不可删除、ADMIN 权限不能清空为空数组；GET /roles 列表返回 _count.users 聚合字段。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | role.route.ts — BizError + _count.users + ADMIN/挂载保护 + 空权限拒绝 | 1768120 | backend/src/modules/role/role.route.ts |

## Changes Made

### role.route.ts 四处变更

1. **导入 BizError**: `import { BizError, notFound }` 替换原 `import { notFound }`
2. **GET / 列表**: findMany include 增加 `_count: { select: { users: true } }`，每个角色返回用户计数
3. **DELETE /:id**: 先查询角色（含 _count），按 D-08 顺序检查 ADMIN code -> 挂载用户数，抛出对应 BizError
4. **PUT /:id/permissions**: 在 deleteMany 前检查 ADMIN + permissionIds 为空，拒绝清空操作

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-04-01 | DELETE handler 检查 role.code === 'ADMIN'，返回 400 BizError | Done |
| T-04-02 | DELETE handler 检查 _count.users > 0，返回 400 BizError | Done |
| T-04-03 | PUT permissions handler 检查 ADMIN + permissionIds.length === 0 | Done |
| T-04-04 | _count.users 为非敏感聚合数据，accepted | N/A |
