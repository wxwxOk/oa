import ExcelJS from 'exceljs';

import { BizError } from '../../utils/errors';
import {
  getReimbursementDetail as defaultGetReimbursementDetail,
  listReimbursements as defaultListReimbursements,
  type ReimbursementActor,
  type ReimbursementListFilters,
} from './reimbursement.service';

export const MAX_REIMBURSEMENT_EXPORT_ROWS = 2000;

const EXPORT_TOO_LARGE_MESSAGE = '当前筛选结果超过导出上限，请缩小筛选范围后重试。';
const EXPORT_PAGE_SIZE = 100;
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

type ReimbursementExportAction = {
  type?: unknown;
  actorName?: unknown;
  nodeName?: unknown;
  comment?: unknown;
  createdAt?: Date | string | null;
};

type ReimbursementExportRow = {
  id?: number;
  applicationNo?: unknown;
  title?: unknown;
  category?: unknown;
  amount?: unknown;
  occurredAt?: Date | string | null;
  reason?: unknown;
  payeeInfo?: unknown;
  remark?: unknown;
  applicantName?: unknown;
  applicantDepartmentName?: unknown;
  submittedAt?: Date | string | null;
  attachmentCount?: unknown;
  status?: unknown;
  completedAt?: Date | string | null;
  actions?: ReimbursementExportAction[];
};

type ReimbursementExportDependencies = {
  listReimbursements?: typeof defaultListReimbursements;
  getReimbursementDetail?: typeof defaultGetReimbursementDetail;
};

const reimbursementExportHeaders = [
  { header: '申请编号', key: 'applicationNo', width: 24 },
  { header: '标题', key: 'title', width: 24 },
  { header: '类别', key: 'category', width: 14 },
  { header: '金额', key: 'amount', width: 12 },
  { header: '发生日期', key: 'occurredAt', width: 14 },
  { header: '事由', key: 'reason', width: 28 },
  { header: '收款信息', key: 'payeeInfo', width: 28 },
  { header: '备注', key: 'remark', width: 24 },
  { header: '申请人', key: 'applicantName', width: 14 },
  { header: '申请部门', key: 'applicantDepartmentName', width: 18 },
  { header: '提交时间', key: 'submittedAt', width: 24 },
  { header: '附件数量', key: 'attachmentCount', width: 10 },
  { header: '当前状态', key: 'status', width: 14 },
  { header: '部门审核结果', key: 'departmentResult', width: 14 },
  { header: '部门审核人', key: 'departmentActorName', width: 14 },
  { header: '部门审核时间', key: 'departmentReviewedAt', width: 24 },
  { header: '部门审核意见', key: 'departmentComment', width: 28 },
  { header: '财务审核结果', key: 'financeResult', width: 14 },
  { header: '财务审核人', key: 'financeActorName', width: 14 },
  { header: '财务审核时间', key: 'financeReviewedAt', width: 24 },
  { header: '财务审核意见', key: 'financeComment', width: 28 },
  { header: '最终通过时间', key: 'finalApprovedAt', width: 24 },
];

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  DEPARTMENT_REVIEW: '部门初审',
  FINANCE_REVIEW: '财务复核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

export function sanitizeReimbursementExcelCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!FORMULA_PREFIX_PATTERN.test(value)) return value;
  return `'${value}`;
}

function toDisplayText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toSafeText(value: unknown): unknown {
  return sanitizeReimbursementExcelCell(toDisplayText(value));
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatDate(value: Date | string | null | undefined): string {
  const text = formatDateTime(value);
  return text ? text.slice(0, 10) : '';
}

function formatAmount(value: unknown): string {
  if (value == null) return '';
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : toDisplayText(value);
}

function actionTime(action: ReimbursementExportAction): number {
  const value = action.createdAt;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function latestReviewAction(row: ReimbursementExportRow, types: string[]): ReimbursementExportAction | undefined {
  return (row.actions ?? [])
    .filter((action) => types.includes(String(action.type)))
    .reduce<ReimbursementExportAction | undefined>((latest, action) => {
      if (!latest) return action;
      return actionTime(action) >= actionTime(latest) ? action : latest;
    }, undefined);
}

function reviewResult(action?: ReimbursementExportAction): string {
  const type = String(action?.type ?? '');
  if (type.endsWith('_APPROVE')) return '通过';
  if (type.endsWith('_REJECT')) return '驳回';
  return '';
}

function buildWorksheetRow(row: ReimbursementExportRow): Record<string, unknown> {
  const departmentAction = latestReviewAction(row, ['DEPARTMENT_APPROVE', 'DEPARTMENT_REJECT']);
  const financeAction = latestReviewAction(row, ['FINANCE_APPROVE', 'FINANCE_REJECT']);
  const status = String(row.status ?? '');

  return {
    applicationNo: toSafeText(row.applicationNo),
    title: toSafeText(row.title),
    category: toSafeText(row.category),
    amount: toSafeText(formatAmount(row.amount)),
    occurredAt: toSafeText(formatDate(row.occurredAt)),
    reason: toSafeText(row.reason),
    payeeInfo: toSafeText(row.payeeInfo),
    remark: toSafeText(row.remark),
    applicantName: toSafeText(row.applicantName),
    applicantDepartmentName: toSafeText(row.applicantDepartmentName),
    submittedAt: toSafeText(formatDateTime(row.submittedAt)),
    attachmentCount: Number(row.attachmentCount ?? 0),
    status: toSafeText(statusLabels[status] ?? status),
    departmentResult: toSafeText(reviewResult(departmentAction)),
    departmentActorName: toSafeText(departmentAction?.actorName),
    departmentReviewedAt: toSafeText(formatDateTime(departmentAction?.createdAt)),
    departmentComment: toSafeText(departmentAction?.comment),
    financeResult: toSafeText(reviewResult(financeAction)),
    financeActorName: toSafeText(financeAction?.actorName),
    financeReviewedAt: toSafeText(formatDateTime(financeAction?.createdAt)),
    financeComment: toSafeText(financeAction?.comment),
    finalApprovedAt: toSafeText(status === 'APPROVED' ? formatDateTime(row.completedAt) : ''),
  };
}

export async function buildReimbursementWorkbook(input: { rows: ReimbursementExportRow[] }): Promise<ExcelJS.Workbook> {
  if (input.rows.length > MAX_REIMBURSEMENT_EXPORT_ROWS) {
    throw new BizError(EXPORT_TOO_LARGE_MESSAGE, 400, 'REIMBURSEMENT_EXPORT_TOO_LARGE');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'oa';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('报销明细', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  worksheet.columns = reimbursementExportHeaders;
  worksheet.getRow(1).font = { bold: true };

  for (const row of input.rows) {
    worksheet.addRow(buildWorksheetRow(row));
  }

  return workbook;
}

function buildExportFilters(filters: ReimbursementListFilters): ReimbursementListFilters {
  return {
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...(filters.category !== undefined ? { category: filters.category } : {}),
    ...(filters.dateFrom !== undefined ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
    ...(filters.keyword !== undefined ? { keyword: filters.keyword } : {}),
  };
}

function needsDetail(row: ReimbursementExportRow): row is ReimbursementExportRow & { id: number } {
  return row.id != null && row.actions === undefined;
}

export async function exportReimbursementsExcel(
  actor: ReimbursementActor,
  filters: ReimbursementListFilters = {},
  dependencies: ReimbursementExportDependencies = {},
): Promise<ExcelJS.Workbook> {
  const listReimbursements = dependencies.listReimbursements ?? defaultListReimbursements;
  const getReimbursementDetail = dependencies.getReimbursementDetail ?? defaultGetReimbursementDetail;
  const exportFilters = buildExportFilters(filters);
  const firstPage = await listReimbursements(actor, { ...exportFilters, page: 1, size: EXPORT_PAGE_SIZE });

  if (firstPage.total > MAX_REIMBURSEMENT_EXPORT_ROWS) {
    throw new BizError(EXPORT_TOO_LARGE_MESSAGE, 400, 'REIMBURSEMENT_EXPORT_TOO_LARGE');
  }

  const listRows: ReimbursementExportRow[] = [...firstPage.rows];
  for (let page = 2; listRows.length < firstPage.total; page += 1) {
    const nextPage = await listReimbursements(actor, { ...exportFilters, page, size: EXPORT_PAGE_SIZE });
    if (nextPage.rows.length === 0) break;
    listRows.push(...nextPage.rows);
  }

  const rows: ReimbursementExportRow[] = [];
  for (const row of listRows) {
    rows.push(needsDetail(row) ? await getReimbursementDetail(actor, row.id) : row);
  }

  return buildReimbursementWorkbook({ rows });
}
