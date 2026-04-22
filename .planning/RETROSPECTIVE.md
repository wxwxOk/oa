# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — 模板管理优化

**Shipped:** 2026-04-22
**Phases:** 5 | **Plans:** 16

### What Was Built
- v2 schema 类型体系 + 统一 GridFormRenderer 三模式渲染引擎
- 12 列栅格设计器画布（拖拽 + 跨列调整 + WYSIWYG 预览）
- 分组区块 + 动态行表格（设计器/填写/打印三模式）
- PDF 保真输出（智能分页 + 页眉页脚 + CJK 字体栈）
- 响应式填写页（PC 栅格还原 + 移动端单列 + 卡片布局）

### What Worked
- Phase 拆分粒度合理：每个 Phase 聚焦一个子系统，依赖链清晰
- TDD 先行（Phase 13 分页算法）：12 个测试用例先写后实现，零返工
- table HTML 绕过 CSS Grid 的 html2canvas 兼容问题，一次成功
- Row-based schema 设计简洁，序列化/反序列化无额外转换

### What Was Inefficient
- Phase 14-02 执行后未自动生成 SUMMARY.md，里程碑完成时需手动补全
- REQUIREMENTS.md traceability 表未随 Phase 完成同步更新（4 项滞后）
- Phase 12 的 4 个 plan 可以合并为 3 个（12-01 和 12-02 耦合度高）

### Patterns Established
- `@media (max-width: 1023px)` 作为移动端断点，对齐 Quasar `$q.screen.gt.sm`
- `data-break` 属性约定（row/group/table/table-row）用于 PDF 分页引擎
- `v-if isMobile` 模板分支模式用于移动端完全不同的 UI 结构
- PrintableForm table HTML 模式用于 PDF 输出（绕过 CSS Grid 兼容问题）

### Key Lessons
1. Schema 设计决定一切：Row-based 层级结构比 x/y/w/h 坐标简单一个数量级
2. PDF 输出不要依赖 CSS Grid — html2canvas 支持有限，table HTML 是更可靠的路径
3. 移动端卡片布局（QExpansionItem）比响应式表格体验好得多

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 25 | 基础 GSD 流程建立 |
| v1.1 | 3 | 13 | 1 天交付，高速迭代 |
| v1.2 | 5 | 16 | TDD + UI-SPEC 设计合约引入 |

### Top Lessons (Verified Across Milestones)

1. Phase 粒度控制在 2-4 plans 最高效（v1.1/v1.2 验证）
2. 先写类型定义再写实现，减少返工（v1.1 JSONB schema + v1.2 SchemaV2 验证）
3. Quasar 组件库覆盖 80% UI 需求，自定义 CSS 控制在最小范围
