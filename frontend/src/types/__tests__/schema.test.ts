import { describe, it, expect } from 'vitest';
import {
  flattenFields,
  createEmptySchema,
  type SchemaV2,
  type SchemaField,
  type SchemaRow,
  type SchemaGroup,
  type SchemaDynamicTable,
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
        { type: 'group', title: 'G', rows: [{ type: 'row', fields: [f2, f3] }] },
        { type: 'dynamic-table', label: 'T', colSpan: 12, columns: [] },
      ],
    };
    expect(flattenFields(schema)).toEqual([f1, f2, f3]);
  });

  it('SchemaField colSpan defaults to 12 conceptually', () => {
    const field: SchemaField = { id: 'f1', type: 'text', label: 'X', required: true, colSpan: 12 };
    expect(field.colSpan).toBe(12);
  });
});
