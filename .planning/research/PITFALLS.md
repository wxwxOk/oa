# Pitfalls Research

**Domain:** Custom form collection system (form builder + public access + signature + PDF export) added to existing authenticated OA system
**Researched:** 2026-04-20
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Auth Guard Leaking onto Public Routes (or Vice Versa)

**What goes wrong:**
The existing OA system applies `authGuard` via Elysia's `derive` scoped to the `/api/v1` group. Adding public form-filling endpoints (FR-11) inside the same group will force unauthenticated users through JWT verification, returning 401. Conversely, placing public routes carelessly outside the group may accidentally expose internal endpoints or skip RBAC checks on form management APIs.

**Why it happens:**
Elysia's plugin composition model scopes middleware via `derive({ as: 'scoped' })`. When you `.use(authGuard())` inside a group, all routes in that group inherit it. Developers either: (a) put public routes in the authenticated group and wonder why they 401, or (b) create a separate unguarded group but accidentally include admin routes in it. Elysia issue #1752 documents route specificity bugs when composing multiple instances.

**How to avoid:**
- Create a separate route group for public endpoints: `.group('/api/v1/public', ...)` with NO auth middleware
- Keep all form management/admin routes inside the existing authenticated `/api/v1` group with `authGuard`
- Explicitly test both authenticated and unauthenticated access for every new endpoint
- Never rely on "excluding" routes from global middleware — use explicit inclusion

**Warning signs:**
- Public form URLs returning 401 during testing
- Form management endpoints accessible without login in browser devtools
- No clear separation between public and private route files in the codebase

**Phase to address:** Phase 1 (Foundation) — route architecture must be established before any feature routes are added

---

### Pitfall 2: Form Schema Versioning — Template Changes Corrupt Historical Data

**What goes wrong:**
Admin edits a form template (adds/removes/reorders fields) after submissions have been collected. Old submissions reference field IDs or structures that no longer exist in the current template. Viewing or exporting old submissions renders broken/missing data, or worse, maps data to wrong fields.

**Why it happens:**
Developers store submissions as JSON referencing the "current" template, without snapshotting the template version at submission time. Form.io solved this with explicit form revisions that preserve the JSON schema per version. Most custom implementations skip this because it seems like over-engineering until the first template edit.

**How to avoid:**
- Store a `schemaVersion` (integer, auto-increment) on the form template
- On each submission, record the `schemaVersion` it was filled against
- When template is edited, bump `schemaVersion` — never mutate the schema in-place for existing versions
- Store the full schema snapshot per version (JSON column) or use an append-only schema history table
- When rendering old submissions, load the schema version they were submitted against, not the current template

**Warning signs:**
- No `version` or `revision` field on the form template model
- Submissions table has no reference to which template version was used
- Old submissions display blank fields or misaligned data after template edits

**Phase to address:** Phase 1 (Foundation) — database schema design must include versioning from day one; retrofitting is extremely painful

---

### Pitfall 3: Share Link URL Guessability — IDOR on Form Access

**What goes wrong:**
Share links use auto-increment IDs or short sequential tokens (e.g., `/form/123`, `/form/124`). Attackers enumerate URLs to access forms they shouldn't see, or submit spam to forms not shared with them. The open-formulieren project (GHSA-2g49-rfm6-5qj5) had exactly this vulnerability — guessable submission references exposed other users' data.

**Why it happens:**
Developers use the database primary key as the share identifier because it's convenient. Or they generate short tokens with insufficient entropy (e.g., 6-char alphanumeric = ~2 billion combinations, brute-forceable).

**How to avoid:**
- Generate share tokens as UUIDv4 or `crypto.randomBytes(32).toString('hex')` — minimum 128 bits of entropy
- Never expose auto-increment IDs in public-facing URLs
- Add an `isActive` flag and optional `expiresAt` timestamp on share links
- Implement revocation: when a share link is disabled, it must immediately stop working (don't cache)
- Rate-limit the public form access endpoint by IP

**Warning signs:**
- Share URLs contain numeric IDs that increment
- No expiration or revocation mechanism on share links
- No rate limiting on the public form endpoint

**Phase to address:** Phase 2 (Share Links) — must be correct from the first implementation; migrating existing links is disruptive

---

### Pitfall 4: Signature Base64 Bloat Crashing the API

**What goes wrong:**
Signature pad exports via `canvas.toDataURL()` produce base64 strings of 50KB–500KB+ depending on canvas resolution. Storing these inline in the submission JSON bloats the database, slows list queries (PostgreSQL loads full JSONB on select), and can exceed Elysia's default body size limit. At scale, a table with 10K submissions each containing 200KB signatures = 2GB of inline image data in JSONB.

**Why it happens:**
`toDataURL()` is the simplest API — one line of code, returns a string, easy to store in JSON. Developers don't realize the size implications until the database is already bloated. The signature_pad library (szimek/signature_pad) defaults to this approach in all its examples.

**How to avoid:**
- Use `canvas.toBlob()` instead of `toDataURL()` — upload the blob as a file
- Store signatures as files on disk/object storage, save only the file path in the submission record
- If inline storage is required for simplicity, compress: export as JPEG (quality 0.5) instead of PNG, and limit canvas resolution to 400x200px
- Set a server-side body size limit and validate signature payload size before persisting
- Never include signature data in list/search query results — only load on detail view

**Warning signs:**
- Submission JSON payloads exceed 100KB
- List queries on submissions table are slow (PostgreSQL scanning large JSONB)
- API timeout on form submission with signature

**Phase to address:** Phase 2 (Form Designer with Signature) — storage strategy must be decided before any signatures are persisted
---

### Pitfall 5: XSS via User-Defined Form Schema Content

**What goes wrong:**
Form template creators (internal OA users) define field labels, descriptions, placeholder text, and validation messages. If these are rendered as raw HTML in the public form view, a malicious or compromised admin account can inject `<script>` tags or event handlers that execute in the browser of every person who fills out the form. The react-jsonschema-form project had multiple XSS CVEs through this exact vector (issues #4254, #4057, PR #4065).

**Why it happens:**
Vue's `v-html` directive or Quasar component slots that render raw HTML are used to display "rich" field descriptions. Developers trust internal users, forgetting that: (a) accounts can be compromised, (b) the rendered content executes in unauthenticated users' browsers, and (c) stored XSS persists until the template is fixed.

**How to avoid:**
- Never use `v-html` for any schema-derived content (labels, descriptions, error messages)
- Use Vue's default text interpolation `{{ }}` which auto-escapes HTML
- If rich text is needed in descriptions, use a whitelist-based sanitizer (DOMPurify) before storage AND before render
- Validate form schema on the server: reject fields with HTML tags in labels/descriptions
- Treat all form schema content as untrusted input, even from authenticated admins

**Warning signs:**
- Any use of `v-html` in form rendering components
- Field labels or descriptions containing HTML tags in the database
- No server-side validation of schema content structure

**Phase to address:** Phase 1 (Form Designer) — sanitization must be built into the schema validation layer from the start

---

### Pitfall 6: PDF Export with Chinese Text — jsPDF Font Rendering Failure

**What goes wrong:**
jsPDF does not natively support CJK (Chinese/Japanese/Korean) characters. Generating a PDF with Chinese form labels, user input, or signature annotations produces garbled text (乱码). This is the #1 reported issue for jsPDF in Chinese-language projects (GitHub #671, multiple CSDN articles through 2025).

**Why it happens:**
jsPDF ships with only standard Latin fonts (Helvetica, Courier, Times). Chinese characters require embedding a CJK font file (5-20MB .ttf), which developers discover only when testing with real Chinese content — often late in development.

**How to avoid:**
- **Recommended approach for this project:** Use browser `window.print()` with a print-optimized CSS stylesheet as the primary "export" method. The browser already has Chinese font support. This avoids the entire jsPDF font problem.
- If true PDF file export is required: use html2canvas to rasterize the form as an image, then embed in jsPDF. Produces non-selectable text but renders Chinese correctly.
- If selectable text PDF is required: embed a subsetted Chinese font (use `fonttools` to subset NotoSansSC to ~2MB covering common characters), add via `doc.addFont()`
- Never assume jsPDF "just works" with Chinese — test PDF output with real Chinese content in the first sprint

**Warning signs:**
- PDF export feature developed and tested only with English placeholder text
- No font embedding code in the PDF generation module
- PDF files contain empty rectangles or question marks where Chinese text should be

**Phase to address:** Phase 3 (PDF Export) — but the architectural decision (browser print vs. jsPDF) should be made in Phase 1

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store signatures as base64 in JSONB | Simple, no file storage needed | DB bloat, slow queries, backup size explosion | Never for production; only for a throwaway prototype |
| Skip schema versioning, just overwrite template | Faster to build | Data corruption on first template edit | Never — this is a data integrity issue |
| Use auto-increment ID in share URLs | No extra token generation | IDOR vulnerability, security audit failure | Never |
| Use `window.print()` instead of server-side PDF | No server dependency, Chinese fonts work | No programmatic PDF generation, user must interact | Acceptable for v1.1 MVP if true PDF export is deferred |
| Inline form schema validation (no JSON Schema) | Less setup | Inconsistent validation between client/server, edge cases | Only in MVP if field types are very simple (< 5 types) |
| Skip rate limiting on public endpoints | Faster to ship | Spam submissions, resource exhaustion | Never for public-facing endpoints |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Elysia auth guard + public routes | Putting public routes inside the authenticated `.group()` | Create a separate `.group('/api/v1/public', ...)` without auth middleware |
| Prisma + large JSONB queries | Using `findMany` on submissions table without field selection — loads full JSONB including signatures | Always use `select` to exclude large fields from list queries; load full data only on detail view |
| Quasar + signature_pad library | Assuming Quasar has a built-in signature component | Quasar has no signature widget; use `szimek/signature_pad` and wrap it in a custom Vue component |
| Docker + Puppeteer/Chromium for PDF | Adding Chromium to the Docker image for server-side PDF | Chromium adds 400MB+ to image size and creates zombie process risks; prefer client-side PDF or lightweight alternatives like `pdf-lib` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Signature data in list queries | Submission list API takes 2-5s, increasing with data volume | `select` only metadata fields in list queries; lazy-load signature on detail view | > 500 submissions with signatures |
| No pagination on submission list | API returns all submissions at once; browser freezes rendering | Server-side pagination from day one (cursor or offset) | > 200 submissions |
| Synchronous PDF generation on API thread | API response blocked for 3-10s during PDF render; other requests queue | Generate PDF client-side, or if server-side, use a background job queue | > 5 concurrent PDF requests |
| Form schema validation on every keystroke | UI lag when filling complex forms (10+ fields) | Debounce validation; validate on blur or submit, not on input | > 15 fields with complex validation rules |
| Unindexed queries on share token | Full table scan on `FormShareLink` when resolving public URLs | Add unique index on the share token column | > 1000 share links |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No rate limiting on public form submission endpoint | Spam flood: attacker submits thousands of fake entries, polluting data and exhausting DB storage | IP-based rate limiting (e.g., 10 submissions/minute/IP); optional CAPTCHA for suspicious traffic |
| Share link tokens with insufficient entropy | Brute-force enumeration of valid form links; unauthorized access to forms | Use UUIDv4 or 32-byte random hex; never sequential or short tokens |
| No CSRF protection on public form submission | Cross-site request forgery: malicious site auto-submits forms on behalf of visitors | Use double-submit cookie pattern or embed a one-time token in the form page |
| Rendering user-submitted data without escaping | Stored XSS: malicious form input (e.g., `<script>` in a text field) executes when admin views submissions | Escape all user input on render; never use `v-html` for submission data display |
| Public endpoint exposes internal error details | Stack traces or Prisma error messages leak database schema to attackers | Catch all errors on public routes; return generic messages; log details server-side only |
| No file size validation on signature upload | Denial of service via oversized payloads | Validate Content-Length header; reject payloads > 1MB; validate decoded image dimensions |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Signature pad too small on mobile | Users can't sign legibly; frustration and abandonment | Make signature pad full-width on mobile; minimum 300px height; support landscape orientation |
| No "signature clear" button | Users who make a mistake must reload the entire form | Add a visible "Clear Signature" button next to the pad |
| Form loses data on accidental navigation | User fills 20 fields, accidentally hits back button, all data lost | Use `beforeunload` event to warn; optionally auto-save draft to localStorage |
| PDF export doesn't match form layout | Users expect PDF to look like the form they filled; instead it's a plain data dump | Use print CSS that mirrors the form layout; include field labels and structure |
| Share link doesn't indicate form title | User receives a bare URL with no context about what they're filling | Include form title in the page `<title>` and as a heading; consider OG meta tags for link previews |
| No submission confirmation | User submits form but gets no feedback; submits again creating duplicates | Show a clear success page; implement idempotency key to prevent duplicate submissions |

## "Looks Done But Isn't" Checklist

- [ ] **Share links:** Often missing expiration/revocation — verify links can be disabled and that disabled links return 404
- [ ] **Form submission:** Often missing duplicate prevention — verify submitting the same form twice (double-click) doesn't create two records
- [ ] **Signature field:** Often missing empty-check — verify that a required signature field rejects a blank (untouched) canvas
- [ ] **PDF export:** Often missing Chinese font test — verify PDF output with real Chinese field labels and user input
- [ ] **Schema versioning:** Often missing migration path — verify that editing a template after 10 submissions still renders all 10 correctly
- [ ] **Public routes:** Often missing error handling — verify that invalid form tokens return user-friendly 404, not a stack trace
- [ ] **RBAC integration:** Often missing new permissions — verify that form:create, form:view, form:delete permissions exist and are enforced
- [ ] **Mobile form filling:** Often missing viewport meta — verify public form page has proper viewport settings for mobile browsers
- [ ] **Statistics:** Often missing timezone handling — verify submission timestamps use consistent timezone for daily/weekly counts

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schema versioning not implemented | HIGH | Freeze all templates; write migration to snapshot current schema for all existing submissions; add version column; backfill |
| Signatures stored as base64 in JSONB | MEDIUM | Write migration script to extract base64 → decode → save as files → replace JSONB value with file path; requires downtime |
| Guessable share link IDs | MEDIUM | Generate new random tokens for all existing links; update all shared URLs (breaking change for recipients); add index |
| XSS in form rendering | LOW | Add DOMPurify sanitization to all render points; scan existing templates for HTML content; no data loss |
| No rate limiting | LOW | Add rate limiting middleware to public routes; no data migration needed |
| PDF Chinese font garbled | LOW | Switch to browser print approach or add font embedding; no data impact |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Auth guard leaking onto public routes | Phase 1 (Foundation) | Integration test: public endpoint returns 200 without token; admin endpoint returns 401 without token |
| Schema versioning missing | Phase 1 (Foundation) | DB schema review: template table has `version` column; submission table has `schemaVersion` FK |
| Share link IDOR | Phase 2 (Share Links) | Security test: enumerate 1000 sequential tokens, verify 0 hits; verify token entropy >= 128 bits |
| Signature base64 bloat | Phase 2 (Form Designer) | Check submission record size in DB; verify list query doesn't load signature data |
| XSS via schema content | Phase 1 (Form Designer) | Attempt to save a field label containing `<script>` — verify it's rejected or sanitized |
| PDF Chinese font failure | Phase 3 (PDF Export) | Generate PDF with Chinese labels and input — verify readable output |
| No rate limiting on public endpoints | Phase 2 (Share Links) | Load test: send 100 requests/second from single IP — verify throttling kicks in |
| No CSRF on public form | Phase 2 (Public Form) | Attempt cross-origin POST to submission endpoint — verify rejection |
| No duplicate submission prevention | Phase 2 (Public Form) | Double-click submit button — verify only one record created |
| Form data loss on navigation | Phase 2 (Public Form) | Fill form partially, click back — verify browser warning appears |

## Sources

- [Open Forms IDOR vulnerability (GHSA-2g49-rfm6-5qj5)](https://github.com/open-formulieren/open-forms/security/advisories/GHSA-2g49-rfm6-5qj5)
- [Grist form sharing security discussion (#1198)](https://github.com/gristlabs/grist-core/issues/1198)
- [Form.io Form Revisions — Schema Versioning](https://form.io/features/form-revisions-form-json-schema)
- [React JSON Schema Forms — Why They Break Down (DEV Community)](https://bizarro.dev.to/surveyjs/react-json-schema-forms-in-practice-why-they-break-down-and-how-surveyjs-fixes-the-architecture-17ik)
- [react-jsonschema-form XSS in uiSchema (#4254)](https://github.com/rjsf-team/react-jsonschema-form/issues/4254)
- [react-jsonschema-form XSS in FileWidget (#4065)](https://github.com/rjsf-team/react-jsonschema-form/pull/4065)
- [Drupal JSON Field XSS (SA-CONTRIB-2025-106)](https://www.drupal.org/sa-contrib-2025-106)
- [Puppeteer Memory Leaks and Zombie Processes (Medium)](https://medium.com/@TheTechDude/puppeteer-memory-leaks-crashes-and-zombie-processes-6-months-of-screenshots-in-production-b2ae7e65df3f)
- [Puppeteer Isn't Meant for PDFs (Medium)](https://medium.com/@onu.khatri/puppeteer-isnt-meant-for-pdfs-here-s-why-1e3a4419263f)
- [Ditch Puppeteer: 5 Painful Lessons (DEV Community)](https://dev.to/ethan_reportgen/ditch-puppeteer-5-painful-lessons-learned-building-pdfs-at-scale-49pc)
- [Puppeteer zombie processes on PDF generation (#13998)](https://github.com/puppeteer/puppeteer/issues/13998)
- [jsPDF Chinese character support (#671)](https://github.com/MrRio/jsPDF/issues/671)
- [jsPDF UTF-8 with HTML (#2968)](https://github.com/MrRio/jsPDF/issues/2968)
- [signature_pad toDataBlob request (#334)](https://github.com/szimek/signature_pad/issues/334)
- [Elysia route specificity bug (#1752)](https://github.com/elysiajs/elysia/issues/1752)
- [HubSpot Form Submission Rate Limits](https://developers.hubspot.com/changelog/announcing-forms-submission-rate-limits)
- [WordPress Contact Form CSRF (CVE-2026-32527)](https://wp-firewall.com/hardening-wordpress-contact-form-access-controls-published-on-2026-03-22-cve-2026-32527/)
- [Schema Evolution Best Practices (Conduktor)](https://conduktor.io/glossary/schema-evolution-best-practices)
- [Data Versioning and Schema Evolution Patterns](https://bool.dev/blog/detail/data-versioning-patterns)

---
*Pitfalls research for: OA v1.1 Custom Form Collection System*
*Researched: 2026-04-20*
