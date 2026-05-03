# Phase 26: 两级审核与手写签字 - Context

**Gathered:** 2026-05-03 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

交付 v1.4 固定报销模块的审核闭环：部门审核人员只处理待部门初审且自己有权处理的报销申请，财务审核人员只处理待财务复核申请；两个通过节点都必须采集 Canvas 手写签名，并把签名图片、审核人、动作、意见和时间写入报销审核轨迹；驳回进入终态并在详情展示驳回节点、人员、原因和时间。Phase 26 覆盖后端审核动作/API、签名文件保存与受保护读取、前端待审核入口/操作区/签名采集和轨迹展示。员工申请、草稿、附件上传/预览/下载已由 Phase 24/25 交付；Excel 导出、UAT 收尾、OCR、发票验真、付款、统计和复杂工作流不属于本阶段。

</domain>

<decisions>
## Implementation Decisions

### 审核入口与可处理列表
- **D-01:** Phase 26 继续在固定 `reimbursement` 模块内实现，不接入动态 `ApprovalTask`、`ApprovalApplication` 或公开表单流。
- **D-02:** 部门审核可处理列表采用严格行动口径：申请状态为 `DEPARTMENT_REVIEW`、申请人部门与审核人部门匹配、且当前用户具备 `reimbursement:department-review`；普通 `reimbursement:list` 只代表可查看，不代表可处理。
- **D-03:** 财务审核可处理列表采用严格行动口径：申请状态为 `FINANCE_REVIEW`、且当前用户具备 `reimbursement:finance-review`；财务可查看已处理终态记录，但待处理队列只展示财务复核中。
- **D-04:** 前端可在现有“报销管理”体系下增加“待部门初审/待财务复核”入口、标签页或 scope filter；不得另起动态审批中心页面来处理固定报销审核。

### 审核动作与状态流转
- **D-05:** 新增报销专用部门/财务通过与驳回动作；每个动作必须在后端事务内完成权限校验、当前状态校验、状态更新和 `ReimbursementAction` 追加写入。
- **D-06:** 部门通过执行 `DEPARTMENT_REVIEW -> FINANCE_REVIEW`，写入 `DEPARTMENT_APPROVE` action，节点名为“部门初审”；部门驳回执行 `DEPARTMENT_REVIEW -> REJECTED`，写入 `DEPARTMENT_REJECT` action，并设置终态完成时间。
- **D-07:** 财务通过执行 `FINANCE_REVIEW -> APPROVED`，写入 `FINANCE_APPROVE` action，并设置最终通过时间；财务驳回执行 `FINANCE_REVIEW -> REJECTED`，写入 `FINANCE_REJECT` action，并设置终态完成时间。
- **D-08:** 所有状态推进复用 `assertReimbursementTransition` 的显式状态机；不得通过前端传入目标状态直接更新，也不得绕过审核轨迹只改状态字段。

### 手写签名与驳回意见
- **D-09:** 两个通过动作都必须提交非空 Canvas 手写签名；驳回动作不需要签名，但驳回意见必须非空。
- **D-10:** 前端可复用/抽取现有 `signature_pad` Canvas 能力，把签名导出为 PNG Blob/File 后随审核通过请求提交；后端保存为安全文件，并把 `signatureRelativePath`、`signatureMimeType`、`signatureSize` 绑定到本次 `ReimbursementAction`。
- **D-11:** 签名图片是审核动作证据，不是普通报销附件；不得混入 `ReimbursementAttachment`，也不得把 data URL 原文写入数据库。
- **D-12:** 签名查看必须走 authenticated blob 读取，详情轨迹展示实际签名图片或可安全预览的签名缩略图；不得向前端暴露本地磁盘路径或直接把 protected URL 塞进 `<img src>`。

### 前端审核体验
- **D-13:** 复用 Phase 25 的 `/reimbursements` 路由、`useReimbursementStore`、详情页和轨迹组件体系；页面内只在“当前用户有权处理当前节点”时显示审核操作区。
- **D-14:** 桌面端在详情侧栏/操作卡提供“通过/驳回”；移动端复用审批详情的 sticky 底部操作区，保证审核、签名和驳回在手机上可完成。
- **D-15:** 通过弹窗包含申请摘要、审核意见输入和手写签名区域；驳回弹窗包含申请摘要和必填驳回原因。操作成功后刷新详情/列表并给出明确成功反馈，失败时展示可理解错误。
- **D-16:** 审核人员可查看申请信息和附件，但不得编辑申请核心字段、删除附件或重新提交申请；附件仍通过 Phase 25 的 authenticated blob 预览/下载口径读取。

### 审核轨迹与终态展示
- **D-17:** 详情页审核轨迹按时间顺序展示提交、部门通过/驳回、财务通过/驳回，字段至少包含 action label、`nodeName`、`actorName`、`comment`、`createdAt` 和签名图片。
- **D-18:** 驳回详情必须突出驳回节点、驳回人、驳回时间和驳回原因；通过和驳回都按终态展示 `completedAt`，便于 Phase 27 导出口径复用。
- **D-19:** `ReimbursementActionTimeline` 从“签名元数据显示”升级为“签名图片可查看”；没有签名的提交/驳回动作保持普通文字轨迹。

### 验证与质量
- **D-20:** 后端聚焦测试覆盖：部门/财务可处理范围、非法状态流转、重复处理、通过必须签名、驳回必须原因、action 追加、签名元数据、`completedAt` 和对象权限。
- **D-21:** 前端聚焦测试覆盖：store 审核接口 payload、审核操作显隐、通过签名必填、驳回原因必填、移动 sticky 操作区、签名 blob 预览和轨迹渲染。

### the agent's Discretion
- 审核列表的具体路由命名、是否用独立 review endpoints 或 list scope 参数，由 planner 按现有 Elysia/Pinia 风格决定，但必须保持“可处理队列”和“普通可见列表”语义分离。
- 签名文件目录、文件名、大小上限和响应 header 细节由实现者按 `reimbursement-file.service.ts` 的安全路径模式决定；语义上只允许 PNG 签名并绑定到 action。
- 签名组件是抽取现有 `SignatureField.vue` 还是新建 `ReimbursementSignaturePad.vue` 由 planner 决定，但交互需支持 PC/Mobile。
- 具体文案、卡片间距、按钮排列和空状态样式沿用现有 Quasar OA 风格即可，不需要新设计系统。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 26 goal, dependency on Phase 25, success criteria and Phase 27 boundary.
- `.planning/REQUIREMENTS.md` — `APPROVAL-01` through `APPROVAL-05`, `PERM-01`, `PERM-02`, `UX-01` and `UX-02`.
- `.planning/PROJECT.md` — v1.4 fixed reimbursement module, two-level review/signature decision, out-of-scope list and stack constraints.
- `.planning/STATE.md` — Phase 25 complete, Phase 26 ready and current v1.4 watch-outs.

### Locked reimbursement contracts
- `.planning/phases/24-api/24-CONTEXT.md` — fixed reimbursement model, status, permission, action trail and signature-field decisions.
- `.planning/phases/24-api/24-RESEARCH.md` — reimbursement backend route/model rationale and implementation references.
- `.planning/phases/24-api/24-VERIFICATION.md` — Phase 24 backend verification status and known unrelated backend suite caveat.
- `.planning/phases/25-reimbursement-ui/25-CONTEXT.md` — locked Phase 25 frontend route/store/detail/attachment decisions and Phase 26 exclusions.
- `.planning/phases/25-reimbursement-ui/25-UI-SPEC.md` — current reimbursement UI contract, status colors, detail sections and negative contract excluding review actions from Phase 25.
- `.planning/phases/25-reimbursement-ui/25-RESEARCH.md` — frontend architecture and source references Phase 26 should extend.

### Prior approval and fixed-module patterns
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` — explicit state machine and append-only action/timeline modeling pattern.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` — approval detail, action dialogs, mobile sticky action and timeline safety patterns.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — permission-gated operations and append-only event display pattern.
- `.planning/phases/21-crud/21-CONTEXT.md` — fixed-module frontend list/detail/menu conventions.
- `.planning/phases/22-excel/22-CONTEXT.md` — file operation feedback patterns relevant to signature/file handling.

### Backend source files
- `backend/prisma/schema.prisma` — `ReimbursementStatus`, `ReimbursementActionType`, `ReimbursementApplication`, `ReimbursementAction` signature fields and indexes.
- `backend/prisma/seed.ts` — reimbursement permission codes and ADMIN/EMPLOYEE grant pattern.
- `backend/src/modules/reimbursement/reimbursement.state.ts` — `ReimbursementStatusValue`, `REIMBURSEMENT_DEPARTMENT_REVIEW_NODE`, `TERMINAL_REIMBURSEMENT_STATUSES`, `canTransitionReimbursement()` and `assertReimbursementTransition()`.
- `backend/src/modules/reimbursement/reimbursement.service.ts` — actor shape, visibility helpers, list/detail serialization and transaction-bound submit action pattern.
- `backend/src/modules/reimbursement/reimbursement.route.ts` — current reimbursement route grouping, auth guard usage, TypeBox body/query schemas and attachment endpoints.
- `backend/src/modules/reimbursement/reimbursement-file.service.ts` — safe local file path, MIME/size validation and protected file response header patterns to adapt for signatures.
- `backend/src/modules/reimbursement/__tests__/reimbursement.service.test.ts` — existing reimbursement service/state tests to extend for review transitions.
- `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — route contract tests to extend for review action endpoints.

### Frontend source files
- `frontend/src/types/reimbursement.ts` — status/action DTOs, filters, attachment constants and helper organization.
- `frontend/src/stores/reimbursement.ts` — centralized reimbursement API calls, loading flags and authenticated blob request pattern.
- `frontend/src/pages/ReimbursementPage.vue` — fixed reimbursement list/table/card pattern and candidate host for review scopes.
- `frontend/src/pages/ReimbursementDetailPage.vue` — current read-only detail page and main insertion point for review action card/sticky actions.
- `frontend/src/components/reimbursement/ReimbursementActionTimeline.vue` — existing action label/timeline component that must render signature images.
- `frontend/src/components/reimbursement/ReimbursementAttachmentPanel.vue` — protected attachment preview/download pattern reviewers should reuse.
- `frontend/src/components/designer/fields/SignatureField.vue` — existing `signature_pad` Canvas dialog, PNG data URL export, responsive dialog and clear/save methods.
- `frontend/src/pages/ApprovalTaskDetailPage.vue` — existing approval action dialogs and mobile sticky operation pattern to adapt.
- `frontend/src/router/routes.ts` — reimbursement route meta and `permAny` conventions.
- `frontend/src/layouts/MainLayout.vue` — menu permission filtering and reimbursement menu integration point.
- `frontend/src/stores/auth.ts` and `frontend/src/boot/perm.ts` — `hasPerm`/`hasAnyPerm` and `v-perm` action visibility helpers.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/reimbursement/reimbursement.state.ts`: already defines legal reimbursement status transitions and terminal statuses; Phase 26 should extend behavior around it rather than adding ad-hoc status updates.
- `backend/src/modules/reimbursement/reimbursement.service.ts`: provides `ReimbursementActor`, `canViewReimbursement()`, `assertCanViewReimbursement()`, `submitReimbursementDraft()` and `serializeReimbursementDetail()` patterns for actor permissions, transactions and action serialization.
- `backend/prisma/schema.prisma`: `ReimbursementAction` already has `signatureRelativePath`, `signatureMimeType` and `signatureSize`; no new signature table is needed for MVP.
- `backend/src/modules/reimbursement/reimbursement-file.service.ts`: safe file naming/path resolution and response header helpers can be mirrored or factored for signature image storage.
- `frontend/src/stores/reimbursement.ts`: all reimbursement API calls are centralized in Pinia; Phase 26 should add review list/actions/signature blob methods here.
- `frontend/src/components/designer/fields/SignatureField.vue`: existing `signature_pad` Canvas implementation can be adapted into a reimbursement review signature component.
- `frontend/src/pages/ApprovalTaskDetailPage.vue`: provides proven approval/reject dialog and mobile sticky action patterns.
- `frontend/src/components/reimbursement/ReimbursementActionTimeline.vue`: already maps reimbursement action types and is the direct extension point for signature image display.

### Established Patterns
- Fixed business modules use dedicated Prisma models, route modules, Pinia stores and pages; reimbursement should stay independent from dynamic approval tasks.
- Lists return `{ rows, total, page, size }`; filtered requests omit blank params; object authorization is enforced again in service/route code.
- State changes that create side effects run in `prisma.$transaction` and append immutable action/timeline records.
- Frontend route/menu visibility uses `meta.perm`/`meta.permAny`, `auth.hasPerm()` and `v-perm`, but backend remains the real security boundary.
- Protected binary resources are fetched through authenticated axios blob requests and object URLs, not direct public URLs.
- Desktop detail pages use main content plus side action/timeline cards; mobile actions use touch-safe sticky bottom controls.

### Integration Points
- Backend service: add review action input normalization, actionable queue filtering and transaction-bound department/finance approve/reject functions.
- Backend route: add review queue/action endpoints under `/api/v1/reimbursements` with `authGuard('reimbursement:department-review')` and `authGuard('reimbursement:finance-review')` where appropriate.
- Backend file handling: add signature PNG write/read helpers and protected signature preview endpoint, reusing safe-path conventions.
- Frontend types/store: add review scope/action payload types, approve/reject methods, signature upload conversion and signature blob read method.
- Frontend pages/components: extend `ReimbursementDetailPage.vue`, `ReimbursementActionTimeline.vue` and optional review/signature dialog components; update `ReimbursementPage.vue` or routes for review queues.
- Tests: extend reimbursement backend service/route suites and frontend reimbursement store/component focused tests before global suite cleanup.

</code_context>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 26 context or plans were found; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for fixed-module review queues, transaction-bound review actions, action-bound signature image storage, terminal rejection/completedAt semantics, Quasar detail/sticky review UX and focused verification.
- Phase 26 should feel like “报销详情里的审核工作台”：审核人员看到同一份固定报销详情、附件和轨迹，只在有权处理当前节点时出现通过/驳回/签字操作。
- 签名是审核动作证据，不是发票附件；规划时不要把签名混进附件列表，也不要只显示签名元数据而不提供可查看签名图片。
- Phase 26 只补齐两级审核闭环；导出和整体验证留给 Phase 27，OCR、验真、金额分支、会签、委托、通知升级和付款集成继续后置或 out of scope。

</specifics>

<deferred>
## Deferred Ideas

- Excel 明细导出、筛选条件导出、v1.4 UAT 和里程碑归档 — Phase 27。
- OCR、发票真伪查验、自动验重、自动金额识别、预算控制、付款打款、会计凭证和财务系统对接 — v1.4 out of scope。
- 金额动态分支、多级会签、委托、超时升级、复杂 BPMN 流程和自动通知升级 — 固定两级审核稳定后再评估，不能塞进 Phase 26。
- 报销统计看板、图表分析和财务付款状态追踪 — 明确不属于本期审核签字闭环。

</deferred>

---

*Phase: 26-reimbursement-review-signature*
*Context gathered: 2026-05-03*
