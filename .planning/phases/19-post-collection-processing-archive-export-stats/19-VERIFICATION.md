---
phase: 19-post-collection-processing-archive-export-stats
verified: 2026-04-26T10:31:17Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "Applicant-facing approval detail remains filtered from internal archive mark/edit/processing/correction events"
  gaps_remaining: []
  regressions: []
---

# Phase 19: 收集后处理、归档导出统计 Verification Report

**Phase Goal:** 授权人员可对审批/收集记录做后续处理、归档查询、导出和统计，形成业务闭环  
**Verified:** 2026-04-26T10:31:17Z  
**Status:** passed  
**Re-verification:** Yes - after commit `c164f77` closed the applicant visibility gap

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | 授权人员可添加标签/标记和内部备注，列表与详情均可查看和筛选 | VERIFIED | `setArchiveTags` and `addArchiveNote` persist `ArchiveRecordMeta` / `ArchiveEvent`; archive list/detail surfaces tags and notes, and list filters include tags. |
| 2 | 授权人员可按规则编辑提交后数据或处理字段，必须填写原因并记录字段级 before/after 历史 | VERIFIED | `correctArchiveData` requires `ARCHIVE_EDIT_REASON_REQUIRED`, rejects no-op edits, stores `correctionData.history`, and leaves source submitted JSON unchanged. |
| 3 | Applicant-facing approval detail remains filtered from internal archive mark/edit/processing/correction events | VERIFIED | `application-submission.service.ts:213` now filters every timeline event where `payload.visibility === 'INTERNAL'`; regression covers internal `COMMENT`, `MARK`, and `EDIT` while keeping public comments visible. |
| 4 | 管理员可为模板启用处理字段，处理字段默认不改变申请人正式提交内容 | VERIFIED | `FormTemplate.processingSchema` is validated and saved separately; designer saves `processingSchema` without mixing it into formal schema helpers. |
| 5 | 归档视图支持按模板、部门、申请人、状态、日期、标签/标记查询 | VERIFIED | `listArchiveRecords` supports required filters; `ApprovalArchivePage.vue` wires desktop filters, mobile sheet, table/cards, and detail navigation. |
| 6 | 授权人员可导出列表 Excel，并复用现有 PDF/打印能力导出单个申请详情 | VERIFIED | `exportArchiveExcel` reuses archive filters/visibility, caps rows at 2,000, sanitizes spreadsheet cells; detail page uses `#print-area`, `GridFormRenderer mode="print"`, and `exportToPdf`. |
| 7 | 管理员可查看按模板、状态、部门和月份聚合的基础统计 | VERIFIED | `getArchiveStats` requires `approval:archive:stats` and aggregates visible rows into template/status/department/month/source datasets; `ArchiveStatsPanel.vue` renders chart plus table alternatives. |
| 8 | 站内通知覆盖新待办、通过、驳回和未读数量 | VERIFIED | `application.service.ts` calls `notifyTaskAssigned` / `notifyApplicationFinalized` inside workflow transactions; notification routes scope by current user and layout polls unread count. |
| 9 | Backend/frontend routes, stores, and navigation are wired end-to-end | VERIFIED | Backend registers `approvalArchiveModule` and `notificationModule`; frontend routes/menu add `/approval/archive`; Pinia stores call archive and notification endpoints through authenticated Axios. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/prisma/schema.prisma` | Archive metadata/events, processing schema, notifications | VERIFIED | Models and fields exist; migration has source invariant and indexes. |
| `backend/src/modules/approval/application-submission.service.ts` | Applicant detail hides internal timeline events | VERIFIED | Generic visibility filter no longer scopes only to `COMMENT`. |
| `backend/src/modules/approval/__tests__/application-submission.service.test.ts` | Regression for internal event filtering | VERIFIED | Covers internal `COMMENT`, `MARK`, `EDIT`, plus a visible public comment. |
| `backend/src/modules/approval/archive.service.ts` | Archive read/action service layer | VERIFIED | List/detail, tags, notes, processing, corrections, audit events, and source permissions are implemented. |
| `backend/src/modules/approval/archive.route.ts` | `/approval/archive` route module | VERIFIED | Read/action/export/stats routes registered with strict schemas and permission guards. |
| `backend/src/modules/approval/archive-export.service.ts` | Excel export service | VERIFIED | Row cap, sanitization, detail enrichment, and workbook generation exist. |
| `backend/src/modules/approval/archive-stats.service.ts` | Stats service | VERIFIED | Reuses visible archive rows and aggregates required dimensions. |
| `backend/src/modules/approval/notification.service.ts` | Notification service | VERIFIED | Transaction-compatible creation helpers and user-scoped query/read helpers exist. |
| `backend/src/modules/approval/notification.route.ts` | `/notifications` route module | VERIFIED | List, unread count, mark-read, and mark-all-read endpoints derive user scope from auth. |
| `backend/src/modules/template/template.route.ts` | Processing-field config persistence | VERIFIED | Supported lightweight processing field validation and persistence exist. |
| `frontend/src/stores/approvalArchive.ts` | Archive API store | VERIFIED | Meta/list/detail/actions/export/stats endpoints are wired. |
| `frontend/src/pages/ApprovalArchivePage.vue` | Archive list/filter/stats UI | VERIFIED | Filter row, mobile sheet, table/cards, Excel trigger, stats panel, and detail navigation exist. |
| `frontend/src/pages/ApprovalArchiveDetailPage.vue` | Archive detail operations and PDF reuse | VERIFIED | Formal content, processing section, tags/notes, correction dialog/history, print/PDF reuse exist. |
| `frontend/src/components/approval/ArchiveStatsPanel.vue` | Stats charts and tables | VERIFIED | Template/status/department/month datasets render with table alternatives and chart labels. |
| `frontend/src/pages/FormDesignerPage.vue` | Processing field designer UI | VERIFIED | Supported processing field types and save integration exist. |
| `frontend/src/layouts/MainLayout.vue` | Archive menu and notification UI | VERIFIED | Archive navigation, notification badge/list/polling/read actions exist. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `backend/src/index.ts` | `approvalArchiveModule`, `notificationModule` | Elysia registration | VERIFIED | Imports and `.use(...)` calls at `backend/src/index.ts:19-20` and `:78-79`. |
| `archive.route.ts` | `archive.service.ts` | Route handlers call service functions | VERIFIED | List/detail/tag/note/processing/correction handlers call service functions. |
| `archive.route.ts` | `archive-export.service.ts`, `archive-stats.service.ts` | Export/stats routes | VERIFIED | `/export` uses `approval:export`; `/stats` uses `approval:archive:stats`. |
| `archive-export.service.ts` | `archive.service.ts` | Reuse visible archive query and detail | VERIFIED | `exportArchiveExcel` calls `listArchiveRecords` and `getArchiveDetail`. |
| `archive-stats.service.ts` | `archive.service.ts` | Reuse visible archive query | VERIFIED | `getArchiveStats` aggregates rows returned by `listArchiveRecords`. |
| `application.service.ts` | `notification.service.ts` | Transaction-bound notification hooks | VERIFIED | `notifyTaskAssigned` and `notifyApplicationFinalized` are called inside approval workflow paths. |
| `ApprovalArchivePage.vue` | `approvalArchive.ts` | Store actions | VERIFIED | Page calls `fetchMeta`, `fetchList`, `fetchStats`, and `exportExcel`. |
| `ApprovalArchiveDetailPage.vue` | `approvalArchive.ts`, `usePdfExport.ts` | Store actions and PDF composable | VERIFIED | Detail calls archive mutations and `exportToPdf` on `#print-area`. |
| `MainLayout.vue` | `notification.ts` | Store actions | VERIFIED | Layout calls unread/list/read/mark-all actions and 60s polling. |
| `routes.ts` / `MainLayout.vue` | Archive pages | Route and menu entry | VERIFIED | `/approval/archive` and `/approval/archive/:sourceType/:id` are routeable and menu-visible through `permAny`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `application-submission.service.ts` | applicant timeline | `ApprovalTimelineEvent` rows -> own-detail serializer | Yes, with internal visibility filter applied before serialization | FLOWING |
| `ApprovalArchivePage.vue` | `store.rows` | `fetchList` -> `GET /approval/archive` -> `listArchiveRecords` -> Prisma approval/submission queries | Yes | FLOWING |
| `ApprovalArchiveDetailPage.vue` | `store.detail` | `fetchDetail` -> `GET /approval/archive/:sourceType/:id` -> `getArchiveDetail` -> source record + archive metadata | Yes | FLOWING |
| `ArchiveStatsPanel.vue` | `store.stats` | `fetchStats` -> `GET /approval/archive/stats` -> `getArchiveStats` -> visible archive rows | Yes | FLOWING |
| `MainLayout.vue` | `notification.rows`, `notification.unreadCount` | notification store -> `/notifications` routes -> `UserNotification` queries | Yes | FLOWING |
| `FormDesignerPage.vue` | `processingSchema` | template store -> `PUT /templates/:id` -> `template.route.ts` -> `FormTemplate.processingSchema` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Gap closure: applicant own-detail filters internal archive events | `bun test src/modules/approval/__tests__/application-submission.service.test.ts src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/task.service.test.ts` | 17 tests passed | PASS |
| Backend still builds after gap fix | `bun run build` in `backend` | Build passed | PASS |
| Frontend archive/notification/designer contracts | `npm test -- --run ...approvalArchive... notification... ApprovalArchivePage... ApprovalArchiveDetailPage... MainLayoutNotification... FormDesignerProcessingFields...` | 6 files / 29 tests passed | PASS |
| Frontend build | `npm run build` in `frontend` | Build passed with existing large chunk warning | PASS |
| Artifact plan verification | `gsd-tools verify artifacts` for all Phase 19 plans | 37/37 artifacts passed | PASS |
| Key-link plan verification | `gsd-tools verify key-links` plus manual `rg` for 19-04 axios relative endpoints | 23/23 links verified; 19-04 tool false negatives manually verified via stores and authenticated Axios base API | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| OPS-01 | 19-01, 19-05, 19-08 | Tags/marks for applications or collection records | SATISFIED | Tags/notes persist as archive metadata/events; internal approval timeline events are filtered from applicant detail. |
| OPS-02 | 19-01, 19-05, 19-08 | Controlled post-submit edit with reason and before/after history | SATISFIED | Correction service enforces reason/no-op/known fields and records field-level history without overwriting originals. |
| OPS-03 | 19-03, 19-05, 19-08, 19-09 | Template processing fields separate from formal submitted content | SATISFIED | Processing schema/data are stored separately and rendered only in internal archive surfaces. |
| OPS-04 | 19-01, 19-05, 19-08 | Archive query by template/department/person/status/date/tags | SATISFIED | Backend filters and frontend filter controls are implemented and wired. |
| OPS-05 | 19-01, 19-07, 19-08 | Excel list export and single-detail PDF/print reuse | SATISFIED | Export service and route are permission-gated; detail page reuses existing PDF/print path. |
| OPS-06 | 19-01, 19-07, 19-08 | Basic stats by template/status/department/month | SATISFIED | Stats service and panel aggregate/render required dimensions. |
| OPS-07 | 19-01, 19-06, 19-10 | In-app notifications and unread count | SATISFIED | Backend workflow hooks/routes and frontend badge/list/polling are implemented and tested. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| None | - | No blocker stubs found | - | `TODO/FIXME/placeholder/console.log` scan found only legitimate guard returns and processing field placeholder properties. |

### Human Verification Required

None for this automated phase-goal gate. Focused contract tests and builds cover the required Phase 19 behaviors.

### Gaps Summary

No remaining gaps. The previous blocker is closed by commit `c164f77`: applicant-facing approval detail now suppresses every timeline event with `payload.visibility === 'INTERNAL'`, including internal archive `MARK` and `EDIT` events. No later phase deferral is needed.

---

_Verified: 2026-04-26T10:31:17Z_  
_Verifier: Claude (gsd-verifier)_
