<template>
  <q-layout view="hHh Lpr lff">
    <!-- 顶栏：PC+Mobile 共用，内容按断点切换 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- 移动端：汉堡菜单开关 overlay Drawer -->
        <q-btn v-if="isMobile" flat dense round icon="menu" @click="mobileDrawerOpen = !mobileDrawerOpen" />
        <!-- PC 端：汉堡菜单开关固定 Drawer -->
        <q-btn v-else flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title>OA 管理系统</q-toolbar-title>
        <q-space />
        <q-btn flat round dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="toggleDark" />
        <!-- PC 端：用户名下拉 -->
        <q-btn-dropdown v-if="isDesktop" flat :label="auth.user?.realName ?? ''" icon="account_circle">
          <q-list>
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>退出登录</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <!-- 移动端：仅头像圆形 -->
        <q-avatar v-else size="32px" color="primary" text-color="white" class="q-ml-sm">
          {{ auth.user?.realName?.charAt(0) ?? '' }}
        </q-avatar>
      </q-toolbar>
    </q-header>

    <!-- PC 端固定 Drawer -->
    <q-drawer v-if="isDesktop" v-model="drawerOpen" show-if-above bordered :width="220">
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

    <!-- 移动端 overlay Drawer -->
    <q-drawer v-if="isMobile" v-model="mobileDrawerOpen" overlay bordered :width="280">
      <q-list>
        <q-item-label header>导航</q-item-label>
        <q-item
          v-for="m in visibleMenus"
          :key="m.path"
          clickable
          v-ripple
          :to="m.path"
          active-class="text-primary"
          @click="mobileDrawerOpen = false"
        >
          <q-item-section avatar><q-icon :name="m.icon" /></q-item-section>
          <q-item-section>{{ m.title }}</q-item-section>
        </q-item>
      </q-list>
      <q-space />
      <div style="border-top: 1px solid var(--oa-border)" class="q-pa-md">
        <div class="row items-center q-gutter-sm">
          <q-avatar size="36px" color="primary" text-color="white">
            {{ auth.user?.realName?.charAt(0) ?? '' }}
          </q-avatar>
          <div>
            <div style="font-size: 14px; font-weight: 600">{{ auth.user?.realName }}</div>
            <div style="font-size: 12px; color: var(--oa-text-secondary)">{{ auth.user?.roles?.join(', ') }}</div>
          </div>
        </div>
        <div class="row q-mt-md q-gutter-sm">
          <q-btn flat dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="toggleDark" />
          <q-space />
          <q-btn flat dense icon="logout" label="退出" @click="onLogout" />
        </div>
      </div>
    </q-drawer>

    <!-- 页面容器 + fade 过渡 -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- 移动端底部 Tab -->
    <q-footer v-if="isMobile" bordered style="background: var(--oa-surface); color: var(--oa-text-primary)">
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
import { useResponsive } from 'src/composables/useResponsive';
import { useDarkMode } from 'src/composables/useDarkMode';

const { isDesktop, isMobile } = useResponsive();
const { isDark, toggleDark } = useDarkMode();
const drawerOpen = ref(true);
const mobileDrawerOpen = ref(false);
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
