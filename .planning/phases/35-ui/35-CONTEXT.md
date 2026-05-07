# Phase 35: 接收人审核 UI + 内部补充字段 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Mode:** `--skip-research` (skip research and plan directly from ROADMAP + REQUIREMENTS + existing patterns)

<domain>
## Phase Boundary

交付 v1.6 主接收人侧的 PC/Mobile 前端体验，覆盖：

1. **「待我审核」列表** — 主接收人查看自己作为主接收人的待审推送，按渠道商/状态/时间筛选，PC 表格 + Mobile 卡片
2. **推送详情页** — 展示渠道商提交字段、附件预览、重复提示、审核时间线
3. **内部补充字段** — 计划接待人、预期接待日期、内部备注表单，仅内部可见
4. **审核操作** — 通过/驳回，驳回必填意见，状态机转终态
5. **「已审核」历史** — 按状态/时间筛选，PC 表格 + Mobile 卡片

**不在本阶段：** 站内通知集成（Phase 36）、跨角色可见性（Phase 36）、端到端 UAT（Phase 36）
</domain>

<decisions>
## Implementation Decisions

所有设计决策委托给 planner agent，基于以下约束：
- 仿 .planning/phases/33-ui/ 的 Vue 3 + Quasar + TypeScript 模式
- 后端 Phase 32 已交付的 `/api/v1/channel-push` 端点（审核相关）
- 后端 `ChannelPushReviewAction` 审核日志模型
- REQUIREMENTS.md 中 REVIEW-01/03/04/05/06/07 + PERM-04
- ROADMAP.md 中 Phase 35 Success Criteria 1-6
- 路由挂 `/review` 前缀（类似 Phase 33 的 `/channel-push` 结构）
- Phase 35 路由、菜单和审核操作使用 `channelPush:review`；`channelPush:viewScope` 留给 Phase 36 跨角色只读可见性

### Planner's Discretion
- 具体路由结构、组件选择、store 设计由 planner 根据 Phase 33 模式决定
- 内部字段表单交互细节由 planner 决定
- 审核 dialog 的 UI 细节由 planner 决定
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目级
- `.planning/ROADMAP.md` §Phase 35 — Goal 与 6 条 Success Criteria
- `.planning/REQUIREMENTS.md` — REVIEW-01/03/04/05/06/07, PERM-04

### Phase 32 后端契约（已交付）
- `.planning/phases/32-api-rbac/32-04-PLAN.md` — channel-push 路由契约
- `backend/src/modules/channel-push/channel-push.route.ts`
- `backend/src/modules/channel-push/channel-push.service.ts`
- `backend/src/modules/channel-push/channel-push.state.ts`

### Phase 33 前端参考模式
- `.planning/phases/33-ui/33-CONTEXT.md` — 设计决策模式
- `.planning/phases/33-ui/33-*-PLAN.md` — PLAN 文件格式模板

### Phase 34 依赖
- `.planning/phases/34-excel/34-CONTEXT.md` — Phase 34 产出上下文
</canonical_refs>
