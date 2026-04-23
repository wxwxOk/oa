# 模板字段备注功能 — 技术设计

## 改动范围

### 1. 类型层
- `frontend/src/types/schema.ts` — `SchemaField` 增加 `remark?: string`
- `backend/src/modules/template/schema.validation.ts` — `SchemaField` 增加 `remark: t.Optional(t.String())`

### 2. 属性面板 (PropertyEditor.vue)
- 在「提示文字」输入框之后、「选项」区域之前，增加「备注」textarea（outlined dense autogrow）
- 空值时 delete field.remark，避免序列化空字符串

### 3. 字段渲染器 (FieldRenderer.vue)
- field-label 改为 flex 布局（`display: flex; align-items: flex-start; gap: 4px`）
- 当 `field.remark?.trim()` 非空且 `mode !== 'print'` 时，渲染 `q-btn`（flat dense round size=sm icon=help_outline）
- 按钮内嵌 `q-popup-proxy` > `q-card` 显示备注内容
- 弹出卡片 max-width: `min(320px, calc(100vw - 32px))`，内容 `white-space: pre-wrap; word-break: break-word`

### 4. 不改动的文件
- `fieldRegistry.ts` — defaultProps 无需包含 remark（默认 undefined）
- `FieldPalette.vue` — clone 时不传 remark（undefined 即可）
- 数据库 — schema 以 JSON 存储，无需 migration
