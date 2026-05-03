# Phase 26: 两级审核与手写签字 - Research

**Researched:** 2026-05-03
**Domain:** Bun/Elysia reimbursement review API + Vue 3/Quasar signature review UI
**Confidence:** HIGH

<user_constraints>
## User Constraints from CONTEXT.md

### Locked Decisions
- Continue inside the fixed `reimbursement` module; do not reuse `ApprovalTask`, `ApprovalApplication`, public form flow, or `/approval/applications` pages.
- Department actionable queue means `status === DEPARTMENT_REVIEW`, applicant department equals reviewer department, and the actor has `reimbursement:department-review`.
- Finance actionable queue means `status === FINANCE_REVIEW` and the actor has `reimbursement:finance-review`.
- Ordinary `reimbursement:list` is read visibility only, not approval authority.
- Every review action must be transactional: permission check, current-state check, state update, and append `ReimbursementAction`.
- Legal transitions are fixed: `DEPARTMENT_REVIEW -> FINANCE_REVIEW`, `DEPARTMENT_REVIEW -> REJECTED`, `FINANCE_REVIEW -> APPROVED`, and `FINANCE_REVIEW -> REJECTED`.
- Department and finance approvals require a non-empty Canvas PNG signature; rejections require a non-empty reason/comment and no signature.
- Signature images are action-bound evidence, not `ReimbursementAttachment` rows and not data URLs in the database.
- Signature preview must use authenticated axios blob requests and object URLs; no direct protected URL in `<img src>`.
- Frontend extends `/reimbursements`, `useReimbursementStore`, `ReimbursementDetailPage.vue`, `ReimbursementPage.vue`, and `ReimbursementActionTimeline.vue`.
- Desktop review actions live in a detail side card; mobile review actions use a sticky bottom action area.

### Deferred
- Excel export, UAT closure, and milestone archive remain Phase 27.
- OCR, invoice verification, duplicate checks, payment/accounting, statistics dashboard, amount branching, countersignature, delegation, timeout escalation, and BPMN workflow remain out of scope.
</user_constraints>

<research_summary>
## Summary

Phase 26 is a cross-layer closure phase for the fixed reimbursement module. The backend already has the correct Prisma schema, status enum, action enum, action signature metadata fields, object-visibility helpers, safe attachment storage, and a transaction-bound `submitReimbursementDraft()` pattern. The frontend already has fixed reimbursement routes, a Pinia API boundary, authenticated blob preview/download patterns, a read-only detail page, a timeline component with signature metadata, and an existing `signature_pad`-based Canvas component.

The safest plan is to build Phase 26 in four waves:

1. Wave 0 contracts for backend review helpers/routes and frontend review/signature source/store behavior.
2. Backend actionable queues, review transitions, signature PNG file helpers, and protected signature preview endpoint.
3. Frontend review DTOs/store methods, reusable signature pad, and timeline signature image preview.
4. List/detail reviewer UX, mobile sticky actions, and final focused validation.

No new dependency is required. `signature_pad` is already installed on the frontend and `nanoid`/Bun `File` APIs are already used on the backend.
</research_summary>

<standard_stack>
## Standard Stack

| Layer | Existing Tool | Phase 26 Use |
|-------|---------------|--------------|
| Backend runtime | Bun + Elysia | Multipart approve endpoints, JSON reject endpoints, protected signature preview. |
| Backend validation | Elysia `t.Object`, `t.File`, service normalizers | Reject trusted fields; require PNG signature for approve and non-empty reason for reject. |
| ORM | Prisma 5.22 | Reuse `ReimbursementApplication` and `ReimbursementAction`; no schema migration required. |
| File storage | Existing reimbursement local upload root | Add signature-only PNG helpers under safe relative paths. |
| Frontend | Vue 3 + Quasar + TypeScript | Review queues, dialogs, mobile sticky action bar, timeline images. |
| State | Pinia + axios boot instance | Store-owned review API methods and authenticated signature blob preview. |
| Signature capture | `signature_pad` | Reuse/adapt Canvas dialog to produce PNG data URL/File. |
| Tests | Bun test + Vitest source/store contracts | Extend existing reimbursement suites; avoid global suites with known unrelated failures. |

**Installation:** none.
</standard_stack>

<backend_architecture>
## Backend Architecture

### Review State and Nodes

Current `reimbursement.state.ts` already defines legal transitions and `REIMBURSEMENT_DEPARTMENT_REVIEW_NODE = '部门初审'`. Phase 26 should add `REIMBURSEMENT_FINANCE_REVIEW_NODE = '财务复核'` and continue using `assertReimbursementTransition()` for all review actions.

### Actionable Queues

Do not reuse `buildVisibilityWhere()` as the actionable queue. It intentionally includes employee own rows and finance terminal rows. Add dedicated list functions with the same pagination/filter normalization as `listReimbursements()`:

- `listDepartmentReviewReimbursements(actor, filters)` filters `status: 'DEPARTMENT_REVIEW'` and `applicantDepartmentId: actorDepartmentId`, and rejects actors without `reimbursement:department-review`.
- `listFinanceReviewReimbursements(actor, filters)` filters `status: 'FINANCE_REVIEW'`, and rejects actors without `reimbursement:finance-review`.

### Review Actions

Recommended service signatures for executor consistency:

```ts
export type ReimbursementReviewDecision = 'approve' | 'reject';
export type ReimbursementReviewStage = 'department' | 'finance';
export type ReimbursementReviewInput = { comment?: unknown; signature?: File | null };

export function normalizeReimbursementReviewInput(
  input: ReimbursementReviewInput,
  decision: ReimbursementReviewDecision,
): { comment: string | null; signature: File | null };

export async function listDepartmentReviewReimbursements(actor: ReimbursementActor, input?: ReimbursementListFilters): Promise<...>;
export async function listFinanceReviewReimbursements(actor: ReimbursementActor, input?: ReimbursementListFilters): Promise<...>;
export async function approveDepartmentReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput): Promise<...>;
export async function rejectDepartmentReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput): Promise<...>;
export async function approveFinanceReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput): Promise<...>;
export async function rejectFinanceReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput): Promise<...>;
```

All four action functions should use `prisma.$transaction()`. Approval writes action type `DEPARTMENT_APPROVE` or `FINANCE_APPROVE` and signature metadata. Rejection writes action type `DEPARTMENT_REJECT` or `FINANCE_REJECT` and no signature metadata. Department approval sets status `FINANCE_REVIEW`; finance approval sets status `APPROVED` and `completedAt`; both rejections set status `REJECTED` and `completedAt`.

### Signature File Helpers

Reuse the safety approach from `reimbursement-file.service.ts`. Add signature-specific constants/helpers to avoid weakening attachment rules:

- `ALLOWED_REIMBURSEMENT_SIGNATURE_MIME_TYPES = ['image/png']`
- `MAX_REIMBURSEMENT_SIGNATURE_SIZE = 2 * 1024 * 1024`
- `assertAllowedReimbursementSignature(file)` rejects non-PNG, empty, oversized, or blank-name files.
- `buildReimbursementSignatureRelativePath(applicationId, actionType, storedName)` returns `signatures/${applicationId}/${actionType}/${storedName}`.
- `getSafeReimbursementSignatureStoredName()` returns `${nanoid(16)}.png`.
- Signature preview headers should be inline `image/png` with a sanitized `signature.png` filename.

The database keeps only the relative path, MIME, and size on `ReimbursementAction`.

### Routes

Add review routes before the generic `GET /:id` route:

| Method | Path | Guard | Purpose |
|--------|------|-------|---------|
| GET | `/review/department` | `reimbursement:department-review` | Department actionable queue. |
| GET | `/review/finance` | `reimbursement:finance-review` | Finance actionable queue. |
| POST | `/:id/department-review/approve` | `reimbursement:department-review` | Multipart approval with `signature` and optional `comment`. |
| POST | `/:id/department-review/reject` | `reimbursement:department-review` | JSON rejection with required `comment`. |
| POST | `/:id/finance-review/approve` | `reimbursement:finance-review` | Multipart approval with `signature` and optional `comment`. |
| POST | `/:id/finance-review/reject` | `reimbursement:finance-review` | JSON rejection with required `comment`. |
| GET | `/:id/actions/:actionId/signature` | authenticated read + object visibility | Protected signature image preview. |

Route responses should reuse `serializeReimbursementListResponse()` for queues and `serializeReimbursementRow()` or full detail reload patterns after actions.
</backend_architecture>

<frontend_architecture>
## Frontend Architecture

### Store-Owned API Boundary

Extend `useReimbursementStore`; pages/components should not import `api` directly.

Recommended store methods:

```ts
async fetchDepartmentReviewList(filters?: ReimbursementListRequest)
async fetchFinanceReviewList(filters?: ReimbursementListRequest)
async departmentApprove(id: number, payload: ReimbursementReviewPayload)
async departmentReject(id: number, payload: ReimbursementRejectPayload)
async financeApprove(id: number, payload: ReimbursementReviewPayload)
async financeReject(id: number, payload: ReimbursementRejectPayload)
async previewSignatureBlob(applicationId: number, actionId: number)
```

Approval methods should build `FormData` and append `signature` as the exact multipart key. Rejection methods should send JSON `{ comment }`. Signature preview must call `/reimbursements/${applicationId}/actions/${actionId}/signature` with `{ responseType: 'blob' }`.

### Signature Capture

Create `frontend/src/components/reimbursement/ReimbursementSignaturePad.vue` by adapting `SignatureField.vue`, but keep it reimbursement-specific and lean. It should support desktop dialog and mobile maximized dialog, expose `save()`, `clear()`, and `isEmpty()`, and emit a PNG data URL. Convert data URL to `File` in a typed helper, for example:

```ts
export function reimbursementSignatureDataUrlToFile(dataUrl: string, fileName = 'signature.png'): File
```

### Timeline Signature Preview

Upgrade `ReimbursementActionTimeline.vue` from metadata-only to image preview. Add `applicationId` prop. For each action with signature metadata, call `store.previewSignatureBlob(applicationId, action.id)`, create an object URL, render `<img>` with that object URL, and revoke URLs on unmount. Keep submit/reject actions text-only.

### Reviewer UX

`ReimbursementPage.vue` can add review queue tabs or a scope filter under the existing reimbursement entry. Recommended labels:

- `全部可见`
- `待部门初审`
- `待财务复核`

Only show department/finance queue options when `auth.hasPerm('reimbursement:department-review')` or `auth.hasPerm('reimbursement:finance-review')` is true. Detail page should show review actions only for the current actionable status and permission:

- `DEPARTMENT_REVIEW` + `reimbursement:department-review`: show `部门初审通过` and `驳回申请`.
- `FINANCE_REVIEW` + `reimbursement:finance-review`: show `财务复核通过` and `驳回申请`.

Backend remains authoritative for department matching and illegal state/repeat handling.
</frontend_architecture>

<common_pitfalls>
## Common Pitfalls

| Pitfall | Why It Happens | Avoidance |
|---------|----------------|-----------|
| Using ordinary list visibility as actionable queue | `buildVisibilityWhere()` includes employee own rows and finance terminal visibility. | Implement dedicated department/finance queue functions and endpoints. |
| Writing data URL to database | Canvas returns data URL naturally. | Convert to PNG `File`/`Blob`; store safe relative path only. |
| Showing protected route in `<img src>` | Image tags bypass axios auth interceptors. | Fetch blob through store and render object URLs. |
| Treating signature as attachment | Attachment panel already exists and is draft-scoped. | Store signature metadata on `ReimbursementAction` only. |
| Allowing repeat/late approvals | UI hides buttons but stale tabs can submit. | Backend transaction checks status with `assertReimbursementTransition()`. |
| Forgetting `completedAt` on rejection | Rejection is terminal in this fixed module. | Set `completedAt` for both reject actions and finance approve. |
| Route shadowing by `/:id` | Elysia route order can make specific paths harder to reason about. | Register `/review/*`, action, and signature routes before `GET /:id`. |
| Weak frontend tests due to browser-only Canvas | Source/store contracts can still pin methods and copy. | Add focused source contracts; browser smoke remains manual. |
</common_pitfalls>

<validation_architecture>
## Validation Architecture

### Focused Automated Gates

Backend focused gate:

```bash
cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts && bun run build
```

Frontend focused gate:

```bash
cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build
```

### Test Coverage Targets

- Service tests: review queue scope, permission denial, review input normalization, signature required, reject reason required, legal transition constants, serialized action signature metadata.
- Route tests: exact review endpoint signatures, guards, multipart approve bodies, JSON reject bodies, protected signature endpoint, no direct absolute file path exposure.
- Store tests: queue endpoint paths, approve `FormData` key `signature`, reject JSON `{ comment }`, signature preview `responseType: 'blob'`, loading reset.
- Page source tests: review queue tabs, detail action visibility copy, signature dialog copy, required signature/reason UI, mobile sticky action class, no `/approval/applications`, no direct protected `<img src>` route.

### Known Suite Caveats

Phase 24 documented unrelated backend full-suite failures outside reimbursement scope. Phase 25 documented unrelated frontend browser-global suite failures outside reimbursement scope. Phase 26 validation should use focused reimbursement gates plus builds unless those external suites are separately repaired.
</validation_architecture>

<plan_recommendation>
## Recommended Plans

1. `26-01-PLAN.md` — Wave 0 backend/frontend reimbursement review contracts.
2. `26-02-PLAN.md` — Backend review queues, transitions, signature storage, and routes.
3. `26-03-PLAN.md` — Frontend review types/store/signature pad/timeline blob preview.
4. `26-04-PLAN.md` — Reviewer list/detail UX and final cross-layer validation.
</plan_recommendation>

---

*Phase: 26-reimbursement-review-signature*
*Research complete: 2026-05-03*
