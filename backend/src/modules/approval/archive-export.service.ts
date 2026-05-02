import ExcelJS from 'exceljs';

import { BizError } from '../../utils/errors';
import {
  getArchiveDetail as defaultGetArchiveDetail,
  listArchiveRecords as defaultListArchiveRecords,
  type ArchiveActor,
  type ArchiveDetail,
  type ArchiveListFilters,
  type ArchiveListItem,
} from './archive.service';

export const MAX_ARCHIVE_EXPORT_ROWS = 2000;

const EXPORT_TOO_LARGE_MESSAGE = '当前筛选结果超过导出上限，请缩小筛选范围后重试。';
const EXPORT_PAGE_SIZE = 100;
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

type ArchiveExportRow = Partial<ArchiveDetail> &
  Partial<ArchiveListItem> & {
    processingSchema?: unknown;
  };

type ArchiveExportDependencies = {
  listArchiveRecords?: typeof defaultListArchiveRecords;
  getArchiveDetail?: typeof defaultGetArchiveDetail;
};

type FieldColumn = {
  key: string;
  header: string;
  source: 'processing' | 'form';
};

const fallbackFieldLabels: Record<string, string> = {
  followUpResult: '跟进结果',
  reason: '申请事由',
  phone: '联系电话',
  remark: '备注',
  owner: '负责人',
  tabbed: '制表符字段',
  carriage: '回车字段',
};

export function sanitizeExcelCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!FORMULA_PREFIX_PATTERN.test(value)) return value;
  return `'${value}`;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toDisplayValue(value: unknown): unknown {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => String(item ?? '')).join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function addFieldLabel(labels: Map<string, string>, field: unknown): void {
  const fieldRecord = toRecord(field);
  const id = typeof fieldRecord.id === 'string' ? fieldRecord.id.trim() : '';
  if (!id || labels.has(id)) return;
  const label = typeof fieldRecord.label === 'string' && fieldRecord.label.trim() ? fieldRecord.label.trim() : id;
  labels.set(id, label);
}

function readSchemaFieldLabels(schema: unknown): Map<string, string> {
  const labels = new Map<string, string>();
  const schemaRecord = toRecord(schema);
  const items = Array.isArray(schemaRecord.items) ? schemaRecord.items : [];

  for (const item of items) {
    const itemRecord = toRecord(item);
    if (itemRecord.type === 'row' && Array.isArray(itemRecord.fields)) {
      itemRecord.fields.forEach((field) => addFieldLabel(labels, field));
      continue;
    }
    if (itemRecord.type === 'group' && Array.isArray(itemRecord.rows)) {
      for (const row of itemRecord.rows) {
        const rowRecord = toRecord(row);
        if (Array.isArray(rowRecord.fields)) {
          rowRecord.fields.forEach((field) => addFieldLabel(labels, field));
        }
      }
    }
  }

  return labels;
}

function readProcessingFieldLabels(schema: unknown): Map<string, string> {
  const labels = new Map<string, string>();
  if (!Array.isArray(schema)) return labels;
  schema.forEach((field) => addFieldLabel(labels, field));
  return labels;
}

function collectColumns(rows: ArchiveExportRow[]): FieldColumn[] {
  const processingColumns = new Map<string, string>();
  const formColumns = new Map<string, string>();

  for (const row of rows) {
    const processingData = toRecord(row.processingData);
    const effectiveData = toRecord(row.effectiveData);
    const processingLabels = readProcessingFieldLabels(row.processingSchema);
    const formLabels = readSchemaFieldLabels(row.schemaSnapshot);

    for (const key of Object.keys(processingData)) {
      if (!processingColumns.has(key)) {
        processingColumns.set(key, processingLabels.get(key) ?? fallbackFieldLabels[key] ?? key);
      }
    }

    for (const key of Object.keys(effectiveData)) {
      if (!formColumns.has(key)) {
        formColumns.set(key, formLabels.get(key) ?? fallbackFieldLabels[key] ?? key);
      }
    }
  }

  return [
    ...Array.from(processingColumns, ([key, header]) => ({ key, header, source: 'processing' as const })),
    ...Array.from(formColumns, ([key, header]) => ({ key, header, source: 'form' as const })),
  ];
}

function formatSourceType(sourceType: unknown): string {
  if (sourceType === 'approval') return '审批申请';
  if (sourceType === 'collection') return '公开收集';
  return '';
}

function hasFullMetadata(rows: ArchiveExportRow[]): boolean {
  return rows.some((row) => row.archiveNo !== undefined || row.templateId !== undefined || row.createdAt !== undefined);
}

function buildBaseColumns(rows: ArchiveExportRow[]) {
  if (hasFullMetadata(rows)) {
    return [
      { header: '编号', key: 'archiveNo', width: 24 },
      { header: '来源', key: 'sourceType', width: 14 },
      { header: '模板', key: 'templateName', width: 24 },
      { header: '申请人/填写者', key: 'personName', width: 18 },
      { header: '部门', key: 'departmentName', width: 18 },
      { header: '状态', key: 'status', width: 14 },
      { header: '标签/标记', key: 'tags', width: 24 },
      { header: '更新时间', key: 'updatedAt', width: 24 },
    ];
  }

  return [
    { header: '来源', key: 'sourceType', width: 14 },
    { header: '模板', key: 'templateName', width: 24 },
    { header: '部门', key: 'departmentName', width: 18 },
    { header: '人员', key: 'personName', width: 18 },
    { header: '状态', key: 'status', width: 14 },
    { header: '标签', key: 'tags', width: 24 },
  ];
}

function buildBaseValues(row: ArchiveExportRow, fullMetadata: boolean): Record<string, unknown> {
  const common = {
    sourceType: sanitizeExcelCell(formatSourceType(row.sourceType)),
    templateName: sanitizeExcelCell(toDisplayValue(row.templateName)),
    departmentName: sanitizeExcelCell(toDisplayValue(row.departmentName)),
    personName: sanitizeExcelCell(toDisplayValue(row.personName)),
    status: sanitizeExcelCell(toDisplayValue(row.status)),
    tags: sanitizeExcelCell(toDisplayValue(row.tags ?? [])),
  };

  if (!fullMetadata) return common;

  return {
    archiveNo: sanitizeExcelCell(toDisplayValue(row.archiveNo)),
    ...common,
    updatedAt: sanitizeExcelCell(toDisplayValue(row.updatedAt)),
  };
}

export async function buildArchiveWorkbook(input: { rows: ArchiveExportRow[] }): Promise<ExcelJS.Workbook> {
  const rows = input.rows;
  if (rows.length > MAX_ARCHIVE_EXPORT_ROWS) {
    throw new BizError(EXPORT_TOO_LARGE_MESSAGE, 400, 'ARCHIVE_EXPORT_TOO_LARGE');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'oa';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('归档数据', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const fullMetadata = hasFullMetadata(rows);
  const fieldColumns = collectColumns(rows);
  const baseColumns = buildBaseColumns(rows);
  worksheet.columns = [
    ...baseColumns,
    ...fieldColumns.map((column) => ({ header: column.header, key: `${column.source}:${column.key}`, width: 22 })),
  ];

  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const processingData = toRecord(row.processingData);
    const effectiveData = toRecord(row.effectiveData);
    const values: Record<string, unknown> = buildBaseValues(row, fullMetadata);

    for (const column of fieldColumns) {
      const sourceData = column.source === 'processing' ? processingData : effectiveData;
      values[`${column.source}:${column.key}`] = sanitizeExcelCell(toDisplayValue(sourceData[column.key]));
    }

    worksheet.addRow(values);
  }

  return workbook;
}

function needsArchiveDetail(row: ArchiveExportRow): row is ArchiveListItem {
  return row.effectiveData === undefined || row.processingData === undefined;
}

export async function exportArchiveExcel(
  actor: ArchiveActor,
  filters: ArchiveListFilters = {},
  dependencies: ArchiveExportDependencies = {},
): Promise<ExcelJS.Workbook> {
  const listArchiveRecords = dependencies.listArchiveRecords ?? defaultListArchiveRecords;
  const getArchiveDetail = dependencies.getArchiveDetail ?? defaultGetArchiveDetail;
  const firstPage = await listArchiveRecords(actor, { ...filters, page: 1, size: EXPORT_PAGE_SIZE });

  if (firstPage.total > MAX_ARCHIVE_EXPORT_ROWS) {
    throw new BizError(EXPORT_TOO_LARGE_MESSAGE, 400, 'ARCHIVE_EXPORT_TOO_LARGE');
  }

  const listRows = [...firstPage.rows];
  for (let page = 2; listRows.length < firstPage.total; page += 1) {
    const nextPage = await listArchiveRecords(actor, { ...filters, page, size: EXPORT_PAGE_SIZE });
    if (nextPage.rows.length === 0) break;
    listRows.push(...nextPage.rows);
  }

  const rows: ArchiveExportRow[] = [];
  for (const row of listRows as ArchiveExportRow[]) {
    if (needsArchiveDetail(row)) {
      rows.push(await getArchiveDetail(actor, row.sourceType, row.sourceId));
    } else {
      rows.push(row);
    }
  }

  return buildArchiveWorkbook({ rows });
}
