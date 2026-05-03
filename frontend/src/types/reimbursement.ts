export const REIMBURSEMENT_STATUSES = [
  'DRAFT',
  'DEPARTMENT_REVIEW',
  'FINANCE_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;

export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];

export interface ReimbursementAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploaderId: number;
  createdAt: string | null;
}

export interface ReimbursementAction {
  id: number;
  actorId: number | null;
  actorName: string;
  type: string;
  nodeName: string | null;
  comment: string | null;
  signatureRelativePath: string | null;
  signatureMimeType: string | null;
  signatureSize: number | null;
  createdAt: string | null;
}

export interface ReimbursementRow {
  id: number;
  applicationNo: string;
  title: string;
  category: string;
  occurredAt: string | null;
  amount: string;
  reason: string;
  payeeInfo: string | null;
  remark: string | null;
  status: ReimbursementStatus;
  applicantId: number;
  applicantName: string;
  applicantDepartmentId: number | null;
  applicantDepartmentName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  attachmentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ReimbursementDetail = ReimbursementRow & {
  attachments: ReimbursementAttachment[];
  actions: ReimbursementAction[];
};

export interface ReimbursementListResponse {
  rows: ReimbursementRow[];
  total: number;
  page: number;
  size: number;
}

export interface ReimbursementListFilters {
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  keyword: string;
}

export type ReimbursementListRequest = Partial<ReimbursementListFilters> & {
  page?: number;
  size?: number;
};

export interface ReimbursementWritePayload {
  title: string;
  category: string;
  occurredAt: string;
  amount: string | number;
  reason: string;
  payeeInfo?: string | null;
  remark?: string | null;
}

export const REIMBURSEMENT_WRITE_PAYLOAD_KEYS = [
  'title',
  'category',
  'occurredAt',
  'amount',
  'reason',
  'payeeInfo',
  'remark',
] as const;

export const REIMBURSEMENT_LIST_FILTER_KEYS = ['status', 'category', 'dateFrom', 'dateTo', 'keyword'] as const;

export const ALLOWED_REIMBURSEMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const MAX_REIMBURSEMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_REIMBURSEMENT_ATTACHMENTS = 20;

const STATUS_LABELS: Record<ReimbursementStatus, string> = {
  DRAFT: '草稿',
  DEPARTMENT_REVIEW: '部门初审',
  FINANCE_REVIEW: '财务复核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

const STATUS_COLORS: Record<ReimbursementStatus, string> = {
  DRAFT: 'grey',
  DEPARTMENT_REVIEW: 'orange',
  FINANCE_REVIEW: 'primary',
  APPROVED: 'positive',
  REJECTED: 'negative',
};

export function createEmptyReimbursementFilters(): ReimbursementListFilters {
  return {
    status: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    keyword: '',
  };
}

export function reimbursementStatusLabel(status: ReimbursementStatus): string {
  return STATUS_LABELS[status];
}

export function reimbursementStatusColor(status: ReimbursementStatus): string {
  return STATUS_COLORS[status];
}

export function isDraftReimbursement(row: Pick<ReimbursementRow, 'status'>): boolean {
  return row.status === 'DRAFT';
}

export function formatReimbursementDate(value?: string | null): string {
  if (!value) return '-';
  return value.slice(0, 10);
}

export function formatReimbursementAmount(value?: string | number | null): string {
  const amount = Number(value);
  return `¥${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
}

export function formatFileSize(size?: number | null): string {
  if (!Number.isFinite(size) || !size || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeOptionalText(value?: string | null): string | null {
  const text = value?.trim() ?? '';
  return text || null;
}

export function normalizeReimbursementPayload(payload: ReimbursementWritePayload): ReimbursementWritePayload {
  const amount = Number(payload.amount);
  return {
    title: payload.title.trim(),
    category: payload.category.trim(),
    occurredAt: payload.occurredAt.trim(),
    amount: Number.isFinite(amount) ? amount.toFixed(2) : '0.00',
    reason: payload.reason.trim(),
    payeeInfo: normalizeOptionalText(payload.payeeInfo),
    remark: normalizeOptionalText(payload.remark),
  };
}
