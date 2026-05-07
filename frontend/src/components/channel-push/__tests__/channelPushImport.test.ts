import { describe, expect, it } from 'vitest';

import { CHANNEL_PUSH_IMPORT_HEADERS } from 'src/types/channelPush';
import {
  parseChannelPushImportRows,
  validateChannelPushImportHeaders,
} from '../channelPushImport';

function workbookRows(...rows: unknown[][]) {
  return [['学员推送批量导入'], [...CHANNEL_PUSH_IMPORT_HEADERS], ...rows];
}

function row(values: Record<number, unknown>) {
  return CHANNEL_PUSH_IMPORT_HEADERS.map((_, index) => values[index] ?? '');
}

describe('validateChannelPushImportHeaders', () => {
  it('returns headerValid=true when 8 headers match exactly in order', () => {
    const result = validateChannelPushImportHeaders([...CHANNEL_PUSH_IMPORT_HEADERS]);
    expect(result.headerValid).toBe(true);
    expect(result.headerErrors).toEqual([]);
  });

  it('rejects swapped column order', () => {
    const swapped = [...CHANNEL_PUSH_IMPORT_HEADERS];
    swapped[0] = '手机号';
    swapped[1] = '学员姓名';
    const result = validateChannelPushImportHeaders(swapped);
    expect(result.headerValid).toBe(false);
    expect(result.headerErrors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects when 8th column 备注 is missing', () => {
    const truncated = CHANNEL_PUSH_IMPORT_HEADERS.slice(0, 7);
    const result = validateChannelPushImportHeaders([...truncated]);
    expect(result.headerValid).toBe(false);
    expect(result.headerErrors[7]).toContain('备注');
  });

  it('rejects an empty array as headerInvalid', () => {
    const result = validateChannelPushImportHeaders([]);
    expect(result.headerValid).toBe(false);
    expect(result.headerErrors.length).toBe(8);
  });

  it('trims whitespace around header text', () => {
    const padded = CHANNEL_PUSH_IMPORT_HEADERS.map((h) => ` ${h} `);
    const result = validateChannelPushImportHeaders(padded);
    expect(result.headerValid).toBe(true);
  });
});

describe('parseChannelPushImportRows', () => {
  it('accepts row 0 merged title + row 1 valid headers + row 2+ data', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(row({ 0: '张三', 1: '13800138000' })),
      'pushes.xlsx',
    );
    expect(preview.fileName).toBe('pushes.xlsx');
    expect(preview.headerValid).toBe(true);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]?.payload.studentName).toBe('张三');
  });

  it('accepts row 0 empty + row 1 valid headers', () => {
    const preview = parseChannelPushImportRows([
      [],
      [...CHANNEL_PUSH_IMPORT_HEADERS],
      row({ 0: '李四', 1: '13900139000' }),
    ]);
    expect(preview.headerValid).toBe(true);
    expect(preview.validRows).toHaveLength(1);
  });

  it('rejects when headers are at row 0 (parser reads rows[1])', () => {
    const preview = parseChannelPushImportRows([
      [...CHANNEL_PUSH_IMPORT_HEADERS],
      row({ 0: '张三', 1: '13800138000' }),
    ]);
    expect(preview.headerValid).toBe(false);
  });

  it('skips fully blank data rows', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(row({}), row({ 0: '张三', 1: '13800138000' })),
    );
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]?.rowNumber).toBe(4);
  });

  it('flags empty studentName as invalid row with 学员姓名 / 不能为空', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(row({ 0: '', 1: '13800138000' })),
    );
    expect(preview.invalidRows).toHaveLength(1);
    const errors = preview.invalidRows[0]!.errors;
    expect(errors.some((e) => e.field === '学员姓名' && e.message.includes('不能为空'))).toBe(true);
  });

  it('flags empty studentPhone as invalid', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(row({ 0: '张三', 1: '' })),
    );
    expect(preview.invalidRows).toHaveLength(1);
    const errors = preview.invalidRows[0]!.errors;
    expect(errors.some((e) => e.field === '手机号' && e.message.includes('不能为空'))).toBe(true);
  });

  it('accepts arbitrary phone formats (no frontend regex)', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(
        row({ 0: '张三', 1: '+86 138 0013 8000' }),
        row({ 0: '李四', 1: '12345678901' }),
      ),
    );
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows).toHaveLength(2);
  });

  it('rejects studentAge "17岁" but accepts "17", rejects 0 and 121, omits empty', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(
        row({ 0: '甲', 1: '13800138001', 2: '17岁' }),
        row({ 0: '乙', 1: '13800138002', 2: '17' }),
        row({ 0: '丙', 1: '13800138003', 2: '0' }),
        row({ 0: '丁', 1: '13800138004', 2: '121' }),
        row({ 0: '戊', 1: '13800138005', 2: '' }),
      ),
    );
    expect(preview.invalidRows.map((r) => r.rowNumber)).toEqual([3, 5, 6]);
    const validByName = new Map(
      preview.validRows.map((r) => [r.payload.studentName, r.payload]),
    );
    expect(validByName.get('乙')?.studentAge).toBe(17);
    expect(validByName.get('戊')?.studentAge).toBeUndefined();
  });

  it('flags studentName longer than 64 chars as invalid', () => {
    const longName = 'a'.repeat(65);
    const preview = parseChannelPushImportRows(
      workbookRows(row({ 0: longName, 1: '13800138000' })),
    );
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.invalidRows[0]!.errors.some((e) => e.field === '学员姓名')).toBe(true);
  });

  it('emits duplicateWarnings with Excel row numbers for triple repeats', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(
        row({ 0: '张三', 1: '13800138000' }),
        row({ 0: '张三', 1: '13800138000' }),
        row({ 0: '张三', 1: '13800138000' }),
      ),
    );
    expect(preview.validRows).toHaveLength(3);
    expect(preview.duplicateWarnings).toHaveLength(1);
    expect(preview.duplicateWarnings[0]!.rowNumbers).toEqual([3, 4, 5]);
    expect(preview.duplicateWarnings[0]!.studentName).toBe('张三');
    expect(preview.duplicateWarnings[0]!.studentPhone).toBe('13800138000');
  });

  it('marks overLimit=false for exactly 500 valid rows', () => {
    const dataRows = Array.from({ length: 500 }, (_, i) =>
      row({ 0: `学员${i}`, 1: `1380013${String(i).padStart(4, '0')}` }),
    );
    const preview = parseChannelPushImportRows(workbookRows(...dataRows));
    expect(preview.validRows).toHaveLength(500);
    expect(preview.overLimit).toBe(false);
  });

  it('marks overLimit=true for 501 valid rows', () => {
    const dataRows = Array.from({ length: 501 }, (_, i) =>
      row({ 0: `学员${i}`, 1: `1380014${String(i).padStart(4, '0')}` }),
    );
    const preview = parseChannelPushImportRows(workbookRows(...dataRows));
    expect(preview.validRows.length).toBeGreaterThan(500);
    expect(preview.overLimit).toBe(true);
  });

  it('keeps "2026-05" remark as plain string (no Date coercion)', () => {
    const preview = parseChannelPushImportRows(
      workbookRows(row({ 0: '张三', 1: '13800138000', 7: '2026-05' })),
    );
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]!.payload.remark).toBe('2026-05');
  });
});
