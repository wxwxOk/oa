# Phase 20: 到访数据模型 + 后端 API - Research

## RESEARCH COMPLETE

Phase 20 should implement a fixed visit ledger backend, not dynamic form storage. The codebase already has the required backend patterns: Prisma models with explicit relations, Elysia route modules under `/api/v1`, `authGuard(requiredPerm)`, TypeBox schemas, centralized permission seeds, and Bun tests. Planning should focus on the `VisitRecord` model, visit permissions, route contracts, strict write validation, and backend-only API behavior for later UI/import/stat phases.

## Implementation Findings

### Data model
- Add `VisitRecord` with 15 sample-sheet fields: `name`, `age`, `education`, `gender`, `channelPartner`, `consultant`, `receptionStatus`, `receptionist`, `receptionDate`, `consultationStatus`, `statusCategory`, `statusDescription`, `trialStatus`, `solution`, `trialDate`.
- Add `creatorId`, `creator`, `createdAt`, `updatedAt`; add `User.visitRecords`.
- Keep status-like fields as nullable `String`; do not add enums or dictionaries.
- Keep `receptionDate` and `trialDate` as nullable `DateTime` with date semantics.
- Do not add a unique constraint for `name + receptionDate + consultant`; duplicate warning belongs to Phase 22 UI.
- Add indexes for `name`, `channelPartner`, `consultant`, `receptionist`, `receptionStatus`, `receptionDate`, `consultationStatus`, `statusCategory`, and `creatorId`.

### Permissions
- Add `visit:list`, `visit:create`, `visit:update`, `visit:delete`, `visit:import`, `visit:stats` with `module: 'visit'` in `backend/prisma/seed.ts`.
- ADMIN inherits through existing `allPerms`; EMPLOYEE should not receive visit permissions by default.
- Exporting `VISIT_PERMISSION_CODES` matches the existing `APPROVAL_PERMISSION_CODES` pattern and makes seed tests simple.

### Routes and validation
- Add `backend/src/modules/visit/visit.route.ts` exporting `visitModule = new Elysia({ prefix: '/visits' })`.
- Register `visitModule` in `backend/src/index.ts` inside the `/api/v1` group.
- Required endpoints: list, detail, create, update, delete, filter-options, stats, import.
- Static routes (`/filter-options`, `/stats`, `/import`) must be declared before `/:id`.
- Write schemas should use `t.Object(..., { additionalProperties: false })` and only expose business fields; `id`, `creatorId`, `creator`, `createdAt`, `updatedAt` are trusted fields and must not be client-writable.
- Handlers should explicitly build Prisma `data` objects instead of passing `body` through.

### List, filter-options, stats, import
- List response should be `{ rows, total, page, size }`.
- List filters: `page`, `size`, `keyword`, `name`, `channelPartner`, `consultant`, `receptionist`, `receptionStatus`, `consultationStatus`, `statusCategory`, `dateFrom`, `dateTo`.
- Date filters apply to `receptionDate`; `dateTo` should include end of day.
- `GET /filter-options` returns non-empty distinct values for channel partners, consultants, receptionists, reception statuses, consultation statuses, and status categories.
- `GET /stats` uses `visit:stats`, supports `dateFrom/dateTo`, and returns grouped counts by channel/person/status dimensions.
- `POST /import` accepts `{ rows: VisitWriteInput[] }` of normalized JSON, performs second-pass validation, and inserts confirmed rows without file upload, auto-merge, auto-skip, or dedupe.
- Invalid import rows should reject the whole request with clear row errors so Phase 22 preview and backend result cannot diverge.

## File and Pattern Map

- `.planning/phases/20-api/20-CONTEXT.md` — locked field, API, permission, import, and stats decisions.
- `.planning/ROADMAP.md` — Phase 20 success criteria and Phase 21-23 boundaries.
- `.planning/REQUIREMENTS.md` — `VISIT-01`, `PERM-01`, `PERM-02`; later QUERY/IMPORT/STAT contracts that Phase 20 enables.
- `.planning/research/ARCHITECTURE.md` — model and endpoint recommendation.
- `.planning/research/PITFALLS.md` — date drift, row offset, string status fields, duplicate and permission pitfalls.
- `backend/prisma/schema.prisma` — model/relation/index conventions.
- `backend/prisma/seed.ts` — centralized permission seed and role assignment.
- `backend/src/index.ts` — `/api/v1` module registration.
- `backend/src/middlewares/auth.ts` — permission guard and `currentUser` derivation.
- `backend/src/modules/user/user.route.ts` — CRUD, query schema, body schema, and guarded write route patterns.
- `backend/src/modules/submission/submission.route.ts` — list response and date filter precedent.
- `backend/src/modules/form-stats/form-stats.route.ts` — lightweight aggregation precedent.
- `backend/src/modules/approval/__tests__/*.ts` — Phase 19 route contract, strict schema, stats, and seed test style.

## Recommended Plan Split (3 plans)

1. **20-01 — Backend contracts and Wave 0 tests**: add visit route/import/stats/permission tests that initially fail until implementation.
2. **20-02 — Data model and permission seed**: add `VisitRecord`, migration, `User.visitRecords`, visit permission seed, and make seed/model validation pass.
3. **20-03 — Visit route implementation**: implement `/api/v1/visits` list/detail/create/update/delete/filter-options/stats/import and final backend verification.

## Validation Architecture

- **Framework:** Bun test (`bun:test`).
- **Quick command:** `cd backend && bun test src/modules/visit/__tests__/visit.route.test.ts src/modules/role/__tests__/visit-permissions.seed.test.ts`.
- **Full command:** `cd backend && bun test && bun run build`.
- **Prisma validation:** `cd backend && bun --env-file=../.env prisma format && bun --env-file=../.env prisma validate && bun --env-file=../.env prisma generate`.
- **Migration command:** `cd backend && bun --env-file=../.env prisma migrate dev --name add_visit_records`.
- **Contract checks:** route prefix/signatures, schema property names, `additionalProperties: false`, forbidden trusted fields, distinct filter keys, stats shape, import all-or-nothing validation.
- **Sampling:** after Wave 0 test creation run existence/rg checks; after model/seed run Prisma validate/generate and seed tests; after routes run visit tests, `bun test`, and `bun run build`.

## Risks and Pitfalls

- Date-only fields can drift if timezone conversion becomes business logic; keep `dateFrom/dateTo` contract explicit.
- Status enums/dictionaries are premature because the sample uses free-text business statuses.
- Over-posting `creatorId` or timestamps would break audit trust; strict schemas and explicit data picking are mandatory.
- Partial import makes Phase 22 preview unreliable; reject invalid batches rather than silently skipping rows.
- `visit:list` must not imply write/import/stats access.
- Static route order must prevent `/:id` from capturing `/stats`, `/import`, or `/filter-options`.
