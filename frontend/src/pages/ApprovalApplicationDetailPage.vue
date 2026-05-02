<template>
  <q-page padding class="approval-detail-page">
    <div class="detail-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="text-h6">申请详情</div>
        <ApplicationStatusChip v-if="detail" :status="detail.status" />
        <q-space />
        <q-btn
          v-if="isDesktop && detail && canShowCancelAction(detail)"
          outline
          color="negative"
          icon="cancel"
          label="撤销申请"
          :loading="canceling"
          @click="cancelDialog = true"
        />
      </div>

      <q-btn
        v-if="isMobile && detail && canShowCancelAction(detail)"
        outline
        color="negative"
        icon="cancel"
        label="撤销申请"
        class="mobile-inline-cancel q-mb-md"
        :loading="canceling"
        @click="cancelDialog = true"
      />

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
        <div class="text-body1">申请详情加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </q-card>

      <div v-else-if="detail" class="detail-grid">
        <div class="detail-main">
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
                仅展示与你本人申请相关的表单数据、审批节点和审批意见。
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">表单内容</div>
              <GridFormRenderer
                :schema="detail.schemaSnapshot"
                mode="print"
                :model-value="detail.formData"
              />
            </q-card-section>
          </q-card>
        </div>

        <div class="detail-side">
          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">当前节点</div>
              <div class="current-node q-mt-sm">{{ detail.currentNodeName || '—' }}</div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">审批动态</div>
              <ApplicationTimeline :events="detail.timeline" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <q-dialog v-model="cancelDialog" persistent>
      <q-card class="cancel-dialog">
        <q-card-section class="text-h6">撤销申请</q-card-section>
        <q-card-section>
          <div class="q-mb-md">
            撤销后当前审批待办将关闭，审批人不能继续处理。此操作会记录在时间线中。
          </div>
          <q-input
            v-model="cancelReason"
            outlined
            type="textarea"
            autogrow
            maxlength="200"
            counter
            label="撤销原因（选填）"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="canceling" v-close-popup />
          <q-btn
            color="negative"
            label="确认撤销"
            :loading="canceling"
            @click="confirmCancel"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ApplicationStatusChip from 'src/components/approval/ApplicationStatusChip.vue';
import ApplicationTimeline from 'src/components/approval/ApplicationTimeline.vue';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useApprovalApplicationStore } from 'src/stores/approvalApplication';
import {
  canShowCancelAction,
  type ApprovalApplicationDetail,
} from 'src/types/approvalApplication';

const route = useRoute();
const router = useRouter();
const store = useApprovalApplicationStore();
const { isDesktop, isMobile } = useResponsive();

const loading = ref(true);
const error = ref(false);
const detail = ref<ApprovalApplicationDetail | null>(null);
const cancelDialog = ref(false);
const cancelReason = ref('');
const canceling = ref(false);
const applicationId = computed(() => Number(route.params.id));

async function load() {
  loading.value = true;
  try {
    detail.value = await store.fetchDetail(applicationId.value);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
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

async function confirmCancel() {
  canceling.value = true;
  try {
    await store.cancel(applicationId.value, cancelReason.value.trim() || undefined);
    Notify.create({ type: 'positive', message: '申请已撤销' });
    cancelDialog.value = false;
    cancelReason.value = '';
    await load();
    await store.fetchList();
  } finally {
    canceling.value = false;
  }
}

function goBack() {
  router.push('/approval/applications');
}

onMounted(() => load());
</script>

<style scoped>
.approval-detail-page {
  background: var(--oa-bg);
}

.detail-wrapper {
  max-width: 1184px;
  margin: 0 auto;
  padding-bottom: 80px;
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

.muted {
  color: var(--oa-text-secondary);
}

.visibility-hint {
  border-top: 1px solid var(--oa-border);
  padding-top: 12px;
  color: var(--oa-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.current-node {
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.cancel-dialog {
  width: 480px;
  max-width: calc(100vw - 32px);
  border-radius: 8px;
}

.mobile-inline-cancel {
  width: 100%;
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
