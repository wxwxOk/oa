<template>
  <q-page padding class="channel-push-detail-page">
    <div class="detail-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">推送详情</div>
          <div v-if="detail" class="text-caption muted wrap-text">
            {{ detail.studentName }} · {{ detail.studentPhone }}
          </div>
        </div>
        <ChannelPushStatusChip v-if="detail" :status="detail.status" />
        <q-space v-if="isDesktop" />
        <q-btn
          v-if="isDesktop && canMutate"
          outline
          color="primary"
          icon="edit"
          label="编辑"
          @click="goEdit"
        />
        <q-btn
          v-if="isDesktop && canMutate"
          color="negative"
          icon="cancel"
          label="撤回"
          :loading="store.actionLoading"
          @click="confirmCancel"
        />
      </div>

      <div v-if="isMobile && canMutate" class="mobile-actions q-mb-md">
        <q-btn outline color="primary" icon="edit" label="编辑" @click="goEdit" />
        <q-btn color="negative" icon="cancel" label="撤回" :loading="store.actionLoading" @click="confirmCancel" />
      </div>

      <q-banner v-if="terminalBanner" class="terminal-banner q-mb-md" :class="bannerClass">
        <template #avatar>
          <q-icon :name="bannerIcon" :color="bannerColor" />
        </template>
        {{ terminalBanner }}
      </q-banner>

      <div v-if="loading" class="detail-grid">
        <q-card flat bordered class="detail-section">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton v-for="i in 6" :key="i" type="text" width="82%" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>

      <q-card v-else-if="error" flat bordered class="detail-section text-center q-pa-xl">
        <div class="text-body1">推送详情加载失败，请返回列表或重试</div>
        <div class="row justify-center q-gutter-sm q-mt-md">
          <q-btn flat label="返回列表" @click="goBack" />
          <q-btn color="primary" label="重新加载" @click="load" />
        </div>
      </q-card>

      <template v-else-if="detail">
        <div class="detail-grid">
          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title">学员信息</div>
              <div class="info-grid q-mt-sm">
                <div><span class="muted">姓名：</span>{{ detail.studentName }}</div>
                <div><span class="muted">手机号：</span>{{ detail.studentPhone }}</div>
                <div><span class="muted">年龄：</span>{{ detail.studentAge ?? '-' }}</div>
                <div><span class="muted">性别：</span>{{ detail.studentGender || '-' }}</div>
                <div><span class="muted">学历：</span>{{ detail.studentEducation || '-' }}</div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="detail-section">
            <q-card-section>
              <div class="section-title">意向信息</div>
              <div class="info-stack q-mt-sm">
                <div><span class="muted">意向状态：</span>{{ detail.intentStatus || '-' }}</div>
                <div class="wrap-text"><span class="muted">意向说明：</span>{{ detail.intentNote || '-' }}</div>
                <div class="wrap-text"><span class="muted">备注：</span>{{ detail.remark || '-' }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="q-mt-md">
          <ChannelPushAttachmentPanel
            :push-id="detail.id"
            :attachments="detail.attachments"
            :editable="canMutate"
            @uploaded="reload"
            @deleted="reload"
          />
        </div>

        <q-card flat bordered class="detail-section q-mt-md">
          <q-card-section>
            <div class="section-title">处理状态</div>
            <div class="info-grid q-mt-sm">
              <div>
                <span class="muted">当前状态：</span>
                <ChannelPushStatusChip :status="detail.status" />
              </div>
              <div><span class="muted">提交时间：</span>{{ formatChannelPushDate(detail.submittedAt) }}</div>
              <div><span class="muted">审核时间：</span>{{ formatChannelPushDate(detail.reviewedAt) }}</div>
              <div><span class="muted">最近更新：</span>{{ formatChannelPushDate(detail.updatedAt) }}</div>
            </div>
            <div class="q-mt-sm wrap-text">
              <span class="muted">驳回原因：</span>{{ lastRejection?.comment || '-' }}
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="detail-section q-mt-md">
          <q-card-section>
            <div class="section-title">审核轨迹</div>
            <q-list v-if="detail.reviewActions.length > 0" separator class="q-mt-sm">
              <q-item v-for="action in detail.reviewActions" :key="action.id" class="action-row">
                <q-item-section avatar>
                  <q-icon :name="actionIcon(action)" :color="actionColor(action)" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="row items-center q-gutter-sm">
                    <span>{{ action.actorName || '系统' }}</span>
                    <q-badge :color="actionColor(action)">{{ action.type }}</q-badge>
                  </q-item-label>
                  <q-item-label caption class="wrap-text">
                    {{ formatChannelPushDate(action.createdAt) }}
                    <template v-if="action.comment"> · {{ action.comment }}</template>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="empty-actions q-mt-sm">暂无审核动作</div>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Dialog, Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ChannelPushAttachmentPanel from 'src/components/channel-push/ChannelPushAttachmentPanel.vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  formatChannelPushDate,
  type ChannelPushDetail,
  type ChannelPushReviewAction,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushDetailPage' });

const route = useRoute();
const router = useRouter();
const store = useChannelPushStore();
const { isDesktop, isMobile } = useResponsive();

const detail = ref<ChannelPushDetail | null>(null);
const loading = ref(false);
const error = ref(false);

const routeId = computed(() => Number(route.params.id) || null);
const canMutate = computed(() => detail.value?.status === 'PENDING');

const terminalBanner = computed(() => {
  const status = detail.value?.status;
  if (!status || status === 'PENDING') return null;
  if (status === 'APPROVED') return '该推送已通过，不能再编辑或撤回。';
  if (status === 'REJECTED') return '该推送已驳回，不能再编辑或撤回。如需重新提交，请新建推送。';
  return '该推送已撤回，不会进入审核。';
});

const bannerColor = computed(() => {
  const status = detail.value?.status;
  if (status === 'APPROVED') return 'positive';
  if (status === 'REJECTED') return 'negative';
  return 'grey-7';
});

const bannerIcon = computed(() => {
  const status = detail.value?.status;
  if (status === 'APPROVED') return 'check_circle';
  if (status === 'REJECTED') return 'cancel';
  return 'block';
});

const bannerClass = computed(() => {
  const status = detail.value?.status;
  if (status === 'APPROVED') return 'banner-approved';
  if (status === 'REJECTED') return 'banner-rejected';
  return 'banner-cancelled';
});

const lastRejection = computed<ChannelPushReviewAction | null>(() => {
  if (detail.value?.status !== 'REJECTED') return null;
  const actions = (detail.value?.reviewActions ?? []).slice().reverse();
  return actions.find((a) => a.type === 'REJECT' || a.type === 'REJECTED') ?? null;
});

function actionIcon(action: ChannelPushReviewAction) {
  if (action.type === 'APPROVE' || action.type === 'APPROVED') return 'check_circle';
  if (action.type === 'REJECT' || action.type === 'REJECTED') return 'cancel';
  if (action.type === 'CANCEL' || action.type === 'CANCELLED') return 'block';
  return 'history';
}

function actionColor(action: ChannelPushReviewAction): string {
  if (action.type === 'APPROVE' || action.type === 'APPROVED') return 'positive';
  if (action.type === 'REJECT' || action.type === 'REJECTED') return 'negative';
  if (action.type === 'CANCEL' || action.type === 'CANCELLED') return 'grey-7';
  return 'primary';
}

async function load() {
  const id = routeId.value;
  if (!id) {
    await router.replace('/channel-push');
    return;
  }
  loading.value = true;
  try {
    detail.value = await store.fetchDetail(id);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function reload() {
  const id = routeId.value;
  if (!id) return;
  try {
    detail.value = await store.fetchDetail(id);
  } catch {
    Notify.create({ type: 'negative', message: '推送详情刷新失败，请重试。' });
  }
}

function goBack() {
  void router.push('/channel-push');
}

function goEdit() {
  if (!detail.value) return;
  void router.push(`/channel-push/${detail.value.id}/edit`);
}

function confirmCancel() {
  if (!detail.value) return;
  Dialog.create({
    title: '确认撤回推送',
    message: '撤回后此推送不会进入审核，确定撤回？',
    persistent: true,
    ok: { label: '撤回', color: 'negative' },
    cancel: { label: '取消', flat: true },
  }).onOk(async () => {
    try {
      await store.cancel(detail.value!.id);
      Notify.create({ type: 'positive', message: '已撤回该推送' });
      await reload();
    } catch {
      // axios interceptor surfaces error
    }
  });
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.channel-push-detail-page { background: var(--oa-bg); }
.detail-wrapper { max-width: 960px; width: 100%; margin: 0 auto; }
.detail-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 768px) {
  .detail-grid { grid-template-columns: 1fr 1fr; }
}
.detail-section { border-radius: 8px; background: var(--oa-surface); }
.section-title { font-size: 16px; font-weight: 600; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
.info-stack { display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.muted { color: var(--oa-text-secondary); }
.wrap-text { overflow-wrap: anywhere; }
.min-width-0 { min-width: 0; }
.empty-actions { color: var(--oa-text-secondary); font-size: 14px; }
.action-row { padding-left: 0; padding-right: 0; }
.terminal-banner { border-radius: 8px; }
.banner-approved { background: rgba(33, 186, 69, 0.08); }
.banner-rejected { background: rgba(193, 0, 21, 0.08); }
.banner-cancelled { background: rgba(0, 0, 0, 0.04); }
.mobile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mobile-actions .q-btn { min-height: 44px; }
</style>
