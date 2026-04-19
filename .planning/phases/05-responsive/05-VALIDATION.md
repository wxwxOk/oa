---
phase: 5
slug: responsive
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 安装) |
| **Config file** | `frontend/vitest.config.ts` (Wave 0 创建) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | FR-6.1, FR-6.2 | — | N/A | unit | `npx vitest run tests/composables/useResponsive.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | D-08 | — | N/A | unit | `npx vitest run tests/boot/dark-mode.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 0 | FR-6.3 | — | N/A | unit | `npx vitest run tests/pages/UserPage.test.ts -t "mobile card"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | D-09 | — | N/A | lint/grep | `grep -rn "bg-white\|bg-grey\|text-grey[^-]" frontend/src/ --include="*.vue"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest @vue/test-utils @vitejs/plugin-vue jsdom` — 安装测试框架
- [ ] `frontend/vitest.config.ts` — 配置 jsdom 环境 + Quasar 插件
- [ ] `frontend/tests/composables/useResponsive.test.ts` — 覆盖 FR-6.1, FR-6.2
- [ ] `frontend/tests/boot/dark-mode.test.ts` — 覆盖 D-08
- [ ] `frontend/tests/pages/UserPage.test.ts` — 覆盖 FR-6.3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard stats 接口 < 500ms | NFR-1 | 需要运行后端 + 数据库 | 启动 docker 环境，调用 GET /dashboard/stats，检查响应时间 |
| 移动端布局视觉正确性 | FR-6.2 | 需要浏览器 DevTools 验证 | Chrome DevTools 切换 375px 宽度，检查底部 Tab + overlay Drawer |
| 暗色模式无白块 | D-10 | 需要视觉检查 | 切换暗色模式，逐页检查无硬编码白色背景 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
