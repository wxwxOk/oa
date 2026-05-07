<template>
  <q-page padding :class="['channel-push-review-detail-page', { 'has-mobile-review-actions': isMobile && canReview }]">
    <div class="detail-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">推送审核详情</div>
          <div v-if="detail" class="text-caption muted wrap-text">
            {{ detail.studentName }} · {{ detail.studentPhone }}
          </div>
        </div>
        <ChannelPushStatusChip v-if="detail" :status="detail.status" />
        <q-space v-if="isDesktop" />
        <q-btn
          v-if="isDesktop && detail"
          outline
          color="primary"
          icon="save"
          label="保存内部字段"
          class="review-action-save"
          :loading="store.reviewActionLoading"
          @click="saveInternalFields"
        />
        <q-btn
          v-if="isDesktop && canReview"
          color="positive"
          icon="check_circle"
          label="通过"
          class="review-action-approve"
          :loading="store.reviewActionLoading"
          @click="openApproveDialog"
        />
        <q-btn
          v-if="isDesktop && canReview"
          outline
          color="negative"
          icon="cancel"
          label="驳回"
          class="review-action-reject"
          :loading="store.reviewActionLoading"
          @click="openRejectDialog"
        />
      </div>

      <div v-if="loading" class="detail-grid">
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton v-for="i in 6" :key="i" type="text" width="82%" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>

      <q-card v-else-if="error" flat bordered class="detail-section text-center q-pa-xl">
        <div class="text-body1">推送审核详情加载失败，请返回列表或重试</div>
        <div class="row justify-center q-gutter-sm q-mt-md">
          <q-btn flat label="返回列表" @click="goBack" />
          <q-btn color="primary" label="重新加载" @click="load" />
        </div>
      </q-card>

      <template v-else-if="detail">
        <div class="detail-grid">
          <div class="detail-main">
            <q-card flat bordered class="detail-section q-mb-md">
              <q-card-section>
                <div class="section-title">渠道商提交信息</div>
                <div class="summary-grid q-mt-md">
                  <div><span class="muted">渠道商：</span>{{ detail.channelPartnerName }}</div>
                  <div><span class="muted">学员姓名：</span>{{ detail.studentName }}</div>
                  <div><span class="muted">手机号：</span>{{ detail.studentPhone }}</div>
                  <div><span class="muted">年龄：</span>{{ detail.studentAge ?? '-' }}</div>
                  <div><span class="muted">性别：</span>{{ detail.studentGender || '-' }}</div>
                  <div><span class="muted">学历：</span>{{ detail.studentEducation || '-' }}</div>
                  <div><span class="muted">意向状态：</span>{{ detail.intentStatus || '-' }}</div>
                  <div><span class="muted">提交时间：</span>{{ formatChannelPushDate(detail.submittedAt) }}</div>
                </div>
                <div class="detail-text q-mt-md">
                  <div><span class="muted">意向说明：</span>{{ detail.intentNote || '-' }}</div>
                  <div><span class="muted">原始备注：</span>{{ detail.remark || '-' }}</div>
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="detail-section q-mb-md">
              <q-card-section>
                <div class="section-title">重复提示</div>
                <q-banner v-if="detail.duplicateHints.length > 0" rounded class="duplicate-banner q-mt-md">
                  <q-list dense separator>
                    <q-item v-for="hint in detail.duplicateHints" :key="hint.id">
                      <q-item-section>
                        <q-item-label class="wrap-text">{{ hint.studentName }} · {{ hint.studentPhone }}</q-item-label>
                        <q-item-label caption>{{ formatChannelPushDate(hint.submittedAt) }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <ChannelPushStatusChip :status="hint.status" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-banner>
                <div v-else class="empty-hints q-mt-md">暂无重复提示</div>
              </q-card-section>
            </q-card>

            <div class="q-mb-md">
              <div class="section-title q-mb-sm">附件</div>
              <ChannelPushReviewAttachmentPanel
                :push-id="detail.id"
                :attachments="detail.attachments"
              />
            </div>

            <q-card flat bordered class="detail-section q-mb-md">
              <q-card-section>
                <div class="section-title">内部字段</div>
                <div class="internal-grid q-mt-md">
                  <q-select
                    v-model="internalScheduledReceiverId"
                    outlined
                    dense
                    clearable
                    use-input
                    emit-value
                    map-options
                    label="计划接待人"
                    :options="receiverOptions"
                    @filter="filterReceivers"
                  />
                  <q-input v-model="internalScheduledDate" outlined dense readonly label="预期接待日期">
                    <template #append>
                      <q-icon name="event" class="cursor-pointer" aria-label="选择预期接待日期">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <q-date v-model="internalScheduledDate" mask="YYYY-MM-DD" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                  <q-input
                    v-model="internalNote"
                    outlined
                    type="textarea"
                    label="内部备注"
                    maxlength="1000"
                    autogrow
                    class="internal-note"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="detail-side">
            <q-card flat bordered class="detail-section q-mb-md">
              <q-card-section>
                <div class="section-title">处理状态</div>
                <div class="side-stack q-mt-md">
                  <div>
                    <span class="muted">当前状态：</span>
                    <ChannelPushStatusChip :status="detail.status" />
                  </div>
                  <div><span class="muted">审核时间：</span>{{ formatChannelPushDate(detail.reviewedAt) }}</div>
                  <div class="wrap-text"><span class="muted">审核备注：</span>{{ detail.reviewComment || '-' }}</div>
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="detail-section q-mb-md">
              <q-card-section>
                <div class="section-title">审核时间线</div>
                <q-list v-if="detail.reviewActions.length > 0" separator class="q-mt-sm">
                  <q-item v-for="action in detail.reviewActions" :key="action.id" class="action-row">
                    <q-item-section avatar>
                      <q-icon :name="actionIcon(action.type)" :color="actionColor(action.type)" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="row items-center q-gutter-sm">
                        <span>{{ action.actorName || '系统' }}</span>
                        <q-badge :color="actionColor(action.type)">{{ action.type }}</q-badge>
                      </q-item-label>
                      <q-item-label caption class="wrap-text">
                        {{ formatChannelPushDate(action.createdAt) }}
                        <template v-if="action.comment"> · {{ action.comment }}</template>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="empty-hints q-mt-sm">暂无审核动作</div>
              </q-card-section>
            </q-card>

            <q-card v-if="canReview" flat bordered class="detail-section review-panel">
              <q-card-section>
                <div class="section-title q-mb-md">审核操作</div>
                <div class="review-actions">
                  <q-btn color="positive" icon="check_circle" label="通过" class="review-action-approve" @click="openApproveDialog" />
                  <q-btn outline color="negative" icon="cancel" label="驳回" class="review-action-reject" @click="openRejectDialog" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </template>
    </div>

    <div v-if="isMobile && detail" class="mobile-review-actions">
      <q-btn
        outline
        color="primary"
        icon="save"
        label="保存内部字段"
        class="review-action-save"
        :loading="store.reviewActionLoading"
        @click="saveInternalFields"
      />
      <q-btn
        v-if="canReview"
        color="positive"
        icon="check_circle"
        label="通过"
        class="review-action-approve"
        :loading="store.reviewActionLoading"
        @click="openApproveDialog"
      />
      <q-btn
        v-if="canReview"
        outline
        color="negative"
        icon="cancel"
        label="驳回"
        class="review-action-reject"
        :loading="store.reviewActionLoading"
        @click="openRejectDialog"
      />
    </div>

    <q-dialog v-model="approveDialog">
      <q-card class="review-dialog">
        <q-card-section class="text-h6">确认通过审核</q-card-section>
        <q-card-section>
          <q-input v-model="approveComment" outlined type="textarea" label="审核备注（选填）" autogrow />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" @click="closeApproveDialog" />
          <q-btn color="positive" label="确认通过" :loading="store.reviewActionLoading" @click="submitApprove" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="rejectDialog">
      <q-card class="review-dialog">
        <q-card-section class="text-h6">确认驳回审核</q-card-section>
        <q-card-section>
          <q-input v-model="rejectComment" outlined type="textarea" label="驳回意见 *" autogrow />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" @click="closeRejectDialog" />
          <q-btn color="negative" label="确认驳回" :disable="!canSubmitReject" :loading="store.reviewActionLoading" @click="submitReject" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import ChannelPushReviewAttachmentPanel from 'src/components/channel-push/ChannelPushReviewAttachmentPanel.vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  formatChannelPushDate,
  type ChannelPushReviewDetail,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushReviewDetailPage' });

type ReceiverOption = { label: string; value: number };

const route = useRoute();
const router = useRouter();
const store = useChannelPushStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const detail = ref<ChannelPushReviewDetail | null>(null);
const loading = ref(false);
const error = ref(false);
const approveDialog = ref(false);
const rejectDialog = ref(false);
const approveComment = ref('');
const rejectComment = ref('');
const internalScheduledReceiverId = ref<number | null>(null);
const internalScheduledDate = ref('');
const internalNote = ref('');
const receiverOptions = ref<ReceiverOption[]>([]);

const routeId = computed(() => Number(route.params.id) || null);
const canReview = computed(() => detail.value?.status === 'PENDING' && auth.hasPerm('channelPush:review'));
const canSubmitReject = computed(() => rejectComment.value.trim().length > 0);

watch(detail, (next) => {
  internalScheduledReceiverId.value = next?.internalScheduledReceiverId ?? null;
  internalScheduledDate.value = next?.internalScheduledDate?.slice(0, 10) ?? '';
  internalNote.value = next?.internalNote ?? '';
  if (next?.internalScheduledReceiverId && next.internalScheduledReceiverName) {
    receiverOptions.value = [{
      value: next.internalScheduledReceiverId,
      label: next.internalScheduledReceiverName,
    }];
  }
});

async function load() {
  const id = routeId.value;
  if (!id) {
    await router.replace('/review/channel-push');
    return;
  }
  loading.value = true;
  try {
    detail.value = await store.fetchReviewDetail(id);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function goBack() {
  void router.push('/review/channel-push');
}

async function refreshReviewCaches() {
  await Promise.all([
    store.fetchReviewPending(store.reviewPendingFilters),
    store.fetchReviewHandled(store.reviewHandledFilters),
  ]);
}

async function reloadAfterMutation() {
  await load();
  await refreshReviewCaches();
}

async function saveInternalFields() {
  if (!detail.value) return;
  try {
    detail.value = await store.saveReviewInternalFields(detail.value.id, {
      internalScheduledReceiverId: internalScheduledReceiverId.value,
      internalScheduledDate: internalScheduledDate.value || null,
      internalNote: internalNote.value,
    });
    Notify.create({ type: 'positive', message: '内部字段已保存' });
    await refreshReviewCaches();
  } catch {
    Notify.create({ type: 'negative', message: '内部字段保存失败，请重试。' });
  }
}

function openApproveDialog() {
  approveComment.value = '';
  approveDialog.value = true;
}

function closeApproveDialog() {
  approveDialog.value = false;
  approveComment.value = '';
}

function openRejectDialog() {
  rejectComment.value = '';
  rejectDialog.value = true;
}

function closeRejectDialog() {
  rejectDialog.value = false;
  rejectComment.value = '';
}

async function submitApprove() {
  if (!detail.value) return;
  try {
    await store.approveReview(detail.value.id, { comment: approveComment.value });
    Notify.create({ type: 'positive', message: '推送已通过审核' });
    closeApproveDialog();
    await reloadAfterMutation();
  } catch {
    Notify.create({ type: 'negative', message: '审核操作失败，请重试。' });
  }
}

async function submitReject() {
  if (!detail.value) return;
  const comment = rejectComment.value.trim();
  if (!comment) {
    Notify.create({ type: 'warning', message: '驳回意见不能为空' });
    return;
  }
  try {
    await store.rejectReview(detail.value.id, { comment });
    Notify.create({ type: 'positive', message: '推送已驳回' });
    closeRejectDialog();
    await reloadAfterMutation();
  } catch {
    Notify.create({ type: 'negative', message: '审核操作失败，请重试。' });
  }
}

async function filterReceivers(keyword: string, update: (fn: () => void) => void) {
  try {
    const { data } = await api.get('/users', {
      params: { keyword, page: 1, pageSize: 20, status: 'ACTIVE' },
    });
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    update(() => {
      receiverOptions.value = rows.map((user: any) => ({
        label: user.realName || user.username,
        value: user.id,
      }));
    });
  } catch {
    update(() => {
      receiverOptions.value = [];
    });
  }
}

function actionIcon(type: string) {
  if (type === 'APPROVE') return 'check_circle';
  if (type === 'REJECT') return 'cancel';
  if (type === 'CANCEL') return 'block';
  return 'history';
}

function actionColor(type: string): string {
  if (type === 'APPROVE') return 'positive';
  if (type === 'REJECT') return 'negative';
  if (type === 'CANCEL') return 'grey-7';
  return 'primary';
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.channel-push-review-detail-page {
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
.summary-grid,
.internal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.internal-note {
  grid-column: 1 / -1;
}
.detail-text,
.side-stack {
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
.duplicate-banner {
  background: rgba(25, 118, 210, 0.08);
}
.empty-hints {
  color: var(--oa-text-secondary);
  font-size: 14px;
}
.action-row {
  padding-left: 0;
  padding-right: 0;
}
.review-actions {
  display: grid;
  gap: 8px;
}
.mobile-review-actions {
  position: sticky;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 8px 8px calc(12px + env(safe-area-inset-bottom));
  border: 1px solid var(--oa-border);
  border-radius: 8px;
  background: var(--oa-surface);
}
.has-mobile-review-actions .detail-wrapper {
  padding-bottom: 168px;
}
.review-action-save,
.review-action-approve,
.review-action-reject,
.mobile-review-actions .q-btn {
  min-height: 44px;
}
.review-dialog {
  width: 520px;
  max-width: 100vw;
}
@media (max-width: 1023px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .summary-grid,
  .internal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
