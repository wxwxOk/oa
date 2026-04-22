# Phase 13: PDF 保真输出 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 13-pdf
**Areas discussed:** PDF 生成技术路径, 分页控制策略, 中文字体处理, 栅格布局保真策略

---

## PDF 生成技术路径

### Q1: PDF 生成技术路径选哪个？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 保留 html2canvas 图像快照 | 保留 html2canvas 截图，聚焦修复分页截断 + 提升 scale。复用当前打印 DOM，栅格自然 1:1，中文无设置。PDF 为 JPEG 图像，体积略大、文本不可复制。（推荐：交付成本最低） | ✓ |
| B. 切换到 jspdf-autotable 纯矢量 | 用 jspdf-autotable/jsPDF.text 直接写矢量文本。PDF 文本可复制、放大清晰、体积小。代价：栅格布局需重写 autotable，中文需嵌入字体文件（~5MB）。 | |
| C. 混合方案（autotable + addImage） | 文本/表格用 jsPDF + autotable，签名用 addImage。兼顾文本可复制和字体简单。代价：分支最多，维护成本最高。 | |

**User's choice:** A. 保留 html2canvas 图像快照
**Notes:** 选 A。html2canvas 最省事，重点修分页。

---

## 分页控制策略

### Q2: 如何避免行/分组/表格被页截断？

| Option | Description | Selected |
|--------|-------------|----------|
| A. DOM 元素坐标抢占 + 智能切点 | 截图前扫描 DOM，记录每个 row/group/dynamic-table 的 top/bottom 坐标。分页时选择离页高最近、又不截断元素的位置作为切点。实现难度中，效果佳。（推荐） | ✓ |
| B. 逐块截图（按 item 独立处理） | 每个顶层 item（row/group/dynamic-table）独立 html2canvas 截图，逐块添加到 PDF。单块如超高再内部切片。实现清晰，中等性能成本（批量截图）。 | |
| C. DOM 插入分页标记元素 | 类似当前按像素切片，但在 DOM 中为每个分组/表格顶部插入 data-break 标记元素。到达页尾时就近找最后一个标记。简单但精度有限。 | |

**User's choice:** A. DOM 元素坐标抢占 + 智能切点

### Q3: 不截断的粒度选哪个？

| Option | Description | Selected |
|--------|-------------|----------|
| 行级不截断 | 行是最小单位，行内多个字段不允许拆分。分组内部按行层面分页。简单零例外。（推荐：符合 A4 纸张表单习惯） | ✓ |
| 分组 + 行级 都不截断 | 分组也作为不可切单元。如分组整体放不下当前页就换新页。但如果分组本身超过一页高度，需降级为行级切点。 | |
| 仅表格行级 | 仅避免动态表格的行被截断（表内方案最直观），普通 row/group 允许跨页。最少改动，但视觉不优雅。 | |

**User's choice:** 行级不截断

### Q4: 动态表格数据行较多时的分页策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 表体 data row 可切 + 表头复出 | 表格整体放不下当前页就新开一页；表格本身若超页高，则允许在内部 data rows 之间切，表头在新页重复显示。（推荐：符合表格印刷习惯） | ✓ |
| 整表不可切 | 整个动态表格作为原子单元不可切。如表格超页就缩小或报错。不实际，不推荐。 | |
| 表体可切 + 表头不复出 | 可切，但不提供表头重复。实现最简单。 | |

**User's choice:** 表体 data row 可切 + 表头复出

### Q5: PDF 页眉页脚需要哪些元素（多页时显示）？

| Option | Description | Selected |
|--------|-------------|----------|
| 页眉：表单名称 | 页脑显示表单名称，多页时便于定位。当前已有页起头标题，多页时后面几页没有标题。 | ✓ |
| 页脚：页码 N/M | 页脚显示第N/共M页，多页需要打印时很有用 | ✓ |
| 提交时间 | 页眉右侧或页脚左侧显示提交时间，便于殉档 | ✓ |
| 不加页眉页脚 | PDF 无需页眉页脚，保持当前简洁 | |

**User's choice:** 页眉：表单名称, 页脚：页码 N/M, 提交时间

### Q6: 分页控制至此清晰，继续补充还是下一个？

| Option | Description | Selected |
|--------|-------------|----------|
| 下一个领域 | 进入下一个领域。剩余：中文字体处理、栅格保真策略 | ✓ |
| 补充分页细节 | 还有疑问或边界情况需明确 | |

**User's choice:** 下一个领域

---

## 中文字体处理

### Q7: 中文字体一致性策略选哪个？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 系统字体堆栈（不 self-host） | CSS 定义字体栈 font-family: 思源黑体,苹方,微软雅黑,sans-serif，用户系统有哪个用哪个。不 self-host。简单但不同电脑导出的 PDF 字体可能不同。（推荐：成本低） | ✓ |
| B. self-host Noto Sans SC（一致性优先） | 项目内置 思源黑体 Noto Sans SC WOFF2（~2-3MB）作为 Web Font，强制所有浏览器用同一字体。设计稿/导出 PDF 绝对一致。代价：首屏额外加载字体文件。 | |
| C. 按需加载 Web Font | 仅在打印/导出时显示性加载字体（lazy），不影响普通页面性能。实现略复杂。 | |

**User's choice:** A. 系统字体堆栈（不 self-host）

### Q8: 字体优先级顺序（第一位是什么）？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 苹方 → 雅黑 → 黑体 → 思源 | 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', 'Source Han Sans SC', sans-serif。Mac 苹方优先， Windows 微软雅黑。（推荐：系统相对常见） | ✓ |
| B. 雅黑 → 苹方 → 思源 | 'Microsoft YaHei', 'PingFang SC', 'Source Han Sans SC', sans-serif。Windows 优先（目标使用者主要 Windows） | |
| C. system-ui 总构 | 使用 system-ui 或直接 sans-serif，交给浏览器选择。最简但不可控。 | |

**User's choice:** A. 苹方 → 雅黑 → 黑体 → 思源

### Q9: 字体话题继续讨论还是下一个？

| Option | Description | Selected |
|--------|-------------|----------|
| 下一个领域 | 进入最后一个领域：栅格布局保真策略 | ✓ |
| 补充字体细节 | 补充字体/尺寸/行高等细节 | |

**User's choice:** 下一个领域

---

## 栅格布局保真策略

### Q10: PDF 中字段的视觉保真风格？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 无边框极简风（保持当前） | 字段无边框，仅依靠空白和字体粗细区分。像当前填写页一样干净。PDF 会轻一些、商务风。 | |
| B. 全字段表格边框（纸质风格） | 每个字段单元格下边框，字段标签左对齐，值紧跟或右对齐。像书面习惯的表格表单，对齐明显。（推荐：符合 PDF 保真语义—还原纸质表格） | ✓ |
| C. 值下划线（轻视觉标识） | 字段标签无边框，值下面加一条实线（似纸质表格的下划线填写区）。介于 AB 之间。 | |

**User's choice:** B. 全字段表格边框（纸质风格）

### Q11: 分组（如"教育经历"）在 PDF 中的视觉风格？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 标题条背景色 + 边框 | 标题条添加浅灰背景色（如 #f5f5f5），与内容区区分明显。边框 1-2px 灰线。（推荐：纸质表格同风） | ✓ |
| B. 标题粗体无背景 | 标题用粗体大号字，不背景色。下方空 8mm 隔离。清新不重语义弱。 | |
| C. 无样式 | 不做分组样式特别区分，仅提示标题文本，整体混混。不推荐。 | |

**User's choice:** A. 标题条背景色 + 边框

### Q12: PDF 中字段 label/value 的排版？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 标签在上、值在下（保持当前） | 字段内部 label 在上、value 在下。与填写页一致，栅格内里的字段能横向对齐。（推荐：与填写页预览同步） | ✓ |
| B. 标签在左、值在右 | 字段内部成两列：label \| value，像传统表格表单。与填写页外观不同但更像正式表单。 | |
| C. 按字段类型自适应 | 纯文本/日期型用右对齐（下划线齐齐），radio/checkbox/签名用上下排版。实现自适应但复杂。 | |

**User's choice:** A. 标签在上、值在下（保持当前）

### Q13: 手写签名在 PDF 中的尺寸？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 保持当前 80px + 边框 | 签名的 `<img>` max-height: 80px（当前打印模式），加 1px 灰边框。与其他字段视觉一致。（推荐） | ✓ |
| B. 放大到 120px | 签名区加大到 120px，更符合 A4 PDF 纸质正式感。因签名是重要认可元素。 | |
| C. 原尺寸 | 签名原始尺寸（canvas 导出的原本尺寸），不缩放。可能过大过小不可控。 | |

**User's choice:** A. 保持当前 80px + 边框

### Q14: 栅格保真策略至此清晰。下一步？

| Option | Description | Selected |
|--------|-------------|----------|
| 我准备好收尾了 | 进入标准结束流程（总结 + 写 CONTEXT.md） | ✓ |
| 补充栅格视觉细节 | 想谈边框颜色/粗细、字号尺寸、空白间距等设计细节 | |
| 回头改某个领域 | 重新检视前面某个领域的决策 | |

**User's choice:** 我准备好收尾了

---

## Claude's Discretion

- 分组边框/字段边框的具体粗细（1px 还是 1.5px）与颜色深浅（`#000` 还是 `#333`）的 ±10% 微调
- 智能切点算法实现细节：递归扫描 DOM、生成切点数组、二分查找 vs 线性查找
- html2canvas 的 `scale` 参数（当前单条 2、批量 1.5，可能上调到 3 换清晰度 vs 内存）
- 页眉页脚字号、颜色、左右内边距（按 A4 margin 15mm 视觉平衡调即可）
- 表头复出的 DOM 克隆注入策略：分片 canvas 上 drawImage 表头位图 vs 预处理 DOM 时复制 `<thead>`

## Deferred Ideas

- 矢量 PDF 路径（jspdf-autotable / jsPDF.text）：v2 重构项
- 自定义水印 / 公司 LOGO：v2 增强
- PDF 密码保护 / 打开限制：v2 增强
- 服务端 PDF 生成（Puppeteer）：REQUIREMENTS Out of Scope
- 多语言字体回退（日文/俄文/韩文）：未来扩展
- 打印专用黑白模式：不做额外黑白优化
- 批量导出流式生成（50+ 条）：v2 性能项
