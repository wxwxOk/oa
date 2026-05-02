---
phase: 20
slug: api
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-02
completed: 2026-05-02
---

# Phase 20 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Bun test |
| **Config file** | Backend: none, Bun built-in runner |
| **Quick run command** | `cd backend && bun test src/modules/visit/__tests__/visit.route.test.ts src/modules/visit/__tests__/visit-import.test.ts src/modules/visit/__tests__/visit-stats.test.ts src/modules/role/__tests__/visit-permissions.seed.test.ts` |
| **Full suite command** | `cd backend && bun test && bun run build` |
| **Estimated runtime** | Quick: ~45s after Wave 0; full: project-dependent |

---

## Sampling Rate

- **After every task commit:** Run the focused Bun test file for the touched visit route/helper/seed behavior.
- **After every plan wave:** Run all new Phase 20 backend tests plus Prisma validation commands when schema changed.
- **Before `$gsd-verify-work`:** `cd backend && bun test && bun run build` must be green.
- **Max feedback latency:** 90 seconds for focused checks after Wave 0.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-00-01 | 01 | 0 | PERM-01, PERM-02 | T-20-PERM | Six visit permission codes exist, ADMIN gets them, EMPLOYEE does not by default | backend seed | `cd backend && bun test src/modules/role/__tests__/visit-permissions.seed.test.ts` | Yes | passed |
| 20-00-02 | 01 | 0 | VISIT-01 | T-20-DATA-MODEL | VisitRecord fixed fields and trusted audit fields are pinned before implementation | route/model contract | `cd backend && bun test src/modules/visit/__tests__/visit.route.test.ts` | Yes | passed |
| 20-00-03 | 01 | 0 | PERM-02 | T-20-TAMPER | Write schemas reject trusted fields and route signatures use exact permission gates | route contract | `cd backend && bun test src/modules/visit/__tests__/visit.route.test.ts` | Yes | passed |
| 20-00-04 | 02 | 1 | VISIT-01, PERM-01 | T-20-PERM / T-20-TAMPER | Prisma schema and permission seed can generate and validate | Prisma + seed | local Prisma 5 validate/generate + `bun test src/modules/role/__tests__/visit-permissions.seed.test.ts` | Yes | passed |
| 20-00-05 | 03 | 2 | VISIT-01, PERM-02 | T-20-IDOR / T-20-TAMPER | List/detail/create/update/delete/filter-options use exact guards and explicit writable fields | route + DB behavior | `cd backend && bun test src/modules/visit/__tests__/visit.route.test.ts` | Yes | passed |
| 20-00-06 | 03 | 2 | VISIT-01, PERM-02 | T-20-IMPORT | Import validates all rows, derives creatorId from JWT, and avoids dedupe/merge side effects | route + helper | `cd backend && bun test src/modules/visit/__tests__/visit-import.test.ts` | Yes | passed |
| 20-00-07 | 03 | 2 | PERM-02 | T-20-STATS | Stats use `visit:stats`, date filters use receptionDate, and grouped counts are deterministic | route + helper | `cd backend && bun test src/modules/visit/__tests__/visit-stats.test.ts` | Yes | passed |

---

## Wave 0 Requirements

- [x] `backend/src/modules/visit/__tests__/visit.route.test.ts` - route prefix, static route order, schemas, CRUD/list/filter-options contract, trusted-field rejection.
- [x] `backend/src/modules/visit/__tests__/visit-import.test.ts` - import all-or-nothing validation, creator attribution, no dedupe/merge behavior.
- [x] `backend/src/modules/visit/__tests__/visit-stats.test.ts` - grouped counts, intent/signed string rules, receptionDate date-range behavior, separate stats permission.
- [x] `backend/src/modules/role/__tests__/visit-permissions.seed.test.ts` - six visit permissions, ADMIN inheritance, EMPLOYEE exclusion.

---

## Execution Evidence

- Prisma schema validation and client generation passed with the project-local Prisma 5 executable.
- Focused Phase 20 Bun tests passed for seed, route, import and stats contracts.
- Backend build passed after installing already-declared local dependencies.
- Full backend test execution emitted existing local database migration-lag Prisma errors from older suites; no Phase 20 contract failures were observed.

---

## Manual-Only Verifications

All Phase 20 backend behaviors have automated verification. UI creation, independent menu navigation, frontend button visibility, Excel parsing preview, and visual statistics are deferred to Phases 21-23.

---

## Threat References

| Ref | Threat | Control |
|-----|--------|---------|
| T-20-PERM | Route or seed permissions accidentally grant list/import/stats/write too broadly | Separate `visit:*` codes, route-level `authGuard(requiredPerm)`, seed test for ADMIN/EMPLOYEE defaults. |
| T-20-TAMPER | Client over-posts `creatorId`, timestamps, `id`, or relation objects | TypeBox schemas use `additionalProperties: false`; handlers explicitly pick writable business fields. |
| T-20-IDOR | Detail/list/import data scope is confused with creator ownership | Phase 20 deliberately uses module permission scope only; tests pin exact permission gates and creator derivation. |
| T-20-IMPORT | Partial import or silent dedupe makes Phase 22 preview diverge from backend writes | Import validates every row before insert and returns clear errors without auto skip/merge/dedupe. |
| T-20-STATS | Stats leak through list permission or compute against the wrong date field | Stats route requires `visit:stats`; date filters use `receptionDate` with end-of-day `dateTo`. |
| T-20-DATA-MODEL | Dynamic form storage or enum/dictionary over-modeling breaks fixed ledger scope | Prisma model uses fixed fields and nullable strings for status-like values. |

---

## Validation Sign-Off

- [x] Phase 20 backend portions of `VISIT-01`, `PERM-01`, and `PERM-02` have automated verification targets or Wave 0 dependencies; UI portions are deferred to Phases 21-23.
- [x] Sampling continuity: no 3 consecutive tasks may proceed without focused automated verification after Wave 0.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency target is under 90 seconds for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-02
