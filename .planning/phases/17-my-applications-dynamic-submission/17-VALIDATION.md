---
phase: 17
slug: my-applications-dynamic-submission
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | Bun test (`bun:test`) |
| **Frontend framework** | Vitest for TS/component helpers where practical |
| **Backend quick run command** | `cd backend && bun test src/modules/approval src/modules/template` |
| **Frontend quick run command** | `cd frontend && bun test --run src/stores src/components src/types` |
| **Full suite command** | `cd backend && bun test && cd ../frontend && bun test --run` |
| **Manual UI smoke** | PC + mobile browser checks for application list, form, detail, and cancel flow |
| **Estimated runtime** | backend focused tests under 60s; full suite depends on local install state |

---

## Sampling Rate

- **After backend API/service task commits:** Run `cd backend && bun test src/modules/approval src/modules/template`.
- **After frontend store/page task commits:** Run focused frontend tests if added; otherwise run `cd frontend && bun test --run src/types src/components`.
- **After each wave:** Run backend focused tests plus frontend type/test command selected by the plan.
- **Before verification:** Full backend tests and frontend build/test command must be green, or documented as blocked by missing local dependencies.
- **Manual smoke required:** 375px mobile and desktop viewport checks for the employee application workflow.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | APP-01/APP-02 | T-17-01/T-17-03 | Authenticated draft creation derives snapshots server-side and creates no tasks | backend unit/route | `cd backend && bun test src/modules/approval` | required | pending |
| 17-01-02 | 01 | 1 | APP-01/APP-02 | T-17-02/T-17-04 | Submit enforces required fields and creates exactly one first pending task | backend unit/route | `cd backend && bun test src/modules/approval src/modules/template` | required | pending |
| 17-02-01 | 02 | 1 | APP-03/APP-04 | T-17-01 | Own list/detail prevents IDOR and serializes snapshot/timeline data | backend unit/route | `cd backend && bun test src/modules/approval` | required | pending |
| 17-02-02 | 02 | 1 | APP-05 | T-17-06 | Cancel only allows applicant + non-terminal status and closes pending tasks | backend unit/route | `cd backend && bun test src/modules/approval` | required | pending |
| 17-03-01 | 03 | 2 | APP-01/APP-03 | T-17-01 | Frontend store and routes call authenticated endpoints and permission-gate navigation | frontend unit/type | `cd frontend && bun test --run src/stores src/router src/types` | optional if no harness | pending |
| 17-04-01 | 04 | 2 | APP-01/APP-02 | T-17-04 | Form page permits incomplete draft but blocks invalid formal submit | frontend/manual | frontend test/build plus manual smoke | required manual | pending |
| 17-04-02 | 04 | 2 | APP-03/APP-04 | T-17-01 | List/detail render own applications, status filters, snapshot form and timeline | frontend/manual | frontend test/build plus manual smoke | required manual | pending |
| 17-04-03 | 04 | 2 | APP-05 | T-17-06 | Cancel confirmation hides on terminal/draft states and prevents duplicate requests | frontend/manual | frontend test/build plus manual smoke | required manual | pending |

---

## Threat References

| Threat | Description | Blocking Severity |
|--------|-------------|-------------------|
| T-17-01 | IDOR: user accesses another applicant's application by ID | high |
| T-17-02 | Client bypasses required fields by direct submit API | high |
| T-17-03 | Draft save accidentally creates approval tasks/timeline | medium |
| T-17-04 | Client supplies forged schema/process snapshots | high |
| T-17-05 | Public route exposure leaks internal approval APIs without JWT | high |
| T-17-06 | Duplicate submit/cancel creates duplicate tasks/events or invalid transitions | high |

---

## Wave 0 Requirements

- [ ] Backend plans must add focused tests before or alongside approval application API/service changes.
- [ ] Frontend plans must add status mapping helper tests or document why existing test harness cannot mount Quasar pages.
- [ ] Manual UI smoke checklist must be included in frontend plan verification if automated E2E is unavailable.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile sticky save/submit action does not cover dynamic table/signature fields | APP-01/APP-02 | Existing repo has no browser E2E harness for Quasar pages | Use 375px viewport, open application form, scroll long schema, verify bottom actions remain usable and content is not hidden |
| Detail layout shows form snapshot and timeline without overlap | APP-04 | Visual hierarchy and responsive layout require browser inspection | Check desktop and mobile detail pages with long field values, dynamic table, signature, and multiple timeline events |
| Cancel confirmation copy and button visibility | APP-05 | Requires end-to-end state setup | Verify draft has no cancel button, approving record can cancel, terminal records cannot cancel |

---

## Validation Sign-Off

- [ ] All backend security threats have automated or service-level tests.
- [ ] Draft, submit, list/detail and cancel flows are verified independently.
- [ ] No three consecutive implementation tasks lack an automated verify command.
- [ ] Manual responsive smoke covers 375px mobile and desktop.
- [ ] `nyquist_compliant: true` remains set in frontmatter.

**Approval:** pending
