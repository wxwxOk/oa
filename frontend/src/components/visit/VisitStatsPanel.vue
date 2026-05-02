<template>
  <q-dialog :model-value="modelValue" :maximized="isMobile" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="visit-stats-panel">
      <q-toolbar>
        <q-toolbar-title>到访统计</q-toolbar-title>
        <q-btn flat round dense icon="close" aria-label="关闭统计面板" @click="close" />
      </q-toolbar>

      <q-separator />

      <q-card-section class="q-gutter-md">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-md-3">
            <q-input v-model="dateFrom" outlined dense readonly clearable label="开始接待日期">
              <template #append>
                <q-icon name="event" class="cursor-pointer" aria-label="选择统计开始日期">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="dateFrom" mask="YYYY-MM-DD" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-input v-model="dateTo" outlined dense readonly clearable label="结束接待日期">
              <template #append>
                <q-icon name="event" class="cursor-pointer" aria-label="选择统计结束日期">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="dateTo" mask="YYYY-MM-DD" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-auto row q-gutter-sm">
            <q-btn color="primary" icon="search" label="应用筛选" :loading="statsLoading" @click="loadStats" />
            <q-btn flat icon="backspace" label="清空日期" :disable="statsLoading" @click="clearDates" />
            <q-btn flat round icon="refresh" aria-label="刷新到访统计" :loading="statsLoading" @click="loadStats">
              <q-tooltip>刷新到访统计</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div class="text-caption muted">意向/签约类按状态文本关键词估算，统计结果用于快速概览。</div>

        <q-banner v-if="loadError" dense rounded class="bg-negative text-white">
          统计数据加载失败，请检查筛选条件后重试。
        </q-banner>

        <template v-if="statsLoading">
          <div class="summary-grid">
            <q-card v-for="item in summaryLabels" :key="item" flat bordered class="stats-card">
              <q-card-section>
                <q-skeleton type="text" width="50%" />
                <q-skeleton type="text" width="32%" class="q-mt-sm" />
              </q-card-section>
            </q-card>
          </div>
          <div class="stats-grid">
            <q-card v-for="item in chartSkeletons" :key="item" flat bordered class="stats-card">
              <q-card-section>
                <q-skeleton type="text" width="40%" />
                <q-skeleton type="rect" height="260px" class="q-mt-sm" />
              </q-card-section>
            </q-card>
          </div>
        </template>

        <div v-else-if="isEmpty" class="text-center q-pa-lg muted">暂无统计数据</div>

        <template v-else>
          <div class="summary-grid">
            <q-card v-for="item in summaryCards" :key="item.label" flat bordered class="stats-card">
              <q-card-section>
                <div class="text-caption muted">{{ item.label }}</div>
                <div class="text-h6">{{ item.value }}</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="stats-grid">
            <q-card v-for="section in dimensionSections" :key="section.title" flat bordered class="stats-card">
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">{{ section.title }}</div>
                <div class="chart-box" role="img" :aria-label="section.ariaLabel">
                  <Bar :data="section.chartData" :options="chartOptions" />
                </div>
                <q-markup-table flat dense class="q-mt-sm stats-table">
                  <thead>
                    <tr>
                      <th class="text-left">维度</th>
                      <th class="text-right">到访</th>
                      <th class="text-right">意向</th>
                      <th class="text-right">签约类</th>
                      <th class="text-right">意向率</th>
                      <th class="text-right">签约转化率</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in section.rows" :key="row.name">
                      <td class="wrap-text">{{ row.name }}</td>
                      <td class="text-right">{{ row.total }}</td>
                      <td class="text-right">{{ row.intentCount }}</td>
                      <td class="text-right">{{ row.signedCount }}</td>
                      <td class="text-right">{{ formatVisitRate(row.intentRate) }}</td>
                      <td class="text-right">{{ formatVisitRate(row.signedRate) }}</td>
                    </tr>
                    <tr v-if="section.rows.length === 0">
                      <td colspan="6" class="muted">暂无统计数据</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </q-card>

            <q-card v-for="section in distributionSections" :key="section.title" flat bordered class="stats-card">
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">{{ section.title }}</div>
                <div class="chart-box" role="img" :aria-label="section.ariaLabel">
                  <Bar :data="section.chartData" :options="singleChartOptions" />
                </div>
                <q-markup-table flat dense class="q-mt-sm stats-table">
                  <thead>
                    <tr>
                      <th class="text-left">维度</th>
                      <th class="text-right">数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in section.rows" :key="row.name">
                      <td class="wrap-text">{{ row.name }}</td>
                      <td class="text-right">{{ row.count }}</td>
                    </tr>
                    <tr v-if="section.rows.length === 0">
                      <td colspan="2" class="muted">暂无统计数据</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'vue-chartjs';
import { useResponsive } from 'src/composables/useResponsive';
import { useVisitStore } from 'src/stores/visit';
import { formatVisitRate, type VisitStatsDimensionRow, type VisitStatsDistributionRow } from 'src/types/visit';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps<{
  modelValue: boolean;
  initialDateFrom?: string;
  initialDateTo?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const store = useVisitStore();
const { stats, statsLoading } = storeToRefs(store);
const { isMobile } = useResponsive();
const dateFrom = ref('');
const dateTo = ref('');
const loadError = ref(false);

const summaryLabels = ['到访总数', '意向数量', '签约类数量', '意向率', '签约转化率'];
const chartSkeletons = ['渠道商', '咨询师', '接待人', '接待状态'];

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};
const singleChartOptions: ChartOptions<'bar'> = {
  ...chartOptions,
  plugins: { legend: { display: false } },
};

const isEmpty = computed(() => !stats.value || stats.value.total === 0);
const summaryCards = computed(() => [
  { label: '到访总数', value: String(stats.value?.total ?? 0) },
  { label: '意向数量', value: String(stats.value?.intentCount ?? 0) },
  { label: '签约类数量', value: String(stats.value?.signedCount ?? 0) },
  { label: '意向率', value: formatVisitRate(stats.value?.intentRate) },
  { label: '签约转化率', value: formatVisitRate(stats.value?.signedRate) },
]);

const dimensionSections = computed(() => [
  buildDimensionSection('渠道商', '渠道商到访意向签约统计柱状图', stats.value?.byChannelPartner ?? []),
  buildDimensionSection('咨询师', '咨询师到访意向签约统计柱状图', stats.value?.byConsultant ?? []),
  buildDimensionSection('接待人', '接待人到访意向签约统计柱状图', stats.value?.byReceptionist ?? []),
]);

const distributionSections = computed(() => [
  buildDistributionSection('接待状态', '接待状态分布统计柱状图', stats.value?.byReceptionStatus ?? [], '#0EA5E9'),
  buildDistributionSection('咨询后状态', '咨询后状态分布统计柱状图', stats.value?.byConsultationStatus ?? [], '#8B5CF6'),
  buildDistributionSection('状态类别', '状态类别分布统计柱状图', stats.value?.byStatusCategory ?? [], '#F97316'),
  buildDistributionSection('试听课后状态', '试听课后状态分布统计柱状图', stats.value?.byTrialStatus ?? [], '#14B8A6'),
]);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    dateFrom.value = props.initialDateFrom ?? '';
    dateTo.value = props.initialDateTo ?? '';
    void loadStats();
  },
);

async function loadStats() {
  loadError.value = false;
  try {
    await store.fetchStats({ dateFrom: dateFrom.value, dateTo: dateTo.value });
  } catch {
    loadError.value = true;
  }
}

function clearDates() {
  dateFrom.value = '';
  dateTo.value = '';
  void loadStats();
}

function close() {
  emit('update:modelValue', false);
}

function topRows<T>(rows: T[]) {
  return rows.slice(0, 10);
}

function buildDimensionSection(title: string, ariaLabel: string, rows: VisitStatsDimensionRow[]) {
  const chartRows = topRows(rows);
  return {
    title,
    ariaLabel,
    rows,
    chartData: {
      labels: chartRows.map((row) => row.name),
      datasets: [
        { label: '到访', backgroundColor: '#2563EB', data: chartRows.map((row) => row.total) },
        { label: '意向', backgroundColor: '#16A34A', data: chartRows.map((row) => row.intentCount) },
        { label: '签约类', backgroundColor: '#DC2626', data: chartRows.map((row) => row.signedCount) },
      ],
    } as ChartData<'bar'>,
  };
}

function buildDistributionSection(title: string, ariaLabel: string, rows: VisitStatsDistributionRow[], color: string) {
  const chartRows = topRows(rows);
  return {
    title,
    ariaLabel,
    rows,
    chartData: {
      labels: chartRows.map((row) => row.name),
      datasets: [{ label: title, backgroundColor: color, data: chartRows.map((row) => row.count) }],
    } as ChartData<'bar'>,
  };
}
</script>

<style scoped>
.visit-stats-panel {
  width: min(1180px, 96vw);
  max-width: 1180px;
}

.summary-grid,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.stats-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.chart-box {
  height: 300px;
  min-height: 300px;
}

.stats-table {
  font-size: 13px;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 1023px) {
  .summary-grid,
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .visit-stats-panel {
    width: 100vw;
    max-width: 100vw;
  }
}
</style>
