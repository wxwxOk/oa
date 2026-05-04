# Pitfalls Research: v1.5 Work Record Management

**Domain:** Fixed work report module / daily weekly monthly reports / department summary
**Researched:** 2026-05-03
**Confidence:** HIGH

## Watch Outs

| Pitfall | Risk | Prevention | Phase |
|---------|------|------------|-------|
| Period boundaries computed on the client | Daily/weekly/monthly boundaries drift and summary becomes inconsistent | Compute and validate `periodStart`/`periodEnd` on the backend | 28 |
| Duplicate submission in the same period | Submission rate and export counts become wrong | DB unique constraint plus service-level friendly error | 28 |
| Only hiding buttons in the UI | Employees can still access other users' data by calling APIs directly | Apply scope filtering in all list/detail/summary/export APIs | 28/30/31 |
| Not storing department snapshots | Historical records shift when the org structure changes | Save department ID and name snapshots on create/submit | 28 |
| Summary scans every user and every report | Performance degrades as data grows | Use pagination, date ranges, indexes and export row limits | 28/31 |
| Unsubmitted list has unclear scope | Managers see counts that do not match the actual list | Compute from the user set inside the current permission scope; do not create a to-do table | 30 |
| Submitted reports are silently edited | Exported archives are no longer trustworthy | Keep v1.5 submissions read-only; add audit events only if return/edit is introduced later | 29 |
| Excel formula injection | Exported files become unsafe | Reuse the existing export sanitization pattern | 31 |
| Adding reminders, scores or OKR too early | The module becomes too heavy and delayed | Keep these items in v2 / out of scope | All |

## Product Scope Traps

- Work reports are not a performance system: do not add scoring, calibration or ranking in v1.5.
- Work reports are not project management: do not add tasks, work logs, boards or Gantt charts in v1.5.
- Work reports are not a generic form builder: fixed fields matter for querying and summary consistency.
- Work reports are not a notification system: the unsubmitted list is for visibility only, not auto-pushing.

## Validation Focus

- Regular employees cannot read other users' records, department summaries or unauthorized exports.
- Department managers can only see their own department scope.
- Administrators can query all departments and all people.
- Summary pages and Excel summary sheets must use the same filter scope.
- The same employee cannot submit two reports for the same daily/weekly/monthly period.

---
*Pitfalls research for: v1.5 工作记录管理*
*Researched: 2026-05-03*
