# Phase 21: 到访管理页面 + CRUD 筛选 - Validation

**Created:** 2026-05-02
**Status:** Ready for execution

## Validation Goal

Validate that Phase 21 delivers a frontend-only visit management page that consumes the Phase 20 `/visits` API contract, respects permissions, supports responsive listing/filtering, and keeps Phase 22/23 capabilities out of scope.

## Automated Gates

### Focused Contract Gate

```bash
cd frontend && bun test src/types/__tests__/visit.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts
```

This gate must pass after all Phase 21 plans are implemented.

### Full Frontend Gate

```bash
cd frontend && bun test && bun run build
```

This gate must pass before Phase 21 is considered complete.

## Test Responsibilities

| Test File | Responsibility |
|-----------|----------------|
| `frontend/src/types/__tests__/visit.test.ts` | Pin visit DTO/filter/payload constants and date-only helpers. |
| `frontend/src/stores/__tests__/visit.test.ts` | Pin `/visits` API paths, query params, CRUD actions and loading reset behavior. |
| `frontend/src/pages/__tests__/VisitPage.test.ts` | Pin page copy, filters, `QTable`, mobile card class, dialog usage, route/menu permission strings and negative scope strings. |

## Requirements Coverage

| Requirement | Validation |
|-------------|------------|
| VISIT-02 | `VisitFormDialog` source contract covers all 15 fields; store test covers `updateVisit` payload path. |
| VISIT-03 | Page source contract covers delete action and confirmation copy; store test covers `deleteVisit`. |
| VISIT-04 | Page/dialog contract covers detail mode and full long-text fields. |
| QUERY-01 | Store test covers `GET /visits` with `page`, `size`, `keyword`; page contract covers `QTable` pagination. |
| QUERY-02 | Store/page tests cover channelPartner, consultant, receptionist, receptionStatus, consultationStatus, statusCategory, dateFrom and dateTo. |
| QUERY-03 | Store test covers `GET /visits/filter-options`; page contract covers option-backed selects. |
| QUERY-04 | Page contract covers desktop `QTable`, mobile cards and list-summary behavior for long text. |

## Nyquist Checks

1. **API boundary:** Store tests must assert exact paths: `/visits`, `/visits/filter-options`, `/visits/:id`.
2. **Permission boundary:** Source contracts must assert `visit:list`, `visit:create`, `visit:update`, `visit:delete`.
3. **Responsive boundary:** Page contract must assert both `q-table` and a visit mobile card class.
4. **Scope boundary:** Page contract must assert absent strings for import, stats and export UI.
5. **Date boundary:** Type tests must assert date-only formatting for ISO input and empty input.

## Manual Smoke Optional

After automated gates pass, a browser smoke can verify:

1. `/visits` loads for an authorized user.
2. Desktop table paginates and filters.
3. Mobile viewport shows cards and filter sheet.
4. Create/edit/detail/delete dialogs open and close correctly.

Manual smoke is recommended but not required for plan completeness.

