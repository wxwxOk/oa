import { describe, expect, it } from 'bun:test';

import {
  MAX_REIMBURSEMENT_EXPORT_ROWS,
  buildReimbursementWorkbook,
  exportReimbursementsExcel,
  sanitizeReimbursementExcelCell,
} from '../reimbursement-export.service';

const exportTooLargeMessage = '当前筛选结果超过导出上限，请缩小筛选范围后重试。';

const exportActor = {
  id: 7,
  name: '财务人员',
  roleCodes: [],
  permissions: ['reimbursement:export', 'reimbursement:list'],
};

const exportFilters = {
  status: 'APPROVED',
  category: '差旅',
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
  keyword: '交通',
  page: 9,
  size: 999,
  reviewScope: 'finance',
};

const fixedHeaders = [
  '申请编号',
  '标题',
  '类别',
  '金额',
  '发生日期',
  '事由',
  '收款信息',
  '备注',
  '申请人',
  '申请部门',
  '提交时间',
  '附件数量',
  '当前状态',
  '部门审核结果',
  '部门审核人',
  '部门审核时间',
  '部门审核意见',
  '财务审核结果',
  '财务审核人',
  '财务审核时间',
  '财务审核意见',
  '最终通过时间',
];

function makeExportRow(patch: Record<string, unknown> = {}) {
  return {
    id: 1,
    applicationNo: 'REIM-20260503-ABCDEFGH',
    title: '=交通费报销',
    category: '差旅',
    occurredAt: new Date('2026-05-01T00:00:00.000Z'),
    amount: '123.45',
    reason: '客户拜访交通费',
    payeeInfo: '张三 6222000000000000',
    remark: null,
    status: 'APPROVED',
    applicantName: '张三',
    applicantDepartmentName: '销售部',
    submittedAt: new Date('2026-05-01T09:00:00.000Z'),
    completedAt: new Date('2026-05-03T12:00:00.000Z'),
    attachmentCount: 2,
    actions: [],
    ...patch,
  };
}

describe('reimbursement Excel export contract', () => {
  it('pins export cap and formula sanitization', () => {
    expect(MAX_REIMBURSEMENT_EXPORT_ROWS).toBe(2_000);
    expect(sanitizeReimbursementExcelCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeReimbursementExcelCell('+cmd')).toBe("'+cmd");
    expect(sanitizeReimbursementExcelCell('-cmd')).toBe("'-cmd");
    expect(sanitizeReimbursementExcelCell('@cmd')).toBe("'@cmd");
    expect(sanitizeReimbursementExcelCell('\tcmd')).toBe("'\tcmd");
    expect(sanitizeReimbursementExcelCell('\rcmd')).toBe("'\rcmd");
    expect(sanitizeReimbursementExcelCell('普通文本')).toBe('普通文本');
    expect(sanitizeReimbursementExcelCell(42)).toBe(42);
    expect(sanitizeReimbursementExcelCell(null)).toBeNull();
    expect(sanitizeReimbursementExcelCell(undefined)).toBeUndefined();
  });

  it('pins fixed reimbursement workbook columns', async () => {
    const workbook = await buildReimbursementWorkbook({ rows: [makeExportRow()] });
    const worksheet = workbook.getWorksheet('报销明细');

    expect(worksheet).toBeTruthy();
    expect(worksheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect((worksheet?.getRow(1).values as unknown[]).slice(1)).toEqual(fixedHeaders);
  });

  it('pins review result columns from latest actions', async () => {
    const workbook = await buildReimbursementWorkbook({
      rows: [
        makeExportRow({
          actions: [
            {
              type: 'DEPARTMENT_REJECT',
              actorName: '旧部门审核人',
              nodeName: '部门初审',
              comment: '旧意见',
              createdAt: new Date('2026-05-02T08:00:00.000Z'),
            },
            {
              type: 'DEPARTMENT_APPROVE',
              actorName: '新部门审核人',
              nodeName: '部门初审',
              comment: '部门同意',
              createdAt: new Date('2026-05-02T09:00:00.000Z'),
            },
            {
              type: 'FINANCE_REJECT',
              actorName: '旧财务审核人',
              nodeName: '财务复核',
              comment: '旧财务意见',
              createdAt: new Date('2026-05-03T08:00:00.000Z'),
            },
            {
              type: 'FINANCE_APPROVE',
              actorName: '新财务审核人',
              nodeName: '财务复核',
              comment: '财务同意',
              createdAt: new Date('2026-05-03T09:00:00.000Z'),
            },
          ],
        }),
        makeExportRow({
          id: 2,
          applicationNo: 'REIM-20260503-REJECTED',
          status: 'REJECTED',
          completedAt: new Date('2026-05-03T13:00:00.000Z'),
        }),
      ],
    });
    const worksheet = workbook.getWorksheet('报销明细');

    expect(worksheet?.getCell('N2').value).toBe('通过');
    expect(worksheet?.getCell('O2').value).toBe('新部门审核人');
    expect(String(worksheet?.getCell('P2').value)).toContain('2026-05-02');
    expect(worksheet?.getCell('Q2').value).toBe('部门同意');
    expect(worksheet?.getCell('R2').value).toBe('通过');
    expect(worksheet?.getCell('S2').value).toBe('新财务审核人');
    expect(String(worksheet?.getCell('T2').value)).toContain('2026-05-03');
    expect(worksheet?.getCell('U2').value).toBe('财务同意');
    expect(String(worksheet?.getCell('V2').value)).toContain('2026-05-03');
    expect(worksheet?.getCell('V3').value).toBe('');
  });

  it('pins current-filter full export paging', async () => {
    const calls: unknown[] = [];
    const workbook = await exportReimbursementsExcel(exportActor, exportFilters as never, {
      listReimbursements: async (receivedActor: unknown, receivedFilters: unknown) => {
        expect(receivedActor).toBe(exportActor);
        calls.push(receivedFilters);
        return { rows: [makeExportRow()], total: 1, page: 1, size: 100 };
      },
    });

    expect(calls).toEqual([
      { status: 'APPROVED', category: '差旅', dateFrom: '2026-05-01', dateTo: '2026-05-31', keyword: '交通', page: 1, size: 100 },
    ]);
    expect(workbook.getWorksheet('报销明细')).toBeTruthy();

    await expect(
      exportReimbursementsExcel(exportActor, exportFilters as never, {
        listReimbursements: async () => ({ rows: [], total: MAX_REIMBURSEMENT_EXPORT_ROWS + 1, page: 1, size: 100 }),
      }),
    ).rejects.toMatchObject({
      code: 'REIMBURSEMENT_EXPORT_TOO_LARGE',
      message: exportTooLargeMessage,
    });
  });
});
