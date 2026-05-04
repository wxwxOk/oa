# Research Summary: v1.5 工作记录管理

**Milestone:** v1.5 工作记录管理  
**Researched:** 2026-05-03  
**Recommendation:** 自研固定业务模块，借鉴成熟工作汇报产品的最小闭环。

## Key Findings

### Stack

- 沿用 Vue 3 + Quasar + TypeScript / Bun + Elysia + Prisma / PostgreSQL。
- 不新增依赖；Excel 导出复用既有 ExcelJS 路线。
- 新增 `WorkReport` 固定业务表和 work-report 后端/前端模块。

### Feature Table Stakes

- 员工创建草稿、编辑并提交日报/周报/月报。
- 固定字段：完成事项、下一周期计划、问题风险、需要协助、备注。
- 我的记录列表/详情，支持周期、状态、日期和关键词筛选。
- 主管/管理员按部门、人员、周期和日期范围查看提交率、未提交人员和摘要。
- 按当前筛选导出明细 sheet + 汇总 sheet。

### Architecture

- 使用 `periodType + periodStart + periodEnd` 做唯一、查询和汇总口径。
- 保存提交人和部门快照，避免组织架构调整影响历史归档。
- API 层必须按 own / department / all 做对象级可见性过滤。
- 未提交清单通过用户清单与工作记录计算，不新增提醒/待办表。

### Watch Out For

- 周期边界必须后端统一，不让前端各算各的。
- 重复提交必须 DB 约束和 service 校验双保险。
- 导出必须复用权限边界和公式注入防护。
- 不要把 v1.5 扩成绩效、OKR、项目管理或通知系统。

## Mature Product Takeaways

| Reference | Takeaway for v1.5 |
|-----------|-------------------|
| 钉钉日志 / 飞书工作汇报 | 固定模板 + 管理者汇总是主路径 |
| 15Five / Weekdone | 周期性 check-in 需要轻表单和管理视图 |
| Odoo / ERPNext timesheets | 工时/项目联动是另一类系统，v1.5 不引入 |

## Decision

v1.5 先交付轻量填报闭环：固定模板、草稿/提交、本人/部门/全部可见性、部门汇总和 Excel 归档。提醒、评论、评分、OKR/KPI、项目任务和 AI 摘要全部后置。

---
*Research summary for: v1.5 工作记录管理*  
*Researched: 2026-05-03*
