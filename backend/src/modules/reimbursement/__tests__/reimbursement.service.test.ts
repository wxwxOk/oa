import { describe, expect, it } from 'bun:test';

import { BizError } from '../../../utils/errors';
import {
  REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
  REIMBURSEMENT_FINANCE_REVIEW_NODE,
  assertReimbursementTransition,
} from '../reimbursement.state';
import {
  buildDepartmentReviewScopeIds,
  canDepartmentReviewReimbursement,
  canFinanceReviewReimbursement,
  canViewReimbursement,
  normalizeReimbursementListFilters,
  normalizeReimbursementReviewInput,
  normalizeReimbursementWriteInput,
  serializeReimbursementDetail,
  type ReimbursementActor,
} from '../reimbursement.service';

function validWriteInput() {
  return {
    title: ' 差旅报销 ',
    category: ' 差旅 ',
    occurredAt: '2026-05-01',
    amount: '123.456',
    reason: ' 客户拜访交通费 ',
    payeeInfo: ' 张三 6222000000000000 ',
    remark: ' 含发票 ',
  };
}

function actor(input: Partial<ReimbursementActor>): ReimbursementActor {
  return {
    id: input.id ?? 1,
    name: input.name ?? '张三',
    roleCodes: input.roleCodes ?? [],
    permissions: input.permissions ?? [],
  };
}

describe('reimbursement service helpers', () => {
  it('guards reimbursement state transitions', () => {
    expect(() => assertReimbursementTransition('DRAFT', 'DEPARTMENT_REVIEW')).not.toThrow();
    expect(() => assertReimbursementTransition('DEPARTMENT_REVIEW', 'FINANCE_REVIEW')).not.toThrow();
    expect(() => assertReimbursementTransition('FINANCE_REVIEW', 'APPROVED')).not.toThrow();
    expect(() => assertReimbursementTransition('DEPARTMENT_REVIEW', 'DRAFT')).toThrow(BizError);
    expect(REIMBURSEMENT_DEPARTMENT_REVIEW_NODE).toBe('部门初审');
    expect(REIMBURSEMENT_FINANCE_REVIEW_NODE).toBe('财务复核');
  });

  it('normalizes and validates write input', () => {
    const normalized = normalizeReimbursementWriteInput(validWriteInput());

    expect(normalized).toMatchObject({
      title: '差旅报销',
      category: '差旅',
      amount: '123.46',
      reason: '客户拜访交通费',
      payeeInfo: '张三 6222000000000000',
      remark: '含发票',
    });
    expect(normalized.occurredAt).toBeInstanceOf(Date);

    for (const patch of [
      { amount: 0 },
      { title: '   ' },
      { category: '   ' },
      { reason: '   ' },
      { occurredAt: 'not-a-date' },
    ]) {
      expect(() => normalizeReimbursementWriteInput({ ...validWriteInput(), ...patch })).toThrow(BizError);
    }
  });

  it('normalizes list filters and date boundaries', () => {
    const filters = normalizeReimbursementListFilters({
      page: '0',
      size: '999',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-02',
    });

    expect(filters.page).toBe(1);
    expect(filters.size).toBe(100);
    expect(filters.dateFrom?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(filters.dateTo?.toISOString()).toBe('2026-05-02T23:59:59.999Z');
  });

  it('checks object visibility scopes', () => {
    const application = { applicantId: 1, applicantDepartmentId: 10, status: 'DEPARTMENT_REVIEW' };

    expect(canViewReimbursement(actor({ id: 1 }), application)).toBe(true);
    expect(canViewReimbursement(actor({ roleCodes: ['ADMIN'] }), application)).toBe(true);
    expect(canViewReimbursement(actor({ permissions: ['reimbursement:list'] }), application)).toBe(true);
    expect(
      canViewReimbursement(actor({ id: 3, permissions: ['reimbursement:department-review'] }), application, 10),
    ).toBe(true);
    expect(
      canViewReimbursement(
        actor({ id: 3, permissions: ['reimbursement:department-review'] }),
        application,
        20,
        [20, 10],
      ),
    ).toBe(true);
    expect(
      canViewReimbursement(
        actor({ id: 4, permissions: ['reimbursement:finance-review'] }),
        { ...application, status: 'FINANCE_REVIEW' },
      ),
    ).toBe(true);
    expect(canViewReimbursement(actor({ id: 5 }), application, 99)).toBe(false);
  });

  it('builds department review scope from same-level and lower departments', () => {
    const departments = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: 2 },
      { id: 5, parentId: 3 },
      { id: 6, parentId: 5 },
      { id: 7, parentId: 1 },
    ];

    expect(buildDepartmentReviewScopeIds(2, departments).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(buildDepartmentReviewScopeIds(3, departments).sort((a, b) => a - b)).toEqual([3, 4, 5, 6]);
    expect(buildDepartmentReviewScopeIds(null, departments)).toEqual([]);
  });

  it('checks department and finance review permissions', () => {
    const departmentApplication = { applicantId: 1, applicantDepartmentId: 10, status: 'DEPARTMENT_REVIEW' };
    const financeApplication = { ...departmentApplication, status: 'FINANCE_REVIEW' };

    expect(
      canDepartmentReviewReimbursement(actor({ permissions: ['reimbursement:department-review'] }), departmentApplication, 10),
    ).toBe(true);
    expect(
      canDepartmentReviewReimbursement(actor({ permissions: ['reimbursement:department-review'] }), departmentApplication, 99),
    ).toBe(false);
    expect(
      canDepartmentReviewReimbursement(
        actor({ permissions: ['reimbursement:department-review'] }),
        departmentApplication,
        99,
        [99, 10],
      ),
    ).toBe(true);
    expect(canDepartmentReviewReimbursement(actor({ roleCodes: ['ADMIN'] }), departmentApplication)).toBe(true);
    expect(canDepartmentReviewReimbursement(actor({ permissions: ['reimbursement:finance-review'] }), financeApplication)).toBe(false);

    expect(canFinanceReviewReimbursement(actor({ permissions: ['reimbursement:finance-review'] }), financeApplication)).toBe(true);
    expect(canFinanceReviewReimbursement(actor({ roleCodes: ['ADMIN'] }), financeApplication)).toBe(true);
    expect(canFinanceReviewReimbursement(actor({ permissions: ['reimbursement:finance-review'] }), departmentApplication)).toBe(false);
  });

  it('normalizes review input and requires signatures or rejection comments', () => {
    const signature = new File(['demo'], 'signature.png', { type: 'image/png' });

    expect(normalizeReimbursementReviewInput({ comment: ' 同意 ', signature }, 'approve')).toEqual({
      comment: '同意',
      signature,
    });
    expect(normalizeReimbursementReviewInput({ comment: '  ', signature }, 'approve')).toEqual({ comment: null, signature });
    expect(normalizeReimbursementReviewInput({ comment: ' 资料不完整 ', signature }, 'reject')).toEqual({
      comment: '资料不完整',
      signature: null,
    });

    expect(() => normalizeReimbursementReviewInput({ comment: '同意' }, 'approve')).toThrow(BizError);
    expect(() =>
      normalizeReimbursementReviewInput({ signature: new File(['demo'], 'signature.jpg', { type: 'image/jpeg' }) }, 'approve'),
    ).toThrow(BizError);
    expect(() => normalizeReimbursementReviewInput({ comment: '   ' }, 'reject')).toThrow(BizError);
  });

  it('serializes detail dates, attachments and actions', () => {
    expect(
      serializeReimbursementDetail({
        id: 1,
        applicationNo: 'REIM-20260503-ABCDEFGH',
        title: '差旅报销',
        category: '差旅',
        occurredAt: new Date('2026-05-01T08:00:00.000Z'),
        amount: '123.45',
        reason: '客户拜访交通费',
        payeeInfo: null,
        remark: null,
        status: 'DRAFT',
        applicantId: 7,
        applicantName: '张三',
        applicantDepartmentId: 2,
        applicantDepartmentName: '销售部',
        submittedAt: null,
        completedAt: null,
        createdAt: new Date('2026-05-01T09:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        attachments: [{ id: 11, originalName: 'invoice.pdf', mimeType: 'application/pdf', size: 100, uploaderId: 7, createdAt: new Date('2026-05-01T11:00:00.000Z') }],
        actions: [{ id: 21, actorId: 7, actorName: '张三', type: 'SUBMIT', nodeName: REIMBURSEMENT_DEPARTMENT_REVIEW_NODE, comment: null, signatureRelativePath: 'signatures/1/DEPARTMENT_APPROVE/demo.png', signatureMimeType: 'image/png', signatureSize: 100, createdAt: new Date('2026-05-01T12:00:00.000Z') }],
      }),
    ).toMatchObject({
      occurredAt: '2026-05-01T08:00:00.000Z',
      createdAt: '2026-05-01T09:00:00.000Z',
      attachments: [expect.objectContaining({ id: 11, originalName: 'invoice.pdf' })],
      actions: [
        expect.objectContaining({
          id: 21,
          type: 'SUBMIT',
          nodeName: REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
          signatureRelativePath: 'signatures/1/DEPARTMENT_APPROVE/demo.png',
        }),
      ],
    });
  });
});
