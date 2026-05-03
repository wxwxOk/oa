# Phase 27: 报销导出 + 验证收尾 - Discussion Log

**Date:** 2026-05-03
**Mode:** auto
**Command:** `/gsd-discuss-phase 27 --auto`

## Inputs Reviewed

- `.planning/ROADMAP.md` — Phase 27 goal, success criteria and v1.4 coverage table.
- `.planning/REQUIREMENTS.md` — `EXPORT-01` through `EXPORT-03`, `PERM-01`, `PERM-02`, `UX-02` and UAT checklist.
- `.planning/STATE.md` — Phase 26 complete, Phase 27 ready and prior v1.4 decisions.
- `.planning/phases/24-api/24-CONTEXT.md` — fixed reimbursement backend model, permissions and attachment scope.
- `.planning/phases/25-reimbursement-ui/25-CONTEXT.md` — fixed `/reimbursements` frontend route/store/list/detail decisions.
- `.planning/phases/26-reimbursement-review-signature/26-CONTEXT.md` — two-level review, signatures and export deferred to Phase 27.
- `.planning/phases/19-post-collection-processing-archive-export-stats/*` — existing ExcelJS export and permission-gated export patterns.
- Reimbursement and archive source files listed in `27-CONTEXT.md` canonical refs.

## Phase Boundary Confirmed

Phase 27 delivers reimbursement detail Excel export and v1.4 closeout validation only. It does not add statistics dashboards, payment/accounting integration, OCR, invoice verification, duplicate detection or complex workflow.

## Auto-Selected Gray Areas

| Area | Auto Selection | Rationale |
|------|----------------|-----------|
| Export scope | Export all rows matching current list filters, not just current page | Matches `EXPORT-01` and existing archive export behavior. |
| Permission boundary | Backend `reimbursement:export` is authoritative; frontend button is only visibility | Matches `PERM-02` and Phase 24 permission decisions. |
| Excel content | Fixed detail columns with review results derived from `ReimbursementAction` | Matches `EXPORT-02` without adding client-controlled fields. |
| Excel toolchain | Server-side ExcelJS, 2,000-row cap, formula injection sanitization | Reuses Phase 19 export safety and avoids new dependencies. |
| Frontend UX | Permission-gated list toolbar export button using authenticated blob download | Reuses existing Pinia/object URL patterns and keeps `/reimbursements` as the host page. |
| Validation closeout | Focused backend/frontend suites, builds, UAT and requirement coverage archive | Matches v1.4 closeout success criteria. |

## Decisions Captured

The locked decisions were written to `27-CONTEXT.md` as D-01 through D-20. Downstream planning must treat those as the source of truth.

## Deferred Ideas

- Reimbursement statistics dashboard and chart analysis.
- Payment/accounting integration and voucher generation.
- OCR, invoice verification, duplicate detection and amount recognition.
- Amount-based branching, countersignature, delegation and timeout escalation.
- Visit data Excel export.

## Next Step

Auto mode advances to planning for Phase 27 using this discussion output and `27-CONTEXT.md`.
