import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../ApprovalArchiveDetailPage.vue'), 'utf8');

describe('ApprovalArchiveDetailPage contract', () => {
  it('renders full-page archive detail sections with print/PDF reuse', () => {
    expect(source).toContain('归档详情');
    expect(source).toContain('归档信息');
    expect(source).toContain('正式提交内容');
    expect(source).toContain('后续处理信息');
    expect(source).toContain('字段修正历史');
    expect(source).toContain('标签/标记');
    expect(source).toContain('内部备注');
    expect(source).toContain('处理动态');
    expect(source).toContain('id="print-area"');
    expect(source).toContain('GridFormRenderer');
    expect(source).toContain('mode="print"');
    expect(source).toContain('导出 PDF');
  });

  it('pins controlled edit copy, mandatory reason, and field-level history', () => {
    expect(source).toContain('修正提交数据');
    expect(source).toContain('修正原因');
    expect(source).toContain('保存修正');
    expect(source).toContain('原值');
    expect(source).toContain('新值');
    expect(source).toContain('查看原值');
    expect(source).toContain('保存后系统会保留原始提交值，并追加字段级修改记录。请确认修正原因准确。');
  });

  it('separates internal processing data from formal submitted content', () => {
    expect(source).toContain('以下信息为内部后续处理字段，不会覆盖申请人或填写者的正式提交内容。');
    expect(source).toContain('保存处理信息');
    expect(source).toContain('正式提交内容按提交时快照展示，模板后续变更不会影响本记录。');
    expect(source).toContain('已修正');
  });

  it('keeps mobile detail actions touch-safe with reserved bottom padding', () => {
    expect(source).toContain('mobile-detail-actions');
    expect(source).toContain('has-mobile-actions');
    expect(source).toContain('padding-bottom: 112px');
    expect(source).toContain('env(safe-area-inset-bottom');
    expect(source).toContain('min-height: 44px');
    expect(source).toContain('aria-label="返回归档查询"');
  });
});
