# Project Research Summary: v1.3 到访信息管理

**Project:** OA 管理系统
**Domain:** 到访台账 / 渠道线索跟进 / Excel 导入
**Researched:** 2026-05-02
**Confidence:** HIGH

## Executive Summary

v1.3 应新增一个固定业务模块「到访信息管理」，用于承接《渠道往来测试表.xlsx》中的「学员到访跟踪表」。该表是标准业务台账：15 个固定字段覆盖学员基础信息、渠道来源、咨询接待、接待/试听日期、咨询后状态、状态类别、状态说明和解决方案。由于筛选和统计维度稳定，固定 Prisma 表结构比复用自定义表单 JSONB 更合适。

## Stack Additions

- 新增前端依赖 `xlsx` (SheetJS CE)，用于浏览器端解析 `.xlsx`。
- 后端不新增依赖，沿用 Bun + Elysia + Prisma。
- 不做后端文件存储，前端解析后提交标准化 JSON rows。

## Feature Table Stakes

1. 独立菜单和 RBAC 权限：`visit:list/create/update/delete/import/stats`。
2. 到访记录 CRUD：完整维护样表 15 个字段。
3. Excel 导入：识别第 1 行标题、第 2 行表头、第 3 行数据，导入前预览校验。
4. 列表筛选：关键词、渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别、接待日期区间。
5. 跟进详情：长文本状态说明和解决方案可查看/编辑。
6. 基础统计：按渠道商、咨询师、接待人、状态分布汇总，计算有意向/签约类转化概览。

## Architecture Recommendation

- 新增 `VisitRecord` model，直接映射 15 列字段，并补充 `creatorId`、`createdAt`、`updatedAt`。
- 新增 `visitModule`，prefix `/visits`，提供 CRUD、filter-options、stats、import 端点。
- 前端新增 `VisitPage.vue`，内置列表、筛选、导入入口、统计面板；新增 `VisitImportDialog.vue` 负责 SheetJS 解析和预览。
- 路由新增 `/visits`，菜单 icon 可用 `how_to_reg` 或 `assignment_ind`。

## Watch Out For

- 表头在第 2 行，不要默认第一行作为 header。
- 日期统一按日期处理，避免时区漂移。
- 状态字段先存字符串，不要过早枚举化。
- 只做重复提醒，不自动去重合并。
- 长文本在列表中做摘要，完整内容放详情弹窗。
- 导入和统计按钮必须分别做前后端权限控制。

## Recommended Roadmap

1. Phase 15：数据模型 + 后端 API + 权限种子。
2. Phase 16：到访管理页面 + CRUD + 筛选 + 响应式。
3. Phase 17：Excel 导入解析、预览、批量入库。
4. Phase 18：统计面板与聚合 API 完善。
