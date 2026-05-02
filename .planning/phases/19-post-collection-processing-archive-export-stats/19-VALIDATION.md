---
phase: 19
slug: post-collection-processing-archive-export-stats
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 19 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Bun test; Frontend: Vitest `0.34.6` with `happy-dom` |
| **Config file** | Frontend: `frontend/vitest.config.ts`; Backend: none, Bun built-in runner |
| **Quick run command** | `cd backend && bun test src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/notification.service.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalArchive.test.ts src/stores/__tests__/notification.test.ts src/types/__tests__/approvalArchive.test.ts` |
| **Full suite command** | `cd backend && bun test && bun run build && cd ../frontend && npm test && npm run build` |
| **Estimated runtime** | Quick: ~60s after Wave 0; full: project-dependent |

---

## Sampling Rate

- **After every task commit:** Run the focused backend tests for the touched service/route plus the matching frontend store/type tests.
- **After every plan wave:** Run all new Phase 19 backend tests, all new Phase 19 frontend tests, and approval regression tests around application/task services.
- **Before `$gsd-verify-work`:** Full backend/frontend test and build pass must be green.
- **Max feedback latency:** 120 seconds for focused checks after Wave 0.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-00-01 | 00 | 0 | OPS-01 | T-19-IDOR / T-19-AUDIT | Tags/marks add/remove/filter by source under permissions with audit events | backend service/route | `cd backend && bun test src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/archive.route.test.ts` | No - Wave 0 creates | pending |
| 19-00-02 | 00 | 0 | OPS-02 | T-19-TAMPER / T-19-AUDIT | Controlled edit requires reason, rejects no-op/unauthorized edits, records field before/after | backend service | `cd backend && bun test src/modules/approval/__tests__/archive.service.test.ts` | No - Wave 0 creates | pending |
| 19-00-03 | 00 | 0 | OPS-03 | T-19-DATA-SEPARATION | Processing field config and values stay separate from formal submitted data | backend service + frontend type | `cd backend && bun test src/modules/approval/__tests__/archive.service.test.ts && cd ../frontend && npm test -- src/types/__tests__/approvalArchive.test.ts` | No - Wave 0 creates | pending |
| 19-00-04 | 00 | 0 | OPS-04 | T-19-IDOR | Archive list/detail filters template, department, person, status, date, tag and source under permissions | backend route + frontend store | `cd backend && bun test src/modules/approval/__tests__/archive.route.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalArchive.test.ts` | No - Wave 0 creates | pending |
| 19-00-05 | 00 | 0 | OPS-05 | T-19-CSV-INJECTION / T-19-EXPORT-DOS | Excel export reuses filters/permissions, sanitizes cells, caps rows; PDF detail reuses print path | backend export + frontend page | `cd backend && bun test src/modules/approval/__tests__/archive-export.test.ts && cd ../frontend && npm test -- src/pages/__tests__/ApprovalArchiveDetailPage.test.ts` | No - Wave 0 creates | pending |
| 19-00-06 | 00 | 0 | OPS-06 | T-19-IDOR | Stats exclude drafts and aggregate by template/status/department/month/source type under permissions | backend stats + frontend store | `cd backend && bun test src/modules/approval/__tests__/archive-stats.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalArchive.test.ts` | No - Wave 0 creates | pending |
| 19-00-07 | 00 | 0 | OPS-07 | T-19-NOTIFICATION-LEAK | New task/pass/reject notifications are transaction-bound and unread count is user-scoped | backend service + frontend store/layout | `cd backend && bun test src/modules/approval/__tests__/notification.service.test.ts && cd ../frontend && npm test -- src/stores/__tests__/notification.test.ts src/layouts/__tests__/MainLayoutNotification.test.ts` | No - Wave 0 creates | pending |

---

## Wave 0 Requirements

- [ ] `backend/src/modules/approval/__tests__/archive.service.test.ts` - metadata model, permissions, tag/note/edit/processing-field service behavior.
- [ ] `backend/src/modules/approval/__tests__/archive.route.test.ts` - route prefix, body schemas, serialization and forbidden trusted fields.
- [ ] `backend/src/modules/approval/__tests__/archive-export.test.ts` - Excel columns, cell sanitization, row cap and permission reuse.
- [ ] `backend/src/modules/approval/__tests__/archive-stats.test.ts` - group counts, draft exclusion and collection status mapping.
- [ ] `backend/src/modules/approval/__tests__/notification.service.test.ts` - task/final-state notifications and unread count scope.
- [ ] `frontend/src/types/__tests__/approvalArchive.test.ts` - labels, source/status helpers and payload key guardrails.
- [ ] `frontend/src/stores/__tests__/approvalArchive.test.ts` - list/detail/actions/export endpoints and loading states.
- [ ] `frontend/src/stores/__tests__/notification.test.ts` - unread count/list/mark-read polling actions.
- [ ] `frontend/src/pages/__tests__/ApprovalArchiveDetailPage.test.ts` - full-page detail contract, print-area reuse and internal processing separation.
- [ ] `frontend/src/layouts/__tests__/MainLayoutNotification.test.ts` - unread badge contract and authenticated notification polling entry.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile archive detail readability with long forms, dynamic tables, tags, notes and processing fields | OPS-01, OPS-03, OPS-04, OPS-05 | Automated unit tests cannot fully verify narrow-screen composition and sticky/action overlap | Run the app at mobile viewport, open an archive detail containing long form data, dynamic table, signature, tags, notes and processing fields; verify no horizontal overflow and PDF/print action remains reachable. |
| Exported Excel usability in a spreadsheet app | OPS-05 | Automated tests can verify workbook structure, but visual usability and formula warning behavior need human spot check | Export a filtered archive list, open in Excel/WPS/LibreOffice, verify headers, Chinese text, sanitized formula-like values and processing field columns. |
| Notification unread count placement in navigation/header | OPS-07 | Exact badge placement is visual and depends on responsive layout | Trigger pending/approved/rejected notifications, verify unread count is visible on desktop and mobile and clears after mark-read. |

---

## Threat References

| Ref | Threat | Control |
|-----|--------|---------|
| T-19-IDOR | User accesses archive records outside department/all/submission permissions | Resolve source record server-side and apply source-specific scope before list/detail/action/export/stats. |
| T-19-TAMPER | Client over-posts trusted fields or edits submitted data without reason | TypeBox schemas accept only operation payloads; actor/source metadata come from JWT and DB; edit reason is mandatory. |
| T-19-AUDIT | Operational history is altered or omitted | Use append-only events for tag, note, mark, edit and collection-source audit equivalents. |
| T-19-CSV-INJECTION | Excel cells execute formulas when opened | Sanitize exported string cells that begin with `=`, `+`, `-`, `@`, tab or carriage return. |
| T-19-EXPORT-DOS | Unbounded export exhausts server memory | Enforce an MVP row cap of 2,000 rows unless planning explicitly changes it. |
| T-19-NOTIFICATION-LEAK | Users see other users' notifications or unread count | Notification list/count/mark-read queries must constrain `userId = currentUser.id`. |
| T-19-DATA-SEPARATION | Processing fields or corrections overwrite formal submitted data | Store processing values and correction overlays outside `ApprovalApplication.formData` and `Submission.data`. |

---

## Validation Sign-Off

- [x] All requirements OPS-01 through OPS-07 have automated verification targets or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks may proceed without focused automated verification after Wave 0.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency target is under 120 seconds for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-26
