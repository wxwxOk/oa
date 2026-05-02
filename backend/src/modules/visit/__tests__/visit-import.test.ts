import { describe, expect, it } from 'bun:test';

import { validateVisitImportRows, visitImportBody } from '../visit.route';

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

describe('visit import contract', () => {
  it('requires a rows payload for normalized visit imports', () => {
    expect(schemaPropertyNames(visitImportBody)).toEqual(['rows']);
  });

  it('normalizes valid rows, preserves duplicates and derives creatorId from currentUser', () => {
    const result = validateVisitImportRows(
      {
        rows: [
          {
            name: '  张三  ',
            age: 18,
            channelPartner: '渠道 A',
            receptionDate: '2026-05-01',
            trialDate: '2026-05-02',
            creatorId: 999,
          },
          {
            name: '张三',
            age: 18,
            channelPartner: '渠道 A',
            receptionDate: '2026-05-01',
            trialDate: '2026-05-02',
          },
        ],
      },
      7,
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ name: '张三', age: 18, channelPartner: '渠道 A', creatorId: 7 });
    expect(result.rows[1]).toMatchObject({ name: '张三', age: 18, channelPartner: '渠道 A', creatorId: 7 });
    expect(result.rows[0].receptionDate).toBeInstanceOf(Date);
    expect(result.rows[0].trialDate).toBeInstanceOf(Date);
  });

  it('rejects the whole batch with row-level validation errors', () => {
    expect(() =>
      validateVisitImportRows(
        {
          rows: [
            { name: '   ', age: 18 },
            { name: '李四', age: 18.5 },
            { name: '王五', receptionDate: 'not-a-date', trialDate: '2026-99-99' },
          ],
        },
        7,
      ),
    ).toThrow(/第 1 行.*姓名.*第 2 行.*年龄.*第 3 行.*接待日期.*试听课时间/);
  });

  it('pins import route behavior to JSON rows and current user attribution', async () => {
    const source = await Bun.file(new URL('../visit.route.ts', import.meta.url)).text();

    expect(source).toContain("authGuard('visit:import')");
    expect(source).toContain('validateVisitImportRows');
    expect(source).toContain('creatorId: currentUser.id');
    expect(source).toContain('createdCount');
    expect(source).not.toMatch(/xlsx|excel|upload|multer|upsert|skipDuplicates/);
  });
});
