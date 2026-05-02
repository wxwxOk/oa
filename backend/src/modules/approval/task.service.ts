import type {
  ApprovalApplicationStatus,
  ApprovalTaskStatus,
  Prisma,
} from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import {
  appendApplicationEvent,
  approveTask,
  rejectTask,
  type ApprovalActor,
} from './application.service';

export type ApprovalTaskListView = 'pending' | 'handled';

export type ApprovalTaskListFilters = {
  page?: number | string;
  size?: number | string;
  view?: ApprovalTaskListView;
  templateId?: number | string;
  applicantName?: string;
  departmentId?: number | string;
  status?: ApprovalTaskStatus | '' | undefined;
  dateFrom?: string;
  dateTo?: string;
};

export type ApprovalTaskListItem = {
  id: number;
  applicationId: number;
  applicationNo: string;
  taskStatus: ApprovalTaskStatus;
  applicationStatus: ApprovalApplicationStatus;
  templateId: number;
  templateName: string;
  templateVersion: number;
  processId: number | null;
  processName: string | null;
  applicantName: string;
  applicantDepartmentId: number | null;
  applicantDepartmentName: string | null;
  currentNodeOrder: number | null;
  currentNodeName: string | null;
  nodeOrder: number;
  nodeName: string;
  assigneeId: number;
  assigneeName: string;
  assignedAt: Date;
  handledAt: Date | null;
  taskComment: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  canHandle: boolean;
  canComment: boolean;
};

export type ApprovalTaskTimelineEvent = {
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
  createdAt: Date;
};

export type ApprovalTaskSummary = {
  id: number;
  nodeOrder: number;
  nodeName: string;
  status: ApprovalTaskStatus;
  assigneeId: number;
  assigneeName: string;
  assignedAt: Date;
  handledAt: Date | null;
  comment: string | null;
};

export type ApprovalTaskDetail = ApprovalTaskListItem & {
  formData: unknown;
  schemaSnapshot: unknown;
  processSnapshot: unknown;
  timeline: ApprovalTaskTimelineEvent[];
  tasks: ApprovalTaskSummary[];
  archive: {
    tags: string[];
    notes: Array<{
      id: number;
      comment: string;
      actorId: number | null;
      actorName: string;
      createdAt: Date;
    }>;
    events: Array<{
      id: number;
      type: string;
      comment: string | null;
      actorId: number | null;
      actorName: string;
      createdAt: Date;
      payload: unknown;
    }>;
  };
};

export type ApprovalTaskFilterOptions = {
  templates: Array<{ label: string; value: number; version: number }>;
  departments: Array<{ label: string; value: number }>;
};

const MAX_PAGE_SIZE = 100;
const HANDLED_DEFAULT_STATUSES: ApprovalTaskStatus[] = ['APPROVED', 'REJECTED'];
const COMMENTABLE_STATUSES: ApprovalTaskStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

type TaskWithApplication = Prisma.ApprovalTaskGetPayload<{
  include: { application: true };
}>;

type TaskWithDetailApplication = Prisma.ApprovalTaskGetPayload<{
  include: {
    application: {
      include: {
        tasks: true;
        timelineEvents: true;
        archiveMeta: {
          include: {
            events: true;
          };
        };
      };
    };
  };
}>;

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
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

function normalizeComment(comment: string | undefined, required = false): string | undefined {
  const normalized = comment?.trim().slice(0, 200);
  if (required && !normalized) {
    throw new BizError('审批意见不能为空', 400, 'APPROVAL_COMMENT_REQUIRED');
  }
  return normalized || undefined;
}

function normalizeView(view: ApprovalTaskListFilters['view']): ApprovalTaskListView {
  return view === 'handled' ? 'handled' : 'pending';
}

function canHandleTask(actor: ApprovalActor, task: Pick<TaskWithApplication, 'assigneeId' | 'status'>) {
  return task.assigneeId === actor.id && task.status === 'PENDING';
}

function canCommentTask(actor: ApprovalActor, task: Pick<TaskWithApplication, 'assigneeId' | 'status'>) {
  return task.assigneeId === actor.id && COMMENTABLE_STATUSES.includes(task.status);
}

function serializeTaskRow(actor: ApprovalActor, task: TaskWithApplication): ApprovalTaskListItem {
  const application = task.application;
  return {
    id: task.id,
    applicationId: application.id,
    applicationNo: application.applicationNo,
    taskStatus: task.status,
    applicationStatus: application.status,
    templateId: application.templateId,
    templateName: application.templateName,
    templateVersion: application.templateVersion,
    processId: application.processId,
    processName: application.processName,
    applicantName: application.applicantName,
    applicantDepartmentId: application.applicantDepartmentId,
    applicantDepartmentName: application.applicantDepartmentName,
    currentNodeOrder: application.currentNodeOrder,
    currentNodeName: application.currentNodeName,
    nodeOrder: task.nodeOrder,
    nodeName: task.nodeName,
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    assignedAt: task.assignedAt,
    handledAt: task.handledAt,
    taskComment: task.comment,
    submittedAt: application.submittedAt,
    completedAt: application.completedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    canHandle: canHandleTask(actor, task),
    canComment: canCommentTask(actor, task),
  };
}

function serializeTaskDetail(actor: ApprovalActor, task: TaskWithDetailApplication): ApprovalTaskDetail {
  const archiveEvents = [...(task.application.archiveMeta?.events ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );

  return {
    ...serializeTaskRow(actor, task),
    formData: task.application.formData,
    schemaSnapshot: task.application.schemaSnapshot,
    processSnapshot: task.application.processSnapshot,
    timeline: task.application.timelineEvents.map((event) => ({
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
      createdAt: event.createdAt,
    })),
    tasks: task.application.tasks.map((summary) => ({
      id: summary.id,
      nodeOrder: summary.nodeOrder,
      nodeName: summary.nodeName,
      status: summary.status,
      assigneeId: summary.assigneeId,
      assigneeName: summary.assigneeName,
      assignedAt: summary.assignedAt,
      handledAt: summary.handledAt,
      comment: summary.comment,
    })),
    archive: {
      tags: task.application.archiveMeta?.tags ?? [],
      notes: archiveEvents
        .filter((event) => event.type === 'NOTE_ADDED')
        .map((event) => ({
          id: event.id,
          comment: event.comment ?? '',
          actorId: event.actorId,
          actorName: event.actorName,
          createdAt: event.createdAt,
        })),
      events: archiveEvents.map((event) => ({
        id: event.id,
        type: event.type,
        comment: event.comment,
        actorId: event.actorId,
        actorName: event.actorName,
        createdAt: event.createdAt,
        payload: event.payload,
      })),
    },
  };
}

function buildTaskWhere(
  actor: ApprovalActor,
  filters: ApprovalTaskListFilters,
): { where: Prisma.ApprovalTaskWhereInput; view: ApprovalTaskListView } {
  const view = normalizeView(filters.view);
  const templateId = normalizeNumber(filters.templateId);
  const departmentId = normalizeNumber(filters.departmentId);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');

  const where: Prisma.ApprovalTaskWhereInput = {
    assigneeId: actor.id,
  };

  if (view === 'pending') {
    where.status = 'PENDING';
  } else if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { in: HANDLED_DEFAULT_STATUSES };
  }

  const applicationWhere: Prisma.ApprovalApplicationWhereInput = {};
  if (templateId) applicationWhere.templateId = templateId;
  if (departmentId) applicationWhere.applicantDepartmentId = departmentId;
  if (filters.applicantName?.trim()) {
    applicationWhere.applicantName = {
      contains: filters.applicantName.trim(),
      mode: 'insensitive',
    };
  }
  if (Object.keys(applicationWhere).length > 0) {
    where.application = applicationWhere;
  }

  if (dateFrom || dateTo) {
    const range = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
    if (view === 'pending') where.assignedAt = range;
    else where.handledAt = range;
  }

  return { where, view };
}

export async function listApprovalTasks(
  actor: ApprovalActor,
  filters: ApprovalTaskListFilters = {},
) {
  const page = normalizePage(filters.page, 1);
  const size = normalizeSize(filters.size, 10);
  const { where, view } = buildTaskWhere(actor, filters);
  const orderBy =
    view === 'pending'
      ? [{ assignedAt: 'desc' as const }, { id: 'desc' as const }]
      : [{ handledAt: 'desc' as const }, { id: 'desc' as const }];

  const [rows, total] = await Promise.all([
    prisma.approvalTask.findMany({
      where,
      include: { application: true },
      orderBy,
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.approvalTask.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeTaskRow(actor, row)),
    total,
    page,
    size,
    view,
  };
}

export async function getApprovalTaskDetail(actor: ApprovalActor, taskId: number) {
  const task = await prisma.approvalTask.findUnique({
    where: { id: taskId },
    include: {
      application: {
        include: {
          tasks: { orderBy: [{ nodeOrder: 'asc' }, { id: 'asc' }] },
          timelineEvents: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          archiveMeta: {
            include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
          },
        },
      },
    },
  });

  if (!task) {
    throw notFound('审批任务不存在');
  }
  if (task.assigneeId !== actor.id) {
    throw new BizError('无权查看该审批任务', 403, 'APPROVAL_TASK_FORBIDDEN');
  }

  return serializeTaskDetail(actor, task);
}

export async function listApprovalTaskMeta(actor: ApprovalActor): Promise<ApprovalTaskFilterOptions> {
  const tasks = await prisma.approvalTask.findMany({
    where: { assigneeId: actor.id },
    select: {
      application: {
        select: {
          templateId: true,
          templateName: true,
          templateVersion: true,
          applicantDepartmentId: true,
          applicantDepartmentName: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const templates = new Map<number, { label: string; value: number; version: number }>();
  const departments = new Map<number, { label: string; value: number }>();

  for (const task of tasks) {
    const app = task.application;
    if (!templates.has(app.templateId)) {
      templates.set(app.templateId, {
        label: `${app.templateName} v${app.templateVersion}`,
        value: app.templateId,
        version: app.templateVersion,
      });
    }
    if (app.applicantDepartmentId && !departments.has(app.applicantDepartmentId)) {
      departments.set(app.applicantDepartmentId, {
        label: app.applicantDepartmentName ?? `部门 ${app.applicantDepartmentId}`,
        value: app.applicantDepartmentId,
      });
    }
  }

  return {
    templates: Array.from(templates.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
    departments: Array.from(departments.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
  };
}

export async function approveApprovalTask(actor: ApprovalActor, taskId: number, comment?: string) {
  return approveTask(taskId, actor, normalizeComment(comment));
}

export async function rejectApprovalTask(actor: ApprovalActor, taskId: number, comment: string) {
  return rejectTask(taskId, actor, normalizeComment(comment, true));
}

export async function commentApprovalTask(actor: ApprovalActor, taskId: number, comment: string) {
  const normalized = normalizeComment(comment, true);
  const task = await prisma.approvalTask.findUnique({
    where: { id: taskId },
    include: { application: true },
  });

  if (!task) {
    throw notFound('审批任务不存在');
  }
  if (!canCommentTask(actor, task)) {
    throw new BizError('无权备注该审批任务', 403, 'APPROVAL_TASK_FORBIDDEN');
  }

  await appendApplicationEvent({
    applicationId: task.applicationId,
    taskId: task.id,
    actor,
    nodeOrder: task.nodeOrder,
    nodeName: task.nodeName,
    type: 'COMMENT',
    title: '内部备注',
    comment: normalized,
    payload: toInputJson({ visibility: 'INTERNAL' }),
  });

  return getApprovalTaskDetail(actor, taskId);
}
