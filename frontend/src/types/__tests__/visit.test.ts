import { describe, expect, it } from 'vitest';

import * as visitTypes from '../visit';
import {
  VISIT_IMPORT_HEADERS,
  VISIT_FILTER_OPTION_KEYS,
  VISIT_LIST_FILTER_KEYS,
  VISIT_WRITE_PAYLOAD_KEYS,
  createEmptyVisitFilters,
  formatVisitRate,
  formatVisitDate,
  normalizeVisitPayload,
  type VisitImportPayload,
  type VisitImportPreview,
  type VisitImportResponse,
  type VisitStats,
} from '../visit';

describe('visit type helpers', () => {
  it('pins write payload keys to the Phase 20 backend schema', () => {
    expect(VISIT_WRITE_PAYLOAD_KEYS).toEqual([
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
    ]);

    for (const trustedKey of ['id', 'creatorId', 'creator', 'createdAt', 'updatedAt']) {
      expect(VISIT_WRITE_PAYLOAD_KEYS).not.toContain(trustedKey);
    }
  });

  it('pins list filters and backend distinct option keys', () => {
    expect(VISIT_LIST_FILTER_KEYS).toEqual([
      'keyword',
      'channelPartner',
      'consultant',
      'receptionist',
      'receptionStatus',
      'consultationStatus',
      'statusCategory',
      'dateFrom',
      'dateTo',
    ]);

    expect(createEmptyVisitFilters()).toEqual({
      keyword: '',
      channelPartner: '',
      consultant: '',
      receptionist: '',
      receptionStatus: '',
      consultationStatus: '',
      statusCategory: '',
      dateFrom: '',
      dateTo: '',
    });

    expect(VISIT_FILTER_OPTION_KEYS).toEqual([
      'channelPartners',
      'consultants',
      'receptionists',
      'receptionStatuses',
      'consultationStatuses',
      'statusCategories',
    ]);
  });

  it('formats business dates without locale or timezone drift', () => {
    expect(formatVisitDate('2026-05-02T08:30:00.000Z')).toBe('2026-05-02');
    expect(formatVisitDate('2026-05-02')).toBe('2026-05-02');
    expect(formatVisitDate('')).toBe('-');
    expect(formatVisitDate(null)).toBe('-');
  });

  it('normalizes editable payloads and excludes out-of-scope helpers', () => {
    expect(
      normalizeVisitPayload({
        name: '  张三  ',
        age: 12,
        education: ' ',
        gender: ' 女 ',
        channelPartner: '',
        consultant: ' 李老师 ',
        receptionStatus: '',
        receptionist: ' ',
        receptionDate: '',
        consultationStatus: ' 已咨询 ',
        statusCategory: '',
        statusDescription: ' 需要跟进 ',
        trialStatus: '',
        solution: ' ',
        trialDate: '',
      }),
    ).toEqual({
      name: '张三',
      age: 12,
      education: null,
      gender: '女',
      channelPartner: null,
      consultant: '李老师',
      receptionStatus: null,
      receptionist: null,
      receptionDate: null,
      consultationStatus: '已咨询',
      statusCategory: null,
      statusDescription: '需要跟进',
      trialStatus: null,
      solution: null,
      trialDate: null,
    });

    expect('VISIT_IMPORT_PAYLOAD_KEYS' in visitTypes).toBe(false);
    expect('VISIT_EXPORT_KEYS' in visitTypes).toBe(false);
  });

  it('pins visit stats contracts and rate formatting', () => {
    const stats: VisitStats = {
      total: 10,
      intentCount: 4,
      signedCount: 2,
      intentRate: 40,
      signedRate: 20,
      byChannelPartner: [{ name: '渠道 A', count: 5, total: 5, intentCount: 3, signedCount: 1, intentRate: 60, signedRate: 20 }],
      byConsultant: [{ name: '李老师', count: 4, total: 4, intentCount: 2, signedCount: 1, intentRate: 50, signedRate: 25 }],
      byReceptionist: [{ name: '王老师', count: 3, total: 3, intentCount: 1, signedCount: 1, intentRate: 33.3, signedRate: 33.3 }],
      byReceptionStatus: [{ name: '已接待', count: 8 }],
      byConsultationStatus: [{ name: '明确意向', count: 4 }],
      byStatusCategory: [{ name: '高意向', count: 3 }],
      byTrialStatus: [{ name: '已试听', count: 2 }],
    };

    expect(stats.byChannelPartner[0].total).toBe(5);
    expect(stats.byConsultant[0].intentRate).toBe(50);
    expect(stats.byReceptionist[0].signedRate).toBe(33.3);
    expect(stats.byReceptionStatus[0]).toEqual({ name: '已接待', count: 8 });
    expect(stats.byConsultationStatus[0].name).toBe('明确意向');
    expect(stats.byStatusCategory[0].count).toBe(3);
    expect(stats.byTrialStatus[0].name).toBe('已试听');
    expect(formatVisitRate(12.345)).toBe('12.3%');
    expect(formatVisitRate(0)).toBe('0%');
    expect(formatVisitRate(null)).toBe('0%');
    expect(formatVisitRate(undefined)).toBe('0%');
    expect(formatVisitRate(Number.NaN)).toBe('0%');
    expect('VISIT_STATS_KEYS' in visitTypes).toBe(false);
    expect('VISIT_EXPORT_KEYS' in visitTypes).toBe(false);
  });

  it('pins visit import contracts to the fixed Excel format', () => {
    expect(VISIT_IMPORT_HEADERS).toEqual([
      '姓名',
      '年龄',
      '学历',
      '性别',
      '渠道商',
      '咨询师',
      '接待状态',
      '接待人',
      '接待日期',
      '咨询后状态',
      '状态类别',
      '状态说明',
      '试听课后状态',
      '解决方案',
      '试听课时间',
    ]);

    const payload: VisitImportPayload = { rows: [{ name: '张三', receptionDate: '2026-05-02' }] };
    const response: VisitImportResponse = { createdCount: 1, total: 1 };
    const preview: VisitImportPreview = {
      headerValid: true,
      expectedHeaders: [...VISIT_IMPORT_HEADERS],
      actualHeaders: [...VISIT_IMPORT_HEADERS],
      headerErrors: [],
      validRows: [{ rowNumber: 3, payload: payload.rows[0] }],
      invalidRows: [],
      duplicateWarnings: [],
    };

    expect(payload.rows[0].name).toBe('张三');
    expect(response).toEqual({ createdCount: 1, total: 1 });
    expect(preview.validRows[0].rowNumber).toBe(3);
    expect('VISIT_IMPORT_PAYLOAD_KEYS' in visitTypes).toBe(false);
  });
});
