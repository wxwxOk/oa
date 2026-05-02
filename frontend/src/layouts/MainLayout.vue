<template>
  <q-layout view="hHh Lpr lff">
    <!-- 顶栏：PC+Mobile 共用，内容按断点切换 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- 移动端：汉堡菜单开关 overlay Drawer -->
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
        <!-- PC 端：汉堡菜单开关固定 Drawer -->
        <q-btn v-else flat dense round icon="menu" aria-label="切换导航菜单" @click="drawerOpen = !drawerOpen">
          <q-tooltip>切换导航菜单</q-tooltip>
        </q-btn>
        <q-toolbar-title>OA 管理系统</q-toolbar-title>
        <q-space />
        <q-btn
          v-if="auth.isLogin"
          flat
          round
          dense
          icon="notifications"
          aria-label="站内通知"
          class="q-ml-xs"
          @click.stop="openNotifications"
        >
          <q-badge v-if="notification.unreadCount > 0" floating color="negative">
            {{ unreadBadgeLabel }}
          </q-badge>
          <q-tooltip>站内通知</q-tooltip>
          <q-menu
            v-if="isDesktop"
            v-model="notificationMenuOpen"
            anchor="bottom right"
            self="top right"
            class="notification-menu"
          >
            <div class="notification-panel" @click.stop>
              <div class="notification-panel__header">
                <div class="notification-panel__title">站内通知</div>
                <q-btn
                  v-if="notification.unreadCount > 0"
                  flat
                  dense
                  color="primary"
                  label="全部标为已读"
                  :loading="notification.actionLoading"
                  @click="markAllNotificationsRead"
                />
              </div>
              <q-list v-if="notification.loading && notification.rows.length === 0" separator>
                <q-item v-for="n in 3" :key="n" class="notification-row">
                  <q-item-section side>
                    <q-skeleton type="circle" size="8px" />
                  </q-item-section>
                  <q-item-section>
                    <q-skeleton type="text" width="72%" />
                    <q-skeleton type="text" width="92%" />
                    <q-skeleton type="text" width="42%" />
                  </q-item-section>
                </q-item>
              </q-list>
              <q-list v-else-if="notification.rows.length > 0" separator>
                <q-item
                  v-for="item in notification.rows"
                  :key="item.id"
                  clickable
                  v-ripple
                  class="notification-row"
                  :class="{ 'notification-row--unread': !item.read }"
                  @click="onNotificationClick(item)"
                >
                  <q-item-section side class="notification-row__state">
                    <span v-if="!item.read" class="notification-unread-dot" aria-label="未读" />
                    <span v-else class="notification-read-dot" aria-label="已读" />
                  </q-item-section>
                  <q-item-section>
                    <div class="notification-row__title">{{ item.title }}</div>
                    <div class="notification-row__summary">{{ item.summary }}</div>
                    <div class="notification-row__time">{{ formatDate(item.createdAt) }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="notification-empty">
                <q-icon name="notifications_none" size="32px" color="grey-6" />
                <div class="notification-empty__title">暂无站内通知</div>
                <div class="notification-empty__body">新的待办和审批结果会显示在这里。</div>
              </div>
            </div>
          </q-menu>
        </q-btn>
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

    <!-- 移动端 overlay Drawer -->
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

    <!-- 页面容器 + fade 过渡 -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <q-dialog v-model="notificationDialogOpen" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="notification-dialog">
        <q-toolbar class="bg-primary text-white">
          <q-toolbar-title>站内通知</q-toolbar-title>
          <q-btn flat round dense icon="close" aria-label="关闭站内通知" v-close-popup>
            <q-tooltip>关闭站内通知</q-tooltip>
          </q-btn>
        </q-toolbar>
        <q-card-section class="notification-dialog__actions">
          <q-btn
            v-if="notification.unreadCount > 0"
            flat
            dense
            color="primary"
            label="全部标为已读"
            :loading="notification.actionLoading"
            @click="markAllNotificationsRead"
          />
        </q-card-section>
        <q-card-section class="notification-dialog__body">
          <q-list v-if="notification.loading && notification.rows.length === 0" separator>
            <q-item v-for="n in 4" :key="n" class="notification-row notification-row--mobile">
              <q-item-section side>
                <q-skeleton type="circle" size="8px" />
              </q-item-section>
              <q-item-section>
                <q-skeleton type="text" width="68%" />
                <q-skeleton type="text" width="92%" />
                <q-skeleton type="text" width="48%" />
              </q-item-section>
            </q-item>
          </q-list>
          <q-list v-else-if="notification.rows.length > 0" separator>
            <q-item
              v-for="item in notification.rows"
              :key="item.id"
              clickable
              v-ripple
              class="notification-row notification-row--mobile"
              :class="{ 'notification-row--unread': !item.read }"
              @click="onNotificationClick(item)"
            >
              <q-item-section side class="notification-row__state">
                <span v-if="!item.read" class="notification-unread-dot" aria-label="未读" />
                <span v-else class="notification-read-dot" aria-label="已读" />
              </q-item-section>
              <q-item-section>
                <div class="notification-row__title">{{ item.title }}</div>
                <div class="notification-row__summary">{{ item.summary }}</div>
                <div class="notification-row__time">{{ formatDate(item.createdAt) }}</div>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="notification-empty notification-empty--mobile">
            <q-icon name="notifications_none" size="40px" color="grey-6" />
            <div class="notification-empty__title">暂无站内通知</div>
            <div class="notification-empty__body">新的待办和审批结果会显示在这里。</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

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
        <q-tab v-for="m in flattenedVisibleMenus" :key="m.path" :name="m.path" :icon="m.icon" :label="m.title" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import { useResponsive } from 'src/composables/useResponsive';
import { useDarkMode } from 'src/composables/useDarkMode';
import type { NotificationRow } from 'src/types/notification';

const { isDesktop, isMobile } = useResponsive();
const { isDark, toggleDark } = useDarkMode();
const drawerOpen = ref(true);
const mobileDrawerOpen = ref(false);
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const notification = useNotificationStore();
const notificationMenuOpen = ref(false);
const notificationDialogOpen = ref(false);
let notificationPollTimer: ReturnType<typeof setInterval> | null = null;

const unreadBadgeLabel = computed(() => (notification.unreadCount > 99 ? '99+' : String(notification.unreadCount)));

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
  {
    title: '收集统计表', icon: 'assessment',
    children: [
      { path: '/templates', title: '模板管理', icon: 'description', perm: 'form:template:list' },
      { path: '/share-link-stats', title: '统计表', icon: 'bar_chart', perm: 'form:link-stats:view' },
    ],
  },
  {
    title: '审批管理',
    icon: 'approval',
    children: [
      { path: '/approval/tasks', title: '待我审批', icon: 'fact_check', perm: 'approval:task:list' },
      { path: '/approval/applications', title: '我的申请', icon: 'assignment', perm: 'approval:application:own' },
      {
        path: '/approval/archive',
        title: '归档查询',
        icon: 'inventory_2',
        permAny: ['approval:application:department', 'approval:application:all', 'form:submission:list'],
      },
      { path: '/approval/processes', title: '流程配置', icon: 'rule', perm: 'approval:process:list' },
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
watch(
  () => auth.isLogin,
  (isLogin) => {
    if (isLogin) {
      void refreshUnreadCount();
      startNotificationPolling();
    } else {
      stopNotificationPolling();
      notification.reset();
    }
  },
);

function onTab(p: string) {
  router.push(p);
}

function onLogout() {
  stopNotificationPolling();
  notification.reset();
  auth.logout();
  router.push('/login');
}

function ignoreNotificationRefreshError() {
  // Background notification polling should never interrupt active form work.
}

async function refreshUnreadCount() {
  if (!auth.isLogin) return;
  try {
    await notification.fetchUnreadCount();
  } catch {
    ignoreNotificationRefreshError();
  }
}

async function loadNotifications() {
  if (!auth.isLogin) return;
  try {
    await notification.fetchList({ page: 1, size: notification.size });
  } catch {
    ignoreNotificationRefreshError();
  }
}

function openNotifications() {
  if (isDesktop.value) {
    notificationMenuOpen.value = true;
  } else {
    notificationDialogOpen.value = true;
  }
  void loadNotifications();
}

async function markAllNotificationsRead() {
  try {
    await notification.markAllRead();
    await refreshUnreadCount();
    await loadNotifications();
  } catch {
    ignoreNotificationRefreshError();
  }
}

function isNotificationTargetRoute(targetRoute: string) {
  return targetRoute.startsWith('/approval/tasks/') || targetRoute.startsWith('/approval/applications/');
}

async function onNotificationClick(item: NotificationRow) {
  try {
    if (item.targetRoute && isNotificationTargetRoute(item.targetRoute)) {
      await router.push(item.targetRoute);
    }
    if (!item.read) {
      await notification.markRead(item.id);
      await refreshUnreadCount();
    }
  } catch {
    ignoreNotificationRefreshError();
  } finally {
    notificationMenuOpen.value = false;
    notificationDialogOpen.value = false;
  }
}

function startNotificationPolling() {
  stopNotificationPolling();
  if (!auth.isLogin) return;
  notificationPollTimer = setInterval(() => {
    void refreshUnreadCount();
  }, 60_000);
}

function stopNotificationPolling() {
  if (!notificationPollTimer) return;
  clearInterval(notificationPollTimer);
  notificationPollTimer = null;
}

function onWindowFocus() {
  void refreshUnreadCount();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

onMounted(() => {
  void refreshUnreadCount();
  window.addEventListener('focus', onWindowFocus);
  startNotificationPolling();
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', onWindowFocus);
  stopNotificationPolling();
});
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

.notification-menu {
  width: 360px;
  max-width: calc(100vw - 24px);
}

.notification-panel {
  background: var(--oa-surface);
  color: var(--oa-text-primary);
  width: 360px;
  max-width: calc(100vw - 24px);
}

.notification-panel__header {
  align-items: center;
  border-bottom: 1px solid var(--oa-border);
  display: flex;
  justify-content: space-between;
  min-height: 52px;
  padding: 8px 12px 8px 16px;
}

.notification-panel__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.notification-row {
  cursor: pointer;
  min-height: 56px;
  padding-bottom: 8px;
  padding-top: 8px;
}

.notification-row--mobile {
  min-height: 64px;
}

.notification-row--unread .notification-row__title {
  font-weight: 600;
}

.notification-row__state {
  min-width: 20px;
  padding-right: 8px;
}

.notification-unread-dot,
.notification-read-dot {
  border-radius: 999px;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.notification-unread-dot {
  background: var(--q-negative);
}

.notification-read-dot {
  border: 1px solid var(--oa-border);
}

.notification-row__title {
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.notification-row__summary {
  color: var(--oa-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.notification-row__time {
  color: var(--oa-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.notification-empty {
  align-items: center;
  color: var(--oa-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}

.notification-empty--mobile {
  min-height: 50vh;
  justify-content: center;
}

.notification-empty__title {
  color: var(--oa-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.notification-empty__body {
  font-size: 14px;
  line-height: 1.5;
}

.notification-dialog {
  background: var(--oa-surface);
  color: var(--oa-text-primary);
}

.notification-dialog__actions {
  border-bottom: 1px solid var(--oa-border);
  min-height: 48px;
  padding: 6px 16px;
  text-align: right;
}

.notification-dialog__body {
  padding: 0;
}
</style>
