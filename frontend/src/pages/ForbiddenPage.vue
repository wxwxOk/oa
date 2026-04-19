<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center" style="min-height: 100vh; background: var(--oa-bg)">
        <div class="text-center">
          <div style="font-size: 72px; font-weight: 600; line-height: 1; color: var(--oa-text-tertiary)">
            403
          </div>
          <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
            无权限访问
          </div>
          <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
            您没有权限访问此页面，请联系管理员获取相应权限
          </div>
          <q-btn color="primary" label="返回首页" to="/" class="q-mt-lg" style="border-radius: 8px" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
