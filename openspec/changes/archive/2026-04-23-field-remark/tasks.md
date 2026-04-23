# 模板字段备注功能 — 任务清单

- [x] 1.1 `frontend/src/types/schema.ts` SchemaField 增加 `remark?: string`
- [x] 1.2 `backend/src/modules/template/schema.validation.ts` SchemaField 增加 `remark: t.Optional(t.String())`
- [x] 2.1 `frontend/src/components/designer/PropertyEditor.vue` 增加备注 textarea 输入框 + updateRemark 方法
- [x] 3.1 `frontend/src/components/renderer/FieldRenderer.vue` field-label 改 flex 布局，增加问号图标 + q-popup-proxy 弹出备注
- [x] 4.1 验证：设计器中设置备注 → 保存 → 重新打开 → 备注保留
- [x] 4.2 验证：填写模式下问号图标可见，点击弹出备注
- [x] 4.3 验证：打印模式下不显示问号图标
- [x] 4.4 验证：无备注字段不显示问号图标
