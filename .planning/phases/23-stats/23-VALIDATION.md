---
phase: 23
slug: stats
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-02
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for visit statistics execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test for backend, Vitest for frontend source/unit contracts, Quasar/Vite build gates |
| **Config file** | `frontend/vitest.config.ts`; backend uses Bun's default test runner |
| **Quick run command** | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts`; `cd frontend && npm run test -- src/types/__tests__/visit.test.ts src/stores/__tests__/visit.test.ts src/components/visit/__tests__/VisitStatsPanel.test.ts src/pages/__tests__/VisitPage.test.ts` |
| **Full suite command** | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts src/modules/visit/__tests__/visit-import.test.ts`; `cd frontend && npm run test -- src/types/__tests__/visit.test.ts src/stores/__tests__/visit.test.ts src/components/visit/__tests__/VisitStatsPanel.test.ts src/pages/__tests__/VisitPage.test.ts`; `cd backend && bun run build`; `cd frontend && npm run build` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's focused `<automated>` command.
- **After every plan wave:** Run the full suite command for the completed wave.
- **Before `$gsd-verify-work`:** Backend focused tests, frontend focused tests, backend build and frontend build must be green.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 0 | STAT-01, STAT-02, STAT-03, STAT-04, PERM-02 | backend contract | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 0 | STAT-01, STAT-02, STAT-03, STAT-04 | backend unit | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 0 | STAT-01, STAT-02, STAT-03, STAT-04, PERM-02 | backend regression | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts src/modules/visit/__tests__/visit-import.test.ts` | ✅ | ⬜ pending |
| 23-02-01 | 02 | 1 | STAT-01, STAT-02, STAT-03, STAT-04 | frontend type | `cd frontend && npm run test -- src/types/__tests__/visit.test.ts` | ✅ | ⬜ pending |
| 23-02-02 | 02 | 1 | STAT-04 | frontend store | `cd frontend && npm run test -- src/stores/__tests__/visit.test.ts` | ✅ | ⬜ pending |
| 23-02-03 | 02 | 1 | STAT-01, STAT-02, STAT-03 | frontend component source | `cd frontend && npm run test -- src/components/visit/__tests__/VisitStatsPanel.test.ts src/types/__tests__/visit.test.ts` | ❌ W0 | ⬜ pending |
| 23-02-04 | 02 | 1 | STAT-01, STAT-02, STAT-03, STAT-04, PERM-02 | frontend page source | `cd frontend && npm run test -- src/pages/__tests__/VisitPage.test.ts src/stores/__tests__/visit.test.ts` | ✅ | ⬜ pending |
| 23-02-05 | 02 | 1 | STAT-01, STAT-02, STAT-03, STAT-04, PERM-02 | final gates | `cd backend && bun run build`; `cd frontend && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- [ ] `backend/src/modules/visit/__tests__/visit-stats.test.ts` — created in Plan 01 before backend implementation is considered complete.
- [ ] `frontend/src/components/visit/__tests__/VisitStatsPanel.test.ts` — created in Plan 02 with component source-contract coverage.

No new test framework or dependency is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive chart/dialog feel | STAT-01, STAT-02, STAT-03 | Visual density and mobile maximized dialog are better judged in-browser after automated contracts pass | Open `/visits`, click the `visit:stats` statistics entry on desktop and mobile widths, verify the dialog/panel is readable, charts do not overflow and no export/dedup controls appear. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency < 180s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-02
