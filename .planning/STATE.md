---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: 到访信息管理
status: ready
last_updated: "2026-05-02T09:25:39.107Z"
last_activity: 2026-05-02
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 40
  completed_plans: 40
  percent: 89
---

# State

- Initialized: 2026-04-17
- Milestone: v1.3 到访信息管理 — READY TO PLAN
- Status: Roadmap created, ready for Phase 15 planning

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02)

**Core value:** 开箱即用的组织架构管理 + 表单收集
**Current focus:** Phase 23 — 统计面板 + 转化汇总

## Current Position

Phase: 23 (统计面板 + 转化汇总)
Plan: Not started
Status: Ready for Phase 23 planning
Last activity: 2026-05-02

Progress: [█████████░] 89%

## Roadmap Summary

- Phase 20: 到访数据模型 + 后端 API (3/3 plans complete)
- Phase 21: 到访管理页面 + CRUD 筛选 (3/3 plans complete)
- Phase 22: Excel 导入解析 + 预览入库 (2/2 plans complete)
- Phase 23: 统计面板 + 转化汇总 (2 plans) — next

## Performance Metrics

**Velocity:**

- Total plans completed: 86 (25 v1.0 + 13 v1.1 + 16 v1.2 + 32 v2.0)
- v1.2 commits: ~50
- v1.2 LOC added: 17,172

**Plan Execution:**

- Phase 19 Plan 19-01: 580s, 3 tasks, 7 files, completed 2026-04-26
- Phase 19 Plan 19-02: 370s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-03: 612s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-04: 345s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-05: 1006s, 3 tasks, 10 files, completed 2026-04-26
- Phase 19 Plan 19-06: 533s, 3 tasks, 5 files, completed 2026-04-26
- Phase 19 Plan 19-07: 515s, 3 tasks, 5 files, completed 2026-04-26
- Phase 19 Plan 19-08: 1080s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-09: 624s, 2 tasks, 4 files, completed 2026-04-26
- Phase 19 Plan 19-10: 395s, 2 tasks, 2 files, completed 2026-04-26
- Phase 20 Plan 20-01: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 20 Plan 20-02: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 20 Plan 20-03: same session, 3 tasks, 5 files, completed 2026-05-02
- Phase 21 Plan 21-01: same session, 3 tasks, 3 files, completed 2026-05-02
- Phase 21 Plan 21-02: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 21 Plan 21-03: same session, 4 tasks, 2 files, completed 2026-05-02
- Phase 22 Plan 22-01: same session, 3 tasks, 6 files, completed 2026-05-02
- Phase 22 Plan 22-02: same session, 4 tasks, 5 files, completed 2026-05-02

## Accumulated Context

### Decisions

Archived to PROJECT.md Key Decisions table.

- [Phase 19]: Phase 19 Wave 0 tests intentionally fail until future archive, export, stats, and notification modules are implemented.
- [Phase 19]: Archive route contracts reject trusted fields and only accept operation payload fields for tags, notes, processing data, corrections, and reasons.
- [Phase 19]: Notification contracts require transaction-supplied writes and userId = currentUser.id scoping for list/count/read operations.
- [Phase 19]: Archive operational state is stored in ArchiveRecordMeta and ArchiveEvent, not in submitted form JSON.
- [Phase 19]: Archive metadata exact-source invariants are enforced with a PostgreSQL CHECK constraint.
- [Phase 19]: Phase 19 host-side Prisma verification uses localhost for the Docker PostgreSQL service when .env uses compose DNS.
- [Phase 19]: Archive operation payload constants export both plan names and Wave 0 compatibility aliases while excluding trusted fields.
- [Phase 19]: Notification types accept TASK_ASSIGNED as a backend compatibility alias for NEW_TASK.
- [Phase 19]: Route permAny is additive and preserves the existing single meta.perm guard behavior.
- [Phase 19]: Processing field config is stored on FormTemplate.processingSchema and does not bump formal schemaVersion.
- [Phase 19]: Archive operations store tags, notes, processing values, and correction overlays in ArchiveRecordMeta/ArchiveEvent, not submitted JSON.
- [Phase 19]: Approval task detail may expose archive tags/internal notes to assigned approvers while applicant own-detail remains filtered.
- [Phase 19]: Notification rows are written inside the same Prisma transaction that creates approval tasks or terminal approval/rejection state changes.
- [Phase 19]: Notification list/count/read routes derive scope from currentUser.id and expose no client-supplied user scope.
- [Phase 19]: Unread count route returns unreadCount for frontend consumers while preserving the existing unread alias from the backend contract test.
- [Phase 19]: Excel export enforces the locked Phase 19 cap of 2,000 rows before workbook generation.
- [Phase 19]: Export reuses archive list filters and actor visibility, then loads archive detail data only when list rows lack effective/processing fields.
- [Phase 19]: Archive stats require approval:archive:stats and separately apply approval application visibility plus form submission list visibility.
- [Phase 19]: 归档详情继续把正式提交内容放在 #print-area 内，并把处理字段、备注、标签和修正历史作为内部运营信息分区展示。
- [Phase 19]: 归档统计保留在归档查询页内，并仅通过 approval:archive:stats 权限展示。
- [Phase 19]: 归档列表和详情路由只做客户端 permAny 可见性控制，后端仍负责实际数据授权。
- [Phase 19]: approvalArchive 类型常量使用当前前端构建链兼容的类型断言，避免 Vite/esbuild 无法解析 satisfies。
- [Phase 19]: Template processingSchema is typed and saved through the template store while remaining outside formal schema flattening helpers.
- [Phase 19]: Form Designer exposes only text, textarea, date, radio, checkbox, and phone processing field types for internal operations.
- [Phase 19]: Processing field editing uses a separate Quasar dialog with explicit copy that internal processing fields do not overwrite formal submitted content.
- [Phase 19]: Notifications remain in-app only and polling-based: mount/login, window focus, and 60-second interval refresh unread count.
- [Phase 19]: Desktop notification access uses q-menu while mobile uses a full-screen q-dialog to keep rows touch-safe.
- [Phase 19]: Notification target navigation is constrained to approval task/application routes before marking a row read.
- [v1.3]: 到访信息管理采用固定业务模块，不复用自定义表单模板作为主数据模型。
- [v1.3]: Excel 导入由前端解析第 2 行表头并提交标准化 JSON，后端二次校验后批量创建。
- [Phase 20]: VisitRecord 使用固定业务表、nullable string 状态字段和筛选索引，不引入字典、枚举或自动去重约束。
- [Phase 20]: `/api/v1/visits` 后端端点按 `visit:*` 权限拆分鉴权，写入只接受显式业务字段，`creatorId` 从当前登录用户派生。
- [Phase 20]: 到访导入后端只接收标准化 JSON rows；Excel 解析、预览和重复提示保留在 Phase 22 前端范围。
- [Phase 21]: `/visits` 使用独立顶层菜单和 `visit:list` 路由权限，CRUD 按钮分别按 `visit:create/update/delete` 显隐。
- [Phase 21]: Visit 前端 API 调用集中在 Pinia store，列表请求自动忽略空筛选条件。
- [Phase 21]: 到访业务日期统一按 `YYYY-MM-DD` 展示，避免 locale/timezone 漂移。
- [Phase 21]: 到访列表 PC 使用 QTable、移动端使用卡片，长文本只在详情/编辑弹窗完整展示。
- [Phase 22]: 到访 Excel 导入使用前端 `xlsx`/FileReader 解析首个 sheet，严格按第 2 行 15 列表头校验并从第 3 行解析数据。
- [Phase 22]: 导入预览区分有效行、无效行和错误原因；潜在重复只按「姓名 + 接待日期 + 咨询师」提示，不自动跳过、合并或 upsert。
- [Phase 22]: 导入确认只通过 visit store 提交 `{ rows: VisitWritePayload[] }` 到 `/visits/import`，后端继续二次校验并派生 `creatorId`。

### Blockers/Concerns

Client open questions remain around first-delivery form examples, approval levels, rejection behavior, attachment requirement, external notification channel, department/company-wide data visibility, and post-submit edit permissions. v2.0 assumes a practical MVP: single/serial approvals, department-manager approval, in-app notifications, no attachments unless confirmed.

v1.3 has no active blocker. Phase 23 should preserve the Phase 20 stats API contract, add only `visit:stats`-gated frontend controls, and keep Excel export/follow-up workflow out of scope.

## Session

- Last session: 2026-05-02
- Stopped At: Phase 23 context gathered
- Resume File: .planning/phases/23-stats/23-CONTEXT.md
