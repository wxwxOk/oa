import type {
  ApprovalApplicationStatus,
  ArchiveEventType,
  ArchiveSourceType,
  Prisma,
} from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import { appendApplicationEvent } from './application.service';

export type ArchiveActor = {
  id: number;
  name: string;
  roleCodes?: string[];
  permissions: string[];
};

export type ArchiveSourceTypeParam = 'approval' | 'collection';

export type ArchiveListFilters = {
  page?: number | string;
  size?: number | string;
  sourceType?: ArchiveSourceTypeParam | '' | undefined;
  templateId?: number | string;
  departmentId?: number | string;
  personName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[] | string;
};

export type ArchiveListItem = {
  archiveKey: string;
  sourceType: ArchiveSourceTypeParam;
  sourceId: number;
  archiveNo: string;
  templateId: number;
  templateName: string;
  departmentId: number | null;
  departmentName: string | null;
  personName: string;
  status: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ArchiveNote = {
  id: number;
  comment: string;
  actorId: number | null;
  actorName: string;
  createdAt: Date;
};

export type ArchiveCorrectionHistoryItem = {
  id: number;
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
  actorId: number;
  actorName: string;
  createdAt: Date;
};

export type ArchiveDetailEvent = {
  id: number;
  type: 'MARK' | 'COMMENT' | 'EDIT' | 'PROCESSING';
  title: string;
  comment: string | null;
  sourceType: ArchiveSourceTypeParam;
  sourceId: number;
  actorId: number | null;
  actorName: string;
  createdAt: Date;
  payload?: unknown;
};

export type ArchiveDetail = ArchiveListItem & {
  formData: unknown;
  effectiveData: Record<string, unknown>;
  processingData: Record<string, unknown>;
  schemaSnapshot: unknown;
  notes: ArchiveNote[];
  correctionHistory: ArchiveCorrectionHistoryItem[];
  events: ArchiveDetailEvent[];
};

type CorrectionStore = {
  current: Record<string, unknown>;
  history: ArchiveCorrectionHistoryItem[];
};

type ApprovalArchiveRecord = Prisma.ApprovalApplicationGetPayload<{
  include: {
    archiveMeta: {
      include: {
        events: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }];
        };
      };
    };
    template: {
      select: {
        processingSchema: true;
      };
    };
  };
}>;

type CollectionArchiveRecord = Prisma.SubmissionGetPayload<{
  include: {
    archiveMeta: {
      include: {
        events: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }];
        };
      };
    };
    template: {
      select: {
        name: true;
        schema: true;
        processingSchema: true;
      };
    };
  };
}>;

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const ARCHIVED_APPROVAL_STATUSES: ApprovalApplicationStatus[] = [
  'SUBMITTED',
  'APPROVING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
];
const RECOMMENDED_TAGS = ['待跟进', '已核对', '资料不全', '重点'];

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function hasPermission(actor: ArchiveActor, permission: string): boolean {
  return actor.roleCodes?.includes('ADMIN') === true || actor.permissions.includes(permission);
}

function normalizePage(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function normalizeNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
}

function parseDateBoundary(value: string | undefined, boundary: 'start' | 'end'): Date | undefined {
  if (!value?.trim()) return undefined;

  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BizError('日期格式无效', 400, 'INVALID_DATE_RANGE');
  }

  if (boundary === 'end' && !value.includes('T')) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

function normalizeSourceType(sourceType: string): ArchiveSourceTypeParam {
  if (sourceType === 'approval' || sourceType === 'collection') return sourceType;
  throw new BizError('归档来源类型无效', 400, 'INVALID_ARCHIVE_SOURCE_TYPE');
}

function toPrismaSourceType(sourceType: ArchiveSourceTypeParam): ArchiveSourceType {
  return sourceType === 'approval' ? 'APPROVAL' : 'COLLECTION';
}

function normalizeTagsInput(input: string[] | string | { tags?: string[] } | undefined): string[] {
  const rawTags = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : Array.isArray(input?.tags)
        ? input.tags
        : [];

  const tags: string[] = [];
  for (const raw of rawTags) {
    if (typeof raw !== 'string') continue;
    const tag = raw.trim().slice(0, 20);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 20);
}

function normalizeComment(comment: unknown): string {
  const normalized = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';
  if (!normalized) {
    throw new BizError('备注不能为空', 400, 'ARCHIVE_NOTE_REQUIRED');
  }
  return normalized;
}

function normalizeRecordObject(value: unknown, code: string, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BizError(message, 400, code);
  }
  return value as Record<string, unknown>;
}

function readCorrectionStore(value: unknown): CorrectionStore {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { current: {}, history: [] };
  }

  const candidate = value as { current?: unknown; history?: unknown };
  const current =
    typeof candidate.current === 'object' && candidate.current !== null && !Array.isArray(candidate.current)
      ? (candidate.current as Record<string, unknown>)
      : {};
  const history = Array.isArray(candidate.history)
    ? candidate.history.filter((item): item is ArchiveCorrectionHistoryItem => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ArchiveCorrectionHistoryItem).field === 'string'
        );
      })
    : [];

  return { current, history };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readFieldIdsFromSchema(schema: unknown): Set<string> {
  const result = new Set<string>();
  const candidate = toRecord(schema);
  const items = Array.isArray(candidate.items) ? candidate.items : [];

  const addField = (field: unknown) => {
    const fieldRecord = toRecord(field);
    if (typeof fieldRecord.id === 'string' && fieldRecord.id.trim()) {
      result.add(fieldRecord.id.trim());
    }
  };

  for (const item of items) {
    const itemRecord = toRecord(item);
    if (itemRecord.type === 'row' && Array.isArray(itemRecord.fields)) {
      itemRecord.fields.forEach(addField);
      continue;
    }
    if (itemRecord.type === 'group' && Array.isArray(itemRecord.rows)) {
      for (const row of itemRecord.rows) {
        const rowRecord = toRecord(row);
        if (Array.isArray(rowRecord.fields)) rowRecord.fields.forEach(addField);
      }
    }
  }

  return result;
}

function readFieldIdsFromProcessingSchema(schema: unknown): Set<string> {
  const result = new Set<string>();
  if (!Array.isArray(schema)) return result;
  for (const item of schema) {
    const field = toRecord(item);
    if (typeof field.id === 'string' && field.id.trim()) result.add(field.id.trim());
  }
  return result;
}

function assertKnownFields(keys: string[], knownFieldIds: Set<string>, code: string): void {
  for (const key of keys) {
    if (!knownFieldIds.has(key)) {
      throw new BizError(`未知字段: ${key}`, 400, code);
    }
  }
}

function tagsMatch(recordTags: string[], filterTags: string[]): boolean {
  if (filterTags.length === 0) return true;
  return filterTags.every((tag) => recordTags.includes(tag));
}

async function resolveActorDepartmentId(actor: ArchiveActor): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { departmentId: true },
  });
  if (!user) {
    throw new BizError('当前用户不存在', 403, 'ARCHIVE_ACTOR_NOT_FOUND');
  }
  return user.departmentId;
}

async function buildApprovalWhere(
  actor: ArchiveActor,
  filters: ArchiveListFilters,
): Promise<Prisma.ApprovalApplicationWhereInput | null> {
  const hasAll = hasPermission(actor, 'approval:application:all');
  const hasDepartment = hasPermission(actor, 'approval:application:department');
  if (!hasAll && !hasDepartment) return null;

  const templateId = normalizeNumber(filters.templateId);
  const departmentId = normalizeNumber(filters.departmentId);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');
  const where: Prisma.ApprovalApplicationWhereInput = {
    status: { in: ARCHIVED_APPROVAL_STATUSES },
  };

  if (!hasAll) {
    const actorDepartmentId = await resolveActorDepartmentId(actor);
    if (!actorDepartmentId) return null;
    where.applicantDepartmentId = actorDepartmentId;
  }
  if (templateId) where.templateId = templateId;
  if (departmentId) where.applicantDepartmentId = departmentId;
  if (filters.personName?.trim()) {
    where.applicantName = {
      contains: filters.personName.trim(),
      mode: 'insensitive',
    };
  }
  if (filters.status?.trim()) {
    if (!ARCHIVED_APPROVAL_STATUSES.includes(filters.status as ApprovalApplicationStatus)) return null;
    where.status = filters.status as ApprovalApplicationStatus;
  }
  if (dateFrom || dateTo) {
    where.updatedAt = {
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
  const where: Prisma.SubmissionWhereInput = {};

  if (departmentId) return null;
  if (filters.status?.trim() && filters.status.trim() !== 'COLLECTED') return null;
  if (templateId) where.templateId = templateId;
  if (filters.personName?.trim()) {
    where.submitterName = {
      contains: filters.personName.trim(),
      mode: 'insensitive',
    };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return where;
}

function serializeArchiveEvent(
  event: Prisma.ArchiveEventGetPayload<Record<string, never>>,
): ArchiveDetailEvent {
  const sourceType = event.sourceType === 'APPROVAL' ? 'approval' : 'collection';
  const sourceId = event.approvalApplicationId ?? event.submissionId ?? 0;
  const typeMap: Record<ArchiveEventType, ArchiveDetailEvent['type']> = {
    TAGS_UPDATED: 'MARK',
    NOTE_ADDED: 'COMMENT',
    CONTROLLED_EDIT: 'EDIT',
    PROCESSING_UPDATED: 'PROCESSING',
  };
  const titleMap: Record<ArchiveEventType, string> = {
    TAGS_UPDATED: '更新归档标签',
    NOTE_ADDED: '内部备注',
    CONTROLLED_EDIT: '修正提交数据',
    PROCESSING_UPDATED: '更新处理信息',
  };

  return {
    id: event.id,
    type: typeMap[event.type],
    title: titleMap[event.type],
    comment: event.comment,
    sourceType,
    sourceId,
    actorId: event.actorId,
    actorName: event.actorName,
    createdAt: event.createdAt,
    payload: event.payload,
  };
}

function serializeApprovalRow(record: ApprovalArchiveRecord): ArchiveListItem {
  const tags = record.archiveMeta?.tags ?? [];
  const updatedAt = record.archiveMeta?.updatedAt ?? record.updatedAt;

  return {
    archiveKey: `approval:${record.id}`,
    sourceType: 'approval',
    sourceId: record.id,
    archiveNo: record.applicationNo,
    templateId: record.templateId,
    templateName: record.templateName,
    departmentId: record.applicantDepartmentId,
    departmentName: record.applicantDepartmentName,
    personName: record.applicantName,
    status: record.status,
    tags,
    createdAt: record.createdAt,
    updatedAt,
  };
}

function serializeCollectionRow(record: CollectionArchiveRecord): ArchiveListItem {
  const tags = record.archiveMeta?.tags ?? [];
  const updatedAt = record.archiveMeta?.updatedAt ?? record.createdAt;

  return {
    archiveKey: `collection:${record.id}`,
    sourceType: 'collection',
    sourceId: record.id,
    archiveNo: `COL-${record.id}`,
    templateId: record.templateId,
    templateName: record.template.name,
    departmentId: null,
    departmentName: null,
    personName: record.submitterName ?? record.submitterPhone ?? `收集记录 ${record.id}`,
    status: 'COLLECTED',
    tags,
    createdAt: record.createdAt,
    updatedAt,
  };
}

function serializeApprovalDetail(record: ApprovalArchiveRecord): ArchiveDetail {
  const row = serializeApprovalRow(record);
  const correctionStore = readCorrectionStore(record.archiveMeta?.correctionData);
  const formData = toRecord(record.formData);
  const events = (record.archiveMeta?.events ?? []).map(serializeArchiveEvent);

  return {
    ...row,
    formData,
    effectiveData: { ...formData, ...correctionStore.current },
    processingData: toRecord(record.archiveMeta?.processingData),
    schemaSnapshot: record.schemaSnapshot,
    notes: events
      .filter((event) => event.type === 'COMMENT')
      .map((event) => ({
        id: event.id,
        comment: event.comment ?? '',
        actorId: event.actorId,
        actorName: event.actorName,
        createdAt: event.createdAt,
      })),
    correctionHistory: correctionStore.history,
    events,
  };
}

function serializeCollectionDetail(record: CollectionArchiveRecord): ArchiveDetail {
  const row = serializeCollectionRow(record);
  const correctionStore = readCorrectionStore(record.archiveMeta?.correctionData);
  const formData = toRecord(record.data);
  const events = (record.archiveMeta?.events ?? []).map(serializeArchiveEvent);

  return {
    ...row,
    formData,
    effectiveData: { ...formData, ...correctionStore.current },
    processingData: toRecord(record.archiveMeta?.processingData),
    schemaSnapshot: record.template.schema,
    notes: events
      .filter((event) => event.type === 'COMMENT')
      .map((event) => ({
        id: event.id,
        comment: event.comment ?? '',
        actorId: event.actorId,
        actorName: event.actorName,
        createdAt: event.createdAt,
      })),
    correctionHistory: correctionStore.history,
    events,
  };
}

async function loadApprovalForDetail(actor: ArchiveActor, id: number): Promise<ApprovalArchiveRecord> {
  const where = await buildApprovalWhere(actor, {});
  if (!where) throw new BizError('无权查看归档记录', 403, 'ARCHIVE_RECORD_FORBIDDEN');

  const record = await prisma.approvalApplication.findFirst({
    where: { ...where, id },
    include: {
      archiveMeta: {
        include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      },
      template: { select: { processingSchema: true } },
    },
  });

  if (!record) throw new BizError('无权查看归档记录', 403, 'ARCHIVE_RECORD_FORBIDDEN');
  return record;
}

async function loadCollectionForDetail(actor: ArchiveActor, id: number): Promise<CollectionArchiveRecord> {
  if (!hasPermission(actor, 'form:submission:list')) {
    throw new BizError('无权查看归档记录', 403, 'ARCHIVE_RECORD_FORBIDDEN');
  }

  const record = await prisma.submission.findUnique({
    where: { id },
    include: {
      archiveMeta: {
        include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      },
      template: { select: { name: true, schema: true, processingSchema: true } },
    },
  });

  if (!record) throw new BizError('无权查看归档记录', 403, 'ARCHIVE_RECORD_FORBIDDEN');
  return record;
}

async function ensureArchiveMeta(
  tx: Prisma.TransactionClient,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
) {
  if (sourceType === 'approval') {
    return tx.archiveRecordMeta.upsert({
      where: { approvalApplicationId: sourceId },
      update: {},
      create: {
        sourceType: 'APPROVAL',
        approvalApplicationId: sourceId,
        submissionId: null,
      },
    });
  }

  return tx.archiveRecordMeta.upsert({
    where: { submissionId: sourceId },
    update: {},
    create: {
      sourceType: 'COLLECTION',
      approvalApplicationId: null,
      submissionId: sourceId,
    },
  });
}

async function appendApprovalArchiveEvent(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
  eventType: 'COMMENT' | 'MARK' | 'EDIT',
  title: string,
  comment: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (sourceType !== 'approval') return;

  await appendApplicationEvent({
    applicationId: sourceId,
    actor: { id: actor.id, name: actor.name },
    type: eventType,
    title,
    comment,
    payload: toInputJson({ visibility: 'INTERNAL', ...payload }),
  });
}

export async function listArchiveRecords(actor: ArchiveActor, filters: ArchiveListFilters = {}) {
  const page = normalizePage(filters.page, 1);
  const size = normalizeSize(filters.size, DEFAULT_PAGE_SIZE);
  const requestedSource = filters.sourceType ? normalizeSourceType(filters.sourceType) : undefined;
  const filterTags = normalizeTagsInput(filters.tags);
  const rows: ArchiveListItem[] = [];

  if (!requestedSource || requestedSource === 'approval') {
    const approvalWhere = await buildApprovalWhere(actor, filters);
    if (approvalWhere) {
      const approvals = await prisma.approvalApplication.findMany({
        where: approvalWhere,
        include: {
          archiveMeta: {
            include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
          },
          template: { select: { processingSchema: true } },
        },
      });
      rows.push(
        ...approvals
          .map(serializeApprovalRow)
          .filter((row) => tagsMatch(row.tags, filterTags)),
      );
    }
  }

  if ((!requestedSource || requestedSource === 'collection') && hasPermission(actor, 'form:submission:list')) {
    const collectionWhere = buildCollectionWhere(filters);
    if (collectionWhere) {
      const submissions = await prisma.submission.findMany({
        where: collectionWhere,
        include: {
          archiveMeta: {
            include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
          },
          template: { select: { name: true, schema: true, processingSchema: true } },
        },
      });
      rows.push(
        ...submissions
          .map(serializeCollectionRow)
          .filter((row) => tagsMatch(row.tags, filterTags)),
      );
    }
  }

  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.sourceId - a.sourceId);

  return {
    rows: rows.slice((page - 1) * size, page * size),
    total: rows.length,
    page,
    size,
  };
}

export async function listArchiveMeta(actor: ArchiveActor) {
  const { rows } = await listArchiveRecords(actor, { page: 1, size: MAX_PAGE_SIZE });
  const templates = new Map<number, { label: string; value: number }>();
  const departments = new Map<number, { label: string; value: number }>();
  const tags = new Set<string>(RECOMMENDED_TAGS);

  for (const row of rows) {
    templates.set(row.templateId, { label: row.templateName, value: row.templateId });
    if (row.departmentId) {
      departments.set(row.departmentId, {
        label: row.departmentName ?? `部门 ${row.departmentId}`,
        value: row.departmentId,
      });
    }
    row.tags.forEach((tag) => tags.add(tag));
  }

  return {
    templates: Array.from(templates.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
    departments: Array.from(departments.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
    tags: Array.from(tags),
  };
}

export async function getArchiveDetail(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
): Promise<ArchiveDetail> {
  const normalizedSourceType = normalizeSourceType(sourceType);
  if (normalizedSourceType === 'approval') {
    return serializeApprovalDetail(await loadApprovalForDetail(actor, sourceId));
  }
  return serializeCollectionDetail(await loadCollectionForDetail(actor, sourceId));
}

export async function setArchiveTags(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
  input: string[] | { tags?: string[] },
): Promise<ArchiveDetail> {
  if (!hasPermission(actor, 'approval:archive:mark')) {
    throw new BizError('缺少权限: approval:archive:mark', 403, 'FORBIDDEN');
  }

  const normalizedSourceType = normalizeSourceType(sourceType);
  await getArchiveDetail(actor, normalizedSourceType, sourceId);
  const tags = normalizeTagsInput(input);

  await prisma.$transaction(async (tx) => {
    const metadata = await ensureArchiveMeta(tx, normalizedSourceType, sourceId);
    await tx.archiveRecordMeta.update({
      where: { id: metadata.id },
      data: {
        tags,
      },
    });
    await tx.archiveEvent.create({
      data: {
        metadataId: metadata.id,
        sourceType: toPrismaSourceType(normalizedSourceType),
        approvalApplicationId: normalizedSourceType === 'approval' ? sourceId : null,
        submissionId: normalizedSourceType === 'collection' ? sourceId : null,
        actorId: actor.id,
        actorName: actor.name,
        type: 'TAGS_UPDATED',
        payload: toInputJson({ tags }),
      },
    });
  });

  await appendApprovalArchiveEvent(
    actor,
    normalizedSourceType,
    sourceId,
    'MARK',
    '更新归档标签',
    tags.join('、'),
    { tags },
  );

  return getArchiveDetail(actor, normalizedSourceType, sourceId);
}

export async function addArchiveNote(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
  input: { comment?: unknown },
): Promise<ArchiveDetail> {
  if (!hasPermission(actor, 'approval:archive:mark')) {
    throw new BizError('缺少权限: approval:archive:mark', 403, 'FORBIDDEN');
  }

  const normalizedSourceType = normalizeSourceType(sourceType);
  await getArchiveDetail(actor, normalizedSourceType, sourceId);
  const comment = normalizeComment(input.comment);

  await prisma.$transaction(async (tx) => {
    const metadata = await ensureArchiveMeta(tx, normalizedSourceType, sourceId);
    await tx.archiveEvent.create({
      data: {
        metadataId: metadata.id,
        sourceType: toPrismaSourceType(normalizedSourceType),
        approvalApplicationId: normalizedSourceType === 'approval' ? sourceId : null,
        submissionId: normalizedSourceType === 'collection' ? sourceId : null,
        actorId: actor.id,
        actorName: actor.name,
        type: 'NOTE_ADDED',
        comment,
        payload: toInputJson({ visibility: 'INTERNAL' }),
      },
    });
  });

  await appendApprovalArchiveEvent(
    actor,
    normalizedSourceType,
    sourceId,
    'COMMENT',
    '内部备注',
    comment,
    {},
  );

  return getArchiveDetail(actor, normalizedSourceType, sourceId);
}

export async function updateProcessingData(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
  input: { processingData?: unknown },
): Promise<ArchiveDetail> {
  if (!hasPermission(actor, 'approval:archive:edit')) {
    throw new BizError('缺少权限: approval:archive:edit', 403, 'FORBIDDEN');
  }

  const normalizedSourceType = normalizeSourceType(sourceType);
  const detailSource =
    normalizedSourceType === 'approval'
      ? await loadApprovalForDetail(actor, sourceId)
      : await loadCollectionForDetail(actor, sourceId);
  const processingData = normalizeRecordObject(
    input.processingData,
    'INVALID_PROCESSING_DATA',
    '处理字段值格式无效',
  );
  const knownProcessingFields = readFieldIdsFromProcessingSchema(detailSource.template.processingSchema);
  if (knownProcessingFields.size > 0) {
    assertKnownFields(Object.keys(processingData), knownProcessingFields, 'UNKNOWN_PROCESSING_FIELD_ID');
  }

  await prisma.$transaction(async (tx) => {
    const metadata = await ensureArchiveMeta(tx, normalizedSourceType, sourceId);
    await tx.archiveRecordMeta.update({
      where: { id: metadata.id },
      data: {
        processingData: toInputJson(processingData),
      },
    });
    await tx.archiveEvent.create({
      data: {
        metadataId: metadata.id,
        sourceType: toPrismaSourceType(normalizedSourceType),
        approvalApplicationId: normalizedSourceType === 'approval' ? sourceId : null,
        submissionId: normalizedSourceType === 'collection' ? sourceId : null,
        actorId: actor.id,
        actorName: actor.name,
        type: 'PROCESSING_UPDATED',
        payload: toInputJson({ processingData }),
      },
    });
  });

  await appendApprovalArchiveEvent(
    actor,
    normalizedSourceType,
    sourceId,
    'EDIT',
    '更新处理信息',
    null,
    { processingData },
  );

  return getArchiveDetail(actor, normalizedSourceType, sourceId);
}

export async function correctArchiveData(
  actor: ArchiveActor,
  sourceType: ArchiveSourceTypeParam,
  sourceId: number,
  input: { changes?: unknown; reason?: unknown },
): Promise<ArchiveDetail> {
  if (!hasPermission(actor, 'approval:archive:edit')) {
    throw new BizError('缺少权限: approval:archive:edit', 403, 'FORBIDDEN');
  }

  const normalizedSourceType = normalizeSourceType(sourceType);
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : '';
  if (!reason) {
    throw new BizError('编辑原因不能为空', 400, 'ARCHIVE_EDIT_REASON_REQUIRED');
  }

  const changes = normalizeRecordObject(input.changes, 'INVALID_ARCHIVE_CHANGES', '修正字段格式无效');
  const detailSource =
    normalizedSourceType === 'approval'
      ? await loadApprovalForDetail(actor, sourceId)
      : await loadCollectionForDetail(actor, sourceId);
  const formalData =
    normalizedSourceType === 'approval'
      ? toRecord((detailSource as ApprovalArchiveRecord).formData)
      : toRecord((detailSource as CollectionArchiveRecord).data);
  const schema =
    normalizedSourceType === 'approval'
      ? (detailSource as ApprovalArchiveRecord).schemaSnapshot
      : (detailSource as CollectionArchiveRecord).template.schema;
  const knownFieldIds = readFieldIdsFromSchema(schema);
  assertKnownFields(Object.keys(changes), knownFieldIds, 'UNKNOWN_ARCHIVE_FIELD_ID');

  const correctionStore = readCorrectionStore(detailSource.archiveMeta?.correctionData);
  const effectiveData = { ...formalData, ...correctionStore.current };
  const fieldChanges = Object.entries(changes)
    .filter(([field, after]) => JSON.stringify(effectiveData[field]) !== JSON.stringify(after))
    .map(([field, after]) => ({
      field,
      before: effectiveData[field] ?? null,
      after,
    }));

  if (fieldChanges.length === 0) {
    throw new BizError('提交数据无变化', 400, 'ARCHIVE_EDIT_NO_CHANGES');
  }

  await prisma.$transaction(async (tx) => {
    const metadata = await ensureArchiveMeta(tx, normalizedSourceType, sourceId);
    const event = await tx.archiveEvent.create({
      data: {
        metadataId: metadata.id,
        sourceType: toPrismaSourceType(normalizedSourceType),
        approvalApplicationId: normalizedSourceType === 'approval' ? sourceId : null,
        submissionId: normalizedSourceType === 'collection' ? sourceId : null,
        actorId: actor.id,
        actorName: actor.name,
        type: 'CONTROLLED_EDIT',
        reason,
        comment: reason,
        payload: toInputJson({ changes: fieldChanges }),
      },
    });

    const nextCurrent = { ...correctionStore.current };
    const nextHistory = [...correctionStore.history];
    for (const change of fieldChanges) {
      nextCurrent[change.field] = change.after;
      nextHistory.push({
        id: event.id,
        field: change.field,
        before: change.before,
        after: change.after,
        reason,
        actorId: actor.id,
        actorName: actor.name,
        createdAt: event.createdAt,
      });
    }

    await tx.archiveRecordMeta.update({
      where: { id: metadata.id },
      data: {
        correctionData: toInputJson({ current: nextCurrent, history: nextHistory }),
      },
    });
  });

  await appendApprovalArchiveEvent(
    actor,
    normalizedSourceType,
    sourceId,
    'EDIT',
    '修正提交数据',
    reason,
    { changes: fieldChanges },
  );

  return getArchiveDetail(actor, normalizedSourceType, sourceId);
}
