import { describe, expect, it } from 'bun:test';

import {
  MAX_ARCHIVE_EXPORT_ROWS,
  buildArchiveWorkbook,
  exportArchiveExcel,
  sanitizeExcelCell,
} from '../archive-export.service';

const exportTooLargeMessage = '当前筛选结果超过导出上限，请缩小筛选范围后重试。';

const archiveActor = {
  id: 7,
  name: '运营人员',
  departmentId: 3,
  permissions: ['approval:export', 'approval:application:department', 'form:submission:list'],
};

const archiveFilters = {
  sourceType: 'approval' as const,
  templateId: 5,
  departmentId: 3,
  personName: '申请人',
  status: 'APPROVED',
  dateFrom: '2026-04-01',
  dateTo: '2026-04-30',
  tags: ['待跟进'],
};

function makeArchiveRow(index = 1) {
  return {
    archiveKey: `approval:${index}`,
    sourceType: 'approval' as const,
    sourceId: index,
    templateName: '请假申请',
    departmentName: '研发部',
    personName: '申请人',
    status: 'APPROVED',
    tags: ['待跟进'],
    processingData: { followUpResult: '已回访' },
    effectiveData: {
      reason: index === 1 ? '=HYPERLINK("http://example.test","打开")' : `年度调休 ${index}`,
      phone: '+8613800138000',
      remark: '-需要复核',
      owner: '@admin',
      tabbed: '\t隐藏公式',
      carriage: '\r隐藏公式',
    },
    updatedAt: new Date('2026-04-26T08:00:00.000Z'),
  };
}

describe('approval archive Excel export contract', () => {
  it('T-19-CSV-INJECTION prefixes formula-leading strings before ExcelJS receives cell values', () => {
    expect(sanitizeExcelCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeExcelCell('+cmd')).toBe("'+cmd");
    expect(sanitizeExcelCell('-cmd')).toBe("'-cmd");
    expect(sanitizeExcelCell('@cmd')).toBe("'@cmd");
    expect(sanitizeExcelCell('\tcmd')).toBe("'\tcmd");
    expect(sanitizeExcelCell('\rcmd')).toBe("'\rcmd");
    expect(sanitizeExcelCell('普通文本')).toBe('普通文本');
    expect(sanitizeExcelCell(42)).toBe(42);
  });

  it('T-19-EXPORT-DOS caps archive export at exactly 2000 rows with a localized business error', async () => {
    expect(MAX_ARCHIVE_EXPORT_ROWS).toBe(2_000);

    await expect(
      buildArchiveWorkbook({
        rows: Array.from({ length: MAX_ARCHIVE_EXPORT_ROWS + 1 }, (_, index) => makeArchiveRow(index + 1)),
      }),
    ).rejects.toMatchObject({
      code: 'ARCHIVE_EXPORT_TOO_LARGE',
      message: exportTooLargeMessage,
    });
  });

  it('buildArchiveWorkbook writes sanitized metadata, processing fields and flattened form values', async () => {
    const workbook = await buildArchiveWorkbook({ rows: [makeArchiveRow()] });
    const worksheet = workbook.getWorksheet('归档数据');

    expect(worksheet).toBeTruthy();
    expect(worksheet.getRow(1).values).toEqual(
      expect.arrayContaining(['来源', '模板', '部门', '人员', '状态', '标签', '跟进结果', '申请事由']),
    );
    expect(worksheet.getCell('H2').value).toBe(`'=HYPERLINK("http://example.test","打开")`);
    expect(worksheet.getCell('I2').value).toBe("'+8613800138000");
    expect(worksheet.getCell('J2').value).toBe("'-需要复核");
    expect(worksheet.getCell('K2').value).toBe("'@admin");
    expect(worksheet.getCell('L2').value).toBe("'\t隐藏公式");
    expect(worksheet.getCell('M2').value).toBe("'\r隐藏公式");
  });

  it('exportArchiveExcel reuses archive list filters and permissions before building the workbook', async () => {
    const workbook = await exportArchiveExcel(archiveActor, archiveFilters, {
      listArchiveRecords: async (receivedActor: unknown, receivedFilters: unknown) => {
        expect(receivedActor).toBe(archiveActor);
        expect(receivedFilters).toEqual({ ...archiveFilters, page: 1, size: MAX_ARCHIVE_EXPORT_ROWS + 1 });
        return {
          rows: [makeArchiveRow()],
          total: 1,
          page: 1,
          size: MAX_ARCHIVE_EXPORT_ROWS + 1,
        };
      },
    });

    expect(workbook.getWorksheet('归档数据')).toBeTruthy();
  });
});
