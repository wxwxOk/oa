import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../ApprovalTaskDetailPage.vue'), 'utf8');

describe('ApprovalTaskDetailPage contract', () => {
  it('renders the approval detail sections and internal remark copy', () => {
    expect(source).toContain('审批详情');
    expect(source).toContain('申请信息');
    expect(source).toContain('当前任务');
    expect(source).toContain('表单内容');
    expect(source).toContain('审批动态');
    expect(source).toContain('内部备注');
    expect(source).toContain('mode="print"');
  });

  it('defines mobile sticky approval actions with reserved bottom padding', () => {
    expect(source).toContain('mobile-detail-actions');
    expect(source).toContain('task-action-reject');
    expect(source).toContain('task-action-approve');
    expect(source).toContain('驳回审批');
    expect(source).toContain('通过审批');
    expect(source).toContain('has-mobile-actions');
    expect(source).toContain('padding-bottom: 112px');
  });

  it('keeps approve, reject, and remark controls touch-safe', () => {
    expect(source).toContain('task-remark-action');
    expect(source).toContain('确认通过审批');
    expect(source).toContain('确认驳回审批');
    expect(source).toContain('添加内部备注');
    expect(source).toContain('min-height: 44px');
    expect(source).toContain('aria-label="返回审批列表"');
    expect(source).toContain('aria-label="刷新审批详情"');
  });
});
