<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row items-center justify-evenly" style="min-height: 100vh">
        <q-card class="q-pa-md" style="width: 360px; max-width: 90vw">
          <q-card-section class="text-center">
            <div class="text-h5 text-primary">OA 管理系统</div>
            <div class="text-caption text-grey">请使用您的账号登录</div>
          </q-card-section>
          <q-form @submit="onLogin" class="q-gutter-md">
            <q-input v-model="form.username" label="用户名" outlined :rules="[(v) => !!v || '必填']" />
            <q-input
              v-model="form.password"
              label="密码"
              outlined
              :type="showPwd ? 'text' : 'password'"
              :rules="[(v) => !!v || '必填']"
            >
              <template #append>
                <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPwd = !showPwd" />
              </template>
            </q-input>
            <q-btn type="submit" color="primary" class="full-width" :loading="loading" label="登录" />
            <div class="text-caption text-grey text-center">默认账号: admin / admin123</div>
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
import { Notify } from 'quasar';

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
