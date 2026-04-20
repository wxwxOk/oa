---
phase: 09-data-view-print-stats
plan: 01
subsystem: backend-api
tags: [submission, stats, rbac, prisma]
dependency_graph:
  requires: [phase-08-share-public-fill]
  provides: [submission-list-api, submission-detail-api, form-stats-api, permission-seeds]
  affects: [frontend-submission-page, frontend-stats-panel]
tech_stack:
  added: []
  patterns: [groupBy-aggregation, prisma-relation-include, module-level-authGuard]
key_files:
  created:
    - backend/src/modules/submission/submission.route.ts
    - backend/src/modules/form-stats/form-stats.route.ts
  modified:
    - backend/prisma/seed.ts
    - backend/src/index.ts
decisions:
  - "sharers 端点放在 submission 模块内（/templates/:templateId/submissions/sharers）而非独立模块"
  - "form-stats groupBy 聚合接受全表扫描风险（数据量小，dateFrom/dateTo 限制范围）"
metrics:
  duration: 3min
  completed: 2026-04-20T13:48:44Z
  tasks: 2
  files: 4
---

# Phase 09 Plan 01: Backend API — Submission Query + Stats Summary

Submission 列表/详情/分享人列表 + 员工统计聚合 API，含 RBAC 权限种子和模块注册。

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | 权限种子 + 提交数据查询 API | ba2438b | seed.ts, submission.route.ts |
| 2 | 员工统计 API + 模块注册 | daa2c09 | form-stats.route.ts, index.ts |

## API Endpoints Created

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/templates/:templateId/submissions | 分页列表，支持多条件筛选 |
| GET | /api/v1/templates/:templateId/submissions/sharers | 分享人下拉列表 |
| GET | /api/v1/templates/:templateId/submissions/:id | 单条详情含关联数据 |
| GET | /api/v1/form-stats | 员工分享/收集数量统计 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
