# Phase 34: Excel 批量推送导入 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 34-excel
**Mode:** `--auto`（自动选择全部灰色区域并采用推荐默认值，无人工交互）
**Areas discussed:** 解析架构、批量提交契约、附件处理、入口与组件骨架、表头约定、部分成功策略、重复提示、权限码、模板下载、批量上限、Title row 处理、后端实现策略

---

## 解析架构

| Option | Description | Selected |
|--------|-------------|----------|
| 前端 xlsx 解析 + 后端 JSON rows 校验 | 与 Phase 22 visit 一致；浏览器解析、后端零文件依赖 | ✓ |
| 后端 multipart 上传 + 后端 xlsx 解析 | 引入后端 Excel 库与文件存储；与 v1.3 决策矛盾 | |

**Selected:** 前端 xlsx 解析（[auto] 推荐默认）
**Rationale:** Phase 22 已固化模式；`xlsx ^0.18.5` 已装；保持跨模块一致性、避免后端依赖膨胀。

## 批量提交契约

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 `POST /channel-push/batch-import` JSON rows 端点 | 单次往返、原子返回 createdCount/failedRows、复用 `channelPush:create` | ✓ |
| 客户端循环单条 `POST /channel-push` | 多次往返、易失败重试不一致；Phase 33 单条 POST 是 multipart 不适合循环 | |

**Selected:** 新增 batch-import 端点
**Rationale:** 与 Phase 22 `/visits/import` 模式一致；单次响应聚合 `duplicateHints[]` 与 `failedRows[]` 更清晰。

## 附件处理

| Option | Description | Selected |
|--------|-------------|----------|
| 不支持附件（导入纯字段） | 与 v1.3 visit 一致；Excel 不承载文件 | ✓ |
| 支持每行附件（多 part 上传） | 业务上 Excel 无法关联文件；引入后端 multipart 复杂度 | |

**Selected:** 不支持附件
**Rationale:** Excel 自身无法承载文件 attachment 关联；附件继续走 Phase 33 的单条提交流程。

## 导入入口位置

| Option | Description | Selected |
|--------|-------------|----------|
| `ChannelPushPage.vue` 工具栏 + `ChannelPushImportDialog.vue` | 与 Phase 22 visit 模式镜像；`v-perm="channelPush:create"` 守门 | ✓ |
| 独立路由 `/channel-push/import` | 增加路由复杂度；与既有列表分离不必要 | |

**Selected:** 列表页工具栏入口
**Rationale:** 镜像 Phase 22 既有交互；用户在「我的推送」页面就能完成新建 / 单条 / 批量。

## Excel 表头约定

| Option | Description | Selected |
|--------|-------------|----------|
| 8 列严格顺序：姓名、手机号、年龄、学历、性别、意向状态、意向说明、备注 | 与后端 `channelPushWriteBody` 字段 1:1 | ✓ |
| 仅必填 2 列（姓名、手机号） | 不利于渠道商一次填齐辅助信息 | |
| 全自由表头 + 列名映射 | 易出错；渠道商外部用户更需要固定模板 | |

**Selected:** 8 列严格顺序
**Rationale:** REQUIREMENTS PUSH-03 明确"标题/表头/数据行约定固定"；渠道商外部用户需要明确格式。

## 部分成功策略

| Option | Description | Selected |
|--------|-------------|----------|
| Partial success：单行失败不回滚 | 与 Phase 22 一致；返回 failedRows 让用户修正后补传 | ✓ |
| 全部成功或全部回滚 | 单条小错误导致 499 行重提，体验差 |  |

**Selected:** Partial success
**Rationale:** Phase 22 已验证；v1.6 业务可接受逐行独立创建语义。

## 重复提示

| Option | Description | Selected |
|--------|-------------|----------|
| 文件内 (姓名+手机号) key 在前端预览标记 + 后端响应 duplicateHints dialog 展示 | 仅提示不阻止；与 Phase 33 / v1.3 visit 一致 | ✓ |
| 仅提示文件内重复，跨记录不提示 | 与 DEDUP-01/02 矛盾 | |
| 阻止重复提交 / 自动跳过 | 与 v1.6 Key Decision 矛盾 | |

**Selected:** 双层重复提示
**Rationale:** DEDUP-01 复用要求；与单条提交体验一致。

## 权限码

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 `channelPush:create` | REQUIREMENTS PERM-01/02 已锁定 5 个权限码集合，无 bulkImport | ✓ |
| 新增 `channelPush:bulkImport` | 需要 backend seed 改动，超出 PERM-01 范围 | |

**Selected:** 复用 `channelPush:create`
**Rationale:** REQUIREMENTS.md 未定义批量导入权限码；与 Phase 22 visit 单独 `visit:import` 不同的原因是 v1.3 当时显式新增了该权限码，v1.6 PERM-01 没有。

## 模板下载

| Option | Description | Selected |
|--------|-------------|----------|
| 不提供模板下载 | 与 Phase 22 visit 一致；可在 EXPORT 里程碑后置 | ✓ |
| 提供 .xlsx 模板下载按钮 | 渠道商外部用户友好性提升，但超出本阶段范围 | |

**Selected:** 不提供（Claude's Discretion 可在实现时通过文档/帮助文案补强）
**Rationale:** 控制范围；如确需后置为独立增强 ticket。

## 批量上限

| Option | Description | Selected |
|--------|-------------|----------|
| 单文件最多 500 行 | 浏览器解析内存安全 + 后端事务可控 | ✓ |
| 不限制 | 大文件易导致浏览器卡顿、后端事务超时 | |

**Selected:** 500 行上限
**Rationale:** 业务场景下渠道商单批 500 行已远超日常 use case；超大批可拆分文件提交。

## Title row 处理

| Option | Description | Selected |
|--------|-------------|----------|
| 第 1 行可选合并标题，第 2 行表头，第 3 行起数据 | 与 v1.3 visit 完全一致；兼容空标题 | ✓ |
| 第 1 行直接表头 | 与 v1.3 不一致；引入两套约定 | |

**Selected:** 沿用 Phase 22 模式
**Rationale:** 跨模块统一 Excel 约定，渠道商熟悉。

## 后端实现策略

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 `batchCreateChannelPushes`，内部循环调 `createChannelPush`，每行单事务 | 复用既有创建逻辑 + dedup；partial success 自然实现 | ✓ |
| 单事务跨行 | 大批量易导致长事务、锁竞争；与 partial success 矛盾 | |
| 引入 `prisma.createMany({ skipDuplicates: true })` | 与"重复仅提示"矛盾；丢失 dedup hints | |

**Selected:** 循环单事务复用 createChannelPush
**Rationale:** 与 Phase 22 visit `validateVisitImportRows` + `createMany` 思路语义对等（v1.6 因有 dedup/audit/timeline 副作用必须循环单条）。

---

## Auto-Resolved

`--auto` 模式下所有灰色区域均按推荐默认选项解析，未触发 AskUserQuestion 交互。每条决策的备选项与采纳理由见上表。

## External Research

未触发外部研究：本阶段所有决策均可由 Phase 22 / Phase 32 / Phase 33 既有契约与代码推导得到，无库版本兼容或生态最佳实践空白。

## Deferred Ideas Logged

- Excel 模板下载、附件批量上传、后端 Excel 解析、跨历史库批量查重接口、批次追踪 / 导入历史日志 — 见 CONTEXT.md `<deferred>` 章节。
