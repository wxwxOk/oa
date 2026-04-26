import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { api } from 'src/boot/axios';
import { useTemplateStore } from '../template';

vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  put: Mock;
};

const templateSource = () => readFileSync(resolve(__dirname, '../template.ts'), 'utf8');

describe('template store processing schema support', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.put.mockReset();
  });

  it('declares processingSchema as a separate template DTO/update payload field', () => {
    const source = templateSource();

    expect(source).toContain(
      "import type { ArchiveProcessingField as ProcessingFieldConfig } from 'src/types/approvalArchive';",
    );
    expect(source).toMatch(/processingSchema:\s*ProcessingFieldConfig\[\]/);
    expect(source).toMatch(/processingSchema\?:\s*ProcessingFieldConfig\[\]/);
  });

  it('does not mix processingSchema into formal schema field helpers', () => {
    expect(templateSource()).not.toMatch(/flattenFields\([^)]*processingSchema/);
  });

  it('round-trips processingSchema through template update payloads', async () => {
    const processingSchema = [
      {
        id: 'followResult',
        label: '跟进结果',
        type: 'text',
      },
    ];
    mockedApi.put.mockResolvedValueOnce({
      data: {
        id: 1,
        name: '客户回访',
        processingSchema,
      },
    });

    const store = useTemplateStore();
    const result = await store.update(1, { processingSchema });

    expect(mockedApi.put).toHaveBeenCalledWith('/templates/1', { processingSchema });
    expect(result.processingSchema).toEqual(processingSchema);
    expect(store.current).toBeNull();
  });
});
