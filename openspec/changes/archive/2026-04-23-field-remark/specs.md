# 模板字段备注功能 — 需求规格

## 概述
在模板设计器中为字段增加可选的「备注」属性。设计者在右侧属性面板设置备注后，字段标签旁出现问号图标，点击弹出备注内容。

## 约束

| 约束 | 值 |
|------|-----|
| 数据字段 | `SchemaField.remark?: string` |
| 最大长度 | 无硬限制（前端 textarea autogrow） |
| 空值语义 | `undefined` / `""` / 纯空白 均视为「无备注」 |
| 展示方式 | `q-popup-proxy` 点击弹出卡片 |
| 填写模式 | 显示问号图标 + 弹出备注 |
| 打印模式 | 不显示备注 |
| 设计器模式 | 显示问号图标 + 弹出备注 |
| 后端校验 | `remark: t.Optional(t.String())` |
| 向后兼容 | 旧模板无 remark 字段，不影响任何现有功能 |

## 不变量 (PBT Properties)

1. **可选性不变量**: 不含 remark 的 SchemaField 仍通过后端校验
2. **空值等价**: `remark === undefined` 与 `remark === ""` 在 UI 上行为一致（不显示图标）
3. **往返一致**: 设置 remark → 保存 → 重新加载 → remark 值不变
4. **模式隔离**: print 模式下永远不渲染 remark 相关 DOM
