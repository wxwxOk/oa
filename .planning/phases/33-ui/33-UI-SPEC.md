---
phase: 33
slug: ui
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-05
---

# Phase 33 — UI Design Contract

> Visual and interaction contract for Phase 33: 渠道商提交体验 + 我的推送 UI.
> Generated during `/gsd-ui-phase 33 --auto`; verified against CONTEXT.md and RESEARCH.md.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Quasar 2 / Vue 3 |
| Icon library | Material Icons via Quasar |
| Font | Project default Quasar font stack |
| Layout | Existing `MainLayout.vue`; no partner-specific layout |
| Styling source | Existing OA SCSS tokens and page-local scoped classes |

**Non-negotiable:** this phase must look like the existing OA app, especially v1.4 reimbursement pages. Do not introduce a new visual system, third-party UI kit, external icon set, or global CSS reset.

---

## Page Inventory

| Surface | Route | Primary components | Permission contract |
|---------|-------|--------------------|---------------------|
| My pushes list | `/channel-push` | `ChannelPushPage.vue`, `ChannelPushStatusChip.vue`, `EmptyState`, `FilterSheet` | `permAny: ['channelPush:viewOwn', 'channelPush:create']` |
| Create push | `/channel-push/new` | `ChannelPushFormPage.vue`, `ChannelPushAttachmentPanel.vue`, `ChannelPushDuplicateDialog.vue` | `perm: 'channelPush:create'` |
| Edit push | `/channel-push/:id/edit` | `ChannelPushFormPage.vue`, `ChannelPushAttachmentPanel.vue`, `ChannelPushDuplicateDialog.vue` | `perm: 'channelPush:create'` |
| Push detail | `/channel-push/:id` | `ChannelPushDetailPage.vue`, `ChannelPushStatusChip.vue`, `ChannelPushAttachmentPanel.vue` | `perm: 'channelPush:viewOwn'` |

Menu contract:

```ts
{ path: '/channel-push', title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] }
```

---

## Layout Contract

### Global Layout

- Use existing `MainLayout.vue` for desktop drawer, mobile drawer, mobile footer tabs, dark-mode toggle, and account controls.
- Add exactly one partner-facing menu item: 「我的推送」.
- Do not add role-specific branches such as `role === 'CHANNEL_PARTNER'`.
- Employee menus remain hidden through existing `filterMenus()` and route `meta.perm` checks.

### List Page (`ChannelPushPage.vue`)

Desktop:

- Header row:
  - title: 「我的推送」
  - subtitle: 「提交学员信息并跟踪处理状态」
  - refresh icon button
  - primary CTA: 「新建推送」
- Filter bar in one horizontal row when space allows:
  - keyword input label: 「关键词」, placeholder implied by helper: 「姓名或手机号」
  - status select label: 「状态」
  - start date input label: 「开始日期」 with `q-date`
  - end date input label: 「结束日期」 with `q-date`
  - buttons: 「查询」, 「重置筛选」
- Table columns:
  - 学员姓名
  - 手机号
  - 意向
  - 状态
  - 提交时间
  - 附件
  - 操作
- Row primary action: clicking row or 「查看」 opens `/channel-push/:id`.

Mobile:

- Header title + subtitle, icon filter button, refresh button.
- New action uses round primary button or FAB matching `ReimbursementPage.vue` behavior.
- Cards show:
  - first line: studentName + `ChannelPushStatusChip`
  - second line: phone and intentStatus
  - third line: submittedAt and attachment count
  - actions: 查看; if PENDING also 编辑 / 撤回 as compact buttons.
- Filters open through existing `FilterSheet`.

### Form Page (`ChannelPushFormPage.vue`)

- Create and edit share one page.
- Wrapper width follows `ReimbursementFormPage.vue` (`form-wrapper`, `form-card`) and should not exceed comfortable reading width.
- Top row:
  - back icon button (`aria-label="返回"`)
  - title: create 「新建学员推送」 / edit 「编辑学员推送」
  - subtitle: 「提交后由内部主接收人审核，待审核状态可编辑或撤回」
  - status chip when editing existing record.
- Field order:
  1. 学员姓名 (required)
  2. 手机号 (required)
  3. 年龄
  4. 性别
  5. 学历
  6. 意向状态
  7. 意向说明
  8. 备注
  9. 附件
- Desktop grid:
  - studentName / studentPhone: two half-width columns
  - age / gender / education / intentStatus: compact two-column groups
  - intentNote / remark: full-width textarea
  - attachments: full-width card below form fields
- Mobile layout:
  - all fields full-width
  - submit actions in sticky bottom action bar: 「保存」 / 「提交推送」
- Create action label: 「提交推送」.
- Edit action label: 「保存修改」.
- Required field messages:
  - 「请输入学员姓名」
  - 「请输入手机号」
  - phone invalid: 「请输入有效手机号」
- Backend phone contract currently validates mainland mobile after normalizing `+86/86`, spaces, hyphens, parentheses. UI may accept loose input, but must surface invalid mobile clearly before or after backend rejection.

### Detail Page (`ChannelPushDetailPage.vue`)

- Top row:
  - back icon button
  - title: 「推送详情」
  - subtitle: `studentName · studentPhone`
  - `ChannelPushStatusChip`
  - desktop actions: PENDING only 「编辑」 and 「撤回」
- Mobile actions appear as a compact action group below the title when PENDING.
- Main cards:
  1. 「学员信息」 — name, phone, age, gender, education
  2. 「意向信息」 — intentStatus, intentNote, remark
  3. 「附件」 — preview/download list via `ChannelPushAttachmentPanel`
  4. 「处理状态」 — status, submittedAt, reviewedAt/completedAt if returned, rejection reason if available
  5. 「审核轨迹」 — review actions list if backend returns `reviewActions`; show empty text if no actions yet.
- Terminal state banner:
  - APPROVED: 「该推送已通过，不能再编辑或撤回。」
  - REJECTED: 「该推送已驳回，不能再编辑或撤回。如需重新提交，请新建推送。」
  - CANCELLED: 「该推送已撤回，不会进入审核。」
- PENDING state actions:
  - 编辑 → `/channel-push/:id/edit`
  - 撤回 → confirmation dialog then `POST /channel-push/:id/cancel`

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon/text gap, chip spacing |
| sm | 8px | button groups, card inner line spacing |
| md | 16px | default `q-pa-md`, section gaps, form field gaps |
| lg | 24px | page section separation, detail card grid gap |
| xl | 32px | desktop form wrapper breathing room |
| 2xl | 48px | only for empty/error states |
| 3xl | 64px | not used in this phase |

Exceptions: none.

Implementation notes:

- Use Quasar spacing classes first: `q-gutter-sm`, `q-gutter-md`, `q-mb-md`, `q-pa-md`.
- Local scoped CSS may define wrappers, but hard-coded spacing must remain multiples of 4.
- Mobile sticky action bar must leave bottom padding so it does not cover form content.

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.5 | field helper text, card metadata |
| Label | 12px | 400/500 | 1.4 | captions, secondary metadata |
| Heading | Quasar `text-h6` | 500/600 | default | page titles |
| Section | 14px | 600 | 1.4 | card section titles (`section-title`) |
| Display | not used | — | — | no marketing/display type in this app surface |

Rules:

- Use existing classes: `text-h6`, `text-body2`, `text-caption`, `section-title`, `muted`, `wrap-text`, `min-width-0`.
- Do not introduce large hero typography or decorative type.
- Long student names, intent notes, and file names must wrap, not overflow.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | existing `var(--oa-background)` / Quasar page background | page background |
| Secondary (30%) | existing `var(--oa-surface)` / bordered cards | cards, filters, panels |
| Accent (10%) | Quasar `primary` | primary CTA, active nav, links, icon buttons |
| Destructive | Quasar `negative` | cancel/delete/rejected states only |
| Success | Quasar `positive` | approved status only |
| Warning | Quasar `warning` / amber | pending status and duplicate warning |
| Neutral | `grey-5` / existing muted text variables | cancelled, disabled, metadata |

Status chip mapping:

| Status | Label | Color | Text |
|--------|-------|-------|------|
| PENDING | 待审核 | warning / amber | dark text if required by contrast |
| APPROVED | 已通过 | positive | white |
| REJECTED | 已驳回 | negative | white |
| CANCELLED | 已撤回 | grey-5 | white or grey-9 depending contrast |

Accent reserved for:

- New/create/submit actions
- View/download/preview actions
- Active menu/tab state
- Links to detail pages

Do not use primary color for destructive or warning-only states.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Menu item | 我的推送 |
| List title | 我的推送 |
| List subtitle | 提交学员信息并跟踪处理状态 |
| Primary CTA | 新建推送 |
| Create page title | 新建学员推送 |
| Edit page title | 编辑学员推送 |
| Create submit button | 提交推送 |
| Edit submit button | 保存修改 |
| Detail title | 推送详情 |
| Empty state heading | 暂无推送 |
| Empty state body | 还没有推送过学员，点击「新建推送」开始提交。 |
| Loading failure | 推送数据加载失败，请返回列表或重试。 |
| Duplicate dialog title | 检测到 {N} 条疑似重复推送 |
| Duplicate dialog body | 提交已成功，请人工核对是否需要撤回。 |
| Duplicate dialog close | 我知道了 |
| Cancel confirmation title | 确认撤回推送 |
| Cancel confirmation body | 撤回后此推送不会进入审核，确定撤回？ |
| Cancel confirmation ok | 撤回 |
| Cancel confirmation cancel | 取消 |
| Terminal approved banner | 该推送已通过，不能再编辑或撤回。 |
| Terminal rejected banner | 该推送已驳回，不能再编辑或撤回。如需重新提交，请新建推送。 |
| Terminal cancelled banner | 该推送已撤回，不会进入审核。 |
| Attachment empty | 暂无附件 |
| Attachment hint | 支持 JPG、PNG、WebP、PDF，单个文件不超过 10MB。 |
| Attachment limit | 附件数量已达上限。 |

Tone:

- Direct, operational, not playful.
- Avoid technical words like `duplicateHints`, `PENDING`, `RBAC` in UI copy.
- Use Chinese status labels in all visible UI.

---

## Interaction Contracts

### Duplicate Hint Dialog

- Trigger after create or edit response if `duplicateHints.length > 0`.
- Submission is already successful; dialog must not roll back or block navigation.
- Dialog content:
  - title with count
  - short body explaining manual decision
  - conflict table/list with: 学员姓名、手机号、状态、提交时间
  - single close button: 「我知道了」
- Mobile dialog should render conflicts as stacked list rows rather than a dense table if width is limited.

### Attachment Panel

- Use `q-file` with `multiple`, `use-chips`, accept `image/jpeg,image/png,image/webp,application/pdf`, max file size 10 MB.
- Show count `attachments.length/20`.
- For images, show 「预览」 and 「下载」.
- For PDFs, show 「下载」 only.
- Delete/upload visible only when `editable === true` and push is PENDING.
- Every icon-only button must have `aria-label`; text buttons are preferred on desktop.
- Revoke object URLs after preview closes or component unmounts.

### PENDING-only Mutations

- Only PENDING detail/form states show:
  - 编辑
  - 撤回
  - 上传附件
  - 删除附件
- Terminal states render explanatory banner and no mutation buttons.
- If backend rejects with `CHANNEL_PUSH_NOT_PENDING`, rely on global error notification and refresh detail.

### Filters

- Query runs on button click and Enter in keyword input.
- Reset clears keyword/status/dateFrom/dateTo and reloads page 1.
- Date fields use `q-date` with `YYYY-MM-DD` mask.
- Status select options: 全部 / 待审核 / 已通过 / 已驳回 / 已撤回.

---

## Accessibility and Responsive Rules

- Mobile interactive targets must be at least 44px high/wide for primary icon buttons and FABs.
- Back, refresh, filter, preview, download, edit, cancel/delete icon buttons need `aria-label` or visible label.
- Use `q-tooltip` for desktop icon-only actions.
- Empty, loading, and error states must be explicit on every page.
- Cards must not rely on color only; status labels must include text.
- Long names, phone numbers, intent notes, remarks, and filenames must use wrapping classes.
- Dialogs that confirm destructive operations must be persistent and have explicit cancel action.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | blocked |

No external UI registry or generated component block may be introduced in this phase.

---

## Verification Contract

Automated checks:

- `frontend/src/router/routes.ts` contains all `/channel-push` routes with `channelPush:*` permissions.
- `frontend/src/layouts/MainLayout.vue` contains the menu label `我的推送`, icon `forward_to_inbox`, and `channelPush:viewOwn`.
- `frontend/src/stores/channelPush.ts` uses:
  - `api.get('/channel-push/mine'`
  - `api.post('/channel-push'`
  - `api.patch(`/channel-push/${id}``
  - `api.post(`/channel-push/${id}/cancel``
  - `formData.append('payload', JSON.stringify(`
  - `formData.append('attachments', file)`
- `ChannelPushAttachmentPanel.vue` accepts `image/jpeg,image/png,image/webp,application/pdf` and shows `attachments.length/20`.
- Mutation UI references `status === 'PENDING'` or equivalent helper before edit/cancel/upload/delete.
- Frontend build passes.

Manual browser checks:

1. Partner login only shows 「我的推送」 in menu/footer.
2. Direct employee routes (`/users`, `/visits`, `/reimbursements`, `/templates`, `/submissions`) go to `/403` for partner.
3. Create push with required fields only.
4. Create/edit duplicate pair and see conflict rows without blocked submission.
5. Upload image and PDF; preview image; download both where allowed.
6. List filters keyword/status/date range work on desktop and mobile.
7. Detail page shows status, audit/rejection fields if present, and terminal banners.
8. PENDING push can edit/cancel; terminal push cannot.
9. Mobile viewport list/form/detail remain usable, with sticky actions not covering fields.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-05
