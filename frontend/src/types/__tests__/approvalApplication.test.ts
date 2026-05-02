import { describe, expect, it } from 'vitest';

import {
  CREATE_DRAFT_PAYLOAD_KEYS,
  SUBMIT_APPLICATION_PAYLOAD_KEYS,
  UPDATE_DRAFT_PAYLOAD_KEYS,
  canShowCancelAction,
  isInProgressStatus,
  statusColor,
  statusLabel,
  type ApprovalApplicationDetail,
} from '../approvalApplication';

describe('approval application status helpers', () => {
  it('maps status labels according to the UI contract', () => {
    expect(statusLabel('DRAFT')).toBe('草稿');
    expect(statusLabel('SUBMITTED')).toBe('审批中');
    expect(statusLabel('APPROVING')).toBe('审批中');
    expect(statusLabel('APPROVED')).toBe('已通过');
    expect(statusLabel('REJECTED')).toBe('已驳回');
    expect(statusLabel('CANCELED')).toBe('已撤销');
  });

  it('maps status colors according to the UI contract', () => {
    expect(statusColor('DRAFT')).toBe('warning');
    expect(statusColor('SUBMITTED')).toBe('primary');
    expect(statusColor('APPROVING')).toBe('primary');
    expect(statusColor('APPROVED')).toBe('positive');
    expect(statusColor('REJECTED')).toBe('negative');
    expect(statusColor('CANCELED')).toBe('grey');
  });

  it('detects in-progress statuses only', () => {
    expect(isInProgressStatus('SUBMITTED')).toBe(true);
    expect(isInProgressStatus('APPROVING')).toBe(true);
    expect(isInProgressStatus('DRAFT')).toBe(false);
    expect(isInProgressStatus('APPROVED')).toBe(false);
    expect(isInProgressStatus('REJECTED')).toBe(false);
    expect(isInProgressStatus('CANCELED')).toBe(false);
  });

  it('shows cancel only when server permits an in-progress status', () => {
    const base = {
      id: 1,
      applicationNo: 'APP-1',
      status: 'APPROVING',
      templateId: 1,
      templateName: '请假申请',
      templateVersion: 1,
      processId: 1,
      processName: '请假流程',
      applicantName: '申请人',
      applicantDepartmentName: '研发部',
      currentNodeOrder: 1,
      currentNodeName: '部门负责人审批',
      submittedAt: '2026-04-25T08:00:00.000Z',
      completedAt: null,
      createdAt: '2026-04-25T07:30:00.000Z',
      updatedAt: '2026-04-25T08:00:00.000Z',
      canCancel: true,
      formData: {},
      schemaSnapshot: { version: 2, items: [] },
      processSnapshot: { processId: 1, processName: '请假流程', nodes: [] },
      timeline: [],
      tasks: [],
    } satisfies ApprovalApplicationDetail;

    expect(canShowCancelAction(base)).toBe(true);
    expect(canShowCancelAction({ ...base, status: 'SUBMITTED' })).toBe(true);
    expect(canShowCancelAction({ ...base, status: 'DRAFT' })).toBe(false);
    expect(canShowCancelAction({ ...base, status: 'APPROVED' })).toBe(false);
    expect(canShowCancelAction({ ...base, canCancel: false })).toBe(false);
  });

  it('documents payload keys without trusted snapshots or applicant identity', () => {
    const forbidden = [
      'applicationNo',
      'schemaSnapshot',
      'processSnapshot',
      'applicantId',
      'applicantName',
      'applicantDepartmentId',
      'applicantDepartmentName',
    ];

    for (const keys of [
      CREATE_DRAFT_PAYLOAD_KEYS,
      UPDATE_DRAFT_PAYLOAD_KEYS,
      SUBMIT_APPLICATION_PAYLOAD_KEYS,
    ]) {
      for (const field of forbidden) {
        expect(keys).not.toContain(field);
      }
    }
  });
});
