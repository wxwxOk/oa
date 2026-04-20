---
phase: 7
slug: template-designer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^0.34.6 + happy-dom (frontend) / manual integration (backend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && bun run test` |
| **Full suite command** | `cd frontend && bun run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && bun run test`
- **After every plan wave:** Run `cd frontend && bun run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | TMPL-01 | integration | Backend manual test | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | TMPL-02 | integration | Backend manual test | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | TMPL-03 | integration | Backend manual test | N/A | ⬜ pending |
| 07-01-04 | 01 | 1 | TMPL-04 | integration | Backend manual test | N/A | ⬜ pending |
| 07-01-05 | 01 | 1 | TMPL-05 | unit | Backend manual test | N/A | ⬜ pending |
| 07-02-01 | 02 | 1 | DSGN-01 | manual | Manual browser test (drag) | N/A | ⬜ pending |
| 07-02-02 | 02 | 1 | DSGN-02 | unit | `cd frontend && vitest run` | Wave 0 | ⬜ pending |
| 07-02-03 | 02 | 1 | DSGN-03 | manual | Manual browser test (canvas) | N/A | ⬜ pending |
| 07-02-04 | 02 | 1 | DSGN-04 | unit | `cd frontend && vitest run` | Wave 0 | ⬜ pending |
| 07-02-05 | 02 | 1 | DSGN-05 | manual | Manual browser test (visual) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/designer/__tests__/fieldRegistry.test.ts` — stubs for DSGN-02
- [ ] `frontend/src/stores/__tests__/template.test.ts` — stubs for template store logic
- [ ] Backend has no test framework — backend tests are manual/integration only (consistent with v1.0)

*Backend test infrastructure deferred — consistent with existing project approach.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-drop field add/sort | DSGN-01 | Requires real DOM drag events | 1. Open designer 2. Drag field from palette to canvas 3. Verify field appears 4. Drag to reorder 5. Verify order changes |
| Signature pad drawing | DSGN-03 | Canvas interaction requires real browser | 1. Add signature field 2. Draw on pad 3. Click clear 4. Verify pad clears |
| Real-time preview | DSGN-05 | Visual verification | 1. Add fields 2. Configure properties 3. Verify canvas reflects changes immediately |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
