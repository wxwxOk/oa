import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import { SchemaV2Body } from '../schema.validation';

describe('SchemaV2Body validation', () => {
  it('accepts valid v2 schema with row items', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'text', label: 'Name', required: true, colSpan: 6 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
  });

  it('accepts empty items array', () => {
    const payload = { version: 2, items: [] };
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
  });

  it('accepts group type with title and rows', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'group',
          title: 'Education',
          rows: [
            {
              type: 'row',
              fields: [
                { id: 'f1', type: 'date', label: 'Start', required: true, colSpan: 6 },
              ],
            },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
  });

  it('accepts dynamic-table type with columns', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'dynamic-table',
          label: 'Work Experience',
          colSpan: 12,
          columns: [
            { key: 'company', label: 'Company', type: 'text' },
            { key: 'start', label: 'Start Date', type: 'date', width: 120 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
  });

  it('rejects colSpan outside 1-12 range', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'text', label: 'X', required: true, colSpan: 0 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(false);

    const payload2 = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'text', label: 'X', required: true, colSpan: 13 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload2)).toBe(false);
  });

  it('rejects missing required field in SchemaField', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'text', label: 'X', colSpan: 6 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(false);
  });

  it('rejects invalid field type', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'invalid', label: 'X', required: true, colSpan: 6 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(false);
  });

  it('rejects version other than 2', () => {
    const payload = { version: 1, items: [] };
    expect(Value.Check(SchemaV2Body, payload)).toBe(false);
  });
});
