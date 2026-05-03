# Feature Landscape: v1.4 报销管理

**Domain:** 员工报销申请 / 发票附件 / 审批签字  
**Researched:** 2026-05-02  
**Confidence:** HIGH

## Table Stakes

| Category | Feature | Why Expected | Complexity |
|----------|---------|--------------|------------|
| 报销单 | 员工可新建、保存草稿、提交报销申请 | 报销需要先沉淀申请单和状态 | MEDIUM |
| 费用明细 | 一张报销单可包含多条日期/类别/金额/说明明细 | 报销通常不是单一金额，明细决定审核依据 | MEDIUM |
| 发票附件 | 明细可上传图片/PDF 发票，并在详情查看/下载 | 发票是报销审核的核心凭证 | HIGH |
| 审批流转 | 提交后进入现有审批待办，审核人可通过/驳回 | 项目已有 OA 审批中心，报销必须复用闭环 | MEDIUM |
| 审批签字 | 通过报销时审核人必须手写签名 | 用户明确要求“审核人员审核并签字通过” | HIGH |
| 权限控制 | 独立菜单 + list/create/update/delete/approve/export 权限 | OA 固定模块必须纳入 RBAC | MEDIUM |
| 详情/PDF | 报销详情展示明细、发票、审批意见、签名，可打印/PDF | 报销需要可归档和复核 | MEDIUM |
| 移动端 | PC/Mobile 均可提交、查看、审批签字 | 现有审批待办已支持移动端，报销不能回退 | MEDIUM |

## Differentiators

| Feature | Value | Scope Decision |
|---------|-------|----------------|
| 固定报销模块复用审批任务 | 不重新造工作流，用户在“待我审批”内处理报销 | v1.4 included |
| 发票预览与明细绑定 | 审核时能按费用行查看对应凭证 | v1.4 included |
| 签名进入审批时间线/PDF | 通过记录可追溯，归档输出更接近纸质签字 | v1.4 included |
| 草稿附件清理 | 防止未提交草稿和删除明细留下孤儿文件 | v1.4 included if storage phase supports it |

## Deferred / Anti-Features

| Feature | Reason |
|---------|--------|
| OCR 自动识别发票 | 外部服务、准确率、财税规则复杂，非首版闭环必需 |
| 发票真伪查验 | 依赖税务平台或第三方服务，超出当前单机部署定位 |
| 付款状态/出纳打款 | 审批通过后支付是后续财务闭环，不影响首版提交和审批 |
| 预算控制/科目余额 | 需要预算模块和财务科目体系，当前没有基础数据 |
| 通用附件字段 | 会扩大自定义表单平台范围；v1.4 仅报销发票附件 |
| 多币种/汇率 | 中小企业首版按人民币本位币即可 |
| 并行/会签审批 | 已在 PROJECT.md 后置，沿用现有串行流程 |

## Feature Dependencies

```text
报销数据模型
  ├──requires──> 权限种子
  ├──requires──> 本地文件存储元数据
  └──enables──> 报销草稿/提交

报销提交
  └──requires──> 现有审批流程适配
      └──creates──> ApprovalApplication + ApprovalTask

审批签字
  ├──requires──> 签名 canvas UI
  ├──requires──> 签名文件持久化
  └──extends──> approveTask payload / timeline
```

## MVP Definition

### Launch With (v1.4)

- [ ] 员工可创建报销草稿并维护基本信息、总金额、多条费用明细。
- [ ] 员工可为费用明细上传图片/PDF 发票并提交审批。
- [ ] 报销申请进入现有审批待办，审核人可查看明细和发票。
- [ ] 审核人通过时必须手写签名，驳回时必须填写意见。
- [ ] 报销详情和打印/PDF 展示审批意见、签名和附件清单。
- [ ] 报销菜单、按钮和接口均受 RBAC 控制。

### Add After Validation

- [ ] 付款/打款状态。
- [ ] 报销统计和按类别/部门/月度汇总。
- [ ] 附件批量下载或压缩包导出。
- [ ] 审批通过后财务复核节点。

### Future Consideration

- [ ] 发票 OCR、验真、重复发票号检测。
- [ ] 预算占用、费用科目、项目/客户维度。
- [ ] 企业微信/钉钉通知。

## Sources

- 用户本次里程碑输入：报销管理、提交报销申请、上传发票和相关信息、审核人员审核并签字通过。
- Codebase: `.planning/PROJECT.md`, `backend/src/modules/approval/*`, `frontend/src/pages/ApprovalTaskDetailPage.vue`, `backend/src/modules/visit/visit.route.ts`.
- Context7 docs for Elysia file upload, Quasar QFile, Bun file I/O, signature_pad.

---
*Feature research for: v1.4 报销管理*  
*Researched: 2026-05-02*
