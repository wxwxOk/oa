# Feature Research

**Domain:** Custom Form Collection System (Enterprise OA)
**Researched:** 2026-04-20
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Form Template CRUD | Basic management — create, edit, copy, delete templates | LOW | RBAC-gated. Prisma model with JSONB `schema` field |
| Drag-and-Drop Form Designer | Every form builder since Google Forms has this | HIGH | Core complexity. Use vue-draggable-plus for drag reordering. 3-panel layout: palette / canvas / properties |
| Basic Field Types: Text, Textarea, Radio, Checkbox, Date, Phone | Minimum field set for digitizing paper forms | MEDIUM | Each field type = a Vue component + JSON schema definition |
| Form Preview | Designers need to see what fillers will see | LOW | Reuse FormRenderer component in read-only mode |
| Share Link Generation | Core requirement — distributing forms externally | LOW | nanoid(12) token, store ShareLink record with sharer identity |
| Anonymous (No-Login) Form Filling | External people must fill without accounts | MEDIUM | Separate public route bypassing authGuard. Validate via share token |
| Form Submission Storage | Collected data must persist | LOW | FormSubmission model with JSONB data field |
| Submission List & Detail View | Staff need to see what was collected | MEDIUM | Paginated table. Detail view renders data using template schema |
| Browser Print | Users explicitly expect print capability | LOW | `window.print()` with `@media print` CSS |
| Mobile-Responsive Form Filling | External fillers will use phones | MEDIUM | Quasar handles responsive. Use full-width fields, native input types |
| Form Validation (Required, Format) | Users expect basic validation | LOW | Quasar's `rules` prop + server-side validation |
| Template Status (Draft/Published) | Prevent sharing incomplete forms | LOW | `status` enum: DRAFT / PUBLISHED. Only published can generate share links |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Handwritten Signature Pad | Directly replaces paper signatures — key differentiator | MEDIUM | signature_pad v5.1, canvas-based. Export as JPEG base64 (compressed). Must work on mobile touch |
| PDF Export via Browser | Professional output for archival | LOW | Browser "Save as PDF" from print dialog. Zero dependencies. Chinese text renders correctly |
| Filler Identity Configuration | Template creator decides whether to require name/phone | LOW | Boolean flags in template settings JSON |
| Share Link Tracking (Who Shared) | Know which employee distributed which link | LOW | ShareLink.sharedBy references User.id |
| Basic Statistics Dashboard | Employee share count and collection count | MEDIUM | SQL COUNT aggregations. Simple Quasar table display |
| Template Duplication | Copy existing template to create variations | LOW | Deep-copy schema JSON into new record |
| Share Link Expiration | Control how long a form stays open | LOW | `expiresAt` timestamp on ShareLink |

### Anti-Features (Do NOT Build in v1.1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Conditional Logic / Branching | "Show field B only if A = X" | Massive complexity: rule engine, validation complications, breaks print layout | Keep forms flat and linear |
| Multi-Column Grid Layout | "Put two fields side by side" | Breaks mobile responsiveness, complicates print CSS | Single-column layout only |
| Real-Time Collaboration | "Multiple people editing same template" | Requires CRDT/OT, WebSocket state sync | Single-editor with optimistic locking |
| Workflow / Approval | "Route submissions for manager approval" | This is a workflow engine, not a form feature. PROJECT.md defers to v2.0+ | Flat data records, optional status field |
| File Upload Fields | "Let fillers attach photos" | Requires file storage infrastructure, virus scanning | Defer to v1.2 |
| Multi-Page / Multi-Step Forms | "Break long forms into pages" | Navigation state, partial save, progress tracking | Single-page scrollable with section dividers |
| Custom CSS / Theming Per Form | "Brand each form differently" | CSS injection = security risk, breaks print consistency | System dark/light mode only |
| Server-Side PDF Generation | "Generate PDF programmatically" | +400MB Docker image (Chromium), Bun compat issues, CJK font problems | Browser print + Save as PDF |
| CSV/Excel Export | "Bulk data export" | Nice-to-have but not in v1.1 scope | Defer to v1.2 |

## Feature Dependencies

```
[RBAC Permissions] (existing)
    └──> [Form Template CRUD]
             ├──> [Form Designer (drag-drop)]
             │        └──> [Field Type Components]
             │                 └──> [Signature Pad]
             ├──> [Template Status (draft/published)]
             │        └──> [Share Link Generation]
             │                 ├──> [Anonymous Form Filling]
             │                 │        └──> [Form Submission Storage]
             │                 │                 ├──> [Submission List & Detail]
             │                 │                 │        └──> [Browser Print / PDF]
             │                 │                 └──> [Statistics Dashboard]
             │                 └──> [Share Link Tracking]
             └──> [Form Preview]

[Filler Identity Config] ──enhances──> [Anonymous Form Filling]
[Template Duplication] ──enhances──> [Form Template CRUD]
[Share Link Expiration] ──enhances──> [Share Link Generation]
```

## MVP Build Order

1. Form Template CRUD with JSONB schema storage (foundation)
2. Form Designer with basic fields: text, textarea, radio, checkbox, date, phone
3. Signature field in designer (key differentiator)
4. Share link generation with sharer tracking (nanoid tokens)
5. Public form filling page — unauthenticated route
6. Submission storage and list view
7. Submission detail view with browser print
8. Basic statistics dashboard

Defer to v1.2: CSV export, conditional logic, file uploads, email notifications.

## Sources

- PROJECT.md requirements (FR-7 through FR-14)
- Chinese market form tools: Tencent Docs forms, WPS forms, Feishu forms (table stakes reference)
- [vue-draggable-plus](https://github.com/alfred-skyblue/vue-draggable-plus)
- [signature_pad](https://github.com/szimek/signature_pad)
