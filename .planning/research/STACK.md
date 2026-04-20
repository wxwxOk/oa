# Technology Stack

**Project:** OA v1.1 - Custom Form Collection System
**Researched:** 2026-04-20
**Overall Confidence:** HIGH

## Existing Stack (No Changes)

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue 3 | ^3.5.12 | Frontend framework |
| Quasar | ^2.17.0 | UI component library |
| TypeScript | ^5.6.0 | Type safety |
| Pinia | ^2.2.4 | State management |
| Bun | latest | Backend runtime |
| Elysia | ^1.1.24 | HTTP framework |
| Prisma | ^5.22.0 | ORM |
| PostgreSQL | 16 | Database |

## New Dependencies

### Frontend Additions

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| vue-draggable-plus | ^0.6 | Drag-drop form designer | Actively maintained (last npm publish: Jan 2026). Built on SortableJS. Supports Vue 3 Composition API with component, composable (`useDraggable`), and directive (`vDraggable`) patterns. The original `vuedraggable` v4 is effectively abandoned. `vue-dnd-kit` is newer but less battle-tested for list sorting use cases. |
| signature_pad | ^5.1 | Handwritten signature capture | The de facto standard for canvas-based signatures. Zero dependencies, 5KB gzipped. v5.1.3 (Dec 2025) is latest. Framework-agnostic — wrap in a Vue component directly rather than using a third-party Vue wrapper (wrappers add indirection with no real value for a simple canvas). Outputs base64 PNG or SVG. |
| nanoid | ^5 | Share link token generation | 118 bytes, cryptographically secure, URL-safe by default. Use `nanoid(12)` for 12-char tokens — collision probability is negligible at our scale. Already ESM-native, works with Bun. Prefer over UUID for shorter, URL-friendly tokens. |

### Backend Additions

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| nanoid | ^5 | Share link token generation (server-side) | Same library, used on backend to generate unique share tokens. Already ESM, Bun-compatible. |

### PDF Strategy: Browser Print + @media print CSS (No New Library)

**Decision: Do NOT add a PDF generation library.**

Rationale:
- The PROJECT.md requirement is "browser print + PDF export" — this is exactly what `window.print()` with `@media print` CSS does natively
- Chrome/Edge "Save as PDF" from the print dialog produces high-quality PDFs with perfect CSS fidelity
- Form submissions are single-page documents with text fields and signature images — no complex multi-page layout needed
- Adding `html2pdf.js` introduces a CVE (CVE-2026-22787, XSS vulnerability disclosed Jan 2026) and produces lower-quality output (renders DOM to canvas first, losing text selectability)
- Adding Puppeteer/Playwright server-side means bundling Chromium in Docker (~400MB image size increase), plus known Bun compatibility issues (corrupt PDFs, zero-byte files)
- `@media print` CSS is zero-dependency, zero-bundle-size, and produces the best output quality

Implementation approach:
```css
@media print {
  .no-print { display: none; }
  .print-area { width: 100%; margin: 0; }
  .signature-img { max-width: 300px; }
}
```
```typescript
function printForm() {
  window.print()
}
```

If a future requirement demands server-side PDF generation (e.g., batch export, email attachment), revisit with Playwright + Chrome Stable in Docker (proven pattern from Bun+Hono community).

### Form Schema Storage: Prisma Json Field (No New Library)

**Decision: Use Prisma's native `Json` type with Zod validation at the application layer.**

Rationale:
- Prisma maps `Json` to PostgreSQL `jsonb` — supports path-based filtering, GIN indexing
- Form schemas are inherently dynamic (variable fields per template) — relational normalization would over-engineer this
- Zod is already the validation pattern in the Elysia ecosystem (Elysia uses TypeBox by default, but Zod works via `@elysiajs/zod`)
- No need for `ajv` or JSON Schema spec — Zod provides TypeScript-first validation that's simpler and more idiomatic

Schema pattern:
```prisma
model FormTemplate {
  id        String   @id @default(cuid())
  name      String
  schema    Json     // Form field definitions
  settings  Json?    // Template configuration
  // ... relations
}

model FormSubmission {
  id         String   @id @default(cuid())
  templateId String
  data       Json     // Submitted form data
  // ... relations
}
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Drag-drop | vue-draggable-plus | vuedraggable v4 | Unmaintained since 2022, npm publish issues |
| Drag-drop | vue-draggable-plus | vue-dnd-kit | Too new (Mar 2025), less community validation for list sorting |
| Drag-drop | vue-draggable-plus | Vueform Builder | Commercial license, overkill for our field set |
| Signature | signature_pad (vanilla) | vue3-signature-pad wrappers | Unnecessary abstraction, core lib is trivial to wrap |
| PDF | @media print CSS | html2pdf.js | CVE-2026-22787 XSS vuln, canvas-based (lossy), slow maintenance |
| PDF | @media print CSS | Puppeteer/Playwright server-side | +400MB Docker image, Bun compat issues, overkill for single-page forms |
| PDF | @media print CSS | jsPDF (programmatic) | Must manually construct PDF layout — fragile, no CSS support |
| Share tokens | nanoid | UUID v4 | 36 chars vs 12 chars in URLs, nanoid is URL-safe by default |
| Share tokens | nanoid | crypto.randomBytes | Requires manual base64url encoding, nanoid is purpose-built |
| Form schema | Prisma Json + Zod | Separate field tables (relational) | Over-normalized for dynamic schemas, complex queries for simple reads |
| Form schema | Prisma Json + Zod | ajv + JSON Schema | More verbose, less TypeScript-native than Zod |

## What NOT to Add

| Temptation | Why Avoid |
|------------|-----------|
| Full form builder library (Vueform, FormKit) | Our field set is small (text, select, date, phone, signature). A custom designer with vue-draggable-plus is simpler and more maintainable than configuring a generic form builder. |
| Rich text editor | Not in requirements. Form fields are structured data, not free-form content. |
| File upload library | Signatures are captured as base64 canvas data, not file uploads. If file fields are added later, Elysia handles multipart natively. |
| WebSocket library | No real-time collaboration needed. Standard REST for form CRUD and submission. |
| Chart library for statistics | FR-14 is "basic statistics" (counts). Quasar's built-in components + simple number displays suffice. Defer charting to v2.0 if needed. |
| Server-side rendering (Nuxt) | Public form pages are simple — a single Vue route with no auth. SSR adds complexity for negligible SEO benefit on share links. |

## Installation

```bash
# Frontend — from /frontend directory
bun add vue-draggable-plus signature_pad nanoid

# Backend — from /backend directory  
bun add nanoid
```

No new dev dependencies required.

## Integration Notes

### vue-draggable-plus with Quasar
- Works with any Quasar component inside `<VueDraggable>` slots
- Use `useDraggable` composable for more control in the form designer
- SortableJS handles touch events — mobile form designer works out of the box

### signature_pad with Vue 3
- Wrap in a `<script setup>` component with `ref` for the canvas element
- Call `signaturePad.toDataURL()` to get base64 PNG for storage in Json field
- Handle canvas resize on window resize (signature_pad provides `resizeCanvas()` method)
- Store signature as base64 string in the form submission Json data

### nanoid with Elysia
- Generate tokens server-side when creating share links
- 12-char nanoid gives ~3.2 trillion unique combinations — more than sufficient
- Store token in a dedicated indexed column, not inside Json

### Prisma Json with PostgreSQL
- Add GIN index on frequently queried Json fields via raw SQL in migration
- Use Zod schemas to validate form definitions and submissions at the API layer
- Cast Json reads with `as` to typed interfaces for type safety

## Sources

- [vue-draggable-plus GitHub](https://github.com/alfred-skyblue/vue-draggable-plus) — Active maintenance, Jan 2026 npm publish
- [signature_pad GitHub](https://github.com/szimek/signature_pad) — v5.1.3, Dec 2025
- [nanoid GitHub](https://github.com/ai/nanoid) — 118 bytes, crypto-secure
- [Prisma Json fields docs](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) — Official PostgreSQL jsonb support
- [CVE-2026-22787](https://nvd.nist.gov/vuln/detail/CVE-2026-22787) — html2pdf.js XSS vulnerability (reason to avoid)
- [Bun + Playwright PDF article](https://dev.to/zerolooplabs/how-i-built-a-document-generation-api-with-bun-hono-playwright-do0) — Documents Bun+Puppeteer issues, Playwright workaround
- [vuedraggable maintenance status](https://github.com/SortableJS/vue.draggable.next/issues/130) — Effectively abandoned
