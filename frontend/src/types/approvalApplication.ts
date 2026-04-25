import type { SchemaV2 } from './schema';

export type ApprovalApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED';

export type ApplicationListStatusFilter =
  | ''
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED';

export interface AvailableApprovalTemplate {
  id: number;
  name: string;
  description: string | null;
  schemaVersion: number;
  approvalProcessId: number;
  approvalProcessName: string;
  updatedAt: string;
}

export interface ApprovalApplicationRow {
  id: number;
  applicationNo: string;
  status: ApprovalApplicationStatus;
  templateId: number;
  templateName: string;
  templateVersion: number;
  processId: number | null;
  processName: string | null;
  applicantName: string;
  applicantDepartmentName: string | null;
  currentNodeOrder: number | null;
  currentNodeName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canCancel: boolean;
}

export interface ApprovalTimelineEvent {
  id: number;
  taskId: number | null;
  actorId: number | null;
  actorName: string;
  nodeOrder: number | null;
  nodeName: string | null;
  type: 'SUBMIT' | 'ASSIGN' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'EDIT' | 'MARK' | 'COMMENT';
  title: string;
  comment: string | null;
  payload: unknown;
  createdAt: string;
}

export interface ApprovalTaskSummary {
  id: number;
  nodeOrder: number;
  nodeName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'SKIPPED';
  assigneeId: number;
  assigneeName: string;
  assignedAt: string;
  handledAt: string | null;
  comment: string | null;
}

export interface ApprovalProcessSnapshotNode {
  order: number;
  name: string;
  approverSourceType: 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
  approverUserId?: number | null;
  approverRoleId?: number | null;
  assigneeId: number;
  assigneeName: string;
  approverSourceLabel?: string | null;
}

export interface ApprovalProcessSnapshot {
  processId?: number | null;
  processName?: string | null;
  nodes: ApprovalProcessSnapshotNode[];
}

export interface ApprovalApplicationDetail extends ApprovalApplicationRow {
  formData: Record<string, unknown>;
  schemaSnapshot: SchemaV2;
  processSnapshot: ApprovalProcessSnapshot;
  timeline: ApprovalTimelineEvent[];
  tasks: ApprovalTaskSummary[];
}

export interface ApplicationListFilters {
  page?: number;
  size?: number;
  status?: ApplicationListStatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateDraftPayload {
  templateId: number;
  formData?: Record<string, unknown>;
}

export interface UpdateDraftPayload {
  formData: Record<string, unknown>;
}

export interface SubmitApplicationPayload {
  formData?: Record<string, unknown>;
}

export interface CancelApplicationPayload {
  reason?: string;
}

export const CREATE_DRAFT_PAYLOAD_KEYS = ['templateId', 'formData'] as const;
export const UPDATE_DRAFT_PAYLOAD_KEYS = ['formData'] as const;
export const SUBMIT_APPLICATION_PAYLOAD_KEYS = ['formData'] as const;
export const CANCEL_APPLICATION_PAYLOAD_KEYS = ['reason'] as const;

const STATUS_LABELS: Record<ApprovalApplicationStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '审批中',
  APPROVING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已撤销',
};

const STATUS_COLORS: Record<ApprovalApplicationStatus, string> = {
  DRAFT: 'warning',
  SUBMITTED: 'primary',
  APPROVING: 'primary',
  APPROVED: 'positive',
  REJECTED: 'negative',
  CANCELED: 'grey',
};

export function statusLabel(status: ApprovalApplicationStatus): string {
  return STATUS_LABELS[status];
}

export function statusColor(status: ApprovalApplicationStatus): string {
  return STATUS_COLORS[status];
}

export function isInProgressStatus(status: ApprovalApplicationStatus): boolean {
  return status === 'SUBMITTED' || status === 'APPROVING';
}

export function canShowCancelAction(detail: Pick<ApprovalApplicationDetail, 'status' | 'canCancel'>): boolean {
  return detail.canCancel && isInProgressStatus(detail.status);
}
