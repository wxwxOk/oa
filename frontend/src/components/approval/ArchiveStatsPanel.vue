<template>
  <section class="archive-stats-panel">
    <div class="row items-center q-mb-md">
      <div class="section-title">归档统计</div>
      <q-space />
      <q-btn
        flat
        dense
        round
        icon="refresh"
        aria-label="刷新归档统计"
        :loading="loading"
        @click="$emit('reload')"
      >
        <q-tooltip>刷新归档统计</q-tooltip>
      </q-btn>
    </div>

    <q-banner v-if="error" dense rounded class="bg-negative text-white q-mb-md">
      统计数据加载失败，请检查筛选条件后重试。
    </q-banner>

    <div v-if="loading" class="stats-grid">
      <q-card v-for="name in datasetNames" :key="name" flat bordered class="stats-block">
        <q-card-section>
          <q-skeleton type="text" width="40%" />
          <q-skeleton type="rect" height="300px" class="q-mt-sm" />
        </q-card-section>
      </q-card>
    </div>

    <div v-else-if="isEmpty" class="text-center q-pa-lg muted">
      {{ emptyCopy }}
    </div>

    <div v-else class="stats-grid">
      <q-card flat bordered class="stats-block">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">按模板统计</div>
          <div class="chart-box" role="img" aria-label="按模板统计归档数量柱状图">
            <Bar :data="templateChartData" :options="chartOptions" />
          </div>
          <StatsTable :rows="templateRows" />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="stats-block">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">按状态统计</div>
          <StatsTable :rows="statusRows" />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="stats-block">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">按部门统计</div>
          <div class="chart-box" role="img" aria-label="按部门统计归档数量柱状图">
            <Bar :data="departmentChartData" :options="chartOptions" />
          </div>
          <StatsTable :rows="departmentRows" />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="stats-block">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">按月份统计</div>
          <div class="chart-box" role="img" aria-label="按月份统计归档数量柱状图">
            <Bar :data="monthChartData" :options="chartOptions" />
          </div>
          <StatsTable :rows="monthRows" />
        </q-card-section>
      </q-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar } from 'vue-chartjs';
import { archiveStatusLabel, type ArchiveStats } from 'src/types/approvalArchive';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

interface StatTableRow {
  label: string;
  count: number;
}

const props = withDefaults(defineProps<{
  stats: ArchiveStats | null;
  loading?: boolean;
  error?: boolean;
  emptyCopy?: string;
}>(), {
  loading: false,
  error: false,
  emptyCopy: '暂无统计数据',
});

defineEmits<{
  reload: [];
}>();

const datasetNames = ['按模板统计', '按状态统计', '按部门统计', '按月份统计'];
const templateRows = computed<StatTableRow[]>(() =>
  (props.stats?.byTemplate ?? []).map((item) => ({ label: item.templateName, count: item.count })),
);
const statusRows = computed<StatTableRow[]>(() =>
  (props.stats?.byStatus ?? []).map((item) => ({ label: archiveStatusLabel(item.status), count: item.count })),
);
const departmentRows = computed<StatTableRow[]>(() =>
  (props.stats?.byDepartment ?? []).map((item) => ({ label: item.departmentName || '未设置部门', count: item.count })),
);
const monthRows = computed<StatTableRow[]>(() =>
  (props.stats?.byMonth ?? []).map((item) => ({ label: item.month, count: item.count })),
);
const isEmpty = computed(() =>
  [templateRows.value, statusRows.value, departmentRows.value, monthRows.value].every((rows) => rows.length === 0),
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 } },
  },
};

function barData(rows: StatTableRow[], color: string) {
  return {
    labels: rows.map((row) => row.label),
    datasets: [
      {
        label: '归档数量',
        backgroundColor: color,
        data: rows.map((row) => row.count),
      },
    ],
  };
}

const templateChartData = computed(() => barData(templateRows.value, '#4F46E5'));
const departmentChartData = computed(() => barData(departmentRows.value, '#16A34A'));
const monthChartData = computed(() => barData(monthRows.value, '#DC2626'));

const StatsTable = defineComponent({
  name: 'ArchiveStatsTable',
  props: {
    rows: {
      type: Array as () => StatTableRow[],
      required: true,
    },
  },
  setup(tableProps) {
    return () =>
      h('table', { class: 'stats-table q-mt-sm' }, [
        h('thead', [
          h('tr', [
            h('th', { class: 'text-left' }, '维度'),
            h('th', { class: 'text-right' }, '数量'),
          ]),
        ]),
        h('tbody', tableProps.rows.length > 0
          ? tableProps.rows.map((row) =>
              h('tr', { key: row.label }, [
                h('td', { class: 'text-left wrap-text' }, row.label),
                h('td', { class: 'text-right' }, String(row.count)),
              ]),
            )
          : [
              h('tr', [
                h('td', { class: 'text-left muted', colspan: 2 }, '暂无统计数据'),
              ]),
            ]),
      ]);
  },
});
</script>

<style scoped>
.archive-stats-panel {
  margin-top: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.stats-block {
  border-radius: 8px;
  background: var(--oa-surface);
}

.chart-box {
  height: 300px;
  min-height: 300px;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.5;
}

.stats-table th,
.stats-table td {
  border-top: 1px solid var(--oa-border);
  padding: 6px 8px;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 1023px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
