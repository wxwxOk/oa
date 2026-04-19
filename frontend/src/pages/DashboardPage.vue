<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">欢迎, {{ auth.user?.realName }}</div>

    <!-- 统计卡片 -->
    <div :class="isDesktop ? 'row q-gutter-md' : 'q-gutter-sm'">
      <q-card v-for="card in statCards" :key="card.label" flat bordered
              :class="isDesktop ? 'col' : ''" style="border-radius: 8px">
        <q-card-section>
          <div class="row items-center q-gutter-sm">
            <q-icon :name="card.icon" size="28px" color="primary" />
            <div>
              <div style="font-size: 12px; color: var(--oa-text-secondary)">{{ card.label }}</div>
              <div v-if="statsLoading" style="margin-top: 4px">
                <q-skeleton type="text" width="40px" />
              </div>
              <div v-else style="font-size: 24px; font-weight: 700; color: var(--oa-text-primary)">
                {{ card.value }}
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 快捷入口 -->
    <div class="q-mt-lg">
      <div class="text-subtitle1 q-mb-sm">快捷入口</div>
      <div :class="isDesktop ? 'row q-gutter-md' : 'q-gutter-sm'">
        <q-card v-for="link in quickLinks" :key="link.to" flat bordered clickable
                :class="isDesktop ? 'col' : ''" style="border-radius: 8px; cursor: pointer"
                @click="$router.push(link.to)">
          <q-card-section class="text-center">
            <q-icon :name="link.icon" size="32px" color="primary" />
            <div class="q-mt-xs" style="font-size: 14px; color: var(--oa-text-primary)">{{ link.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from 'src/stores/auth';
import { useResponsive } from 'src/composables/useResponsive';
import { api } from 'src/boot/axios';

const auth = useAuthStore();
const { isDesktop } = useResponsive();

const statsLoading = ref(true);
const stats = ref({ userCount: 0, deptCount: 0, roleCount: 0 });

const statCards = computed(() => [
  { icon: 'people', label: '活跃用户', value: stats.value.userCount },
  { icon: 'account_tree', label: '部门数量', value: stats.value.deptCount },
  { icon: 'security', label: '角色数量', value: stats.value.roleCount },
]);

const quickLinks = [
  { icon: 'people', label: '用户管理', to: '/users' },
  { icon: 'account_tree', label: '部门管理', to: '/departments' },
  { icon: 'security', label: '角色权限', to: '/roles' },
];

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/stats');
    stats.value = data;
  } catch {
    // 静默失败，显示 0
  } finally {
    statsLoading.value = false;
  }
});
</script>
