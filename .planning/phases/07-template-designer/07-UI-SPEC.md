---
phase: 7
slug: template-designer
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-20
---

# Phase 7 — UI Design Contract

> 模板管理 + 表单设计器的视觉与交互契约。由 gsd-ui-researcher 生成，gsd-ui-checker 验证。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Quasar project, not shadcn) |
| Preset | not applicable |
| Component library | Quasar 2 (q-table, q-dialog, q-btn, q-input, q-select, q-expansion-item, q-list, q-card) |
| Icon library | @quasar/extras material-icons (configured in quasar.config.cjs) |
| Font stack | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif` |
| Quasar plugins | Notify (top, 2000ms), Dialog, LoadingBar |
| Dark mode | `framework.config.dark: 'auto'` (Quasar native) |
| Responsive breakpoint | `$q.screen.gt.sm` / `$q.screen.lt.md` (1024px boundary) |
| New dependencies | vue-draggable-plus ^0.6.1, signature_pad ^5.1.3 |

Source: 03-UI-SPEC.md (v1.0 established), 07-RESEARCH.md

---

## Spacing Scale

Inherited from 03-UI-SPEC.md. All values are multiples of 4, mapped to Quasar classes:

| Token | Value | Quasar Class | Usage |
|-------|-------|-------------|-------|
| xs | 4px | `q-pa-xs` / `q-gutter-xs` | Icon gaps, inline padding |
| sm | 8px | `q-pa-sm` / `q-gutter-sm` | Field palette item internal padding, property editor field gaps |
| md | 16px | `q-pa-md` / `q-gutter-md` | Designer panel internal padding, page default spacing |
| lg | 24px | `q-pa-lg` / `q-mb-lg` | Panel-to-panel gap, section padding |
| xl | 32px | `q-pa-xl` | Page-level major spacing |
| 2xl | 48px | `style="padding: 48px"` | Empty state area padding |
| 3xl | 64px | `style="padding: 64px"` | Not used this phase |

Exceptions:
- Designer panel dividers: 1px solid `var(--oa-border)` between panels (not a spacing token)
- Signature pad canvas: fixed 400x200px (locked decision, not spacing-governed)
- Drag handle touch target: 32px width (desktop-only, no 44px mobile requirement since designer is PC-only)

Source: 03-UI-SPEC.md spacing scale, 07-CONTEXT.md (PC-only designer)

---

## Typography

Inherited from 03-UI-SPEC.md:

| Role | Size | Weight | Line Height | Usage in Phase 7 |
|------|------|--------|-------------|-------------------|
| H2 (page/dialog title) | 20px | 600 (semibold) | 1.2 | "模板管理" page title, "表单设计" designer title, dialog titles |
| Body (table content) | 16px | 400 (regular) | 1.5 | Template list rows, canvas field labels, property editor values |
| Label (form labels) | 14px | 400 (regular) | 1.5 | Field palette item labels, property editor field labels, table column headers |
| Caption (auxiliary) | 12px | 400 (regular) | 1.5 | Template timestamps, version numbers, field type hints |

Source: 03-UI-SPEC.md typography contract

---

## Color

Inherited from 03-UI-SPEC.md (Slate + Indigo):

| Role | Light Mode | Dark Mode | Usage in Phase 7 |
|------|-----------|-----------|-------------------|
| Dominant 60% | `#F8FAFC` (slate-50) | `#0F172A` (slate-900) | Page background, designer background |
| Secondary 30% | `#FFFFFF` (white) | `#1E293B` (slate-800) | Panel surfaces (palette, canvas, property editor), template list cards |
| Accent 10% | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) | See reserved list below |
| Destructive | `#DC2626` (red-600) | `#EF4444` (red-500) | Delete template button, delete field button |
| Border | `#E2E8F0` (slate-200) | `#334155` (slate-700) | Panel borders, canvas field borders, table borders |
| Text Primary | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) | Titles, field labels on canvas |
| Text Secondary | `#475569` (slate-600) | `#94A3B8` (slate-400) | Placeholder text, descriptions, palette group headers |
| Text Tertiary | `#64748B` (slate-500) | `#64748B` (slate-500) | Timestamps, version numbers |
| Positive | `#16A34A` (green-600) | `#22C55E` (green-500) | "已发布" status badge |
| Warning | `#F59E0B` (amber-500) | `#F59E0B` (amber-500) | "草稿" status badge |

### Accent reserved for (Phase 7 specific):

1. Primary CTA buttons ("创建模板", "保存", "发布")
2. Sidebar nav active item ("模板管理")
3. Canvas selected field highlight border (`2px solid var(--oa-focus-ring)`)
4. Field palette drag ghost border
5. Input focus ring (`outline: 2px solid var(--oa-focus-ring)`)
6. Template list row hover background (`var(--oa-hover)`)

### Status badge colors:

| Status | Color | Text |
|--------|-------|------|
| 草稿 (DRAFT) | `color="warning" text-color="white"` | 草稿 |
| 已发布 (PUBLISHED) | `color="positive" text-color="white"` | 已发布 |
| 已下线 (OFFLINE) | `color="grey-5" text-color="white"` | 已下线 |

Source: 03-UI-SPEC.md color contract, quasar.variables.scss

---

## Designer Layout Contract

3-panel layout, PC-only (locked decision from 07-CONTEXT.md).

### Panel Structure

```
+------------------+---------------------------+------------------+
|  Field Palette   |       Designer Canvas     | Property Editor  |
|  width: 240px    |       flex: 1             |  width: 280px    |
|  fixed           |       min-width: 400px    |  fixed           |
+------------------+---------------------------+------------------+
```

| Panel | Width | Background | Border | Overflow |
|-------|-------|-----------|--------|----------|
| Field Palette (left) | 240px fixed | `var(--oa-surface)` | right: `1px solid var(--oa-border)` | `overflow-y: auto` |
| Designer Canvas (center) | `flex: 1`, min-width 400px | `var(--oa-bg)` | none | `overflow-y: auto` |
| Property Editor (right) | 280px fixed | `var(--oa-surface)` | left: `1px solid var(--oa-border)` | `overflow-y: auto` |

### Designer Page Layout

- Full height: `calc(100vh - toolbar-height)` where toolbar is the top bar with title + save/publish buttons
- Top toolbar: `height: 48px`, contains:
  - Left: back button (icon `arrow_back`, flat) + template name (text-h6, editable inline or static)
  - Right: "保存" button (flat) + "发布" / "下线" button (primary/negative)
- No page padding on designer (panels fill edge-to-edge below toolbar)

### Field Palette

- Two collapsible groups using `q-expansion-item`:
  - "基础字段" (default expanded): 文本, 多行文本, 单选, 多选, 日期, 手机号
  - "特殊字段" (default expanded): 手写签名
- Each field type item: `q-item` with `draggable` attribute
  - Left: `q-icon` (material icon, 20px, `color="var(--oa-text-secondary)"`)
  - Right: field type label (14px, regular)
  - Height: 40px
  - Hover: `background: var(--oa-hover)`
  - Cursor: `grab` (while dragging: `grabbing`)

### Designer Canvas

- Drop zone with visual feedback:
  - Empty state: dashed border `2px dashed var(--oa-border)`, centered text "从左侧拖入字段" (14px, `var(--oa-text-tertiary)`)
  - Drop hover: dashed border changes to `2px dashed var(--oa-focus-ring)`
- Each field on canvas:
  - Container: `q-card flat bordered`, margin-bottom 8px, padding 12px
  - Selected state: border changes to `2px solid var(--oa-focus-ring)`, background `var(--oa-hover)`
  - Unselected state: `1px solid var(--oa-border)`
  - Top row: drag handle icon (`drag_indicator`, 16px, `var(--oa-text-tertiary)`) + field label (14px semibold) + required badge (`q-badge color="negative"` with "*") + delete icon button (right-aligned, `delete` icon, `color="negative"`, flat dense)
  - Body: WYSIWYG preview of the field (renders as it would appear in the fill form)
  - Click to select (populates property editor)
- Drag animation: 150ms (SortableJS default)
- Canvas inner padding: 16px

### Property Editor

- Shows when a field is selected on canvas
- Empty state (no field selected): centered text "点击画布上的字段进行编辑" (14px, `var(--oa-text-tertiary)`)
- Header: field type icon + field type label (14px semibold)
- Form fields (all `q-input outlined dense`):
  - 字段标签 (label): `q-input`, required
  - 必填 (required): `q-toggle`
  - 提示文字 (placeholder): `q-input`
  - 选项列表 (options): only for radio/checkbox — editable list with add/remove buttons
- Field gap: 12px (`q-gutter-sm` + 4px extra via `q-mb-sm`)
- Panel inner padding: 16px

### Signature Field Preview (on canvas)

- Canvas element: 400x200px, white background, `1px solid var(--oa-border)`
- In designer: shows static placeholder text "签名区域" centered (not interactive)
- "清除" button below canvas: `q-btn flat dense size="sm" label="清除"`

Source: 07-CONTEXT.md (3-panel, WYSIWYG, field groups), 07-RESEARCH.md (vue-draggable-plus patterns)

---

## Template List Page Contract

### Layout

Follows v1.0 table page pattern (UserPage/RolePage):

- Top toolbar: `div.row.items-center.q-mb-md`
  - Left: page title "模板管理" (text-h6, 20px semibold)
  - Right: `q-btn color="primary" icon="add" label="创建模板"` (gated by `v-perm="'form:template:create'"`)
- Filter bar: `div.row.items-center.q-gutter-sm.q-mb-md`
  - Status filter: `q-btn-toggle` with options: 全部 / 草稿 / 已发布 / 已下线
  - Sort: by `updatedAt` descending (default, no UI toggle needed)
- Table: `q-table flat bordered dense`

### Table Columns

| Column | Label | Width | Align | Content |
|--------|-------|-------|-------|---------|
| name | 模板名称 | auto | left | Template name text |
| status | 状态 | 80px | center | `q-badge` with status color (see Status badge colors above) |
| schemaVersion | 版本 | 60px | center | "v{N}" format, caption style |
| creator | 创建者 | 100px | left | Creator realName |
| updatedAt | 更新时间 | 160px | left | `YYYY-MM-DD HH:mm` format |
| actions | 操作 | 140px | center | Action buttons |

### Row Actions

| Action | Icon | Color | Permission | Condition |
|--------|------|-------|-----------|-----------|
| 设计 | `edit_note` | default | `form:template:edit` | Always |
| 发布 | `publish` | primary | `form:template:publish` | status === DRAFT or OFFLINE |
| 下线 | `unpublished` | warning | `form:template:publish` | status === PUBLISHED |
| 删除 | `delete` | negative | `form:template:delete` | status === DRAFT only |

All action buttons: `q-btn size="sm" flat dense`

### Mobile View

- Mobile does NOT show designer (locked decision)
- Template list on mobile: `q-card flat bordered` list (same pattern as UserPage mobile)
- Each card shows: name, status badge, version, updatedAt
- No "设计" action on mobile (designer is PC-only)
- "创建模板" button still available (creates template with name/description only)

Source: 07-CONTEXT.md (table layout, status filter, delete policy), 03-UI-SPEC.md (table page pattern)

---

## Copywriting Contract (Chinese)

### 模板列表页面

| Element | Copy | Context |
|---------|------|---------|
| 页面标题 | 模板管理 | text-h6, page top left |
| 主要 CTA | 创建模板 | `color="primary"` button, icon="add" |
| 状态筛选 | 全部 / 草稿 / 已发布 / 已下线 | `q-btn-toggle` |
| 空态标题 | 暂无模板 | EmptyState component, icon="description" |
| 空态正文 | 创建第一个表单模板开始收集信息 | EmptyState description |
| 空态按钮 | 创建模板 | `color="primary"` |
| 创建对话框标题 | 创建模板 | text-h6 |
| 模板名称 label | 模板名称 | `q-input outlined`, required (red asterisk) |
| 模板描述 label | 描述 | `q-input outlined type="textarea"`, optional |
| 保存按钮 | 保存 | `color="primary"` |
| 取消按钮 | 取消 | `flat` |
| 删除确认标题 | 删除模板 | Dialog.create title |
| 删除确认正文 | 将永久删除模板「{name}」。此操作不可恢复。 | Dialog.create message |
| 删除确认按钮 | 确认删除 | `color="negative"` |
| 发布确认标题 | 发布模板 | Dialog.create title |
| 发布确认正文 | 发布后模板可用于生成分享链接。确认发布？ | Dialog.create message |
| 发布确认按钮 | 确认发布 | `color="primary"` |
| 下线确认标题 | 下线模板 | Dialog.create title |
| 下线确认正文 | 下线后已有分享链接将无法填写。确认下线？ | Dialog.create message |
| 下线确认按钮 | 确认下线 | `color="warning"` |
| 网络错误 | 加载失败，请检查网络后重试 | inline hint + "重试" button |
| 保存成功 | 保存成功 | Notify positive |
| 删除成功 | 已删除 | Notify positive |
| 发布成功 | 已发布 | Notify positive |
| 下线成功 | 已下线 | Notify positive |

### 表单设计器页面

| Element | Copy | Context |
|---------|------|---------|
| 返回按钮 | (icon only: arrow_back) | flat, navigates to template list |
| 保存按钮 | 保存 | flat button in toolbar |
| 发布按钮 | 发布 | `color="primary"` in toolbar (when DRAFT/OFFLINE) |
| 下线按钮 | 下线 | `color="negative"` in toolbar (when PUBLISHED) |
| 字段库标题 — 基础字段 | 基础字段 | `q-expansion-item` header |
| 字段库标题 — 特殊字段 | 特殊字段 | `q-expansion-item` header |
| 画布空态 | 从左侧拖入字段 | centered, dashed border zone |
| 属性编辑器空态 | 点击画布上的字段进行编辑 | centered text |
| 字段标签 label | 字段标签 | property editor, required |
| 必填 toggle | 必填 | property editor `q-toggle` |
| 提示文字 label | 提示文字 | property editor |
| 选项列表 label | 选项 | property editor, radio/checkbox only |
| 添加选项按钮 | 添加选项 | `q-btn flat dense size="sm" icon="add"` |
| 签名区域占位 | 签名区域 | canvas signature field placeholder |
| 清除签名按钮 | 清除 | `q-btn flat dense size="sm"` |
| 保存成功 | 保存成功 | Notify positive |
| 版本更新提示 | 模板已更新至 v{N} | Notify info (when published template saved, version bumped) |

### 字段类型标签

| Field Type | Label | Icon (material) |
|------------|-------|-----------------|
| text | 文本 | text_fields |
| textarea | 多行文本 | notes |
| radio | 单选 | radio_button_checked |
| checkbox | 多选 | check_box |
| date | 日期 | calendar_today |
| phone | 手机号 | phone |
| signature | 手写签名 | draw |

### 表单字段 labels

| Field | Label | Required |
|-------|-------|----------|
| 模板名称 | 模板名称 | Yes (red asterisk) |
| 描述 | 描述 | No |

Required field suffix: `<span class="text-negative">*</span>` (consistent with v1.0)

Source: 07-CONTEXT.md (lifecycle states), 03-UI-SPEC.md (copywriting patterns)

---

## State Patterns

### TemplatePage State Matrix

| State | Trigger | Visual |
|-------|---------|--------|
| Loading (initial) | `onMounted` fetch | q-skeleton placeholder (3-5 rows) |
| Loading (filter/page) | Status filter change or pagination | `q-table :loading="true"` built-in progress bar |
| Empty | `rows.length === 0 && !loading` | EmptyState component: icon `description` + "暂无模板" + "创建第一个表单模板开始收集信息" + "创建模板" button |
| Data | `rows.length > 0` | PC: q-table / Mobile: q-card list |
| Error (network) | API request failed | Centered hint "加载失败，请检查网络后重试" + "重试" button |
| Create dialog | Click "创建模板" | q-dialog: name (required) + description (optional) + save/cancel |
| Delete confirm | Click row delete button | Dialog.create: "将永久删除模板「{name}」。此操作不可恢复。" + `color="negative"` confirm |
| Publish confirm | Click row publish button | Dialog.create: "发布后模板可用于生成分享链接。确认发布？" |
| Offline confirm | Click row offline button | Dialog.create: "下线后已有分享链接将无法填写。确认下线？" |
| Save success | API success | Notify positive "保存成功", dialog closes, list refreshes |

### FormDesignerPage State Matrix

| State | Trigger | Visual |
|-------|---------|--------|
| Loading | Route enter, fetch template by ID | q-spinner centered in canvas area |
| Error (not found) | Template ID invalid or no permission | Redirect to /templates with Notify negative |
| Canvas empty | Template loaded, schema is `[]` | Dashed border zone + "从左侧拖入字段" |
| Canvas with fields | Schema has fields | Field cards rendered in order, sortable |
| Field selected | Click a field card on canvas | Card border turns accent, property editor populates |
| Field deselected | Click canvas background or another field | Previous card border reverts, property editor updates |
| Drag in progress | Dragging from palette or reordering | SortableJS ghost element, 150ms animation |
| Property editing | Modify values in property editor | Canvas field updates in real-time (two-way binding via store) |
| Save (draft) | Click "保存" when status is DRAFT | API PUT, Notify positive "保存成功" |
| Save (published) | Click "保存" when status is PUBLISHED | API PUT, version auto-increments, Notify info "模板已更新至 v{N}" |
| Publish | Click "发布" | Dialog confirm -> API PATCH status, button changes to "下线" |
| Offline | Click "下线" | Dialog confirm -> API PATCH status, button changes to "发布" |

Source: 07-CONTEXT.md (lifecycle, save behavior), 03-UI-SPEC.md (state patterns)

---

## Micro-Interactions

Inherited from 03-UI-SPEC.md + Phase 7 additions:

| Interaction | Specification | Notes |
|-------------|--------------|-------|
| Button click | `transform: scale(0.98)` 100ms | Inherited |
| Table row hover | `var(--oa-hover)` transition 150ms | Inherited |
| Focus ring | `outline: 2px solid var(--oa-focus-ring); outline-offset: 2px` | Inherited |
| Dialog open | Quasar default fade + scale | Inherited |
| Canvas field hover | `background: var(--oa-hover)` transition 150ms | New — subtle highlight on hoverable field cards |
| Canvas field select | Border `2px solid var(--oa-focus-ring)` instant | New — no transition, immediate feedback |
| Drag ghost | SortableJS default ghost (opacity 0.5) | New — palette item clone ghost |
| Drag sort animation | 150ms ease (SortableJS `animation: 150`) | New — smooth reorder on canvas |
| Palette item hover | `background: var(--oa-hover)` transition 150ms, cursor `grab` | New |
| Palette item dragging | cursor `grabbing` | New |

Source: 03-UI-SPEC.md micro-interactions, SortableJS defaults

---

## Component Inventory

### Quasar Components Used

| Component | Usage | Props/Config |
|-----------|-------|-------------|
| `q-page` | Template list page container | `padding` |
| `q-table` | PC template list | `flat bordered dense :rows-per-page-options="[10,20,50]"` |
| `q-card` | Mobile template cards, canvas field cards | `flat bordered` |
| `q-dialog` | Create template, confirm dialogs | v-model or Dialog.create |
| `q-input` | Template name/description, property editor fields | `outlined dense` |
| `q-select` | (reserved for future field type extensions) | — |
| `q-toggle` | Required field toggle in property editor | `label="必填"` |
| `q-btn` | All buttons | CTA: `color="primary"` / Delete: `color="negative"` / Secondary: `flat` |
| `q-btn-toggle` | Status filter (全部/草稿/已发布/已下线) | `toggle-color="primary" flat bordered` |
| `q-badge` | Status badges on template rows | See status badge colors |
| `q-expansion-item` | Field palette groups (基础字段/特殊字段) | `default-opened` |
| `q-list` | Field palette container | `bordered` |
| `q-item` | Field palette items | `clickable` with drag attributes |
| `q-icon` | Field type icons, action icons | material-icons |
| `q-space` | Toolbar left-right separator | — |
| `q-spinner` | Designer loading state | `color="primary" size="3em"` |
| `q-skeleton` | Template list loading | 3-5 row placeholders |
| `q-tooltip` | Action button hints | On disabled delete buttons |
| `Notify` (plugin) | Operation feedback | `position: 'top', timeout: 2000` |
| `Dialog` (plugin) | Confirm dialogs | `Dialog.create({ cancel: true })` |

### Custom Components (new in Phase 7)

| Component | Location | Purpose |
|-----------|----------|---------|
| `FieldPalette.vue` | `src/components/designer/` | Left panel: draggable field type list with groups |
| `DesignerCanvas.vue` | `src/components/designer/` | Center panel: drop zone + sortable field cards |
| `PropertyEditor.vue` | `src/components/designer/` | Right panel: selected field config form |
| `TextField.vue` | `src/components/designer/fields/` | Text input WYSIWYG preview |
| `TextareaField.vue` | `src/components/designer/fields/` | Textarea WYSIWYG preview |
| `RadioField.vue` | `src/components/designer/fields/` | Radio group WYSIWYG preview |
| `CheckboxField.vue` | `src/components/designer/fields/` | Checkbox group WYSIWYG preview |
| `DateField.vue` | `src/components/designer/fields/` | Date picker WYSIWYG preview |
| `PhoneField.vue` | `src/components/designer/fields/` | Phone input WYSIWYG preview |
| `SignatureField.vue` | `src/components/designer/fields/` | Signature pad placeholder preview |
| `fieldRegistry.ts` | `src/components/designer/` | Field type definitions + metadata |

### Reused Components (from v1.0)

| Component | Usage in Phase 7 |
|-----------|-----------------|
| `EmptyState.vue` | Template list empty state |
| `FilterSheet.vue` | (reference pattern, may not directly reuse) |

Source: 07-RESEARCH.md (architecture patterns), 03-UI-SPEC.md (component inventory)

---

## Form Validation Contract

### Template Create/Edit Form

```typescript
const templateRules = {
  name: [
    (v: string) => !!v || '请输入模板名称',
    (v: string) => v.length <= 50 || '模板名称不超过 50 个字符',
  ],
}
```

### Property Editor Field Config

```typescript
const fieldLabelRules = [
  (v: string) => !!v || '请输入字段标签',
];
const optionRules = [
  (v: string) => !!v || '选项不能为空',
];
```

Validation trigger: `lazy-rules="ondemand"` + submit-time `formRef.validate()` (consistent with v1.0).

Source: 03-UI-SPEC.md (validation patterns)

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Quasar official | All built-in Quasar components | not required |
| npm: vue-draggable-plus | useDraggable composable | npm registry verified 2026-04-20 — 0.6.1 |
| npm: signature_pad | SignaturePad class | npm registry verified 2026-04-20 — 5.1.3 |
| Third-party | none | not applicable |

Source: 07-RESEARCH.md (version verification)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
