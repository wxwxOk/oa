# Phase 8: 分享链接 + 公开填写 - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 9 (新建/修改)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/prisma/schema.prisma` | model | CRUD | `backend/prisma/schema.prisma` (FormTemplate) | exact |
| `backend/src/modules/template/template.route.ts` | controller | request-response | 自身（现有端点扩展） | exact |
| `backend/src/modules/public/public.route.ts` | controller | request-response | `backend/src/modules/template/template.route.ts` | role-match |
| `backend/src/index.ts` | config | request-response | 自身（注册新模块） | exact |
| `frontend/src/router/routes.ts` | route | request-response | 自身（新增公开路由） | exact |
| `frontend/src/pages/PublicFillPage.vue` | component | request-response | `frontend/src/pages/LoginPage.vue` | role-match |
| `frontend/src/components/ShareDialog.vue` | component | event-driven | `frontend/src/pages/TemplatePage.vue` (createDialog) | role-match |
| `frontend/src/components/public-fill/FormFieldRenderer.vue` | component | transform | `frontend/src/components/designer/DesignerCanvas.vue` | role-match |
| `frontend/src/stores/template.ts` | store | CRUD | 自身（扩展 action） | exact |

## Pattern Assignments

### `backend/prisma/schema.prisma` (model, CRUD)

**Analog:** 自身 — FormTemplate 模型定义

**模型定义模式** (lines 92-106):
```prisma
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

**关键模式要点:**
- 自增 Int 主键 `@id @default(autoincrement())`
- 外键字段 + 关系字段成对出现（如 `creatorId` + `creator`）
- `@@index` 用于外键和常用查询字段
- `@default(now())` 用于 createdAt
- Json 类型用于 JSONB 存储（schema 字段已有先例）

**新增模型需遵循:**
- ShareLink: `code String @unique`，关联 FormTemplate + User
- Submission: `data Json`，关联 FormTemplate + ShareLink
- FormTemplate 新增 `requireIdentity Boolean @default(false)` 和关系字段

---

### `backend/src/modules/template/template.route.ts` (controller, request-response) — 扩展

**Analog:** 自身

**导入模式** (lines 1-4):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';
```

**Guard + POST 端点模式** (lines 34-47):
```typescript
.guard({}, (app) =>
  app.use(authGuard('form:template:create')).post(
    '/',
    async ({ body, currentUser }: any) =>
      prisma.formTemplate.create({
        data: { name: body.name, description: body.description, creatorId: currentUser.id },
      }),
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 50 }),
        description: t.Optional(t.String()),
      }),
    },
  ),
)
```

**新增端点需遵循:**
- 使用 `.guard({}, (app) => app.use(authGuard('perm:code')).post(...))` 模式
- body 使用 `t.Object()` 做 schema 验证
- `currentUser.id` 从 authGuard derive 获取
- 业务校验使用 `BizError` / `notFound`

---

### `backend/src/modules/public/public.route.ts` (controller, request-response) — 新建

**Analog:** `backend/src/modules/template/template.route.ts`

**模块声明模式** (line 6):
```typescript
export const formTemplateModule = new Elysia({ prefix: '/templates' })
```

**GET 端点 + Prisma 查询模式** (lines 25-31):
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

**错误处理模式** (lines 96-97):
```typescript
if (tpl.status !== 'DRAFT') throw new BizError('仅可删除草稿状态的模板');
```

**关键差异:**
- 公开模块 **不使用** `authGuard`
- prefix 为 `/public/f`
- 返回数据需过滤，仅暴露填写所需字段（name, description, schema, requireIdentity）
- POST submit 端点需在事务中读取 schemaVersion

---

### `backend/src/index.ts` (config, request-response) — 修改

**Analog:** 自身

**模块导入模式** (lines 6-11):
```typescript
import { authModule } from './modules/auth/auth.route';
import { userModule } from './modules/user/user.route';
import { departmentModule } from './modules/department/department.route';
import { roleModule, permissionModule } from './modules/role/role.route';
import { dashboardModule } from './modules/dashboard/dashboard.route';
import { formTemplateModule } from './modules/template/template.route';
```

**路由组注册模式** (lines 56-65):
```typescript
.group('/api/v1', (app) =>
  app
    .use(authModule)
    .use(userModule)
    .use(departmentModule)
    .use(roleModule)
    .use(permissionModule)
    .use(dashboardModule)
    .use(formTemplateModule),
)
```

**公开模块注册方式:**
- publicFillModule 必须注册在 `/api/v1` group **之外**，避免继承 authGuard 作用域
- 推荐在 `.group('/api/v1', ...)` 之后链式 `.use(publicFillModule)`
- 或包裹在 `.group('/api', ...)` 内但与 `/v1` 平级

---

### `frontend/src/router/routes.ts` (route, request-response) — 修改

**Analog:** 自身

**公开路由模式** (lines 1-8):
```typescript
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/403',
    component: () => import('pages/ForbiddenPage.vue'),
    meta: { public: true },
  },
```

**路由守卫放行逻辑** (`frontend/src/router/index.ts` lines 20-22):
```typescript
Router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;  // 公开页面直接放行
```

**新增路由需遵循:**
- `/f/:code` 路由放在顶层（与 `/login`、`/403` 同级），不嵌套在 MainLayout children 中
- `meta: { public: true }` 确保路由守卫放行
- 使用 `() => import('pages/PublicFillPage.vue')` 懒加载

---

### `frontend/src/pages/PublicFillPage.vue` (component, request-response) — 新建

**Analog:** `frontend/src/pages/LoginPage.vue`

**独立 Layout 模式** (LoginPage.vue lines 2-5):
```vue
<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="login-page flex flex-center">
```

**Script setup 导入模式** (LoginPage.vue lines 41-46):
```typescript
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { Notify } from 'quasar';
```

**表单提交模式** (LoginPage.vue lines 56-66):
```typescript
async function onLogin() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    Notify.create({ type: 'positive', message: '登录成功' });
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } finally {
    loading.value = false;
  }
}
```

**关键差异:**
- PublicFillPage 不使用 AuthStore，需直接调用公开 API（axios 无 token）
- 背景色 `#F1F5F9`（UI-SPEC），非 LoginPage 的渐变背景
- 卡片式居中布局，max-width 640px
- 需根据 schema 动态渲染表单字段（参考 DesignerCanvas 的字段渲染）
- 提交成功后切换到静态成功页（同一组件内条件渲染）

**公开 API 调用模式（无 token）:**
```typescript
// 不使用 api（带 token 拦截器），直接用 axios
import axios from 'axios';
const publicApi = axios.create({ baseURL: process.env.API_BASE });
```

---

### `frontend/src/components/ShareDialog.vue` (component, event-driven) — 新建

**Analog:** `frontend/src/pages/TemplatePage.vue` — createDialog 部分

**Dialog 模式** (TemplatePage.vue lines 167-195):
```vue
<q-dialog v-model="createDialog">
  <q-card style="min-width: 400px">
    <q-card-section class="text-h6">创建模板</q-card-section>
    <q-form ref="createFormRef" greedy>
      <q-card-section class="q-gutter-sm">
        <!-- 表单内容 -->
      </q-card-section>
    </q-form>
    <q-card-actions align="right">
      <q-btn flat label="放弃创建" v-close-popup />
      <q-btn color="primary" label="保存模板" @click="onCreate" />
    </q-card-actions>
  </q-card>
</q-dialog>
```

**Notify 反馈模式** (TemplatePage.vue line 282):
```typescript
Notify.create({ type: 'positive', message: '保存成功' });
```

**ShareDialog 特有逻辑:**
- Props: `templateId: number`，`modelValue: boolean`（v-model 控制显隐）
- 打开时调用 `store.createShareLink(templateId)` 获取 code
- 使用 `QRCode.toCanvas()` 渲染二维码（watch + nextTick 确保 canvas 已挂载）
- 复制链接使用 `navigator.clipboard.writeText()`
- URL 拼接: `${window.location.origin}/f/${code}`

---

### `frontend/src/components/public-fill/FormFieldRenderer.vue` (component, transform) — 新建

**Analog:** `frontend/src/components/designer/DesignerCanvas.vue`

**字段类型渲染模式** (DesignerCanvas.vue lines 27-53):
```vue
<div class="field-preview">
  <template v-if="field.type === 'text'">
    <q-input outlined dense :placeholder="field.placeholder" :label="field.label" />
  </template>
  <template v-else-if="field.type === 'textarea'">
    <q-input outlined dense type="textarea" :placeholder="field.placeholder" />
  </template>
  <template v-else-if="field.type === 'radio'">
    <q-option-group type="radio" :options="mapOptions(field.options)" :model-value="null" />
  </template>
  <template v-else-if="field.type === 'checkbox'">
    <q-option-group type="checkbox" :options="mapOptions(field.options)" :model-value="[]" />
  </template>
  <template v-else-if="field.type === 'date'">
    <q-input outlined dense placeholder="请选择日期">
      <template #append><q-icon name="calendar_today" /></template>
    </q-input>
  </template>
  <template v-else-if="field.type === 'phone'">
    <q-input outlined dense :placeholder="field.placeholder || '请输入手机号'" />
  </template>
  <template v-else-if="field.type === 'signature'">
    <div class="signature-preview">
      <span>签名区域</span>
    </div>
  </template>
</div>
```

**SignatureField 组件模式** (`frontend/src/components/designer/fields/SignatureField.vue` lines 13-27):
```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue';
import SignaturePad from 'signature_pad';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let pad: SignaturePad | null = null;

onMounted(() => {
  if (props.preview || !canvasRef.value) return;
  canvasRef.value.width = 400;
  canvasRef.value.height = 200;
  pad = new SignaturePad(canvasRef.value, {
    penColor: '#000',
    backgroundColor: '#fff',
    minWidth: 0.5,
    maxWidth: 2.5,
  });
});
```

**关键差异:**
- FormFieldRenderer 是**可交互**的（非 disabled），用于实际填写
- 每个字段绑定 v-model 到 formData 对象
- required 字段需添加 QForm rules 验证
- 签名字段使用 SignatureField 组件（preview=false 模式）
- 选项映射函数 `mapOptions` 可直接复用

**FormField 类型定义** (`frontend/src/stores/template.ts` lines 4-12):
```typescript
export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  sort: number;
}
```

---

### `frontend/src/stores/template.ts` (store, CRUD) — 扩展

**Analog:** 自身

**Store 定义模式** (lines 27-37):
```typescript
export const useTemplateStore = defineStore('template', {
  state: () => ({
    rows: [] as Template[],
    total: 0,
    loading: false,
    page: 1,
    size: 10,
    statusFilter: '' as string,
    current: null as Template | null,
    selectedFieldId: null as string | null,
  }),
```

**API 调用 action 模式** (lines 57-60):
```typescript
async fetchOne(id: number) {
  const { data } = await api.get(`/templates/${id}`);
  this.current = data;
  return data;
},
```

**新增 action 需遵循:**
- 使用 `api.post()` / `api.get()` 调用后端 API
- 返回 data 供调用方使用
- 新增 `createShareLink(templateId: number)` action
- 可选：新增 `fetchShareLinks(templateId: number)` 用于列表展示

---

## Shared Patterns

### 错误处理
**Source:** `backend/src/utils/errors.ts` (lines 1-14)
**Apply to:** 所有后端 controller 文件（template.route.ts, public.route.ts）
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

export const unauthorized = (msg = '未登录或登录已过期') => new BizError(msg, 401, 'UNAUTHORIZED');
export const forbidden = (msg = '无权限访问') => new BizError(msg, 403, 'FORBIDDEN');
export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');
```

### 全局错误拦截
**Source:** `backend/src/index.ts` (lines 46-54)
**Apply to:** 公开模块的 BizError 也会被此拦截器捕获
```typescript
.onError(({ error, set }: any) => {
  if (error instanceof BizError) {
    set.status = error.status;
    return { code: error.code, message: error.message };
  }
  console.error('[ERR]', error);
  set.status = 500;
  return { code: 'INTERNAL', message: error.message ?? 'Server error' };
})
```

### 鉴权中间件
**Source:** `backend/src/middlewares/auth.ts` (lines 6-7)
**Apply to:** template.route.ts 新增的分享链接端点（需 authGuard）；public.route.ts **不使用**
```typescript
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
```

### 前端 API 实例
**Source:** `frontend/src/boot/axios.ts` (lines 6-9)
**Apply to:** template store 扩展（带 token）；PublicFillPage 需独立 axios 实例（无 token）
```typescript
const api: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE,
  timeout: 15000,
});
```

### 前端通知反馈
**Source:** `frontend/src/pages/TemplatePage.vue` (line 282)
**Apply to:** ShareDialog（复制成功）、PublicFillPage（提交成功/失败）
```typescript
Notify.create({ type: 'positive', message: '保存成功' });
```

### 响应式工具
**Source:** `frontend/src/composables/useResponsive.ts` (lines 1-10)
**Apply to:** PublicFillPage（移动端签名 canvas 宽度适配）
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

## No Analog Found

无。所有文件均在代码库中找到了匹配的模式参考。

## Metadata

**Analog search scope:** `backend/src/`, `frontend/src/`, `backend/prisma/`
**Files scanned:** 25+
**Pattern extraction date:** 2026-04-20
