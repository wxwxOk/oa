import {
  CHANNEL_PUSH_IMPORT_HEADERS,
  MAX_CHANNEL_PUSH_IMPORT_ROWS,
  type ChannelPushImportDuplicateWarning,
  type ChannelPushImportInvalidRow,
  type ChannelPushImportPreview,
  type ChannelPushImportRowError,
  type ChannelPushImportValidRow,
  type ChannelPushWritePayload,
} from 'src/types/channelPush';

const COLUMN_FIELDS: Array<keyof ChannelPushWritePayload> = [
  'studentName',
  'studentPhone',
  'studentAge',
  'studentEducation',
  'studentGender',
  'intentStatus',
  'intentNote',
  'remark',
];

const HEADER_LABELS = CHANNEL_PUSH_IMPORT_HEADERS;

const MAX_NAME_LEN = 64;
const MAX_PHONE_LEN = 32;
const MAX_SHORT_TEXT = 64;
const MAX_GENDER_TEXT = 16;
const MAX_LONG_TEXT = 1000;

const FIELD_MAX_LEN: Record<keyof ChannelPushWritePayload, number> = {
  studentName: MAX_NAME_LEN,
  studentPhone: MAX_PHONE_LEN,
  studentAge: 0, // unused — handled separately
  studentEducation: MAX_SHORT_TEXT,
  studentGender: MAX_GENDER_TEXT,
  intentStatus: MAX_SHORT_TEXT,
  intentNote: MAX_LONG_TEXT,
  remark: MAX_LONG_TEXT,
};

export function validateChannelPushImportHeaders(actualHeaders: unknown[]) {
  const expectedHeaders = [...HEADER_LABELS];
  const actual = expectedHeaders.map((_, i) => normalizeHeader(actualHeaders[i]));
  const detail = expectedHeaders.map((expected, i) => {
    const received = actual[i] ?? '';
    return received === expected
      ? ''
      : `第 ${i + 1} 列期望「${expected}」，实际「${received || '空'}」`;
  });
  const headerValid = detail.every((e) => e === '');

  return {
    headerValid,
    expectedHeaders,
    actualHeaders: actual,
    headerErrors: headerValid ? [] : detail,
  };
}

export function parseChannelPushImportRows(
  rows: unknown[][],
  fileName?: string,
): ChannelPushImportPreview {
  const headerResult = validateChannelPushImportHeaders(rows[1] ?? []);
  const preview: ChannelPushImportPreview = {
    fileName,
    ...headerResult,
    validRows: [],
    invalidRows: [],
    duplicateWarnings: [],
    overLimit: false,
  };

  if (!preview.headerValid) return preview;

  for (let i = 2; i < rows.length; i += 1) {
    const cells = (rows[i] ?? []).map(toCell);
    if (cells.every(isBlank)) continue;

    const rowNumber = i + 1;
    const errors: ChannelPushImportRowError[] = [];
    const payload: ChannelPushWritePayload = { studentName: '', studentPhone: '' };

    COLUMN_FIELDS.forEach((field, idx) => {
      const label = HEADER_LABELS[idx]!;
      const value = cells[idx];

      if (field === 'studentName') {
        const text = normalizeText(value);
        if (!text) {
          errors.push({ rowNumber, field: label, message: '不能为空' });
        } else if (text.length > MAX_NAME_LEN) {
          errors.push({ rowNumber, field: label, message: `长度不能超过 ${MAX_NAME_LEN}` });
        } else {
          payload.studentName = text;
        }
        return;
      }

      if (field === 'studentPhone') {
        const text = normalizeText(value);
        if (!text) {
          errors.push({ rowNumber, field: label, message: '不能为空' });
        } else if (text.length > MAX_PHONE_LEN) {
          errors.push({ rowNumber, field: label, message: `长度不能超过 ${MAX_PHONE_LEN}` });
        } else {
          payload.studentPhone = text;
        }
        return;
      }

      if (field === 'studentAge') {
        if (isBlank(value)) return; // omit
        const age = normalizeInteger(value);
        if (age === null) {
          errors.push({ rowNumber, field: label, message: '必须为整数' });
        } else if (age < 1 || age > 120) {
          errors.push({ rowNumber, field: label, message: '必须在 1..120' });
        } else {
          payload.studentAge = age;
        }
        return;
      }

      // Optional text fields
      const text = normalizeText(value);
      if (!text) return; // omit empty
      const max = FIELD_MAX_LEN[field];
      if (text.length > max) {
        errors.push({ rowNumber, field: label, message: `长度不能超过 ${max}` });
        return;
      }
      setOptionalField(payload, field, text);
    });

    if (errors.length === 0) {
      preview.validRows.push({ rowNumber, payload });
    } else {
      preview.invalidRows.push({ rowNumber, rawCells: cells.map(stringifyCell), errors });
    }
  }

  preview.overLimit = preview.validRows.length > MAX_CHANNEL_PUSH_IMPORT_ROWS;

  preview.duplicateWarnings = buildDuplicateWarnings(preview.validRows);

  return preview;
}

function buildDuplicateWarnings(
  validRows: ChannelPushImportValidRow[],
): ChannelPushImportDuplicateWarning[] {
  const groups = new Map<string, ChannelPushImportValidRow[]>();
  for (const row of validRows) {
    const key = `${row.payload.studentName}|${row.payload.studentPhone}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.entries()).flatMap(([key, rs]) => {
    if (rs.length < 2) return [];
    return [
      {
        key,
        rowNumbers: rs.map((r) => r.rowNumber),
        studentName: rs[0]!.payload.studentName,
        studentPhone: rs[0]!.payload.studentPhone,
      },
    ];
  });
}

function normalizeHeader(value: unknown) {
  return normalizeText(value);
}

function normalizeText(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function isBlank(value: unknown) {
  return value == null || normalizeText(value) === '';
}

function toCell(value: unknown): unknown {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function stringifyCell(value: unknown) {
  if (value == null) return '';
  return String(value);
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isInteger(n) ? n : null;
}

function setOptionalField(
  payload: ChannelPushWritePayload,
  field: keyof ChannelPushWritePayload,
  value: string,
) {
  if (field === 'studentEducation') payload.studentEducation = value;
  else if (field === 'studentGender') payload.studentGender = value;
  else if (field === 'intentStatus') payload.intentStatus = value;
  else if (field === 'intentNote') payload.intentNote = value;
  else if (field === 'remark') payload.remark = value;
}
