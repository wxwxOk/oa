# Phase 34: Excel 批量推送导入 - Context

**Gathered:** 2026-05-06 (auto)
**Status:** Ready for planning
**Mode:** `--auto`（自动选择全部灰色区域并采用推荐默认值）

<domain>
## Phase Boundary

在 Phase 33 已交付的渠道商「我的推送」UI 之上，为渠道商新增 Excel 批量导入入口。前端使用既有的 `xlsx` 依赖解析首个 sheet → 严格校验表头 → 预览有效/无效/重复行 → 用户确认后通过新增的 `POST /api/v1/channel-push/batch-import` 端点把标准化 JSON rows 提交给后端，后端按行独立创建 ChannelPush 记录（每条独立进入审核流，PENDING 状态），返回 `{ createdCount, total, failedRows? }` 与 `duplicateHints[]`。

**明确不在 Phase 34 范围：**

- 主接收人审核 UI、内部补充字段、通过/驳回（Phase 35）
- 站内通知集成与跨角色只读可见性（Phase 36）
- Excel 批量上传**附件**（业务上 Excel 不承载文件；附件继续走单条提交流程）
- 模板下载、Excel 导出、自动合并/跳过、跨记录数据库唯一约束、后端文件上传/存储
- 后端 Excel 解析（与 v1.3 Phase 22 决策一致：浏览器解析、后端只校验 JSON rows）

</domain>

<decisions>
## Implementation Decisions

### 解析架构与依赖

- **D-01:** 前端解析 Excel，**禁止**新增后端文件上传/multipart/Excel 依赖。复用已安装的 `xlsx` (^0.18.5) + `FileReader.readAsArrayBuffer` + `XLSX.read` + `XLSX.utils.sheet_to_json(sheet, { header: 1 })`。
  - **Why:** Phase 22 已经在 visit 模块验证此方案；同一前端依赖、同一交互范式，跨模块一致。
- **D-02:** 解析仅处理首个 sheet。空白数据行整行跳过；错误行以 Excel 原始行号定位（例如 "第 3 行 手机号 不能为空"）。
- **D-03:** 单文件批量上限 **500 行有效数据**；超限时阻止提交，预览面板显示明确错误。
  - **Why:** 防御浏览器解析内存峰值与后端单事务超时；500 行 × 8 列在 Phase 22 同模式下已实测可行。

### Excel 表头约定（严格顺序，8 列）

- **D-04:** 表头采用 **2 行结构**：第 1 行为可选合并标题（如「学员推送批量导入」，解析时**忽略并兼容缺省**），第 2 行为列表头，第 3 行起为数据行。
- **D-05:** 第 2 行表头必须按以下顺序精确匹配 8 列；不匹配时阻止导入并在预览中显示期望/实际差异：
  1. 学员姓名（必填）
  2. 手机号（必填）
  3. 年龄（可选，整数 1~120）
  4. 学历（可选）
  5. 性别（可选）
  6. 意向状态（可选）
  7. 意向说明（可选）
  8. 备注（可选）
- **D-06:** 字段映射严格对齐后端 `channelPushWriteBody`（`channel-push.route.ts`）：`studentName / studentPhone / studentAge / studentEducation / studentGender / intentStatus / intentNote / remark`。Excel 列上限沿用后端 TypeBox：姓名 1~64、手机号 5~32、其余文本 ≤64 或 ≤1000，超限即标为无效行。

### 字段标准化与行级校验

- **D-07:** 预览阶段输出标准化 `ChannelPushWritePayload[]`：字符串字段 trim、空字符串归一为 `undefined`（不提交给后端）；`studentAge` 允许空或整数，非整数标无效；手机号**不做正则强校验**（与 Phase 33 D-05 一致：样表手机号格式不固定，强正则会误伤）。
- **D-08:** 行级错误**只**包括会被后端拒绝的问题：姓名为空、手机号为空、年龄非整数或超 1~120、字段超长、表头结构错误。意向状态等可空字段缺失不算错误。

### 重复提示（与 Phase 33 DEDUP-01/02 联动）

- **D-09:** 重复检测分两层，**仅提示，不阻止、不合并、不跳过**：
  - **文件内**：前端按 `(studentName, studentPhone)` 生成 key 标记 Excel 内部重复行（多行同 key 都标记并互相引用行号）。
  - **跨记录**：批量提交后由后端在响应中返回 `duplicateHints[]`（每条标记冲突的现有推送 id/姓名/手机号/状态/提交时间），前端用 dialog 集中展示。
- **D-10:** 文件内重复**不影响行有效性**：用户仍可确认导入；提示文案与 Phase 33 单条提交一致："检测到 N 条疑似重复推送，提交已成功，请人工核对"。

### 后端契约（新增 1 个端点）

- **D-11:** 新增端点 `POST /api/v1/channel-push/batch-import`，guard `authGuard('channelPush:create')`（**复用现有权限码**，REQUIREMENTS.md 未定义 `channelPush:bulkImport` 且 PERM-01/02 已锁定 5 个权限码集合）。
- **D-12:** 请求体严格为：
  ```ts
  { rows: ChannelPushWritePayload[] }   // additionalProperties: false
  ```
  禁止接受 file/multipart/原始 cell 矩阵/客户端 createdAt/客户端 partnerId/重复提示元数据；身份从 JWT 取，与单条 POST 一致。
- **D-13:** 响应体：
  ```ts
  {
    createdCount: number;     // 实际成功入库的行数
    total: number;            // 提交的有效行总数
    failedRows: Array<{ index: number; reason: string }>;   // 后端二次校验失败行（应该为空，由前端预校验兜住）
    duplicateHints: ChannelPushDuplicateHint[];             // 跨已有记录的重复，按 (姓名, 手机号) 去重合并
  }
  ```
- **D-14:** 后端实现策略：在 `channel-push.service.ts` 新增 `batchCreateChannelPushes(actor, rows)`，内部按行调用现有 `createChannelPush(actor, payload, [])`（不带附件）；**partial success** 模式 — 单行失败不回滚已成功行；每行各自跑 dedup 查询并聚合 `duplicateHints`。事务粒度为**单行事务**（与 `createChannelPush` 既有事务边界一致），不引入 batch 级跨行事务。
  - **Why:** 与 Phase 22 `createMany` 风格类似的"尽量推进、错误回报"语义；单行失败不至于让已校验的 499 行都 fail。
- **D-15:** 不新增 Prisma 模型/migration；直接复用 `ChannelPush` 表；不引入 `skipDuplicates`、不引入数据库唯一约束。

### 导入入口、页面与组件骨架

- **D-16:** 导入入口挂在现有 `frontend/src/pages/ChannelPushPage.vue` 工具栏（与 Phase 33 列表页同页面），按钮文案「Excel 批量导入」，仅在 `auth.hasPerm('channelPush:create')` 通过时显示；**不**新增独立路由、菜单或页面。
- **D-17:** 新增 `frontend/src/components/channel-push/ChannelPushImportDialog.vue`：桌面端普通弹窗（920px 宽），移动端 `maximized`（与 `VisitImportDialog.vue` 视觉对齐）。
- **D-18:** 解析与校验逻辑放入纯函数模块 `frontend/src/components/channel-push/channelPushImport.ts`（镜像 Phase 22 的 `visitImport.ts`），覆盖：
  - `validateChannelPushImportHeaders(actualHeaders)` — 8 列严格匹配
  - `parseChannelPushImportRows(rows, fileName)` — 输出 `ChannelPushImportPreview { fileName, headerValid, expectedHeaders, actualHeaders, headerErrors, validRows, invalidRows, duplicateWarnings }`
  - 行级校验、文件内重复 key 计算
  - 内部使用纯函数易于单测，避免把解析逻辑塞满 `.vue`

### 前端类型与 Pinia store

- **D-19:** 扩展 `frontend/src/types/channelPush.ts`（**不新建独立 import 类型文件**），新增：
  - `CHANNEL_PUSH_IMPORT_HEADERS` 常量（8 列字符串数组）
  - `ChannelPushImportRowError`、`ChannelPushImportValidRow`、`ChannelPushImportInvalidRow`、`ChannelPushImportDuplicateWarning`、`ChannelPushImportPreview` 类型
  - `ChannelPushBatchImportRequest`、`ChannelPushBatchImportResponse` 契约
- **D-20:** 扩展 `frontend/src/stores/channelPush.ts`，新增 `batchImport(rows: ChannelPushWritePayload[])` action 调用 `POST /channel-push/batch-import`；维护 `importLoading` 状态；成功后调用现有 `fetchMine(filters)` 刷新列表（不强制跳第 1 页，保持当前筛选）。
- **D-21:** 提交 payload 严格为 `{ rows }`：禁止把 `headerErrors`、`duplicateWarnings`、`fileName`、原始 cell 矩阵或浏览器侧错误传给后端。

### 反馈与终态

- **D-22:** 导入成功后：
  - 关闭对话框 → `Notify.create({ type: 'positive', message: '已导入 ${createdCount}/${total} 条推送' })`
  - 若 `failedRows.length > 0` → 不关闭对话框，显示后端失败行清单与原因（应为前端预校验漏网情形）
  - 若 `duplicateHints.length > 0` → 复用 Phase 33 已有 `ChannelPushDuplicateDialog.vue` 组件展示跨记录重复，关闭后再 `fetchMine` 刷新列表
- **D-23:** 业务错误（401/403/状态非法）由 `frontend/src/boot/axios.ts` 全局拦截器统一弹 `Notify`；store action 不重复 Notify。
- **D-24:** 移动端 `ChannelPushImportDialog` `maximized` 模式下，预览区使用 tabs（有效 / 无效 / 文件内重复）+ 滚动列表；不强求 PC 表格风格。

### 测试与可维护性

- **D-25:** 聚焦测试范围（参照 Phase 22 `22-VERIFICATION.md` must-haves）：
  - 解析工具：表头偏移、8 列严格匹配、空行跳过、年龄整数校验、文件内重复 key、批量上限。
  - Store：`batchImport` payload 严格为 `{ rows }`、loading 状态切换、成功后 `fetchMine` 调用。
  - 组件/页面：`channelPush:create` 权限按钮显隐、成功后列表刷新、重复 dialog 展示。
  - 后端 route：负向测试拒绝 file/multipart/超字段；正向测试 partial success 与 `duplicateHints` 聚合。
- **D-26:** 后端 service 测试覆盖：500 行边界、单行失败不回滚、`duplicateHints` 跨已有记录聚合（与 `channel-push-dedup.service.ts` 既有逻辑一致）。

### Claude's Discretion

- 预览面板的具体布局（tab vs 卡片 vs 折叠）、列宽、移动端表格密度，由 planner/实现按 Quasar 风格决定。
- 文件内重复行的视觉标记（颜色 chip vs 背景色 vs 行尾标签）由实现决定。
- 失败行清单的展示形式（可复制粘贴 vs 仅展示）。
- 进度反馈（解析时是否显示 loading 进度条；批量提交时若超 100 行是否分批 spinner）。

### Folded Todos

未折叠任何 todo（todo 系统未维护本里程碑相关条目；`todo match-phase 34` 返回 0 条）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.6 项目级
- `.planning/PROJECT.md` — Current Milestone v1.6；Key Decisions 行 193-198 锁定独立 ChannelPush 模块、推送提示不阻止、字段独立 schema 策略。
- `.planning/REQUIREMENTS.md` — `PUSH-03`、`PUSH-04`（本阶段对应）；`DEDUP-01`、`DEDUP-02`（重复策略复用）；`PERM-01`、`PERM-02`（权限码集合不扩展，复用 `channelPush:create`）。
- `.planning/ROADMAP.md` §Phase 34 — Goal 与 4 条 Success Criteria（行 227-238）。
- `.planning/STATE.md` — 当前位置 Phase 34，v1.6 已完成 Phase 32/33。

### Phase 22（v1.3）参考实现 — 必须研读
- `.planning/phases/22-excel/22-CONTEXT.md` — 前端解析 + 后端 JSON rows 模式的全部决策（D-01 ~ D-22）；Phase 34 是其在渠道推送场景的镜像。
- `.planning/phases/22-excel/22-RESEARCH.md` — SheetJS 二维数组模式、表头校验、日期序列号兼容、`createMany` 与 `skipDuplicates` 的拒绝。
- `.planning/phases/22-excel/22-VERIFICATION.md` — 必须验证的功能点清单（表头偏移、空行跳过、错误行号、partial success）。
- `frontend/src/components/visit/visitImport.ts` — 解析/校验/重复 key 纯函数实现模板。
- `frontend/src/components/visit/VisitImportDialog.vue` — 对话框 UI / 预览 / 移动端 maximized 模式模板。
- `frontend/src/pages/__tests__/VisitPage.test.ts`、`frontend/src/components/visit/__tests__/visitImport.test.ts`、`frontend/src/stores/__tests__/visit.test.ts` — 测试文件结构与覆盖范围模板。
- `backend/src/modules/visit/visit.route.ts` — `/visits/import` 端点形态（JSON rows、`additionalProperties: false`、`createdCount`/`total` 响应）。
- `backend/src/modules/visit/__tests__/visit-import.test.ts` — 负向契约测试（拒绝 multipart/upload/skipDuplicates）模板。

### Phase 32 后端契约（已交付 — Phase 34 在此之上扩展）
- `.planning/phases/32-api-rbac/32-04-SUMMARY.md` — `/api/v1/channel-push` 端点表、`duplicateHints` 返回结构、PERM-03 权限矩阵。
- `.planning/phases/32-api-rbac/32-VERIFICATION.md` — Phase 32 must-have 验证表与关键事实清单。
- `backend/src/modules/channel-push/channel-push.route.ts` — 既有路由（`POST /`、`PATCH /:id`、`POST /:id/cancel`、附件 CRUD）；**Phase 34 在此文件追加 `POST /batch-import`**。
- `backend/src/modules/channel-push/channel-push.service.ts` — `createChannelPush / editChannelPush / cancelChannelPush / listMyChannelPushes` 服务签名；**Phase 34 在此追加 `batchCreateChannelPushes`**。
- `backend/src/modules/channel-push/channel-push-dedup.service.ts` — `findChannelPushDuplicates` 返回结构；批量导入聚合时复用。
- `backend/src/modules/channel-push/channel-push.constants.ts` — `CHANNEL_PUSH_STATUSES`、状态枚举与默认值。
- `backend/prisma/schema.prisma` (`ChannelPush*` 模型部分) — 字段类型、状态枚举（**Phase 34 不新增 migration**）。

### Phase 33 前端骨架（已交付）
- `.planning/phases/33-ui/33-CONTEXT.md` — 渠道商路由/菜单/store/类型/组件分层决策；**Phase 34 在 `ChannelPushPage.vue` 工具栏追加导入入口**。
- `frontend/src/pages/ChannelPushPage.vue` — 列表页（filter-bar + 桌面表格 + 移动卡片）；导入按钮挂这里。
- `frontend/src/stores/channelPush.ts` — 既有 Pinia store（`fetchMine` / `create` / 等）；**Phase 34 追加 `batchImport` action**。
- `frontend/src/types/channelPush.ts` — 类型定义；**Phase 34 在此扩展 import 相关类型**（不新建文件）。
- `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue` — 已实现的跨记录重复展示组件；批量导入响应中的 `duplicateHints` 直接复用。
- `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue`、`ChannelPushStatusChip.vue` — 不在批量导入流程内（导入不带附件、不需要状态 chip 展示）。

### 共享前端约定
- `frontend/CLAUDE.md` — 路由 / store / 组件分层约定。
- `frontend/src/boot/axios.ts` — axios 实例 + token 刷新 + 全局错误 Notify；store 不重复 Notify。
- `frontend/src/composables/useResponsive.ts` — `isDesktop / isMobile` 判断。
- `frontend/package.json` — `xlsx ^0.18.5` 已安装（Phase 22 引入），**不需要再装新依赖**。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

| 资产 | 路径 | 用法 |
|---|---|---|
| `xlsx` 解析依赖 | `frontend/package.json` | 已装 ^0.18.5，直接 `import * as XLSX from 'xlsx'` |
| Visit 解析模块（直接对照镜像） | `frontend/src/components/visit/visitImport.ts` | 拷贝结构 → 改 8 列表头 + ChannelPush 字段 → 改重复 key 为 `(studentName, studentPhone)` |
| Visit 导入弹窗（直接对照镜像） | `frontend/src/components/visit/VisitImportDialog.vue` | 拷贝结构 → 改预览面板列、改 store action、改文案 |
| 列表页（导入入口宿主） | `frontend/src/pages/ChannelPushPage.vue` | 在工具栏 toolbar 追加「Excel 批量导入」按钮，绑 `v-perm="'channelPush:create'"`、点击打开 `ChannelPushImportDialog` |
| Pinia store（追加 action） | `frontend/src/stores/channelPush.ts` | 追加 `batchImport(rows)` + `importLoading` 状态；成功后调 `fetchMine(filters)` |
| 类型定义（追加 import 类型） | `frontend/src/types/channelPush.ts` | 追加 `CHANNEL_PUSH_IMPORT_HEADERS`、preview/error/payload 类型；不改既有类型 |
| 跨记录重复对话框 | `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue` | 直接复用展示后端返回的 `duplicateHints[]` |
| 后端单条创建（被批量复用） | `backend/src/modules/channel-push/channel-push.service.ts#createChannelPush` | `batchCreateChannelPushes` 内部循环调用，每行独立事务 |
| 后端 dedup 查询 | `backend/src/modules/channel-push/channel-push-dedup.service.ts#findChannelPushDuplicates` | 每行执行 → 聚合到响应级 `duplicateHints[]` |
| 后端权限守卫 | `backend/src/middlewares/auth.ts#authGuard('channelPush:create')` | 复用，不新增权限码 |
| 全局 axios 错误兜底 | `frontend/src/boot/axios.ts` | 拦截 401/403/422 自动 Notify，store/组件层不重复处理 |

### Established Patterns

- **前端解析 / 后端校验**：浏览器解析 Excel → 标准化 JSON rows → 后端二次校验后入库；Phase 22 已固化此模式，禁止后端 Excel 解析或文件上传。
- **行级错误带 Excel 行号**：错误对象始终带 `rowNumber`（Excel 原始 1-based 行号），便于用户在原表中定位。
- **Partial success**：单行失败不回滚已成功行，响应携带 `failedRows`；与 v1.3 visit 一致。
- **payload 严格收口**：写入 API 接受 `additionalProperties: false`，前端 store 在调用前清洗 payload；负向测试用 grep 钉住后端不接受额外字段。
- **测试三件套**：纯函数解析单测 + store action 契约测试 + 页面/组件交互测试，避免只在 .vue 里堆逻辑。
- **store action 命名**：与后端端点 1:1 对齐（`batchImport` ↔ `POST /channel-push/batch-import`）。
- **重复策略**：仅提示不阻止；与 v1.3 visit、v1.6 单条提交完全一致。

### Integration Points

- **侵入面**（Phase 34 新增/修改清单）：
  - 后端新增：`channel-push.route.ts` 追加 `/batch-import` 端点；`channel-push.service.ts` 追加 `batchCreateChannelPushes`；新增 route/service 测试文件。
  - 前端新增：`frontend/src/components/channel-push/channelPushImport.ts`（解析模块）+ `ChannelPushImportDialog.vue`（弹窗）+ 三个测试文件。
  - 前端修改：`ChannelPushPage.vue`（追加按钮 + dialog 挂载）、`stores/channelPush.ts`（追加 action）、`types/channelPush.ts`（追加 import 类型）。
- **不动**：路由表、菜单、`MainLayout`、auth/RBAC seeds、Prisma schema、附件服务、状态机、Phase 33 已交付的提交/编辑/撤回流程。

</code_context>

<specifics>
## Specific Ideas

- **风格定位**：Excel 批量导入对话框的视觉与交互节奏与 `VisitImportDialog.vue` 完全镜像（同一团队最近交付、用户已熟悉）。
- **入口按钮文案**：「Excel 批量导入」，图标 `upload_file`（与 v1.3 visit 「导入 Excel」+ `attach_file` 区分清晰）。
- **预览面板摘要卡**：表头状态 / 有效行数 / 无效行数 / 文件内重复数（4 张并排卡片，与 v1.3 一致）。
- **重复提示文案**：与 Phase 33 单条提交一致 — "检测到 N 条疑似重复推送，提交已成功，请人工核对是否需要撤回"。
- **批量上限文案**：超 500 行时阻断，提示"单次批量导入不超过 500 行；请拆分文件后重试"。
- **空表头第 1 行兼容**：第 1 行可以是合并标题（如「学员推送批量导入」）也可以为空；解析逻辑只严格校验第 2 行。
- **渠道商外部用户友好性**：错误文案要明确指向 Excel 列名而非字段名（"第 5 行 手机号 不能为空" 而非 "第 5 行 studentPhone required"）。

</specifics>

<deferred>
## Deferred Ideas

- **Excel 模板下载**：Phase 22 未做、Phase 34 同样不做；如需后置到 EXPORT 里程碑或独立增强 ticket。
- **附件批量上传**：Excel 不承载文件；附件继续走 Phase 33 的单条提交流程。
- **后端 Excel 解析 / 文件存储 / 异步导入任务 / 进度推送**：与 Phase 22 决策一致，明确不引入。
- **数据库唯一约束 / 自动合并 / `skipDuplicates`**：v1.6 Key Decision 锁定"仅提示不阻止"；不引入。
- **跨历史库批量查重接口**：当前 dedup 服务已支持单行查询；批量级跨历史聚合可后置为独立增强。
- **接收人审核 UI**：Phase 35。
- **站内通知 / 跨角色只读可见性**：Phase 36。
- **导入历史日志 / 导入批次追踪**：当前每行独立创建，无 batch 实体；如需批次追踪可后置到 STAT 里程碑。

### Reviewed Todos (not folded)

无（`todo match-phase 34` 返回 0 条）。

</deferred>

---

*Phase: 34-excel*
*Context gathered: 2026-05-06*
