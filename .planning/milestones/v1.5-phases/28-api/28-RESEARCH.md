% 28
# Phase 28: 工作记录数据模型 + 后端 API - Research

**Gathered:** 2026-05-03
**Status:** Ready for planning

## Research Objective

Phase 28 needs a backend shape that can support later fill, summary, and export phases without reusing the dynamic form model. The planner needs to know which contracts are already established by the codebase and which implementation choices must stay fixed.

## Key Findings

### Fixed business modules are already the project pattern

- `backend/prisma/schema.prisma` shows the fixed-module style used by `VisitRecord` and `ReimbursementApplication`: explicit fields, timestamp columns, relation snapshots, and query indexes instead of a JSONB main payload.
- `backend/src/modules/visit/visit.route.ts` and `backend/src/modules/reimbursement/reimbursement.route.ts` show the route pattern for fixed modules: plural prefix, `t.Object` schemas, `{ rows, total, page, size }` list responses, and service-level filtering.
- `backend/src/index.ts` mounts domain modules under `/api/v1`, so the new module should follow the same registration path.

### Period and uniqueness logic should live in backend helpers

- `backend/src/modules/reimbursement/reimbursement.service.ts` already centralizes page normalization, date boundary parsing, actor snapshots, visibility filters, and submit transactions.
- `backend/src/modules/reimbursement/reimbursement.state.ts` shows the preferred compact state-transition helper style for domain-specific lifecycles.
- For work reports, the period boundary must be derived from backend logic, not from client-supplied start/end dates, because Phase 30 will aggregate by the same period boundaries later.

### RBAC must remain dual-layered

- `backend/src/middlewares/auth.ts` exposes `currentUser.id`, `realName`, `roleCodes`, and `permissions`, which is enough to build a domain actor object inside the service layer.
- The reimbursement module shows the project norm: route guards gate permission families, but object-level visibility still gets rechecked inside the service.
- For work reports, the route can guard create/update/submit actions, but list/detail scope still needs explicit actor-aware filtering.

### The phase should stay small and API-only

- The roadmap and requirements keep Phase 28 limited to data model, permissions, period rules, and backend API contracts.
- Fill UI, department summary, and export are intentionally deferred to Phases 29-31.
- The new module should therefore only expose the minimum CRUD shape needed by later phases.

## Recommended Planning Constraints

1. Use a dedicated `WorkReport` model with explicit columns for period, content, and submitter/department snapshots.
2. Use dedicated work-report permission codes and keep ADMIN inheritance automatic through the existing permission seed flow.
3. Keep period calculation in service helpers so the same logic can be reused by later summary and export phases.
4. Keep list/detail visibility service-side even if the route already has a permission guard.
5. Keep list pagination capped at 100 and filter only the fields listed in the requirements.

## Validation Architecture

The execution plans should be validated in four layers:

1. **Schema and seed contracts** — verify enums, model fields, indexes, and permission constants before implementation.
2. **Period and visibility helpers** — verify same-period uniqueness, weekday/month boundaries, and actor scope filtering.
3. **Route contract** — verify route prefix, query/body schemas, and handler names for list/detail/create/edit/submit.
4. **Focused backend tests** — verify the phase stays bounded to the requirement IDs and does not drift into summary/export/UI work.

## Main Risks

- Week and month boundary calculations drifting by timezone.
- Duplicate draft or submit races if uniqueness only exists in application code.
- Department-scoped visibility drifting when department names change, if snapshot fields are not stored.
- Route-level permission checks becoming too coarse for department/all viewers.

---

*Phase: 28-api*
*Research gathered: 2026-05-03*
