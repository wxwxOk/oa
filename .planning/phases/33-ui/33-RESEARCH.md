# Phase 33: 渠道商提交体验 + 我的推送 UI - Research

**Phase:** 33
**Name:** 渠道商提交体验 + 我的推送 UI
**Date:** 2026-05-05
**Status:** Research complete

## Research Question

What do I need to know to plan Phase 33 well?

Phase 33 is a frontend-only implementation phase that consumes the Phase 32 `/api/v1/channel-push` backend contract. The main work is to add partner-side channel push routes, menu visibility, Pinia state, TS types, responsive list/form/detail pages, attachment UI, duplicate hint UI, and PENDING-only edit/cancel UX without touching employee workflows.

## Key Findings

### 1. Backend Contract Is Ready and Stable

Phase 32 has completed the partner-side channel push API. Phase 33 should not modify backend routes or Prisma models.

Relevant backend files:

- `backend/src/modules/channel-push/channel-push.route.ts`
- `backend/src/modules/channel-push/channel-push.service.ts`
- `backend/src/modules/channel-push/channel-push-file.service.ts`
- `backend/src/modules/channel-push/channel-push-dedup.service.ts`
- `backend/src/modules/channel-push/channel-push.state.ts`

#### API Endpoints

| Purpose | Method + Path | Permission | Request | Response |
|---|---|---|---|---|
| List own pushes | `GET /api/v1/channel-push/mine` | `channelPush:viewOwn` | query: `page`, `size`, `status`, `dateFrom`, `dateTo`, `keyword` | `{ rows, total, page, size }` |
| Detail | `GET /api/v1/channel-push/:id` | `channelPush:viewOwn` | params: `id` | `ChannelPushDetail` |
| Create | `POST /api/v1/channel-push` | `channelPush:create` | multipart: `payload` JSON string + optional `attachments` files | `{ push, duplicateHints }` |
| Edit business fields | `PATCH /api/v1/channel-push/:id` | `channelPush:create` | JSON body matching `channelPushWriteBody` | `{ push, duplicateHints }` |
| Cancel | `POST /api/v1/channel-push/:id/cancel` | `channelPush:cancel` | params: `id` | updated push/detail row |
| Add attachments | `POST /api/v1/channel-push/:id/attachments` | `channelPush:create` | multipart: `attachments` files | `{ push, attachments }` |
| Preview image | `GET /api/v1/channel-push/:id/attachments/:attachmentId/preview` | `channelPush:viewOwn` | blob response | image blob only |
| Download | `GET /api/v1/channel-push/:id/attachments/:attachmentId/download` | `channelPush:viewOwn` | blob response | blob |
| Delete attachment | `DELETE /api/v1/channel-push/:id/attachments/:attachmentId` | `channelPush:create` | params | `{ ok: true }` |

#### Writable Fields

`channelPushWriteBody` accepts only partner-writable business fields:

```ts
{
  studentName: string;        // required, 1..64
  studentPhone: string;       // required, route min 5..32; service normalizes Chinese mobile format
  studentAge?: number;        // 1..120
  studentEducation?: string;  // max 64
  studentGender?: string;     // max 16
  intentStatus?: string;      // max 64
  intentNote?: string;        // max 1000
  remark?: string;            // max 1000
}
```

Trusted fields are never accepted from frontend: `channelPartnerId`, `recipientUserId`, `status`, timestamps, internal fields.

#### Attachment Contract

From `channel-push-file.service.ts`:

- MIME allow-list: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Max file size: 10 MB
- Max attachment count: 20
- Preview only supports images; PDFs should use download only
- Upload storage is backend-owned under `CHANNEL_PUSH_UPLOAD_DIR` / default `uploads/channel-push`

#### Mutability Contract

Partner mutations require ownership and `status === 'PENDING'`:

- editable: PENDING only
- cancellable: PENDING only
- add/delete attachments: PENDING only
- terminal states: `APPROVED`, `REJECTED`, `CANCELLED`

Frontend should hide edit/cancel/add/delete actions outside PENDING, but backend remains final authority.

#### Duplicate Hint Contract

`createChannelPush` and `editChannelPush` return `duplicateHints` alongside the saved push. These hints are partner-scoped and non-blocking. UI must show them clearly, but must not prevent successful navigation or submission.

## Frontend Integration Research

### Existing Route and Permission Pattern

Use existing route meta and guard only:

- `frontend/src/router/routes.ts` supports child routes under `MainLayout`.
- `frontend/src/router/index.ts` enforces `meta.perm` and `meta.permAny` with `auth.hasPerm` / `auth.hasAnyPerm`.
- `frontend/src/layouts/MainLayout.vue` filters desktop drawer, mobile drawer, and footer tabs through `filterMenus()`.

Planning implication:

- Add 4 `channel-push` routes under the existing root route.
- Add one `MainLayout.allMenus` entry.
- Do not add a partner-specific layout or role blacklist.
- Do not modify employee feature pages.

Expected routes:

```ts
{ path: 'channel-push', component: () => import('pages/ChannelPushPage.vue'), meta: { title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] } }
{ path: 'channel-push/new', component: () => import('pages/ChannelPushFormPage.vue'), meta: { title: '新建推送', perm: 'channelPush:create' } }
{ path: 'channel-push/:id/edit', component: () => import('pages/ChannelPushFormPage.vue'), meta: { title: '编辑推送', perm: 'channelPush:create' } }
{ path: 'channel-push/:id', component: () => import('pages/ChannelPushDetailPage.vue'), meta: { title: '推送详情', perm: 'channelPush:viewOwn' } }
```

Expected menu:

```ts
{ path: '/channel-push', title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] }
```

### Existing Analog Files

| New file | Closest analog | Notes |
|---|---|---|
| `frontend/src/types/channelPush.ts` | `frontend/src/types/reimbursement.ts` | same Row/Detail/Attachment/ListFilters pattern; new status enum and duplicate hints |
| `frontend/src/stores/channelPush.ts` | `frontend/src/stores/reimbursement.ts` | same rows/total/page/size/filters/current/loading action structure |
| `frontend/src/pages/ChannelPushPage.vue` | `frontend/src/pages/ReimbursementPage.vue` | filter-bar, q-table, mobile cards, empty state, refresh/new buttons |
| `frontend/src/pages/ChannelPushFormPage.vue` | `frontend/src/pages/ReimbursementFormPage.vue` | q-form, create/edit mode, mobile sticky actions, attachment panel |
| `frontend/src/pages/ChannelPushDetailPage.vue` | `frontend/src/pages/ReimbursementDetailPage.vue` | detail layout, status chip, side card, action buttons, terminal messaging |
| `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue` | `frontend/src/components/reimbursement/ReimbursementAttachmentPanel.vue` | nearly direct copy with permission/store/type replacement |
| `frontend/src/components/channel-push/ChannelPushStatusChip.vue` | `frontend/src/components/reimbursement/ReimbursementStatusChip.vue` | same chip approach; different status labels/colors |
| `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue` | no exact analog | small Quasar dialog/table component to display `duplicateHints` |

### Type Model Needed

`frontend/src/types/channelPush.ts` should define:

```ts
export const CHANNEL_PUSH_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type ChannelPushStatus = (typeof CHANNEL_PUSH_STATUSES)[number];

export interface ChannelPushAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploaderId?: number;
  createdAt: string | null;
}

export interface ChannelPushReviewAction {
  id: number;
  actorId: number | null;
  actorName: string | null;
  type: string;
  comment: string | null;
  createdAt: string | null;
}

export interface ChannelPushRow {
  id: number;
  studentName: string;
  studentPhone: string;
  studentAge: number | null;
  studentEducation: string | null;
  studentGender: string | null;
  intentStatus: string | null;
  intentNote: string | null;
  remark: string | null;
  status: ChannelPushStatus;
  submittedAt: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  attachmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ChannelPushDetail = ChannelPushRow & {
  attachments: ChannelPushAttachment[];
  reviewActions: ChannelPushReviewAction[];
};

export interface ChannelPushDuplicateHint {
  id: number;
  studentName: string;
  studentPhone: string;
  status: ChannelPushStatus;
  submittedAt: string | null;
}

export interface ChannelPushWritePayload { ... }
export interface ChannelPushListFilters { keyword: string; status: string; dateFrom: string; dateTo: string; }
export interface ChannelPushListResponse { rows: ChannelPushRow[]; total: number; page: number; size: number; }
export interface ChannelPushSubmitResponse { push: ChannelPushDetail; duplicateHints: ChannelPushDuplicateHint[]; }
```

Planner note: exact `reviewActions` / `reviewComment` field names should be verified against `serializeChannelPushDetail` before execution. If the backend DTO uses `reviewActions` only, derive rejection reason in detail page from latest REJECT action comment.

### Store Shape Needed

`useChannelPushStore` should mirror reimbursement store but point to `/channel-push`:

- `fetchMine(filters?)` → `GET /channel-push/mine`
- `fetchDetail(id)` → `GET /channel-push/:id`
- `create(payload, files)` → multipart `POST /channel-push`
- `update(id, payload)` → `PATCH /channel-push/:id`
- `cancel(id)` → `POST /channel-push/:id/cancel`
- `addAttachments(id, files)` → multipart `POST /channel-push/:id/attachments`
- `previewAttachmentBlob(id, attachmentId)` → blob `GET preview`
- `downloadAttachment(id, attachmentId)` → blob `GET download`
- `deleteAttachment(id, attachmentId)` → `DELETE attachment`

Important implementation details:

- For create multipart, append `payload` as `JSON.stringify(normalizeChannelPushPayload(payload))`.
- Append files using key `attachments`, not `file`.
- For add attachments, append every file with key `attachments`.
- Do not set `Content-Type` manually; let browser set multipart boundary.
- Keep loading flags consistent with reimbursement store.

## UI Pitfalls and Planning Constraints

### Pitfall 1: Phone Validation Mismatch

CONTEXT.md D-05 suggested light frontend validation, but backend service normalizes and validates Chinese mainland mobile via `PHONE_REGEX = /^1[3-9]\d{9}$/`, stripping spaces, dashes, parentheses, and `+86`/`86` prefix.

Planning implication:

- Frontend should not claim broad international phone support.
- It can accept loose input and show "请输入有效手机号" on backend error, or implement the same normalize helper to avoid round-trip failures.
- To match current backend, preferred frontend helper should strip `\s - ( ) +` and leading `86`, then validate `^1[3-9]\d{9}$` before submit.
- If this conflicts with D-05, the backend contract wins because Phase 33 must consume existing API.

### Pitfall 2: Attachment Key Differs from Reimbursement

Reimbursement attachment upload uses `file`; channel push uses `attachments` and can accept multiple files. Directly copying `ReimbursementAttachmentPanel` without changing the form-data key will fail.

Planning implication:

- `ChannelPushAttachmentPanel` must call `store.addAttachments(id, files)` and store must append `attachments` for each file.
- Create form also uses `attachments`, not `file`.

### Pitfall 3: Duplicate Hints Are Response-Scoped

`duplicateHints` come from create/edit response, not list response.

Planning implication:

- Show dialog immediately after create/edit if hints exist.
- To show a banner on the detail page, pass hints through route state/query is not reliable after refresh; better banner should be limited to post-submit local state or current page state unless backend detail exposes duplicate data.
- CONTEXT.md requested detail banner; planner should either implement a local post-submit banner on navigation or include a lightweight component that only renders when duplicate hints are available in the current component state.
- Do not add a new backend duplicate-detail endpoint in this phase.

### Pitfall 4: Employee Menu Isolation Should Be Tested via Permissions, Not Role Strings

`CHANNEL_PARTNER` users lack employee permissions. Existing menu filtering is permission-based.

Planning implication:

- Tests should assert `MainLayout` menu config includes `channelPush:*` permissions and router meta uses them.
- If adding tests, prefer source/route contract tests or component unit tests with mocked `auth.hasPerm` / `hasAnyPerm`.
- Do not implement `if role === 'CHANNEL_PARTNER'` path filtering.

### Pitfall 5: Detail Page Rejection Reason Source

Requirement NOTIF-03 asks partner to see rejection reason and audit time. Backend Phase 32 reserved approval/rejection for Phase 35, but data model already has review actions/timeline fields.

Planning implication:

- Detail UI must render whatever `reviewActions` are returned and derive status/history generically.
- If no rejection comment exists before Phase 35, show `-` instead of inventing placeholder.
- Plan should not modify backend just to seed rejection reasons.

## Recommended Plan Slicing

The roadmap estimates 4 plans. A good split is:

### Plan 33-01 — Types, Store, Routes, Menu, Permission Shell

Files:

- create `frontend/src/types/channelPush.ts`
- create `frontend/src/stores/channelPush.ts`
- modify `frontend/src/router/routes.ts`
- modify `frontend/src/layouts/MainLayout.vue`
- add focused tests for store/types/router/menu if project pattern supports it

Covers:

- PARTNER-04
- PARTNER-05
- PUSH API client foundation

Dependencies:

- none; unlocks all UI pages.

### Plan 33-02 — My Pushes List UI

Files:

- create `frontend/src/pages/ChannelPushPage.vue`
- create `frontend/src/components/channel-push/ChannelPushStatusChip.vue`
- possibly tests under `frontend/src/pages/__tests__/` or source contract tests

Covers:

- PUSH-06
- NOTIF-03 list status visibility
- route/menu visible entry

Dependencies:

- depends on 33-01.

### Plan 33-03 — Create/Edit Form + Attachments + Duplicate Dialog

Files:

- create `frontend/src/pages/ChannelPushFormPage.vue`
- create `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue`
- create `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue`
- optionally create helpers in `types/channelPush.ts` if not done in 33-01

Covers:

- PUSH-01
- PUSH-02
- PUSH-05 edit half
- DEDUP-01
- DEDUP-02

Dependencies:

- depends on 33-01.
- can run in same wave as 33-02 only if file ownership excludes shared `types/channelPush.ts`; otherwise sequential.

### Plan 33-04 — Detail Page, Cancel UX, Terminal State Messaging, Final Verification

Files:

- create `frontend/src/pages/ChannelPushDetailPage.vue`
- create optional `ChannelPushActionTimeline.vue` if detail needs timeline extraction; avoid if simple inline list is enough
- update tests/contracts

Covers:

- PUSH-05 cancel/edit state guard
- NOTIF-03 detail status/rejection/audit visibility
- success criteria 4/5

Dependencies:

- depends on 33-01, 33-02, 33-03.

## Verification Commands and Checks

Frontend automated gates should include:

```bash
cd frontend && bun run build
cd frontend && bun run test -- --run
```

If the test command is not configured exactly this way, executor should inspect `frontend/package.json` and use the existing project script.

Backend should not need full retest, but a smoke check may run the focused channel-push tests if source contract changes are suspected. Phase 33 should not edit backend code.

Source-level checks:

- `frontend/src/router/routes.ts` contains `path: 'channel-push'`, `path: 'channel-push/new'`, `path: 'channel-push/:id/edit'`, `path: 'channel-push/:id'`.
- `frontend/src/layouts/MainLayout.vue` contains `title: '我的推送'` and `channelPush:viewOwn`.
- `frontend/src/stores/channelPush.ts` contains `api.get('/channel-push/mine'`, `api.post('/channel-push'`, `api.patch(`/channel-push/${id}``, `api.post(`/channel-push/${id}/cancel``.
- Store multipart create uses `formData.append('payload', JSON.stringify(...))` and `formData.append('attachments', file)`.
- Attachment panel accept list contains `image/jpeg,image/png,image/webp,application/pdf`.
- Mutation UI checks `status === 'PENDING'` before rendering edit/cancel/delete/upload.

Manual browser checks are required because this is a UI phase:

1. Login as a `CHANNEL_PARTNER` account.
2. Verify only 「我的推送」 and allowed personal controls are visible; employee business menus are hidden.
3. Directly navigate to `/users`, `/visits`, `/reimbursements`, `/templates`, `/submissions`; each should route to `/403`.
4. Create a push with required fields only; ensure success and list/detail visibility.
5. Create or edit a duplicate `(studentName, studentPhone)`; ensure duplicate dialog shows conflict rows and does not block submission.
6. Upload image and PDF attachments; preview image; download PDF.
7. Edit a PENDING push; cancel a PENDING push after confirm.
8. Verify terminal state hides edit/cancel/upload/delete and shows explanatory message.
9. Repeat list/form/detail on a mobile viewport.

## Validation Architecture

### Automated Validation Layers

1. **Contract/static checks**
   - Route and menu permission strings are present exactly once where expected.
   - `channelPush` store methods call the correct endpoint strings.
   - Multipart payload uses `payload` and `attachments` keys.
   - No backend source files are modified by Phase 33 plans.

2. **Type/build checks**
   - `cd frontend && bun run build` exits 0.
   - `cd frontend && bun run test -- --run` exits 0, or documented focused Vitest subset exits 0 if full test suite has known unrelated failures.

3. **Component/store tests**
   - `types/channelPush.ts` helper tests for status labels, filters, phone normalization, payload normalization.
   - Store tests mock `api` and assert endpoint/multipart behavior.
   - Page/source tests assert `PENDING` gates and terminal state messaging are wired.

4. **Manual UAT**
   - Browser testing of PC and mobile viewport as listed above.
   - For final completion, executor must explicitly report whether UI was tested in browser; if not, state why.

### Acceptance Signals

Phase 33 should be considered ready only when:

- All Phase 33 requirement IDs appear in plans and implementation summaries.
- Frontend build passes.
- Store and route/menu contract tests pass or equivalent grep checks are recorded.
- Manual browser UAT covers partner login, route isolation, create/list/detail/edit/cancel, duplicate hint, attachment preview/download, and mobile layout.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Phone validation mismatch with CONTEXT D-05 | Create form appears valid but backend rejects | Mirror backend normalization or explicitly surface backend error; planner should include exact helper |
| Copying reimbursement upload with wrong `file` key | Attachments silently fail | Store acceptance criteria must grep for `formData.append('attachments'` |
| Duplicate banner requested on detail but no persistent API data | Planner may invent backend change | Keep duplicate dialog post-submit; optional detail banner only from current component state |
| Overlapping plan file ownership | Parallel plans edit same type/store files | Plan 33-01 owns shared types/store/routes/menu; later plans only consume or append narrowly |
| Role-based special cases | RBAC drift and future bugs | Use permissions only; acceptance criteria reject `CHANNEL_PARTNER` special-casing in router/menu |
| Skipping browser UAT | UI correctness unverified | Plan 33-04 must include manual PC/Mobile browser verification |

## Research Complete

Phase 33 can be planned as four frontend plans with a single dependency chain: foundation → list/form → detail/final verification. The most important plan constraints are: do not change backend, mirror existing v1.4 reimbursement UI patterns, use permission-based isolation, use multipart keys `payload` + `attachments`, keep PENDING-only mutation UX, and verify the UI in a browser.

## RESEARCH COMPLETE
