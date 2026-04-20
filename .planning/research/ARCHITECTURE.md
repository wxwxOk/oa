# Architecture Research

**Domain:** Custom form collection system (form builder + public submission + data archival + print/PDF export)
**Researched:** 2026-04-20
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Vue3 + Quasar)                     │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Internal Pages  │  Form Designer   │  Public Fill Page          │
│  (MainLayout)    │  (MainLayout)    │  (No Layout / No Auth)     │
│  ┌────────────┐  │  ┌────────────┐  │  ┌───────────────────┐    │
│  │ Template   │  │  │ Schema     │  │  │ Dynamic Renderer  │    │
│  │ List Page  │  │  │ Editor     │  │  │ + Signature Pad   │    │
│  ├────────────┤  │  ├────────────┤  │  ├───────────────────┤    │
│  │ Data View  │  │  │ Field      │  │  │ Submit Handler    │    │
│  │ Page       │  │  │ Palette    │  │  │ (anonymous POST)  │    │
│  ├────────────┤  │  ├────────────┤  │  └───────────────────┘    │
│  │ Stats Page │  │  │ Preview    │  │                            │
│  └────────────┘  │  └────────────┘  │                            │
├──────────────────┴──────────────────┴───────────────────────────┤
│                     Axios (api instance)                         │
│              /api/v1/* (auth)  |  /api/v1/public/* (no auth)     │
├─────────────────────────────────────────────────────────────────┤
│                  Backend (Bun + Elysia)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ form-template│  │ form-submit  │  │ form-share         │    │
│  │ .route.ts    │  │ .route.ts    │  │ .route.ts          │    │
│  │ (CRUD+RBAC)  │  │ (public POST)│  │ (link gen+stats)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────────┘    │
│         │                 │                  │                   │
│  ┌──────┴─────────────────┴──────────────────┴─────────────┐    │
│  │                    Prisma ORM                            │    │
│  │  FormTemplate | FormSubmission | FormShare               │    │
│  └──────────────────────────┬──────────────────────────────┘    │
├─────────────────────────────┼───────────────────────────────────┤
│                    PostgreSQL 16                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐    │
│  │ form_template│  │ form_submission   │  │ form_share     │    │
│  │ (JSONB       │  │ (JSONB data +    │  │ (nanoid token  │    │
│  │  schema)     │  │  signature b64)   │  │  + sharer ref) │    │
│  └──────────────┘  └──────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Point |
|-----------|----------------|-------------------|
| FormTemplate model | Store form schema (JSONB), metadata, RBAC | New Prisma model, new backend module |
| FormSubmission model | Store filled data (JSONB) + signature base64 | New Prisma model, linked to FormTemplate |
| FormShare model | Track share links (nanoid token), sharer identity, expiry | New Prisma model, linked to FormTemplate + User |
| form-template.route.ts | CRUD for templates, uses authGuard | New module in `backend/src/modules/form-template/` |
| form-submit.route.ts | Public POST endpoint (no auth), data query (auth) | New module, public group outside authGuard |
| form-share.route.ts | Generate/revoke share links, stats | New module, uses authGuard |
| FormDesigner.vue | Visual schema editor with drag-drop fields (vue-draggable-plus) | New page under MainLayout |
| FormDataPage.vue | View/filter collected submissions | New page under MainLayout |
| PublicFormPage.vue | Render form from schema, capture signature, submit | New page, NO MainLayout, NO auth |
| SignaturePad component | Canvas-based handwriting capture (signature_pad) | New component, used in PublicFormPage + preview |

## Recommended Project Structure

### Backend additions

```
backend/src/modules/
├── form-template/
│   └── form-template.route.ts   # CRUD: create/update/delete/list/get template
├── form-submit/
│   └── form-submit.route.ts     # Public: submit form; Auth: list/get submissions
└── form-share/
    └── form-share.route.ts      # Auth: generate link, list shares, stats
```

### Frontend additions

```
frontend/src/
├── pages/
│   ├── form/
│   │   ├── FormTemplatePage.vue     # Template list (CRUD)
│   │   ├── FormDesignerPage.vue     # Schema editor with drag-drop
│   │   ├── FormDataPage.vue         # View submissions
│   │   └── FormStatsPage.vue        # Share/collection statistics
│   └── public/
│       └── PublicFormPage.vue       # External fill page (no auth)
├── components/
│   └── form/
│       ├── FormRenderer.vue         # Dynamic form renderer from JSON schema
│       ├── SignaturePad.vue          # Canvas signature capture wrapper
│       ├── FieldPalette.vue         # Draggable field type list
│       └── SchemaEditor.vue         # Schema editing canvas
└── composables/
    └── useFormSchema.ts             # Schema manipulation helpers
```

## Architectural Patterns

### Pattern 1: JSONB Schema Storage

Store form definitions as JSONB in PostgreSQL. Each template has a `schema` column containing the full field definition array. Submissions store their data as JSONB too, with a `schemaVersion` snapshot.

```typescript
// FormTemplate.schema (JSONB)
interface FormSchema {
  version: number;
  fields: FormField[];
  settings: {
    requireIdentity: boolean;
    identityFields?: ('name' | 'phone')[];
  };
}

interface FormField {
  id: string;          // nanoid, stable across edits
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  options?: string[];  // for radio/checkbox
  placeholder?: string;
  sort: number;
}

// FormSubmission.data (JSONB)
interface SubmissionData {
  schemaVersion: number;
  values: Record<string, any>;       // fieldId -> value
  identity?: {
    name?: string;
    phone?: string;
  };
}
```

### Pattern 2: Public Route Isolation

Separate public (no-auth) endpoints from authenticated endpoints using Elysia's group pattern.

```typescript
// backend/src/index.ts
.group('/api/v1/public', (app) =>
  app.use(publicFormModule)   // no authGuard
)
.group('/api/v1', (app) =>
  app
    .use(authModule)
    .use(userModule)
    // ... existing modules
    .use(formTemplateModule)  // auth required
    .use(formShareModule)     // auth required
    .use(formSubmitModule)    // auth required for query
)
```

### Pattern 3: Signature as Compressed Base64

Capture signature on canvas via signature_pad, export as JPEG (quality 0.5) instead of PNG to reduce size from ~50KB to ~10KB. Store in submission JSONB.

```typescript
// In SignaturePad.vue
function getSignatureData(): string | null {
  if (signaturePad.isEmpty()) return null
  // JPEG at 0.5 quality = ~10KB vs PNG ~50KB
  return signaturePad.toDataURL('image/jpeg', 0.5)
}
```

Limit canvas to 400x200px. At this size + JPEG compression, signatures are 5-15KB — PostgreSQL handles this fine for SME-scale.

### Pattern 4: Browser Print as Primary PDF Strategy

No server-side PDF generation. Use `window.print()` with `@media print` CSS.

```typescript
// In FormDataPage.vue or submission detail
function handlePrint() {
  window.print()
}
```

```css
@media print {
  .q-layout-header, .q-drawer, .no-print { display: none !important; }
  .print-area { width: 100%; padding: 20px; }
  .signature-img { max-width: 300px; page-break-inside: avoid; }
}
```

Rationale: Chinese text renders correctly (browser has CJK fonts), zero dependencies, highest CSS fidelity, users can "Save as PDF" from print dialog.

## New Database Models (Prisma)

```prisma
enum FormTemplateStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model FormTemplate {
  id          Int                  @id @default(autoincrement())
  name        String
  description String?
  schema      Json                 // FormSchema JSONB
  status      FormTemplateStatus   @default(DRAFT)
  createdBy   Int
  creator     User                 @relation("FormTemplateCreator", fields: [createdBy], references: [id])
  submissions FormSubmission[]
  shares      FormShare[]
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  @@index([createdBy])
  @@index([status])
}

model FormShare {
  id         Int           @id @default(autoincrement())
  token      String        @unique   // nanoid(12), URL-safe
  templateId Int
  template   FormTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  sharedBy   Int
  sharer     User          @relation("FormShareSharer", fields: [sharedBy], references: [id])
  expiresAt  DateTime?
  isActive   Boolean       @default(true)
  createdAt  DateTime      @default(now())

  submissions FormSubmission[]

  @@index([token])
  @@index([templateId])
  @@index([sharedBy])
}

model FormSubmission {
  id             Int           @id @default(autoincrement())
  templateId     Int
  template       FormTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  shareId        Int?
  share          FormShare?    @relation(fields: [shareId], references: [id])
  schemaVersion  Int
  data           Json          // SubmissionData JSONB (includes signature base64)
  submitterIp    String?
  createdAt      DateTime      @default(now())

  @@index([templateId])
  @@index([shareId])
  @@index([createdAt])
}
```

**Relation additions to existing User model:**

```prisma
model User {
  // ... existing fields ...
  formTemplates  FormTemplate[]  @relation("FormTemplateCreator")
  formShares     FormShare[]     @relation("FormShareSharer")
}
```

## New Permissions (seed.ts additions)

```typescript
{ code: 'form:list',    name: '表单模板列表', module: 'form' },
{ code: 'form:create',  name: '创建表单模板', module: 'form' },
{ code: 'form:update',  name: '编辑表单模板', module: 'form' },
{ code: 'form:delete',  name: '删除表单模板', module: 'form' },
{ code: 'form:share',   name: '分享表单',     module: 'form' },
{ code: 'form:data',    name: '查看表单数据', module: 'form' },
{ code: 'form:stats',   name: '查看统计数据', module: 'form' },
```

## API Route Design

### Authenticated routes (under /api/v1, with authGuard)

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| GET | /form-templates | form:list | List templates (paginated) |
| POST | /form-templates | form:create | Create template |
| GET | /form-templates/:id | form:list | Get template detail |
| PUT | /form-templates/:id | form:update | Update template/schema |
| DELETE | /form-templates/:id | form:delete | Delete template |
| POST | /form-shares | form:share | Generate share link |
| GET | /form-shares?templateId=X | form:share | List shares for template |
| DELETE | /form-shares/:id | form:share | Revoke share link |
| GET | /form-submissions?templateId=X | form:data | List submissions |
| GET | /form-submissions/:id | form:data | Get submission detail |
| GET | /form-stats | form:stats | Aggregate statistics |

### Public routes (under /api/v1/public, NO authGuard)

| Method | Path | Purpose |
|--------|------|---------|
| GET | /public/forms/:token | Get form schema by share token |
| POST | /public/forms/:token/submit | Submit form data |

## Frontend Route Additions

```typescript
// Internal pages (under MainLayout, require auth)
{ path: '/forms', component: () => import('pages/form/FormTemplatePage.vue'),
  meta: { title: '表单管理', icon: 'description', perm: 'form:list' } },
{ path: '/forms/:id/design', component: () => import('pages/form/FormDesignerPage.vue'),
  meta: { title: '表单设计', perm: 'form:update' } },
{ path: '/forms/:id/data', component: () => import('pages/form/FormDataPage.vue'),
  meta: { title: '表单数据', perm: 'form:data' } },
{ path: '/forms/stats', component: () => import('pages/form/FormStatsPage.vue'),
  meta: { title: '统计', perm: 'form:stats' } },

// Public page (NO MainLayout, NO auth)
{ path: '/f/:token', component: () => import('pages/public/PublicFormPage.vue'),
  meta: { public: true } },
```

## Data Flow

### Flow 1: Create -> Share -> Fill -> Collect

```
[Admin creates template] POST /api/v1/form-templates (auth)
    -> [Template saved, status=DRAFT]
    -> [Edit in designer, publish] PUT /api/v1/form-templates/:id
    -> [Generate share link] POST /api/v1/form-shares (auth)
    -> [Share URL: /f/:token]
    -> [External user opens link] GET /api/v1/public/forms/:token
    -> [Fills form + signs] POST /api/v1/public/forms/:token/submit
    -> [Submission saved]
    -> [Admin views data] GET /api/v1/form-submissions?templateId=X (auth)
```

### Flow 2: Print/PDF Export

```
[Admin opens submission detail]
    -> [Clicks "Print"] -> window.print() -> browser print dialog
    -> [User selects "Save as PDF" in dialog] -> PDF file saved
```

No server-side PDF generation. Zero backend involvement.

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Do This Instead |
|--------------|---------|-----------------|
| EAV pattern (FormField + FieldValue tables) | Massive join complexity, terrible performance | JSONB schema storage |
| Global authGuard with "optional" bypass | Misconfiguration risk | Separate Elysia groups |
| S3/file storage for signatures from day one | Premature complexity for 5-15KB images | Base64 in JSONB, migrate later if needed |
| Full grid-based form designer | Massive frontend complexity | Simple ordered field list with drag reorder |
| Server-side PDF with Chromium | +400MB Docker image, Bun compat issues | Browser print + @media print CSS |

## Build Order (Dependency-Aware)

1. Database models + migrations
2. Backend CRUD for templates
3. Frontend FormRenderer (core reusable component)
4. Frontend FormDesigner (uses FormRenderer for preview)
5. Share link generation (backend + frontend)
6. Public fill page (depends on FormRenderer + share links)
7. Submission data view (depends on submissions existing)
8. Signature pad (add to FormRenderer)
9. Print/PDF export (@media print CSS)
10. Statistics (depends on shares + submissions data)

## Sources

- [Prisma Json fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields)
- [vue-draggable-plus](https://github.com/alfred-skyblue/vue-draggable-plus) — Active, Jan 2026
- [signature_pad](https://github.com/szimek/signature_pad) — v5.1.3, Dec 2025
- [nanoid](https://github.com/ai/nanoid) — 118 bytes, crypto-secure
