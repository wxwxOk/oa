import { describe, expect, it } from 'bun:test';

import { buildVisitStats, isIntentVisit, isSignedVisit, type VisitStatsDistributionRow, type VisitStatsRow } from '../visit.route';

function findByName<T extends { name: string }>(rows: T[], name: string) {
  const row = rows.find((item) => item.name === name);
  expect(row).toBeDefined();
  return row as T;
}

function expectDistributionShape(row: VisitStatsDistributionRow) {
  expect(Object.keys(row).sort()).toEqual(['count', 'name']);
}

describe('visit stats contract', () => {
  it('uses conservative string checks for intent and signed counts', () => {
    for (const text of ['明确意向', '已签约', '已成交', '已试听']) {
      expect(isIntentVisit({ consultationStatus: text })).toBe(true);
    }

    for (const text of ['无效', '流失', '放弃', '未试听']) {
      expect(isIntentVisit({ consultationStatus: text })).toBe(false);
    }

    for (const text of ['已签约', '已成交', '报名完成', '已缴费']) {
      expect(isSignedVisit({ consultationStatus: text })).toBe(true);
    }

    for (const text of ['未签', '未成交', '未试听']) {
      expect(isSignedVisit({ consultationStatus: text })).toBe(false);
    }
  });

  it('returns empty stats with zero rates', () => {
    expect(buildVisitStats([])).toEqual({
      total: 0,
      intentCount: 0,
      signedCount: 0,
      intentRate: 0,
      signedRate: 0,
      byChannelPartner: [],
      byConsultant: [],
      byReceptionist: [],
      byReceptionStatus: [],
      byConsultationStatus: [],
      byStatusCategory: [],
      byTrialStatus: [],
    });
  });

  it('groups stats by channel, person and status dimensions', () => {
    const rows: VisitStatsRow[] = [
      {
        channelPartner: '渠道 A',
        consultant: '咨询师 A',
        receptionist: '接待人 A',
        receptionStatus: '已接待',
        consultationStatus: '明确意向',
        statusCategory: '意向',
        trialStatus: '已试听',
      },
      {
        channelPartner: '渠道 A',
        consultant: '咨询师 B',
        receptionist: '接待人 A',
        receptionStatus: '已接待',
        consultationStatus: '已签约',
        statusCategory: '已签约',
        trialStatus: null,
      },
      {
        channelPartner: '',
        consultant: null,
        receptionist: '接待人 B',
        receptionStatus: '未到访',
        consultationStatus: '无效',
        statusCategory: null,
        trialStatus: '未试听',
      },
      {
        channelPartner: '  ',
        consultant: '咨询师 B',
        receptionist: ' ',
        receptionStatus: null,
        consultationStatus: '意向待跟进',
        statusCategory: null,
        trialStatus: null,
      },
    ];

    const stats = buildVisitStats(rows);

    expect(stats.total).toBe(4);
    expect(stats.intentCount).toBe(3);
    expect(stats.signedCount).toBe(1);
    expect(stats.intentRate).toBe(75);
    expect(stats.signedRate).toBe(25);

    expect(stats.byChannelPartner[0]).toMatchObject({
      name: '渠道 A',
      count: 2,
      total: 2,
      intentCount: 2,
      signedCount: 1,
      intentRate: 100,
      signedRate: 50,
    });
    expect(findByName(stats.byChannelPartner, '未填写')).toMatchObject({ count: 2, total: 2, intentCount: 1, signedCount: 0 });
    expect(findByName(stats.byConsultant, '咨询师 B')).toMatchObject({ count: 2, total: 2, intentCount: 2, signedCount: 1 });
    expect(findByName(stats.byReceptionist, '未填写')).toMatchObject({ count: 1, total: 1, intentCount: 1, signedCount: 0 });

    expect(stats.byReceptionStatus[0]).toEqual({ name: '已接待', count: 2 });
    expectDistributionShape(findByName(stats.byReceptionStatus, '未填写'));
    expectDistributionShape(findByName(stats.byConsultationStatus, '明确意向'));
    expectDistributionShape(findByName(stats.byStatusCategory, '未填写'));
    expectDistributionShape(findByName(stats.byTrialStatus, '未填写'));
  });

  it('pins stats route to visit:stats permission and receptionDate date filtering', async () => {
    const source = await Bun.file(new URL('../visit.route.ts', import.meta.url)).text();

    expect(source).toContain("authGuard('visit:stats')");
    expect(source).toContain("'/stats'");
    expect(source).toContain('buildDateFilter(query)');
    expect(source).toContain('receptionDate');
    expect(source).toContain('dateFrom');
    expect(source).toContain('dateTo');
    expect(source).toContain("dateTo + 'T23:59:59.999Z'");
    expect(source).toContain('byChannelPartner');
    expect(source).toContain('byConsultant');
    expect(source).toContain('byReceptionist');
    expect(source).toContain('byReceptionStatus');
    expect(source).toContain('byConsultationStatus');
    expect(source).toContain('byStatusCategory');
    expect(source).toContain('byTrialStatus');
  });
});
