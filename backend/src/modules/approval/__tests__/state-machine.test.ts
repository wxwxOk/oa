import { describe, expect, it } from 'bun:test';

import {
  assertApplicationTransition,
  assertPendingTask,
  canTransitionApplication,
  isTerminalApplicationStatus,
} from '../state-machine';

describe('approval state machine', () => {
  it('allows the required happy-path application transitions', () => {
    expect(canTransitionApplication('DRAFT' as any, 'SUBMITTED' as any)).toBe(true);
    expect(canTransitionApplication('SUBMITTED' as any, 'APPROVING' as any)).toBe(true);
    expect(canTransitionApplication('APPROVING' as any, 'APPROVED' as any)).toBe(true);
    expect(canTransitionApplication('APPROVING' as any, 'REJECTED' as any)).toBe(true);
    expect(canTransitionApplication('APPROVING' as any, 'CANCELED' as any)).toBe(true);

    expect(() => assertApplicationTransition('DRAFT' as any, 'SUBMITTED' as any)).not.toThrow();
    expect(() => assertApplicationTransition('SUBMITTED' as any, 'APPROVING' as any)).not.toThrow();
    expect(() => assertApplicationTransition('APPROVING' as any, 'APPROVED' as any)).not.toThrow();
    expect(() => assertApplicationTransition('APPROVING' as any, 'REJECTED' as any)).not.toThrow();
    expect(() => assertApplicationTransition('APPROVING' as any, 'CANCELED' as any)).not.toThrow();
  });

  it('allows submitted applications to be canceled before assignment', () => {
    expect(canTransitionApplication('SUBMITTED' as any, 'CANCELED' as any)).toBe(true);
  });

  it('rejects invalid status skips', () => {
    expect(() => assertApplicationTransition('DRAFT' as any, 'APPROVING' as any)).toThrow('非法状态流转');
    expect(() => assertApplicationTransition('SUBMITTED' as any, 'APPROVED' as any)).toThrow('非法状态流转');
    expect(() => assertApplicationTransition('DRAFT' as any, 'APPROVED' as any)).toThrow('非法状态流转');
  });

  it('rejects terminal transitions', () => {
    for (const status of ['APPROVED', 'REJECTED', 'CANCELED'] as const) {
      expect(isTerminalApplicationStatus(status as any)).toBe(true);
      expect(() => assertApplicationTransition(status as any, 'APPROVING' as any)).toThrow('非法状态流转');
    }
  });

  it('identifies non-terminal statuses', () => {
    expect(isTerminalApplicationStatus('DRAFT' as any)).toBe(false);
    expect(isTerminalApplicationStatus('SUBMITTED' as any)).toBe(false);
    expect(isTerminalApplicationStatus('APPROVING' as any)).toBe(false);
  });

  it('requires pending task status before handling', () => {
    expect(() => assertPendingTask('PENDING' as any)).not.toThrow();

    for (const status of ['APPROVED', 'REJECTED', 'CANCELED', 'SKIPPED'] as const) {
      expect(() => assertPendingTask(status as any)).toThrow('不可处理');
    }
  });
});
