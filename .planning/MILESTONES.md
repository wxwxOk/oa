# Milestones

## v1.3 到访信息管理 (Shipped: 2026-05-02)

**Phases:** 4 | **Plans:** 10 | **Validation:** automated smoke/build checks + manual testing
**Timeline:** 2026-05-02 (same-day delivery)
**Stack additions:** xlsx

**Key accomplishments:**

1. Fixed `VisitRecord` data model, migration, permission seed and guarded `/api/v1/visits` backend module
2. Responsive visit management page with PC table, mobile cards, filters, detail and CRUD dialogs
3. Frontend Excel parser and import preview for the 15-column `渠道往来测试表.xlsx` format
4. Duplicate-warning import workflow that posts normalized JSON and avoids unsafe auto-merge/upsert
5. Stats panel for channel, consultant, receptionist and status dimensions with backend-owned conversion rates

**Archive:** [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) | [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md)

---

## v1.2 模板管理优化 (Shipped: 2026-04-22)

**Phases:** 5 | **Plans:** 16 | **Commits:** ~50 | **LOC:** +17,172 / -1,200
**Timeline:** 2026-04-21 → 2026-04-22 (2 days)
**Stack additions:** grid-layout-plus, jspdf-autotable

**Key accomplishments:**

1. v2 schema 类型体系（Group/Row/Column 层级 + 12 列栅格 colSpan）+ 统一 GridFormRenderer 三模式渲染引擎
2. 12 列栅格设计器画布（拖拽定位 + 指针调整跨列 + 实时预览 WYSIWYG）
3. 分组区块（可编辑标题栏）+ 动态行表格（增删行 + 列结构定义 + 三模式渲染）
4. PDF 保真输出（table 转换 + 智能分页 + 页眉页脚 + 表头复出 + CJK 字体栈）
5. 响应式填写页（PC 960px 栅格还原 + 移动端单列 + 动态表格卡片布局 + sticky 提交）

**Archive:** [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) | [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.0 MVP (Shipped: 2026-04-20)

**Phases:** 6 | **Plans:** 25 | **Commits:** 113 | **LOC:** 2,404 TS/Vue
**Timeline:** 2026-04-17 → 2026-04-20 (3 days)
**Stack:** Vue3 + Quasar + Bun + Elysia + Prisma + PostgreSQL 16

**Key accomplishments:**

1. JWT 双实例认证（access 2h + refresh 7d）+ 启动硬校验 + 无感续签
2. 用户/部门/角色完整 CRUD + 无限层级部门树 + 循环引用校验
3. RBAC 权限系统：路由守卫 + v-perm 指令 + ADMIN 角色锁死保护
4. PC/Mobile 双布局响应式 + 暗色模式 + Slate/Indigo 设计系统
5. 生产级 Docker 多阶段构建 + Bash/PowerShell 双份部署脚本
6. 完整中文 README（Mermaid 架构图 + 部署说明 + 反向代理 + FAQ）

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---

## v1.1 自定义表单收集 (Shipped: 2026-04-20)

**Phases:** 3 | **Plans:** 13 | **Commits:** 73 | **LOC added:** 15,228
**Timeline:** 2026-04-20 (1 day)
**Stack additions:** vue-draggable-plus, signature_pad, nanoid, qrcode, html2canvas, jspdf, vue-chartjs

**Key accomplishments:**

1. 表单模板管理 + 3-panel 拖拽设计器（7 种字段类型含手写签名）
2. 分享链接生成 + 二维码 + 外部免登录填写页（4 状态机 + 独立 axios）
3. 提交数据列表/详情查看 + 浏览器打印 + PDF 批量导出（上限 50 条）
4. 员工分享/收集工作量统计面板（QTable + vue-chartjs 柱状图）
5. 全链路 RBAC 权限控制 + Code Review 安全加固（5 项修复）

**Archive:** [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---
