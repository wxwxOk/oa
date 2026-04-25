---
phase: 16
slug: process-config-template-binding
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun built-in test runner (`bun:test`) for backend; Quasar/Vite build for frontend |
| **Config file** | none dedicated — tests run by path |
| **Quick run command** | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` |
| **Full suite command** | `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts src/modules/template/__tests__/template.approval-mode.test.ts src/modules/template/__tests__/schema.validation.test.ts && bun run build && cd ../frontend && bun run build` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every backend service/task commit:** Run the closest changed-module `bun test` command listed below.
- **After every frontend task commit:** Run `cd frontend && bun run build`.
- **After every plan wave:** Run the full suite command.
- **Before `$gsd-verify-work`:** Full backend/template tests, backend build, and frontend build must be green or explicitly blocked by database availability.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-W0-01 | 01 | 0 | CFG-02/CFG-03/CFG-04 | T16-02/T16-03/T16-04 | Invalid approver sources cannot be saved or resolved | unit | `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts` | ❌ W0 | ⬜ pending |
| 16-W0-02 | 02 | 0 | CFG-01/DYN-02 | T16-01 | Template mode binding preserves public collection and schema version rules | integration | `cd backend && bun test src/modules/template/__tests__/template.approval-mode.test.ts` | ❌ W0 | ⬜ pending |
| 16-W0-03 | 03 | 0 | DYN-01 | T16-05 | Required form data cannot bypass frontend validation through API calls | unit | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` | ✅ | ⬜ pending |
| 16-W0-04 | 04 | 0 | CFG-05 | T16-06 | Approval permission codes are seeded and assigned as intended | unit | `cd backend && bun test src/modules/role/__tests__/approval-permissions.seed.test.ts` | ❌ W0 | ⬜ pending |
| 16-FE-01 | 05 | 1 | CFG-01/CFG-02/CFG-03/CFG-04/CFG-05/DYN-01 | T16-01/T16-06 | Permission-gated admin UI exposes only valid controls | build/manual | `cd frontend && bun run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/approval/__tests__/process-config.service.test.ts` — stubs for process validation and approver resolution.
- [ ] `backend/src/modules/template/__tests__/template.approval-mode.test.ts` — stubs for template mode/binding/share-link/schema-version regressions.
- [ ] `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts` — stubs for approval RBAC seed coverage.
- [ ] Update `backend/src/modules/template/__tests__/schema.validation.test.ts` with required form-data value cases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approval process configuration page responsive behavior | CFG-02, CFG-03, CFG-05 | No UI test runner configured | Log in as admin, open approval process page on desktop and mobile widths, create single-node and serial processes, verify buttons are permission gated. |
| Template designer binding controls | CFG-01, DYN-02 | No UI test runner configured | Open a template designer, switch between `COLLECTION_ONLY` and `APPROVAL_REQUIRED`, bind a process, publish, and confirm schema version only changes for schema edits. |
| Department default approver UI | CFG-04 | No UI test runner configured | Create/edit a department, select a default approver, reload the tree, and confirm the approver name remains visible. |
| Public collection non-regression | CFG-01 | Requires running app/browser | Open an existing collection-only public share link and submit a valid form; verify a `Submission` is created and no approval route is required. |

---

## Validation Sign-Off

- [x] All planned behavior has an automated verify command or a Wave 0 test-file requirement.
- [x] Sampling continuity: no 3 consecutive backend tasks without automated verification.
- [x] Wave 0 covers missing process/template/RBAC tests.
- [x] No watch-mode flags.
- [x] Feedback latency target is under 120 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
