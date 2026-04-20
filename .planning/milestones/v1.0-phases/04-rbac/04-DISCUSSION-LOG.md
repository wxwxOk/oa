# Phase 4: RBAC - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 04-rbac
**Areas discussed:** ADMIN 锁死防护, 角色删除约束, 权限变更生效, Plans 拆分约

---

## ADMIN 锁死防护

| Option | Description | Selected |
|--------|-------------|----------|
| 禁止删除 + 禁止清空权限 | 删除和清空权限都是锁死途径；一次做全 | ✓ |
| 仅禁止删除 | 删除即锁死，权限允许改（保留运营灵活性） | |
| 仅锁定 code 与删除 | ADMIN 不能被删/改 code，但可改名称/描述/权限 | |

**用户的选择：** 禁止删除 + 禁止清空权限

| Option | Description | Selected |
|--------|-------------|----------|
| 前+后端双保险 | 前端禁用按钮 + 后端返回 400/403；绕过 UI 也安全 | ✓ |
| 仅前端禁用 | 前端禁用按钮，后端不变；简单但可被 curl 绕过 | |
| 仅后端拒绝 | 后端拒绝，前端按钮展示但点击报错；体验差 | |

**用户的选择：** 前+后端双保险

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码 role.code === 'ADMIN' | seed 已写死 code='ADMIN'，文档化语义 | ✓ |
| 添加 role.isSystem 字段 | schema 加字段标记 seed 内置角色；更可扩展 | |

**用户的选择：** 硬编码 role.code === 'ADMIN'

| Option | Description | Selected |
|--------|-------------|----------|
| 仅保护 ADMIN | EMPLOYEE 是普通角色，自由删改 | ✓ |
| 同时禁止删 EMPLOYEE | EMPLOYEE 也禁止删（但允许改权限） | |
| 保护所有内置角色 | 需加 isSystem 字段（跨优 Q3） | |

**用户的选择：** 仅保护 ADMIN

| Option | Description | Selected |
|--------|-------------|----------|
| 完全锁定权限 | ADMIN 权限完全不可改；需改 seed + 重部署 | |
| 允许增减但非空 | 允许增减但 permissionIds=[] 被拒绝 | ✓ |

**用户的选择：** 允许增减但非空

**Notes:** 保护粒度落在"永不可删 + 禁止清空权限"。实施层前后端双保险。识别依据是 `role.code === 'ADMIN'` 硬编码，未加 schema 字段。EMPLOYEE 及用户自建角色完全自由。

---

## 角色删除约束

| Option | Description | Selected |
|--------|-------------|----------|
| 有用户挂载时拒绝删除 | 对齐 Phase 3 部门删除模式 | ✓ |
| 确认影响 N 用户后 cascade | 前端弹窗展示 N 后同意 cascade | |
| 保持现状 cascade | onDelete:Cascade 直接清 UserRole | |

**用户的选择：** 有用户挂载时拒绝删除

| Option | Description | Selected |
|--------|-------------|----------|
| 列表显示挂载人数 + 按钮禁用 | userCount 字段 + 前端 tooltip 禁用 | ✓ |
| 仅后端拒绝 + Notify 提示 | 不在列表展示，点了才知道 | |
| 确认弹中显示挂载数 | 列表简化，弹窗中拉人数 | |

**用户的选择：** 列表显示挂载人数 + 按钮禁用

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN 保护优先 | ADMIN 且被挂载时报"系统角色不可删除" | ✓ |
| 合并一视同仁 | 统一拒绝消息，需分支 | |

**用户的选择：** ADMIN 保护优先

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现站确认弹窗 | 沿用 Quasar Dialog.create "此操作不可恢复" | ✓ |
| 引入输入 code 确认 | 必须输 code 才能删；过度谨慎 | |
| 去确认弹窗 | 后端已有保护，前端省流程；太激进 | |

**用户的选择：** 保留现站确认弹窗

**Notes:** 角色删除约束对齐 Phase 3 部门删除模式。列表暴露挂载人数，按钮禁用阻止误删。拒绝消息分级：ADMIN 优先于挂载检查。

---

## 权限变更生效

| Option | Description | Selected |
|--------|-------------|----------|
| 路由切换时刷新 | Router.beforeEach 调 /auth/profile | ✓ |
| 仅重登生效 | 最简但需引导文案 | |
| 仅登录 + 手动刷新 | 顶栏加"刷新权限"按钮 | |
| 路由 + 手动双措施 | 双保险 | |

**用户的选择：** 路由切换时刷新

| Option | Description | Selected |
|--------|-------------|----------|
| 每次跳路由都拉 | 最实时但请求量大 | |
| 防抖 60 秒 | 60s 内不重拉；平衡点 | ✓ |
| 防抖 5 分钟 | 最省请求但 UAT 验证需等 | |

**用户的选择：** 防抖 60 秒

| Option | Description | Selected |
|--------|-------------|----------|
| Notify 提示 + 重定向 | 友好告知用户权限已变 | ✓ |
| 静默更新 | 下次跳路由才触发重定向 | |
| 跳登出 | 最严谨但体验差 | |

**用户的选择：** Notify 提示 + 重定向

| Option | Description | Selected |
|--------|-------------|----------|
| 401 + axios 拦截 logout | 已在 axios.ts 立项 | |
| 已有活体处理 | 复用已有 refresh/logout 机制 | ✓ |
| 进一步深入取消/禁用场景 | 深挖其他边缘情况 | |

**用户的选择：** 已有活体处理

**Notes:** 主策略路由切换拉 /auth/profile，60s 防抖。失权限时 Notify + 重定向 /403。用户禁用沿用 axios 拦截器标准流程。

---

## Plans 拆分约

| Option | Description | Selected |
|--------|-------------|----------|
| 拆 4–5 plans | 对齐 Phase 3 粒度 | ✓ |
| 拆 3 plans | 合并前端工作 | |
| 拆 2 plans | 全栈 + E2E | |

**用户的选择：** 拆 4–5 plans

| Option | Description | Selected |
|--------|-------------|----------|
| 手动 E2E (Phase 3 风格) | UAT 清单人工跑 | ✓ |
| API 集成测试 | bun test + API 调用 | |
| Playwright 浏览器自动化 | 最完整但重度依赖 | |
| 无独立 E2E | 各 plan 自带验证步骤 | |

**用户的选择：** 手动 E2E (Phase 3 风格)

| Option | Description | Selected |
|--------|-------------|----------|
| 后端 1 + 前端 3 + E2E | 后端改动少影响面广；前端 3 个聚焦点 | ✓ |
| 后端 1 + 前端 4 + E2E | 前端分更细 | |
| 后端 2 + 前端 2 + E2E | 后端拆 ADMIN 保护/角色删除 | |

**用户的选择：** 后端 1 + 前端 3 + E2E

| Option | Description | Selected |
|--------|-------------|----------|
| Plan 4 = 收尾补全 | 菜单/角色选择器/v-perm 一致性验证 | ✓ |
| 合并到 Plan 3 | 路由守卫 + 收尾一起做 | |
| 加 Plan 5 UX 细化 | 专做全选/未保存提示等 | |

**用户的选择：** Plan 4 = 收尾补全

**Notes:** 5 plans 对齐 Phase 3 粒度，最后一个是人工 UAT 清单。Plan 结构：后端保护 / RolePage 补全 / 路由守卫 + 权限刷新 / 收尾补全 / E2E。

---

## Claude's Discretion

- `authStore.maybeRefreshProfile()` 的具体实现（lastProfileFetch 存 localStorage 还是 Pinia 内存、并发去重）
- 前端按钮禁用 tooltip 的具体文案
- RolePage 挂载人数的展示样式
- 后端错误响应字段与 HTTP 状态码映射（400 vs 409）
- UAT 清单步骤措辞和验证粒度
- 403 页样式微调

## Deferred Ideas

- Playwright / API 集成测试基础设施（超出 v1.0）
- 权限分配 UX 细化：全选模块 / 清空 / 未保存提示 / 变更 diff
- `role.isSystem` 字段（未来内置角色超 1 个再加）
- 权限码运行时 CRUD
- 数据权限（FR-4.2 明确不做）
- `/auth/refresh` 未校验 `status=DISABLED` 的潜在问题
- 菜单数据源去重（`MainLayout.allMenus` 与 `routes.ts` 重复）
- WebSocket / SSE 权限"立即推送"
