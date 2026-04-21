# Feature Landscape: v1.2 Template Management Optimization

**Domain:** Form Builder Grid Layout + Advanced Features (Enterprise OA)
**Researched:** 2026-04-21
**Confidence:** HIGH (core patterns well-established across JotForm, SurveyJS, FormKit, Appian, Quasar docs)

## Table Stakes

Features users expect once a form builder supports "complex layouts." Missing any = product feels half-baked.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| 12-column grid layout in designer | Every serious form builder (JotForm, Typeform Pro, WPS Forms) supports multi-column. Users need side-by-side fields for compact forms like employee info sheets | HIGH | Replaces current flat `FormField[]` schema with row/column structure | Use Quasar's built-in `col-{breakpoint}-{size}` classes. Schema stores `colSpan` per field (1-12). Designer shows grid overlay for visual placement |
| Field grouping with section titles | Standard pattern across all form builders (SurveyJS panels, JotForm sections, Appian sectionLayout). Users need visual separation for "Education", "Work Experience" etc. | MEDIUM | Must integrate with grid layout — groups contain rows | Implement as a special schema node `type: 'group'` with `title` property. Non-collapsible styled header with bottom border divider. Collapsible is anti-feature for v1.2 (adds complexity, breaks print) |
| PC fill page renders designer layout | If designer shows 2-column layout, PC fill page must match. WYSIWYG expectation is universal | MEDIUM | Depends on grid layout engine schema | Reuse same grid CSS classes. Fill page reads `colSpan` from schema and applies `col-{n}` classes |
| Mobile fill page auto single-column | Every responsive form builder collapses to single column on mobile. Users on phones can't interact with multi-column layouts | LOW | Depends on grid layout engine | Quasar breakpoints: `col-xs-12` forces full-width below 600px. Already have `useResponsive` composable |
| PDF output preserves grid layout | If the form has 2 columns, the PDF must show 2 columns. Users print forms for physical filing | HIGH | Depends on grid layout + existing html2canvas/jsPDF pipeline | Current html2canvas approach captures DOM as-is, so grid layout will naturally appear in PDF. Main risk: page-break splitting rows |

## Differentiators

Features that set the product apart from basic form builders. Not universally expected, but high value.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Dynamic row table (repeater field) | Replaces paper tables where users fill N rows (e.g., "list all previous employers"). Key for HR/admin forms. JotForm has Data Grid widget, FormKit has repeater input, SurveyJS has dynamic panel | HIGH | New field type in registry. Must work within grid layout. Needs its own column definition schema | Schema: `type: 'table'` with `columns: [{label, type, width}]`, `minRows`, `maxRows`. Each row is an object. Add/delete row buttons. Validate per-cell |
| Drag-to-resize column span in designer | Instead of typing "6 columns", drag field edge to resize. JotForm and Breakdance builder support this. Significantly better DX | MEDIUM | Grid layout engine must be in place | Implement resize handles on field cards. Snap to grid (1-12). Visual feedback showing column boundaries |
| Row-level drag reorder | Drag entire rows (not just fields) to reorder sections of the form | LOW | Grid layout with row concept | vue-draggable-plus already in use. Apply to row containers instead of individual fields |
| Group title styling options | Bold, colored, with icon — makes forms look professional | LOW | Group/section feature | Store `style: { color, icon, fontSize }` in group schema node. Keep options minimal: 3-4 preset styles |

## Anti-Features

Features to explicitly NOT build in v1.2. Each has been considered and rejected with rationale.

| Anti-Feature | Why Tempting | Why Avoid | What to Do Instead |
|--------------|-------------|-----------|-------------------|
| Collapsible/accordion sections in fill page | SurveyJS and Formidable Forms support it. Reduces visual clutter on long forms | Breaks print layout (collapsed sections won't print). Adds state management complexity. Users may miss collapsed required fields | Non-collapsible section headers only. Use visual dividers to reduce clutter |
| Free-form drag positioning (absolute/pixel) | Some builders (Wix Forms) allow pixel-perfect placement | Destroys responsiveness. Mobile layout becomes impossible. PDF output unpredictable. Maintenance nightmare | 12-column grid with snap-to-grid. Covers 95% of layout needs |
| Nested groups (groups within groups) | Appian supports nested sectionLayout | Exponential complexity in schema, rendering, validation, and PDF output. No real-world form needs more than 1 level of grouping | Flat group structure only. Groups contain rows, rows contain fields |
| Server-side PDF generation (Puppeteer/Playwright) | Would solve html2canvas limitations (text selectability, resolution) | +400MB Docker image. Bun compatibility uncertain. CJK font installation required. Deployment complexity explosion | Stick with html2canvas + jsPDF. Optimize: dedicated print stylesheet, explicit dimensions, high DPI scale |
| Cell merging in dynamic tables | Excel-like merged cells in repeater tables | html2canvas + jsPDF has documented issues with merged cells (jsPDF issue #595). Rendering complexity is disproportionate to value | Fixed column definitions per table. No merging. Users can use text fields for free-form notes |
| Conditional visibility (show/hide based on value) | "Show field B only if A = X" | Rule engine complexity. Breaks grid layout (empty cells when hidden). Validation edge cases. Deferred to v2.0 in PROJECT.md | Keep all fields always visible. Use section titles to provide context |
| Inline editing of submitted data | Edit submissions after they're submitted | Audit trail complications. Schema version mismatch if template changed. Data integrity risks | View-only submissions. Re-submit if correction needed |
| Custom column widths in dynamic tables | Let users set exact pixel widths per column | Breaks responsiveness. PDF output won't match screen. Percentage-based widths are sufficient | Auto-distribute or use simple fraction-based widths (equal, 2:1, 1:2:1) |

## Feature Dependencies

```
[Existing v1.1 Features]
    ├── Form Template CRUD + JSONB schema
    ├── 3-panel Designer (palette/canvas/properties)
    ├── 7 field types + signature
    ├── Public fill page + FormFieldRenderer
    ├── html2canvas + jsPDF PDF export
    └── useResponsive composable

v1.2 Dependency Chain:

[Schema Redesign: flat FormField[] → Row/Column/Group structure]
    │
    ├──> [FR-16: Grid Layout Engine in Designer]
    │        ├──> Field cards show colSpan visually
    │        ├──> Drag-to-resize column span (differentiator)
    │        └──> Row-level drag reorder
    │
    ├──> [FR-15: Field Grouping + Section Titles]
    │        ├──> Group node in schema tree
    │        ├──> Group title bar in designer canvas
    │        └──> Group title styling options (differentiator)
    │
    ├──> [FR-17: Dynamic Row Table]
    │        ├──> New 'table' field type in registry
    │        ├──> Column definition sub-schema
    │        ├──> Add/delete row UI in fill page
    │        └──> Per-cell validation
    │
    ├──> [FR-19: Responsive Fill Page]
    │        ├──> PC: render grid layout from schema (col-md-{n})
    │        ├──> Mobile: force col-xs-12 single column
    │        └──> Dynamic table: horizontal scroll or card stack on mobile
    │
    └──> [FR-18: PDF Faithful Output]
             ├──> Print stylesheet for grid layout
             ├──> Table borders + cell padding in print CSS
             ├──> Page-break avoidance on rows/groups
             └──> High-DPI html2canvas settings

Critical path: Schema Redesign → Grid Engine → Fill Page → PDF
Group titles and dynamic tables can parallel after schema redesign.
```

## Schema Evolution

Current v1.1 schema (flat array):
```typescript
interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  sort: number;
}
// Template.schema: FormField[]
```

Proposed v1.2 schema (row/column/group tree):
```typescript
interface GridField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature' | 'table';
  label: string;
  required: boolean;
  colSpan: number; // 1-12, default 12
  placeholder?: string;
  options?: string[];
  // table-specific
  columns?: TableColumn[];
  minRows?: number;
  maxRows?: number;
}

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  width?: number; // percentage
  options?: string[]; // for select type
  required?: boolean;
}

interface FormRow {
  id: string;
  fields: GridField[];
}

interface FormGroup {
  id: string;
  type: 'group';
  title: string;
  style?: { color?: string; icon?: string };
  rows: FormRow[];
}

// Template.schema: (FormGroup | FormRow)[]
// Top-level items are either groups or ungrouped rows
```

PROJECT.md already confirms: "不兼容 v1.1 旧模板 schema" — clean break, no migration needed.

## Complexity Assessment

| Feature | Estimated Effort | Risk Level | Notes |
|---------|-----------------|------------|-------|
| Schema redesign | 1 day | LOW | Clean break from v1.1. No migration. JSONB is flexible |
| Grid layout in designer | 2-3 days | MEDIUM | Core challenge: drag-drop within grid cells. vue-draggable-plus needs adaptation for 2D grid |
| Section titles/groups | 1 day | LOW | Straightforward schema node + styled header component |
| Dynamic row table | 2-3 days | HIGH | New field type with sub-schema. Validation per cell. Mobile layout for tables is tricky |
| Responsive fill page | 1-2 days | LOW | Quasar grid classes handle most of it. Main work: dynamic table mobile view |
| PDF faithful output | 1-2 days | MEDIUM | html2canvas captures DOM as-is. Risk: page breaks splitting rows. Need print CSS tuning |

Total estimated: 8-12 days

## MVP Recommendation

Build in this order (critical path first):

1. Schema redesign — foundation for everything else
2. Grid layout engine in designer — core feature, highest user value
3. Section titles/groups — quick win, improves form organization
4. Responsive fill page — PC grid + mobile single-column
5. Dynamic row table — most complex, benefits from stable grid foundation
6. PDF faithful output — last because it depends on all layout features being stable

Defer to v1.3+:
- Drag-to-resize column span (nice DX but not essential — dropdown/input for colSpan works)
- Group title styling options (cosmetic)
- Conditional visibility (v2.0 per PROJECT.md)

## Sources

- [JotForm: Setting Up Form Columns](https://www.jotform.com/help/423-setting-up-form-columns/)
- [JotForm: How to Group Your Form Fields](https://www.jotform.com/help/how-to-group-your-form-fields/)
- [FormKit Repeater Input](https://formkit.com/inputs/repeater)
- [SurveyJS Dynamic Panel](https://surveyjs.io/stay-updated/blog/form-with-repeatable-form-fields-dynamic-panel)
- [Appian Section Layout](https://docs.appian.com/suite/help/26.1/Section_Layout.html)
- [Quasar Grid Column](https://quasar.dev/layout/grid/column/)
- [Quasar Breakpoints](https://quasar.dev/style/breakpoints/)
- [frevvo: Generate Pixel Perfect PDFs](https://frevvo-docs.atlassian.net/wiki/spaces/frevvo101/pages/1063224007/Generate+Pixel+Perfect+PDFs)
- [grid-layout-plus (Vue 3)](https://grid-layout-plus.netlify.app/)
- [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus)
- [html2pdf.js limitations](https://github.com/eKoopmans/html2pdf.js/)
- [jsPDF complex table issues](https://github.com/MrRio/jsPDF/issues/595)
- PROJECT.md v1.2 requirements (FR-15 through FR-19)
