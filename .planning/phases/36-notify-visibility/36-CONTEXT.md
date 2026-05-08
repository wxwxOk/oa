# Phase 36: 站内通知集成 + 跨角色可见性 + 验证收尾 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Mode:** `--auto` (continue without discuss-phase; all decisions delegated to planner based on ROADMAP + REQUIREMENTS + existing patterns)

<domain>
## Phase Boundary

v1.6 里程碑收官阶段，覆盖：

1. **站内通知（双向）** — 渠道商提交推送后主接收人收到「渠道推送待审核」通知；主接收人审核后渠道商收到「我的推送已审核」通知。复用 v2.0 站内通知体系（铃铛 + 未读数）
2. **跨角色只读可见性** — 部门负责人、上级部门负责人、ADMIN 可只读查看推送列表/详情，但通过/驳回按钮和 API 仅对主接收人开放
3. **端到端验证与归档** — focused 后端测试全部绿、前端 contract + build 通过、手动 UAT、v1.6 closeout 摘要写入 MILESTONES.md

**不在本阶段：** 外部通知渠道（短信/微信/邮件）、新功能迭代
</domain>

<decisions>
## Implementation Decisions

所有设计决策委托给 planner agent，基于以下约束：
- 复用 v2.0 站内通知体系（Notification 模型 + 铃铛 + 未读数 + SSE/轮询 等现有基础设施）
- 通知类型新增：CHANNEL_PUSH_PENDING_REVIEW（接收人）、CHANNEL_PUSH_REVIEWED（渠道商）
- 通知负载含 pushId，点击跳转到对应详情页
- 跨角色可见性复用现有 RBAC（部门树查询 + ADMIN 超权限）
- 只读权限与审核操作分离：viewScope 放开，handle(happrove/reject)仍仅限 recipientUserId === actor.id
- 手动 UAT 覆盖双向通知流程 + 跨角色只读验证
- ROADMAP Phase 36 success criteria 1-4
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` §Phase 36
- `.planning/REQUIREMENTS.md` — REVIEW-02, NOTIF-01, NOTIF-02, NOTIF-04
- Phase 32 backend: channel-push 服务、路由、状态机
- Phase 35 产出: 审核服务、前端页面、类型
- v2.0 站内通知: `.planning/phases/19-oa-center-notification-stats/` 中的 Notification 模型
- `.planning/phases/35-ui/` — Phase 35 产出作为依赖参考
</canonical_refs>
