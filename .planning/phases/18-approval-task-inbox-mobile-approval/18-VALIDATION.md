---
phase: 18
slug: approval-task-inbox-mobile-approval
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Bun test; Frontend: Vitest with happy-dom |
| **Config file** | Frontend: `frontend/vitest.config.ts`; Backend: none, uses Bun built-in runner |
| **Quick run command** | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/task.route.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalTask.test.ts src/types/__tests__/approvalTask.test.ts` |
| **Full suite command** | `cd backend && bun test && bun run build && cd ../frontend && npm test && npm run build` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run focused backend/frontend tests for the changed approval task surface.
- **After every plan wave:** Run approval-module backend tests plus frontend approval task store/type tests.
- **Before `$gsd-verify-work`:** Full backend and frontend test/build suite must be green.
- **Max feedback latency:** 180 seconds for focused checks; full suite may exceed this at phase gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-W0-01 | 01 | 0 | APR-01 | IDOR-task-list | Current user only sees own approval tasks and filters are server-side | backend unit/integration | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/task.route.test.ts` | ❌ W0 | ⬜ pending |
| 18-W0-02 | 01 | 0 | APR-02 | IDOR-task-detail | Task detail requires assignee visibility and returns historical snapshots | backend route/type | `cd backend && bun test src/modules/approval/__tests__/task.route.test.ts` | ❌ W0 | ⬜ pending |
| 18-W0-03 | 02 | 0 | APR-03 | stale-task-action | Approve/reject re-check task status, assignee and comment constraints server-side | backend unit/route | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/task.route.test.ts` | ❌ W0 | ⬜ pending |
| 18-W0-04 | 01 | 0 | APR-04 | handled-history-misclassification | Handled history is task-based and distinguishes task outcome from application status | backend unit + frontend type | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts && cd ../frontend && npm test -- src/types/__tests__/approvalTask.test.ts` | ❌ W0 | ⬜ pending |
| 18-W0-05 | 03 | 0 | APR-05 | mobile-action-overlap | Sticky mobile actions do not obscure timeline, dynamic tables or signatures | manual UI + optional component | `cd frontend && npm test -- src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | ❌ W0 | ⬜ pending |
| 18-W0-06 | 02 | 0 | APR-06 | internal-remark-leak | Internal comments are visible to approvers but hidden from applicant own-detail | backend unit/route | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/approval/__tests__/task.service.test.ts` — assignee-only list/detail, approve/reject/comment boundary, handled-history classification.
- [ ] `backend/src/modules/approval/__tests__/task.route.test.ts` — route contract, body schema, permission boundary, serialization.
- [ ] `frontend/src/stores/__tests__/approvalTask.test.ts` — task store list/detail/action loading state and endpoint wiring.
- [ ] `frontend/src/types/__tests__/approvalTask.test.ts` — status labels/helpers, handled-state helpers, payload key guardrails.
- [ ] `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` — optional if the plan chooses automated coverage for mobile sticky layout behavior.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile sticky operation area does not cover long snapshot content | APR-05 | Layout overlap across dynamic tables/signatures is more reliable to verify in browser viewport than type/store tests | Run frontend, open an approval task detail at mobile width, scroll through long form/table/signature content, confirm approve/reject bar remains usable and never covers the final content or timeline. |
| Approval action confidence flow | APR-03, APR-05 | Requires visual review of destructive/confirm dialogs and accidental-tap prevention | On desktop and mobile, open a pending task, confirm approve and reject dialogs show application number/template/node, reject requires an opinion, and list-row quick approval is absent. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s for focused checks
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 is implemented

**Approval:** pending
