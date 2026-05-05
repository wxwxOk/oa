import { t } from 'elysia';
import { BizError } from '../../utils/errors';

const FieldType = t.Union([
  t.Literal('text'),
  t.Literal('textarea'),
  t.Literal('radio'),
  t.Literal('checkbox'),
  t.Literal('date'),
  t.Literal('phone'),
  t.Literal('signature'),
  t.Literal('name'),
]);

const SchemaField = t.Object({
  id: t.String(),
  type: FieldType,
  label: t.String(),
  required: t.Boolean(),
  colSpan: t.Integer({ minimum: 1, maximum: 12 }),
  placeholder: t.Optional(t.String()),
  options: t.Optional(t.Array(t.String())),
  remark: t.Optional(t.String()),
});

const SchemaRow = t.Object({
  type: t.Literal('row'),
  fields: t.Array(SchemaField, { minItems: 1 }),
});

// 动态表格列支持的字段类型（排除 textarea/signature）
const DynamicTableColumnType = t.Union([
  t.Literal('text'),
  t.Literal('radio'),
  t.Literal('checkbox'),
  t.Literal('date'),
  t.Literal('phone'),
]);

const SchemaGroup = t.Object({
  type: t.Literal('group'),
  id: t.Optional(t.String()),
  title: t.String(),
  rows: t.Array(SchemaRow),
});

const SchemaDynamicTable = t.Object({
  type: t.Literal('dynamic-table'),
  id: t.Optional(t.String()),
  label: t.String(),
  colSpan: t.Integer({ minimum: 1, maximum: 12 }),
  columns: t.Array(
    t.Object({
      key: t.String(),
      label: t.String(),
      type: DynamicTableColumnType,
      width: t.Optional(t.Integer({ minimum: 1 })),
      options: t.Optional(t.Array(t.String())),
    }),
  ),
});

const SchemaItem = t.Union([SchemaRow, SchemaGroup, SchemaDynamicTable]);

export const SchemaV2Body = t.Object({
  version: t.Literal(2),
  items: t.Array(SchemaItem),
});

type FormFieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature' | 'name';

type SchemaFieldLike = {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
};

type SchemaRowLike = {
  type: 'row';
  fields?: unknown;
};

type SchemaGroupLike = {
  type: 'group';
  rows?: unknown;
};

type SchemaItemLike = SchemaRowLike | SchemaGroupLike | { type: 'dynamic-table' };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSchemaField(value: unknown): value is SchemaFieldLike {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' && typeof value.type === 'string' && typeof value.label === 'string';
}

function flattenRequiredValidationFields(schema: unknown): SchemaFieldLike[] {
  if (!isObject(schema) || !Array.isArray(schema.items)) return [];

  const fields: SchemaFieldLike[] = [];
  for (const item of schema.items as SchemaItemLike[]) {
    if (!isObject(item)) continue;

    if (item.type === 'row' && Array.isArray(item.fields)) {
      fields.push(...item.fields.filter(isSchemaField));
      continue;
    }

    if (item.type === 'group' && Array.isArray(item.rows)) {
      for (const row of item.rows) {
        if (isObject(row) && row.type === 'row' && Array.isArray(row.fields)) {
          fields.push(...row.fields.filter(isSchemaField));
        }
      }
      continue;
    }

    // dynamic-table column-level required is intentionally deferred until the schema can express it.
    if (item.type === 'dynamic-table') continue;
  }

  return fields;
}

function assertRequiredField(field: SchemaFieldLike, value: unknown): void {
  const fail = (message: string) => {
    throw new BizError(`${field.label}: ${message}`, 400, 'FORM_REQUIRED_FIELD_MISSING');
  };

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'name') {
    if (typeof value !== 'string' || value.trim() === '') fail('此项为必填');
    return;
  }

  if (field.type === 'date') {
    if (value == null || (typeof value === 'string' && value.trim() === '')) fail('请选择日期，此项为必填');
    return;
  }

  if (field.type === 'phone') {
    if (typeof value !== 'string' || !/^1\d{10}$/.test(value)) fail('请输入有效手机号');
    return;
  }

  if (field.type === 'radio') {
    if (
      value == null ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
    ) {
      fail('请选择一项，此项为必填');
    }
    return;
  }

  if (field.type === 'checkbox') {
    if (!Array.isArray(value) || value.length === 0) fail('请至少选择一项，此项为必填');
    return;
  }

  if (field.type === 'signature') {
    if (typeof value !== 'string' || value.trim() === '') fail('请签名，此项为必填');
  }
}

export function validateFormDataRequiredFields(schema: unknown, data: Record<string, unknown>): void {
  const formData = isObject(data) ? data : {};
  const fields = flattenRequiredValidationFields(schema);

  for (const field of fields) {
    if (field.required === true) {
      assertRequiredField(field, formData[field.id]);
    }
  }
}
