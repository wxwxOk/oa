import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const designerSource = () => readFileSync(resolve(__dirname, '../FormDesignerPage.vue'), 'utf8');

describe('FormDesignerPage processing field editor contract', () => {
  it('renders an internal-only processing field editor with separation copy', () => {
    const source = designerSource();

    expect(source).toContain('处理字段');
    expect(source).toContain('处理字段仅用于内部后续处理，不会覆盖申请人或填写者的正式提交内容。');
    expect(source).toContain('processingSchema');
  });

  it('offers only lightweight processing field types', () => {
    const source = designerSource();

    for (const type of ['text', 'textarea', 'date', 'radio', 'checkbox', 'phone']) {
      expect(source).toContain(`value: '${type}'`);
    }

    expect(source).not.toMatch(/value:\s*'(signature|dynamic-table|attachment)'/);
  });

  it('saves processingSchema through the existing save design flow', () => {
    const source = designerSource();

    expect(source).toContain('保存设计');
    expect(source).toMatch(/store\.update\([\s\S]*processingSchema:/);
  });
});
