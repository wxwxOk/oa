import { describe, it, expect } from 'vitest';
import {
  createEmptyRow,
  formatCell,
  calcColWidth,
  type TableColumn,
} from '../dynamicTableUtils';

describe('createEmptyRow', () => {
  it('为每列创建默认值', () => {
    const columns: TableColumn[] = [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'phone', label: '电话', type: 'phone' },
      { key: 'date', label: '日期', type: 'date' },
    ];
    const row = createEmptyRow(columns);
    expect(row).toEqual({ name: '', phone: '', date: '' });
  });

  it('checkbox 列默认值为空数组', () => {
    const columns: TableColumn[] = [
      { key: 'tags', label: '标签', type: 'checkbox', options: ['A', 'B'] },
    ];
    const row = createEmptyRow(columns);
    expect(row.tags).toEqual([]);
    expect(Array.isArray(row.tags)).toBe(true);
  });

  it('radio 列默认值为空字符串', () => {
    const columns: TableColumn[] = [
      { key: 'level', label: '等级', type: 'radio', options: ['高', '中', '低'] },
    ];
    const row = createEmptyRow(columns);
    expect(row.level).toBe('');
  });

  it('空列数组返回空对象', () => {
    expect(createEmptyRow([])).toEqual({});
  });

  it('每次调用返回独立对象', () => {
    const columns: TableColumn[] = [
      { key: 'a', label: 'A', type: 'text' },
    ];
    const row1 = createEmptyRow(columns);
    const row2 = createEmptyRow(columns);
    expect(row1).not.toBe(row2);
    row1.a = 'changed';
    expect(row2.a).toBe('');
  });
});

describe('formatCell', () => {
  it('null 值返回破折号', () => {
    expect(formatCell(null, 'text')).toBe('—');
  });

  it('undefined 值返回破折号', () => {
    expect(formatCell(undefined, 'text')).toBe('—');
  });

  it('空字符串返回破折号', () => {
    expect(formatCell('', 'text')).toBe('—');
  });

  it('文本值原样返回', () => {
    expect(formatCell('张三', 'text')).toBe('张三');
  });

  it('数字值转为字符串', () => {
    expect(formatCell(123, 'text')).toBe('123');
  });

  it('checkbox 空数组返回破折号', () => {
    expect(formatCell([], 'checkbox')).toBe('—');
  });

  it('checkbox 数组用顿号连接', () => {
    expect(formatCell(['A', 'B', 'C'], 'checkbox')).toBe('A、B、C');
  });

  it('日期值原样返回', () => {
    expect(formatCell('2025-01-15', 'date')).toBe('2025-01-15');
  });

  it('手机号值原样返回', () => {
    expect(formatCell('13800138000', 'phone')).toBe('13800138000');
  });
});

describe('calcColWidth', () => {
  it('等宽列均分百分比', () => {
    const columns: TableColumn[] = [
      { key: 'a', label: 'A', type: 'text' },
      { key: 'b', label: 'B', type: 'text' },
    ];
    expect(calcColWidth(columns[0], columns)).toBe('50.00%');
    expect(calcColWidth(columns[1], columns)).toBe('50.00%');
  });

  it('自定义宽度比例正确计算', () => {
    const columns: TableColumn[] = [
      { key: 'a', label: 'A', type: 'text', width: 2 },
      { key: 'b', label: 'B', type: 'text', width: 1 },
    ];
    expect(calcColWidth(columns[0], columns)).toBe('66.67%');
    expect(calcColWidth(columns[1], columns)).toBe('33.33%');
  });

  it('混合默认和自定义宽度', () => {
    const columns: TableColumn[] = [
      { key: 'a', label: 'A', type: 'text', width: 3 },
      { key: 'b', label: 'B', type: 'text' }, // 默认 width=1
    ];
    // total = 3 + 1 = 4
    expect(calcColWidth(columns[0], columns)).toBe('75.00%');
    expect(calcColWidth(columns[1], columns)).toBe('25.00%');
  });

  it('单列占满 100%', () => {
    const columns: TableColumn[] = [
      { key: 'a', label: 'A', type: 'text' },
    ];
    expect(calcColWidth(columns[0], columns)).toBe('100.00%');
  });
});
