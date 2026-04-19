# Phase 5: 响应式体验 - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

实现 PC/Mobile 双布局自适应切换（统一 1024px 断点）、所有页面移动端适配（表格→卡片、弹窗全屏化、筛选折叠）、暗色模式完善（持久化+硬编码色排查）、UI/UX 全面美化（组件统一、动画、关键页面打磨）。

</domain>

<decisions>
## Implementation Decisions

### 布局切换策略
- **D-01:** 统一使用 1024px（Quasar `md` 断点）作为 PC/Mobile 分界线。当前代码中 `$q.screen.gt.sm` / `$q.screen.lt.md` 混用问题统一修正为 `$q.screen.gt.sm` → `$q.screen.gt.md` 或等效 md 断点判断
- **D-02:** PC 端保持固定侧边 Drawer（show-if-above）；移动端点击汉堡菜单弹出 overlay Drawer（覆盖内容区）
- **D-03:** 移动端顶栏精简：汉堡菜单按钮（开关 overlay Drawer）+ 标题 + 暗色切换 + 用户头像

### 各页面移动适配
- **D-04:** DepartmentPage 移动端适配：q-tree 全屏展示，编辑/新建弹窗改为全屏弹窗（`full-width full-height` 或 `maximized`）
- **D-05:** RolePage 移动端改为单栏切换：先显示角色列表，点击角色后进入权限分配视图（返回按钮回到列表）
- **D-06:** UserPage 移动端筛选栏折叠为"筛选"按钮，点击弹出底部 Sheet（q-dialog position="bottom"）显示搜索+部门+状态筛选项
- **D-07:** 所有页面的编辑/新建对话框在移动端使用全屏弹窗

### 暗色模式完善
- **D-08:** 暗色模式偏好使用 localStorage 持久化，应用启动时读取并应用
- **D-09:** 全面排查硬编码颜色（如 `bg-white`、`text-grey-9`、`bg-grey-2`），替换为 CSS 变量或 Quasar dark-aware class
- **D-10:** 底部 Tab 栏、卡片、弹窗等自定义样式确保暗色模式下无白块

### 移动端导航体验
- **D-11:** 底部 Tab 栏保持图标+文字样式，当前选中项高亮（primary 色），未选中灰色
- **D-12:** 移动端 overlay Drawer 内容：导航菜单项 + 底部用户信息区（头像/姓名/角色）+ 退出按钮 + 暗色模式切换

### UI/UX 美化
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 响应式需求
- `.planning/REQUIREMENTS.md` §FR-6 — 响应式需求（FR-6.1 双布局、FR-6.2 抽屉菜单、FR-6.3 暗色模式）
- `.planning/REQUIREMENTS.md` §UAT-6 — 移动端布局验收

### 设计系统
- `frontend/src/css/quasar.variables.scss` — Slate + Indigo 色彩变量
- `frontend/src/css/app.scss` — CSS 自定义属性（light/dark 双套）、字体栈、微交互

### 前序 phase 决策
- `.planning/phases/03-crud/03-CONTEXT.md` §D-19~D-21 — Phase 3 移动端定位（留给 Phase 5）
- `.planning/phases/04-rbac/04-CONTEXT.md` §code_context — RolePage 双栏布局、MainLayout 菜单过滤

### 非功能需求
- `.planning/REQUIREMENTS.md` §NFR-1 — 列表接口 p95 < 500ms

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/layouts/MainLayout.vue` — 已有 PC Drawer + 移动底部 Tab + 暗色切换按钮骨架
- `frontend/src/pages/UserPage.vue` — 已有 `$q.screen.gt.sm` 表格/卡片切换模式
- `frontend/src/css/app.scss` — 已有 light/dark CSS 变量、微交互（hover、focus ring、按钮反馈）
- `frontend/src/css/quasar.variables.scss` — 已有 $dark / $dark-page 定义
- Quasar 内置：`$q.dark.toggle()`、`$q.screen` 断点、`q-dialog`（maximized/position）、`q-skeleton`

### Established Patterns
- `$q.screen.gt.sm` 做 PC/Mobile 判断（需统一为 md 断点）
- Quasar Dialog/Notify 做确认和提示
- CSS 变量 `--oa-*` 做主题色（已有 light/dark 两套）
- `v-perm` 指令控制按钮显隐

### Integration Points
- `frontend/src/layouts/MainLayout.vue` — 布局改造主战场
- `frontend/src/pages/*.vue` — 各页面移动适配
- `frontend/src/css/app.scss` — 全局样式、动画、暗色兼容
- `frontend/src/router/index.ts` — 页面切换过渡
- `frontend/src/App.vue` — 暗色模式初始化

</code_context>

<specifics>
## Specific Ideas

- 登录页要有品牌感：渐变背景 + 装饰图形 + 居中表单卡片
- Dashboard 统计卡片需要调后端接口获取数据（用户数/部门数/角色数）
- RolePage 移动端单栏切换类似"列表→详情"的导航模式
- 底部 Tab 样式要精致，不能太粗糙

</specifics>

<deferred>
## Deferred Ideas

- 手势交互（左滑删除、下拉刷新）— 超出 v1.0 范围
- 平板专属布局（介于 PC 和 Mobile 之间）— 当前统一 1024px 断点足够
- PWA 离线支持 — 超出 v1.0 范围

</deferred>

---

*Phase: 05-responsive*
*Context gathered: 2026-04-20*
