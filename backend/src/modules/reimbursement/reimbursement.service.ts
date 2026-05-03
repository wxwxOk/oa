import { nanoid } from 'nanoid';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import {
  REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
  REIMBURSEMENT_FINANCE_REVIEW_NODE,
  assertReimbursementTransition,
  type ReimbursementStatusValue,
} from './reimbursement.state';
import {
  assertAllowedReimbursementSignature,
  buildReimbursementSignatureRelativePath,
  deleteReimbursementFile,
  getSafeReimbursementSignatureStoredName,
  writeReimbursementFile,
} from './reimbursement-file.service';

export const MAX_REIMBURSEMENT_PAGE_SIZE = 100;

export type ReimbursementActor = {
  id: number;
  name: string;
  roleCodes: string[];
  permissions: string[];
};

export type ReimbursementWriteInput = {
  title?: unknown;
  category?: unknown;
  occurredAt?: unknown;
  amount?: unknown;
  reason?: unknown;
  payeeInfo?: unknown;
  remark?: unknown;
};

export type ReimbursementListFilters = {
  page?: number | string;
  size?: number | string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
};

export type ReimbursementReviewDecision = 'approve' | 'reject';
export type ReimbursementReviewStage = 'department' | 'finance';

export type ReimbursementReviewInput = {
  comment?: unknown;
  signature?: File | null;
};

const FILTERABLE_REIMBURSEMENT_STATUSES: ReimbursementStatusValue[] = [
  'DRAFT',
  'DEPARTMENT_REVIEW',
  'FINANCE_REVIEW',
  'APPROVED',
  'REJECTED',
];

type ReimbursementAccessRow = {
  applicantId: number;
  applicantDepartmentId?: number | null;
  status: string;
};

type ReviewActionOptions = {
  actionType: 'DEPARTMENT_APPROVE' | 'DEPARTMENT_REJECT' | 'FINANCE_APPROVE' | 'FINANCE_REJECT';
  fromStatus: ReimbursementStatusValue;
  toStatus: ReimbursementStatusValue;
  nodeName: string;
  requireSignature?: boolean;
  completedAt?: Date;
};

function reimbursementApplication() {
  return (prisma as any).reimbursementApplication;
}

function reimbursementAction() {
  return (prisma as any).reimbursementAction;
}

function normalizePage(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(Math.floor(parsed), MAX_REIMBURSEMENT_PAGE_SIZE);
}

function normalizeRequiredText(value: unknown, message: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new BizError(message);
  return text;
}

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseRequiredDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) throw new BizError('发生日期必须是有效日期');
  return date;
}

function parseAmount(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new BizError('报销金额必须大于 0');
  return amount.toFixed(2);
}

function parseDateBoundary(value: string | undefined, boundary: 'start' | 'end'): Date | undefined {
  const text = value?.trim();
  if (!text) return undefined;

  const normalized = text.includes('T')
    ? text
    : `${text}T${boundary === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new BizError('日期格式无效', 400, 'INVALID_REIMBURSEMENT_DATE_RANGE');
  return parsed;
}

function normalizeStatus(status: string | undefined): ReimbursementStatusValue | undefined {
  const text = status?.trim();
  if (!text) return undefined;
  if (FILTERABLE_REIMBURSEMENT_STATUSES.includes(text as ReimbursementStatusValue)) {
    return text as ReimbursementStatusValue;
  }
  throw new BizError('报销状态筛选值无效', 400, 'INVALID_REIMBURSEMENT_STATUS_FILTER');
}

function isAdmin(actor: ReimbursementActor): boolean {
  return actor.roleCodes.includes('ADMIN');
}

function hasPermission(actor: ReimbursementActor, permission: string): boolean {
  return actor.permissions.includes(permission);
}

function buildApplicationNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `REIM-${date}-${nanoid(8).toUpperCase()}`;
}

async function loadApplicant(actor: ReimbursementActor) {
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
  if (!user) throw notFound('报销申请人不存在');
  if (user.status === 'DISABLED') throw new BizError('报销申请人账号已禁用', 403, 'REIMBURSEMENT_APPLICANT_DISABLED');
  return user;
}

async function loadActorDepartmentId(actorId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: actorId }, select: { departmentId: true } });
  return user?.departmentId ?? null;
}

export function normalizeReimbursementWriteInput(input: ReimbursementWriteInput) {
  const payeeInfo = normalizeOptionalText(input.payeeInfo);
  const remark = normalizeOptionalText(input.remark);
  return {
    title: normalizeRequiredText(input.title, '报销标题不能为空'),
    category: normalizeRequiredText(input.category, '报销类别不能为空'),
    occurredAt: parseRequiredDate(input.occurredAt),
    amount: parseAmount(input.amount),
    reason: normalizeRequiredText(input.reason, '报销事由不能为空'),
    ...(payeeInfo !== undefined ? { payeeInfo } : {}),
    ...(remark !== undefined ? { remark } : {}),
  };
}

export function normalizeReimbursementListFilters(filters: ReimbursementListFilters = {}) {
  return {
    page: normalizePage(filters.page),
    size: normalizeSize(filters.size),
    status: normalizeStatus(filters.status),
    category: filters.category?.trim() || undefined,
    dateFrom: parseDateBoundary(filters.dateFrom, 'start'),
    dateTo: parseDateBoundary(filters.dateTo, 'end'),
    keyword: filters.keyword?.trim() || undefined,
  };
}

export function canViewReimbursement(
  actor: ReimbursementActor,
  application: ReimbursementAccessRow,
  actorDepartmentId?: number | null,
): boolean {
  if (isAdmin(actor) || hasPermission(actor, 'reimbursement:list')) return true;
  if (application.applicantId === actor.id) return true;
  if (
    hasPermission(actor, 'reimbursement:department-review') &&
    application.status === 'DEPARTMENT_REVIEW' &&
    actorDepartmentId != null &&
    actorDepartmentId === application.applicantDepartmentId
  ) {
    return true;
  }
  return (
    hasPermission(actor, 'reimbursement:finance-review') &&
    ['FINANCE_REVIEW', 'APPROVED', 'REJECTED'].includes(application.status)
  );
}

export function assertCanViewReimbursement(
  actor: ReimbursementActor,
  application: ReimbursementAccessRow,
  actorDepartmentId?: number | null,
) {
  if (!canViewReimbursement(actor, application, actorDepartmentId)) {
    throw new BizError('无权查看该报销申请', 403, 'REIMBURSEMENT_VIEW_FORBIDDEN');
  }
}

export function assertCanMutateDraftReimbursement(actor: ReimbursementActor, application: ReimbursementAccessRow) {
  if (application.status !== 'DRAFT') {
    throw new BizError('仅草稿报销申请可编辑', 400, 'INVALID_REIMBURSEMENT_STATUS');
  }
  if (!isAdmin(actor) && application.applicantId !== actor.id) {
    throw new BizError('无权编辑该报销申请', 403, 'REIMBURSEMENT_DRAFT_MUTATE_FORBIDDEN');
  }
}

export function canDepartmentReviewReimbursement(
  actor: ReimbursementActor,
  application: ReimbursementAccessRow,
  actorDepartmentId?: number | null,
): boolean {
  if (application.status !== 'DEPARTMENT_REVIEW') return false;
  if (isAdmin(actor)) return true;
  return (
    hasPermission(actor, 'reimbursement:department-review') &&
    actorDepartmentId != null &&
    actorDepartmentId === application.applicantDepartmentId
  );
}

export function canFinanceReviewReimbursement(actor: ReimbursementActor, application: ReimbursementAccessRow): boolean {
  return application.status === 'FINANCE_REVIEW' && (isAdmin(actor) || hasPermission(actor, 'reimbursement:finance-review'));
}

export function normalizeReimbursementReviewInput(input: ReimbursementReviewInput, decision: ReimbursementReviewDecision) {
  const comment = normalizeOptionalText(input.comment) ?? null;
  if (decision === 'reject') {
    if (!comment) {
      throw new BizError('驳回原因不能为空', 400, 'REIMBURSEMENT_REJECT_COMMENT_REQUIRED');
    }
    return { comment, signature: null };
  }

  if (!(input.signature instanceof File)) {
    throw new BizError('审核通过必须提供手写签名', 400, 'REIMBURSEMENT_SIGNATURE_REQUIRED');
  }
  assertAllowedReimbursementSignature({
    mimeType: input.signature.type,
    size: input.signature.size,
    originalName: input.signature.name,
  });
  return { comment, signature: input.signature };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function decimalToString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toFixed(2);
  return (value as { toString?: () => string })?.toString?.() ?? String(value);
}

export function serializeReimbursementRow(row: any) {
  return {
    id: row.id,
    applicationNo: row.applicationNo,
    title: row.title,
    category: row.category,
    occurredAt: toIso(row.occurredAt),
    amount: decimalToString(row.amount),
    reason: row.reason,
    payeeInfo: row.payeeInfo,
    remark: row.remark,
    status: row.status,
    applicantId: row.applicantId,
    applicantName: row.applicantName,
    applicantDepartmentId: row.applicantDepartmentId,
    applicantDepartmentName: row.applicantDepartmentName,
    submittedAt: toIso(row.submittedAt),
    completedAt: toIso(row.completedAt),
    attachmentCount: row.attachmentCount ?? row._count?.attachments ?? row.attachments?.length ?? 0,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function serializeReimbursementDetail(row: any) {
  return {
    ...serializeReimbursementRow(row),
    attachments: (row.attachments ?? []).map((attachment: any) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploaderId: attachment.uploaderId,
      createdAt: toIso(attachment.createdAt),
    })),
    actions: (row.actions ?? []).map((action: any) => ({
      id: action.id,
      actorId: action.actorId,
      actorName: action.actorName,
      type: action.type,
      nodeName: action.nodeName,
      comment: action.comment,
      signatureRelativePath: action.signatureRelativePath,
      signatureMimeType: action.signatureMimeType,
      signatureSize: action.signatureSize,
      createdAt: toIso(action.createdAt),
    })),
  };
}

function buildVisibilityWhere(actor: ReimbursementActor, actorDepartmentId: number | null) {
  if (isAdmin(actor) || hasPermission(actor, 'reimbursement:list')) return {};

  const or: Record<string, unknown>[] = [{ applicantId: actor.id }];
  if (hasPermission(actor, 'reimbursement:department-review') && actorDepartmentId != null) {
    or.push({ status: 'DEPARTMENT_REVIEW', applicantDepartmentId: actorDepartmentId });
  }
  if (hasPermission(actor, 'reimbursement:finance-review')) {
    or.push({ status: { in: ['FINANCE_REVIEW', 'APPROVED', 'REJECTED'] } });
  }
  return { OR: or };
}

function buildFilterWhere(filters: ReturnType<typeof normalizeReimbursementListFilters>) {
  const and: Record<string, unknown>[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.category) and.push({ category: { contains: filters.category, mode: 'insensitive' } });
  if (filters.dateFrom || filters.dateTo) {
    and.push({ occurredAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } });
  }
  if (filters.keyword) {
    and.push({
      OR: [
        { applicationNo: { contains: filters.keyword, mode: 'insensitive' } },
        { title: { contains: filters.keyword, mode: 'insensitive' } },
        { reason: { contains: filters.keyword, mode: 'insensitive' } },
        { applicantName: { contains: filters.keyword, mode: 'insensitive' } },
      ],
    });
  }
  return and;
}

export async function listReimbursements(actor: ReimbursementActor, input: ReimbursementListFilters = {}) {
  const filters = normalizeReimbursementListFilters(input);
  const actorDepartmentId = await loadActorDepartmentId(actor.id);
  const and = [buildVisibilityWhere(actor, actorDepartmentId), ...buildFilterWhere(filters)].filter(
    (item) => Object.keys(item).length > 0,
  );
  const where = and.length > 0 ? { AND: and } : {};

  const [rows, total] = await Promise.all([
    reimbursementApplication().findMany({
      where,
      include: { _count: { select: { attachments: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
    }),
    reimbursementApplication().count({ where }),
  ]);

  return { rows, total, page: filters.page, size: filters.size };
}

async function listReviewReimbursements(
  actor: ReimbursementActor,
  input: ReimbursementListFilters,
  stage: ReimbursementReviewStage,
) {
  const filters = normalizeReimbursementListFilters(input);
  const actorDepartmentId = stage === 'department' ? await loadActorDepartmentId(actor.id) : null;
  const scopeWhere =
    stage === 'department'
      ? {
          status: 'DEPARTMENT_REVIEW',
          ...(!isAdmin(actor) ? { applicantDepartmentId: actorDepartmentId ?? -1 } : {}),
        }
      : { status: 'FINANCE_REVIEW' };
  const and = [scopeWhere, ...buildFilterWhere(filters)].filter((item) => Object.keys(item).length > 0);
  const where = { AND: and };

  const [rows, total] = await Promise.all([
    reimbursementApplication().findMany({
      where,
      include: { _count: { select: { attachments: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
    }),
    reimbursementApplication().count({ where }),
  ]);

  return { rows, total, page: filters.page, size: filters.size };
}

export async function listDepartmentReviewReimbursements(actor: ReimbursementActor, input: ReimbursementListFilters = {}) {
  if (!isAdmin(actor) && !hasPermission(actor, 'reimbursement:department-review')) {
    throw new BizError('无权查看部门初审队列', 403, 'REIMBURSEMENT_DEPARTMENT_REVIEW_FORBIDDEN');
  }
  return listReviewReimbursements(actor, input, 'department');
}

export async function listFinanceReviewReimbursements(actor: ReimbursementActor, input: ReimbursementListFilters = {}) {
  if (!isAdmin(actor) && !hasPermission(actor, 'reimbursement:finance-review')) {
    throw new BizError('无权查看财务复核队列', 403, 'REIMBURSEMENT_FINANCE_REVIEW_FORBIDDEN');
  }
  return listReviewReimbursements(actor, input, 'finance');
}

export async function getReimbursementDetail(actor: ReimbursementActor, id: number) {
  const [application, actorDepartmentId] = await Promise.all([
    reimbursementApplication().findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { createdAt: 'desc' } },
        actions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    }),
    loadActorDepartmentId(actor.id),
  ]);
  if (!application) throw notFound('报销申请不存在');
  assertCanViewReimbursement(actor, application, actorDepartmentId);
  return serializeReimbursementDetail(application);
}

export async function createReimbursementDraft(actor: ReimbursementActor, input: ReimbursementWriteInput) {
  const [applicant, data] = await Promise.all([loadApplicant(actor), Promise.resolve(normalizeReimbursementWriteInput(input))]);
  return reimbursementApplication().create({
    data: {
      ...data,
      applicationNo: buildApplicationNo(),
      status: 'DRAFT',
      applicantId: applicant.id,
      applicantName: applicant.realName,
      applicantDepartmentId: applicant.departmentId,
      applicantDepartmentName: applicant.department?.name ?? null,
    },
  });
}

export async function updateReimbursementDraft(actor: ReimbursementActor, id: number, input: ReimbursementWriteInput) {
  const application = await reimbursementApplication().findUnique({ where: { id } });
  if (!application) throw notFound('报销申请不存在');
  assertCanMutateDraftReimbursement(actor, application);
  return reimbursementApplication().update({ where: { id }, data: normalizeReimbursementWriteInput(input) });
}

export async function submitReimbursementDraft(actor: ReimbursementActor, id: number) {
  return prisma.$transaction(async (tx) => {
    const application = await (tx as any).reimbursementApplication.findUnique({ where: { id } });
    if (!application) throw notFound('报销申请不存在');
    assertCanMutateDraftReimbursement(actor, application);
    assertReimbursementTransition(application.status, 'DEPARTMENT_REVIEW');

    const submittedAt = new Date();
    const updated = await (tx as any).reimbursementApplication.update({
      where: { id },
      data: { status: 'DEPARTMENT_REVIEW', submittedAt },
    });
    await (tx as any).reimbursementAction.create({
      data: {
        applicationId: id,
        actorId: actor.id,
        actorName: actor.name,
        type: 'SUBMIT',
        nodeName: REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
        comment: null,
      },
    });
    return updated;
  });
}

async function applyReviewAction(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput, options: ReviewActionOptions) {
  const decision: ReimbursementReviewDecision = options.requireSignature ? 'approve' : 'reject';
  const reviewInput = normalizeReimbursementReviewInput(input, decision);
  let signatureRelativePath: string | null = null;

  if (reviewInput.signature) {
    const storedName = getSafeReimbursementSignatureStoredName();
    signatureRelativePath = buildReimbursementSignatureRelativePath(id, options.actionType, storedName);
    await writeReimbursementFile(signatureRelativePath, reviewInput.signature);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const application = await (tx as any).reimbursementApplication.findUnique({ where: { id } });
      if (!application) throw notFound('报销申请不存在');
      assertReimbursementTransition(application.status, options.toStatus);
      if (application.status !== options.fromStatus) {
        throw new BizError('当前报销状态不可审核', 400, 'INVALID_REIMBURSEMENT_REVIEW_STATUS');
      }

      const actorDepartmentId = options.fromStatus === 'DEPARTMENT_REVIEW' ? await loadActorDepartmentId(actor.id) : null;
      const canReview =
        options.fromStatus === 'DEPARTMENT_REVIEW'
          ? canDepartmentReviewReimbursement(actor, application, actorDepartmentId)
          : canFinanceReviewReimbursement(actor, application);
      if (!canReview) {
        throw new BizError('无权审核该报销申请', 403, 'REIMBURSEMENT_REVIEW_FORBIDDEN');
      }

      const updated = await (tx as any).reimbursementApplication.update({
        where: { id },
        data: {
          status: options.toStatus,
          ...(options.completedAt ? { completedAt: options.completedAt } : {}),
        },
      });
      await (tx as any).reimbursementAction.create({
        data: {
          applicationId: id,
          actorId: actor.id,
          actorName: actor.name,
          type: options.actionType,
          nodeName: options.nodeName,
          comment: reviewInput.comment,
          signatureRelativePath,
          signatureMimeType: reviewInput.signature?.type ?? null,
          signatureSize: reviewInput.signature?.size ?? null,
        },
      });
      return updated;
    });
  } catch (error) {
    if (signatureRelativePath) await deleteReimbursementFile(signatureRelativePath);
    throw error;
  }
}

export function approveDepartmentReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput) {
  return applyReviewAction(actor, id, input, {
    actionType: 'DEPARTMENT_APPROVE',
    fromStatus: 'DEPARTMENT_REVIEW',
    toStatus: 'FINANCE_REVIEW',
    nodeName: REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
    requireSignature: true,
  });
}

export function rejectDepartmentReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput) {
  return applyReviewAction(actor, id, input, {
    actionType: 'DEPARTMENT_REJECT',
    fromStatus: 'DEPARTMENT_REVIEW',
    toStatus: 'REJECTED',
    nodeName: REIMBURSEMENT_DEPARTMENT_REVIEW_NODE,
    completedAt: new Date(),
  });
}

export function approveFinanceReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput) {
  return applyReviewAction(actor, id, input, {
    actionType: 'FINANCE_APPROVE',
    fromStatus: 'FINANCE_REVIEW',
    toStatus: 'APPROVED',
    nodeName: REIMBURSEMENT_FINANCE_REVIEW_NODE,
    requireSignature: true,
    completedAt: new Date(),
  });
}

export function rejectFinanceReimbursement(actor: ReimbursementActor, id: number, input: ReimbursementReviewInput) {
  return applyReviewAction(actor, id, input, {
    actionType: 'FINANCE_REJECT',
    fromStatus: 'FINANCE_REVIEW',
    toStatus: 'REJECTED',
    nodeName: REIMBURSEMENT_FINANCE_REVIEW_NODE,
    completedAt: new Date(),
  });
}

export const reimbursementServiceDelegates = {
  reimbursementApplication,
  reimbursementAction,
};
