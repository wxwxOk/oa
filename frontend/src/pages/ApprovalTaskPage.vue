<template>
  <q-page padding class="approval-task-page">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">待我审批</div>
      <q-space />
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        class="mobile-filter-trigger"
        aria-label="筛选任务"
        @click="openFilterSheet"
      >
        <q-tooltip>筛选任务</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新任务列表" @click="load">
        <q-tooltip>刷新任务列表</q-tooltip>
      </q-btn>
    </div>

    <q-btn-toggle
      v-model="store.view"
      toggle-color="primary"
      flat
      bordered
      spread
      class="task-mode-switch q-mb-md"
      :options="viewOptions"
      @update:model-value="switchView"
    />

    <div v-if="isDesktop" class="task-filter row items-center q-gutter-sm q-mb-md">
      <q-select
        v-model="store.filters.templateId"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="申请类型"
        class="filter-control"
        :options="store.filterOptions.templates"
        @update:model-value="applyFilters"
      />
      <q-input
        v-model="store.filters.applicantName"
        outlined
        dense
        clearable
        label="申请人"
        class="filter-control"
        @keyup.enter="applyFilters"
        @clear="applyFilters"
      />
      <q-select
        v-model="store.filters.departmentId"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="部门"
        class="filter-control"
        :options="store.filterOptions.departments"
        @update:model-value="applyFilters"
      />
      <q-select
        v-if="store.view === 'handled'"
        v-model="store.filters.status"
        outlined
        dense
        emit-value
        map-options
        label="任务状态"
        class="status-filter"
        :options="handledStatusOptions"
        @update:model-value="applyFilters"
      />
      <q-input v-model="store.filters.dateFrom" outlined dense readonly :label="dateFromLabel" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
            <q-tooltip>选择开始日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="store.filters.dateFrom" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="store.filters.dateTo" outlined dense readonly :label="dateToLabel" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
            <q-tooltip>选择结束日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="store.filters.dateTo" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-btn flat label="重置筛选" class="task-filter-reset" @click="resetFilters" />
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="task-card q-mb-sm">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="80%" class="q-mt-xs" />
            <q-skeleton type="text" width="52%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <q-card v-else-if="error" flat bordered class="text-center q-pa-xl">
      <div class="text-body1">审批任务加载失败，请检查网络后重试。</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
    </q-card>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      :icon="emptyState.icon"
      :title="emptyState.title"
      :description="emptyState.description"
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
        <template #body-cell-templateName="props">
          <q-td :props="props">
            <div class="text-body2">{{ props.row.templateName }}</div>
            <div class="text-caption muted">v{{ props.row.templateVersion }}</div>
          </q-td>
        </template>
        <template #body-cell-applicant="props">
          <q-td :props="props">
            <div>{{ props.row.applicantName }}</div>
            <div class="text-caption muted">{{ props.row.applicantDepartmentName || '未设置部门' }}</div>
          </q-td>
        </template>
        <template #body-cell-taskStatus="props">
          <q-td :props="props">
            <ApprovalTaskStatusChip :status="props.row.taskStatus" />
          </q-td>
        </template>
        <template #body-cell-applicationStatus="props">
          <q-td :props="props">
            <ApplicationStatusChip :status="props.row.applicationStatus" />
          </q-td>
        </template>
        <template #body-cell-time="props">
          <q-td :props="props">{{ formatDate(rowTime(props.row)) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              icon="visibility"
              :label="store.view === 'pending' ? '处理审批' : '查看详情'"
              :aria-label="`${store.view === 'pending' ? '处理审批' : '查看详情'} ${props.row.applicationNo}`"
              @click="openTask(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card
          v-for="row in store.rows"
          :key="row.id"
          flat
          bordered
          class="task-card cursor-pointer"
          @click="openTask(row.id)"
        >
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.templateName }}</div>
                <div class="text-caption muted">申请编号：{{ row.applicationNo }}</div>
              </div>
              <ApprovalTaskStatusChip :status="row.taskStatus" />
            </div>
            <div class="text-caption muted q-mt-sm">申请人：{{ row.applicantName }} / {{ row.applicantDepartmentName || '未设置部门' }}</div>
            <div class="text-caption muted">当前节点：{{ row.nodeName || '—' }}</div>
            <div class="text-caption muted">{{ store.view === 'pending' ? '分配时间' : '处理时间' }}：{{ formatDate(rowTime(row)) }}</div>
            <div class="text-caption muted">申请状态：{{ applicationStatusText(row.applicationStatus) }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              dense
              color="primary"
              icon="visibility"
              class="task-card-action"
              :label="store.view === 'pending' ? '处理审批' : '查看详情'"
              :aria-label="`${store.view === 'pending' ? '处理审批' : '查看详情'} ${row.applicationNo}`"
              @click.stop="openTask(row.id)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterDialog" position="bottom">
      <q-card class="filter-sheet">
        <div class="flex flex-center q-pt-sm q-pb-xs">
          <div class="sheet-handle"></div>
        </div>
        <q-card-section class="text-h6">筛选任务</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="filterDraft.templateId"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="申请类型"
            :options="store.filterOptions.templates"
          />
          <q-input v-model="filterDraft.applicantName" outlined dense clearable label="申请人" />
          <q-select
            v-model="filterDraft.departmentId"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="部门"
            :options="store.filterOptions.departments"
          />
          <q-select
            v-if="store.view === 'handled'"
            v-model="filterDraft.status"
            outlined
            dense
            emit-value
            map-options
            label="任务状态"
            :options="handledStatusOptions"
          />
          <q-input v-model="filterDraft.dateFrom" outlined dense readonly :label="dateFromLabel">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-tooltip>选择开始日期</q-tooltip>
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="filterDraft.dateTo" outlined dense readonly :label="dateToLabel">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-tooltip>选择结束日期</q-tooltip>
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateTo" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="重置筛选" class="task-filter-reset" @click="resetDraftFilters" />
          <q-btn color="primary" label="应用筛选" class="task-filter-apply" @click="applyMobileFilters" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ApplicationStatusChip from 'src/components/approval/ApplicationStatusChip.vue';
import ApprovalTaskStatusChip from 'src/components/approval/ApprovalTaskStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useApprovalTaskStore } from 'src/stores/approvalTask';
import { statusLabel, type ApprovalApplicationStatus } from 'src/types/approvalApplication';
import type { ApprovalTaskListFilters, ApprovalTaskRow } from 'src/types/approvalTask';

const router = useRouter();
const store = useApprovalTaskStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const filterDialog = ref(false);
const filterDraft = reactive<ApprovalTaskListFilters>({});

const viewOptions = [
  { label: '待办', value: 'pending' },
  { label: '已处理', value: 'handled' },
];

const handledStatusOptions = [
  { label: '全部', value: '' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已关闭', value: 'CANCELED' },
];

const columns = computed(() => [
  { name: 'applicationNo', label: '申请编号', field: 'applicationNo', align: 'left' as const, style: 'width:140px' },
  { name: 'templateName', label: '申请类型', field: 'templateName', align: 'left' as const },
  { name: 'applicant', label: '申请人/部门', field: 'applicantName', align: 'left' as const, style: 'width:180px' },
  { name: 'nodeName', label: '当前节点', field: 'nodeName', align: 'left' as const, style: 'width:140px' },
  { name: 'taskStatus', label: '任务状态', field: 'taskStatus', align: 'center' as const, style: 'width:96px' },
  { name: 'applicationStatus', label: '申请状态', field: 'applicationStatus', align: 'center' as const, style: 'width:96px' },
  { name: 'time', label: store.view === 'pending' ? '分配时间' : '处理时间', field: 'assignedAt', align: 'left' as const, style: 'width:160px' },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:120px' },
]);

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

const dateFromLabel = computed(() => (store.view === 'pending' ? '分配开始日期' : '处理开始日期'));
const dateToLabel = computed(() => (store.view === 'pending' ? '分配结束日期' : '处理结束日期'));
const emptyState = computed(() =>
  store.view === 'pending'
    ? {
        icon: 'fact_check',
        title: '暂无待办审批',
        description: '当前没有待你处理的审批任务，可切换到已处理查看历史记录。',
      }
    : {
        icon: 'history',
        title: '暂无已处理记录',
        description: '你处理过的审批任务会显示在这里，便于回看审批结果和意见。',
      },
);

async function load() {
  try {
    await Promise.all([store.fetchMeta(), store.fetchList()]);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

function switchView() {
  store.page = 1;
  store.filters.status = '';
  load();
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  store.page = props.pagination.page;
  store.size = props.pagination.rowsPerPage;
  load();
}

function applyFilters() {
  store.page = 1;
  load();
}

function resetFilters() {
  store.filters.templateId = null;
  store.filters.applicantName = '';
  store.filters.departmentId = null;
  store.filters.status = '';
  store.filters.dateFrom = '';
  store.filters.dateTo = '';
  applyFilters();
}

function openFilterSheet() {
  Object.assign(filterDraft, store.filters);
  filterDialog.value = true;
}

function resetDraftFilters() {
  Object.assign(filterDraft, {
    templateId: null,
    applicantName: '',
    departmentId: null,
    status: '',
    dateFrom: '',
    dateTo: '',
  });
}

function applyMobileFilters() {
  Object.assign(store.filters, filterDraft);
  filterDialog.value = false;
  applyFilters();
}

function rowTime(row: ApprovalTaskRow) {
  return store.view === 'pending' ? row.assignedAt : row.handledAt;
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

function applicationStatusText(status: ApprovalApplicationStatus) {
  return statusLabel(status);
}

function openTask(id: number) {
  router.push(`/approval/tasks/${id}`);
}

onMounted(() => load());
</script>

<style scoped>
.approval-task-page {
  background: var(--oa-bg);
}

.task-mode-switch {
  max-width: 360px;
}

.task-filter {
  align-items: stretch;
}

.filter-control {
  min-width: 160px;
}

.status-filter,
.date-filter {
  width: 160px;
}

.muted {
  color: var(--oa-text-secondary);
}

.task-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.filter-sheet {
  width: 100%;
  border-radius: 16px 16px 0 0;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--oa-border);
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 1023px) {
  .task-mode-switch {
    max-width: none;
  }

  .mobile-filter-trigger,
  .task-filter-reset,
  .task-filter-apply,
  .task-card-action,
  .filter-sheet .q-field,
  .filter-sheet .q-btn {
    min-height: 44px;
  }
}
</style>
