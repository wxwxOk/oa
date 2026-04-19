# Phase 5: 响应式体验 - Research

**Researched:** 2026-04-20
**Domain:** 前端响应式布局、暗色模式、UI/UX 美化（Quasar 2 + Vue 3）
**Confidence:** HIGH

## Summary

Phase 5 的核心工作是将现有 PC 端功能页面扩展为 PC/Mobile 双布局自适应体验，同时完善暗色模式持久化、排查硬编码颜色、统一组件视觉规范、新增 Dashboard 统计页和登录页美化。

当前代码库已有良好的基础：MainLayout 已有 PC Drawer + 移动底部 Tab 骨架，UserPage 已有表格/卡片切换，CSS 变量已有 light/dark 双套。主要工作量在于：(1) 封装断点判断为 composable（`$q.screen.gt.sm` 已等于 `width >= 1024`，语义正确但需统一调用方式）；(2) 排查并替换 17 处硬编码颜色 class；(3) 各页面移动端交互适配（全屏弹窗、底部 Sheet、RolePage 单栏切换）；(4) 新增 Dashboard 统计接口和页面重构；(5) 登录页/错误页/空态组件美化。

**Primary recommendation:** 按"基础设施（断点+暗色+CSS 变量）→ 布局改造 → 各页面适配 → 新页面/组件 → 收尾验证"的顺序分 plan 推进，确保基础层变更先落地再做页面级改造。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 统一使用 1024px（Quasar `md` 断点）作为 PC/Mobile 分界线。当前代码中 `$q.screen.gt.sm` / `$q.screen.lt.md` 混用问题统一修正为 `$q.screen.gt.sm` → `$q.screen.gt.md` 或等效 md 断点判断
- **D-02:** PC 端保持固定侧边 Drawer（show-if-above）；移动端点击汉堡菜单弹出 overlay Drawer（覆盖内容区）
- **D-03:** 移动端顶栏精简：汉堡菜单按钮（开关 overlay Drawer）+ 标题 + 暗色切换 + 用户头像
- **D-04:** DepartmentPage 移动端适配：q-tree 全屏展示，编辑/新建弹窗改为全屏弹窗（`full-width full-height` 或 `maximized`）
- **D-05:** RolePage 移动端改为单栏切换：先显示角色列表，点击角色后进入权限分配视图（返回按钮回到列表）
- **D-06:** UserPage 移动端筛选栏折叠为"筛选"按钮，点击弹出底部 Sheet（q-dialog position="bottom"）显示搜索+部门+状态筛选项
- **D-07:** 所有页面的编辑/新建对话框在移动端使用全屏弹窗
- **D-08:** 暗色模式偏好使用 localStorage 持久化，应用启动时读取并应用
- **D-09:** 全面排查硬编码颜色（如 `bg-white`、`text-grey-9`、`bg-grey-2`），替换为 CSS 变量或 Quasar dark-aware class
- **D-10:** 底部 Tab 栏、卡片、弹窗等自定义样式确保暗色模式下无白块
- **D-11:** 底部 Tab 栏保持图标+文字样式，当前选中项高亮（primary 色），未选中灰色
- **D-12:** 移动端 overlay Drawer 内容：导航菜单项 + 底部用户信息区（头像/姓名/角色）+ 退出按钮 + 暗色模式切换
- **D-13:** 组件视觉统一：统一卡片圆角（8px）、阴影层级、间距规范；表格行高统一；按钮尺寸一致性
- **D-14:** 轻量动画：页面切换 fade 过渡（`<router-view v-slot>` + `<transition>`）、列表加载骨架屏、对话框弹出动画、按钮 loading 状态
- **D-15:** 登录页美化：居中卡片 + 左侧/背景装饰图形 + 品牌色渐变背景
- **D-16:** Dashboard 页充实：欢迎词 + 统计卡片（用户数/部门数/角色数，调后端接口）+ 快捷操作入口
- **D-17:** 空态美化：使用统一的空态组件（图标+文字+操作按钮）；403/404 页面打磨（插图+友好文案+返回按钮）

### Claude's Discretion
- 具体动画时长和缓动函数选择
- 骨架屏的具体形状和数量
- 登录页装饰图形的具体设计
- Dashboard 统计卡片的布局细节
- 底部 Sheet 的具体交互细节
- 空态插图的选择（Material Icons 或 SVG）

### Deferred Ideas (OUT OF SCOPE)
- 手势交互（左滑删除、下拉刷新）— 超出 v1.0 范围
- 平板专属布局（介于 PC 和 Mobile 之间）— 当前统一 1024px 断点足够
- PWA 离线支持 — 超出 v1.0 范围
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-6.1 | `window.innerWidth >= 1024` 使用 PC 布局（侧边 Drawer + 顶部栏） | Quasar `$q.screen.gt.sm` 精确对应 >= 1024px 断点；断点统一策略已研究 |
| FR-6.2 | `< 1024` 使用移动布局（底部 Tab + 抽屉菜单） | MainLayout 已有骨架，需统一断点 + 增加 overlay Drawer |
| FR-6.3 | 表格在移动端切换为卡片列表 | UserPage 已有模式，需统一断点；DepartmentPage 用 q-tree 无需切换 |
| NFR-1 | 列表接口 p95 < 500ms（本地 docker 环境） | 移动端卡片列表数据量与 PC 表格一致，无额外性能风险；骨架屏改善感知性能 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 断点判断 & 布局切换 | Browser / Client | — | `$q.screen` 是纯客户端 JS 响应式 API |
| 暗色模式持久化 | Browser / Client | — | localStorage 读写 + Quasar Dark plugin，纯前端 |
| 硬编码色替换 | Browser / Client | — | CSS 变量 + Quasar class 替换，纯前端 |
| 移动端交互（全屏弹窗/底部 Sheet/FAB） | Browser / Client | — | Quasar 组件 props 配置 |
| 页面切换动画 | Browser / Client | — | Vue `<transition>` + CSS |
| Dashboard 统计数据 | API / Backend | Browser / Client | 后端新增 `/dashboard/stats` 接口，前端调用展示 |
| 骨架屏 | Browser / Client | — | `q-skeleton` 组件，纯前端 |
| 登录页美化 | Browser / Client | — | CSS 渐变 + 布局调整 |
| 空态组件 | Browser / Client | — | 公共 Vue 组件 |

## Standard Stack

### Core (已安装，无需新增依赖)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Quasar | 2.19.3 | UI 组件库（q-skeleton, q-dialog, q-page-sticky, q-tabs, Screen plugin, Dark plugin） | 项目已用，Phase 5 所有 UI 需求均可用内置组件实现 [VERIFIED: npm ls] |
| Vue | 3.5.32 | 框架核心（`<transition>`, `<router-view v-slot>`, computed, ref） | 项目已用 [VERIFIED: npm ls] |
| Vue Router | 4.6.4 | 路由（页面切换过渡注入点） | 项目已用 [VERIFIED: npm ls] |
| Pinia | 2.3.1 | 状态管理（authStore 暗色模式状态） | 项目已用 [VERIFIED: npm ls] |
| @quasar/extras | 1.18.0 | Material Icons（空态/Dashboard/错误页图标） | 项目已用 [VERIFIED: npm ls] |
| Axios | 1.7.7+ | HTTP 客户端（Dashboard 统计接口调用） | 项目已用 [VERIFIED: package.json] |

### Supporting (后端新增)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Elysia | 已安装 | 后端框架 — 新增 `/dashboard/stats` 路由 | Dashboard 统计卡片数据源 |
| Prisma | 已安装 | ORM — `prisma.user.count()` / `department.count()` / `role.count()` | 统计查询 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| q-skeleton 内置 | vue-content-loader (SVG) | q-skeleton 已内置，无需额外依赖，且自带 pulse/wave 动画 |
| CSS 变量暗色方案 | Quasar `$q.dark.isActive` 三元表达式 | CSS 变量更高效（一次声明，全局生效），三元表达式适合少量特殊场景 |
| localStorage 手动读写 | Quasar LocalStorage plugin | 手动读写更简单直接，Quasar plugin 增加不必要抽象 |

**Installation:** 无需安装新依赖。Phase 5 完全使用已有技术栈。


## Architecture Patterns

### System Architecture Diagram

```
用户请求 (Browser)
    │
    ├─ 页面加载 ──→ App.vue onMounted
    │                  │
    │                  ├─ 读取 localStorage('oa-dark-mode')
    │                  └─ $q.dark.set(value) ──→ body--dark class 切换
    │                                              │
    │                                              └─ CSS 变量自动切换
    │                                                 (--oa-bg, --oa-surface, ...)
    │
    ├─ 路由导航 ──→ router-view v-slot
    │                  │
    │                  └─ <transition name="fade" mode="out-in">
    │                       └─ <component :is="Component" />
    │
    ├─ 布局判断 ──→ $q.screen.gt.sm (≥1024px?)
    │                  │
    │                  ├─ true  → PC 布局: 固定 Drawer + 顶栏
    │                  └─ false → Mobile 布局: 底部 Tab + overlay Drawer + FAB
    │
    ├─ 数据加载 ──→ 各页面 onMounted
    │                  │
    │                  ├─ loading=true → 骨架屏 (q-skeleton)
    │                  ├─ API 响应 → 数据态 / 空态 (EmptyState)
    │                  └─ 错误 → 错误态
    │
    └─ Dashboard ──→ GET /api/v1/dashboard/stats
                       │
                       └─ { userCount, departmentCount, roleCount }
```

### Recommended Project Structure

```
frontend/src/
├── layouts/
│   └── MainLayout.vue          # PC/Mobile 双布局（改造主战场）
├── pages/
│   ├── LoginPage.vue            # 美化：渐变背景+装饰圆+居中卡片
│   ├── DashboardPage.vue        # 重构：欢迎词+统计卡片+快捷操作
│   ├── UserPage.vue             # 适配：断点统一+底部 Sheet 筛选+全屏弹窗
│   ├── DepartmentPage.vue       # 适配：全屏弹窗+骨架屏
│   ├── RolePage.vue             # 适配：移动端单栏切换+全屏弹窗
│   ├── ForbiddenPage.vue        # 美化：错误码+描述+返回按钮
│   └── NotFoundPage.vue         # 美化：错误码+描述+返回按钮
├── components/
│   └── EmptyState.vue           # 新增：统一空态组件
├── boot/
│   ├── axios.ts                 # 已有
│   ├── perm.ts                  # 已有
│   └── dark-mode.ts             # 新增：暗色模式初始化 boot 文件
├── css/
│   ├── quasar.variables.scss    # 已有，不变
│   └── app.scss                 # 扩展：新增 CSS 变量 + 动画 + 骨架屏色
├── stores/
│   └── auth.ts                  # 已有，不变
└── router/
    ├── routes.ts                # 已有，不变
    └── index.ts                 # 改造：router-view 过渡在 MainLayout 中实现
```


### Pattern 1: 断点统一策略 (D-01)

**What:** Quasar Screen plugin 默认断点值 [VERIFIED: Context7 /quasarframework/quasar + WebSearch 交叉验证]

| Token | Min Width | Range |
|-------|-----------|-------|
| xs | 0px | 0 ~ 599px |
| sm | 600px | 600 ~ 1023px |
| md | 1024px | 1024 ~ 1439px |
| lg | 1440px | 1440 ~ 1919px |
| xl | 1920px | 1920px+ |

**Screen plugin `gt`/`lt` 语义（关键）：**

| Property | 含义 | 等效条件 |
|----------|------|---------|
| `$q.screen.gt.xs` | 大于 xs 范围 | `width >= 600` |
| `$q.screen.gt.sm` | 大于 sm 范围 | `width >= 1024` |
| `$q.screen.gt.md` | 大于 md 范围 | `width >= 1440` |
| `$q.screen.lt.md` | 小于 md 范围 | `width < 1024` |
| `$q.screen.lt.lg` | 小于 lg 范围 | `width < 1440` |

**关键发现：** `$q.screen.gt.sm` 的含义是"大于 sm 范围上界(1023px)"，即 `width >= 1024px`。这恰好与 D-01 的 1024px 分界线完全吻合。当前代码中 `$q.screen.gt.sm` 和 `$q.screen.lt.md` 的断点值都是 1024px，语义已经正确。[VERIFIED: Quasar 官方文档 + WebSearch 多源交叉验证]

**当前代码分析：**
- `MainLayout.vue` 使用 `$q.screen.gt.sm`（PC 判断 = width >= 1024）和 `$q.screen.lt.md`（Mobile 判断 = width < 1024）— 断点值正确
- `UserPage.vue` 使用 `$q.screen.gt.sm`（表格/卡片切换 = width >= 1024）— 断点值正确
- 问题不在断点值，而在调用方式分散（直接在 template 中写 `$q.screen.gt.sm`），需要统一封装

**推荐方案：** 封装为 composable，统一调用入口，提高可读性和可维护性：

**Example:**
```typescript
// composables/useResponsive.ts（建议新增）
import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useResponsive() {
  const $q = useQuasar();
  // $q.screen.gt.sm === (width >= 1024)，与 D-01 完全对齐
  const isDesktop = computed(() => $q.screen.gt.sm);
  const isMobile = computed(() => $q.screen.lt.md);
  return { isDesktop, isMobile };
}
```

**当前代码需修改的位置（语义不变，仅提取为 composable）：**

| 文件 | 行号 | 当前代码 | 修改为 |
|------|------|---------|--------|
| MainLayout.vue | L22 | `v-if="$q.screen.gt.sm"` | `v-if="isDesktop"` |
| MainLayout.vue | L44 | `v-if="$q.screen.lt.md"` | `v-if="isMobile"` |
| UserPage.vue | L60 | `v-if="$q.screen.gt.sm"` | `v-if="isDesktop"` |

[VERIFIED: grep 全仓扫描确认仅 3 处断点判断]


### Pattern 2: 暗色模式持久化 (D-08)

**What:** 使用 Quasar Dark plugin + localStorage 实现暗色模式持久化
**When to use:** 应用启动时（boot 文件）和用户切换时

**初始化时机选择：**
- `App.vue onMounted` — 组件挂载后执行，可能有 FOUC（闪烁）
- `boot 文件` — Quasar boot 系统在 app 创建前执行，更早 ✅

**推荐：创建 `boot/dark-mode.ts` 并注册到 `quasar.config.cjs`**

**Example:**
```typescript
// boot/dark-mode.ts
import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';

export default boot(() => {
  const saved = localStorage.getItem('oa-dark-mode');
  if (saved !== null) {
    Dark.set(saved === 'true');
  } else {
    Dark.set('auto'); // 首次访问跟随系统偏好
  }
});
```

```typescript
// 切换时持久化（MainLayout.vue / overlay Drawer）
function toggleDark() {
  $q.dark.toggle();
  localStorage.setItem('oa-dark-mode', String($q.dark.isActive));
}
```

**quasar.config.cjs 修改：**
```javascript
boot: ['axios', 'perm', 'dark-mode'],
```

**FOUC 防护：** boot 文件在 Vue app 创建前执行，`Dark.set()` 会立即给 `<body>` 添加 `body--dark` class，在首次渲染前完成，不会闪烁。[VERIFIED: Context7 Quasar Dark plugin docs]

**当前 quasar.config.cjs 已有 `dark: 'auto'`（L29），boot 文件的 `Dark.set()` 会覆盖此配置，两者不冲突。**

### Pattern 3: 硬编码颜色排查结果 (D-09)

**What:** 全仓 grep 扫描发现的所有硬编码颜色 class
**Source:** [VERIFIED: grep 全仓扫描]

| # | 文件 | 行号 | 硬编码 | 替换方案 |
|---|------|------|--------|---------|
| 1 | MainLayout.vue | L2 | `bg-grey-2`（三元） | 移除，`q-page` 已有 `var(--oa-bg)` |
| 2 | MainLayout.vue | L4 | `text-white`（header） | 保留 — header `bg-primary` 上的白色文字是语义正确的 |
| 3 | MainLayout.vue | L44 | `bg-white text-grey-9`（footer） | → `style="background: var(--oa-surface); color: var(--oa-text-primary)"` |
| 4 | DashboardPage.vue | L7 | `text-grey` | → `style="color: var(--oa-text-secondary)"` |
| 5 | DashboardPage.vue | L13 | `text-grey` | → 同上 |
| 6 | DepartmentPage.vue | L25 | `text-grey-6` | → `style="color: var(--oa-text-secondary)"` |
| 7 | ForbiddenPage.vue | L6 | `text-grey-6` | → `style="color: var(--oa-text-tertiary)"` |
| 8 | NotFoundPage.vue | L6 | `text-grey-6` | → 同上 |
| 9 | LoginPage.vue | L8 | `text-grey` | → `style="color: var(--oa-text-secondary)"` |
| 10 | LoginPage.vue | L24 | `text-grey` | → 同上 |
| 11 | RolePage.vue | L11 | `bg-white` | → `style="background: var(--oa-surface)"` |
| 12 | RolePage.vue | L17 | `bg-blue-1` | → `style="background: var(--oa-hover)"` |
| 13 | UserPage.vue | L53 | `text-grey-6` | → `style="color: var(--oa-text-secondary)"` |
| 14 | UserPage.vue | L96 | `text-grey` | → `style="color: var(--oa-text-secondary)"` |
| 15 | DepartmentPage.vue | L22 | `color="grey-4"`（空态图标） | → `style="color: var(--oa-text-tertiary)"` |
| 16 | UserPage.vue | L51 | `color="grey-4"`（空态图标） | → 同上 |

**保留不改的：**
- `bg-primary text-white`（header）— 品牌色上的白色文字，暗色模式下 primary 色不变
- `color="primary"` / `color="positive"` / `color="negative"` — Quasar 语义色，自动适配暗色
- `text-primary` — Quasar 语义色，自动适配


### Pattern 4: 移动端全屏弹窗 (D-07)

**What:** 在移动端将标准 q-dialog 切换为全屏模式
**Example:**
```vue
<!-- 动态 maximized：移动端全屏，PC 端标准 -->
<q-dialog
  v-model="dialog"
  :maximized="isMobile"
  :transition-show="isMobile ? 'slide-up' : 'scale'"
  :transition-hide="isMobile ? 'slide-down' : 'scale'"
>
  <q-card :style="isMobile ? '' : 'min-width: 400px'">
    <!-- 移动端全屏时显示关闭栏 -->
    <q-bar v-if="isMobile">
      <q-space />
      <q-btn dense flat icon="close" v-close-popup />
    </q-bar>
    <q-card-section class="text-h6">{{ title }}</q-card-section>
    <!-- ... -->
  </q-card>
</q-dialog>
```
[VERIFIED: Context7 QDialog maximized + transition-show docs]

### Pattern 5: 底部 Sheet 筛选 (D-06)

**What:** UserPage 移动端筛选栏折叠为底部 Sheet
**Example:**
```vue
<q-dialog v-model="filterSheet" position="bottom">
  <q-card style="width: 100%; border-radius: 16px 16px 0 0">
    <!-- 拖拽条 -->
    <div class="flex flex-center q-pt-sm q-pb-xs">
      <div style="width: 40px; height: 4px; border-radius: 2px; background: var(--oa-border)"></div>
    </div>
    <q-card-section class="q-gutter-md">
      <q-input v-model="keyword" outlined dense label="搜索" />
      <q-select v-model="deptFilter" :options="deptOptions" label="部门" outlined dense clearable />
      <q-btn-toggle v-model="statusFilter" :options="statusOptions" />
    </q-card-section>
    <q-card-actions>
      <q-btn flat label="重置筛选" @click="resetFilters" />
      <q-space />
      <q-btn color="primary" label="应用筛选" @click="applyFilters" v-close-popup />
    </q-card-actions>
  </q-card>
</q-dialog>
```
[VERIFIED: Context7 QDialog position="bottom" docs]

### Pattern 6: 页面切换 Fade 过渡 (D-14)

**What:** 在 MainLayout 的 router-view 上包裹 Vue transition
**Example:**
```vue
<!-- MainLayout.vue 中 -->
<q-page-container>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</q-page-container>
```

```scss
// app.scss 中新增
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```
[VERIFIED: Vue 3 transition + router-view v-slot 是官方推荐模式]

### Pattern 7: 骨架屏 (D-14)

**What:** 使用 q-skeleton 组件在数据加载时显示占位
**Example:**
```vue
<!-- 表格骨架屏 -->
<div v-if="loading" class="q-gutter-sm">
  <q-skeleton type="rect" height="40px" />
  <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" />
</div>

<!-- 卡片骨架屏 -->
<q-card v-for="i in 3" :key="i" flat bordered class="q-mb-sm">
  <q-card-section>
    <q-skeleton type="text" width="60%" />
    <q-skeleton type="text" width="40%" class="q-mt-xs" />
    <q-skeleton type="text" width="40%" class="q-mt-xs" />
  </q-card-section>
</q-card>
```

**骨架屏颜色：** 使用 `var(--oa-skeleton)` CSS 变量（UI-SPEC 已定义），通过 `style` 属性或自定义 class 覆盖 Quasar 默认色。
[VERIFIED: Context7 QSkeleton type/animation props]


### Pattern 8: RolePage 移动端单栏切换 (D-05)

**What:** 移动端用 `v-if` 切换角色列表视图和权限分配视图
**Example:**
```vue
<template>
  <q-page padding>
    <!-- 移动端：单栏切换 -->
    <template v-if="isMobile">
      <!-- 权限视图 -->
      <div v-if="mobileView === 'permissions' && selected">
        <div class="row items-center q-mb-md">
          <q-btn flat icon="arrow_back" label="返回角色列表" @click="mobileView = 'list'" />
        </div>
        <div class="text-h6 q-mb-md">{{ selected.name }} 的权限</div>
        <!-- 权限 checkbox 区域 -->
      </div>
      <!-- 角色列表视图 -->
      <div v-else>
        <!-- 角色列表 -->
      </div>
    </template>

    <!-- PC 端：双栏布局（保持现有） -->
    <div v-else class="row q-gutter-md">
      <!-- 左栏角色列表 + 右栏权限分配 -->
    </div>
  </q-page>
</template>

<script setup>
const mobileView = ref<'list' | 'permissions'>('list');

function selectRole(r: any) {
  selected.value = r;
  checkedIds.value = r.permissions.map((p: any) => p.permission.id);
  if (isMobile.value) {
    mobileView.value = 'permissions';
  }
}
</script>
```

### Pattern 9: Dashboard 统计接口 (D-16)

**What:** 后端新增 `/dashboard/stats` 接口
**发现：** 后端当前无 dashboard 模块，需新增。[VERIFIED: grep 全仓扫描无 dashboard/stats]

**后端实现：**
```typescript
// backend/src/modules/dashboard/dashboard.route.ts
import { Elysia } from 'elysia';
import { prisma } from '../../utils/prisma';
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

**注册到 index.ts：**
```typescript
import { dashboardModule } from './modules/dashboard/dashboard.route';
// .group('/api/v1', (app) => app.use(...).use(dashboardModule))
```

**前端调用：**
```typescript
const stats = ref({ userCount: 0, departmentCount: 0, roleCount: 0 });
const statsLoading = ref(true);
const statsError = ref(false);

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

### Pattern 10: EmptyState 公共组件 (D-17)

**What:** 抽取统一空态组件，替换各页面内联空态
**Example:**
```vue
<!-- components/EmptyState.vue -->
<template>
  <div class="flex flex-center q-pa-xl">
    <div class="text-center">
      <q-icon :name="icon" size="64px" style="color: var(--oa-text-tertiary)" />
      <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
        {{ title }}
      </div>
      <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
        {{ description }}
      </div>
      <q-btn
        v-if="ctaText"
        color="primary"
        :label="ctaText"
        class="q-mt-md"
        @click="$emit('action')"
      />
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

### Anti-Patterns to Avoid

- **混用断点 API：** 不要在同一项目中混用 `$q.screen.gt.sm`、`$q.screen.lt.md`、`$q.screen.width >= 1024`。统一使用 composable `useResponsive()` 返回的 `isDesktop` / `isMobile`。
- **硬编码颜色 class 在暗色模式下：** `bg-white` 在暗色模式下仍然是白色，造成白块。必须使用 CSS 变量。
- **在 template 中直接写 `$q.screen.width >= 1024`：** 冗长且不可维护。封装为 composable。
- **骨架屏闪烁：** 数据加载极快时骨架屏一闪而过，体验差。可设置最小展示时长 300ms（但本项目数据量小，暂不需要）。


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 断点检测 | 手写 `window.addEventListener('resize')` | Quasar `$q.screen` (已内置 debounce) | 自带 100ms debounce、SSR 兼容、响应式 ref |
| 暗色模式切换 | 手写 CSS class toggle + media query 监听 | Quasar `$q.dark` plugin | 自动管理 `body--dark` class、支持 'auto' 模式 |
| 骨架屏 | 手写 CSS placeholder 动画 | `q-skeleton` 组件 | 内置 pulse/wave/fade/blink 动画、多种 type |
| 全屏弹窗 | 手写 fixed 定位 + z-index 管理 | `q-dialog maximized` prop | 自动处理滚动锁定、过渡动画、backdrop |
| 底部 Sheet | 手写 bottom-fixed panel + 手势 | `q-dialog position="bottom"` | 自动处理 backdrop、关闭行为、过渡 |
| FAB 按钮定位 | 手写 `position: fixed` + 避让 footer | `q-page-sticky` | 自动避让 header/footer/drawer |
| 页面过渡动画 | 手写 JS 动画 | Vue `<transition>` + CSS | 声明式、与 router-view 完美集成 |

**Key insight:** Quasar 2 已内置了 Phase 5 所需的全部 UI 能力（Screen, Dark, QSkeleton, QDialog, QPageSticky），无需引入任何新依赖。

## Common Pitfalls

### Pitfall 1: FOUC（Flash of Unstyled Content）暗色模式闪烁
**What goes wrong:** 页面先以亮色渲染，然后 JS 执行后切换为暗色，用户看到白屏闪烁
**Why it happens:** 暗色模式初始化在 Vue 组件 `onMounted` 中执行，此时 DOM 已渲染
**How to avoid:** 使用 Quasar boot 文件初始化暗色模式（在 app 创建前执行）；`quasar.config.cjs` 中 `dark: 'auto'` 也会在框架初始化时生效
**Warning signs:** 页面刷新时看到短暂白屏

### Pitfall 2: 断点切换时的布局抖动
**What goes wrong:** 窗口宽度在 1024px 附近时，PC/Mobile 布局频繁切换导致抖动
**Why it happens:** `$q.screen` 的 resize 事件 debounce 默认 100ms，但布局切换本身可能触发 reflow
**How to avoid:** 使用 `v-show` 替代 `v-if` 做布局切换（保留 DOM 避免重建）；或接受 `v-if` 但确保切换时无数据重新加载
**Warning signs:** 拖动浏览器窗口到 1024px 附近时页面闪烁

### Pitfall 3: 移动端 hover 状态 stuck
**What goes wrong:** 触摸设备上 `:hover` 样式在点击后不消失，卡片/按钮保持高亮
**Why it happens:** 触摸事件触发 hover 伪类，但没有 mouseout 事件来清除
**How to avoid:** 使用 `@media (hover: hover)` 包裹 hover 样式；Quasar 的 `v-ripple` 指令已处理触摸反馈
**Warning signs:** 移动端点击卡片后背景色不恢复

### Pitfall 4: 底部 Tab 栏遮挡内容
**What goes wrong:** 页面底部内容被固定的底部 Tab 栏遮挡
**Why it happens:** `q-footer` 是固定定位，但 `q-page-container` 的 padding-bottom 可能不够
**How to avoid:** Quasar 的 `q-layout` 系统自动处理 footer 高度补偿，确保使用 `q-page-container` 包裹内容
**Warning signs:** 列表最后一项被底部栏遮挡

### Pitfall 5: q-dialog maximized 在 PC 端误触发
**What goes wrong:** PC 端弹窗也变成全屏
**Why it happens:** `:maximized="isMobile"` 的 `isMobile` 在弹窗打开后窗口缩小时变化
**How to avoid:** 在打开弹窗时捕获当前 `isMobile` 值，或接受动态切换（Quasar 支持运行时切换 maximized）
**Warning signs:** 调整窗口大小时弹窗突然全屏/取消全屏

### Pitfall 6: CSS 变量在 q-chip/q-badge 等组件上不生效
**What goes wrong:** Quasar 组件的 `color` prop 使用内部颜色系统，不受 CSS 变量影响
**Why it happens:** `color="grey-4"` 是 Quasar 内部颜色映射，不走 CSS 变量
**How to avoid:** 对需要暗色适配的组件，使用 `class` + CSS 变量替代 `color` prop；或使用 Quasar 语义色（positive/negative/primary）
**Warning signs:** 暗色模式下 chip/badge 颜色不变


## Code Examples

### 登录页美化 (D-15)

```vue
<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="login-page row items-center justify-center">
        <!-- 装饰圆（CSS 实现，非 SVG） -->
        <div class="login-decor login-decor--1"></div>
        <div class="login-decor login-decor--2"></div>

        <q-card class="login-card q-pa-lg" style="width: 400px; max-width: 90vw; border-radius: 12px; z-index: 1">
          <q-card-section class="text-center">
            <div style="font-size: 24px; font-weight: 600; color: var(--oa-text-primary)">OA 管理系统</div>
            <div class="q-mt-xs" style="font-size: 14px; color: var(--oa-text-secondary)">请使用您的账号登录</div>
          </q-card-section>
          <!-- 表单内容 -->
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%);
  position: relative;
  overflow: hidden;
}
.body--dark .login-page {
  background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #3730A3 100%);
}
.login-decor {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  background: white;
}
.login-decor--1 {
  width: 400px; height: 400px;
  top: -100px; right: -100px;
}
.login-decor--2 {
  width: 300px; height: 300px;
  bottom: -80px; left: -80px;
}
</style>
```

### 403/404 错误页美化 (D-17)

```vue
<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center" style="min-height: 100vh; background: var(--oa-bg)">
        <div class="text-center">
          <div style="font-size: 120px; font-weight: 600; line-height: 1; color: var(--oa-text-tertiary)">
            403
          </div>
          <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
            无权限访问
          </div>
          <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
            您没有权限访问此页面，请联系管理员
          </div>
          <q-btn color="primary" label="返回首页" to="/" class="q-mt-lg" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
```

### Dashboard 统计卡片 (D-16)

```vue
<template>
  <q-page padding>
    <div style="font-size: 24px; font-weight: 600; color: var(--oa-text-primary)" class="q-mb-lg">
      欢迎回来, {{ auth.user?.realName }}
    </div>

    <!-- 统计卡片 -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card v-for="item in statCards" :key="item.label" class="col-12 col-sm"
              flat bordered style="border-radius: 8px">
        <q-card-section>
          <div class="row items-center q-gutter-sm">
            <q-icon :name="item.icon" size="32px" color="primary" />
            <div>
              <div style="font-size: 14px; color: var(--oa-text-secondary)">{{ item.label }}</div>
              <div v-if="statsLoading">
                <q-skeleton type="text" width="60px" />
              </div>
              <div v-else style="font-size: 24px; font-weight: 600; color: var(--oa-text-primary)">
                {{ item.value }}
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 快捷操作 -->
    <div style="font-size: 16px; font-weight: 600; color: var(--oa-text-primary)" class="q-mb-md">
      快捷操作
    </div>
    <div class="row q-gutter-sm">
      <q-btn v-for="action in quickActions" :key="action.to"
             outline color="primary" :icon="action.icon" :label="action.label"
             :to="action.to" />
    </div>
  </q-page>
</template>
```

### 移动端 overlay Drawer (D-02, D-12)

```vue
<!-- MainLayout.vue 中 -->
<!-- PC 端固定 Drawer -->
<q-drawer v-if="isDesktop" v-model="drawerOpen" show-if-above bordered :width="220">
  <!-- 导航菜单 -->
</q-drawer>

<!-- 移动端 overlay Drawer -->
<q-drawer v-else v-model="mobileDrawerOpen" overlay bordered :width="280">
  <q-list>
    <q-item v-for="link in navLinks" :key="link.to" :to="link.to"
            clickable v-close-popup @click="mobileDrawerOpen = false">
      <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
      <q-item-section>{{ link.title }}</q-item-section>
    </q-item>
  </q-list>
  <q-space />
  <!-- 底部用户信息 -->
  <div class="q-pa-md" style="border-top: 1px solid var(--oa-border)">
    <div class="row items-center q-gutter-sm">
      <q-avatar size="36px" color="primary" text-color="white">
        {{ auth.user?.realName?.charAt(0) }}
      </q-avatar>
      <div>
        <div style="font-size: 14px; font-weight: 600">{{ auth.user?.realName }}</div>
        <div style="font-size: 12px; color: var(--oa-text-secondary)">{{ auth.user?.roles.join(', ') }}</div>
      </div>
    </div>
    <div class="row q-mt-md q-gutter-sm">
      <q-btn flat dense icon="dark_mode" @click="toggleDark" />
      <q-space />
      <q-btn flat dense icon="logout" label="退出" @click="logout" />
    </div>
  </div>
</q-drawer>
```


## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.matchMedia` 手动监听 | Quasar `$q.screen` 响应式 API | Quasar 2.0+ | 无需手动管理事件监听和清理 |
| CSS `@media (prefers-color-scheme)` 手动管理 | Quasar `Dark.set('auto')` | Quasar 2.0+ | 自动跟随系统偏好 |
| Vue 2 `<transition>` + `<keep-alive>` 嵌套 | Vue 3 `<router-view v-slot>` + `<transition>` | Vue 3.0 | 更清晰的 slot API |
| 自定义 loading placeholder | `q-skeleton` 组件 | Quasar 2.0+ | 内置多种 type 和动画 |

**Deprecated/outdated:**
- Quasar 1.x 的 `this.$q.screen` 选项式 API — 仍可用但推荐 `useQuasar()` composable
- `<transition-group>` 用于列表动画 — 本项目不需要列表项动画

## Project Constraints (from CLAUDE.md)

- 语言偏好：对话和代码注释使用中文
- 网络请求偏好：优先使用 Tavily 而非 WebFetch
- 遵循 SOLID、DRY、KISS、YAGNI 原则
- 不添加超出需求范围的功能

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 后端 authGuard 中间件可直接复用于 dashboard 模块 | Pattern 9 | 低 — 如果 authGuard 签名不同，需调整 import 路径 |
| A2 | `prisma.user.count()` / `department.count()` / `role.count()` 可直接使用 | Pattern 9 | 低 — Prisma schema 已有这些 model（Phase 3/4 已建） |
| A3 | Quasar `q-layout` 系统自动处理 footer 高度补偿 | Pitfall 4 | 低 — Quasar 官方文档明确说明此行为 |
| A4 | `body--dark` class 下 CSS 变量自动切换 | Pattern 2 | 低 — app.scss 已有 `.body--dark` 选择器定义暗色变量 |

## Open Questions

1. **后端 authGuard 的确切导入路径**
   - What we know: Phase 3/4 已实现 JWT 鉴权中间件
   - What's unclear: 中间件的确切文件路径和导出名称
   - Recommendation: 实现时 grep `authGuard` 或 `auth.guard` 确认

2. **Dashboard 统计是否需要权限控制**
   - What we know: Dashboard 是所有登录用户可见的首页
   - What's unclear: 统计数据（用户数/部门数/角色数）是否对非 ADMIN 用户敏感
   - Recommendation: 所有登录用户均可查看统计数字（仅数量，不含详情），无需额外权限

3. **移动端底部 Tab 栏的菜单项是否需要权限过滤**
   - What we know: PC 端 Drawer 菜单已有权限过滤（Phase 4 D-14 MainLayout 菜单过滤）
   - What's unclear: 底部 Tab 栏是否复用同一过滤逻辑
   - Recommendation: 复用 — 底部 Tab 和 Drawer 菜单使用同一 `navLinks` computed 属性


## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 无 — 当前项目未安装任何测试框架 |
| Config file | none — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-6.1 | `width >= 1024` 时 isDesktop 为 true | unit | `npx vitest run tests/composables/useResponsive.test.ts -t "isDesktop"` | ❌ Wave 0 |
| FR-6.2 | `width < 1024` 时 isMobile 为 true | unit | `npx vitest run tests/composables/useResponsive.test.ts -t "isMobile"` | ❌ Wave 0 |
| FR-6.3 | UserPage 移动端渲染卡片而非表格 | unit | `npx vitest run tests/pages/UserPage.test.ts -t "mobile card"` | ❌ Wave 0 |
| D-08 | 暗色模式 localStorage 持久化 | unit | `npx vitest run tests/boot/dark-mode.test.ts` | ❌ Wave 0 |
| D-09 | 无硬编码颜色 class 残留 | lint/grep | `grep -rn "bg-white\|bg-grey\|text-grey[^-]" frontend/src/ --include="*.vue"` | ✅ 可直接运行 |
| NFR-1 | Dashboard stats 接口 < 500ms | manual | 手动验证 — 需要运行后端 | manual-only |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`（如已安装）
- **Per wave merge:** `npx vitest run`
- **Phase gate:** 全部测试通过 + 硬编码颜色 grep 扫描为空

### Wave 0 Gaps
- [ ] 安装 vitest + @vue/test-utils: `npm install -D vitest @vue/test-utils @vitejs/plugin-vue jsdom`
- [ ] 创建 `vitest.config.ts` — 配置 jsdom 环境 + Quasar 插件
- [ ] `tests/composables/useResponsive.test.ts` — 覆盖 FR-6.1, FR-6.2
- [ ] `tests/boot/dark-mode.test.ts` — 覆盖 D-08
- [ ] `tests/pages/UserPage.test.ts` — 覆盖 FR-6.3（模拟 `$q.screen.width`）

**注意：** Quasar 组件测试需要 `installQuasarPlugin` 辅助函数来初始化 Quasar 插件环境。可参考 `@quasar/quasar-app-extension-testing-unit-vitest` 但该扩展可能版本不匹配，建议手动配置。[ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 全部 | ✓ | v22.20.0 | — |
| Quasar CLI | 前端构建 | ✓ | @quasar/app-vite 1.11.0 | — |
| Vitest | 单元测试 | ✗ | — | 安装: `npm install -D vitest` |
| Prisma | 后端 ORM | ✓ | 已安装 | — |
| Elysia | 后端框架 | ✓ | 已安装 | — |

**Missing dependencies with no fallback:** 无

**Missing dependencies with fallback:**
- Vitest — 需安装，Wave 0 任务

## Sources

### Primary (HIGH confidence)
- Context7 `/quasarframework/quasar` — Screen plugin breakpoints, Dark plugin API, QSkeleton, QDialog, QPageSticky
- 项目源码 grep 扫描 — 断点使用位置、硬编码颜色位置、后端模块结构
- `npm ls` — 已安装包版本确认

### Secondary (MEDIUM confidence)
- Vue 3 官方文档 — `<transition>` + `<router-view v-slot>` 模式
- Quasar 官方文档 — boot 文件执行时机

### Tertiary (LOW confidence)
- 无

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部使用已安装依赖，版本已验证
- Architecture: HIGH — 基于 Quasar 官方 API 和已有代码结构
- Pitfalls: HIGH — 基于 Quasar 文档和前端响应式开发通用经验
- 硬编码颜色清单: HIGH — grep 全仓扫描，逐行确认

**Research date:** 2026-04-20
**Valid until:** 2026-05-20（Quasar 2.x 稳定期，30 天内不会有破坏性变更）

