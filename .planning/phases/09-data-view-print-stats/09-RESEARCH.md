# Phase 9: 数据查看 + 打印 + 统计 - Research

**Researched:** 2026-04-20
**Domain:** 数据展示、浏览器打印、PDF 导出、图表统计
**Confidence:** HIGH

## Summary

Phase 9 在已有 Submission + ShareLink 数据模型基础上，构建数据查看、打印、PDF 导出和统计功能。后端需新增提交数据查询 API（列表+详情+统计聚合），前端需新增提交列表页、详情抽屉、打印样式、PDF 导出和 Dashboard 统计区域。

核心技术栈已在项目中成熟运用（QTable 分页、Pinia store、Elysia 模块化路由），新增依赖仅 html2canvas + jsPDF（PDF 导出）和 vue-chartjs + chart.js（统计图表）。打印功能使用浏览器原生 window.print() + @media print CSS，零依赖。

**Primary recommendation:** 按"后端 API → 前端列表+详情 → 打印+PDF → 统计面板"顺序实现，每层可独立验证。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 列表入口：模板列表页每行"查看数据"操作按钮
- 路由设计：`/templates/:id/submissions`
- 列表列：序号、填写者姓名、手机号、提交时间、分享人、操作（查看/打印）
- 筛选条件：填写者姓名 + 日期范围 + 手机号 + 分享人
- 分页方式：与现有 QTable 分页模式一致（page + size）
- 权限控制：新增 `form:submission:list` 权限码
- 详情交互：侧边抽屉（QDrawer）
- 详情内容：表格式布局，字段名+字段值逐行展示，签名图片底部展示
- 版本还原：根据 submission.schemaVersion 从模板历史还原字段定义
- 打印触发：侧边抽屉内"打印"按钮
- 打印实现：window.print() + @media print CSS
- 打印排版：表头（模板名称+提交时间）+ 表格行（字段名|值）+ 签名图片底部
- 打印区域：仅打印抽屉内详情内容，隐藏其他 UI 元素
- PDF 生成位置：前端生成
- PDF 技术方案：html2canvas + jsPDF
- PDF 导出范围：单条导出 + 批量导出
- PDF 文件命名：`{模板名称}_{提交时间}.pdf`（单条）/ `{模板名称}_批量导出.pdf`（批量）
- 统计入口：嵌入现有 Dashboard 页面
- 统计展示：表格 + 柱状图
- 统计维度：员工姓名、分享次数、收集数量
- 时间筛选：本周 / 本月 / 自定义日期范围
- 图表库：轻量方案（vue-chartjs 或 Quasar 内置）
- 统计权限：新增 `form:stats:view` 权限码

### Claude's Discretion
- 具体 @media print CSS 细节（边距、字体大小等）
- html2canvas + jsPDF 的具体配置参数
- 图表库最终选择（vue-chartjs / ECharts lite / 其他轻量方案）
- 批量导出时的进度提示 UI
- 抽屉宽度和响应式断点
- API 路由命名和错误码设计

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | 有权限的用户可查看表单所有提交数据，支持分页和筛选 | 后端 Prisma 查询 + QTable server-side pagination 模式（UserPage.vue 参考） |
| DATA-02 | 用户可查看单条提交的详细内容 | QDrawer 侧边抽屉 + FormFieldRenderer 只读模式复用 |
| DATA-03 | 支持浏览器打印提交数据（类似纸质表格排版） | window.print() + @media print CSS，零依赖 |
| DATA-04 | 支持导出提交数据为 PDF 文件 | html2canvas 1.4.1 + jsPDF 4.2.1 前端生成 |
| DATA-05 | 基础统计：每个员工的分享次数和收集数量 | vue-chartjs 5.3.3 + chart.js 4.5.1 柱状图 + Prisma groupBy 聚合 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 提交数据列表查询 | API / Backend | Database | Prisma 分页查询 + 关联 ShareLink.creator |
| 提交详情展示 | Frontend (SPA) | — | QDrawer 内渲染，数据已在列表 API 或单独详情 API 获取 |
| 浏览器打印 | Browser / Client | — | window.print() 纯浏览器行为，@media print CSS 控制排版 |
| PDF 导出 | Browser / Client | — | html2canvas + jsPDF 前端生成，不经过后端 |
| 统计聚合 | API / Backend | Database | Prisma groupBy 聚合查询，前端仅展示 |
| 统计图表渲染 | Frontend (SPA) | — | vue-chartjs 在 DashboardPage 内渲染 |
| 权限控制 | API / Backend | Frontend (SPA) | 后端 authGuard 拦截，前端 v-perm 隐藏按钮 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html2canvas | 1.4.1 | DOM 截图为 Canvas | PDF 导出的 DOM→图片转换层，CONTEXT.md 锁定 [VERIFIED: npm registry] |
| jsPDF | 4.2.1 | Canvas→PDF 文件生成 | 前端 PDF 生成标准库，CONTEXT.md 锁定 [VERIFIED: npm registry] |
| vue-chartjs | 5.3.3 | Vue 3 Chart.js 封装 | Vue 生态标准图表方案，Composition API 原生支持 [VERIFIED: npm registry] |
| chart.js | 4.5.1 | 图表渲染引擎 | vue-chartjs 的 peer dependency [VERIFIED: npm registry] |

### Supporting (已在项目中)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| quasar | ^2.17.0 | QTable/QDrawer/QDate 等 UI 组件 | 列表、抽屉、日期筛选 [VERIFIED: package.json] |
| pinia | ^2.2.4 | 状态管理 | submission store [VERIFIED: package.json] |
| axios | ^1.7.7 | HTTP 请求 | API 调用 [VERIFIED: package.json] |
| @prisma/client | ^5.22.0 | ORM 查询 | 后端数据查询 [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html2canvas + jsPDF | html2pdf.js 0.14.0 | 封装更简单但灵活性低，且 CONTEXT.md 已锁定 html2canvas + jsPDF |
| vue-chartjs | ECharts | 功能更强但体积大（~800KB vs ~200KB），本阶段仅需柱状图 |
| vue-chartjs | Quasar 内置 | Quasar 无内置图表组件，需外部库 |

**Installation:**
```bash
cd frontend && npm install html2canvas jspdf vue-chartjs chart.js
```

**Version verification:** 所有版本已通过 npm view 验证（2026-04-20）。

## Architecture Patterns

### System Architecture Diagram

```
用户请求
  │
  ├─ [列表] GET /api/v1/templates/:id/submissions?page&size&filters
  │    → authGuard('form:submission:list')
  │    → Prisma: Submission.findMany + count (JOIN ShareLink→User for 分享人)
  │    → Response: { rows, total, page, size }
  │
  ├─ [详情] GET /api/v1/templates/:id/submissions/:subId
  │    → authGuard('form:submission:list')
  │    → Prisma: Submission.findUnique (include ShareLink→User)
  │    → Response: { submission + shareLink.creator }
  │
  ├─ [统计] GET /api/v1/form-stats?dateFrom&dateTo
  │    → authGuard('form:stats:view')
  │    → Prisma: ShareLink.groupBy(creatorId) + Submission.groupBy(shareLinkId→creatorId)
  │    → Response: [{ userId, realName, shareCount, submissionCount }]
  │
  ├─ [打印] 前端 window.print()
  │    → @media print CSS 隐藏非打印区域
  │    → 仅渲染 #print-area 内容
  │
  └─ [PDF] 前端 html2canvas → jsPDF
       → 截取 #print-area DOM → Canvas → PDF blob → 下载
```

### Recommended Project Structure
```
backend/src/modules/
├── submission/
│   └── submission.route.ts    # 提交数据查询 API（列表+详情）
├── dashboard/
│   └── dashboard.route.ts     # 扩展：新增 form-stats 统计 API

frontend/src/
├── pages/
│   └── SubmissionPage.vue     # 提交列表 + QDrawer 详情 + 打印/PDF
├── components/
│   └── submission/
│       ├── SubmissionDetail.vue   # 详情内容（抽屉内 + 打印区域）
│       └── FormStatsPanel.vue     # 统计面板（嵌入 DashboardPage）
├── composables/
│   └── usePdfExport.ts        # html2canvas + jsPDF 封装
├── stores/
│   └── submission.ts          # 提交数据 store
└── assets/
    └── print.css              # @media print 全局样式
```

### Pattern 1: 后端提交数据查询 API（复用 template.route.ts 模式）
**What:** 新建 submission 模块，挂载到 `/api/v1/templates/:id/submissions`
**When to use:** 提交数据列表和详情查询
**Example:**
```typescript
// Source: 项目现有 template.route.ts 模式
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { notFound } from '../../utils/errors';

export const submissionModule = new Elysia({ prefix: '/templates/:templateId/submissions' })
  .use(authGuard('form:submission:list'))
  // 列表：分页 + 筛选
  .get('/', async ({ params, query }: any) => {
    const templateId = Number(params.templateId);
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 20;
    const where: any = { templateId };

    // 筛选条件
    if (query.submitterName) {
      where.submitterName = { contains: query.submitterName };
    }
    if (query.submitterPhone) {
      where.submitterPhone = { contains: query.submitterPhone };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }
    if (query.sharerId) {
      where.shareLink = { creatorId: Number(query.sharerId) };
    }

    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          shareLink: {
            include: { creator: { select: { id: true, realName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.submission.count({ where }),
    ]);
    return { rows, total, page, size };
  })
  // 详情
  .get('/:id', async ({ params }: any) => {
    const sub = await prisma.submission.findUnique({
      where: { id: Number(params.id) },
      include: {
        shareLink: {
          include: { creator: { select: { id: true, realName: true } } },
        },
        template: {
          select: { name: true, schema: true, schemaVersion: true },
        },
      },
    });
    if (!sub) throw notFound('提交记录不存在');
    return sub;
  });
```

### Pattern 2: QDrawer 侧边抽屉详情
**What:** 在列表页内使用 QDrawer 展示提交详情，不离开列表
**When to use:** DATA-02 详情查看
**Example:**
```vue
<!-- Source: Quasar QDrawer 文档 + 项目 QDialog 模式 -->
<q-drawer
  v-model="drawerOpen"
  side="right"
  :width="480"
  bordered
  overlay
>
  <SubmissionDetail
    v-if="selectedSubmission"
    :submission="selectedSubmission"
    :template-name="templateName"
    @print="handlePrint"
    @export-pdf="handleExportPdf"
    @close="drawerOpen = false"
  />
</q-drawer>
```

### Pattern 3: @media print CSS 打印排版
**What:** 使用 CSS @media print 控制打印区域和排版
**When to use:** DATA-03 浏览器打印
**Example:**
```css
/* Source: 浏览器打印标准模式 */
@media print {
  /* 隐藏所有非打印内容 */
  body > *:not(#print-area),
  .q-drawer__backdrop,
  .q-header,
  .q-footer,
  .q-page-sticky,
  .no-print {
    display: none !important;
  }

  /* 打印区域全屏 */
  #print-area {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    display: block !important;
  }

  /* 表格排版 */
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12pt;
  }
  .print-table th,
  .print-table td {
    border: 1px solid #333;
    padding: 8px 12px;
    text-align: left;
  }
  .print-table th {
    background: #f5f5f5;
    font-weight: 600;
    width: 30%;
  }

  /* 签名图片 */
  .print-signature img {
    max-width: 300px;
    max-height: 150px;
  }

  /* 页面设置 */
  @page {
    margin: 15mm;
    size: A4;
  }
}
```

### Pattern 4: html2canvas + jsPDF PDF 导出
**What:** 将 DOM 元素截图为 Canvas，再转为 PDF 文件下载
**When to use:** DATA-04 PDF 导出
**Example:**
```typescript
// Source: html2canvas + jsPDF 官方文档 [VERIFIED: Context7]
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,              // 高清输出
    useCORS: true,         // 签名图片可能是 base64，无需 CORS
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // mm
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  // 处理多页：如果内容超过一页
  let yOffset = margin;
  const maxContentHeight = pageHeight - margin * 2;

  if (imgHeight <= maxContentHeight) {
    pdf.addImage(imgData, 'JPEG', margin, yOffset, contentWidth, imgHeight);
  } else {
    // 分页处理
    let remainingHeight = imgHeight;
    let sourceY = 0;
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, maxContentHeight);
      // 使用 canvas 裁切
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceHeight / contentWidth) * canvas.width;
      const ctx = sliceCanvas.getContext('2d')!;
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
  }

  pdf.save(filename);
}
```

### Pattern 5: vue-chartjs 柱状图（Composition API）
**What:** 使用 vue-chartjs 渲染双柱状图（分享次数 + 收集数量）
**When to use:** DATA-05 统计面板
**Example:**
```vue
<!-- Source: vue-chartjs 官方文档 [VERIFIED: Context7] -->
<template>
  <Bar :data="chartData" :options="chartOptions" :style="{ height: '300px' }" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps<{
  stats: Array<{ realName: string; shareCount: number; submissionCount: number }>;
}>();

const chartData = computed(() => ({
  labels: props.stats.map(s => s.realName),
  datasets: [
    {
      label: '分享次数',
      backgroundColor: '#1976D2',
      data: props.stats.map(s => s.shareCount),
    },
    {
      label: '收集数量',
      backgroundColor: '#26A69A',
      data: props.stats.map(s => s.submissionCount),
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
};
</script>
```

### Anti-Patterns to Avoid
- **在后端生成 PDF:** 需要 Puppeteer/wkhtmltopdf，增加 Docker 镜像体积 500MB+，CONTEXT.md 已锁定前端生成
- **使用 QTable 内置打印:** QTable 无内置打印功能，且打印排版需要自定义
- **在详情页使用新路由:** CONTEXT.md 锁定 QDrawer 侧边抽屉，不离开列表页
- **统计查询不加时间范围:** 全量聚合在数据量大时性能差，必须支持时间筛选

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF 生成 | 手动拼接 PDF 字节流 | html2canvas + jsPDF | PDF 格式复杂，字体嵌入、分页、图片编码都有边界情况 |
| 图表渲染 | Canvas 手绘柱状图 | vue-chartjs + chart.js | 坐标轴、刻度、响应式、tooltip 等细节极多 |
| 打印排版 | 自定义打印窗口 iframe | window.print() + @media print | 浏览器原生打印对话框用户最熟悉，iframe 方案有跨域和样式隔离问题 |
| 日期范围筛选 | 手写日期选择器 | Quasar QDate + QInput | 已有成熟组件，支持国际化和移动端 |

**Key insight:** 本阶段所有"复杂"功能（PDF、图表、打印）都有成熟的前端库解决方案，不需要后端参与。

## Common Pitfalls

### Pitfall 1: html2canvas 截图空白或样式丢失
**What goes wrong:** html2canvas 截取的 Canvas 中部分 CSS 样式未渲染（如 CSS 变量、box-shadow、某些伪元素）
**Why it happens:** html2canvas 通过解析 DOM 重绘到 Canvas，不支持所有 CSS 特性
**How to avoid:**
- 打印/PDF 区域使用简单的 table + inline style，避免 CSS 变量
- 签名图片使用 `<img src="data:image/png;base64,...">` 而非 Canvas 元素
- 设置 `backgroundColor: '#ffffff'` 避免透明背景
- 测试时检查 `scale: 2` 是否导致内存问题（大表单）
**Warning signs:** PDF 中出现空白区域或样式与屏幕不一致

### Pitfall 2: @media print 与 Quasar 布局冲突
**What goes wrong:** 打印时 Quasar 的 QLayout/QDrawer/QHeader 仍然渲染，导致打印内容被遮挡或出现多余元素
**Why it happens:** Quasar 组件使用 fixed/absolute 定位，@media print 需要显式隐藏
**How to avoid:**
- 在全局 print.css 中隐藏 `.q-layout`, `.q-header`, `.q-drawer__backdrop` 等
- 打印区域使用 `position: fixed; top: 0; left: 0; width: 100%` 覆盖全屏
- 或者：将打印内容放在 `<teleport to="body">` 中，脱离 Quasar 布局树
**Warning signs:** 打印预览中看到侧边栏、顶栏等非打印内容

### Pitfall 3: schemaVersion 还原字段定义
**What goes wrong:** 查看历史提交时，当前模板 schema 已更新，字段定义与提交时不一致
**Why it happens:** D-14 要求根据 schemaVersion 还原字段定义，但当前 schema 只存最新版本
**How to avoid:**
- 详情 API 返回 template.schema（当前版本）+ submission.schemaVersion
- 如果 submission.schemaVersion === template.schemaVersion，直接用当前 schema
- 如果版本不一致，submission.data 中的 key 就是 field.id，可以直接展示 key-value 对
- 长期方案：存储 schema 历史版本（v2.0 考虑）
- 短期方案：详情页展示 data 中的原始 key-value，标注"字段定义可能已更新"
**Warning signs:** 详情页字段标签与实际数据不匹配

### Pitfall 4: 批量 PDF 导出内存溢出
**What goes wrong:** 勾选大量提交记录批量导出时，html2canvas 逐条截图导致内存占用过高
**Why it happens:** 每次 html2canvas 调用都会创建一个与 DOM 等大的 Canvas 对象
**How to avoid:**
- 批量导出时逐条处理，每条完成后释放 Canvas 引用
- 设置合理的批量上限（如最多 50 条）
- 使用 QLinearProgress 显示导出进度
- 考虑降低 scale 到 1.5（批量时质量可略低）
**Warning signs:** 浏览器标签页崩溃或变得极慢

### Pitfall 5: 统计 API 性能
**What goes wrong:** 统计查询在大数据量下响应慢
**Why it happens:** Prisma groupBy 在无索引的字段上聚合效率低
**How to avoid:**
- 统计 API 必须接受时间范围参数，避免全表扫描
- ShareLink 已有 `creatorId` 索引，Submission 已有 `shareLinkId` 和 `createdAt` 索引
- 使用两次独立查询（ShareLink count + Submission count）而非复杂 JOIN
**Warning signs:** 统计 API 响应时间 > 1s

## Code Examples

### 后端统计聚合 API
```typescript
// Source: Prisma groupBy 文档 + 项目 dashboard.route.ts 模式
// 统计每个员工的分享次数和收集数量
export const formStatsModule = new Elysia({ prefix: '/form-stats' })
  .use(authGuard('form:stats:view'))
  .get('/', async ({ query }: any) => {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : undefined;
    const dateFilter = dateFrom || dateTo
      ? { createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {};

    // 分享次数：按 creatorId 分组
    const shareStats = await prisma.shareLink.groupBy({
      by: ['creatorId'],
      _count: { id: true },
      where: dateFilter,
    });

    // 收集数量：按 shareLink.creatorId 分组
    const submissionStats = await prisma.submission.groupBy({
      by: ['shareLinkId'],
      _count: { id: true },
      where: dateFilter,
    });

    // 合并：需要 shareLinkId → creatorId 映射
    const linkCreatorMap = new Map<number, number>();
    const linkIds = submissionStats.map(s => s.shareLinkId);
    if (linkIds.length > 0) {
      const links = await prisma.shareLink.findMany({
        where: { id: { in: linkIds } },
        select: { id: true, creatorId: true },
      });
      links.forEach(l => linkCreatorMap.set(l.id, l.creatorId));
    }

    // 按 creatorId 汇总
    const statsMap = new Map<number, { shareCount: number; submissionCount: number }>();
    shareStats.forEach(s => {
      statsMap.set(s.creatorId, { shareCount: s._count.id, submissionCount: 0 });
    });
    submissionStats.forEach(s => {
      const creatorId = linkCreatorMap.get(s.shareLinkId);
      if (creatorId) {
        const entry = statsMap.get(creatorId) || { shareCount: 0, submissionCount: 0 };
        entry.submissionCount += s._count.id;
        statsMap.set(creatorId, entry);
      }
    });

    // 获取用户名
    const userIds = Array.from(statsMap.keys());
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, realName: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.realName]));

    return Array.from(statsMap.entries()).map(([userId, stats]) => ({
      userId,
      realName: userMap.get(userId) || '未知',
      shareCount: stats.shareCount,
      submissionCount: stats.submissionCount,
    }));
  });
```

### 前端 Submission Store
```typescript
// Source: 项目 template.ts store 模式
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export interface SubmissionRow {
  id: number;
  data: Record<string, any>;
  schemaVersion: number;
  submitterName: string | null;
  submitterPhone: string | null;
  createdAt: string;
  shareLink: {
    id: number;
    creator: { id: number; realName: string };
  };
}

export const useSubmissionStore = defineStore('submission', {
  state: () => ({
    rows: [] as SubmissionRow[],
    total: 0,
    loading: false,
    page: 1,
    size: 20,
  }),
  actions: {
    async fetchList(templateId: number, filters?: Record<string, any>) {
      this.loading = true;
      try {
        const params: Record<string, unknown> = {
          page: this.page,
          size: this.size,
          ...filters,
        };
        const { data } = await api.get(
          `/templates/${templateId}/submissions`,
          { params },
        );
        this.rows = data.rows;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(templateId: number, submissionId: number) {
      const { data } = await api.get(
        `/templates/${templateId}/submissions/${submissionId}`,
      );
      return data;
    },
  },
});
```

### 权限种子扩展
```typescript
// Source: 项目 prisma/seed.ts 模式
// 新增权限码（追加到 PERMISSIONS 数组）
{ code: 'form:submission:list', name: '查看提交数据', module: 'form' },
{ code: 'form:stats:view', name: '查看表单统计', module: 'form' },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas 原版 | html2canvas-pro 2.0.2 | 2024 | 支持更多 CSS 特性（oklch 颜色等），但本项目用简单样式，原版足够 |
| jsPDF 2.x | jsPDF 4.2.1 | 2025 | API 稳定，addImage 支持更多格式 |
| vue-chartjs 3.x (Options API) | vue-chartjs 5.3.3 (Composition API) | 2023 | v5 原生支持 `<script setup>`，无需 wrapper 组件 |
| chart.js 3.x | chart.js 4.5.1 | 2023 | Tree-shakable，按需注册组件减小 bundle |

**Deprecated/outdated:**
- vue-chartjs v3.x: 仅支持 Options API，不兼容 Vue 3 Composition API
- html2canvas 1.x 的 `foreignObjectRendering` 选项: 在大多数浏览器中不稳定，建议保持 false

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | schemaVersion 不一致时，直接展示 data 中的 key-value 对作为短期方案 | Common Pitfalls #3 | 字段标签显示为 field ID 而非中文标签，用户体验差但数据不丢失 |
| A2 | 批量 PDF 导出上限设为 50 条 | Common Pitfalls #4 | 如果用户需要导出更多，需要分批或改用后端方案 |
| A3 | 统计 API 使用两次独立 groupBy 查询而非 raw SQL | Code Examples | 如果数据量极大（>10万条），可能需要优化为 raw SQL |

## Open Questions

1. **schemaVersion 历史还原**
   - What we know: Submission 记录了 schemaVersion，但 FormTemplate 只存最新 schema
   - What's unclear: 版本不一致时如何还原历史字段定义
   - Recommendation: 短期方案——如果版本一致用当前 schema 渲染，不一致则展示原始 key-value 对并标注提示。长期方案（v2.0）——新增 schema 历史版本表

2. **分享人筛选的数据源**
   - What we know: 筛选条件包含"分享人"，需要一个分享人下拉列表
   - What's unclear: 分享人列表是从 ShareLink 去重获取还是从 User 列表获取
   - Recommendation: 从该模板的 ShareLink 去重 creatorId 获取，仅显示实际分享过的用户

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| html2canvas | PDF 导出 | 待安装 | 1.4.1 | — |
| jsPDF | PDF 导出 | 待安装 | 4.2.1 | — |
| vue-chartjs | 统计图表 | 待安装 | 5.3.3 | — |
| chart.js | 统计图表 | 待安装 | 4.5.1 | — |
| PostgreSQL | 数据查询 | ✓ | — | — |
| Prisma | ORM | ✓ | ^5.22.0 | — |

**Missing dependencies with no fallback:**
- html2canvas, jsPDF, vue-chartjs, chart.js 均需通过 npm install 安装，无 fallback

**Missing dependencies with fallback:**
- None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 已有 JWT authGuard |
| V3 Session Management | no | 已有 token refresh |
| V4 Access Control | yes | authGuard('form:submission:list') + authGuard('form:stats:view') |
| V5 Input Validation | yes | Elysia t.Object 校验查询参数 |
| V6 Cryptography | no | 无加密需求 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 越权查看其他模板提交数据 | Elevation of Privilege | API 校验 templateId 归属（或依赖权限码控制） |
| 统计 API 暴露敏感数据 | Information Disclosure | form:stats:view 独立权限码 |
| PDF 导出 XSS | Tampering | html2canvas 渲染 DOM 而非 innerHTML，天然防 XSS |
| 查询参数注入 | Tampering | Prisma 参数化查询，不拼接 SQL |

## Sources

### Primary (HIGH confidence)
- Context7 /niklasvh/html2canvas — 配置选项、scale、onclone 用法
- Context7 /apertureless/vue-chartjs — Bar chart Composition API 模式
- Context7 /ekoopmans/html2pdf.js — html2canvas + jsPDF 集成参考
- npm registry — 所有库版本验证（2026-04-20）

### Secondary (MEDIUM confidence)
- 项目代码库 — UserPage.vue QTable 模式、template.route.ts API 模式、seed.ts 权限模式
- Prisma schema — Submission/ShareLink 模型结构和索引

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 所有库版本通过 npm registry 验证，CONTEXT.md 已锁定选型
- Architecture: HIGH — 完全复用项目已有模式（QTable 分页、Elysia 模块、Pinia store）
- Pitfalls: HIGH — html2canvas 限制和 @media print 冲突是已知问题，有明确解决方案

**Research date:** 2026-04-20
**Valid until:** 2026-05-20（依赖库版本稳定，30 天有效）
