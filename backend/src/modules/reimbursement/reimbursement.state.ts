import { BizError } from '../../utils/errors';

export type ReimbursementStatusValue =
  | 'DRAFT'
  | 'DEPARTMENT_REVIEW'
  | 'FINANCE_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export const REIMBURSEMENT_DEPARTMENT_REVIEW_NODE = '部门初审';
export const TERMINAL_REIMBURSEMENT_STATUSES = ['APPROVED', 'REJECTED'] as const;

const REIMBURSEMENT_TRANSITIONS: Record<ReimbursementStatusValue, ReimbursementStatusValue[]> = {
  DRAFT: ['DEPARTMENT_REVIEW'],
  DEPARTMENT_REVIEW: ['FINANCE_REVIEW', 'REJECTED'],
  FINANCE_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

export function canTransitionReimbursement(
  from: ReimbursementStatusValue,
  to: ReimbursementStatusValue,
): boolean {
  return REIMBURSEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertReimbursementTransition(
  from: ReimbursementStatusValue,
  to: ReimbursementStatusValue,
): void {
  if (!canTransitionReimbursement(from, to)) {
    throw new BizError(`非法报销状态流转: ${from} -> ${to}`, 400, 'INVALID_REIMBURSEMENT_TRANSITION');
  }
}
