---
phase: 5
plan: 5
subsystem: frontend-ui
tags: [login, dashboard, error-pages, dark-mode, css-variables]
dependency_graph:
  requires: [05-01, 05-02, 05-03, 05-04]
  provides: [beautified-login, dashboard-stats, error-pages-dark-aware]
  affects: [LoginPage, DashboardPage, ForbiddenPage, NotFoundPage, app.scss]
tech_stack:
  added: []
  patterns: [css-variables, time-greeting, skeleton-loading, permission-filtered-actions]
key_files:
  created: []
  modified:
    - frontend/src/pages/LoginPage.vue
    - frontend/src/pages/DashboardPage.vue
    - frontend/src/pages/ForbiddenPage.vue
    - frontend/src/pages/NotFoundPage.vue
    - frontend/src/css/app.scss
decisions:
  - 快捷操作按权限过滤而非硬编码全部显示
  - 统计卡片错误态显示 '--' 而非隐藏卡片
metrics:
  duration: 195s
  completed: 2026-04-19T16:19:58Z
  tasks: 2/2
  files: 5
---

# Phase 5 Plan 5: UI/UX 美化 — 登录页 + Dashboard + 错误页 Summary

渐变背景登录页 + 时段欢迎词 Dashboard + 统计卡片骨架屏 + 72px 错误码页面，全部 dark-aware，新增 6 个 CSS 变量。

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 美化 LoginPage + 403/404 | e7720b9 | LoginPage.vue, ForbiddenPage.vue, NotFoundPage.vue, app.scss |
| 2 | 重构 DashboardPage | 13ff662 | DashboardPage.vue |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing CSS Variables] 新增 6 个 CSS 变量到 app.scss**
- **Found during:** Task 1 (pre-execution)
- **Issue:** app.scss 缺少 --oa-login-gradient-start/end, --oa-stat-icon-bg, --oa-surface-elevated, --oa-skeleton, --oa-tab-inactive
- **Fix:** 在 :root 和 .body--dark 中补充全部 6 个变量（含 light/dark 值）
- **Files modified:** frontend/src/css/app.scss
- **Commit:** e7720b9

**2. [Rule 2 - Missing Micro-interaction] 新增 stat-card hover 动画**
- **Found during:** Task 1 (pre-execution)
- **Issue:** UI-SPEC D-14 要求 Dashboard 统计卡片 hover translateY(-2px)，app.scss 无此样式
- **Fix:** 新增 .stat-card hover 微交互规则
- **Files modified:** frontend/src/css/app.scss
- **Commit:** e7720b9

### Out-of-Scope Discoveries

以下硬编码色存在于非本计划修改的文件中，已记录但不修复：
- MainLayout.vue: bg-grey-2, bg-white, text-grey-9
- RolePage.vue: bg-white
- UserPage.vue: text-grey
- DepartmentPage.vue: color="grey-4"（Quasar 语义用法）

## Verification Results

- LoginPage: 渐变背景 var(--oa-login-gradient-*) PASS
- LoginPage: 装饰圆 login-decor x2 PASS
- LoginPage: 卡片 400px / 12px radius / shadow-4 PASS
- LoginPage: useDarkMode 切换按钮 PASS
- LoginPage: 按钮文案 "立即登录" PASS
- ForbiddenPage: 72px 错误码 + 描述 + 返回首页 PASS
- NotFoundPage: 72px 错误码 + 描述 + 返回首页 PASS
- DashboardPage: 时段欢迎词 greeting computed PASS
- DashboardPage: GET /dashboard/stats 接口调用 PASS
- DashboardPage: q-skeleton 骨架屏 PASS
- DashboardPage: 32px/600 统计数字 PASS
- DashboardPage: 48px 圆形图标背景 var(--oa-stat-icon-bg) PASS
- DashboardPage: 快捷操作按权限过滤 PASS
- DashboardPage: 错误态 Notify warning PASS
- 全部 4 个页面 text-grey 硬编码色 = 0 PASS

## Self-Check: PASSED

All 5 modified files verified on disk. Both commit hashes (e7720b9, 13ff662) confirmed in git log.
