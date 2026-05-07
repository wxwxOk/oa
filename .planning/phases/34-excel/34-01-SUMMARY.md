---
phase: 34-excel
plan: 01
subsystem: api
tags: [channel-push, excel, batch-import, elysia, typebox, vitest, vue3, partial-success]

requires:
  - phase: 32-api-rbac
    provides: createChannelPush + findChannelPushDuplicates + channelPushWriteBody contract
  - phase: 33-ui
    provides: ChannelPushDuplicateDialog (consumed by Plan 02)
provides:
  - Frontend types for ChannelPushImportPreview / ChannelPushBatchImportRequest|Response
  - Pure parser channelPushImport.ts (8-column header, in-file dedup, 500-row cap)
  - Backend batchCreateChannelPushes service with partial-success + duplicateHints Map dedup
  - POST /api/v1/channel-push/batch-import (channelPush:create, JSON-only)
affects: [34-02 (frontend store/dialog/page wiring), 35 (recipient inbox), 36 (notifications)]

tech-stack:
  added: []
  patterns:
    - Partial-success batch via per-row reuse of single-row service (no createMany)
    - Excel parser as pure function module (mirror visitImport.ts pattern)
    - Column-aligned headerErrors for parser (empty when all columns match)

key-files:
  created:
    - frontend/src/components/channel-push/channelPushImport.ts
    - frontend/src/components/channel-push/__tests__/channelPushImport.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts
  modified:
    - frontend/src/types/channelPush.ts
    - backend/src/modules/channel-push/channel-push.service.ts
    - backend/src/modules/channel-push/channel-push.route.ts
    - backend/src/modules/channel-push/__tests__/channel-push.service.test.ts

key-decisions:
  - "Backend phone strict-format check stays in normalizePhone — invalid phones land in failedRows instead of validRows (Pitfall #1 explicit)"
  - "Parser keeps headerErrors as []  when valid; column-aligned (length 8) with empty strings + error messages when invalid — preserves row-position semantics required by tests"
  - "batchCreateChannelPushes pre-flight checks ChannelPartnerProfile once and throws CHANNEL_PARTNER_NOT_BOUND BEFORE iterating to avoid 500 wasted dedup queries"
  - "duplicateHints aggregated via Map<id, DuplicateHint> to dedupe cross-row hits on same existing record"
  - "channelPushBatchImportBody envelope reuses channelPushWriteBody as row schema (additionalProperties: false on both levels) — single-row and batch contracts cannot drift"

patterns-established:
  - "Per-row error code surfacing: BizError.code propagates through failedRows[].code so the UI can render code-specific messages"
  - "Negative-grep contracts: schema-block extraction (regex match + slice) instead of file-wide greedy regex to avoid false positives from unrelated multipart references"

requirements-completed:
  - PUSH-03
  - PUSH-04

duration: 60min
completed: 2026-05-07
---

# Phase 34 Plan 01: Batch Import Contracts, Parser, Backend Endpoint

**Builds the deterministic foundation for Excel 批量推送导入 — frontend types, pure 8-column parser, partial-success backend service, and JSON `/batch-import` endpoint — all under TDD before any UI lands.**

## Performance

- **Duration:** ~60 min
- **Tasks:** 7
- **Files modified:** 7 (3 created + 4 modified)

## Accomplishments
- Wave 0 RED → Wave 1 GREEN cycle held cleanly across all 7 tasks (each task confirmed RED before its GREEN sibling).
- Backend `batchCreateChannelPushes` reuses `createChannelPush` per row, preserving audit timeline + dedup + per-row tx semantics — no createMany, no skipDuplicates (D-15).
- `/batch-import` route is JSON-only via `channelPushBatchImportBody` envelope (additionalProperties: false at both levels), reusing existing `channelPush:create` permission code (D-11).
- Frontend parser handles 8-column header validation, in-file (studentName, studentPhone) dedup keys, blank-row skipping, age 1..120 integer guard, and 500-row overLimit detection — without any frontend phone regex (Pitfall #1).
- 59/59 backend channel-push tests pass; 18/18 frontend parser tests pass; vue-tsc adds zero new errors (27 pre-existing in ApprovalArchiveDetailPage.vue, untouched).

## Task Commits

1. **Task 01:** Extend channelPush.ts types — `9c7cd84` (feat)
2. **Task 02:** RED parser tests — `c66b26c` (test)
3. **Task 03:** RED route contract tests — `9827071` (test)
4. **Task 04:** RED batch service tests — `323f408` (test)
5. **Task 05:** GREEN parser implementation — `4df4170` (feat)
6. **Task 06:** GREEN batchCreateChannelPushes service — `fc3ea02` (feat)
7. **Task 07:** GREEN POST /batch-import route + test regex fix — `bfb7a46` (feat)

## Files Created/Modified

- `frontend/src/types/channelPush.ts` — Append CHANNEL_PUSH_IMPORT_HEADERS (8 cols), MAX_CHANNEL_PUSH_IMPORT_ROWS=500, ChannelPushImport*/ChannelPushBatchImport* types.
- `frontend/src/components/channel-push/channelPushImport.ts` — Pure parser module: validateChannelPushImportHeaders + parseChannelPushImportRows. No phone regex, column-aligned headerErrors when invalid.
- `frontend/src/components/channel-push/__tests__/channelPushImport.test.ts` — 18 vitest cases covering header sampling, row edges, age boundaries, in-file duplicates, 500/501 overLimit, "2026-05" remark string preservation.
- `backend/src/modules/channel-push/channel-push.service.ts` — Append `batchCreateChannelPushes` (pre-flight CHANNEL_PARTNER_NOT_BOUND, per-row try/catch, Map<id> hint aggregation).
- `backend/src/modules/channel-push/channel-push.route.ts` — Append `channelPushBatchImportBody` schema + `POST /batch-import` route handler under existing channelPushModule, gated by `channelPush:create`.
- `backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` — 5 contract tests: route signatures, envelope shape, schema constraints (minItems/maxItems, additionalProperties), authGuard pinning, schema-block negative-grep for t.Files/t.File.
- `backend/src/modules/channel-push/__tests__/channel-push.service.test.ts` — Append `describe('batchCreateChannelPushes')` block with 5 cases: pre-flight throw, partial-success, hint Map dedup, mixed dedup, no createMany usage.

## Self-Check: PASSED

- All Wave 0 tests confirmed RED at task start (verified via test runner before each GREEN sibling).
- All Wave 1 implementations confirmed GREEN via plan-prescribed commands:
  - `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts` → 18/18 pass
  - `cd backend && bun test src/modules/channel-push/__tests__/channel-push.service.test.ts` → 27/27 pass
  - `cd backend && bun test src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` → 5/5 pass
  - `cd backend && bun test src/modules/channel-push/__tests__/` → 59/59 pass (no regressions on existing channel-push suite)
- Frontend typecheck delta: 27 → 27 errors (all pre-existing in ApprovalArchiveDetailPage.vue, no Phase 34 contributions).
- Hard contracts verified by grep:
  - `grep -c 'createMany|skipDuplicates' service.ts` → 0
  - `grep -c 'CHANNEL_PARTNER_NOT_BOUND' service.ts` → 3
  - `grep -c 'export async function batchCreateChannelPushes' service.ts` → 1
  - `grep -c "authGuard\\('channelPush:create'\\)" route.ts` → 4 (existing 3 + new /batch-import)

## Notes for Plan 02

- Pinia action `batchImport(rows)` should call `api.post('/channel-push/batch-import', { rows })` and pass through the `{ createdCount, total, failedRows, duplicateHints }` response.
- ChannelPushImportDialog should map `failedRows[].index` back to `validRows[index].rowNumber` for user-facing Excel row references (Pitfall #3).
- Reuse Phase 33's `ChannelPushDuplicateDialog.vue` directly when `duplicateHints.length > 0` after import; types are identical.
- Frontend regex check `/^1[3-9]\d{9}$/` MUST NOT be added — backend handles strict format and surfaces invalid phones via failedRows (Pitfall #1).
