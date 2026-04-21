---
phase: 12
slug: groups-tables
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (via @quasar/app-vite) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DESIGN-02, DESIGN-03 | unit | `cd frontend && npx vitest run src/types/__tests__/schema.test.ts -x` | Partial | ⬜ pending |
| 12-02-01 | 02 | 1 | DESIGN-02 | manual | Browser: drag group from palette, verify creation | N/A | ⬜ pending |
| 12-02-02 | 02 | 1 | DESIGN-03 | manual | Browser: drag dynamic table from palette, verify creation | N/A | ⬜ pending |
| 12-03-01 | 03 | 2 | RENDER-03 | unit | `cd frontend && npx vitest run src/components/renderer/__tests__/DynamicTableFill.test.ts -x` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | RENDER-03 | manual | Browser: fill page add/remove rows, submit, verify data | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/renderer/__tests__/DynamicTableFill.test.ts` — stubs for RENDER-03 row add/remove/data format
- [ ] Extend `frontend/src/types/__tests__/schema.test.ts` — group/table id generation tests

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Group drag from palette to canvas | DESIGN-02 | SortableJS drag requires real DOM | Drag "分组" from palette, verify group card appears with title bar |
| Dynamic table drag from palette | DESIGN-03 | SortableJS drag requires real DOM | Drag "动态表格" from palette, verify table card with 2 column preview |
| Cross-boundary field drag | DESIGN-02 | Nested SortableJS containers | Drag field into/out of group, verify field moves correctly |
| Fill page add/remove rows | RENDER-03 | Full page interaction | Open fill page, click "添加行", fill cells, delete row, submit |
| Print mode table rendering | RENDER-03 | Visual verification | View submission detail, verify native HTML table with borders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
