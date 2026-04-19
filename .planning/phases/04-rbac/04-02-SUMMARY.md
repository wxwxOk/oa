---
phase: 4
plan: "04-02"
subsystem: frontend-rbac
tags: [vue, quasar, role-page, disable-logic, ux]
dependency_graph:
  requires: ["04-01"]
  provides: ["RolePage 成员数展示", "删除按钮禁用", "保存权限按钮禁用", "isAdminSelected computed"]
  affects: ["frontend/src/pages/RolePage.vue"]
tech_stack:
  added: []
  patterns: ["q-btn :disable + q-tooltip 条件渲染", "computed 派生状态"]
key_files:
  modified:
    - frontend/src/pages/RolePage.vue
decisions:
  - "tooltip 使用 v-if/v-else-if 条件渲染，ADMIN 条件优先于挂载用户条件 (D-08)"
  - "isAdminSelected computed 放在 groupedPerms 之后，保持 computed 集中定义"
metrics:
  duration: "78s"
  completed: "2026-04-19T10:46:58Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 4 Plan 02: 前端 RolePage 补全 — 成员数展示 + 按钮禁用逻辑 Summary

RolePage.vue 增加成员数展示、ADMIN/挂载角色删除按钮禁用带 tooltip、ADMIN 空权限保存按钮禁用带 tooltip，配合后端硬校验形成 UX 双保险。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RolePage.vue 成员数 + 删除按钮 :disable + 保存按钮 :disable + isAdminSelected | `2299320` | frontend/src/pages/RolePage.vue |

## Changes Made

### RolePage.vue (4 处变更)

1. **caption 行追加成员数**: `{{ r.code }} · 成员: {{ r._count?.users ?? 0 }}`
2. **删除按钮 :disable + tooltip**: ADMIN 角色显示"系统角色不可删除"，有挂载用户显示"请先解绑 N 个用户"
3. **保存权限按钮 :disable + tooltip**: ADMIN 角色且权限全清空时显示"ADMIN 角色不能清空所有权限"
4. **isAdminSelected computed**: `computed(() => selected.value?.code === 'ADMIN')`

## Verification Results

| 验证项 | 预期 | 实际 |
|--------|------|------|
| isAdminSelected 匹配数 | >= 3 | 3 |
| _count 匹配数 | >= 4 | 4 |
| 成员: 匹配数 | 1 | 1 |
| 系统角色不可删除 | 1 | 1 |
| 请先解绑 | 1 | 1 |
| 不能清空所有权限 | 1 | 1 |
| r.code === 'ADMIN' | >= 2 | 2 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
