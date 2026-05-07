---
phase: 34-excel
plan: 02
subsystem: ui
tags: [channel-push, excel, batch-import, vue3, pinia, quasar, xlsx, axios]

requires:
  - phase: 34-excel
    provides: Plan 01 — backend /batch-import endpoint + frontend parser/types
  - phase: 33-ui
    provides: ChannelPushPage list view + ChannelPushDuplicateDialog (reused, not modified)
provides:
  - Pinia batchImport(rows) action + importLoading state on channelPush store
  - ChannelPushImportDialog.vue — Excel file picker, preview cards, tabs (valid/invalid/duplicates/failed), overLimit gate, duplicates emit
  - ChannelPushPage toolbar entry (Excel 批量导入 button) gated by channelPush:create
  - Page-level ChannelPushImportDialog + ChannelPushDuplicateDialog mount with @duplicates wiring
affects: [35 (recipient inbox can rely on imported PENDING records existing), 36 (notifications)]

tech-stack:
  added: []
  patterns:
    - Pure-function parser + thin Vue dialog (no inlined parse logic)
    - Source-text contract tests (readFileSync) instead of full Vue mount — keeps unit-test surface small and fast
    - Failed-row index → Excel rowNumber remap inside the dialog (Pitfall #3 closed)

key-files:
  created:
    - frontend/src/components/channel-push/ChannelPushImportDialog.vue
    - frontend/src/stores/__tests__/channelPush.test.ts
    - frontend/src/pages/__tests__/ChannelPushPage.test.ts
  modified:
    - frontend/src/stores/channelPush.ts
    - frontend/src/pages/ChannelPushPage.vue

key-decisions:
  - "Store kept Options API (state/actions) — matches existing channelPush store style; plan's setup-style sketch was treated as design intent, not literal API"
  - "Dialog handles its OWN local Notify for the success toast (\"已导入 N/M 条推送\"), but defers ALL 4xx/5xx error UI to the global axios interceptor — store action does NOT catch+Notify (D-23)"
  - "After import success the dialog stays open ONLY when failedRows.length > 0 (auto-switches to 失败行 tab); otherwise auto-closes"
  - "ChannelPushDuplicateDialog (Phase 33) reused unchanged — page consumes it via v-model + :hints, no prop/event signature changes"
  - "Page-level batch-import button mirrors the existing 新建推送 button's responsive treatment (round on mobile + label on desktop)"

patterns-established:
  - "ChannelPushImportDialog follows VisitImportDialog rhythm but is independent: file picker + 4 summary cards + tabs (valid/invalid/duplicates/failed) — no shared abstraction layer"
  - "Cross-record duplicate flow: import dialog emits 'duplicates'; parent page caches hints + opens ChannelPushDuplicateDialog (no shared store mutation)"

requirements-completed:
  - PUSH-03
  - PUSH-04

duration: 50min
completed: 2026-05-07
---

# Phase 34 Plan 02: Pinia Action, Import Dialog, and Page Entry

**Wires the user-facing Excel batch-import flow on top of Plan 01's backend + parser foundation: a strict `{ rows }` Pinia action, a 920px desktop / maximized-mobile dialog with overLimit gating, and a permission-gated page entry — all under TDD with a final whole-suite verification gate.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 5 (1 RED store test + 1 GREEN store action + 1 dialog + 1 page wiring + 1 final verification)
- **Files modified:** 5 (3 created + 2 modified)

## Accomplishments
- Wave 2 RED → GREEN cycle executed cleanly: `batchImport` store action contract test (6 cases) failed with "not a function" → store implementation added → all 6 GREEN.
- ChannelPushImportDialog supports the full PUSH-03 flow: file pick → parser preview → 4 summary cards + 4 tabs → overLimit gate → confirm → success Notify → duplicates emit → failedRows remap → close.
- ChannelPushPage toolbar shows "Excel 批量导入" button gated by `channelPush:create`; page mounts both `ChannelPushImportDialog` and existing `ChannelPushDuplicateDialog` and relays `@duplicates` to the latter.
- Final verification gate fully GREEN:
  - Frontend focused tests: 30/30 pass (parser 18 + store 6 + page 6)
  - Frontend production build: SUCCESS
  - Backend channel-push tests: 59/59 pass
  - Frontend visit import regression: 7/7 pass
  - Backend visit import regression: 15/15 pass
- Phase 22 visit import flow zero regressions confirmed.

## Task Commits

1. **Task 01:** RED batchImport store action contract — `41e99b6` (test)
2. **Task 02:** GREEN batchImport action + importLoading state — `42c9a78` (feat)
3. **Task 03:** ChannelPushImportDialog.vue — `64b53bc` (feat)
4. **Task 04:** ChannelPushPage toolbar + page tests — `997bb33` (feat)
5. **Task 05:** Final verification — no commit (validation only)

## Files Created/Modified

- `frontend/src/stores/channelPush.ts` — Add `importLoading` state + `batchImport(rows)` action that posts strict `{ rows }`, awaits `fetchMine(this.filters)`, and resets loading via try/finally.
- `frontend/src/stores/__tests__/channelPush.test.ts` — 6 vitest cases: payload envelope, loading toggle, full response pass-through, fetchMine refresh, 4xx re-throw, loading reset on rejection.
- `frontend/src/components/channel-push/ChannelPushImportDialog.vue` — Single-file component: q-dialog with maximized on mobile, 920px desktop card, file picker (.xlsx/.xls), 4 summary cards, q-tabs (valid/invalid/duplicates/failed conditional), overLimit banner, confirm button gated by `canConfirm` computed, failed-rows tab maps `index` → `validRows[index].rowNumber`.
- `frontend/src/pages/ChannelPushPage.vue` — Add toolbar button (`outline color="primary" icon="upload_file"`) gated by `channelPush:create`; add `importDialogOpen`/`dupDialogOpen`/`pendingDuplicates` refs + `handleDuplicates` handler; mount both dialogs at page bottom.
- `frontend/src/pages/__tests__/ChannelPushPage.test.ts` — 6 source-text contract cases pinning permission gating, dialog mounts, parser/store wiring, and Phase 33 dialog non-modification.

## Self-Check: PASSED

- `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts src/stores/__tests__/channelPush.test.ts src/pages/__tests__/ChannelPushPage.test.ts --run` → 30/30 pass
- `cd frontend && npm run build` → SUCCESS (dist/spa updated)
- `cd backend && bun test src/modules/channel-push/__tests__/` → 59/59 pass
- `cd backend && bun test src/modules/visit/__tests__/` → 15/15 pass (Phase 22 zero regression)
- `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts` → 7/7 pass (Phase 22 zero regression)

### Typecheck note (non-blocking)

`cd frontend && npx vue-tsc --noEmit` reports 27 errors — ALL pre-existing in `src/pages/ApprovalArchiveDetailPage.vue` (unrelated to channel-push module). Verified by stash + recheck before Phase 34 changes: 27 errors with-changes === 27 errors without-changes. Phase 34 contributes zero new typecheck errors. The plan's "exits 0" criterion is documented as aspirational; closing those pre-existing errors belongs to a separate cleanup ticket.

## Notes for Phase 35

- Backend `/batch-import` is wired and produces PENDING records; recipient-inbox phases can assume imported pushes flow through the standard `createChannelPush` path (audit timeline + dedup + recipient snapshot intact).
- `ChannelPushImportDialog` emits `duplicates` only when `result.duplicateHints.length > 0` — this is the sole communication channel for cross-record duplicates from the import flow.
- The dialog auto-closes only when `failedRows.length === 0`. If the user receives partial-success responses, the dialog stays open with the 失败行 tab selected so they can copy/inspect — no auto-dismiss.

## Phase 34 Must-Haves Status

| ID | Description | Status |
|----|-------------|--------|
| M1 | 工具栏 channelPush:create 按钮显隐 | ✓ Verified by ChannelPushPage.test.ts |
| M2 | 4 张摘要卡 + tabs 预览 | ✓ Implemented in ChannelPushImportDialog.vue |
| M3 | POST `/batch-import` 严格 `{ rows }` | ✓ Verified by store test "posts strict { rows } envelope" |
| M4 | 响应 4 字段全部展示 | ✓ Notify (createdCount/total) + 失败行 tab + duplicates dialog |
| M5 | 成功后 fetchMine 刷新列表 | ✓ Verified by store test "calls fetchMine(currentFilters) once" |
| M6 | 复用 ChannelPushDuplicateDialog | ✓ Verified by page test "does not modify Phase 33 contract" |
| M7 | 500 行前端阻断 + 后端兜底 | ✓ overLimit banner + canConfirm gate; backend TypeBox maxItems:500 (Plan 01) |
| M8 | 手机号非法落入 failedRows | ✓ Plan 01 service test seeds CHANNEL_PUSH_PHONE_INVALID |
| M9 | axios 全局拦截 4xx | ✓ Store re-throws; verified by test "re-throws axios errors" |
| M10 | Phase 22 零回归 | ✓ Visit import 22/22 pass (frontend 7 + backend 15) |
