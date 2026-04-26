<template>
  <q-page padding class="approval-task-detail-page">
    <div class="detail-wrapper" :class="{ 'has-mobile-actions': isMobile && canShowActions }">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回审批列表" @click="goBack">
          <q-tooltip>返回待我审批</q-tooltip>
        </q-btn>
        <div class="text-h6">审批详情</div>
        <ApprovalTaskStatusChip v-if="detail" :status="detail.taskStatus" />
        <ApplicationStatusChip v-if="detail" :status="detail.applicationStatus" />
        <q-space />
        <q-btn flat dense round icon="refresh" aria-label="刷新审批详情" @click="load">
          <q-tooltip>刷新审批详情</q-tooltip>
        </q-btn>
      </div>

      <div v-if="loading" class="detail-grid">
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton v-for="i in 5" :key="i" type="text" width="80%" class="q-mt-sm" />
          </q-card-section>
        </q-card>
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton v-for="i in 4" :key="i" type="rect" height="48px" class="q-mb-sm" />
          </q-card-section>
        </q-card>
      </div>

      <q-card v-else-if="error" flat bordered class="detail-section text-center q-pa-xl">
        <div class="text-body1">审批详情加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </q-card>

      <div v-else-if="detail" class="detail-grid">
        <div class="detail-main">
          <q-card v-if="isMobile" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">当前任务</div>
              <CurrentTaskSummary />
            </q-card-section>
            <q-card-actions v-if="canShowRemark" class="q-px-md q-pb-md">
              <q-btn
                v-perm="'approval:task:handle'"
                outline
                color="primary"
                icon="sticky_note_2"
                label="添加内部备注"
                class="task-remark-action full-width"
                :disable="store.actionLoading"
                @click="openRemarkDialog"
              />
            </q-card-actions>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">申请信息</div>
              <div class="summary-grid q-mt-md">
                <div><span class="muted">申请编号：</span>{{ detail.applicationNo }}</div>
                <div><span class="muted">申请类型：</span>{{ detail.templateName }} v{{ detail.templateVersion }}</div>
                <div><span class="muted">申请人：</span>{{ detail.applicantName }}</div>
                <div><span class="muted">部门：</span>{{ detail.applicantDepartmentName || '未设置部门' }}</div>
                <div><span class="muted">提交时间：</span>{{ formatDate(detail.submittedAt) }}</div>
                <div><span class="muted">完成时间：</span>{{ formatDate(detail.completedAt) }}</div>
                <div><span class="muted">当前节点：</span>{{ detail.currentNodeName || '—' }}</div>
              </div>
              <div class="visibility-hint q-mt-md">
                表单内容按提交时快照展示，当前模板变更不会影响本次审批。
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title q-mb-md">表单内容</div>
              <GridFormRenderer
                :schema="detail.schemaSnapshot"
                mode="print"
                :model-value="detail.formData"
              />
            </q-card-section>
          </q-card>

          <q-card v-if="isMobile" flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">审批动态</div>
              <ApplicationTimeline :events="detail.timeline" />
            </q-card-section>
          </q-card>
        </div>

        <div class="detail-side">
          <q-card v-if="isDesktop" flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">当前任务</div>
              <CurrentTaskSummary />
            </q-card-section>
            <q-card-actions v-if="canShowActions" class="q-pa-md action-row">
              <q-btn
                v-perm="'approval:task:handle'"
                outline
                color="negative"
                label="驳回审批"
                class="task-action-reject"
                :disable="store.actionLoading"
                @click="openRejectDialog"
              />
              <q-btn
                v-perm="'approval:task:handle'"
                color="primary"
                label="通过审批"
                class="task-action-approve"
                :disable="store.actionLoading"
                @click="openApproveDialog"
              />
            </q-card-actions>
            <q-card-actions v-if="canShowRemark" class="q-px-md q-pb-md">
              <q-btn
                v-perm="'approval:task:handle'"
                flat
                color="primary"
                icon="sticky_note_2"
                label="添加内部备注"
                class="task-remark-action full-width"
                :disable="store.actionLoading"
                @click="openRemarkDialog"
              />
            </q-card-actions>
          </q-card>

          <q-card v-if="isDesktop" flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">审批动态</div>
              <ApplicationTimeline :events="detail.timeline" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <div
      v-if="isMobile && canShowActions"
      v-perm="'approval:task:handle'"
      class="mobile-detail-actions"
    >
      <q-btn
        outline
        color="negative"
        label="驳回审批"
        class="task-action-reject"
        :disable="store.actionLoading"
        @click="openRejectDialog"
      />
      <q-btn
        color="primary"
        label="通过审批"
        class="task-action-approve"
        :disable="store.actionLoading"
        @click="openApproveDialog"
      />
    </div>

    <q-dialog v-model="approveDialog" persistent>
      <q-card class="task-dialog">
        <q-card-section class="text-h6">确认通过审批</q-card-section>
        <q-card-section>
          <TaskDialogSummary />
          <div class="dialog-hint q-mt-md">通过后任务将流转到下一节点或直接完成审批。</div>
          <q-input
            v-model="approveComment"
            outlined
            type="textarea"
            autogrow
            maxlength="200"
            counter
            label="审批意见（选填）"
            class="q-mt-md"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
          <q-btn
            color="primary"
            label="确认通过"
            :loading="store.actionLoading"
            @click="confirmApprove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="rejectDialog" persistent>
      <q-card class="task-dialog">
        <q-card-section class="text-h6">确认驳回审批</q-card-section>
        <q-card-section>
          <TaskDialogSummary />
          <div class="dialog-warning q-mt-md">驳回后申请将直接结束，并关闭全部未处理待办。</div>
          <q-input
            v-model="rejectComment"
            outlined
            type="textarea"
            autogrow
            maxlength="200"
            counter
            label="驳回意见"
            class="q-mt-md"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
          <q-btn
            color="negative"
            label="确认驳回"
            :disable="rejectComment.trim().length === 0"
            :loading="store.actionLoading"
            @click="confirmReject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="remarkDialog" persistent>
      <q-card class="task-dialog">
        <q-card-section class="text-h6">添加内部备注</q-card-section>
        <q-card-section>
          <q-input
            v-model="remarkComment"
            outlined
            type="textarea"
            autogrow
            maxlength="200"
            counter
            label="备注内容"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
          <q-btn
            color="primary"
            label="保存备注"
            :disable="remarkComment.trim().length === 0"
            :loading="store.actionLoading"
            @click="confirmRemark"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ApplicationStatusChip from 'src/components/approval/ApplicationStatusChip.vue';
import ApprovalTaskStatusChip from 'src/components/approval/ApprovalTaskStatusChip.vue';
import ApplicationTimeline from 'src/components/approval/ApplicationTimeline.vue';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useApprovalTaskStore } from 'src/stores/approvalTask';
import { statusLabel } from 'src/types/approvalApplication';
import { canHandleTask, type ApprovalTaskDetail } from 'src/types/approvalTask';

const route = useRoute();
const router = useRouter();
const store = useApprovalTaskStore();
const { isDesktop, isMobile } = useResponsive();

const loading = ref(true);
const error = ref(false);
const detail = ref<ApprovalTaskDetail | null>(null);
const approveDialog = ref(false);
const rejectDialog = ref(false);
const remarkDialog = ref(false);
const approveComment = ref('');
const rejectComment = ref('');
const remarkComment = ref('');
const taskId = computed(() => Number(route.params.id));
const canShowActions = computed(() => (detail.value ? canHandleTask(detail.value) : false));
const canShowRemark = computed(() => Boolean(detail.value?.canComment));

const CurrentTaskSummary = defineComponent({
  name: 'CurrentTaskSummary',
  setup() {
    return () =>
      detail.value
        ? h('div', { class: 'summary-grid q-mt-md' }, [
            h('div', [h('span', { class: 'muted' }, '任务状态：'), taskStatusText(detail.value.taskStatus)]),
            h('div', [h('span', { class: 'muted' }, '申请状态：'), statusLabel(detail.value.applicationStatus)]),
            h('div', [h('span', { class: 'muted' }, '当前节点：'), detail.value.nodeName || '—']),
            h('div', [h('span', { class: 'muted' }, '分配时间：'), formatDate(detail.value.assignedAt)]),
            h('div', [h('span', { class: 'muted' }, '处理时间：'), formatDate(detail.value.handledAt)]),
            h('div', [h('span', { class: 'muted' }, '当前审批人：'), detail.value.assigneeName || '—']),
            canShowActions.value
              ? h('div', { class: 'visibility-hint full-row' }, '请确认申请编号、申请类型和节点无误后再处理。')
              : h('div', { class: 'visibility-hint full-row' }, `处理结果：${taskStatusText(detail.value.taskStatus)}`),
          ])
        : null;
  },
});

const TaskDialogSummary = defineComponent({
  name: 'TaskDialogSummary',
  setup() {
    return () =>
      detail.value
        ? h('div', { class: 'dialog-summary' }, [
            h('div', `申请编号：${detail.value.applicationNo}`),
            h('div', `申请类型：${detail.value.templateName}`),
            h('div', `当前节点：${detail.value.nodeName || '—'}`),
          ])
        : null;
  },
});

async function load() {
  loading.value = true;
  try {
    detail.value = await store.fetchDetail(taskId.value);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function taskStatusText(status: ApprovalTaskDetail['taskStatus']) {
  const labels = {
    PENDING: '待处理',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    CANCELED: '已关闭',
    SKIPPED: '已跳过',
  };
  return labels[status];
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

function openApproveDialog() {
  approveComment.value = '';
  approveDialog.value = true;
}

function openRejectDialog() {
  rejectComment.value = '';
  rejectDialog.value = true;
}

function openRemarkDialog() {
  remarkComment.value = '';
  remarkDialog.value = true;
}

async function refreshTaskData() {
  const previousView = store.view;
  await load();
  await store.fetchList({ view: 'pending', page: 1 });
  await store.fetchList({ view: 'handled', page: 1 });
  await store.fetchList({ view: previousView, page: store.page });
}

async function confirmApprove() {
  try {
    await store.approve(taskId.value, approveComment.value.trim() || undefined);
    Notify.create({ type: 'positive', message: '审批已通过' });
    approveDialog.value = false;
    await refreshTaskData();
  } catch {
    Notify.create({ type: 'negative', message: '审批通过失败，请刷新后重试。' });
  }
}

async function confirmReject() {
  const comment = rejectComment.value.trim();
  if (!comment) return;
  try {
    await store.reject(taskId.value, comment);
    Notify.create({ type: 'positive', message: '审批已驳回' });
    rejectDialog.value = false;
    await refreshTaskData();
  } catch {
    Notify.create({ type: 'negative', message: '审批驳回失败，请刷新后重试。' });
  }
}

async function confirmRemark() {
  const comment = remarkComment.value.trim();
  if (!comment) return;
  try {
    await store.comment(taskId.value, comment);
    Notify.create({ type: 'positive', message: '内部备注已保存' });
    remarkDialog.value = false;
    await refreshTaskData();
  } catch {
    Notify.create({ type: 'negative', message: '内部备注保存失败，请检查网络后重试。' });
  }
}

function goBack() {
  router.push('/approval/tasks');
}

onMounted(() => load());
</script>

<style scoped>
.approval-task-detail-page {
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.full-row {
  grid-column: 1 / -1;
}

.muted {
  color: var(--oa-text-secondary);
}

.visibility-hint,
.dialog-hint {
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
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--oa-bg);
  font-size: 14px;
  line-height: 1.5;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.task-dialog {
  width: 480px;
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

.task-action-reject,
.task-action-approve,
.task-remark-action {
  min-height: 44px;
}

@media (max-width: 1023px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
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
