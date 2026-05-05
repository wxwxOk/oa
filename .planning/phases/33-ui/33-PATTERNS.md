# Phase 33 — PATTERNS.md (Pattern Map)

> Maps every file Phase 33 plans will create or modify to its closest existing analog with code excerpts. Generated alongside RESEARCH.md and UI-SPEC.md.

---

## Files To Create / Modify

| New file | Role | Closest analog |
|---|---|---|
| `frontend/src/types/channelPush.ts` | shared TS contract | `frontend/src/types/reimbursement.ts` |
| `frontend/src/stores/channelPush.ts` | Pinia store | `frontend/src/stores/reimbursement.ts` |
| `frontend/src/router/routes.ts` | route table edit | self (modified) |
| `frontend/src/layouts/MainLayout.vue` | menu config edit | self (modified) |
| `frontend/src/pages/ChannelPushPage.vue` | list page | `frontend/src/pages/ReimbursementPage.vue` |
| `frontend/src/pages/ChannelPushFormPage.vue` | create/edit page | `frontend/src/pages/ReimbursementFormPage.vue` |
| `frontend/src/pages/ChannelPushDetailPage.vue` | detail page | `frontend/src/pages/ReimbursementDetailPage.vue` |
| `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue` | upload/preview/download/delete | `frontend/src/components/reimbursement/ReimbursementAttachmentPanel.vue` |
| `frontend/src/components/channel-push/ChannelPushStatusChip.vue` | status chip | `frontend/src/components/reimbursement/ReimbursementStatusChip.vue` |
| `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue` | duplicate hint dialog | new (no exact analog; uses `q-dialog` + `q-table` patterns) |

---

## Pattern Excerpts

### `frontend/src/types/channelPush.ts`

**Analog:** `frontend/src/types/reimbursement.ts`

Reuse the dual export pattern: status tuple, status type, allowed MIME constant, list filter keys, factory `createEmpty*Filters`.

```ts
export const REIMBURSEMENT_STATUSES = [...] as const;
export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];
export const REIMBURSEMENT_LIST_FILTER_KEYS = ['status', 'category', 'dateFrom', 'dateTo', 'keyword'] as const;
export const ALLOWED_REIMBURSEMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_REIMBURSEMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_REIMBURSEMENT_ATTACHMENTS = 20;
export function createEmptyReimbursementFilters(): ReimbursementListFilters { ... }
```

For Phase 33 substitute names with `CHANNEL_PUSH_STATUSES`, `CHANNEL_PUSH_LIST_FILTER_KEYS = ['keyword', 'status', 'dateFrom', 'dateTo']`, `ALLOWED_CHANNEL_PUSH_MIME_TYPES`, `MAX_CHANNEL_PUSH_FILE_SIZE`, `MAX_CHANNEL_PUSH_ATTACHMENTS`, and `createEmptyChannelPushFilters()`.

### `frontend/src/stores/channelPush.ts`

**Analog:** `frontend/src/stores/reimbursement.ts`

```ts
export const useReimbursementStore = defineStore('reimbursement', {
  state: () => ({
    rows: [] as ReimbursementRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: createEmptyReimbursementFilters(),
    current: null as ReimbursementDetail | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    uploadLoading: false,
    downloadLoading: false,
    exportLoading: false,
  }),
  actions: {
    async fetchList(filters?: ReimbursementListRequest) { ... },
    async fetchDetail(id: number) { ... },
    async createDraft(payload: ReimbursementWritePayload) { ... },
    async updateDraft(id: number, payload: ReimbursementWritePayload) { ... },
    async submitDraft(id: number) { ... },
    ...
  },
});
```

For Phase 33 store:

- defineStore id: `'channelPush'`
- list endpoint: `/channel-push/mine`
- detail endpoint: `/channel-push/${id}`
- create endpoint: `POST /channel-push` with `multipart/form-data`
- edit endpoint: `PATCH /channel-push/${id}` with JSON body
- cancel endpoint: `POST /channel-push/${id}/cancel`
- attachments: `POST /channel-push/${id}/attachments` (multipart `attachments`), `DELETE /channel-push/${id}/attachments/${aid}`
- multipart create example:

```ts
const formData = new FormData();
formData.append('payload', JSON.stringify(normalizeChannelPushPayload(payload)));
for (const file of files) {
  formData.append('attachments', file);
}
const { data } = await api.post('/channel-push', formData);
```

### `frontend/src/pages/ChannelPushPage.vue`

**Analog:** `frontend/src/pages/ReimbursementPage.vue`

Header / filter bar / desktop q-table / mobile cards / EmptyState pattern:

```vue
<EmptyState
  v-else-if="store.rows.length === 0 && !store.loading"
  icon="receipt_long"
  title="暂无报销申请"
  description="可新建报销申请并上传发票或凭证。"
  :cta-text="auth.hasPerm('reimbursement:create') ? '新建报销申请' : undefined"
  @action="goCreate"
/>

<q-table v-if="isDesktop" :rows="store.rows" :columns="columns" row-key="id" :loading="store.loading" :pagination="pagination" flat bordered dense @request="onRequest">
  <template #body-cell-status="props">
    <q-td :props="props"><ReimbursementStatusChip :status="props.row.status" /></q-td>
  </template>
  ...
</q-table>

<div v-else class="q-gutter-sm">
  <q-card v-for="row in store.rows" :key="row.id" flat bordered class="reimbursement-card">
    ...
  </q-card>
</div>
```

For Phase 33:

- icon: `forward_to_inbox`
- empty title: `暂无推送`
- empty body: `还没有推送过学员，点击「新建推送」开始提交。`
- empty CTA: `auth.hasPerm('channelPush:create') ? '新建推送' : undefined`
- table columns: `studentName / studentPhone / intentStatus / status / submittedAt / attachmentCount / actions`
- card layout: studentName + status chip on top row, phone/intent on second, submitted/attachments on third.
- mobile FAB / round button mirrors `ReimbursementPage.vue` for `auth.hasPerm('channelPush:create')`.

### `frontend/src/pages/ChannelPushFormPage.vue`

**Analog:** `frontend/src/pages/ReimbursementFormPage.vue`

```vue
<q-form ref="formRef" greedy @submit.prevent="saveDraft">
  <q-card-section class="q-gutter-md">
    <div class="section-title">报销信息</div>
    <q-input v-model="form.title" outlined label="报销标题" :rules="[(v) => !!String(v || '').trim() || '请输入报销标题']" />
    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <q-input v-model="form.category" outlined label="报销类别" :rules="[(v) => !!String(v || '').trim() || '请输入报销类别']" />
      </div>
      ...
    </div>
    <q-input v-model="form.amount" outlined type="number" step="0.01" min="0" label="报销金额" :rules="[(v) => Number(v) > 0 || '报销金额必须大于 0']" />
    ...
  </q-card-section>
  <q-card-actions v-if="isDesktop" align="right" class="q-pa-md">
    <q-btn flat label="返回" :disable="isBusy" @click="goBack" />
    <q-btn outline color="primary" label="保存草稿" :loading="saving" :disable="isBusy" @click="saveDraft" />
    <q-btn color="primary" label="提交申请" :loading="submitting" :disable="isBusy" @click="submitApplication" />
  </q-card-actions>
</q-form>
```

```vue
<div v-if="isMobile && !loading && !error" class="mobile-actions">
  <q-btn outline color="primary" label="保存草稿" :loading="saving" :disable="isBusy" @click="saveDraft" />
  <q-btn color="primary" label="提交申请" :loading="submitting" :disable="isBusy" @click="submitApplication" />
</div>
```

For Phase 33:

- field set per UI-SPEC: studentName / studentPhone / studentAge / studentGender / studentEducation / intentStatus / intentNote / remark.
- create label: `提交推送`; edit label: `保存修改`. There is no draft state; submit goes through `POST /channel-push` once.
- after successful create, push response carries `duplicateHints`; show `ChannelPushDuplicateDialog` when array non-empty.
- mobile sticky bar reuses `.mobile-actions` selectors to keep visual parity.

### `frontend/src/pages/ChannelPushDetailPage.vue`

**Analog:** `frontend/src/pages/ReimbursementDetailPage.vue`

```vue
<div class="row items-center q-mb-md q-gutter-sm">
  <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack"><q-tooltip>返回</q-tooltip></q-btn>
  <div class="col min-width-0">
    <div class="text-h6 wrap-text">报销详情</div>
    <div v-if="detail" class="text-caption muted wrap-text">{{ detail.applicationNo }} · {{ detail.title }}</div>
  </div>
  <ReimbursementStatusChip v-if="detail" :status="detail.status" />
  <q-space v-if="isDesktop" />
  <q-btn v-if="isDesktop && canMutateDraft" outline color="primary" icon="edit" label="继续编辑" @click="goEdit" />
  ...
</div>
```

For Phase 33:

- subtitle: `studentName · studentPhone`.
- canMutate condition: `detail.value?.status === 'PENDING'`.
- desktop actions: `编辑` / `撤回` (PENDING only).
- terminal banner appears for APPROVED/REJECTED/CANCELLED states with copy from UI-SPEC.
- audit/timeline section uses `reviewActions` returned by backend; if backend currently returns only the SUBMIT action, render only that row; do not invent fields.

### `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue`

**Analog:** `frontend/src/components/reimbursement/ReimbursementAttachmentPanel.vue`

Critical excerpt:

```vue
<q-file
  v-if="editable === true"
  v-model="selectedFiles"
  outlined
  dense
  multiple
  use-chips
  accept="image/jpeg,image/png,image/webp,application/pdf"
  :max-file-size="10 * 1024 * 1024"
  :disable="!canUpload"
  label="上传图片或 PDF 附件"
  @update:model-value="onFilesSelected"
  @rejected="onRejectedFiles"
>
  <template #hint>
    <span v-if="!applicationId">先保存草稿后上传附件</span>
    <span v-else>支持 JPG、PNG、WebP、PDF，单个文件不超过 10MB。</span>
  </template>
</q-file>
```

For Phase 33:

- prop `applicationId` becomes `pushId`.
- attachment list uses `ChannelPushAttachment` type.
- preview shows only when `mimeType.startsWith('image/')`.
- upload calls `store.addAttachments(pushId, files)`; preview calls `store.previewAttachmentBlob`; download calls `store.downloadAttachment`; delete calls `store.deleteAttachment`.
- gating: `editable === true && pushId && status === 'PENDING' && auth.hasPerm('channelPush:create')`.
- crucially, multipart key must be `attachments`, not `file`.

### `frontend/src/components/channel-push/ChannelPushStatusChip.vue`

**Analog:** `frontend/src/components/reimbursement/ReimbursementStatusChip.vue`

Use the same `q-chip` color/label pattern. Status mapping per UI-SPEC:

- PENDING → label `待审核`, color `warning` (amber), text-color contrast.
- APPROVED → label `已通过`, color `positive`, white text.
- REJECTED → label `已驳回`, color `negative`, white text.
- CANCELLED → label `已撤回`, color `grey-5`, dark or white text.

### `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue`

No exact analog. Build on Quasar `q-dialog + q-card`. Reference patterns from existing reimbursement preview dialog in `ReimbursementAttachmentPanel.vue`:

```vue
<q-dialog v-model="previewDialog">
  <q-card class="preview-card">
    <q-card-section class="row items-center">
      <div class="text-subtitle1 wrap-text">{{ previewName }}</div>
      <q-space />
      <q-btn flat round dense icon="close" aria-label="关闭预览" v-close-popup />
    </q-card-section>
    <q-separator />
    <q-card-section>...</q-card-section>
  </q-card>
</q-dialog>
```

For Phase 33 duplicate dialog:

- v-model bound to component prop / event-driven open state.
- header: `检测到 {N} 条疑似重复推送`.
- body short instruction: `提交已成功，请人工核对是否需要撤回。`
- list: simple `q-list` or compact `q-table` showing `学员姓名 / 手机号 / 状态 / 提交时间`.
- close button label: `我知道了`.
- mobile-friendly: when narrow viewport, render rows as stacked items.

### `frontend/src/router/routes.ts`

**Analog:** existing entries in same file:

```ts
{ path: 'reimbursements', component: () => import('pages/ReimbursementPage.vue'), meta: { title: '我的报销', icon: 'receipt_long', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] } },
{ path: 'reimbursements/new', component: () => import('pages/ReimbursementFormPage.vue'), meta: { title: '新建报销申请', perm: 'reimbursement:create' } },
{ path: 'reimbursements/:id/edit', component: () => import('pages/ReimbursementFormPage.vue'), meta: { title: '编辑报销申请', perm: 'reimbursement:create' } },
{ path: 'reimbursements/:id', component: () => import('pages/ReimbursementDetailPage.vue'), meta: { title: '报销详情', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] } },
```

Append Phase 33 entries in identical form using `channel-push` paths and `channelPush:viewOwn` / `channelPush:create` permissions.

### `frontend/src/layouts/MainLayout.vue`

**Analog:** `MainLayout.allMenus` array and `filterMenus()` function.

```ts
const allMenus: MenuConfig[] = [
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  { path: '/departments', title: '部门', icon: 'account_tree', perm: 'department:list' },
  ...
  { path: '/reimbursements', title: '报销管理', icon: 'receipt_long', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] },
  ...
];
```

Append:

```ts
{ path: '/channel-push', title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] }
```

No changes to `filterMenus()` body. PC/Mobile drawer/footer reuse the same array.

---

## Cross-File Conventions

- All new files use `lang="ts"` script setup.
- Page wrappers reuse style classes `form-wrapper`, `form-card`, `section-title`, `muted`, `wrap-text`, `min-width-0`, `mobile-actions` from existing pages.
- Notify usage: `Notify.create({ type: 'positive' | 'negative', message })`. Errors from API are surfaced by `boot/axios.ts` interceptor unless component-level context is needed.
- Confirmation dialogs use Quasar `Dialog.create({ persistent: true, ok: { color: 'negative' } })` matching the pattern in `ReimbursementAttachmentPanel.vue`.

## File Ownership Lock

To allow parallel plans without write conflicts:

- Plan 33-01 owns `types/channelPush.ts`, `stores/channelPush.ts`, `router/routes.ts`, `layouts/MainLayout.vue`.
- Plan 33-02 owns `pages/ChannelPushPage.vue` and `components/channel-push/ChannelPushStatusChip.vue`.
- Plan 33-03 owns `pages/ChannelPushFormPage.vue`, `components/channel-push/ChannelPushAttachmentPanel.vue`, and `components/channel-push/ChannelPushDuplicateDialog.vue`.
- Plan 33-04 owns `pages/ChannelPushDetailPage.vue` and any small adjustments only inside that page.

## PATTERN MAPPING COMPLETE
