# Phase 21: 到访管理页面 + CRUD 筛选 - Research

**Researched:** 2026-05-02
**Status:** Ready for planning
**Scope:** frontend visit ledger page, responsive list, filters, CRUD dialogs, permission-gated route/menu/buttons

## RESEARCH COMPLETE

## Phase Summary

Phase 21 should implement the user-facing visit ledger management slice on top of the Phase 20 backend contract. The implementation should stay frontend-only unless a Phase 20 contract gap is discovered: types, Pinia store, route/menu wiring, `/visits` page, mobile card layout, desktop `QTable`, filter UI, and create/edit/detail/delete dialogs.

Out of scope remains explicit: no `xlsx` dependency, no import preview UI, no stats panel, no Excel export, no dictionaries, no automatic dedupe, no follow-up reminders.

## Existing Patterns to Reuse

### Route and menu integration

- `frontend/src/router/routes.ts` defines `MainLayout` child routes with `meta.perm`; route guard in `frontend/src/router/index.ts` rejects missing permission with `/403`.
- `frontend/src/layouts/MainLayout.vue` uses `MenuConfig` with `perm` and `permAny`, filtered by `auth.hasPerm` / `auth.hasAnyPerm`.
- Phase 21 should add a single `/visits` menu item with `perm: 'visit:list'`, not a new grouped module.

### Responsive list pages

- `frontend/src/pages/ApprovalArchivePage.vue` is the strongest pattern for dense desktop filters, `QTable`, mobile cards, filter sheet, loading skeletons, error panel and empty state.
- `frontend/src/pages/ApprovalApplicationPage.vue` is the compact pattern for a list page with create CTA, mobile filter dialog and `EmptyState` CTA.
- `frontend/src/composables/useResponsive.ts` is the canonical `isDesktop`/`isMobile` split.

### Store and API access

- `frontend/src/stores/approvalArchive.ts` shows list filter param building, metadata fetch, detail/action loading flags and blob/export handling.
- `frontend/src/stores/approvalApplication.ts` shows a smaller list/detail/action store; Phase 21 should follow this simpler style unless filter normalization needs extraction.
- The visit store should call the existing axios `api` with `/visits`, `/visits/filter-options`, and `/visits/:id` relative URLs.

### Permission-gated controls

- `frontend/src/boot/perm.ts` implements `v-perm` for simple permission hiding.
- Use route/menu `visit:list`; use `visit:create`, `visit:update`, and `visit:delete` for create/edit/delete visibility. Do not add import/stats buttons in this phase.

## API Contract From Phase 20

`backend/src/modules/visit/visit.route.ts` exports the stable endpoints Phase 21 consumes:

| UI Need | Endpoint | Permission |
|---------|----------|------------|
| list and filters | `GET /visits` | `visit:list` |
| filter option metadata | `GET /visits/filter-options` | `visit:list` |
| detail | `GET /visits/:id` | `visit:list` |
| create | `POST /visits` | `visit:create` |
| update | `PUT /visits/:id` | `visit:update` |
| delete | `DELETE /visits/:id` | `visit:delete` |

Query params to support in frontend filters: `page`, `size`, `keyword`, `name`, `channelPartner`, `consultant`, `receptionist`, `receptionStatus`, `consultationStatus`, `statusCategory`, `dateFrom`, `dateTo`.

Filter options shape: `channelPartners`, `consultants`, `receptionists`, `receptionStatuses`, `consultationStatuses`, `statusCategories`.

Write payload fields: `name`, `age`, `education`, `gender`, `channelPartner`, `consultant`, `receptionStatus`, `receptionist`, `receptionDate`, `consultationStatus`, `statusCategory`, `statusDescription`, `trialStatus`, `solution`, `trialDate`.

## Recommended File Plan

| File | Role |
|------|------|
| `frontend/src/types/visit.ts` | DTOs, filters, payload types, label/color/date helpers and payload key constants |
| `frontend/src/stores/visit.ts` | Pinia store for list/meta/detail/create/update/delete and loading flags |
| `frontend/src/components/visit/VisitFormDialog.vue` | Shared create/edit/detail dialog, desktop fixed width, mobile maximized |
| `frontend/src/pages/VisitPage.vue` | Main page with header, filters, table/cards, dialogs and delete confirmation |
| `frontend/src/router/routes.ts` | Add `visits` child route with `meta.perm = 'visit:list'` |
| `frontend/src/layouts/MainLayout.vue` | Add independent menu item titled `到访管理` |

## Testing Strategy

Use Vitest static contract tests first, then implement. This matches recent frontend plans where page tests read `.vue` source and store tests mock `src/boot/axios`.

Recommended Wave 0 tests:

- `frontend/src/types/__tests__/visit.test.ts`: labels, payload key restrictions, date display helper, and no import/stat/export constants.
- `frontend/src/stores/__tests__/visit.test.ts`: exact API paths and params, loading flag reset, CRUD actions, filter options.
- `frontend/src/pages/__tests__/VisitPage.test.ts`: page copy, `QTable`, filter labels, mobile card class, `VisitFormDialog`, `v-perm` usage, no `导入 Excel` / `统计` / `导出 Excel` strings.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Overloading table with 15 fields | Keep only scan fields in table; show all fields in dialog. |
| Date timezone drift | Use date-only `YYYY-MM-DD` helpers for `receptionDate` and `trialDate`; do not display raw ISO timestamps for business dates. |
| Scope creep into Phase 22/23 | Tests should assert no import/stats/export strings in Phase 21 page. |
| Permission mismatch | Tests should check route/menu `visit:list` and page button `v-perm` strings. |
| Direct page API calls | Store tests should pin all API paths in `useVisitStore`. |

## Validation Architecture

### Framework

- Frontend tests: Vitest via `frontend/package.json` script `test`.
- Build gate: Quasar build via `frontend/package.json` script `build`.

### Quick Commands

- Contract tests: `cd frontend && bun test src/types/__tests__/visit.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts`
- Full frontend gate: `cd frontend && bun test && bun run build`

### Wave 0 Requirements

Wave 0 should add the three focused tests above before implementing the store/page/dialog. These tests should initially fail until Wave 1/2 implementation lands.

### Manual Checks

No manual-only behavior is required for Phase 21 planning. Browser smoke after execution is useful but not required for plan completeness because page/source/store contracts plus build should cover the phase boundary.

## Planning Recommendation

Create 3 plans:

1. Wave 0 frontend contracts for visit types/store/page/menu behavior.
2. Wave 1 type/store/router/menu implementation.
3. Wave 2 visit page, form/detail dialog, filters, CRUD/delete flow and final frontend validation.

---

*Phase: 21-crud*
*Research complete: 2026-05-02*
