# Technology Stack: v1.5 工作记录管理







**Project:** OA 管理系统 v1.5  



**Domain:** 固定工作记录模块 / 日报周报月报 / 部门汇总  



**Researched:** 2026-05-03  



**Confidence:** HIGH







## Recommendation







沿用现有 Vue 3 + Quasar + TypeScript / Bun + Elysia + Prisma / PostgreSQL 架构，不引入新的报表引擎、提醒服务或绩效组件。v1.5 的核心只是“固定工作记录 + 部门汇总 + Excel 归档”，可直接复用现有 RBAC、列表/详情页面和 Excel 导出模式；如果现有代码里已经有日期工具，就复用现成实现，不额外加日期库。







## Stack Additions







首版不需要新增 npm/bun 依赖。工作记录不涉及附件上传，Excel 导出可以复用报销模块已经验证过的 `ExcelJS` 路线。







| Capability | Existing Technology | Purpose |



|------------|---------------------|---------|



| 工作记录 CRUD | Elysia route + Prisma | 固定业务模块的创建、编辑、提交、列表和详情 |



| 周期汇总 | Prisma 聚合 + 后端 service | 按部门、人员、周期、日期范围做汇总统计 |



| 导出 | 现有 ExcelJS | 生成工作记录明细和汇总 Excel |



| 前端列表 | Quasar `QTable` / `QCard` | PC 表格和移动端卡片两套展示 |



| 权限控制 | `authGuard` + RBAC seed | own / department / all / export 分层授权 |







## Required Infrastructure Work







| Item | Decision |



|------|----------|



| Data model | 新增固定 `WorkReport` 主表，统一承载日报/周报/月报 |



| Period keys | 以 `periodType + periodStart + periodEnd` 记录周期，方便查询与唯一约束 |



| Docker persistence | 不需要新增文件持久化 volume，因为 v1.5 不做附件上传 |



| Export | 复用现有 ExcelJS 路线，导出时同时生成明细和汇总 sheet |



| Indexes | author / department / period / status / createdAt 建索引，保证筛选和汇总速度 |



| Unsubmitted stats | 通过用户清单 left join 工作记录计算，不单独建待办表 |







## Existing Stack Reuse







| Capability | Existing Pattern |



|------------|------------------|



| 固定业务模块 | v1.3 `VisitRecord` / v1.4 `ReimbursementApplication` 的固定模型路线 |



| 权限 | `authGuard('perm')` + `backend/prisma/seed.ts` 权限种子 |



| 列表/详情 | 固定业务页的 `QTable` + `QCard` + 抽屉/弹窗交互 |



| 导出 | v1.4 报销导出中的 ExcelJS 生成与权限守卫 |



| 组织范围 | `User` / `Department` / `defaultApprover` 关系可直接复用 |



| 响应式 | `useResponsive()` + PC/Mobile 双布局 |







## What Not To Add







| Not Adding | Reason |



|------------|--------|



| 通用表单引擎 | v1.5 目标是固定工作记录，不是扩展可配置表单平台 |



| 提醒/催办 | 需要通知体系，当前先验证填报与汇总闭环 |



| 评论/点赞/评分 | 会把模块推向协作或绩效系统，超出轻量记录范围 |



| OKR/KPI / 目标管理 | 属于绩效管理，不是工作记录本体 |



| 项目工时/任务管理 | 容易和项目系统耦合，当前只做报表式记录 |



| AI 总结/风险分析 | 需要额外模型和成本，后置 |







## Verified Sources







- 现有代码库：`backend/src/modules/visit/visit.route.ts`、`backend/src/modules/approval/archive-export.service.ts`、`backend/prisma/seed.ts`、`backend/prisma/schema.prisma`



- 成熟产品模式参考：钉钉日志、飞书工作汇报、15Five weekly check-in、Weekdone、Odoo / ERPNext timesheets



- 既有内部研究：`.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` 与 v1.3/v1.4 里程碑模式







---



*Stack research for: v1.5 工作记录管理*  



*Researched: 2026-05-03*

