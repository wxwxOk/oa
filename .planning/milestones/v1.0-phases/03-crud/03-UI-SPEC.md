---
phase: 3
slug: crud
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-19
approved: 2026-04-19
---

# Phase 3 — UI Design Contract

> 组织架构 CRUD（用户管理 + 部门管理）的视觉与交互契约。由 gsd-ui-researcher 生成，gsd-ui-checker 验证。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none（Quasar 项目，不使用 shadcn） |
| Preset | not applicable |
| Component library | Quasar 2（q-table, q-tree, q-dialog, q-input, q-select 等） |
| Icon library | @quasar/extras material-icons（已配置于 quasar.config.cjs） |
| Font stack | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif` |
| Quasar plugins | Notify（top, 2000ms）, Dialog, LoadingBar |
| Dark mode | `framework.config.dark: 'auto'`（Quasar 原生支持） |
| Responsive breakpoint | `$q.screen.gt.sm` / `$q.screen.lt.md`（1024px 分界，FR-6.1） |

---

## Spacing Scale

所有间距值为 4 的倍数，映射到 Quasar 内置 class：

| Token | Value | Quasar Class | Usage |
|-------|-------|-------------|-------|
| xs | 4px | `q-pa-xs` / `q-gutter-xs` | 图标与文字间距、行内紧凑间距 |
| sm | 8px | `q-pa-sm` / `q-gutter-sm` | 对话框内表单字段间距、紧凑元素间距 |
| md | 16px | `q-pa-md` / `q-gutter-md` | 页面内区块默认间距、`q-page padding` 默认值 |
| lg | 24px | `q-pa-lg` / `q-mb-lg` | 页面标题栏与内容区之间 |
| xl | 32px | `q-pa-xl` | 页面级主要间隔 |
| 2xl | 48px | `style="padding: 48px"` | 空态区域内边距 |
| 3xl | 64px | `style="padding: 64px"` | 未使用（本阶段不需要） |

例外：
- 表格行操作按钮使用 `q-btn size="sm" flat dense`，实际触控区域约 28-32px（桌面端次要控件，可接受小于 44px）
- 移动端卡片操作按钮同理，因 D-19 保持现状不额外打磨

---

## Typography

| Role | Size | Weight | Line Height | Quasar 映射 |
|------|------|--------|-------------|------------|
| H1 (页面标题) | 28px | 600 (semibold) | 1.2 | 自定义 class `.text-h1-custom` 或内联 |
| H2 (区块标题/对话框标题) | 20px | 600 (semibold) | 1.2 | 覆盖 Quasar `text-h6`（默认 18px）为 20px |
| Body (正文/表格内容) | 16px | 400 (regular) | 1.5 | Quasar 默认 body |
| Label (表单标签/筛选标签) | 14px | 400 (regular) | 1.5 | Quasar `text-caption` 或 `text-body2` |
| Caption (辅助文字/时间戳) | 12px | 400 (regular) | 1.5 | Quasar `text-caption` |

字体覆盖方式：在 `app.scss` 中设置 `body { font-family: ... }` 覆盖 Quasar 默认字体栈。
对话框标题使用 `class="text-h6"` 但通过 CSS 覆盖 `.text-h6 { font-size: 20px; font-weight: 600; line-height: 1.2; }`。

---

## Color

### 色彩契约（Cool Neutral: Slate + Indigo）

| Role | Light Mode | Dark Mode | Usage |
|------|-----------|-----------|-------|
| Dominant 60% (背景) | `#F8FAFC` (slate-50) | `#0F172A` (slate-900) | 页面背景 `q-page`、布局背景 |
| Secondary 30% (表面) | `#FFFFFF` (white) | `#1E293B` (slate-800) | 卡片、对话框、侧边栏、表头 |
| Accent 10% (强调) | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) | 见下方保留列表 |
| Destructive | `#DC2626` (red-600) | `#EF4444` (red-500) | 删除确认按钮、禁用状态徽章 |
| Border | `#E2E8F0` (slate-200) | `#334155` (slate-700) | 卡片边框、表格边框、输入框边框 |
| Text Primary | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) | 标题、正文 |
| Text Secondary | `#475569` (slate-600) | `#94A3B8` (slate-400) | 辅助文字、placeholder |
| Text Tertiary | `#64748B` (slate-500) | `#64748B` (slate-500) | 时间戳、禁用文字（light 模式从 slate-400 调亮到 slate-500 以满足 WCAG AA 正文对比度） |
| Positive | `#16A34A` (green-600) | `#22C55E` (green-500) | 启用状态徽章、成功通知 |

### Accent 保留用途（严格限定）

Accent 色（indigo-600/500）仅用于以下元素：
1. 主要 CTA 按钮（"新建用户"、"新建部门"、"保存"）
2. 导航栏当前激活项
3. 链接文字
4. 输入框 focus 边框环
5. 表格行 hover 背景色（`bg-indigo-1` light / `bg-indigo-9` dark，极淡）
6. 状态筛选 chip 激活态

### Quasar 变量覆盖

在 `quasar.variables.scss` 中覆盖：

```scss
$primary   : #4F46E5;  // indigo-600
$secondary : #475569;  // slate-600
$accent    : #6366F1;  // indigo-500（dark mode 备用）
$dark      : #0F172A;  // slate-900
$dark-page : #0F172A;  // slate-900
$positive  : #16A34A;  // green-600
$negative  : #DC2626;  // red-600
$info      : #3B82F6;  // blue-500
$warning   : #F59E0B;  // amber-500
```

在 `app.scss` 中补充自定义 CSS 变量：

```scss
:root {
  --oa-bg: #F8FAFC;
  --oa-surface: #FFFFFF;
  --oa-border: #E2E8F0;
  --oa-text-primary: #0F172A;
  --oa-text-secondary: #475569;
  --oa-text-tertiary: #64748B;  // slate-500，WCAG AA 正文对比度 5.6:1
  --oa-hover: #EEF2FF;       // indigo-50，行 hover
  --oa-focus-ring: #4F46E5;  // indigo-600
}

.body--dark {
  --oa-bg: #0F172A;
  --oa-surface: #1E293B;
  --oa-border: #334155;
  --oa-text-primary: #F8FAFC;
  --oa-text-secondary: #94A3B8;
  --oa-text-tertiary: #64748B;
  --oa-hover: #1E1B4B;       // indigo-950，行 hover
  --oa-focus-ring: #6366F1;  // indigo-500
}
```

### 对比度验证（WCAG AA）

| 组合 | 对比度 | 结果 |
|------|--------|------|
| slate-900 on slate-50 (主文字/背景) | 15.4:1 | AA Pass |
| slate-600 on slate-50 (次文字/背景) | 7.3:1 | AA Pass |
| slate-500 on slate-50 (三级文字/背景) | 5.6:1 | AA Pass |
| white on indigo-600 (按钮文字) | 8.6:1 | AA Pass |
| white on red-600 (删除按钮文字) | 4.6:1 | AA Pass |

---

## Radii & Elevation

| Element | Border Radius | Elevation | Notes |
|---------|--------------|-----------|-------|
| 输入框 / 按钮 | 4px (Quasar 默认) | none | Minimal Admin 风格 |
| 卡片 (q-card) | 4px | `flat bordered` (无阴影) | 依赖边框而非阴影区分层级 |
| 对话框 (q-dialog) | 4px | Quasar 默认阴影 | 模态需要从背景层抬起 |
| Chip (q-chip) | 4px | none | 状态筛选 chip |
| 表格 (q-table) | 0px | `flat bordered` | 数据密度优先 |

---

## Micro-Interactions

| Interaction | Specification | Notes |
|-------------|--------------|-------|
| 按钮点击 | `transform: scale(0.98)` 持续 100ms | 仅触觉反馈，无弹跳 |
| 表格行 hover | 背景色 `var(--oa-hover)` 过渡 150ms | 淡入淡出，无 zebra 条纹 |
| Focus ring | `outline: 2px solid var(--oa-focus-ring); outline-offset: 2px` | 无障碍可见焦点 |
| 对话框打开 | Quasar 默认 fade + scale | 不自定义 |
| 页面切换 | 无过渡动画 | Minimal Admin 风格 |
| Toggle 切换 | Quasar 默认动画 | 不自定义 |
| 表格行高 | 40px dense | 数据密度优先 |

---

## Focal Points

每个页面的视觉锚点明确声明，避免执行者猜测层级。

### UserPage 视觉锚点
- **主锚点**：顶部工具栏（row q-mb-md）左侧 H2 标题 "用户管理" + 右侧 primary CTA "新建用户"
- **次锚点**：筛选栏（搜索框 + 部门下拉 + 状态 chip-toggle）
- **主区域**：q-table（PC）或 q-card 列表（移动）占据剩余空间
- **对话框焦点**：打开后标题栏 text-h6（新建/编辑用户）+ 底部 primary "保存用户" 按钮

### DepartmentPage 视觉锚点
- **主锚点**：顶部工具栏左侧 H2 标题 "部门管理" + 右侧 primary CTA "新建部门"
- **主区域**：q-tree 填满剩余空间，每节点行左侧图标（folder amber）+ 节点名 + 右侧操作按钮
- **对话框焦点**：text-h6 标题 + 上级部门选择器 + primary "保存部门" 按钮

---

## Copywriting Contract (Chinese)

### 用户管理页面

| Element | Copy | Context |
|---------|------|---------|
| 页面标题 | 用户管理 | H2 级别，页面顶部左侧 |
| 主要 CTA | 新建用户 | `color="primary"` 按钮，icon="add" |
| 搜索 placeholder | 搜索用户名/姓名 | q-input outlined dense |
| 状态筛选 chips | 全部 / 启用 / 禁用 | q-btn-toggle，D-03 |
| 部门筛选 | 选择部门 | q-select placeholder |
| 空态标题 | 暂无用户 | 居中显示，text-h6 |
| 空态正文 | 创建第一个用户以开始管理 | 标题下方，text-body2 text-grey-6 |
| 空态按钮 | 新建用户 | `color="primary"` 按钮 |
| 对话框标题（新建） | 新建用户 | text-h6 |
| 对话框标题（编辑） | 编辑用户 | text-h6 |
| 保存按钮 | 保存用户 | `color="primary"`（对话框上下文明确时可简化为"保存"） |
| 取消按钮 | 取消 | `flat` |
| 删除确认标题 | 删除用户 | Dialog.create title |
| 删除确认正文 | 将永久删除用户 {username}。此操作不可恢复。 | Dialog.create message |
| 删除确认按钮 | 确认删除 | `color="negative"` |
| 禁用 toggle | 启用 | q-toggle label，无确认（D-02） |
| 重置密码确认标题 | 重置密码 | Dialog.create title |
| 重置密码确认正文 | 密码将重置为 123456，用户下次登录需立即修改。 | Dialog.create message |
| 重置密码确认按钮 | 确认重置 | `color="primary"` |
| 重置成功弹窗标题 | 密码已重置 | Dialog.create title |
| 重置成功弹窗内容 | 新密码：`123456` + 复制按钮 | 显示密码 + q-btn icon="content_copy" |
| 重置成功关闭按钮 | 关闭 | `flat` |
| 网络错误 | 加载失败，请检查网络后重试 | q-banner 或内联提示 + "重试" 按钮 |
| 保存成功 | 保存成功 | Notify positive |
| 删除成功 | 已删除 | Notify positive |

### 部门管理页面

| Element | Copy | Context |
|---------|------|---------|
| 页面标题 | 部门管理 | H2 级别 |
| 主要 CTA | 新建部门 | `color="primary"` 按钮，icon="add" |
| 空态标题 | 暂无部门 | 居中显示 |
| 空态正文 | 建立组织架构第一步：添加顶级部门 | text-body2 text-grey-6 |
| 空态按钮 | 新建部门 | `color="primary"` |
| 对话框标题（新建） | 新建部门 | text-h6 |
| 对话框标题（编辑） | 编辑部门 | text-h6 |
| 保存按钮 | 保存部门 | `color="primary"`（对话框上下文明确时可简化为"保存"） |
| 父部门选择器 label | 上级部门 | q-select，可清空（顶级部门无父级） |
| 删除确认标题 | 删除部门 | Dialog.create title |
| 删除确认正文 | 将永久删除部门 {name}。子部门或用户存在时删除会失败。此操作不可恢复。 | Dialog.create message |
| 删除确认按钮 | 确认删除 | `color="negative"` |
| 网络错误 | 加载失败，请检查网络后重试 | 同用户页 |

### 表单字段标签

| Field | Label | Required |
|-------|-------|----------|
| username | 用户名 | 是（红星号） |
| password | 初始密码 (默认 123456) | 新建时是 |
| realName | 真实姓名 | 是（红星号） |
| email | 邮箱 | 否 |
| phone | 手机 | 否 |
| departmentId | 部门 | 否 |
| roleIds | 角色 | 否 |
| status toggle | 启用 | 仅编辑时显示 |
| dept name | 部门名称 | 是（红星号） |
| dept parentId | 上级部门 | 否 |
| dept sort | 排序 | 是（红星号） |

必填字段标签后缀：`<span class="text-negative">*</span>`

---

## Component Inventory

本阶段使用的 Quasar 组件清单：

| Component | Usage | Props/Config |
|-----------|-------|-------------|
| `q-page` | 页面容器 | `padding` |
| `q-card` | 移动端用户卡片、对话框内容 | `flat bordered` |
| `q-card-section` | 卡片内容区 | — |
| `q-card-actions` | 卡片/对话框操作栏 | `align="right"` |
| `q-table` | PC 端用户列表 | `flat bordered dense :rows-per-page-options="[10,20,50]"` |
| `q-tree` | 部门树 | `default-expand-all node-key="id" label-key="name"` |
| `q-dialog` | 新建/编辑对话框、确认对话框 | v-model 或 Dialog.create |
| `q-input` | 表单输入 | `outlined :rules="[...]"` |
| `q-select` | 部门选择、角色多选、父部门树选择 | `outlined emit-value map-options` |
| `q-toggle` | 用户启用/禁用 | `label="启用"` |
| `q-btn` | 所有按钮 | CTA: `color="primary"` / 删除: `color="negative"` / 次要: `flat` |
| `q-btn-toggle` | 状态筛选 (全部/启用/禁用) | `toggle-color="primary" flat bordered` |
| `q-chip` | 状态徽章 | 启用: `color="positive" text-color="white"` / 禁用: `color="grey-4" text-color="grey-8"` |
| `q-banner` | 空态展示 | 居中，含 CTA 按钮 |
| `q-spinner` | 加载中 | `color="primary" size="3em"` |
| `q-skeleton` | 列表骨架屏 | 表格加载时替代内容 |
| `q-icon` | 图标 | material-icons |
| `q-space` | 弹性间距 | 标题栏左右分隔 |
| `Notify` (plugin) | 操作反馈 | `position: 'top', timeout: 2000` |
| `Dialog` (plugin) | 确认对话框 | `Dialog.create({ cancel: true })` |

---

## Form Validation Contract

### 用户表单 rules

```typescript
const userRules = {
  username: [
    (v: string) => !!v || '请输入用户名',
    (v: string) => v.length >= 2 || '至少 2 个字符',
  ],
  password: [
    (v: string) => !!v || '请输入密码',
    (v: string) => v.length >= 4 || '至少 4 个字符',
  ],
  realName: [
    (v: string) => !!v || '请输入真实姓名',
  ],
  email: [
    (v: string) => !v || /^\S+@\S+\.\S+$/.test(v) || '邮箱格式不正确',
  ],
  phone: [
    (v: string) => !v || /^\d{6,15}$/.test(v) || '手机号格式不正确',
  ],
}
```

### 部门表单 rules

```typescript
const deptRules = {
  name: [
    (v: string) => !!v || '请输入部门名称',
  ],
  sort: [
    (v: any) => v !== null && v !== undefined || '请输入排序数字',
    (v: any) => Number.isInteger(Number(v)) || '必须是整数',
  ],
}
```

### 校验触发时机

- 触发方式：`lazy-rules="ondemand"` + 提交时调用 `formRef.validate()`
- 失焦时也触发：Quasar `q-input` 默认 blur 触发 rules（D-06）
- 必填字段红星号：label 后追加 `<span class="text-negative">*</span>`

---

## State Patterns

### UserPage 状态矩阵

| State | 触发条件 | 视觉表现 |
|-------|---------|---------|
| Loading (首次) | `onMounted` 加载中 | q-skeleton 占位（3-5 行骨架） |
| Loading (翻页/筛选) | 切换页码或筛选条件 | q-table `:loading="true"` 内置进度条 |
| Empty | `rows.length === 0 && !loading` | 居中 q-banner：图标 `people` + "暂无用户" + "创建第一个用户以开始管理" + "新建用户" 按钮 |
| Data | `rows.length > 0` | PC: q-table / Mobile: q-card 列表 |
| Error (网络) | API 请求失败 | 居中提示 "加载失败，请检查网络后重试" + "重试" 按钮 |
| Dialog (新建) | 点击 "新建用户" | q-dialog 打开，表单清空，显示 username + password 字段 |
| Dialog (编辑) | 点击行内 edit 按钮 | q-dialog 打开，表单填充，隐藏 username + password，显示 status toggle |
| Delete confirm | 点击行内 delete 按钮 | Dialog.create 确认框，`color="negative"` 确认按钮 |
| Reset confirm | 点击行内 vpn_key 按钮 | Dialog.create 确认框 |
| Reset success | 重置 API 成功 | Dialog.create 显示新密码 + 复制按钮 |
| Save success | 保存 API 成功 | Notify positive "保存成功"，对话框关闭，列表刷新 |

### DepartmentPage 状态矩阵

| State | 触发条件 | 视觉表现 |
|-------|---------|---------|
| Loading | `onMounted` 加载中 | q-spinner 居中 |
| Empty | `tree.length === 0 && !loading` | 居中 q-banner：图标 `account_tree` + "暂无部门" + "建立组织架构第一步：添加顶级部门" + "新建部门" 按钮 |
| Data | `tree.length > 0` | q-tree 展开所有节点 |
| Error (网络) | API 请求失败 | 居中提示 + "重试" 按钮 |
| Dialog (新建顶级) | 点击页面 "新建部门" | q-dialog，parentId = null |
| Dialog (新建子部门) | 点击节点 add 按钮 | q-dialog，parentId = 当前节点 id |
| Dialog (编辑) | 点击节点 edit 按钮 | q-dialog，填充 name/sort/parentId，父部门选择器排除自身及子部门（D-11） |
| Delete confirm | 点击节点 delete 按钮 | Dialog.create 确认框 |
| Delete error | 存在子部门或用户 | Notify negative "删除失败：该部门下存在子部门或用户" |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Quasar official | 全部使用 Quasar 内置组件 | not required |
| Third-party | none | not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-19
