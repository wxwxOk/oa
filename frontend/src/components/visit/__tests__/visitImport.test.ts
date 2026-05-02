import { describe, expect, it } from 'vitest';

import { VISIT_IMPORT_HEADERS } from 'src/types/visit';
import { normalizeExcelDate, parseVisitImportRows } from '../visitImport';

function workbookRows(...rows: unknown[][]) {
  return [['学员到访跟踪表'], [...VISIT_IMPORT_HEADERS], ...rows];
}

function row(values: Record<number, unknown>) {
  return VISIT_IMPORT_HEADERS.map((_, index) => values[index] ?? '');
}

describe('visit import parser', () => {
  it('ignores row 1 title and accepts exact row 2 headers', () => {
    const preview = parseVisitImportRows(workbookRows(row({ 0: '张三' })), 'visits.xlsx');

    expect(preview.fileName).toBe('visits.xlsx');
    expect(preview.headerValid).toBe(true);
    expect(preview.actualHeaders).toEqual(VISIT_IMPORT_HEADERS);
  });

  it('rejects header mismatches before emitting validRows', () => {
    const headers = [...VISIT_IMPORT_HEADERS];
    headers[1] = '年龄段';
    const preview = parseVisitImportRows([['学员到访跟踪表'], headers, row({ 0: '张三' })]);

    expect(preview.headerValid).toBe(false);
    expect(preview.validRows.length).toBe(0);
    expect(preview.headerErrors[0]).toContain('第 2 列');
    expect(preview.headerErrors[0]).toContain('期望');
    expect(preview.headerErrors[0]).toContain('实际');
  });

  it('skips blank data rows', () => {
    const preview = parseVisitImportRows(workbookRows(row({}), row({ 0: '张三' })));

    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0].rowNumber).toBe(4);
  });

  it('normalizes valid row 3 strings, optional blanks, age, and dates', () => {
    const preview = parseVisitImportRows(
      workbookRows(
        row({
          0: ' 张三 ',
          1: '18',
          2: ' 本科 ',
          3: ' 女 ',
          4: ' 渠道A ',
          5: ' 李老师 ',
          6: ' 已接待 ',
          7: ' 王老师 ',
          8: 46144,
          9: ' 已咨询 ',
          10: ' 重点 ',
          11: ' 需要跟进 ',
          14: '',
        }),
      ),
    );

    expect(preview.invalidRows).toEqual([]);
    expect(preview.validRows[0]).toMatchObject({
      rowNumber: 3,
      payload: {
        name: '张三',
        age: 18,
        education: '本科',
        gender: '女',
        channelPartner: '渠道A',
        consultant: '李老师',
        receptionStatus: '已接待',
        receptionist: '王老师',
        receptionDate: '2026-05-02',
        consultationStatus: '已咨询',
        statusCategory: '重点',
        statusDescription: '需要跟进',
        trialStatus: null,
        solution: null,
        trialDate: null,
      },
    });
  });

  it('normalizes Excel serial, slash strings, and Date values to YYYY-MM-DD', () => {
    expect(normalizeExcelDate(46144)).toBe('2026-05-02');
    expect(normalizeExcelDate('2026/05/02')).toBe('2026-05-02');
    expect(normalizeExcelDate(new Date(2026, 4, 2))).toBe('2026-05-02');
  });

  it('keeps invalid row errors separate with original Excel row numbers', () => {
    const preview = parseVisitImportRows(
      workbookRows(
        row({ 0: ' ', 1: 18 }),
        row({ 0: '李四', 1: 18.5 }),
        row({ 0: '王五', 8: 'not-a-date', 14: '2026-99-99' }),
      ),
    );
    const errorText = preview.invalidRows
      .flatMap((invalidRow) => invalidRow.errors.map((error) => `第 ${invalidRow.rowNumber} 行 ${error.field}${error.message}`))
      .join('；');

    expect(preview.validRows).toEqual([]);
    expect(preview.invalidRows.map((invalidRow) => invalidRow.rowNumber)).toEqual([3, 4, 5]);
    expect(errorText).toContain('第 3 行 姓名不能为空');
    expect(errorText).toContain('第 4 行 年龄必须是整数');
    expect(errorText).toContain('第 5 行 接待日期必须是有效日期');
    expect(errorText).toContain('第 5 行 试听课时间必须是有效日期');
  });

  it('warns about duplicates without removing valid rows', () => {
    const preview = parseVisitImportRows(
      workbookRows(
        row({ 0: '张三', 5: '李老师', 8: '2026-05-02' }),
        row({ 0: '张三', 5: '李老师', 8: '2026/05/02' }),
      ),
    );

    expect(preview.validRows).toHaveLength(2);
    expect(preview.invalidRows).toEqual([]);
    expect(preview.duplicateWarnings).toEqual([
      {
        key: '张三|2026-05-02|李老师',
        rowNumbers: [3, 4],
        name: '张三',
        receptionDate: '2026-05-02',
        consultant: '李老师',
      },
    ]);
  });
});
