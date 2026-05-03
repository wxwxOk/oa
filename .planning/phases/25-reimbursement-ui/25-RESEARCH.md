# Phase 25: 员工报销申请与详情页面 - Research

**Researched:** 2026-05-03
**Domain:** Vue 3 + Quasar fixed-module reimbursement frontend
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fixed reimbursement module only: `/reimbursements`, not dynamic `/approval/applications` or public form flow.
- Read routes use `permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review']`.
- Create/edit/submit actions are gated by `reimbursement:create`; attachment actions are gated by `reimbursement:attachment`.
- Desktop list uses `QTable` with server-side pagination; mobile list uses cards and a bottom filter dialog.
- Filters are limited to `status`, `category`, `dateFrom`, `dateTo`, `keyword`, `page`, and `size`; empty filters are omitted.
- Status values are exactly `DRAFT`, `DEPARTMENT_REVIEW`, `FINANCE_REVIEW`, `APPROVED`, and `REJECTED`.
- Category remains free text; no category dictionary/API is introduced.
- Form fields are fixed: title, category, occurredAt, amount, reason, payeeInfo, remark.
- Frontend validation mirrors backend: required title/category/occurredAt/amount/reason and amount > 0 normalized to two decimals.
- Attachment upload requires an existing draft ID; no local pending upload queue before draft creation.
- Direct submit on the new page creates a draft first, then calls `/reimbursements/:id/submit`.
- Only `DRAFT` can be edited or have attachments uploaded/deleted.
- Files are images/PDF only, 10MB max per file, 20 attachments max; upload field name is `file`.
- Preview/download uses authenticated axios blob requests and object URLs; no protected direct `<img src>` or `window.open` URLs.
- Detail page is read-only for submitted applications and displays attachments plus audit trail; review actions/signature capture are Phase 26.

### the agent's Discretion
- Form grouping labels, status chip color names, column widths, empty-state wording details, file icons, progress style, and error copy details.
- Detail/component split as long as API/data logic stays out of page-only code.
- Users with list/review read permissions can share the same list/detail experience in Phase 25.

### Deferred Ideas (OUT OF SCOPE)
- Department/finance review queues, approve/reject actions, Canvas signature capture, and reviewer panels — Phase 26.
- Excel export, UAT, and milestone archive — Phase 27.
- OCR, invoice verification, automatic duplicate checks, payment/accounting integration, statistics dashboards, amount-based branching, countersignature, delegation, timeout escalation, and generic form attachment fields.
</user_constraints>

<research_summary>
## Summary

Phase 25 is a frontend-only fixed business module on top of the completed Phase 24 reimbursement API. The standard approach in this codebase is to add a dedicated type module, a Pinia store that owns all authenticated API calls, route/menu wiring with `meta.perm`/`meta.permAny`, and focused Vitest source/store contracts before implementation.

The strongest implementation precedents are Phase 21 `VisitPage.vue` for fixed-module responsive list behavior and Phase 17 application pages for draft/submit detail flows. Quasar's documented `QTable @request` pattern matches the needed server-side pagination, and Quasar `QFile` supports native file restrictions that should be mirrored before the backend performs final validation.

**Primary recommendation:** create four executable plans: Wave 0 frontend contracts, Wave 1 types/store/routes/menu, Wave 2 attachment/form components, and Wave 3 list/detail pages plus final frontend validation.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | `^3.5.12` | Component model and Composition API | Existing frontend foundation. |
| Quasar | `^2.17.0` | UI components, table, dialog, file input, Notify | Existing OA admin UI system; no new design system needed. |
| Pinia | `^2.2.4` | Feature store and async action state | Existing per-module data-layer pattern. |
| Vue Router | `^4.4.5` | Authenticated routes and route meta | Existing route guard already supports `perm` and `permAny`. |
| Axios | `^1.7.7` | Authenticated API and blob requests | Existing `src/boot/axios` handles auth headers/refresh behavior. |
| Vitest | `^0.34.6` | Frontend contract tests | Existing focused source/store/type test style. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@quasar/extras` | `1.17.0` | Material icons | Reuse existing icon source for menu/actions. |
| Browser object URL APIs | native | Authenticated image preview | Use for axios blob preview and revoke after close/unmount. |
| `FormData` | native | Attachment multipart body | Append each selected file as `file`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `QFile` + store upload | `QUploader` | `QUploader` assumes direct URL upload; store-controlled axios is clearer for auth/blob/error handling. |
| Dedicated reimbursement module | Dynamic approval application flow | Dynamic flow conflicts with v1.4 fixed business model. |
| Authenticated blob preview | Direct protected URLs | Direct `<img src>`/new-window URLs may miss bearer auth and violate the locked contract. |

**Installation:** none. Use existing dependencies only.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
frontend/src/
├── types/reimbursement.ts
├── stores/reimbursement.ts
├── components/reimbursement/
│   ├── ReimbursementStatusChip.vue
│   ├── ReimbursementAttachmentPanel.vue
│   └── ReimbursementActionTimeline.vue
└── pages/
    ├── ReimbursementPage.vue
    ├── ReimbursementFormPage.vue
    └── ReimbursementDetailPage.vue
```

### Pattern 1: Store-owned API boundary
**What:** Pages call `useReimbursementStore`; the store owns list/detail/draft/submit/attachment/blob methods.
**When to use:** All `/reimbursements` calls, including preview/download.
**Example:**
```ts
const { data } = await api.get('/reimbursements', { params });
const blob = await api.get(url, { responseType: 'blob' });
```

### Pattern 2: Server-side `QTable`
**What:** Quasar `QTable` uses pagination with `rowsNumber`, `:loading`, and `@request`.
**When to use:** Desktop reimbursement list.
**Example:**
```vue
<q-table
  :rows="store.rows"
  :columns="columns"
  row-key="id"
  :pagination="pagination"
  :loading="store.loading"
  :rows-per-page-options="[10, 20, 50]"
  @request="onRequest"
/>
```

### Pattern 3: Draft-first upload
**What:** A new reimbursement must be saved to get an ID before `FormData` uploads are enabled.
**When to use:** Form page attachment panel.
**Example:**
```ts
const draft = currentId ? await store.updateDraft(currentId, payload) : await store.createDraft(payload);
await store.uploadAttachment(draft.id, file);
```

### Pattern 4: Authenticated blob preview
**What:** Fetch image/PDF blobs through the authenticated axios instance, create object URLs locally, revoke them after use.
**When to use:** Image preview and all downloads.
**Example:**
```ts
const blob = await store.previewAttachmentBlob(applicationId, attachmentId);
const url = URL.createObjectURL(blob);
// revoke in close handler or onUnmounted
```

### Anti-Patterns to Avoid
- **Direct protected URLs:** do not use backend preview/download URLs in `<img src>` or `window.open`.
- **Pre-draft local upload queue:** do not let files appear uploaded before a backend application ID exists.
- **Dynamic approval form reuse:** do not use `GridFormRenderer` or `/approval/applications` for fixed reimbursement fields.
- **Client-side authorization assumptions:** button hiding is UX only; keep backend object authorization as source of truth.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Desktop pagination | Custom table/grid | Quasar `QTable @request` | Existing pattern and server pagination support. |
| File picker restrictions | Custom hidden input validator only | Quasar `QFile` plus explicit helper validation | Built-in accept/max constraints and rejected event support. |
| App state/API layer | Page-local axios calls | Pinia feature store | Testable, consistent with Visit/Approval modules. |
| Permission navigation | New guard system | Existing `meta.perm`/`meta.permAny` and `v-perm` | Already implemented and tested in app shell. |
| Download naming | Remote URL opening | Axios blob + local anchor download | Preserves auth and original file name handling. |

**Key insight:** The risky parts are not visual widgets; they are preserving the backend contract: field names, permissions, state mutability, `file` multipart key, blob access, and empty-filter behavior.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Protected file preview fails in production
**What goes wrong:** `<img src="/api/v1/.../preview">` does not include bearer auth.
**Why it happens:** Image tags do not use the axios interceptor.
**How to avoid:** Always fetch blob through `api.get(..., { responseType: 'blob' })` and create an object URL.
**Warning signs:** Page source contains protected preview/download endpoints in template strings outside store blob methods.

### Pitfall 2: Attachment uploads before draft creation
**What goes wrong:** User selects files on a new unsaved form, but backend requires `/reimbursements/:id/attachments`.
**Why it happens:** UI treats upload as local state instead of backend-bound metadata.
**How to avoid:** Disable attachment panel until a draft ID exists; direct submit creates draft first.
**Warning signs:** Attachment panel accepts files when route has no ID and no saved draft ID.

### Pitfall 3: Submitted application remains editable
**What goes wrong:** Core fields or attachment delete remain available after submission.
**Why it happens:** UI forgets to branch on `status === 'DRAFT'`.
**How to avoid:** Centralize `isDraftReimbursement` helper and use it in form/detail/attachment panel.
**Warning signs:** `deleteAttachment`, `updateDraft`, or submit buttons are not status-guarded.

### Pitfall 4: Amount/date drift
**What goes wrong:** Amount sent as localized string or date displayed with timezone drift.
**Why it happens:** Using locale formatting for write payloads/business dates.
**How to avoid:** Normalize amount to `toFixed(2)` string; display business dates as first 10 characters of ISO/date strings.
**Warning signs:** `toLocaleDateString` appears in reimbursement helpers for `occurredAt`.

### Pitfall 5: Permission mismatch in read routes
**What goes wrong:** Review/list-capable users are blocked by an own-only frontend route.
**Why it happens:** Using `perm: 'reimbursement:own'` instead of `permAny`.
**How to avoid:** Use locked `permAny` array for list and detail routes/menu.
**Warning signs:** `reimbursement:own` appears as the only route/menu permission.
</common_pitfalls>

<code_examples>
## Code Examples

### Quasar `QFile` restriction pattern
```vue
<q-file
  v-model="selectedFiles"
  outlined
  multiple
  accept="image/jpeg,image/png,image/webp,application/pdf"
  :max-file-size="10 * 1024 * 1024"
  :max-files="remainingSlots"
  @rejected="onRejected"
/>
```

### Pinia store unit-test pattern
```ts
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});
```

### Vue Router meta permission pattern
```ts
{
  path: 'reimbursements',
  component: () => import('pages/ReimbursementPage.vue'),
  meta: {
    title: '我的报销',
    icon: 'receipt_long',
    permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'],
  },
}
```

### Multipart upload store pattern
```ts
const body = new FormData();
body.append('file', file);
const { data } = await api.post(`/reimbursements/${applicationId}/attachments`, body);
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Page-local API calls | Store-owned async actions with focused Vitest contracts | Easier to verify and reuse across list/form/detail. |
| Public file URLs for private files | Authenticated blob requests with object URLs | Preserves RBAC and avoids broken previews. |
| One desktop table for all breakpoints | Desktop table + mobile cards/filter sheet | Matches Quasar mobile usability expectations. |
| Ad hoc route guards | Route meta consumed by global guard | Existing app shell remains the authorization UX boundary. |

**New tools/patterns to consider:** none. Existing dependencies cover the phase.

**Deprecated/outdated:** adding a new upload library or dynamic form abstraction for this fixed module would add surface area without solving Phase 25 risks.
</sota_updates>

<open_questions>
## Open Questions

None blocking. Manual browser smoke should still verify real file picker behavior and object URL image preview after implementation.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/25-reimbursement-ui/25-CONTEXT.md` — locked Phase 25 decisions.
- `.planning/phases/25-reimbursement-ui/25-UI-SPEC.md` — UI and interaction contract.
- `.planning/phases/24-api/24-CONTEXT.md` and `24-VALIDATION.md` — backend endpoint/status/permission/file constraints.
- `backend/src/modules/reimbursement/reimbursement.route.ts` — exact Phase 24 routes and upload field.
- `backend/src/modules/reimbursement/reimbursement.service.ts` — DTO shape, amount/date behavior, visibility.
- `backend/src/modules/reimbursement/reimbursement-file.service.ts` — MIME/size/count constants.
- `frontend/src/pages/VisitPage.vue`, `frontend/src/stores/visit.ts`, `frontend/src/types/visit.ts` — fixed-module frontend pattern.
- `frontend/src/pages/ApprovalApplicationFormPage.vue`, `ApprovalApplicationDetailPage.vue` — applicant draft/submit/detail pattern.

### Official docs via Context7 (HIGH confidence)
- `/websites/quasar_dev` — `QTable @request`, `QFile` restrictions, dialog/bottom sheet guidance.
- `/vuejs/pinia` — store testing with `setActivePinia(createPinia())` and Vitest spies.
- `/vuejs/router` — route meta fields and global guard usage.

### Secondary
- Existing Phase 17/21 planning and validation files — plan structure and frontend verification gates.
</sources>

<metadata>
## Metadata

**Research scope:** Phase 25 frontend architecture, UI behavior, permission wiring, upload/download handling, test strategy.

**Confidence breakdown:**
- Standard stack: HIGH — directly from `frontend/package.json` and current app patterns.
- Architecture: HIGH — same structure is already used by Visit and Approval modules.
- Pitfalls: HIGH — driven by Phase 24 backend contract and browser/auth constraints.
- Code examples: HIGH — based on official docs and existing codebase conventions.

**Research date:** 2026-05-03
**Valid until:** 2026-06-02 for current project stack.
</metadata>
