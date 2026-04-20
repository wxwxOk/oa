# Phase 7: 模板管理 + 表单设计器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 7-模板管理+表单设计器
**Areas discussed:** 设计器布局, 模板生命周期, 签名字段交互, 模板列表与管理

---

## 设计器布局

### 面板数量

| Option | Description | Selected |
|--------|-------------|----------|
| 3 面板 | 字段库 + 画布 + 属性编辑，功能最完整 | ✓ |
| 2 面板 | 字段库 + 画布（点击弹出属性），更简洁 | |
| 单栏流式 | 添加按钮选择字段，最简单 | |

**User's choice:** 3 面板
**Notes:** 无

### 移动端策略

| Option | Description | Selected |
|--------|-------------|----------|
| PC 专属 | 移动端不提供设计器，仅查看模板列表 | ✓ |
| 移动端简化版 | 单栏流式设计器，开发量翻倍 | |
| 移动端完全隐藏 | 移动端不展示模板管理菜单 | |

**User's choice:** PC 专属
**Notes:** 无

### 字段库展示

| Option | Description | Selected |
|--------|-------------|----------|
| 分组折叠 | 按类型分组，每组可折叠 | ✓ |
| 平铺列表 | 所有字段类型平铺展示 | |
| 图标网格 | 图标网格展示，类似应用商店 | |

**User's choice:** 分组折叠
**Notes:** 无

### 预览方式

| Option | Description | Selected |
|--------|-------------|----------|
| WYSIWYG 画布 | 画布本身即所见即所得 | ✓ |
| 内嵌实时预览 | 属性面板下方嵌入预览区域 | |
| 弹窗预览 | 顶部"预览"按钮弹出全屏预览 | |

**User's choice:** WYSIWYG 画布
**Notes:** 无

---

## 模板生命周期

### 版本号策略

| Option | Description | Selected |
|--------|-------------|----------|
| 自增整数 | 每次保存已发布模板 version +1 | ✓ |
| 语义化版本号 | 类似 semver，区分大小改动 | |

**User's choice:** 自增整数
**Notes:** 无

### 草稿保存

| Option | Description | Selected |
|--------|-------------|----------|
| 手动保存 | 点击"保存"按钮才保存 | ✓ |
| 自动保存 | 每次操作后自动保存到服务器 | |
| 定时+手动 | 定时自动保存 + 手动保存按钮 | |

**User's choice:** 手动保存
**Notes:** 无

### 发布流程

| Option | Description | Selected |
|--------|-------------|----------|
| 三态循环 | 草稿 → 已发布 → 已下线 → 可重新发布 | ✓ |
| 两态不可编辑 | 草稿 → 已发布，发布后不可编辑 | |

**User's choice:** 三态循环
**Notes:** 无

### 编辑已发布模板

| Option | Description | Selected |
|--------|-------------|----------|
| 就地编辑 | 直接编辑，保存时版本 +1 | ✓ |
| 副本草稿模式 | 创建副本作为草稿，确认后替换 | |

**User's choice:** 就地编辑
**Notes:** 无

---

## 签名字段交互

### 存储格式

| Option | Description | Selected |
|--------|-------------|----------|
| PNG base64 | 存为 base64 字符串，约 10-50KB/签名 | ✓ |
| SVG path | 存为 SVG 路径数据，数据量小 | |

**User's choice:** PNG base64
**Notes:** 无

### 签名板尺寸

| Option | Description | Selected |
|--------|-------------|----------|
| 固定尺寸 | 固定 400x200px | ✓ |
| 响应式宽度 | 宽度跟随父容器 | |

**User's choice:** 固定尺寸
**Notes:** 无

### 操作按钮

| Option | Description | Selected |
|--------|-------------|----------|
| 仅清除 | 一键清空重签 | ✓ |
| 撤销+清除 | 撤销回退上一笔 + 清除全部 | |

**User's choice:** 仅清除
**Notes:** 无

---

## 模板列表与管理

### 列表布局

| Option | Description | Selected |
|--------|-------------|----------|
| 表格布局 | 与 v1.0 管理页一致 | ✓ |
| 卡片网格 | 卡片展示，视觉效果好 | |

**User's choice:** 表格布局
**Notes:** 无

### 筛选排序

| Option | Description | Selected |
|--------|-------------|----------|
| 状态筛选+时间排序 | 覆盖主要场景 | ✓ |
| 全功能筛选搜索 | 状态+名称搜索+多列排序 | |

**User's choice:** 状态筛选+时间排序
**Notes:** 无

### 删除策略

| Option | Description | Selected |
|--------|-------------|----------|
| 仅删草稿 | 只能删除草稿状态模板 | ✓ |
| 全部可删+确认 | 任何状态可删，有数据时二次确认 | |
| 不可删除 | 只能下线不能删除 | |

**User's choice:** 仅删草稿
**Notes:** 无

---

## Claude's Discretion

None — all areas discussed with user

## Deferred Ideas

None — discussion stayed within phase scope
