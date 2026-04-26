import { BizError } from '../../utils/errors';
import {
  listArchiveRecords,
  type ArchiveActor,
  type ArchiveListFilters,
  type ArchiveListItem,
  type ArchiveSourceTypeParam,
} from './archive.service';

type ArchiveStatsActor = ArchiveActor & {
  departmentId?: number | null;
};

type StatsSourceType = ArchiveSourceTypeParam;

type StatsRowBase = {
  count: number;
  approvalCount: number;
  collectionCount: number;
};

export type ArchiveStats = {
  byTemplate: Array<StatsRowBase & { templateId: number; templateName: string }>;
  byStatus: Array<StatsRowBase & { status: string }>;
  byDepartment: Array<StatsRowBase & { departmentId: number | null; departmentName: string | null }>;
  byMonth: Array<StatsRowBase & { month: string }>;
  bySourceType: Array<StatsRowBase & { sourceType: StatsSourceType }>;
};

type StatsRecord = {
  sourceType: StatsSourceType;
  templateId: number;
  templateName: string;
  departmentId: number | null;
  departmentName: string | null;
  status: string;
  date: Date;
};

function hasPermission(actor: ArchiveStatsActor, permission: string): boolean {
  return actor.roleCodes?.includes('ADMIN') === true || actor.permissions.includes(permission);
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function incrementSplit(target: StatsRowBase, sourceType: StatsSourceType): void {
  target.count += 1;
  if (sourceType === 'approval') target.approvalCount += 1;
  if (sourceType === 'collection') target.collectionCount += 1;
}

function emptyStatsRow(): StatsRowBase {
  return { count: 0, approvalCount: 0, collectionCount: 0 };
}

function sortByCountThenName<T extends StatsRowBase>(rows: T[], getName: (row: T) => string): T[] {
  return rows.sort((a, b) => b.count - a.count || getName(a).localeCompare(getName(b), 'zh-CN'));
}

function aggregateStats(records: StatsRecord[]): ArchiveStats {
  const byTemplate = new Map<number, StatsRowBase & { templateId: number; templateName: string }>();
  const byStatus = new Map<string, StatsRowBase & { status: string }>();
  const byDepartment = new Map<string, StatsRowBase & { departmentId: number | null; departmentName: string | null }>();
  const byMonth = new Map<string, StatsRowBase & { month: string }>();
  const bySourceType = new Map<StatsSourceType, StatsRowBase & { sourceType: StatsSourceType }>();

  for (const record of records) {
    const template = byTemplate.get(record.templateId) ?? {
      ...emptyStatsRow(),
      templateId: record.templateId,
      templateName: record.templateName,
    };
    incrementSplit(template, record.sourceType);
    byTemplate.set(record.templateId, template);

    const status = byStatus.get(record.status) ?? { ...emptyStatsRow(), status: record.status };
    incrementSplit(status, record.sourceType);
    byStatus.set(record.status, status);

    if (record.departmentId !== null) {
      const key = String(record.departmentId);
      const department = byDepartment.get(key) ?? {
        ...emptyStatsRow(),
        departmentId: record.departmentId,
        departmentName: record.departmentName,
      };
      incrementSplit(department, record.sourceType);
      byDepartment.set(key, department);
    }

    const month = monthKey(record.date);
    const monthly = byMonth.get(month) ?? { ...emptyStatsRow(), month };
    incrementSplit(monthly, record.sourceType);
    byMonth.set(month, monthly);

    const sourceType = bySourceType.get(record.sourceType) ?? { ...emptyStatsRow(), sourceType: record.sourceType };
    incrementSplit(sourceType, record.sourceType);
    bySourceType.set(record.sourceType, sourceType);
  }

  return {
    byTemplate: sortByCountThenName(Array.from(byTemplate.values()), (row) => row.templateName),
    byStatus: sortByCountThenName(Array.from(byStatus.values()), (row) => row.status),
    byDepartment: sortByCountThenName(
      Array.from(byDepartment.values()),
      (row) => row.departmentName ?? String(row.departmentId ?? ''),
    ),
    byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    bySourceType: Array.from(bySourceType.values()).sort((a, b) => a.sourceType.localeCompare(b.sourceType)),
  };
}

async function listAllVisibleArchiveRows(
  actor: ArchiveStatsActor,
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
    sourceType: row.sourceType,
    templateId: row.templateId,
    templateName: row.templateName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    status: row.status,
    date: row.updatedAt,
  };
}

export async function getArchiveStats(
  actor: ArchiveStatsActor,
  filters: ArchiveListFilters = {},
): Promise<ArchiveStats> {
  if (!hasPermission(actor, 'approval:archive:stats')) {
    throw new BizError('缺少权限: approval:archive:stats', 403, 'FORBIDDEN');
  }

  const rows = await listAllVisibleArchiveRows(actor, filters);
  return aggregateStats(rows.map(toStatsRecord));
}
