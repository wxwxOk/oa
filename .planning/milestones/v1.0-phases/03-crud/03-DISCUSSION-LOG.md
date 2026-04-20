# Phase 3: 组织架构 CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 03-组织架构 CRUD
**Areas discussed:** 删除语义+权限码规范, 表单校验+部门树交互, 密码策略+角色边界, 列表UX+移动端定位

---

## 用户删除语义

| Option | Description | Selected |
|--------|-------------|----------|
| 硬删除 + 禁用并存 | 保留 DELETE 端点 + 列表加启用/禁用快捷按钮，删除加二次确认 | ✓ |
| 纯软删除 | 去掉 DELETE，删除按钮实际执行 status=DISABLED | |
| 保持现状 | 硬删除 + 编辑对话框 toggle 切换 | |

**User's choice:** 硬删除 + 禁用并存
**Notes:** 配合 FR-2.1 的 status=DISABLED 语义，管理员可选择禁用或彻底删除

## 权限码规范

| Option | Description | Selected |
|--------|-------------|----------|
| 模块:action 规范 | user:list/create/update/delete/reset-password + department:list/create/update/delete | ✓ |
| 推迟到 Phase 4 | 保留现状，等 Phase 4 统一整理 | |

**User's choice:** 模块:action 规范
**Notes:** Phase 3 锁定全量权限码，修正 reset-password 端点的 authGuard 参数

## 表单校验策略

| Option | Description | Selected |
|--------|-------------|----------|
| Quasar rules 实时校验 | 失焦触发，必填加红星号，邮箱/手机正则 | ✓ |
| 提交时校验 | 点保存时统一校验 | |
| Claude 决定 | 校验时机和规则细节由 Claude 决定 | |

**User's choice:** Quasar rules 实时校验
**Notes:** 无额外说明

## 部门树交互

| Option | Description | Selected |
|--------|-------------|----------|
| 加父部门选择器 | 编辑对话框加 q-select 树形下拉，排序保留数字输入 | ✓ |
| 父部门 + 拖拽排序 | 加选择器 + 拖拽排序 | |
| 保持现状 | 编辑时不能改父部门 | |

**User's choice:** 加父部门选择器
**Notes:** 排除自身及子部门防循环引用

## 密码策略

| Option | Description | Selected |
|--------|-------------|----------|
| 固定默认密码 123456 | 创建和重置都用 123456，成功后弹窗显示+复制按钮 | ✓ |
| 随机生成密码 | 后端生成 8 位随机密码 | |
| 可自定义 + 默认回退 | 管理员可输入自定义密码 | |

**User's choice:** 固定默认密码 123456
**Notes:** 简单直接，内部 OA 系统安全等级可接受

## 角色边界

| Option | Description | Selected |
|--------|-------------|----------|
| 保留角色选择器 | Phase 3 保留 roleIds 选择器，Phase 4 做角色 CRUD | ✓ |
| 移除，推迟到 Phase 4 | 移除角色选择器 | |

**User's choice:** 保留角色选择器
**Notes:** 创建/编辑用户时可顺手挂角色

## 列表筛选

| Option | Description | Selected |
|--------|-------------|----------|
| 加 status 筛选 | keyword + departmentId + status（全部/启用/禁用） | ✓ |
| 保持现状 | keyword + departmentId | |
| Claude 决定 | 筛选维度由 Claude 决定 | |

**User's choice:** 加 status 筛选
**Notes:** 配合禁用并存决策

## 移动端定位

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现状，等 Phase 5 | UserPage PC/移动切换保留，DepartmentPage 不做适配 | ✓ |
| 移除移动适配 | 移除 UserPage 的移动卡片逻辑 | |
| 部门页也做适配 | Phase 3 就做部门页移动适配 | |

**User's choice:** 保留现状，等 Phase 5
**Notes:** 响应式双布局统一在 Phase 5 处理

---

## Claude's Discretion

- Quasar rules 校验函数具体写法
- 父部门选择器 UI 细节
- 空态插图/图标
- 错误提示文案
- 后端错误响应格式细节

## Deferred Ideas

- 角色 CRUD + 权限分配 — Phase 4
- 响应式双布局 — Phase 5
- 用户头像上传 — 未规划
- 部门拖拽排序 — 未规划
