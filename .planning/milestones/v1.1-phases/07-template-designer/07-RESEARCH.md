# Phase 7: 模板管理 + 表单设计器 - Research

**Researched:** 2026-04-20
**Domain:** Form template CRUD + drag-drop form designer + schema versioning
**Confidence:** HIGH

## Summary

Phase 7 extends the existing OA v1.0 system (Elysia + Prisma + Vue 3 + Quasar) with form template management and a 3-panel drag-drop form designer. The core technical challenges are: (1) Prisma JSONB schema for storing form field definitions with integer versioning, (2) vue-draggable-plus clone-drag from field palette to canvas with sortable reordering, (3) signature_pad Canvas integration for handwritten signature fields, and (4) template lifecycle state machine (draft/published/offline) with RBAC permission gating.

All libraries are locked decisions from v1.1 research. The existing codebase provides strong patterns to follow: Elysia module registration via `.use()`, authGuard middleware with permission codes, Quasar QTable for list pages, v-perm directive for UI permission control, and Pinia stores for state management. The primary risk is the 3-panel designer UX complexity on the frontend.

**Primary recommendation:** Follow existing module patterns exactly. Backend: new Prisma model + Elysia route module. Frontend: TemplatePage (QTable list) + FormDesigner (3-panel SPA component). Use vue-draggable-plus `useDraggable` composable with `group: { pull: 'clone' }` for field palette-to-canvas drag. Store form schema as JSONB with integer `schemaVersion` column.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Designer Layout:**
- 3 panels: field palette + canvas + property editor
- PC only, mobile shows template list read-only
- Field palette: grouped collapse (basic fields / special fields)
- Preview: WYSIWYG canvas (canvas itself is the preview)

**Template Lifecycle:**
- Version strategy: auto-increment integer (1, 2, 3...)
- Save: manual (click "save" button)
- State flow: draft -> published -> offline -> can re-publish
- Edit published template: in-place edit, version auto +1 on save

**Signature Field:**
- Storage: PNG base64 string in JSONB
- Pad size: fixed 400x200px
- Controls: only "clear" button (no undo)

**Template List & Management:**
- Layout: table (consistent with v1.0 user/role pages)
- Filter/sort: status filter + updated_at sort
- Delete policy: only draft templates can be deleted

**Inherited Decisions (from STATE.md, locked):**
- JSONB for form schema storage in PostgreSQL
- vue-draggable-plus for drag-drop
- signature_pad for handwritten signatures
- Schema versioning: snapshot at submission time

### Claude's Discretion
None specified — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMPL-01 | Create form template (name + description) | Prisma FormTemplate model + Elysia POST /templates route |
| TMPL-02 | Edit and delete own templates | Elysia PUT/DELETE routes with ownership check |
| TMPL-03 | RBAC permission control on template CRUD | authGuard('form:template:*') following existing pattern |
| TMPL-04 | Publish/unpublish template | Status enum (DRAFT/PUBLISHED/OFFLINE) + PATCH route |
| TMPL-05 | Auto-increment schema version on published template edit | Integer schemaVersion column, increment in save handler |
| DSGN-01 | Drag-drop to add and sort fields | vue-draggable-plus useDraggable with clone group |
| DSGN-02 | Basic field types (text, textarea, radio, checkbox, date, phone) | Field type registry with render/config components |
| DSGN-03 | Handwritten signature field (Canvas) | signature_pad library integration |
| DSGN-04 | Field property config (required, placeholder, options) | Property editor panel bound to selected field |
| DSGN-05 | Real-time preview | WYSIWYG canvas (canvas IS the preview) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Code style: minimal, no redundancy. Comments and docs follow "only when necessary" principle
- Changes must be targeted to requirements only, no side effects on existing features
- Language: Chinese for user-facing text, English for code/tools
- Validation: stop-loss — verify current phase output before proceeding to next

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| elysia | ^1.1.24 (latest: 1.4.28) | Backend framework | Project standard, all modules use it |
| @prisma/client | ^5.22.0 | ORM + JSONB support | Project standard, `Json` type maps to PostgreSQL jsonb |
| vue | ^3.5.12 | Frontend framework | Project standard |
| quasar | ^2.17.0 (latest: 2.19.3) | UI component library | Project standard, QTable/QDialog/QBtn etc. |
| pinia | ^2.2.4 | State management | Project standard |
| axios | ^1.7.7 | HTTP client | Project standard via `src/boot/axios.ts` |

### New Dependencies (to install)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vue-draggable-plus | ^0.6.1 | Drag-drop field sorting | Locked decision from v1.1 research. Vue 3 native, wraps SortableJS |
| signature_pad | ^5.1.3 | Handwritten signature Canvas | Locked decision. 4M+ weekly downloads, pure JS, no framework dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vue-draggable-plus | @vueuse/integrations + sortablejs | vue-draggable-plus has better Vue 3 DX with useDraggable composable |
| signature_pad | vue-signature-pad | signature_pad is framework-agnostic, lighter, more maintained |
| JSONB schema | Separate fields table (EAV) | JSONB is simpler, single-query fetch, locked decision |

**Installation:**
```bash
# Frontend
cd frontend && bun add vue-draggable-plus signature_pad

# Backend — no new deps needed (Prisma Json type built-in)
```

**Version verification:** vue-draggable-plus@0.6.1 (npm registry 2026-04-20), signature_pad@5.1.3 (npm registry 2026-04-20).

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── prisma/
│   └── schema.prisma          # Add FormTemplate model + TemplateStatus enum
│   └── seed.ts                # Add form:template:* permissions
├── src/modules/
│   └── template/
│       └── template.route.ts  # Elysia module: CRUD + publish/unpublish

frontend/
├── src/pages/
│   ├── TemplatePage.vue       # Template list (QTable, follows UserPage pattern)
│   └── FormDesignerPage.vue   # 3-panel designer (PC only)
├── src/components/designer/
│   ├── FieldPalette.vue       # Left panel: draggable field type list
│   ├── DesignerCanvas.vue     # Center panel: drop zone + sortable fields
│   ├── PropertyEditor.vue     # Right panel: selected field config
│   ├── fields/                # Field type renderers
│   │   ├── TextField.vue
│   │   ├── TextareaField.vue
│   │   ├── RadioField.vue
│   │   ├── CheckboxField.vue
│   │   ├── DateField.vue
│   │   ├── PhoneField.vue
│   │   └── SignatureField.vue
│   └── fieldRegistry.ts       # Field type definitions + metadata
├── src/stores/
│   └── template.ts            # Pinia store: template CRUD + designer state
```

### Pattern 1: Prisma FormTemplate Model
**What:** Single model with JSONB `schema` column and integer `schemaVersion`
**When to use:** All template CRUD operations

```prisma
enum TemplateStatus {
  DRAFT
  PUBLISHED
  OFFLINE
}

model FormTemplate {
  id            Int            @id @default(autoincrement())
  name          String
  description   String?
  schema        Json           @default("[]")
  schemaVersion Int            @default(1)
  status        TemplateStatus @default(DRAFT)
  creatorId     Int
  creator       User           @relation(fields: [creatorId], references: [id])
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([creatorId])
  @@index([status])
}
```

**Key:** `schema` stores the field array as JSONB. `schemaVersion` is a plain integer column (not inside JSONB) for easy querying and incrementing.

### Pattern 2: Form Schema JSONB Structure
**What:** TypeScript interface for the JSONB `schema` field content
**When to use:** Frontend designer state + backend validation

```typescript
// Shared type definition (can live in a shared types file)
interface FormField {
  id: string;          // nanoid or uuid, unique within template
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;       // Field display name
  required: boolean;
  placeholder?: string;
  options?: string[];   // For radio/checkbox only
  sort: number;         // Display order
}

// The schema column stores: FormField[]
// Example:
// [
//   { id: "f1", type: "text", label: "姓名", required: true, placeholder: "请输入姓名", sort: 0 },
//   { id: "f2", type: "radio", label: "性别", required: true, options: ["男", "女"], sort: 1 },
//   { id: "f3", type: "signature", label: "签名", required: true, sort: 2 }
// ]
```

### Pattern 3: Elysia Route Module (following existing pattern)
**What:** Backend module with authGuard per-operation permission
**When to use:** All template API endpoints

```typescript
// backend/src/modules/template/template.route.ts
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
  .get('/', async ({ currentUser, query }: any) => {
    // List with status filter + pagination + updatedAt sort
  })
  .get('/:id', async ({ params }: any) => {
    // Get single template with schema
  })
  .guard({}, (app) =>
    app.use(authGuard('form:template:create')).post('/', async ({ body, currentUser }: any) => {
      // Create template, set creatorId = currentUser.id
    })
  )
  .guard({}, (app) =>
    app.use(authGuard('form:template:edit')).put('/:id', async ({ params, body, currentUser }: any) => {
      // Update template. If status === PUBLISHED, increment schemaVersion
    })
  )
  .guard({}, (app) =>
    app.use(authGuard('form:template:delete')).delete('/:id', async ({ params, currentUser }: any) => {
      // Only delete DRAFT templates. Check ownership.
    })
  )
  .guard({}, (app) =>
    app.use(authGuard('form:template:publish')).patch('/:id/status', async ({ params, body }: any) => {
      // Toggle status: DRAFT->PUBLISHED, PUBLISHED->OFFLINE, OFFLINE->PUBLISHED
    })
  );
```

### Pattern 4: vue-draggable-plus Clone Drag (Field Palette -> Canvas)
**What:** Two draggable zones with clone behavior
**When to use:** Designer field palette and canvas

```typescript
// FieldPalette.vue — source list (clone mode)
import { ref } from 'vue';
import { useDraggable } from 'vue-draggable-plus';

const paletteRef = ref<HTMLElement | null>(null);
const fieldTypes = ref([
  { type: 'text', label: '文本', icon: 'text_fields' },
  { type: 'textarea', label: '多行文本', icon: 'notes' },
  { type: 'radio', label: '单选', icon: 'radio_button_checked' },
  { type: 'checkbox', label: '多选', icon: 'check_box' },
  { type: 'date', label: '日期', icon: 'calendar_today' },
  { type: 'phone', label: '手机号', icon: 'phone' },
  { type: 'signature', label: '手写签名', icon: 'draw' },
]);

useDraggable(paletteRef, fieldTypes, {
  group: { name: 'designer', pull: 'clone', put: false },
  sort: false,  // palette items don't reorder
  clone: (item) => ({
    ...item,
    id: crypto.randomUUID(),  // unique ID for each dropped field
    required: false,
    placeholder: '',
    options: ['radio', 'checkbox'].includes(item.type) ? ['选项1', '选项2'] : undefined,
  }),
});

// DesignerCanvas.vue — target list (sortable)
const canvasRef = ref<HTMLElement | null>(null);
const fields = ref<FormField[]>([]);  // bound to template store

useDraggable(canvasRef, fields, {
  group: { name: 'designer', pull: false, put: true },
  animation: 150,
  handle: '.drag-handle',  // optional drag handle
});
```

### Pattern 5: signature_pad Vue Integration
**What:** Wrap signature_pad in a Vue component
**When to use:** SignatureField.vue in designer preview and future fill page

```typescript
// components/designer/fields/SignatureField.vue
import { ref, onMounted, onBeforeUnmount } from 'vue';
import SignaturePad from 'signature_pad';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let pad: SignaturePad | null = null;

onMounted(() => {
  if (!canvasRef.value) return;
  // Fixed size per locked decision: 400x200
  canvasRef.value.width = 400;
  canvasRef.value.height = 200;
  pad = new SignaturePad(canvasRef.value, {
    penColor: '#000',
    backgroundColor: '#fff',
    minWidth: 0.5,
    maxWidth: 2.5,
  });
});

function clear() { pad?.clear(); }
function isEmpty() { return pad?.isEmpty() ?? true; }
function toDataURL() { return pad?.toDataURL('image/png') ?? ''; }

onBeforeUnmount(() => { pad?.off(); });
```

### Pattern 6: Schema Version Auto-Increment
**What:** Backend logic for version bump on published template save
**When to use:** PUT /templates/:id when template status is PUBLISHED

```typescript
// In template.route.ts PUT handler:
const template = await prisma.formTemplate.findUnique({ where: { id } });
if (!template) throw notFound('模板不存在');

const updateData: any = { name: body.name, description: body.description };

// Only bump version if schema changed AND template is published
if (body.schema && template.status === 'PUBLISHED') {
  updateData.schema = body.schema;
  updateData.schemaVersion = template.schemaVersion + 1;
} else if (body.schema) {
  updateData.schema = body.schema;
}

await prisma.formTemplate.update({ where: { id }, data: updateData });
```

### Anti-Patterns to Avoid
- **Storing version inside JSONB:** Keep `schemaVersion` as a separate integer column for easy querying and atomic increment
- **Mutating palette array on clone:** The `clone` callback must return a NEW object; never mutate the source field type list
- **Canvas resize without devicePixelRatio:** signature_pad canvas must account for HiDPI displays, but since we use fixed 400x200px this is manageable
- **Deleting published/offline templates:** Enforce DRAFT-only deletion at both API and UI level

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-drop sorting | Custom mousedown/touchstart handlers | vue-draggable-plus (SortableJS) | Touch support, animation, clone, group — hundreds of edge cases |
| Handwritten signature | Custom Canvas drawing code | signature_pad | Bezier curve smoothing, pressure sensitivity, HiDPI — non-trivial |
| Unique field IDs | Math.random() or counter | crypto.randomUUID() | Browser-native, collision-free, no dependency |
| Form validation (backend) | Manual if/else chains | Elysia t.Object() schema | Type-safe, auto-error messages, consistent with existing routes |

**Key insight:** The form designer's complexity is in UX orchestration (panel coordination, field selection, property binding), not in low-level drag/signature mechanics. Let libraries handle the hard parts.

## Common Pitfalls

### Pitfall 1: SortableJS Group Name Mismatch
**What goes wrong:** Fields dragged from palette don't land on canvas
**Why it happens:** `group.name` must be identical on both source and target useDraggable calls
**How to avoid:** Use a constant `const GROUP_NAME = 'designer'` shared between FieldPalette and DesignerCanvas
**Warning signs:** Drag ghost appears but drop doesn't register

### Pitfall 2: Clone Callback Returns Reference Instead of Copy
**What goes wrong:** Dragging a field from palette mutates the palette's field type definition
**Why it happens:** `clone` callback returns the same object reference
**How to avoid:** Always spread or deep-clone in the clone callback: `clone: (item) => ({ ...item, id: crypto.randomUUID() })`
**Warning signs:** Palette items gain unexpected properties after drag

### Pitfall 3: signature_pad Canvas Not Clearing on Component Unmount
**What goes wrong:** Memory leak, stale event listeners
**Why it happens:** signature_pad binds pointer/touch events to canvas
**How to avoid:** Call `pad.off()` in `onBeforeUnmount`
**Warning signs:** Console warnings about detached DOM nodes

### Pitfall 4: JSONB Schema Validation Gap
**What goes wrong:** Malformed field definitions saved to database
**Why it happens:** Prisma `Json` type accepts any valid JSON — no structural validation
**How to avoid:** Validate `body.schema` with Elysia's `t.Array(t.Object({...}))` before saving
**Warning signs:** Frontend crashes when loading templates with unexpected schema shapes

### Pitfall 5: Version Increment on Non-Schema Changes
**What goes wrong:** Version bumps when only name/description changed (not schema)
**Why it happens:** Unconditional version increment in PUT handler
**How to avoid:** Compare `body.schema` with existing `template.schema` or only increment when schema field is present in request body AND template is PUBLISHED
**Warning signs:** Version numbers jump unexpectedly

### Pitfall 6: Elysia Guard Scope Leaking
**What goes wrong:** Permission from one guard applies to unrelated routes
**Why it happens:** Known Elysia issue #1752 — route specificity bugs with .use()/.group()
**How to avoid:** Wrap each permission-gated operation in its own `.guard({}, (app) => app.use(authGuard(...)).verb(...))` block, exactly as role.route.ts does
**Warning signs:** 403 errors on routes that should be accessible, or missing 403 on restricted routes

### Pitfall 7: Quasar Dark Mode Not Applied to Designer
**What goes wrong:** Designer panels have white background in dark mode
**Why it happens:** Custom CSS in designer components doesn't use Quasar CSS variables
**How to avoid:** Use `var(--oa-surface)`, `var(--oa-text-primary)` etc. as established in v1.0 pages
**Warning signs:** Visual inconsistency when toggling dark mode

## Code Examples

### Permission Seed Data (for seed.ts)
```typescript
// Add to PERMISSIONS array in prisma/seed.ts
{ code: 'form:template:list', name: '模板列表', module: 'form' },
{ code: 'form:template:create', name: '创建模板', module: 'form' },
{ code: 'form:template:edit', name: '编辑模板', module: 'form' },
{ code: 'form:template:delete', name: '删除模板', module: 'form' },
{ code: 'form:template:publish', name: '发布/下线模板', module: 'form' },
```

### Route Registration (in backend/src/index.ts)
```typescript
import { formTemplateModule } from './modules/template/template.route';

// Inside .group('/api/v1', (app) => app.use(...).use(formTemplateModule))
```

### Frontend Route Registration
```typescript
// In frontend/src/router/routes.ts, add to children of '/' route:
{
  path: 'templates',
  component: () => import('pages/TemplatePage.vue'),
  meta: { title: '模板管理', icon: 'description', perm: 'form:template:list' }
},
{
  path: 'templates/:id/design',
  component: () => import('pages/FormDesignerPage.vue'),
  meta: { title: '表单设计', perm: 'form:template:edit' }
},
```

### Field Type Registry
```typescript
// frontend/src/components/designer/fieldRegistry.ts
export interface FieldTypeDef {
  type: string;
  label: string;
  icon: string;       // Material icon name
  group: 'basic' | 'special';
  defaultProps: Partial<FormField>;
}

export const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'text', label: '文本', icon: 'text_fields', group: 'basic', defaultProps: { placeholder: '请输入' } },
  { type: 'textarea', label: '多行文本', icon: 'notes', group: 'basic', defaultProps: { placeholder: '请输入' } },
  { type: 'radio', label: '单选', icon: 'radio_button_checked', group: 'basic', defaultProps: { options: ['选项1', '选项2'] } },
  { type: 'checkbox', label: '多选', icon: 'check_box', group: 'basic', defaultProps: { options: ['选项1', '选项2'] } },
  { type: 'date', label: '日期', icon: 'calendar_today', group: 'basic', defaultProps: {} },
  { type: 'phone', label: '手机号', icon: 'phone', group: 'basic', defaultProps: { placeholder: '请输入手机号' } },
  { type: 'signature', label: '手写签名', icon: 'draw', group: 'special', defaultProps: {} },
];

export const FIELD_GROUPS = {
  basic: { label: '基础字段', types: FIELD_TYPES.filter(f => f.group === 'basic') },
  special: { label: '特殊字段', types: FIELD_TYPES.filter(f => f.group === 'special') },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vuedraggable (Vue 2) | vue-draggable-plus (Vue 2/3) | 2023 | Native Vue 3 support, useDraggable composable, better TS types |
| signature_pad v4 | signature_pad v5 | 2024 | ES module support, better TypeScript types, smaller bundle |
| Prisma Json (untyped) | Prisma Json + app-level Zod/Elysia validation | Ongoing | Prisma still lacks typed Json fields (issue #3219), validate in app layer |
| EAV pattern for forms | JSONB column | PostgreSQL 9.4+ | Single-query fetch, flexible schema, GIN indexable |

**Deprecated/outdated:**
- `vuedraggable` (zhyswan): Vue 2 only, unmaintained — use `vue-draggable-plus` instead
- `signature_pad` v3.x: Missing ES module exports — use v5.x

## Open Questions

1. **User model relation for FormTemplate**
   - What we know: Prisma schema has `User` model with `id Int @id`
   - What's unclear: Need to add `templates FormTemplate[]` relation to User model
   - Recommendation: Add the relation field in the Prisma migration. Minimal change.

2. **Sidebar navigation update**
   - What we know: MainLayout.vue has a sidebar with navigation items
   - What's unclear: How sidebar items are defined (hardcoded or dynamic)
   - Recommendation: Inspect MainLayout.vue during planning. Add "模板管理" nav item with `description` icon.

3. **Phase 8 forward compatibility**
   - What we know: Phase 8 needs share links + public fill page referencing template schema version
   - What's unclear: Whether FormTemplate needs a `FormSubmission` relation now or in Phase 8
   - Recommendation: Do NOT add FormSubmission model in Phase 7. Only add what's needed now. Phase 8 will extend the schema.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^0.34.6 + happy-dom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && bun run test` |
| Full suite command | `cd frontend && bun run test:coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMPL-01 | Create template API | integration | Backend manual test (no test framework yet) | N/A |
| TMPL-02 | Edit/delete template API | integration | Backend manual test | N/A |
| TMPL-03 | RBAC permission check | integration | Backend manual test | N/A |
| TMPL-04 | Publish/unpublish status | integration | Backend manual test | N/A |
| TMPL-05 | Schema version increment | unit | Backend manual test | N/A |
| DSGN-01 | Drag-drop field add/sort | manual | Manual browser test (drag interaction) | N/A |
| DSGN-02 | Field type rendering | unit | `cd frontend && vitest run --reporter=verbose` | Wave 0 |
| DSGN-03 | Signature pad integration | manual | Manual browser test (canvas interaction) | N/A |
| DSGN-04 | Field property config | unit | `cd frontend && vitest run --reporter=verbose` | Wave 0 |
| DSGN-05 | Real-time preview | manual | Manual browser test (visual verification) | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && bun run test`
- **Per wave merge:** `cd frontend && bun run test:coverage`
- **Phase gate:** Full suite green + manual designer walkthrough

### Wave 0 Gaps
- [ ] `frontend/src/components/designer/__tests__/fieldRegistry.test.ts` — covers field type definitions
- [ ] `frontend/src/stores/__tests__/template.test.ts` — covers template store logic
- [ ] Backend has no test framework — backend tests are manual/integration only (consistent with v1.0)

## Sources

### Primary (HIGH confidence)
- Project codebase: `backend/prisma/schema.prisma`, `backend/src/modules/role/role.route.ts`, `frontend/src/pages/RolePage.vue` — established patterns
- npm registry: vue-draggable-plus@0.6.1, signature_pad@5.1.3 — version verified 2026-04-20
- Prisma docs: Working with Json fields — https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields

### Secondary (MEDIUM confidence)
- vue-draggable-plus official guide: https://vue-draggable-plus.pages.dev/en/guide/ — useDraggable API, group/clone options
- signature_pad GitHub: https://github.com/szimek/signature_pad — constructor options, toDataURL, clear, isEmpty
- Elysia issue #1752: https://github.com/elysiajs/elysia/issues/1752 — route group specificity bugs (noted in STATE.md)

### Tertiary (LOW confidence)
- None — all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are locked decisions, versions verified against npm registry
- Architecture: HIGH — patterns directly derived from existing v1.0 codebase (role.route.ts, RolePage.vue, seed.ts)
- Pitfalls: HIGH — based on library documentation + known Elysia issues documented in STATE.md
- Designer UX: MEDIUM — 3-panel layout is highest-risk component, but vue-draggable-plus clone pattern is well-documented

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable libraries, locked decisions)
