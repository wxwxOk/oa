# Technology Stack

**Project:** OA v1.2 - 模板管理优化 (Grid Layout + PDF Fidelity)
**Researched:** 2026-04-21
**Overall Confidence:** HIGH

## Recommended Stack Additions

### 1. Grid Layout Engine — `grid-layout-plus`

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| grid-layout-plus | ^1.3 | 12-column draggable/resizable grid for form designer | Vue3 native, supports `colNum=12`, drag + resize out of box, `x/y/w/h` data model maps cleanly to JSONB schema |

**Rationale:** The form designer needs fields that can be dragged into a 12-column grid and resized to span multiple columns. `grid-layout-plus` provides exactly this — a `<GridLayout :col-num="12">` with `<GridItem :x :y :w :h>` children. Each item's position/size is stored as `{x, y, w, h}` which maps directly to the JSONB schema.

**Why not alternatives:**
- `vue-grid-layout-v3`: Less actively maintained (last update Dec 2024), fewer features
- `vue-draggable-plus` alone: Only handles list reordering, no grid positioning or column spanning
- Pure CSS Grid + custom drag: Massive implementation effort for drag-to-grid, resize handles, collision detection — `grid-layout-plus` solves all of this

**Integration with existing stack:**
- Replaces `vue-draggable-plus` in the designer canvas (keep it for palette drag-to-canvas if needed)
- Works alongside Quasar components — grid items contain Quasar form fields
- The `layout-updated` event provides the new positions for saving to JSONB

### 2. Fill Page Rendering — Quasar Built-in Grid (`row` + `col-*`)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Quasar Grid System | (built-in) | Render designed layout on fill page + responsive degradation | Already in the project, 12-column flexbox grid with `col-xs-12 col-md-{n}` responsive breakpoints |

**Rationale:** The fill page does NOT need drag/resize — it just renders the designed layout. Quasar's built-in `row`/`col-*` classes are perfect:
- PC: `<div class="row"><div :class="'col-' + field.w">` renders the designed column span
- Mobile: `<div class="row"><div class="col-xs-12 col-md-{field.w}">` auto-degrades to single column

**No new dependency needed.** This is pure Quasar CSS classes driven by the schema's `w` (width) values.

### 3. PDF Generation — Dual Strategy (jspdf-autotable + Enhanced html2canvas)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| jspdf-autotable | ^5.0 | Programmatic PDF tables with borders, grid lines, merged cells | Supports `colSpan`/`rowSpan`, precise border control, pagination-aware |
| jspdf | ^4.2 (existing) | PDF document creation | Already installed |
| html2canvas | ^1.4 (existing) | DOM-to-canvas for non-table sections | Already installed, used for header/signature areas |

**PDF Strategy — Why NOT headless browser (Puppeteer/Playwright):**

Both Puppeteer and Playwright have significant compatibility issues with Bun runtime as of 2026:
- Puppeteer: WebSocket connections broken on Bun (issue #24388), Docker install bugs (issue #19520), Linux launch failures
- Playwright: `chromium.launch()` times out on Windows under Bun (issue #27977), test runner fails with module resolution errors (issue #28609)
- Adding a separate Node.js microservice just for PDF violates the project's "docker compose up -d single container" constraint

**Recommended approach — Hybrid client-side PDF:**

1. **Form layout sections** (grid fields, text inputs, radio/checkbox): Render programmatically with `jspdf-autotable` for pixel-perfect table borders and grid lines. The schema's `{x, y, w, h}` data maps to table cell positions.

2. **Signature fields**: Capture with `html2canvas` (existing approach) and embed as images in the jsPDF document.

3. **Section titles/headers**: Render with jsPDF text API (`doc.text()`, `doc.setFontSize()`).

This hybrid approach gives faithful reproduction of the designed layout without any server-side dependency.

### 4. Dynamic Row Tables — No New Library Needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (Vue3 reactivity) | (built-in) | Dynamic add/remove rows in repeatable sub-forms | Array of objects in reactive state, Quasar components for UI |

**Rationale:** Dynamic row tables (repeater fields) are a data model + UI pattern, not a library problem:
- Schema: `{ type: 'table', columns: [...], rows: [] }`
- Each row is an object with column values
- Add/remove row = `push()`/`splice()` on reactive array
- Render with `v-for` + Quasar `q-input`/`q-select` per cell

No external library needed. The complexity is in the schema design and PDF rendering of dynamic tables, not the UI interaction.

### 5. Field Grouping — No New Library Needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (Vue3 components) | (built-in) | Section titles and field grouping | Quasar `q-card` + `q-separator` for visual grouping |

**Rationale:** Groups are a schema-level concept:
- Schema: `{ type: 'group', title: '教育经历', children: [...fields] }`
- Designer: Render as a titled container in the grid layout
- Fill page: Render as a `q-card-section` with a title bar
- PDF: Render as a section header + bordered region

## Complete Stack for v1.2

### New Dependencies

```bash
# New for v1.2
npm install grid-layout-plus jspdf-autotable
```

### Existing Dependencies (unchanged)

```bash
# Already installed — no changes needed
# vue-draggable-plus  — keep for palette drag-out (or remove if grid-layout-plus handles drag-from-outside)
# html2canvas          — keep for signature capture in PDF
# jspdf                — keep as PDF document engine
# quasar               — built-in grid for fill page responsive layout
```

### Dev Dependencies

No new dev dependencies required.

## Schema Evolution

The v1.2 grid layout requires a new schema format. The existing `FormField[]` flat array becomes a hierarchical structure:

```typescript
// v1.1 schema (flat list)
interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  sort: number;
}

// v1.2 schema (grid layout with groups and tables)
interface GridField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature' | 'table' | 'group';
  label: string;
  required: boolean;
  // Grid position (12-column system)
  x: number;  // column start (0-11)
  y: number;  // row position
  w: number;  // column span (1-12)
  h: number;  // row span
  // Field-specific
  placeholder?: string;
  options?: string[];
  // Table-specific
  columns?: TableColumn[];
  // Group-specific
  children?: GridField[];
}

interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'date' | 'radio' | 'checkbox';
  width?: number;  // relative width
  options?: string[];
}
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Grid designer | grid-layout-plus | vue-grid-layout-v3 | Less maintained, last update Dec 2024 |
| Grid designer | grid-layout-plus | Pure CSS Grid + custom drag | Weeks of work for collision detection, resize handles, snap-to-grid |
| Fill page grid | Quasar col-* classes | CSS Grid | Quasar already provides 12-col responsive grid, no reason to add another system |
| PDF tables | jspdf-autotable | Puppeteer/Playwright | Bun incompatible, adds server dependency, breaks single-container deploy |
| PDF tables | jspdf-autotable | pdfmake | Larger bundle, different API paradigm, jspdf already installed |
| PDF capture | html2canvas (existing) | @zumer/snapdom | snapdom is newer (v2.7, Mar 2026) but less battle-tested; html2canvas sufficient for signature capture |
| Dynamic tables | Vue3 reactivity | ag-grid / handsontable | Massive overkill for simple add/remove row repeater |

## Integration Points

### grid-layout-plus + vue-draggable-plus

`grid-layout-plus` supports "drag from outside" — items can be dragged from the field palette into the grid. This may replace `vue-draggable-plus` entirely in the designer, or they can coexist:
- Palette: `vue-draggable-plus` for the sortable palette list
- Canvas: `grid-layout-plus` for the grid layout

### jspdf-autotable + existing PDF export

The existing `usePdfExport.ts` composable uses html2canvas for full-page capture. For v1.2:
- Replace the full-page html2canvas approach with programmatic jspdf-autotable rendering for the form body
- Keep html2canvas only for signature field images
- This gives precise control over borders, grid lines, and pagination

### Quasar Grid + Schema

The fill page renderer reads `field.w` from the schema and maps it to Quasar's `col-{w}` class. On mobile (`$q.screen.lt.md`), override to `col-12` for single-column degradation.

## What NOT to Add

| Library | Why Not |
|---------|---------|
| Puppeteer/Playwright | Bun runtime incompatible, breaks single-container deploy |
| pdfmake | Different paradigm, jspdf already in project |
| ag-grid / handsontable | Overkill for simple repeater tables |
| tailwindcss | Quasar already provides utility classes and grid |
| @zumer/snapdom | Too new (v2.7), html2canvas sufficient for remaining use cases |
| vue-grid-layout-v3 | Less maintained than grid-layout-plus |

## Sources

- [grid-layout-plus npm](https://www.npmjs.com/package/grid-layout-plus) — Vue3 grid layout library
- [grid-layout-plus docs](https://grid-layout-plus.netlify.app/) — API documentation and examples
- [jspdf-autotable npm](https://www.npmjs.com/package/jspdf-autotable) — v5.0.7, table plugin for jsPDF
- [jsPDF-AutoTable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) — Source and issues
- [Quasar Grid Row docs](https://quasar.dev/layout/grid/row/) — Built-in 12-column flexbox grid
- [Quasar Breakpoints](https://quasar.dev/style/breakpoints/) — Responsive breakpoint definitions
- [Bun + Puppeteer issues](https://github.com/oven-sh/bun/issues/24388) — WebSocket broken on Bun
- [Bun + Playwright issues](https://github.com/oven-sh/bun/issues/27977) — chromium.launch() timeout on Windows
- [PDF Generation APIs 2026](https://dev.to/custodiaadmin/pdf-generation-apis-in-2026-puppeteer-vs-playwright-vs-pagebolt-vs-alternatives-gaf) — Comparison article
- [HTML to PDF benchmark 2026](https://pdf4.dev/blog/html-to-pdf-benchmark-2026) — Playwright vs Puppeteer benchmark
