import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';

type VisitWriteValue = string | number | Date | null | undefined;
type VisitWriteInput = Record<string, VisitWriteValue>;
export type VisitStatsRow = {
  channelPartner?: string | null;
  consultant?: string | null;
  receptionist?: string | null;
  receptionStatus?: string | null;
  consultationStatus?: string | null;
  statusCategory?: string | null;
  trialStatus?: string | null;
};
export interface VisitStatsDimensionRow {
  name: string;
  count: number;
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
}

export interface VisitStatsDistributionRow {
  name: string;
  count: number;
}

export interface VisitStatsResponse {
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
  byChannelPartner: VisitStatsDimensionRow[];
  byConsultant: VisitStatsDimensionRow[];
  byReceptionist: VisitStatsDimensionRow[];
  byReceptionStatus: VisitStatsDistributionRow[];
  byConsultationStatus: VisitStatsDistributionRow[];
  byStatusCategory: VisitStatsDistributionRow[];
  byTrialStatus: VisitStatsDistributionRow[];
}

export const VISIT_STATS_EMPTY_BUCKET = '未填写';

const optionalString = () => t.Optional(t.Union([t.String(), t.Null()]));
const optionalDateString = () => t.Optional(t.Union([t.String(), t.Date(), t.Null()]));

export const visitListQuery = t.Object({
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  keyword: t.Optional(t.String()),
  name: t.Optional(t.String()),
  channelPartner: t.Optional(t.String()),
  consultant: t.Optional(t.String()),
  receptionist: t.Optional(t.String()),
  receptionStatus: t.Optional(t.String()),
  consultationStatus: t.Optional(t.String()),
  statusCategory: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

export const visitWriteBody = t.Object(
  {
    name: t.String({ minLength: 1 }),
    age: t.Optional(t.Union([t.Number(), t.Null()])),
    education: optionalString(),
    gender: optionalString(),
    channelPartner: optionalString(),
    consultant: optionalString(),
    receptionStatus: optionalString(),
    receptionist: optionalString(),
    receptionDate: optionalDateString(),
    consultationStatus: optionalString(),
    statusCategory: optionalString(),
    statusDescription: optionalString(),
    trialStatus: optionalString(),
    solution: optionalString(),
    trialDate: optionalDateString(),
  },
  { additionalProperties: false },
);

export const visitImportBody = t.Object(
  {
    rows: t.Array(visitWriteBody),
  },
  { additionalProperties: false },
);

export const visitFilterOptionKeys = [
  'channelPartners',
  'consultants',
  'receptionists',
  'receptionStatuses',
  'consultationStatuses',
  'statusCategories',
];

const stringFields = [
  'education',
  'gender',
  'channelPartner',
  'consultant',
  'receptionStatus',
  'receptionist',
  'consultationStatus',
  'statusCategory',
  'statusDescription',
  'trialStatus',
  'solution',
] as const;

function visitRecord() {
  return (prisma as any).visitRecord;
}

function normalizeOptionalString(value: VisitWriteValue): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeRequiredName(value: VisitWriteValue): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw new BizError('姓名不能为空');
  return name;
}

function normalizeAge(value: VisitWriteValue): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new BizError('年龄必须是整数');
  return value;
}

function normalizeDate(value: VisitWriteValue, label: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new BizError(`${label}必须是有效日期`);
  return date;
}

function pickVisitWriteData(input: VisitWriteInput, creatorId?: number) {
  const data: Record<string, unknown> = { name: normalizeRequiredName(input.name) };
  const age = normalizeAge(input.age);
  if (age !== undefined) data.age = age;
  for (const field of stringFields) {
    const value = normalizeOptionalString(input[field]);
    if (value !== undefined) data[field] = value;
  }
  const receptionDate = normalizeDate(input.receptionDate, '接待日期');
  const trialDate = normalizeDate(input.trialDate, '试听课时间');
  if (receptionDate !== undefined) data.receptionDate = receptionDate;
  if (trialDate !== undefined) data.trialDate = trialDate;
  if (creatorId !== undefined) data.creatorId = creatorId;
  return data;
}

function toIso(value: Date | string | null | undefined) {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeVisit(row: any) {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    education: row.education,
    gender: row.gender,
    channelPartner: row.channelPartner,
    consultant: row.consultant,
    receptionStatus: row.receptionStatus,
    receptionist: row.receptionist,
    receptionDate: toIso(row.receptionDate),
    consultationStatus: row.consultationStatus,
    statusCategory: row.statusCategory,
    statusDescription: row.statusDescription,
    trialStatus: row.trialStatus,
    solution: row.solution,
    trialDate: toIso(row.trialDate),
    creatorId: row.creatorId,
    creator: row.creator ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function serializeVisitListResponse(response: { rows: any[]; total: number; page: number; size: number }) {
  return {
    rows: response.rows.map(serializeVisit),
    total: response.total,
    page: response.page,
    size: response.size,
  };
}

function appendImportValidation(errors: string[], rowNumber: number, field: string, message: string) {
  errors.push(`第 ${rowNumber} 行 ${field}${message}`);
}

export function validateVisitImportRows(body: unknown, creatorId: number) {
  const rows = (body as { rows?: VisitWriteInput[] })?.rows;
  if (!Array.isArray(rows)) throw new BizError('rows 必须是数组');

  const errors: string[] = [];
  const normalizedRows = rows.map((row, index) => {
    const rowNumber = index + 1;
    const normalized: Record<string, unknown> = {};

    try {
      normalized.name = normalizeRequiredName(row.name);
    } catch {
      appendImportValidation(errors, rowNumber, '姓名', '不能为空');
    }

    try {
      const age = normalizeAge(row.age);
      if (age !== undefined) normalized.age = age;
    } catch {
      appendImportValidation(errors, rowNumber, '年龄', '必须是整数');
    }

    for (const field of stringFields) {
      const value = normalizeOptionalString(row[field]);
      if (value !== undefined) normalized[field] = value;
    }

    try {
      const receptionDate = normalizeDate(row.receptionDate, '接待日期');
      if (receptionDate !== undefined) normalized.receptionDate = receptionDate;
    } catch {
      appendImportValidation(errors, rowNumber, '接待日期', '必须是有效日期');
    }

    try {
      const trialDate = normalizeDate(row.trialDate, '试听课时间');
      if (trialDate !== undefined) normalized.trialDate = trialDate;
    } catch {
      appendImportValidation(errors, rowNumber, '试听课时间', '必须是有效日期');
    }

    normalized.creatorId = creatorId;
    return normalized;
  });

  if (errors.length > 0) throw new BizError(errors.join('；'));
  return { rows: normalizedRows };
}

function textFromVisit(visit: Partial<VisitStatsRow>) {
  return [visit.consultationStatus, visit.statusCategory, visit.trialStatus]
    .filter(Boolean)
    .join(' ');
}

export function isIntentVisit(visit: Partial<VisitStatsRow>) {
  const text = textFromVisit(visit);
  if (/无效|流失|放弃|未试听/.test(text)) return false;
  return /意向|签约|成交|已试听/.test(text);
}

export function isSignedVisit(visit: Partial<VisitStatsRow>) {
  const text = textFromVisit(visit);
  if (/未签|未成交|未试听/.test(text)) return false;
  return /签约|成交|报名|缴费/.test(text);
}

function normalizeStatsGroupName(value: string | null | undefined) {
  const name = value?.trim();
  return name || VISIT_STATS_EMPTY_BUCKET;
}

function buildVisitRate(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function sortByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, 'zh-Hans-CN');
}

function groupVisitDimension(rows: VisitStatsRow[], field: keyof VisitStatsRow): VisitStatsDimensionRow[] {
  const groups = new Map<string, VisitStatsRow[]>();
  for (const row of rows) {
    const name = normalizeStatsGroupName(row[field]);
    const group = groups.get(name);
    if (group) group.push(row);
    else groups.set(name, [row]);
  }
  return Array.from(groups.entries())
    .map(([name, groupRows]) => {
      const total = groupRows.length;
      const intentCount = groupRows.filter(isIntentVisit).length;
      const signedCount = groupRows.filter(isSignedVisit).length;
      return {
        name,
        count: total,
        total,
        intentCount,
        signedCount,
        intentRate: buildVisitRate(intentCount, total),
        signedRate: buildVisitRate(signedCount, total),
      };
    })
    .sort((a, b) => b.total - a.total || sortByName(a, b));
}

function groupVisitDistribution(rows: VisitStatsRow[], field: keyof VisitStatsRow): VisitStatsDistributionRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = normalizeStatsGroupName(row[field]);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || sortByName(a, b));
}

export function buildVisitStats(rows: VisitStatsRow[]): VisitStatsResponse {
  const total = rows.length;
  const intentCount = rows.filter(isIntentVisit).length;
  const signedCount = rows.filter(isSignedVisit).length;
  return {
    total,
    intentCount,
    signedCount,
    intentRate: buildVisitRate(intentCount, total),
    signedRate: buildVisitRate(signedCount, total),
    byChannelPartner: groupVisitDimension(rows, 'channelPartner'),
    byConsultant: groupVisitDimension(rows, 'consultant'),
    byReceptionist: groupVisitDimension(rows, 'receptionist'),
    byReceptionStatus: groupVisitDistribution(rows, 'receptionStatus'),
    byConsultationStatus: groupVisitDistribution(rows, 'consultationStatus'),
    byStatusCategory: groupVisitDistribution(rows, 'statusCategory'),
    byTrialStatus: groupVisitDistribution(rows, 'trialStatus'),
  };
}

function buildDateFilter(query: any) {
  if (!query.dateFrom && !query.dateTo) return undefined;
  return {
    ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
    ...(query.dateTo && { lte: new Date(query.dateTo + 'T23:59:59.999Z') }),
  };
}

function buildVisitWhere(query: any) {
  const where: Record<string, unknown> = {};
  if (query.keyword) {
    where.OR = [
      { name: { contains: query.keyword, mode: 'insensitive' } },
      { channelPartner: { contains: query.keyword, mode: 'insensitive' } },
      { consultant: { contains: query.keyword, mode: 'insensitive' } },
      { receptionist: { contains: query.keyword, mode: 'insensitive' } },
    ];
  }
  for (const field of ['name', 'channelPartner', 'consultant', 'receptionist', 'receptionStatus', 'consultationStatus', 'statusCategory']) {
    if (query[field]) where[field] = { contains: query[field], mode: 'insensitive' };
  }
  const dateFilter = buildDateFilter(query);
  if (dateFilter) where.receptionDate = dateFilter;
  return where;
}

async function distinctValues(field: string) {
  const rows = await visitRecord().findMany({
    where: { [field]: { not: null } },
    select: { [field]: true },
    distinct: [field],
    orderBy: { [field]: 'asc' },
  });
  return rows.map((row: Record<string, string | null>) => row[field]?.trim()).filter(Boolean);
}

const visitSelect = {
  id: true,
  name: true,
  age: true,
  education: true,
  gender: true,
  channelPartner: true,
  consultant: true,
  receptionStatus: true,
  receptionist: true,
  receptionDate: true,
  consultationStatus: true,
  statusCategory: true,
  statusDescription: true,
  trialStatus: true,
  solution: true,
  trialDate: true,
  creatorId: true,
  creator: { select: { id: true, realName: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export const visitModule = new Elysia({ prefix: '/visits' })
  .guard({}, (app) =>
    app
      .use(authGuard('visit:list'))
      .get(
        '/',
        async ({ query }: any) => {
          const page = Math.max(Number(query.page) || 1, 1);
          const size = Math.min(Math.max(Number(query.size) || 20, 1), 100);
          const where = buildVisitWhere(query);
          const [rows, total] = await Promise.all([
            visitRecord().findMany({
              where,
              select: visitSelect,
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * size,
              take: size,
            }),
            visitRecord().count({ where }),
          ]);

          return serializeVisitListResponse({ rows, total, page, size });
        },
        { query: visitListQuery },
      )
      .get('/filter-options', async () => ({
        channelPartners: await distinctValues('channelPartner'),
        consultants: await distinctValues('consultant'),
        receptionists: await distinctValues('receptionist'),
        receptionStatuses: await distinctValues('receptionStatus'),
        consultationStatuses: await distinctValues('consultationStatus'),
        statusCategories: await distinctValues('statusCategory'),
      })),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('visit:stats'))
      .get(
        '/stats',
        async ({ query }: any) => {
          const dateFilter = buildDateFilter(query);
          const rows = await visitRecord().findMany({
            where: dateFilter ? { receptionDate: dateFilter } : {},
            select: {
              channelPartner: true,
              consultant: true,
              receptionist: true,
              receptionStatus: true,
              consultationStatus: true,
              statusCategory: true,
              trialStatus: true,
            },
          });
          return buildVisitStats(rows);
        },
        { query: visitListQuery },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('visit:import'))
      .post(
        '/import',
        async ({ body, currentUser }: any) => {
          const { rows } = validateVisitImportRows(body, currentUser.id);
          const rowsWithCreator = rows.map((row) => ({ ...row, creatorId: currentUser.id }));
          await visitRecord().createMany({ data: rowsWithCreator });
          return { createdCount: rowsWithCreator.length, total: rowsWithCreator.length };
        },
        { body: visitImportBody },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard('visit:list')).get('/:id', async ({ params }: any) => {
      const row = await visitRecord().findUnique({ where: { id: Number(params.id) }, select: visitSelect });
      if (!row) throw notFound('到访记录不存在');
      return serializeVisit(row);
    }),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('visit:create'))
      .post(
        '/',
        async ({ body, currentUser }: any) => {
          const row = await visitRecord().create({
            data: pickVisitWriteData(body, currentUser.id),
            select: visitSelect,
          });
          return serializeVisit(row);
        },
        { body: visitWriteBody },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('visit:update'))
      .put(
        '/:id',
        async ({ params, body }: any) => {
          const id = Number(params.id);
          const exists = await visitRecord().findUnique({ where: { id } });
          if (!exists) throw notFound('到访记录不存在');
          const row = await visitRecord().update({
            where: { id },
            data: pickVisitWriteData(body),
            select: visitSelect,
          });
          return serializeVisit(row);
        },
        { body: visitWriteBody },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard('visit:delete')).delete('/:id', async ({ params }: any) => {
      const id = Number(params.id);
      const exists = await visitRecord().findUnique({ where: { id } });
      if (!exists) throw notFound('到访记录不存在');
      await visitRecord().delete({ where: { id } });
      return { ok: true };
    }),
  );
