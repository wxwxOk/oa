<template>
  <div class="designer-page">
    <!-- Toolbar -->
    <div class="designer-toolbar row items-center no-wrap">
      <q-btn flat dense icon="arrow_back" aria-label="返回模板列表" @click="router.push('/templates')" />
      <span class="text-h6 q-ml-sm ellipsis">{{ store.current?.name ?? '' }}</span>
      <q-space />
      <q-toggle
        v-if="store.current"
        v-model="store.current.requireIdentity"
        label="要求填写者提供身份信息"
        dense
        class="q-mr-md"
      />
      <q-select
        v-if="store.current"
        v-model="store.current.businessMode"
        class="template-purpose-select q-mr-sm"
        outlined
        dense
        emit-value
        map-options
        label="用途"
        :options="businessModeOptions"
        :disable="!canBindApprovalTemplate || saving"
        @update:model-value="onBusinessModeChange"
      >
        <q-tooltip v-if="!canBindApprovalTemplate">缺少权限: approval:template:bind</q-tooltip>
      </q-select>
      <q-select
        v-if="store.current?.businessMode === 'APPROVAL_REQUIRED'"
        v-model="store.current.approvalProcessId"
        class="approval-process-select q-mr-md"
        outlined
        dense
        emit-value
        map-options
        label="审批流程"
        :options="approvalProcessOptions"
        :loading="approvalProcessStore.loading"
        :disable="!canBindApprovalTemplate || saving"
        :error="approvalProcessError"
        error-message="请选择启用且有效的审批流程"
        @update:model-value="approvalProcessError = false"
      >
        <q-tooltip v-if="!canBindApprovalTemplate">缺少权限: approval:template:bind</q-tooltip>
      </q-select>
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
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useTemplateStore } from 'src/stores/template';
import { useApprovalProcessStore } from 'src/stores/approvalProcess';
import { useAuthStore } from 'src/stores/auth';
import type { TemplateBusinessMode } from 'src/stores/template';
import FieldPalette from 'src/components/designer/FieldPalette.vue';
import DesignerCanvas from 'src/components/designer/DesignerCanvas.vue';
import PropertyEditor from 'src/components/designer/PropertyEditor.vue';

const APPROVAL_TEMPLATE_BIND_PERM = 'approval:template:bind';
const MISSING_PROCESS_MESSAGE = '请选择启用且有效的审批流程';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const store = useTemplateStore();
const approvalProcessStore = useApprovalProcessStore();
const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const approvalProcessError = ref(false);
const originalBusinessMode = ref<TemplateBusinessMode>('COLLECTION_ONLY');
const originalApprovalProcessId = ref<number | null>(null);

const templateId = Number(route.params.id);

const businessModeOptions = [
  { label: '仅收集', value: 'COLLECTION_ONLY' },
  { label: '需审批', value: 'APPROVAL_REQUIRED' },
];

const canBindApprovalTemplate = computed(() => auth.hasPerm(APPROVAL_TEMPLATE_BIND_PERM));

const approvalProcessOptions = computed(() =>
  approvalProcessStore.rows
    .filter((process) => process.isActive)
    .map((process) => ({ label: process.name, value: process.id })),
);

onMounted(async () => {
  try {
    await store.fetchOne(templateId);
    syncOriginalBinding();
    if (canBindApprovalTemplate.value) {
      approvalProcessStore.page = 1;
      approvalProcessStore.size = 100;
      await approvalProcessStore.fetchList({ isActive: true });
    }
  } catch {
    $q.notify({ type: 'negative', message: '模板加载失败' });
    router.push('/templates');
  } finally {
    loading.value = false;
  }
});

function syncOriginalBinding() {
  if (!store.current) return;
  originalBusinessMode.value = store.current.businessMode;
  originalApprovalProcessId.value = store.current.approvalProcessId;
}

function restoreOriginalBinding() {
  if (!store.current) return;
  store.current.businessMode = originalBusinessMode.value;
  store.current.approvalProcessId = originalApprovalProcessId.value;
  approvalProcessError.value = false;
}

function onBusinessModeChange(mode: TemplateBusinessMode) {
  approvalProcessError.value = false;
  if (mode === 'COLLECTION_ONLY' && store.current) {
    store.current.approvalProcessId = null;
  }
}

function validateApprovalProcessSelection() {
  if (store.current?.businessMode !== 'APPROVAL_REQUIRED') {
    approvalProcessError.value = false;
    return true;
  }
  approvalProcessError.value = store.current.approvalProcessId == null;
  if (approvalProcessError.value) {
    $q.notify({ type: 'negative', message: MISSING_PROCESS_MESSAGE });
    return false;
  }
  return true;
}

function shouldConfirmPublicDisconnect() {
  return (
    store.current?.status === 'PUBLISHED' &&
    originalBusinessMode.value === 'COLLECTION_ONLY' &&
    store.current.businessMode === 'APPROVAL_REQUIRED'
  );
}

async function saveTemplate(disconnectPublicCollection = false) {
  if (!store.current) return;
  saving.value = true;
  try {
    const prev = store.current.schemaVersion;
    await store.update(templateId, {
      schema: store.current.schema,
      requireIdentity: store.current.requireIdentity,
      businessMode: store.current.businessMode,
      approvalProcessId: store.current.approvalProcessId,
      ...(disconnectPublicCollection ? { disconnectPublicCollection: true } : {}),
    });
    $q.notify({ type: 'positive', message: '保存成功' });
    if (store.current.schemaVersion > prev) {
      $q.notify({ type: 'info', message: `模板已更新至 v${store.current.schemaVersion}` });
    }
    syncOriginalBinding();
  } catch {
    $q.notify({ type: 'negative', message: '保存失败' });
  } finally {
    saving.value = false;
  }
}

async function handleSave() {
  if (!store.current) return;
  if (!validateApprovalProcessSelection()) return;
  if (shouldConfirmPublicDisconnect()) {
    $q.dialog({
      title: '切换为需审批',
      message: '切换后将断开公开收集入口，已有分享链接不可继续填写。确认切换为需审批？',
      cancel: true,
      persistent: true,
      ok: { label: '断开公开收集并切换', color: 'primary' },
    })
      .onOk(() => {
        void saveTemplate(true);
      })
      .onCancel(() => {
        restoreOriginalBinding();
      });
    return;
  }
  await saveTemplate();
}

function handlePublish() {
  if (!store.current) return;
  if (store.current.businessMode === 'APPROVAL_REQUIRED' && !validateApprovalProcessSelection()) {
    return;
  }
  const message = store.current.businessMode === 'APPROVAL_REQUIRED'
    ? '发布后员工可提交审批申请。请确认已绑定启用且有效的审批流程。'
    : '发布后模板可用于生成分享链接。确认发布？';
  $q.dialog({
    title: '发布模板',
    message,
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
.template-purpose-select {
  width: 140px;
}
.approval-process-select {
  width: 220px;
}
.designer-body {
  flex: 1;
  overflow: hidden;
}
</style>
