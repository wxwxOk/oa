# Architecture Research: v1.2 Grid Layout Engine Integration

**Domain:** Form designer upgrade - grid layout, groups, dynamic tables, PDF fidelity
**Researched:** 2026-04-21
**Confidence:** HIGH (based on existing codebase analysis + ecosystem research)

## Executive Summary

v1.2 transforms the form designer from a flat single-column field list to a 12-column grid layout engine. This is a **schema-breaking change** (confirmed by PROJECT.md: "not compatible with v1.1 schema"). The architecture centers on a new hierarchical schema structure that replaces the flat `FormField[]` array, a redesigned DesignerCanvas with row/column editing, a unified layout renderer shared across fill page, print, and PDF, and an upgraded PDF pipeline.

The key architectural insight: the schema must encode both **data structure** (what fields exist, validation rules) and **layout structure** (grid positions, groups, column spans). These two concerns should live in a single schema tree rather than separate schemas, because the layout IS the form in this product -- the designer is a WYSIWYG grid editor.

## 1. Schema Evolution

### Current Schema (v1.1)

```typescript
// FormTemplate.schema: FormField[]
interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  sort: number;
}
```

Flat array, single-column, `sort` for ordering. Stored as JSONB in `FormTemplate.schema`.

### New Schema (v1.2)

```typescript
// Top-level schema stored in FormTemplate.schema JSONB
interface FormSchema {
  version: 2;                    // schema version discriminator
  rows: SchemaRow[];             // ordered list of rows
}

interface SchemaRow {
  id: string;                    // row UUID
  type: 'field-row' | 'group' | 'dynamic-table';
  cols?: SchemaCol[];            // for field-row: columns in this row
  group?: GroupDef;              // for group: group metadata + nested rows
  table?: DynamicTableDef;       // for dynamic-table: table definition
}

// --- field-row ---
interface SchemaCol {
  id: string;
  span: number;                  // 1-12, Quasar col-{span}
  field: FormFieldDef;
}

interface FormFieldDef {
  id: string;                    // stable field ID, used as key in submission data
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox'
  | 'date' | 'phone' | 'signature';

// --- group ---
interface GroupDef {
  title: string;                 // e.g. "Education", "Work Experience"
  rows: SchemaRow[];             // nested rows within the group
}

// --- dynamic-table ---
interface DynamicTableDef {
  id: string;                    // table field ID, used as key in submission data
  title: string;
  columns: TableColumnDef[];
  minRows?: number;              // default 1
  maxRows?: number;              // default 20
}

interface TableColumnDef {
  id: string;
  label: string;
  type: 'text' | 'date' | 'radio' | 'checkbox';
  width?: number;                // percentage or flex ratio
  required?: boolean;
  options?: string[];            // for radio/checkbox columns
}
```

### Why This Structure

1. **Row-based hierarchy** -- matches how users think about form layout (row by row, left to right). Each row contains columns with explicit `span` values summing to <= 12.

2. **Three row types cover all v1.2 features:**
   - `field-row`: standard fields in a grid row (FR-16)
   - `group`: titled section containing nested rows (FR-15)
   - `dynamic-table`: repeatable sub-table (FR-17)

3. **No separate UI schema** -- the layout IS the data schema. Separating them (like JSON Forms does) adds complexity without benefit here, because the designer is inherently visual/spatial.

4. **`version: 2` discriminator** -- backend can detect schema version and handle accordingly. Old v1.1 templates won't be migrated (per PROJECT.md decision).

### Submission Data Shape

```typescript
// Submission.data JSONB
interface SubmissionData {
  [fieldId: string]: string | string[] | null;           // regular fields
  [tableId: string]: Record<string, any>[];              // dynamic table rows
}

// Example:
{
  "name_abc123": "Zhang San",
  "edu_table_def456": [
    { "school_1": "Peking University", "major_2": "CS", "year_3": "2020" },
    { "school_1": "Tsinghua University", "major_2": "EE", "year_3": "2018" }
  ]
}
```

Dynamic table data is stored as an array of objects keyed by column IDs. This is a flat structure at the top level -- no nesting beyond one level. PostgreSQL JSONB handles this efficiently.

### Backend Schema Validation

The template update endpoint (`PUT /templates/:id`) needs updated Elysia body validation:

```typescript
// Replace the flat t.Array(t.Object({...})) with:
schema: t.Optional(t.Object({
  version: t.Literal(2),
  rows: t.Array(t.Any()),  // deep validation in application code
}))
```

Deep validation of the row structure should happen in application code (a `validateSchema()` function), not in Elysia's type system, because the recursive/union structure is too complex for `t.Object`.

## 2. Designer Component Architecture

### Current Structure

```
FormDesignerPage.vue (3-panel layout)
  +-- FieldPalette.vue (left: draggable field types)
  +-- DesignerCanvas.vue (center: flat field list with vue-draggable-plus)
  +-- PropertyEditor.vue (right: selected field properties)
```

DesignerCanvas renders a flat list of `QCard` items, each showing a field preview. Drag-and-drop via `useDraggable()` from vue-draggable-plus.

### New Structure

```
FormDesignerPage.vue (3-panel layout, unchanged shell)
  +-- FieldPalette.vue (left: field types + group + dynamic table)
  |     MODIFIED: add "Group" and "Dynamic Table" to palette
  |
  +-- DesignerCanvas.vue (center: REWRITTEN as grid editor)
  |     +-- DesignerRow.vue (one row in the grid)
  |     |     +-- DesignerCell.vue (one cell/column in a row)
  |     |           renders field preview with col-{span} width
  |     +-- DesignerGroup.vue (group container with title)
  |     |     +-- DesignerRow.vue[] (nested rows inside group)
  |     +-- DesignerDynamicTable.vue (table definition editor)
  |
  +-- PropertyEditor.vue (right: EXTENDED)
        MODIFIED: add span slider, group title editor,
        table column editor, row operations
```

### Key Design Decisions

**DesignerCanvas rewrite strategy:** The current canvas is 99 lines of template + 40 lines of script. It's small enough to rewrite entirely rather than trying to extend the flat list approach. The new canvas iterates over `schema.rows` instead of `schema` (flat array).

**Row-level drag-and-drop:** Rows are sortable via vue-draggable-plus (reorder rows). Fields are draggable FROM the palette INTO a specific row's drop zone. This is a nested sortable pattern -- vue-draggable-plus supports this via its [nesting demo](https://vue-draggable-plus.pages.dev/en/demo/nested/).

**Column span editing:** When a field is selected, PropertyEditor shows a span slider (1-12). The designer shows visual column boundaries. A row's total span must not exceed 12 -- enforce this in the store with a validation helper.

**Adding fields to a row:** User drags a field from palette into a row. If the row has remaining span capacity, the field is added with a default span. If the row is full (sum = 12), a new row is created below.

### New Store Shape

```typescript
// template store changes
interface Template {
  // ... existing fields ...
  schema: FormSchema;  // was FormField[], now FormSchema
}

// New selection model
interface DesignerSelection {
  type: 'field' | 'row' | 'group' | 'table';
  rowId: string;
  colId?: string;       // for field selection
  fieldId?: string;
}
```

The store needs new actions: `addRow()`, `removeRow()`, `addColToRow()`, `removeCol()`, `updateColSpan()`, `addGroup()`, `addDynamicTable()`, `moveRow()`. These all mutate `schema.rows`.

## 3. Renderer Architecture

### Current Renderers (3 separate implementations)

1. **DesignerCanvas.vue** -- inline `<template v-if="field.type === 'text'">` blocks for preview
2. **FormFieldRenderer.vue** -- full interactive renderer for PublicFillPage
3. **SubmissionDetail.vue** -- read-only table display for viewing submissions

These three share NO code. Each has its own field-type switch logic.

### New Architecture: Unified Grid Renderer

```
GridFormRenderer.vue (shared layout engine)
  props: schema, mode ('designer' | 'fill' | 'print')
  +-- GridRow.vue (renders one row with Quasar col-{span})
  |     +-- GridCell.vue (renders one cell)
  |           +-- FieldRenderer.vue (renders a single field)
  |                 mode='designer': disabled preview
  |                 mode='fill': interactive input with v-model
  |                 mode='print': read-only value display
  +-- GroupRenderer.vue (renders group title + nested GridRow[])
  +-- DynamicTableRenderer.vue
        mode='fill': editable table with add/remove row
        mode='print': static table display
```

**Why a unified renderer:** The grid layout logic (iterating rows, applying col-{span}, rendering groups) is identical across all three contexts. Only the leaf field rendering differs by mode. A single `GridFormRenderer` with a `mode` prop eliminates the current triple-implementation problem and ensures PDF output matches the fill page layout exactly (FR-18).

**FieldRenderer.vue** replaces both the inline previews in DesignerCanvas and the FormFieldRenderer component. It accepts `mode` and `field` props:

```typescript
// FieldRenderer.vue
const props = defineProps<{
  field: FormFieldDef;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: any;
}>();
```

- `designer` mode: renders disabled Quasar inputs (like current DesignerCanvas previews)
- `fill` mode: renders interactive inputs with validation (like current FormFieldRenderer)
- `print` mode: renders plain text values (like current SubmissionDetail)

### Responsive Fill Page (FR-19)

PublicFillPage uses `GridFormRenderer` with mode='fill'. On desktop, it renders the grid layout as designed (col-{span} classes). On mobile, all fields collapse to `col-12` (full width, single column).

```vue
<!-- In GridRow.vue -->
<div class="row q-col-gutter-sm">
  <div
    v-for="col in row.cols"
    :key="col.id"
    :class="isMobile ? 'col-12' : `col-${col.span}`"
  >
    <FieldRenderer ... />
  </div>
</div>
```

This uses the existing `useResponsive()` composable already in the codebase.

## 4. PDF Generation Strategy

### Current Approach

`usePdfExport.ts` uses `html2canvas` (scale: 2) to screenshot `#print-area` DOM element, then pastes the image into jsPDF. This works for the current simple table layout.

### Problem with Grid + Tables

html2canvas has [known issues with complex table borders](https://github.com/niklasvh/html2canvas/issues/310) and CSS grid/flexbox rendering. With the new grid layout, multi-column rows, and dynamic tables with borders, html2canvas will likely produce artifacts.

### Recommended Approach: Keep html2canvas, Improve the Source HTML

**Do NOT switch to server-side Puppeteer.** Reasons:
1. Bun has [known PDF generation bugs with Puppeteer](https://github.com/oven-sh/bun/issues/8482) (corrupt/zero-byte files)
2. Adds Chromium to Docker image (+400MB)
3. The project constraint is Docker Compose single-machine deployment

**Instead, optimize the print HTML for html2canvas compatibility:**

1. **Dedicated print template:** Create a `PrintableForm.vue` component that renders the form data using simple `<table>` elements with inline styles (not Quasar grid classes). html2canvas handles basic tables well; it struggles with flexbox/CSS grid.

2. **Render flow for PDF:**
   ```
   Submission data + Schema
     -> PrintableForm.vue (hidden, mounted in DOM)
       -> Simple <table> with border-collapse: collapse
       -> Inline styles (no CSS classes)
     -> html2canvas captures this clean HTML
     -> jsPDF outputs PDF
   ```

3. **For the grid layout in print:** Convert the 12-column grid to a `<table>` with `<colgroup>` defining column widths proportionally. Each grid row becomes a `<tr>`, each cell a `<td colspan="...">`.

This approach keeps the zero-dependency client-side PDF while improving fidelity. The PrintableForm component is only used for PDF/print -- the fill page and designer use the Quasar grid renderer.

### PrintableForm Component

```typescript
// PrintableForm.vue
const props = defineProps<{
  schema: FormSchema;
  data: Record<string, any>;
  templateName: string;
  submittedAt: string;
}>();
```

Renders:
- Title header
- Grid fields as table rows with appropriate colspan
- Groups as sections with header rows
- Dynamic tables as nested tables
- Signature as `<img>` tag

## 5. Dynamic Table Data Model

### Schema Definition

```typescript
interface DynamicTableDef {
  id: string;           // e.g. "edu_table_abc123"
  title: string;        // e.g. "Education"
  columns: TableColumnDef[];
  minRows?: number;     // default 1
  maxRows?: number;     // default 20
}

interface TableColumnDef {
  id: string;           // e.g. "school_1"
  label: string;        // e.g. "School Name"
  type: 'text' | 'date' | 'radio' | 'checkbox';
  required?: boolean;
  options?: string[];
}
```

### Submission Storage

Dynamic table data in `Submission.data` JSONB:

```json
{
  "edu_table_abc123": [
    { "school_1": "PKU", "major_2": "CS", "grad_year_3": "2020" },
    { "school_1": "THU", "major_2": "EE", "grad_year_3": "2018" }
  ]
}
```

This is an array of objects. Each object's keys are column IDs. This structure:
- Fits naturally in JSONB
- Is queryable via PostgreSQL JSON operators if needed
- Doesn't require any Prisma schema changes (Submission.data is already `Json`)

### Impact on SubmissionDetail

SubmissionDetail.vue currently renders a flat key-value table. For dynamic table fields, it needs to detect array values and render them as a sub-table:

```typescript
// In display logic
if (Array.isArray(data[fieldId])) {
  // Render as sub-table with column headers from schema
} else {
  // Render as single value (existing logic)
}
```

The unified `GridFormRenderer` with `mode='print'` handles this automatically.

## 6. Component Boundary Map

### New Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `GridFormRenderer.vue` | `components/grid-form/` | Shared layout engine (designer/fill/print modes) |
| `GridRow.vue` | `components/grid-form/` | Renders one schema row with col-{span} |
| `GridCell.vue` | `components/grid-form/` | Renders one cell within a row |
| `FieldRenderer.vue` | `components/grid-form/` | Single field renderer (3 modes) |
| `GroupRenderer.vue` | `components/grid-form/` | Group title + nested rows |
| `DynamicTableRenderer.vue` | `components/grid-form/` | Editable/readonly dynamic table |
| `DynamicTableEditor.vue` | `components/designer/` | Designer-mode table column editor |
| `DesignerRow.vue` | `components/designer/` | Row editing (add col, reorder, delete) |
| `DesignerCell.vue` | `components/designer/` | Cell editing (span resize, field select) |
| `PrintableForm.vue` | `components/print/` | Table-based print layout for PDF |
| `SpanSlider.vue` | `components/designer/` | Column span editor (1-12 slider) |

### Modified Components

| Component | Changes |
|-----------|---------|
| `FieldPalette.vue` | Add "Group" and "Dynamic Table" items to palette |
| `DesignerCanvas.vue` | Full rewrite: grid row editor instead of flat list |
| `PropertyEditor.vue` | Extend: span slider, group title, table column editor |
| `PublicFillPage.vue` | Use `GridFormRenderer` mode='fill' instead of flat field loop |
| `SubmissionDetail.vue` | Use `GridFormRenderer` mode='print' or adapt for grid data |
| `usePdfExport.ts` | Use `PrintableForm` as source element instead of `#print-area` |
| `template.ts` (store) | New schema type, new row/col manipulation actions |
| `fieldRegistry.ts` | Add 'group' and 'dynamic-table' to registry |

### Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `FormDesignerPage.vue` | Shell layout (toolbar + 3-panel) stays the same |
| `SubmissionPage.vue` | List/filter logic unchanged, only detail rendering changes |
| `FormStatsPanel.vue` | Statistics logic unchanged |
| Backend `template.route.ts` | Only body validation schema changes |
| Backend `public.route.ts` | No changes needed (passes schema as-is) |
| Backend `submission.route.ts` | No changes needed (data is opaque JSONB) |
| Prisma schema | No migration needed (schema column is already `Json`) |

## 7. Data Flow Changes

### Design Flow (changed)

```
FieldPalette (drag field type)
  -> DesignerCanvas (drop into specific row + column position)
  -> template store mutates schema.rows[].cols[]
  -> PropertyEditor shows selected field/row/group properties
  -> Save: PUT /templates/:id with { schema: { version: 2, rows: [...] } }
```

### Fill Flow (changed)

```
GET /public/f/:code -> returns schema (now FormSchema with version: 2)
  -> PublicFillPage detects version: 2
  -> GridFormRenderer mode='fill' renders grid layout
  -> Mobile: all cols collapse to col-12
  -> Desktop: cols render at designed span
  -> Submit: POST with flat { [fieldId]: value, [tableId]: [...rows] }
```

### PDF Flow (changed)

```
View submission detail
  -> Mount PrintableForm (hidden) with schema + data
  -> html2canvas captures PrintableForm (table-based HTML)
  -> jsPDF generates PDF
  -> Download
```

## 8. Suggested Build Order

Based on dependency analysis:

```
Phase 1: Schema + Core Renderer (foundation, unblocks everything)
  1a. Define new TypeScript types (FormSchema, SchemaRow, etc.)
  1b. Build GridFormRenderer + GridRow + GridCell + FieldRenderer
  1c. Update template store with new schema shape + row/col actions
  1d. Update backend body validation for version: 2 schema

Phase 2: Designer Grid Editing (depends on Phase 1)
  2a. Rewrite DesignerCanvas with row-based grid editing
  2b. Add DesignerRow + DesignerCell components
  2c. Extend PropertyEditor with span slider
  2d. Update FieldPalette with group + dynamic table items

Phase 3: Groups + Dynamic Tables (depends on Phase 1 renderer)
  3a. GroupRenderer component
  3b. DynamicTableRenderer (fill mode: add/remove rows)
  3c. DynamicTableEditor (designer mode: define columns)
  3d. DesignerGroup component

Phase 4: PDF + Print Fidelity (depends on Phase 1 renderer)
  4a. PrintableForm component (table-based layout)
  4b. Update usePdfExport to use PrintableForm
  4c. Update SubmissionDetail to use GridFormRenderer mode='print'

Phase 5: Responsive Fill Page (depends on Phase 1 renderer)
  5a. Mobile detection in GridRow (col-12 fallback)
  5b. Update PublicFillPage to use GridFormRenderer
  5c. Test mobile/desktop rendering
```

**Rationale:** Phase 1 (schema + renderer) is the foundation everything else depends on. Phase 2 (designer) and Phase 3 (groups/tables) can partially overlap since they both build on Phase 1. Phase 4 (PDF) and Phase 5 (responsive) are independent of each other and only need Phase 1.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Data Schema + UI Schema
**What:** JSON Forms-style separation of data model and layout model
**Why bad for this project:** The form designer IS a layout editor. Keeping two schemas in sync adds complexity. The layout IS the schema.
**Instead:** Single schema tree with layout info (row/col/span) embedded.

### Anti-Pattern 2: CSS Grid for Designer Layout
**What:** Using CSS Grid instead of Quasar's flexbox grid
**Why bad:** Quasar's `col-{n}` classes are already in the project, well-tested, and responsive. CSS Grid would be a second layout system.
**Instead:** Use Quasar's 12-column flexbox grid (`row` + `col-{span}` classes).

### Anti-Pattern 3: Server-Side PDF with Puppeteer
**What:** Running headless Chrome on the server for PDF generation
**Why bad:** Bun has known Puppeteer PDF bugs. Adds 400MB+ to Docker image. Violates the "lightweight deployment" constraint.
**Instead:** Client-side html2canvas + jsPDF with a table-based PrintableForm for clean capture.

### Anti-Pattern 4: Deep Nesting in Schema
**What:** Allowing groups within groups, tables within groups within tables
**Why bad:** Exponential complexity in renderer, designer, and validation
**Instead:** Max 2 levels: top-level rows, and one level of nesting inside groups. Dynamic tables cannot contain groups or other tables.

### Anti-Pattern 5: Migrating v1.1 Templates
**What:** Writing migration code to convert flat field arrays to grid schema
**Why bad:** PROJECT.md explicitly decided against compatibility. Migration code is throwaway complexity.
**Instead:** v1.2 creates new templates only. Old templates remain readable but not editable in the new designer.

## Scalability Considerations

| Concern | Current (v1.1) | v1.2 Impact |
|---------|----------------|-------------|
| Schema size | ~1-5KB JSONB | ~5-20KB (more structure). Still trivial for PostgreSQL |
| Submission data | Flat key-value ~1-5KB | +dynamic table arrays, ~5-50KB. Still fine |
| PDF generation | Client-side, ~2s | May increase to ~3-5s with complex layouts. Acceptable |
| Designer performance | Flat list, instant | Nested rows + drag-drop. Watch for re-render perf with 50+ fields |

## Sources

- [Quasar Grid Column docs](https://quasar.dev/layout/grid/column/) -- 12-column flexbox grid classes
- [vue-draggable-plus nesting](https://vue-draggable-plus.pages.dev/en/demo/nested/) -- nested sortable support
- [html2canvas table border issues](https://github.com/niklasvh/html2canvas/issues/310) -- known rendering problems
- [Bun + Puppeteer PDF bugs](https://github.com/oven-sh/bun/issues/8482) -- corrupt PDF files under Bun
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable/) -- table plugin for jsPDF
- [Schema-Driven Platforms](https://peterhrynkow.com/ai/architecture/2025/02/01/schema-driven-platforms.html) -- JSONB schema patterns
