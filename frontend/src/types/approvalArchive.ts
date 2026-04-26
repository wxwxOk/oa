import type { ApprovalApplicationStatus, ApprovalTimelineEvent } from './approvalApplication';
import type { SchemaV2 } from './schema';

export type ArchiveSourceType = 'approval' | 'collection';

export const COLLECTED_ARCHIVE_STATUS = 'COLLECTED' as const;

export type ArchiveApprovalStatus = ApprovalApplicationStatus;
export type ArchiveStatus = ArchiveApprovalStatus | typeof COLLECTED_ARCHIVE_STATUS;

export type ArchiveProcessingFieldType = 'text' | 'textarea' | 'date' | 'radio' | 'checkbox' | 'phone';

export interface ArchivePersonInfo {
  id?: number | null;
  name: string;
  phone?: string | null;
  username?: string | null;
}

export interface ArchiveRow {
  archiveKey: string;
  sourceType: ArchiveSourceType;
  id: number;
  sourceId: number;
  archiveNo: string;
  templateId: number;
  templateName: string;
  templateVersion: number;
  personName: string;
  personPhone?: string | null;
  departmentId: number | null;
  departmentName: string | null;
  status: ArchiveStatus;
  tags: string[];
  processingSummary?: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ArchiveFilterOptions {
  templates: Array<{ label: string; value: number; version: number }>;
  departments: Array<{ label: string; value: number }>;
  recommendedTags: string[];
}

export interface ArchiveListFilters {
  page?: number;
  size?: number;
  sourceType?: ArchiveSourceType | '';
  templateId?: number | null;
  departmentId?: number | null;
  personName?: string;
  status?: ArchiveStatus | '';
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface ArchiveProcessingFieldOption {
  label: string;
  value: string;
}

export interface ArchiveProcessingField {
  id: string;
  label: string;
  type: ArchiveProcessingFieldType;
  required?: boolean;
  options?: ArchiveProcessingFieldOption[] | string[];
  placeholder?: string;
  remark?: string;
}

export interface ArchiveCorrectionChange {
  fieldId: string;
  fieldLabel?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  value?: unknown;
}

export interface ArchiveCorrectionHistory {
  id: number;
  changes: ArchiveCorrectionChange[];
  reason: string;
  actorId: number | null;
  actorName: string;
  createdAt: string;
}

export interface ArchiveNote {
  id: number;
  content: string;
  comment?: string;
  actorId: number | null;
  actorName: string;
  createdAt: string;
}

export interface ArchiveDetail extends ArchiveRow {
  formData: Record<string, unknown>;
  effectiveData: Record<string, unknown>;
  schemaSnapshot: SchemaV2;
  processingFields?: ArchiveProcessingField[];
  processingData: Record<string, unknown>;
  notes: ArchiveNote[];
  corrections: ArchiveCorrectionHistory[];
  correctionHistory?: ArchiveCorrectionHistory[];
  timeline: ApprovalTimelineEvent[];
  canMark: boolean;
  canEdit: boolean;
}

export interface ArchiveStatsItem {
  count: number;
  sourceType?: ArchiveSourceType | 'all';
}

export interface ArchiveTemplateStatsItem extends ArchiveStatsItem {
  templateId: number;
  templateName: string;
}

export interface ArchiveStatusStatsItem extends ArchiveStatsItem {
  status: ArchiveStatus;
}

export interface ArchiveDepartmentStatsItem extends ArchiveStatsItem {
  departmentId: number | null;
  departmentName: string | null;
}

export interface ArchiveMonthStatsItem extends ArchiveStatsItem {
  month: string;
}

export interface ArchiveStats {
  byTemplate: ArchiveTemplateStatsItem[];
  byStatus: ArchiveStatusStatsItem[];
  byDepartment: ArchiveDepartmentStatsItem[];
  byMonth: ArchiveMonthStatsItem[];
}

export interface UpdateArchiveTagsPayload {
  tags: string[];
}

export interface CreateArchiveNotePayload {
  comment: string;
}

export interface UpdateArchiveProcessingPayload {
  processingData: Record<string, unknown>;
}

export interface CreateArchiveCorrectionPayload {
  changes: Record<string, unknown>;
  reason: string;
}

export const ARCHIVE_RECOMMENDED_TAGS = ['待跟进', '已核对', '资料不全', '重点'] as const;

export const SUPPORTED_PROCESSING_FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'radio',
  'checkbox',
  'phone',
] as readonly ArchiveProcessingFieldType[];

export const ARCHIVE_TAG_PAYLOAD_KEYS = ['tags'] as const;
export const ARCHIVE_NOTE_PAYLOAD_KEYS = ['comment'] as const;
export const ARCHIVE_PROCESSING_PAYLOAD_KEYS = ['processingData'] as const;
export const ARCHIVE_CORRECTION_PAYLOAD_KEYS = ['changes', 'reason'] as const;

export const UPDATE_ARCHIVE_TAGS_PAYLOAD_KEYS = ARCHIVE_TAG_PAYLOAD_KEYS;
export const CREATE_ARCHIVE_NOTE_PAYLOAD_KEYS = ARCHIVE_NOTE_PAYLOAD_KEYS;
export const UPDATE_ARCHIVE_PROCESSING_PAYLOAD_KEYS = ARCHIVE_PROCESSING_PAYLOAD_KEYS;
export const CREATE_ARCHIVE_CORRECTION_PAYLOAD_KEYS = ARCHIVE_CORRECTION_PAYLOAD_KEYS;

const SOURCE_TYPE_LABELS: Record<ArchiveSourceType, string> = {
  approval: '审批申请',
  collection: '公开收集',
};

const STATUS_LABELS: Record<ArchiveStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '审批中',
  APPROVING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已撤销',
  COLLECTED: '已收集',
};

const STATUS_COLORS: Record<ArchiveStatus, string> = {
  DRAFT: 'warning',
  SUBMITTED: 'primary',
  APPROVING: 'primary',
  APPROVED: 'positive',
  REJECTED: 'negative',
  CANCELED: 'grey',
  COLLECTED: 'info',
};

export function sourceTypeLabel(sourceType: ArchiveSourceType): string {
  return SOURCE_TYPE_LABELS[sourceType];
}

export function archiveStatusLabel(status: ArchiveStatus): string {
  return STATUS_LABELS[status];
}

export function archiveStatusColor(status: ArchiveStatus): string {
  return STATUS_COLORS[status];
}

export function archiveKey(sourceType: ArchiveSourceType, sourceId: number | string): string {
  return `${sourceType}:${sourceId}`;
}
