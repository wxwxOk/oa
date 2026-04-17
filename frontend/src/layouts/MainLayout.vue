<template>
  <q-layout view="hHh Lpr lff" :class="$q.dark.isActive ? '' : 'bg-grey-2'">
    <!-- PC 顶栏 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title>OA 管理系统</q-toolbar-title>
        <q-space />
        <q-btn flat round dense :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" @click="$q.dark.toggle()" />
        <q-btn-dropdown flat :label="auth.user?.realName ?? ''" icon="account_circle">
          <q-list>
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>退出登录</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <!-- 侧边菜单（PC） -->
    <q-drawer v-if="$q.screen.gt.sm" v-model="drawerOpen" show-if-above bordered :width="220">
      <q-list>
        <q-item-label header>导航</q-item-label>
        <q-item
          v-for="m in visibleMenus"
          :key="m.path"
          clickable
          v-ripple
          :to="m.path"
          active-class="text-primary"
        >
          <q-item-section avatar><q-icon :name="m.icon" /></q-item-section>
          <q-item-section>{{ m.title }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- 移动端底部 Tab -->
    <q-footer v-if="$q.screen.lt.md" bordered class="bg-white text-grey-9">
      <q-tabs
        v-model="activeTab"
        dense
        active-color="primary"
        indicator-color="primary"
        align="justify"
        @update:model-value="onTab"
      >
        <q-tab v-for="m in visibleMenus" :key="m.path" :name="m.path" :icon="m.icon" :label="m.title" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';

const drawerOpen = ref(true);
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const allMenus = [
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  { path: '/departments', title: '部门', icon: 'account_tree', perm: 'department:list' },
  { path: '/users', title: '用户', icon: 'people', perm: 'user:list' },
  { path: '/roles', title: '角色', icon: 'security', perm: 'role:list' },
];

const visibleMenus = computed(() => allMenus.filter((m) => !m.perm || auth.hasPerm(m.perm)));

const activeTab = ref(route.path);
watch(() => route.path, (p) => (activeTab.value = p));

function onTab(p: string) {
  router.push(p);
}

function onLogout() {
  auth.logout();
  router.push('/login');
}
</script>
