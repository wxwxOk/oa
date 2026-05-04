# Feature Landscape: v1.5 工作记录管理



**Domain:** 员工日报周报月报 / 部门汇总 / 工作记录归档  

**Researched:** 2026-05-03  

**Confidence:** HIGH



## Table Stakes



| Category | Feature | Why Expected | Complexity |

|----------|---------|--------------|------------|

| 填报 | 员工可创建、保存草稿、提交日报/周报/月报 | 工作记录首先要形成稳定填报入口 | MEDIUM |

| 固定模板 | 完成事项、计划、问题风险、需要协助、备注 | 成熟工作汇报产品的共同最小结构 | LOW |

| 周期规则 | 记录 periodType、periodStart、periodEnd，并限制同一人同周期唯一提交 | 避免同周期重复和汇总口径混乱 | MEDIUM |

| 我的记录 | 员工可查看、筛选、继续编辑自己的草稿和已提交记录 | 员工需要追踪自己的历史记录 | LOW |

| 部门汇总 | 主管按部门、人员、周期、日期范围查看提交率和内容摘要 | 用户明确要求“汇总”，部门是首要口径 | MEDIUM |

| 未提交人员 | 汇总页展示应提交但未提交的人员 | 管理者需要知道缺口，不只是看已有记录 | MEDIUM |

| 权限控制 | 独立菜单 + own/department/all/export 权限 | OA 固定模块必须纳入 RBAC | MEDIUM |

| Excel 归档 | 按当前筛选导出明细和汇总 sheet | 中小企业常用 Excel 做月度归档 | MEDIUM |

| 移动端 | 员工可在移动端填写和查看记录 | 日报场景经常在下班前手机补填 | MEDIUM |



## Differentiators



| Feature | Value | Scope Decision |

|---------|-------|----------------|

| 三周期统一模型 | 日报/周报/月报用同一套模型和页面，减少重复代码 | v1.5 included |

| 部门提交率 | 比单纯列表更贴合主管查看场景 | v1.5 included |

| 未提交清单 | 为后续提醒/催办保留数据基础，但不主动推送 | v1.5 included |

| 双 sheet 导出 | 明细 sheet + 汇总 sheet 兼顾归档和复盘 | v1.5 included |



## Deferred / Anti-Features



| Feature | Reason |

|---------|--------|

| 提醒/催办/截止时间 | 需要通知和规则调度，先验证填报闭环 |

| 主管评论/退回修改 | 会增加协作状态机，后续再做 |

| 评分/绩效/KPI | 属于绩效管理，超出“工作记录” |

| OKR/目标拆解 | 独立产品方向，不作为 v1.5 前置条件 |

| 项目工时/任务管理 | 容易变成项目管理系统，当前只做报表式记录 |

| AI 总结/关键词分类 | 需要模型能力和成本，后置 |



## Feature Dependencies



```text

工作记录数据模型

  ├──requires──> 权限种子

  ├──requires──> User / Department 关系

  └──enables──> 员工草稿/提交



记录列表和详情

  ├──requires──> WorkReport CRUD API

  └──enables──> PC/Mobile 填报页面



部门汇总

  ├──requires──> 周期字段和部门快照

  ├──requires──> 用户清单

  └──enables──> 提交率 / 未提交人员 / Excel 导出

```



## MVP Definition



### Launch With (v1.5)



- [ ] 员工可按日报、周报、月报创建草稿、编辑并提交。

- [ ] 固定模板覆盖完成事项、下一周期计划、问题风险、需要协助和备注。

- [ ] 同一员工同一周期只能有一条正式记录，提交后形成可汇总状态。

- [ ] 主管/管理员可按部门、人员、周期和日期范围查看提交率、已提交/未提交人员和内容摘要。

- [ ] 授权用户可导出当前筛选的明细和汇总 Excel。

- [ ] 工作记录菜单、按钮和接口均受 RBAC 控制。



### Add After Validation



- [ ] 提醒、催办和截止时间配置。

- [ ] 主管评论、退回修改和已读确认。

- [ ] 更多统计图表和趋势分析。



### Future Consideration



- [ ] OKR/KPI、评分和绩效校准。

- [ ] 项目工时、任务联动和看板。

- [ ] AI 自动摘要、风险识别和关键词分类。



## Sources



- 用户本次里程碑输入：工作记录管理，用于员工填写日报、周报、月报并汇总。

- 用户确认范围：轻量填报闭环、固定模板、部门汇总、v1.5。

- Codebase: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `backend/src/modules/visit/visit.route.ts`, `backend/src/modules/reimbursement/*`, `backend/prisma/seed.ts`.

- 产品参考：钉钉日志、飞书工作汇报、15Five weekly check-in、Weekdone、Odoo / ERPNext timesheets。



---

*Feature research for: v1.5 工作记录管理*  

*Researched: 2026-05-03*

