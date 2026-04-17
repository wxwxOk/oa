<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">欢迎, {{ auth.user?.realName }}</div>
    <div class="row q-gutter-md">
      <q-card class="col-12 col-sm">
        <q-card-section>
          <div class="text-subtitle2 text-grey">当前角色</div>
          <div class="text-h6">{{ auth.user?.roles.join(', ') }}</div>
        </q-card-section>
      </q-card>
      <q-card class="col-12 col-sm">
        <q-card-section>
          <div class="text-subtitle2 text-grey">权限数量</div>
          <div class="text-h6">{{ auth.user?.permissions.length ?? 0 }}</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth';
const auth = useAuthStore();
</script>
