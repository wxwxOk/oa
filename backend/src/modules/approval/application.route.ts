import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  cancelOwnApplication,
  createApplicationDraft,
  getOwnApplicationDetail,
  listAvailableApprovalTemplates,
  listOwnApplications,
  submitDraftApplication,
  updateDraftApplication,
  type ApplicationListFilters,
} from './application-submission.service';
import type { ApprovalActor } from './application.service';

type RouteDate = Date | string | null;

export type ApplicationRouteRow = {
  id: number;
  applicationNo: string;
  status: string;
  templateId: number;
  templateName: string;
  templateVersion: number;
  processId: number | null;
  processName: string | null;
  applicantName: string;
  applicantDepartmentName: string | null;
  currentNodeOrder: number | null;
  currentNodeName: string | null;
  submittedAt: RouteDate;
  completedAt: RouteDate;
  createdAt: Date | string;
  updatedAt: Date | string;
  canCancel: boolean;
};

export type ApplicationRouteTimelineEvent = {
  id: number;
  taskId: number | null;
  actorId: number | null;
  actorName: string;
  nodeOrder: number | null;
  nodeName: string | null;
  type: string;
  title: string;
  comment: string | null;
  payload: unknown;
  createdAt: Date | string;
};

export type ApplicationRouteTask = {
  id: number;
  nodeOrder: number;
  nodeName: string;
  status: string;
  assigneeId: number;
  assigneeName: string;
  assignedAt: Date | string;
  handledAt: RouteDate;
  comment: string | null;
};

export type ApplicationRouteDetail = ApplicationRouteRow & {
  formData: unknown;
  schemaSnapshot: unknown;
  processSnapshot: unknown;
  timeline: ApplicationRouteTimelineEvent[];
  tasks: ApplicationRouteTask[];
};

const formDataSchema = t.Record(t.String(), t.Any());

export const createDraftBodySchema = t.Object(
  {
    templateId: t.Number(),
    formData: t.Optional(formDataSchema),
  },
  { additionalProperties: false },
);

export const updateDraftBodySchema = t.Object(
  {
    formData: formDataSchema,
  },
  { additionalProperties: false },
);

export const submitBodySchema = t.Object(
  {
    formData: t.Optional(formDataSchema),
  },
  { additionalProperties: false },
);

export const cancelBodySchema = t.Object(
  {
    reason: t.Optional(t.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

const paramsSchema = t.Object({ id: t.String() });

const listQuerySchema = t.Object({
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal(''),
      t.Literal('DRAFT'),
      t.Literal('IN_PROGRESS'),
      t.Literal('SUBMITTED'),
      t.Literal('APPROVING'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
      t.Literal('CANCELED'),
    ]),
  ),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

function toIso(value: RouteDate): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toActor(currentUser: { id: number; realName?: string; username?: string }): ApprovalActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
  };
}

export function serializeApplicationRow(row: ApplicationRouteRow) {
  return {
    id: row.id,
    applicationNo: row.applicationNo,
    status: row.status,
    templateId: row.templateId,
    templateName: row.templateName,
    templateVersion: row.templateVersion,
    processId: row.processId,
    processName: row.processName,
    applicantName: row.applicantName,
    applicantDepartmentName: row.applicantDepartmentName,
    currentNodeOrder: row.currentNodeOrder,
    currentNodeName: row.currentNodeName,
    submittedAt: toIso(row.submittedAt),
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    canCancel: row.canCancel,
  };
}

export function serializeApplicationListResponse(response: {
  rows: ApplicationRouteRow[];
  total: number;
  page: number;
  size: number;
}) {
  return {
    rows: response.rows.map(serializeApplicationRow),
    total: response.total,
    page: response.page,
    size: response.size,
  };
}

export function serializeApplicationDetail(detail: ApplicationRouteDetail) {
  return {
    ...serializeApplicationRow(detail),
    formData: detail.formData,
    schemaSnapshot: detail.schemaSnapshot,
    processSnapshot: detail.processSnapshot,
    timeline: detail.timeline.map((event) => ({
      id: event.id,
      taskId: event.taskId,
      actorId: event.actorId,
      actorName: event.actorName,
      nodeOrder: event.nodeOrder,
      nodeName: event.nodeName,
      type: event.type,
      title: event.title,
      comment: event.comment,
      payload: event.payload,
      createdAt: toIso(event.createdAt),
    })),
    tasks: detail.tasks.map((task) => ({
      id: task.id,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assignedAt: toIso(task.assignedAt),
      handledAt: toIso(task.handledAt),
      comment: task.comment,
    })),
  };
}

export const approvalApplicationModule = new Elysia({ prefix: '/approval/applications' })
  .guard({}, (app) =>
    app
      .use(authGuard('approval:application:create'))
      .get('/templates', async () => listAvailableApprovalTemplates())
      .post(
        '/drafts',
        async ({ body, currentUser }: any) =>
          serializeApplicationRow(
            await createApplicationDraft(toActor(currentUser), {
              templateId: body.templateId,
              formData: body.formData ?? {},
            }),
          ),
        { body: createDraftBodySchema },
      )
      .put(
        '/:id/draft',
        async ({ params, body, currentUser }: any) =>
          serializeApplicationRow(
            await updateDraftApplication(toActor(currentUser), Number(params.id), body.formData),
          ),
        {
          params: paramsSchema,
          body: updateDraftBodySchema,
        },
      )
      .post(
        '/:id/submit',
        async ({ params, body, currentUser }: any) =>
          serializeApplicationRow(
            await submitDraftApplication(
              toActor(currentUser),
              Number(params.id),
              body.formData,
            ),
          ),
        {
          params: paramsSchema,
          body: submitBodySchema,
        },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:application:own'))
      .get(
        '/',
        async ({ query, currentUser }: any) =>
          serializeApplicationListResponse(
            await listOwnApplications(toActor(currentUser), query as ApplicationListFilters),
          ),
        { query: listQuerySchema },
      )
      .get(
        '/:id',
        async ({ params, currentUser }: any) =>
          serializeApplicationDetail(
            await getOwnApplicationDetail(toActor(currentUser), Number(params.id)),
          ),
        { params: paramsSchema },
      )
      .post(
        '/:id/cancel',
        async ({ params, body, currentUser }: any) =>
          serializeApplicationRow(
            await cancelOwnApplication(toActor(currentUser), Number(params.id), body.reason),
          ),
        {
          params: paramsSchema,
          body: cancelBodySchema,
        },
      ),
  );
