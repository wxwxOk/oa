<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="login-page flex flex-center">
        <!-- 装饰圆形 -->
        <div class="login-decor login-decor--1"></div>
        <div class="login-decor login-decor--2"></div>

        <q-card class="login-card q-pa-lg shadow-4" style="width: 400px; max-width: 90vw; border-radius: 12px; z-index: 1; background: var(--oa-surface)">
          <!-- 暗色切换按钮 -->
          <q-btn flat round dense size="sm" :icon="isDark ? 'light_mode' : 'dark_mode'"
                 @click="toggleDark" style="position: absolute; top: 12px; right: 12px" />

          <q-card-section class="text-center">
            <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)" class="text-primary">
              OA 管理系统
            </div>
            <div class="q-mt-xs" style="font-size: 14px; color: var(--oa-text-secondary)">
              请使用您的账号登录
            </div>
          </q-card-section>
          <q-form @submit="onLogin" class="q-gutter-md">
            <q-input v-model="form.username" label="用户名" outlined :rules="[(v) => !!v || '必填']" />
            <q-input v-model="form.password" label="密码" outlined
                     :type="showPwd ? 'text' : 'password'" :rules="[(v) => !!v || '必填']">
              <template #append>
                <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPwd = !showPwd" />
              </template>
            </q-input>
            <q-btn type="submit" color="primary" class="full-width" :loading="loading" label="立即登录" />
            <div class="text-center" style="font-size: 12px; color: var(--oa-text-secondary)">
              默认账号: admin / admin123
            </div>
          </q-form>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { useDarkMode } from 'src/composables/useDarkMode';
import { Notify } from 'quasar';

const { isDark, toggleDark } = useDarkMode();
const form = reactive({ username: 'admin', password: 'admin123' });
const showPwd = ref(false);
const loading = ref(false);
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onLogin() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    Notify.create({ type: 'positive', message: '登录成功' });
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(135deg, var(--oa-login-gradient-start) 0%, var(--oa-login-gradient-end) 100%);
  position: relative;
  overflow: hidden;
  min-height: 100vh;
}
.login-decor {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}
.body--dark .login-decor {
  background: rgba(255, 255, 255, 0.05);
}
.login-decor--1 {
  width: 200px;
  height: 200px;
  top: -60px;
  left: -60px;
}
.login-decor--2 {
  width: 150px;
  height: 150px;
  bottom: -40px;
  right: -40px;
}
</style>
