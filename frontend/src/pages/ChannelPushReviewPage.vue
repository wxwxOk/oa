<template>
  <q-page padding class="channel-push-review-page">
    <div class="review-header row items-start q-mb-md q-gutter-sm">
      <div class="col min-width-0">
        <div class="text-h6">待我审核</div>
      </div>
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        class="review-mobile-filter-trigger"
        aria-label="筛选待我审核"
        @click="openFilterSheet"
      >
        <q-tooltip>筛选待我审核</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新待我审核" @click="refreshList">
        <q-tooltip>刷新待我审核</q-tooltip>
      </q-btn>
    </div>

    <q-banner v-if="isReadOnlyViewer" rounded class="read-only-banner q-mb-md">
      只读查看：你拥有 viewScope 可见范围权限，可以查看推送审核列表和详情，审核操作仅对主接收人开放。
    </q-banner>

    <q-tabs v-model="activeView" dense active-color="primary" indicator-color="primary" class="q-mb-md" @update:model-value="onViewChange">
      <q-tab name="pending" label="待我审核" />
      <q-tab name="handled" label="已审核" />
    </q-tabs>

    <div v-if="isDesktop" class="filter-bar row items-center q-gutter-sm q-mb-md">
      <q-input
        v-model="filters.channelPartnerKeyword"
        outlined
        dense
        clearable
        label="渠道商"
        class="keyword-filter"
        @keyup.enter="queryList"
        @clear="queryList"
      />
      <q-select
        v-model="filters.status"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="状态"
        class="filter-control"
        :options="statusOptions"
      />
      <q-input v-model="filters.dateFrom" outlined dense readonly label="开始日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateFrom" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="filters.dateTo" outlined dense readonly label="结束日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateTo" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-btn color="primary" label="查询" @click="queryList" />
      <q-btn flat label="重置筛选" @click="resetFilters" />
    </div>

    <q-card v-if="firstLoading" flat bordered class="state-panel q-pa-md">
      <q-skeleton type="rect" height="40px" class="q-mb-sm" />
      <q-skeleton v-for="i in 6" :key="i" type="rect" height="44px" class="q-mb-xs" />
    </q-card>

    <q-card v-else-if="error" flat bordered class="state-panel text-center q-pa-xl">
      <div class="text-body1">待我审核加载失败，请重试</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="refreshList" />
    </q-card>

    <EmptyState
      v-else-if="rows.length === 0 && !store.reviewLoading"
      icon="fact_check"
      title="暂无待我审核"
      description="当前筛选条件下没有需要处理的推送。"
    />

    <template v-else>
      <q-table
        v-if="isDesktop"
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="store.reviewLoading"
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50]"
        flat
        bordered
        dense
        @request="onRequest"
        @row-click="(_, row) => goDetail(row)"
      >
        <template #body-cell-channelPartnerName="props">
          <q-td :props="props">
            <div class="text-body2 wrap-text">{{ props.row.channelPartnerName }}</div>
          </q-td>
        </template>
        <template #body-cell-student="props">
          <q-td :props="props">
            <div class="text-body2 wrap-text">{{ props.row.studentName }}</div>
            <div class="text-caption muted wrap-text">{{ props.row.studentPhone }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><ChannelPushStatusChip :status="props.row.status" /></q-td>
        </template>
        <template #body-cell-submittedAt="props">
          <q-td :props="props">{{ formatChannelPushDate(props.row.submittedAt) }}</q-td>
        </template>
        <template #body-cell-reviewedAt="props">
          <q-td :props="props">{{ formatChannelPushDate(props.row.reviewedAt) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              icon="visibility"
              label="查看详情"
              class="review-row-action"
              @click.stop="goDetail(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card v-for="row in rows" :key="row.id" flat bordered class="review-card">
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.channelPartnerName }}</div>
                <div class="text-caption muted wrap-text">{{ row.studentName }} · {{ row.studentPhone }}</div>
              </div>
              <ChannelPushStatusChip :status="row.status" />
            </div>
            <div class="summary-grid q-mt-sm">
              <div>提交时间：{{ formatChannelPushDate(row.submittedAt) }}</div>
              <div>审核时间：{{ formatChannelPushDate(row.reviewedAt) }}</div>
              <div>附件数：{{ row.attachmentCount }}</div>
              <div>意向：{{ row.intentStatus || '-' }}</div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="card-actions">
            <q-btn
              flat
              dense
              color="primary"
              icon="visibility"
              label="查看详情"
              class="review-row-action"
              @click="goDetail(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterSheetOpen" position="bottom">
      <q-card class="filter-card">
        <q-card-section class="text-h6">筛选待我审核</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="filterDraft.channelPartnerKeyword" outlined dense clearable label="渠道商" />
          <q-select
            v-model="filterDraft.status"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="状态"
            :options="statusOptions"
          />
          <q-input v-model="filterDraft.dateFrom" outlined dense readonly label="开始日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="filterDraft.dateTo" outlined dense readonly label="结束日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateTo" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="重置筛选" class="review-filter-reset" @click="onFilterReset" />
          <q-btn color="primary" label="应用筛选" class="review-filter-apply" @click="onFilterApply" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  CHANNEL_PUSH_STATUSES,
  channelPushStatusLabel,
  createEmptyChannelPushReviewFilters,
  formatChannelPushDate,
  type ChannelPushReviewRow,
  type ChannelPushReviewViewMode,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushReviewPage' });

const router = useRouter();
const store = useChannelPushStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const activeView = ref<ChannelPushReviewViewMode>('pending');
const filters = reactive({ ...createEmptyChannelPushReviewFilters() });
const filterDraft = reactive({ ...createEmptyChannelPushReviewFilters() });
const filterSheetOpen = ref(false);
const firstLoading = ref(true);
const error = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const statusOptions = computed(() => {
  const statuses = activeView.value === 'pending'
    ? CHANNEL_PUSH_STATUSES.filter((status) => status === 'PENDING')
    : CHANNEL_PUSH_STATUSES.filter((status) => status === 'APPROVED' || status === 'REJECTED');
  return [
    { label: '全部', value: '' },
    ...statuses.map((status) => ({ label: channelPushStatusLabel(status), value: status })),
  ];
});

const rows = computed(() => activeView.value === 'pending' ? store.reviewPendingRows : store.reviewHandledRows);
const isReadOnlyViewer = computed(() => auth.hasPerm('channelPush:viewScope') && !auth.hasPerm('channelPush:review'));

const columns = [
  { name: 'channelPartnerName', label: '渠道商', field: 'channelPartnerName', align: 'left' as const },
  { name: 'student', label: '学员', field: 'studentName', align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const },
  { name: 'submittedAt', label: '提交时间', field: 'submittedAt', align: 'left' as const },
  { name: 'reviewedAt', label: '审核时间', field: 'reviewedAt', align: 'left' as const },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const },
];

async function load(page = pagination.value.page, size = pagination.value.rowsPerPage) {
  try {
    const request = { ...filters, page, size };
    const response = activeView.value === 'pending'
      ? await store.fetchReviewPending(request)
      : await store.fetchReviewHandled(request);
    pagination.value.page = response.page;
    pagination.value.rowsPerPage = response.size;
    pagination.value.rowsNumber = response.total;
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

async function refreshList() {
  firstLoading.value = false;
  await load();
}

function queryList() {
  pagination.value.page = 1;
  void load(1, pagination.value.rowsPerPage);
}

function resetFilters() {
  Object.assign(filters, createEmptyChannelPushReviewFilters());
  queryList();
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  void load(props.pagination.page, props.pagination.rowsPerPage);
}

function onViewChange() {
  Object.assign(filters, createEmptyChannelPushReviewFilters());
  pagination.value.page = 1;
  void load(1, pagination.value.rowsPerPage);
}

function openFilterSheet() {
  Object.assign(filterDraft, filters);
  filterSheetOpen.value = true;
}

function onFilterApply() {
  Object.assign(filters, filterDraft);
  filterSheetOpen.value = false;
  queryList();
}

function onFilterReset() {
  Object.assign(filterDraft, createEmptyChannelPushReviewFilters());
  Object.assign(filters, createEmptyChannelPushReviewFilters());
  filterSheetOpen.value = false;
  queryList();
}

function goDetail(row: ChannelPushReviewRow) {
  void router.push(`/review/channel-push/${row.id}`);
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.channel-push-review-page { background: var(--oa-bg); }
.review-card { border-radius: 8px; background: var(--oa-surface); }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: var(--oa-text-secondary); }
.filter-control { width: 160px; }
.date-filter { width: 200px; }
.keyword-filter { width: 200px; }
.filter-card { width: 100%; max-width: 520px; border-radius: 16px 16px 0 0; }
.review-mobile-filter-trigger,
.review-filter-reset,
.review-filter-apply,
.review-row-action { min-height: 44px; }
.min-width-0 { min-width: 0; }
.wrap-text { overflow-wrap: anywhere; }
.muted { color: var(--oa-text-secondary); }
.state-panel { background: var(--oa-surface); }
.read-only-banner {
  background: rgba(25, 118, 210, 0.08);
  color: var(--oa-text-primary);
}
</style>
