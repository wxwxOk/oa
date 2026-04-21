---
phase: 10
slug: schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 0.34.6 + @vue/test-utils 2.4.6 (frontend) / Bun test (backend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run && cd ../backend && bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run && cd ../backend && bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SCHEMA-01 | unit | `cd frontend && npx vitest run src/types/__tests__/schema.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SCHEMA-01 | unit | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | D-06 | component | `cd frontend && npx vitest run src/components/renderer/__tests__/GridFormRenderer.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | D-07 | component | `cd frontend && npx vitest run src/components/renderer/__tests__/FieldRenderer.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | SCHEMA-02 | unit | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | SCHEMA-03 | component | `cd frontend && npx vitest run src/components/submission/__tests__/SubmissionDetail.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/types/__tests__/schema.test.ts` — schema 类型 + helper 函数测试
- [ ] `frontend/src/components/renderer/__tests__/GridFormRenderer.test.ts` — 三模式渲染测试
- [ ] `frontend/src/components/renderer/__tests__/FieldRenderer.test.ts` — 7 字段类型 x 3 模式
- [ ] `backend/src/modules/template/__tests__/schema.validation.test.ts` — TypeBox 校验测试
- [ ] `frontend/src/components/submission/__tests__/SubmissionDetail.test.ts` — 旧数据 fallback

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSS Grid 视觉布局正确 | SCHEMA-01 | 需要视觉验证栅格对齐 | 打开设计器，添加多个字段设置不同 colSpan，验证布局 |
| Designer 模式字段选中高亮 | D-06 | 需要交互验证 | 点击字段，验证蓝色边框出现 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
