# Requirements: v1.6 渠道商信息推送

**Defined:** 2026-05-05
**Core Value:** 中小企业能用自定义表单快速上线可追踪、可审批、可归档的内部业务流程，并能通过固定业务模块沉淀高频台账数据 — `docker compose up -d` 即可运行。

**Milestone Goal:** 让外部渠道商（非本公司员工）通过本系统向绑定的内部接收人推送学员信息，由内部人员审核闭环，推送数据独立沉淀和查询，不与 v1.3 到访记录混用。

## v1 Requirements

### 渠道商账号 (PARTNER)

- [ ] **PARTNER-01**: 管理员可在用户管理中创建渠道商账号，分配 `CHANNEL_PARTNER` 角色，并标记为外部用户（非本公司员工）
- [ ] **PARTNER-02**: 管理员可为每个渠道商账号绑定唯一的 1 名内部主接收人（咨询师/客户经理），并允许后续重新绑定
- [ ] **PARTNER-03**: 管理员可禁用/启用渠道商账号，禁用后渠道商无法登录但历史推送记录保留
- [ ] **PARTNER-04**: 渠道商使用与员工相同的登录入口和 PC/Mobile 布局，按 RBAC 屏蔽员工菜单（仅可见「我的推送」相关菜单和个人设置）
- [ ] **PARTNER-05**: 渠道商无法访问员工业务路径（用户/部门/角色/审批/到访/报销等），未授权访问时被前端路由守卫和后端权限拦截

### 学员推送 (PUSH)

- [ ] **PUSH-01**: 渠道商可在线单条提交学员推送，必填学员姓名和手机号；可选填写年龄、学历、性别、意向状态、意向说明、备注
- [ ] **PUSH-02**: 渠道商可上传 0~N 张图片或 PDF 附件（如身份证照片、聊天记录截图）作为推送的辅助材料，支持预览和下载
- [ ] **PUSH-03**: 渠道商可使用 Excel 批量导入推送，复用 v1.3 解析体验：标题/表头/数据行约定固定，导入前可预览有效行/无效行和错误原因
- [ ] **PUSH-04**: Excel 批量导入按用户确认后批量创建推送记录，每条独立进入审核流，并返回成功/失败数量
- [ ] **PUSH-05**: 渠道商可在「待审核」状态下编辑或撤回自己提交的推送；审核通过/驳回后不可再编辑或撤回
- [ ] **PUSH-06**: 渠道商可在 PC/Mobile 查看「我的推送」列表，按学员姓名/手机号关键字搜索，按状态（待审核/已通过/已驳回/已撤回）和时间范围筛选

### 重复检测 (DEDUP)

- [ ] **DEDUP-01**: 渠道商提交单条或 Excel 推送时，系统按 (姓名, 手机号) 检测是否与同渠道商待审核或全部状态推送重复，并在前端提示，但不阻止提交
- [ ] **DEDUP-02**: 重复提示明确标出冲突的现有推送条目（学员姓名、手机号、状态、提交时间），便于渠道商人工判断

### 审核闭环 (REVIEW)

- [ ] **REVIEW-01**: 主接收人可在「待我审核」列表中看到当前用户作为主接收人的待审推送，按状态、渠道商、时间范围筛选；列表 PC 表格 + Mobile 卡片
- [ ] **REVIEW-02**: 主接收人所在部门负责人、上级部门负责人和超级管理员可只读查看名下/全部推送记录，但只有当前主接收人可执行通过/驳回操作（避免越权审批）
- [ ] **REVIEW-03**: 主接收人可打开推送详情，查看渠道商提交的全部字段、附件预览、提交时间、当前状态和审核时间线
- [ ] **REVIEW-04**: 主接收人可在审核前补充内部字段（计划接待人、预期接待日期、内部备注），补充字段不修改渠道商原始提交内容、仅对内部可见
- [ ] **REVIEW-05**: 主接收人可对待审核推送执行「通过」或「驳回」操作；驳回必须填写驳回意见，通过可选填备注
- [ ] **REVIEW-06**: 审核结果只更新推送记录状态（已通过/已驳回）和审核时间线，**不自动创建到访记录、不与 VisitRecord 联动**
- [ ] **REVIEW-07**: 主接收人可查看已审核（已通过/已驳回）的推送历史，按状态和时间筛选

### 通知与可见性 (NOTIF)

- [ ] **NOTIF-01**: 渠道商提交推送后，绑定的主接收人立即收到 v2.0 站内通知（类型：「渠道推送待审核」），头部铃铛未读数 +1
- [ ] **NOTIF-02**: 主接收人点击通知可直接跳转到对应推送的审核详情页
- [ ] **NOTIF-03**: 渠道商在「我的推送」列表和详情页可看到每条推送的处理状态（待审核/已通过/已驳回 + 驳回原因 + 审核时间）
- [ ] **NOTIF-04**: 渠道商收到自己推送被通过/驳回的站内通知（复用 v2.0 通知中心，类型：「我的推送已审核」）

### 权限集成 (PERM)

- [ ] **PERM-01**: 新增 RBAC 权限码：`channelPush:create`（渠道商提交）、`channelPush:viewOwn`（渠道商查看自己）、`channelPush:cancel`（渠道商撤回）、`channelPush:review`（主接收人审核）、`channelPush:viewScope`（按部门/管理员只读查看）
- [ ] **PERM-02**: 新增 `CHANNEL_PARTNER` 角色，默认只持有 `channelPush:create / viewOwn / cancel` 权限码，且不持有任何员工业务权限
- [ ] **PERM-03**: 后端所有 `/api/v1/channel-push/*` 端点强制 JWT + 权限码 + 数据范围（按渠道商 / 主接收人 / 部门负责人 / 上级 / ADMIN）联合校验
- [ ] **PERM-04**: 前端按钮显隐和路由守卫覆盖渠道商和接收人侧的所有操作

## Future Requirements (Deferred)

### 推送转化 (CONVERT)
- **CONVERT-01**: 主接收人可手动从已通过推送一键创建 v1.3 到访记录（保留双向关联）
- **CONVERT-02**: 渠道商查看自己推送是否最终成单/到访的转化反馈

### 推送统计 (STAT)
- **STAT-01**: 管理员可查看按渠道商、接收人、状态、时间维度的推送量统计
- **STAT-02**: 推送通过率、平均审核耗时统计

### 推送导出 (EXPORT)
- **EXPORT-01**: 管理员可导出推送 Excel 明细（按筛选条件）

### 渠道商升级 (UPGRADE)
- **UPGRADE-01**: 渠道商自助注册 + 管理员审核激活
- **UPGRADE-02**: 渠道商自助修改自己的资料（联系方式等）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 审核通过自动写入到访记录 | v1.6 显式决定推送数据独立管理，不与 `VisitRecord` 联动；如需转化由 CONVERT 后续里程碑提供手动入口 |
| 渠道商自助注册/审核激活 | v1.6 由管理员手动开通外部账号；自助注册延后到 UPGRADE 里程碑 |
| 公开 token/链接免登录推送 | v1.6 走授权登录路径，与 v1.1 公开收集分离；如需匿名推送另开议题 |
| 渠道商之间互相查看推送 | v1.6 渠道商只能看到自己提交的推送，避免互相泄露线索 |
| 自动合并/去重 | 按 (姓名, 手机号) 仅做提示，不阻止也不合并；与 v1.3 一致策略 |
| 外部短信/微信/钉钉/邮件通知 | 与 v2.0 OPS-07 决策一致，仅做站内通知 |
| 渠道商手机号/姓名以外字段唯一性约束 | 不引入额外业务唯一键，避免数据噪声 |
| 推送统计/导出 | v1.6 先做闭环，统计和导出延后到 STAT/EXPORT 后续里程碑 |
| 推送结果转化跟踪 | 推送审核完成即闭环；转化跟踪延后到 CONVERT |
| SSO/LDAP/多租户、企业微信免登录 | 企业版方向，超出 v1.6 |
| 多接收人/抢单/分配池 | v1.6 固定 1 渠道商 ↔ 1 主接收人，主接收人独占审核权限 |
| 申诉/再次提交流程 | v1.6 驳回即终态；如需再次推送由渠道商重新提交（DEDUP-01 提示） |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARTNER-01 | TBD | Pending |
| PARTNER-02 | TBD | Pending |
| PARTNER-03 | TBD | Pending |
| PARTNER-04 | TBD | Pending |
| PARTNER-05 | TBD | Pending |
| PUSH-01 | TBD | Pending |
| PUSH-02 | TBD | Pending |
| PUSH-03 | TBD | Pending |
| PUSH-04 | TBD | Pending |
| PUSH-05 | TBD | Pending |
| PUSH-06 | TBD | Pending |
| DEDUP-01 | TBD | Pending |
| DEDUP-02 | TBD | Pending |
| REVIEW-01 | TBD | Pending |
| REVIEW-02 | TBD | Pending |
| REVIEW-03 | TBD | Pending |
| REVIEW-04 | TBD | Pending |
| REVIEW-05 | TBD | Pending |
| REVIEW-06 | TBD | Pending |
| REVIEW-07 | TBD | Pending |
| NOTIF-01 | TBD | Pending |
| NOTIF-02 | TBD | Pending |
| NOTIF-03 | TBD | Pending |
| NOTIF-04 | TBD | Pending |
| PERM-01 | TBD | Pending |
| PERM-02 | TBD | Pending |
| PERM-03 | TBD | Pending |
| PERM-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0 (will be filled by roadmap)
- Unmapped: 28 ⚠️ (expected pre-roadmap)

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after initial v1.6 definition*
