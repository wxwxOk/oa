# Phase 22: Excel 导入解析 + 预览入库 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 22-Excel 导入解析 + 预览入库
**Areas discussed:** 导入入口与权限, Excel 解析与表头校验, 字段标准化与行级校验, 导入预览与确认入库, 潜在重复提醒, 前端数据层与测试

---

## 导入入口与权限

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `VisitPage.vue` | Add a `visit:import`-gated import button in the existing visit page header and open a dedicated dialog. Reuses Phase 21 page/state patterns. | ✓ |
| New route/page | Create a separate import route. More isolated, but adds navigation overhead and duplicates context. | |
| Reuse create permission | Show import whenever `visit:create` is available. Simpler but violates the locked permission split. | |

**User's choice:** `[auto]` Selected the recommended existing-page, `visit:import`-gated dialog approach.
**Notes:** Phase 22 should not add a new menu or expose stats/export entry points.

---

## Excel 解析与表头校验

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side SheetJS strict parser | Install frontend `xlsx`, read the first sheet with FileReader + `XLSX.read`, parse as a 2D matrix, ignore row 1, and require exact row-2 15-column headers. | ✓ |
| Backend upload/parser | Upload the Excel file to the backend for parsing. Conflicts with Phase 20 backend contract and adds storage/upload complexity. | |
| Flexible header matching | Allow aliases or reordered columns. More forgiving, but risks silent field mapping errors for the fixed sample sheet. | |

**User's choice:** `[auto]` Selected strict client-side SheetJS parsing.
**Notes:** Header-row offset and exact field order are high-risk and must be tested.

---

## 字段标准化与行级校验

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal business-blocking validation | Trim strings, normalize empty values to null, require name, validate integer age, normalize reception/trial dates to `YYYY-MM-DD`. | ✓ |
| Full business dictionary validation | Validate statuses, channel partners, and consultants against dictionaries. Out of scope because v1.3 intentionally avoids dictionaries. | |
| Backend-only validation | Let the backend reject all bad rows after submit. Simpler frontend, but fails the preview/error requirement. | |

**User's choice:** `[auto]` Selected minimal row-level validation aligned with backend write constraints.
**Notes:** Optional business fields may be blank; status text remains free-form.

---

## 导入预览与确认入库

| Option | Description | Selected |
|--------|-------------|----------|
| Submit valid rows only | Preview valid rows, invalid rows, reasons, and duplicate warnings; submit only valid normalized rows after confirmation. | ✓ |
| All-or-nothing preview | Block the entire import when any row is invalid. Safer but less practical for messy historical ledgers. | |
| Import immediately after parse | Fastest, but violates preview and confirmation requirements. | |

**User's choice:** `[auto]` Selected preview-first, submit-valid-rows-only behavior.
**Notes:** Payload must be `{ rows }` only; no raw matrix, file object, preview metadata, or trusted client fields.

---

## 潜在重复提醒

| Option | Description | Selected |
|--------|-------------|----------|
| Warning-only duplicates | Detect potential duplicates by `姓名 + 接待日期 + 咨询师`, display warnings, and still allow user-confirmed import. | ✓ |
| Auto-skip duplicates | Prevent duplicate-looking rows from being submitted. Conflicts with no automatic merge/skip decision and may lose data. | |
| Database uniqueness | Add a unique constraint to enforce no duplicates. Explicitly rejected by Phase 20 because the sample lacks a reliable unique lead ID. | |

**User's choice:** `[auto]` Selected warning-only duplicate detection.
**Notes:** Duplicate warnings do not affect row validity and do not use `skipDuplicates`.

---

## 前端数据层与测试

| Option | Description | Selected |
|--------|-------------|----------|
| Pure helper + store action + focused tests | Put parsing/normalization/duplicate logic in testable helpers, extend visit types/store, and cover import route/payload/UI entry. | ✓ |
| Dialog-only implementation | Keep all logic in `VisitImportDialog.vue`. Faster initially but hard to test and maintain. | |
| End-to-end-only testing | Rely on broad page tests. Lower unit coverage for the riskiest parsing/date behavior. | |

**User's choice:** `[auto]` Selected helper-based implementation with focused tests.
**Notes:** Tests should cover header offset, exact headers, empty rows, date serials/strings, invalid row errors, duplicate warnings, and `/visits/import` store contract.

---

## the agent's Discretion

- Exact preview layout: tabs, table/card density, summary cards, icons, colors and copy.
- Exact helper file naming and component split, as long as parser logic stays unit-testable.
- Error copy can be adjusted to match existing Quasar OA tone.

## Deferred Ideas

- Excel export, template download, backend upload/storage, async background import, automatic dedupe/merge, database unique constraint and history-record batch duplicate lookup.
- Visit stats entry/panel/charts and conversion summaries, reserved for Phase 23.
