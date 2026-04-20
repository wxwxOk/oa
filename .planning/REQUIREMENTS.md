# Requirements: OA 管理系统

**Defined:** 2026-04-20
**Core Value:** 开箱即用的组织架构管理 — 自定义表单收集扩展

## v1.1 Requirements

Requirements for v1.1 milestone. Each maps to roadmap phases.

### 模板管理

- [x] **TMPL-01**: 用户可创建表单模板，定义模板名称和描述
- [x] **TMPL-02**: 用户可编辑和删除自己创建的表单模板
- [x] **TMPL-03**: 模板创建/编辑/删除受 RBAC 权限控制
- [x] **TMPL-04**: 用户可发布/下线模板，下线后分享链接不可填写
- [x] **TMPL-05**: 修改已发布模板时自动保存 schema 版本，已收集数据不受影响

### 表单设计器

- [x] **DSGN-01**: 用户可通过拖拽方式添加和排序表单字段
- [x] **DSGN-02**: 支持基础字段类型：文本、多行文本、单选、多选、日期、手机号
- [ ] **DSGN-03**: 支持手写签名字段（Canvas 签名板）
- [x] **DSGN-04**: 用户可配置字段属性：必填、提示文字、选项列表
- [x] **DSGN-05**: 设计器提供实时预览

### 分享与填写

- [ ] **SHARE-01**: 用户可为已发布模板生成唯一分享链接，记录分享人和时间
- [ ] **SHARE-02**: 分享链接可生成二维码供扫码填写
- [ ] **SHARE-03**: 外部人员通过浏览器打开链接免登录填写表单
- [ ] **SHARE-04**: 模板可配置是否要求填写者提供身份信息（如姓名/手机号）
- [ ] **SHARE-05**: 填写者提交后数据自动归档存储

### 数据与统计

- [ ] **DATA-01**: 有权限的用户可查看表单所有提交数据，支持分页和筛选
- [ ] **DATA-02**: 用户可查看单条提交的详细内容
- [ ] **DATA-03**: 支持浏览器打印提交数据（类似纸质表格排版）
- [ ] **DATA-04**: 支持导出提交数据为 PDF 文件
- [ ] **DATA-05**: 基础统计：每个员工的分享次数和收集数量

## v2 Requirements

Deferred to future release.

### 高级表单功能

- **DSGN-06**: 条件逻辑（根据选择显示/隐藏字段）
- **DSGN-07**: 多列布局
- **DSGN-08**: 文件/图片上传字段

### 高级数据分析

- **DATA-06**: 字段级别统计汇总（如学历分布、婚姻状况占比）
- **DATA-07**: 数据导出为 Excel

## Out of Scope

| Feature | Reason |
|---------|--------|
| 条件逻辑/分支表单 | 复杂度高，v1.1 聚焦基础表单收集 |
| 文件/图片上传字段 | 需要文件存储基础设施，v2.0 考虑 |
| 多列表单布局 | 增加设计器复杂度，单列足够覆盖纸质表格场景 |
| 审批工作流 | 属于 OA 工作流引擎范畴，非表单收集 |
| 多语言表单 | 当前仅中文场景 |
| 实时协作编辑模板 | 过度工程化 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 7 | Complete |
| TMPL-02 | Phase 7 | Complete |
| TMPL-03 | Phase 7 | Complete |
| TMPL-04 | Phase 7 | Complete |
| TMPL-05 | Phase 7 | Complete |
| DSGN-01 | Phase 7 | Complete |
| DSGN-02 | Phase 7 | Complete |
| DSGN-03 | Phase 7 | Pending |
| DSGN-04 | Phase 7 | Complete |
| DSGN-05 | Phase 7 | Complete |
| SHARE-01 | Phase 8 | Pending |
| SHARE-02 | Phase 8 | Pending |
| SHARE-03 | Phase 8 | Pending |
| SHARE-04 | Phase 8 | Pending |
| SHARE-05 | Phase 8 | Pending |
| DATA-01 | Phase 9 | Pending |
| DATA-02 | Phase 9 | Pending |
| DATA-03 | Phase 9 | Pending |
| DATA-04 | Phase 9 | Pending |
| DATA-05 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after roadmap creation*
