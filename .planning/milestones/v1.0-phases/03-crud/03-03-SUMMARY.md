---
phase: 03-crud
plan: 03
subsystem: frontend-department
tags: [vue, quasar, department, tree, form-validation, empty-state]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [DepartmentPage-complete]
  affects: [frontend/src/pages/DepartmentPage.vue]
tech_stack:
  added: []
  patterns: [flattenTreeForSelect, getSubtreeIds, computed-parent-options]
key_files:
  modified:
    - frontend/src/pages/DepartmentPage.vue
decisions:
  - "使用 q-input ref + validate() 做表单校验而非 q-form 包裹"
  - "父部门选择器用全角空格缩进模拟树形层级"
metrics:
  duration: 82s
  completed: 2026-04-19T08:25:42Z
  tasks: 1
  files: 1
---

# Phase 3 Plan 3: DepartmentPage.vue 补全 Summary

补全 DepartmentPage.vue 的父部门选择器（树形下拉 + 编辑时排除自身及子部门）、Quasar rules 表单校验、空态/错误态展示、删除确认文案对齐 UI-SPEC、编辑时传递 parentId。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DepartmentPage 完整补全 | 0aeb279 | frontend/src/pages/DepartmentPage.vue |

## Key Changes

1. **父部门选择器 (D-09)**: `q-select` 绑定 `parentOptions` computed，使用 `flattenTreeForSelect` 将树形数据扁平化为带缩进前缀的选项列表
2. **循环引用过滤 (D-11)**: `getSubtreeIds` 递归收集当前节点及所有子孙 ID，编辑时从选项中排除
3. **表单校验 (D-06)**: 名称必填 + 排序必填整数，使用 `lazy-rules="ondemand"` + 提交时 `ref.validate()`
4. **空态展示 (D-18)**: `account_tree` 图标 + "暂无部门" + "建立组织架构第一步：添加顶级部门" + 新建按钮
5. **错误态**: 加载失败提示 + 重试按钮
6. **删除确认 (D-02)**: 文案包含部门名称 + "此操作不可恢复"
7. **编辑传 parentId (D-09)**: `onSave` 的 PUT 请求体包含 `parentId: form.parentId ?? null`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality fully wired.

## Self-Check: PASSED
