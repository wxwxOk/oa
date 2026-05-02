import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../VisitStatsPanel.vue'), 'utf8');

describe('VisitStatsPanel contract', () => {
  it('pins stats panel copy, states, dimensions and accessibility hooks', () => {
    for (const expected of [
      '到访统计',
      'dateFrom',
      'dateTo',
      'fetchStats',
      'statsLoading',
      '到访总数',
      '意向数量',
      '签约类数量',
      '意向率',
      '签约转化率',
      '按状态文本关键词估算',
      '渠道商',
      '咨询师',
      '接待人',
      '接待状态',
      '咨询后状态',
      '状态类别',
      '试听课后状态',
      'role="img"',
      'aria-label',
      'q-skeleton',
      '统计数据加载失败',
      '暂无统计数据',
      'maximized',
      'isMobile',
    ]) {
      expect(source).toContain(expected);
    }
  });

  it('uses existing chart dependencies and avoids out-of-scope actions', () => {
    expect(source).toContain('ChartJS.register');
    expect(source).toContain("from 'vue-chartjs'");
    expect(source).toContain('Bar');

    for (const forbidden of ['导出 Excel', '/visits/export', 'skipDuplicates', 'upsert', '自动合并', '字典', 'download']) {
      expect(source).not.toContain(forbidden);
    }
  });
});
