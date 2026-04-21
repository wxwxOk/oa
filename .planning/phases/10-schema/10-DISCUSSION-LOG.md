# Phase 10: Schema 与核心渲染器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 10-schema
**Areas discussed:** Schema 层级结构, 旧模板兼容体验, 渲染器模式与职责, 后端校验策略

---

## Schema 层级结构

### Q1: v2 schema 的层级结构

| Option | Description | Selected |
|--------|-------------|----------|
| Group > Row > Field 三层 | schema 顶层是 groups 数组，每个 group 含 rows，每个 row 含 fields | |
| Row 平铺 + 分组标记行 | schema 顶层是 rows 数组，分组作为特殊行类型插入 | |
| 混合 items 数组 | schema 顶层是 items 数组，每个 item 可以是 row 或 group，group 内嵌 rows | ✓ |

**User's choice:** 混合 items 数组（推荐）

### Q2: 字段在行内的定位方式

| Option | Description | Selected |
|--------|-------------|----------|
| field 级 colSpan | 每个 field 携带 colSpan: 1-12，同一 row 内按顺序流式排列 | ✓ |
| col + colSpan 精确定位 | 每个 field 携带 col + colSpan，精确指定起始列 | |

**User's choice:** field 级 colSpan（推荐）

### Q3: 新建字段的默认 colSpan

| Option | Description | Selected |
|--------|-------------|----------|
| 默认占满一行 | colSpan: 12，与 v1.1 单列布局一致 | ✓ |
| 默认占半行 | colSpan: 6，鼓励多列布局 | |

**User's choice:** 默认占满一行（推荐）

### Q4: 动态行表格在 schema 中的位置

| Option | Description | Selected |
|--------|-------------|----------|
| 作为 items 的新 type | 动态行表格作为 items 数组中的第三种 type: 'dynamic-table' | ✓ |
| 作为字段类型 | 动态行表格作为一种新的字段类型放在 row 的 fields 中 | |

**User's choice:** 作为 items 的新 type（推荐）

---

## 旧模板兼容体验

### Q1: 查看 v1.1 旧模板的已有提交数据时怎么处理

| Option | Description | Selected |
|--------|-------------|----------|
| 旧渲染器原样保留 | 保留现有 FormFieldRenderer 不动，版本分发时走旧组件 | |
| 运行时转换 + 新渲染器统一展示 | 将 v1.1 旧数据在读取时转换为 v2 格式 | |

**User's choice:** 开发阶段不需要兼容旧数据，直接重构（自由输入）
**Notes:** 用户明确表示目前只是开发阶段，不需要兼容旧数据

---

## 渲染器模式与职责

### Q1: GridFormRenderer 的架构

| Option | Description | Selected |
|--------|-------------|----------|
| 单一组件 + mode prop | 一个 GridFormRenderer 通过 mode prop 切换行为 | ✓ |
| 三个独立组件 + 共享 composable | DesignerGrid / FillGrid / PrintGrid 共享底层布局 composable | |

**User's choice:** 单一组件 + mode prop（推荐）

### Q2: FieldRenderer 如何处理三种模式

| Option | Description | Selected |
|--------|-------------|----------|
| 统一 FieldRenderer + mode | 重构现有 FormFieldRenderer，加入 mode prop | ✓ |
| 每种模式独立 FieldRenderer | 保留现有 + 新建两个独立组件 | |

**User's choice:** 统一 FieldRenderer + mode（推荐）

---

## 后端校验策略

### Q1: 保存模板时后端如何校验 v2 schema

| Option | Description | Selected |
|--------|-------------|----------|
| typebox schema 校验 | 用 Elysia 内置 typebox 定义 v2 schema 结构校验 | ✓ |
| 自定义 validator 函数 | 写自定义 validate 函数手动检查 | |

**User's choice:** typebox schema 校验（推荐）

### Q2: 校验粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 结构校验 | 只校验 JSON 结构合法性（items 数组、type 枚举、colSpan 范围） | ✓ |
| 结构 + 业务约束校验 | 同时校验业务约束（如同行 colSpan 总和不超 12） | |

**User's choice:** 结构校验（推荐）

---

## Claude's Discretion

无 — 所有决策由用户明确选择。

## Deferred Ideas

无 — 讨论未超出 phase 范围。
