# Phase 25: 员工报销申请与详情页面 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 25-员工报销申请与详情页面
**Areas discussed:** 页面入口与权限, 列表筛选与状态展示, 申请表单与草稿提交流程, 附件上传预览下载, 详情页与审核轨迹, 前端数据层与测试

---

## 页面入口与权限

| Option | Description | Selected |
|--------|-------------|----------|
| 固定报销入口 | 新增 `/reimbursements` 和“报销管理/我的报销”，使用 Phase 24 reimbursement 权限。 | ✓ |
| 放入动态审批管理 | 复用 `/approval/applications` 动态模板申请体验。 | |
| 审核/员工混合工作台 | 同时加入员工申请和部门/财务审核操作。 | |

**User's choice:** `[auto]` 固定报销入口。
**Notes:** Phase 25 是固定报销模块员工侧页面；审核操作属于 Phase 26。

---

## 列表筛选与状态展示

| Option | Description | Selected |
|--------|-------------|----------|
| 台账式 PC 表格 + Mobile 卡片 | 复用 Visit/ApprovalApplication 列表模式，消费 `{ rows,total,page,size }`。 | ✓ |
| 单一表格适配所有端 | 实现简单但移动端可用性差。 | |
| 新增类别字典筛选 | 需要新 API/维护 UI，超出 Phase 24 契约。 | |

**User's choice:** `[auto]` 台账式 PC 表格 + Mobile 卡片。
**Notes:** 状态枚举和类别自由字符串沿用 Phase 24。

---

## 申请表单与草稿提交流程

| Option | Description | Selected |
|--------|-------------|----------|
| 固定字段全页表单 | 新建/编辑使用固定报销字段和移动端 sticky 保存/提交动作。 | ✓ |
| 动态 GridFormRenderer | 不符合 v1.4 固定业务模型决策。 | |
| 抽屉式长表单 | 在附件和移动端场景下空间不足。 | |

**User's choice:** `[auto]` 固定字段全页表单。
**Notes:** 附件依赖申请 ID；先保存草稿再上传附件，直接提交时先创建草稿再提交。

---

## 附件上传预览下载

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated blob 请求 | 通过 axios 请求受保护 preview/download，使用 object URL 预览图片。 | ✓ |
| 直接 `<img src>` / 新窗口打开 | 会绕过 bearer token，受保护接口可能失败。 | |
| 本地解析发票信息 | OCR/验真/自动识别金额超出范围。 | |

**User's choice:** `[auto]` Authenticated blob 请求。
**Notes:** 多文件按单文件 `file` 字段逐个上传；前端镜像 10MB/20 个附件/图片+PDF 限制。

---

## 详情页与审核轨迹

| Option | Description | Selected |
|--------|-------------|----------|
| 全页只读详情 + timeline | 展示申请信息、附件、当前状态和已有 actions，不提供审核动作。 | ✓ |
| 抽屉详情 | 长内容和附件/轨迹移动端体验较弱。 | |
| 在详情中加入审核按钮 | Phase 26 范围。 | |

**User's choice:** `[auto]` 全页只读详情 + timeline。
**Notes:** 可预留签名只读展示位置，但签名采集和审核流转不在 Phase 25。

---

## 前端数据层与测试

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 types/store/pages/components | 新增 `types/reimbursement.ts`、`stores/reimbursement.ts` 和拆分页面/组件。 | ✓ |
| 全部写在单页 | 初期快但上传/表单/详情逻辑会过重。 | |
| 只做手工验证 | Phase 25 涉及权限、blob、FormData，缺少测试风险高。 | |

**User's choice:** `[auto]` 独立 types/store/pages/components。
**Notes:** 计划应覆盖路由/menu、store API/FormData、状态/金额/日期 helper、响应式列表、附件禁用/上传/下载和提交后只读测试。

---

## the agent's Discretion

- 表单分组标题、状态 chip 颜色、列表列宽、空状态文案、文件图标、附件上传进度样式和错误提示细节。
- 详情页子组件拆分粒度，但数据/API 层必须独立于页面。
- 有全量/审核查看权限的用户首版可复用同一列表/详情体验，不新增专用审核工作台。

## Deferred Ideas

- 部门/财务审核队列、通过/驳回、签名采集和审核面板 — Phase 26。
- Excel 导出、UAT 和里程碑归档 — Phase 27。
- OCR、发票验真、自动验重、付款、统计看板、金额分支、会签、委托、超时升级和通用表单附件字段 — out of scope。
