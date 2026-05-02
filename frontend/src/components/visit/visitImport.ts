import {
  VISIT_IMPORT_HEADERS,
  type VisitImportCell,
  type VisitImportDuplicateWarning,
  type VisitImportPreview,
  type VisitImportRowError,
  type VisitImportValidRow,
  type VisitWritePayload,
} from 'src/types/visit';

const COLUMN_FIELDS: Array<keyof VisitWritePayload> = [
  'name',
  'age',
  'education',
  'gender',
  'channelPartner',
  'consultant',
  'receptionStatus',
  'receptionist',
  'receptionDate',
  'consultationStatus',
  'statusCategory',
  'statusDescription',
  'trialStatus',
  'solution',
  'trialDate',
];

const DATE_FIELDS = new Map<keyof VisitWritePayload, string>([
  ['receptionDate', '接待日期'],
  ['trialDate', '试听课时间'],
]);
const REQUIRED_NAME_LABEL = '姓名';

export function validateVisitImportHeaders(actualHeaders: unknown[]) {
  const actual = VISIT_IMPORT_HEADERS.map((_, index) => normalizeHeader(actualHeaders[index]));
  const expectedHeaders = [...VISIT_IMPORT_HEADERS];
  const headerErrors = expectedHeaders.flatMap((expected, index) => {
    const received = actual[index] ?? '';
    return received === expected ? [] : [`第 ${index + 1} 列期望「${expected}」，实际「${received || '空'}」`];
  });

  return {
    headerValid: headerErrors.length === 0,
    expectedHeaders,
    actualHeaders: actual,
    headerErrors,
  };
}

export function parseVisitImportRows(rows: unknown[][], fileName?: string): VisitImportPreview {
  const headerResult = validateVisitImportHeaders(rows[1] ?? []);
  const preview: VisitImportPreview = {
    fileName,
    ...headerResult,
    validRows: [],
    invalidRows: [],
    duplicateWarnings: [],
  };

  if (!preview.headerValid) return preview;

  for (let index = 2; index < rows.length; index += 1) {
    const values = toImportCells(rows[index] ?? []);
    if (values.every(isBlankCell)) continue;

    const rowNumber = index + 1;
    const errors: VisitImportRowError[] = [];
    const payload: VisitWritePayload = { name: '' };

    COLUMN_FIELDS.forEach((field, columnIndex) => {
      const label = VISIT_IMPORT_HEADERS[columnIndex];
      const value = values[columnIndex];

      if (field === 'name') {
        payload.name = normalizeText(value);
        if (!payload.name) errors.push({ rowNumber, field: REQUIRED_NAME_LABEL, message: '不能为空' });
        return;
      }

      if (field === 'age') {
        const age = normalizeAge(value);
        if (age.valid) payload.age = age.value;
        else errors.push({ rowNumber, field: label, message: '必须是整数' });
        return;
      }

      if (DATE_FIELDS.has(field)) {
        const date = normalizeExcelDate(value);
        if (!isBlankCell(value) && !date) errors.push({ rowNumber, field: DATE_FIELDS.get(field) ?? label, message: '必须是有效日期' });
        setDateField(payload, field, date);
        return;
      }

      setStringField(payload, field, normalizeOptionalText(value));
    });

    if (errors.length > 0) {
      preview.invalidRows.push({ rowNumber, values, errors });
      continue;
    }

    const duplicateKey = buildDuplicateKey(payload);
    preview.validRows.push({ rowNumber, payload, ...(duplicateKey && { duplicateKey }) });
  }

  preview.duplicateWarnings = buildVisitDuplicateWarnings(preview.validRows);
  return preview;
}

export function normalizeExcelDate(value: unknown): string | null {
  if (isBlankCell(value)) return null;
  if (value instanceof Date) return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  if (typeof value === 'number') return normalizeExcelSerial(value);

  const text = normalizeText(value);
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return normalizeExcelSerial(Number(text));

  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  return validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function buildVisitDuplicateWarnings(validRows: VisitImportValidRow[]): VisitImportDuplicateWarning[] {
  const groups = new Map<string, VisitImportValidRow[]>();
  for (const row of validRows) {
    if (!row.duplicateKey) continue;
    groups.set(row.duplicateKey, [...(groups.get(row.duplicateKey) ?? []), row]);
  }

  return Array.from(groups.entries()).flatMap(([key, rows]) => {
    if (rows.length < 2) return [];
    const [name = '', receptionDate = '', consultant = ''] = key.split('|');
    return [{ key, rowNumbers: rows.map((row) => row.rowNumber), name, receptionDate, consultant }];
  });
}

function normalizeHeader(value: unknown) {
  return normalizeText(value);
}

function normalizeText(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function isBlankCell(value: unknown) {
  return value == null || normalizeText(value) === '';
}

function toImportCells(row: unknown[]): VisitImportCell[] {
  return row.map((value) => {
    if (value == null || typeof value === 'string' || typeof value === 'number' || value instanceof Date) return value;
    return String(value);
  });
}

function normalizeAge(value: unknown): { valid: true; value: number | null } | { valid: false } {
  if (isBlankCell(value)) return { valid: true, value: null };
  const age = typeof value === 'number' ? value : Number(normalizeText(value));
  return Number.isInteger(age) ? { valid: true, value: age } : { valid: false };
}

function normalizeExcelSerial(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  // 46144 is 2026-05-02 in Excel's 1900 date system.
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.floor(value) * 86400000);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function validDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return formatDateParts(year, month, day);
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}

function padDate(value: number) {
  return String(value).padStart(2, '0');
}

function setDateField(payload: VisitWritePayload, field: keyof VisitWritePayload, value: string | null) {
  if (field === 'receptionDate') payload.receptionDate = value;
  if (field === 'trialDate') payload.trialDate = value;
}

function setStringField(payload: VisitWritePayload, field: keyof VisitWritePayload, value: string | null) {
  if (field === 'education') payload.education = value;
  else if (field === 'gender') payload.gender = value;
  else if (field === 'channelPartner') payload.channelPartner = value;
  else if (field === 'consultant') payload.consultant = value;
  else if (field === 'receptionStatus') payload.receptionStatus = value;
  else if (field === 'receptionist') payload.receptionist = value;
  else if (field === 'consultationStatus') payload.consultationStatus = value;
  else if (field === 'statusCategory') payload.statusCategory = value;
  else if (field === 'statusDescription') payload.statusDescription = value;
  else if (field === 'trialStatus') payload.trialStatus = value;
  else if (field === 'solution') payload.solution = value;
}

function buildDuplicateKey(payload: VisitWritePayload) {
  const name = payload.name;
  const receptionDate = payload.receptionDate ?? '';
  const consultant = payload.consultant ?? '';
  return name && receptionDate && consultant ? `${name}|${receptionDate}|${consultant}` : undefined;
}
