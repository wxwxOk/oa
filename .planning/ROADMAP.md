# Roadmap - OA v1.0

| Phase | 名称 | 交付物 | 状态 |
|---|---|---|---|
| 1 | 基础脚手架 | docker-compose, backend/frontend 目录骨架, /health 打通 | 🔄 |
| 2 | 数据层 + 认证 | Prisma schema + migration + seed, JWT 登录/刷新, 前端登录页 | ⏳ |
| 3 | 组织架构 CRUD | 部门树、用户 CRUD 页面 | ⏳ |
| 4 | RBAC | 角色管理、权限分配、前端 v-perm 指令 | ⏳ |
| 5 | 响应式体验 | PC/Mobile 双布局、暗色模式 | ⏳ |
| 6 | Docker 化 + 文档 | 多阶段 Dockerfile、README、部署脚本 | 🔄 |

## Dependencies
- Phase 2 依赖 Phase 1
- Phase 3/4 依赖 Phase 2
- Phase 5 依赖 Phase 3/4
- Phase 6 收尾

### Phase 2: 数据层 + 认证

**Goal:** 修复双 JWT 实例（access 2h + refresh 7d），验证 Prisma schema/migration/seed 端到端可运行，前端登录流程完整。

**Requirements:** FR-1.1, FR-1.2, FR-1.3, FR-1.4, NFR-2, NFR-4

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — 后端双 JWT 实例 + secret 校验 + Dockerfile 修复
- [x] 02-02-PLAN.md — 端到端验证（API 测试 + 前端登录流程）

### Phase 3: 组织架构 CRUD

**Goal:** 交付部门（无限层级树）与用户 CRUD 的后端 API + 前端管理页面；完成用户↔部门挂载。角色分配留给 Phase 4。

**Requirements:** FR-2.1, FR-2.2, FR-2.3, FR-3.1, FR-3.2, FR-3.3, NFR-1, NFR-3

**Plans:** 5 plans

Plans:
- [x] 03-01-PLAN.md — 后端修复：status 筛选 + 权限码分离 + 循环引用校验
- [x] 03-02-PLAN.md — 设计系统：Slate + Indigo 色彩 + CSS 变量 + 字体栈
- [x] 03-03-PLAN.md — DepartmentPage 补全：父部门选择器 + 表单校验 + 空态
- [x] 03-04-PLAN.md — UserPage 补全：status 筛选 + 表单校验 + 密码弹窗 + 空态
- [x] 03-05-PLAN.md — 端到端人工验证

Canonical refs:
- .planning/REQUIREMENTS.md §FR-2 用户管理
- .planning/REQUIREMENTS.md §FR-3 部门管理

### Phase 4: RBAC

**Goal:** 交付角色/权限的后端 API + 角色管理前端页面 + 用户-角色挂载；前端实现路由守卫与 `v-perm` 指令，按权限码控制菜单/按钮显隐。

**Requirements:** FR-2.4, FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-5.1, FR-5.2, FR-5.3, NFR-1, NFR-3

**Plans:** 5 plans

Plans:
- [x] 04-01-PLAN.md — 后端 RBAC 保护：ADMIN 锁死 + 角色删除拒绝 + userCount
- [x] 04-02-PLAN.md — 前端 RolePage 补全：成员数展示 + 按钮禁用逻辑
- [x] 04-03-PLAN.md — 前端路由守卫 + 权限刷新：maybeRefreshProfile 60s 防抖
- [x] 04-04-PLAN.md — 前端收尾补全：删除确认弹窗对齐 + 一致性验证
- [x] 04-05-PLAN.md — 端到端人工验证：UAT-1/UAT-2/UAT-5 + p95 性能

Canonical refs:
- .planning/REQUIREMENTS.md §FR-4 角色与权限（RBAC）
- .planning/REQUIREMENTS.md §FR-5 前端权限控制
- .planning/REQUIREMENTS.md §FR-2.4 用户-角色挂载
- .planning/REQUIREMENTS.md §UAT-1, UAT-2, UAT-5 RBAC 验收场景

### Phase 5: 响应式体验

**Goal:** 实现 PC/Mobile 双布局自适应切换（≥1024px PC 布局，<1024px 移动布局）；表格在移动端切换为卡片列表；支持暗色模式切换。

**Requirements:** FR-6.1, FR-6.2, FR-6.3, NFR-1

**Depends on:** Phase 3, Phase 4

**Plans:** 5 plans

Plans:
- [x] 05-01-PLAN.md — 基础设施：composables + boot/dark-mode + CSS 变量扩展 + vitest 配置
- [x] 05-02-PLAN.md — MainLayout 双布局改造：PC Drawer + 移动端 overlay Drawer + 底部 Tab + fade 过渡
- [x] 05-03-PLAN.md — 后端 Dashboard Stats API：GET /dashboard/stats 接口
- [x] 05-04-PLAN.md — 页面移动适配：UserPage/DepartmentPage/RolePage + EmptyState + FilterSheet
- [x] 05-05-PLAN.md — UI 美化：LoginPage 渐变 + DashboardPage 统计卡片 + 403/404 错误页

Canonical refs:
- .planning/REQUIREMENTS.md §FR-6 响应式
- .planning/REQUIREMENTS.md §UAT-6 移动端布局验收

### Phase 6: Docker 化 + 文档

**Goal:** 交付生产级 Dockerfile（前后端真·多阶段构建）、docker-compose 生产强化、完整 README、Bash+PowerShell 双份部署脚本。

**Requirements:** NFR-2, NFR-4

**Depends on:** Phase 5

**Plans:** 3/3 plans executed

Plans:
- [x] 06-01-PLAN.md — Docker 基础设施：Dockerfile 重写 + compose 强化 + .dockerignore + binaryTargets
- [x] 06-02-PLAN.md — 部署脚本：init/backup/restore/upgrade/health/check-env（Bash + PowerShell）
- [x] 06-03-PLAN.md — README 完整文档：架构图 + 部署说明 + 反向代理 + FAQ + 升级流程

Canonical refs:
- .planning/REQUIREMENTS.md §NFR-4 部署
- .planning/REQUIREMENTS.md §NFR-2 安全
