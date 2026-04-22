# Phase 13: PDF 保真输出 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

让 v2 模板提交详情导出的 PDF 在 A4 纸上 1:1 还原设计稿栅格布局：字段对齐、分组标题、动态表格边框完整；分页时行/分组不被截断，动态表格超页时表头复出；中文显示正常无乱码。

**范围限定：** 仅针对 PDF/打印保真，不涉及响应式移动端布局（Phase 14 处理）。沿用现有的 html2canvas + jsPDF 技术栈，不引入 jspdf-autotable 或纯矢量重写。

</domain>

<decisions>
## Implementation Decisions

### PDF 生成技术路径
- **D-01:** 保留 `html2canvas + jsPDF` 图像快照方案（增量改进），不切换到 jspdf-autotable 纯矢量方案。理由：CSS Grid 栅格天然 1:1 保真，中文无需嵌入字体文件，改动面最小，已经工作的基线保留。
- **D-02:** PDF 产物本质上是 JPEG 图像序列（`quality: 0.95` 单条 / `0.9` 批量）——明确接受"文本不可复制、文件体积略大"的代价，换取栅格+中文的天然保真。
- **D-03:** 复用现有 `composables/usePdfExport.ts` 的结构，只重写其中的分页分片逻辑；对外导出函数签名 `exportToPdf(element, filename)` / `exportBatchToPdf(...)` 保持不变。

### 分页控制（PDF-02）
- **D-04:** 分页策略采用 **"DOM 元素坐标抢占 + 智能切点"**：截图之前扫描 `#print-area` 内所有顶层 item（row / group / dynamic-table），记录每个元素的 top/bottom 像素坐标；分页算法按目标页高切片时，把切点移到"不横切任何元素"的最近候选位置。
- **D-05:** **粒度为"行级不截断"**：
  - 单个 `SchemaRow` 内的多字段不允许被分开
  - `SchemaGroup` 也被视为切点边界——整组放不下时优先换页
  - 若分组本身超出一页高度，则降级在分组内的 row 之间切
  - 动态表格整体也作为一个切点边界（见 D-06）
- **D-06:** **动态表格分页规则**："表体 data row 可切 + 表头复出"——如果整表放不下当前页就换新页；表格本身超一页高度时，允许在表格内部 `<tr>` 之间切，且每个新页的表格顶部必须重复 `<thead>`（通过 CSS `thead { display: table-header-group }` 实现浏览器打印默认行为；在 html2canvas 分片方案中需显式克隆表头 DOM 注入到后续切片的起始位置）。
- **D-07:** 若某单个行/分组/表格元素自身高度超过 A4 可用内容高度（约 267mm）且无法降级切分（如分组内只有一行且那一行也超高，极端情况），退化到"按像素强切 + 控制台警告"作为安全兜底，不让导出崩溃。

### 页眉页脚（多页时）
- **D-08:** **页眉**：每一页顶部居中显示当前提交的 **表单名称**（如"员工入职登记表"）。
- **D-09:** **页脚**：每一页底部左侧显示 **提交时间**（`YYYY-MM-DD HH:mm`），右侧显示 **页码 N / M**（如"2 / 3"）。
- **D-10:** 页眉页脚是 **PDF 层注入**（`pdf.text()` 调用，位于内容区 margin 之外），不出现在 DOM 中、不参与 html2canvas 截图。字号约 10pt，颜色中灰（`#666`）。
- **D-11:** 单页 PDF 是否显示页眉页脚：**显示**（页眉显示表单名和提交时间更正式，页脚页码为"1 / 1"即可），保证多页/单页观感一致。

### 中文字体（PDF-03）
- **D-12:** **采用系统字体堆栈，不 self-host Web Font**。CSS `font-family` 在 `#print-area` 定义优先级栈，由浏览器按系统可用性挑选。
- **D-13:** **字体优先级**：`'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif`（苹方 → 雅黑 → 黑体 → 思源 → 通用无衬线）。
- **D-14:** 中文字形由 html2canvas 栅格化为图像，PDF 显示无乱码——这是 D-01 路径的天然副作用，无需额外字体处理。不同操作系统导出的 PDF 字体渲染**可能略有差异**（Mac 苹方更细腻、Windows 雅黑略粗），接受这种差异。

### 栅格布局保真（PDF-01）
- **D-15:** **字段视觉风格："全字段表格边框（纸质风格）"**：
  - `print` 模式下每个字段单元格（`.field-renderer`）加 1px 边框
  - `grid-row` 的 `gap` 设置为 0（边框相接替代间距）
  - 边框颜色：`#000`（黑色）
  - 单元格内 padding：约 8px，保证 label + value 有呼吸空间
- **D-16:** **分组视觉风格："标题条背景色 + 边框"**：
  - `GroupRenderer` 在 `print` 模式下标题条背景 `#f5f5f5`，文字 16pt 粗体居左
  - 分组整体 1px 黑色边框，标题条与内容区有底部分隔线
- **D-17:** **字段 label/value 排版："标签在上、值在下"**（保持与填写页一致）：
  - CSS 栅格 `colSpan` 决定字段横向占宽不变
  - 字段内部 label 和 value 竖向排列，label 在上方（约 12pt 深灰）、value 在下方（14pt 黑色）
  - 这样字段即使跨列数不同也能横向对齐（与设计器预览完全一致）
- **D-18:** **签名视觉**：`print` 模式下 `<img>` max-height **保持当前 80px**，加 1px 黑色边框。签名为空时显示"—"占位。
- **D-19:** **空值显示**：已有 `—` 占位机制（`FieldRenderer` 的 `print-value.empty` 样式）保留；表格边框存在时，空单元格的边框仍完整绘制（不因为没值塌陷）。

### Claude's Discretion
- 分组边框/字段边框的具体粗细（1px 还是 1.5px）与颜色深浅（`#000` 还是 `#333`）的 ±10% 微调
- 智能切点算法实现细节：递归扫描 DOM、生成切点数组、二分查找 vs 线性查找
- html2canvas 的 `scale` 参数（当前单条 2、批量 1.5，可能需上调到 3 换清晰度 vs 内存）
- 页眉页脚字号、颜色、左右内边距（按 A4 margin 15mm 视觉平衡调即可）
- 表头复出的 DOM 克隆注入策略：是在分片 canvas 上 drawImage 表头位图，还是预处理 DOM 时复制 `<thead>`

### Folded Todos
无 folded todos——本阶段 scope 内未发现外部待办可吸纳。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码
- `frontend/src/composables/usePdfExport.ts` — 当前 `exportToPdf` / `exportBatchToPdf` 实现（**核心重写对象**：分页分片逻辑 L25-54, L82-128）
- `frontend/src/assets/print.css` — 当前 `@media print` 样式（dynamic-table 已有 `page-break-inside: avoid`，v2 grid-form 无样式）
- `frontend/src/css/assets/print.css` — 打印时 Quasar 元素隐藏规则（q-header/q-drawer/q-footer）
- `frontend/src/components/renderer/GridFormRenderer.vue` — `mode='print'` 栅格渲染器（L115-123 `.grid-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px 16px }`——**打印下需覆盖 gap 为 0 并加边框**）
- `frontend/src/components/renderer/GroupRenderer.vue` — 分组渲染器（L2 `q-card flat bordered`，L45-59 当前样式——**打印下需强化标题条背景 + 边框**）
- `frontend/src/components/renderer/FieldRenderer.vue` — 字段渲染器 print 模式（L9-24 纯文本值；L179-186 样式——**打印下需加单元格边框 + padding**）
- `frontend/src/components/renderer/DynamicTablePrint.vue` — 动态表格 print 组件（L4 `table-layout: fixed`、L60-71 边框样式——**已大致到位，需要配合分页表头复出**）
- `frontend/src/components/submission/SubmissionDetail.vue` — 提交详情 print-area 容器（L16 `<div id="print-area">`，L26-32 调用 `GridFormRenderer mode="print"`）
- `frontend/src/pages/SubmissionPage.vue` — 打印/PDF 入口（L241-258 `handlePrint` 克隆 DOM、L261-270 `handleExportPdf`、L273-320 `handleBatchExport`）

### 技术决策与需求
- `.planning/REQUIREMENTS.md` — PDF-01（栅格/边框/标题/对齐保真）、PDF-02（分页不截断）、PDF-03（中文无乱码）需求定义
- `.planning/ROADMAP.md` — Phase 13 三条 Success Criteria（对应 PDF-01/02/03）
- `.planning/phases/10-schema/10-CONTEXT.md` — Phase 10 schema/渲染器/`mode` 分发决策（本阶段继承的渲染器架构基线）
- `.planning/phases/11-designer-grid/11-CONTEXT.md` — Phase 11 GridFormRenderer 作为画布底层决策（栅格 CSS 来源）
- `.planning/phases/12-groups-tables/12-CONTEXT.md` — Phase 12 D-16（动态表格原生 `<table>` + border，为本阶段 PDF 保真天然对接）

### 外部库
- [html2canvas 文档](https://html2canvas.hertzen.com/)——`scale` / `backgroundColor` / `useCORS` 参数使用
- [jsPDF 文档](https://raw.githack.com/MrRio/jsPDF/master/docs/index.html)——`pdf.text()` 页眉页脚注入、`pdf.addPage()` 分页、`pdf.addImage()` JPEG 嵌入

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicTablePrint.vue`：原生 `<table>` + `border-collapse + table-layout: fixed` + 黑色边框，已天然符合"纸质表格风格"，Phase 13 只需增加分页时 `<thead>` 复出机制
- `FieldRenderer.vue` print 分支：已把所有 7 种字段类型映射为纯文本值（checkbox 合并、signature 图片、空值 `—`），栅格渲染只需加外框+padding
- `GroupRenderer.vue`：已有 `.group-header` + `.group-body` 结构，只需在 `@media print` / `print-area` CSS 下覆盖背景色和边框
- `usePdfExport.ts` 的 html2canvas 调用（`scale: 2, backgroundColor: #ffffff, useCORS: true`）和 JPEG 序列化（`quality: 0.95`）保持不变
- `SubmissionPage.vue` 的 `handlePrint` 克隆 `#print-area` 到 body 层级 + JS 隐藏其他元素的打印策略正确可靠，不需改动

### Established Patterns
- CSS 变量主题：`--oa-border` / `--oa-surface` / `--oa-hover` / `--q-primary`（但 `@media print` 下不使用主题变量，直接写死 `#000` / `#f5f5f5` 等打印专用色值）
- `#print-area` 作为单点入口（SubmissionDetail.vue L16 定义、SubmissionPage.vue L242 引用、usePdfExport.ts 消费）
- 打印模式通过克隆 DOM 到 body + `@media print` 隐藏其他元素（避免 Vue 父级 layout 影响打印）
- PDF 分页兜底：html2canvas 输出 canvas 后按 pageHeight 像素切片

### Integration Points
- `SubmissionPage.vue` → `exportToPdf(element, filename)` 是唯一导出入口，改造后函数签名不变
- `SubmissionDetail.vue` 的 `#print-area` DOM 结构决定了分页算法要扫描哪些顶层元素（目前是 `.print-header`、`GridFormRenderer` 内的 row/group/dynamic-table）
- `PublicFillPage.vue` 与本阶段**无关**（填写页走 `mode='fill'`，不走 print/PDF 路径）
- Phase 14（响应式填写页）与本阶段**解耦**：PDF 固定 A4 纸质布局，不受 PC/Mobile 断点影响

</code_context>

<specifics>
## Specific Ideas

- 纸质表格审美：字段单元格 `<table>` 般的黑色边框（D-15）+ 分组标题背景色（D-16）共同营造"正式表单"观感，与填写页偏交互的风格有意区分
- 字段排版"标签在上、值在下"（D-17）保留 CSS Grid 横向对齐优势——如果改成"标签在左"两列内联，跨 colSpan 字段的对齐会被破坏
- 页脚"提交时间 + 页码 N/M"（D-09）是工作场景最常用的元信息，不加"打印时间"避免误导归档
- 动态表格表头复出（D-06）是 PDF 保真最容易掉链的地方——`<thead>` 在原生浏览器打印下自带复出能力，但 html2canvas 分片方案需要额外处理

</specifics>

<deferred>
## Deferred Ideas

- **矢量 PDF 路径**（jspdf-autotable / jsPDF.text）：明确放弃于本阶段，但未来若用户强烈要求"PDF 文本可复制"、"体积更小"、"打印店高清输出"，可作为 v2 重构项
- **自定义水印 / 公司 LOGO**：未在 v1.2 需求范围，留给 v2 增强
- **PDF 密码保护 / 打开限制**：未在 v1.2 需求范围
- **服务端 PDF 生成（Puppeteer）**：REQUIREMENTS.md Out of Scope 已明确，Bun 运行时不兼容
- **多语言字体回退（英文/日文/俄文）**：当前只覆盖中英文常见字形，纯西文天然渲染正常；若未来支持日韩字形，需扩展字体栈或引入 Web Font
- **打印专用的黑白模式**：当前分组背景 `#f5f5f5` 即使黑白打印也区分度足够，不做额外黑白优化
- **批量导出的内存优化（如 streaming）**：当前批量最多 50 条的限制足够，未来若放开至 200+ 需考虑流式生成

</deferred>

---

*Phase: 13-pdf*
*Context gathered: 2026-04-21*
