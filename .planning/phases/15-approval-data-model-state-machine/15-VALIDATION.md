---
phase: 15
slug: approval-data-model-state-machine
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun built-in test runner (`bun:test`) |
| **Config file** | none — tests run by explicit file path |
| **Quick run command** | `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts` |
| **Full suite command** | `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for state-machine-only tasks, or the full approval suite after service/schema changes.
- **After every plan wave:** Run `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts`.
- **Before `$gsd-verify-work`:** Full approval suite and `cd backend && bun run build` must be green.
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | MODEL-01 | T-15-02 | Schema expresses approval aggregate and relations without orphan-prone gaps | schema/build | `cd backend && bun --env-file=../.env prisma generate && bun run build` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | MODEL-01 | T-15-02 | Migration creates process, node, application, task, action, and timeline tables | migration | `cd backend && bun --env-file=../.env prisma migrate dev --name add_approval_models` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 2 | MODEL-03 | T-15-01 | Illegal status transitions throw `BizError` and terminal states cannot leave terminal status | unit | `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | MODEL-02 | T-15-03 | Application creation stores `schemaSnapshot`, `processSnapshot`, template, applicant, and department snapshots | unit/integration | `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | MODEL-04 | T-15-05 | Submit and assignment append immutable `SUBMIT` and `ASSIGN` action/timeline rows | unit/integration | `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-03 | 03 | 2 | MODEL-03 | T-15-02 | Serial approval closes current task, creates next task, and terminal approval closes pending work | unit/integration | `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-04 | 03 | 2 | MODEL-03, MODEL-04 | T-15-02 | Reject/cancel close pending tasks, set terminal status, and append event records | unit/integration | `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-05 | 03 | 2 | MODEL-04 | T-15-05 | `EDIT`, `MARK`, and `COMMENT` append records with actor, action, node/comment/time fields | unit/integration | `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/approval/__tests__/state-machine.test.ts` — tests legal/illegal application transitions for MODEL-03.
- [ ] `backend/src/modules/approval/__tests__/application.service.test.ts` — tests snapshots, first task assignment, serial advancement, terminal closure, illegal operations, and immutable event append for MODEL-02/MODEL-04.
- [ ] `backend/src/modules/approval/state-machine.ts` — implementation target for transition tests.
- [ ] `backend/src/modules/approval/application.service.ts` — implementation target for transactional service tests.

---

## Manual-Only Verifications

All phase behaviors have automated verification, except the live database migration may require a configured local PostgreSQL connection from `.env`.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prisma migration applies to local PostgreSQL | MODEL-01 | Requires valid `DATABASE_URL` and running database | Run `cd backend && bun --env-file=../.env prisma migrate dev --name add_approval_models`; if DB is unavailable, verify generated migration SQL is present and run against the project DB before phase verification |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency < 30s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-25
