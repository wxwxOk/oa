# Phase 23: 统计面板 + 转化汇总 - Research

**Researched:** 2026-05-02
**Status:** Complete
**Phase:** 23 - 统计面板 + 转化汇总

## RESEARCH COMPLETE

## Scope Summary

Phase 23 is the v1.3 close-out phase for visit statistics. It must refine the existing `GET /api/v1/visits/stats` endpoint and wire a `visit:stats`-gated statistics panel into the existing `/visits` page. The phase closes `STAT-01` through `STAT-04` and the remaining stats frontend control for `PERM-02`.

Out of scope remains unchanged: Excel export, report download, scheduled reports, dictionary management, configurable conversion rules, follow-up reminders, workflow/funnel configuration, public sign-up and automatic deduplication.

## Source Findings

### Backend visit stats

- `backend/src/modules/visit/visit.route.ts` already exports `isIntentVisit`, `isSignedVisit` and `buildVisitStats`, and already protects `/stats` with `authGuard('visit:stats')`.
- Current `buildVisitStats` returns top-level `total`, `intentCount`, `signedCount`, and simple `{ name, count }` groups for channel/person/status fields.
- Current `groupByField` skips blank values. Phase 23 should change this to an explicit `未填写` bucket so totals are explainable and data-quality gaps are visible.
- Current `/stats` route filters only by `receptionDate` via `dateFrom` / `dateTo`, which matches Phase 23 scope.

### Frontend visit module

- `frontend/src/pages/VisitPage.vue` already owns the `/visits` toolbar, refresh flow, create/import actions, filters, responsive list and dialogs. The statistics entry should attach here.
- `frontend/src/stores/visit.ts` centralizes visit API actions and loading flags. Add `stats`, `statsLoading` and `fetchStats` here rather than calling axios directly from the stats component.
- `frontend/src/types/visit.ts` contains visit filters and date helpers. Add stats DTOs here; do not introduce a global stats domain.
- `frontend/src/pages/__tests__/VisitPage.test.ts` currently has a Phase 22 negative assertion for `/visits/stats`. Phase 23 must replace that with positive stats-entry assertions while keeping negative export/dedup assertions.

### Existing chart/stat patterns

- `frontend/src/components/approval/ArchiveStatsPanel.vue` provides the best current reference for Quasar stats grid, chart boxes, skeletons, `q-banner` error state, empty state, tables and responsive two-column-to-one-column layout.
- `frontend/src/components/submission/FormStatsPanel.vue` shows date range controls and `ChartJS.register` usage.
- `frontend/package.json` already includes `chart.js` and `vue-chartjs`; no new chart dependency is needed.

## Technical Approach

### Backend DTO shape

Use the existing `/visits/stats` endpoint and enrich `buildVisitStats`.

Recommended response shape:

```ts
interface VisitStatsDimensionRow {
  name: string;
  count: number;
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
}

interface VisitStatsDistributionRow {
  name: string;
  count: number;
}

interface VisitStats {
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
  byChannelPartner: VisitStatsDimensionRow[];
  byConsultant: VisitStatsDimensionRow[];
  byReceptionist: VisitStatsDimensionRow[];
  byReceptionStatus: VisitStatsDistributionRow[];
  byConsultationStatus: VisitStatsDistributionRow[];
  byStatusCategory: VisitStatsDistributionRow[];
  byTrialStatus: VisitStatsDistributionRow[];
}
```

Rates should be numeric percentages in the range `0..100`, rounded to one decimal. Use `0` when the denominator is `0`. Frontend can format them with `%`.

### Aggregation rules

- Dimension rows: channel partner, consultant and receptionist should calculate total, intent count, signed count, intent rate and signed rate.
- Distribution rows: reception status, consultation status, status category and trial status only need `{ name, count }`.
- Blank/whitespace values should group into `未填写`.
- Sort dimension rows by `total` descending, then name ascending; sort distribution rows by `count` descending, then name ascending.
- Keep `count = total` on dimension rows for compatibility with simple chart/table code.

### Conversion rules

Keep the Phase 20 keyword helpers as the single source of truth:

- `isIntentVisit`: excludes `无效|流失|放弃|未试听`; includes `意向|签约|成交|已试听`.
- `isSignedVisit`: excludes `未签|未成交|未试听`; includes `签约|成交|报名|缴费`.

The UI must explain that the conversion counts are keyword estimates from free-text status fields.

### Frontend UI

Add `frontend/src/components/visit/VisitStatsPanel.vue` and mount it from `VisitPage.vue` behind `visit:stats`.

Recommended component behavior:

- Dialog-style panel with `modelValue`, `initialDateFrom`, `initialDateTo` props.
- Desktop: wide dialog or equivalent contained panel; mobile: maximized dialog using `useResponsive()`.
- Date filter only: `dateFrom`, `dateTo`, clear and refresh/apply.
- Summary cards: `到访总数`, `意向数量`, `签约类数量`, `意向率`, `签约转化率`.
- Charts: bar charts for channel partner, consultant and receptionist with total/intent/signed datasets; distribution cards/tables for reception status, consultation status, status category and trial status.
- Tables below charts should list all rows; charts may display Top 10.
- Loading: skeleton cards/chart boxes. Error: keep dialog open and show banner. Empty: `暂无统计数据`.
- Accessibility: chart containers include `role="img"` and Chinese `aria-label`.

## Validation Architecture

### Automated coverage

- Backend unit/contract test: create `backend/src/modules/visit/__tests__/visit-stats.test.ts` for `buildVisitStats`, `isIntentVisit`, `isSignedVisit`, source route guard and date filter behavior.
- Frontend type/helper test: extend `frontend/src/types/__tests__/visit.test.ts` with `VisitStats` DTO and rate formatting helper.
- Frontend store test: extend `frontend/src/stores/__tests__/visit.test.ts` with `/visits/stats` params and `statsLoading` rejection reset.
- Frontend page/source test: update `frontend/src/pages/__tests__/VisitPage.test.ts` to assert `visit:stats` button, `VisitStatsPanel`, no export button and no dedup/upsert scope creep.
- Optional focused component source test can be added if planner keeps assertions in `VisitPage.test.ts`; full DOM mounting is not required for this codebase's existing source-contract style.

### Recommended command gates

Backend focused:

```bash
cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts src/modules/visit/__tests__/visit-import.test.ts
```

Frontend focused:

```bash
cd frontend && npm run test -- src/types/__tests__/visit.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts
```

Final build gates:

```bash
cd backend && bun run build
cd frontend && npm run build
```

## Planning Implications

Use two plans:

1. Backend stats contract/DTO/helper tests and route refinement.
2. Frontend stats DTO/store/panel/page integration and final gates.

Backend should go first because the frontend DTO and chart tables depend on the enriched stats response.

## Risks and Mitigations

- **Risk:** Frontend computes conversion differently from backend. **Mitigation:** backend owns conversion counts and rates; frontend only formats.
- **Risk:** Blank buckets disappear and totals look inconsistent. **Mitigation:** group blank/whitespace as `未填写` and test it.
- **Risk:** Phase 23 becomes a BI/reporting project. **Mitigation:** date range only, bar charts + tables, no exports, no dictionary or rule editor.
- **Risk:** Existing Phase 22 negative `/visits/stats` assertions block Phase 23. **Mitigation:** explicitly update those tests to positive stats assertions while keeping export/dedup negatives.
