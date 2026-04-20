<template>
  <q-page padding>
    <!-- 欢迎词 -->
    <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
      {{ greeting }}，{{ auth.user?.realName }}
    </div>
    <div class="q-mt-xs q-mb-lg" style="font-size: 14px; color: var(--oa-text-secondary)">
      欢迎回到 OA 管理系统
    </div>

    <!-- 统计卡片 -->
    <div :class="isDesktop ? 'row q-gutter-md q-mb-lg' : 'q-gutter-sm q-mb-lg'">
      <q-card v-for="item in statCards" :key="item.label"
              :class="isDesktop ? 'col stat-card' : 'stat-card'" flat bordered
              style="border-radius: 8px; min-height: 120px">
        <q-card-section>
          <div class="row items-center q-gutter-md">
            <div style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--oa-stat-icon-bg)">
              <q-icon :name="item.icon" size="24px" color="primary" />
            </div>
            <div>
              <div style="font-size: 14px; color: var(--oa-text-secondary)">{{ item.label }}</div>
              <div v-if="statsLoading">
                <q-skeleton type="text" width="60px" height="32px" />
              </div>
              <div v-else style="font-size: 32px; font-weight: 600; line-height: 1; color: var(--oa-text-primary)">
                {{ statsError ? '--' : item.value }}
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 快捷操作 -->
    <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)" class="q-mb-md">
      快捷操作
    </div>
    <div :class="isDesktop ? 'row q-gutter-sm' : 'q-gutter-sm'">
      <q-btn v-for="action in quickActions" :key="action.to"
             outline color="primary" :icon="action.icon" :label="action.label"
             :to="action.to" style="border-radius: 8px" />
    </div>

    <!-- 表单统计 — 需要 form:stats:view 权限 -->
    <FormStatsPanel v-if="auth.hasPerm('form:stats:view')" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useResponsive } from 'src/composables/useResponsive';
import { Notify } from 'quasar';
import FormStatsPanel from 'src/components/submission/FormStatsPanel.vue';

const auth = useAuthStore();
const { isDesktop } = useResponsive();

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return '早上好';
  if (h >= 12 && h < 18) return '下午好';
  return '晚上好';
});

const stats = ref({ userCount: 0, departmentCount: 0, roleCount: 0 });
const statsLoading = ref(true);
const statsError = ref(false);

const statCards = computed(() => [
  { icon: 'people', label: '用户总数', value: stats.value.userCount },
  { icon: 'account_tree', label: '部门总数', value: stats.value.departmentCount },
  { icon: 'security', label: '角色总数', value: stats.value.roleCount },
]);

const quickActions = computed(() => {
  const actions = [];
  if (auth.hasPerm('user:create')) actions.push({ icon: 'person_add', label: '新建用户', to: '/users' });
  if (auth.hasPerm('department:create')) actions.push({ icon: 'create_new_folder', label: '新建部门', to: '/departments' });
  if (auth.hasPerm('role:list')) actions.push({ icon: 'admin_panel_settings', label: '角色管理', to: '/roles' });
  return actions;
});

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/stats');
    stats.value = data;
  } catch {
    statsError.value = true;
    Notify.create({ type: 'warning', message: '统计数据加载失败' });
  } finally {
    statsLoading.value = false;
  }
});
</script>
