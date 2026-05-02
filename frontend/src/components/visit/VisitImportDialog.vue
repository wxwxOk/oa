<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="isMobile"
    :transition-show="isMobile ? 'slide-up' : 'scale'"
    :transition-hide="isMobile ? 'slide-down' : 'scale'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="visit-import-dialog" :style="isMobile ? '' : 'width: 920px; max-width: calc(100vw - 32px)'">
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>导入 Excel</q-toolbar-title>
        <q-btn flat round dense icon="close" aria-label="关闭导入弹窗" @click="closeDialog">
          <q-tooltip>关闭导入弹窗</q-tooltip>
        </q-btn>
      </q-toolbar>

      <q-card-section class="q-gutter-md visit-import-body">
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
            <q-icon name="attach_file" />
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
                  <div class="text-caption muted">重复提醒</div>
                  <div class="text-subtitle1">{{ preview.duplicateWarnings.length }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-banner v-if="preview.headerErrors.length > 0" rounded class="bg-negative text-white">
            <div class="text-subtitle2 q-mb-xs">表头错误</div>
            <div v-for="error in preview.headerErrors" :key="error">{{ error }}</div>
          </q-banner>

          <section v-if="preview.validRows.length > 0" class="preview-section">
            <div class="text-subtitle2 q-mb-sm">有效行预览</div>
            <q-markup-table flat bordered dense class="preview-table">
              <thead>
                <tr>
                  <th class="text-left">行号</th>
                  <th class="text-left">姓名</th>
                  <th class="text-left">渠道商</th>
                  <th class="text-left">咨询师</th>
                  <th class="text-left">接待日期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in preview.validRows.slice(0, 8)" :key="row.rowNumber">
                  <td>第 {{ row.rowNumber }} 行</td>
                  <td>{{ row.payload.name }}</td>
                  <td>{{ row.payload.channelPartner || '-' }}</td>
                  <td>{{ row.payload.consultant || '-' }}</td>
                  <td>{{ row.payload.receptionDate || '-' }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </section>

          <section v-if="preview.invalidRows.length > 0" class="preview-section">
            <div class="text-subtitle2 q-mb-sm">无效行错误</div>
            <q-list bordered separator>
              <q-item v-for="row in preview.invalidRows" :key="row.rowNumber">
                <q-item-section>
                  <q-item-label>第 {{ row.rowNumber }} 行</q-item-label>
                  <q-item-label caption>
                    {{ row.errors.map((error) => `${error.field}${error.message}`).join('；') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </section>

          <section v-if="preview.duplicateWarnings.length > 0" class="preview-section">
            <div class="text-subtitle2 q-mb-sm">潜在重复提醒</div>
            <q-list bordered separator>
              <q-item v-for="warning in preview.duplicateWarnings" :key="warning.key">
                <q-item-section>
                  <q-item-label>{{ warning.name }} / {{ warning.receptionDate }} / {{ warning.consultant }}</q-item-label>
                  <q-item-label caption>涉及行：{{ warning.rowNumbers.join('、') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </section>
        </template>
      </q-card-section>

      <q-separator />
      <q-card-actions align="right" class="q-pa-md visit-import-actions">
        <q-btn flat label="取消" @click="closeDialog" />
        <q-btn
          color="primary"
          label="确认导入有效行"
          :loading="store.importLoading"
          :disable="!canConfirm || store.importLoading"
          @click="confirmImport"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Notify } from 'quasar';
import * as XLSX from 'xlsx';
import { parseVisitImportRows } from 'src/components/visit/visitImport';
import { useResponsive } from 'src/composables/useResponsive';
import { useVisitStore } from 'src/stores/visit';
import type { VisitImportPreview, VisitImportResponse } from 'src/types/visit';

defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  imported: [response: VisitImportResponse];
}>();

const store = useVisitStore();
const { isMobile } = useResponsive();
const selectedFile = ref<File | null>(null);
const preview = ref<VisitImportPreview | null>(null);
const reading = ref(false);
const canConfirm = computed(() => preview.value?.headerValid === true && preview.value.validRows.length > 0);

async function handleFileChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] ?? null : value;
  selectedFile.value = file;
  preview.value = null;
  if (!file) return;

  reading.value = true;
  try {
    const arrayBuffer = await readFile(file);
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    const rows = sheet ? (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]) : [];
    preview.value = parseVisitImportRows(rows, file.name);
  } catch {
    Notify.create({ type: 'negative', message: '导入失败，Excel 文件读取失败。' });
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

async function confirmImport() {
  if (!preview.value || !canConfirm.value) return;
  try {
    const response = await store.importVisits(preview.value.validRows.map((row) => row.payload));
    Notify.create({ type: 'positive', message: `导入成功，已创建 ${response.createdCount} 条记录。` });
    emit('imported', response);
    resetLocalState();
    closeDialog();
  } catch {
    Notify.create({ type: 'negative', message: '导入失败，请检查数据后重试。' });
  }
}

function resetLocalState() {
  selectedFile.value = null;
  preview.value = null;
  reading.value = false;
}

function closeDialog() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.visit-import-body {
  max-height: min(72vh, 760px);
  overflow: auto;
}

.summary-card,
.preview-section {
  background: var(--oa-surface);
}

.preview-section {
  border: 1px solid var(--oa-border);
  border-radius: 8px;
  padding: 16px;
}

.preview-table {
  overflow-x: auto;
}

.muted {
  color: var(--oa-text-secondary);
}

.visit-import-actions .q-btn {
  min-height: 44px;
}

@media (max-width: 1023px) {
  .visit-import-body {
    max-height: none;
  }

  .preview-section {
    border-left: 0;
    border-right: 0;
    border-radius: 0;
  }
}
</style>
