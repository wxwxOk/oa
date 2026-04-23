<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div style="font-size: 20px; font-weight: 600">收集统计表</div>
    </div>

    <!-- 筛选栏（PC） -->
    <div v-if="isDesktop" class="row items-center q-mb-md q-gutter-sm">
      <q-input v-model="filters.templateName" outlined dense label="模板名称" style="width: 160px" @keyup.enter="load(1)" clearable />
      <q-input v-model="filters.submitterName" outlined dense label="提交人" style="width: 140px" @keyup.enter="load(1)" clearable />
      <q-input v-model="filters.sharerName" outlined dense label="分享人" style="width: 140px" @keyup.enter="load(1)" clearable />
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
      <q-btn color="primary" label="查询" dense @click="load(1)" />
      <q-btn flat label="重置" dense @click="resetFilters" />
    </div>

    <!-- 骨架屏 -->
    <div v-if="firstLoading" class="q-pa-md">
      <q-skeleton type="rect" height="40px" class="q-mb-sm" />
      <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
    </div>

    <!-- 空状态 -->
    <EmptyState v-else-if="store.rows.length === 0 && !store.loading" icon="bar_chart" title="暂无提交数据" description="还没有收到任何表单提交" />

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
    >
      <template #body-cell-index="props">
        <q-td :props="props">{{ props.rowIndex + 1 + (pagination.page - 1) * pagination.rowsPerPage }}</q-td>
      </template>
      <template #body-cell-templateName="props">
        <q-td :props="props">{{ props.row.template?.name || '—' }}</q-td>
      </template>
      <template #body-cell-submitterName="props">
        <q-td :props="props">{{ props.row.submitterName || '匿名' }}</q-td>
      </template>
      <template #body-cell-sharerName="props">
        <q-td :props="props">{{ props.row.shareLink?.creator?.realName || '—' }}</q-td>
      </template>
      <template #body-cell-shareCode="props">
        <q-td :props="props"><code>{{ props.row.shareLink?.code || '—' }}</code></q-td>
      </template>
      <template #body-cell-createdAt="props">
        <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
      </template>
    </q-table>

    <!-- 移动端卡片列表 -->
    <div v-else-if="!firstLoading && store.rows.length > 0" class="q-gutter-sm">
      <q-card v-for="row in store.rows" :key="row.id" flat bordered>
        <q-card-section>
          <div class="text-subtitle1">{{ row.template?.name || '—' }}</div>
          <div class="text-caption q-mt-xs">提交人：{{ row.submitterName || '匿名' }}</div>
          <div class="text-caption">分享人：{{ row.shareLink?.creator?.realName || '—' }}</div>
          <div class="text-caption">分享码：{{ row.shareLink?.code || '—' }}</div>
          <div class="text-caption">{{ formatDate(row.createdAt) }}</div>
        </q-card-section>
      </q-card>
      <div v-if="store.rows.length < store.total" class="row justify-center q-mt-md">
        <q-btn flat label="加载更多" :loading="store.loading" @click="loadMore" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useShareLinkStatsStore } from 'src/stores/shareLinkStats';
import { useResponsive } from 'src/composables/useResponsive';
import EmptyState from 'src/components/EmptyState.vue';

const store = useShareLinkStatsStore();
const { isDesktop } = useResponsive();

const firstLoading = ref(true);
const filters = reactive({ templateName: '', submitterName: '', sharerName: '', dateFrom: '', dateTo: '' });
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columns = [
  { name: 'index', label: '序号', field: 'id', align: 'center' as const, style: 'width:60px' },
  { name: 'templateName', label: '模板名称', field: 'id', align: 'left' as const },
  { name: 'submitterName', label: '提交人', field: 'submitterName', align: 'left' as const },
  { name: 'sharerName', label: '分享人', field: 'id', align: 'left' as const },
  { name: 'shareCode', label: '分享码', field: 'id', align: 'left' as const },
  { name: 'createdAt', label: '提交时间', field: 'createdAt', align: 'left' as const },
];

function getFilterParams() {
  const params: Record<string, any> = {};
  if (filters.templateName) params.templateName = filters.templateName;
  if (filters.submitterName) params.submitterName = filters.submitterName;
  if (filters.sharerName) params.sharerName = filters.sharerName;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  return params;
}

async function load(page?: number) {
  if (page !== undefined) {
    pagination.value.page = page;
    store.page = page;
  }
  store.size = pagination.value.rowsPerPage;
  try {
    await store.fetchList(getFilterParams());
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
  Object.assign(filters, { templateName: '', submitterName: '', sharerName: '', dateFrom: '', dateTo: '' });
  load(1);
}

function loadMore() {
  pagination.value.page++;
  store.page = pagination.value.page;
  store.fetchList(getFilterParams());
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

onMounted(() => load(1));
</script>
