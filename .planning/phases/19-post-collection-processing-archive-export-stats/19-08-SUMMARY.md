---
phase: 19-post-collection-processing-archive-export-stats
plan: 8
subsystem: frontend-ui
tags: [vue3, quasar, approval-archive, export, pdf, stats]

requires:
  - phase: 19-post-collection-processing-archive-export-stats
    provides: archive store, archive DTOs, backend archive list/detail/export/stats endpoints
provides:
  - Archive query page with filters, desktop table, mobile cards, Excel export trigger, and stats gate
  - Archive detail page with formal submitted content, processing fields, tags, notes, correction history, timeline, print, and PDF export
  - Archive statistics panel with accessible Chart.js bar charts and table alternatives
affects: [approval-navigation, archive-ui, archive-export, archive-stats]

tech-stack:
  added: []
  patterns:
    - Quasar operational page with desktop q-table and mobile bottom filter sheet
    - Client-side PDF reuse through #print-area, GridFormRenderer mode="print", and usePdfExport
    - vue-chartjs archive stats charts with table alternatives

key-files:
  created:
    - frontend/src/pages/ApprovalArchivePage.vue
    - frontend/src/pages/ApprovalArchiveDetailPage.vue
    - frontend/src/components/approval/ArchiveStatsPanel.vue
  modified:
    - frontend/src/router/routes.ts
    - frontend/src/layouts/MainLayout.vue
    - frontend/src/types/approvalArchive.ts

key-decisions:
  - "归档详情继续把正式提交内容放在 #print-area 内，并把处理字段、备注、标签和修正历史作为内部运营信息分区展示。"
  - "归档统计保留在归档查询页内，并仅通过 approval:archive:stats 权限展示。"
  - "归档列表和详情路由只做客户端 permAny 可见性控制，后端仍负责实际数据授权。"
  - "approvalArchive 类型常量使用当前前端构建链兼容的类型断言，避免 Vite/esbuild 无法解析 satisfies。"

patterns-established:
  - "Archive operations pages use dense unframed page layout, with cards only for mobile records and detail sections."
  - "Archive correction requires changed formal fields plus non-empty 修正原因 before 保存修正 is enabled."
  - "Archive stats charts must include a table alternative and role/aria labelling."

requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06]

duration: 18min
completed: 2026-04-26
---

# Phase 19 Plan 8: Archive Operations UI Summary

**Quasar 归档查询、详情、Excel/PDF 操作和权限内统计面板，连接既有 archive store 与客户端 PDF 导出路径**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-26T08:19:47Z
- **Completed:** 2026-04-26T08:36:57Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- 新增 `归档查询` 列表页，包含来源/状态/模板/部门/人员/日期/标签筛选、桌面 `q-table`、移动端卡片和底部筛选 sheet。
- 新增归档详情页，复用 `#print-area` + `GridFormRenderer mode="print"` + `usePdfExport`，并清晰分离正式提交内容和后续处理/修正/备注/标签区域。
- 新增归档统计面板，按模板、状态、部门、月份展示数据，图表具备表格替代和无障碍标签。
- 接入 `/approval/archive` 和 `/approval/archive/:sourceType/:id` 路由，并在审批管理菜单中按既定顺序加入 `归档查询`。

## Task Commits

Each task was committed atomically:

1. **Task 1: Build archive list page and navigation** - `a6a1682` (feat)
2. **Task 2: Build archive detail page with operations and PDF reuse** - `6611804` (feat)
3. **Task 3: Add archive statistics panel to the archive page** - `8c9790c` (feat)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `frontend/src/pages/ApprovalArchivePage.vue` - 归档查询列表、筛选、移动 filter sheet、Excel export、stats gate 和详情跳转。
- `frontend/src/pages/ApprovalArchiveDetailPage.vue` - 全页详情、正式提交内容打印/PDF、处理字段、标签、备注、修正历史和受控修正。
- `frontend/src/components/approval/ArchiveStatsPanel.vue` - 归档统计图表与表格替代。
- `frontend/src/router/routes.ts` - 归档列表/详情路由与 `permAny` 可见性。
- `frontend/src/layouts/MainLayout.vue` - 审批管理菜单新增 `归档查询`，并支持菜单项 `permAny`。
- `frontend/src/types/approvalArchive.ts` - 将 `satisfies` 类型写法替换为构建链兼容断言。

## Decisions Made

- 详情页的 PDF/打印只围绕正式提交快照，内部处理字段、备注、标签和修正历史保留为页面操作信息，避免混淆正式提交内容。
- 统计没有新增独立 dashboard 路由，按 Phase 19 决策作为 `归档查询` 的权限内区域呈现。
- 移动端保留底部筛选 sheet 和详情 sticky print/PDF 操作，所有主要触控目标保持至少 44px。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made archive type constants compatible with the frontend build**
- **Found during:** Task 1 (Build archive list page and navigation)
- **Issue:** `frontend/src/types/approvalArchive.ts` used TypeScript `satisfies`, but the current Quasar/Vite/esbuild build failed to parse it.
- **Fix:** Replaced the constant declaration with an equivalent `as readonly ArchiveProcessingFieldType[]` assertion.
- **Files modified:** `frontend/src/types/approvalArchive.ts`
- **Verification:** `cd frontend && npm run build`
- **Committed in:** `a6a1682`

**2. [Rule 3 - Blocking] Satisfied page-level stats contract before final stats component extraction**
- **Found during:** Task 1 (Build archive list page and navigation)
- **Issue:** The existing `ApprovalArchivePage` contract test included stats strings even though the plan scheduled the final stats component for Task 3.
- **Fix:** Wired the stats gate/fetch path on the page in Task 1, then replaced the interim inline table section with `ArchiveStatsPanel` in Task 3.
- **Files modified:** `frontend/src/pages/ApprovalArchivePage.vue`, `frontend/src/components/approval/ArchiveStatsPanel.vue`
- **Verification:** `cd frontend && npm test -- src/pages/__tests__/ApprovalArchivePage.test.ts`
- **Committed in:** `a6a1682`, `8c9790c`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were required to satisfy the existing contract tests and build. Final scope remains within the planned archive UI surface.

## Issues Encountered

- Initial RED checks failed because `ApprovalArchivePage.vue` and `ApprovalArchiveDetailPage.vue` did not exist yet. The pre-existing Wave 0 tests served as the failing TDD gate.
- Final build passed with Quasar's existing chunk-size warning for large async chunks; no build failure remained.

## Verification

- `cd frontend && npm test -- src/pages/__tests__/ApprovalArchivePage.test.ts src/pages/__tests__/ApprovalArchiveDetailPage.test.ts` - PASS, 2 files / 8 tests.
- `cd frontend && npm run build` - PASS, SPA build succeeded.

## Known Stubs

None. Stub scan found only schema placeholder property names and empty-string normalization helpers, not UI placeholders or unwired mock data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 19 plan 9 can build on the archive UI routes and operation surfaces. Manual UAT should still inspect 375px mobile detail with long forms and dynamic tables for horizontal overflow, as requested by the plan-level verification notes.

## Self-Check: PASSED

- Created files exist: `ApprovalArchivePage.vue`, `ApprovalArchiveDetailPage.vue`, `ArchiveStatsPanel.vue`.
- Task commits exist: `a6a1682`, `6611804`, `8c9790c`.
- Summary file exists at `.planning/phases/19-post-collection-processing-archive-export-stats/19-08-SUMMARY.md`.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
