---
phase: 08-share-public-fill
plan: "02"
subsystem: backend-api
tags: [share-link, public-fill, api, elysia]
dependency_graph:
  requires: [08-01]
  provides: [share-link-api, public-fill-api]
  affects: [08-03, 08-04]
tech_stack:
  added: [nanoid]
  patterns: [public-route-group, identity-validation, schema-version-snapshot]
key_files:
  created:
    - backend/src/modules/public/public.route.ts
  modified:
    - backend/src/modules/template/template.route.ts
    - backend/src/index.ts
decisions:
  - "publicFillModule 注册在 /api/public/f/ 路径下，与 /api/v1/ 平级，不继承 authGuard"
  - "schemaVersion 从服务端 FormTemplate 读取，不信任客户端传入"
  - "requireIdentity 校验在 POST submit 端点服务端执行"
metrics:
  duration: "3min"
  completed: "2026-04-20T12:20:45Z"
  tasks: 2
  files: 3
---

# Phase 08 Plan 02: Share Link & Public Fill API Summary

Backend API for share link creation (authenticated) and public form fill/submit (unauthenticated), with identity validation and schema version snapshotting.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | template.route.ts 新增分享链接端点 | 7030c1a | backend/src/modules/template/template.route.ts |
| 2 | 新建 public.route.ts + 注册到 index.ts | ce0996f | backend/src/modules/public/public.route.ts, backend/src/index.ts |

## What Was Built

### POST /api/v1/templates/:id/share-links (authenticated)
- authGuard('form:template:share') 鉴权
- 仅 PUBLISHED 状态模板可生成链接
- nanoid(12) 生成唯一短码
- 返回完整 ShareLink 对象

### PUT /api/v1/templates/:id (enhanced)
- body 新增 requireIdentity 可选字段
- handler 支持更新 requireIdentity 布尔值

### GET /api/public/f/:code (unauthenticated)
- 通过 code 查找 ShareLink 关联模板
- 仅返回 templateName, description, schema, requireIdentity
- 不暴露 creatorId, updatedAt 等内部字段
- 模板非 PUBLISHED 返回 410 TEMPLATE_OFFLINE

### POST /api/public/f/:code/submit (unauthenticated)
- requireIdentity 时校验 submitterName 和 submitterPhone
- schemaVersion 从服务端读取，不信任客户端
- 创建 Submission 关联 templateId + shareLinkId
- 返回 { id: submission.id }

### Route Registration
- index.ts 重构为嵌套 group: /api 包含 /v1 (authenticated) 和 /public/f (unauthenticated)
- publicFillModule 不继承任何 authGuard

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-08-03 | authGuard('form:template:share') on POST /share-links |
| T-08-04 | GET /public/f/:code returns only templateName/description/schema/requireIdentity |
| T-08-05 | schemaVersion read from server-side FormTemplate, not client body |
| T-08-07 | Prisma parameterized queries, JSONB storage via t.Any() |
| T-08-08 | nanoid(12) with crypto.getRandomValues(), 62^12 combinations |

## Self-Check: PASSED
