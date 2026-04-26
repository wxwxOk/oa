import type { ApprovalApplicationStatus, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import {
  cancelApplication,
  createDraftApplication as createWorkflowDraftApplication,
  submitApplication,
  type ApprovalActor,
} from './application.service';
import { resolveProcessSnapshot } from './process-config.service';
import { validateFormDataRequiredFields } from '../template/schema.validation';

export type ApplicationStatusFilter =
  | ApprovalApplicationStatus
  | 'IN_PROGRESS'
  | ''
  | undefined;

export type ApplicationListFilters = {
  page?: number | string;
  size?: number | string;
  status?: ApplicationStatusFilter;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateApplicationDraftInput = {
  templateId: number;
  formData?: Record<string, unknown>;
};

export type AvailableApprovalTemplate = {
  id: number;
  name: string;
  description: string | null;
  schemaVersion: number;
  approvalProcessId: number;
  approvalProcessName: string;
  updatedAt: Date;
};

type ApplicantSnapshot = {
  id: number;
  realName: string;
  departmentId: number | null;
  department: { id: number; name: string } | null;
};

type OwnApplicationWithRelations = Prisma.ApprovalApplicationGetPayload<{
  include: {
    tasks: true;
    timelineEvents: true;
  };
}>;

const MAX_PAGE_SIZE = 100;
const CANCELLABLE_STATUSES: ApprovalApplicationStatus[] = ['SUBMITTED', 'APPROVING'];
const FILTERABLE_STATUSES: ApprovalApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
];

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

function normalizeStatusFilter(status: ApplicationStatusFilter): ApprovalApplicationStatus[] | undefined {
  if (!status) return undefined;
  if (status === 'IN_PROGRESS') return ['SUBMITTED', 'APPROVING'];
  if (FILTERABLE_STATUSES.includes(status as ApprovalApplicationStatus)) {
    return [status as ApprovalApplicationStatus];
  }

  throw new BizError('申请状态筛选值无效', 400, 'INVALID_APPLICATION_STATUS_FILTER');
}

function canCancelApplication(actor: ApprovalActor, application: { applicantId: number; status: ApprovalApplicationStatus }) {
  return actor.id === application.applicantId && CANCELLABLE_STATUSES.includes(application.status);
}

function buildApplicationNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `APP-${date}-${nanoid(8).toUpperCase()}`;
}

async function loadApplicant(actor: ApprovalActor): Promise<ApplicantSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      realName: true,
      status: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw notFound('提交人不存在');
  }
  if (user.status === 'DISABLED') {
    throw new BizError('提交人账号已禁用', 403, 'APPLICANT_DISABLED');
  }

  return user;
}

async function loadAvailableTemplate(templateId: number) {
  const template = await prisma.formTemplate.findFirst({
    where: {
      id: templateId,
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: { not: null },
      approvalProcess: { isActive: true },
    },
    include: {
      approvalProcess: { select: { id: true, name: true, isActive: true } },
    },
  });

  if (!template || !template.approvalProcessId || !template.approvalProcess) {
    throw notFound('可发起审批模板不存在');
  }

  return template;
}

async function loadOwnApplicationOrThrow(actor: ApprovalActor, id: number, action: 'view' | 'edit' | 'submit' | 'cancel') {
  const application = await prisma.approvalApplication.findUnique({ where: { id } });
  if (!application) {
    throw notFound('审批申请不存在');
  }

  if (application.applicantId !== actor.id) {
    const messages = {
      view: '无权查看该审批申请',
      edit: '无权编辑该审批申请',
      submit: '无权提交该审批申请',
      cancel: '无权撤销该审批申请',
    };
    throw new BizError(messages[action], 403, `APPROVAL_APPLICATION_${action.toUpperCase()}_FORBIDDEN`);
  }

  return application;
}

function serializeRow(actor: ApprovalActor, application: Prisma.ApprovalApplicationGetPayload<Record<string, never>>) {
  return {
    id: application.id,
    applicationNo: application.applicationNo,
    status: application.status,
    templateId: application.templateId,
    templateName: application.templateName,
    templateVersion: application.templateVersion,
    processId: application.processId,
    processName: application.processName,
    applicantName: application.applicantName,
    applicantDepartmentName: application.applicantDepartmentName,
    currentNodeOrder: application.currentNodeOrder,
    currentNodeName: application.currentNodeName,
    submittedAt: application.submittedAt,
    completedAt: application.completedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    canCancel: canCancelApplication(actor, application),
  };
}

function serializeDetail(actor: ApprovalActor, application: OwnApplicationWithRelations) {
  return {
    ...serializeRow(actor, application),
    formData: application.formData,
    schemaSnapshot: application.schemaSnapshot,
    processSnapshot: application.processSnapshot,
    timeline: application.timelineEvents
      .filter((event) => {
        const payload = event.payload as { visibility?: unknown } | null;
        return !(event.type === 'COMMENT' && payload?.visibility === 'INTERNAL');
      })
      .map((event) => ({
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
    tasks: application.tasks.map((task) => ({
      id: task.id,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assignedAt: task.assignedAt,
      handledAt: task.handledAt,
      comment: task.comment,
    })),
  };
}

export async function listAvailableApprovalTemplates(): Promise<AvailableApprovalTemplate[]> {
  const templates = await prisma.formTemplate.findMany({
    where: {
      status: 'PUBLISHED',
      businessMode: 'APPROVAL_REQUIRED',
      approvalProcessId: { not: null },
      approvalProcess: { isActive: true },
    },
    select: {
      id: true,
      name: true,
      description: true,
      schemaVersion: true,
      approvalProcessId: true,
      updatedAt: true,
      approvalProcess: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    schemaVersion: template.schemaVersion,
    approvalProcessId: template.approvalProcessId as number,
    approvalProcessName: template.approvalProcess?.name ?? '',
    updatedAt: template.updatedAt,
  }));
}

export async function createApplicationDraft(actor: ApprovalActor, input: CreateApplicationDraftInput) {
  const [applicant, template] = await Promise.all([
    loadApplicant(actor),
    loadAvailableTemplate(input.templateId),
  ]);
  const processSnapshot = await resolveProcessSnapshot(template.approvalProcessId, applicant.id);

  return createWorkflowDraftApplication({
    applicationNo: buildApplicationNo(),
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.schemaVersion,
    applicantId: applicant.id,
    applicantName: applicant.realName,
    applicantDepartmentId: applicant.departmentId,
    applicantDepartmentName: applicant.department?.name ?? null,
    formData: toInputJson(input.formData ?? {}),
    schemaSnapshot: toInputJson(template.schema),
    processSnapshot,
  });
}

export async function updateDraftApplication(
  actor: ApprovalActor,
  id: number,
  formData: Record<string, unknown>,
) {
  const application = await loadOwnApplicationOrThrow(actor, id, 'edit');
  if (application.status !== 'DRAFT') {
    throw new BizError('仅草稿申请可编辑', 400, 'APPROVAL_APPLICATION_NOT_DRAFT');
  }

  return prisma.approvalApplication.update({
    where: { id: application.id },
    data: { formData: toInputJson(formData) },
  });
}

export async function submitDraftApplication(
  actor: ApprovalActor,
  id: number,
  formData?: Record<string, unknown>,
) {
  const application = await loadOwnApplicationOrThrow(actor, id, 'submit');
  if (application.status !== 'DRAFT') {
    throw new BizError('仅草稿申请可提交', 400, 'APPROVAL_APPLICATION_NOT_DRAFT');
  }

  const nextFormData = formData ?? (application.formData as Record<string, unknown>);
  validateFormDataRequiredFields(application.schemaSnapshot, nextFormData);

  if (formData !== undefined) {
    await prisma.approvalApplication.update({
      where: { id: application.id },
      data: { formData: toInputJson(formData) },
    });
  }

  const applicant = await loadApplicant(actor);
  return submitApplication(application.id, { id: applicant.id, name: applicant.realName });
}

export async function listOwnApplications(actor: ApprovalActor, filters: ApplicationListFilters = {}) {
  const page = normalizePage(filters.page, 1);
  const size = normalizeSize(filters.size, 10);
  const statuses = normalizeStatusFilter(filters.status);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');

  const where: Prisma.ApprovalApplicationWhereInput = {
    applicantId: actor.id,
  };
  if (statuses) where.status = { in: statuses };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.approvalApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.approvalApplication.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeRow(actor, row)),
    total,
    page,
    size,
  };
}

export async function getOwnApplicationDetail(actor: ApprovalActor, id: number) {
  await loadOwnApplicationOrThrow(actor, id, 'view');
  const application = await prisma.approvalApplication.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ nodeOrder: 'asc' }, { id: 'asc' }] },
      timelineEvents: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!application) {
    throw notFound('审批申请不存在');
  }

  return serializeDetail(actor, application);
}

export async function cancelOwnApplication(actor: ApprovalActor, id: number, reason?: string) {
  await loadOwnApplicationOrThrow(actor, id, 'cancel');
  const applicant = await loadApplicant(actor);
  const normalizedReason = reason?.trim() ? reason.trim().slice(0, 200) : undefined;
  return cancelApplication(id, { id: applicant.id, name: applicant.realName }, normalizedReason);
}
