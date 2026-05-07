<template>
  <q-page padding class="channel-push-page">
    <div class="channel-push-header row items-start q-mb-md q-gutter-sm">
      <div class="col min-width-0">
        <div class="text-h6">我的推送</div>
        <div class="text-body2 muted wrap-text">提交学员信息并跟踪处理状态</div>
      </div>
      <q-btn v-if="isMobile" flat dense round icon="filter_list" aria-label="筛选推送" @click="openFilterSheet">
        <q-tooltip>筛选推送</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新推送列表" @click="refreshList">
        <q-tooltip>刷新推送列表</q-tooltip>
      </q-btn>
      <q-btn
        v-if="auth.hasPerm('channelPush:create')"
        outline
        color="primary"
        icon="upload_file"
        :label="isMobile ? '' : 'Excel 批量导入'"
        :round="isMobile"
        :aria-label="isMobile ? 'Excel 批量导入' : undefined"
        :style="isMobile ? 'min-width:44px;min-height:44px' : ''"
        @click="importDialogOpen = true"
      >
        <q-tooltip v-if="isMobile">Excel 批量导入</q-tooltip>
      </q-btn>
      <q-btn
        v-if="auth.hasPerm('channelPush:create')"
        color="primary"
        icon="add"
        :label="isMobile ? '' : '新建推送'"
        :round="isMobile"
        :aria-label="isMobile ? '新建推送' : undefined"
        :style="isMobile ? 'min-width:44px;min-height:44px' : ''"
        @click="goCreate"
      >
        <q-tooltip v-if="isMobile">新建推送</q-tooltip>
      </q-btn>
    </div>

    <div v-if="isDesktop" class="filter-bar row items-center q-gutter-sm q-mb-md">
      <q-input
        v-model="filters.keyword"
        outlined
        dense
        clearable
        label="关键词"
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
      <div class="text-body1">推送列表加载失败，请重试</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="refreshList" />
    </q-card>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="forward_to_inbox"
      title="暂无推送"
      description="还没有推送过学员，点击「新建推送」开始提交。"
      :cta-text="auth.hasPerm('channelPush:create') ? '新建推送' : undefined"
      @action="goCreate"
    />

    <template v-else>
      <q-table
        v-if="isDesktop"
        :rows="store.rows"
        :columns="columns"
        row-key="id"
        :loading="store.loading"
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50]"
        flat
        bordered
        dense
        @request="onRequest"
      >
        <template #body-cell-status="props">
          <q-td :props="props"><ChannelPushStatusChip :status="props.row.status" /></q-td>
        </template>
        <template #body-cell-submittedAt="props">
          <q-td :props="props">{{ formatChannelPushDate(props.row.submittedAt) }}</q-td>
        </template>
        <template #body-cell-attachmentCount="props">
          <q-td :props="props">{{ props.row.attachmentCount }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap justify-center q-gutter-xs">
              <q-btn flat dense size="sm" color="primary" icon="visibility" label="查看" @click="goDetail(props.row)" />
              <q-btn
                v-if="canMutate(props.row)"
                flat
                dense
                size="sm"
                color="primary"
                icon="edit"
                label="编辑"
                @click="goEdit(props.row)"
              />
              <q-btn
                v-if="canMutate(props.row)"
                flat
                dense
                size="sm"
                color="negative"
                icon="cancel"
                label="撤回"
                :loading="store.actionLoading"
                @click="confirmCancel(props.row)"
              />
            </div>
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card v-for="row in store.rows" :key="row.id" flat bordered class="channel-push-card">
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.studentName }}</div>
                <div class="text-caption muted wrap-text">{{ row.studentPhone }}</div>
              </div>
              <ChannelPushStatusChip :status="row.status" />
            </div>
            <div class="summary-grid q-mt-sm">
              <div>意向：{{ row.intentStatus || '-' }}</div>
              <div>提交时间：{{ formatChannelPushDate(row.submittedAt) }}</div>
              <div>附件数：{{ row.attachmentCount }}</div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="card-actions">
            <q-btn flat dense color="primary" icon="visibility" label="查看" @click="goDetail(row)" />
            <q-btn v-if="canMutate(row)" flat dense color="primary" icon="edit" label="编辑" @click="goEdit(row)" />
            <q-btn
              v-if="canMutate(row)"
              flat
              dense
              color="negative"
              icon="cancel"
              label="撤回"
              :loading="store.actionLoading"
              @click="confirmCancel(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterSheetOpen" position="bottom">
      <q-card class="filter-card">
        <q-card-section class="text-h6">筛选推送</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="filterDraft.keyword" outlined dense clearable label="关键词" />
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
          <q-btn flat label="重置筛选" @click="onFilterReset" />
          <q-btn color="primary" label="应用筛选" @click="onFilterApply" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-page-sticky v-if="isMobile && auth.hasPerm('channelPush:create')" position="bottom-right" :offset="[16, 72]">
      <q-btn fab icon="add" color="primary" aria-label="新建推送" @click="goCreate" />
    </q-page-sticky>

    <ChannelPushImportDialog
      v-model="importDialogOpen"
      @duplicates="handleDuplicates"
    />
    <ChannelPushDuplicateDialog
      v-model="dupDialogOpen"
      :hints="pendingDuplicates"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Dialog, Notify } from 'quasar';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import ChannelPushImportDialog from 'src/components/channel-push/ChannelPushImportDialog.vue';
import ChannelPushDuplicateDialog from 'src/components/channel-push/ChannelPushDuplicateDialog.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  CHANNEL_PUSH_STATUSES,
  channelPushStatusLabel,
  createEmptyChannelPushFilters,
  formatChannelPushDate,
  type ChannelPushDuplicateHint,
  type ChannelPushRow,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushPage' });

const router = useRouter();
const auth = useAuthStore();
const store = useChannelPushStore();
const { isDesktop, isMobile } = useResponsive();

const filters = reactive({ ...createEmptyChannelPushFilters() });
const filterDraft = reactive({ ...createEmptyChannelPushFilters() });
const filterSheetOpen = ref(false);
const firstLoading = ref(true);
const error = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

// Phase 34: Excel batch import dialog + cross-record duplicates dialog state.
const importDialogOpen = ref(false);
const dupDialogOpen = ref(false);
const pendingDuplicates = ref<ChannelPushDuplicateHint[]>([]);

function handleDuplicates(hints: ChannelPushDuplicateHint[]) {
  pendingDuplicates.value = hints;
  dupDialogOpen.value = true;
}

const columns = [
  { name: 'studentName', label: '学员姓名', field: 'studentName', align: 'left' as const },
  { name: 'studentPhone', label: '手机号', field: 'studentPhone', align: 'left' as const },
  { name: 'intentStatus', label: '意向', field: 'intentStatus', align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const },
  { name: 'submittedAt', label: '提交时间', field: 'submittedAt', align: 'left' as const },
  { name: 'attachmentCount', label: '附件', field: 'attachmentCount', align: 'right' as const },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const },
];

const statusOptions = computed(() => [
  { label: '全部', value: '' },
  ...CHANNEL_PUSH_STATUSES.map((status) => ({ label: channelPushStatusLabel(status), value: status })),
]);

function canMutate(row: ChannelPushRow) {
  return row.status === 'PENDING';
}

async function load(page = pagination.value.page, size = pagination.value.rowsPerPage) {
  try {
    const response = await store.fetchMine({ ...filters, page, size });
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
  Object.assign(filters, createEmptyChannelPushFilters());
  queryList();
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  void load(props.pagination.page, props.pagination.rowsPerPage);
}

function goCreate() {
  void router.push('/channel-push/new');
}

function goDetail(row: ChannelPushRow) {
  void router.push(`/channel-push/${row.id}`);
}

function goEdit(row: ChannelPushRow) {
  void router.push(`/channel-push/${row.id}/edit`);
}

function confirmCancel(row: ChannelPushRow) {
  Dialog.create({
    title: '确认撤回推送',
    message: '撤回后此推送不会进入审核，确定撤回？',
    persistent: true,
    ok: { label: '撤回', color: 'negative' },
    cancel: { label: '取消', flat: true },
  }).onOk(async () => {
    try {
      await store.cancel(row.id);
      Notify.create({ type: 'positive', message: '已撤回该推送' });
      await refreshList();
    } catch {
      // axios interceptor surfaces the error
    }
  });
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
  Object.assign(filterDraft, createEmptyChannelPushFilters());
  Object.assign(filters, createEmptyChannelPushFilters());
  filterSheetOpen.value = false;
  queryList();
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.channel-push-page { background: var(--oa-bg); }
.channel-push-card { border-radius: 8px; background: var(--oa-surface); }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: var(--oa-text-secondary); }
.filter-control { width: 160px; }
.date-filter { width: 200px; }
.keyword-filter { width: 200px; }
.filter-card { width: 100%; max-width: 520px; border-radius: 16px 16px 0 0; }
.min-width-0 { min-width: 0; }
.wrap-text { overflow-wrap: anywhere; }
.muted { color: var(--oa-text-secondary); }
.state-panel { background: var(--oa-surface); }
</style>
