---
phase: 33-ui
plan: 02
subsystem: ui
tags: [vue3, quasar, q-table, q-card, list-page, filter, channel-push]

requires:
  - phase: 33-ui plan 01
    provides: ChannelPush types, store, route /channel-push, menu entry
provides:
  - ChannelPushStatusChip component (PENDING/APPROVED/REJECTED/CANCELLED)
  - ChannelPushPage list page (PC q-table, Mobile q-card list, FilterSheet pattern, pagination, refresh, primary 新建推送 CTA, PENDING-only edit/cancel row actions)
affects: [33-03, 33-04]

tech-stack:
  added: []
  patterns:
    - inline mobile filter dialog (status options driven by CHANNEL_PUSH_STATUSES rather than shared FilterSheet hardcoded ACTIVE/DISABLED)
    - PENDING-only row mutation actions on both PC and Mobile

key-files:
  created:
    - frontend/src/components/channel-push/ChannelPushStatusChip.vue
    - frontend/src/pages/ChannelPushPage.vue
  modified: []

key-decisions:
  - "Mobile filter dialog implemented inline with channel-push-specific status options (shared FilterSheet has hardcoded ACTIVE/DISABLED toggle that does not match PENDING/APPROVED/REJECTED/CANCELLED). Mirrors ReimbursementPage's inline mobile filter pattern."

patterns-established:
  - "Inline mobile filter dialog with q-dialog position='bottom' instead of shared FilterSheet when status options diverge."

requirements-completed:
  - PUSH-06
  - NOTIF-03

duration: ~25 min
completed: 2026-05-06
---

# Phase 33-ui Plan 02: ChannelPushPage list

**我的推送 list page with PC q-table + Mobile q-card list, keyword/status/date-range filters, pagination, refresh, primary 新建推送 CTA, and PENDING-only edit/cancel row actions.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `ChannelPushStatusChip` renders the four channel-push statuses using type-driven `channelPushStatusLabel/Color`, with a special grey-9 text color for `CANCELLED`.
- `ChannelPushPage` lists `useChannelPushStore().rows` via PC q-table (status chip / submittedAt / attachmentCount / per-row actions) and Mobile q-card list (subtitle 学员姓名/手机号 + summary grid).
- PC filter bar exposes 关键词/状态/开始日期/结束日期 with 查询/重置. Mobile uses an inline q-dialog with the same fields (status options match PENDING/APPROVED/REJECTED/CANCELLED rather than the shared FilterSheet's ACTIVE/DISABLED).
- Header offers refresh + 新建推送 (PC label, Mobile FAB icon) gated by `channelPush:create`. Floating action FAB stays bottom-right on Mobile.
- 撤回 confirmation goes through Quasar Dialog → `store.cancel(row.id)` → success toast + reloadList. Empty state surfaces 新建推送 CTA when permission is held.

## Task Commits

1. **Task 1: ChannelPushStatusChip** — `859279c` (feat)
2. **Task 2: ChannelPushPage** — `a8c3977` (feat)

## Files Created/Modified
- `frontend/src/components/channel-push/ChannelPushStatusChip.vue` — type-driven status chip (created)
- `frontend/src/pages/ChannelPushPage.vue` — list page with PC table + Mobile cards (created)

## Decisions Made
- **Mobile filter:** chose inline q-dialog instead of the shared `FilterSheet` component because FilterSheet has a hardcoded `[ACTIVE/DISABLED]` toggle that does not match channel-push statuses. Same approach used by `ReimbursementPage` for the same reason. The shared FilterSheet was left untouched per plan instruction.

## Deviations from Plan

### Acceptance criterion adaptation

**1. [Spec adaptation] FilterSheet match count**
- **Plan AC:** `rg "FilterSheet"` matches once.
- **Reality:** 2 matches (button click handler `openFilterSheet` + function declaration). Importing/using the shared FilterSheet component would render an incorrect status toggle. Function name `openFilterSheet` is retained for parity with `ReimbursementPage`'s `openFilterSheet` pattern.
- **Spirit preserved:** the page implements a mobile filter sheet equivalent.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness
- 33-03 (Form page) can navigate via `/channel-push/new`. Edit links from this list (`/channel-push/:id/edit`) work once 33-03 ships.
- 33-04 (Detail page) `/channel-push/:id` linked from 查看 buttons.

---
*Phase: 33-ui*
*Completed: 2026-05-06*
