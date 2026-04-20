<template>
  <div class="form-stats-section q-mt-lg">
    <!-- 区域标题 + 时间筛选 -->
    <div class="row items-center justify-between q-mb-md">
      <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">表单统计</div>
      <div class="row items-center q-gutter-sm">
        <q-btn-group outline>
          <q-btn
            :flat="period !== 'week'"
            :color="period === 'week' ? 'primary' : undefined"
            label="本周"
            @click="setPeriod('week')"
            dense
          />
          <q-btn
            :flat="period !== 'month'"
            :color="period === 'month' ? 'primary' : undefined"
            label="本月"
            @click="setPeriod('month')"
            dense
          />
        </q-btn-group>
        <q-input
          v-model="customRangeDisplay"
          outlined
          dense
          label="自定义范围"
          style="width: 220px"
          readonly
        >
          <template #append>
            <q-icon name="date_range" class="cursor-pointer">
              <q-popup-proxy>
                <q-date
                  v-model="customRange"
                  range
                  mask="YYYY-MM-DD"
                  @update:model-value="onCustomRange"
                />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>
    </div>

    <!-- 加载骨架 -->
    <div v-if="statsLoading" class="row q-gutter-md">
      <q-card
        :class="isDesktop ? 'col-12 col-md-6' : 'col-12'"
        flat
        bordered
      >
        <q-card-section>
          <q-skeleton type="rect" height="200px" />
        </q-card-section>
      </q-card>
      <q-card
        :class="isDesktop ? 'col-12 col-md-6' : 'col-12'"
        flat
        bordered
      >
        <q-card-section>
          <q-skeleton type="rect" height="200px" />
        </q-card-section>
      </q-card>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="stats.length === 0"
      class="text-center q-pa-lg"
      style="color: var(--oa-text-secondary)"
    >
      暂无统计数据
    </div>

    <!-- 统计内容：表格 + 图表 -->
    <div v-else class="row q-gutter-md">
      <!-- 统计表格 -->
      <q-card
        :class="isDesktop ? 'col-12 col-md-6' : 'col-12'"
        flat
        bordered
        style="border-radius: 8px"
      >
        <q-card-section>
          <q-table
            :rows="stats"
            :columns="tableColumns"
            row-key="userId"
            dense
            flat
            hide-bottom
            :pagination="{ rowsPerPage: 0 }"
          />
        </q-card-section>
      </q-card>

      <!-- 柱状图 -->
      <q-card
        :class="isDesktop ? 'col-12 col-md-6' : 'col-12'"
        flat
        bordered
        style="border-radius: 8px"
      >
        <q-card-section>
          <Bar
            :data="chartData"
            :options="chartOptions"
            :style="{ height: '300px' }"
            role="img"
            aria-label="员工分享与收集数量柱状图"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { useResponsive } from 'src/composables/useResponsive';
import { Notify } from 'quasar';
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

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { isDesktop } = useResponsive();

interface StatRow {
  userId: number;
  realName: string;
  shareCount: number;
  submissionCount: number;
}

const stats = ref<StatRow[]>([]);
const statsLoading = ref(true);
const period = ref<'week' | 'month' | 'custom'>('month');
const customRange = ref<{ from: string; to: string } | null>(null);

// 自定义范围显示文本
const customRangeDisplay = computed(() => {
  if (customRange.value && customRange.value.from && customRange.value.to) {
    return `${customRange.value.from} ~ ${customRange.value.to}`;
  }
  return '';
});

const tableColumns = [
  {
    name: 'realName',
    label: '员工姓名',
    field: 'realName',
    align: 'left' as const,
  },
  {
    name: 'shareCount',
    label: '分享次数',
    field: 'shareCount',
    align: 'center' as const,
  },
  {
    name: 'submissionCount',
    label: '收集数量',
    field: 'submissionCount',
    align: 'center' as const,
  },
];

const chartData = computed(() => ({
  labels: stats.value.map((s) => s.realName),
  datasets: [
    {
      label: '分享次数',
      backgroundColor: '#4F46E5',
      data: stats.value.map((s) => s.shareCount),
    },
    {
      label: '收集数量',
      backgroundColor: '#16A34A',
      data: stats.value.map((s) => s.submissionCount),
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
};

function getDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  if (period.value === 'week') {
    const day = now.getDay() || 7; // 周日=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    return {
      dateFrom: formatDateStr(monday),
      dateTo: formatDateStr(now),
    };
  }
  if (period.value === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: formatDateStr(first),
      dateTo: formatDateStr(now),
    };
  }
  // custom
  if (customRange.value) {
    return {
      dateFrom: customRange.value.from,
      dateTo: customRange.value.to,
    };
  }
  // fallback: 本月
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: formatDateStr(first), dateTo: formatDateStr(now) };
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchStats() {
  statsLoading.value = true;
  try {
    const { dateFrom, dateTo } = getDateRange();
    const { data } = await api.get('/form-stats', {
      params: { dateFrom, dateTo },
    });
    stats.value = data;
  } catch {
    Notify.create({ type: 'warning', message: '统计数据加载失败' });
  } finally {
    statsLoading.value = false;
  }
}

function setPeriod(p: 'week' | 'month') {
  period.value = p;
  customRange.value = null;
  fetchStats();
}

function onCustomRange(val: { from: string; to: string } | null) {
  if (val && val.from && val.to) {
    period.value = 'custom';
    fetchStats();
  }
}

onMounted(fetchStats);
</script>
