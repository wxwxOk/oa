import { describe, it, expect } from 'vitest';
import {
  flattenFields,
  createEmptySchema,
  type SchemaV2,
  type SchemaField,
  type SchemaRow,
  type SchemaGroup,
  type SchemaDynamicTable,
  type DynamicTableColumnType,
} from '../schema';

describe('createEmptySchema', () => {
  it('returns version 2 with empty items', () => {
    const schema = createEmptySchema();
    expect(schema).toEqual({ version: 2, items: [] });
  });
});

describe('flattenFields', () => {
  it('returns empty array for empty items', () => {
    const schema: SchemaV2 = { version: 2, items: [] };
    expect(flattenFields(schema)).toEqual([]);
  });

  it('extracts fields from rows', () => {
    const field: SchemaField = {
      id: 'f1',
      type: 'text',
      label: 'Name',
      required: true,
      colSpan: 6,
    };
    const schema: SchemaV2 = {
      version: 2,
      items: [{ type: 'row', fields: [field] } as SchemaRow],
    };
    expect(flattenFields(schema)).toEqual([field]);
  });

  it('extracts fields from groups (nested rows)', () => {
    const f1: SchemaField = { id: 'f1', type: 'text', label: 'A', required: true, colSpan: 12 };
    const f2: SchemaField = { id: 'f2', type: 'date', label: 'B', required: false, colSpan: 6 };
    const group: SchemaGroup = {
      type: 'group',
      id: 'g1',
      title: 'Section',
      rows: [
        { type: 'row', fields: [f1] },
        { type: 'row', fields: [f2] },
      ],
    };
    const schema: SchemaV2 = { version: 2, items: [group] };
    expect(flattenFields(schema)).toEqual([f1, f2]);
  });

  it('skips dynamic-table items', () => {
    const dt: SchemaDynamicTable = {
      type: 'dynamic-table',
      id: 'dt1',
      label: 'Table',
      colSpan: 12,
      columns: [{ key: 'c1', label: 'Col', type: 'text' }],
    };
    const field: SchemaField = { id: 'f1', type: 'text', label: 'X', required: true, colSpan: 12 };
    const schema: SchemaV2 = {
      version: 2,
      items: [dt, { type: 'row', fields: [field] }],
    };
    expect(flattenFields(schema)).toEqual([field]);
  });

  it('handles mixed items (row + group + dynamic-table)', () => {
    const f1: SchemaField = { id: 'f1', type: 'text', label: 'A', required: true, colSpan: 12 };
    const f2: SchemaField = { id: 'f2', type: 'phone', label: 'B', required: false, colSpan: 6 };
    const f3: SchemaField = { id: 'f3', type: 'date', label: 'C', required: true, colSpan: 4 };
    const schema: SchemaV2 = {
      version: 2,
      items: [
        { type: 'row', fields: [f1] },
        { type: 'group', id: 'g2', title: 'G', rows: [{ type: 'row', fields: [f2, f3] }] },
        { type: 'dynamic-table', id: 'dt2', label: 'T', colSpan: 12, columns: [] },
      ],
    };
    expect(flattenFields(schema)).toEqual([f1, f2, f3]);
  });

  it('SchemaField colSpan defaults to 12 conceptually', () => {
    const field: SchemaField = { id: 'f1', type: 'text', label: 'X', required: true, colSpan: 12 };
    expect(field.colSpan).toBe(12);
  });
});

describe('SchemaGroup id field', () => {
  it('SchemaGroup has id field', () => {
    const group: SchemaGroup = {
      type: 'group',
      id: 'g-test',
      title: '测试分组',
      rows: [],
    };
    expect(group.id).toBe('g-test');
    expect(group.type).toBe('group');
  });
});

describe('SchemaDynamicTable id field', () => {
  it('SchemaDynamicTable has id field', () => {
    const dt: SchemaDynamicTable = {
      type: 'dynamic-table',
      id: 'dt-test',
      label: '测试表格',
      colSpan: 12,
      columns: [{ key: 'c1', label: '列1', type: 'text' }],
    };
    expect(dt.id).toBe('dt-test');
    expect(dt.type).toBe('dynamic-table');
  });

  it('SchemaDynamicTable columns use DynamicTableColumnType', () => {
    const validTypes: DynamicTableColumnType[] = ['text', 'radio', 'checkbox', 'date', 'phone'];
    const dt: SchemaDynamicTable = {
      type: 'dynamic-table',
      id: 'dt-col',
      label: '表格',
      colSpan: 12,
      columns: validTypes.map((t, i) => ({ key: `c${i}`, label: `Col ${i}`, type: t })),
    };
    expect(dt.columns).toHaveLength(5);
    expect(dt.columns.map(c => c.type)).toEqual(validTypes);
  });

  it('SchemaDynamicTable columns support options', () => {
    const dt: SchemaDynamicTable = {
      type: 'dynamic-table',
      id: 'dt-opts',
      label: '表格',
      colSpan: 12,
      columns: [{ key: 'c1', label: '选择', type: 'radio', options: ['A', 'B', 'C'] }],
    };
    expect(dt.columns[0].options).toEqual(['A', 'B', 'C']);
  });
});
