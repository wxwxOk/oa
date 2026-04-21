import type { DynamicTableColumnType } from 'src/types/schema';

export interface TableColumn {
  key: string;
  label: string;
  type: DynamicTableColumnType;
  width?: number;
  options?: string[];
}

/**
 * 创建空行：每列按类型初始化默认值
 */
export function createEmptyRow(columns: TableColumn[]): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of columns) {
    row[col.key] = col.type === 'checkbox' ? [] : '';
  }
  return row;
}

/**
 * 格式化单元格值用于打印显示
 */
export function formatCell(value: any, type: DynamicTableColumnType): string {
  if (value == null || value === '') return '—';
  if (type === 'checkbox' && Array.isArray(value)) {
    return value.length ? value.join('、') : '—';
  }
  return String(value);
}

/**
 * 计算列宽百分比
 */
export function calcColWidth(col: TableColumn, columns: TableColumn[]): string {
  const totalRatio = columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
  const ratio = col.width ?? 1;
  return (ratio / totalRatio * 100).toFixed(2) + '%';
}
