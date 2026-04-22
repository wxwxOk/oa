---
phase: 14
slug: responsive-fill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 0.34.6 + happy-dom |
| **Config file** | frontend/vitest.config.ts |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | RENDER-01 | manual | Visual inspection: PC grid layout at 960px | N/A | ⬜ pending |
| 14-01-02 | 01 | 1 | RENDER-02 | unit+manual | `npx vitest run` + visual inspection mobile | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | RENDER-02 | unit | `npx vitest run src/components/renderer/__tests__/DynamicTableFill.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | RENDER-02 | manual | Mobile card expand/collapse + delete + add row | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/renderer/__tests__/DynamicTableFill.test.ts` — stubs for mobile card rendering, expand/collapse, add/delete row in card mode
- [ ] Responsive grid CSS behavior is primarily visual — unit tests verify component renders correct structure

*Existing vitest infrastructure covers framework needs. No new test dependencies required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PC grid layout matches designer preview | RENDER-01 | Visual layout fidelity requires browser rendering | Open fill page on 1024px+ viewport, verify multi-column fields align with designer |
| Mobile single-column layout | RENDER-02 | CSS media query visual verification | Resize browser to < 1024px, verify all fields stack single-column |
| Touch target 44px min-height | RENDER-02 | Physical dimension requires DevTools measurement | DevTools > inspect input > verify computed min-height >= 44px |
| Sticky submit button | RENDER-02 | Scroll behavior requires browser interaction | Scroll long form on mobile viewport, verify submit button stays visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
