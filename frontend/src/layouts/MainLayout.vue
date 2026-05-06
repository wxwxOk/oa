<template>
  <q-layout view="hHh Lpr lff">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          v-if="isMobile"
          flat
          dense
          round
          icon="menu"
          aria-label="打开导航菜单"
          @click="mobileDrawerOpen = !mobileDrawerOpen"
        >
          <q-tooltip>打开导航菜单</q-tooltip>
        </q-btn>
        <q-btn v-else flat dense round icon="menu" aria-label="切换导航菜单" @click="drawerOpen = !drawerOpen">
          <q-tooltip>切换导航菜单</q-tooltip>
        </q-btn>
        <q-toolbar-title>OA 管理系统</q-toolbar-title>
        <q-space />
        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          :aria-label="isDark ? '切换浅色模式' : '切换深色模式'"
          @click="toggleDark"
        >
          <q-tooltip>{{ isDark ? '切换浅色模式' : '切换深色模式' }}</q-tooltip>
        </q-btn>
        <q-btn-dropdown v-if="isDesktop" flat :label="auth.user?.realName ?? ''" icon="account_circle">
          <q-list>
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>退出登录</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-avatar v-else size="32px" color="primary" text-color="white" class="q-ml-sm">
          {{ auth.user?.realName?.charAt(0) ?? '' }}
        </q-avatar>
      </q-toolbar>
    </q-header>

    <q-drawer v-if="isDesktop" v-model="drawerOpen" show-if-above bordered :width="220">
      <q-list>
        <q-item-label header>导航</q-item-label>
        <template v-for="m in visibleMenus" :key="m.path ?? m.title">
          <q-expansion-item v-if="m.children" :icon="m.icon" :label="m.title" default-opened>
            <q-item
              v-for="child in m.children"
              :key="child.path"
              clickable
              v-ripple
              :to="child.path"
              active-class="text-primary"
              class="q-pl-xl"
            >
              <q-item-section avatar><q-icon :name="child.icon" /></q-item-section>
              <q-item-section>{{ child.title }}</q-item-section>
            </q-item>
          </q-expansion-item>
          <q-item v-else clickable v-ripple :to="m.path" active-class="text-primary">
            <q-item-section avatar><q-icon :name="m.icon" /></q-item-section>
            <q-item-section>{{ m.title }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-drawer v-if="isMobile" v-model="mobileDrawerOpen" overlay bordered :width="280">
      <q-list>
        <q-item-label header>导航</q-item-label>
        <template v-for="m in visibleMenus" :key="m.path ?? m.title">
          <q-expansion-item v-if="m.children" :icon="m.icon" :label="m.title" default-opened>
            <q-item
              v-for="child in m.children"
              :key="child.path"
              clickable
              v-ripple
              :to="child.path"
              active-class="text-primary"
              class="q-pl-xl"
              @click="mobileDrawerOpen = false"
            >
              <q-item-section avatar><q-icon :name="child.icon" /></q-item-section>
              <q-item-section>{{ child.title }}</q-item-section>
            </q-item>
          </q-expansion-item>
          <q-item
            v-else
            clickable
            v-ripple
            :to="m.path"
            active-class="text-primary"
            @click="mobileDrawerOpen = false"
          >
            <q-item-section avatar><q-icon :name="m.icon" /></q-item-section>
            <q-item-section>{{ m.title }}</q-item-section>
          </q-item>
        </template>
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
          <q-btn
            flat
            dense
            :icon="isDark ? 'light_mode' : 'dark_mode'"
            :aria-label="isDark ? '切换浅色模式' : '切换深色模式'"
            @click="toggleDark"
          >
            <q-tooltip>{{ isDark ? '切换浅色模式' : '切换深色模式' }}</q-tooltip>
          </q-btn>
          <q-space />
          <q-btn flat dense icon="logout" label="退出" @click="onLogout" />
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <q-footer v-if="isMobile" bordered style="background: var(--oa-surface); color: var(--oa-text-primary)">
      <q-tabs
        v-model="activeTab"
        dense
        active-color="primary"
        indicator-color="primary"
        align="justify"
        @update:model-value="onTab"
      >
        <q-tab v-for="m in flattenedVisibleMenus" :key="m.path" :name="m.path" :icon="m.icon" :label="m.title" />
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

interface MenuConfig {
  path?: string;
  title: string;
  icon: string;
  perm?: string;
  permAny?: string[];
  children?: MenuConfig[];
}

const allMenus: MenuConfig[] = [
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  { path: '/departments', title: '部门', icon: 'account_tree', perm: 'department:list' },
  { path: '/users', title: '用户', icon: 'people', perm: 'user:list' },
  { path: '/roles', title: '角色', icon: 'security', perm: 'role:list' },
  { path: '/visits', title: '到访管理', icon: 'groups', perm: 'visit:list' },
  { path: '/reimbursements', title: '报销管理', icon: 'receipt_long', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] },
  { path: '/channel-push', title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] },
  {
    title: '收集统计表', icon: 'assessment',
    children: [
      { path: '/templates', title: '模板管理', icon: 'description', perm: 'form:template:list' },
      { path: '/submissions', title: '统计表', icon: 'bar_chart', perm: 'form:submission:list' },
    ],
  },
];

function filterMenus(menus: MenuConfig[]): MenuConfig[] {
  return menus.reduce<MenuConfig[]>((acc, m) => {
    if (m.children) {
      const children = filterMenus(m.children);
      if (children.length > 0) acc.push({ ...m, children });
    } else if ((!m.perm || auth.hasPerm(m.perm)) && (!m.permAny || auth.hasAnyPerm(m.permAny))) {
      acc.push(m);
    }
    return acc;
  }, []);
}

const visibleMenus = computed(() => filterMenus(allMenus));

function flattenMenus(menus: MenuConfig[]): MenuConfig[] {
  return menus.reduce<MenuConfig[]>((acc, m) => {
    if (m.children) acc.push(...flattenMenus(m.children));
    else if (m.path) acc.push(m);
    return acc;
  }, []);
}

const flattenedVisibleMenus = computed(() => flattenMenus(visibleMenus.value));

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
