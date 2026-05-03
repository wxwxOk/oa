# Phase 24: 报销数据模型 + 附件上传 API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `24-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 24 - 报销数据模型 + 附件上传 API
**Mode:** auto
**Areas discussed:** 固定数据模型与状态, 权限与可见性, 后端 API 契约, 附件上传/预览/下载, 审核轨迹基础

---

## Auto-selected decisions

### 固定数据模型与状态
- **Question:** 报销模块是否复用既有通用审批/表单 JSONB 主模型？
  - **Options considered:** 复用 `ApprovalApplication`; 独立固定模型（recommended）; 混合 JSONB + 固定字段。
  - **Selected:** 独立固定模型。
  - **Reason:** `.planning/PROJECT.md` 和 `.planning/REQUIREMENTS.md` 已锁定 v1.4 为固定报销模块；Phase 20 到访模块也采用固定业务表模式。
- **Question:** 报销金额、状态和提交后编辑如何约束？
  - **Options considered:** 金额字符串 + 状态字符串; Decimal + 状态枚举（recommended）; 完全复用审批状态枚举。
  - **Selected:** Decimal 金额、报销专用状态枚举、提交后核心字段冻结。

### 权限与可见性
- **Question:** 报销权限码如何拆分？
  - **Options considered:** 少量粗粒度权限; 按创建/本人/全部/审核/附件/导出拆分（recommended）。
  - **Selected:** `reimbursement:create`、`reimbursement:own`、`reimbursement:list`、`reimbursement:department-review`、`reimbursement:finance-review`、`reimbursement:attachment`、`reimbursement:export`。
- **Question:** 普通员工与审核角色的数据可见性如何控制？
  - **Options considered:** 仅前端隐藏; 后端对象级校验（recommended）; 全部交给 ADMIN。
  - **Selected:** 后端按 `currentUser`、权限码、申请归属、部门和状态做对象级校验。

### 后端 API 契约
- **Question:** API 应采用哪种模块风格？
  - **Options considered:** 复用审批路由; 新增 `/api/v1/reimbursements` 固定模块（recommended）。
  - **Selected:** 新增 `/api/v1/reimbursements`，沿用 Elysia + `authGuard` + TypeBox + `{ rows, total, page, size }`。
- **Question:** 创建与提交是否分离？
  - **Options considered:** 一次性创建即提交; 草稿创建/编辑/提交分离（recommended）。
  - **Selected:** `POST /reimbursements` 创建草稿、`PUT /:id` 编辑草稿、`POST /:id/submit` 正式提交。

### 附件上传、预览与下载
- **Question:** 附件如何存储？
  - **Options considered:** 云对象存储; 数据库存 BLOB; 本地文件系统 + DB 元数据（recommended）。
  - **Selected:** 本地文件系统保存文件，数据库保存相对路径和元数据。
- **Question:** 附件类型、大小和接口边界如何定义？
  - **Options considered:** 宽松上传; 图片/PDF 白名单 + 大小/数量限制（recommended）。
  - **Selected:** 图片/PDF 白名单，默认单文件 10MB、单申请 20 个附件；提供上传、图片预览、下载和草稿删除接口。

### 审核轨迹基础
- **Question:** 报销审核轨迹如何建模？
  - **Options considered:** 只在主表覆盖状态; 追加式 action/timeline（recommended）; 复用通用审批 action 表。
  - **Selected:** 报销专用追加式审核轨迹表，Phase 24 记录提交，Phase 26 追加审核/签字/驳回事件。

---

## Deferred ideas

- OCR、发票真伪查验、自动验重、自动金额识别。
- 预算控制、付款打款、会计凭证、财务系统对接。
- 报销统计看板和图表分析。
- 金额动态分支、多级会签、委托、超时升级。

---

*Audit trail for Phase 24 auto discussion. See `24-CONTEXT.md` for locked decisions.*
