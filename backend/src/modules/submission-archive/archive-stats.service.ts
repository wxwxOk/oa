import { BizError } from '../../utils/errors';
import {
  listArchiveRecords,
  type ArchiveActor,
  type ArchiveListFilters,
  type ArchiveListItem,
} from './archive.service';

type StatsRowBase = {
  count: number;
};

export type ArchiveStats = {
  byTemplate: Array<StatsRowBase & { templateId: number; templateName: string }>;
  byStatus: Array<StatsRowBase & { status: string }>;
  byMonth: Array<StatsRowBase & { month: string }>;
};

type StatsRecord = {
  templateId: number;
  templateName: string;
  status: string;
  date: Date;
};

function hasPermission(actor: ArchiveActor, permission: string): boolean {
  return actor.roleCodes?.includes('ADMIN') === true || actor.permissions.includes(permission);
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function emptyStatsRow(): StatsRowBase {
  return { count: 0 };
}

function sortByCountThenName<T extends StatsRowBase>(rows: T[], getName: (row: T) => string): T[] {
  return rows.sort((a, b) => b.count - a.count || getName(a).localeCompare(getName(b), 'zh-CN'));
}

function aggregateStats(records: StatsRecord[]): ArchiveStats {
  const byTemplate = new Map<number, StatsRowBase & { templateId: number; templateName: string }>();
  const byStatus = new Map<string, StatsRowBase & { status: string }>();
  const byMonth = new Map<string, StatsRowBase & { month: string }>();

  for (const record of records) {
    const template = byTemplate.get(record.templateId) ?? {
      ...emptyStatsRow(),
      templateId: record.templateId,
      templateName: record.templateName,
    };
    template.count += 1;
    byTemplate.set(record.templateId, template);

    const status = byStatus.get(record.status) ?? { ...emptyStatsRow(), status: record.status };
    status.count += 1;
    byStatus.set(record.status, status);

    const month = monthKey(record.date);
    const monthly = byMonth.get(month) ?? { ...emptyStatsRow(), month };
    monthly.count += 1;
    byMonth.set(month, monthly);
  }

  return {
    byTemplate: sortByCountThenName(Array.from(byTemplate.values()), (row) => row.templateName),
    byStatus: sortByCountThenName(Array.from(byStatus.values()), (row) => row.status),
    byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

async function listAllVisibleArchiveRows(
  actor: ArchiveActor,
  filters: ArchiveListFilters,
): Promise<ArchiveListItem[]> {
  const rows: ArchiveListItem[] = [];
  for (let page = 1; ; page += 1) {
    const result = await listArchiveRecords(actor, { ...filters, page, size: 100 });
    rows.push(...result.rows);
    if (rows.length >= result.total || result.rows.length === 0) break;
  }
  return rows;
}

function toStatsRecord(row: ArchiveListItem): StatsRecord {
  return {
    templateId: row.templateId,
    templateName: row.templateName,
    status: row.status,
    date: row.updatedAt,
  };
}

export async function getArchiveStats(
  actor: ArchiveActor,
  filters: ArchiveListFilters = {},
): Promise<ArchiveStats> {
  if (!hasPermission(actor, 'form:archive:stats')) {
    throw new BizError('缺少权限: form:archive:stats', 403, 'FORBIDDEN');
  }

  const rows = await listAllVisibleArchiveRows(actor, filters);
  return aggregateStats(rows.map(toStatsRecord));
}
