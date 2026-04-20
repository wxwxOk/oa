---
phase: 03-crud
plan: 04
subsystem: frontend-user-page
tags: [vue, quasar, user-management, crud, form-validation]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [UserPage-complete]
  affects: [frontend/src/pages/UserPage.vue]
tech_stack:
  added: []
  patterns: [q-btn-toggle-filter, flattenTreeForFilter, copyToClipboard, q-chip-badge, skeleton-loading]
key_files:
  modified:
    - frontend/src/pages/UserPage.vue
decisions:
  - 部门筛选和表单部门选择器共用 flattenTreeForFilter 函数，数据源从 /departments 改为 /departments/tree
  - 密码弹窗使用 html:true 渲染 code 标签展示密码，同时自动复制到剪贴板
  - 首次加载使用 q-skeleton 骨架屏，后续翻页/筛选使用 q-table 内置 loading
metrics:
  duration: 106s
  completed: 2026-04-19T08:26:25Z
  tasks: 1
  files: 1
---

# Phase 03 Plan 04: UserPage.vue 补全 Summary

UserPage.vue 完整实现 status 筛选（q-btn-toggle）、部门树形筛选、Quasar rules 表单校验、UI-SPEC 文案对齐、密码弹窗+复制、空态展示、q-chip 状态徽章。

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | UserPage template 重构 — 筛选栏 + 空态 + 状态徽章 + 对话框表单校验 | 491e0b3 | frontend/src/pages/UserPage.vue |

## Changes Implemented

### Status 筛选 (D-03)
- 工具栏增加 `q-btn-toggle`（全部/启用/禁用），绑定 `statusFilter` ref
- `load()` 函数 params 增加 `status: statusFilter.value || undefined`

### 部门树形筛选 (D-16)
- 工具栏增加 `q-select` 部门下拉，使用 `deptFilterOptions`
- `loadMeta()` 改用 `/departments/tree` 接口 + `flattenTreeForFilter()` 树形扁平化
- 表单部门选择器复用同一 `flattenTreeForFilter` 结果

### 表单校验 (D-06/D-07)
- username: 必填 + >=2 字符
- password: 必填 + >=4 字符
- realName: 必填
- email: 可选，正则校验
- phone: 可选，数字 6-15 位
- 必填字段 label 含红星号 `<span class="text-negative">*</span>`
- 使用 `lazy-rules="ondemand"` 触发时机

### 删除确认文案 (D-02)
- 标题: "删除用户"
- 正文: "将永久删除用户 {username}。此操作不可恢复。"
- 确认按钮: "确认删除" color="negative"

### 重置密码弹窗 + 复制 (D-13)
- 确认弹窗文案: "密码将重置为 123456，用户下次登录需立即修改。"
- 成功后 `copyToClipboard(data.password)` 自动复制
- 成功弹窗标题 "密码已重置"，html 渲染 code 标签展示密码
- Notify 提示 "密码已复制到剪贴板"

### 空态展示 (D-18)
- 条件: `rows.length === 0 && !loading`
- 图标 `people` size="4em" + "暂无用户" + "创建第一个用户以开始管理" + 新建用户按钮

### 状态徽章
- PC 表格 status 列: `q-chip` slot 渲染（启用 positive/white, 禁用 grey-4/grey-8）
- 移动端卡片: 同样 `q-chip` 徽章 + 增加重置密码按钮
- columns 中 status 列移除 format 函数

### 其他改进
- 首次加载骨架屏 (`firstLoading` + `q-skeleton type="QTable"`)
- 错误态展示 + 重试按钮
- `onSave` 中 `departmentId` 使用 `?? null` 而非 `?? undefined`
- 对话框标题改为 "新建用户" / "编辑用户"，保存按钮改为 "保存用户"
- 新建按钮 label 改为 "新建用户"
- 搜索框增加 `style="width: 200px"` 固定宽度
- 引入 `useQuasar` 和 `copyToClipboard`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all features fully wired to API endpoints.

## Self-Check: PASSED

- [x] frontend/src/pages/UserPage.vue exists
- [x] .planning/phases/03-crud/03-04-SUMMARY.md exists
- [x] Commit 491e0b3 exists in git log
