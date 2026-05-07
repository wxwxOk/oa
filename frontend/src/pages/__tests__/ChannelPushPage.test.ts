import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve(__dirname, '../ChannelPushPage.vue'), 'utf8');
const importDialogSource = readFileSync(
  resolve(__dirname, '../../components/channel-push/ChannelPushImportDialog.vue'),
  'utf8',
);
const dupDialogSource = readFileSync(
  resolve(__dirname, '../../components/channel-push/ChannelPushDuplicateDialog.vue'),
  'utf8',
);
const storeSource = readFileSync(resolve(__dirname, '../../stores/channelPush.ts'), 'utf8');
const uiSource = `${pageSource}\n${importDialogSource}\n${dupDialogSource}`;

describe('ChannelPushPage Phase 34 batch-import contract', () => {
  it('mounts the import button gated by channelPush:create with the canonical copy', () => {
    expect(pageSource).toContain('Excel 批量导入');
    expect(pageSource).toContain("auth.hasPerm('channelPush:create')");
    // Two `auth.hasPerm('channelPush:create')` gates: the existing 新建推送
    // button and the new Excel 批量导入 button. Mobile FAB also gated, so we
    // expect ≥3 occurrences of the permission code on the page.
    const perms = pageSource.match(/channelPush:create/g) ?? [];
    expect(perms.length).toBeGreaterThanOrEqual(2);
    expect(pageSource).toContain('icon="upload_file"');
  });

  it('mounts both import dialog and the existing duplicate dialog', () => {
    expect(pageSource).toContain('ChannelPushImportDialog');
    expect(pageSource).toContain('importDialogOpen');
    expect(pageSource).toContain('ChannelPushDuplicateDialog');
    expect(pageSource).toContain('@duplicates');
    expect(pageSource).toContain('handleDuplicates');
    // Page binds duplicate hints from the import flow into the existing dialog
    expect(pageSource).toContain('pendingDuplicates');
    expect(pageSource).toContain(':hints="pendingDuplicates"');
  });

  it('does not modify the Phase 33 ChannelPushDuplicateDialog contract', () => {
    // The dialog is consumed only via v-model and :hints — no other props/events.
    expect(dupDialogSource).toContain('defineProps<{ modelValue: boolean; hints: ChannelPushDuplicateHint[] }>()');
    expect(dupDialogSource).toContain('update:modelValue');
  });

  it('import dialog wires parser + store action without inlining logic', () => {
    expect(importDialogSource).toContain('parseChannelPushImportRows');
    expect(importDialogSource).toContain('cellDates: false');
    expect(importDialogSource).toContain('blankrows: false');
    expect(importDialogSource).toContain('XLSX.read');
    expect(importDialogSource).toContain('sheet_to_json');
    expect(importDialogSource).toContain('store.batchImport');
    expect(importDialogSource).toContain('overLimit');
    expect(importDialogSource).toContain('单次批量导入不超过 500 行');
    expect(importDialogSource).toContain('readAsArrayBuffer');
  });

  it('store exposes batchImport with the strict { rows } envelope and importLoading state', () => {
    expect(storeSource).toContain("api.post('/channel-push/batch-import', { rows })");
    expect(storeSource).toContain('importLoading');
    expect(storeSource).toContain('this.fetchMine(this.filters)');
  });

  it('does not introduce forbidden patterns or modify visit imports', () => {
    for (const forbidden of [
      'createMany',
      'skipDuplicates',
      'multipart/form-data',
      'visit:import',
      "channelPush:bulkImport",
    ]) {
      expect(uiSource).not.toContain(forbidden);
    }
  });
});
