# Architecture Research: v1.5 Work Record Management

**Domain:** Fixed work report module / daily weekly monthly reports / department summary
**Researched:** 2026-05-03
**Confidence:** HIGH

## Recommendation

Build v1.5 as an independent fixed business module. Add a backend `work-report` module and frontend pages for employee reports and management summaries. Daily, weekly and monthly reports should share one `WorkReport` table and one period model based on `periodType`, `periodStart` and `periodEnd`.

## Integration Points

| Layer | New / Reused | Notes |
|-------|--------------|-------|
| Prisma | New `WorkReport` model | Fixed fields, period/status enums, author/department snapshots, unique constraint and indexes |
| Backend routes | New `/api/v1/work-reports` | CRUD, submit, detail, list, summary and export endpoints |
| Permissions | New work-report permissions | `create`, `own`, `department`, `all`, `export` |
| Frontend store | New Pinia store | Reuse fixed business module DTO/helper/store pattern |
| Frontend pages | New report and summary pages | Desktop `QTable`, mobile `QCard`, management view by permission scope |
| Export | Reuse ExcelJS pattern | Details sheet + summary sheet, formula-injection guard |

## Data Model Direction

```text
WorkReport
  id
  periodType: DAILY | WEEKLY | MONTHLY
  periodStart / periodEnd
  status: DRAFT | SUBMITTED
  authorId / authorName
  authorDepartmentId / authorDepartmentName
  completedContent
  planContent
  riskContent
  helpNeeded
  remark
  submittedAt
  createdAt / updatedAt
```

Recommended constraints:
- Unique: `authorId + periodType + periodStart`.
- Indexes: `authorId`, `authorDepartmentId`, `periodType`, `periodStart`, `periodEnd`, `status`, `createdAt`.
- Submitted reports are read-only for v1.5; if return/edit is needed later, add explicit audit events.

## Data Flow

```text
Employee form
  -> WorkReport create/update draft API
  -> submit API validates period and uniqueness
  -> list/detail API applies own/department/all scope
  -> summary API aggregates submitted reports and active users
  -> export API reuses current filters and scope
```

## Build Order

1. Data model, permissions and backend contracts.
2. Work report service/routes and focused backend tests.
3. Employee list/form/detail UI.
4. Summary service/routes and management UI.
5. Excel export and UAT closeout.

## Architectural Non-Goals

- No generic reporting engine.
- No reminder scheduler or notification workflow.
- No performance/OKR state machine.
- Do not store work reports as approval applications or custom form submissions.

---
*Architecture research for: v1.5 工作记录管理*
*Researched: 2026-05-03*
