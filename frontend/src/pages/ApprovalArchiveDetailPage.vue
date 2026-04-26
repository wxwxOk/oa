<template>
  <q-page padding class="approval-archive-detail-page">
    <div class="detail-wrapper" :class="{ 'has-mobile-actions': isMobile && detail }">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回归档查询" @click="goBack">
          <q-tooltip>返回归档查询</q-tooltip>
        </q-btn>
        <div class="text-h6">归档详情</div>
        <q-chip v-if="detail" dense square :color="sourceColor(detail.sourceType)" text-color="white">
          {{ sourceTypeLabel(detail.sourceType) }}
        </q-chip>
        <q-chip v-if="detail" dense square :color="archiveStatusColor(detail.status)" text-color="white">
          {{ archiveStatusLabel(detail.status) }}
        </q-chip>
        <q-space />
        <q-btn outline color="primary" icon="print" label="打印" :disable="!detail" @click="printArchive" />
        <q-btn
          outline
          color="primary"
          icon="picture_as_pdf"
          label="导出 PDF"
          :loading="pdfLoading"
          :disable="!detail"
          @click="exportPdf"
        />
      </div>

      <div v-if="loading" class="detail-grid">
        <q-card v-for="i in 4" :key="i" flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton type="text" width="48%" />
            <q-skeleton v-for="j in 5" :key="j" type="text" width="80%" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>

      <q-card v-else-if="error" flat bordered class="detail-section text-center q-pa-xl">
        <div class="text-body1">归档详情加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="loadDetail" />
      </q-card>

      <div v-else-if="detail" class="detail-grid">
        <div class="detail-main">
          <q-card v-if="isMobile" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">操作</div>
              <div class="operation-actions q-mt-md">
                <div class="visibility-hint">处理字段、标签、备注和修正操作仅影响内部归档信息。</div>
                <div class="operation-action-grid q-mt-md">
                  <q-btn
                    v-perm="'approval:archive:mark'"
                    outline
                    color="primary"
                    icon="sell"
                    label="保存标签"
                    :disable="!detail.canMark || !tagsChanged"
                    :loading="store.actionLoading"
                    @click="saveTags"
                  />
                  <q-btn
                    v-perm="'approval:archive:mark'"
                    outline
                    color="primary"
                    icon="sticky_note_2"
                    label="添加内部备注"
                    :disable="!detail.canMark"
                    @click="openNoteDialog"
                  />
                  <q-btn
                    v-perm="'approval:archive:edit'"
                    color="primary"
                    icon="edit_note"
                    label="修正提交数据"
                    :disable="!detail.canEdit"
                    @click="openCorrectionDialog"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">归档信息</div>
              <div class="summary-grid q-mt-md">
                <div><span class="muted">编号：</span>{{ detail.archiveNo }}</div>
                <div><span class="muted">来源：</span>{{ sourceTypeLabel(detail.sourceType) }}</div>
                <div><span class="muted">模板：</span>{{ detail.templateName }} v{{ detail.templateVersion }}</div>
                <div><span class="muted">申请人/填写者：</span>{{ detail.personName }}</div>
                <div><span class="muted">部门：</span>{{ detail.departmentName || '未设置部门' }}</div>
                <div><span class="muted">提交/收集时间：</span>{{ formatDate(detail.submittedAt) }}</div>
                <div><span class="muted">完成时间：</span>{{ formatDate(detail.completedAt) }}</div>
                <div><span class="muted">当前状态：</span>{{ archiveStatusLabel(detail.status) }}</div>
                <div><span class="muted">最近更新时间：</span>{{ formatDate(detail.updatedAt) }}</div>
              </div>
              <div class="visibility-hint q-mt-md">
                正式提交内容按提交时快照展示，模板后续变更不会影响本记录。
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="isMobile" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title q-mb-md">标签/标记</div>
              <div class="tag-panel">
                <div class="tag-list">
                  <q-chip
                    v-for="tag in localTags"
                    :key="tag"
                    dense
                    :removable="detail.canMark"
                    outline
                    :disable="!detail.canMark"
                    @remove="removeTag(tag)"
                  >
                    {{ tag }}
                  </q-chip>
                  <span v-if="localTags.length === 0" class="muted">暂无标签</span>
                </div>
                <div class="quick-tags q-mt-sm">
                  <q-chip
                    v-for="tag in tagOptions"
                    :key="tag"
                    dense
                    clickable
                    :color="localTags.includes(tag) ? 'primary' : undefined"
                    :text-color="localTags.includes(tag) ? 'white' : undefined"
                    :outline="!localTags.includes(tag)"
                    :disable="!detail.canMark"
                    @click="addTag(tag)"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
                <div v-if="detail.canMark" class="row q-gutter-sm q-mt-md">
                  <q-input
                    v-model="newTag"
                    outlined
                    dense
                    clearable
                    label="添加标签"
                    class="col"
                    @keyup.enter="addNewTag"
                  />
                  <q-btn flat color="primary" label="添加" @click="addNewTag" />
                </div>
                <q-btn
                  v-if="detail.canMark"
                  color="primary"
                  label="保存标签"
                  class="q-mt-md full-width"
                  :disable="!tagsChanged"
                  :loading="store.actionLoading"
                  @click="saveTags"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title q-mb-md">正式提交内容</div>
              <div
                id="print-area"
                class="print-area"
                :data-form-title="detail.templateName"
                :data-submit-time="formatDate(detail.submittedAt)"
              >
                <GridFormRenderer
                  :schema="detail.schemaSnapshot"
                  mode="print"
                  :model-value="detail.effectiveData"
                />
              </div>
              <div v-if="correctedFields.length > 0" class="corrected-list q-mt-md">
                <div v-for="field in correctedFields" :key="field.id" class="corrected-row">
                  <div class="min-width-0">
                    <span class="text-weight-medium">{{ field.label }}</span>
                    <q-badge color="warning" text-color="black" class="q-ml-xs">已修正</q-badge>
                    <div class="text-caption muted wrap-text">当前值：{{ formatValue(detail.effectiveData[field.id]) }}</div>
                  </div>
                  <q-btn flat dense color="primary" label="查看原值" @click="viewOriginal(field)" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">后续处理信息</div>
              <div class="visibility-hint q-mt-sm">
                以下信息为内部后续处理字段，不会覆盖申请人或填写者的正式提交内容。
              </div>
              <div class="text-caption muted q-mt-xs">后续处理字段</div>
              <div v-if="processingFields.length === 0" class="empty-block q-mt-md">暂无后续处理字段</div>
              <div v-else class="processing-grid q-mt-md">
                <div v-for="field in processingFields" :key="field.id" class="processing-field">
                  <q-input
                    v-if="field.type === 'text' || field.type === 'phone' || field.type === 'date'"
                    v-model="processingForm[field.id]"
                    outlined
                    dense
                    :type="field.type === 'date' ? 'date' : 'text'"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :readonly="!detail.canEdit"
                  />
                  <q-input
                    v-else-if="field.type === 'textarea'"
                    v-model="processingForm[field.id]"
                    outlined
                    dense
                    type="textarea"
                    autogrow
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :readonly="!detail.canEdit"
                  />
                  <q-select
                    v-else
                    v-model="processingForm[field.id]"
                    outlined
                    dense
                    emit-value
                    map-options
                    :multiple="field.type === 'checkbox'"
                    :label="field.label"
                    :options="processingOptions(field)"
                    :readonly="!detail.canEdit"
                  />
                </div>
              </div>
            </q-card-section>
            <q-card-actions v-if="processingFields.length > 0" align="right" class="q-pa-md">
              <q-btn
                v-perm="'approval:archive:edit'"
                color="primary"
                label="保存处理信息"
                :loading="store.actionLoading"
                :disable="!detail.canEdit"
                @click="saveProcessing"
              />
            </q-card-actions>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">字段修正历史</div>
              <div v-if="correctionHistory.length === 0" class="empty-block">暂无字段修正历史</div>
              <div v-else class="history-list">
                <div v-for="entry in correctionHistory" :key="entry.id" class="history-entry">
                  <div class="row items-center q-gutter-sm">
                    <div class="text-body2 text-weight-medium">{{ entry.actorName }}</div>
                    <div class="text-caption muted">{{ formatDate(entry.createdAt) }}</div>
                  </div>
                  <div class="text-caption muted q-mt-xs wrap-text">修正原因：{{ entry.reason }}</div>
                  <q-markup-table dense flat class="q-mt-sm">
                    <thead>
                      <tr>
                        <th class="text-left">字段</th>
                        <th class="text-left">原值</th>
                        <th class="text-left">新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="change in entry.changes" :key="change.fieldId">
                        <td class="text-left wrap-text">{{ fieldLabel(change.fieldId, change.fieldLabel) }}</td>
                        <td class="text-left wrap-text">{{ formatValue(change.beforeValue) }}</td>
                        <td class="text-left wrap-text">{{ formatValue(change.afterValue ?? change.value) }}</td>
                      </tr>
                    </tbody>
                  </q-markup-table>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="detail-side">
          <q-card v-if="isDesktop" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">操作</div>
              <div class="operation-actions q-mt-md">
                <div class="visibility-hint">处理字段、标签、备注和修正操作仅影响内部归档信息。</div>
                <div class="operation-action-grid q-mt-md">
                  <q-btn
                    v-perm="'approval:archive:mark'"
                    outline
                    color="primary"
                    icon="sell"
                    label="保存标签"
                    :disable="!detail.canMark || !tagsChanged"
                    :loading="store.actionLoading"
                    @click="saveTags"
                  />
                  <q-btn
                    v-perm="'approval:archive:mark'"
                    outline
                    color="primary"
                    icon="sticky_note_2"
                    label="添加内部备注"
                    :disable="!detail.canMark"
                    @click="openNoteDialog"
                  />
                  <q-btn
                    v-perm="'approval:archive:edit'"
                    color="primary"
                    icon="edit_note"
                    label="修正提交数据"
                    :disable="!detail.canEdit"
                    @click="openCorrectionDialog"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="isDesktop" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title q-mb-md">标签/标记</div>
              <div class="tag-panel">
                <div class="tag-list">
                  <q-chip
                    v-for="tag in localTags"
                    :key="tag"
                    dense
                    :removable="detail.canMark"
                    outline
                    :disable="!detail.canMark"
                    @remove="removeTag(tag)"
                  >
                    {{ tag }}
                  </q-chip>
                  <span v-if="localTags.length === 0" class="muted">暂无标签</span>
                </div>
                <div class="quick-tags q-mt-sm">
                  <q-chip
                    v-for="tag in tagOptions"
                    :key="tag"
                    dense
                    clickable
                    :color="localTags.includes(tag) ? 'primary' : undefined"
                    :text-color="localTags.includes(tag) ? 'white' : undefined"
                    :outline="!localTags.includes(tag)"
                    :disable="!detail.canMark"
                    @click="addTag(tag)"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
                <div v-if="detail.canMark" class="row q-gutter-sm q-mt-md">
                  <q-input
                    v-model="newTag"
                    outlined
                    dense
                    clearable
                    label="添加标签"
                    class="col"
                    @keyup.enter="addNewTag"
                  />
                  <q-btn flat color="primary" label="添加" @click="addNewTag" />
                </div>
                <q-btn
                  v-if="detail.canMark"
                  color="primary"
                  label="保存标签"
                  class="q-mt-md full-width"
                  :disable="!tagsChanged"
                  :loading="store.actionLoading"
                  @click="saveTags"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="section-title">内部备注</div>
                <q-space />
                <q-btn
                  v-perm="'approval:archive:mark'"
                  flat
                  dense
                  color="primary"
                  icon="add"
                  label="添加内部备注"
                  :disable="!detail.canMark"
                  @click="openNoteDialog"
                />
              </div>
              <div v-if="detail.notes.length === 0" class="empty-block">暂无内部备注</div>
              <div v-else class="note-list">
                <div v-for="note in detail.notes" :key="note.id" class="note-item">
                  <div class="row items-center q-gutter-sm">
                    <div class="text-body2 text-weight-medium">{{ note.actorName }}</div>
                    <div class="text-caption muted">{{ formatDate(note.createdAt) }}</div>
                  </div>
                  <div class="note-content q-mt-xs">{{ note.content }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">处理动态</div>
              <ApplicationTimeline :events="detail.timeline" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <div v-if="isMobile && detail" class="mobile-detail-actions">
      <q-btn outline color="primary" icon="print" label="打印" @click="printArchive" />
      <q-btn outline color="primary" icon="picture_as_pdf" label="导出 PDF" :loading="pdfLoading" @click="exportPdf" />
    </div>

    <q-dialog v-model="noteDialog" persistent>
      <q-card class="archive-dialog">
        <q-card-section class="text-h6">添加内部备注</q-card-section>
        <q-card-section>
          <q-input v-model="noteContent" outlined type="textarea" autogrow maxlength="500" counter label="备注内容" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
          <q-btn
            color="primary"
            label="保存备注"
            :disable="noteContent.trim().length === 0"
            :loading="store.actionLoading"
            @click="saveNote"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="correctionDialog" persistent>
      <q-card class="correction-dialog">
        <q-card-section class="text-h6">修正提交数据</q-card-section>
        <q-card-section v-if="detail" class="q-gutter-md">
          <div class="dialog-summary">
            <div>编号：{{ detail.archiveNo }}</div>
            <div>来源：{{ sourceTypeLabel(detail.sourceType) }}</div>
            <div>模板：{{ detail.templateName }}</div>
            <div>当前状态：{{ archiveStatusLabel(detail.status) }}</div>
          </div>
          <div class="dialog-warning">
            保存后系统会保留原始提交值，并追加字段级修改记录。请确认修正原因准确。
          </div>
          <div class="correction-grid">
            <div v-for="field in formalFields" :key="field.id" class="correction-field">
              <q-input
                v-model="correctionValues[field.id]"
                outlined
                dense
                :label="field.label"
                :type="field.type === 'date' ? 'date' : 'text'"
              />
              <div v-if="isFieldChanged(field.id)" class="diff-preview">
                <div><span class="muted">原值：</span>{{ formatValue(detail.effectiveData[field.id]) }}</div>
                <div><span class="muted">新值：</span>{{ formatValue(correctionValues[field.id]) }}</div>
              </div>
            </div>
          </div>
          <q-input
            v-model="correctionReason"
            outlined
            type="textarea"
            autogrow
            maxlength="500"
            counter
            label="修正原因"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
          <q-btn
            color="primary"
            label="保存修正"
            :disable="!canSaveCorrection"
            :loading="store.actionLoading"
            @click="saveCorrection"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Dialog, Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ApplicationTimeline from 'src/components/approval/ApplicationTimeline.vue';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { exportToPdf } from 'src/composables/usePdfExport';
import { useApprovalArchiveStore } from 'src/stores/approvalArchive';
import {
  ARCHIVE_RECOMMENDED_TAGS,
  archiveStatusColor,
  archiveStatusLabel,
  sourceTypeLabel,
  type ArchiveDetail,
  type ArchiveProcessingField,
  type ArchiveSourceType,
} from 'src/types/approvalArchive';
import { flattenFields, type SchemaField } from 'src/types/schema';

const route = useRoute();
const router = useRouter();
const store = useApprovalArchiveStore();
const { isDesktop, isMobile } = useResponsive();

const loading = ref(true);
const error = ref(false);
const pdfLoading = ref(false);
const noteDialog = ref(false);
const correctionDialog = ref(false);
const noteContent = ref('');
const correctionReason = ref('');
const localTags = ref<string[]>([]);
const newTag = ref('');
const processingForm = reactive<Record<string, string | string[] | null>>({});
const correctionValues = reactive<Record<string, string | string[] | null>>({});

const sourceType = computed(() => route.params.sourceType as ArchiveSourceType);
const sourceId = computed(() => Number(route.params.id));
const detail = computed(() => store.detail);
const processingFields = computed(() => detail.value?.processingFields ?? []);
const correctionHistory = computed(() => detail.value?.correctionHistory ?? detail.value?.corrections ?? []);
const formalFields = computed(() => (detail.value ? flattenFields(detail.value.schemaSnapshot) : []));
const correctedFieldIds = computed(() => {
  const ids = new Set<string>();
  for (const entry of correctionHistory.value) {
    for (const change of entry.changes) ids.add(change.fieldId);
  }
  return ids;
});
const correctedFields = computed(() => formalFields.value.filter((field) => correctedFieldIds.value.has(field.id)));
const tagOptions = computed(() => Array.from(new Set([...ARCHIVE_RECOMMENDED_TAGS, ...localTags.value])));
const tagsChanged = computed(() => JSON.stringify(localTags.value) !== JSON.stringify(detail.value?.tags ?? []));
const canSaveCorrection = computed(() => correctionReason.value.trim().length > 0 && changedCorrectionFields.value.length > 0);
const changedCorrectionFields = computed(() =>
  formalFields.value
    .filter((field) => isFieldChanged(field.id))
    .map((field) => ({ fieldId: field.id, value: correctionValues[field.id] })),
);

watch(detail, (value) => {
  if (!value) return;
  localTags.value = [...value.tags];
  syncProcessingForm(value);
  syncCorrectionForm(value);
}, { immediate: true });

async function loadDetail() {
  loading.value = true;
  try {
    await store.fetchDetail(sourceType.value, sourceId.value);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function syncProcessingForm(value: ArchiveDetail) {
  for (const key of Object.keys(processingForm)) delete processingForm[key];
  for (const field of value.processingFields ?? []) {
    const currentValue = value.processingData[field.id];
    processingForm[field.id] = normalizeFormValue(currentValue, field.type === 'checkbox');
  }
}

function syncCorrectionForm(value: ArchiveDetail) {
  for (const key of Object.keys(correctionValues)) delete correctionValues[key];
  for (const field of flattenFields(value.schemaSnapshot)) {
    correctionValues[field.id] = normalizeFormValue(value.effectiveData[field.id], Array.isArray(value.effectiveData[field.id]));
  }
  correctionReason.value = '';
}

function normalizeFormValue(value: unknown, forceArray = false): string | string[] | null {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (forceArray) return [];
  if (value === null || value === undefined) return '';
  return String(value);
}

function processingOptions(field: ArchiveProcessingField) {
  return (field.options ?? []).map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  );
}

function goBack() {
  router.push('/approval/archive');
}

function printArchive() {
  window.print();
}

async function exportPdf() {
  const value = detail.value;
  const element = document.getElementById('print-area');
  if (!value || !element) return;
  pdfLoading.value = true;
  try {
    await exportToPdf(element, `${value.archiveNo || value.templateName}.pdf`);
  } catch {
    Notify.create({ type: 'negative', message: 'PDF 导出失败，请重试。' });
  } finally {
    pdfLoading.value = false;
  }
}

function addTag(tag: string) {
  if (!detail.value?.canMark || localTags.value.includes(tag)) return;
  localTags.value.push(tag);
}

function addNewTag() {
  const tag = newTag.value.trim();
  if (!tag) return;
  addTag(tag);
  newTag.value = '';
}

function removeTag(tag: string) {
  localTags.value = localTags.value.filter((item) => item !== tag);
}

async function saveTags() {
  const value = detail.value;
  if (!value || !value.canMark || !tagsChanged.value) return;
  try {
    await store.saveTags(value.sourceType, value.sourceId, { tags: localTags.value });
    Notify.create({ type: 'positive', message: '标签已保存' });
  } catch {
    Notify.create({ type: 'negative', message: '标签保存失败，请重试。' });
  }
}

function openNoteDialog() {
  noteContent.value = '';
  noteDialog.value = true;
}

async function saveNote() {
  const value = detail.value;
  const content = noteContent.value.trim();
  if (!value || !content) return;
  try {
    await store.addNote(value.sourceType, value.sourceId, { content });
    Notify.create({ type: 'positive', message: '备注已保存' });
    noteDialog.value = false;
  } catch {
    Notify.create({ type: 'negative', message: '备注保存失败，请重试。' });
  }
}

async function saveProcessing() {
  const value = detail.value;
  if (!value || !value.canEdit) return;
  try {
    await store.saveProcessing(value.sourceType, value.sourceId, { processingData: { ...processingForm } });
    Notify.create({ type: 'positive', message: '处理信息已保存' });
  } catch {
    Notify.create({ type: 'negative', message: '处理信息保存失败，请重试。' });
  }
}

function openCorrectionDialog() {
  if (detail.value) syncCorrectionForm(detail.value);
  correctionDialog.value = true;
}

async function saveCorrection() {
  const value = detail.value;
  if (!value || !canSaveCorrection.value) return;
  try {
    await store.saveCorrection(value.sourceType, value.sourceId, {
      changes: changedCorrectionFields.value,
      reason: correctionReason.value.trim(),
    });
    Notify.create({ type: 'positive', message: '修正已保存' });
    correctionDialog.value = false;
  } catch {
    Notify.create({ type: 'negative', message: '修正保存失败，请重试。' });
  }
}

function isFieldChanged(fieldId: string) {
  const value = detail.value;
  if (!value) return false;
  return JSON.stringify(normalizeFormValue(value.effectiveData[fieldId], Array.isArray(value.effectiveData[fieldId]))) !== JSON.stringify(correctionValues[fieldId]);
}

function viewOriginal(field: SchemaField) {
  const value = detail.value ? detail.value.formData[field.id] : undefined;
  Dialog.create({
    title: `${field.label} 原值`,
    message: formatValue(value),
    ok: '关闭',
  });
}

function fieldLabel(fieldId: string, fallback?: string) {
  return fallback || formalFields.value.find((field) => field.id === fieldId)?.label || fieldId;
}

function sourceColor(value: ArchiveSourceType) {
  return value === 'approval' ? 'primary' : 'info';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\//g, '-');
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.map(formatValue).join('、') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

onMounted(() => {
  void loadDetail();
});
</script>

<style scoped>
.approval-archive-detail-page {
  background: var(--oa-bg);
}

.detail-wrapper {
  max-width: 1184px;
  margin: 0 auto;
  padding-bottom: 80px;
}

.detail-wrapper.has-mobile-actions {
  padding-bottom: 112px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

.detail-section {
  border-radius: 8px;
  background: var(--oa-surface);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.summary-grid,
.processing-grid,
.correction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.processing-field,
.correction-field,
.min-width-0 {
  min-width: 0;
}

.visibility-hint,
.diff-preview {
  border-top: 1px solid var(--oa-border);
  padding-top: 12px;
  color: var(--oa-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.dialog-warning {
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 8px;
  padding: 12px;
  color: var(--q-negative);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--oa-bg);
  font-size: 14px;
  line-height: 1.5;
}

.operation-action-grid {
  display: grid;
  gap: 8px;
}

.tag-list,
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.corrected-list,
.history-list,
.note-list {
  display: grid;
  gap: 12px;
}

.corrected-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--oa-border);
}

.history-entry,
.note-item {
  padding: 12px;
  border: 1px solid var(--oa-border);
  border-radius: 8px;
}

.note-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.5;
}

.empty-block,
.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

.archive-dialog {
  width: 480px;
  max-width: calc(100vw - 32px);
  border-radius: 8px;
}

.correction-dialog {
  width: 760px;
  max-width: calc(100vw - 32px);
  border-radius: 8px;
}

.mobile-detail-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: var(--oa-surface);
  border-top: 1px solid var(--oa-border);
  padding: 12px 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 10;
}

.mobile-detail-actions .q-btn,
.operation-action-grid .q-btn {
  min-height: 44px;
}

.print-area :deep(.mode-print .print-cell),
.history-entry,
.note-item {
  overflow-wrap: anywhere;
}

@media (max-width: 1023px) {
  .detail-grid,
  .summary-grid,
  .processing-grid,
  .correction-grid,
  .dialog-summary {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .detail-section :deep(.mode-print .print-grid-table),
  .detail-section :deep(.mode-print .print-grid-table tbody),
  .detail-section :deep(.mode-print .print-grid-table tr),
  .detail-section :deep(.mode-print .print-grid-table td) {
    display: block;
    width: 100% !important;
    max-width: 100%;
  }

  .detail-section :deep(.mode-print .print-cell) {
    overflow-wrap: anywhere;
  }
}
</style>
