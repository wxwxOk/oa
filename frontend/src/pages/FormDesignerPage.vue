<template>
  <div class="designer-page">
    <!-- Toolbar -->
    <div class="designer-toolbar row items-center no-wrap">
      <q-btn flat dense icon="arrow_back" aria-label="返回模板列表" @click="router.push('/templates')" />
      <span class="text-h6 q-ml-sm ellipsis">{{ store.current?.name ?? '' }}</span>
      <q-space />
      <q-btn flat label="保存设计" :loading="saving" @click="handleSave" />
      <q-btn
        v-if="store.current?.status !== 'PUBLISHED'"
        color="primary"
        label="发布模板"
        class="q-ml-sm"
        @click="handlePublish"
      />
      <q-btn
        v-else
        color="negative"
        label="下线模板"
        class="q-ml-sm"
        @click="handleOffline"
      />
    </div>

    <!-- 3-panel layout -->
    <div v-if="loading" class="flex flex-center" style="flex: 1">
      <q-spinner color="primary" size="3em" />
    </div>
    <div v-else class="designer-body row no-wrap">
      <FieldPalette />
      <DesignerCanvas />
      <PropertyEditor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useTemplateStore } from 'src/stores/template';
import FieldPalette from 'src/components/designer/FieldPalette.vue';
import DesignerCanvas from 'src/components/designer/DesignerCanvas.vue';
import PropertyEditor from 'src/components/designer/PropertyEditor.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const store = useTemplateStore();

const loading = ref(true);
const saving = ref(false);

const templateId = Number(route.params.id);

onMounted(async () => {
  try {
    await store.fetchOne(templateId);
  } catch {
    $q.notify({ type: 'negative', message: '模板加载失败' });
    router.push('/templates');
  } finally {
    loading.value = false;
  }
});

async function handleSave() {
  if (!store.current) return;
  saving.value = true;
  try {
    const prev = store.current.schemaVersion;
    await store.update(templateId, { schema: store.current.schema });
    $q.notify({ type: 'positive', message: '保存成功' });
    if (store.current.schemaVersion > prev) {
      $q.notify({ type: 'info', message: `模板已更新至 v${store.current.schemaVersion}` });
    }
  } catch {
    $q.notify({ type: 'negative', message: '保存失败' });
  } finally {
    saving.value = false;
  }
}

function handlePublish() {
  $q.dialog({
    title: '发布模板',
    message: '发布后模板可用于生成分享链接。确认发布？',
    cancel: true,
    ok: { label: '确认发布', color: 'primary' },
  }).onOk(async () => {
    try {
      await store.changeStatus(templateId, 'publish');
      $q.notify({ type: 'positive', message: '已发布' });
    } catch {
      $q.notify({ type: 'negative', message: '发布失败' });
    }
  });
}

function handleOffline() {
  $q.dialog({
    title: '下线模板',
    message: '下线后已有分享链接将无法填写。确认下线？',
    cancel: true,
    ok: { label: '确认下线', color: 'warning' },
  }).onOk(async () => {
    try {
      await store.changeStatus(templateId, 'offline');
      $q.notify({ type: 'positive', message: '已下线' });
    } catch {
      $q.notify({ type: 'negative', message: '下线失败' });
    }
  });
}
</script>

<style scoped>
.designer-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
}
.designer-toolbar {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--oa-border);
  flex-shrink: 0;
}
.designer-body {
  flex: 1;
  overflow: hidden;
}
</style>
