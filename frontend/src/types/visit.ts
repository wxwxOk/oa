export interface VisitCreator {
  id: number;
  name?: string | null;
  username?: string | null;
  realName?: string | null;
}

export interface VisitRow {
  id: number;
  name: string;
  age: number | null;
  education: string | null;
  gender: string | null;
  channelPartner: string | null;
  consultant: string | null;
  receptionStatus: string | null;
  receptionist: string | null;
  receptionDate: string | null;
  consultationStatus: string | null;
  statusCategory: string | null;
  statusDescription: string | null;
  trialStatus: string | null;
  solution: string | null;
  trialDate: string | null;
  creatorId?: number | null;
  creator?: VisitCreator | null;
  createdAt: string;
  updatedAt: string;
}

export type VisitDetail = VisitRow;

export interface VisitListResponse {
  rows: VisitRow[];
  total: number;
  page: number;
  size: number;
}

export interface VisitListFilters {
  keyword: string;
  channelPartner: string;
  consultant: string;
  receptionist: string;
  receptionStatus: string;
  consultationStatus: string;
  statusCategory: string;
  dateFrom: string;
  dateTo: string;
}

export type VisitListSortBy = 'receptionDate' | 'updatedAt';

export type VisitListRequest = Partial<VisitListFilters> & {
  page?: number;
  size?: number;
  sortBy?: VisitListSortBy;
  descending?: boolean;
};

export interface VisitFilterOptions {
  channelPartners: string[];
  consultants: string[];
  receptionists: string[];
  receptionStatuses: string[];
  consultationStatuses: string[];
  statusCategories: string[];
}

export interface VisitStatsDimensionRow {
  name: string;
  count: number;
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
}

export interface VisitStatsDistributionRow {
  name: string;
  count: number;
}

export interface VisitStats {
  total: number;
  intentCount: number;
  signedCount: number;
  intentRate: number;
  signedRate: number;
  byChannelPartner: VisitStatsDimensionRow[];
  byConsultant: VisitStatsDimensionRow[];
  byReceptionist: VisitStatsDimensionRow[];
  byReceptionStatus: VisitStatsDistributionRow[];
  byConsultationStatus: VisitStatsDistributionRow[];
  byStatusCategory: VisitStatsDistributionRow[];
  byTrialStatus: VisitStatsDistributionRow[];
}

export type VisitStatsFilters = Pick<VisitListFilters, 'dateFrom' | 'dateTo'>;

export interface VisitWritePayload {
  name: string;
  age?: number | null;
  education?: string | null;
  gender?: string | null;
  channelPartner?: string | null;
  consultant?: string | null;
  receptionStatus?: string | null;
  receptionist?: string | null;
  receptionDate?: string | null;
  consultationStatus?: string | null;
  statusCategory?: string | null;
  statusDescription?: string | null;
  trialStatus?: string | null;
  solution?: string | null;
  trialDate?: string | null;
}

export const VISIT_WRITE_PAYLOAD_KEYS = [
  'name',
  'age',
  'education',
  'gender',
  'channelPartner',
  'consultant',
  'receptionStatus',
  'receptionist',
  'receptionDate',
  'consultationStatus',
  'statusCategory',
  'statusDescription',
  'trialStatus',
  'solution',
  'trialDate',
] as const;

export const VISIT_IMPORT_HEADERS = [
  '姓名',
  '年龄',
  '学历',
  '性别',
  '渠道商',
  '咨询师',
  '接待状态',
  '接待人',
  '接待日期',
  '咨询后状态',
  '状态类别',
  '状态说明',
  '试听课后状态',
  '解决方案',
  '试听课时间',
] as const;

export type VisitImportCell = string | number | Date | null | undefined;

export interface VisitImportRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface VisitImportInvalidRow {
  rowNumber: number;
  values: VisitImportCell[];
  errors: VisitImportRowError[];
}

export interface VisitImportValidRow {
  rowNumber: number;
  payload: VisitWritePayload;
  duplicateKey?: string;
}

export interface VisitImportDuplicateWarning {
  key: string;
  rowNumbers: number[];
  name: string;
  receptionDate: string;
  consultant: string;
}

export interface VisitImportPreview {
  fileName?: string;
  headerValid: boolean;
  expectedHeaders: string[];
  actualHeaders: string[];
  headerErrors: string[];
  validRows: VisitImportValidRow[];
  invalidRows: VisitImportInvalidRow[];
  duplicateWarnings: VisitImportDuplicateWarning[];
}

export interface VisitImportPayload {
  rows: VisitWritePayload[];
}

export interface VisitImportResponse {
  createdCount: number;
  total: number;
}

export const VISIT_LIST_FILTER_KEYS = [
  'keyword',
  'channelPartner',
  'consultant',
  'receptionist',
  'receptionStatus',
  'consultationStatus',
  'statusCategory',
  'dateFrom',
  'dateTo',
] as const;

export const VISIT_FILTER_OPTION_KEYS = [
  'channelPartners',
  'consultants',
  'receptionists',
  'receptionStatuses',
  'consultationStatuses',
  'statusCategories',
] as const;

export function createEmptyVisitFilters(): VisitListFilters {
  return {
    keyword: '',
    channelPartner: '',
    consultant: '',
    receptionist: '',
    receptionStatus: '',
    consultationStatus: '',
    statusCategory: '',
    dateFrom: '',
    dateTo: '',
  };
}

export function createEmptyVisitFilterOptions(): VisitFilterOptions {
  return {
    channelPartners: [],
    consultants: [],
    receptionists: [],
    receptionStatuses: [],
    consultationStatuses: [],
    statusCategories: [],
  };
}

export function formatVisitDate(value?: string | null): string {
  if (!value) return '-';
  return value.slice(0, 10);
}

export function formatVisitRate(rate: number | null | undefined): string {
  if (!rate || !Number.isFinite(rate)) return '0%';
  return `${Number(rate.toFixed(1))}%`;
}

function normalizeOptional(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

export function normalizeVisitPayload(payload: VisitWritePayload): VisitWritePayload {
  const result: VisitWritePayload = {
    name: payload.name.trim(),
  };
  if ('age' in payload) result.age = payload.age ?? null;
  for (const key of VISIT_WRITE_PAYLOAD_KEYS) {
    if (key === 'name' || key === 'age' || !(key in payload)) continue;
    result[key] = normalizeOptional(payload[key]);
  }
  return result;
}
