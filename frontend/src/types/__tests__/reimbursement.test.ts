import { describe, expect, it } from 'vitest';

import * as reimbursementTypes from '../reimbursement';
import {
  ALLOWED_REIMBURSEMENT_MIME_TYPES,
  MAX_REIMBURSEMENT_ATTACHMENTS,
  MAX_REIMBURSEMENT_FILE_SIZE,
  REIMBURSEMENT_LIST_FILTER_KEYS,
  REIMBURSEMENT_STATUSES,
  REIMBURSEMENT_WRITE_PAYLOAD_KEYS,
  createEmptyReimbursementFilters,
  formatFileSize,
  formatReimbursementAmount,
  formatReimbursementDate,
  isDraftReimbursement,
  normalizeReimbursementPayload,
  reimbursementStatusColor,
  reimbursementStatusLabel,
} from '../reimbursement';

describe('reimbursement type helpers', () => {
  it('pins reimbursement statuses and UI labels', () => {
    expect(REIMBURSEMENT_STATUSES).toEqual([
      'DRAFT',
      'DEPARTMENT_REVIEW',
      'FINANCE_REVIEW',
      'APPROVED',
      'REJECTED',
    ]);

    expect(reimbursementStatusLabel('DRAFT')).toBe('草稿');
    expect(reimbursementStatusColor('DRAFT')).toBe('grey');
    expect(reimbursementStatusLabel('DEPARTMENT_REVIEW')).toBe('部门初审');
    expect(reimbursementStatusColor('DEPARTMENT_REVIEW')).toBe('orange');
    expect(reimbursementStatusLabel('FINANCE_REVIEW')).toBe('财务复核');
    expect(reimbursementStatusColor('FINANCE_REVIEW')).toBe('primary');
    expect(reimbursementStatusLabel('APPROVED')).toBe('已通过');
    expect(reimbursementStatusColor('APPROVED')).toBe('positive');
    expect(reimbursementStatusLabel('REJECTED')).toBe('已驳回');
    expect(reimbursementStatusColor('REJECTED')).toBe('negative');
  });

  it('pins fixed write keys and list filters', () => {
    expect(REIMBURSEMENT_WRITE_PAYLOAD_KEYS).toEqual([
      'title',
      'category',
      'occurredAt',
      'amount',
      'reason',
      'payeeInfo',
      'remark',
    ]);

    for (const trustedKey of [
      'id',
      'applicationNo',
      'status',
      'applicantId',
      'submittedAt',
      'completedAt',
      'attachments',
      'actions',
    ]) {
      expect(REIMBURSEMENT_WRITE_PAYLOAD_KEYS).not.toContain(trustedKey);
    }

    expect(REIMBURSEMENT_LIST_FILTER_KEYS).toEqual(['status', 'category', 'dateFrom', 'dateTo', 'keyword']);
    expect(createEmptyReimbursementFilters()).toEqual({
      status: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      keyword: '',
    });
  });

  it('pins attachment constants to the Phase 24 backend contract', () => {
    expect(ALLOWED_REIMBURSEMENT_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    expect(MAX_REIMBURSEMENT_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(MAX_REIMBURSEMENT_ATTACHMENTS).toBe(20);
  });

  it('formats dates, amounts and file sizes without locale-only assumptions', () => {
    expect(formatReimbursementDate('2026-05-03T08:30:00.000Z')).toBe('2026-05-03');
    expect(formatReimbursementDate('2026-05-03')).toBe('2026-05-03');
    expect(formatReimbursementDate('')).toBe('-');
    expect(formatReimbursementDate(null)).toBe('-');
    expect(formatReimbursementAmount('123.40')).toBe('¥123.40');
    expect(formatReimbursementAmount(null)).toBe('¥0.00');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('normalizes editable payloads and keeps submitted rows immutable', () => {
    expect(
      normalizeReimbursementPayload({
        title: '  交通报销  ',
        category: ' 差旅 ',
        occurredAt: '2026-05-03',
        amount: '123.4',
        reason: '  客户拜访  ',
        payeeInfo: ' ',
        remark: '  纸质票据已交  ',
      }),
    ).toEqual({
      title: '交通报销',
      category: '差旅',
      occurredAt: '2026-05-03',
      amount: '123.40',
      reason: '客户拜访',
      payeeInfo: null,
      remark: '纸质票据已交',
    });

    expect(isDraftReimbursement({ status: 'DRAFT' })).toBe(true);
    for (const status of ['DEPARTMENT_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED'] as const) {
      expect(isDraftReimbursement({ status })).toBe(false);
    }
  });

  it('does not expose category dictionaries, export, OCR or review helpers', () => {
    expect('REIMBURSEMENT_CATEGORY_OPTIONS' in reimbursementTypes).toBe(false);
    expect('REIMBURSEMENT_EXPORT_KEYS' in reimbursementTypes).toBe(false);
    expect('REIMBURSEMENT_OCR_KEYS' in reimbursementTypes).toBe(false);
    expect('REIMBURSEMENT_REVIEW_ACTIONS' in reimbursementTypes).toBe(false);
  });
});
