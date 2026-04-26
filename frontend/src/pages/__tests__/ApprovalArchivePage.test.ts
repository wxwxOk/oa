import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../ApprovalArchivePage.vue'), 'utf8');

describe('ApprovalArchivePage contract', () => {
  it('pins the archive query focal point, filters, and table view', () => {
    expect(source).toContain('归档查询');
    expect(source).toContain('查询审批申请和公开收集记录的后续处理状态');
    expect(source).toContain('来源');
    expect(source).toContain('状态');
    expect(source).toContain('模板');
    expect(source).toContain('部门');
    expect(source).toContain('申请人/填写者');
    expect(source).toContain('开始日期');
    expect(source).toContain('结束日期');
    expect(source).toContain('标签/标记');
    expect(source).toContain('查询归档');
    expect(source).toContain('q-table');
    expect(source).toContain(':rows-per-page-options="[10, 20, 50]"');
  });

  it('defines the mobile filter sheet without mutating live filters until apply', () => {
    expect(source).toContain('filter_list');
    expect(source).toContain('筛选归档');
    expect(source).toContain('应用筛选');
    expect(source).toContain('重置筛选');
    expect(source).toContain('filterDraft');
    expect(source).toContain('applyMobileFilters');
  });

  it('pins Excel export and basic stats UI contracts', () => {
    expect(source).toContain('导出 Excel');
    expect(source).toContain('exportLoading');
    expect(source).toContain('当前筛选结果超过导出上限，请缩小筛选范围后重试。');
    expect(source).toContain('归档统计');
    expect(source).toContain('approval:archive:stats');
    expect(source).toContain('按模板统计');
    expect(source).toContain('按状态统计');
    expect(source).toContain('按部门统计');
    expect(source).toContain('按月份统计');
  });

  it('keeps archive mobile controls touch-safe and readable', () => {
    expect(source).toContain('mobile-filter-trigger');
    expect(source).toContain('archive-card');
    expect(source).toContain('min-height: 44px');
    expect(source).toContain('overflow-wrap: anywhere');
  });
});
