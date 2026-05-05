# Phase 33: 渠道商提交体验 + 我的推送 UI - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected without interactive prompts)

<domain>
## Phase Boundary

交付 v1.6 渠道商侧的 PC/Mobile 前端体验，覆盖：

1. **路由 / 菜单 / 守卫** — `CHANNEL_PARTNER` 角色登录后只看到「我的推送」相关菜单；员工业务路径（用户/部门/角色/审批/到访/报销/模板/统计）被前端守卫拦截，跳转 `/403`。
2. **新建 / 编辑提交表单** — 学员姓名、手机号（必填），年龄、学历、性别、意向状态、意向说明、备注（可选），附件 0~N（图片 / PDF），PC 与 Mobile 两套布局复用同一逻辑。
3. **重复提示 UI** — 提交 / 编辑响应中携带 `duplicateHints[]`，UI 醒目展示冲突条目（学员姓名、手机号、状态、提交时间），但不阻止提交。
4. **「我的推送」列表** — 关键字（姓名/手机号）+ 状态 + 时间范围筛选，PC 表格 + Mobile 卡片，支持分页。
5. **推送详情 + 编辑/撤回** — PENDING 状态可进入编辑表单和撤回；APPROVED/REJECTED/CANCELLED 终态按钮禁用并提示原因；展示驳回原因和审核时间。
6. **绑定的 Pinia store / TS 类型 / 路由 meta / `MainLayout` 菜单** 同步落地。

**不在本阶段：** Excel 批量导入（Phase 34）、接收人审核 UI（Phase 35）、站内通知集成 + 跨角色只读（Phase 36）。

</domain>

<decisions>
## Implementation Decisions

### 路由与菜单守卫策略

- **D-01:** 渠道商专用路由集中放在 `/channel-push` 路径下（`/channel-push`、`/channel-push/new`、`/channel-push/:id`、`/channel-push/:id/edit`），全部挂在现有 `MainLayout.vue` 之下，**不**新建 layout。
  - **Why:** 与 v1.4 报销 (`/reimbursements/:id/edit`)、v1.3 到访 (`/visits`) 路径形态一致；layout 由 `auth.user.roles` + `MainLayout.allMenus` 的 `permAny` 过滤决定可见菜单，渠道商角色因仅持有 `channelPush:create / viewOwn / cancel` 三个权限码，自动被过滤掉所有员工菜单。
  - **How to apply:** 在 `frontend/src/router/routes.ts` 追加 4 个子路由 + `meta.title/icon/perm/permAny`；`MainLayout.allMenus` 追加一个顶级菜单 `{ path: '/channel-push', title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] }`。
- **D-02:** 路由守卫复用现有 `frontend/src/router/index.ts` 的 `Router.beforeEach`，不新增渠道商专用守卫。`/channel-push` 系列路由通过 `meta.permAny` 让现有守卫拒绝无权限访问；员工路径（如 `/users` `/visits` `/reimbursements`）原本就有 `meta.perm`，渠道商角色没有这些权限码会被同一守卫推到 `/403`。
  - **Why:** 单一守卫策略已被 v1.0~v1.4 五个里程碑验证；新增"角色黑名单"会破坏既有 RBAC 模型。
  - **How to apply:** 严禁在路由表里给员工路径再追加渠道商黑名单字段；只通过权限码隔离。

### 单条提交表单的形态

- **D-03:** 提交 / 编辑共用一个 `ChannelPushFormPage.vue`，通过路由 `:id` 区分新建 vs 编辑（参考 `ReimbursementFormPage.vue` 模式）。
  - **Why:** 字段集合完全一致；表单级 `q-form` + 字段校验 + 附件面板可以一份代码服务两个入口，降低维护成本。
  - **How to apply:** 路由 `path: 'channel-push/new'` 与 `path: 'channel-push/:id/edit'` 挂同一组件；组件根据是否存在 `:id` 决定是 POST `/channel-push` 还是 PATCH `/channel-push/:id`。
- **D-04:** 附件采用"先建主记录后追加附件"的两步式（与报销一致）— 新建时表单提交走 multipart `payload + attachments`（一次完成），编辑模式下仅修改业务字段，新增/删除附件走单独 `/channel-push/:id/attachments` 端点。
  - **Why:** 后端 `channel-push.route.ts` 已经实现 `POST /` 接收 multipart 一次完成（包含附件），`POST /:id/attachments` 用于追加，`DELETE /:id/attachments/:aid` 用于删除；服务端做了 20 个上限和 PENDING 守卫，前端不重复造校验。
  - **How to apply:** 复用 `ReimbursementAttachmentPanel.vue` 的两阶段交互模式重写一份 `ChannelPushAttachmentPanel.vue`，删除签字面板逻辑，保留预览/下载/上传/删除按钮和 PENDING 时禁用。
- **D-05:** 字段校验保持轻量：`studentName` 必填 1~64 字符，`studentPhone` 必填 5~32 字符（与后端 TypeBox 一致，**不**做正则强制；样表里手机号可能含国际前缀），其他字段长度上限与后端一致。
  - **Why:** 后端 `channelPushWriteBody` 已校验，前端只做"必填 + 长度"提示，不重复业务规则；样表手机号格式不固定，强正则会误伤。
  - **How to apply:** `q-input :rules="[v => !!v || '请输入学员姓名']"`；意向状态用 `q-select` 提供常见预设（待跟进/有意向/无意向/暂时观望/其他），允许 `use-input` 自由输入。

### 列表与重复提示的展现

- **D-06:** 「我的推送」列表的筛选区在 PC 用横向 `filter-bar`（与 `ReimbursementPage.vue` 完全对齐：关键字 + 状态 + 起止日期 + 查询/重置），Mobile 用 `FilterSheet` 抽屉（已有 `frontend/src/components/FilterSheet.vue`）。
  - **Why:** 视觉与交互节奏跨模块一致，渠道商不会感到"另一套系统"；FilterSheet 已经处理了 dateFrom/dateTo + 状态筛选的常见组合。
  - **How to apply:** `keyword` → `studentName/studentPhone` 联合搜索（后端 `keyword` 参数已有），`status` → 4 选 1 (`PENDING/APPROVED/REJECTED/CANCELLED`)，日期范围 → 复用 v1.4 的 `dateFrom/dateTo` 风格 + `q-popup-proxy q-date`。
- **D-07:** 状态展现复用 `ReimbursementStatusChip.vue` 风格：用一组 `ChannelPushStatusChip.vue`，颜色映射 `PENDING(amber) / APPROVED(positive) / REJECTED(negative) / CANCELLED(grey-5)`。
  - **Why:** 与 v1.4 报销 chip 视觉一致；用户已经熟悉这套色板（DRAFT 灰、审批中橙、APPROVED 绿、REJECTED 红）。
  - **How to apply:** 新建 `frontend/src/components/channel-push/ChannelPushStatusChip.vue`，不复用报销 chip（业务语义不同，避免耦合）。
- **D-08:** 重复提示在新建/编辑成功后**模态弹窗 + 列表 banner 双展示**：
  - 提交成功 → `Notify.create({type:'positive'})` + 如果 `duplicateHints.length > 0` 立即 `q-dialog` 展开冲突列表（学员姓名 / 手机号 / 状态 / 提交时间），让渠道商人工判断；
  - 详情页顶部如果当前推送有重复条目，用 `q-banner` 持久提示，附"查看冲突"按钮跳到对应详情。
  - **Why:** REQUIREMENTS.md 明确"不阻止提交"+"明确标出冲突条目"（DEDUP-01/02）。一次性 toast 容易被忽略，banner 在详情页再次提示比较稳妥。
  - **How to apply:** 后端响应已经返回 `duplicateHints[]`，前端只需要展示，不再二次查询。

### 终态编辑/撤回 / 错误反馈

- **D-09:** 详情页用 `q-banner + q-btn` 控制编辑/撤回按钮的显隐：仅 `status === 'PENDING'` 时显示「编辑」「撤回」；其他状态按钮隐藏，并显示 `q-banner`：「该推送已 [状态]，不可再 [操作]」。
  - **Why:** 后端 `assertCanMutateOwnChannelPush` 已经保护非法转移，前端隐藏按钮主要是 UX 层避免误点；与 v1.4 报销详情终态 disable + 提示模式对齐。
  - **How to apply:** 详情页计算 `canMutate = computed(() => detail.value?.status === 'PENDING')`；按钮 `v-if="canMutate"`。
- **D-10:** 撤回操作走 `Dialog.confirm` 二次确认（"撤回后此推送不会进入审核，确定撤回？"），调用 `POST /channel-push/:id/cancel`，成功后刷新详情，状态变 `CANCELLED`。
  - **Why:** 撤回是终态操作（PENDING → CANCELLED），与 v1.4 报销驳回类似的不可逆转移，必须二次确认。
  - **How to apply:** 用 Quasar `useQuasar().dialog({...})` 而非自定义 dialog，跨模块一致。
- **D-11:** 后端业务错误（401/403/404/状态非法）由 `frontend/src/boot/axios.ts` 全局拦截器统一弹 `Notify`；UI 层不再单独处理，仅在表单字段必填这种本地错误处弹 `Notify({type:'negative', message:'请检查表单'})`。
  - **Why:** 与 v1.0~v1.4 全局错误处理策略一致，避免双重通知；axios 已经处理了 token 过期 silent refresh。
  - **How to apply:** Pinia action 抛出后让组件 `try/catch` 但不再 `Notify`（除非业务语义需要补充上下文）。

### Pinia store / 类型 / 文件骨架

- **D-12:** 新增独立 `useChannelPushStore`（`frontend/src/stores/channelPush.ts`），不复用 `reimbursement` 或 `visit` store；类型定义放在 `frontend/src/types/channelPush.ts`。
  - **Why:** 业务模型完全独立（PUSH 状态机 4 态 vs 报销 5 态；推送有 `duplicateHints` 而报销没有），共享 store 会带来类型污染。
  - **How to apply:** Store actions 命名与后端端点对齐：`fetchMine` / `fetchDetail` / `create` / `update` / `cancel` / `addAttachments` / `previewAttachmentBlob` / `downloadAttachment` / `deleteAttachment`。状态字段 `rows / total / page / size / filters / current / loading / detailLoading / actionLoading / uploadLoading / downloadLoading`，与报销 store 保持镜像，便于将来通过 codemod 抽公共逻辑。
- **D-13:** 类型定义按后端 `channelPushWriteBody` + service 返回值对齐，`ChannelPushDetail` 包含 `attachments: ChannelPushAttachment[]`，`ChannelPushSubmitResponse` 形如 `{ push: ChannelPushDetail; duplicateHints: ChannelPushDuplicateHint[] }`。
  - **Why:** 后端在 `createChannelPush` / `editChannelPush` 响应里挂载 `duplicateHints`，前端类型必须一一对应；audience-aware DTO 中 `internalScheduledReceiverId/internalScheduledDate/internalNote` 在渠道商视图下不会返回，前端类型把这些字段标为 `never`（或 `Phase 35` 之后再扩 `recipient` 视图类型）。
  - **How to apply:** 现阶段类型仅暴露渠道商可见字段；`Phase 35` 时再扩展 `ChannelPushReviewDetail` 类型即可。

### Claude's Discretion

- 表单字段在 PC 上的栅格布局（半宽 / 全宽）、Mobile 上的字段顺序：以"必填字段在前、附件在最末"为准，具体由实现决定。
- 列表表格的列宽与排序：以"姓名 / 手机号 / 状态 / 提交时间 / 操作" 5 列为基础，宽度按实际密度调整。
- 空态文案与图标：复用 `EmptyState` 组件，文案"还没有推送过学员，点击右上角'新建推送'开始"。
- 重复提示 dialog 内表格列顺序、CANCELLED 是否需要单独的图标。

### Folded Todos

未折叠任何 todo（todo 系统未维护本里程碑相关条目）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.6 项目级
- `.planning/PROJECT.md` — Current Milestone v1.6；Key Decisions 行 193-198 锁定渠道商账号、菜单复用、字段独立 schema、提示不阻止策略。
- `.planning/REQUIREMENTS.md` — v1.6 全量需求；本阶段对应 PARTNER-04/05、PUSH-01/02/05/06、DEDUP-01/02、NOTIF-03。
- `.planning/ROADMAP.md` §Phase 33 — Goal 与 5 条 Success Criteria（行 213-225）。

### Phase 32 后端契约（已交付）
- `.planning/phases/32-api-rbac/32-04-PLAN.md` — `/api/v1/channel-push` 路由契约、字段集合、附件 multipart payload 格式。
- `.planning/phases/32-api-rbac/32-04-SUMMARY.md` — 已交付端点、`duplicateHints` 返回结构、audience-aware 字段隐藏规则、PERM-03 权限矩阵。
- `.planning/phases/32-api-rbac/32-VERIFICATION.md` — Phase 32 must-have 验证表 + 关键事实清单。
- `backend/src/modules/channel-push/channel-push.route.ts` — 渠道商侧路由源码（提交 / 列表 / 详情 / 编辑 / 撤回 / 附件 CRUD）。
- `backend/src/modules/channel-push/channel-push.service.ts` — `createChannelPush / editChannelPush / cancelChannelPush / listMyChannelPushes / getMyChannelPush` 服务签名 + audience 序列化。
- `backend/src/modules/channel-push/channel-push.state.ts` — `assertCanMutateOwnChannelPush` 与 PENDING 守卫语义。
- `backend/src/modules/channel-push/channel-push-dedup.service.ts` — `findChannelPushDuplicates` 返回结构。
- `backend/src/modules/channel-push/channel-push-file.service.ts` — 允许 MIME、10 MB / 20 文件上限、preview/download header 构造器。
- `backend/prisma/schema.prisma` (`ChannelPush*` 模型部分) — 字段类型与状态枚举。

### 前端复用骨架
- `frontend/CLAUDE.md` — 路由 / store / 组件分层约定。
- `frontend/src/router/routes.ts` — 路由声明结构与 `meta.perm` / `permAny` 用法。
- `frontend/src/router/index.ts` — `Router.beforeEach` 守卫（perm + permAny + public）。
- `frontend/src/layouts/MainLayout.vue` — 菜单注册 + 权限过滤（PC drawer / Mobile drawer / Mobile footer tabs）。
- `frontend/src/boot/axios.ts` — axios 实例 + token 刷新 + 全局错误 Notify。
- `frontend/src/boot/perm.ts` — `v-perm` 指令。
- `frontend/src/stores/auth.ts` — `hasPerm / hasAnyPerm / maybeRefreshProfile`。
- `frontend/src/composables/useResponsive.ts` — `isDesktop / isMobile` 判断。
- `frontend/src/pages/ReimbursementPage.vue` — 列表骨架（filter-bar + 桌面 q-table + 移动卡片 + FAB + FilterSheet）。
- `frontend/src/pages/ReimbursementFormPage.vue` — 新建/编辑共用页面骨架（greedy q-form + 终态判断 + 附件先建后传）。
- `frontend/src/pages/ReimbursementDetailPage.vue` — 详情骨架（状态 chip + 时间线 + 终态 banner）。
- `frontend/src/components/reimbursement/ReimbursementAttachmentPanel.vue` — 附件上传 / 预览 / 下载 / 删除组件（去掉签字部分作为 `ChannelPushAttachmentPanel.vue` 的模板）。
- `frontend/src/components/reimbursement/ReimbursementStatusChip.vue` — 状态 chip 颜色策略。
- `frontend/src/components/FilterSheet.vue` — Mobile 端筛选抽屉。
- `frontend/src/components/EmptyState.vue` — 空态卡片。
- `frontend/src/stores/reimbursement.ts` — Pinia store 结构（rows/total/page/size/filters + 全套 action 命名约定）。
- `frontend/src/types/reimbursement.ts` — 类型组织方式（行 / 详情 / 写入 payload / 列表过滤器常量）。

### 类似业务先例（可参考但不直接复用）
- `frontend/src/pages/VisitPage.vue` — 关键字 + 多筛选 + 桌面表格 + 移动卡片的另一套实现，验证 `keyword` 与 `dateFrom/dateTo` 组合查询的交互。
- `.planning/milestones/v1.0-phases/03-crud/03-CONTEXT.md` §Reusable Assets / Established Patterns — 列出后端 authGuard、前端 v-perm、axios 拦截器三件套基础约定。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

| 资产 | 路径 | 用法 |
|---|---|---|
| 路由守卫 | `frontend/src/router/index.ts` | 现成 `meta.perm` / `meta.permAny` + `auth.hasPerm/hasAnyPerm`，渠道商权限码隔离零额外代码 |
| 菜单过滤 | `frontend/src/layouts/MainLayout.vue` `filterMenus()` | 直接 push 一条 `'/channel-push'` 菜单即可 |
| 权限指令 | `frontend/src/boot/perm.ts` (`v-perm`) | 按钮/操作显隐：`v-perm="'channelPush:cancel'"` |
| Axios 静默续签 + 业务错误统一 Notify | `frontend/src/boot/axios.ts` | 不在 store/组件层重复处理 401/403/状态非法 |
| 响应式判断 | `frontend/src/composables/useResponsive.ts` | PC vs Mobile 分支统一来源 |
| 暗黑模式 | `frontend/src/composables/useDarkMode.ts` | 自动跟随，无需调整 |
| 列表 + 卡片骨架 | `pages/ReimbursementPage.vue` (PC table + Mobile card + FAB + FilterSheet) | 拷贝 + 改 store 调用 + 列定义即可 |
| 表单骨架 | `pages/ReimbursementFormPage.vue` (greedy q-form + 终态判断 + 附件面板) | 删除签字 + 调整字段集合 |
| 详情骨架 | `pages/ReimbursementDetailPage.vue` (状态 chip + 终态 banner) | 删除签字 + 时间线裁剪 + 加重复 banner |
| 附件面板 | `components/reimbursement/ReimbursementAttachmentPanel.vue` | 拷贝 → 改 store / 端点 / type 即可 |
| 空态 | `components/EmptyState.vue` | 直接复用 |
| Mobile 筛选抽屉 | `components/FilterSheet.vue` | 直接复用，传入对应 emit `apply/reset` |
| 状态 chip 颜色策略 | `components/reimbursement/ReimbursementStatusChip.vue` | 不复用组件，但复用配色 |

### Established Patterns

- **路由权限**：`meta.perm: 'foo:bar'` 单权限 / `meta.permAny: ['a','b','c']` 任一权限。后端 `authGuard(perm)` 必须用同一个权限码；CHANNEL_PARTNER 角色在 Phase 32 已 seed 了 `channelPush:create / viewOwn / cancel`，前端用相同字符串即可。
- **菜单注册**：在 `MainLayout.allMenus` 顶级追加一项即可被 `filterMenus()` 自动按 `permAny` 过滤；不需要改 `filterMenus` 实现。
- **页面命名**：`XxxPage.vue` (列表) / `XxxFormPage.vue` (新建+编辑) / `XxxDetailPage.vue` (详情)，与 v1.4 保持一致。
- **store 命名**：`useChannelPushStore` 单文件，actions 与后端端点 1:1 映射。
- **类型组织**：`types/channelPush.ts` 集中导出 `ChannelPushStatus / Row / Detail / WritePayload / ListFilters / DuplicateHint / SubmitResponse`，并提供 `createEmptyChannelPushFilters()` 工厂。
- **多端表单提交**：先 `multipart/form-data` 一次性提交主记录 + 附件（创建场景），再用 `/channel-push/:id/attachments` 增量挂载（编辑场景）。
- **错误兜底**：业务错误一律由 axios 拦截器 Notify，组件层只 catch 并保留 try/finally loading 切换。
- **状态 chip**：4 态映射 amber/positive/negative/grey-5；与报销保持视觉同源但不共用组件。

### Integration Points

- **新增的 4 条路由 + 1 条菜单 + 1 个 store + 1 套类型 + 4 个组件**：完全增量，不修改现有页面。
- **`MainLayout.allMenus`** 是唯一一处需要追加（不重写）的现有文件；其余对接点（router、auth、boot）均通过 meta 与权限码联动。
- **后端契约不需要任何改动**：Phase 32 已交付的 `/api/v1/channel-push/*` 是稳定契约，前端按既有 DTO 调用即可。
- **侵入面 = 0**：员工功能（用户/部门/角色/审批/到访/报销/模板/统计）在 CHANNEL_PARTNER 登录后会被 `MainLayout.filterMenus()` 自动隐藏，路由 `meta.perm` 自动拦截 — Phase 33 不需要在这些页面里写"渠道商例外"。

</code_context>

<specifics>
## Specific Ideas

- **风格定位**：UI 视觉与 v1.4 报销（最近交付）完全对齐：列表 filter-bar + 表格、Mobile 卡片 + FAB + FilterSheet、详情终态 banner + chip。
- **菜单图标**：`forward_to_inbox`（material symbols 内置；表达"对外推送"语义，与 `groups`(到访) `receipt_long`(报销) 区分明显）。
- **状态色板**：复用 v1.4 的 amber / positive / negative / grey-5，避免给用户引入新的色彩语言。
- **填写引导文案**：表单顶部 1 行说明"提交后由内部主接收人审核，待审核状态可编辑/撤回"，明确边界。
- **重复提示语**：dialog 标题"检测到 N 条疑似重复推送"，副标题"提交已成功，请人工核对是否需要撤回"。

</specifics>

<deferred>
## Deferred Ideas

- **Excel 批量导入**：移到 Phase 34（独立）。本阶段不在导入入口、不预留按钮。
- **接收人审核 UI（待我审核 / 通过 / 驳回 / 内部补充字段）**：移到 Phase 35。
- **站内通知集成 + 跨角色只读 + 通知跳详情**：移到 Phase 36（NOTIF-01/02/04 + REVIEW-02）。
- **推送统计 / 导出 / 转化跟踪**：超出 v1.6，进入 STAT/EXPORT/CONVERT 后续里程碑。
- **渠道商自助修改资料**：UPGRADE 里程碑（v1.6 默认管理员维护）。
- **渠道商自助注册 + 审核激活**：UPGRADE 里程碑（v1.6 显式禁止）。
- **重复提示自动跳转/合并**：明确"仅提示不阻止、不合并、不跳过"，与 v1.3 到访策略一致。
- **公开 token 免登录推送**：Out of Scope（与 v1.1 公开收集分离）。

### Reviewed Todos (not folded)

无。

</deferred>

---

*Phase: 33-渠道商提交体验 + 我的推送 UI*
*Context gathered: 2026-05-05*
