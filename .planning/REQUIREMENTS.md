# Requirements: OA 到访信息管理

**Defined:** 2026-05-02
**Core Value:** 开箱即用的组织架构管理 + 表单收集
**Milestone:** v1.3

## v1.3 Requirements

### 到访记录

- [ ] **VISIT-01**: 有权限用户可新建到访记录，填写姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期等基础信息
- [ ] **VISIT-02**: 有权限用户可编辑到访记录的全部字段，含咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间
- [ ] **VISIT-03**: 有权限用户可删除误录的到访记录
- [ ] **VISIT-04**: 有权限用户可查看单条到访记录详情，长文本字段完整展示

### 查询筛选

- [ ] **QUERY-01**: 有权限用户可分页查看到访列表，支持按姓名关键词搜索
- [ ] **QUERY-02**: 有权限用户可按渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别、接待日期区间筛选
- [ ] **QUERY-03**: 筛选下拉项从现有到访记录中去重提取，不需要单独维护字典
- [ ] **QUERY-04**: 列表在 PC 端使用表格，在移动端使用卡片，长文本只展示摘要

### Excel 导入

- [ ] **IMPORT-01**: 有权限用户可导入 `.xlsx`，系统识别第 1 行标题、第 2 行 15 列表头、第 3 行起数据
- [ ] **IMPORT-02**: 导入前用户可预览解析结果，看到有效行、无效行和错误原因
- [ ] **IMPORT-03**: 系统按「姓名 + 接待日期 + 咨询师」提示潜在重复，但不自动跳过或合并
- [ ] **IMPORT-04**: 用户确认后系统批量创建有效到访记录，并返回导入数量

### 统计分析

- [ ] **STAT-01**: 有权限用户可查看按渠道商汇总的到访数量、意向数量、签约类数量和转化概览
- [ ] **STAT-02**: 有权限用户可查看按咨询师、接待人汇总的到访/意向/签约类数量
- [ ] **STAT-03**: 有权限用户可查看咨询后状态、状态类别、试听课后状态的分布统计
- [ ] **STAT-04**: 统计支持按接待日期区间筛选

### 权限集成

- [ ] **PERM-01**: 到访模块拥有独立菜单和 `visit:list/create/update/delete/import/stats` 权限码
- [ ] **PERM-02**: 前端按钮显隐和后端端点都按对应权限控制

## Future Requirements

### 跟进协同

- **FOLLOW-01**: 用户可为到访记录设置下次跟进日期和待办提醒
- **FOLLOW-02**: 用户可查看个人待跟进到访列表

### 数据治理

- **DICT-01**: 管理员可维护渠道商、状态类别、咨询后状态等字典
- **DEDUP-01**: 系统可基于手机号/微信/线索编号自动识别重复线索并合并

### 数据流转

- **PUBLIC-01**: 外部渠道可通过公开报名页提交线索并进入到访记录
- **EXPORT-01**: 用户可将到访列表按当前筛选条件导出为 Excel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Excel 导出 | PROJECT.md 已明确 v2.0 考虑，本里程碑只解决导入和系统内管理 |
| 自动去重合并 | 样表缺少手机号、微信或线索编号，自动合并风险高 |
| 跟进提醒 / 待办 | 需要通知和任务体系，超出固定台账 MVP 范围 |
| 渠道商字典管理 | 先从记录中提取筛选项，避免新增维护成本 |
| 销售阶段工作流 | 当前需求是记录状态，不是强制流程编排 |
| 公开渠道报名页 | 可由现有表单系统覆盖，不纳入固定到访模块 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VISIT-01 | Phase 15 | Pending |
| VISIT-02 | Phase 16 | Pending |
| VISIT-03 | Phase 16 | Pending |
| VISIT-04 | Phase 16 | Pending |
| QUERY-01 | Phase 16 | Pending |
| QUERY-02 | Phase 16 | Pending |
| QUERY-03 | Phase 16 | Pending |
| QUERY-04 | Phase 16 | Pending |
| IMPORT-01 | Phase 17 | Pending |
| IMPORT-02 | Phase 17 | Pending |
| IMPORT-03 | Phase 17 | Pending |
| IMPORT-04 | Phase 17 | Pending |
| STAT-01 | Phase 18 | Pending |
| STAT-02 | Phase 18 | Pending |
| STAT-03 | Phase 18 | Pending |
| STAT-04 | Phase 18 | Pending |
| PERM-01 | Phase 15 | Pending |
| PERM-02 | Phase 15 | Pending |

**Coverage:**
- v1.3 requirements: 18 total
- Mapped to phases: 18/18
- Unmapped: 0

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 after roadmap phase assignment*

