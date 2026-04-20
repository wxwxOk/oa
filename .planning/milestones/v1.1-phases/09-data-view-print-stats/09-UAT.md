---
status: complete
phase: 09-data-view-print-stats
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md
started: 2026-04-20T14:30:00Z
updated: 2026-04-20T15:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start the application from scratch (docker-compose up). Server boots without errors, migrations complete, and a primary query (health check or homepage load) returns live data.
result: pass

### 2. 模板列表页"查看数据"入口
expected: 在模板列表页（/templates），每行模板操作区域可见一个"查看数据"图标按钮（visibility 图标）。仅拥有 form:submission:list 权限的用户可见该按钮。
result: pass

### 3. 提交数据列表页
expected: 点击"查看数据"按钮后跳转到 /templates/:id/submissions 页面。页面显示 QTable 表格，包含序号、填写者姓名、手机号、提交时间、分享人、操作列。支持服务端分页。
result: pass

### 4. 列表筛选功能
expected: 列表页顶部有筛选栏，支持按填写者姓名、手机号、日期范围、分享人进行筛选。选择筛选条件后表格数据实时更新。
result: pass

### 5. 查看提交详情（侧边抽屉）
expected: 点击列表中某条记录的"查看"操作，右侧弹出 QDrawer 抽屉（桌面端 480px 宽，移动端全屏）。抽屉内以表格形式展示所有字段名和字段值，签名图片在底部展示。
result: pass

### 6. 版本不一致提示
expected: 如果提交数据的 schemaVersion 与当前模板版本不一致，详情抽屉顶部显示 QBanner 警告提示，字段仍以 key-value 形式展示。
result: skipped
reason: 当前无版本不一致的测试数据

### 7. 浏览器打印
expected: 详情抽屉内有"打印"按钮，点击后触发浏览器打印对话框。打印预览中仅显示详情内容（表头模板名称+提交时间、字段表格、签名图片），其他 UI 元素被隐藏。
result: pass (re-tested after fix)

### 8. 单条 PDF 导出
expected: 生成 PDF 文件并自动下载。文件名格式为"{模板名称}_{提交时间}.pdf"，内容与打印排版一致。
result: pass

### 9. 批量 PDF 导出
expected: 列表页表格有 checkbox 列，勾选多条记录后顶部出现"导出 PDF"按钮。点击后显示进度对话框，逐条渲染并合并为一个 PDF 下载。上限 50 条。
result: pass (re-tested after fix)

### 10. 统计面板展示
expected: Dashboard 页面新增"表单统计"区域（需 form:stats:view 权限）。显示员工统计表格（员工姓名、分享次数、收集数量）和柱状图（双柱对比分享/收集）。
result: pass

### 11. 统计时间筛选
expected: 统计面板有时间筛选：快捷按钮（本周/本月）+ 自定义日期范围选择器。切换时间范围后数据和图表实时更新。
result: pass

### 12. 权限控制
expected: 无 form:submission:list 权限的用户看不到"查看数据"按钮且无法访问提交列表页。无 form:stats:view 权限的用户看不到统计面板区域。
result: pass

## Summary

total: 12
passed: 11
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[all resolved]

## Fixes Applied

1. print.css + handlePrint: 改用 JS 克隆方案，打印前将 #print-area 克隆到 body 层级并隐藏其他元素，打印后恢复
2. handleBatchExport: 导出前设置 drawerOpen=true 并增加 100ms 渲染等待
3. SubmissionDetail.vue: 添加 parseSchema() 安全解析 schema（处理字符串/数组），fallback 分支也用 schema 做 label 映射
