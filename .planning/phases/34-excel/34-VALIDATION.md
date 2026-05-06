---
phase: 34
slug: excel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for frontend, Bun test for backend |
| **Config file** | `frontend/package.json` (vitest), backend Bun test runner |
| **Quick run command** | `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts` |
| **Full suite command** | `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts src/stores/__tests__/channelPush.test.ts src/pages/__tests__/ChannelPushPage.test.ts && npm run build && cd ../backend && bun test src/modules/channel-push/__tests__/channel-push.batch-import.test.ts src/modules/channel-push/__tests__/channel-push.service.test.ts` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command (parser unit tests)
- **After every plan wave:** Run full suite (parser + store + page + backend route + service)
- **Before `/gsd:verify-work`:** Full frontend + backend suites and `cd frontend && npm run build` must all be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

> Task IDs are placeholders; planner will reconcile after PLAN.md generation. Mapping reflects expected wave structure: Wave 0 = test scaffolds + types/constants; Wave 1 = parser + store; Wave 2 = backend route/service; Wave 3 = UI dialog + page entry.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 0 | PUSH-03 | type contract | `cd frontend && npm run typecheck` (type additions to `types/channelPush.ts`) | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 0 | PUSH-03 | unit (red) | `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-03 | 01 | 0 | PUSH-04 | route negative-grep (red) | `cd backend && bun test src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-04 | 01 | 1 | PUSH-03 | parser implementation | `cd frontend && npm run test -- src/components/channel-push/__tests__/channelPushImport.test.ts` | ✅ | ⬜ pending |
| 34-01-05 | 01 | 1 | PUSH-04 | backend service partial-success | `cd backend && bun test src/modules/channel-push/__tests__/channel-push.service.test.ts` | ✅ | ⬜ pending |
| 34-02-01 | 02 | 2 | PUSH-04 | store action contract | `cd frontend && npm run test -- src/stores/__tests__/channelPush.test.ts` | ✅ | ⬜ pending |
| 34-02-02 | 02 | 2 | PUSH-04 | backend route end-to-end | `cd backend && bun test src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` | ✅ | ⬜ pending |
| 34-02-03 | 02 | 3 | PUSH-03, PUSH-04 | page/component integration | `cd frontend && npm run test -- src/pages/__tests__/ChannelPushPage.test.ts` | ✅ | ⬜ pending |
| 34-02-04 | 02 | 3 | PUSH-03, PUSH-04 | frontend build | `cd frontend && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/types/channelPush.ts` — append import-related types (`CHANNEL_PUSH_IMPORT_HEADERS`, `ChannelPushImport*`, `ChannelPushBatchImport*`)
- [ ] `frontend/src/components/channel-push/__tests__/channelPushImport.test.ts` — parser tests for PUSH-03 (header sampling, row edges, duplicate keys, 500-row cap)
- [ ] `frontend/src/components/channel-push/channelPushImport.ts` — pure parser helper under test (mirror `visitImport.ts`)
- [ ] `backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` — route negative-grep contract (multipart rejection, additionalProperties: false, maxItems: 500, auth boundaries)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Excel workbook preview readability (PC + mobile) | PUSH-03 | Source tests verify contracts but not visual density of real-world Excel previews on phone | Open `/channel-push` as a CHANNEL_PARTNER, click "Excel 批量导入", upload `.xlsx` containing 1 row title + 8-column headers + ~10 data rows; verify valid/invalid/duplicate sections render readably on desktop and on a phone viewport |
| Cross-record duplicate dialog flows after import | PUSH-04, DEDUP-01 | `ChannelPushDuplicateDialog` opens after batch-import; integration depends on store wiring | Submit a workbook where ≥1 row matches an already-existing pending push for the same partner; verify duplicate dialog appears with correct entries after the import success notification |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
