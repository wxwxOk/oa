# Phase 14: 响应式填写页 - Research

**Researched:** 2026-04-22
**Domain:** CSS Grid responsive layout, mobile form UX, Quasar Vue 3
**Confidence:** HIGH

## Summary

Phase 14 is a pure frontend rendering-layer change across 4 existing files. The PC grid layout already works in `GridFormRenderer.vue` via `repeat(12, 1fr)` + `gridColumn: span ${colSpan}` -- the only PC change is widening `PublicFillPage` container from 640px to 960px. The mobile work is the core challenge: forcing all grid rows to single-column, converting `DynamicTableFill` from HTML `<table>` to collapsible cards, and adding a sticky submit button.

The existing `useResponsive()` composable (wrapping Quasar `$q.screen.gt.sm`, breakpoint at 1024px) is already imported in `PublicFillPage.vue` and used across 10+ pages in the project. The pattern is well-established: call `useResponsive()` directly in each component. Quasar `QExpansionItem` (already used in `FieldPalette.vue`) provides the card collapse/expand behavior needed for mobile dynamic table cards.

**Primary recommendation:** Use CSS-only media query `@media (max-width: 1023px)` to override `.grid-row` to `grid-template-columns: 1fr` in GridFormRenderer and GroupRenderer. Use `v-if="isMobile"` template branching in DynamicTableFill to swap between table and card layouts. Use `position: sticky; bottom: 0` for the mobile submit button.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: PublicFillPage container maxWidth from 640px to 960px
- D-02: Fill page grid layout identical to designer preview -- reuse same CSS Grid `repeat(12, 1fr)` + field-level `colSpan`
- D-03: Mobile (< 1024px via useResponsive isMobile) forces all fields to single-column full-width, ignoring colSpan
- D-04: Group blocks keep title bar on mobile, fields single-column, no collapse
- D-05: Mobile dynamic table switches from HTML table to vertical field cards -- one card per row
- D-06: Cards default expanded, user can click card title to collapse/expand
- D-07: Card title shows row number ("第 1 行", "第 2 行")
- D-08: Each card has delete button top-right, "+ 添加行" button at bottom
- D-09: Mobile field spacing 12px, input min-height 44px (iOS HIG touch target)
- D-10: Submit button sticky at bottom on mobile

### Claude's Discretion
- Card collapse/expand animation transition effect
- Mobile field spacing exact value (12px +/- 2px)
- Sticky submit button shadow and visual style
- PC 960px container padding details

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RENDER-01 | PC 端填写页按设计稿栅格布局渲染，与设计器预览一致 | D-01 (960px container) + D-02 (reuse existing CSS Grid); grid already works, only container width change needed |
| RENDER-02 | 移动端填写页自动降级为单列布局，保证触控体验 | D-03 (single column), D-04 (groups), D-05-D-08 (table cards), D-09 (touch targets), D-10 (sticky button) |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| quasar | 2.19.3 | UI framework, QExpansionItem, Screen plugin | Already installed; provides responsive breakpoints and expansion component |
| vue | ^3.5.12 | Reactive framework | Project foundation |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @quasar/extras | 1.17.0 | Material icons (delete_outline, add, expand_more) | Card action buttons |

### No New Dependencies
This phase requires zero new npm packages. Everything needed is already in the project:
- CSS Grid (native) for responsive layout
- Quasar Screen plugin for JS breakpoint detection
- Quasar QExpansionItem for card collapse/expand
- Quasar QCard/QBtn for card structure

## Architecture Patterns

### Responsive Strategy: CSS Media Query + JS Branching

Two complementary approaches, used for different concerns:

**1. CSS-only for grid column override (GridFormRenderer, GroupRenderer):**
```css
/* Aligns with Quasar sm breakpoint upper bound: 1023px */
@media (max-width: 1023px) {
  .grid-row {
    grid-template-columns: 1fr !important;
  }
}
```
Simpler and more performant than JS-driven class toggling. The `1023px` value aligns exactly with `useResponsive()` which uses `$q.screen.gt.sm` (true when >= 1024px).

**2. JS `v-if` branching for template swap (DynamicTableFill):**
```vue
<template v-if="isMobile">
  <!-- Card layout -->
</template>
<template v-else>
  <!-- Table layout (existing) -->
</template>
```
Use when DOM structure is fundamentally different between mobile and desktop.

### Component Modification Map
```
PublicFillPage.vue          <- D-01: maxWidth 640->960, D-10: sticky submit
GridFormRenderer.vue        <- D-03: CSS media query for single-column
GroupRenderer.vue           <- D-04: CSS media query for single-column
DynamicTableFill.vue        <- D-05~D-08: mobile card layout with QExpansionItem
```

### isMobile Detection Pattern
Call `useResponsive()` directly inside DynamicTableFill -- consistent with how PublicFillPage and 10+ other components use it. No prop drilling needed.

### Anti-Patterns to Avoid
- **JS-driven class toggling for pure CSS layout:** Do not use `:class="{ 'mobile-grid': isMobile }"` on grid-row when a media query achieves the same result with zero JS overhead
- **Duplicating grid CSS:** GridFormRenderer and GroupRenderer both have `.grid-row` with identical CSS. The media query override should be in both components' `<style scoped>` blocks (scoped CSS prevents sharing, but the duplication is 3 lines and acceptable)
- **Wrapping QExpansionItem in QCard for each row:** QExpansionItem already renders as a list item with expand behavior. Wrap the entire card list in a single QCard, use QExpansionItem per row inside it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapse/expand animation | Custom CSS transition + height calculation | Quasar QExpansionItem | Handles height animation, accessibility (aria-expanded), keyboard nav |
| Responsive breakpoint detection | window.matchMedia listener + manual cleanup | useResponsive() wrapping Quasar Screen plugin | Already reactive, SSR-safe, debounced (100ms default) |
| Touch target sizing | Custom padding calculations | CSS min-height: 44px on Quasar inputs | Quasar inputs already support dense prop; just ensure min-height override |
| Sticky bottom button | Custom scroll listener + fixed positioning | CSS position: sticky; bottom: 0 | Native browser behavior, no JS needed |
| Safe area insets | Manual bottom padding for notch devices | env(safe-area-inset-bottom) CSS | Native iOS/Android support, zero JS |

**Key insight:** This phase is 100% CSS + template restructuring. No new composables, no new utilities, no new stores. The existing infrastructure (useResponsive, QExpansionItem, CSS Grid) covers every requirement.

## Common Pitfalls

### Pitfall 1: CSS Scoped Style and Media Query Specificity
**What goes wrong:** Media query grid-template-columns: 1fr does not override the inline gridColumn: span N style on child FieldRenderer elements.
**Why it happens:** When grid-template-columns is 1fr (single column), the gridColumn: span 6 on a child is harmless -- CSS Grid auto-clamps span to available tracks. A span 6 in a 1-column grid just occupies 1 column.
**How to avoid:** No action needed. CSS Grid specification handles this automatically. The gridColumn: span N style on FieldRenderer children is safe to leave as-is.
**Warning signs:** If fields appear to overflow horizontally on mobile, check that grid-template-columns: 1fr is actually being applied (DevTools).

### Pitfall 2: Sticky Button Inside Overflow Container
**What goes wrong:** position: sticky; bottom: 0 on the submit button does not work because an ancestor has overflow: hidden or overflow: auto.
**Why it happens:** Sticky positioning is relative to the nearest scrolling ancestor. Quasar QPage uses overflow: auto on QPageContainer.
**How to avoid:** Use position: sticky on the submit button QCardSection, not on the button itself. The sticky element must be a direct child of the scrolling container or have no overflow-clipping ancestors between it and the scroll container. In PublicFillPage, the QCard is inside QPage which scrolls -- so the sticky section should be at the QCard level or restructured outside the QCard.
**Warning signs:** Button does not stick on scroll. Check ancestor overflow properties in DevTools.

### Pitfall 3: QExpansionItem Default State and v-model
**What goes wrong:** Using default-opened on QExpansionItem but then trying to programmatically control state.
**Why it happens:** default-opened is a one-time prop -- it sets initial state but does not react to changes. For D-06 (cards default expanded), use v-model initialized to true instead.
**How to avoid:** Use ref(true) per card row and bind with v-model. This allows both default-expanded and user-togglable behavior.
**Warning signs:** Cards do not respond to programmatic open/close after initial render.

### Pitfall 4: Mobile Keyboard Pushing Sticky Button
**What goes wrong:** On iOS, when the virtual keyboard opens for an input field, the sticky submit button floats above the keyboard, obscuring content.
**Why it happens:** iOS Safari resizes the visual viewport when the keyboard appears, and sticky elements reposition.
**How to avoid:** Accept this as standard iOS behavior -- it is actually desirable for form submission. If it becomes problematic, use visualViewport API to detect keyboard and temporarily hide the sticky button. But for a form submit button, being visible above the keyboard is a feature, not a bug.
**Warning signs:** User complaints about button covering input fields. Monitor during testing.

### Pitfall 5: DynamicTableFill Card Delete Button Positioning
**What goes wrong:** Delete button at top-right of card (D-08) conflicts with QExpansionItem expand icon which is also on the right side of the header.
**Why it happens:** QExpansionItem places its toggle arrow on the right by default.
**How to avoid:** Use QExpansionItem header slot to create a custom header with row title on the left and delete button on the right, with the expand arrow handled by expand-icon-toggle or switch-toggle-side. Alternatively, place delete button inside the card body rather than the header.
**Warning signs:** Delete button and expand arrow overlap or look cluttered.

## Code Examples

Verified patterns from existing codebase and official docs:

### Mobile Single-Column Grid Override (GridFormRenderer and GroupRenderer)
```css
/* Add to existing <style scoped> in both components */
/* 1023px = Quasar sm upper bound, aligns with useResponsive isMobile */
@media (max-width: 1023px) {
  .grid-row {
    grid-template-columns: 1fr !important;
    gap: 12px 0;  /* D-09: 12px vertical spacing, no horizontal gap in single column */
  }
}
```

### PublicFillPage Container Width Change (D-01)
```typescript
// Change in wrapperStyle computed
const wrapperStyle = computed(() => ({
  maxWidth: isMobile.value ? "100%" : "960px",  // was 640px
  width: "100%",
  padding: isMobile.value ? "16px" : "64px 0",
}));
```

### Mobile Touch Target (D-09)
```css
/* Add to GridFormRenderer or a shared mobile override */
@media (max-width: 1023px) {
  .field-renderer :deep(.q-field__control) {
    min-height: 44px;  /* iOS HIG touch target */
  }
}
```

### DynamicTableFill Mobile Card Layout (D-05 to D-08)
```vue
<!-- Mobile card layout using QExpansionItem -->
<template v-if="isMobile">
  <q-card flat bordered class="dynamic-table-fill q-mb-sm">
    <div class="table-label">{{ label }}</div>
    <div v-for="(row, rowIdx) in rows" :key="rowIdx">
      <q-expansion-item
        v-model="expandedStates[rowIdx]"
        expand-separator
        dense
      >
        <template #header>
          <q-item-section>第 {{ rowIdx + 1 }} 行</q-item-section>
          <q-item-section side>
            <q-btn flat dense round icon="delete_outline" size="xs"
                   color="negative" @click.stop="removeRow(rowIdx)" />
          </q-item-section>
        </template>
        <q-card-section>
          <div v-for="col in columns" :key="col.key" class="card-field">
            <div class="card-field-label">{{ col.label }}</div>
            <!-- Reuse existing input rendering logic per col.type -->
          </div>
        </q-card-section>
      </q-expansion-item>
    </div>
    <q-btn flat dense icon="add" label="添加行" color="primary"
           class="add-row-btn" @click="addRow" />
  </q-card>
</template>
```

### Sticky Submit Button (D-10)
```css
/* In PublicFillPage.vue */
@media (max-width: 1023px) {
  .submit-section {
    position: sticky;
    bottom: 0;
    background: #FFFFFF;
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    border-radius: 0 0 8px 8px;
  }
}
```

### Expanded State Management for Cards
```typescript
// In DynamicTableFill setup
import { ref, watch } from "vue";
import { useResponsive } from "src/composables/useResponsive";

const { isMobile } = useResponsive();

// Track expanded state per row -- default all expanded (D-06)
const expandedStates = ref<boolean[]>([]);

// Sync expanded states when rows change
watch(() => rows.value.length, (newLen) => {
  while (expandedStates.value.length < newLen) {
    expandedStates.value.push(true); // default expanded
  }
  expandedStates.value.length = newLen;
}, { immediate: true });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-driven responsive classes | CSS media queries + container queries | 2023+ | Less JS, better performance |
| vh units for mobile viewport | dvh/svh units | 2023 (Safari 15.4+) | Handles mobile browser chrome correctly |
| -webkit-sticky prefix | position: sticky (unprefixed) | 2020+ | All modern browsers support unprefixed |
| Manual touch target sizing | WCAG 2.2 SC 2.5.8 (24px min) + iOS HIG (44px) | WCAG 2.2 Oct 2023 | 44px is the gold standard for iOS |

**Deprecated/outdated:**
- -webkit-sticky prefix: No longer needed for any browser in the project target range
- window.innerHeight for mobile viewport: Use dvh or visualViewport.height instead

## Open Questions

1. **Sticky button inside QCard vs outside QCard**
   - What we know: D-10 says submit button sticky at bottom on mobile. Currently the submit button is inside a q-card-section inside q-card.
   - What is unclear: If the QCard has no overflow clipping, sticky works inside it. If QCard clips, the button needs to be moved outside the card.
   - Recommendation: Test sticky inside QCard first. If it does not stick, move the submit section outside the QCard wrapper on mobile only.

2. **FieldRenderer min-height override scope**
   - What we know: D-09 requires 44px min-height on inputs. Quasar outlined inputs have their own height.
   - What is unclear: Whether :deep(.q-field__control) in scoped CSS will correctly target all input types (QInput, QSelect, QOptionGroup).
   - Recommendation: Apply the min-height override and verify each field type. QOptionGroup (radio/checkbox) uses different DOM structure -- may need separate touch target handling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 0.34.6 + happy-dom |
| Config file | frontend/vitest.config.ts |
| Quick run command | cd frontend && npx vitest run --reporter=verbose |
| Full suite command | cd frontend && npx vitest run |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RENDER-01 | PC grid layout matches designer (12-col grid, colSpan) | manual | Visual inspection in browser | N/A |
| RENDER-02 | Mobile single-column layout | unit | npx vitest run src/components/renderer/__tests__/responsiveGrid.test.ts -x | Wave 0 |
| RENDER-02 | Mobile card layout for dynamic table | unit | npx vitest run src/components/renderer/__tests__/DynamicTableFill.test.ts -x | Wave 0 |
| RENDER-02 | Touch target min-height 44px | manual | DevTools inspection on mobile viewport | N/A |

### Sampling Rate
- **Per task commit:** cd frontend && npx vitest run
- **Per wave merge:** cd frontend && npx vitest run
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] frontend/src/components/renderer/__tests__/DynamicTableFill.test.ts -- covers mobile card rendering, expand/collapse, add/delete row in card mode
- [ ] Responsive grid behavior is primarily CSS -- unit tests verify component renders correct classes/structure, visual verification needed for layout

## Sources

### Primary (HIGH confidence)
- Quasar v2.19.3 installed in project -- Screen plugin breakpoints verified: xs<600, sm 600-1023, md 1024-1439
- Quasar QExpansionItem -- already used in FieldPalette.vue with default-opened, header-class props
- Existing codebase -- useResponsive() pattern used in 10+ components, well-established
- CSS Grid spec -- gridColumn: span N auto-clamps to available tracks (verified behavior)

### Secondary (MEDIUM confidence)
- [Quasar Screen Plugin docs](https://quasar.dev/options/screen-plugin/) -- .screen.gt.sm = viewport >= 1024px
- [Quasar QExpansionItem docs](https://quasar.dev/vue-components/expansion-item/) -- v-model, default-opened, header slot, expand-separator
- [WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) -- 24px minimum, 44px recommended (iOS HIG alignment)
- [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) -- 44pt minimum touch target

### Tertiary (LOW confidence)
- iOS 26 Safari sticky/fixed positioning regression (WebKit bug #297779) -- may affect sticky submit button on future iOS versions, monitor but do not preemptively work around

## Project Constraints (from CLAUDE.md)

- Language: Tool/model interaction in English; user interaction in Chinese
- Code style: Minimal, no redundancy; comments and docs follow non-essential-do-not-create principle
- Only make targeted changes for requirements; strictly no impact on existing functionality
- Validate current stage output before proceeding to next stage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new dependencies, all libraries already installed and verified
- Architecture: HIGH - CSS media query + JS branching is the established pattern in this codebase
- Pitfalls: HIGH - verified against CSS Grid spec and Quasar docs; sticky positioning gotchas well-documented

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable -- no fast-moving dependencies)
