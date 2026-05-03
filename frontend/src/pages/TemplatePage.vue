<template>
  <q-page padding>
    <!-- Toolbar -->
    <div class="row items-center q-mb-md">
      <div class="text-h6">模板管理</div>
      <q-space />
      <q-btn v-perm="'form:template:create'" color="primary" icon="add" label="创建模板" @click="openCreate" />
    </div>

    <!-- Filters -->
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-btn-toggle
        v-model="store.statusFilter"
        toggle-color="primary"
        flat
        bordered
        :options="[
          { label: '全部', value: '' },
          { label: '草稿', value: 'DRAFT' },
          { label: '已发布', value: 'PUBLISHED' },
          { label: '已下线', value: 'OFFLINE' },
        ]"
        @update:model-value="onFilterChange"
      />
      <q-btn-toggle
        v-model="store.businessModeFilter"
        toggle-color="primary"
        flat
        bordered
        :options="[
          { label: '全部用途', value: '' },
          { label: '仅收集', value: 'COLLECTION_ONLY' },
          { label: '需审批', value: 'APPROVAL_REQUIRED' },
        ]"
        @update:model-value="onFilterChange"
      />
    </div>

    <!-- Loading skeleton (first load) -->
    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="q-mb-sm" style="border-radius: 8px">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="40%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <div class="text-body1">加载失败，请检查网络后重试</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="description"
      title="暂无模板"
      description="创建第一个表单模板开始收集信息"
      cta-text="创建模板"
      @action="openCreate"
    />

    <!-- Data: PC table -->
    <template v-else>
      <q-table
        v-if="isDesktop"
        :rows="store.rows"
        :columns="columns"
        row-key="id"
        :loading="store.loading"
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50]"
        flat
        bordered
        dense
        @request="onRequest"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="statusColor(props.row.status)"
              text-color="white"
              :label="statusLabel(props.row.status)"
            />
          </q-td>
        </template>
        <template #body-cell-purpose="props">
          <q-td :props="props">
            <q-badge
              :color="purposeColor(props.row.businessMode)"
              text-color="white"
              :label="purposeLabel(props.row.businessMode)"
            />
          </q-td>
        </template>
        <template #body-cell-schemaVersion="props">
          <q-td :props="props">
            <span class="text-caption">v{{ props.row.schemaVersion }}</span>
          </q-td>
        </template>
        <template #body-cell-updatedAt="props">
          <q-td :props="props">
            {{ formatDate(props.row.updatedAt) }}
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              v-if="$q.screen.gt.sm"
              v-perm="'form:template:edit'"
              size="sm" flat dense icon="edit_note"
              @click="$router.push(`/templates/${props.row.id}/design`)"
            >
              <q-tooltip>编辑设计</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'PUBLISHED' && props.row.businessMode === 'COLLECTION_ONLY'"
              v-perm="'form:template:share'"
              size="sm" flat dense icon="share" color="primary"
              @click="openShare(props.row)"
            >
              <q-tooltip>分享链接</q-tooltip>
            </q-btn>
            <q-btn
              v-else-if="props.row.status === 'PUBLISHED' && props.row.businessMode === 'APPROVAL_REQUIRED'"
              v-perm="'form:template:share'"
              size="sm" flat dense icon="share" color="grey-6"
              disable
            >
              <q-tooltip>需审批模板不生成公开分享链接</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.businessMode === 'COLLECTION_ONLY'"
              v-perm="'form:submission:list'"
              size="sm" flat dense icon="visibility" color="primary"
              @click="$router.push(`/templates/${props.row.id}/submissions`)"
            >
              <q-tooltip>查看提交</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'DRAFT' || props.row.status === 'OFFLINE'"
              v-perm="'form:template:publish'"
              size="sm" flat dense icon="publish" color="primary"
              @click="onPublish(props.row)"
            >
              <q-tooltip>发布模板</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'PUBLISHED'"
              v-perm="'form:template:publish'"
              size="sm" flat dense icon="unpublished" color="warning"
              @click="onOffline(props.row)"
            >
              <q-tooltip>下线模板</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'DRAFT' || props.row.status === 'OFFLINE'"
              v-perm="'form:template:delete'"
              size="sm" flat dense icon="delete" color="negative"
              @click="onDelete(props.row)"
            >
              <q-tooltip>删除模板</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <!-- Data: Mobile cards -->
      <div v-else class="q-gutter-sm">
        <q-card v-for="t in store.rows" :key="t.id" flat bordered>
          <q-card-section>
            <div class="row items-center">
              <div class="text-subtitle1">{{ t.name }}</div>
              <q-space />
              <div class="row items-center q-gutter-xs">
                <q-badge
                  :color="statusColor(t.status)"
                  text-color="white"
                  :label="statusLabel(t.status)"
                />
                <q-badge
                  :color="purposeColor(t.businessMode)"
                  text-color="white"
                  :label="purposeLabel(t.businessMode)"
                />
              </div>
            </div>
            <div class="text-caption q-mt-xs" style="color: var(--oa-text-secondary)">
              v{{ t.schemaVersion }} · {{ formatDate(t.updatedAt) }}
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              v-perm="'form:template:edit'"
              flat dense icon="edit_note"
              aria-label="编辑设计"
              @click="$router.push(`/templates/${t.id}/design`)"
            >
              <q-tooltip>编辑设计</q-tooltip>
            </q-btn>
            <q-btn
              v-if="t.status === 'PUBLISHED' && t.businessMode === 'COLLECTION_ONLY'"
              v-perm="'form:template:share'"
              flat dense icon="share" color="primary"
              aria-label="分享链接"
              @click="openShare(t)"
            >
              <q-tooltip>分享链接</q-tooltip>
            </q-btn>
            <q-btn
              v-else-if="t.status === 'PUBLISHED' && t.businessMode === 'APPROVAL_REQUIRED'"
              v-perm="'form:template:share'"
              flat dense icon="share" color="grey-6"
              aria-label="需审批模板不生成公开分享链接"
              disable
            >
              <q-tooltip>需审批模板不生成公开分享链接</q-tooltip>
            </q-btn>
            <q-btn
              v-if="t.businessMode === 'COLLECTION_ONLY'"
              v-perm="'form:submission:list'"
              flat dense icon="visibility" color="primary"
              aria-label="查看提交"
              @click="$router.push(`/templates/${t.id}/submissions`)"
            >
              <q-tooltip>查看提交</q-tooltip>
            </q-btn>
            <q-btn
              v-if="t.status === 'DRAFT' || t.status === 'OFFLINE'"
              v-perm="'form:template:publish'"
              flat dense icon="publish" color="primary"
              aria-label="发布模板"
              @click="onPublish(t)"
            >
              <q-tooltip>发布模板</q-tooltip>
            </q-btn>
            <q-btn
              v-if="t.status === 'PUBLISHED'"
              v-perm="'form:template:publish'"
              flat dense icon="unpublished" color="warning"
              aria-label="下线模板"
              @click="onOffline(t)"
            >
              <q-tooltip>下线模板</q-tooltip>
            </q-btn>
            <q-btn
              v-if="t.status === 'DRAFT' || t.status === 'OFFLINE'"
              v-perm="'form:template:delete'"
              flat dense icon="delete" color="negative"
              aria-label="删除模板"
              @click="onDelete(t)"
            >
              <q-tooltip>删除模板</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <!-- Create dialog -->
    <q-dialog v-model="createDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="text-h6">创建模板</q-card-section>
        <q-form ref="createFormRef" greedy>
          <q-card-section class="q-gutter-sm">
            <q-input
              v-model="createForm.name"
              outlined
              label="模板名称"
              lazy-rules="ondemand"
              :rules="[
                (v: string) => !!v || '请输入模板名称',
                (v: string) => v.length <= 50 || '模板名称不超过 50 个字符',
              ]"
            />
            <q-input
              v-model="createForm.description"
              outlined
              type="textarea"
              label="描述"
            />
          </q-card-section>
        </q-form>
        <q-card-actions align="right">
          <q-btn flat label="放弃创建" v-close-popup />
          <q-btn color="primary" label="保存模板" @click="onCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <ShareDialog v-model="shareDialog" :template-id="shareTemplateId" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { QForm } from 'quasar';
import { Dialog, Notify } from 'quasar';
import { useRouter } from 'vue-router';
import { useTemplateStore } from 'src/stores/template';
import { useResponsive } from 'src/composables/useResponsive';
import EmptyState from 'src/components/EmptyState.vue';
import ShareDialog from 'src/components/ShareDialog.vue';
import type { Template } from 'src/stores/template';

const store = useTemplateStore();
const router = useRouter();
const { isDesktop } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const createDialog = ref(false);
const createFormRef = ref<QForm | null>(null);
const createForm = reactive({ name: '', description: '' });

const shareDialog = ref(false);
const shareTemplateId = ref(0);

function openShare(row: Template) {
  shareTemplateId.value = row.id;
  shareDialog.value = true;
}

const columns = [
  { name: 'name', label: '模板名称', field: 'name', align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const, style: 'width:80px' },
  { name: 'purpose', label: '用途', field: 'businessMode', align: 'center' as const, style: 'width:80px' },
  { name: 'schemaVersion', label: '版本', field: 'schemaVersion', align: 'center' as const, style: 'width:60px' },
  { name: 'creator', label: '创建者', field: (row: Template) => row.creator?.realName, align: 'left' as const, style: 'width:100px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:160px' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' as const, style: 'width:180px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'warning', label: '草稿' },
  PUBLISHED: { color: 'positive', label: '已发布' },
  OFFLINE: { color: 'grey-5', label: '已下线' },
};

function statusColor(s: string) { return STATUS_MAP[s]?.color ?? 'grey'; }
function statusLabel(s: string) { return STATUS_MAP[s]?.label ?? s; }
function purposeColor(mode: Template['businessMode']) {
  return mode === 'APPROVAL_REQUIRED' ? 'primary' : 'blue-grey-6';
}
function purposeLabel(mode: Template['businessMode']) {
  return mode === 'APPROVAL_REQUIRED' ? '需审批' : '仅收集';
}

function formatDate(val: string) {
  return new Date(val).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(/\//g, '-');
}

async function load() {
  try {
    await store.fetchList();
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  store.page = props.pagination.page;
  store.size = props.pagination.rowsPerPage;
  load();
}

function onFilterChange() {
  store.page = 1;
  load();
}

function openCreate() {
  createForm.name = '';
  createForm.description = '';
  createDialog.value = true;
}

async function onCreate() {
  const valid = await createFormRef.value?.validate();
  if (!valid) return;
  await store.create(createForm.name, createForm.description || undefined);
  Notify.create({ type: 'positive', message: '保存成功' });
  createDialog.value = false;
  await load();
}

function onDelete(row: Template) {
  Dialog.create({
    title: '删除模板',
    message: `将从模板管理中隐藏模板「${row.name}」，历史统计和提交数据会保留。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    await store.remove(row.id);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}

function onPublish(row: Template) {
  const message = row.businessMode === 'APPROVAL_REQUIRED'
    ? '发布后员工可提交审批申请。请确认已绑定启用且有效的审批流程。'
    : '发布后模板可用于生成分享链接。确认发布？';
  Dialog.create({
    title: '发布模板',
    message,
    cancel: true,
    ok: { label: '确认发布', color: 'primary' },
  }).onOk(async () => {
    await store.changeStatus(row.id, 'publish');
    Notify.create({ type: 'positive', message: '已发布' });
    await load();
  });
}

function onOffline(row: Template) {
  Dialog.create({
    title: '下线模板',
    message: '下线后已有分享链接将无法填写。确认下线？',
    cancel: true,
    ok: { label: '确认下线', color: 'warning' },
  }).onOk(async () => {
    await store.changeStatus(row.id, 'offline');
    Notify.create({ type: 'positive', message: '已下线' });
    await load();
  });
}

onMounted(() => load());
</script>
