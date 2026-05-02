import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import type { ApprovalActor } from './application.service';
import {
  approveApprovalTask,
  commentApprovalTask,
  getApprovalTaskDetail,
  listApprovalTaskMeta,
  listApprovalTasks,
  rejectApprovalTask,
  type ApprovalTaskDetail,
  type ApprovalTaskListFilters,
  type ApprovalTaskListItem,
} from './task.service';

type RouteDate = Date | string | null;

export type ApprovalTaskRouteRow = Omit<
  ApprovalTaskListItem,
  'assignedAt' | 'handledAt' | 'submittedAt' | 'completedAt' | 'createdAt' | 'updatedAt'
> & {
  assignedAt: RouteDate;
  handledAt: RouteDate;
  submittedAt: RouteDate;
  completedAt: RouteDate;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ApprovalTaskRouteDetail = Omit<
  ApprovalTaskDetail,
  | 'assignedAt'
  | 'handledAt'
  | 'submittedAt'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'timeline'
  | 'tasks'
  | 'archive'
> & {
  assignedAt: RouteDate;
  handledAt: RouteDate;
  submittedAt: RouteDate;
  completedAt: RouteDate;
  createdAt: Date | string;
  updatedAt: Date | string;
  timeline: Array<Omit<ApprovalTaskDetail['timeline'][number], 'createdAt'> & { createdAt: Date | string }>;
  tasks: Array<
    Omit<ApprovalTaskDetail['tasks'][number], 'assignedAt' | 'handledAt'> & {
      assignedAt: Date | string;
      handledAt: RouteDate;
    }
  >;
  archive: {
    tags: string[];
    notes: Array<
      Omit<ApprovalTaskDetail['archive']['notes'][number], 'createdAt'> & { createdAt: Date | string }
    >;
    events: Array<
      Omit<ApprovalTaskDetail['archive']['events'][number], 'createdAt'> & { createdAt: Date | string }
    >;
  };
};

const taskStatusSchema = t.Union([
  t.Literal(''),
  t.Literal('PENDING'),
  t.Literal('APPROVED'),
  t.Literal('REJECTED'),
  t.Literal('CANCELED'),
  t.Literal('SKIPPED'),
]);

const paramsSchema = t.Object({ id: t.String() });

const listQuerySchema = t.Object({
  view: t.Optional(t.Union([t.Literal('pending'), t.Literal('handled')])),
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  templateId: t.Optional(t.String()),
  applicantName: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  status: t.Optional(taskStatusSchema),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

export const approveBodySchema = t.Object(
  {
    comment: t.Optional(t.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const rejectBodySchema = t.Object(
  {
    comment: t.String({ maxLength: 200 }),
  },
  { additionalProperties: false },
);

export const commentBodySchema = t.Object(
  {
    comment: t.String({ maxLength: 200 }),
  },
  { additionalProperties: false },
);

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

export function serializeApprovalTaskRow(row: ApprovalTaskRouteRow) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    applicationNo: row.applicationNo,
    taskStatus: row.taskStatus,
    applicationStatus: row.applicationStatus,
    templateId: row.templateId,
    templateName: row.templateName,
    templateVersion: row.templateVersion,
    processId: row.processId,
    processName: row.processName,
    applicantName: row.applicantName,
    applicantDepartmentId: row.applicantDepartmentId,
    applicantDepartmentName: row.applicantDepartmentName,
    currentNodeOrder: row.currentNodeOrder,
    currentNodeName: row.currentNodeName,
    nodeOrder: row.nodeOrder,
    nodeName: row.nodeName,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assignedAt: toIso(row.assignedAt),
    handledAt: toIso(row.handledAt),
    taskComment: row.taskComment,
    submittedAt: toIso(row.submittedAt),
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    canHandle: row.canHandle,
    canComment: row.canComment,
  };
}

export function serializeApprovalTaskListResponse(response: {
  rows: ApprovalTaskRouteRow[];
  total: number;
  page: number;
  size: number;
  view: string;
}) {
  return {
    rows: response.rows.map(serializeApprovalTaskRow),
    total: response.total,
    page: response.page,
    size: response.size,
    view: response.view,
  };
}

export function serializeApprovalTaskDetail(detail: ApprovalTaskRouteDetail) {
  return {
    ...serializeApprovalTaskRow(detail),
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
    archive: {
      tags: detail.archive.tags,
      notes: detail.archive.notes.map((note) => ({
        id: note.id,
        comment: note.comment,
        actorId: note.actorId,
        actorName: note.actorName,
        createdAt: toIso(note.createdAt),
      })),
      events: detail.archive.events.map((event) => ({
        id: event.id,
        type: event.type,
        comment: event.comment,
        actorId: event.actorId,
        actorName: event.actorName,
        createdAt: toIso(event.createdAt),
        payload: event.payload,
      })),
    },
  };
}

export const approvalTaskModule = new Elysia({ prefix: '/approval/tasks' })
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:list'))
      .get(
        '/',
        async ({ query, currentUser }: any) =>
          serializeApprovalTaskListResponse(
            await listApprovalTasks(toActor(currentUser), query as ApprovalTaskListFilters),
          ),
        { query: listQuerySchema },
      )
      .get('/meta', async ({ currentUser }: any) => listApprovalTaskMeta(toActor(currentUser)))
      .get(
        '/:id',
        async ({ params, currentUser }: any) =>
          serializeApprovalTaskDetail(
            await getApprovalTaskDetail(toActor(currentUser), Number(params.id)),
          ),
        { params: paramsSchema },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:handle'))
      .post(
        '/:id/approve',
        async ({ params, body, currentUser }: any) => {
          const actor = toActor(currentUser);
          await approveApprovalTask(actor, Number(params.id), body.comment);
          return serializeApprovalTaskDetail(await getApprovalTaskDetail(actor, Number(params.id)));
        },
        { params: paramsSchema, body: approveBodySchema },
      )
      .post(
        '/:id/reject',
        async ({ params, body, currentUser }: any) => {
          const actor = toActor(currentUser);
          await rejectApprovalTask(actor, Number(params.id), body.comment);
          return serializeApprovalTaskDetail(await getApprovalTaskDetail(actor, Number(params.id)));
        },
        { params: paramsSchema, body: rejectBodySchema },
      )
      .post(
        '/:id/comment',
        async ({ params, body, currentUser }: any) =>
          serializeApprovalTaskDetail(
            await commentApprovalTask(toActor(currentUser), Number(params.id), body.comment),
          ),
        { params: paramsSchema, body: commentBodySchema },
      ),
  );
