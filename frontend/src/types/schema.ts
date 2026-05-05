export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature' | 'name';

// 动态表格列支持的字段类型（排除 textarea/signature）
export type DynamicTableColumnType = 'text' | 'radio' | 'checkbox' | 'date' | 'phone';

export interface SchemaField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  colSpan: number;
  placeholder?: string;
  options?: string[];
  remark?: string;
}

export interface SchemaRow {
  type: 'row';
  fields: SchemaField[];
}

export interface SchemaGroup {
  type: 'group';
  id: string;
  title: string;
  rows: SchemaRow[];
}

export interface SchemaDynamicTable {
  type: 'dynamic-table';
  id: string;
  label: string;
  colSpan: number;
  columns: Array<{ key: string; label: string; type: DynamicTableColumnType; width?: number; options?: string[] }>;
}

export type SchemaItem = SchemaRow | SchemaGroup | SchemaDynamicTable;

export interface SchemaV2 {
  version: 2;
  items: SchemaItem[];
}

export function flattenFields(schema: SchemaV2): SchemaField[] {
  const result: SchemaField[] = [];
  for (const item of schema.items) {
    if (item.type === 'row') {
      result.push(...item.fields);
    } else if (item.type === 'group') {
      for (const row of item.rows) {
        result.push(...row.fields);
      }
    }
    // skip dynamic-table
  }
  return result;
}

export function createEmptySchema(): SchemaV2 {
  return { version: 2, items: [] };
}
