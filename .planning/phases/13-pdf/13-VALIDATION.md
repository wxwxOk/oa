---
phase: 13
slug: pdf
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + happy-dom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/composables/__tests__/usePdfExport.test.ts` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/composables/__tests__/usePdfExport.test.ts`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | PDF-01 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "table conversion"` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | PDF-01 | — | N/A | manual-only | 目视检查 PDF 边框/对齐 | N/A | ⬜ pending |
| 13-02-01 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "breakpoints"` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "findBestBreak"` | ❌ W0 | ⬜ pending |
| 13-02-03 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "pageSlices"` | ❌ W0 | ⬜ pending |
| 13-02-04 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "fallback"` | ❌ W0 | ⬜ pending |
| 13-02-05 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "tableHeader"` | ❌ W0 | ⬜ pending |
| 13-02-06 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "headerFooter"` | ❌ W0 | ⬜ pending |
| 13-02-07 | 02 | 1 | PDF-02 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "group break"` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 1 | PDF-03 | — | N/A | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "font-family"` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 1 | PDF-03 | — | N/A | manual-only | 导出含中文的 PDF，目视检查 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/composables/__tests__/usePdfExport.test.ts` — 覆盖 PDF-01a, PDF-02a~PDF-02g, PDF-03a
- [ ] 测试 fixtures：预定义的 BreakCandidate[] 数组（模拟不同表单布局的元素坐标）
- [ ] jsPDF mock factory：可复用的 jsPDF 实例 mock（记录 addImage/addPage/text 调用）
- [ ] html2canvas mock factory：返回指定尺寸 canvas 的 mock 函数

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| print 模式 CSS 样式：边框 1px #000、padding 8px、分组背景 #f5f5f5 | PDF-01 | 视觉渲染效果无法自动化验证 | 导出 PDF，目视检查边框/间距/背景色 |
| 字段对齐：不同 colSpan 组合在 PDF 中列宽正确 | PDF-01 | 像素级对齐需人工判断 | 导出含多种 colSpan 组合的测试表单 PDF，目视对比 |
| 中文字符在 PDF 中无乱码 | PDF-03 | 字体渲染效果需人工确认 | 导出含中文标签+中文值的表单 PDF，目视检查 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
