# Phase 9: 数据查看 + 打印 + 统计 — Context

> Downstream agents: read this BEFORE planning or implementing.
> Every decision here is LOCKED — do not re-ask or override.

## Scope

**In scope (from ROADMAP.md):**
- DATA-01: 有权限的用户可查看某模板下所有提交数据列表，支持分页和按填写者/日期筛选
- DATA-02: 用户可点击查看单条提交的完整详情（含签名图片和所有字段值）
- DATA-03: 用户可通过浏览器打印提交数据，打印排版接近纸质表格效果
- DATA-04: 用户可将提交数据导出为 PDF 文件保存
- DATA-05: 用户可查看基础统计面板：每个员工的分享次数和收集数量

**Out of scope:**
- 字段级别统计汇总（学历分布等）→ v2.0 DATA-06
- 数据导出为 Excel → v2.0 DATA-07
- 条件逻辑、文件上传 → v2.0

## Decisions

### 提交列表

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 列表入口 | 模板列表页每行"查看数据"操作按钮 | 数据从属于模板，无需独立菜单项，减少导航层级 |
| 路由设计 | `/templates/:id/submissions` | 明确表达模板-提交从属关系 |
| 列表列 | 序号、填写者姓名、手机号、提交时间、分享人、操作（查看/打印） | 标准列，覆盖主要信息，不过度展示 |
| 筛选条件 | 填写者姓名 + 日期范围 + 手机号 + 分享人 | 扩展筛选，覆盖常见查询场景 |
| 分页方式 | 与现有 QTable 分页模式一致（page + size） | 复用已有模式 |
| 权限控制 | 新增 `form:submission:list` 权限码 | 与模板权限分离，可独立授权 |

### 详情查看

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 交互方式 | 侧边抽屉（QDrawer） | 不离开列表页，快速浏览多条数据 |
| 内容展示 | 表格式布局：字段名 + 字段值逐行展示，签名图片底部展示 | 清晰直观，与打印排版一致 |
| 版本还原 | 根据 submission.schemaVersion 从模板历史还原字段定义 | Phase 8 D-14 已锁定 |

### 浏览器打印

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 触发位置 | 侧边抽屉内"打印"按钮 | 先查看确认再打印，操作流程自然 |
| 实现方式 | window.print() + @media print CSS | 浏览器原生打印，零依赖 |
| 排版风格 | 表格式：表头（模板名称+提交时间）+ 表格行（字段名 \| 值）+ 签名图片底部 | 接近纸质登记表效果 |
| 打印区域 | 仅打印抽屉内详情内容，隐藏其他 UI 元素 | @media print 隐藏非打印区域 |

### PDF 导出

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 生成位置 | 前端生成 | 无需后端参与，不增加 Docker 镜像体积，实现简单 |
| 技术方案 | html2canvas + jsPDF | 将打印排版 DOM 截图转 PDF，排版与打印一致 |
| 导出范围 | 单条导出 + 批量导出 | 单条在抽屉内触发；批量在列表页勾选后触发，合并为一个 PDF |
| 文件命名 | `{模板名称}_{提交时间}.pdf`（单条）/ `{模板名称}_批量导出.pdf`（批量） | 文件名有意义，便于归档 |

### 员工统计面板

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 入口位置 | 嵌入现有 Dashboard 页面，新增"表单统计"区域 | 无需新页面，Dashboard 是自然的统计入口 |
| 展示形式 | 表格 + 柱状图 | 表格展示精确数据，图表直观对比 |
| 统计维度 | 员工姓名、分享次数、收集数量 | DATA-05 要求的基础维度 |
| 时间筛选 | 支持：本周 / 本月 / 自定义日期范围 | 可查看特定时段工作量 |
| 图表库 | 轻量方案（如 vue-chartjs 或 Quasar 内置） | 避免引入重量级图表库 |
| 权限控制 | 新增 `form:stats:view` 权限码 | 统计数据可能敏感，需独立权限 |

### Claude's Discretion

- 具体 @media print CSS 细节（边距、字体大小等）
- html2canvas + jsPDF 的具体配置参数
- 图表库最终选择（vue-chartjs / ECharts lite / 其他轻量方案）
- 批量导出时的进度提示 UI
- 抽屉宽度和响应式断点
- API 路由命名和错误码设计

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据层
- `backend/prisma/schema.prisma` — Submission + ShareLink 模型已存在，本阶段主要是查询
- `.planning/REQUIREMENTS.md` §数据与统计 — DATA-01~05 完整需求定义

### 后端模块
- `backend/src/modules/template/template.route.ts` — 模板模块，提交列表 API 可在此扩展或新建 submission 模块
- `backend/src/modules/public/public.route.ts` — 公开填写模块，参考 Submission 创建逻辑
- `backend/src/index.ts` — Elysia 应用入口，新模块注册

### 前端
- `frontend/src/pages/TemplatePage.vue` — 模板列表页，需新增"查看数据"按钮
- `frontend/src/pages/UserPage.vue` — QTable + 分页 + 筛选模式参考
- `frontend/src/pages/DashboardPage.vue` — 统计面板嵌入位置
- `frontend/src/components/public-fill/FormFieldRenderer.vue` — 字段渲染器，详情展示可复用

### Phase 8 上下文
- `.planning/phases/08-share-public-fill/08-CONTEXT.md` — 数据归档模型决策（D-13~D-16）

## Existing Code Insights

### Reusable Assets
- `FormFieldRenderer.vue` — 字段渲染器，详情页展示字段值可复用渲染逻辑
- `UserPage.vue` — QTable + 分页 + 筛选完整模式，提交列表页可直接参考
- `DashboardPage.vue` — 统计面板嵌入位置，已有卡片布局
- `ShareDialog.vue` — 对话框组件模式参考
- `EmptyState.vue` — 空状态组件，列表为空时复用
- `signature_pad` — 已安装，签名图片渲染为 `<img src="data:image/png;base64,...">` 即可

### Established Patterns
- 后端模块化：每模块一个 route.ts，通过 .use() 注册
- 前端路由：meta.perm 控制页面访问权限
- 表格页面：QTable + server-side pagination + 筛选栏
- 状态管理：Pinia store per feature
- 响应式：PC 表格 / Mobile 卡片列表双模式

### Integration Points
- 后端：新增 submission 查询 API（列表+详情+统计），挂载到 /api/v1/templates/:id/submissions
- 前端路由：新增 /templates/:id/submissions 路由
- Dashboard：新增统计区域组件
- 权限种子：新增 form:submission:list + form:stats:view 权限码

## Specific Ideas

- 打印排版：表头居中显示模板名称，下方表格两列（字段名 | 值），签名图片单独一行居中
- 批量 PDF：列表页增加 checkbox 列，勾选后顶部出现"导出 PDF"按钮
- 统计图表：柱状图 X 轴为员工姓名，Y 轴为数量，双柱（分享/收集）
- 时间筛选：快捷按钮（本周/本月）+ 日期范围选择器

## Deferred Ideas

None — discussion stayed within phase scope

---

*Phase: 09-数据查看+打印+统计*
*Context gathered: 2026-04-20*

