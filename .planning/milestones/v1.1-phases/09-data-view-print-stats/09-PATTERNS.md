# Phase 9: 数据查看 + 打印 + 统计 - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 11 (new/modified)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/modules/submission/submission.route.ts` | controller | CRUD (list+detail) | `backend/src/modules/template/template.route.ts` | exact |
| `backend/src/modules/dashboard/dashboard.route.ts` (扩展 form-stats) | controller | request-response (aggregation) | `backend/src/modules/dashboard/dashboard.route.ts` | exact |
| `backend/prisma/seed.ts` (追加权限码) | config | batch | `backend/prisma/seed.ts` | exact |
| `frontend/src/stores/submission.ts` | store | CRUD | `frontend/src/stores/template.ts` | exact |
| `frontend/src/pages/SubmissionPage.vue` | page/component | CRUD (list+drawer) | `frontend/src/pages/UserPage.vue` | exact |
| `frontend/src/components/submission/SubmissionDetail.vue` | component | request-response (display) | `frontend/src/components/public-fill/FormFieldRenderer.vue` | role-match |
| `frontend/src/components/submission/FormStatsPanel.vue` | component | request-response (chart) | `frontend/src/pages/DashboardPage.vue` | role-match |
| `frontend/src/composables/usePdfExport.ts` | utility | transform (DOM→PDF) | `frontend/src/composables/useResponsive.ts` | partial (structure only) |
| `frontend/src/assets/print.css` | config | — | — | no analog (new pattern) |
| `frontend/src/router/routes.ts` (追加路由) | config | — | `frontend/src/router/routes.ts` | exact |
| `frontend/src/pages/TemplatePage.vue` (追加"查看数据"按钮) | page/component | — | self | exact |

## Pattern Assignments

### `backend/src/modules/submission/submission.route.ts` (controller, CRUD)

**Analog:** `backend/src/modules/template/template.route.ts`

**Imports pattern** (lines 1-5):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';
```

**Auth pattern** (line 8):
```typescript
// 模块级权限守卫 — 整个模块统一鉴权
export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
```

**Core list pattern** (lines 9-25):
```typescript
.get('/', async ({ query }: any) => {
  const page = Number(query.page) || 1;
  const size = Number(query.size) || 10;
  const where: any = {};
  if (query.status) where.status = query.status;
  const [rows, total] = await Promise.all([
    prisma.formTemplate.findMany({
      where,
      include: { creator: { select: { id: true, realName: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.formTemplate.count({ where }),
  ]);
  return { rows, total, page, size };
})
```

**Core detail pattern** (lines 26-33):
```typescript
.get('/:id', async ({ params }: any) => {
  const tpl = await prisma.formTemplate.findUnique({
    where: { id: Number(params.id) },
    include: { creator: { select: { id: true, realName: true } } },
  });
  if (!tpl) throw notFound('模板不存在');
  return tpl;
})
```

**Module registration pattern** (`backend/src/index.ts` lines 57-68):
```typescript
.group('/api', (app) =>
  app
    .group('/v1', (app) =>
      app
        .use(authModule)
        .use(userModule)
        // ... 新模块在此 .use(submissionModule)
        .use(formTemplateModule),
    )
)
```

---

### `backend/src/modules/dashboard/dashboard.route.ts` (扩展 form-stats)

**Analog:** self — `backend/src/modules/dashboard/dashboard.route.ts`

**Complete current file** (lines 1-14):
```typescript
import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard())
  .get('/stats', async () => {
    const [userCount, departmentCount, roleCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.role.count(),
    ]);
    return { userCount, departmentCount, roleCount };
  });
```

**Note:** 统计 API 可以作为独立模块 `form-stats` 或扩展 dashboard 模块。推荐独立模块，因为需要独立权限码 `form:stats:view`。参考 template.route.ts 的 `.guard({})` 模式为不同端点设置不同权限。

---

### `backend/prisma/seed.ts` (追加权限码)

**Analog:** `backend/prisma/seed.ts`

**Permission definition pattern** (lines 8-33):
```typescript
const PERMISSIONS = [
  // ... 现有权限 ...
  // 表单模板模块
  { code: 'form:template:list', name: '模板列表', module: 'form' },
  { code: 'form:template:create', name: '创建模板', module: 'form' },
  // ... 追加:
  { code: 'form:submission:list', name: '查看提交数据', module: 'form' },
  { code: 'form:stats:view', name: '查看表单统计', module: 'form' },
];
```

---

### `frontend/src/stores/submission.ts` (store, CRUD)

**Analog:** `frontend/src/stores/template.ts`

**Imports pattern** (lines 1-2):
```typescript
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
```

**Interface + store definition pattern** (lines 4-26, 28-88):
```typescript
export interface Template {
  id: number;
  name: string;
  // ... typed fields
}

export const useTemplateStore = defineStore('template', {
  state: () => ({
    rows: [] as Template[],
    total: 0,
    loading: false,
    page: 1,
    size: 10,
    // feature-specific filters
    statusFilter: '' as string,
  }),
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        const params: Record<string, unknown> = { page: this.page, size: this.size };
        if (this.statusFilter) params.status = this.statusFilter;
        const { data } = await api.get('/templates', { params });
        this.rows = data.rows;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
    async fetchOne(id: number) {
      const { data } = await api.get(`/templates/${id}`);
      this.current = data;
      return data;
    },
  },
});
```

---

### `frontend/src/pages/SubmissionPage.vue` (page, CRUD list+drawer)

**Analog:** `frontend/src/pages/UserPage.vue`

**Imports pattern** (lines 179-188):
```typescript
import { ref, reactive, computed, onMounted } from 'vue';
import type { QForm } from 'quasar';
import { api } from 'src/boot/axios';
import { Dialog, Notify, useQuasar, copyToClipboard } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { useResponsive } from 'src/composables/useResponsive';
import EmptyState from 'src/components/EmptyState.vue';
```

**Filter bar pattern (PC)** (lines 4-37):
```html
<template v-if="isDesktop">
  <div class="row items-center q-mb-md q-gutter-sm">
    <div class="text-h6">用户管理</div>
    <q-space />
    <q-input v-model="keyword" outlined dense placeholder="搜索用户名/姓名"
             @keyup.enter="load(1)" clearable style="width: 200px">
      <template #append>
        <q-icon name="search" class="cursor-pointer" @click="load(1)" />
      </template>
    </q-input>
    <q-select v-model="deptFilter" :options="deptFilterOptions" label="选择部门"
              outlined dense emit-value map-options clearable style="width: 160px"
              @update:model-value="load(1)" />
  </div>
</template>
```

**QTable + server-side pagination pattern** (lines 77-107):
```html
<q-table
  v-if="isDesktop"
  :rows="rows"
  :columns="columns"
  row-key="id"
  :loading="loading"
  :pagination="pagination"
  @request="onReq"
  flat bordered
>
  <template #body-cell-actions="props">
    <q-td :props="props">
      <q-btn size="sm" flat dense icon="visibility" @click="openDetail(props.row)" />
      <q-btn size="sm" flat dense icon="print" @click="handlePrint(props.row)" />
    </q-td>
  </template>
</q-table>
```

**Pagination + load pattern** (lines 226-256):
```typescript
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

async function load(page = pagination.value.page) {
  loading.value = true;
  try {
    const { data } = await api.get('/users', {
      params: {
        page,
        pageSize: pagination.value.rowsPerPage,
        keyword: keyword.value || undefined,
      },
    });
    rows.value = data.items;
    pagination.value.rowsNumber = data.total;
    pagination.value.page = data.page;
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
    firstLoading.value = false;
  }
}

function onReq(props: any) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  load(props.pagination.page);
}
```

**Loading skeleton pattern** (lines 49-63):
```html
<div v-if="firstLoading" class="q-pa-md">
  <template v-if="isDesktop">
    <q-skeleton type="rect" height="40px" class="q-mb-sm" />
    <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
  </template>
  <template v-else>
    <q-card v-for="i in 3" :key="i" flat bordered class="q-mb-sm" style="border-radius: 8px">
      <q-card-section>
        <q-skeleton type="text" width="60%" />
        <q-skeleton type="text" width="40%" class="q-mt-xs" />
      </q-card-section>
    </q-card>
  </template>
</div>
```

**Empty state pattern** (line 72-74):
```html
<EmptyState v-else-if="rows.length === 0 && !loading" icon="people" title="暂无用户"
            description="创建第一个用户以开始管理"
            :cta-text="canCreateUser ? '新建用户' : undefined" @action="openEdit(null)" />
```

**Mobile card list pattern** (lines 110-132):
```html
<div v-else class="q-gutter-sm">
  <q-card v-for="u in rows" :key="u.id" flat bordered>
    <q-card-section>
      <div class="row items-center">
        <div class="text-subtitle1">{{ u.realName }}</div>
        <q-space />
        <!-- status badge -->
      </div>
      <div class="text-caption q-mt-xs">...</div>
    </q-card-section>
    <q-card-actions align="right">
      <!-- action buttons -->
    </q-card-actions>
  </q-card>
</div>
```

---

### `frontend/src/components/submission/SubmissionDetail.vue` (component, display)

**Analog:** `frontend/src/components/public-fill/FormFieldRenderer.vue`

**Component structure pattern** (lines 100-149):
```typescript
<script setup lang="ts">
import { ref } from 'vue';
import type { FormField } from 'src/stores/template';

defineProps<{
  field: FormField;
  modelValue: any;
}>();

defineEmits<{
  'update:modelValue': [value: any];
}>();
```

**Note:** SubmissionDetail 是只读展示组件，不需要 v-model。复用 FormField 类型定义来渲染字段标签。签名字段渲染为 `<img :src="data" />` 即可，无需 SignatureField 组件。

---

### `frontend/src/components/submission/FormStatsPanel.vue` (component, chart)

**Analog:** `frontend/src/pages/DashboardPage.vue`

**Stats card layout pattern** (lines 12-33):
```html
<div :class="isDesktop ? 'row q-gutter-md q-mb-lg' : 'q-gutter-sm q-mb-lg'">
  <q-card v-for="item in statCards" :key="item.label"
          :class="isDesktop ? 'col stat-card' : 'stat-card'" flat bordered
          style="border-radius: 8px; min-height: 120px">
    <q-card-section>
      <div class="row items-center q-gutter-md">
        <div style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--oa-stat-icon-bg)">
          <q-icon :name="item.icon" size="24px" color="primary" />
        </div>
        <div>
          <div style="font-size: 14px; color: var(--oa-text-secondary)">{{ item.label }}</div>
          <div v-if="statsLoading">
            <q-skeleton type="text" width="60px" height="32px" />
          </div>
          <div v-else style="font-size: 32px; font-weight: 600; line-height: 1; color: var(--oa-text-primary)">
            {{ item.value }}
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</div>
```

**API call + loading pattern** (lines 82-92):
```typescript
onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/stats');
    stats.value = data;
  } catch {
    statsError.value = true;
    Notify.create({ type: 'warning', message: '统计数据加载失败' });
  } finally {
    statsLoading.value = false;
  }
});
```

---

### `frontend/src/composables/usePdfExport.ts` (utility, transform)

**Analog:** `frontend/src/composables/useResponsive.ts` (structure only)

**Composable structure pattern** (lines 1-10):
```typescript
import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useResponsive() {
  const $q = useQuasar();
  const isDesktop = computed(() => $q.screen.gt.sm);
  const isMobile = computed(() => !$q.screen.gt.sm);
  return { isDesktop, isMobile };
}
```

**Note:** usePdfExport 不需要 Vue reactivity，可以是纯函数导出。参考 RESEARCH.md Pattern 4 的 `exportToPdf()` 实现。

---

### `frontend/src/router/routes.ts` (追加路由)

**Analog:** self

**Route definition pattern** (lines 23-29):
```typescript
children: [
  { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { title: '首页', icon: 'dashboard' } },
  // ... 现有路由
  { path: 'templates', component: () => import('pages/TemplatePage.vue'), meta: { title: '模板管理', icon: 'description', perm: 'form:template:list' } },
  { path: 'templates/:id/design', component: () => import('pages/FormDesignerPage.vue'), meta: { title: '表单设计', perm: 'form:template:edit' } },
  // 追加:
  { path: 'templates/:id/submissions', component: () => import('pages/SubmissionPage.vue'), meta: { title: '提交数据', perm: 'form:submission:list' } },
],
```

---

### `frontend/src/pages/TemplatePage.vue` (追加"查看数据"按钮)

**Analog:** self — 现有操作按钮模式

**Action button pattern** (lines 96-128):
```html
<template #body-cell-actions="props">
  <q-td :props="props">
    <q-btn v-perm="'form:template:edit'" size="sm" flat dense icon="edit_note"
           @click="$router.push(`/templates/${props.row.id}/design`)" />
    <q-btn v-if="props.row.status === 'PUBLISHED'" v-perm="'form:template:share'"
           size="sm" flat dense icon="share" color="primary"
           @click="openShare(props.row)" />
    <!-- 追加: 查看数据按钮 -->
    <!-- <q-btn v-perm="'form:submission:list'" size="sm" flat dense icon="visibility"
              @click="$router.push(`/templates/${props.row.id}/submissions`)" /> -->
  </q-td>
</template>
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `backend/src/middlewares/auth.ts` (lines 6-53)
**Apply to:** `submission.route.ts`, form-stats API
```typescript
// 模块级鉴权：整个模块统一权限码
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      // ... JWT 验证 + 权限检查
      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }
      return { currentUser: { id, username, realName, roleCodes, permissions } };
    });
```

### Error Handling
**Source:** `backend/src/utils/errors.ts` (lines 1-14)
**Apply to:** All backend route files
```typescript
export class BizError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BIZ_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');
```

### Frontend Permission Directive
**Source:** `frontend/src/pages/TemplatePage.vue` (line 7, 99, etc.)
**Apply to:** SubmissionPage.vue, TemplatePage.vue (新按钮), DashboardPage.vue (统计区域)
```html
<!-- v-perm 指令控制按钮可见性 -->
<q-btn v-perm="'form:submission:list'" ... />
```

### Responsive Layout
**Source:** `frontend/src/composables/useResponsive.ts`
**Apply to:** SubmissionPage.vue, FormStatsPanel.vue
```typescript
import { useResponsive } from 'src/composables/useResponsive';
const { isDesktop, isMobile } = useResponsive();
```

### API Instance
**Source:** `frontend/src/boot/axios.ts` (line 74)
**Apply to:** All frontend stores and components making API calls
```typescript
import { api } from 'src/boot/axios';
```

### Notification Pattern
**Source:** `frontend/src/pages/UserPage.vue` (line 183, 348, etc.)
**Apply to:** All frontend pages with user actions
```typescript
import { Notify } from 'quasar';
Notify.create({ type: 'positive', message: '操作成功' });
Notify.create({ type: 'negative', message: '操作失败' });
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/assets/print.css` | config | — | 项目中无 @media print CSS 先例，需全新编写。参考 RESEARCH.md Pattern 3 |
| `frontend/src/composables/usePdfExport.ts` | utility | transform | 项目中无 DOM→PDF 转换先例，需全新编写。参考 RESEARCH.md Pattern 4 |
| `frontend/src/components/submission/FormStatsPanel.vue` (chart 部分) | component | request-response | 项目中无图表渲染先例，需全新编写。参考 RESEARCH.md Pattern 5 (vue-chartjs) |

## Metadata

**Analog search scope:** `backend/src/modules/`, `frontend/src/pages/`, `frontend/src/stores/`, `frontend/src/components/`, `frontend/src/composables/`, `frontend/src/router/`, `backend/prisma/`
**Files scanned:** 30+
**Pattern extraction date:** 2026-04-20
