# Phase 34 Research: Excel 批量推送导入

## Research Summary

Phase 34 在 Phase 33 已交付的渠道商前端骨架与 Phase 32 后端契约之上，新增「Excel 批量导入」入口。实现方式严格镜像 Phase 22（v1.3 到访 Excel 导入）：浏览器使用既有 `xlsx ^0.18.5` 解析、严格校验 8 列表头、产出标准化 `ChannelPushWritePayload[]` 预览，确认后调用新增的 `POST /api/v1/channel-push/batch-import` JSON 端点；后端 partial-success 模式（每行单事务，复用 `createChannelPush` + `findChannelPushDuplicates`）按行独立创建 ChannelPush 记录、聚合 `duplicateHints[]`、返回 `failedRows[]`。

**Critical pre-existing constraint**: `backend/src/modules/channel-push/channel-push.service.ts:104` 中 `normalizePhone` 已经强制中国大陆手机号格式 `/^1[3-9]\d{9}$/`（自动剥离 +86 / 86 / 空格 / 括号 / 连字符）；CONTEXT.md D-07 仅约束**前端 import 预校验**保持 lenient，但**后端 batch-import 必复用** `normalizeChannelPushWriteInput`，所以不合规的手机号会落入 `failedRows[]` 而不是 `validRows`。这必须在 RESEARCH.md / 计划 / 测试中显式承认（避免实现时复制 Phase 22 模式后误删后端校验）。

**关键参考实现**: `frontend/src/components/visit/visitImport.ts`、`frontend/src/components/visit/VisitImportDialog.vue`、`backend/src/modules/visit/visit.route.ts` (`/visits/import`)、`backend/src/modules/visit/__tests__/visit-import.test.ts`。

## Confirmed Contracts

### Backend — 新增 1 个端点

**Path**: `POST /api/v1/channel-push/batch-import`
**Auth**: `authGuard('channelPush:create')`（复用现有权限码，与 PERM-01/02 保持一致）
**Module**: 追加到 `backend/src/modules/channel-push/channel-push.route.ts` 现有 `channelPushModule` Elysia group 内。

**Request body schema** (Elysia TypeBox)：

```ts
export const channelPushBatchImportBody = t.Object(
  {
    rows: t.Array(channelPushWriteBody, { minItems: 1, maxItems: 500 }),
  },
  { additionalProperties: false },
);
```

约束：`rows.length` ∈ [1, 500]；每行复用既有 `channelPushWriteBody`（**禁止**为 import 单独定义新 schema）；禁止携带 `id / channelPartnerId / status / submittedAt / reviewActions / attachments / failedRows / duplicateHints` 等服务端字段；`additionalProperties: false` 兜底。

**Response shape** (TypeScript):

```ts
{
  createdCount: number;        // 实际成功入库的行数
  total: number;               // 提交的有效行总数 = rows.length
  failedRows: Array<{
    index: number;             // 0-based 原始 rows 数组下标
    reason: string;            // 业务可读理由 — 直接来自 BizError.message
    code?: string;             // BizError.code（CHANNEL_PUSH_PHONE_INVALID 等）
  }>;
  duplicateHints: ChannelPushDuplicateHint[];   // 跨已有记录的聚合提示，按 (id) 去重
}
```

`ChannelPushDuplicateHint` 类型已在 `frontend/src/types/channelPush.ts:57-63` 定义并由 `findChannelPushDuplicates` 的 `select` 直接返回兼容形态。

**Error codes**:
- `400 CHANNEL_PUSH_BATCH_EMPTY` — 空 rows 数组（由 TypeBox `minItems: 1` 兜底）
- `400 CHANNEL_PUSH_BATCH_TOO_LARGE` — 超 500 行（由 TypeBox `maxItems: 500` 兜底）
- `403` — 无 `channelPush:create` 权限（由 `authGuard` 兜底）
- `422 CHANNEL_PARTNER_NOT_BOUND` — 渠道商未绑定主接收人（来自 `createChannelPush`）
- 单行错误（`422 CHANNEL_PUSH_FIELD_REQUIRED / CHANNEL_PUSH_PHONE_INVALID / CHANNEL_PUSH_AGE_INVALID / CHANNEL_PUSH_FIELD_TOO_LONG` 等）**不抛出**整体 4xx，而是吞回 `failedRows[]` 内（partial success 语义）。

### Backend — 新增 1 个 service 函数

**File**: `backend/src/modules/channel-push/channel-push.service.ts`（追加，不重写）

```ts
export async function batchCreateChannelPushes(
  currentUser: ChannelPushActor,
  rows: ChannelPushWriteInput[],
): Promise<{
  createdCount: number;
  total: number;
  failedRows: Array<{ index: number; reason: string; code?: string }>;
  duplicateHints: DuplicateHint[];
}>
```

实现策略：

1. **Pre-flight**：检查 `ChannelPartnerProfile` 绑定一次（避免 500 行循环里重复查），未绑定立即抛 `CHANNEL_PARTNER_NOT_BOUND`（整体 422，不进入 partial success）。
2. **Loop over rows**：每行 `try { await createChannelPush(currentUser, row, []) } catch (e) { failedRows.push({ index, reason: e.message, code: e.code }) }`。**不传 attachments**（Excel 不承载文件）。
3. **聚合 duplicateHints**：把每行返回的 `duplicateHints` 合并到一个 `Map<id, DuplicateHint>` 去重（同一已有推送可能被多行重复命中），最后 `Array.from(map.values())`。
4. **不引入 batch 级跨行事务**：单行失败不回滚已成功行；与 Phase 22 `createMany`-style partial success 等价。
5. **不绕过既有校验**：行内必须走 `createChannelPush` → `normalizeChannelPushWriteInput` → `normalizePhone`，禁止直接 `prisma.channelPush.createMany`（会跳过审计、dedup、submitAction 时间线，违反 Phase 32 决策）。

### Frontend — 新增 / 修改文件清单

**新增**:

1. `frontend/src/components/channel-push/channelPushImport.ts` — 纯函数模块（mirror `visitImport.ts`），导出：
   - `CHANNEL_PUSH_IMPORT_HEADERS: readonly string[]`（8 列字符串）
   - `validateChannelPushImportHeaders(actualHeaders: unknown[])` → `{ headerValid, expectedHeaders, actualHeaders, headerErrors }`
   - `parseChannelPushImportRows(rows: unknown[][], fileName?: string): ChannelPushImportPreview`
   - `MAX_IMPORT_ROWS = 500` 常量
2. `frontend/src/components/channel-push/ChannelPushImportDialog.vue` — UI（mirror `VisitImportDialog.vue`），桌面 920px 弹窗 / 移动 maximized，预览 4 张摘要卡 + tabs（有效/无效/文件内重复）+ 确认按钮。
3. `frontend/src/components/channel-push/__tests__/channelPushImport.test.ts` — 单测覆盖 D-25 项。
4. `backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` — route 负向 + 正向。
5. `backend/src/modules/channel-push/__tests__/channel-push.batch-service.test.ts` — service partial success + dedup 聚合（如已有 `channel-push.service.test.ts` 则可追加 describe block）。

**修改**:

1. `frontend/src/types/channelPush.ts` — 追加 import 类型（不新建文件，与 D-19 一致）：
   ```ts
   export const CHANNEL_PUSH_IMPORT_HEADERS = [
     '学员姓名', '手机号', '年龄', '学历', '性别', '意向状态', '意向说明', '备注',
   ] as const;
   export interface ChannelPushImportRowError { rowNumber: number; field: string; message: string }
   export interface ChannelPushImportInvalidRow { rowNumber: number; rawCells: string[]; errors: ChannelPushImportRowError[] }
   export interface ChannelPushImportValidRow { rowNumber: number; payload: ChannelPushWritePayload }
   export interface ChannelPushImportDuplicateWarning { key: string; rowNumbers: number[]; studentName: string; studentPhone: string }
   export interface ChannelPushImportPreview {
     fileName?: string;
     headerValid: boolean;
     expectedHeaders: readonly string[];
     actualHeaders: string[];
     headerErrors: string[];
     validRows: ChannelPushImportValidRow[];
     invalidRows: ChannelPushImportInvalidRow[];
     duplicateWarnings: ChannelPushImportDuplicateWarning[];
     overLimit?: boolean;
   }
   export interface ChannelPushBatchImportRequest { rows: ChannelPushWritePayload[] }
   export interface ChannelPushBatchImportFailedRow { index: number; reason: string; code?: string }
   export interface ChannelPushBatchImportResponse {
     createdCount: number;
     total: number;
     failedRows: ChannelPushBatchImportFailedRow[];
     duplicateHints: ChannelPushDuplicateHint[];
   }
   ```
2. `frontend/src/stores/channelPush.ts` — 追加 `batchImport(rows)` action + `importLoading` 状态；调用成功后 `await fetchMine(filters)` 刷新。
3. `frontend/src/pages/ChannelPushPage.vue` — 工具栏追加 `<q-btn label="Excel 批量导入" icon="upload_file" v-if="auth.hasPerm('channelPush:create')" @click="importDialog = true" />` + `<ChannelPushImportDialog v-model="importDialog" />`。

## Reusable Code Map

| Phase 22 source (visit) | Phase 34 target (channel-push) | Key changes |
|---|---|---|
| `frontend/src/components/visit/visitImport.ts` | `frontend/src/components/channel-push/channelPushImport.ts` | 15 列 → 8 列；`VISIT_IMPORT_HEADERS` → `CHANNEL_PUSH_IMPORT_HEADERS`；删除日期解析（无日期字段）；删除 `consultant`/`receptionDate` 重复 key；改为 `(studentName, studentPhone)` 重复 key；新增 500 行上限断言 |
| `frontend/src/components/visit/VisitImportDialog.vue` | `frontend/src/components/channel-push/ChannelPushImportDialog.vue` | store 调用 `useChannelPushStore().batchImport` → `useVisitStore().importVisits`；列表列从 15 → 8；保留摘要卡 + tabs 结构；移除日期专属错误展示；新增"超 500 行阻断"摘要卡 |
| `frontend/src/components/visit/__tests__/visitImport.test.ts` | `frontend/src/components/channel-push/__tests__/channelPushImport.test.ts` | 测试用例对齐：表头偏移、空行、年龄整数边界、文件内重复 key、500 行上限 |
| `frontend/src/pages/VisitPage.vue` 工具栏导入按钮 | `frontend/src/pages/ChannelPushPage.vue` 工具栏 | 权限码 `visit:import` → `channelPush:create`（D-11）；图标 `attach_file` → `upload_file`；文案"导入 Excel" → "Excel 批量导入" |
| `backend/src/modules/visit/visit.route.ts` `/visits/import` | `backend/src/modules/channel-push/channel-push.route.ts` `/batch-import` | guard `visit:import` → `channelPush:create`；body schema 复用既有 `channelPushWriteBody`（不复制 visit 字段）；响应增加 `failedRows` 与 `duplicateHints`（visit 没有这两项） |
| `backend/src/modules/visit/__tests__/visit-import.test.ts` | `backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts` | 负向测试覆盖：拒绝 multipart/file、拒绝 `additionalProperties`、拒绝超 500 行、拒绝空 rows、拒绝带 `id/channelPartnerId/status` 字段 |
| `frontend/src/stores/__tests__/visit.test.ts` `importVisits` 用例 | `frontend/src/stores/__tests__/channelPush.test.ts` 追加 `batchImport` 用例 | payload 严格为 `{ rows }`；`importLoading` 切换；成功后 `fetchMine` 调用 |

## Implementation Pitfalls

### 1. 后端手机号强校验已存在（HIGHEST RISK）
- **位置**: `backend/src/modules/channel-push/channel-push.service.ts:104` `normalizePhone`，使用 `/^1[3-9]\d{9}$/`，自动剥离 `+86` / `86` / 空格 / 括号 / 连字符。
- **影响**: CONTEXT.md D-07 称"手机号不做正则强校验"针对**前端 import 预校验**；后端实际**仍强制中国大陆手机格式**。
- **应对**: 前端 `parseChannelPushImportRows` 不引入手机正则，把所有非空手机号传给后端；不合规手机号会被后端 `createChannelPush` 抛 `CHANNEL_PUSH_PHONE_INVALID` → 落入 `failedRows[]`。文档 / 错误文案需明确告知用户"如失败原因为手机号格式不正确，请确认是否为大陆手机号"。
- **测试要求**: backend `batch-service.test.ts` 必须包含一条用例：3 行有效 + 1 行手机号 `12345678901` → `createdCount=3, failedRows.length=1, failedRows[0].code='CHANNEL_PUSH_PHONE_INVALID'`。

### 2. Title row（第 1 行）兼容
- v1.3 visitImport 中 `parseVisitImportRows` 直接 `rows[1]` 取第 2 行作表头，**不**校验第 1 行内容。Phase 34 沿用同一策略，但要在测试里覆盖三种 fixture：
  1. 第 1 行为合并标题（如「学员推送批量导入」），第 2 行表头
  2. 第 1 行为空行，第 2 行表头
  3. 直接第 1 行就是表头（**会失败**，因为期望表头在 `rows[1]`）— 测试要确认这种场景被识别为 headerInvalid。
- 文档应在 ChannelPushImportDialog 顶部加一行 helper text："第 1 行可填合并标题，第 2 行必须为表头，第 3 行起为数据。"

### 3. Partial success 错误索引
- `failedRows[i].index` 是**前端提交的 rows 数组下标**（0-based），不是 Excel 原始行号。
- 前端 store action 拿到 `failedRows` 后必须把 `index` 映射回 `validRows[index].rowNumber`（Excel 原始 1-based 行号），再展示给用户。
- 测试要求：`channelPushImport.test.ts` 单测中预校验阶段的 `rowNumber` 不能丢失；`store.batchImport` 测试中模拟后端 `failedRows[{index:1, reason:...}]`，断言 UI 层错误信息 `第 X 行 ...` 中 X 来自 `validRows[1].rowNumber`。

### 4. duplicateHints 跨行去重
- `findChannelPushDuplicates` 默认按 `(channelPartnerId, studentName, studentPhone)` 查询并 `take: 10`。
- 多行 import 同一学员（文件内重复）时，每行都会返回相同的已有记录。
- service 必须 `Map<existingId, DuplicateHint>` 去重，避免响应里 `duplicateHints` 出现重复 id。
- 测试要求：`batch-service.test.ts` 必须包含一条用例：seed 1 条已有 push (name=A, phone=...)；提交 3 行均为 (name=A, 同手机号) → 响应 `duplicateHints.length === 1`（不是 3）。

### 5. 500 行上限的两点防御
- **前端预防**：`parseChannelPushImportRows` 当 `validRows.length > 500` 时设置 `preview.overLimit = true` 并阻断"确认导入"按钮，文案"单次批量导入不超过 500 行；请拆分文件后重试"。
- **后端兜底**：TypeBox `maxItems: 500` 在反序列化阶段拒绝；测试中模拟前端被绕过的请求（手工构造 501 行 JSON）应返回 400。
- 不依赖单一防御点。

### 6. JSON 而非 multipart
- 既有 `POST /channel-push` 是 multipart（含附件），但 `/batch-import` **必须是 application/json**。
- TypeBox body 仅 `t.Object({ rows })`，不引入 `t.Files`。
- 前端 axios 调用：`api.post('/channel-push/batch-import', { rows })` —— 不要复用 ChannelPushFormPage 的 FormData 构造。
- 负向测试：发送 `multipart/form-data` 应得到 400。

### 7. axios 全局错误拦截器兼容
- `frontend/src/boot/axios.ts` 对 4xx 默认弹 `Notify.create({type:'negative', message: err.response.data.message})`。
- `batchImport` 触发的整体错误（`CHANNEL_PARTNER_NOT_BOUND` / `BATCH_TOO_LARGE` / 403）会被全局兜底 Notify。
- 但 200 OK + `failedRows.length > 0` 不是 axios 错误，**不会触发**全局拦截 — 必须由 `ChannelPushImportDialog` 自己渲染 failedRows 清单。

### 8. ChannelPushDuplicateDialog 复用边界
- Phase 33 已交付 `ChannelPushDuplicateDialog.vue`（展示单条提交的 `duplicateHints[]`）。
- 批量导入响应携带 N 条 `duplicateHints`，**类型与单条相同**（`ChannelPushDuplicateHint[]`），可直接复用同一组件。
- 集成点：在 `ChannelPushImportDialog.vue` 中，import 成功且 `duplicateHints.length > 0` → 关闭导入弹窗 + 弹出 `ChannelPushDuplicateDialog`。
- **不要修改** Phase 33 dialog 的 props / signal — 跨 phase 兼容是硬约束。

### 9. xlsx 安全性
- 既已使用，但需要：`XLSX.read(arrayBuffer, { type: 'array', cellDates: false })` — `cellDates: false` 因为字段中无日期字段（与 visit 不同），避免 SheetJS 把"3-1"误识别为日期。
- 测试要求：`channelPushImport.test.ts` 要有一条用例验证 Excel 中"备注"列填 "2026-05" 字样时不会被解析成 Date 对象，最终 payload `remark === "2026-05"`（string）。

### 10. SheetJS sheet_to_json header:1 的空白单元格
- `XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })` 会跳过整行空白；但保留中间空白单元格为 `undefined`。
- 行级校验时 `value === undefined` 必须按"未填写"处理，不能 `String(undefined)` 得到 `"undefined"` 字符串塞进 payload。

## Validation Architecture

**Nyquist sampling strategy**（参考 Phase 22 `22-VERIFICATION.md` Dimension 8 模板）：

### Dimension 1 — Header parsing samples
- ✓ 第 1 行合并标题 + 第 2 行表头精确匹配 → headerValid=true
- ✓ 第 1 行空 + 第 2 行表头精确匹配 → headerValid=true
- ✗ 第 1 行表头（无第 0 行偏移） → headerValid=false（缺少标题或顺序错乱）
- ✗ 表头 8 列顺序错乱（学员姓名、年龄、手机号、...） → headerValid=false 且 headerErrors 列出每列差异
- ✗ 表头 7 列（缺备注） → headerValid=false
- ✗ 表头 9 列（多一列） → 第 9 列被忽略；前 8 列匹配则通过（与 v1.3 一致）

### Dimension 2 — Row count edges
- 0 valid rows（仅表头无数据） → `validRows=[]`，按钮 disabled
- 1 valid row → 提交后端，断言 `createdCount=1, total=1`
- 500 valid rows → 通过 `maxItems` 校验，端到端成功
- 501 valid rows → 前端 `overLimit=true` 阻断；后端兜底返回 400

### Dimension 3 — Permission boundaries
- ✓ CHANNEL_PARTNER 用户调用 → 200 OK
- ✗ 普通员工（无 channelPush:create）调用 → 403
- ✗ 未登录调用 → 401
- ✗ CHANNEL_PARTNER 未绑定 primaryRecipient → 422 CHANNEL_PARTNER_NOT_BOUND

### Dimension 4 — Partial success acceptance
- 提交 5 行：3 行有效 + 1 行姓名空 + 1 行手机号 `00000` → `createdCount=3, failedRows=[{index:3, code:'CHANNEL_PUSH_FIELD_REQUIRED'}, {index:4, code:'CHANNEL_PUSH_PHONE_INVALID'}]`
- 验证已成功的 3 行已写入 DB（`prisma.channelPush.count` 增加 3）
- 验证失败行不在 DB（`prisma.channelPush.findMany({ where: { studentName: '失败姓名' } })` 返回空）

### Dimension 5 — Duplicate hint aggregation
- Seed 1 条已有 push (id=100, name="张三", phone="13800138000")
- 提交 3 行均为 (name="张三", phone="13800138000") → `createdCount=3, duplicateHints.length=1, duplicateHints[0].id=100`
- 提交 2 行：(name="张三", phone="13800138000") + (name="李四", phone="13800138001"，无既有重复) → `duplicateHints.length=1`

### Dimension 6 — Frontend in-file duplicate detection
- 文件内 3 行同 (姓名+手机号) → `preview.duplicateWarnings.length=1, duplicateWarnings[0].rowNumbers=[3,4,5]`
- 重复不影响有效性 → `validRows.length=3, invalidRows.length=0`
- 用户可正常确认导入

### Dimension 7 — Goal-backward (must_haves)
- M1: 渠道商在 ChannelPushPage 工具栏可见「Excel 批量导入」按钮（`channelPush:create` 权限）
- M2: 上传 .xlsx 后预览面板显示有效/无效/文件内重复行数
- M3: 确认导入后调用 `POST /channel-push/batch-import` 携带严格 `{ rows }` payload
- M4: 后端响应 createdCount + total + failedRows + duplicateHints 全部展示
- M5: 成功导入的记录立即出现在 fetchMine 返回的列表中，状态为 PENDING
- M6: 重复提示通过 ChannelPushDuplicateDialog 展示
- M7: 500 行上限在前端阻断 + 后端兜底
- M8: 业务错误（未绑定接收人 / 403 / 字段超长）通过 axios 全局拦截器统一 Notify

## Test Strategy

### Frontend tests

1. **`frontend/src/components/channel-push/__tests__/channelPushImport.test.ts`** (新建)
   - `validateChannelPushImportHeaders` — 8 列严格匹配、列顺序错乱、缺列、多列
   - `parseChannelPushImportRows` —
     - title row 兼容（合并标题 / 空行 / 缺失）
     - 空行整行跳过（`blankrows: false` + 自定义判断）
     - `studentName` 必填、`studentPhone` 必填（前端不做正则）、`studentAge` 整数 1~120
     - 字段超长 → invalidRow
     - 文件内 (姓名+手机号) 重复 key 计算
     - 500 行边界 → `overLimit=false`
     - 501 行边界 → `overLimit=true`，按钮 disabled
     - SheetJS `cellDates: false` 防御："2026-05" remark 字段保持 string

2. **`frontend/src/stores/__tests__/channelPush.test.ts`** (扩展，已有 fetch/create/etc 测试)
   - `batchImport(rows)` payload 严格为 `{ rows }`，无额外字段
   - `importLoading` 状态切换正确
   - 成功后调用 `fetchMine(currentFilters)` 刷新
   - failedRows 透传（不 throw，由组件渲染）
   - 整体错误（401/403/422 CHANNEL_PARTNER_NOT_BOUND）由 axios 拦截器 Notify，store 不重复 Notify

3. **`frontend/src/pages/__tests__/ChannelPushPage.test.ts`** (扩展)
   - `channelPush:create` 权限存在 → 「Excel 批量导入」按钮可见
   - 缺权限 → 按钮隐藏
   - 点击按钮 → `ChannelPushImportDialog` 打开
   - dialog 关闭后调 fetchMine 刷新

### Backend tests

4. **`backend/src/modules/channel-push/__tests__/channel-push.batch-import.test.ts`** (新建)
   - 负向：拒绝 multipart Content-Type（必须 JSON）
   - 负向：rows 内携带 `id` / `channelPartnerId` / `status` / `submittedAt` → 422 (additionalProperties: false)
   - 负向：空 rows（`{rows:[]}`）→ 400
   - 负向：501 行 → 400 (TypeBox maxItems)
   - 负向：未登录 → 401
   - 负向：普通员工调用 → 403
   - 正向：CHANNEL_PARTNER 提交 5 行（3 有效 + 2 字段非法）→ 200, createdCount=3, failedRows.length=2
   - 正向：响应 shape 严格为 `{ createdCount, total, failedRows, duplicateHints }`，无额外字段
   - 正向：身份从 JWT 取（mock currentUser.id），不接受 body 内 channelPartnerId

5. **`backend/src/modules/channel-push/__tests__/channel-push.service.test.ts`** (扩展，追加 describe block 或新建 `batch.test.ts`)
   - `batchCreateChannelPushes` partial success 不回滚已成功行（tx 边界为单行）
   - 单行抛 `CHANNEL_PUSH_PHONE_INVALID` 落入 failedRows.code 字段
   - 渠道商未绑定 → 整体抛 `CHANNEL_PARTNER_NOT_BOUND`，不进入 partial success
   - 500 行性能基线（`< 5s` 完成；不强制，可 skip）
   - duplicateHints 跨行去重（Map 聚合）

6. **`backend/src/modules/channel-push/__tests__/channel-push-dedup.service.test.ts`** (扩展，已有)
   - 既有测试已覆盖单行 `findChannelPushDuplicates`；service 聚合逻辑测试归属 #5

## Open Questions

无。CONTEXT.md 26 条决策已覆盖全部实现选择；本研究仅在 Pitfall #1（手机号强校验）一项揭示了 CONTEXT.md D-07 的语义边界（"前端 lenient + 后端 strict + partial success 兜住"），不构成决策歧义而是**显式承认既有后端契约**。

ASSUMED：CONTEXT.md D-07 中"手机号不做正则强校验"仅约束**前端 import 解析阶段**；后端 `normalizePhone` 既有强校验保留不变，不规手机号通过 partial success 路径返回 `failedRows`。如该假设错误（即 CONTEXT.md 真意是连后端也放宽），需要回到 discuss-phase 重新讨论 — 但这与 Phase 32/33 既有契约和 v1.6 PROJECT key decision 矛盾，预期不会改。

## RESEARCH COMPLETE
