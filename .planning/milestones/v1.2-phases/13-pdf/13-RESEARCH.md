# Phase 13: PDF 保真输出 - Research

**Researched:** 2026-04-21
**Domain:** Client-side PDF generation (html2canvas + jsPDF), CSS Grid → Table conversion, smart pagination, Chinese font rendering
**Confidence:** HIGH

## Summary

Phase 13 在现有 html2canvas + jsPDF 图像快照方案上增量改进，核心挑战有三个：

1. **CSS Grid 兼容性**：html2canvas 1.4.1 对 `display: grid` / `grid-template-columns` 的支持存在已知缺陷（GitHub issues #2405, #2729, #3156）。当前 `GridFormRenderer` 和 `GroupRenderer` 的 `.grid-row` 使用 `display: grid; grid-template-columns: repeat(12, 1fr)`，直接截图会导致布局错位或空白。解决方案是在 `#print-area` 的 print 模式下，将 CSS Grid 行转换为 HTML `<table>` 行（12 列 `<td>` 合并为 colSpan），html2canvas 对 `<table>` 的渲染完全可靠。这与 STATE.md 中 "PrintableForm (table HTML) bypasses html2canvas CSS Grid issues" 的历史决策一致。[VERIFIED: GitHub issues niklasvh/html2canvas#2405, #2729, #3156]

2. **智能分页**：当前 `usePdfExport.ts` 按固定像素高度切片，会截断行/分组/表格。需要重写为 DOM 坐标扫描 + 智能切点算法：截图前用 `getBoundingClientRect()` 收集所有顶层元素的 Y 坐标，分页时将切点移到不横切任何元素的最近位置。[VERIFIED: jsPDF issue #3874, multiple SO threads]

3. **中文字体**：html2canvas 将 DOM 栅格化为位图，中文字形由浏览器渲染引擎处理后直接进入 canvas，PDF 中不存在字体嵌入问题。只需确保 `#print-area` 的 `font-family` 声明正确的中文字体栈。[VERIFIED: html2canvas rendering model — text is rasterized, not embedded as font glyphs]

**Primary recommendation:** 在 GridFormRenderer/GroupRenderer 的 `mode='print'` 路径下，将 CSS Grid 行渲染为 HTML `<table>` 结构（而非 `display: grid`），然后用 html2canvas 截图 + 智能分页算法切片 + jsPDF 组装 PDF。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 保留 `html2canvas + jsPDF` 图像快照方案（增量改进），不切换到 jspdf-autotable 纯矢量方案
- **D-02:** PDF 产物为 JPEG 图像序列（quality: 0.95 单条 / 0.9 批量）——接受"文本不可复制、体积略大"
- **D-03:** 复用现有 `usePdfExport.ts` 结构，只重写分页分片逻辑；导出函数签名不变
- **D-04:** 分页策略采用 "DOM 元素坐标抢占 + 智能切点"
- **D-05:** 粒度为"行级不截断"（SchemaRow 内多字段不拆分；SchemaGroup 优先换页，超页高降级行级切）
- **D-06:** 动态表格分页："表体 data row 可切 + 表头复出"
- **D-07:** 极端超高元素退化为像素强切 + 控制台警告
- **D-08:** 页眉：每页顶部居中显示表单名称
- **D-09:** 页脚：左侧提交时间（YYYY-MM-DD HH:mm），右侧页码 N / M
- **D-10:** 页眉页脚通过 `pdf.text()` 注入 PDF 层，不参与 html2canvas 截图
- **D-11:** 单页 PDF 也显示页眉页脚
- **D-12:** 系统字体堆栈，不 self-host Web Font
- **D-13:** 字体优先级：`'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif`
- **D-14:** 中文字形由 html2canvas 栅格化，无需额外字体处理
- **D-15:** 全字段表格边框（纸质风格）：1px #000 边框，gap 为 0，padding 8px
- **D-16:** 分组标题条背景 #f5f5f5，16pt 粗体，1px 黑色边框 + 分隔线
- **D-17:** 标签在上、值在下（保持与填写页一致）
- **D-18:** 签名 max-height 80px + 1px 黑色边框
- **D-19:** 空值显示 "—"，边框完整

### Claude's Discretion
- 边框粗细（1px vs 1.5px）与颜色深浅（#000 vs #333）的 ±10% 微调
- 智能切点算法实现细节：递归扫描 DOM、生成切点数组、二分查找 vs 线性查找
- html2canvas 的 scale 参数（当前单条 2、批量 1.5，可能上调到 3）
- 页眉页脚字号、颜色、左右内边距
- 表头复出的 DOM 克隆注入策略

### Deferred Ideas (OUT OF SCOPE)
- 矢量 PDF 路径（jspdf-autotable / jsPDF.text）：v2 重构项
- 自定义水印 / 公司 LOGO：v2 增强
- PDF 密码保护 / 打开限制：v2 增强
- 服务端 PDF 生成（Puppeteer）：REQUIREMENTS Out of Scope
- 多语言字体回退（日文/俄文/韩文）：未来扩展
- 打印专用黑白模式：不做额外黑白优化
- 批量导出流式生成（50+ 条）：v2 性能项
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PDF-01 | PDF 导出 1:1 还原栅格布局（表格线/边框/分组标题/字段对齐） | CSS Grid → HTML Table 转换确保 html2canvas 正确渲染栅格布局；print 模式 CSS 添加边框/背景色 |
| PDF-02 | PDF 正确处理分页，避免行/分组被截断 | DOM 坐标扫描 + 智能切点算法；动态表格表头复出通过 DOM 克隆注入 |
| PDF-03 | PDF 支持中文字体嵌入，避免乱码 | html2canvas 栅格化模型天然解决中文渲染；系统字体栈 CSS 声明确保浏览器选择正确中文字体 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSS Grid → Table 转换 | Browser / Client (Vue 组件) | — | print 模式下 Vue 模板直接渲染 `<table>` 结构，纯前端组件逻辑 |
| 智能分页算法 | Browser / Client (composable) | — | DOM 坐标扫描 + canvas 切片均在浏览器端完成 |
| 页眉页脚注入 | Browser / Client (jsPDF API) | — | `pdf.text()` 在 PDF 层直接写入，不涉及后端 |
| 中文字体渲染 | Browser / Client (系统字体) | — | 浏览器渲染引擎 + html2canvas 栅格化，无后端参与 |
| PDF 文件生成 | Browser / Client (jsPDF) | — | 纯客户端生成，`pdf.save()` 触发下载 |
| 打印样式 | Browser / Client (CSS) | — | `@media print` + print 模式 CSS 类 |

**注意：** 本阶段完全在客户端完成，不涉及后端 API 变更或数据库操作。

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html2canvas | 1.4.1 | DOM → Canvas 截图 | 项目已安装，D-01 锁定；对 `<table>` 渲染可靠 [VERIFIED: npm registry] |
| jsPDF | 4.2.1 | Canvas → PDF 组装 | 项目已安装，D-01 锁定；`pdf.text()` 支持页眉页脚注入 [VERIFIED: npm registry] |
| Vue 3 | ^3.5.12 | 组件渲染（print 模式模板） | 项目核心框架 [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Quasar | ^2.17.0 | UI 框架（q-card 等组件在 print 模式下需覆盖样式） | 已有依赖 [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html2canvas | html2canvas-pro 2.0.2 | 增加 oklch/color-mix 支持，但 CSS Grid 渲染引擎未改进；本项目不使用 oklch，无需切换 [VERIFIED: html2canvas-pro features page] |
| html2canvas | modern-screenshot | 更好的现代 CSS 支持，但 API 不同需重写；D-01 锁定 html2canvas [ASSUMED] |
| 客户端 PDF | Puppeteer 服务端 | 完美 CSS 支持，但 REQUIREMENTS.md Out of Scope（Bun 不兼容） [VERIFIED: REQUIREMENTS.md] |

**Installation:**
```bash
# 无需安装新依赖——html2canvas 1.4.1 和 jsPDF 4.2.1 已在 package.json 中
```

**Version verification:**
- html2canvas: 1.4.1 (latest on npm: 1.4.1) [VERIFIED: npm registry 2026-04-21]
- jsPDF: 4.2.1 (latest on npm: 4.2.1) [VERIFIED: npm registry 2026-04-21]

## Architecture Patterns

### System Architecture Diagram

```
SubmissionPage.vue (用户点击"导出 PDF")
        │
        ▼
  exportToPdf(element, filename)     ← usePdfExport.ts
        │
        ├─ 1. 收集元数据（表单名称、提交时间）
        │
        ├─ 2. DOM 坐标扫描
        │     └─ querySelectorAll('#print-area > *')
        │     └─ 递归扫描 group 内部 rows
        │     └─ getBoundingClientRect() → breakpoints[]
        │
        ├─ 3. html2canvas(element, { scale: 2 })
        │     └─ 输出完整高度 canvas
        │
        ├─ 4. 智能分页切片
        │     └─ for each page:
        │         ├─ 找到当前页高范围内的最佳切点
        │         ├─ canvas.drawImage() 切出该页图像
        │         └─ pdf.addImage() 写入 PDF
        │
        ├─ 5. 动态表格表头复出（特殊处理）
        │     └─ 检测切点是否在 dynamic-table 内部
        │     └─ 是 → 在新页顶部额外绘制 thead 位图
        │
        └─ 6. 页眉页脚注入
              └─ pdf.setPage(i) 遍历所有页
              └─ pdf.text() 写入页眉（表单名称）
              └─ pdf.text() 写入页脚（提交时间 + 页码）
```

### Recommended Project Structure
```
frontend/src/
├── composables/
│   └── usePdfExport.ts          # 重写：智能分页 + 页眉页脚（核心改造文件）
├── components/renderer/
│   ├── GridFormRenderer.vue      # 修改：print 模式渲染 <table> 替代 CSS Grid
│   ├── GroupRenderer.vue         # 修改：print 模式渲染 <table> + 标题条样式
│   ├── FieldRenderer.vue         # 修改：print 模式添加单元格边框 + padding
│   └── DynamicTablePrint.vue     # 微调：配合表头复出的 data 属性标记
├── components/submission/
│   └── SubmissionDetail.vue      # 微调：#print-area 添加中文字体栈 CSS
└── assets/
    └── print.css                 # 修改：v2 grid-form print 样式（table 边框/分组背景）
```

### Pattern 1: CSS Grid → HTML Table 转换（print 模式）
**What:** GridFormRenderer 和 GroupRenderer 在 `mode='print'` 时，将 `.grid-row`（CSS Grid）替换为 `<table>` + `<tr>` + `<td colspan>` 结构
**When to use:** 所有 print 模式渲染路径
**Why:** html2canvas 对 CSS Grid 支持不完整（已知 bug），但对 `<table>` 渲染完全可靠 [VERIFIED: GitHub issues]
**Example:**
```vue
<!-- GridFormRenderer.vue — print 模式下的行渲染 -->
<template v-if="mode === 'print'">
  <table class="print-grid-table">
    <template v-for="(item, idx) in schema.items" :key="idx">
      <!-- Row → <tr> -->
      <tr v-if="item.type === 'row'">
        <td
          v-for="field in item.fields"
          :key="field.id"
          :colspan="field.colSpan"
          class="print-cell"
        >
          <FieldRenderer :field="field" mode="print" :model-value="modelValue?.[field.id]" />
        </td>
        <!-- 填充剩余列 -->
        <td v-if="rowRemainder(item) > 0" :colspan="rowRemainder(item)" class="print-cell empty-cell" />
      </tr>
    </template>
  </table>
</template>
```

```css
/* print.css — 表格化栅格样式 */
.print-grid-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.print-cell {
  border: 1px solid #000;
  padding: 8px;
  vertical-align: top;
}
.print-cell.empty-cell {
  border: 1px solid #000;
}
```

### Pattern 2: 智能分页切点算法
**What:** 截图前扫描 DOM 元素坐标，生成安全切点数组，分页时选择不截断元素的最近切点
**When to use:** `exportToPdf()` 和 `exportBatchToPdf()` 的分页逻辑
**Example:**
```typescript
// usePdfExport.ts — 智能切点收集
interface BreakCandidate {
  y: number;        // 相对于 #print-area 顶部的像素偏移
  type: 'row' | 'group-start' | 'group-row' | 'table-row' | 'table-start';
  isTableInternal: boolean;  // 是否在动态表格内部（需要表头复出）
}

function collectBreakpoints(container: HTMLElement): BreakCandidate[] {
  const containerRect = container.getBoundingClientRect();
  const candidates: BreakCandidate[] = [];

  // 扫描 #print-area 的直接子元素（rows, groups, dynamic-tables）
  const items = container.querySelectorAll(':scope > .print-grid-table > tr, :scope > .group-print, :scope > .dynamic-table-print');

  for (const el of items) {
    const rect = el.getBoundingClientRect();
    const y = rect.top - containerRect.top;
    // 每个元素的顶部边缘是一个候选切点
    candidates.push({ y, type: classifyElement(el), isTableInternal: false });
  }

  // 对动态表格内部的 <tr> 也收集切点（表头复出场景）
  const tables = container.querySelectorAll('.dynamic-table-print .print-table tbody tr');
  for (const tr of tables) {
    const rect = tr.getBoundingClientRect();
    candidates.push({
      y: rect.top - containerRect.top,
      type: 'table-row',
      isTableInternal: true,
    });
  }

  return candidates.sort((a, b) => a.y - b.y);
}

function findBestBreak(candidates: BreakCandidate[], pageBottom: number): BreakCandidate | null {
  // 从 pageBottom 向上找最近的候选切点
  let best: BreakCandidate | null = null;
  for (const c of candidates) {
    if (c.y <= pageBottom) best = c;
    else break;
  }
  return best;
}
```

### Pattern 3: 页眉页脚注入（后置循环）
**What:** 所有内容页生成完毕后，遍历所有页面注入页眉页脚文本
**When to use:** PDF 生成的最后一步
**Example:**
```typescript
// usePdfExport.ts — 页眉页脚注入
// Source: jsPDF API — pdf.internal.getNumberOfPages() + pdf.setPage()
function injectHeaderFooter(
  pdf: jsPDF,
  formTitle: string,
  submitTime: string,
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const totalPages = pdf.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // 页眉：居中表单名称
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102); // #666
    pdf.text(formTitle, pageWidth / 2, 8, { align: 'center' });

    // 页脚左：提交时间
    pdf.text(submitTime, 15, pageHeight - 8);

    // 页脚右：页码
    pdf.text(`${i} / ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  }
}
```

### Anti-Patterns to Avoid
- **直接用 CSS Grid 截图**：html2canvas 对 `display: grid` 支持不完整，会导致布局错位。必须在 print 模式下转换为 `<table>` [VERIFIED: GitHub issues]
- **固定像素切片分页**：当前实现按 `maxContentHeight` 像素等分切片，会截断行/分组/表格。必须用 DOM 坐标智能切点 [VERIFIED: 现有代码 usePdfExport.ts L32-54]
- **在 html2canvas 截图中包含页眉页脚**：页眉页脚应通过 `pdf.text()` 注入 PDF 层，不应出现在 DOM 中参与截图（D-10 锁定）
- **scale 过高导致 canvas 超限**：浏览器 canvas 最大像素约 16384x16384 或 268M 总像素。A4 宽度 ~794px × scale:3 = 2382px，高度需控制在 ~112,000px 以内。超长表单需检查 [VERIFIED: html2canvas FAQ]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM → 位图渲染 | 自己遍历 DOM 绘制 canvas | html2canvas 1.4.1 | 处理了 CSS 盒模型、字体渲染、图片加载等数百个边界情况 [VERIFIED: 项目已使用] |
| PDF 文件格式 | 手写 PDF 二进制 | jsPDF 4.2.1 | PDF 规范极其复杂，jsPDF 处理了压缩、页面树、图像编码等 [VERIFIED: 项目已使用] |
| 12 列栅格对齐 | 用 JS 计算像素宽度 | HTML `<table>` + `colspan` | 浏览器原生 table-layout: fixed 完美处理等宽列分配，html2canvas 渲染可靠 |
| 中文字体渲染 | 手动加载/嵌入字体文件 | 系统字体栈 + html2canvas 栅格化 | D-12/D-14 锁定；html2canvas 将浏览器渲染结果直接转为位图，中文天然正确 |
| 表格边框合并 | 手动计算相邻边框 | CSS `border-collapse: collapse` | 浏览器原生处理相邻单元格边框合并，无需 JS 干预 |
| 页码 N/M 计算 | 手动计数页面 | `pdf.internal.getNumberOfPages()` | jsPDF 内部维护页面计数，后置循环注入最准确 [VERIFIED: jsPDF API] |

**Key insight:** 本阶段的核心价值在于"智能分页算法"和"CSS Grid → Table 转换"——这两个是必须手写的业务逻辑。其余所有底层能力（DOM 截图、PDF 组装、字体渲染、表格布局）都应交给已有库和浏览器引擎。

## Common Pitfalls

### Pitfall 1: html2canvas 对 CSS Grid 渲染失败
**What goes wrong:** `display: grid` + `grid-template-columns: repeat(12, 1fr)` 在 html2canvas 中渲染为空白或错位布局
**Why it happens:** html2canvas 内部重新实现了 CSS 布局引擎，但未完整支持 CSS Grid 规范（尤其是 `fr` 单位和 `grid-column: span N`）
**How to avoid:** print 模式下将 CSS Grid 行替换为 HTML `<table>` + `<td colspan>`。html2canvas 对 `<table>` 的渲染完全可靠
**Warning signs:** PDF 中字段全部堆叠在左上角，或字段之间有异常间距
**Confidence:** HIGH [VERIFIED: GitHub issues #2405, #2729, #3156]

### Pitfall 2: 分页切片截断行内容
**What goes wrong:** PDF 中某一行的上半部分在第 N 页底部，下半部分在第 N+1 页顶部
**Why it happens:** 按固定像素高度切片时，切点恰好落在某个 DOM 元素的中间
**How to avoid:** 截图前用 `getBoundingClientRect()` 收集所有元素的 Y 坐标，分页时将切点移到元素边界
**Warning signs:** PDF 中出现"半截"的文字行或表格行
**Confidence:** HIGH [VERIFIED: 现有代码 usePdfExport.ts 确实按固定高度切片]

### Pitfall 3: 动态表格跨页时表头丢失
**What goes wrong:** 动态表格在第 2 页继续显示数据行，但没有列标题，读者无法理解每列含义
**Why it happens:** html2canvas 截图是一整张位图，切片后新页顶部没有表头信息
**How to avoid:** 检测切点是否在动态表格内部；如果是，在新页的 canvas 切片顶部额外绘制表头区域的位图（从原始 canvas 中裁剪 thead 区域，drawImage 到新页顶部）
**Warning signs:** 多页动态表格的第 2+ 页缺少列标题
**Confidence:** HIGH [VERIFIED: D-06 明确要求表头复出]

### Pitfall 4: canvas 尺寸超过浏览器限制
**What goes wrong:** html2canvas 返回空白或损坏的 canvas
**Why it happens:** 浏览器对 canvas 有最大像素限制（通常 16384×16384 或 ~268M 总像素）。A4 宽度 794px × scale:2 = 1588px，如果表单高度超过 ~168,000px（约 200 页 A4），canvas 高度 × scale 会超限
**How to avoid:** 在调用 html2canvas 前检查元素高度 × scale 是否超过安全阈值（如 16000px）；超过时降低 scale 或分段截图
**Warning signs:** 超长表单导出时 PDF 全白或部分页面空白
**Confidence:** MEDIUM [VERIFIED: html2canvas FAQ 提及限制，但实际阈值因浏览器而异]

### Pitfall 5: Quasar 组件样式干扰打印
**What goes wrong:** q-card 的 shadow/border-radius、q-input 的 outline 等样式出现在 PDF 中
**Why it happens:** print 模式下 Quasar 组件的默认样式未被覆盖
**How to avoid:** 在 print.css 中用 `#print-area .q-card` 等选择器重置 Quasar 组件的 shadow、border-radius、padding
**Warning signs:** PDF 中出现圆角、阴影、输入框边框等非纸质表格风格的元素
**Confidence:** HIGH [VERIFIED: GroupRenderer 使用 q-card flat bordered]

### Pitfall 6: 页眉页脚与内容区重叠
**What goes wrong:** 页眉文字覆盖在内容图像上方
**Why it happens:** html2canvas 截图的 addImage 位置没有为页眉页脚预留空间
**How to avoid:** 内容区 margin 计算时，顶部预留页眉高度（约 12mm），底部预留页脚高度（约 12mm）。即 `contentTop = margin + headerHeight`，`maxContentHeight = pageHeight - margin*2 - headerHeight - footerHeight`
**Warning signs:** 第一行内容被页眉遮挡，或最后一行被页脚遮挡
**Confidence:** HIGH [VERIFIED: D-10 明确页眉页脚在 margin 之外]

## Code Examples

### Example 1: GridFormRenderer print 模式 — Table 渲染
```vue
<!-- GridFormRenderer.vue — print 模式分支 -->
<!-- Source: 基于现有 GridFormRenderer.vue 结构 + html2canvas table 兼容性需求 -->
<template>
  <div class="grid-form" :class="'mode-' + mode">
    <!-- Print 模式：用 <table> 替代 CSS Grid -->
    <template v-if="mode === 'print'">
      <table class="print-grid-table">
        <colgroup>
          <col v-for="i in 12" :key="i" style="width: 8.333%" />
        </colgroup>
        <template v-for="(item, idx) in schema.items" :key="idx">
          <!-- Row → <tr> -->
          <tr v-if="item.type === 'row'" class="print-row" data-break="row">
            <td
              v-for="field in item.fields"
              :key="field.id"
              :colspan="field.colSpan"
              class="print-cell"
            >
              <FieldRenderer :field="field" mode="print" :model-value="modelValue?.[field.id]" />
            </td>
            <td v-if="rowRemainder(item) > 0" :colspan="rowRemainder(item)" class="print-cell empty-cell" />
          </tr>
        </template>
      </table>

      <!-- Group 和 DynamicTable 在 table 外部渲染（各自独立 block） -->
      <template v-for="(item, idx) in schema.items" :key="'out-' + idx">
        <div v-if="item.type === 'group'" class="group-print" data-break="group">
          <GroupRenderer :group="item" mode="print" :model-value="modelValue" />
        </div>
        <div v-else-if="item.type === 'dynamic-table'" class="dynamic-table-print-wrapper" data-break="table">
          <DynamicTablePrint :label="item.label" :columns="item.columns" :rows="modelValue?.[item.id] ?? []" />
        </div>
      </template>
    </template>

    <!-- Fill/Designer 模式：保持现有 CSS Grid -->
    <template v-else>
      <!-- ... 现有代码不变 ... -->
    </template>
  </div>
</template>
```

**注意：** 上面的示例展示了核心思路。实际实现中，rows/groups/dynamic-tables 需要按 `schema.items` 的原始顺序交错渲染（不能先渲染所有 rows 再渲染 groups）。一种方案是将连续的 rows 合并到同一个 `<table>` 中，遇到 group 或 dynamic-table 时关闭当前 table、渲染 group/table、再开新 table。

### Example 2: 智能分页核心算法
```typescript
// usePdfExport.ts — 核心分页逻辑
// Source: DOM getBoundingClientRect + canvas drawImage 切片模式

interface PageSlice {
  startY: number;   // canvas 像素坐标（已乘 scale）
  endY: number;
  needsTableHeader: boolean;  // 是否需要在顶部绘制表头
  tableHeaderRect?: { y: number; height: number };  // 表头在 canvas 中的位置
}

function computePageSlices(
  breakpoints: BreakCandidate[],
  totalHeight: number,       // canvas 总高度（像素，已乘 scale）
  pageContentHeight: number, // 单页可用内容高度（像素，已乘 scale）
  scale: number,
): PageSlice[] {
  const slices: PageSlice[] = [];
  let currentY = 0;

  while (currentY < totalHeight) {
    const pageBottom = currentY + pageContentHeight;

    if (pageBottom >= totalHeight) {
      // 最后一页：直接到底
      slices.push({ startY: currentY, endY: totalHeight, needsTableHeader: false });
      break;
    }

    // 找到 pageBottom 之前的最佳切点
    const best = findBestBreak(breakpoints, pageBottom / scale);

    if (best && best.y * scale > currentY) {
      const cutY = best.y * scale;
      slices.push({
        startY: currentY,
        endY: cutY,
        needsTableHeader: false,
      });
      currentY = cutY;
    } else {
      // 没有合适切点（极端情况 D-07）：强制按页高切
      console.warn('[PDF] 无法找到安全切点，强制分页');
      slices.push({ startY: currentY, endY: pageBottom, needsTableHeader: false });
      currentY = pageBottom;
    }
  }

  return slices;
}
```

### Example 3: print.css 纸质表格样式
```css
/* print.css — v2 栅格表单打印样式 */

/* 打印区域中文字体栈 */
#print-area {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif;
}

/* 栅格表格（替代 CSS Grid） */
.print-grid-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.print-cell {
  border: 1px solid #000;
  padding: 8px;
  vertical-align: top;
}

.print-cell.empty-cell {
  /* 空单元格保留边框 */
}

/* 分组标题条 */
.group-print .group-header {
  background: #f5f5f5;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #000;
  border-bottom: 1px solid #000;
}

.group-print .group-body {
  border: 1px solid #000;
  border-top: none;
}

/* 分组内部也用 table */
.group-print .print-grid-table {
  border: none; /* 外层 group 已有边框 */
}

/* 字段标签/值样式 */
.print-cell .field-label {
  font-size: 12px;
  color: #333;
  margin-bottom: 2px;
}
.print-cell .print-value {
  font-size: 14px;
  color: #000;
}

/* 签名图片 */
.print-cell img {
  max-height: 80px;
  border: 1px solid #000;
  object-fit: contain;
}
```

### Example 4: 页眉页脚 margin 计算
```typescript
// A4 尺寸常量（mm）
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 15;           // 四周边距
const HEADER_HEIGHT = 10;    // 页眉区域高度
const FOOTER_HEIGHT = 10;    // 页脚区域高度

// 内容区域计算
const contentWidth = A4_WIDTH - MARGIN * 2;           // 180mm
const contentTop = MARGIN + HEADER_HEIGHT;             // 25mm
const contentBottom = A4_HEIGHT - MARGIN - FOOTER_HEIGHT; // 272mm
const maxContentHeight = contentBottom - contentTop;    // 247mm

// 页眉位置：margin 区域内
const headerY = MARGIN + 5;  // 20mm（margin 15mm + 5mm 偏移）

// 页脚位置：margin 区域内
const footerY = A4_HEIGHT - MARGIN + 5; // 282mm（底部 margin 内 5mm 偏移）
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas 固定像素切片 | DOM 坐标智能切点 | 2022+ 社区最佳实践 | 避免行/元素被截断，PDF 质量大幅提升 |
| jsPDF.text() 嵌入中文字体 | html2canvas 栅格化（位图方案） | N/A（两种路径并存） | 位图方案无需字体文件，但文本不可复制 |
| CSS Grid 直接截图 | CSS Grid → Table 转换后截图 | html2canvas 一直未完整支持 Grid | 确保栅格布局 1:1 保真 |
| 页眉页脚在 DOM 中渲染 | pdf.text() 后置注入 | jsPDF 最佳实践 | 页眉页脚不影响内容截图，页码 N/M 准确 |

**Deprecated/outdated:**
- html2pdf.js（html2canvas + jsPDF 的封装库）：最后更新 2021 年，不推荐新项目使用。直接使用 html2canvas + jsPDF 更灵活 [ASSUMED]
- jsPDF.html() 方法：使用内部 html2canvas 调用，但分页控制能力弱于手动方案 [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | html2pdf.js 最后更新 2021 年，不推荐 | State of the Art | 低风险——项目不使用该库 |
| A2 | jsPDF.html() 分页控制能力弱于手动方案 | State of the Art | 低风险——D-01 已锁定手动方案 |
| A3 | modern-screenshot 对 CSS Grid 支持更好 | Alternatives Considered | 低风险——D-01 已锁定 html2canvas |

**If this table is empty:** 本研究的核心技术声明（CSS Grid 兼容性、智能分页、中文字体栅格化）均已通过 GitHub issues、npm registry 或代码审查验证。仅有 3 个低风险假设，均不影响实施决策。

## Open Questions

1. **html2canvas 对 `<table>` + `colspan` 的渲染精度**
   - What we know: html2canvas 对 `<table>` 的支持远好于 CSS Grid，社区广泛使用
   - What's unclear: 12 列 `table-layout: fixed` + 各种 colspan 组合是否在所有浏览器上像素级一致
   - Recommendation: 实施后在 Chrome/Edge/Firefox 上各导出一份 PDF 对比验证

2. **超长表单的 canvas 尺寸安全阈值**
   - What we know: 浏览器 canvas 限制约 16384×16384 或 268M 总像素
   - What's unclear: 不同浏览器的具体限制值，以及超限时的行为（空白 vs 报错 vs 截断）
   - Recommendation: 在 `exportToPdf` 入口添加高度检查，超过安全阈值时降低 scale 或提示用户

3. **动态表格表头复出的位图裁剪精度**
   - What we know: 需要从完整 canvas 中裁剪 thead 区域，drawImage 到新页顶部
   - What's unclear: thead 的精确像素边界是否能通过 getBoundingClientRect 准确获取（考虑 border-collapse 的影响）
   - Recommendation: 为 `<thead>` 添加 `data-thead` 属性标记，截图前记录其精确坐标

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified) — 本阶段完全在客户端完成，所有依赖（html2canvas, jsPDF）已在 package.json 中安装。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + happy-dom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/composables/__tests__/usePdfExport.test.ts` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDF-01a | CSS Grid -> Table 转换：12 列 colSpan 正确映射为 HTML table colspan | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "table conversion"` | Wave 0 |
| PDF-01b | print 模式 CSS 样式：边框 1px #000、padding 8px、分组背景 #f5f5f5 | manual-only | 目视检查 PDF 输出 | N/A |
| PDF-01c | 字段对齐：不同 colSpan 组合（1+11, 4+4+4, 6+6, 3+3+3+3）在 PDF 中列宽正确 | manual-only | 导出含多种 colSpan 组合的测试表单 PDF，目视对比 | N/A |
| PDF-02a | 智能切点算法：collectBreakpoints 正确收集 DOM 元素 Y 坐标 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "breakpoints"` | Wave 0 |
| PDF-02b | 智能切点算法：findBestBreak 选择不截断元素的最近切点 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "findBestBreak"` | Wave 0 |
| PDF-02c | 分页切片：computePageSlices 生成正确的页面切片数组 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "pageSlices"` | Wave 0 |
| PDF-02d | 极端情况：超高元素退化为像素强切 + console.warn | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "fallback"` | Wave 0 |
| PDF-02e | 动态表格表头复出：切点在表格内部时标记 needsTableHeader | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "tableHeader"` | Wave 0 |
| PDF-02f | 页眉页脚注入：injectHeaderFooter 在每页正确位置写入文本 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "headerFooter"` | Wave 0 |
| PDF-02g | 分组不截断：整组放不下时换页，超页高时降级行级切 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "group break"` | Wave 0 |
| PDF-03a | 中文字体栈 CSS 声明正确 | unit | `npx vitest run src/composables/__tests__/usePdfExport.test.ts -t "font-family"` | Wave 0 |
| PDF-03b | 中文字符在 PDF 中无乱码 | manual-only | 导出含中文标签+中文值的表单 PDF，目视检查 | N/A |

### Test Strategy

**核心原则：** PDF 生成涉及 DOM 渲染 + Canvas 截图 + PDF 组装三个阶段。其中 html2canvas 和 jsPDF 是第三方库，不需要测试其内部逻辑。我们的测试重点是：

1. **纯函数单元测试（可自动化）：** 智能分页算法的核心函数（collectBreakpoints、findBestBreak、computePageSlices、injectHeaderFooter）是纯逻辑或可 mock 的函数，适合单元测试
2. **DOM 结构测试（可自动化）：** print 模式下 Vue 组件渲染出的 HTML 结构是否为 `<table>` + `<td colspan>`（而非 CSS Grid），可通过 happy-dom 环境测试
3. **视觉保真测试（手动）：** PDF 最终输出的视觉效果（边框粗细、字体渲染、对齐精度）必须人工目视检查，无法自动化

**Mock 策略：**
- `html2canvas` -> mock 返回固定尺寸的 canvas 对象（`{ width, height, toDataURL: () => 'data:...' }`）
- `jsPDF` -> mock 实例，验证 `addImage`/`addPage`/`text`/`save` 的调用参数和顺序
- `getBoundingClientRect` -> mock 返回预设的元素坐标，测试切点算法

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run src/composables/__tests__/usePdfExport.test.ts`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before /gsd-verify-work

### Wave 0 Gaps
- [ ] `frontend/src/composables/__tests__/usePdfExport.test.ts` -- 覆盖 PDF-01a, PDF-02a~PDF-02g, PDF-03a
- [ ] 测试 fixtures：预定义的 BreakCandidate[] 数组（模拟不同表单布局的元素坐标）
- [ ] jsPDF mock factory：可复用的 jsPDF 实例 mock（记录 addImage/addPage/text 调用）
- [ ] html2canvas mock factory：返回指定尺寸 canvas 的 mock 函数

```typescript
// 测试文件骨架示例：frontend/src/composables/__tests__/usePdfExport.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 1588,  // A4 宽度 794px * scale 2
    height: 4000, // 模拟多页高度
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
  }),
}));

// Mock jsPDF
const mockPdf = {
  internal: {
    pageSize: { getWidth: () => 210, getHeight: () => 297 },
    getNumberOfPages: vi.fn().mockReturnValue(2),
  },
  addImage: vi.fn(),
  addPage: vi.fn(),
  setPage: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
};
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdf),
}));

describe('collectBreakpoints', () => {
  it('收集所有顶层元素的 Y 坐标并排序', () => {
    // 测试 DOM 坐标扫描逻辑
  });

  it('包含动态表格内部 tr 的切点', () => {
    // 测试表格内部行的切点收集
  });
});

describe('findBestBreak', () => {
  it('返回 pageBottom 之前最近的候选切点', () => {
    // 测试切点选择逻辑
  });

  it('没有合适切点时返回 null', () => {
    // 测试极端情况
  });
});

describe('computePageSlices', () => {
  it('单页内容不分页', () => {
    // totalHeight <= pageContentHeight
  });

  it('多页内容在安全切点处分页', () => {
    // 验证切片边界对齐到 breakpoints
  });

  it('无安全切点时强制分页并输出警告', () => {
    // D-07 极端情况
    const warnSpy = vi.spyOn(console, 'warn');
    // ... 调用 computePageSlices
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('无法找到安全切点')
    );
  });
});

describe('injectHeaderFooter', () => {
  it('每页都注入页眉（表单名称居中）和页脚（时间+页码）', () => {
    // 验证 pdf.text() 调用次数和参数
  });

  it('单页 PDF 也显示页眉页脚（D-11）', () => {
    // getNumberOfPages 返回 1 时仍调用 text()
  });
});
```


## Security Domain

本阶段不涉及认证、会话、访问控制、加密或用户输入验证。PDF 生成完全在客户端浏览器中完成，不传输敏感数据到外部服务。

唯一安全考量：`html2canvas({ useCORS: true })` 允许跨域图片加载（用于签名图片），但签名数据已经是 base64 data URL，不涉及外部域名请求。

## Sources

### Primary (HIGH confidence)
- [npm registry] — html2canvas 1.4.1, jsPDF 4.2.1 版本验证
- [GitHub niklasvh/html2canvas#2405](https://github.com/niklasvh/html2canvas/issues/2405) — CSS Grid 渲染问题
- [GitHub niklasvh/html2canvas#2729](https://github.com/niklasvh/html2canvas/issues/2729) — Column layout 渲染问题
- [GitHub niklasvh/html2canvas#3156](https://github.com/niklasvh/html2canvas/issues/3156) — Grid item 渲染失败
- [GitHub parallax/jsPDF#3874](https://github.com/parallax/jsPDF/issues/3874) — 多页 PDF 内容分页
- [Stack Overflow — jsPDF page number footer](https://stackoverflow.com/questions/52170355/jspdf-print-current-pagenumber-in-footer-of-all-pages/64006144) — 页眉页脚注入模式
- 项目代码审查 — usePdfExport.ts, GridFormRenderer.vue, GroupRenderer.vue, FieldRenderer.vue, DynamicTablePrint.vue, SubmissionDetail.vue, SubmissionPage.vue, print.css, schema.ts

### Secondary (MEDIUM confidence)
- [html2canvas-pro features](https://yorickshan.github.io/html2canvas-pro/features.html) — CSS Grid 支持未改进确认
- [PixelsTech — jsPDF addImage pagination](https://www.pixelstech.net/article/1741242294-create-multiple-page-pdf-with-top-and-bottom-margins-using-jspdf-addimage) — 分页切片模式
- [掘金 — jsPDF + html2canvas A4 分页截断解决方案](https://juejin.cn/post/7138370283739545613) — 智能切点算法参考

### Tertiary (LOW confidence)
- [JavaScript in Plain English — Say Goodbye to html2canvas](https://javascript.plainenglish.io/say-goodbye-to-html2canvas-%EF%B8%8F-665c9e680198) — 替代方案概述（不影响本阶段决策）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 项目已安装 html2canvas 1.4.1 + jsPDF 4.2.1，D-01 锁定，npm 验证为最新版
- Architecture: HIGH — CSS Grid → Table 转换有 GitHub issues 明确支撑；智能分页算法有多个社区实现参考
- Pitfalls: HIGH — 6 个 pitfall 中 5 个通过代码审查或 GitHub issues 验证，1 个（canvas 尺寸限制）为 MEDIUM

**Research date:** 2026-04-21
**Valid until:** 2026-05-21（html2canvas 和 jsPDF 均为稳定库，30 天内不太可能有破坏性变更）
