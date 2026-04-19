# Phase 5: 响应式体验 - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 27 (10 new + 17 modified)
**Analogs found:** 27 / 27

---

## File Classification

### New Files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `frontend/src/boot/dark-mode.ts` | boot | init | `frontend/src/boot/perm.ts` | role-match |
| `frontend/src/composables/useResponsive.ts` | composable | reactive | (无现有 composable，参考 Quasar useQuasar 模式) | no-analog |
| `frontend/src/composables/useDarkMode.ts` | composable | reactive | (同上) | no-analog |
| `frontend/src/components/EmptyState.vue` | component | presentational | `frontend/src/pages/UserPage.vue` L49-56 (内联空态) | partial |
| `frontend/src/components/SkeletonTable.vue` | component | presentational | `frontend/src/pages/UserPage.vue` L38-40 (内联骨架) | partial |
| `frontend/src/components/SkeletonList.vue` | component | presentational | `frontend/src/pages/UserPage.vue` L92-113 (卡片列表) | partial |
| `frontend/src/components/FilterSheet.vue` | component | form-input | `frontend/src/pages/UserPage.vue` L6-33 (筛选栏) | role-match |
| `frontend/src/pages/DashboardPage.vue` | page | request-response | `frontend/src/pages/DashboardPage.vue` (自身重构) | exact |
| `frontend/src/pages/ErrorPage.vue` | page | presentational | `frontend/src/pages/ForbiddenPage.vue` | exact |
| `frontend/src/services/dashboard.ts` | service | request-response | `frontend/src/boot/axios.ts` (api 实例) | role-match |

### New Files (Backend)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `backend/src/modules/dashboard/dashboard.route.ts` | route | request-response | `backend/src/modules/department/department.route.ts` | exact |

### Modified Files

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `frontend/src/layouts/MainLayout.vue` | layout | reactive | self (改造) | exact |
| `frontend/src/pages/LoginPage.vue` | page | form-submit | self (美化) | exact |
| `frontend/src/pages/UserPage.vue` | page | CRUD | self (适配) | exact |
| `frontend/src/pages/DepartmentPage.vue` | page | CRUD | self (适配) | exact |
| `frontend/src/pages/RolePage.vue` | page | CRUD | self (适配) | exact |
| `frontend/src/App.vue` | root | init | self | exact |
| `frontend/src/router/routes.ts` | config | routing | self | exact |
| `frontend/src/css/app.scss` | style | global | self (扩展) | exact |
| `frontend/quasar.config.cjs` | config | build | self | exact |
| `backend/src/index.ts` | entry | init | self (注册模块) | exact |

---

## Pattern Assignments

### Layer 1: Frontend Boot / Composables

---

#### `frontend/src/boot/dark-mode.ts` (boot, init) — CREATE

**Analog:** `frontend/src/boot/perm.ts`

**Boot 文件结构模式** (perm.ts L1-19):
```typescript
// v-perm 指令：响应式控制元素可见性（无权限时隐藏）
import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth';

// ... 逻辑 ...

export default boot(({ app }) => {
  // boot 初始化逻辑
  app.directive('perm', {
    mounted: applyPerm,
    updated: applyPerm,
  });
});
```

**新文件签名：**
```typescript
import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';

export default boot(() => {
  const saved = localStorage.getItem('oa-dark-mode');
  if (saved !== null) {
    Dark.set(saved === 'true');
  } else {
    Dark.set('auto');
  }
});
```

**Notes:**
- boot 函数不需要 `{ app }` 参数，因为只操作 Quasar Dark plugin
- 必须在 `quasar.config.cjs` 的 `boot` 数组中注册 `'dark-mode'`
- 执行时机在 Vue app 创建前，避免 FOUC

---

#### `frontend/src/composables/useResponsive.ts` (composable, reactive) — CREATE

**Analog:** 无现有 composable，参考 `MainLayout.vue` L22 和 `UserPage.vue` L60 的断点用法

**当前散落的断点判断模式** (MainLayout.vue L22, L44; UserPage.vue L60):
```vue
<!-- MainLayout.vue L22 -->
<q-drawer v-if="$q.screen.gt.sm" v-model="drawerOpen" show-if-above bordered :width="220">

<!-- MainLayout.vue L44 -->
<q-footer v-if="$q.screen.lt.md" bordered class="bg-white text-grey-9">

<!-- UserPage.vue L60 -->
<q-table v-if="$q.screen.gt.sm" :rows="rows" ...>
```

**新文件签名：**
```typescript
import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useResponsive() {
  const $q = useQuasar();
  // $q.screen.gt.sm === (width >= 1024)，与 D-01 的 1024px 分界线完全对齐
  const isDesktop = computed(() => $q.screen.gt.sm);
  const isMobile = computed(() => !$q.screen.gt.sm);
  return { isDesktop, isMobile };
}
```

**Notes:**
- `$q.screen.gt.sm` 等价于 `width >= 1024`（Quasar md 断点），语义正确
- 所有页面统一使用 `isDesktop` / `isMobile`，禁止直接写 `$q.screen.gt.sm`

---

#### `frontend/src/composables/useDarkMode.ts` (composable, reactive) — CREATE

**Analog:** `MainLayout.vue` L9 的暗色切换 + UI-SPEC 的持久化契约

**当前暗色切换模式** (MainLayout.vue L9):
```vue
<q-btn flat round dense :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" @click="$q.dark.toggle()" />
```

**新文件签名：**
```typescript
import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useDarkMode() {
  const $q = useQuasar();
  const isDark = computed(() => $q.dark.isActive);

  function toggleDark() {
    $q.dark.toggle();
    localStorage.setItem('oa-dark-mode', String($q.dark.isActive));
  }

  return { isDark, toggleDark };
}
```

**Notes:**
- 切换时同步写入 localStorage，与 boot/dark-mode.ts 的读取配对
- Storage key: `oa-dark-mode`，值为 `"true"` / `"false"`

---

### Layer 2: Frontend Components

---

#### `frontend/src/components/EmptyState.vue` (component, presentational) — CREATE

**Analog:** `frontend/src/pages/UserPage.vue` L49-56 (内联空态), `DepartmentPage.vue` L21-27

**UserPage 内联空态模式** (UserPage.vue L49-56):
```vue
<div v-else-if="rows.length === 0 && !loading" class="flex flex-center q-pa-xl">
  <div class="text-center">
    <q-icon name="people" size="4em" color="grey-4" />
    <div class="text-h6 q-mt-md">暂无用户</div>
    <div class="text-body2 text-grey-6 q-mt-sm">创建第一个用户以开始管理</div>
    <q-btn v-if="canCreateUser" color="primary" label="新建用户" icon="add" class="q-mt-md" @click="openEdit(null)" />
  </div>
</div>
```

**DepartmentPage 内联空态模式** (DepartmentPage.vue L21-27):
```vue
<div v-else-if="tree.length === 0" class="flex flex-center q-pa-xl">
  <div class="text-center">
    <q-icon name="account_tree" size="4em" color="grey-4" />
    <div class="text-h6 q-mt-md">暂无部门</div>
    <div class="text-body2 text-grey-6 q-mt-sm">建立组织架构第一步：添加顶级部门</div>
    <q-btn v-perm="'department:create'" color="primary" label="新建部门" icon="add" class="q-mt-md" @click="openEdit(null)" />
  </div>
</div>
```

**新组件签名：**
```vue
<template>
  <div class="flex flex-center" style="padding: 48px 16px">
    <div class="text-center">
      <q-icon :name="icon" size="64px" style="color: var(--oa-text-tertiary)" />
      <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
        {{ title }}
      </div>
      <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
        {{ description }}
      </div>
      <q-btn v-if="ctaText" color="primary" :label="ctaText" class="q-mt-md" @click="$emit('action')" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
  ctaText?: string;
}>();
defineEmits<{ action: [] }>();
</script>
```

**Notes:**
- 替换 UserPage/DepartmentPage/RolePage 中的内联空态
- 硬编码 `color="grey-4"` 替换为 CSS 变量 `var(--oa-text-tertiary)`（D-09）
- CTA 按钮的权限控制由父组件通过 `v-if` 或 `v-perm` 包裹 `<EmptyState>` 实现

---

#### `frontend/src/components/SkeletonTable.vue` (component, presentational) — DEFERRED (v1.0 使用 inline 骨架屏方案，各页面直接内联 q-skeleton 组件，无需抽象为独立组件)

**Analog:** `frontend/src/pages/UserPage.vue` L38-40

**当前骨架屏模式** (UserPage.vue L38-40):
```vue
<div v-if="firstLoading" class="q-pa-xl">
  <q-skeleton type="QTable" />
</div>
```

**新组件签名：**
```vue
<template>
  <div class="q-gutter-sm">
    <!-- 工具栏骨架 -->
    <div class="row q-gutter-sm q-mb-md">
      <q-skeleton type="rect" width="200px" height="36px" />
      <q-skeleton type="rect" width="100px" height="36px" />
    </div>
    <!-- 表格行骨架 -->
    <q-skeleton type="rect" height="40px" />
    <q-skeleton v-for="i in rows" :key="i" type="rect" height="48px" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 5 });
</script>
```

**Notes:**
- `rows` prop 控制骨架行数，默认 5 行
- 骨架色通过全局 CSS 变量 `var(--oa-skeleton)` 覆盖 Quasar 默认色

---

#### `frontend/src/components/SkeletonList.vue` (component, presentational) — DEFERRED (v1.0 使用 inline 骨架屏方案，各页面直接内联 q-skeleton 卡片骨架，无需抽象为独立组件)

**Analog:** `frontend/src/pages/UserPage.vue` L92-113 (移动端卡片列表结构)

**卡片列表结构模式** (UserPage.vue L92-112):
```vue
<div v-else class="q-gutter-sm">
  <q-card v-for="u in rows" :key="u.id" flat bordered>
    <q-card-section>
      <div class="row items-center">
        <div class="text-subtitle1">{{ u.realName }}</div>
        <q-space />
        <!-- ... -->
      </div>
      <div class="text-caption q-mt-xs">部门: {{ u.department?.name ?? '-' }}</div>
      <div class="text-caption">角色: {{ ... }}</div>
    </q-card-section>
  </q-card>
</div>
```

**新组件签名：**
```vue
<template>
  <div class="q-gutter-sm">
    <q-card v-for="i in count" :key="i" flat bordered style="border-radius: 8px">
      <q-card-section>
        <q-skeleton type="text" width="60%" />
        <q-skeleton type="text" width="40%" class="q-mt-xs" />
        <q-skeleton type="text" width="40%" class="q-mt-xs" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 3 });
</script>
```

---

#### `frontend/src/components/FilterSheet.vue` (component, form-input) — CREATE

**Analog:** `frontend/src/pages/UserPage.vue` L6-33 (筛选栏)

**当前筛选栏模式** (UserPage.vue L6-33):
```vue
<q-input v-model="keyword" outlined dense placeholder="搜索用户名/姓名" @keyup.enter="load(1)" clearable style="width: 200px">
  <template #append><q-icon name="search" class="cursor-pointer" @click="load(1)" /></template>
</q-input>
<q-select v-if="canListDept" v-model="deptFilter" :options="deptFilterOptions"
  label="选择部门" outlined dense emit-value map-options clearable style="width: 160px"
  @update:model-value="load(1)" />
<q-btn-toggle v-model="statusFilter" toggle-color="primary" flat bordered
  :options="[{ label: '全部', value: '' }, { label: '启用', value: 'ACTIVE' }, { label: '禁用', value: 'DISABLED' }]"
  @update:model-value="load(1)" />
```

**新组件签名（底部 Sheet 封装）：**
```vue
<template>
  <q-dialog v-model="show" position="bottom">
    <q-card style="width: 100%; border-radius: 16px 16px 0 0">
      <!-- 拖拽条 -->
      <div class="flex flex-center q-pt-sm q-pb-xs">
        <div style="width: 40px; height: 4px; border-radius: 2px; background: var(--oa-border)"></div>
      </div>
      <q-card-section class="q-gutter-md">
        <q-input v-model="local.keyword" outlined dense label="搜索" clearable />
        <q-select v-model="local.departmentId" :options="deptOptions" label="部门"
          outlined dense emit-value map-options clearable />
        <q-btn-toggle v-model="local.status" toggle-color="primary" flat bordered
          :options="statusOptions" class="full-width" />
      </q-card-section>
      <q-card-actions>
        <q-btn flat label="重置筛选" @click="onReset" />
        <q-space />
        <q-btn color="primary" label="应用筛选" @click="onApply" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// Props: modelValue (boolean), filters (object), deptOptions
// Emits: update:modelValue, apply (filters), reset
</script>
```

**Notes:**
- 使用 `q-dialog position="bottom"` 实现底部 Sheet（D-06）
- 圆角 `16px 16px 0 0`（UI-SPEC）
- 复用 UserPage 的筛选字段，通过 props 传入选项

### Layer 3: Frontend Pages

---

#### `frontend/src/pages/DashboardPage.vue` (page, request-response) — REWRITE

**Analog:** self (当前 DashboardPage.vue) + `UserPage.vue` 的数据加载模式

**当前 DashboardPage** (DashboardPage.vue L1-24):
```vue
<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">欢迎, {{ auth.user?.realName }}</div>
    <div class="row q-gutter-md">
      <q-card class="col-12 col-sm">
        <q-card-section>
          <div class="text-subtitle2 text-grey">当前角色</div>
          <div class="text-h6">{{ auth.user?.roles.join(', ') }}</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth';
const auth = useAuthStore();
</script>
```

**数据加载模式** (UserPage.vue L145-211 — 参考 loading/error/data 三态):
```typescript
import { ref, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { Notify } from 'quasar';

const loading = ref(false);
const error = ref(false);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/endpoint');
    // 赋值
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
```

**新页面关键模式：**
- 欢迎词时段判断：`new Date().getHours()` → 06-12 早上好 / 12-18 下午好 / else 晚上好
- 统计卡片：`api.get('/dashboard/stats')` → `{ userCount, departmentCount, roleCount }`
- 骨架屏：`v-if="loading"` 显示 3 张卡片骨架
- 空态：统计加载失败时显示 `"--"` + Notify warning
- 快捷操作：4 个 `q-btn` 带 `to` 路由跳转
- 移动端：统计卡片 `col-12` 纵向堆叠，快捷操作 2x2 grid

---

#### `frontend/src/pages/ErrorPage.vue` (page, presentational) — CREATE (合并 403/404)

**Analog:** `frontend/src/pages/ForbiddenPage.vue` + `NotFoundPage.vue`

**当前 ForbiddenPage** (ForbiddenPage.vue L1-13):
```vue
<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row items-center justify-center" style="min-height: 100vh">
        <div class="text-center">
          <div class="text-h2 text-grey-6">403</div>
          <div class="q-mb-md">无权限访问此页面</div>
          <q-btn color="primary" to="/">返回首页</q-btn>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
```

**美化后签名（可合并为单组件，通过 route.path 或 prop 区分）：**
```vue
<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center" style="min-height: 100vh; background: var(--oa-bg)">
        <div class="text-center">
          <div style="font-size: 72px; font-weight: 600; line-height: 1; color: var(--oa-text-tertiary)">
            {{ code }}
          </div>
          <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
            {{ title }}
          </div>
          <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
            {{ description }}
          </div>
          <q-btn color="primary" label="返回首页" to="/" class="q-mt-lg" style="border-radius: 8px" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
```

**Notes:**
- 错误码 72px / 600（UI-SPEC Display Override）
- 替换 `text-grey-6` 为 `var(--oa-text-tertiary)`（D-09）
- 可选方案：保持 ForbiddenPage.vue + NotFoundPage.vue 两个文件，各自硬编码文案
- 或合并为 ErrorPage.vue + props/route 区分

---

#### `frontend/src/services/dashboard.ts` (service, request-response) — DEFERRED (v1.0 DashboardPage 直接使用 api.get 调用，无需抽象为独立 service 层)

**Analog:** `frontend/src/boot/axios.ts` L6-8 (api 实例)

**API 调用模式** (axios.ts):
```typescript
import axios, { type AxiosInstance } from 'axios';
const api: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE,
  timeout: 15000,
});
export { api };
```

**新文件签名：**
```typescript
import { api } from 'src/boot/axios';

export interface DashboardStats {
  userCount: number;
  departmentCount: number;
  roleCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}
```

**Notes:**
- 可选：如果只有一个接口，也可以直接在 DashboardPage.vue 中调用 `api.get`（与 UserPage 模式一致）
- 独立 service 文件的好处是类型定义集中、可复用

### Layer 4: Frontend Layouts & Modified Pages

---

#### `frontend/src/layouts/MainLayout.vue` (layout, reactive) — MODIFY

**Analog:** self (当前 MainLayout.vue L1-89)

**当前完整结构** (MainLayout.vue):
```vue
<template>
  <q-layout view="hHh Lpr lff" :class="$q.dark.isActive ? '' : 'bg-grey-2'">
    <!-- PC 顶栏 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title>OA 管理系统</q-toolbar-title>
        <q-space />
        <q-btn flat round dense :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" @click="$q.dark.toggle()" />
        <q-btn-dropdown flat :label="auth.user?.realName ?? ''" icon="account_circle">
          <!-- logout -->
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-if="$q.screen.gt.sm" v-model="drawerOpen" show-if-above bordered :width="220">
      <!-- 导航菜单 -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer v-if="$q.screen.lt.md" bordered class="bg-white text-grey-9">
      <q-tabs v-model="activeTab" dense active-color="primary" indicator-color="primary" align="justify" @update:model-value="onTab">
        <q-tab v-for="m in visibleMenus" :key="m.path" :name="m.path" :icon="m.icon" :label="m.title" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>
```

**需要修改的关键点：**

1. **L2 `bg-grey-2` 三元** → 移除，`q-page` 已有 `var(--oa-bg)`（D-09 #1）
2. **L9 暗色切换** → 使用 `useDarkMode()` composable 的 `toggleDark()`
3. **L22 `$q.screen.gt.sm`** → `isDesktop`（useResponsive）
4. **L44 `$q.screen.lt.md`** → `isMobile`（useResponsive）
5. **L44 `bg-white text-grey-9`** → `style="background: var(--oa-surface); color: var(--oa-text-primary)"`（D-09 #3）
6. **新增移动端 overlay Drawer**（D-02, D-12）：
   ```vue
   <q-drawer v-if="isMobile" v-model="mobileDrawerOpen" overlay bordered :width="280">
     <!-- 导航菜单 + 用户信息 + 暗色切换 + 退出 -->
   </q-drawer>
   ```
7. **新增 router-view 过渡**（D-14）：
   ```vue
   <q-page-container>
     <router-view v-slot="{ Component }">
       <transition name="fade" mode="out-in">
         <component :is="Component" />
       </transition>
     </router-view>
   </q-page-container>
   ```
8. **移动端顶栏精简**（D-03）：汉堡菜单 + 标题 + 暗色切换 + 用户头像（去掉 dropdown label）

**Script 新增 imports：**
```typescript
import { useResponsive } from 'src/composables/useResponsive';
import { useDarkMode } from 'src/composables/useDarkMode';

const { isDesktop, isMobile } = useResponsive();
const { isDark, toggleDark } = useDarkMode();
const mobileDrawerOpen = ref(false);
```

---

#### `frontend/src/pages/LoginPage.vue` (page, form-submit) — MODIFY

**Analog:** self (当前 LoginPage.vue L1-56)

**当前结构** (LoginPage.vue L1-30):
```vue
<q-page class="row items-center justify-evenly" style="min-height: 100vh">
  <q-card class="q-pa-md" style="width: 360px; max-width: 90vw">
    <q-card-section class="text-center">
      <div class="text-h5 text-primary">OA 管理系统</div>
      <div class="text-caption text-grey">请使用您的账号登录</div>
    </q-card-section>
    <q-form @submit="onLogin" class="q-gutter-md">
      <!-- 表单字段 -->
    </q-form>
  </q-card>
</q-page>
```

**需要修改的关键点：**

1. **渐变背景**（D-15）：`background: linear-gradient(135deg, var(--oa-login-gradient-start), var(--oa-login-gradient-end))`
2. **装饰圆形**（D-15）：2 个 `position: absolute; border-radius: 50%` 的 div
3. **卡片升级**：宽度 400px，圆角 12px，阴影 `shadow-4`，内边距 48px（PC）/ 32px（Mobile）
4. **`text-grey` 替换**（D-09 #9, #10）：→ `var(--oa-text-secondary)`
5. **暗色切换按钮**：卡片右上角小按钮
6. **Script 不变**：`onLogin` 逻辑保持

---

#### `frontend/src/pages/UserPage.vue` (page, CRUD) — MODIFY

**Analog:** self (当前 UserPage.vue L1-355)

**需要修改的关键点：**

1. **L60 `$q.screen.gt.sm`** → `isDesktop`（useResponsive）
2. **L51 `color="grey-4"`** → `style="color: var(--oa-text-tertiary)"`（D-09 #16）
3. **L53 `text-grey-6`** → `style="color: var(--oa-text-secondary)"`（D-09 #13）
4. **L96 `text-grey`** → `style="color: var(--oa-text-secondary)"`（D-09 #14）
5. **L49-56 内联空态** → 替换为 `<EmptyState>` 组件
6. **L38-40 内联骨架** → 替换为 `<SkeletonTable>` / `<SkeletonList>`（按 isDesktop 切换）
7. **L116-141 q-dialog** → 添加 `:maximized="isMobile"` + 移动端过渡动画（D-07）
8. **筛选栏移动端折叠**（D-06）：PC 保持内联，Mobile 显示"筛选"按钮 + `<FilterSheet>`
9. **移动端 FAB**（D-06）：`<q-page-sticky position="bottom-right" :offset="[16, 16]">` 包裹新建按钮
10. **新增 imports：**
    ```typescript
    import { useResponsive } from 'src/composables/useResponsive';
    import EmptyState from 'src/components/EmptyState.vue';
    import FilterSheet from 'src/components/FilterSheet.vue';
    const { isDesktop, isMobile } = useResponsive();
    ```

---

#### `frontend/src/pages/DepartmentPage.vue` (page, CRUD) — MODIFY

**Analog:** self (当前 DepartmentPage.vue L1-227)

**需要修改的关键点：**

1. **L22 `color="grey-4"`** → `style="color: var(--oa-text-tertiary)"`（D-09 #15）
2. **L25 `text-grey-6`** → `style="color: var(--oa-text-secondary)"`（D-09 #6）
3. **L21-27 内联空态** → 替换为 `<EmptyState>` 组件
4. **L9-12 加载态** → 替换为树形骨架屏（5 行缩进矩形）
5. **L50-91 q-dialog** → 添加 `:maximized="isMobile"`（D-04）
6. **新增 imports：**
    ```typescript
    import { useResponsive } from 'src/composables/useResponsive';
    import EmptyState from 'src/components/EmptyState.vue';
    const { isMobile } = useResponsive();
    ```

---

#### `frontend/src/pages/RolePage.vue` (page, CRUD) — MODIFY

**Analog:** self (当前 RolePage.vue L1-171)

**需要修改的关键点：**

1. **L11 `bg-white`** → `style="background: var(--oa-surface)"`（D-09 #11）
2. **L17 `bg-blue-1`** → `style="background: var(--oa-hover)"`（D-09 #12）
3. **移动端单栏切换**（D-05）：
   ```typescript
   const mobileView = ref<'list' | 'permissions'>('list');
   ```
   - `v-if="isMobile"` 时：mobileView === 'list' 显示角色列表，mobileView === 'permissions' 显示权限视图
   - 点击角色 → `mobileView = 'permissions'`
   - 返回按钮 → `mobileView = 'list'`
4. **L73-86 q-dialog** → 添加 `:maximized="isMobile"`（D-07）
5. **新增 imports：**
    ```typescript
    import { useResponsive } from 'src/composables/useResponsive';
    const { isDesktop, isMobile } = useResponsive();
    const mobileView = ref<'list' | 'permissions'>('list');
    ```

### Layer 5: Frontend CSS & Config

---

#### `frontend/src/css/app.scss` (style, global) — MODIFY

**Analog:** self (当前 app.scss L1-67)

**当前 CSS 变量结构** (app.scss L14-36):
```scss
:root {
  --oa-bg: #F8FAFC;
  --oa-surface: #FFFFFF;
  --oa-border: #E2E8F0;
  --oa-text-primary: #0F172A;
  --oa-text-secondary: #475569;
  --oa-text-tertiary: #64748B;
  --oa-hover: #EEF2FF;
  --oa-focus-ring: #4F46E5;
}

.body--dark {
  --oa-bg: #0F172A;
  --oa-surface: #1E293B;
  --oa-border: #334155;
  --oa-text-primary: #F8FAFC;
  --oa-text-secondary: #94A3B8;
  --oa-text-tertiary: #64748B;
  --oa-hover: #1E1B4B;
  --oa-focus-ring: #6366F1;
}
```

**需要新增的 CSS 变量**（UI-SPEC Color 章节）：
```scss
:root {
  // 继承所有现有变量，新增：
  --oa-surface-elevated: #FFFFFF;
  --oa-skeleton: #E2E8F0;
  --oa-tab-inactive: #94A3B8;
  --oa-login-gradient-start: #4F46E5;
  --oa-login-gradient-end: #6366F1;
  --oa-stat-icon-bg: #EEF2FF;
}

.body--dark {
  // 继承所有现有变量，新增：
  --oa-surface-elevated: #1E293B;
  --oa-skeleton: #334155;
  --oa-tab-inactive: #64748B;
  --oa-login-gradient-start: #312E81;
  --oa-login-gradient-end: #3730A3;
  --oa-stat-icon-bg: #1E1B4B;
}
```

**需要新增的动画关键帧**（D-14 页面切换过渡）：
```scss
// 页面切换 fade 过渡
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

**需要新增的微交互**（D-14 Dashboard 卡片 hover）：
```scss
// Dashboard 统计卡片 hover
@media (hover: hover) {
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform 200ms ease, box-shadow 200ms ease;
  }
}
```

---

#### `frontend/quasar.config.cjs` (config, build) — MODIFY

**Analog:** self (当前 quasar.config.cjs L1-40)

**当前 boot 数组** (quasar.config.cjs L6):
```javascript
boot: ['axios', 'perm'],
```

**修改为：**
```javascript
boot: ['axios', 'perm', 'dark-mode'],
```

**Notes:** 仅新增 `'dark-mode'` 到 boot 数组，其余配置不变

---

#### `frontend/src/router/routes.ts` (config, routing) — MODIFY

**Analog:** self (当前 routes.ts L1-28)

**当前路由结构** (routes.ts L3-26):
```typescript
const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('pages/LoginPage.vue'), meta: { public: true } },
  { path: '/403', component: () => import('pages/ForbiddenPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { title: '首页', icon: 'dashboard' } },
      { path: 'departments', ... },
      { path: 'users', ... },
      { path: 'roles', ... },
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('pages/NotFoundPage.vue'), meta: { public: true } },
];
```

**Notes:**
- 如果合并为 ErrorPage.vue：修改 `/403` 和 catchAll 路由指向 ErrorPage.vue（通过 props 传入 code/title/description）
- 如果保持分离：仅美化 ForbiddenPage.vue 和 NotFoundPage.vue，路由不变
- Dashboard 路由已存在，无需新增

---

#### `frontend/src/App.vue` (root, init) — POSSIBLY MODIFY

**Analog:** self (当前 App.vue L1-11)

**当前结构** (App.vue):
```vue
<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'App' });
</script>
```

**Notes:**
- 暗色模式初始化已移至 boot/dark-mode.ts，App.vue 无需修改
- 页面过渡在 MainLayout.vue 的 router-view 上实现，App.vue 的 router-view 不需要过渡（因为 LoginPage/ErrorPage 有独立 layout）

---

### Layer 6: Backend

---

#### `backend/src/modules/dashboard/dashboard.route.ts` (route, request-response) — CREATE

**Analog:** `backend/src/modules/department/department.route.ts` L48-54

**后端路由模块模式** (department.route.ts L1-4, L48-54):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

export const departmentModule = new Elysia({ prefix: '/departments' })
  .use(authGuard('department:list'))
  .get('/', async () => prisma.department.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }))
  .get('/tree', async () => {
    const rows = await prisma.department.findMany({ ... });
    return buildTree(rows);
  })
```

**新文件签名：**
```typescript
import { Elysia } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';

export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard())  // 仅需登录，无需特定权限
  .get('/stats', async () => {
    const [userCount, departmentCount, roleCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.role.count(),
    ]);
    return { userCount, departmentCount, roleCount };
  });
```

**Notes:**
- `authGuard()` 不传参数 = 仅验证登录，不检查特定权限（所有登录用户可查看统计）
- 使用 `Promise.all` 并行查询 3 个 count
- 无需 dashboard.service.ts 和 dashboard.module.ts — Elysia 模式下路由文件即模块

---

#### `backend/src/index.ts` (entry, init) — MODIFY

**Analog:** self (当前 index.ts L1-64)

**当前模块注册模式** (index.ts L6-9, L54-61):
```typescript
import { authModule } from './modules/auth/auth.route';
import { userModule } from './modules/user/user.route';
import { departmentModule } from './modules/department/department.route';
import { roleModule, permissionModule } from './modules/role/role.route';

// ...
.group('/api/v1', (app) =>
  app
    .use(authModule)
    .use(userModule)
    .use(departmentModule)
    .use(roleModule)
    .use(permissionModule),
)
```

**修改为：**
```typescript
import { dashboardModule } from './modules/dashboard/dashboard.route';

// ...
.group('/api/v1', (app) =>
  app
    .use(authModule)
    .use(userModule)
    .use(departmentModule)
    .use(roleModule)
    .use(permissionModule)
    .use(dashboardModule),  // 新增
)
```

---

## Shared Patterns

### Pattern A: 断点判断（所有页面 + 布局）

**Source:** `frontend/src/composables/useResponsive.ts` (新建)
**Apply to:** MainLayout.vue, UserPage.vue, DepartmentPage.vue, RolePage.vue, DashboardPage.vue

```typescript
import { useResponsive } from 'src/composables/useResponsive';
const { isDesktop, isMobile } = useResponsive();
```

替换规则：
- `$q.screen.gt.sm` → `isDesktop`
- `$q.screen.lt.md` → `isMobile`
- `!$q.screen.gt.sm` → `isMobile`

### Pattern B: 暗色模式切换（布局 + 登录页）

**Source:** `frontend/src/composables/useDarkMode.ts` (新建)
**Apply to:** MainLayout.vue (顶栏 + overlay Drawer), LoginPage.vue (卡片右上角)

```typescript
import { useDarkMode } from 'src/composables/useDarkMode';
const { isDark, toggleDark } = useDarkMode();
```

```vue
<q-btn flat round dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="toggleDark" />
```

### Pattern C: 硬编码颜色替换（D-09 全局）

**Source:** RESEARCH.md Pattern 3 硬编码颜色清单
**Apply to:** 所有 .vue 文件中的 16 处硬编码

| 硬编码 | 替换为 | 涉及文件 |
|--------|--------|---------|
| `bg-white` | `style="background: var(--oa-surface)"` | RolePage L11 |
| `bg-grey-2` (三元) | 移除 | MainLayout L2 |
| `bg-white text-grey-9` | `style="background: var(--oa-surface); color: var(--oa-text-primary)"` | MainLayout L44 |
| `text-grey` | `style="color: var(--oa-text-secondary)"` | DashboardPage L7/L13, LoginPage L8/L24, UserPage L96 |
| `text-grey-6` | `style="color: var(--oa-text-secondary)"` | DepartmentPage L25, UserPage L53 |
| `text-grey-6` (错误页) | `style="color: var(--oa-text-tertiary)"` | ForbiddenPage L6, NotFoundPage L6 |
| `color="grey-4"` (图标) | `style="color: var(--oa-text-tertiary)"` | DepartmentPage L22, UserPage L51 |
| `bg-blue-1` | `style="background: var(--oa-hover)"` | RolePage L17 |

**保留不改：** `bg-primary text-white`（header）、`color="primary/positive/negative"`（Quasar 语义色）

### Pattern D: 全屏弹窗（D-07 所有 CRUD 页面）

**Source:** RESEARCH.md Pattern 4
**Apply to:** UserPage.vue, DepartmentPage.vue, RolePage.vue 的 `<q-dialog>`

```vue
<q-dialog
  v-model="dialog"
  :maximized="isMobile"
  :transition-show="isMobile ? 'slide-up' : 'scale'"
  :transition-hide="isMobile ? 'slide-down' : 'scale'"
>
  <q-card :style="isMobile ? '' : 'min-width: 400px'">
    <q-bar v-if="isMobile">
      <q-space />
      <q-btn dense flat icon="close" v-close-popup />
    </q-bar>
    <!-- 原有内容 -->
  </q-card>
</q-dialog>
```

### Pattern E: 数据加载三态（loading / error / data）

**Source:** `frontend/src/pages/UserPage.vue` L38-114
**Apply to:** DashboardPage.vue (统计加载), 所有 CRUD 页面

```vue
<!-- 加载中 -->
<div v-if="loading">骨架屏</div>
<!-- 错误态 -->
<div v-else-if="error">错误提示 + 重试按钮</div>
<!-- 空态 -->
<div v-else-if="data.length === 0">
  <EmptyState icon="..." title="..." description="..." ctaText="..." @action="..." />
</div>
<!-- 数据态 -->
<template v-else>正常内容</template>
```

### Pattern F: API 调用模式

**Source:** `frontend/src/boot/axios.ts` L6-8 + `UserPage.vue` L189-211
**Apply to:** DashboardPage.vue, 所有需要 API 调用的页面

```typescript
import { api } from 'src/boot/axios';

const loading = ref(true);
const error = ref(false);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/endpoint');
    // 赋值
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
```

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `frontend/src/composables/useResponsive.ts` | composable | reactive | 项目无现有 composable 文件 | 参考 Quasar `useQuasar()` 模式 + RESEARCH.md Pattern 1 |
| `frontend/src/composables/useDarkMode.ts` | composable | reactive | 同上 | 参考 RESEARCH.md Pattern 2 + UI-SPEC Dark Mode 契约 |

---

## Metadata

**Analog search scope:** `frontend/src/`, `backend/src/`
**Files scanned:** 26 source files (18 frontend + 8 backend)
**Pattern extraction date:** 2026-04-19
**Codebase snapshot:** master branch, commit 783b8af
