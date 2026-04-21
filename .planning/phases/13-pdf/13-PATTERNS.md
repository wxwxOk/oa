# Phase 13: PDF 保真输出 - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 7 (modified/rewritten)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/composables/usePdfExport.ts` | composable (service) | transform (DOM→Canvas→PDF) | 自身现有实现 | exact (rewrite) |
| `frontend/src/components/renderer/GridFormRenderer.vue` | component | request-response (props→render) | 自身现有实现 + `DynamicTablePrint.vue` table 模式 | exact |
| `frontend/src/components/renderer/GroupRenderer.vue` | component | request-response (props→render) | 自身现有实现 + `DynamicTablePrint.vue` table 模式 | exact |
| `frontend/src/components/renderer/FieldRenderer.vue` | component | request-response (props→render) | 自身现有实现 (print 分支 L9-24) | exact (style-only) |
| `frontend/src/components/renderer/DynamicTablePrint.vue` | component | request-response (props→render) | 自身现有实现 | exact (minor tweak) |
| `frontend/src/assets/print.css` | config (stylesheet) | N/A | 自身现有实现 + `DynamicTablePrint.vue` scoped styles | exact |
| `frontend/src/components/submission/SubmissionDetail.vue` | component | request-response | 自身现有实现 | exact (CSS-only) |
| `frontend/src/composables/__tests__/usePdfExport.test.ts` | test | N/A | `composables/__tests__/useDarkMode.test.ts` + `renderer/__tests__/dynamicTableUtils.test.ts` | role-match |

## Pattern Assignments

### `frontend/src/composables/usePdfExport.ts` (composable, transform — 核心重写)

**Analog:** 自身现有实现 (`usePdfExport.ts`)

**Imports pattern** (lines 1-2):
```typescript
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
```

**Core pattern — html2canvas 调用** (lines 13-18):
```typescript
const canvas = await html2canvas(element, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
});
```
> 保持不变。单条 scale:2，批量 scale:1.5。

**Core pattern — PDF 初始化 + 尺寸计算** (lines 21-27):
```typescript
const pdf = new jsPDF('p', 'mm', 'a4');
const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();
const margin = 15; // mm
const contentWidth = pageWidth - margin * 2;
const imgHeight = (canvas.height * contentWidth) / canvas.width;
const maxContentHeight = pageHeight - margin * 2;
```
> 重写时需增加 HEADER_HEIGHT 和 FOOTER_HEIGHT 预留（各约 10mm），使 contentTop = margin + HEADER_HEIGHT，maxContentHeight = pageHeight - margin*2 - HEADER_HEIGHT - FOOTER_HEIGHT。

**Core pattern — canvas 切片分页** (lines 32-54):
```typescript
// 当前实现：固定像素切片（需重写为智能切点）
let remainingHeight = imgHeight;
let sourceY = 0;
while (remainingHeight > 0) {
  const sliceHeight = Math.min(remainingHeight, maxContentHeight);
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = canvas.width;
  sliceCanvas.height = (sliceHeight / contentWidth) * canvas.width;
  const ctx = sliceCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable — browser resource limit reached');
  }
  ctx.drawImage(
    canvas,
    0, sourceY, canvas.width, sliceCanvas.height,
    0, 0, sliceCanvas.width, sliceCanvas.height,
  );
  const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
  if (sourceY > 0) pdf.addPage();
  pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidth, sliceHeight);
  sourceY += sliceCanvas.height;
  remainingHeight -= sliceHeight;
}
```
> 重写要点：将 `Math.min(remainingHeight, maxContentHeight)` 替换为 `findBestBreak()` 智能切点查找。canvas.drawImage 切片模式保持不变。addImage 的 y 坐标从 `margin` 改为 `contentTop`（为页眉留空间）。

**Error handling pattern** (lines 42-43):
```typescript
if (!ctx) {
  throw new Error('Canvas 2D context unavailable — browser resource limit reached');
}
```
> 保持此模式。新增：canvas 尺寸超限检查（totalHeight * scale > 16000 时 console.warn）。

**Export signature pattern** (lines 9-12, 69-75):
```typescript
export async function exportToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {

export async function exportBatchToPdf(
  renderFn: (index: number) => Promise<HTMLElement>,
  total: number,
  filename: string,
  onProgress?: (current: number, total: number) => void,
  cancelRef?: { value: boolean },
): Promise<boolean> {
```
> D-03 锁定：函数签名不变。内部新增 `formTitle` 和 `submitTime` 参数传递（通过 element 的 data 属性或额外可选参数）。

---

### `frontend/src/components/renderer/GridFormRenderer.vue` (component — print 模式 table 转换)

**Analog:** 自身 + `DynamicTablePrint.vue` (table 渲染模式)

**Imports pattern** (lines 53-58):
```typescript
import { reactive } from 'vue';
import { flattenFields, type SchemaV2 } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';
import GroupRenderer from './GroupRenderer.vue';
import DynamicTableFill from './DynamicTableFill.vue';
import DynamicTablePrint from './DynamicTablePrint.vue';
```
> 不变。

**Props pattern** (lines 60-64):
```typescript
const props = defineProps<{
  schema: SchemaV2;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();
```
> 不变。mode='print' 分支新增 table 渲染路径。

**Template pattern — 现有 CSS Grid 渲染** (lines 1-49):
```vue
<template>
  <div class="grid-form" :class="'mode-' + mode">
    <template v-for="(item, idx) in schema.items" :key="idx">
      <!-- Row -->
      <div v-if="item.type === 'row'" class="grid-row">
        <FieldRenderer
          v-for="field in item.fields"
          :key="field.id"
          :field="field"
          :mode="mode"
          :style="{ gridColumn: `span ${field.colSpan}` }"
          :model-value="modelValue?.[field.id]"
          @update:model-value="emitField(field.id, $event)"
        />
      </div>
      <!-- Group -->
      <GroupRenderer v-else-if="item.type === 'group'" ... />
      <!-- 动态表格 -->
      <template v-else-if="item.type === 'dynamic-table'">
        <DynamicTablePrint v-else-if="mode === 'print'" ... />
      </template>
    </template>
  </div>
</template>
```
> 重写要点：mode='print' 时，将连续 rows 合并到 `<table class="print-grid-table">` 中，遇到 group/dynamic-table 时关闭当前 table、渲染独立 block、再开新 table。每个 row 渲染为 `<tr>` + `<td colspan>` + 填充剩余列的空 `<td>`。

**Table analog — DynamicTablePrint.vue** (lines 2-32):
```vue
<div class="dynamic-table-print">
  <table class="print-table">
    <colgroup>
      <col v-for="col in columns" :key="col.key" :style="{ width: colWidth(col) }" />
    </colgroup>
    <thead>
      <tr>
        <th v-for="col in columns" :key="col.key" class="print-th">{{ col.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
        <td v-for="col in columns" :key="col.key" class="print-td">{{ formatCell(row[col.key], col.type) }}</td>
      </tr>
    </tbody>
  </table>
</div>
```
> 这是 GridFormRenderer print 模式 table 渲染的直接参考。12 列固定宽度用 `<colgroup><col style="width: 8.333%"></colgroup>` 替代 DynamicTablePrint 的动态宽度。

**Style pattern — DynamicTablePrint.vue** (lines 49-72):
```css
.print-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.print-th {
  border: 1px solid #000;
  padding: 8px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}
.print-td {
  border: 1px solid #000;
  padding: 8px;
  font-size: 14px;
}
```
> GridFormRenderer 的 `.print-grid-table` 和 `.print-cell` 应复制此模式（border-collapse: collapse, table-layout: fixed, 1px solid #000, padding 8px）。

---

### `frontend/src/components/renderer/GroupRenderer.vue` (component — print 模式样式强化)

**Analog:** 自身现有实现

**Template pattern** (lines 1-18):
```vue
<q-card flat bordered class="group-renderer q-mb-sm">
  <div class="group-header">{{ group.title }}</div>
  <div class="group-body">
    <div v-for="(row, idx) in group.rows" :key="idx" class="grid-row">
      <FieldRenderer
        v-for="field in row.fields"
        :key="field.id"
        :field="field"
        :mode="mode"
        :style="{ gridColumn: `span ${field.colSpan}` }"
        :model-value="modelValue?.[field.id]"
        @update:model-value="emitField(field.id, $event)"
      />
    </div>
  </div>
</q-card>
```
> 重写要点：mode='print' 时，group-body 内的 `.grid-row` 也需要转换为 `<table>` + `<tr>` + `<td colspan>` 结构（与 GridFormRenderer 相同模式）。q-card 的 shadow/border-radius 需在 print 模式下覆盖。

**Style pattern** (lines 45-59):
```css
.group-header {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--oa-border);
}
.group-body {
  padding: 16px;
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}
```
> print 模式覆盖：group-header 背景 #f5f5f5，border 改为 1px solid #000，padding 调整为 8px 12px。group-body padding 改为 0（table 自带 padding）。grid-row 替换为 table。

---

### `frontend/src/components/renderer/FieldRenderer.vue` (component — print 模式边框/padding)

**Analog:** 自身现有实现 (print 分支)

**Print template pattern** (lines 9-24):
```vue
<template v-if="mode === 'print'">
  <template v-if="field.type === 'signature'">
    <img v-if="modelValue" :src="modelValue" style="max-height: 80px; object-fit: contain" />
    <span v-else class="print-value empty">—</span>
  </template>
  <template v-else-if="field.type === 'checkbox'">
    <span class="print-value" :class="{ empty: !modelValue?.length }">
      {{ Array.isArray(modelValue) && modelValue.length ? modelValue.join('、') : '—' }}
    </span>
  </template>
  <template v-else>
    <span class="print-value" :class="{ empty: !modelValue }">
      {{ modelValue || '—' }}
    </span>
  </template>
</template>
```
> 模板逻辑不变。签名 img 需加 `border: 1px solid #000`（D-18）。

**Style pattern** (lines 169-186):
```css
.field-label {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 4px;
}
.print-value {
  font-size: 14px;
  line-height: 1.5;
  color: var(--oa-text-primary);
}
.print-value.empty {
  color: var(--oa-text-tertiary);
}
```
> print 模式下 field-label 字号改为 12px，颜色 #333（D-17）。print-value 颜色改为 #000。这些覆盖放在 print.css 中（通过 `#print-area .field-label` 选择器），不修改 scoped style。

---

### `frontend/src/components/renderer/DynamicTablePrint.vue` (component — 微调配合分页)

**Analog:** 自身现有实现

**现有实现已到位** (lines 1-72)：
- `<table class="print-table">` + `border-collapse: collapse` + `table-layout: fixed` 已符合纸质表格风格
- `<thead>` + `<tbody>` 结构已正确分离
- 边框 `1px solid #000`、padding `8px` 已符合 D-15

**微调要点：**
- 为 `<thead>` 添加 `data-thead` 属性标记，供分页算法定位表头区域坐标
- 为每个 `<tbody><tr>` 添加 `data-break="table-row"` 属性，供分页算法收集切点
- 外层 `.dynamic-table-print` 添加 `data-break="table"` 属性

---

### `frontend/src/assets/print.css` (stylesheet — v2 grid-form 打印样式)

**Analog:** 自身现有实现 + `DynamicTablePrint.vue` scoped styles

**现有 @media print 规则** (lines 1-66):
```css
@media print {
  /* 打印克隆区域 */
  #print-clone { display: block !important; ... }
  /* 表格排版（v1 schema） */
  .detail-table { width: 100%; border-collapse: collapse; font-size: 12pt; }
  .detail-table th, .detail-table td { border: 1px solid #333; padding: 8px 12px; }
  .detail-table th { background: #f5f5f5; font-weight: 600; width: 30%; }
  /* 动态表格打印 */
  .dynamic-table-print { page-break-inside: avoid; margin-top: 12px; }
  .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .print-table th, .print-table td { border: 1px solid #000; padding: 6px 8px; }
  .print-table th { font-weight: 600; background: #f5f5f5; }
  /* 页面设置 */
  @page { margin: 15mm; size: A4; }
}
```
> 新增内容（在 `@media print` 块内追加）：
> 1. `#print-area` 中文字体栈声明
> 2. `.print-grid-table` 表格样式（复制 `.print-table` 模式）
> 3. `.print-cell` 单元格样式
> 4. `.group-print` 分组打印样式（标题条背景 + 边框）
> 5. `#print-area .field-label` / `.print-value` 覆盖样式
> 6. `#print-area .q-card` Quasar 组件样式重置（去 shadow/border-radius）
> 7. 签名 img 边框

**注意：** print.css 同时服务于浏览器打印（`@media print`）和 PDF 导出（html2canvas 截图）。html2canvas 不解析 `@media print`，因此 PDF 导出路径的样式需要通过非 media-query 的 CSS 类来应用（如 `#print-area .print-grid-table`），或在截图前动态注入样式。

---

### `frontend/src/components/submission/SubmissionDetail.vue` (component — CSS-only 微调)

**Analog:** 自身现有实现

**#print-area 容器** (line 16):
```vue
<div id="print-area" class="detail-body">
```
> 微调：添加中文字体栈 inline style 或 CSS class，确保 html2canvas 截图时字体声明生效。

**print-header 结构** (lines 18-23):
```vue
<div class="print-header" style="text-align: center; margin-bottom: 16px">
  <div style="font-size: 16pt; font-weight: 600">{{ templateName }}</div>
  <div style="font-size: 12pt; color: var(--oa-text-secondary)">
    提交时间：{{ formatDate(submission.createdAt) }}
  </div>
</div>
```
> D-10 决定页眉页脚通过 pdf.text() 注入，不在 DOM 中。但 print-header 仍保留用于浏览器打印。PDF 导出时需要将 formTitle 和 submitTime 传递给 usePdfExport（通过 data 属性：`data-form-title` / `data-submit-time`）。


---

### `frontend/src/composables/__tests__/usePdfExport.test.ts` (test — 新建)

**Analog:** `composables/__tests__/useDarkMode.test.ts` (mock 模式) + `renderer/__tests__/dynamicTableUtils.test.ts` (纯函数测试模式)

**Test file structure — useDarkMode.test.ts** (lines 1-39):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟外部依赖
const mockDark = { isActive: false, toggle: vi.fn() };
vi.mock('quasar', () => ({
  useQuasar: () => ({ dark: mockDark }),
}));

import { useDarkMode } from '../useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    mockDark.isActive = false;
    mockDark.toggle.mockClear();
    localStorage.clear();
  });

  it('isDark 反映 $q.dark.isActive', () => { ... });
  it('toggleDark 调用 $q.dark.toggle()', () => { ... });
});
```
> 复制此模式：顶层 vi.mock 外部库（html2canvas, jspdf），beforeEach 重置 mock 状态。

**Pure function test pattern — dynamicTableUtils.test.ts** (lines 1-8):
```typescript
import { describe, it, expect } from 'vitest';
import {
  createEmptyRow,
  formatCell,
  calcColWidth,
  type TableColumn,
} from '../dynamicTableUtils';
```
> 复制此模式：直接导入纯函数（collectBreakpoints, findBestBreak, computePageSlices, injectHeaderFooter），用预设数据测试输入输出。

**Mock factory pattern（新建，参考 useDarkMode 的 mock 风格）：**
```typescript
// html2canvas mock
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 1588,
    height: 4000,
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
  }),
}));

// jsPDF mock
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
```

---

## Shared Patterns

### 中文字体栈
**Source:** D-12/D-13 决策（无现有代码实现）
**Apply to:** `SubmissionDetail.vue` (#print-area), `print.css`
```css
#print-area {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif;
}
```

### 纸质表格边框
**Source:** `DynamicTablePrint.vue` lines 60-71
**Apply to:** GridFormRenderer print table, GroupRenderer print table, print.css
```css
/* 统一边框模式 */
border: 1px solid #000;
padding: 8px;
/* 表格基础 */
width: 100%;
border-collapse: collapse;
table-layout: fixed;
```

### 12 列栅格 → table colspan 映射
**Source:** 无现有实现（新模式）
**Apply to:** GridFormRenderer print 模式, GroupRenderer print 模式
```typescript
// 计算行内剩余列数（用于填充空 <td>）
function rowRemainder(row: SchemaRow): number {
  const used = row.fields.reduce((sum, f) => sum + f.colSpan, 0);
  return Math.max(0, 12 - used);
}
```
```vue
<!-- 12 列固定宽度 colgroup -->
<colgroup>
  <col v-for="i in 12" :key="i" style="width: 8.333%" />
</colgroup>
```

### data-break 属性标记（分页算法消费）
**Source:** 无现有实现（新模式）
**Apply to:** GridFormRenderer, GroupRenderer, DynamicTablePrint
```html
<!-- 分页算法通过 data-break 属性识别元素类型 -->
<tr data-break="row">...</tr>
<div data-break="group" class="group-print">...</div>
<div data-break="table" class="dynamic-table-print">...</div>
<tr data-break="table-row">...</tr>  <!-- 动态表格内部行 -->
<thead data-thead>...</thead>         <!-- 表头定位标记 -->
```

### Quasar 组件 print 模式重置
**Source:** `frontend/src/css/assets/print.css` lines 1-15
**Apply to:** print.css（新增规则）
```css
/* 现有模式：隐藏 Quasar 布局元素 */
.q-header, .q-drawer, .q-footer, .q-page-sticky, .no-print {
  display: none !important;
}
/* 新增：重置 q-card 在 print-area 内的样式 */
#print-area .q-card {
  box-shadow: none !important;
  border-radius: 0 !important;
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | 本阶段所有文件均为现有文件的修改/重写，每个文件都有自身作为 exact analog。新增的智能分页算法和 table 转换逻辑虽然是全新代码，但承载它们的文件（usePdfExport.ts, GridFormRenderer.vue）已存在，结构模式可直接参考。 |

唯一的"无直接 analog"模式是 **12 列 CSS Grid → HTML table colspan 转换**，这是本阶段的核心创新点。最接近的参考是 `DynamicTablePrint.vue` 的 table 渲染模式，但它是动态列宽而非固定 12 列栅格。RESEARCH.md 中的 Pattern 1 代码示例提供了具体实现参考。

## Metadata

**Analog search scope:** `frontend/src/composables/`, `frontend/src/components/renderer/`, `frontend/src/components/submission/`, `frontend/src/assets/`, `frontend/src/css/assets/`, `frontend/src/composables/__tests__/`, `frontend/src/components/renderer/__tests__/`
**Files scanned:** 14 (source files) + 6 (test files)
**Pattern extraction date:** 2026-04-21
