<template>
  <q-page padding class="approval-archive-page">
    <div class="archive-header row items-start q-mb-md q-gutter-sm">
      <div class="col min-width-0">
        <div class="text-h6">归档查询</div>
        <div class="text-body2 muted wrap-text">查询审批申请和公开收集记录的后续处理状态</div>
      </div>
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        class="mobile-filter-trigger"
        aria-label="筛选归档"
        @click="openFilterSheet"
      >
        <q-tooltip>筛选归档</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新归档列表" @click="refreshArchive">
        <q-tooltip>刷新归档列表</q-tooltip>
      </q-btn>
      <q-btn
        v-perm="'approval:export'"
        color="primary"
        icon="download"
        label="导出 Excel"
        class="archive-export"
        :loading="store.exportLoading"
        :disable="store.exportLoading"
        @click="exportArchive"
      />
    </div>

    <div v-if="isDesktop" class="archive-filter row items-center q-gutter-sm q-mb-md">
      <q-btn-toggle
        v-model="filters.sourceType"
        toggle-color="primary"
        flat
        bordered
        label="来源"
        class="source-toggle"
        :options="sourceOptions"
        @update:model-value="applyFilters"
      />
      <q-select
        v-model="filters.status"
        outlined
        dense
        emit-value
        map-options
        label="状态"
        class="filter-control"
        :options="statusOptions"
        @update:model-value="applyFilters"
      />
      <q-select
        v-model="filters.templateId"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="模板"
        class="filter-control"
        :options="store.filterOptions.templates"
        @update:model-value="applyFilters"
      />
      <q-select
        v-model="filters.departmentId"
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
      <q-input
        v-model="filters.personName"
        outlined
        dense
        clearable
        label="申请人/填写者"
        class="person-filter"
        @keyup.enter="applyFilters"
        @clear="applyFilters"
      />
      <q-input v-model="filters.dateFrom" outlined dense readonly label="开始日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
            <q-tooltip>选择开始日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateFrom" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="filters.dateTo" outlined dense readonly label="结束日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
            <q-tooltip>选择结束日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateTo" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-select
        v-model="filters.tags"
        outlined
        dense
        clearable
        multiple
        use-chips
        label="标签/标记"
        class="tag-filter"
        :options="tagOptions"
        @update:model-value="applyFilters"
      />
      <q-btn color="primary" label="查询归档" class="archive-query" @click="queryArchive" />
      <q-btn flat label="重置筛选" class="archive-filter-reset" @click="resetFilters" />
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 6" :key="i" type="rect" height="44px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="archive-card q-mb-sm">
          <q-card-section>
            <q-skeleton type="text" width="65%" />
            <q-skeleton type="text" width="82%" class="q-mt-xs" />
            <q-skeleton type="text" width="50%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <q-card v-else-if="error" flat bordered class="state-panel text-center q-pa-xl">
      <div class="text-body1">归档数据加载失败，请检查网络后重试。</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="loadArchive" />
    </q-card>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="inventory_2"
      title="暂无归档记录"
      description="当前筛选条件下没有可查看的记录，请调整筛选条件或确认你有相应权限。"
    />

    <template v-else>
      <q-table
        v-if="isDesktop"
        :rows="store.rows"
        :columns="columns"
        row-key="archiveKey"
        :loading="store.loading"
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50]"
        flat
        bordered
        dense
        @request="onRequest"
      >
        <template #body-cell-sourceType="props">
          <q-td :props="props">
            <q-chip dense square :color="sourceColor(props.row.sourceType)" text-color="white">
              {{ sourceTypeLabel(props.row.sourceType) }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-templateName="props">
          <q-td :props="props">
            <div class="text-body2 wrap-text">{{ props.row.templateName }}</div>
            <div class="text-caption muted">v{{ props.row.templateVersion }}</div>
          </q-td>
        </template>
        <template #body-cell-person="props">
          <q-td :props="props">
            <div class="wrap-text">{{ props.row.personName }}</div>
            <div class="text-caption muted wrap-text">{{ props.row.personPhone || '—' }}</div>
          </q-td>
        </template>
        <template #body-cell-department="props">
          <q-td :props="props">
            <span class="wrap-text">{{ props.row.departmentName || '未设置部门' }}</span>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-chip dense square :color="archiveStatusColor(props.row.status)" text-color="white">
              {{ archiveStatusLabel(props.row.status) }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-tags="props">
          <q-td :props="props">
            <div class="tag-list">
              <q-chip v-for="tag in visibleTags(props.row.tags)" :key="tag" dense outline>
                {{ tag }}
              </q-chip>
              <span v-if="props.row.tags.length > 3" class="text-caption muted">+{{ props.row.tags.length - 3 }}</span>
              <span v-if="props.row.tags.length === 0" class="muted">—</span>
            </div>
          </q-td>
        </template>
        <template #body-cell-processingSummary="props">
          <q-td :props="props">
            <span class="wrap-text">{{ props.row.processingSummary || '—' }}</span>
          </q-td>
        </template>
        <template #body-cell-updatedAt="props">
          <q-td :props="props">{{ formatDate(props.row.updatedAt) }}</q-td>
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
              :aria-label="`查看详情 ${props.row.archiveNo}`"
              @click="openDetail(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card
          v-for="row in store.rows"
          :key="row.archiveKey"
          flat
          bordered
          class="archive-card cursor-pointer"
          @click="openDetail(row)"
        >
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.templateName }}</div>
                <div class="text-caption muted wrap-text">编号：{{ row.archiveNo }}</div>
              </div>
              <div class="row q-gutter-xs no-wrap">
                <q-chip dense square :color="sourceColor(row.sourceType)" text-color="white">
                  {{ sourceTypeLabel(row.sourceType) }}
                </q-chip>
                <q-chip dense square :color="archiveStatusColor(row.status)" text-color="white">
                  {{ archiveStatusLabel(row.status) }}
                </q-chip>
              </div>
            </div>
            <div class="text-caption muted q-mt-sm wrap-text">
              申请人/填写者：{{ row.personName }} / {{ row.departmentName || '未设置部门' }}
            </div>
            <div class="mobile-tags q-mt-sm">
              <q-chip v-for="tag in visibleTags(row.tags)" :key="tag" dense outline>
                {{ tag }}
              </q-chip>
              <span v-if="row.tags.length > 3" class="text-caption muted">+{{ row.tags.length - 3 }}</span>
              <span v-if="row.tags.length === 0" class="text-caption muted">标签/标记：—</span>
            </div>
            <div class="text-caption muted q-mt-xs wrap-text">处理信息：{{ row.processingSummary || '—' }}</div>
            <div class="text-caption muted">更新时间：{{ formatDate(row.updatedAt) }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              dense
              color="primary"
              icon="visibility"
              label="查看详情"
              class="archive-card-action"
              :aria-label="`查看详情 ${row.archiveNo}`"
              @click.stop="openDetail(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <ArchiveStatsPanel
      v-perm="'approval:archive:stats'"
      aria-label="归档统计 按模板统计 按状态统计 按部门统计 按月份统计"
      :stats="store.stats"
      :loading="store.statsLoading"
      :error="statsError"
      empty-copy="暂无统计数据"
      @reload="loadStats"
    />

    <q-dialog v-model="filterDialog" position="bottom">
      <q-card class="filter-sheet">
        <div class="flex flex-center q-pt-sm q-pb-xs">
          <div class="sheet-handle"></div>
        </div>
        <q-card-section class="text-h6">筛选归档</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-btn-toggle
            v-model="filterDraft.sourceType"
            toggle-color="primary"
            flat
            bordered
            spread
            :options="sourceOptions"
          />
          <q-select v-model="filterDraft.status" outlined dense emit-value map-options label="状态" :options="statusOptions" />
          <q-select
            v-model="filterDraft.templateId"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="模板"
            :options="store.filterOptions.templates"
          />
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
          <q-input v-model="filterDraft.personName" outlined dense clearable label="申请人/填写者" />
          <q-input v-model="filterDraft.dateFrom" outlined dense readonly label="开始日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
                <q-tooltip>选择开始日期</q-tooltip>
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="filterDraft.dateTo" outlined dense readonly label="结束日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
                <q-tooltip>选择结束日期</q-tooltip>
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateTo" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-select
            v-model="filterDraft.tags"
            outlined
            dense
            clearable
            multiple
            use-chips
            label="标签/标记"
            :options="tagOptions"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="重置筛选" class="archive-filter-reset" @click="resetDraftFilters" />
          <q-btn color="primary" label="应用筛选" class="archive-filter-apply" @click="applyMobileFilters" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Notify } from 'quasar';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ArchiveStatsPanel from 'src/components/approval/ArchiveStatsPanel.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useApprovalArchiveStore } from 'src/stores/approvalArchive';
import {
  ARCHIVE_RECOMMENDED_TAGS,
  archiveStatusColor,
  archiveStatusLabel,
  sourceTypeLabel,
  type ArchiveListFilters,
  type ArchiveRow,
  type ArchiveSourceType,
  type ArchiveStatus,
} from 'src/types/approvalArchive';

const router = useRouter();
const store = useApprovalArchiveStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const statsError = ref(false);
const filterDialog = ref(false);

const filters = reactive<ArchiveListFilters>(createEmptyFilters());
const filterDraft = reactive<ArchiveListFilters>(createEmptyFilters());

const sourceOptions = [
  { label: '全部', value: '' },
  { label: '审批申请', value: 'approval' },
  { label: '公开收集', value: 'collection' },
];

const statusOptions: Array<{ label: string; value: ArchiveStatus | '' }> = [
  { label: '全部', value: '' },
  { label: '审批中', value: 'APPROVING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已撤销', value: 'CANCELED' },
  { label: '已收集', value: 'COLLECTED' },
];

const columns = [
  { name: 'archiveNo', label: '编号', field: 'archiveNo', align: 'left' as const, style: 'width:140px' },
  { name: 'sourceType', label: '来源', field: 'sourceType', align: 'center' as const, style: 'width:96px' },
  { name: 'templateName', label: '模板', field: 'templateName', align: 'left' as const },
  { name: 'person', label: '申请人/填写者', field: 'personName', align: 'left' as const, style: 'width:180px' },
  { name: 'department', label: '部门', field: 'departmentName', align: 'left' as const, style: 'width:140px' },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const, style: 'width:104px' },
  { name: 'tags', label: '标签/标记', field: 'tags', align: 'left' as const, style: 'width:180px' },
  { name: 'processingSummary', label: '处理信息', field: 'processingSummary', align: 'left' as const, style: 'width:160px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:160px' },
  { name: 'actions', label: '操作', field: 'sourceId', align: 'center' as const, style: 'width:128px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

const currentFilters = computed<ArchiveListFilters>(() => ({
  ...cloneFilters(filters),
  page: store.page,
  size: store.size,
}));

const tagOptions = computed(() => {
  const tags = new Set<string>([
    ...ARCHIVE_RECOMMENDED_TAGS,
    ...store.filterOptions.recommendedTags,
    ...(filters.tags ?? []),
  ]);
  return Array.from(tags);
});

function createEmptyFilters(): ArchiveListFilters {
  return {
    sourceType: '',
    templateId: null,
    departmentId: null,
    personName: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    tags: [],
  };
}

function cloneFilters(value: ArchiveListFilters): ArchiveListFilters {
  return {
    ...value,
    tags: [...(value.tags ?? [])],
  };
}

async function loadArchive() {
  try {
    await Promise.all([store.fetchMeta(), store.fetchList({ ...currentFilters.value, page: 1 }), loadStats()]);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

async function refreshArchive() {
  await store.fetchList(currentFilters.value);
}

async function loadStats() {
  try {
    await store.fetchStats(currentFilters.value);
    statsError.value = false;
  } catch {
    statsError.value = true;
  }
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  store.page = props.pagination.page;
  store.size = props.pagination.rowsPerPage;
  void store.fetchList(currentFilters.value);
}

function queryArchive() {
  store.page = 1;
  void Promise.all([store.fetchList(currentFilters.value), loadStats()]);
}

function applyFilters() {
  queryArchive();
}

function resetFilters() {
  Object.assign(filters, createEmptyFilters());
  queryArchive();
}

function openFilterSheet() {
  Object.assign(filterDraft, cloneFilters(filters));
  filterDialog.value = true;
}

function resetDraftFilters() {
  Object.assign(filterDraft, createEmptyFilters());
}

function applyMobileFilters() {
  Object.assign(filters, cloneFilters(filterDraft));
  filterDialog.value = false;
  queryArchive();
}

async function exportArchive() {
  try {
    const blob = await store.exportExcel(currentFilters.value);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archive-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    Notify.create({ type: 'positive', message: 'Excel 导出已开始' });
  } catch {
    Notify.create({ type: 'negative', message: '当前筛选结果超过导出上限，请缩小筛选范围后重试。' });
  }
}

function openDetail(row: ArchiveRow) {
  router.push(`/approval/archive/${row.sourceType}/${row.sourceId}`);
}

function sourceColor(sourceType: ArchiveSourceType) {
  return sourceType === 'approval' ? 'primary' : 'info';
}

function visibleTags(tags: string[]) {
  return tags.slice(0, 3);
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

onMounted(() => {
  void loadArchive();
});
</script>

<style scoped>
.approval-archive-page {
  background: var(--oa-bg);
}

.archive-header {
  align-items: stretch;
}

.archive-filter {
  align-items: stretch;
}

.source-toggle {
  min-width: 260px;
}

.filter-control {
  min-width: 144px;
}

.person-filter {
  width: 180px;
}

.date-filter {
  width: 150px;
}

.tag-filter {
  min-width: 180px;
}

.state-panel,
.archive-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.archive-card {
  min-height: 56px;
}

.archive-query,
.archive-export {
  min-height: 36px;
}

.tag-list,
.mobile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
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

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 1023px) {
  .archive-header {
    align-items: center;
  }

  .mobile-filter-trigger,
  .archive-filter-reset,
  .archive-filter-apply,
  .archive-card-action,
  .filter-sheet .q-field,
  .filter-sheet .q-btn,
  .archive-export {
    min-height: 44px;
  }
}
</style>
