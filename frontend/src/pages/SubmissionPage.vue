<template>
  <q-page padding>
    <!-- 页面头部 -->
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" @click="$router.push('/templates')" aria-label="返回模板列表" />
      <div style="font-size: 20px; font-weight: 600">提交数据 — {{ templateName }}</div>
    </div>

    <!-- 筛选栏（PC 水平排列） -->
    <div v-if="isDesktop" class="row items-center q-mb-md q-gutter-sm">
      <q-input v-model="filters.submitterName" outlined dense label="填写者姓名" style="width: 160px" @keyup.enter="load(1)" clearable />
      <q-input v-model="filters.submitterPhone" outlined dense label="手机号" style="width: 160px" @keyup.enter="load(1)" clearable />
      <q-input v-model="filters.dateFrom" outlined dense label="开始日期" style="width: 150px">
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy><q-date v-model="filters.dateFrom" mask="YYYY-MM-DD" /></q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="filters.dateTo" outlined dense label="结束日期" style="width: 150px">
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy><q-date v-model="filters.dateTo" mask="YYYY-MM-DD" /></q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-select v-model="filters.sharerId" :options="sharerOptions" label="分享人" outlined dense emit-value map-options clearable style="width: 160px" />
      <q-btn color="primary" label="查询" dense @click="load(1)" />
      <q-btn flat label="重置" dense @click="resetFilters" />
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="firstLoading" class="q-pa-md">
      <q-skeleton type="rect" height="40px" class="q-mb-sm" />
      <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
    </div>

    <!-- 空状态 -->
    <EmptyState v-else-if="store.rows.length === 0 && !store.loading" icon="inbox" title="暂无提交数据" description="该模板还没有收到任何提交" />

    <!-- QTable（PC） -->
    <q-table
      v-else-if="isDesktop"
      :rows="store.rows"
      :columns="columns"
      row-key="id"
      :loading="store.loading"
      :pagination="pagination"
      @request="onReq"
      flat
      bordered
      selection="multiple"
      v-model:selected="selected"
    >
      <template #body-cell-index="props">
        <q-td :props="props">{{ props.rowIndex + 1 + (pagination.page - 1) * pagination.rowsPerPage }}</q-td>
      </template>
      <template #body-cell-submitterName="props">
        <q-td :props="props">{{ props.row.submitterName || '—' }}</q-td>
      </template>
      <template #body-cell-submitterPhone="props">
        <q-td :props="props">{{ props.row.submitterPhone || '—' }}</q-td>
      </template>
      <template #body-cell-createdAt="props">
        <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
      </template>
      <template #body-cell-sharer="props">
        <q-td :props="props">{{ props.row.shareLink?.creator?.realName || '—' }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn size="sm" flat dense icon="visibility" @click="openDetail(props.row)" aria-label="查看" />
          <q-btn size="sm" flat dense icon="print" @click="openAndPrint(props.row)" aria-label="打印" />
          <q-btn size="sm" flat dense icon="picture_as_pdf" @click="openAndExport(props.row)" aria-label="导出 PDF" />
        </q-td>
      </template>
    </q-table>

    <!-- 移动端卡片列表 -->
    <div v-else-if="!firstLoading && store.rows.length > 0" class="q-gutter-sm">
      <q-card v-for="row in store.rows" :key="row.id" flat bordered @click="openDetail(row)">
        <q-card-section>
          <div class="row items-center">
            <div class="text-subtitle1">{{ row.submitterName || '匿名' }}</div>
            <q-space />
            <div class="text-caption">{{ formatDate(row.createdAt) }}</div>
          </div>
          <div class="text-caption q-mt-xs">分享人：{{ row.shareLink?.creator?.realName || '—' }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selected.length > 0" class="fixed-bottom q-pa-md" style="background: var(--oa-surface); border-top: 1px solid var(--oa-border); z-index: 100">
      <div class="row items-center justify-between">
        <span>已选 {{ selected.length }} 条</span>
        <q-btn color="primary" icon="picture_as_pdf" label="批量导出 PDF" :loading="batchExporting" @click="handleBatchExport" />
      </div>
    </div>

    <!-- QDrawer 详情抽屉 -->
    <q-drawer v-model="drawerOpen" side="right" :width="isMobile ? undefined : 480" bordered overlay :maximized="isMobile">
      <SubmissionDetail
        v-if="currentDetail"
        :submission="currentDetail"
        :template-name="templateName"
        @print="handlePrint"
        @export-pdf="handleExportPdf"
        @close="drawerOpen = false"
      />
    </q-drawer>

    <!-- 批量导出进度对话框 -->
    <q-dialog v-model="batchDialogOpen" persistent no-backdrop-dismiss>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div style="font-size: 16px; font-weight: 600">正在导出 PDF...</div>
          <div style="font-size: 14px" class="q-mt-sm">{{ batchProgress.current }}/{{ batchProgress.total }} 条</div>
          <q-linear-progress :value="batchProgress.total > 0 ? batchProgress.current / batchProgress.total : 0" color="primary" size="8px" class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" @click="cancelBatch" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import { useSubmissionStore } from 'src/stores/submission';
import { useResponsive } from 'src/composables/useResponsive';
import { exportToPdf, exportBatchToPdf } from 'src/composables/usePdfExport';
import EmptyState from 'src/components/EmptyState.vue';
import SubmissionDetail from 'src/components/submission/SubmissionDetail.vue';
import type { SubmissionRow, SubmissionDetail as SubmissionDetailType } from 'src/stores/submission';

const route = useRoute();
const store = useSubmissionStore();
const { isDesktop, isMobile } = useResponsive();

const templateId = computed(() => Number(route.params.id));
const templateName = ref('');
const firstLoading = ref(true);
const drawerOpen = ref(false);
const currentDetail = ref<SubmissionDetailType | null>(null);
const selected = ref<SubmissionRow[]>([]);

// 筛选
const filters = reactive({
  submitterName: '',
  submitterPhone: '',
  dateFrom: '',
  dateTo: '',
  sharerId: null as number | null,
});
const sharerOptions = ref<Array<{ label: string; value: number }>>([]);

// 分页
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

// 批量导出
const batchExporting = ref(false);
const batchDialogOpen = ref(false);
const batchProgress = reactive({ current: 0, total: 0 });
const batchCancelRef = ref(false);

// 列定义
const columns = [
  { name: 'index', label: '序号', field: 'id', align: 'center' as const, style: 'width:60px' },
  { name: 'submitterName', label: '填写者姓名', field: 'submitterName', align: 'left' as const },
  { name: 'submitterPhone', label: '手机号', field: 'submitterPhone', align: 'left' as const },
  { name: 'createdAt', label: '提交时间', field: 'createdAt', align: 'left' as const },
  { name: 'sharer', label: '分享人', field: 'id', align: 'left' as const },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:140px' },
];

// 加载列表
async function load(page?: number) {
  if (page !== undefined) {
    pagination.value.page = page;
    store.page = page;
  }
  store.size = pagination.value.rowsPerPage;

  const filterParams: Record<string, any> = {};
  if (filters.submitterName) filterParams.submitterName = filters.submitterName;
  if (filters.submitterPhone) filterParams.submitterPhone = filters.submitterPhone;
  if (filters.dateFrom) filterParams.dateFrom = filters.dateFrom;
  if (filters.dateTo) filterParams.dateTo = filters.dateTo;
  if (filters.sharerId) filterParams.sharerId = filters.sharerId;

  try {
    await store.fetchList(templateId.value, filterParams);
    pagination.value.rowsNumber = store.total;
  } finally {
    firstLoading.value = false;
  }
}

function onReq(props: any) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  store.page = props.pagination.page;
  store.size = props.pagination.rowsPerPage;
  load();
}

function resetFilters() {
  filters.submitterName = '';
  filters.submitterPhone = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  filters.sharerId = null;
  load(1);
}

// 详情
async function openDetail(row: SubmissionRow) {
  const detail = await store.fetchDetail(templateId.value, row.id);
  currentDetail.value = detail;
  templateName.value = detail.template.name;
  drawerOpen.value = true;
}

async function openAndPrint(row: SubmissionRow) {
  await openDetail(row);
  await nextTick();
  window.print();
}

async function openAndExport(row: SubmissionRow) {
  await openDetail(row);
  await nextTick();
  handleExportPdf();
}

// 打印
function handlePrint() {
  window.print();
}

// 单条 PDF 导出
async function handleExportPdf() {
  const el = document.getElementById('print-area');
  if (!el || !currentDetail.value) return;
  const filename = `${templateName.value}_${formatDate(currentDetail.value.createdAt)}.pdf`;
  try {
    await exportToPdf(el, filename);
  } catch {
    Notify.create({ type: 'negative', message: 'PDF 导出失败，请重试' });
  }
}

// 批量 PDF 导出
async function handleBatchExport() {
  const items = selected.value.slice(0, 50);
  if (selected.value.length > 50) {
    Notify.create({ type: 'warning', message: '最多支持 50 条批量导出，已自动截取前 50 条' });
  }

  batchProgress.current = 0;
  batchProgress.total = items.length;
  batchCancelRef.value = false;
  batchDialogOpen.value = true;
  batchExporting.value = true;

  const renderFn = async (index: number): Promise<HTMLElement> => {
    const detail = await store.fetchDetail(templateId.value, items[index].id);
    currentDetail.value = detail;
    await nextTick();
    return document.getElementById('print-area')!;
  };

  try {
    const completed = await exportBatchToPdf(
      renderFn,
      items.length,
      `${templateName.value}_批量导出.pdf`,
      (current, total) => {
        batchProgress.current = current;
        batchProgress.total = total;
      },
      batchCancelRef,
    );
    if (completed) {
      Notify.create({ type: 'positive', message: '批量导出完成' });
    }
  } catch {
    Notify.create({ type: 'negative', message: 'PDF 导出失败，请重试' });
  } finally {
    batchDialogOpen.value = false;
    batchExporting.value = false;
    selected.value = [];
  }
}

function cancelBatch() {
  batchCancelRef.value = true;
}

// 格式化日期
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

onMounted(async () => {
  // 加载分享人选项
  try {
    const sharers = await store.fetchSharers(templateId.value);
    sharerOptions.value = sharers.map(s => ({ label: s.realName, value: s.id }));
  } catch {
    // 分享人加载失败不阻塞页面
  }
  await load(1);
  // 从列表第一条数据获取模板名称（列表响应已包含 template.name）
  if (store.rows.length > 0) {
    templateName.value = (store.rows[0] as any).template?.name ?? '';
  }
});
</script>
