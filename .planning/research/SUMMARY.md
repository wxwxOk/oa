# Project Research Summary

**Project:** OA v1.1 - Custom Form Collection System
**Domain:** Enterprise form builder with public submission, signature capture, and print/PDF export
**Researched:** 2026-04-20
**Confidence:** HIGH

## Executive Summary

OA v1.1 adds a custom form collection system to an existing authenticated OA platform. The pattern is well-established: admin designs a form template (JSONB schema), generates a share link (nanoid token), external users fill the form anonymously (including handwritten signature), and staff view/print collected data. The existing Vue 3 + Quasar + Elysia + Prisma + PostgreSQL stack handles this cleanly with only 3 new frontend dependencies (vue-draggable-plus, signature_pad, nanoid) and 1 backend addition (nanoid). No new infrastructure is needed.

The recommended approach stores form schemas and submission data as PostgreSQL JSONB, uses Elysia route group isolation to separate public (no-auth) endpoints from authenticated ones, and relies on browser `window.print()` with `@media print` CSS for PDF export — avoiding server-side PDF generation entirely. This sidesteps the two biggest technical traps: Chromium-in-Docker complexity and CJK font rendering failures in jsPDF. The form designer uses a simple ordered field list with drag reorder (not a grid layout), keeping frontend complexity manageable.

The critical risks are: (1) auth guard misconfiguration leaking onto public routes or vice versa — mitigated by explicit Elysia group separation from day one; (2) form schema versioning — template edits after submissions exist will corrupt historical data unless a version snapshot mechanism is built into the foundation; (3) XSS via user-defined schema content — all schema-derived text must use Vue's `{{ }}` interpolation, never `v-html`. These three must be addressed in the first phase, not retrofitted.

## Key Findings

### Recommended Stack

The existing stack requires zero changes. Three lightweight frontend libraries and one backend library are the only additions.

**New dependencies only:**
- vue-draggable-plus v0.6: Drag-drop form designer — actively maintained, Vue 3 Composition API native
- signature_pad v5.1: Handwritten signature capture — zero-dep, 5KB gzipped
- nanoid v5: Share link tokens — 118 bytes, cryptographically secure, URL-safe 12-char tokens

**Key decisions (no library needed):**
- PDF export: Browser `window.print()` + `@media print` CSS (zero deps, Chinese text works natively)
- Form schema storage: Prisma `Json` type -> PostgreSQL `jsonb` + Zod validation at API layer

### Expected Features

**Must have (table stakes):**
- Form Template CRUD with RBAC and JSONB schema storage
- Drag-and-drop form designer (3-panel: palette / canvas / properties)
- Basic field types: text, textarea, radio, checkbox, date, phone
- Share link generation with nanoid tokens
- Anonymous form filling (no login required)
- Submission storage, list view, detail view
- Browser print with `@media print` CSS
- Mobile-responsive form filling
- Template status lifecycle (Draft / Published / Archived)

**Should have (differentiators):**
- Handwritten signature pad (key value proposition)
- Share link tracking (which employee shared which link)
- Basic statistics dashboard
- Template duplication, share link expiration/revocation

**Defer to v1.2+:**
- Conditional logic, multi-column layout, file uploads, CSV export, server-side PDF, workflow/approval

### Architecture Approach

3 new Prisma models (FormTemplate, FormShare, FormSubmission), 3 backend route modules, 5 frontend pages. Public form at `/f/:token` bypasses auth entirely. All form data flows through JSONB with `schemaVersion` linking submissions to template versions.

**Major components:**
1. FormTemplate model + CRUD routes — schema storage, status lifecycle, RBAC-gated
2. FormDesigner page — vue-draggable-plus field palette, schema editor, live preview
3. FormRenderer component — reusable dynamic renderer (designer preview AND public fill)
4. PublicFormPage — standalone `/f/:token`, no auth, signature pad, anonymous POST
5. FormShare model + routes — nanoid tokens, expiration, revocation, sharer tracking

### Critical Pitfalls

1. **Auth guard leaking onto public routes** — Separate `/api/v1/public` Elysia group with NO auth. Phase 1.
2. **Schema versioning missing** — `schemaVersion` auto-increment on templates, snapshot per submission. Phase 1.
3. **Share link IDOR** — nanoid(12) with 128+ bits entropy, never expose auto-increment IDs. Phase 2.
4. **Signature base64 bloat** — JPEG quality 0.5, 400x200px canvas, exclude from list queries. Phase 2.
5. **XSS via schema content** — Never `v-html`, always `{{ }}` interpolation, server-side validation. Phase 1.

## Implications for Roadmap

### Phase 1: Foundation — Database + Template CRUD + Form Designer
**Rationale:** Everything depends on the database schema and FormRenderer. Schema versioning must be baked in from start. Auth route separation must be established before public endpoints.
**Delivers:** Prisma models with migrations, backend CRUD with RBAC, FormRenderer, FormDesigner with drag-drop, form preview, template status lifecycle.
**Features:** Form Template CRUD, Designer, Basic Fields, Preview, Status, Duplication, Validation.
**Pitfalls addressed:** Auth guard separation (#1), Schema versioning (#2), XSS sanitization (#5).

### Phase 2: Share + Public Fill + Signature
**Rationale:** Core value delivery — external users can fill forms. Signature is key differentiator. Security (IDOR, rate limiting, CSRF, dedup) must be correct from first public endpoint.
**Delivers:** Share link gen/revocation, public form page at `/f/:token`, signature pad, submission storage, filler identity config.
**Features:** Share Links, Anonymous Filling, Signature Pad, Submissions, Share Tracking, Expiration, Identity Config.
**Pitfalls addressed:** Share link IDOR (#3), Signature bloat (#4), Rate limiting, CSRF, Duplicate prevention.

### Phase 3: Data View + Print + Statistics
**Rationale:** With submissions flowing, staff need to view/print data. Browser print is zero-dep. Stats are simple SQL aggregations.
**Delivers:** Submission list with pagination, detail view, browser print/PDF, statistics dashboard.
**Features:** Submission List & Detail, Print/PDF Export, Statistics Dashboard.
**Pitfalls addressed:** PDF Chinese font (#6 — avoided by browser print), Signature excluded from list queries.

### Phase Ordering Rationale
- Phase 1 before 2: DB schema with versioning must exist before submissions. FormRenderer must exist before public fill page.
- Phase 2 before 3: Submissions must exist before data view/stats. Security hardening can't be deferred.
- Signature in Phase 2 (not 1): Signature is a fill-time field, belongs with public form page.

### Research Flags

Needs deeper research during planning:
- **Phase 1 (Form Designer):** vue-draggable-plus composable vs component API for 3-panel layout. Highest-complexity frontend component.
- **Phase 2 (Public Form Security):** Rate limiting strategy, CSRF for Elysia, idempotency key design.

Standard patterns (skip research-phase):
- **Phase 3 (Data View + Print):** Paginated Quasar table, `@media print` CSS, SQL COUNT — all well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack unchanged. New deps mature with clear rationale |
| Features | HIGH | Derived from PROJECT.md + Chinese market analysis. Clear prioritization |
| Architecture | HIGH | JSONB schema pattern proven (Form.io, SurveyJS). Clear dependency chain |
| Pitfalls | HIGH | Sourced from real CVEs, open-source post-mortems, library GitHub issues |

**Overall confidence:** HIGH

### Gaps to Address

- Signature storage long-term: v1.1 uses compressed base64 in JSONB (fine at SME scale). Monitor DB size; migrate to file storage if >10K submissions with signatures.
- Elysia route group isolation: Issue #1752 documents specificity bugs. Verify with integration tests early in Phase 1.
- Form designer UX: 3-panel drag-drop is highest-risk frontend component. Consider 2-panel fallback if timeline is tight.

## Sources

### Primary (HIGH confidence)
- [vue-draggable-plus](https://github.com/alfred-skyblue/vue-draggable-plus) — Active, Jan 2026
- [signature_pad v5.1.3](https://github.com/szimek/signature_pad) — Dec 2025
- [nanoid](https://github.com/ai/nanoid) — 118 bytes, crypto-secure
- [Prisma Json fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields)
- [Open Forms IDOR (GHSA-2g49-rfm6-5qj5)](https://github.com/open-formulieren/open-forms/security/advisories/GHSA-2g49-rfm6-5qj5)
- [Form.io Form Revisions](https://form.io/features/form-revisions-form-json-schema)

### Secondary (MEDIUM confidence)
- [react-jsonschema-form XSS (#4254, #4065)](https://github.com/rjsf-team/react-jsonschema-form/issues/4254)
- [CVE-2026-22787](https://nvd.nist.gov/vuln/detail/CVE-2026-22787) — html2pdf.js XSS
- [Elysia route specificity (#1752)](https://github.com/elysiajs/elysia/issues/1752)
- [jsPDF Chinese issues (#671)](https://github.com/MrRio/jsPDF/issues/671)

---
*Research completed: 2026-04-20*
*Ready for roadmap: yes*
