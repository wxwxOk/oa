import { describe, expect, it } from 'vitest';

import {
  APPROVE_TASK_PAYLOAD_KEYS,
  COMMENT_TASK_PAYLOAD_KEYS,
  REJECT_TASK_PAYLOAD_KEYS,
  canHandleTask,
  isHandledTask,
  taskStatusColor,
  taskStatusLabel,
} from '../approvalTask';

describe('approval task status helpers', () => {
  it('maps task status labels according to the approver UI contract', () => {
    expect(taskStatusLabel('PENDING')).toBe('待处理');
    expect(taskStatusLabel('APPROVED')).toBe('已通过');
    expect(taskStatusLabel('REJECTED')).toBe('已驳回');
    expect(taskStatusLabel('CANCELED')).toBe('已关闭');
  });

  it('maps task status colors without mixing task and application state', () => {
    expect(taskStatusColor('PENDING')).toBe('primary');
    expect(taskStatusColor('APPROVED')).toBe('positive');
    expect(taskStatusColor('REJECTED')).toBe('negative');
    expect(taskStatusColor('CANCELED')).toBe('grey');
  });

  it('detects handled-state helpers for approver history only', () => {
    expect(isHandledTask('APPROVED')).toBe(true);
    expect(isHandledTask('REJECTED')).toBe(true);
    expect(isHandledTask('PENDING')).toBe(false);
    expect(isHandledTask('CANCELED')).toBe(false);
  });

  it('shows pending actions only when the server also permits handling', () => {
    expect(canHandleTask({ taskStatus: 'PENDING', canHandle: true })).toBe(true);
    expect(canHandleTask({ taskStatus: 'PENDING', canHandle: false })).toBe(false);
    expect(canHandleTask({ taskStatus: 'APPROVED', canHandle: true })).toBe(false);
  });

  it('documents approve, reject, and comment payload keys as comment-only', () => {
    expect(APPROVE_TASK_PAYLOAD_KEYS).toEqual(['comment']);
    expect(REJECT_TASK_PAYLOAD_KEYS).toEqual(['comment']);
    expect(COMMENT_TASK_PAYLOAD_KEYS).toEqual(['comment']);

    const forbidden = ['applicationNo', 'schemaSnapshot', 'processSnapshot', 'applicantName'];
    for (const keys of [APPROVE_TASK_PAYLOAD_KEYS, REJECT_TASK_PAYLOAD_KEYS, COMMENT_TASK_PAYLOAD_KEYS]) {
      for (const field of forbidden) {
        expect(keys).not.toContain(field);
      }
    }
  });
});
