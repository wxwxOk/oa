import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import { SchemaV2Body, validateFormDataRequiredFields } from '../schema.validation';

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

const requiredFieldsSchema = {
  version: 2,
  items: [
    {
      type: 'row',
      fields: [
        { id: 'text1', type: 'text', label: '文本', required: true, colSpan: 12 },
        { id: 'textarea1', type: 'textarea', label: '多行文本', required: true, colSpan: 12 },
        { id: 'date1', type: 'date', label: '日期', required: true, colSpan: 12 },
        { id: 'phone1', type: 'phone', label: '手机号', required: true, colSpan: 12 },
        { id: 'radio1', type: 'radio', label: '单选', required: true, colSpan: 12, options: ['A', 'B'] },
        { id: 'checkbox1', type: 'checkbox', label: '多选', required: true, colSpan: 12, options: ['A', 'B'] },
        { id: 'signature1', type: 'signature', label: '签名', required: true, colSpan: 12 },
      ],
    },
  ],
};

const validRequiredData = {
  text1: '文本',
  textarea1: '多行文本',
  date1: '2026-04-25',
  phone1: '13800138000',
  radio1: 'A',
  checkbox1: ['A'],
  signature1: 'data:image/png;base64,signature',
};

describe('validateFormDataRequiredFields', () => {
  it('required text textarea and date reject empty strings', () => {
    for (const fieldId of ['text1', 'textarea1', 'date1']) {
      expect(() =>
        validateFormDataRequiredFields(requiredFieldsSchema, {
          ...validRequiredData,
          [fieldId]: ' ',
        }),
      ).toThrow('必填');
    }
  });

  it('required phone rejects invalid number and accepts one plus ten digits', () => {
    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        phone1: '12345',
      }),
    ).toThrow('手机号');

    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        phone1: '13800138000',
      }),
    ).not.toThrow();
  });

  it('required radio rejects null and empty value', () => {
    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        radio1: null,
      }),
    ).toThrow('必填');

    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        radio1: '',
      }),
    ).toThrow('必填');
  });

  it('required checkbox rejects empty array', () => {
    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        checkbox1: [],
      }),
    ).toThrow('必填');
  });

  it('required signature rejects empty value', () => {
    expect(() =>
      validateFormDataRequiredFields(requiredFieldsSchema, {
        ...validRequiredData,
        signature1: '',
      }),
    ).toThrow('必填');
  });

  it('optional fields may be absent', () => {
    const optionalSchema = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'text1', type: 'text', label: '文本', required: false, colSpan: 12 },
            { id: 'phone1', type: 'phone', label: '手机号', required: false, colSpan: 12 },
          ],
        },
      ],
    };

    expect(() => validateFormDataRequiredFields(optionalSchema, {})).not.toThrow();
  });

  it('dynamic-table column required is not enforced because schema has no column required', () => {
    const dynamicTableSchema = {
      version: 2,
      items: [
        {
          type: 'dynamic-table',
          id: 'table1',
          label: '明细',
          colSpan: 12,
          columns: [
            { key: 'name', label: '姓名', type: 'text' },
            { key: 'phone', label: '手机号', type: 'phone' },
          ],
        },
      ],
    };

    expect(() =>
      validateFormDataRequiredFields(dynamicTableSchema, {
        table1: [{}],
      }),
    ).not.toThrow();
  });
});
