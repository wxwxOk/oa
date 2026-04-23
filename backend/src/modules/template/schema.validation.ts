import { t } from 'elysia';

const FieldType = t.Union([
  t.Literal('text'),
  t.Literal('textarea'),
  t.Literal('radio'),
  t.Literal('checkbox'),
  t.Literal('date'),
  t.Literal('phone'),
  t.Literal('signature'),
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
  id: t.String(),
  title: t.String(),
  rows: t.Array(SchemaRow),
});

const SchemaDynamicTable = t.Object({
  type: t.Literal('dynamic-table'),
  id: t.String(),
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
