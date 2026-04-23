# Change: signature-dialog-ux

## Summary

重构签名字段为弹窗式签名体验。当前签名字段直接内联渲染 400x200 固定尺寸 canvas，在移动端溢出容器破坏布局，且签名空间过小体验差。改为点击触发区域打开 QDialog 签名，桌面端 600x400 弹窗，移动端全屏签名。

## Motivation

- 固定 400x200px canvas 在移动端（<400px 宽）溢出容器，破坏网格布局
- 内联 canvas 在移动端触摸签名时容易与页面滚动冲突
- 签名空间太小，用户体验差
- 设计器预览模式也使用固定宽度，不适配不同列宽

## Design

### 交互流程

1. **触发区域**：fill 模式下显示一个响应式的可点击区域
   - 无签名时：显示虚线边框 + "点击签名" 提示 + 签名图标
   - 有签名时：显示签名预览图 + "重新签名" 按钮
2. **签名弹窗**：
   - 桌面端（≥1024px）：600x400 QDialog 弹窗
   - 移动端（<1024px）：QDialog maximized 全屏签名
3. **弹窗内容**：
   - 顶部工具栏：标题 "手写签名" + 清除按钮 + 关闭按钮
   - 中间：自适应尺寸的 signature_pad canvas
   - 底部：确认按钮
4. **确认流程**：点击确认 → 保存签名数据 → 关闭弹窗 → 触发区域显示签名预览

### 技术方案

#### SignatureField.vue 重构

- 新增 `dialogOpen` ref 控制弹窗显示
- canvas 尺寸在弹窗打开后根据容器动态计算（使用 nextTick + ResizeObserver 或固定比例）
- 桌面端 canvas: ~560x340（弹窗内边距后）
- 移动端 canvas: 视口宽度 - padding，高度按 2:1 比例
- 签名数据仍使用 `toDataURL('image/png')` 格式，与现有存储兼容

#### FieldRenderer.vue 调整

- fill 模式下 signature 分支无需改动（SignatureField 内部处理弹窗）

#### Designer 模式

- 预览占位符改为响应式（width: 100%, max-height: 80px），移除固定 400px

## Constraints

- signature_pad 要求 canvas 有明确的 width/height 像素值（非 CSS 尺寸）
- 动态调整 canvas 尺寸会清除已有绘制内容，需在 resize 前保存、resize 后恢复
- 必须保持 `defineExpose({ clear, save, isEmpty })` API 不变
- 必须保持 `v-model` (base64 PNG data URL) 接口不变
- 后端无需任何改动
- 打印模式不受影响（已使用 img 标签）

## Dependencies

- `signature_pad` ^5.1.3（已安装）
- Quasar QDialog（已可用，^2.17.0）
- `useResponsive()` composable（已存在）

## Risks

- canvas resize 时需要 save/restore 签名数据，时序需要注意
- 移动端全屏弹窗需要处理安全区域（safe-area-inset）

## Success Criteria

1. 签名字段触发区域 100% 宽度，不再溢出容器
2. 点击触发区域打开签名弹窗
3. 桌面端弹窗 600x400，移动端全屏
4. canvas 自适应弹窗尺寸
5. 签名保存后在触发区域正确显示预览
6. 清除/保存/isEmpty API 正常工作
7. 表单验证流程不受影响
8. 打印模式不受影响
9. 设计器预览模式响应式显示

## Affected Files

- `frontend/src/components/designer/fields/SignatureField.vue` — 主要重构
- `frontend/src/components/renderer/FieldRenderer.vue` — 设计器模式占位符样式调整
