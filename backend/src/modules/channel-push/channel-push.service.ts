import type { ChannelPushStatus } from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import {
  CHANNEL_PUSH_OWNER_MUTABLE_STATUSES,
  type DuplicateHint,
} from './channel-push.constants';
import { findChannelPushDuplicates } from './channel-push-dedup.service';
import {
  buildChannelPushRelativePath,
  getSafeChannelPushStoredName,
  saveChannelPushAttachmentFile,
  removeChannelPushAttachmentFile,
} from './channel-push-file.service';
import { notifyChannelPushPendingReview } from './channel-push-notification.service';

const MAX_PAGE_SIZE = 100;
const MAX_NAME_LEN = 64;
const MAX_NOTE_LEN = 1000;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export type ChannelPushActor = {
  id: number;
  name: string;
  roleCodes: string[];
  permissions: string[];
};

export type ChannelPushWriteInput = {
  studentName?: unknown;
  studentPhone?: unknown;
  studentAge?: unknown;
  studentEducation?: unknown;
  studentGender?: unknown;
  intentStatus?: unknown;
  intentNote?: unknown;
  remark?: unknown;
};

export type ChannelPushListFilters = {
  page?: number | string;
  size?: number | string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
};

export type ChannelPushAudience = 'partner' | 'recipient';

type NormalizedWrite = {
  studentName: string;
  studentPhone: string;
  studentAge: number | null;
  studentEducation: string | null;
  studentGender: string | null;
  intentStatus: string | null;
  intentNote: string | null;
  remark: string | null;
};

type NormalizedFilters = {
  page: number;
  size: number;
  status?: ChannelPushStatus;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
};

const VALID_STATUSES: ReadonlyArray<ChannelPushStatus> = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

function trimStr(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireStr(value: unknown, field: string, max = MAX_NAME_LEN): string {
  if (typeof value !== 'string') {
    throw new BizError(`${field} 必填`, 422, 'CHANNEL_PUSH_FIELD_REQUIRED');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BizError(`${field} 不能为空`, 422, 'CHANNEL_PUSH_FIELD_REQUIRED');
  }
  if (trimmed.length > max) {
    throw new BizError(`${field} 长度不能超过 ${max}`, 422, 'CHANNEL_PUSH_FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizePhone(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new BizError('手机号必填', 422, 'CHANNEL_PUSH_PHONE_REQUIRED');
  }
  const stripped = raw.replace(/[\s\-()+]/g, '');
  // strip leading +86 / 86 country code
  const digits = stripped.replace(/^(?:\+?86)/, '');
  if (!PHONE_REGEX.test(digits)) {
    throw new BizError('手机号格式不正确', 422, 'CHANNEL_PUSH_PHONE_INVALID');
  }
  return digits;
}

export function normalizeChannelPushWriteInput(input: ChannelPushWriteInput): NormalizedWrite {
  const studentName = requireStr(input.studentName, '学员姓名', MAX_NAME_LEN);
  const studentPhone = normalizePhone(input.studentPhone);

  let studentAge: number | null = null;
  if (input.studentAge !== undefined && input.studentAge !== null && input.studentAge !== '') {
    const n = Number(input.studentAge);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 120) {
      throw new BizError('年龄必须在 1..120', 422, 'CHANNEL_PUSH_AGE_INVALID');
    }
    studentAge = n;
  }

  return {
    studentName,
    studentPhone,
    studentAge,
    studentEducation: trimStr(input.studentEducation),
    studentGender: trimStr(input.studentGender),
    intentStatus: trimStr(input.intentStatus),
    intentNote: trimStr(input.intentNote),
    remark: trimStr(input.remark),
  };
}

export function normalizeChannelPushListFilters(input: ChannelPushListFilters): NormalizedFilters {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(input.size ?? 20) || 20));

  const status =
    typeof input.status === 'string' && VALID_STATUSES.includes(input.status as ChannelPushStatus)
      ? (input.status as ChannelPushStatus)
      : undefined;

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (typeof input.dateFrom === 'string' && input.dateFrom) {
    const d = new Date(input.dateFrom + 'T00:00:00.000Z');
    if (!Number.isNaN(d.getTime())) dateFrom = d;
  }
  if (typeof input.dateTo === 'string' && input.dateTo) {
    const d = new Date(input.dateTo + 'T23:59:59.999Z');
    if (!Number.isNaN(d.getTime())) dateTo = d;
  }

  const keyword = typeof input.keyword === 'string' ? input.keyword.trim() : undefined;

  return {
    page,
    size,
    status,
    dateFrom,
    dateTo,
    keyword: keyword?.length ? keyword : undefined,
  };
}

export function assertCanMutateOwnChannelPush(
  record: { channelPartnerId: number; status: ChannelPushStatus },
  currentUser: ChannelPushActor,
): void {
  if (record.channelPartnerId !== currentUser.id) {
    throw new BizError('无权操作他人推送', 403, 'CHANNEL_PUSH_NOT_OWNER');
  }
  if (record.status !== 'PENDING') {
    throw new BizError('仅 PENDING 状态可编辑/撤回', 422, 'CHANNEL_PUSH_NOT_PENDING');
  }
}

export async function createChannelPush(
  currentUser: ChannelPushActor,
  body: ChannelPushWriteInput,
  files: Array<{ originalName: string; mimeType: string; size: number; relativePath: string }> = [],
) {
  const data = normalizeChannelPushWriteInput(body);

  // Snapshot recipient from profile — never trust body.recipientUserId
  const profile = await prisma.channelPartnerProfile.findUnique({
    where: { userId: currentUser.id },
  });
  if (!profile) {
    throw new BizError(
      '未绑定接收人，请联系管理员',
      422,
      'CHANNEL_PARTNER_NOT_BOUND',
    );
  }

  // Run dedup before persisting (non-blocking — result returned alongside push)
  const duplicateHints = await findChannelPushDuplicates({
    channelPartnerId: currentUser.id,
    studentName: data.studentName,
    studentPhone: data.studentPhone,
  });

  const submittedAt = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const push = await tx.channelPush.create({
      data: {
        channelPartnerId: currentUser.id,
        recipientUserId: profile.primaryRecipientId,
        ...data,
        status: 'PENDING',
        submittedAt,
      },
    });

    const attachments = [];
    for (const f of files) {
      const att = await tx.channelPushAttachment.create({
        data: {
          channelPushId: push.id,
          originalName: f.originalName,
          storedName: f.relativePath.split('/').pop() ?? '',
          relativePath: f.relativePath,
          mimeType: f.mimeType,
          size: f.size,
          uploaderId: currentUser.id,
        },
      });
      attachments.push(att);
    }

    const submitAction = await tx.channelPushReviewAction.create({
      data: {
        channelPushId: push.id,
        actorId: currentUser.id,
        actorName: currentUser.name,
        type: 'SUBMIT',
      },
    });

    await notifyChannelPushPendingReview(tx, {
      recipientUserId: profile.primaryRecipientId,
      pushId: push.id,
      studentName: push.studentName,
      channelPartnerName: currentUser.name,
    });

    return { push, attachments, submitAction };
  });

  return {
    push: serializeChannelPushDetail(
      {
        ...created.push,
        attachments: created.attachments,
        reviewActions: [created.submitAction],
      },
      'partner',
    ),
    duplicateHints,
  };
}

export async function editChannelPush(
  id: number,
  currentUser: ChannelPushActor,
  body: ChannelPushWriteInput,
) {
  const existing = await prisma.channelPush.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: 'asc' } },
      reviewActions: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!existing) {
    throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  }
  assertCanMutateOwnChannelPush(existing, currentUser);

  const data = normalizeChannelPushWriteInput(body);

  const duplicateHints = await findChannelPushDuplicates({
    channelPartnerId: currentUser.id,
    studentName: data.studentName,
    studentPhone: data.studentPhone,
    excludeId: id,
  });

  const lastEditedAt = new Date();
  const editAction = {
    id: 0,
    channelPushId: id,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: 'EDIT' as const,
    comment: null,
    createdAt: lastEditedAt,
  };

  await prisma.$transaction(async (tx) => {
    await tx.channelPush.update({
      where: { id },
      data: { ...data, lastEditedAt },
    });
    await tx.channelPushReviewAction.create({
      data: {
        channelPushId: id,
        actorId: currentUser.id,
        actorName: currentUser.name,
        type: 'EDIT',
      },
    });
  });

  return {
    push: serializeChannelPushDetail(
      {
        ...existing,
        ...data,
        lastEditedAt,
        attachments: (existing as any).attachments ?? [],
        reviewActions: [...(((existing as any).reviewActions ?? []) as any[]), editAction],
      },
      'partner',
    ),
    duplicateHints,
  };
}

export async function cancelChannelPush(id: number, currentUser: ChannelPushActor) {
  const existing = await prisma.channelPush.findUnique({ where: { id } });
  if (!existing) {
    throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  }
  assertCanMutateOwnChannelPush(existing, currentUser);

  const cancelledAt = new Date();
  const cancelAction = {
    id: 0,
    channelPushId: id,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: 'CANCEL' as const,
    comment: null,
    createdAt: cancelledAt,
  };

  await prisma.$transaction(async (tx) => {
    await tx.channelPush.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt },
    });
    await tx.channelPushReviewAction.create({
      data: {
        channelPushId: id,
        actorId: currentUser.id,
        actorName: currentUser.name,
        type: 'CANCEL',
      },
    });
  });

  // Compose DTO from existing snapshot + applied changes — no extra round-trip.
  return serializeChannelPushDetail(
    {
      ...existing,
      status: 'CANCELLED',
      cancelledAt,
      attachments: (existing as any).attachments ?? [],
      reviewActions: [...(((existing as any).reviewActions ?? []) as any[]), cancelAction],
    },
    'partner',
  );
}

export async function listMyChannelPushes(
  currentUser: ChannelPushActor,
  query: ChannelPushListFilters,
) {
  const filters = normalizeChannelPushListFilters(query);

  const where: Record<string, unknown> = { channelPartnerId: currentUser.id };
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {};
    if (filters.dateFrom) range.gte = filters.dateFrom;
    if (filters.dateTo) range.lte = filters.dateTo;
    where.submittedAt = range;
  }
  if (filters.keyword) {
    where.OR = [
      { studentName: { contains: filters.keyword } },
      { studentPhone: { contains: filters.keyword } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.channelPush.count({ where }),
    prisma.channelPush.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
      include: {
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        reviewActions: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => serializeChannelPushDetail(r, 'partner')),
    total,
    page: filters.page,
    size: filters.size,
  };
}

export async function getMyChannelPush(id: number, currentUser: ChannelPushActor) {
  const push = await loadChannelPushFull(id);
  if (!push) {
    throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  }
  if (push.channelPartnerId !== currentUser.id) {
    throw new BizError('无权查看他人推送', 403, 'CHANNEL_PUSH_NOT_OWNER');
  }
  return serializeChannelPushDetail(push, 'partner');
}

async function loadChannelPushFull(id: number) {
  return prisma.channelPush.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: 'asc' } },
      reviewActions: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export type ChannelPushAttachmentDTO = {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type ChannelPushReviewActionDTO = {
  id: number;
  type: string;
  actorName: string;
  comment: string | null;
  createdAt: string;
};

export type ChannelPushDetailDTO = {
  id: number;
  channelPartnerId: number;
  recipientUserId: number;
  studentName: string;
  studentPhone: string;
  studentAge: number | null;
  studentEducation: string | null;
  studentGender: string | null;
  intentStatus: string | null;
  intentNote: string | null;
  remark: string | null;
  status: ChannelPushStatus;
  submittedAt: string;
  lastEditedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: ChannelPushAttachmentDTO[];
  reviewActions: ChannelPushReviewActionDTO[];
  // Internal supplemental fields — only included for recipient/admin audience.
  internalScheduledReceiverId?: number | null;
  internalScheduledDate?: string | null;
  internalNote?: string | null;
};

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeChannelPushDetail(
  push: any,
  audience: ChannelPushAudience,
): ChannelPushDetailDTO {
  if (!push) {
    throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  }

  const dto: ChannelPushDetailDTO = {
    id: push.id,
    channelPartnerId: push.channelPartnerId,
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
    lastEditedAt: isoOrNull(push.lastEditedAt),
    cancelledAt: isoOrNull(push.cancelledAt),
    createdAt: isoOrNull(push.createdAt) as string,
    updatedAt: isoOrNull(push.updatedAt) as string,
    attachments: (push.attachments ?? []).map((a: any) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: isoOrNull(a.createdAt) as string,
    })),
    reviewActions: (push.reviewActions ?? []).map((r: any) => ({
      id: r.id,
      type: r.type,
      actorName: r.actorName,
      comment: r.comment ?? null,
      createdAt: isoOrNull(r.createdAt) as string,
    })),
  };

  if (audience === 'recipient') {
    dto.internalScheduledReceiverId = push.internalScheduledReceiverId ?? null;
    dto.internalScheduledDate = isoOrNull(push.internalScheduledDate);
    dto.internalNote = push.internalNote ?? null;
  }

  return dto;
}

// ───── Attachment helpers (used by route module) ─────

export type ChannelPushAttachmentInput = {
  originalName: string;
  mimeType: string;
  size: number;
  fileBlob: File;
};

export async function attachFilesToChannelPush(
  pushId: number,
  uploaderId: number,
  files: ChannelPushAttachmentInput[],
) {
  const records = [];
  for (const f of files) {
    const storedName = getSafeChannelPushStoredName(f.originalName, f.mimeType);
    const relativePath = buildChannelPushRelativePath(pushId, storedName);
    await saveChannelPushAttachmentFile(relativePath, f.fileBlob);
    const record = await prisma.channelPushAttachment.create({
      data: {
        channelPushId: pushId,
        originalName: f.originalName,
        storedName,
        relativePath,
        mimeType: f.mimeType,
        size: f.size,
        uploaderId,
      },
    });
    records.push(record);
  }
  return records;
}

export async function deleteChannelPushAttachmentRecord(attachmentId: number) {
  const att = await prisma.channelPushAttachment.findUnique({ where: { id: attachmentId } });
  if (!att) {
    throw new BizError('附件不存在', 404, 'CHANNEL_PUSH_ATTACHMENT_NOT_FOUND');
  }
  await prisma.channelPushAttachment.delete({ where: { id: attachmentId } });
  await removeChannelPushAttachmentFile(att.relativePath);
  return att;
}

export async function loadChannelPushAttachment(pushId: number, attachmentId: number) {
  const att = await prisma.channelPushAttachment.findFirst({
    where: { id: attachmentId, channelPushId: pushId },
  });
  if (!att) {
    throw new BizError('附件不存在', 404, 'CHANNEL_PUSH_ATTACHMENT_NOT_FOUND');
  }
  return att;
}

// ───── Batch import (Phase 34) ─────────────────────────────────────────────
//
// Partial-success: each row creates its own push via createChannelPush
// (preserves audit timeline, dedup, per-row tx). One failed row never
// rolls back already-created rows. Pre-flight CHANNEL_PARTNER_NOT_BOUND
// throws BEFORE iterating to avoid 500 wasted dedup queries.
//
// Hard contract (D-15): per-row creation only — no batch shortcuts.

export async function batchCreateChannelPushes(
  currentUser: ChannelPushActor,
  rows: ChannelPushWriteInput[],
): Promise<{
  createdCount: number;
  total: number;
  failedRows: Array<{ index: number; reason: string; code?: string }>;
  duplicateHints: DuplicateHint[];
}> {
  // Pre-flight — fail the entire batch if partner has no recipient profile.
  const profile = await prisma.channelPartnerProfile.findUnique({
    where: { userId: currentUser.id },
  });
  if (!profile) {
    throw new BizError(
      '未绑定接收人，请联系管理员',
      422,
      'CHANNEL_PARTNER_NOT_BOUND',
    );
  }

  const failedRows: Array<{ index: number; reason: string; code?: string }> = [];
  const hintMap = new Map<number, DuplicateHint>();
  let createdCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    try {
      const result = await createChannelPush(currentUser, row, []);
      createdCount += 1;
      for (const hint of result.duplicateHints) {
        if (!hintMap.has(hint.id)) hintMap.set(hint.id, hint);
      }
    } catch (err) {
      const biz = err as BizError;
      failedRows.push({
        index: i,
        reason: biz?.message ?? 'unknown error',
        ...(biz?.code ? { code: biz.code } : {}),
      });
    }
  }

  return {
    createdCount,
    total: rows.length,
    failedRows,
    duplicateHints: Array.from(hintMap.values()),
  };
}

export type { DuplicateHint };
