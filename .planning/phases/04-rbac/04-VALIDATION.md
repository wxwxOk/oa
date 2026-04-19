---
phase: 4
slug: rbac
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 无自动化测试框架（D-17 锁定不引入 Playwright / 集成测试） |
| **Config file** | N/A |
| **Quick run command** | `curl -s -o /dev/null -w "%{time_total}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/roles` |
| **Full suite command** | UAT 清单人工执行（04-05-PLAN.md） |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** 手动 curl 验证对应 API 行为
- **After every plan wave:** 执行该 wave 涉及的 UAT 子集
- **Before `/gsd-verify-work`:** 全部 UAT-1/2/5 人工执行
- **Max feedback latency:** N/A (manual verification)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Verification Method | Status |
|---------|------|------|-------------|------------|-----------------|-----------|---------------------|--------|
| 04-01-01 | 01 | 1 | FR-4.1 | T-04-01 | ADMIN 角色不可删除 | manual curl | `DELETE /api/v1/roles/{adminId}` → 400 | ⬜ pending |
| 04-01-02 | 01 | 1 | FR-4.1 | T-04-02 | 挂载用户角色不可删除 | manual curl | `DELETE /api/v1/roles/{id}` (有用户) → 400 | ⬜ pending |
| 04-01-03 | 01 | 1 | FR-4.3 | T-04-03 | ADMIN 权限不能清空 | manual curl | `PUT /api/v1/roles/{adminId}/permissions` body `[]` → 400 | ⬜ pending |
| 04-01-04 | 01 | 1 | FR-4.1 | — | 角色列表返回 userCount | manual curl | `GET /api/v1/roles` 响应含 `userCount` 字段 | ⬜ pending |
| 04-02-01 | 02 | 2 | FR-4.1 | — | RolePage ADMIN 删除按钮禁用 | manual browser | ADMIN 行删除按钮 disabled + tooltip | ⬜ pending |
| 04-02-02 | 02 | 2 | FR-4.3 | — | 保存权限按钮 ADMIN 空分配禁用 | manual browser | 选中 ADMIN + 清空权限 → 保存按钮 disabled | ⬜ pending |
| 04-02-03 | 02 | 2 | FR-4.1 | — | 成员数展示 | manual browser | 角色列表每行显示"成员: N" | ⬜ pending |
| 04-03-01 | 03 | 2 | FR-5.1 | — | 权限刷新 60s 防抖 | manual browser | 连续切换路由 < 60s 不重复请求 /auth/profile | ⬜ pending |
| 04-03-02 | 03 | 2 | FR-5.2 | — | 失权限跳 403 | manual browser | 撤权后切换路由 → 跳转 /403 + Notify | ⬜ pending |
| 04-04-01 | 04 | 3 | FR-5.3 | — | v-perm 按钮显隐一致性 | manual browser | 无 `user:create` 权限 → "新建用户"按钮不可见 | ⬜ pending |
| 04-04-02 | 04 | 3 | FR-2.4 | — | UserPage 角色选择器验证 | manual browser | 新建/编辑用户可多选角色 | ⬜ pending |
| 04-05-01 | 05 | 4 | UAT-1 | — | admin 看全菜单 | manual UAT | 侧边栏 4 项菜单全部可见 | ⬜ pending |
| 04-05-02 | 05 | 4 | UAT-2 | — | 普通用户限菜单 | manual UAT | 仅有权限的菜单可见 | ⬜ pending |
| 04-05-03 | 05 | 4 | UAT-5 | — | 撤权后按钮消失 | manual UAT | 撤 `user:create` → 按钮消失 | ⬜ pending |
| 04-05-04 | 05 | 4 | NFR-1 | — | p95 < 500ms | manual curl | 10 次 curl 取 p95 < 500ms | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. D-17 锁定不引入自动化测试框架。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ADMIN 角色删除保护 | FR-4.1 | D-17 不引入集成测试 | curl DELETE → 验证 400 响应 |
| 权限刷新 60s 防抖 | FR-5.1 | 需要浏览器时序观察 | DevTools Network 面板观察 /auth/profile 请求间隔 |
| 失权限重定向 | FR-5.2 | 需要多用户交互 | admin 撤权 → 目标用户切换路由 → 观察 403 |
| v-perm 按钮显隐 | FR-5.3 | 需要 DOM 观察 | 撤权后刷新页面 → 检查按钮是否消失 |
| p95 响应时间 | NFR-1 | 需要多次采样 | 10 次 curl 取排序后第 9 个值 |

---

## Validation Sign-Off

- [ ] All tasks have manual verification method defined
- [ ] Sampling continuity: UAT 清单覆盖所有 FR/NFR
- [ ] Wave 0: N/A (no automated test framework per D-17)
- [ ] No watch-mode flags
- [ ] Feedback latency: manual (acceptable per D-17)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
