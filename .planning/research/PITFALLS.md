# Pitfalls Research

**Domain:** Form builder grid layout engine upgrade — adding 12-column grid, field grouping, dynamic row tables, PDF faithful output, responsive fill page to existing OA form system
**Researched:** 2026-04-21
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: html2canvas Cannot Faithfully Render CSS Grid Layouts

**What goes wrong:**
The current PDF export uses `html2canvas` (scale: 2) to rasterize the `#print-area` DOM element, then slices it into A4 pages via jsPDF. When the form layout upgrades from single-column to a 12-column CSS Grid, html2canvas produces broken output: grid items misaligned, overlapping, or missing entirely. The `gap` property renders incorrectly, `grid-column: span N` positioning is unreliable, and nested grids (dynamic table inside a grid cell) compound the problem. GitHub issue niklasvh/html2canvas#2405 confirms spacing anomalies with grid layouts. The related library html-to-image has the same problem (bubkoo/html-to-image#258). Additionally, Chromium itself has a bug where `page-break-inside: avoid` does not work inside CSS Grid containers (Chromium issue 41317853), meaning even browser print cannot reliably prevent grid rows from splitting across pages.

**Why it happens:**
html2canvas re-implements CSS layout in JavaScript by walking the DOM and computing positions. It was designed for simple block/inline/flex layouts. CSS Grid's two-dimensional placement algorithm (implicit tracks, auto-flow, span, named areas) is far more complex and html2canvas's implementation is incomplete. This is a fundamental architectural limitation, not a bug that will be fixed soon.

**How to avoid:**
- Build a dedicated "print layout renderer" that converts the grid schema to a `<table>`-based or absolute-positioned layout before capture. The grid schema (rows + columns + spans) contains enough information to compute exact pixel positions without relying on CSS Grid rendering.
- Alternatively, render a hidden "PDF-ready" DOM that uses `display: block` + `width` percentages instead of `display: grid`, then pass that to html2canvas.
- For dynamic row tables that span multiple pages: pre-calculate row heights, split the table into page-sized chunks in JavaScript before rendering, and capture each chunk separately.
- Test PDF output with the most complex template possible (12-column grid, merged cells, dynamic table with 20+ rows, signature field) in the first sprint — not at the end.

**Warning signs:**
- PDF output looks correct for simple 1-2 column layouts but breaks on 3+ column or span configurations
- Grid gap appears as zero or doubled in the PDF
- Dynamic table rows overlap or get cut at page boundaries
- Development team tests PDF only with simple templates

**Phase to address:** Phase 1 (Architecture) — the PDF rendering strategy must be decided before building the grid layout engine, because it constrains how the grid DOM is structured

---

### Pitfall 2: Drag-Drop in Grid Cells — Collision Detection and Drop Zone Ambiguity

**What goes wrong:**
The current designer uses `vue-draggable-plus` with a flat list model: fields are dragged into a single-column `canvasRef` list, reordered by `sort` index. Upgrading to a 12-column grid means fields now occupy specific (row, col, colSpan) positions. When a user drags a field over the grid, the system must determine: which cell is the drop target? Does the field fit (enough columns remaining)? What happens to existing fields that would overlap? SortableJS (underlying vue-draggable-plus) was designed for 1D list sorting, not 2D grid placement. Attempting to force it into 2D grid behavior produces ghost elements in wrong positions, fields snapping to unexpected cells, and overlapping items that corrupt the schema.

**Why it happens:**
vue-draggable-plus delegates to SortableJS which tracks drag position as an index in a flat array. A 12-column grid is fundamentally a 2D coordinate system. Mapping between "array index" and "(row, col, span)" is lossy — multiple grid positions can map to the same array index depending on how rows are linearized. The SO thread on vuedraggable for n×n grids (SO #75826965) shows developers struggling with exactly this mismatch.

**How to avoid:**
- Do NOT use vue-draggable-plus for grid cell placement. Use it only for the field palette (drag source) and for reordering within a single row.
- Implement custom drag-drop for grid placement: use HTML5 Drag and Drop API or pointer events to track cursor position, compute the target (row, col) from mouse coordinates relative to the grid container, validate fit (colSpan <= remaining columns in row), and show a visual placeholder before drop.
- Keep the schema model as an array of `{ id, row, col, colSpan, ... }` objects. On drop, compute the new (row, col) and check for collisions with existing fields. Reject or auto-shift on collision.
- Consider `grid-layout-plus` (Vue 3 library) which provides drag + resize + responsive in a grid context, purpose-built for this use case.

**Warning signs:**
- Dragging a field into a grid cell places it in the wrong position
- Two fields can occupy the same grid cell without error
- Resizing a field's colSpan causes adjacent fields to overlap silently
- The schema array order doesn't match the visual grid order

**Phase to address:** Phase 1 (Grid Engine Core) — the drag-drop interaction model is the foundation of the entire designer; getting it wrong means rebuilding the designer from scratch

---

### Pitfall 3: Schema Structure Mismatch — Flat Array vs. Grid Coordinate Model

**What goes wrong:**
The current schema is `FormField[]` — a flat array where each field has `{ id, type, label, required, sort }`. The grid layout needs `{ row, col, colSpan }` coordinates. The dynamic row table needs a nested `columns: FormField[]` sub-array. Field grouping needs a `group` wrapper with `title` and `children`. If the new schema is designed as a simple extension of the flat array (just adding `row`/`col` properties), it becomes impossible to represent: (a) a group that spans multiple rows, (b) a dynamic table whose columns are themselves form fields, (c) nested validation rules for table rows. But if the schema becomes a deeply nested tree, every existing component that iterates `schema.forEach(field => ...)` breaks.

**Why it happens:**
Developers try to minimize schema changes by adding optional properties to the existing `FormField` interface. This works for simple additions but creates an incoherent data model when the new features have fundamentally different structural requirements (groups contain fields, tables contain columns, grid positions are 2D coordinates). The Elementor team documented exactly this problem — extending a flat schema with structural features nearly caused breaking changes for millions of users.

**How to avoid:**
- Design the v1.2 schema as a clean break (which the project already decided). Define three node types:
  - `FieldNode`: `{ type: 'field', id, fieldType, row, col, colSpan, ... }` — a single form field placed in the grid
  - `GroupNode`: `{ type: 'group', id, title, row, col, colSpan, children: FieldNode[] }` — a section with title containing fields
  - `TableNode`: `{ type: 'table', id, label, row, col, colSpan, columns: ColumnDef[], minRows, maxRows }` — a dynamic row table
- Use a discriminated union (`type` field) so TypeScript can narrow types correctly.
- The top-level schema becomes `SchemaNode[]` where `SchemaNode = FieldNode | GroupNode | TableNode`.
- Write the schema TypeScript types FIRST, before any UI code. Validate with test data covering all edge cases.

**Warning signs:**
- `FormField` interface has 15+ optional properties, most undefined for any given field
- Code uses `if (field.columns)` type guards instead of discriminated unions
- Dynamic table columns reuse the same `FormField` type but ignore half its properties
- Group title is stored as a special "field" with `type: 'group-title'` instead of a proper container node

**Phase to address:** Phase 1 (Schema Design) — this is the single most important design decision; everything else builds on it

---

### Pitfall 4: Dynamic Row Table — Validation State Explosion and Key Management

**What goes wrong:**
A dynamic row table lets users add/remove rows of structured data (e.g., "Work Experience" with columns: Company, Title, Start Date, End Date). Each row needs independent validation. When a user adds row 3, fills it, deletes row 2, then adds row 4 — the validation state for "row 2" must be cleaned up, "row 3" must retain its state, and "row 4" must start fresh. If rows are keyed by array index (`:key="index"`), deleting row 2 causes row 3's DOM to inherit row 2's validation state, showing stale errors or clearing valid data. Vuelidate's `$each` helper is known to desync when rows are dynamically added/removed (GitHub vuelidate/vuelidate#1063, #1216). Vue's reactivity system can also miss deeply nested changes in `reactive()` objects when rows contain nested objects.

**Why it happens:**
Array index as key is the default pattern. It works for static lists but breaks for dynamic lists where items are inserted/removed in the middle. Validation libraries track state by path (e.g., `rows[2].company`), so deleting index 2 shifts all subsequent paths. The SO thread on Vuelidate dynamic fields (SO #78945454) shows this exact bug.

**How to avoid:**
- Generate a unique `rowId` (nanoid or crypto.randomUUID()) for each row when it's created. Use `rowId` as the `:key`, never the array index.
- Store table data as `Map<string, RowData>` or `{ [rowId]: RowData }` instead of an array, so deletion doesn't shift indices.
- For validation, use per-row validation scopes keyed by `rowId`. When a row is deleted, explicitly clean up its validation state.
- If using Quasar's built-in validation (QInput rules), each row's QForm or validation scope must be independent. Consider wrapping each row in its own `<q-form>` or using VeeValidate's `useFieldArray` which handles dynamic arrays natively.
- Set `maxRows` limit (e.g., 50) to prevent performance degradation from unbounded row creation.
- Debounce validation — don't re-validate all rows on every keystroke in any row.

**Warning signs:**
- Deleting a middle row causes the last row to show the deleted row's data
- Validation errors appear on the wrong row after deletion
- Adding a row after deleting one shows stale validation state
- Performance degrades noticeably after 20+ rows

**Phase to address:** Phase 2 (Dynamic Table Implementation) — but the data model (keyed by rowId, not index) must be decided in Phase 1 schema design

---

### Pitfall 5: Existing Submission Data Becomes Unreadable After Schema Redesign

**What goes wrong:**
v1.1 submissions store `data` as `{ [fieldId]: value }` where fieldId is a nanoid like `"f_abc123"`. The template's `schema` (also stored as a snapshot via `schemaVersion`) is a flat `FormField[]`. After v1.2 redesigns the schema to a grid-based `SchemaNode[]` structure, the `SubmissionDetail.vue` component that renders old submissions will break: it expects `template.schema` to be `FormField[]` but gets `SchemaNode[]` (or vice versa for old submissions viewed with new code). The `displayFields` computed property iterates `schema.filter(f => f.type !== 'signature')` — this crashes if schema nodes have `type: 'group'` or `type: 'table'`.

**Why it happens:**
The project decided to break v1.1 compatibility (correct decision for a clean redesign), but the existing `Submission` records in the database still reference old templates with old schemas. The `schemaVersion` field exists but the rendering code has no version-aware branching — it assumes one schema format.

**How to avoid:**
- Implement a schema version discriminator: if `schemaVersion <= N` (v1.1 era), use the legacy flat renderer. If `schemaVersion > N`, use the new grid renderer.
- Keep the legacy `SubmissionDetail.vue` rendering logic intact as a `LegacySubmissionDetail.vue` component. The new grid-aware renderer is a separate component. A wrapper component switches between them based on `schemaVersion`.
- Write a Prisma migration that adds a `schemaFormat` enum (`'v1'` | `'v2'`) to `FormTemplate` and `Submission` tables, defaulting existing records to `'v1'`.
- Do NOT attempt to migrate old submission data to the new schema format — the data itself (`{ fieldId: value }`) is fine, only the schema structure that interprets it changed.
- Test by creating 5+ submissions with v1.1 templates, then upgrading to v1.2 code, and verifying all old submissions still render correctly.

**Warning signs:**
- Old submission detail page shows blank or crashes after v1.2 deployment
- `TypeError: schema.filter is not a function` or similar runtime errors when viewing old submissions
- PDF export of old submissions produces empty pages
- No conditional rendering based on schema version in the submission viewer

**Phase to address:** Phase 1 (Schema Migration) — the version discriminator and legacy renderer must exist before any new schema code is deployed

---

### Pitfall 6: Grid-to-Single-Column Responsive Conversion Loses Semantic Context

**What goes wrong:**
On PC, the fill page renders the form in the designer's grid layout (e.g., "First Name" and "Last Name" side by side in a row, each spanning 6 columns). On mobile, this collapses to single column. But naive collapse (just stack all fields top-to-bottom by grid row order) loses context: fields that were visually grouped in a row are now separated by unrelated fields from other rows. Worse, if a group title spans the full row and its child fields are in the next row, collapsing may interleave group A's fields with group B's title. Dynamic tables are especially problematic: a table with 5 columns rendered as a grid on PC becomes an unusable vertical stack of 5 inputs per row on mobile.

**Why it happens:**
CSS Grid's `grid-template-columns: 1fr` collapse is purely visual — it doesn't understand semantic grouping. The grid schema stores (row, col, colSpan) but not "these fields belong together semantically." Without explicit group metadata, the mobile renderer can only linearize by position, which may not match the designer's intent.

**How to avoid:**
- The schema's `GroupNode` is the solution: fields inside a group stay together during collapse. Enforce that semantically related fields are always inside a group.
- For mobile rendering, define a clear linearization algorithm: iterate groups in row order → within each group, iterate fields in (row, col) order → collapse each field to full width. This preserves group boundaries.
- For dynamic tables on mobile: do NOT stack columns vertically. Instead, render each row as a card with labeled fields (label: value pairs stacked vertically). This is the standard mobile pattern for data tables.
- Add a "mobile preview" toggle in the designer so template creators can see how their layout will look on mobile before publishing.
- Reset all `grid-column: span N` to `span 1` in mobile breakpoints — a common miss (SO #78354504) that causes horizontal overflow on mobile.

**Warning signs:**
- Mobile fill page has horizontal scrollbar (grid spans not reset)
- Fields from different groups are interleaved on mobile
- Dynamic table on mobile shows a tiny 5-column grid that's unreadable
- No mobile preview in the designer — creators only discover layout issues from user complaints

**Phase to address:** Phase 3 (Responsive Fill Page) — but the GroupNode schema design in Phase 1 must anticipate this need

---
