---
phase: 33-ui
plan: 01
subsystem: ui
tags: [vue3, quasar, pinia, vue-router, typescript, channel-push, rbac]

requires:
  - phase: 32-api
    provides: /api/v1/channel-push backend routes (mine, create, patch, cancel, attachments) and channelPush:viewOwn/channelPush:create permissions
provides:
  - ChannelPush TypeScript contract (statuses, rows, detail, write payload, list filters, attachment + duplicate hint types, helpers)
  - useChannelPushStore Pinia store (fetchMine, fetchDetail, create, update, cancel, addAttachments, preview/download/delete attachment) wired to /channel-push backend
  - Four channel-push routes (list/new/edit/detail) gated by channelPush:viewOwn / channelPush:create
  - 我的推送 menu entry visible only to users holding channelPush:viewOwn or channelPush:create
affects: [33-02, 33-03, 33-04]

tech-stack:
  added: []
  patterns:
    - permission-based isolation only (no role string checks) for CHANNEL_PARTNER UI
    - independent channelPush store/types (no reuse of visit/reimbursement state)
    - multipart create/upload contract with payload + attachments form keys

key-files:
  created:
    - frontend/src/types/channelPush.ts
    - frontend/src/stores/channelPush.ts
  modified:
    - frontend/src/router/routes.ts
    - frontend/src/layouts/MainLayout.vue

key-decisions:
  - "CHANNEL_PARTNER isolation is enforced via channelPush:* permissions on routes/menus, never via role string checks."
  - "Channel-push store is a sibling of reimbursement/visit stores; no shared state to keep the module independently evolvable."
  - "Multipart contract uses literal keys 'payload' (JSON.stringify) and 'attachments' for files, matching backend Phase 32 routes."

patterns-established:
  - "Permission-only menu/route gating: meta.perm or meta.permAny + filterMenus()."
  - "Pinia options-API store mirroring reimbursement loading flags (loading/detailLoading/actionLoading/uploadLoading/downloadLoading)."

requirements-completed:
  - PARTNER-04
  - PARTNER-05

duration: ~25 min
completed: 2026-05-06
---

# Phase 33-ui Plan 01: Channel Push Frontend Foundation

**TypeScript contract + Pinia store + router routes + 我的推送 menu — partner-side foundation ready for list/form/detail pages.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-06
- **Completed:** 2026-05-06
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Defined the channel-push frontend type contract (statuses, rows, detail, write payload, list filters, attachment, review action, duplicate hint, helpers `channelPushStatusLabel/Color`, `isPendingChannelPush`, `createEmptyChannelPushFilters`, `normalizeChannelPushPayload`, `formatChannelPushDate`).
- Built `useChannelPushStore` with all loading flags and actions matching the Phase 32 backend (mine list, detail, create with multipart, patch update, cancel, attachments add/preview/download/delete).
- Registered four child routes (`channel-push`, `channel-push/new`, `channel-push/:id/edit`, `channel-push/:id`) under MainLayout with `channelPush:viewOwn`/`channelPush:create` permission metadata.
- Inserted a single 我的推送 menu entry between 报销管理 and 收集统计表 with `permAny: ['channelPush:viewOwn', 'channelPush:create']`; no role-based branches added.

## Task Commits

1. **Task 1: Create types/channelPush.ts** — `4bc41ed` (feat)
2. **Task 2: Create stores/channelPush.ts** — `c1232e8` (feat)
3. **Task 3: Add channel-push routes** — `6492121` (feat)
4. **Task 4: Add 我的推送 menu item** — `a1744b0` (feat)

## Files Created/Modified
- `frontend/src/types/channelPush.ts` — TS contract for channel-push frontend (created)
- `frontend/src/stores/channelPush.ts` — Pinia store wired to /channel-push backend (created)
- `frontend/src/router/routes.ts` — added 4 channel-push routes with permission meta (modified)
- `frontend/src/layouts/MainLayout.vue` — added 我的推送 menu entry, permission-gated (modified)

## Decisions Made
None beyond plan-codified decisions; followed plan verbatim.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `vue-tsc --noEmit` reports pre-existing errors in `node_modules` (Quasar/vite/vitest type resolution) and unrelated app files (`boot/axios.ts`, `boot/perm.ts`, `composables/usePdfExport.ts`, `components/visit/__tests__/visitImport.test.ts`). **None of these touch the new channelPush files.** Decision: leave untouched — these errors predate this phase and are out of scope for plan 33-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wave 2 (33-02 list page, 33-03 form page) can mount on `/channel-push`, `/channel-push/new`, `/channel-push/:id/edit`.
- Wave 3 (33-04 detail page) can mount on `/channel-push/:id`.
- All pages can call `useChannelPushStore()` actions; types are exported from `src/types/channelPush`.

---
*Phase: 33-ui*
*Completed: 2026-05-06*
