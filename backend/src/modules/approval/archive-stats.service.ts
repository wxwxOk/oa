import type { ApprovalApplicationStatus, Prisma } from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import type { ArchiveActor, ArchiveListFilters, ArchiveSourceTypeParam } from './archive.service';

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

type ApprovalStatsRecord = {
  sourceType: 'approval';
  templateId: number;
  templateName: string;
  departmentId: number | null;
  departmentName: string | null;
  status: string;
  date: Date;
};

type CollectionStatsRecord = {
  sourceType: 'collection';
  templateId: number;
  templateName: string;
  departmentId: null;
  departmentName: null;
  status: 'COLLECTED';
  date: Date;
};

type StatsRecord = ApprovalStatsRecord | CollectionStatsRecord;

const ARCHIVE_APPROVAL_STATUSES: ApprovalApplicationStatus[] = [
  'SUBMITTED',
  'APPROVING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
];

function hasPermission(actor: ArchiveStatsActor, permission: string): boolean {
  return actor.roleCodes?.includes('ADMIN') === true || actor.permissions.includes(permission);
}

function normalizeNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
}

function normalizeSourceType(value: string | undefined): StatsSourceType | undefined {
  if (!value) return undefined;
  if (value === 'approval' || value === 'collection') return value;
  throw new BizError('归档来源类型无效', 400, 'INVALID_ARCHIVE_SOURCE_TYPE');
}

function parseDateBoundary(value: string | undefined, boundary: 'start' | 'end'): Date | undefined {
  if (!value?.trim()) return undefined;

  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BizError('日期格式无效', 400, 'INVALID_DATE_RANGE');
  }
  if (boundary === 'end' && !value.includes('T')) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

async function resolveActorDepartmentId(actor: ArchiveStatsActor): Promise<number | null> {
  if (actor.departmentId !== undefined) return actor.departmentId;

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { departmentId: true },
  });
  if (!user) throw new BizError('当前用户不存在', 403, 'ARCHIVE_ACTOR_NOT_FOUND');
  return user.departmentId;
}

async function buildApprovalWhere(
  actor: ArchiveStatsActor,
  filters: ArchiveListFilters,
): Promise<Prisma.ApprovalApplicationWhereInput | null> {
  const hasAll = hasPermission(actor, 'approval:application:all');
  const hasDepartment = hasPermission(actor, 'approval:application:department');
  if (!hasAll && !hasDepartment) return null;

  const templateId = normalizeNumber(filters.templateId);
  const requestedDepartmentId = normalizeNumber(filters.departmentId);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');
  const where: Prisma.ApprovalApplicationWhereInput = {
    status: { in: ARCHIVE_APPROVAL_STATUSES, not: 'DRAFT' },
  };

  if (!hasAll) {
    const actorDepartmentId = await resolveActorDepartmentId(actor);
    if (!actorDepartmentId) return null;
    if (requestedDepartmentId && requestedDepartmentId !== actorDepartmentId) return null;
    where.applicantDepartmentId = actorDepartmentId;
  } else if (requestedDepartmentId) {
    where.applicantDepartmentId = requestedDepartmentId;
  }
  if (templateId) where.templateId = templateId;
  if (filters.status?.trim()) {
    if (!ARCHIVE_APPROVAL_STATUSES.includes(filters.status as ApprovalApplicationStatus)) return null;
    where.status = filters.status as ApprovalApplicationStatus;
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return where;
}

function buildCollectionWhere(filters: ArchiveListFilters): Prisma.SubmissionWhereInput | null {
  const templateId = normalizeNumber(filters.templateId);
  const departmentId = normalizeNumber(filters.departmentId);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');

  if (departmentId) return null;
  if (filters.status?.trim() && filters.status.trim() !== 'COLLECTED') return null;

  return {
    ...(templateId ? { templateId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };
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

export async function getArchiveStats(
  actor: ArchiveStatsActor,
  filters: ArchiveListFilters = {},
): Promise<ArchiveStats> {
  if (!hasPermission(actor, 'approval:archive:stats')) {
    throw new BizError('缺少权限: approval:archive:stats', 403, 'FORBIDDEN');
  }

  const requestedSourceType = normalizeSourceType(filters.sourceType);
  const records: StatsRecord[] = [];

  if (!requestedSourceType || requestedSourceType === 'approval') {
    const approvalWhere = await buildApprovalWhere(actor, filters);
    if (approvalWhere) {
      const approvals = await prisma.approvalApplication.findMany({
        where: approvalWhere,
        select: {
          templateId: true,
          templateName: true,
          applicantDepartmentId: true,
          applicantDepartmentName: true,
          status: true,
          createdAt: true,
        },
      });
      records.push(
        ...approvals.map((row) => ({
          sourceType: 'approval' as const,
          templateId: row.templateId,
          templateName: row.templateName,
          departmentId: row.applicantDepartmentId,
          departmentName: row.applicantDepartmentName,
          status: row.status,
          date: row.createdAt,
        })),
      );
    }
  }

  if ((!requestedSourceType || requestedSourceType === 'collection') && hasPermission(actor, 'form:submission:list')) {
    const collectionWhere = buildCollectionWhere(filters);
    if (collectionWhere) {
      const submissions = await prisma.submission.findMany({
        where: collectionWhere,
        select: {
          templateId: true,
          createdAt: true,
          template: { select: { name: true } },
        },
      });
      records.push(
        ...submissions.map((row) => ({
          sourceType: 'collection' as const,
          templateId: row.templateId,
          templateName: row.template.name,
          departmentId: null,
          departmentName: null,
          status: 'COLLECTED' as const,
          date: row.createdAt,
        })),
      );
    }
  }

  return aggregateStats(records);
}
