# Phase 21: 到访管理页面 + CRUD 筛选 - UI Spec

**Created:** 2026-05-02
**Status:** Ready for planning
**Design Source:** Existing OA Quasar admin patterns; no new visual system.

## Boundary

This spec covers the Phase 21 visit management page only: route/menu entry, list, filters, responsive views, CRUD/detail dialogs and delete confirmation. It explicitly excludes Excel import, stats, export, dictionary management and follow-up reminders.

## Information Architecture

- Route: `/visits`
- Menu title: `到访管理`
- Page title: `到访管理`
- Permission entry point: `visit:list`
- Primary action: `新建到访记录` guarded by `visit:create`
- Row actions: `查看`, `编辑`, `删除`; edit/delete guarded by `visit:update` and `visit:delete`

## Desktop Layout

1. Header row
   - Left: title and short operational subtitle.
   - Right: permission-gated create button.
2. Filter area
   - Dense controls above the table.
   - Fields: keyword, channelPartner, consultant, receptionist, receptionStatus, consultationStatus, statusCategory, dateFrom, dateTo.
   - Actions: `查询` and `重置筛选`.
3. Table
   - Use `QTable` with server-side pagination.
   - Rows per page options: `[10, 20, 50]`.
   - Scan columns: name, channelPartner, consultant, receptionist, receptionDate, receptionStatus, consultationStatus, statusCategory, updatedAt, actions.
   - Long text fields are not expanded in table cells.
4. Empty state
   - Use existing `EmptyState` component.
   - Copy: `暂无到访记录`.
   - Show create CTA only when the user has `visit:create`.

## Mobile Layout

1. Header remains compact with create action when permitted.
2. Filters move into a bottom `q-dialog` sheet opened by a `筛选` button.
3. List uses cards, not a horizontally scrollable table.
4. Card content priority:
   - name
   - receptionStatus and consultationStatus chips
   - channelPartner, consultant, receptionist
   - receptionDate and statusCategory
   - touch-safe action buttons for view/edit/delete when visible
5. Bottom sheet keeps draft filters and only mutates live filters when `应用筛选` is clicked.

## Dialogs

### Create/Edit/Detail

- Component: `VisitFormDialog`.
- Desktop: fixed readable width.
- Mobile: maximized dialog.
- Modes: `create`, `edit`, `detail`.
- Field groups:
  1. 学员基础信息: name, age, education, gender
  2. 渠道与接待: channelPartner, consultant, receptionist, receptionDate, receptionStatus
  3. 跟进状态: consultationStatus, statusCategory, statusDescription
  4. 试听与解决方案: trialStatus, trialDate, solution
- `name` is required.
- `age` accepts integer or empty.
- Business dates display and submit as `YYYY-MM-DD`.
- Detail mode shows all 15 business fields plus creator, createdAt and updatedAt.

### Delete Confirmation

- Use confirmation dialog before deleting.
- Copy must include at least the visitor name and one contextual field such as receptionDate, consultant or receptionist.
- Delete success refreshes the current list page.

## Visual Rules

- Reuse existing Quasar/OA admin tone from approval archive/application pages.
- Do not introduce new design tokens or marketing-style visuals.
- Use concise status chips for status fields.
- Keep touch targets at least 44px where custom CSS affects action controls.
- Keep business date display date-only; do not show raw ISO timestamps for receptionDate/trialDate.

## Negative Contract

Phase 21 UI must not show or wire:

- `导入 Excel`
- `统计`
- `导出 Excel`
- `/visits/import`
- `/visits/stats`

