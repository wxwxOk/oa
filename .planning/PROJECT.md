# Project: OA 管理系统

## What This Is
轻量开源 OA 平台，面向中小企业。v1.2 已交付完整的组织架构管理 + 自定义表单收集系统，含 12 列栅格布局设计器、分组标题、动态行表格、PDF 保真输出、PC/Mobile 响应式填写页和 Docker 一键部署。v2.0 已扩展为表单驱动的 OA 审批中心：员工通过动态表单提交内部申请，系统按模板绑定流程流转到审批人，并把申请、审批、备注、编辑、归档导出和统计串成闭环。v1.3 已交付固定的到访信息管理模块，用于沉淀渠道往来测试表中的学员到访、咨询接待、试听跟进和成交状态管理。v1.4 已交付固定报销管理模块，让员工提交报销申请、上传发票并由审核人员两级签字审批，支持明细导出。v1.5 工作记录管理已完成需求和 Phase 28 计划，但在 2026-05-05 因优先级调整封存归档，无代码产出。v1.6 启动渠道商信息推送：外部渠道商账号通过本系统向绑定的内部接收人推送学员信息，内部接收人审核闭环并独立管理推送数据，不与到访记录混用。

## Core Value
中小企业能用自定义表单快速上线可追踪、可审批、可归档的内部业务流程，并能通过固定业务模块沉淀高频台账数据 — `docker compose up -d` 即可运行。

## Current State
✅ v1.0 MVP shipped (2026-04-20)
✅ v1.1 自定义表单收集 shipped (2026-04-20)
✅ v1.2 模板管理优化 shipped (2026-04-22)
✅ v2.0 表单驱动 OA 审批中心 implemented through Phase 19; milestone verification remains open for Phase 18 closure (2026-04-26)
✅ v1.3 到访信息管理 shipped (2026-05-02; manual testing passed)
✅ v1.4 报销管理 shipped (2026-05-03; manual testing passed)
⏸️ v1.5 工作记录管理 deferred (2026-05-05; planning only, archived to `.planning/milestones/v1.5-*`)
✅ v1.6 渠道商信息推送 shipped (2026-05-08; Phase 32-36 complete, 双向站内通知 + 跨角色可见性 + 77 tests passed)

## Current Milestone: v1.6 渠道商信息推送 ✅ SHIPPED

**Goal:** 让外部渠道商通过本系统向绑定的内部接收人推送学员信息，由接收人审核闭环；推送数据独立沉淀和查询，不与 v1.3 到访记录混用。
**Status:** Shipped 2026-05-08 — 5 phases (32-36), 双向站内通知 + 跨角色可见性, 56 backend + 21 frontend tests passed, production build verified.

**Target features:**
- 渠道商账号体系：管理员手动开通外部账号 + CHANNEL_PARTNER 角色 + 渠道商↔内部接收人绑定关系；复用 PC/Mobile 布局，通过 RBAC 屏蔽其他菜单
- 学员信息推送：单条在线表单提交 + Excel 批量导入 + 附件上传；待审核状态下可编辑/撤回
- 重复提示：提交时按 (姓名, 手机号) 检测重复，提示但不阻止
- 内部审核闭环：接收人查看/补充字段/通过/驳回 + 必填意见；审核结果只更新推送记录状态，不自动创建到访记录
- 通知与可见性：复用 v2.0 站内通知（新增"渠道推送待审核"类型）；渠道商可看到自己推送记录处理状态

**Phase numbering:** 从 Phase 32 起（v1.5 占用 28-31 已封存归档）。

## Requirements

### Validated
- ✓ FR-1 认证：双 JWT + bcrypt + 无感续签 — v1.0
- ✓ FR-2 用户管理：CRUD + 分页筛选 + 重置密码 + 角色分配 — v1.0
- ✓ FR-3 部门管理：无限层级树 + 循环引用校验 — v1.0
- ✓ FR-4 RBAC：角色 CRUD + 权限分配 + ADMIN 锁死 — v1.0
- ✓ FR-5 前端权限控制：路由守卫 + v-perm 指令 — v1.0
- ✓ FR-6 响应式：PC/Mobile 双布局 + 暗色模式 — v1.0
- ✓ NFR-1 性能：列表 p95 < 500ms — v1.0
- ✓ NFR-2 安全：JWT secret 校验 + Prisma 参数化 — v1.0
- ✓ NFR-3 可维护性：ESLint + 模块化路由 — v1.0
- ✓ NFR-4 部署：docker compose up -d 一条命令 — v1.0
- ✓ FR-7 表单模板管理：创建/编辑/删除模板，RBAC 权限控制 — v1.1
- ✓ FR-8 表单设计器：7 种字段类型 + 拖拽排序 + 手写签名 — v1.1
- ✓ FR-9 模板配置：可选是否要求填写者提供身份信息 — v1.1
- ✓ FR-10 分享链接：生成唯一链接 + 二维码，记录分享人和时间 — v1.1
- ✓ FR-11 外部填写：免登录通过浏览器打开链接填写表单 — v1.1
- ✓ FR-12 数据归档：收集数据存储，有权限用户可查看全部数据 — v1.1
- ✓ FR-13 打印导出：浏览器打印 + PDF 导出 — v1.1
- ✓ FR-14 基础统计：员工分享次数、收集数量统计 — v1.1
- ✓ FR-15 字段分组 + 分组标题 — v1.2
- ✓ FR-16 12 列栅格布局引擎 — v1.2
- ✓ FR-17 动态行表格 — v1.2
- ✓ FR-18 PDF 保真输出 — v1.2
- ✓ FR-19 填写页响应式布局还原 — v1.2
- ✓ MODEL-01 审批流程/节点/实例/任务/动作/时间线数据模型 — v2.0 Phase 15
- ✓ MODEL-02 表单 schema 与审批流程快照持久化 — v2.0 Phase 15
- ✓ MODEL-03 审批实例合法状态机 — v2.0 Phase 15
- ✓ MODEL-04 提交/分配/审批/驳回/撤销/编辑/标记/备注不可变业务事件 — v2.0 Phase 15
- ✓ CFG-01 模板可切换“仅收集”和“需要审批”，并绑定可配置审批流程 — v2.0 Phase 16
- ✓ CFG-02 单步审批流程配置，审批人来源支持固定用户、角色和提交人部门负责人 — v2.0 Phase 16
- ✓ CFG-03 串行多步审批流程配置，节点包含名称、顺序、审批人来源和固定通过/驳回动作 — v2.0 Phase 16
- ✓ CFG-04 部门负责人/默认审批人维护并可被流程配置引用 — v2.0 Phase 16
- ✓ CFG-05 审批相关 RBAC 权限、后端校验和前端菜单/按钮控制 — v2.0 Phase 16
- ✓ DYN-01 模板必填字段在 PC/Mobile 提交页一致校验 — v2.0 Phase 16
- ✓ DYN-02 发布后字段变更形成新 schema 版本，提交保存版本快照 — v2.0 Phase 16
- ✓ APP-01 登录员工可通过 PC/Mobile 提交内部审批申请并保存申请人/部门/模板/流程快照 — v2.0 Phase 17
- ✓ APP-02 申请草稿可保存、继续编辑和正式提交，草稿不创建待办任务 — v2.0 Phase 17
- ✓ APP-03 “我的申请”按状态和日期范围筛选，PC 表格与 Mobile 卡片均可用 — v2.0 Phase 17
- ✓ APP-04 申请详情展示历史表单快照、当前状态/节点、时间线、意见和本人可见性提示 — v2.0 Phase 17
- ✓ APP-05 申请人可撤销审批中申请，撤销关闭待办并写入时间线 — v2.0 Phase 17
- ✓ APR-01 审批人可通过 PC/Mobile 处理待办，审批/驳回并填写意见 — v2.0 Phase 18
- ✓ APR-02 审批人可打开审批详情，查看按 schema 快照渲染的表单数据、当前节点和完整时间线 — v2.0 Phase 18
- ✓ APR-03 审批人可对待办执行通过或驳回，系统推进下一节点或进入最终状态 — v2.0 Phase 18
- ✓ APR-04 审批人可查看已处理审批历史 — v2.0 Phase 18
- ✓ APR-05 Mobile 审批详情页提供可读时间线和 sticky 操作区 — v2.0 Phase 18
- ✓ APR-06 审批人可添加内部处理备注 — v2.0 Phase 18
- ✓ OPS-01 授权人员可给申请或收集记录添加标签/标记 — v2.0 Phase 19
- ✓ OPS-02 授权人员可在审计轨迹下做提交后受控编辑 — v2.0 Phase 19
- ✓ OPS-03 管理员可为模板启用处理字段 — v2.0 Phase 19
- ✓ OPS-04 管理员/负责人可查询归档数据 — v2.0 Phase 19
- ✓ OPS-05 授权人员可导出 Excel/PDF — v2.0 Phase 19
- ✓ OPS-06 管理员可查看基础统计 — v2.0 Phase 19
- ✓ OPS-07 用户可收到站内通知并看到未读数量 — v2.0 Phase 19
- ✓ 到访记录固定业务模块，独立菜单与权限控制 — v1.3
- ✓ Excel 导入渠道往来测试表格式并生成到访记录 — v1.3
- ✓ 到访列表支持常用业务维度筛选与分页 — v1.3
- ✓ 到访详情可维护咨询、接待、试听后的跟进信息 — v1.3
- ✓ 到访统计支持渠道、人员、状态维度汇总 — v1.3
- ✓ v1.4 固定报销模块：独立菜单、权限、列表和详情，不复用自定义表单 JSONB 主模型 — v1.4
- ✓ v1.4 报销申请提交：支持标题、类别、发生日期、金额、事由、收款信息和备注 — v1.4
- ✓ v1.4 发票附件：支持多张图片/PDF 上传、本地存储、图片预览和原文件下载 — v1.4
- ✓ v1.4 两级审核签字：部门初审 + 财务复核，通过时必须手写签名并留痕 — v1.4
- ✓ v1.4 明细导出：授权人员可按筛选条件导出报销 Excel 明细 — v1.4

### Active
- v1.6 渠道商信息推送：Phase 32 backend (固定 ChannelPush 模型 + RBAC + 提交/查询/编辑/撤回 + 附件 + 重复提示) shipped 2026-05-06; Phase 33 partner UI (我的推送 列表/详情/表单 + 附件面板 + 重复提示对话框 + 状态隔离) shipped 2026-05-06; Phase 34 Excel 批量导入 shipped 2026-05-07; Phase 35 接收人审核 UI (待我审核列表/详情、内部补充字段、通过/驳回、已审核历史) shipped 2026-05-07; remaining: 站内通知 + 跨角色只读可见性 + 收尾验证 (Phase 36) — 详见 REQUIREMENTS.md

### Out of Scope
- 考勤打卡规则、工资/绩效、公告、文件管理 — 非 v2.0 审批中心 MVP
- BPMN 可视化流程设计器、并行/会签、条件分支、委托、超时升级 — 等基础审批闭环稳定后再评估
- 企业微信/钉钉/SMS/邮件外部通知 — v2.x 集成方向，v2.0 先做站内通知
- SSO/LDAP、多租户 — 企业版方向
- 平台级审计日志 — v2.0 只做审批/编辑相关的业务时间线与审计事件
- 条件逻辑/字段显隐 — 独立规则引擎，暂不纳入审批 MVP
- 通用自定义表单文件/图片上传字段 — v1.4 仅为固定报销模块提供发票附件，不扩展通用表单字段
- 到访 Excel 导出 — v1.3 只解决导入和系统内管理
- 报销 OCR、发票真伪查验、自动验重、自动金额识别 — v1.4 以人工填写和附件留存为准
- 报销预算控制、付款打款、会计凭证、财务系统对接 — 超出 v1.4 固定报销闭环
- 报销统计看板和图表分析 — v1.4 只做明细导出
- 报销按金额动态分支、多级会签、委托、超时升级 — v1.4 固定为部门初审 + 财务复核
- 自动去重合并 — 样表缺少手机号、微信或线索编号，自动合并风险高
- 跟进提醒 / 待办 — 需要通知和任务体系，超出固定台账 MVP 范围
- 渠道商字典管理 — 先从记录中提取筛选项，避免新增维护成本
- 销售阶段工作流 — 当前需求是记录状态，不是强制流程编排
- 公开渠道报名页 — 可由现有表单系统覆盖，不纳入固定到访模块
- 工作记录提醒推送、催办、截止时间和未提交自动通知 — v1.5 先做填报与汇总闭环
- 主管评论、退回修改、评分、点赞/互动 — 偏管理协作，待基础记录稳定后评估
- OKR/KPI/绩效考核、目标拆解和评分校准 — 属于绩效管理，超出轻量工作记录
- 项目工时、任务管理、甘特/看板 — 当前只做工作记录，不替代项目管理
- AI 自动总结、关键词分类和情绪/风险分析 — 需要额外模型能力，后置
- 审核通过自动写入到访记录 — v1.6 显式决定推送数据独立管理，不与 VisitRecord 联动
- 渠道商自助注册/审核激活 — v1.6 由管理员手动开通外部账号
- 公开 token/链接免登录推送 — v1.6 走授权登录路径，与公开收集分离
- 自动合并/去重 — 按 (姓名, 手机号) 仅做提示，不阻止也不合并
- 外部短信/微信/钉钉/邮件通知 — 与 v2.0 决策一致，仅做站内通知
- 渠道商之间互相查看推送 — v1.6 渠道商只能看到自己的推送
- 渠道商手机号/姓名以外字段唯一性约束 — 不引入额外业务唯一键
- SSO/LDAP/多租户、企业微信免登录 — 企业版方向，超出 v1.6

## Tech Stack
Vue3 + Quasar + TS / Bun + Elysia + Prisma / PostgreSQL 16 / JWT / Docker Compose

## Constraints
- Windows 本地开发环境
- Bun 作为后端运行时（非 Node）
- 部署目标：Docker Compose 单机

## Context
v1.0 以 2,404 LOC (TS/Vue) 在 3 天内完成，113 commits。
v1.1 新增 15,228 LOC，73 commits，1 天内完成（3 phases, 13 plans）。
v1.2 新增 17,172 LOC，~50 commits，2 天内完成（5 phases, 16 plans）。
v2.0 scope 来自客户沟通整理：`.planning/research/CLIENT_CHAT_NEXT_FEATURES.md`（2026-04-25）。客户重点从“公开表单收集”转向“内部纸质审批在线化”，首版优先实用审批闭环，不做复杂企业级流程平台。
v1.3 于 2026-05-02 交付固定的到访信息管理模块，以《渠道往来测试表.xlsx》为业务样本，表格标题为「学员到访跟踪表」，字段包括姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期、咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间；本里程碑采用固定业务模块，不复用自定义表单模板作为主数据模型。
v1.4 于 2026-05-03 交付固定报销管理模块，覆盖报销申请、发票附件、部门初审、财务复核、手写签字和明细导出；自动化 focused gates 和人工 UAT 均已通过。
v1.5 于 2026-05-03 启动工作记录管理需求定义并生成 Phase 28 计划产物；2026-05-05 因优先级调整封存为 Deferred，未产生代码。相关归档见 `.planning/milestones/v1.5-ROADMAP.md` / `.planning/milestones/v1.5-REQUIREMENTS.md` / `.planning/milestones/v1.5-phases/28-api/`。
技术亮点：Bun 全链路构建、Quasar 双布局响应式、Prisma ORM、vue-draggable-plus 表单设计器、signature_pad 手写签名、html2canvas PDF 导出、vue-chartjs 统计图表、12 列栅格布局引擎、智能分页 PDF、QExpansionItem 移动端卡片。

## Key Decisions

| Decision | Outcome |
|---|---|
| Bun 替代 Node 作为后端运行时 | ✓ 构建速度快，Docker 镜像小 |
| Quasar 作为 UI 框架 | ✓ 内置响应式组件，减少自定义 CSS |
| 双 JWT 实例（access + refresh） | ✓ 安全性好，无感续签体验佳 |
| Prisma ORM | ✓ 类型安全，migration 管理方便 |
| Docker 多阶段构建 | ✓ 生产镜像精简 |
| JSONB 存储表单 schema | ✓ 灵活，支持版本快照 |
| vue-draggable-plus 拖拽设计器 | ✓ 轻量，Vue3 兼容好 |
| nanoid 分享链接 token | ✓ URL-safe，碰撞概率极低 |
| 浏览器端 print + html2canvas PDF | ✓ 无需服务端依赖，部署简单 |
| Public routes 独立 Elysia group | ✓ 安全隔离，无 JWT 泄露风险 |

| 12 列栅格布局引擎 | ✓ 类 Bootstrap 栅格，兼顾复杂排版与响应式 |
| 不兼容 v1.1 旧模板 schema | ✓ 全新设计器替换，简化维护 |
| Row-based 层级 schema（非 x/y/w/h 坐标） | ✓ 序列化简单，行顺序即位置 |
| grid-layout-plus 设计器画布 | ✓ 拖拽 + 调整跨列，Vue3 兼容 |
| PrintableForm table HTML 绕过 CSS Grid | ✓ html2canvas 不支持 CSS Grid，table 方案稳定 |
| DOM 坐标分页算法 | ✓ 精确分页，避免截断分组/表格行 |
| QExpansionItem 移动端卡片布局 | ✓ 动态表格触控友好，折叠/展开自然 |
| v2.0 先做显式状态机，不引入 BPMN 引擎 | ✓ Phase 15 建立集中状态机 |
| 申请提交时快照表单 schema 与审批流程配置 | ✓ Phase 15 `ApprovalApplication` 保存 schema/process/template/applicant/department 快照 |
| 原始提交、处理字段、备注/标签、审计事件分开建模 | ✓ Phase 15 建立 `ApprovalAction` + `ApprovalTimelineEvent` 追加事件基础 |
| 审批流程配置采用单步/串行节点模型，先不引入 BPMN/并行/条件流 | ✓ Phase 16 流程配置 API 和 UI 完成 |
| 发布中的需审批模板绑定流程后，流程停用/删除/完整编辑停用都必须被阻止 | ✓ Phase 16 16-09 gap closure 已回归覆盖 |
| 内部审批申请必须走 authenticated `/api/v1/approval/applications`，不复用公开 `/f/:code` | ✓ Phase 17 service/routes/store/UI 完成 |
| 我的申请详情始终渲染提交时 `schemaSnapshot` + `formData`，不读取当前模板 schema | ✓ Phase 17 detail page 完成 |
| v2.0 MVP 外部通知集成和附件字段后置 | — Pending |
| 到访信息采用固定 `VisitRecord` 模型 | ✓ 样表字段稳定，筛选和统计维度明确，比复用 JSONB 表单更直接 |
| Excel 导入由前端解析后提交标准化 JSON | ✓ 不引入后端文件存储，降低部署复杂度 |
| 到访状态字段先按字符串存储 | ✓ 避免过早枚举化丢失业务表达 |
| 到访导入只提示潜在重复，不自动合并 | ✓ 样表缺少唯一线索标识，避免误伤数据 |
| 到访统计口径由后端统一计算 | ✓ 意向/签约计数和转化率由 `/visits/stats` 产出，前端只格式化 |
| 到访统计空值统一归入 `未填写` | ✓ 避免渠道、人员和状态维度合计难以解释 |
| 报销管理采用固定业务模块 | ✓ v1.4 不复用自定义表单 JSONB 主模型 |
| 报销审核固定为部门初审 + 财务复核 | ✓ 满足当前两级审核需求，暂不做金额分支/会签 |
| 报销通过必须采集 Canvas 手写签名 | ✓ 签名图片、审核人、动作、意见和时间写入审核轨迹 |
| 报销附件仅支持图片/PDF 上传预览下载 | ✓ 不做 OCR、发票查验、自动验重或自动识别金额 |
| 报销本期只做 Excel 明细导出 | ✓ 不做统计看板、付款打款或财务系统对接 |
| v1.5 工作记录管理定位为轻量固定业务模块 | ⏸️ 2026-05-05 优先级调整后封存；规划结论保留在 `.planning/milestones/v1.5-*` 供恢复 |
| v1.6 渠道商信息推送独立 ChannelPush 模块 | ✓ 推送数据与 VisitRecord 完全解耦，审核通过仅更新状态、不联动到访记录 |
| 渠道商账号由管理员手动开通 | ✓ 不开放自助注册；CHANNEL_PARTNER 角色 + 接收人绑定 |
| 渠道商复用员工 PC/Mobile 布局 + RBAC 屏蔽其他菜单 | ✓ 减少额外 layout 维护成本，权限控制为唯一隔离手段 |
| 渠道推送的提醒走 v2.0 站内通知体系 | ✓ 复用头部铃铛/未读数；不引入外部通知渠道 |
| 渠道推送字段独立 schema | ✓ 不复用 VisitRecord 字段；推送侧字段集合可参考 v1.3 但独立演进 |
| 推送重复仅提示不阻止 | ✓ 与 v1.3 一致策略，避免误伤跨渠道商重推 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-07 after Phase 35 (接收人审核 UI + 内部补充字段) execution complete; REVIEW-01/03/04/05/06/07 + PERM-04 closed; v1.6 next phase is 36 (站内通知集成 + 跨角色可见性 + 验证收尾)*
