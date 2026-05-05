# Milestones

## v1.6 渠道商信息推送 (Planning: 2026-05-05)

**Status:** 🚧 PLANNED — roadmap approved, ready to execute Phase 32
**Planned Phases:** 5 (Phases 32-36) | **Planned Plans:** 17 | **Requirements:** 28 v1
**Timeline:** 2026-05-05 milestone started, requirements defined and roadmap approved

**Scope:**

1. 外部渠道商账号体系（管理员手动开通 + CHANNEL_PARTNER 角色 + 1 渠道商 ↔ 1 主接收人）
2. 学员信息推送（在线单条 + Excel 批量 + 附件 + 待审核可编辑撤回）
3. 重复提示但不阻止（按 姓名+手机号）
4. 主接收人审核闭环（补充内部字段 + 通过/驳回 + 必填意见）
5. 双向站内通知（复用 v2.0）+ 部门负责人/上级/ADMIN 只读可见

**Key decisions:**

- 推送数据独立 ChannelPush 模型，不与 v1.3 VisitRecord 联动
- 渠道商复用 PC/Mobile 布局，靠 RBAC 屏蔽员工菜单
- 仅站内通知，不引入外部短信/微信/邮件

**Files:** [REQUIREMENTS.md](REQUIREMENTS.md) | [ROADMAP.md](ROADMAP.md)

---

## v1.5 工作记录管理 (Deferred: 2026-05-05)

**Status:** ⏸️ DEFERRED before implementation — priority lowered in favour of a new milestone
**Planned Phases:** 4 | **Planned Plans:** 15 | **Code shipped:** none
**Timeline:** 2026-05-03 requirements defined → 2026-05-05 deferred after Phase 28 planning artefacts

**Planning artefacts retained:**

1. `milestones/v1.5-REQUIREMENTS.md` + `milestones/v1.5-ROADMAP.md`
2. Phase 28 CONTEXT/RESEARCH/PLAN/TASKS/LOG under `milestones/v1.5-phases/28-api/`

**Resume path:** 参见 [v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md) 的 "Resume Path"。

---

## v1.4 报销管理 (Shipped: 2026-05-03)

**Phases:** 4 | **Plans:** 16 | **Validation:** automated focused tests/builds + manual UAT passed
**Timeline:** 2026-05-03 (same-day closeout)
**Stack additions:** ExcelJS-backed reimbursement detail export; protected local image/PDF attachment storage

**Key accomplishments:**

1. Fixed reimbursement domain model, migration and RBAC seed data for application, attachment, review and export permissions
2. Employee reimbursement workflow with draft-first submission, required-field validation, own/list visibility and PC/Mobile list/detail UI
3. Protected image/PDF invoice attachment upload, preview, download and delete flow with backend file safety checks
4. Department initial review and finance final review queues with Canvas signature evidence, reject reasons and complete audit timeline
5. Current-filter Excel detail export with backend permission guard, fixed columns, formula-injection protection and frontend download feedback
6. v1.4 closeout evidence captured: focused backend/frontend gates passed and manual UAT confirmed passed

**Archive:** [v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) | [v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md)


---

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
