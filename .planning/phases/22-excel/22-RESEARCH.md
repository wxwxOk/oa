# Phase 22 Research: Excel 导入解析 + 预览入库

## Research Summary

Phase 22 should implement a frontend-only Excel parsing and preview workflow that submits normalized JSON rows to the existing backend import endpoint. Do not add backend file upload, backend Excel parsing, temporary file storage, automatic dedupe, or dictionary management.

Recommended implementation:

- Install frontend `xlsx` and parse files in the browser with FileReader `readAsArrayBuffer`.
- Use SheetJS to parse the first worksheet and `XLSX.utils.sheet_to_json(sheet, { header: 1 })` to get a two-dimensional array.
- Ignore row 1 title, strictly validate row 2 against the 15 expected headers, and parse data from row 3 onward.
- Normalize valid rows to `VisitWritePayload[]`; keep invalid rows with original Excel row numbers and concrete error reasons.
- Warn for potential duplicates by `name + receptionDate + consultant`, but do not skip, merge, block, upsert, or add uniqueness constraints.
- Confirm import by calling `POST /api/v1/visits/import` through the existing frontend axios base path as `api.post('/visits/import', { rows })`.

## Confirmed Contracts

### Phase and requirements

- `.planning/phases/22-excel/22-CONTEXT.md` locks Phase 22 to Excel parsing, preview, import confirmation and the `visit:import` UI entry.
- `.planning/ROADMAP.md` defines Phase 22 success criteria around `xlsx`, row 1/2/3 offsets, preview, duplicate warnings and confirmed standard rows.
- `.planning/REQUIREMENTS.md` maps `IMPORT-01` through `IMPORT-04` to this phase.
- `.planning/PROJECT.md` and `.planning/research/PITFALLS.md` explicitly reject backend upload/storage, automatic merge, automatic skip, dictionary management and Excel export for this milestone.

### Backend import endpoint

- `backend/src/modules/visit/visit.route.ts` already exposes `/visits/import` under `authGuard('visit:import')`.
- `visitImportBody` accepts only `{ rows: t.Array(visitWriteBody) }`.
- `validateVisitImportRows(body, currentUser.id)` revalidates required `name`, integer `age`, date fields and string normalization, and derives `creatorId` from the current user.
- The route uses `createMany({ data: rowsWithCreator })` and returns `{ createdCount, total }`.
- `backend/src/modules/visit/__tests__/visit-import.test.ts` pins the JSON rows contract and rejects backend `xlsx`, upload, upsert and `skipDuplicates` behavior.

### VisitWritePayload fields

`frontend/src/types/visit.ts` already defines `VisitWritePayload` and `VISIT_WRITE_PAYLOAD_KEYS` for the 15 business fields:

- `name`
- `age`
- `education`
- `gender`
- `channelPartner`
- `consultant`
- `receptionStatus`
- `receptionist`
- `receptionDate`
- `consultationStatus`
- `statusCategory`
- `statusDescription`
- `trialStatus`
- `solution`
- `trialDate`

Import payloads must not include trusted/server fields: `id`, `creatorId`, `creator`, `createdAt`, `updatedAt`.

### Permissions

- The import UI entry must use `visit:import`.
- Do not reuse `visit:create` for importing.
- `/visits` route/menu remains guarded by `visit:list`.
- The backend import endpoint already performs the final `visit:import` authorization check.

## SheetJS / XLSX Parsing Notes

Current SheetJS usage aligns with Phase 22:

```ts
const reader = new FileReader();
reader.onload = (event) => {
  const workbook = XLSX.read(event.target?.result);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
};
reader.readAsArrayBuffer(file);
```

- `readAsArrayBuffer` gives browser-compatible file reading without backend upload.
- `workbook.SheetNames[0]` selects the first sheet.
- `sheet_to_json(sheet, { header: 1 })` returns an array-of-arrays and does not treat the first row as object headers.
- This is required because the sample workbook row 1 is the merged title `学员到访跟踪表`.

Row handling must be fixed:

- Excel row 1: merged title, ignored.
- Excel row 2: strict header row.
- Excel row 3 onward: data rows.
- User-facing row errors must use original Excel row numbers, so the first parsed data row reports as `第 3 行`.

Expected headers, in exact order:

1. 姓名
2. 年龄
3. 学历
4. 性别
5. 渠道商
6. 咨询师
7. 接待状态
8. 接待人
9. 接待日期
10. 咨询后状态
11. 状态类别
12. 状态说明
13. 试听课后状态
14. 解决方案
15. 试听课时间

Date cells may arrive as Excel serial numbers, `Date` instances or strings. Import helpers should normalize `receptionDate` and `trialDate` to `YYYY-MM-DD` without using `toISOString()` or locale-dependent display for business dates.

## Frontend Implementation Pattern

### Types

Extend `frontend/src/types/visit.ts` with import-specific contracts while reusing `VisitWritePayload`:

- `VISIT_IMPORT_HEADERS`
- `VisitImportRowError`
- `VisitImportDuplicateWarning`
- `VisitImportPreview`
- `VisitImportPayload`
- `VisitImportResponse`

Keep `VISIT_WRITE_PAYLOAD_KEYS` as the shared writable field source of truth.

### Pure helper module

Add a testable helper under the visit feature, recommended path:

- `frontend/src/components/visit/visitImport.ts`

Responsibilities:

- validate row 2 headers against `VISIT_IMPORT_HEADERS`
- skip blank data rows
- map row cells to `VisitWritePayload`
- trim strings and convert blanks to `null`
- parse `age` as empty or integer
- normalize `receptionDate` and `trialDate` to `YYYY-MM-DD`
- collect row-level errors with Excel row numbers
- detect duplicate warnings by `name + receptionDate + consultant`
- keep duplicate warnings informational and separate from row validity

### Store

Extend `frontend/src/stores/visit.ts`:

- Add an import loading state such as `importLoading`.
- Add `importVisits(rows: VisitWritePayload[])`.
- Call `api.post('/visits/import', { rows: rows.map(normalizeVisitPayload) })`.
- Return `VisitImportResponse` from the backend.
- Do not submit file objects, raw worksheet matrices, invalid-row errors, duplicate warning metadata or trusted fields.

### Dialog

Add `frontend/src/components/visit/VisitImportDialog.vue` and follow the existing visit dialog style from `VisitFormDialog.vue`:

- desktop normal dialog width
- mobile maximized dialog
- toolbar title and close action
- scrollable preview body
- footer actions

The dialog should show:

- selected filename
- header validation state
- valid row count
- invalid row count
- duplicate warning count
- valid rows preview
- invalid rows with error reasons
- duplicate warnings
- backend import loading/error/success state

Confirm should be enabled when headers are valid and there is at least one valid row. Import failure should keep the dialog open with the preview state intact.

### VisitPage integration

Update `frontend/src/pages/VisitPage.vue`:

- add `导入 Excel` button in the existing page header
- gate it with `v-perm="'visit:import'"` and/or `auth.hasPerm('visit:import')`
- mount `VisitImportDialog`
- on success, notify the user, refresh the current list and refresh filter options
- do not add stats or export UI in this phase

## Validation Architecture

Automated validation should focus on the parser and contract surfaces.

### Dependency gate

- Install dependency during execution: `cd frontend && npm install xlsx`.
- Expected modified dependency files: `frontend/package.json` and the frontend lockfile generated by npm.

### Helper tests

Recommended test path:

- `frontend/src/components/visit/__tests__/visitImport.test.ts`

Required coverage:

- row 1 title ignored
- row 2 exact 15-column header match
- header mismatch blocks import and reports expected/actual headers
- row 3+ data uses original Excel row numbers
- blank row skipping
- string trim and blank-to-null normalization
- age blank, integer and invalid decimal/string cases
- Excel serial date normalization
- date string normalization
- invalid `receptionDate` and `trialDate`
- duplicate warning by `name + receptionDate + consultant`
- duplicate warning does not invalidate rows

### Store tests

Extend `frontend/src/stores/__tests__/visit.test.ts`:

- `importVisits` calls `api.post('/visits/import', { rows: [...] })`.
- Payload excludes file object, raw matrix, preview errors and duplicate metadata.
- Import loading flag resets on success and rejection.

### Type tests

Extend `frontend/src/types/__tests__/visit.test.ts`:

- Replace the Phase 21 negative import-helper assertion with positive import contract checks.
- Keep trusted/server fields excluded from import payload rows.

### Page/component tests

Extend `frontend/src/pages/__tests__/VisitPage.test.ts`:

- Replace Phase 21 negative `导入 Excel` assertion with positive import entry assertions.
- Pin `导入 Excel`, `visit:import`, `VisitImportDialog` and refresh integration.
- Keep negative assertions for `导出 Excel`, `统计` and `/visits/stats`.

### Commands

Focused frontend gate:

```bash
cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts src/types/__tests__/visit.test.ts
```

Full frontend gate:

```bash
cd frontend && npm run build
```

Backend regression gate:

```bash
cd backend && bun test src/modules/visit/__tests__/visit-import.test.ts
```

## Risks and Pitfalls

- Header offset: default object-mode `sheet_to_json` would treat row 1 title as headers and corrupt mapping. Use `{ header: 1 }`.
- Exact headers: loose matching can silently shift fields. Validate all 15 headers in order.
- Date normalization: avoid `toISOString()` and locale formatting for business dates; submit only `YYYY-MM-DD`.
- Invalid rows: do not submit invalid rows; preserve original Excel row number in error messages.
- Duplicate warnings: false positives are possible, so warnings must not change validity or payload.
- Payload trust boundary: backend remains authoritative and derives `creatorId`.
- Permission split: import must use `visit:import`, not `visit:create`.
- Phase 21 test drift: existing tests intentionally assert import is absent; Phase 22 must update those assertions.
- Scope creep: do not add Excel export, template download, backend upload, dictionary management, historical duplicate query, stats panel or automatic dedupe.

## Planning Implications

Recommended split into two plans, matching `.planning/ROADMAP.md`:

### Plan 22-01: Dependency, import contracts and pure parser

- Install `xlsx`.
- Extend import types in `frontend/src/types/visit.ts`.
- Add `frontend/src/components/visit/visitImport.ts`.
- Add focused helper tests and update type tests.
- Main verification: parser/type tests.

### Plan 22-02: Store, dialog, page integration and gates

- Extend `frontend/src/stores/visit.ts` with `importVisits`.
- Add/extend store tests.
- Add `VisitImportDialog.vue`.
- Integrate `VisitImportDialog` into `VisitPage.vue` behind `visit:import`.
- Update page tests.
- Run focused frontend tests, full frontend build and backend import regression.

Planning should avoid backend import changes unless tests reveal a contract mismatch. The safest implementation path is to make the frontend submit exactly what Phase 20 already accepts: normalized `VisitWritePayload[]` rows only.
