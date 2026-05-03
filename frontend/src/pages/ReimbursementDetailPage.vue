<template>
  <q-page padding class="reimbursement-detail-page">
    <div class="detail-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">报销详情</div>
          <div v-if="detail" class="text-caption muted wrap-text">{{ detail.applicationNo }} · {{ detail.title }}</div>
        </div>
        <ReimbursementStatusChip v-if="detail" :status="detail.status" />
        <q-space v-if="isDesktop" />
        <q-btn
          v-if="isDesktop && canMutateDraft"
          outline
          color="primary"
          icon="edit"
          label="继续编辑"
          @click="goEdit"
        />
        <q-btn
          v-if="isDesktop && canMutateDraft"
          color="primary"
          icon="send"
          label="提交申请"
          :loading="store.actionLoading"
          @click="submitApplication"
        />
      </div>

      <div v-if="isMobile && canMutateDraft" class="mobile-actions q-mb-md">
        <q-btn outline color="primary" icon="edit" label="继续编辑" @click="goEdit" />
        <q-btn color="primary" icon="send" label="提交申请" :loading="store.actionLoading" @click="submitApplication" />
      </div>

      <div v-if="loading" class="detail-grid">
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton v-for="i in 6" :key="i" type="text" width="82%" class="q-mt-sm" />
          </q-card-section>
        </q-card>
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton v-for="i in 4" :key="i" type="rect" height="48px" class="q-mb-sm" />
          </q-card-section>
        </q-card>
      </div>

      <q-card v-else-if="error" flat bordered class="detail-section text-center q-pa-xl">
        <div class="text-body1">报销详情加载失败，请返回列表或重试</div>
        <div class="row justify-center q-gutter-sm q-mt-md">
          <q-btn flat label="返回列表" @click="goBack" />
          <q-btn color="primary" label="重新加载" @click="load" />
        </div>
      </q-card>

      <div v-else-if="detail" class="detail-grid">
        <div class="detail-main">
          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">申请信息</div>
              <div class="summary-grid q-mt-md">
                <div><span class="muted">标题：</span>{{ detail.title }}</div>
                <div><span class="muted">申请编号：</span>{{ detail.applicationNo }}</div>
                <div><span class="muted">类别：</span>{{ detail.category }}</div>
                <div><span class="muted">金额：</span>{{ formatReimbursementAmount(detail.amount) }}</div>
                <div><span class="muted">发生日期：</span>{{ formatReimbursementDate(detail.occurredAt) }}</div>
                <div><span class="muted">状态：</span><ReimbursementStatusChip :status="detail.status" /></div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">申请人信息</div>
              <div class="summary-grid q-mt-md">
                <div><span class="muted">申请人：</span>{{ detail.applicantName }}</div>
                <div><span class="muted">部门：</span>{{ detail.applicantDepartmentName || '-' }}</div>
                <div><span class="muted">提交时间：</span>{{ formatDateTime(detail.submittedAt) }}</div>
                <div><span class="muted">完成时间：</span>{{ formatDateTime(detail.completedAt) }}</div>
                <div><span class="muted">创建时间：</span>{{ formatDateTime(detail.createdAt) }}</div>
                <div><span class="muted">更新时间：</span>{{ formatDateTime(detail.updatedAt) }}</div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">报销明细</div>
              <div class="detail-text q-mt-md">
                <div><span class="muted">报销事由：</span>{{ detail.reason }}</div>
                <div><span class="muted">收款信息：</span>{{ detail.payeeInfo || '-' }}</div>
                <div><span class="muted">备注：</span>{{ detail.remark || '-' }}</div>
              </div>
            </q-card-section>
          </q-card>

          <ReimbursementAttachmentPanel
            :application-id="detail.id"
            :attachments="detail.attachments"
            :editable="isDraftReimbursement(detail)"
            @uploaded="load"
            @deleted="load"
          />
        </div>

        <div class="detail-side">
          <q-card flat bordered class="detail-section q-mb-md">
            <q-card-section>
              <div class="section-title">附件</div>
              <div class="side-number q-mt-sm">{{ detail.attachmentCount }}</div>
              <div class="text-caption muted">非草稿状态下附件只读。</div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title q-mb-md">审核轨迹</div>
              <ReimbursementActionTimeline :actions="detail.actions" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ReimbursementActionTimeline from 'src/components/reimbursement/ReimbursementActionTimeline.vue';
import ReimbursementAttachmentPanel from 'src/components/reimbursement/ReimbursementAttachmentPanel.vue';
import ReimbursementStatusChip from 'src/components/reimbursement/ReimbursementStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useReimbursementStore } from 'src/stores/reimbursement';
import {
  formatReimbursementAmount,
  formatReimbursementDate,
  isDraftReimbursement,
  type ReimbursementDetail,
} from 'src/types/reimbursement';

defineOptions({ name: 'ReimbursementDetailPage' });

const route = useRoute();
const router = useRouter();
const store = useReimbursementStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const loading = ref(true);
const error = ref(false);
const detail = ref<ReimbursementDetail | null>(null);
const applicationId = computed(() => Number(route.params.id));
const canMutateDraft = computed(() => !!detail.value && isDraftReimbursement(detail.value) && auth.hasPerm('reimbursement:create'));

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

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = formatReimbursementDate(value);
  const time = value.length >= 16 ? value.slice(11, 16) : '';
  return time ? `${date} ${time}` : date;
}

function goBack() {
  router.push('/reimbursements');
}

function goEdit() {
  if (!detail.value || !canMutateDraft.value) return;
  router.push(`/reimbursements/${detail.value.id}/edit`);
}

async function submitApplication() {
  if (!detail.value || !canMutateDraft.value) return;
  try {
    await store.submitDraft(detail.value.id);
    Notify.create({ type: 'positive', message: '报销申请已提交，等待部门初审' });
    await load();
  } catch {
    Notify.create({ type: 'negative', message: '报销申请提交失败，请检查后重试。' });
  }
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.reimbursement-detail-page {
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

.detail-main,
.detail-side {
  min-width: 0;
}

.detail-section {
  border-radius: 8px;
  background: var(--oa-surface);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.detail-text {
  display: grid;
  gap: 10px;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  overflow-wrap: anywhere;
}

.min-width-0 {
  min-width: 0;
}

.side-number {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.mobile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mobile-actions .q-btn {
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
}
</style>
