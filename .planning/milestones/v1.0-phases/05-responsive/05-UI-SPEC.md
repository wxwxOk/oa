---
phase: 5
slug: responsive
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-20
---

# Phase 5 — UI Design Contract

> 响应式体验（PC/Mobile 双布局、暗色模式完善、UI/UX 美化）的视觉与交互契约。由 gsd-ui-researcher 生成，gsd-ui-checker 验证。
> 继承 Phase 3 UI-SPEC 的设计系统基础，本文档仅声明 Phase 5 新增/变更的契约。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none（Quasar 项目，不使用 shadcn） |
| Preset | not applicable |
| Component library | Quasar 2（继承 Phase 3，新增 q-skeleton, q-bottom-sheet, q-slide-transition） |
| Icon library | @quasar/extras material-icons（继承） |
| Font stack | 继承 Phase 3（中文优先字体栈） |
| Quasar plugins | Notify, Dialog, LoadingBar（继承） |
| Dark mode | localStorage 持久化 + 启动时读取（D-08） |
| Responsive breakpoint | 统一 `$q.screen.gt.sm`（>=1024px，D-01） |

---

## Breakpoint Map

| Token | Width | Layout | Source |
|-------|-------|--------|--------|
| `lt.md` (即 !gt.sm) | < 1024px | Mobile：底部 Tab + overlay Drawer + 全屏弹窗 | D-01 |
| `gt.sm` | >= 1024px | PC：固定侧边 Drawer + 顶部栏 + 标准弹窗 | D-01 |

断点判断统一规则：
- PC 判断：`$q.screen.gt.sm`（Quasar md 断点 = 1024px，gt.sm 即 width >= 1024）
- Mobile 判断：`!$q.screen.gt.sm`
- 统一使用 useResponsive() composable（内部使用 $q.screen.gt.sm）。Quasar 断点命名: sm=600, md=1024, lg=1440, xl=1920。gt.sm 即 >=1024px。

---

## Spacing Scale

继承 Phase 3 间距体系，新增以下例外：

| Token | Value | Quasar Class | Usage |
|-------|-------|-------------|-------|
| xs | 4px | `q-pa-xs` | 图标间距、行内紧凑 |
| sm | 8px | `q-pa-sm` / `q-gutter-sm` | 表单字段间距、卡片内紧凑间距 |
| md | 16px | `q-pa-md` / `q-gutter-md` | 页面默认间距、Dashboard 卡片内边距 |
| lg | 24px | `q-pa-lg` | 区块间距、Dashboard 卡片间距 |
| xl | 32px | `q-pa-xl` | 空态区域内边距 |
| 2xl | 48px | `style="padding: 48px"` | 登录页卡片内边距（PC） |
| 3xl | 64px | `style="padding: 64px"` | 登录页顶部留白（PC） |

新增例外：
- 移动端底部 Tab 栏高度：56px（Quasar 默认 q-tabs dense）
- 移动端 overlay Drawer 宽度：280px
- 移动端全屏弹窗：无额外 padding，使用 `q-pa-md`（16px）
- Dashboard 统计卡片最小高度：120px
- 底部 Sheet 圆角顶部：16px（`border-radius: 16px 16px 0 0`）

---

## Typography

### Core Type Scale（4 sizes, 2 weights）

继承 Phase 3 字体体系，精简为 4 级核心字阶 + 2 个字重：

| Role | Size | Weight | Line Height | Quasar 映射 |
|------|------|--------|-------------|------------|
| Heading (页面标题/区块标题/对话框标题) | 20px | 600 | 1.2 | 覆盖 `text-h6` |
| Body (正文) | 16px | 400 | 1.5 | Quasar 默认 |
| Label (标签/辅助正文) | 14px | 400 | 1.5 | `text-body2` |
| Caption (辅助/注释) | 12px | 400 | 1.5 | `text-caption` |

字重限制：仅使用 400（regular）和 600（semibold），全项目禁止使用 700。

### Display Overrides（单用途，不属于可复用字阶）

以下尺寸仅限声明的特定场景使用，不得在其他上下文复用：

| Size | Weight | Line Height | Scope | Justification |
|------|--------|-------------|-------|---------------|
| 32px | 600 | 1.0 | Dashboard 统计数字（DashboardPage 统计卡片内的数值展示） | 大数字需要视觉冲击力，与 14px 统计标签形成层级对比 |
| 72px | 600 | 1.0 | 403/404 错误码显示（ErrorPage 错误码数字） | 错误页核心视觉元素，需极大尺寸传达"此页异常"信号 |

### Phase 5 各场景字体映射

| 场景 | 映射到 | 具体规格 |
|------|--------|---------|
| H1 页面标题（原 28px） | Core: Heading | 20px / 600 / 1.2 |
| H2 区块标题/对话框标题 | Core: Heading | 20px / 600 / 1.2 |
| Dashboard 欢迎词（原 24px） | Core: Heading | 20px / 600 / 1.2 |
| Dashboard 统计数字 | Display Override | 32px / 600 / 1.0 |
| Dashboard 统计标签 | Core: Label | 14px / 400 / 1.5 |
| 登录页品牌标题（原 28px/700） | Core: Heading | 20px / 600 / 1.2，`$primary` 色 |
| 登录页副标题 | Core: Label | 14px / 400 / 1.5，`var(--oa-text-secondary)` |
| 403/404 错误码 | Display Override | 72px / 600 / 1.0 |
| 403/404 描述文字 | Core: Body | 16px / 400 / 1.5 |
| 空态标题 | Core: Heading | 20px / 600 / 1.2 |
| 空态描述 | Core: Label | 14px / 400 / 1.5 |
| 底部 Tab 文字 | Core: Caption | 12px / 400 / 1.5 |

---

## Color

### 继承 Phase 3 色彩契约

所有 `--oa-*` CSS 变量和 Quasar SCSS 变量保持不变。

60/30/10 色彩分配确认：Phase 5 新增的页面和组件（Dashboard、登录页、错误页、底部 Tab 栏）均遵循 Phase 3 建立的 60% 主表面（`var(--oa-bg)` / `var(--oa-surface)`）、30% 次级表面（卡片、侧边栏、Tab 栏背景）、10% 强调色（`$primary` indigo，仅用于 CTA 按钮、选中态、品牌标题）的分配比例，无偏离。

### 暗色模式完善 — 硬编码色替换映射（D-09）

以下硬编码 class 必须替换为 dark-aware 等价物：

| 硬编码 Class | 替换为 | 说明 |
|-------------|--------|------|
| `bg-white` | `bg-surface`（自定义 class）或 `:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'"` | 卡片、列表背景 |
| `bg-grey-2` | `var(--oa-bg)` 或移除（q-page 已有背景色） | 布局背景 |
| `text-grey-9` | `var(--oa-text-primary)` 或 Quasar `text-on-background` | 主文字 |
| `text-grey-6` | `var(--oa-text-secondary)` | 辅助文字 |
| `text-grey-4` | `var(--oa-text-tertiary)` | 三级文字 |
| `text-grey` | `var(--oa-text-secondary)` | 通用灰色文字 |
| `bg-blue-1` | `var(--oa-hover)` | 角色列表选中态 |

### 新增 CSS 变量

```scss
:root {
  // 继承所有 Phase 3 变量，新增：
  --oa-surface-elevated: #FFFFFF;    // 弹起表面（卡片阴影层）
  --oa-skeleton: #E2E8F0;            // 骨架屏填充色
  --oa-tab-inactive: #94A3B8;        // 底部 Tab 未选中色
  --oa-login-gradient-start: #4F46E5; // 登录页渐变起始
  --oa-login-gradient-end: #6366F1;   // 登录页渐变结束
  --oa-stat-icon-bg: #EEF2FF;        // Dashboard 统计图标背景
}

.body--dark {
  --oa-surface-elevated: #1E293B;
  --oa-skeleton: #334155;
  --oa-tab-inactive: #64748B;
  --oa-login-gradient-start: #312E81;  // indigo-900
  --oa-login-gradient-end: #3730A3;    // indigo-800
  --oa-stat-icon-bg: #1E1B4B;         // indigo-950
}
```

### 底部 Tab 栏色彩（D-11）

| State | Color | Source |
|-------|-------|--------|
| 选中图标+文字 | `$primary`（#4F46E5 / #6366F1） | D-11 |
| 未选中图标+文字 | `var(--oa-tab-inactive)` | D-11 |
| Tab 栏背景 | `var(--oa-surface)` | D-10 |
| Tab 栏顶部边框 | `var(--oa-border)` | D-10 |

### 登录页色彩（D-15）

| Element | Light | Dark |
|---------|-------|------|
| 背景渐变 | `linear-gradient(135deg, #4F46E5, #6366F1)` | `linear-gradient(135deg, #312E81, #3730A3)` |
| 卡片背景 | `var(--oa-surface)` | `var(--oa-surface)` |
| 装饰圆形 | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.05)` |

---

## Radii & Elevation

继承 Phase 3，新增/变更：

| Element | Border Radius | Elevation | Notes |
|---------|--------------|-----------|-------|
| 统一卡片 | 8px | `shadow-2`（Quasar） | D-13 从 4px 升级到 8px |
| Dashboard 统计卡片 | 8px | `shadow-2` | D-16 |
| 底部 Sheet | 16px 16px 0 0 | `shadow-up-2` | D-06 顶部圆角 |
| 登录卡片 | 12px | `shadow-4` | D-15 更突出 |
| 移动端用户卡片 | 8px | `shadow-1` | 统一 D-13 |
| overlay Drawer | 0px | `shadow-4` | 覆盖层需要阴影 |
| 403/404 页面按钮 | 8px | none | 与卡片圆角统一 |
---

## Animation Contract (D-14)

所有动画遵循"轻量"原则（D-14），不使用弹跳或复杂缓动。

### 页面切换过渡

```vue
<!-- router-view 包裹 -->
<router-view v-slot="{ Component }">
  <transition name="fade" mode="out-in">
    <component :is="Component" />
  </transition>
</router-view>
```

```scss
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

| Property | Value |
|----------|-------|
| 过渡名称 | `fade` |
| 持续时间 | 200ms |
| 缓动函数 | `ease` |
| 模式 | `out-in`（旧页面先淡出，新页面再淡入） |

### 对话框动画

| 场景 | 动画 | 持续时间 | 缓动 |
|------|------|---------|------|
| PC 标准弹窗 | Quasar 默认 scale + fade | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 移动端全屏弹窗 | slide-up | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 底部 Sheet | slide-up from bottom | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

### 骨架屏动画

| Property | Value |
|----------|-------|
| 动画类型 | `q-skeleton` 内置 pulse |
| 脉冲周期 | 1.5s（Quasar 默认） |
| 填充色 | `var(--oa-skeleton)` |

### 按钮 Loading 状态

| Property | Value |
|----------|-------|
| 组件 | `q-btn :loading="true"` |
| Spinner | Quasar 内置 spinner（圆形） |
| 文字 | 隐藏，仅显示 spinner |
| 按钮宽度 | 保持不变（避免布局跳动） |

### 微交互（继承 Phase 3 + 新增）

| Interaction | Specification | Source |
|-------------|--------------|--------|
| 按钮点击 | `scale(0.98)` 100ms ease | Phase 3 继承 |
| 表格行 hover | `var(--oa-hover)` 150ms ease | Phase 3 继承 |
| Focus ring | `2px solid var(--oa-focus-ring)` offset 2px | Phase 3 继承 |
| 卡片 hover（Dashboard） | `translateY(-2px)` + `shadow-4` 200ms ease | 新增 |
| Tab 切换指示器 | Quasar 内置 indicator 滑动 | D-11 |
| Drawer overlay 背景 | `rgba(0,0,0,0.5)` fade 200ms | D-02 |

---

## Skeleton Screen Contract (D-14)

### UserPage 骨架屏

PC 端（表格骨架）：
- 5 行 x 6 列矩形骨架
- 每行高度 40px，列宽按表格列比例
- 顶部工具栏区域：1 个 200px 宽矩形（搜索框）+ 1 个 100px 宽矩形（按钮）

移动端（卡片骨架）：
- 3 张卡片骨架
- 每张卡片：1 行标题骨架（60% 宽）+ 2 行 caption 骨架（40% 宽）+ 右侧操作区骨架

### DepartmentPage 骨架屏

- 树形骨架：5 行缩进矩形
- 第 1 行全宽，第 2-3 行缩进 24px，第 4-5 行缩进 48px
- 每行高度 32px

### RolePage 骨架屏

PC 端：
- 左栏：4 行列表项骨架（每行 48px 高）
- 右栏：标题骨架 + 3 组 checkbox 骨架

移动端：
- 4 行列表项骨架

### Dashboard 骨架屏

- 欢迎词：1 行 40% 宽矩形
- 统计卡片：3 张卡片骨架（每张 120px 高）
- 快捷操作：4 个 80px 圆角矩形

---

## Layout Contracts

### MainLayout — PC 端（D-02）

```
┌─────────────────────────────────────────────┐
│  Header (bg-primary, 48px)                  │
│  [☰] [OA 管理系统]          [🌙] [👤 Name ▾]│
├──────────┬──────────────────────────────────┤
│ Drawer   │  <router-view>                   │
│ 220px    │  (q-page padding)                │
│ fixed    │                                  │
│ bordered │                                  │
│          │                                  │
│ 导航     │                                  │
│ 菜单项   │                                  │
└──────────┴──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Header 高度 | 48px（Quasar q-toolbar 默认） |
| Drawer 宽度 | 220px |
| Drawer 模式 | `show-if-above`（固定） |
| Drawer 边框 | `bordered`（右侧 1px `var(--oa-border)`） |
| 内容区 | `q-page padding`（16px） |

### MainLayout — Mobile 端（D-02, D-03, D-11, D-12）

```
┌─────────────────────────────┐
│ Header (bg-primary, 48px)   │
│ [☰] [OA 管理系统]   [🌙][👤]│
├─────────────────────────────┤
│                             │
│  <router-view>              │
│  (q-page padding)           │
│                             │
│                             │
├─────────────────────────────┤
│ Footer Tabs (56px)          │
│ [🏠首页][🏢部门][👥用户][🔒角色]│
└─────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Header | 精简：汉堡菜单 + 标题 + 暗色切换 + 用户头像（D-03） |
| Footer Tab 栏 | 56px 高，`var(--oa-surface)` 背景，顶部 `var(--oa-border)` 边框 |
| Tab 图标 | 24px material-icons |
| Tab 文字 | 12px，图标下方 |
| overlay Drawer | 280px 宽，从左侧滑入，背景遮罩 `rgba(0,0,0,0.5)` |

### overlay Drawer 内容（D-12）

```
┌──────────────────────┐
│ 导航菜单             │
│ ┌──────────────────┐ │
│ │ 🏠 首页          │ │
│ │ 🏢 部门管理      │ │
│ │ 👥 用户管理      │ │
│ │ 🔒 角色管理      │ │
│ └──────────────────┘ │
│                      │
│ ─────────────────── │
│ 用户信息             │
│ [👤] 张三            │
│      管理员          │
│                      │
│ [🌙 暗色模式] toggle │
│ [🚪 退出登录] 按钮   │
└──────────────────────┘
```

---

## Page-Specific Contracts

### LoginPage（D-15）

PC 端布局：
```
┌─────────────────────────────────────────────┐
│  渐变背景 (135deg, indigo-600 → indigo-500) │
│                                             │
│  ○ 装饰圆 (200px, 左上角偏移)               │
│  ○ 装饰圆 (150px, 右下角偏移)               │
│                                             │
│         ┌─────────────────┐                 │
│         │  OA 管理系统     │                 │
│         │  请使用您的账号登录│                │
│         │                 │                 │
│         │  [用户名]       │                 │
│         │  [密码    👁]   │                 │
│         │  [ 立即登录 ]   │                 │
│         │                 │                 │
│         │  默认: admin    │                 │
│         └─────────────────┘                 │
│                                             │
└─────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| 卡片宽度 | 400px（PC），`max-width: 90vw`（Mobile） |
| 卡片内边距 | 48px（PC），32px（Mobile） |
| 卡片圆角 | 12px |
| 卡片阴影 | `shadow-4` |
| 装饰圆形 | 2 个，`position: absolute`，`border-radius: 50%`，`background: rgba(255,255,255,0.1)` |
| 装饰圆 1 | 200px，`top: -60px; left: -60px` |
| 装饰圆 2 | 150px，`bottom: -40px; right: -40px` |
| 品牌标题 | 20px / 600 / `$primary` 色 |
| 副标题 | 14px / 400 / `var(--oa-text-secondary)` |
| 暗色切换 | 卡片右上角小按钮（`q-btn flat round dense icon="dark_mode"`） |

移动端：
- 渐变背景保持
- 装饰圆缩小 50%
- 卡片 `max-width: 90vw`，内边距 32px
- 其余不变

### DashboardPage（D-16）

```
┌─────────────────────────────────────────────┐
│ 👋 早上好，张三                              │
│ 欢迎回到 OA 管理系统                         │
│                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ 👥       │ │ 🏢       │ │ 🔒       │     │
│ │ 128      │ │ 12       │ │ 5        │     │
│ │ 用户总数  │ │ 部门总数  │ │ 角色总数  │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                             │
│ 快捷操作                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│ │新建用户 │ │新建部门 │ │角色管理 │ │个人信息 ││
│ └────────┘ └────────┘ └────────┘ └────────┘│
└─────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| 欢迎词 | "早上好/下午好/晚上好，{realName}"（按时段切换） |
| 副标题 | "欢迎回到 OA 管理系统" |
| 统计卡片布局 | PC: `row q-gutter-md`，3 列等宽；Mobile: 纵向堆叠 `col-12` |
| 统计卡片高度 | 120px min-height |
| 统计图标 | 48px 圆形背景（`var(--oa-stat-icon-bg)`），24px material-icon |
| 统计数字 | 32px / 600 / `var(--oa-text-primary)` |
| 统计标签 | 14px / 400 / `var(--oa-text-secondary)` |
| 快捷操作 | PC: 4 列 `row q-gutter-sm`；Mobile: 2x2 grid |
| 快捷操作卡片 | 80px 高，居中图标 + 文字，hover `translateY(-2px)` |
| 数据来源 | 后端接口 `GET /dashboard/stats`（返回 userCount, departmentCount, roleCount） |

时段判断逻辑：
- 06:00-12:00 → "早上好"
- 12:00-18:00 → "下午好"
- 18:00-06:00 → "晚上好"

### UserPage 移动适配（D-06, D-07）

| 场景 | PC | Mobile |
|------|-----|--------|
| 筛选栏 | 内联显示（搜索+部门+状态+新建按钮） | 折叠为"筛选"按钮，点击弹出底部 Sheet（D-06） |
| 数据展示 | q-table | q-card 列表（已有，继承） |
| 新建/编辑弹窗 | 标准 q-dialog（min-width: 400px） | 全屏弹窗 `maximized`（D-07） |
| 新建按钮 | 工具栏右侧 | 右下角 FAB（`q-page-sticky position="bottom-right"`） |

底部 Sheet 筛选（D-06）：
```
┌─────────────────────────────┐
│ ── 拖拽条 (40px x 4px) ──  │
│                             │
│ 搜索                        │
│ [搜索用户名/姓名         🔍] │
│                             │
│ 部门                        │
│ [选择部门              ▾]   │
│                             │
│ 状态                        │
│ [全部] [启用] [禁用]        │
│                             │
│ [ 重置筛选 ] [ 应用筛选  ]  │
└─────────────────────────────┘
```

| Property | Value |
|----------|-------|
| 弹出方式 | `q-dialog position="bottom"` |
| 圆角 | `16px 16px 0 0` |
| 内边距 | 16px |
| 拖拽条 | 40px x 4px 居中圆角条，`var(--oa-border)` 色 |
| 重置按钮 | `flat` |
| 应用按钮 | `color="primary"` |

### DepartmentPage 移动适配（D-04）

| 场景 | PC | Mobile |
|------|-----|--------|
| 树形展示 | q-tree 全宽 | q-tree 全宽（不变） |
| 新建/编辑弹窗 | 标准 q-dialog | 全屏弹窗 `maximized`（D-04） |

### RolePage 移动适配（D-05）

| 场景 | PC | Mobile |
|------|-----|--------|
| 布局 | 双栏（左列表 + 右权限） | 单栏切换（D-05） |
| 角色列表 | 左侧 col-md-4 | 全屏列表 |
| 权限分配 | 右侧 col | 点击角色后全屏权限视图 |
| 返回 | 不需要 | 顶部返回按钮回到角色列表 |
| 新建/编辑弹窗 | 标准 q-dialog | 全屏弹窗 `maximized`（D-07） |

移动端角色页状态机：
```
[角色列表] --点击角色--> [权限分配视图]
[权限分配视图] --点击返回--> [角色列表]
```

---

## Dark Mode Persistence Contract (D-08)

### 初始化流程

```typescript
// App.vue onMounted 或 boot 文件
const savedDark = localStorage.getItem('oa-dark-mode');
if (savedDark !== null) {
  $q.dark.set(savedDark === 'true');
} else {
  // 首次访问：跟随系统偏好
  $q.dark.set('auto');
}
```

### 切换持久化

```typescript
// 切换时保存
function toggleDark() {
  $q.dark.toggle();
  localStorage.setItem('oa-dark-mode', String($q.dark.isActive));
}
```

| Property | Value |
|----------|-------|
| Storage key | `oa-dark-mode` |
| 值 | `"true"` / `"false"` |
| 首次访问 | 跟随系统偏好（`prefers-color-scheme`） |
| 切换入口 | PC 顶栏按钮 + 移动端 overlay Drawer toggle |

---

## Copywriting Contract (Chinese)

### 新增页面文案

#### 登录页（D-15 美化）

| Element | Copy |
|---------|------|
| 品牌标题 | OA 管理系统 |
| 副标题 | 请使用您的账号登录 |
| 登录按钮 | 立即登录 |
| 默认提示 | 默认账号: admin / admin123 |
| 登录成功 | 登录成功（Notify positive） |
| 登录失败 | 用户名或密码错误（Notify negative） |

#### Dashboard（D-16）

| Element | Copy |
|---------|------|
| 欢迎词 | 早上好/下午好/晚上好，{realName} |
| 副标题 | 欢迎回到 OA 管理系统 |
| 统计卡片标签 | 用户总数 / 部门总数 / 角色总数 |
| 快捷操作标签 | 新建用户 / 新建部门 / 角色管理 / 个人信息 |
| 统计加载失败 | 统计数据加载失败（Notify warning，不阻塞页面） |

#### 403 页面（D-17）

| Element | Copy |
|---------|------|
| 错误码 | 403 |
| 标题 | 无权限访问 |
| 描述 | 您没有权限访问此页面，请联系管理员获取相应权限 |
| 操作按钮 | 返回首页 |

#### 404 页面（D-17）

| Element | Copy |
|---------|------|
| 错误码 | 404 |
| 标题 | 页面未找到 |
| 描述 | 您访问的页面不存在或已被移除 |
| 操作按钮 | 返回首页 |

#### 空态统一组件（D-17）

| Page | Icon | Heading | Body | CTA |
|------|------|---------|------|-----|
| UserPage | `people` (64px) | 暂无用户 | 创建第一个用户以开始管理 | 新建用户 |
| DepartmentPage | `account_tree` (64px) | 暂无部门 | 建立组织架构第一步：添加顶级部门 | 新建部门 |
| RolePage | `security` (64px) | 暂无角色 | 创建角色并分配权限以管理系统访问 | 新建角色 |
| Dashboard (无统计) | `dashboard` (64px) | 暂无数据 | 系统刚刚初始化，开始添加组织数据吧 | 前往用户管理 |

空态组件规格：
- 图标：64px，`var(--oa-text-tertiary)` 色
- 标题：20px / 600，`var(--oa-text-primary)`
- 描述：14px / 400，`var(--oa-text-secondary)`，标题下方 8px
- CTA 按钮：`color="primary"`，描述下方 16px
- 整体居中，上下 padding 48px

#### 移动端筛选 Sheet（D-06）

| Element | Copy |
|---------|------|
| 触发按钮 | 筛选（icon: `filter_list`） |
| Sheet 内搜索 label | 搜索 |
| Sheet 内部门 label | 部门 |
| Sheet 内状态 label | 状态 |
| 重置按钮 | 重置筛选 |
| 应用按钮 | 应用筛选 |

#### RolePage 移动端（D-05）

| Element | Copy |
|---------|------|
| 返回按钮 | ← 返回角色列表 |
| 权限视图标题 | {roleName} 的权限 |
| 保存权限按钮 | 保存权限 |

### 继承 Phase 3 文案

所有 Phase 3 定义的文案（用户管理、部门管理、表单字段标签、删除确认、重置密码等）保持不变。

---

## Component Inventory (Phase 5 新增)

| Component | Usage | Props/Config |
|-----------|-------|-------------|
| `q-skeleton` | 列表/卡片加载骨架 | `type="rect"` / `type="text"` |
| `q-slide-transition` | 移动端视图切换 | — |
| `q-page-sticky` | 移动端 FAB 按钮 | `position="bottom-right" :offset="[16, 16]"` |
| `q-dialog` (maximized) | 移动端全屏弹窗 | `maximized` |
| `q-dialog` (position) | 底部 Sheet | `position="bottom"` |
| `q-separator` | Drawer 内分隔线 | — |
| `q-avatar` | Drawer 用户头像 | `size="40px" icon="account_circle"` |
| `transition` (Vue) | 页面切换 fade | `name="fade" mode="out-in"` |

---

## State Patterns (Phase 5 新增)

### Dark Mode 状态

| State | 触发 | 行为 |
|-------|------|------|
| 初始化 | App mount | 读取 localStorage，无值则 auto |
| 切换 | 点击按钮 | toggle + 写入 localStorage |
| 同步 | 页面刷新 | 从 localStorage 恢复 |

### RolePage 移动端状态

| State | 触发 | 视觉 |
|-------|------|------|
| 列表视图 | 默认 / 点击返回 | 显示角色列表 + 新建按钮 |
| 权限视图 | 点击角色 | 显示返回按钮 + 角色名 + 权限 checkbox + 保存按钮 |

### Dashboard 统计加载

| State | 触发 | 视觉 |
|-------|------|------|
| Loading | 页面加载 | 3 张统计卡片骨架屏 |
| Data | API 成功 | 显示数字 + 标签 |
| Error | API 失败 | 卡片显示 "--"，Notify warning |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Quasar official | 全部使用 Quasar 内置组件 | not required |
| Third-party | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
