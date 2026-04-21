---
phase: 13
slug: pdf
status: draft
shadcn_initialized: false
preset: none
surface_type: print/PDF (non-interactive)
created: 2026-04-21
---

# Phase 13 — UI Design Contract (PDF 保真输出)

> 本阶段的"UI"是 PDF 打印输出面——A4 纸上的栅格表单布局，不涉及交互式屏幕 UI。
> 所有视觉规格针对 html2canvas 截图 + jsPDF 组装的位图 PDF 产物。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (纯 CSS print 样式，无组件库) |
| Preset | not applicable |
| Component library | not applicable (print 模式渲染为原生 HTML `<table>`) |
| Icon library | not applicable |
| Font | `'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif` |

**Source:** D-12, D-13 (CONTEXT.md)

---

## Page Geometry (A4)

| Property | Value | Source |
|----------|-------|--------|
| Page size | 210mm x 297mm (A4 portrait) | CONTEXT.md D-10 |
| Page margins | 15mm all sides | CONTEXT.md, existing `@page { margin: 15mm }` |
| Header zone height | 10mm (within top margin) | RESEARCH.md Example 4 |
| Footer zone height | 10mm (within bottom margin) | RESEARCH.md Example 4 |
| Content area top | 25mm from page top (15mm margin + 10mm header) | Derived |
| Content area bottom | 272mm from page top (297 - 15 - 10) | Derived |
| Content area width | 180mm (210 - 15*2) | Derived |
| Content area height | 247mm per page | Derived |

---

## Spacing Scale

本阶段为打印输出，间距规格固定于纸质表格风格，不使用通用 8-point scale。

| Token | Value | Usage |
|-------|-------|-------|
| cell-padding | 8px | 字段单元格内 padding（label/value 与边框的呼吸空间） |
| grid-gap | 0px | 表格行内字段间距（边框相接替代间距） |
| group-title-padding | 8px 12px | 分组标题条内 padding |
| label-value-gap | 2px | label 与 value 之间的 margin-bottom |
| header-footer-inset | 15mm | 页眉页脚距页面左右边缘 |
| header-y-offset | 5mm | 页眉文字在 margin 区域内的垂直偏移（距 margin 顶 5mm → 距页顶 20mm） |
| footer-y-offset | 5mm | 页脚文字在 margin 区域内的垂直偏移（距页底 10mm → 距页顶 287mm） |
| dynamic-table-cell-padding | 6px 8px | 动态表格单元格 padding（沿用现有 print.css） |

Exceptions: 签名图片 max-height 80px (D-18)，非标准间距但为锁定决策。

**Source:** D-15 (cell padding 8px, gap 0), D-16 (group padding), RESEARCH.md Example 4 (header/footer offsets)

---

## Typography

| Role | Size | Weight | Line Height | Color | Usage |
|------|------|--------|-------------|-------|-------|
| Page header | 10pt | 400 (regular) | 1.2 | #666666 | 每页顶部居中表单名称 |
| Page footer | 10pt | 400 (regular) | 1.2 | #666666 | 每页底部提交时间 + 页码 |
| Group title | 16pt | 600 (semibold) | 1.3 | #000000 | 分组标题条文字 |
| Field value | 14pt | 400 (regular) | 1.5 | #000000 | 字段值（主要内容） |
| Field label | 12pt | 400 (regular) | 1.4 | #333333 | 字段标签（label 在上） |
| Table header | 12pt | 600 (semibold) | 1.3 | #000000 | 动态表格列标题 |
| Table cell | 12pt | 400 (regular) | 1.4 | #000000 | 动态表格数据单元格 |

**Font stack:** `'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif`
- 应用于 `#print-area` 根元素
- html2canvas 栅格化为位图，PDF 中不嵌入字体文件
- 不同操作系统渲染差异可接受（Mac 苹方 vs Windows 雅黑）

**Source:** D-08/D-09/D-10 (header/footer 10pt #666), D-16 (group 16pt bold), D-17 (label 12pt #333, value 14pt #000), D-13 (font stack)

---

## Color

本阶段为黑白纸质表格风格，不使用 60/30/10 交互色彩分配。

| Role | Value | Usage |
|------|-------|-------|
| Page background | #FFFFFF | PDF 页面背景（白纸） |
| Cell border | #000000 | 字段单元格边框、分组外框、动态表格边框 |
| Group title background | #F5F5F5 | 分组标题条背景色（浅灰区分标题与内容） |
| Dynamic table header bg | #F5F5F5 | 动态表格 `<thead>` 背景色（沿用现有 print.css） |
| Primary text | #000000 | 字段值、分组标题、表格数据 |
| Secondary text | #333333 | 字段标签（label） |
| Tertiary text | #666666 | 页眉页脚文字 |
| Signature border | #000000 | 签名图片边框 |

**Accent reserved for:** 无——打印输出不使用强调色。所有视觉层次通过字号、字重、背景色区分。

**Source:** D-15 (#000 border), D-16 (#f5f5f5 group bg), D-17 (#333 label, #000 value), D-10 (#666 header/footer), existing print.css (#f5f5f5 table header)

---

## Layout Contract

### Field Cell (字段单元格)

```
┌─────────────────────────────┐  ← 1px solid #000 border
│  8px padding                │
│  ┌─────────────────────┐    │
│  │ Label (12pt #333)   │    │  ← label 在上
│  │ 2px gap             │    │
│  │ Value (14pt #000)   │    │  ← value 在下
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

- 每个字段占 `<td colspan=N>`（N = field.colSpan, 1-12）
- 12 列 `table-layout: fixed`，每列 8.333% 宽度
- 行内剩余列用空 `<td>` 填充（保持边框完整）
- 空值显示 "—" 占位符，边框不塌陷

**Source:** D-15, D-17, D-19

### Group (分组区块)

```
┌─────────────────────────────────────┐  ← 1px solid #000 outer border
│ #F5F5F5 ┌─────────────────────────┐ │
│         │ Group Title (16pt bold) │ │  ← 8px 12px padding
│         └─────────────────────────┘ │
├─────────────────────────────────────┤  ← 1px solid #000 separator
│                                     │
│  ┌──────┬──────┬──────┬──────┐      │  ← 内部 <table> (无额外外框)
│  │ cell │ cell │ cell │ cell │      │
│  ├──────┼──────┼──────┼──────┤      │
│  │ cell │ cell │ cell │ cell │      │
│  └──────┴──────┴──────┴──────┘      │
│                                     │
└─────────────────────────────────────┘
```

- 分组整体 1px #000 外框
- 标题条 #F5F5F5 背景 + 底部分隔线
- 组内字段用独立 `<table>` 渲染（与外层 table 分离）
- 分组作为分页切点边界：整组放不下时优先换页，超页高时降级行级切

**Source:** D-16, D-05

### Dynamic Table (动态表格)

```
┌──────────────────────────────────────┐
│ Table Label (可选)                    │
├──────┬──────┬──────┬──────┬──────────┤
│  th  │  th  │  th  │  th  │  thead   │  ← #F5F5F5 bg, 600 weight
├──────┼──────┼──────┼──────┼──────────┤
│  td  │  td  │  td  │  td  │  row 1   │
├──────┼──────┼──────┼──────┼──────────┤
│  td  │  td  │  td  │  td  │  row 2   │
└──────┴──────┴──────┴──────┴──────────┘
```

- 沿用现有 `DynamicTablePrint.vue` 的 `<table>` 结构
- `border-collapse: collapse; table-layout: fixed`
- 边框 1px solid #000，thead 背景 #F5F5F5
- 单元格 padding 6px 8px
- 跨页时表头复出（每个新页顶部重复 `<thead>`）

**Source:** D-06, existing DynamicTablePrint.vue, existing print.css

### Signature (签名字段)

- `<img>` max-height: 80px
- 1px solid #000 border
- `object-fit: contain`
- 签名为空时显示 "—" 占位

**Source:** D-18, D-19

---

## Page Header / Footer Contract

### Page Header (每页)

| Property | Value |
|----------|-------|
| Content | 表单名称（如"员工入职登记表"） |
| Position | 页面顶部 margin 区域内，水平居中 |
| Y coordinate | 距页顶 ~20mm (margin 15mm + 5mm offset) |
| Font | 10pt, regular (400), #666666 |
| Alignment | center |
| Injection method | `pdf.text(formTitle, pageWidth/2, 8, { align: 'center' })` (8mm in PDF units) |
| Single page | 显示（D-11 锁定） |

### Page Footer (每页)

| Property | Value |
|----------|-------|
| Left content | 提交时间，格式 `YYYY-MM-DD HH:mm` |
| Right content | 页码 `N / M`（如 "2 / 3"） |
| Y coordinate | 距页顶 ~287mm (pageHeight - margin + 5mm offset) |
| Font | 10pt, regular (400), #666666 |
| Left X | 15mm (与 margin 对齐) |
| Right X | pageWidth - 15mm, right-aligned |
| Injection method | `pdf.text()` 后置循环注入 |
| Single page | 显示 "1 / 1"（D-11 锁定） |

**Source:** D-08, D-09, D-10, D-11, RESEARCH.md Pattern 3

---

## Pagination Contract

### Break Priority (分页切点优先级)

| Priority | Element | Rule | Source |
|----------|---------|------|--------|
| 1 | SchemaRow | 行内多字段不允许被分开 | D-05 |
| 2 | SchemaGroup | 整组优先换页；超页高时降级在组内 row 之间切 | D-05 |
| 3 | DynamicTable (整体) | 整表优先换页 | D-06 |
| 4 | DynamicTable (内部) | 超页高时允许在 `<tr>` 之间切 + 表头复出 | D-06 |
| 5 | Fallback | 极端超高元素退化为像素强切 + console.warn | D-07 |

### Table Header Repeat (表头复出)

- 当动态表格在内部 `<tr>` 之间被切分时，新页顶部必须重复 `<thead>`
- 实现方式：从原始 canvas 裁剪 thead 区域位图，drawImage 到新页切片顶部
- `<thead>` 需添加 `data-thead` 属性标记，截图前记录精确坐标

**Source:** D-06, RESEARCH.md Pattern 2, Open Question 3

### Content Area Per Page

- 可用内容高度：247mm（A4 297mm - 15mm*2 margins - 10mm header - 10mm footer）
- 像素换算：247mm / 25.4 * 96 * scale（scale=2 时约 1866px）

---

## Copywriting Contract

| Element | Copy | Source |
|---------|------|--------|
| Empty field value | — (em dash) | D-19 |
| Empty signature | — (em dash) | D-18, D-19 |
| Page header text | {表单名称}（动态，如"员工入职登记表"） | D-08 |
| Page footer left | {提交时间}，格式 YYYY-MM-DD HH:mm | D-09 |
| Page footer right | {当前页} / {总页数}（如 "2 / 3"） | D-09 |
| Fallback break warning | `[PDF] 无法找到安全切点，强制分页` (console only) | D-07 |

**注意：** 本阶段无交互式 CTA、无 empty state（PDF 总是有内容）、无 error state（导出失败由现有 toast 处理）、无 destructive action。

---

## Image Quality Contract

| Scenario | html2canvas scale | JPEG quality | Source |
|----------|-------------------|--------------|--------|
| 单条导出 | 2 (可上调至 3) | 0.95 | D-02, Claude's Discretion |
| 批量导出 | 1.5 (可上调至 2) | 0.90 | D-02, Claude's Discretion |

**Canvas 安全阈值：** 元素高度 * scale 不应超过 16000px。超过时降低 scale 或分段截图。

**Source:** D-02, RESEARCH.md Pitfall 4

---

## CSS Selector Contract

所有打印样式作用于 `#print-area` 内部，不影响屏幕交互 UI。

| Selector | Purpose |
|----------|---------|
| `#print-area` | 根容器：设置 font-family 中文字体栈 |
| `.print-grid-table` | 栅格行的 `<table>` 容器：width 100%, border-collapse, table-layout fixed |
| `.print-cell` | 字段单元格 `<td>`：1px #000 border, 8px padding, vertical-align top |
| `.print-cell.empty-cell` | 空占位单元格：保留边框 |
| `.print-cell .field-label` | 字段标签：12pt, #333, margin-bottom 2px |
| `.print-cell .print-value` | 字段值：14pt, #000 |
| `.print-cell .print-value.empty` | 空值：显示 "—" |
| `.group-print` | 分组外层容器：data-break="group" |
| `.group-print .group-header` | 分组标题条：#f5f5f5 bg, 16pt bold, 8px 12px padding, 1px #000 border |
| `.group-print .group-body` | 分组内容区：1px #000 border (top: none) |
| `.dynamic-table-print-wrapper` | 动态表格外层容器：data-break="table" |
| `.print-table` | 动态表格 `<table>`：沿用现有样式 |
| `.print-table thead` | 动态表格表头：#f5f5f5 bg, 600 weight |
| `.print-cell img` | 签名图片：max-height 80px, 1px #000 border, object-fit contain |
| `[data-break]` | 分页算法扫描标记：row / group / table |
| `[data-thead]` | 表头复出坐标标记 |

---

## Quasar Override Contract

print 模式下需重置的 Quasar 组件样式（在 `#print-area` 作用域内）：

| Selector | Override | Reason |
|----------|----------|--------|
| `#print-area .q-card` | `box-shadow: none; border-radius: 0` | 去除卡片阴影和圆角 |
| `#print-area .q-card--bordered` | `border: none` | 由 .group-print 自行控制边框 |
| `#print-area .q-separator` | `display: none` | 不需要 Quasar 分隔线 |

**Source:** RESEARCH.md Pitfall 5

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| not applicable | none | 本阶段不使用 shadcn 或任何组件注册表 |

---

## Pre-Populated Sources

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md | 19 (D-01 through D-19) |
| RESEARCH.md | 6 (architecture patterns, code examples, pitfalls) |
| Existing print.css | 2 (dynamic table styles, @page margin) |
| REQUIREMENTS.md | 3 (PDF-01, PDF-02, PDF-03) |
| User input | 0 (all questions answered by upstream artifacts) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
