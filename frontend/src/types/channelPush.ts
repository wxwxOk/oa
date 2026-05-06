export const CHANNEL_PUSH_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type ChannelPushStatus = (typeof CHANNEL_PUSH_STATUSES)[number];

export const CHANNEL_PUSH_LIST_FILTER_KEYS = ['keyword', 'status', 'dateFrom', 'dateTo'] as const;

export const ALLOWED_CHANNEL_PUSH_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const MAX_CHANNEL_PUSH_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_CHANNEL_PUSH_ATTACHMENTS = 20;

export interface ChannelPushAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploaderId?: number;
  createdAt: string | null;
}

export interface ChannelPushReviewAction {
  id: number;
  actorId: number | null;
  actorName: string | null;
  type: string;
  comment?: string | null;
  createdAt: string | null;
}

export interface ChannelPushRow {
  id: number;
  studentName: string;
  studentPhone: string;
  studentAge: number | null;
  studentEducation: string | null;
  studentGender: string | null;
  intentStatus: string | null;
  intentNote: string | null;
  remark: string | null;
  status: ChannelPushStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  attachmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ChannelPushDetail = ChannelPushRow & {
  attachments: ChannelPushAttachment[];
  reviewActions: ChannelPushReviewAction[];
};

export interface ChannelPushDuplicateHint {
  id: number;
  studentName: string;
  studentPhone: string;
  status: ChannelPushStatus;
  submittedAt: string | null;
}

export interface ChannelPushWritePayload {
  studentName: string;
  studentPhone: string;
  studentAge?: number | string | null;
  studentEducation?: string | null;
  studentGender?: string | null;
  intentStatus?: string | null;
  intentNote?: string | null;
  remark?: string | null;
}

export interface ChannelPushListFilters {
  keyword: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export type ChannelPushListRequest = Partial<ChannelPushListFilters> & {
  page?: number;
  size?: number;
};

export interface ChannelPushListResponse {
  rows: ChannelPushRow[];
  total: number;
  page: number;
  size: number;
}

export interface ChannelPushSubmitResponse {
  push: ChannelPushDetail;
  duplicateHints: ChannelPushDuplicateHint[];
}

const STATUS_LABELS: Record<ChannelPushStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELLED: '已撤回',
};

const STATUS_COLORS: Record<ChannelPushStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'positive',
  REJECTED: 'negative',
  CANCELLED: 'grey-5',
};

export function channelPushStatusLabel(status: ChannelPushStatus): string {
  return STATUS_LABELS[status];
}

export function channelPushStatusColor(status: ChannelPushStatus): string {
  return STATUS_COLORS[status];
}

export function isPendingChannelPush(row: { status: ChannelPushStatus }): boolean {
  return row.status === 'PENDING';
}

export function createEmptyChannelPushFilters(): ChannelPushListFilters {
  return { keyword: '', status: '', dateFrom: '', dateTo: '' };
}

export function normalizeChannelPushPayload(input: ChannelPushWritePayload) {
  const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  const ageRaw = input.studentAge;
  const studentAge =
    empty(ageRaw)
      ? undefined
      : Number.isFinite(Number(ageRaw))
        ? Number(ageRaw)
        : undefined;
  return {
    studentName: trim(input.studentName) as string,
    studentPhone: trim(input.studentPhone) as string,
    ...(studentAge !== undefined ? { studentAge } : {}),
    ...(empty(input.studentEducation) ? {} : { studentEducation: trim(input.studentEducation) as string }),
    ...(empty(input.studentGender) ? {} : { studentGender: trim(input.studentGender) as string }),
    ...(empty(input.intentStatus) ? {} : { intentStatus: trim(input.intentStatus) as string }),
    ...(empty(input.intentNote) ? {} : { intentNote: trim(input.intentNote) as string }),
    ...(empty(input.remark) ? {} : { remark: trim(input.remark) as string }),
  };
}

export function formatChannelPushDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}
