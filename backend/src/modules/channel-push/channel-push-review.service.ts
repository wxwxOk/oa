import type { ChannelPushStatus } from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import type { DuplicateHint } from './channel-push.constants';
import { findChannelPushDuplicates } from './channel-push-dedup.service';
import { assertChannelPushTransition } from './channel-push.state';
import type {
  ChannelPushActor,
  ChannelPushAttachmentDTO,
  ChannelPushReviewActionDTO,
} from './channel-push.service';

const MAX_PAGE_SIZE = 100;
const MAX_INTERNAL_NOTE_LEN = 1000;
const REVIEW_TERMINAL_STATUSES: ChannelPushStatus[] = ['APPROVED', 'REJECTED'];

export type ChannelPushReviewListFilters = {
  page?: number | string;
  size?: number | string;
  channelPartnerKeyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ChannelPushReviewInternalFieldsInput = {
  internalScheduledReceiverId?: unknown;
  internalScheduledDate?: unknown;
  internalNote?: unknown;
};

export type ChannelPushReviewDecisionInput = {
  comment?: unknown;
};

type NormalizedReviewListFilters = {
  page: number;
  size: number;
  channelPartnerKeyword?: string;
  status?: ChannelPushStatus;
  dateFrom?: Date;
  dateTo?: Date;
};

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function normalizePage(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function parseDateBoundary(value: unknown, boundary: 'start' | 'end'): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const text = value.trim();
  const normalized = text.includes('T')
    ? text
    : `${text}T${boundary === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BizError('日期格式无效', 400, 'CHANNEL_PUSH_REVIEW_DATE_INVALID');
  }
  return parsed;
}

function normalizeReviewStatus(value: unknown): ChannelPushStatus | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const status = value.trim() as ChannelPushStatus;
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) return status;
  throw new BizError('审核状态筛选值无效', 400, 'CHANNEL_PUSH_REVIEW_STATUS_INVALID');
}

function normalizeOptionalText(value: unknown, max = MAX_INTERNAL_NOTE_LEN): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > max) {
    throw new BizError(`文本长度不能超过 ${max}`, 422, 'CHANNEL_PUSH_REVIEW_TEXT_TOO_LONG');
  }
  return text;
}

function normalizeOptionalUserId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BizError('计划接待人无效', 422, 'CHANNEL_PUSH_REVIEW_RECEIVER_INVALID');
  }
  return parsed;
}

function normalizeOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BizError('预期接待日期无效', 422, 'CHANNEL_PUSH_REVIEW_DATE_INVALID');
    }
    return value;
  }
  const parsed = new Date(`${String(value).trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BizError('预期接待日期无效', 422, 'CHANNEL_PUSH_REVIEW_DATE_INVALID');
  }
  return parsed;
}

function normalizeDecisionComment(value: unknown, required: boolean): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) {
    throw new BizError('驳回意见不能为空', 422, 'CHANNEL_PUSH_REJECT_COMMENT_REQUIRED');
  }
  if (text.length > MAX_INTERNAL_NOTE_LEN) {
    throw new BizError('审核备注长度不能超过 1000', 422, 'CHANNEL_PUSH_REVIEW_COMMENT_TOO_LONG');
  }
  return text || null;
}

function latestReviewAction(push: any) {
  return [...(push.reviewActions ?? [])]
    .filter((action) => action.type === 'APPROVE' || action.type === 'REJECT')
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    })[0];
}

function serializeAttachment(attachment: any): ChannelPushAttachmentDTO {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: isoOrNull(attachment.createdAt) as string,
  };
}

function serializeReviewAction(action: any): ChannelPushReviewActionDTO {
  return {
    id: action.id,
    type: action.type,
    actorName: action.actorName,
    comment: action.comment ?? null,
    createdAt: isoOrNull(action.createdAt) as string,
  };
}

function serializeDuplicateHint(hint: DuplicateHint) {
  return {
    id: hint.id,
    studentName: hint.studentName,
    studentPhone: hint.studentPhone,
    status: hint.status,
    submittedAt: isoOrNull(hint.submittedAt) as string,
  };
}

function buildReviewWhere(actor: ChannelPushActor, filters: NormalizedReviewListFilters, mode: 'pending' | 'handled') {
  const where: Record<string, unknown> = { recipientUserId: actor.id };
  where.status = mode === 'pending' ? 'PENDING' : { in: REVIEW_TERMINAL_STATUSES };

  if (mode === 'handled' && filters.status) {
    if (!REVIEW_TERMINAL_STATUSES.includes(filters.status)) {
      throw new BizError('已审核列表仅支持 APPROVED / REJECTED 状态', 400, 'CHANNEL_PUSH_REVIEW_STATUS_INVALID');
    }
    where.status = filters.status;
  }

  if (filters.channelPartnerKeyword) {
    where.channelPartner = {
      OR: [
        { realName: { contains: filters.channelPartnerKeyword } },
        { username: { contains: filters.channelPartnerKeyword } },
      ],
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {};
    if (filters.dateFrom) range.gte = filters.dateFrom;
    if (filters.dateTo) range.lte = filters.dateTo;
    where.submittedAt = range;
  }

  return where;
}

function includeReviewRelations() {
  return {
    channelPartner: { select: { id: true, username: true, realName: true } },
    internalScheduledReceiver: { select: { id: true, username: true, realName: true } },
    attachments: { orderBy: { createdAt: 'asc' as const } },
    reviewActions: { orderBy: { createdAt: 'asc' as const } },
  };
}

async function loadReviewChannelPushForActor(id: number, actor: ChannelPushActor) {
  const push = await prisma.channelPush.findUnique({
    where: { id },
    include: includeReviewRelations(),
  });
  if (!push) {
    throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  }
  if (push.recipientUserId !== actor.id) {
    throw new BizError('无权查看非本人接收的推送', 403, 'CHANNEL_PUSH_REVIEW_FORBIDDEN');
  }
  return push;
}

export function normalizeReviewListFilters(input: ChannelPushReviewListFilters = {}): NormalizedReviewListFilters {
  return {
    page: normalizePage(input.page),
    size: normalizeSize(input.size),
    channelPartnerKeyword:
      typeof input.channelPartnerKeyword === 'string' && input.channelPartnerKeyword.trim()
        ? input.channelPartnerKeyword.trim()
        : undefined,
    status: normalizeReviewStatus(input.status),
    dateFrom: parseDateBoundary(input.dateFrom, 'start'),
    dateTo: parseDateBoundary(input.dateTo, 'end'),
  };
}

export function serializeChannelPushReviewRow(push: any) {
  const reviewAction = latestReviewAction(push);
  const channelPartnerName = push.channelPartner?.realName || push.channelPartner?.username || String(push.channelPartnerId);
  const internalScheduledReceiverName = push.internalScheduledReceiver
    ? push.internalScheduledReceiver.realName || push.internalScheduledReceiver.username
    : null;

  return {
    id: push.id,
    channelPartnerId: push.channelPartnerId,
    channelPartnerName,
    recipientUserId: push.recipientUserId,
    studentName: push.studentName,
    studentPhone: push.studentPhone,
    studentAge: push.studentAge ?? null,
    studentEducation: push.studentEducation ?? null,
    studentGender: push.studentGender ?? null,
    intentStatus: push.intentStatus ?? null,
    intentNote: push.intentNote ?? null,
    remark: push.remark ?? null,
    status: push.status,
    submittedAt: isoOrNull(push.submittedAt) as string,
    reviewedAt: isoOrNull(reviewAction?.createdAt),
    reviewComment: reviewAction?.comment ?? null,
    internalScheduledReceiverId: push.internalScheduledReceiverId ?? null,
    internalScheduledReceiverName,
    internalScheduledDate: isoOrNull(push.internalScheduledDate),
    internalNote: push.internalNote ?? null,
    attachmentCount: push.attachments?.length ?? 0,
    createdAt: isoOrNull(push.createdAt) as string,
    updatedAt: isoOrNull(push.updatedAt) as string,
  };
}

export function serializeChannelPushReviewDetail(push: any, duplicateHints: DuplicateHint[] = []) {
  return {
    ...serializeChannelPushReviewRow(push),
    attachments: (push.attachments ?? []).map(serializeAttachment),
    reviewActions: (push.reviewActions ?? []).map(serializeReviewAction),
    duplicateHints: duplicateHints.map(serializeDuplicateHint),
  };
}

export async function listReviewPendingChannelPushes(actor: ChannelPushActor, query: ChannelPushReviewListFilters) {
  const filters = normalizeReviewListFilters(query);
  const where = buildReviewWhere(actor, filters, 'pending');

  const [total, rows] = await Promise.all([
    prisma.channelPush.count({ where }),
    prisma.channelPush.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
      include: includeReviewRelations(),
    }),
  ]);

  return { rows: rows.map(serializeChannelPushReviewRow), total, page: filters.page, size: filters.size };
}

export async function listReviewHandledChannelPushes(actor: ChannelPushActor, query: ChannelPushReviewListFilters) {
  const filters = normalizeReviewListFilters(query);
  const where = buildReviewWhere(actor, filters, 'handled');

  const [total, rows] = await Promise.all([
    prisma.channelPush.count({ where }),
    prisma.channelPush.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
      include: includeReviewRelations(),
    }),
  ]);

  return { rows: rows.map(serializeChannelPushReviewRow), total, page: filters.page, size: filters.size };
}

export async function getReviewChannelPush(id: number, actor: ChannelPushActor) {
  const push = await loadReviewChannelPushForActor(id, actor);
  const duplicateHints = await findChannelPushDuplicates({
    channelPartnerId: push.channelPartnerId,
    studentName: push.studentName,
    studentPhone: push.studentPhone,
    excludeId: push.id,
  });
  return serializeChannelPushReviewDetail(push, duplicateHints);
}

export async function saveReviewInternalFields(
  id: number,
  actor: ChannelPushActor,
  body: ChannelPushReviewInternalFieldsInput,
) {
  const existing = await loadReviewChannelPushForActor(id, actor);

  const data: Record<string, unknown> = {};
  const receiverId = normalizeOptionalUserId(body.internalScheduledReceiverId);
  const scheduledDate = normalizeOptionalDate(body.internalScheduledDate);
  const note = normalizeOptionalText(body.internalNote);
  if (receiverId !== undefined) data.internalScheduledReceiverId = receiverId;
  if (scheduledDate !== undefined) data.internalScheduledDate = scheduledDate;
  if (note !== undefined) data.internalNote = note;

  if (Object.keys(data).length === 0) {
    return serializeChannelPushReviewDetail(existing, []);
  }

  const updated = await prisma.channelPush.update({
    where: { id },
    data,
    include: includeReviewRelations(),
  });
  const duplicateHints = await findChannelPushDuplicates({
    channelPartnerId: updated.channelPartnerId,
    studentName: updated.studentName,
    studentPhone: updated.studentPhone,
    excludeId: updated.id,
  });
  return serializeChannelPushReviewDetail(updated, duplicateHints);
}

async function decideReviewChannelPush(
  id: number,
  actor: ChannelPushActor,
  body: ChannelPushReviewDecisionInput,
  decision: 'APPROVED' | 'REJECTED',
) {
  const existing = await loadReviewChannelPushForActor(id, actor);
  assertChannelPushTransition(existing.status, decision);

  const comment = normalizeDecisionComment(body.comment, decision === 'REJECTED');
  const actionType = decision === 'APPROVED' ? 'APPROVE' : 'REJECT';
  const reviewedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.channelPush.update({
      where: { id },
      data: { status: decision },
    });
    await tx.channelPushReviewAction.create({
      data: {
        channelPushId: id,
        actorId: actor.id,
        actorName: actor.name,
        type: actionType,
        comment,
        createdAt: reviewedAt,
      },
    });
    return tx.channelPush.findUnique({
      where: { id },
      include: includeReviewRelations(),
    });
  });

  return serializeChannelPushReviewDetail(updated, []);
}

export function approveReviewChannelPush(
  id: number,
  actor: ChannelPushActor,
  body: ChannelPushReviewDecisionInput = {},
) {
  return decideReviewChannelPush(id, actor, body, 'APPROVED');
}

export function rejectReviewChannelPush(
  id: number,
  actor: ChannelPushActor,
  body: ChannelPushReviewDecisionInput = {},
) {
  return decideReviewChannelPush(id, actor, body, 'REJECTED');
}
