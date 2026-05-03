import { describe, expect, it } from 'bun:test';

import {
  reimbursementListQuery,
  reimbursementModule,
  reimbursementReviewApproveBody,
  reimbursementReviewRejectBody,
  reimbursementWriteBody,
  serializeReimbursementListResponse,
} from '../reimbursement.route';

const writableFields = ['title', 'category', 'occurredAt', 'amount', 'reason', 'payeeInfo', 'remark'];

const trustedFields = [
  'id',
  'applicationNo',
  'status',
  'applicantId',
  'applicantName',
  'applicantDepartmentId',
  'applicantDepartmentName',
  'submittedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
  'attachments',
  'actions',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function routeSignatures() {
  return (reimbursementModule.routes ?? [])
    .map((route: { method: string; path: string }) => {
      const path = route.path.replace(/^\/reimbursements/, '') || '/';
      return `${route.method} ${path}`;
    })
    .filter((signature) => !signature.startsWith('HEAD '));
}

function makeReimbursementRow() {
  return {
    id: 1,
    applicationNo: 'REIM-20260503-ABCDEFGH',
    title: '差旅报销',
    category: '差旅',
    occurredAt: new Date('2026-05-01T08:00:00.000Z'),
    amount: '123.45',
    reason: '客户拜访交通费',
    payeeInfo: '张三 6222000000000000',
    remark: '含发票',
    status: 'DRAFT',
    applicantId: 7,
    applicantName: '张三',
    applicantDepartmentId: 2,
    applicantDepartmentName: '销售部',
    submittedAt: null,
    completedAt: null,
    attachmentCount: 2,
    createdAt: new Date('2026-05-01T09:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  };
}

describe('reimbursement route contract', () => {
  it('exports the reimbursement module under /reimbursements', () => {
    expect(reimbursementModule.config.prefix).toBe('/reimbursements');
  });

  it('declares application and attachment route signatures', () => {
    expect(routeSignatures()).toEqual(
      expect.arrayContaining([
        'GET /',
        'GET /export',
        'GET /:id',
        'GET /review/department',
        'GET /review/finance',
        'POST /',
        'PUT /:id',
        'POST /:id/submit',
        'POST /:id/attachments',
        'POST /:id/department-review/approve',
        'POST /:id/department-review/reject',
        'POST /:id/finance-review/approve',
        'POST /:id/finance-review/reject',
        'GET /:id/attachments/:attachmentId/preview',
        'GET /:id/attachments/:attachmentId/download',
        'GET /:id/actions/:actionId/signature',
        'DELETE /:id/attachments/:attachmentId',
      ]),
    );

    expect(routeSignatures().indexOf('GET /review/department')).toBeLessThan(routeSignatures().indexOf('GET /:id'));
    expect(routeSignatures().indexOf('GET /:id/actions/:actionId/signature')).toBeLessThan(routeSignatures().indexOf('GET /:id'));
    expect(routeSignatures().indexOf('GET /export')).toBeLessThan(routeSignatures().indexOf('GET /:id'));
  });

  it('exposes controlled list query filters and pagination fields', () => {
    expect(schemaPropertyNames(reimbursementListQuery)).toEqual(
      expect.arrayContaining(['page', 'size', 'status', 'category', 'dateFrom', 'dateTo', 'keyword']),
    );
  });

  it('hardens write schemas against trusted-field tampering', () => {
    expect(schemaPropertyNames(reimbursementWriteBody)).toEqual(writableFields);
    expect((reimbursementWriteBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);

    for (const field of trustedFields) {
      expect(schemaPropertyNames(reimbursementWriteBody)).not.toContain(field);
    }
  });

  it('declares minimal review action body schemas', () => {
    expect(schemaPropertyNames(reimbursementReviewApproveBody)).toEqual(['signature', 'comment']);
    expect(schemaPropertyNames(reimbursementReviewRejectBody)).toEqual(['comment']);
    expect((reimbursementReviewApproveBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    expect((reimbursementReviewRejectBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);
  });

  it('serializes list responses as rows/total/page/size', () => {
    expect(serializeReimbursementListResponse({ rows: [makeReimbursementRow()], total: 1, page: 2, size: 10 })).toEqual({
      rows: [
        expect.objectContaining({
          id: 1,
          applicationNo: 'REIM-20260503-ABCDEFGH',
          status: 'DRAFT',
          amount: '123.45',
          occurredAt: '2026-05-01T08:00:00.000Z',
          createdAt: '2026-05-01T09:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        }),
      ],
      total: 1,
      page: 2,
      size: 10,
    });
  });

  it('pins route guards, date filtering, and object authorization helpers', async () => {
    const source = await Bun.file(new URL('../reimbursement.route.ts', import.meta.url)).text();

    expect(source).toContain("authGuard('reimbursement:own')");
    expect(source).toContain("authGuard('reimbursement:create')");
    expect(source).toContain("authGuard('reimbursement:list')");
    expect(source).toContain("authGuard('reimbursement:export')");
    expect(source).toContain("authGuard('reimbursement:attachment')");
    expect(source).toContain("authGuard('reimbursement:department-review')");
    expect(source).toContain("authGuard('reimbursement:finance-review')");
    expect(source).toContain('/review/department');
    expect(source).toContain('/review/finance');
    expect(source).toContain('/:id/department-review/approve');
    expect(source).toContain('/:id/department-review/reject');
    expect(source).toContain('/:id/finance-review/approve');
    expect(source).toContain('/:id/finance-review/reject');
    expect(source).toContain('/:id/actions/:actionId/signature');
    expect(source).toContain('buildReimbursementSignaturePreviewHeaders');
    expect(source).toContain('currentUser.id');
    expect(source).toContain('assertCanViewReimbursement');
    expect(source).toContain('assertCanMutateDraftReimbursement');
    expect(source).toContain('dateTo + \'T23:59:59.999Z\'');
    expect(source).not.toContain('responseType');
    expect(source).not.toMatch(/data:\s*body|applicantId:\s*body/);
  });

  it('pins reimbursement XLSX export route contract', async () => {
    const source = await Bun.file(new URL('../reimbursement.route.ts', import.meta.url)).text();

    expect(source).toContain('exportReimbursementsExcel');
    expect(source).toContain("authGuard('reimbursement:export')");
    expect(source).toContain('reimbursementListQuery');
    expect(source).toContain('workbook.xlsx.writeBuffer()');
    expect(source).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(source).toContain('Content-Disposition');
    expect(source).toContain('attachment');
    expect(source).toContain('reimbursements-export');
    expect(source).not.toContain('responseType');
    expect(source).not.toContain('window.open');
  });
});
