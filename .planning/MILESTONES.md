# Milestones

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
