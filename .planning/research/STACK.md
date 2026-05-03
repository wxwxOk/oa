# Technology Stack: v1.4 报销管理

**Project:** OA 管理系统 v1.4  
**Domain:** 固定报销模块 / 发票附件 / 审批签字  
**Researched:** 2026-05-02  
**Confidence:** HIGH

## Recommendation

沿用现有 Vue 3 + Quasar + TypeScript / Bun + Elysia + Prisma / PostgreSQL 架构，不引入对象存储、OCR、BPMN 或文档管理系统。v1.4 的新增能力可由现有依赖覆盖：Elysia `t.File`/`t.Files` 处理 multipart，Bun `Bun.write()` 持久化 Blob/File，Quasar `QFile` 做前端选择和大小/类型限制，`signature_pad` 捕获审批人手写签名，`nanoid` 生成安全文件名。

## Stack Additions

首版不需要新增 npm/bun 依赖。

| Capability | Existing Technology | Purpose |
|------------|---------------------|---------|
| 发票上传 | Elysia `t.File` / `t.Files` | multipart 请求解析和 MIME 类型校验 |
| 文件写入 | Bun `Bun.write()` + `node:fs/promises` | 把图片/PDF/签名 Blob 写入本地磁盘 |
| 前端文件选择 | Quasar `QFile` | 图片/PDF accept、max-file-size、rejected 反馈 |
| 手写签名 | `signature_pad` 5.1.3 | canvas 签名、`isEmpty()` 校验、`toDataURL()` 导出 |
| 文件名 | `nanoid` 5 | 生成不可预测 storage key，避免用户文件名直落盘 |
| PDF/打印 | 现有 `html2canvas` + `jspdf` | 报销详情/签字结果复用已有导出思路 |

## Required Infrastructure Work

| Item | Decision |
|------|----------|
| Storage directory | 使用后端本地目录，如 `backend/storage/reimbursements` 或配置化 `UPLOAD_DIR` |
| Docker persistence | `docker-compose.yml` 增加上传目录 volume，避免容器重建丢附件 |
| File access | 不做公开静态目录；通过鉴权下载/预览接口返回 `Bun.file(path)` |
| Metadata | 文件路径、原名、MIME、大小、上传人、关联报销单/明细存 PostgreSQL |
| Limits | 首版建议单文件限制 10MB，类型仅 `image/jpeg/png/webp` 与 `application/pdf` |

## Existing Stack Reuse

| Capability | Existing Pattern |
|------------|------------------|
| 固定业务模块 | v1.3 `VisitRecord` + `visitModule` + `/visits` 页面 |
| 权限 | `authGuard('perm')` + `backend/prisma/seed.ts` 权限种子 |
| 审批任务 | `ApprovalTask`、`approveTask`、`rejectTask`、`ApplicationTimeline` |
| 审批历史 | `ApprovalAction.payload` / `ApprovalTimelineEvent.payload` 可承载签名附件元数据 |
| 响应式 | `useResponsive()` + PC `QTable` + Mobile `QCard` |
| 签名 | v1.1 表单签名依赖已存在，v1.4 只需固定审批签字 UI |

## What Not To Add

| Not Adding | Reason |
|------------|--------|
| S3/MinIO/OSS | 单机 Docker Compose 首版过重，本地 volume 足够 |
| OCR/发票验真 | 需求未要求，且会引入外部服务和财税规则复杂度 |
| 通用表单附件字段 | PROJECT.md 已限定 v1.4 只做固定报销发票附件 |
| PDF 内容解析 | 审批只需上传、预览、下载和归档，不需要抽取 PDF 字段 |
| BPMN/条件流 | 继续复用现有串行审批任务，不扩展流程引擎 |
| 付款/出纳打款 | 属于财务支付闭环，报销审批首版后置 |

## Verified Sources

- Context7 `/llmstxt/elysiajs_llms-full_txt` — Elysia `t.File({ format })` / `t.Files()` multipart validation.
- Context7 `/websites/quasar_dev` — `QFile` accept、max-file-size、multiple、rejected 事件。
- Context7 `/szimek/signature_pad` — `isEmpty()`、`toDataURL()`、高 DPI canvas resize。
- Context7 `/oven-sh/bun` — `Bun.write(destination, Blob/File)`、`Bun.file()` 文件 I/O。
- Codebase: `backend/package.json`, `frontend/package.json`, `backend/src/index.ts`, `backend/src/middlewares/auth.ts`.

---
*Stack research for: v1.4 报销管理*  
*Researched: 2026-05-02*
