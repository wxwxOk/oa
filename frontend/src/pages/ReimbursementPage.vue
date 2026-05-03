<template>
  <q-page padding class="reimbursement-page">
    <div class="reimbursement-header row items-start q-mb-md q-gutter-sm">
      <div class="col min-width-0">
        <div class="text-h6">我的报销</div>
        <div class="text-body2 muted wrap-text">提交报销申请并追踪当前审核状态</div>
      </div>
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        aria-label="筛选报销申请"
        @click="openFilterSheet"
      >
        <q-tooltip>筛选报销申请</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="refresh" aria-label="刷新报销列表" @click="refreshList">
        <q-tooltip>刷新报销列表</q-tooltip>
      </q-btn>
      <q-btn
        v-if="auth.hasPerm('reimbursement:create')"
        color="primary"
        icon="add"
        :label="isMobile ? '' : '新建报销申请'"
        :round="isMobile"
        :aria-label="isMobile ? '新建报销申请' : undefined"
        :style="isMobile ? 'min-width:44px;min-height:44px' : ''"
        @click="goCreate"
      >
        <q-tooltip v-if="isMobile">新建报销申请</q-tooltip>
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
      <q-input v-model="filters.category" outlined dense clearable label="类别" class="filter-control" />
      <q-input v-model="filters.dateFrom" outlined dense readonly label="开始日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
            <q-tooltip>选择开始日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateFrom" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="filters.dateTo" outlined dense readonly label="结束日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer" aria-label="选择结束日期">
            <q-tooltip>选择结束日期</q-tooltip>
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="filters.dateTo" mask="YYYY-MM-DD" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-btn color="primary" label="查询" @click="queryList" />
      <q-btn flat label="重置筛选" @click="resetFilters" />
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 6" :key="i" type="rect" height="44px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="reimbursement-card q-mb-sm">
          <q-card-section>
            <q-skeleton type="text" width="64%" />
            <q-skeleton type="text" width="84%" class="q-mt-xs" />
            <q-skeleton type="text" width="52%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <q-card v-else-if="error" flat bordered class="state-panel text-center q-pa-xl">
      <div class="text-body1">报销列表加载失败，请重试</div>
      <q-btn color="primary" label="重新加载" class="q-mt-md" @click="refreshList" />
    </q-card>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="receipt_long"
      title="暂无报销申请"
      description="可新建报销申请并上传发票或凭证。"
      :cta-text="auth.hasPerm('reimbursement:create') ? '新建报销申请' : undefined"
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
        <template #body-cell-title="props">
          <q-td :props="props">
            <div class="text-body2 wrap-text">{{ props.row.title }}</div>
          </q-td>
        </template>
        <template #body-cell-amount="props">
          <q-td :props="props">{{ formatReimbursementAmount(props.row.amount) }}</q-td>
        </template>
        <template #body-cell-occurredAt="props">
          <q-td :props="props">{{ formatReimbursementDate(props.row.occurredAt) }}</q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <ReimbursementStatusChip :status="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-updatedAt="props">
          <q-td :props="props">{{ formatDateTime(props.row.updatedAt) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap justify-center q-gutter-xs">
              <q-btn flat dense size="sm" color="primary" icon="visibility" label="查看" @click="goDetail(props.row)" />
              <q-btn
                v-if="canMutateDraft(props.row)"
                flat
                dense
                size="sm"
                color="primary"
                icon="edit"
                label="继续编辑"
                @click="goEdit(props.row)"
              />
              <q-btn
                v-if="canMutateDraft(props.row)"
                flat
                dense
                size="sm"
                color="positive"
                icon="send"
                label="提交申请"
                :loading="store.actionLoading"
                @click="submitDraft(props.row)"
              />
            </div>
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card v-for="row in store.rows" :key="row.id" flat bordered class="reimbursement-card">
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.title }}</div>
                <div class="text-caption muted wrap-text">{{ row.applicationNo }}</div>
              </div>
              <ReimbursementStatusChip :status="row.status" />
            </div>
            <div class="summary-grid q-mt-sm">
              <div>类别：{{ row.category || '-' }}</div>
              <div>金额：{{ formatReimbursementAmount(row.amount) }}</div>
              <div>发生日期：{{ formatReimbursementDate(row.occurredAt) }}</div>
              <div>附件数：{{ row.attachmentCount }}</div>
              <div>更新时间：{{ formatDateTime(row.updatedAt) }}</div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="card-actions">
            <q-btn flat dense color="primary" icon="visibility" label="查看" @click="goDetail(row)" />
            <q-btn v-if="canMutateDraft(row)" flat dense color="primary" icon="edit" label="继续编辑" @click="goEdit(row)" />
            <q-btn
              v-if="canMutateDraft(row)"
              flat
              dense
              color="positive"
              icon="send"
              label="提交申请"
              :loading="store.actionLoading"
              @click="submitDraft(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterDialog" position="bottom">
      <q-card class="filter-sheet">
        <q-card-section class="text-h6">筛选报销申请</q-card-section>
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
          <q-input v-model="filterDraft.category" outlined dense clearable label="类别" />
          <q-input v-model="filterDraft.dateFrom" outlined dense readonly label="开始日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filterDraft.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="filterDraft.dateTo" outlined dense readonly label="结束日期">
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Notify } from 'quasar';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ReimbursementStatusChip from 'src/components/reimbursement/ReimbursementStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useReimbursementStore } from 'src/stores/reimbursement';
import {
  REIMBURSEMENT_STATUSES,
  createEmptyReimbursementFilters,
  formatReimbursementAmount,
  formatReimbursementDate,
  isDraftReimbursement,
  reimbursementStatusLabel,
  type ReimbursementListFilters,
  type ReimbursementRow,
} from 'src/types/reimbursement';

defineOptions({ name: 'ReimbursementPage' });

const router = useRouter();
const store = useReimbursementStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const filterDialog = ref(false);
const filters = reactive<ReimbursementListFilters>(createEmptyReimbursementFilters());
const filterDraft = reactive<ReimbursementListFilters>(createEmptyReimbursementFilters());

const statusOptions = [
  { label: '全部状态', value: '' },
  ...REIMBURSEMENT_STATUSES.map((status) => ({ label: reimbursementStatusLabel(status), value: status })),
];

const columns = [
  { name: 'applicationNo', label: '申请编号', field: 'applicationNo', align: 'left' as const, style: 'width:170px' },
  { name: 'title', label: '标题', field: 'title', align: 'left' as const },
  { name: 'category', label: '类别', field: 'category', align: 'left' as const, style: 'width:110px' },
  { name: 'amount', label: '金额', field: 'amount', align: 'right' as const, style: 'width:110px' },
  { name: 'occurredAt', label: '发生日期', field: 'occurredAt', align: 'left' as const, style: 'width:120px' },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const, style: 'width:110px' },
  { name: 'attachmentCount', label: '附件', field: 'attachmentCount', align: 'center' as const, style: 'width:80px' },
  { name: 'applicantName', label: '申请人', field: 'applicantName', align: 'left' as const, style: 'width:110px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:150px' },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:240px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

async function loadList(page = store.page, size = store.size) {
  try {
    await store.fetchList({ ...filters, page, size });
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

function refreshList() {
  void loadList(store.page, store.size);
}

function queryList() {
  void loadList(1, store.size);
}

function resetFilters() {
  Object.assign(filters, createEmptyReimbursementFilters());
  queryList();
}

function openFilterSheet() {
  Object.assign(filterDraft, filters);
  filterDialog.value = true;
}

function resetDraftFilters() {
  Object.assign(filterDraft, createEmptyReimbursementFilters());
}

function applyMobileFilters() {
  Object.assign(filters, filterDraft);
  filterDialog.value = false;
  queryList();
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  void loadList(props.pagination.page, props.pagination.rowsPerPage);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = formatReimbursementDate(value);
  const time = value.length >= 16 ? value.slice(11, 16) : '';
  return time ? `${date} ${time}` : date;
}

function canMutateDraft(row: ReimbursementRow) {
  return isDraftReimbursement(row) && auth.hasPerm('reimbursement:create');
}

function goCreate() {
  if (!auth.hasPerm('reimbursement:create')) return;
  router.push('/reimbursements/new');
}

function goDetail(row: ReimbursementRow) {
  router.push(`/reimbursements/${row.id}`);
}

function goEdit(row: ReimbursementRow) {
  if (!canMutateDraft(row)) return;
  router.push(`/reimbursements/${row.id}/edit`);
}

async function submitDraft(row: ReimbursementRow) {
  if (!canMutateDraft(row)) return;
  try {
    await store.submitDraft(row.id);
    Notify.create({ type: 'positive', message: '报销申请已提交，等待部门初审' });
    await loadList(store.page, store.size);
  } catch {
    Notify.create({ type: 'negative', message: '报销申请提交失败，请检查后重试。' });
  }
}

onMounted(() => {
  void loadList(1, store.size);
});
</script>

<style scoped>
.reimbursement-page {
  background: var(--oa-bg);
}

.min-width-0 {
  min-width: 0;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  overflow-wrap: anywhere;
}

.keyword-filter {
  min-width: 220px;
}

.filter-control {
  min-width: 150px;
}

.date-filter {
  min-width: 150px;
}

.state-panel,
.reimbursement-card,
.filter-sheet {
  border-radius: 8px;
  background: var(--oa-surface);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  color: var(--oa-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.card-actions {
  flex-wrap: wrap;
}

.filter-sheet {
  width: 100%;
}
</style>
