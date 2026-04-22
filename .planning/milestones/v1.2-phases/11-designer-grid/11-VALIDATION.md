---
phase: 11
slug: designer-grid
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 0.34.6 + happy-dom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | DESIGN-01a | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 0 | DESIGN-01b | unit | `cd frontend && npx vitest run src/components/designer/__tests__/colSpanLogic.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 0 | DESIGN-01e | unit | `cd frontend && npx vitest run src/components/designer/__tests__/useColResize.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | DESIGN-01a | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | DESIGN-01c | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 1 | DESIGN-01d | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | DESIGN-04 | manual-only | Visual comparison | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/designer/__tests__/` directory — needs creation
- [ ] `frontend/src/components/designer/__tests__/DesignerCanvas.test.ts` — stubs for DESIGN-01a/c/d
- [ ] `frontend/src/components/designer/__tests__/colSpanLogic.test.ts` — stubs for DESIGN-01b (pure function tests for overflow compression)
- [ ] `frontend/src/components/designer/__tests__/useColResize.test.ts` — stubs for DESIGN-01e (composable unit test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas renders same grid layout as GridFormRenderer (WYSIWYG) | DESIGN-04 | Visual comparison — layout fidelity cannot be verified by unit tests | 1. Create template with 3+ rows, mixed colSpan fields. 2. Compare designer canvas layout with fill-mode preview. 3. Verify column alignment, spacing, and field widths match. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
