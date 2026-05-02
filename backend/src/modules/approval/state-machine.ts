import type { ApprovalApplicationStatus, ApprovalTaskStatus } from '@prisma/client';

import { BizError } from '../../utils/errors';

export const TERMINAL_APPROVAL_STATUSES = ['APPROVED', 'REJECTED', 'CANCELED'] as const;

const APPLICATION_TRANSITIONS: Record<ApprovalApplicationStatus, ApprovalApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVING', 'CANCELED'],
  APPROVING: ['APPROVED', 'REJECTED', 'CANCELED'],
  APPROVED: [],
  REJECTED: [],
  CANCELED: [],
};

export function canTransitionApplication(
  from: ApprovalApplicationStatus,
  to: ApprovalApplicationStatus,
): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertApplicationTransition(
  from: ApprovalApplicationStatus,
  to: ApprovalApplicationStatus,
): void {
  if (!canTransitionApplication(from, to)) {
    throw new BizError(`非法状态流转: ${from} -> ${to}`, 400, 'INVALID_APPROVAL_TRANSITION');
  }
}

export function isTerminalApplicationStatus(status: ApprovalApplicationStatus): boolean {
  return TERMINAL_APPROVAL_STATUSES.includes(status as any);
}

export function assertPendingTask(status: ApprovalTaskStatus): void {
  if (status !== 'PENDING') {
    throw new BizError(`任务状态 ${status} 不可处理`, 400, 'INVALID_APPROVAL_TASK_STATUS');
  }
}
