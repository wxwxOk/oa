import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  addArchiveNote,
  correctArchiveData,
  getArchiveDetail,
  listArchiveMeta,
  listArchiveRecords,
  setArchiveTags,
  updateProcessingData,
  type ArchiveActor,
  type ArchiveDetail,
  type ArchiveListFilters,
  type ArchiveListItem,
  type ArchiveSourceTypeParam,
} from './archive.service';

type RouteDate = Date | string | null;

export type ArchiveRouteRow = Omit<ArchiveListItem, 'createdAt' | 'updatedAt'> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ArchiveRouteDetail = Omit<
  ArchiveDetail,
  'createdAt' | 'updatedAt' | 'notes' | 'correctionHistory' | 'events'
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  notes: Array<Omit<ArchiveDetail['notes'][number], 'createdAt'> & { createdAt: Date | string }>;
  correctionHistory: Array<
    Omit<ArchiveDetail['correctionHistory'][number], 'createdAt'> & { createdAt: Date | string }
  >;
  events: Array<Omit<ArchiveDetail['events'][number], 'createdAt'> & { createdAt: Date | string }>;
};

const sourceTypeSchema = t.Union([t.Literal('approval'), t.Literal('collection')]);

export const archiveListQuerySchema = t.Object({
  sourceType: t.Optional(sourceTypeSchema),
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  templateId: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  personName: t.Optional(t.String()),
  status: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
  tags: t.Optional(t.String()),
});

const sourceParamsSchema = t.Object({
  sourceType: sourceTypeSchema,
  id: t.String(),
});

export const setArchiveTagsBodySchema = t.Object(
  {
    tags: t.Array(t.String()),
  },
  { additionalProperties: false },
);

export const addArchiveNoteBodySchema = t.Object(
  {
    comment: t.String({ minLength: 1, maxLength: 1000 }),
  },
  { additionalProperties: false },
);

export const updateProcessingDataBodySchema = t.Object(
  {
    processingData: t.Record(t.String(), t.Any()),
  },
  { additionalProperties: false },
);

export const correctArchiveDataBodySchema = t.Object(
  {
    changes: t.Record(t.String(), t.Any()),
    reason: t.String({ minLength: 1, maxLength: 500 }),
  },
  { additionalProperties: false },
);

function toIso(value: RouteDate): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toActor(currentUser: {
  id: number;
  realName?: string;
  username?: string;
  roleCodes?: string[];
  permissions?: string[];
}): ArchiveActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
    roleCodes: currentUser.roleCodes ?? [],
    permissions: currentUser.permissions ?? [],
  };
}

export function serializeArchiveRow(row: ArchiveRouteRow) {
  return {
    archiveKey: row.archiveKey,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    archiveNo: row.archiveNo,
    templateId: row.templateId,
    templateName: row.templateName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    personName: row.personName,
    status: row.status,
    tags: row.tags,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function serializeArchiveListResponse(response: {
  rows: ArchiveRouteRow[];
  total: number;
  page: number;
  size: number;
}) {
  return {
    rows: response.rows.map(serializeArchiveRow),
    total: response.total,
    page: response.page,
    size: response.size,
  };
}

export function serializeArchiveDetail(detail: ArchiveRouteDetail) {
  return {
    ...serializeArchiveRow(detail),
    formData: detail.formData,
    effectiveData: detail.effectiveData,
    processingData: detail.processingData,
    schemaSnapshot: detail.schemaSnapshot,
    notes: detail.notes.map((note) => ({
      id: note.id,
      comment: note.comment,
      actorId: note.actorId,
      actorName: note.actorName,
      createdAt: toIso(note.createdAt),
    })),
    correctionHistory: detail.correctionHistory.map((item) => ({
      id: item.id,
      field: item.field,
      before: item.before,
      after: item.after,
      reason: item.reason,
      actorId: item.actorId,
      actorName: item.actorName,
      createdAt: toIso(item.createdAt),
    })),
    events: detail.events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      comment: event.comment,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      actorId: event.actorId,
      actorName: event.actorName,
      createdAt: toIso(event.createdAt),
      payload: event.payload,
    })),
  };
}

export const approvalArchiveModule = new Elysia({ prefix: '/approval/archive' })
  .guard({}, (app) =>
    app
      .use(authGuard())
      .get(
        '/',
        async ({ query, currentUser }: any) =>
          serializeArchiveListResponse(
            await listArchiveRecords(toActor(currentUser), query as ArchiveListFilters),
          ),
        { query: archiveListQuerySchema },
      )
      .get('/meta', async ({ currentUser }: any) => listArchiveMeta(toActor(currentUser)))
      .get(
        '/:sourceType/:id',
        async ({ params, currentUser }: any) =>
          serializeArchiveDetail(
            await getArchiveDetail(
              toActor(currentUser),
              params.sourceType as ArchiveSourceTypeParam,
              Number(params.id),
            ),
          ),
        { params: sourceParamsSchema },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:archive:mark'))
      .put(
        '/:sourceType/:id/tags',
        async ({ params, body, currentUser }: any) =>
          serializeArchiveDetail(
            await setArchiveTags(
              toActor(currentUser),
              params.sourceType as ArchiveSourceTypeParam,
              Number(params.id),
              body,
            ),
          ),
        { params: sourceParamsSchema, body: setArchiveTagsBodySchema },
      )
      .post(
        '/:sourceType/:id/notes',
        async ({ params, body, currentUser }: any) =>
          serializeArchiveDetail(
            await addArchiveNote(
              toActor(currentUser),
              params.sourceType as ArchiveSourceTypeParam,
              Number(params.id),
              body,
            ),
          ),
        { params: sourceParamsSchema, body: addArchiveNoteBodySchema },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:archive:edit'))
      .put(
        '/:sourceType/:id/processing',
        async ({ params, body, currentUser }: any) =>
          serializeArchiveDetail(
            await updateProcessingData(
              toActor(currentUser),
              params.sourceType as ArchiveSourceTypeParam,
              Number(params.id),
              body,
            ),
          ),
        { params: sourceParamsSchema, body: updateProcessingDataBodySchema },
      )
      .post(
        '/:sourceType/:id/corrections',
        async ({ params, body, currentUser }: any) =>
          serializeArchiveDetail(
            await correctArchiveData(
              toActor(currentUser),
              params.sourceType as ArchiveSourceTypeParam,
              Number(params.id),
              body,
            ),
          ),
        { params: sourceParamsSchema, body: correctArchiveDataBodySchema },
      ),
  );
