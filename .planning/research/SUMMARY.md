# Project Research Summary

**Project:** OA v1.2 - Grid Layout Engine + Advanced Form Features
**Domain:** Enterprise form builder upgrade - 12-column grid layout, field grouping, dynamic tables, PDF fidelity
**Researched:** 2026-04-21
**Confidence:** HIGH

## Executive Summary

v1.2 transforms the OA form designer from a flat single-column field list into a 12-column grid layout engine with field grouping, dynamic row tables, responsive fill pages, and faithful PDF output. This is a schema-breaking upgrade (confirmed: not compatible with v1.1 schema). The established pattern across form builder products (JotForm, SurveyJS, FormKit, Appian) is a row-based hierarchical schema where each row contains columns with explicit span values, groups act as titled containers of nested rows, and dynamic tables are a distinct node type with their own column definitions. The existing Vue 3 + Quasar + Elysia + Prisma stack handles this with minimal new dependencies.

The recommended approach centers on a unified GridFormRenderer component that serves three modes (designer preview, interactive fill, print/read-only) driven by a single FormSchema with version: 2 discriminator. The schema is a row-based tree: top-level rows[] where each row is either a field-row (columns with span), a group (titled section with nested rows), or a dynamic-table (repeatable sub-form). This structure maps directly to Quasar 12-column flexbox grid for rendering and avoids the complexity of a separate UI schema. For the designer canvas, grid-layout-plus provides drag-and-resize grid editing out of the box, while the fill page uses plain Quasar col-{span} classes. Two new dependencies are needed: grid-layout-plus for the designer and jspdf-autotable for programmatic PDF table rendering.

The critical risks are: (1) html2canvas cannot faithfully render CSS Grid layouts - mitigated by a dedicated PrintableForm component that converts grid schema to simple table HTML before capture; (2) drag-drop in grid cells requires 2D placement logic that SortableJS (underlying vue-draggable-plus) cannot provide - mitigated by using grid-layout-plus for the designer canvas; (3) existing v1.1 submissions will break if the renderer assumes v1.2 schema - mitigated by a version discriminator that routes old submissions to the legacy renderer. All three must be addressed in Phase 1.

## Key Findings

### Recommended Stack

The existing stack requires no changes. Two new runtime dependencies cover the gaps.

**New dependencies:**
- grid-layout-plus ^1.3: Draggable/resizable 12-column grid for the designer canvas - Vue 3 native, x/y/w/h data model, handles collision detection and snap-to-grid
- jspdf-autotable ^5.0: Programmatic PDF table rendering with borders, colSpan, pagination - solves html2canvas grid rendering failures

**Existing dependencies (unchanged):**
- vue-draggable-plus: Retained for field palette drag-out and within-row reordering
- html2canvas + jspdf: Retained for signature capture and PDF document creation
- Quasar grid system: Built-in row + col-{n} classes for fill page rendering - no new dependency needed

**Key decision - no server-side PDF:** Both Puppeteer and Playwright have confirmed Bun runtime incompatibilities (WebSocket failures, launch timeouts). Adding a Node.js microservice violates the single-container Docker Compose constraint. Client-side hybrid PDF (jspdf-autotable for form body + html2canvas for signatures) is the correct approach.

### Expected Features

**Must have (table stakes):**
- 12-column grid layout in designer (FR-16) - every serious form builder supports multi-column
- Field grouping with section titles (FR-15) - standard across JotForm, SurveyJS, Appian
- PC fill page renders designer layout (FR-19) - WYSIWYG expectation
- Mobile fill page auto single-column (FR-19) - universal responsive pattern
- PDF output preserves grid layout (FR-18) - users print forms for physical filing

**Should have (differentiators):**
- Dynamic row table / repeater field (FR-17) - replaces paper tables for HR/admin forms
- Drag-to-resize column span in designer - better DX than typing span values
- Row-level drag reorder - drag entire rows to reorganize form sections

**Defer to v2+:**
- Collapsible/accordion sections - breaks print layout, adds state complexity
- Conditional visibility (show/hide rules) - rule engine complexity, deferred per PROJECT.md
- Nested groups (groups within groups) - exponential complexity, no real-world need
- Free-form pixel positioning - destroys responsiveness
- Cell merging in dynamic tables - html2canvas/jsPDF rendering issues

### Architecture Approach

The architecture introduces a unified GridFormRenderer as the single layout engine shared across designer preview, fill page, and print/PDF contexts. The schema evolves from a flat FormField[] to a hierarchical FormSchema { version: 2, rows: SchemaRow[] } with three row types: field-row, group, and dynamic-table. This eliminates the current triple-implementation problem (DesignerCanvas, FormFieldRenderer, SubmissionDetail each having independent field-type switch logic). A dedicated PrintableForm component converts the grid schema to table-based HTML for reliable html2canvas capture.

**Major components:**
1. GridFormRenderer - shared layout engine with mode prop (designer/fill/print), iterates schema rows
2. FieldRenderer - single field renderer replacing 3 separate implementations, mode-aware
3. PrintableForm - table-based HTML renderer for PDF capture, bypasses CSS Grid entirely
4. DesignerCanvas (rewrite) - row-based grid editor using grid-layout-plus for drag/resize
5. DynamicTableRenderer - editable table with add/remove rows (fill mode) and static display (print mode)

### Critical Pitfalls

1. **html2canvas + CSS Grid incompatibility** - html2canvas cannot render CSS Grid layouts faithfully (misaligned items, broken gaps, overlapping). Build a PrintableForm that converts grid schema to table HTML with inline styles before capture. Test PDF with the most complex template in Phase 1, not at the end.

2. **Drag-drop 2D placement** - SortableJS (vue-draggable-plus) is 1D list-based, cannot handle 2D grid cell placement. Use grid-layout-plus for the designer canvas which provides native grid drag + resize + collision detection.

3. **Schema structure mismatch** - Extending the flat FormField interface with optional grid properties creates an incoherent data model. Use a clean-break discriminated union schema with version: 2 and three distinct node types (field-row, group, dynamic-table).

4. **Dynamic table validation state explosion** - Array-index keying causes validation desync on row add/delete. Key rows by unique rowId (nanoid), store data as { [rowId]: RowData }, use per-row validation scopes. Set maxRows limit (20).

5. **Legacy v1.1 submission rendering** - Old submissions reference flat FormField[] schemas. Implement a version discriminator: schemaVersion <= N routes to legacy renderer, > N routes to grid renderer. Keep legacy rendering code intact.

## Implications for Roadmap

Based on combined research, the dependency chain is clear: Schema + Core Renderer -> Designer Grid -> Groups/Tables -> PDF -> Responsive. Five phases recommended.

### Phase 1: Schema + Core Renderer (Foundation)
**Rationale:** Everything depends on the new schema types and the unified renderer. The version discriminator for legacy submissions must exist before any new schema code is deployed. This is the single most important design decision.
**Delivers:** TypeScript types (FormSchema, SchemaRow, etc.), GridFormRenderer + GridRow + GridCell + FieldRenderer components, updated template store with row/col actions, backend body validation for version: 2, legacy submission version discriminator.
**Addresses:** FR-16 foundation, FR-18 foundation, FR-19 foundation
**Avoids:** Schema structure mismatch (Pitfall 3), Legacy submission breakage (Pitfall 5)

### Phase 2: Designer Grid Editing
**Rationale:** With the renderer and schema in place, the designer canvas can be rewritten. This is the highest-complexity frontend work and the core user-facing feature. grid-layout-plus handles the 2D drag/resize problem.
**Delivers:** Rewritten DesignerCanvas with grid-layout-plus, DesignerRow + DesignerCell components, PropertyEditor with span slider, updated FieldPalette with group + dynamic table items.
**Addresses:** FR-16 (grid layout in designer)
**Avoids:** Drag-drop 2D placement failure (Pitfall 2)

### Phase 3: Groups + Dynamic Tables
**Rationale:** These are the two new structural node types. Both depend on Phase 1 renderer and schema but are independent of each other. Dynamic tables are the highest-risk feature (validation state, mobile rendering).
**Delivers:** GroupRenderer, DynamicTableRenderer (fill + print modes), DynamicTableEditor (designer mode), DesignerGroup component, per-row validation with rowId keying.
**Addresses:** FR-15 (field grouping), FR-17 (dynamic row table)
**Avoids:** Validation state explosion (Pitfall 4)

### Phase 4: PDF + Print Fidelity
**Rationale:** PDF depends on all layout features being stable. The PrintableForm component converts grid schema to table-based HTML, solving the html2canvas + CSS Grid incompatibility. jspdf-autotable handles programmatic table rendering for dynamic tables.
**Delivers:** PrintableForm component (table-based layout), updated usePdfExport, SubmissionDetail using GridFormRenderer mode='print'.
**Addresses:** FR-18 (PDF faithful output)
**Avoids:** html2canvas CSS Grid failure (Pitfall 1)

### Phase 5: Responsive Fill Page
**Rationale:** Independent of PDF work, only needs Phase 1 renderer. Mobile collapse uses Quasar breakpoints. Dynamic table mobile view (card layout) depends on Phase 3.
**Delivers:** Mobile detection in GridRow (col-12 fallback), updated PublicFillPage using GridFormRenderer, dynamic table card layout on mobile.
**Addresses:** FR-19 (responsive fill page)
**Avoids:** Responsive conversion losing semantic context (Pitfall 6)

### Phase Ordering Rationale

- Phase 1 before all: the schema types and unified renderer are the foundation. Every other phase imports these types and components.
- Phase 2 after 1: designer rewrite needs the schema shape and renderer to exist for preview.
- Phase 3 can partially overlap with Phase 2: groups and dynamic tables build on Phase 1, not Phase 2. But completing Phase 2 first reduces integration risk.
- Phase 4 after 3: PDF must render groups and dynamic tables, so those features must be stable first.
- Phase 5 after 1, ideally after 3: basic responsive works with Phase 1, but dynamic table mobile view needs Phase 3.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Designer Grid):** grid-layout-plus integration with vue-draggable-plus for palette drag-to-grid. Nested sortable patterns. Highest frontend complexity.
- **Phase 3 (Dynamic Tables):** Per-row validation strategy (Quasar QForm scoping vs VeeValidate useFieldArray). Mobile table rendering pattern (card layout).
- **Phase 4 (PDF):** jspdf-autotable API for complex layouts with colSpan, nested tables, CJK fonts. Page-break handling for long dynamic tables.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema + Renderer):** Well-documented TypeScript discriminated union pattern. Quasar grid classes are straightforward.
- **Phase 5 (Responsive):** Standard Quasar breakpoint usage. useResponsive composable already exists in codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 2 new deps, both mature. Bun/Puppeteer incompatibility well-documented. |
| Features | HIGH | Derived from PROJECT.md FR-15 through FR-19 + competitive analysis (JotForm, SurveyJS, FormKit, Appian). Clear table stakes vs differentiators. |
| Architecture | HIGH | Based on existing codebase analysis. Unified renderer pattern proven across form builder products. Schema design follows established JSONB patterns. |
| Pitfalls | HIGH | Sourced from GitHub issues (html2canvas #2405, Chromium #41317853, vuelidate #1063), SO threads, and library documentation. All pitfalls have concrete prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **grid-layout-plus + Quasar integration:** No documented examples of grid-layout-plus inside Quasar layouts. Need to verify CSS compatibility and z-index layering in Phase 2 planning.
- **jspdf-autotable CJK font support:** The project uses Chinese text. jspdf-autotable inherits jsPDF font system which has known CJK issues. May need custom font embedding or fall back to html2canvas for the entire form body (using table-based PrintableForm).
- **Dynamic table row limit performance:** Research suggests maxRows=20, but no benchmarks with the actual stack. Profile with 50+ rows during Phase 3 to validate.
- **STACK vs ARCHITECTURE schema disagreement:** STACK proposes {x, y, w, h} grid coordinates; ARCHITECTURE proposes row-based {rows[].cols[].span}. Recommendation: use the row-based model (ARCHITECTURE) because forms are inherently row-oriented, and it maps directly to Quasar flexbox grid. The {x, y, w, h} model is better for free-form dashboards, not form layouts.

## Sources

### Primary (HIGH confidence)
- [grid-layout-plus docs](https://grid-layout-plus.netlify.app/) - Vue 3 grid layout with drag/resize
- [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) - v5.0, table plugin for jsPDF
- [Quasar Grid Column](https://quasar.dev/layout/grid/column/) - 12-column flexbox grid
- [vue-draggable-plus nesting](https://vue-draggable-plus.pages.dev/en/demo/nested/) - nested sortable support
- [html2canvas CSS Grid issues](https://github.com/niklasvh/html2canvas/issues/2405) - confirmed rendering failures
- [Bun + Puppeteer issues](https://github.com/oven-sh/bun/issues/24388) - WebSocket broken
- [Bun + Playwright issues](https://github.com/oven-sh/bun/issues/27977) - chromium.launch() timeout

### Secondary (MEDIUM confidence)
- [JotForm columns](https://www.jotform.com/help/423-setting-up-form-columns/) - competitive feature analysis
- [SurveyJS Dynamic Panel](https://surveyjs.io/stay-updated/blog/form-with-repeatable-form-fields-dynamic-panel) - repeater pattern
- [FormKit Repeater](https://formkit.com/inputs/repeater) - dynamic row table pattern
- [Appian Section Layout](https://docs.appian.com/suite/help/26.1/Section_Layout.html) - grouping pattern
- [Vuelidate dynamic array issues](https://github.com/vuelidate/vuelidate/issues/1063) - validation desync

### Tertiary (LOW confidence)
- jspdf-autotable CJK font rendering - needs validation during Phase 4 implementation
- grid-layout-plus + Quasar CSS compatibility - needs validation during Phase 2 implementation

---
*Research completed: 2026-04-21*
*Ready for roadmap: yes*
