# Phase 20: 到访数据模型 + 后端 API - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-05-02
**Phase:** 20-到访数据模型 + 后端 API
**Mode:** assumptions + auto
**Areas analyzed:** VisitRecord Model And Storage, Route And Permission Shape, Seed Permissions, Import Endpoint Boundary, Filter And Stats Backend Scope

## Assumptions Presented

### VisitRecord Model And Storage

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Phase 20 should add a fixed `VisitRecord` Prisma model, not reuse form submissions or JSON schema. It should map the 15 sample-sheet columns as first-class columns, add `creatorId/createdAt/updatedAt`, link `creatorId` to `User`, keep status-like fields as nullable `String`, use nullable `DateTime` for reception/trial dates, and avoid duplicate-related unique constraints. | Confident | `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/research/ARCHITECTURE.md`, `backend/prisma/schema.prisma` |

### Route And Permission Shape

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| `visitModule` should be an Elysia module with prefix `/visits`, registered inside `/api/v1`, with list/detail/create/update/delete/filter-options/stats/import endpoints guarded by exact `visit:*` permission codes. | Confident | `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `backend/src/index.ts`, `backend/src/middlewares/auth.ts`, `backend/src/modules/role/role.route.ts`, `backend/src/modules/approval/archive.route.ts` |

### Seed Permissions

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Phase 20 should extend `backend/prisma/seed.ts` with `visit:list/create/update/delete/import/stats` under module `visit`; ADMIN inherits them through the existing all-permissions seed flow. | Confident | `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/research/PITFALLS.md`, `backend/prisma/seed.ts` |

### Import Endpoint Boundary

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| `POST /api/v1/visits/import` should accept normalized JSON rows, not uploaded Excel files. Frontend handles `.xlsx` parsing and duplicate warnings; backend validates again and batch-creates without auto-merging or silently skipping duplicates. | Confident | `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` |

### Filter And Stats Backend Scope

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Phase 20 should provide backend-ready list filter, distinct filter-options and stats contracts. Filters cover keyword/name, channel partner, consultant, receptionist, reception status, consultation status, status category and reception date range. Stats support reception-date range and grouped counts for channel/person/status dimensions, with string-based classification until Phase 23 UI refinement. | Likely | `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `backend/src/modules/submission/submission.route.ts`, `backend/src/modules/form-stats/form-stats.route.ts`, `backend/src/modules/approval/archive-stats.service.ts` |

## Corrections Made

No corrections — `--auto` accepted all Confident/Likely assumptions.

## Auto-Resolved

- `[auto] All assumptions Confident/Likely — proceeding to context capture.`

## External Research

No external research was needed; project research documents and codebase evidence were sufficient.
