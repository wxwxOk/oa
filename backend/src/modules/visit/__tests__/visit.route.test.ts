import { describe, expect, it } from 'bun:test';

import {
  buildVisitOrderBy,
  serializeVisitListResponse,
  visitFilterOptionKeys,
  visitListQuery,
  visitModule,
  visitWriteBody,
} from '../visit.route';

const trustedFields = ['id', 'creatorId', 'creator', 'createdAt', 'updatedAt'];
const writableFields = [
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
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function routeSignatures() {
  return (visitModule.routes ?? [])
    .map((route: { method: string; path: string }) => {
      const path = route.path.replace(/^\/visits/, '') || '/';
      return `${route.method} ${path}`;
    })
    .filter((signature) => !signature.startsWith('HEAD '));
}

function makeVisitRow() {
  return {
    id: 1,
    name: '张三',
    age: 18,
    education: '本科',
    gender: '女',
    channelPartner: '渠道 A',
    consultant: '咨询师 A',
    receptionStatus: '已接待',
    receptionist: '接待人 A',
    receptionDate: new Date('2026-05-01T08:00:00.000Z'),
    consultationStatus: '有意向',
    statusCategory: '意向',
    statusDescription: '待跟进',
    trialStatus: '已试听',
    solution: '方案 A',
    trialDate: new Date('2026-05-02T08:00:00.000Z'),
    creatorId: 7,
    creator: { id: 7, realName: '创建人' },
    createdAt: new Date('2026-05-01T09:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  };
}

describe('visit route contract', () => {
  it('exports the visit module under /visits', () => {
    expect(visitModule.config.prefix).toBe('/visits');
  });

  it('declares static visit routes before the detail route', () => {
    const signatures = routeSignatures();

    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /',
        'GET /filter-options',
        'GET /stats',
        'GET /:id',
        'POST /',
        'PUT /:id',
        'DELETE /:id',
        'POST /import',
      ]),
    );

    const detailIndex = signatures.indexOf('GET /:id');
    expect(signatures.indexOf('GET /filter-options')).toBeLessThan(detailIndex);
    expect(signatures.indexOf('GET /stats')).toBeLessThan(detailIndex);
    expect(signatures.indexOf('POST /import')).toBeLessThan(detailIndex);
  });

  it('exposes list query filters for Phase 21 table screens', () => {
    expect(schemaPropertyNames(visitListQuery)).toEqual(
      expect.arrayContaining([
        'page',
        'size',
        'sortBy',
        'descending',
        'keyword',
        'name',
        'channelPartner',
        'consultant',
        'receptionist',
        'receptionStatus',
        'consultationStatus',
        'statusCategory',
        'dateFrom',
        'dateTo',
      ]),
    );
  });

  it('builds safe list ordering for visit table sorting', () => {
    expect(buildVisitOrderBy({})).toEqual([{ receptionDate: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]);
    expect(buildVisitOrderBy({ sortBy: 'receptionDate', descending: 'false' })).toEqual([
      { receptionDate: { sort: 'asc', nulls: 'last' } },
      { id: 'desc' },
    ]);
    expect(buildVisitOrderBy({ sortBy: 'updatedAt', descending: true })).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }]);
    expect(buildVisitOrderBy({ sortBy: 'name', descending: 'false' })).toEqual([
      { receptionDate: { sort: 'asc', nulls: 'last' } },
      { id: 'desc' },
    ]);
  });

  it('hardens write schemas against trusted-field tampering', () => {
    expect(schemaPropertyNames(visitWriteBody)).toEqual(writableFields);
    expect((visitWriteBody as { additionalProperties?: boolean }).additionalProperties).toBe(false);

    for (const field of trustedFields) {
      expect(schemaPropertyNames(visitWriteBody)).not.toContain(field);
    }
  });

  it('serializes list responses as rows/total/page/size', () => {
    expect(serializeVisitListResponse({ rows: [makeVisitRow()], total: 1, page: 2, size: 10 })).toEqual({
      rows: [
        expect.objectContaining({
          id: 1,
          name: '张三',
          receptionDate: '2026-05-01T08:00:00.000Z',
          trialDate: '2026-05-02T08:00:00.000Z',
          createdAt: '2026-05-01T09:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        }),
      ],
      total: 1,
      page: 2,
      size: 10,
    });
  });

  it('pins route permissions and filter-options response keys', async () => {
    const source = await Bun.file(new URL('../visit.route.ts', import.meta.url)).text();

    expect(source).toContain("authGuard('visit:list')");
    expect(source).toContain("authGuard('visit:create')");
    expect(source).toContain("authGuard('visit:update')");
    expect(source).toContain("authGuard('visit:delete')");
    expect(source).toContain("authGuard('visit:import')");
    expect(source).toContain("authGuard('visit:stats')");
    expect(source).toContain('dateTo + \'T23:59:59.999Z\'');
    expect(source).not.toMatch(/creatorId\s*:\s*body|data:\s*body/);
    expect(visitFilterOptionKeys).toEqual([
      'channelPartners',
      'consultants',
      'receptionists',
      'receptionStatuses',
      'consultationStatuses',
      'statusCategories',
    ]);
  });
});
