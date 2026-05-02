# Technology Stack: v1.3 到访信息管理

**Project:** OA 管理系统 v1.3
**Researched:** 2026-05-02
**Confidence:** HIGH

## Recommendation

沿用现有 Vue 3 + Quasar + TypeScript / Bun + Elysia + Prisma / PostgreSQL 架构。到访信息管理是固定业务模块，不需要工作流引擎、CRM 套件或新的后端文件存储。

## Stack Additions

| Technology | Side | Purpose | Why |
|------------|------|---------|-----|
| `xlsx` (SheetJS CE) | frontend | 浏览器端解析 `.xlsx` 并生成导入预览 | 官方文档支持 FileReader `readAsArrayBuffer` + `XLSX.read` + `utils.sheet_to_json(..., { header: 1 })`；无需后端 multipart 和临时文件 |

## Existing Stack Reuse

| Capability | Existing Pattern |
|------------|------------------|
| 数据模型 | Prisma model + migration，参考 `FormTemplate` / `Submission` |
| 后端接口 | `modules/{name}/{name}.route.ts` + `authGuard('perm')` + Elysia `t.Object` |
| 权限 | `backend/prisma/seed.ts` 追加权限码，ADMIN 自动拥有全部权限 |
| 前端列表 | Quasar `QTable` + server-side pagination，参考 `UserPage.vue` / `SubmissionPage.vue` |
| 响应式 | PC 表格 + Mobile 卡片，复用 `useResponsive` |
| 统计 | `vue-chartjs` 已安装，可复用统计表页面模式 |

## Excel Import Approach

1. 前端用 `<input type="file">` / `QUploader` 选择 xlsx。
2. FileReader 读取 ArrayBuffer。
3. `XLSX.read(arrayBuffer)` 解析第一个 sheet。
4. `XLSX.utils.sheet_to_json(ws, { header: 1 })` 得到二维数组。
5. 跳过第 1 行合并标题「学员到访跟踪表」，第 2 行作为 15 列表头。
6. 前端预览和基础校验后，将标准化 JSON rows 提交给后端 `POST /api/v1/visits/import`。

## What Not To Add

| Not Adding | Reason |
|------------|--------|
| 后端文件上传/存储 | 当前只需导入表格内容；浏览器解析后提交 JSON 更简单 |
| Excel 导出 | PROJECT.md 已列入 v2.0 考虑，避免本里程碑扩张 |
| CRM/销售漏斗库 | 固定字段 + 统计聚合足够覆盖样表需求 |
| 工作流/审批引擎 | 到访跟进是状态记录，不是审批流 |
| 字典管理模块 | 状态值先按字符串存储并从历史数据提取筛选项，后续再产品化 |

## Dependency Command

```bash
cd frontend
npm install xlsx
```
