<template>
  <q-page padding class="visit-page">
    <div class="visit-header row items-start q-mb-md q-gutter-sm">
      <div class="col min-width-0">
        <div class="text-h6">到访管理</div>
        <div class="text-body2 muted wrap-text">维护学员到访记录，按渠道、人员、状态和接待日期筛选查看。</div>
      </div>
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        aria-label="筛选到访记录"
        @click="openFilterSheet"
      >
        <q-tooltip>筛选到访记录</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新到访列表" @click="refreshList">
        <q-tooltip>刷新到访列表</q-tooltip>
      </q-btn>
      <q-btn
        v-perm="'visit:stats'"
        color="primary"
        outline
        icon="insights"
        label="统计"
        @click="openStats"
      />
      <q-btn
        v-perm="'visit:import'"
        color="primary"
        outline
        icon="upload_file"
        label="导入 Excel"
        @click="openImport"
      />
      <q-btn
        v-perm="'visit:create'"
        color="primary"
        icon="add"
        :label="isMobile ? '' : '新建到访记录'"
        :round="isMobile"
        :aria-label="isMobile ? '新建到访记录' : undefined"
        :style="isMobile ? 'min-width:44px;min-height:44px' : ''"
        @click="openCreate"
      >
        <q-tooltip v-if="isMobile">新建到访记录</q-tooltip>
      </q-btn>
    </div>

    <div v-if="isDesktop" class="visit-filter row items-center q-gutter-sm q-mb-md">
      <q-input
        v-model="filters.keyword"
        outlined
        dense
        clearable
        label="关键词"
        class="keyword-filter"
        @keyup.enter="queryVisits"
        @clear="queryVisits"
      />
      <q-select
        v-model="filters.channelPartner"
        outlined
        dense
        clearable
        label="渠道商"
        class="filter-control"
        :options="optionValues(store.filterOptions.channelPartners)"
      />
      <q-select
        v-model="filters.consultant"
        outlined
        dense
        clearable
        label="咨询师"
        class="filter-control"
        :options="optionValues(store.filterOptions.consultants)"
      />
      <q-select
        v-model="filters.receptionist"
        outlined
        dense
        clearable
        label="接待人"
        class="filter-control"
        :options="optionValues(store.filterOptions.receptionists)"
      />
      <q-select
        v-model="filters.receptionStatus"
        outlined
        dense
        clearable
        label="接待状态"
        class="filter-control"
        :options="optionValues(store.filterOptions.receptionStatuses)"
      />
      <q-select
        v-model="filters.consultationStatus"
        outlined
        dense
        clearable
        label="咨询后状态"
        class="filter-control"
        :options="optionValues(store.filterOptions.consultationStatuses)"
      />
      <q-select
        v-model="filters.statusCategory"
        outlined
        dense
        clearable
        label="状态类别"
        class="filter-control"
        :options="optionValues(store.filterOptions.statusCategories)"
      />
      <q-input v-model="filters.dateFrom" outlined dense readonly label="开始接待日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择开始接待日期">
            <q-tooltip>选择开始接待日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateFrom" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="filters.dateTo" outlined dense readonly label="结束接待日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择结束接待日期">
            <q-tooltip>选择结束接待日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateTo" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-btn color="primary" label="查询" class="visit-query" @click="queryVisits" />
      <q-btn flat label="重置筛选" class="visit-filter-reset" @click="resetFilters" />
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 6" :key="i" type="rect" height="44px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="visit-card q-mb-sm">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="84%" class="q-mt-xs" />
            <q-skeleton type="text" width="52%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <q-card v-else-if="error" flat bordered class="state-panel text-center q-pa-xl">
      <div class="text-body1">到访记录加载失败，请检查网络后重试。</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="refreshList" />
    </q-card>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="groups"
      title="暂无到访记录"
      description="当前筛选条件下没有到访记录。"
      :cta-text="auth.hasPerm('visit:create') ? '新建到访记录' : undefined"
      @action="openCreate"
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
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="text-body2 wrap-text">{{ props.row.name }}</div>
          </q-td>
        </template>
        <template #body-cell-receptionDate="props">
          <q-td :props="props">{{ formatVisitDate(props.row.receptionDate) }}</q-td>
        </template>
        <template #body-cell-receptionStatus="props">
          <q-td :props="props">
            <q-chip v-if="props.row.receptionStatus" dense square color="primary" text-color="white">
              {{ props.row.receptionStatus }}
            </q-chip>
            <span v-else class="muted">-</span>
          </q-td>
        </template>
        <template #body-cell-consultationStatus="props">
          <q-td :props="props">
            <q-chip v-if="props.row.consultationStatus" dense square color="secondary" text-color="white">
              {{ props.row.consultationStatus }}
            </q-chip>
            <span v-else class="muted">-</span>
          </q-td>
        </template>
        <template #body-cell-updatedAt="props">
          <q-td :props="props">{{ formatDateTime(props.row.updatedAt) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap justify-center q-gutter-xs visit-table-actions">
              <q-btn flat dense size="sm" color="primary" icon="visibility" label="查看" @click="openDetail(props.row)" />
              <q-btn
                v-perm="'visit:update'"
                flat
                dense
                size="sm"
                color="primary"
                icon="edit"
                label="编辑"
                @click="openEdit(props.row)"
              />
              <q-btn
                v-perm="'visit:delete'"
                flat
                dense
                size="sm"
                color="negative"
                icon="delete"
                label="删除"
                @click="confirmDelete(props.row)"
              />
            </div>
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card v-for="row in store.rows" :key="row.id" flat bordered class="visit-card">
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.name }}</div>
                <div class="text-caption muted wrap-text">渠道商：{{ row.channelPartner || '-' }}</div>
              </div>
              <div class="row q-gutter-xs no-wrap">
                <q-chip v-if="row.receptionStatus" dense square color="primary" text-color="white">
                  {{ row.receptionStatus }}
                </q-chip>
                <q-chip v-if="row.consultationStatus" dense square color="secondary" text-color="white">
                  {{ row.consultationStatus }}
                </q-chip>
              </div>
            </div>
            <div class="text-caption muted q-mt-sm wrap-text">咨询师：{{ row.consultant || '-' }}</div>
            <div class="text-caption muted wrap-text">接待人：{{ row.receptionist || '-' }}</div>
            <div class="text-caption muted wrap-text">接待日期：{{ formatVisitDate(row.receptionDate) }}</div>
            <div class="text-caption muted wrap-text">状态类别：{{ row.statusCategory || '-' }}</div>
          </q-card-section>
          <q-card-actions align="right" class="visit-card-actions">
            <q-btn flat dense color="primary" icon="visibility" label="查看" @click="openDetail(row)" />
            <q-btn v-perm="'visit:update'" flat dense color="primary" icon="edit" label="编辑" @click="openEdit(row)" />
            <q-btn
              v-perm="'visit:delete'"
              flat
              dense
              color="negative"
              icon="delete"
              label="删除"
              @click="confirmDelete(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterDialog" position="bottom">
      <q-card class="filter-sheet">
        <q-card-section class="text-h6">筛选到访记录</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="filterDraft.keyword" outlined dense clearable label="关键词" />
          <q-select
            v-model="filterDraft.channelPartner"
            outlined
            dense
            clearable
            label="渠道商"
            :options="optionValues(store.filterOptions.channelPartners)"
          />
          <q-select
            v-model="filterDraft.consultant"
            outlined
            dense
            clearable
            label="咨询师"
            :options="optionValues(store.filterOptions.consultants)"
          />
          <q-select
            v-model="filterDraft.receptionist"
            outlined
            dense
            clearable
            label="接待人"
            :options="optionValues(store.filterOptions.receptionists)"
          />
          <q-select
            v-model="filterDraft.receptionStatus"
            outlined
            dense
            clearable
            label="接待状态"
            :options="optionValues(store.filterOptions.receptionStatuses)"
          />
          <q-select
            v-model="filterDraft.consultationStatus"
            outlined
            dense
            clearable
            label="咨询后状态"
            :options="optionValues(store.filterOptions.consultationStatuses)"
          />
          <q-select
            v-model="filterDraft.statusCategory"
            outlined
            dense
            clearable
            label="状态类别"
            :options="optionValues(store.filterOptions.statusCategories)"
          />
          <q-input v-model="filterDraft.dateFrom" outlined dense readonly label="开始接待日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="filterDraft.dateTo" outlined dense readonly label="结束接待日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateTo" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="重置筛选" @click="resetDraftFilters" />
          <q-btn color="primary" label="应用筛选" @click="applyMobileFilters" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <VisitFormDialog
      v-model="formDialogOpen"
      :mode="formMode"
      :visit="selectedVisit"
      :action-loading="store.actionLoading"
      @submit="submitVisit"
    />
    <VisitImportDialog v-model="importDialogOpen" @imported="handleImportSuccess" />
    <VisitStatsPanel
      v-model="statsPanelOpen"
      :initial-date-from="filters.dateFrom"
      :initial-date-to="filters.dateTo"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Dialog, Notify } from 'quasar';
import EmptyState from 'src/components/EmptyState.vue';
import VisitImportDialog from 'src/components/visit/VisitImportDialog.vue';
import VisitFormDialog from 'src/components/visit/VisitFormDialog.vue';
import VisitStatsPanel from 'src/components/visit/VisitStatsPanel.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useVisitStore } from 'src/stores/visit';
import { createEmptyVisitFilters, formatVisitDate, type VisitListFilters, type VisitRow, type VisitWritePayload } from 'src/types/visit';

type FormMode = 'create' | 'edit' | 'detail';

const store = useVisitStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const filterDialog = ref(false);
const formDialogOpen = ref(false);
const importDialogOpen = ref(false);
const statsPanelOpen = ref(false);
const formMode = ref<FormMode>('create');
const selectedVisit = ref<VisitRow | null>(null);
const filters = reactive<VisitListFilters>(createEmptyVisitFilters());
const filterDraft = reactive<VisitListFilters>(createEmptyVisitFilters());

const columns = [
  { name: 'name', label: '姓名', field: 'name', align: 'left' as const, style: 'width:100px' },
  { name: 'channelPartner', label: '渠道商', field: 'channelPartner', align: 'left' as const },
  { name: 'consultant', label: '咨询师', field: 'consultant', align: 'left' as const, style: 'width:110px' },
  { name: 'receptionist', label: '接待人', field: 'receptionist', align: 'left' as const, style: 'width:110px' },
  { name: 'receptionDate', label: '接待日期', field: 'receptionDate', align: 'left' as const, style: 'width:120px' },
  { name: 'receptionStatus', label: '接待状态', field: 'receptionStatus', align: 'center' as const, style: 'width:110px' },
  { name: 'consultationStatus', label: '咨询后状态', field: 'consultationStatus', align: 'center' as const, style: 'width:120px' },
  { name: 'statusCategory', label: '状态类别', field: 'statusCategory', align: 'left' as const, style: 'width:110px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:150px' },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:190px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

function optionValues(values: string[]) {
  return values;
}

async function loadVisits(page = store.page, size = store.size) {
  try {
    await store.fetchList({ ...filters, page, size });
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

async function loadInitial() {
  try {
    await store.fetchFilterOptions();
  } catch {
    // Filter options are auxiliary; list loading below owns the visible error state.
  }
  await loadVisits(1, store.size);
}

function refreshList() {
  void loadVisits(store.page, store.size);
}

function queryVisits() {
  void loadVisits(1, store.size);
}

function resetFilters() {
  Object.assign(filters, createEmptyVisitFilters());
  queryVisits();
}

function openFilterSheet() {
  Object.assign(filterDraft, filters);
  filterDialog.value = true;
}

function resetDraftFilters() {
  Object.assign(filterDraft, createEmptyVisitFilters());
}

function applyMobileFilters() {
  Object.assign(filters, filterDraft);
  filterDialog.value = false;
  queryVisits();
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  void loadVisits(props.pagination.page, props.pagination.rowsPerPage);
}

function openCreate() {
  if (!auth.hasPerm('visit:create')) return;
  selectedVisit.value = null;
  formMode.value = 'create';
  formDialogOpen.value = true;
}

function openImport() {
  if (!auth.hasPerm('visit:import')) return;
  importDialogOpen.value = true;
}

function openStats() {
  if (!auth.hasPerm('visit:stats')) return;
  statsPanelOpen.value = true;
}

async function openVisit(row: VisitRow, mode: FormMode) {
  selectedVisit.value = row;
  formMode.value = mode;
  try {
    selectedVisit.value = await store.fetchDetail(row.id);
    formDialogOpen.value = true;
  } catch {
    Notify.create({ type: 'negative', message: '到访详情加载失败，请检查网络后重试。' });
  }
}

function openDetail(row: VisitRow) {
  void openVisit(row, 'detail');
}

function openEdit(row: VisitRow) {
  if (!auth.hasPerm('visit:update')) return;
  void openVisit(row, 'edit');
}

async function submitVisit(payload: VisitWritePayload) {
  try {
    if (formMode.value === 'create') {
      await store.createVisit(payload);
      Notify.create({ type: 'positive', message: '到访记录已创建。' });
    } else if (formMode.value === 'edit' && selectedVisit.value) {
      await store.updateVisit(selectedVisit.value.id, payload);
      Notify.create({ type: 'positive', message: '到访记录已更新。' });
    }
    formDialogOpen.value = false;
    await refreshAfterMutation();
  } catch {
    Notify.create({ type: 'negative', message: '到访记录保存失败，请检查后重试。' });
  }
}

function confirmDelete(row: VisitRow) {
  if (!auth.hasPerm('visit:delete')) return;
  Dialog.create({
    title: '确认删除',
    message: `确认删除 ${row.name} 的到访记录？${deleteContext(row)}`,
    cancel: { label: '取消', flat: true },
    ok: { label: '删除', color: 'negative' },
    persistent: true,
  }).onOk(() => {
    void deleteVisit(row);
  });
}

function deleteContext(row: VisitRow) {
  const context = [formatVisitDate(row.receptionDate), row.consultant, row.receptionist]
    .filter((value) => value && value !== '-')
    .join(' / ');
  return context ? `参考信息：${context}` : '参考信息：无';
}

async function deleteVisit(row: VisitRow) {
  try {
    await store.deleteVisit(row.id);
    Notify.create({ type: 'positive', message: '到访记录已删除。' });
    await refreshAfterMutation();
  } catch {
    Notify.create({ type: 'negative', message: '到访记录删除失败，请检查后重试。' });
  }
}

async function refreshAfterMutation() {
  await loadVisits(store.page, store.size);
  try {
    await store.fetchFilterOptions();
  } catch {
    // Distinct filters refresh on best effort; the saved list remains authoritative.
  }
}

async function handleImportSuccess() {
  await loadVisits(store.page, store.size);
  try {
    await store.fetchFilterOptions();
  } catch {
    // Imported records are visible after list refresh; option refresh can retry later.
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

onMounted(() => {
  void loadInitial();
});
</script>

<style scoped>
.visit-page {
  background: var(--oa-bg);
}

.visit-filter {
  align-items: stretch;
}

.keyword-filter {
  width: 180px;
}

.filter-control {
  min-width: 128px;
}

.date-filter {
  width: 150px;
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

.visit-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.filter-sheet {
  border-radius: 8px 8px 0 0;
}

.visit-table-actions .q-btn,
.visit-card-actions .q-btn,
.filter-sheet .q-btn {
  min-height: 44px;
}
</style>
