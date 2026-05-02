import type {
  ApprovalApplicationStatus,
  ApprovalProcessSnapshot,
  ApprovalTaskSummary,
  ApprovalTimelineEvent,
} from './approvalApplication';
import type { SchemaV2 } from './schema';

export type ApprovalTaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'SKIPPED';

export type ApprovalTaskListView = 'pending' | 'handled';

export interface ApprovalTaskRow {
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
  assignedAt: string;
  handledAt: string | null;
  taskComment: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canHandle: boolean;
  canComment: boolean;
}

export interface ApprovalTaskDetail extends ApprovalTaskRow {
  formData: Record<string, unknown>;
  schemaSnapshot: SchemaV2;
  processSnapshot: ApprovalProcessSnapshot;
  timeline: ApprovalTimelineEvent[];
  tasks: ApprovalTaskSummary[];
}

export interface ApprovalTaskFilterOptions {
  templates: Array<{ label: string; value: number; version: number }>;
  departments: Array<{ label: string; value: number }>;
}

export interface ApprovalTaskListFilters {
  page?: number;
  size?: number;
  view?: ApprovalTaskListView;
  templateId?: number | null;
  applicantName?: string;
  departmentId?: number | null;
  status?: ApprovalTaskStatus | '';
  dateFrom?: string;
  dateTo?: string;
}

export interface ApproveTaskPayload {
  comment?: string;
}

export interface RejectTaskPayload {
  comment: string;
}

export interface CommentTaskPayload {
  comment: string;
}

export const APPROVE_TASK_PAYLOAD_KEYS = ['comment'] as const;
export const REJECT_TASK_PAYLOAD_KEYS = ['comment'] as const;
export const COMMENT_TASK_PAYLOAD_KEYS = ['comment'] as const;

const TASK_STATUS_LABELS: Record<ApprovalTaskStatus, string> = {
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已关闭',
  SKIPPED: '已跳过',
};

const TASK_STATUS_COLORS: Record<ApprovalTaskStatus, string> = {
  PENDING: 'primary',
  APPROVED: 'positive',
  REJECTED: 'negative',
  CANCELED: 'grey',
  SKIPPED: 'grey',
};

export function taskStatusLabel(status: ApprovalTaskStatus): string {
  return TASK_STATUS_LABELS[status];
}

export function taskStatusColor(status: ApprovalTaskStatus): string {
  return TASK_STATUS_COLORS[status];
}

export function isHandledTask(value: ApprovalTaskStatus | Pick<ApprovalTaskRow, 'taskStatus'>): boolean {
  const status = typeof value === 'string' ? value : value.taskStatus;
  return status === 'APPROVED' || status === 'REJECTED';
}

export function canHandleTask(value: Pick<ApprovalTaskRow, 'taskStatus' | 'canHandle'>): boolean {
  return value.canHandle && value.taskStatus === 'PENDING';
}
