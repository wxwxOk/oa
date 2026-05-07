export const CHANNEL_PUSH_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type ChannelPushStatus = (typeof CHANNEL_PUSH_STATUSES)[number];

export const CHANNEL_PUSH_LIST_FILTER_KEYS = ['keyword', 'status', 'dateFrom', 'dateTo'] as const;
export const CHANNEL_PUSH_REVIEW_VIEW_MODES = ['pending', 'handled'] as const;
export type ChannelPushReviewViewMode = (typeof CHANNEL_PUSH_REVIEW_VIEW_MODES)[number];
export const CHANNEL_PUSH_REVIEW_LIST_FILTER_KEYS = ['channelPartnerKeyword', 'status', 'dateFrom', 'dateTo'] as const;

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

export interface ChannelPushReviewListFilters {
  channelPartnerKeyword: string;
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

export type ChannelPushReviewListRequest = Partial<ChannelPushReviewListFilters> & {
  page?: number;
  size?: number;
};

export interface ChannelPushReviewRow {
  id: number;
  channelPartnerId: number;
  channelPartnerName: string;
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
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  internalScheduledReceiverId: number | null;
  internalScheduledReceiverName: string | null;
  internalScheduledDate: string | null;
  internalNote: string | null;
  attachmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ChannelPushReviewDetail = ChannelPushReviewRow & {
  attachments: ChannelPushAttachment[];
  reviewActions: ChannelPushReviewAction[];
  duplicateHints: ChannelPushDuplicateHint[];
};

export interface ChannelPushReviewInternalFieldsPayload {
  internalScheduledReceiverId?: number | null;
  internalScheduledDate?: string | null;
  internalNote?: string | null;
}

export interface ChannelPushReviewDecisionPayload {
  comment?: string | null;
}

export interface ChannelPushReviewListResponse {
  rows: ChannelPushReviewRow[];
  total: number;
  page: number;
  size: number;
}

export type ChannelPushReviewDetailResponse = ChannelPushReviewDetail;

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

export function createEmptyChannelPushReviewFilters(): ChannelPushReviewListFilters {
  return { channelPartnerKeyword: '', status: '', dateFrom: '', dateTo: '' };
}

export function channelPushReviewViewLabel(view: ChannelPushReviewViewMode): string {
  return view === 'pending' ? '待我审核' : '已审核';
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

// ───── Excel Batch Import (Phase 34) ───────────────────────────────────────
//
// 8-column Excel template — order is fixed and validated strictly.
// Row 0 may be a merged title (or empty); row 1 is the header row;
// row 2+ is data. Mirrors v1.3 visit import (Phase 22).

export const CHANNEL_PUSH_IMPORT_HEADERS = [
  '学员姓名',
  '手机号',
  '年龄',
  '学历',
  '性别',
  '意向状态',
  '意向说明',
  '备注',
] as const;

export const MAX_CHANNEL_PUSH_IMPORT_ROWS = 500 as const;

export interface ChannelPushImportRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ChannelPushImportInvalidRow {
  rowNumber: number;
  rawCells: string[];
  errors: ChannelPushImportRowError[];
}

export interface ChannelPushImportValidRow {
  rowNumber: number;
  payload: ChannelPushWritePayload;
}

export interface ChannelPushImportDuplicateWarning {
  key: string;
  rowNumbers: number[];
  studentName: string;
  studentPhone: string;
}

export interface ChannelPushImportPreview {
  fileName?: string;
  headerValid: boolean;
  expectedHeaders: readonly string[];
  actualHeaders: string[];
  headerErrors: string[];
  validRows: ChannelPushImportValidRow[];
  invalidRows: ChannelPushImportInvalidRow[];
  duplicateWarnings: ChannelPushImportDuplicateWarning[];
  overLimit: boolean;
}

export interface ChannelPushBatchImportRequest {
  rows: ChannelPushWritePayload[];
}

export interface ChannelPushBatchImportFailedRow {
  index: number;
  reason: string;
  code?: string;
}

export interface ChannelPushBatchImportResponse {
  createdCount: number;
  total: number;
  failedRows: ChannelPushBatchImportFailedRow[];
  duplicateHints: ChannelPushDuplicateHint[];
}
