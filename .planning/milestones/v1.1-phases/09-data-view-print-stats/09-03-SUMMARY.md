---
phase: 09-data-view-print-stats
plan: 03
subsystem: frontend-submission-view
tags: [submission-list, detail-drawer, print, pdf-export, batch-export]
dependency_graph:
  requires: [09-01, 09-02]
  provides: [submission-list-page, submission-detail-drawer, print-flow, pdf-export]
  affects: [TemplatePage, routes]
tech_stack:
  added: []
  patterns: [QTable-server-pagination, QDrawer-detail, html2canvas-pdf, window-print]
key_files:
  created:
    - frontend/src/components/submission/SubmissionDetail.vue
    - frontend/src/pages/SubmissionPage.vue
  modified:
    - frontend/src/router/routes.ts
    - frontend/src/pages/TemplatePage.vue
decisions:
  - QDrawer 480px desktop / maximized mobile 用于详情展示
  - 批量导出上限 50 条，逐条 fetchDetail + html2canvas 渲染
  - 版本不一致时 fallback 为 key-value 展示 + QBanner 警告
metrics:
  duration: 3min
  completed: 2026-04-20T13:56:00Z
  tasks: 2
  files: 4
---

# Phase 09 Plan 03: Submission List + Detail + Print + PDF Export Summary

提交数据列表页 + 详情抽屉 + 浏览器打印 + PDF 导出（单条+批量），含路由注册和模板页入口按钮。

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SubmissionDetail.vue 详情组件 | 3f781a0 | frontend/src/components/submission/SubmissionDetail.vue |
| 2 | SubmissionPage + 路由 + 入口按钮 | 243501a | frontend/src/pages/SubmissionPage.vue, frontend/src/router/routes.ts, frontend/src/pages/TemplatePage.vue |

## Deviations from Plan

None - plan executed exactly as written.

## Key Implementation Details

- SubmissionDetail.vue: 只读详情组件，#print-area 打印区域，字段表格 + 签名图片 + 版本不一致 QBanner
- SubmissionPage.vue: QTable 服务端分页 + 筛选栏（姓名/手机/日期/分享人）+ QDrawer 详情 + 批量导出进度对话框
- 路由 /templates/:id/submissions 注册，meta.perm = form:submission:list
- TemplatePage 新增 visibility 图标按钮，v-perm="'form:submission:list'"

## Self-Check: PASSED
