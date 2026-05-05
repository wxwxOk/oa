# Phase 33: 渠道商提交体验 + 我的推送 UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 33-渠道商提交体验 + 我的推送 UI
**Mode:** `--auto`（推荐默认，无交互问答）
**Areas discussed:** 路由与菜单守卫策略、单条提交表单形态、列表与重复提示展现、终态编辑/撤回与错误反馈、Pinia store 与类型骨架

---

## 路由与菜单守卫策略

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 `MainLayout.vue` + 新菜单 + 现有 `meta.permAny` 守卫 | 在 routes.ts 增加 4 条 `/channel-push/*` 子路由；`MainLayout.allMenus` 加一条权限 `permAny: ['channelPush:viewOwn','channelPush:create']`；员工路径已有 `meta.perm`，渠道商无权限码自动被 `Router.beforeEach` 拦截到 `/403` | ✓ |
| 为 `CHANNEL_PARTNER` 角色单独写一份 `PartnerLayout.vue` | 视觉/导航完全分离，但需要复制 header/dark/notification 等公共组件 | |
| 在 `Router.beforeEach` 增加角色黑名单（员工路径强制屏蔽 CHANNEL_PARTNER） | 双层防护，但破坏既有"权限码即权限"的 RBAC 单一来源 | |

**Selected:** Option 1（推荐默认）
**Notes:** PROJECT.md 行 195 已锁定"渠道商复用员工 PC/Mobile 布局 + RBAC 屏蔽其他菜单"。在权限码层面已经互斥，无需新增黑名单或独立 layout，最小侵入。

---

## 单条提交表单的形态

| Option | Description | Selected |
|--------|-------------|----------|
| 新建/编辑共用 `ChannelPushFormPage.vue`（参考 `ReimbursementFormPage.vue`），multipart 一次提交 + 编辑模式增量挂附件 | 与 v1.4 报销节奏一致；附件面板独立组件 `ChannelPushAttachmentPanel.vue` | ✓ |
| 新建走两步：先建空主记录 → 跳详情页追加字段/附件 | 让附件流程统一，但新建体验差（需要二段保存） | |
| 新建/编辑分两个独立页面 | 字段集合相同，分页面会重复 60% 模板代码 | |

**Selected:** Option 1
**Notes:** 后端 `POST /channel-push` 已经接受 multipart `payload + attachments` 一步完成；编辑场景下 PATCH 无附件、附件走独立 endpoint，是最小契约成本。`ReimbursementFormPage` 已有"先建草稿后挂附件"模式，可以平移；签字部分不需要。

---

## 列表与重复提示的展现

| Option | Description | Selected |
|--------|-------------|----------|
| PC 横向 filter-bar + 桌面 q-table；Mobile q-card + FilterSheet 抽屉；重复提示先 dialog 后 banner | 与 v1.4 报销列表骨架完全对齐；DEDUP-02 要求"明确标出冲突条目"用 dialog 表格能完整呈现 | ✓ |
| 顶部 chip 切换 status tabs 替代下拉筛选 | 视觉层级更突出，但与现有报销/到访不同步 | |
| 重复提示仅一次性 toast，不弹 dialog | 信息密度太低，违反 DEDUP-02 | |
| 列表行内嵌"重复"标记 | 后端目前不返回历史推送的"是否被重复"标识，需要额外查询 | |

**Selected:** Option 1
**Notes:** 用 dialog 一次性展示冲突条目（学员姓名/手机号/状态/提交时间），同时在详情页用 banner 持久提示。后端 `duplicateHints[]` 只在创建/编辑响应中返回，没必要列表二次查询。

---

## 终态编辑/撤回 / 错误反馈

| Option | Description | Selected |
|--------|-------------|----------|
| 终态隐藏「编辑/撤回」按钮 + banner 提示原因；撤回二次确认；业务错误由 axios 拦截器统一 Notify | 与 v1.4 终态体验一致，避免双重通知 | ✓ |
| 终态 disable 按钮但保留 + tooltip 提示 | 视觉混乱（一排灰按钮），与 v1.4 不同源 | |
| 撤回不二次确认（直接调用） | 不可逆操作必须二次确认；Quasar `useQuasar().dialog({...})` 是项目惯例 | |

**Selected:** Option 1
**Notes:** PENDING-only 守卫由后端兜底；前端按钮显隐主要是 UX。axios 拦截器在 v1.0 起一直统一处理 401/403/状态非法，组件层只 try/finally 切换 loading。

---

## Pinia store 与类型骨架

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 `useChannelPushStore` + 独立 `types/channelPush.ts`，actions 1:1 映射后端端点 | 业务模型完全独立（4 态状态机 + duplicateHints + audience-aware DTO），独立组织最干净 | ✓ |
| 复用 `useReimbursementStore` 增加 namespace 区分 | 类型污染；状态枚举 / 字段集合都不同 | |
| 不建 store，组件直接调 axios | 列表/详情/表单需要共享 filters/loading/current，组件直连 axios 会导致重复代码 | |

**Selected:** Option 1
**Notes:** `useChannelPushStore` 与 `useReimbursementStore` 的字段命名 mirror，便于将来抽公共骨架；当前阶段不抽，避免过早抽象。

---

## Claude's Discretion

- 表单字段在 PC 上的栅格分布（半宽 / 全宽）— 由实现决定。
- 列表表格列宽与排序 — 默认按提交时间倒序；列宽按视觉密度调整。
- 空态文案具体措辞 — 用 EmptyState 默认风格。
- 重复提示 dialog 内表格的列顺序 / CANCELLED 状态是否单独图标 — 由实现细化。
- 意向状态枚举的具体预设值 — 给一组常见预设但允许自由输入。

## Deferred Ideas

- Excel 批量导入 → Phase 34
- 接收人审核 UI（待我审核 / 通过 / 驳回 / 内部补充字段）→ Phase 35
- 站内通知集成 + 跨角色只读 + 通知跳详情 → Phase 36
- 渠道商之间互查、自助注册、自动合并去重 → Out of Scope（PROJECT.md 行 124-131）
- 推送统计 / 导出 / 转化跟踪 → STAT/EXPORT/CONVERT 后续里程碑
- 公开 token 免登录推送 → Out of Scope（与 v1.1 公开收集分离）
