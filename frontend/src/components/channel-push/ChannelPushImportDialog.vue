<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="isMobile"
    :transition-show="isMobile ? 'slide-up' : 'scale'"
    :transition-hide="isMobile ? 'slide-down' : 'scale'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card
      class="channel-push-import-dialog"
      :style="isMobile ? '' : 'width: 920px; max-width: calc(100vw - 32px)'"
    >
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>Excel 批量导入</q-toolbar-title>
        <q-btn flat round dense icon="close" aria-label="关闭导入弹窗" @click="closeDialog">
          <q-tooltip>关闭导入弹窗</q-tooltip>
        </q-btn>
      </q-toolbar>

      <q-card-section class="q-gutter-md import-body">
        <div class="text-caption muted">
          第 1 行可填合并标题，第 2 行必须为表头，第 3 行起为数据。单次最多 500 行。
        </div>

        <q-file
          v-model="selectedFile"
          outlined
          dense
          clearable
          accept=".xlsx,.xls"
          label="选择 Excel 文件"
          :loading="reading"
          @update:model-value="handleFileChange"
        >
          <template #prepend>
            <q-icon name="upload_file" />
          </template>
        </q-file>
        <div v-if="selectedFile" class="text-caption muted">已选择：{{ selectedFile.name }}</div>

        <template v-if="preview">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-3">
              <q-card flat bordered class="summary-card">
                <q-card-section>
                  <div class="text-caption muted">表头状态</div>
                  <div class="text-subtitle1">{{ preview.headerValid ? '通过' : '不通过' }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-3">
              <q-card flat bordered class="summary-card">
                <q-card-section>
                  <div class="text-caption muted">有效行</div>
                  <div class="text-subtitle1">{{ preview.validRows.length }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-3">
              <q-card flat bordered class="summary-card">
                <q-card-section>
                  <div class="text-caption muted">无效行</div>
                  <div class="text-subtitle1">{{ preview.invalidRows.length }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-3">
              <q-card flat bordered class="summary-card">
                <q-card-section>
                  <div class="text-caption muted">文件内重复</div>
                  <div class="text-subtitle1">{{ preview.duplicateWarnings.length }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-banner
            v-if="preview.overLimit"
            rounded
            class="bg-negative text-white"
            data-testid="over-limit-banner"
          >
            单次批量导入不超过 500 行；请拆分文件后重试。
          </q-banner>

          <q-banner v-if="preview.headerErrors.length > 0" rounded class="bg-negative text-white">
            <div class="text-subtitle2 q-mb-xs">表头错误</div>
            <div v-for="(error, idx) in preview.headerErrors" :key="idx">
              <template v-if="error">{{ error }}</template>
            </div>
          </q-banner>

          <q-tabs
            v-model="activeTab"
            dense
            no-caps
            align="left"
            class="text-primary"
            indicator-color="primary"
          >
            <q-tab name="valid" :label="`有效行 (${preview.validRows.length})`" />
            <q-tab name="invalid" :label="`无效行 (${preview.invalidRows.length})`" />
            <q-tab name="duplicates" :label="`文件内重复 (${preview.duplicateWarnings.length})`" />
            <q-tab v-if="failedRows.length > 0" name="failed" :label="`失败行 (${failedRows.length})`" />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="activeTab" animated>
            <q-tab-panel name="valid">
              <q-markup-table v-if="preview.validRows.length > 0" flat bordered dense class="preview-table">
                <thead>
                  <tr>
                    <th class="text-left">行号</th>
                    <th class="text-left">学员姓名</th>
                    <th class="text-left">手机号</th>
                    <th class="text-left">年龄</th>
                    <th class="text-left">意向状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in preview.validRows.slice(0, 50)" :key="row.rowNumber">
                    <td>第 {{ row.rowNumber }} 行</td>
                    <td>{{ row.payload.studentName }}</td>
                    <td>{{ row.payload.studentPhone }}</td>
                    <td>{{ row.payload.studentAge ?? '-' }}</td>
                    <td>{{ row.payload.intentStatus || '-' }}</td>
                  </tr>
                </tbody>
              </q-markup-table>
              <div v-else class="text-caption muted">暂无有效行</div>
            </q-tab-panel>

            <q-tab-panel name="invalid">
              <q-list v-if="preview.invalidRows.length > 0" bordered separator>
                <q-item v-for="row in preview.invalidRows" :key="row.rowNumber">
                  <q-item-section>
                    <q-item-label>第 {{ row.rowNumber }} 行</q-item-label>
                    <q-item-label caption>
                      {{ row.errors.map((e) => `${e.field} ${e.message}`).join('；') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-caption muted">暂无无效行</div>
            </q-tab-panel>

            <q-tab-panel name="duplicates">
              <q-list v-if="preview.duplicateWarnings.length > 0" bordered separator>
                <q-item v-for="warning in preview.duplicateWarnings" :key="warning.key">
                  <q-item-section>
                    <q-item-label>{{ warning.studentName }} / {{ warning.studentPhone }}</q-item-label>
                    <q-item-label caption>涉及行：{{ warning.rowNumbers.join('、') }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-caption muted">暂无文件内重复</div>
            </q-tab-panel>

            <q-tab-panel v-if="failedRows.length > 0" name="failed">
              <q-list bordered separator>
                <q-item v-for="failedRow in failedRows" :key="failedRow.index">
                  <q-item-section>
                    <q-item-label>
                      第 {{ resolveExcelRowNumber(failedRow.index) }} 行 — {{ failedRow.reason }}
                    </q-item-label>
                    <q-item-label caption>{{ failedRow.code ?? 'UNKNOWN' }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </q-card-section>

      <q-separator />
      <q-card-actions align="right" class="q-pa-md import-actions">
        <q-btn flat label="取消" @click="closeDialog" />
        <q-btn
          color="primary"
          label="确认导入"
          icon="upload_file"
          :loading="store.importLoading"
          :disable="!canConfirm || store.importLoading"
          @click="handleConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Notify } from 'quasar';
import * as XLSX from 'xlsx';
import { parseChannelPushImportRows } from 'src/components/channel-push/channelPushImport';
import { useChannelPushStore } from 'src/stores/channelPush';
import { useResponsive } from 'src/composables/useResponsive';
import type {
  ChannelPushBatchImportFailedRow,
  ChannelPushDuplicateHint,
  ChannelPushImportPreview,
} from 'src/types/channelPush';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  duplicates: [hints: ChannelPushDuplicateHint[]];
}>();

const store = useChannelPushStore();
const { isMobile } = useResponsive();

const selectedFile = ref<File | null>(null);
const reading = ref(false);
const preview = ref<ChannelPushImportPreview | null>(null);
const failedRows = ref<ChannelPushBatchImportFailedRow[]>([]);
const activeTab = ref<'valid' | 'invalid' | 'duplicates' | 'failed'>('valid');

const canConfirm = computed(
  () =>
    preview.value?.headerValid === true &&
    preview.value.validRows.length > 0 &&
    !preview.value.overLimit,
);

async function handleFileChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? (value[0] ?? null) : value;
  selectedFile.value = file;
  preview.value = null;
  failedRows.value = [];
  if (!file) return;

  reading.value = true;
  try {
    const buf = await readFile(file);
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    const rows = sheet
      ? (XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][])
      : [];
    preview.value = parseChannelPushImportRows(rows, file.name);
  } catch {
    Notify.create({ type: 'negative', message: 'Excel 文件读取失败，请检查文件格式。' });
  } finally {
    reading.value = false;
  }
}

function readFile(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('invalid file result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsArrayBuffer(file);
  });
}

async function handleConfirm() {
  if (!preview.value || !canConfirm.value) return;
  const rows = preview.value.validRows.map((r) => r.payload);
  const result = await store.batchImport(rows);
  Notify.create({
    type: 'positive',
    message: `已导入 ${result.createdCount}/${result.total} 条推送`,
  });
  failedRows.value = result.failedRows;
  if (result.duplicateHints.length > 0) {
    emit('duplicates', result.duplicateHints);
  }
  if (result.failedRows.length === 0) {
    closeDialog();
  } else {
    activeTab.value = 'failed';
  }
}

function resolveExcelRowNumber(failedIndex: number): number | string {
  const validRow = preview.value?.validRows[failedIndex];
  return validRow?.rowNumber ?? '?';
}

function closeDialog() {
  selectedFile.value = null;
  preview.value = null;
  failedRows.value = [];
  reading.value = false;
  activeTab.value = 'valid';
  emit('update:modelValue', false);
}
</script>

<style scoped>
.import-body {
  max-height: min(72vh, 760px);
  overflow: auto;
}

.summary-card {
  background: var(--oa-surface);
}

.preview-table {
  overflow-x: auto;
}

.muted {
  color: var(--oa-text-secondary);
}

.import-actions .q-btn {
  min-height: 44px;
}

@media (max-width: 1023px) {
  .import-body {
    max-height: none;
  }
}
</style>
