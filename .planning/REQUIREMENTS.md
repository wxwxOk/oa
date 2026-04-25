# Requirements: OA v2.0 表单驱动 OA 审批中心

**Defined:** 2026-04-25
**Core Value:** 中小企业能用自定义表单快速上线可追踪、可审批、可归档的内部业务流程
**Milestone:** v2.0
**Source:** `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md`

## v2.0 Requirements

### 审批数据模型与状态机

- [x] **MODEL-01**: 系统可保存审批流程定义、流程节点、审批实例、审批任务、审批动作和时间线事件
- [x] **MODEL-02**: 用户提交审批申请时，系统保存表单 schema 快照和审批流程快照，历史申请不受后续模板/流程修改影响
- [ ] **MODEL-03**: 审批实例只允许在 draft、submitted、approving、approved、rejected、canceled 之间按合法状态流转
- [x] **MODEL-04**: 提交、分配、审批、驳回、撤销、编辑、标记和备注都会追加不可变业务事件，记录操作者、动作、节点、意见和时间

### 流程配置与模板绑定

- [ ] **CFG-01**: 管理员可将表单模板设置为 `COLLECTION_ONLY` 或 `APPROVAL_REQUIRED`，保留既有公开收集行为
- [ ] **CFG-02**: 管理员可配置单步审批流程，审批人来源支持固定用户、角色和提交人部门负责人
- [ ] **CFG-03**: 管理员可配置串行多步审批流程，每个节点有名称、顺序、审批人来源和必需动作
- [ ] **CFG-04**: 管理员可为部门配置负责人/默认审批人，用于“提交人部门负责人审批”规则
- [ ] **CFG-05**: 系统提供审批相关 RBAC 权限：流程配置、模板绑定、提交申请、审批任务、查看本人/部门/全部申请、导出审批数据
- [ ] **DYN-01**: 管理员可在模板设计器中配置必填字段，PC 和 Mobile 提交页都执行一致校验
- [ ] **DYN-02**: 模板发布后新增或调整提交字段会形成新的 schema 版本，已有申请继续使用提交时的 schema 快照

### 我的申请与动态提交

- [ ] **APP-01**: 登录员工可在 PC 和 Mobile 上打开审批模板并提交内部申请，申请绑定申请人、部门、模板、状态、当前节点和申请编号
- [ ] **APP-02**: 申请人可保存草稿并在提交前继续编辑，草稿不会创建待审批任务
- [ ] **APP-03**: 申请人可查看“我的申请”，按草稿、审批中、已通过、已驳回、已撤销和时间范围筛选
- [ ] **APP-04**: 申请人可查看申请详情，包含表单数据、当前状态、当前节点、审批时间线、意见和内部可见性提示
- [ ] **APP-05**: 申请人可在业务规则允许时撤销未终审申请，撤销动作写入时间线并关闭待办任务

### 待我审批与移动审批

- [ ] **APR-01**: 审批人可查看“待我审批”任务列表，并按模板、申请人、部门、状态和日期筛选
- [ ] **APR-02**: 审批人可打开审批详情，查看按 schema 快照渲染的表单数据、当前节点和完整时间线
- [ ] **APR-03**: 审批人可对待办执行通过或驳回，并填写审批意见；系统推进下一节点或进入最终状态
- [ ] **APR-04**: 审批人可查看已处理审批历史，区分已通过、已驳回和已转入后续节点的记录
- [ ] **APR-05**: Mobile 审批详情页提供可读时间线和 sticky 操作区，动态表格、签名和长表单在窄屏可用
- [ ] **APR-06**: 审批人可添加内部处理备注，备注独立于原始提交数据并显示在详情/时间线中

### 收集后处理、标记备注、归档导出统计

- [ ] **OPS-01**: 授权人员可给申请或收集记录添加标签/标记，如 `待跟进`、`已核对`、`资料不全`、`重点`
- [ ] **OPS-02**: 授权人员可在规则允许时编辑提交后数据，必须填写原因，并记录字段级 before/after 历史
- [ ] **OPS-03**: 管理员可为模板启用处理字段，如 `跟进结果`、`处理人备注`、`回访时间`，处理字段默认不改变申请人正式提交内容
- [ ] **OPS-04**: 管理员和授权负责人可按模板、部门、申请人、状态、日期、标签/标记查询归档申请和收集记录
- [ ] **OPS-05**: 授权人员可导出列表数据为 Excel，并复用现有 PDF/打印能力导出单个申请详情
- [ ] **OPS-06**: 管理员可查看按模板、状态、部门和月份聚合的基础统计
- [ ] **OPS-07**: 用户可收到站内通知，包括新待办审批、申请通过、申请驳回，并在导航中看到未读数量

## Future Requirements

### 附件与证据材料

- **ATTACH-01**: 用户可上传图片/文件作为申请附件
- **ATTACH-02**: 附件权限与申请权限一致，导出时可选择包含附件索引

### 高级流程

- **ADVWF-01**: 条件分支按金额、类型、部门或字段值选择审批路径
- **ADVWF-02**: 并行审批、会签、或签、委托和超时升级
- **ADVWF-03**: BPMN 风格可视化流程设计器
- **ADVWF-04**: 驳回后退回申请人修改并重新提交的可配置策略

### 外部通知与企业集成

- **EXT-01**: 企业微信、钉钉、短信或邮件通知
- **EXT-02**: SSO/LDAP 和多租户企业版能力

## Out of Scope

| Feature | Reason |
|---------|--------|
| BPMN/Activiti/Camunda 级流程平台 | v2.0 目标是实用审批闭环，复杂流程引擎会拖慢首版交付 |
| 条件分支、并行、会签、委托、超时升级 | 需要规则引擎和更多异常路径，放入后续高级流程 |
| 文件/图片上传字段 | 需要存储、权限、预览、清理和导出策略，除非客户确认首版强依赖 |
| 企业微信/钉钉/SMS/邮件集成 | v2.0 先做站内通知，外部渠道作为集成阶段 |
| 考勤、工资、绩效等专用业务规则 | 本里程碑建设通用审批中心，不做单一业务域深度规则 |
| 平台级审计日志 | v2.0 只覆盖审批、编辑、备注、标记等业务审计事件 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODEL-01 | Phase 15 | Complete |
| MODEL-02 | Phase 15 | Complete |
| MODEL-03 | Phase 15 | Pending |
| MODEL-04 | Phase 15 | Complete |
| CFG-01 | Phase 16 | Pending |
| CFG-02 | Phase 16 | Pending |
| CFG-03 | Phase 16 | Pending |
| CFG-04 | Phase 16 | Pending |
| CFG-05 | Phase 16 | Pending |
| DYN-01 | Phase 16 | Pending |
| DYN-02 | Phase 16 | Pending |
| APP-01 | Phase 17 | Pending |
| APP-02 | Phase 17 | Pending |
| APP-03 | Phase 17 | Pending |
| APP-04 | Phase 17 | Pending |
| APP-05 | Phase 17 | Pending |
| APR-01 | Phase 18 | Pending |
| APR-02 | Phase 18 | Pending |
| APR-03 | Phase 18 | Pending |
| APR-04 | Phase 18 | Pending |
| APR-05 | Phase 18 | Pending |
| APR-06 | Phase 18 | Pending |
| OPS-01 | Phase 19 | Pending |
| OPS-02 | Phase 19 | Pending |
| OPS-03 | Phase 19 | Pending |
| OPS-04 | Phase 19 | Pending |
| OPS-05 | Phase 19 | Pending |
| OPS-06 | Phase 19 | Pending |
| OPS-07 | Phase 19 | Pending |

**Coverage:**
- v2.0 requirements: 29 total
- Mapped to phases: 29/29
- Unmapped: 0

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after roadmap phase assignment*
