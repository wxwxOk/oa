<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">流程配置</div>
      <q-space />
      <q-btn
        v-perm="'approval:process:create'"
        color="primary"
        icon="add"
        label="新建流程"
        :style="isMobile ? 'min-height: 44px' : ''"
        @click="openCreate"
      />
    </div>

    <div class="process-filter row items-center q-gutter-sm q-mb-md">
      <q-btn-toggle
        v-model="store.statusFilter"
        toggle-color="primary"
        flat
        bordered
        :options="[
          { label: '全部', value: '' },
          { label: '启用', value: 'true' },
          { label: '停用', value: 'false' },
        ]"
        @update:model-value="onFilterChange"
      />
      <q-input
        v-model="store.keyword"
        outlined
        dense
        clearable
        placeholder="搜索流程名称"
        class="process-search"
        @keyup.enter="onFilterChange"
        @clear="onFilterChange"
      >
        <template #append>
          <q-icon name="search" class="cursor-pointer" @click="onFilterChange" />
        </template>
      </q-input>
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="q-mb-sm process-card">
          <q-card-section>
            <q-skeleton type="text" width="64%" />
            <q-skeleton type="text" width="44%" class="q-mt-xs" />
            <q-skeleton type="text" width="52%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <div class="text-body1">流程配置加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </div>
    </div>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="rule"
      title="暂无审批流程"
      description="创建单步或串行流程后，可绑定到需要审批的模板。"
      :cta-text="canCreateProcess ? '新建流程' : undefined"
      @action="openCreate"
    />

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
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="text-body2">{{ props.row.name }}</div>
            <div v-if="props.row.description" class="text-caption process-muted">
              {{ props.row.description }}
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.isActive ? 'positive' : 'grey-5'"
              text-color="white"
              :label="props.row.isActive ? '启用' : '停用'"
            />
          </q-td>
        </template>

        <template #body-cell-nodes="props">
          <q-td :props="props">
            <div>{{ props.row.nodes?.length ?? 0 }} 个节点</div>
            <div class="text-caption process-muted">
              {{ nodePreview(props.row) }}
            </div>
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
              v-perm="'approval:process:update'"
              size="sm"
              flat
              dense
              icon="rule"
              color="primary"
              :loading="validatingId === props.row.id"
              :disable="isMutating"
              :aria-label="`校验流程 ${props.row.name}`"
              @click="onValidate(props.row)"
            >
              <q-tooltip>校验流程</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:update'"
              size="sm"
              flat
              dense
              icon="edit"
              :disable="isMutating"
              :aria-label="`编辑流程 ${props.row.name}`"
              @click="openEdit(props.row)"
            >
              <q-tooltip>编辑流程</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:update'"
              size="sm"
              flat
              dense
              :icon="props.row.isActive ? 'toggle_off' : 'toggle_on'"
              :color="props.row.isActive ? 'warning' : 'positive'"
              :loading="statusId === props.row.id"
              :disable="isMutating"
              :aria-label="props.row.isActive ? `禁用流程 ${props.row.name}` : `启用流程 ${props.row.name}`"
              @click="onToggleStatus(props.row)"
            >
              <q-tooltip>{{ props.row.isActive ? '禁用流程' : '启用流程' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:delete'"
              size="sm"
              flat
              dense
              icon="delete"
              color="negative"
              :loading="deletingId === props.row.id"
              :disable="isMutating"
              :aria-label="`删除流程 ${props.row.name}`"
              @click="onDelete(props.row)"
            >
              <q-tooltip>删除流程</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card v-for="row in store.rows" :key="row.id" flat bordered class="process-card mobile-card">
          <q-card-section>
            <div class="row items-start no-wrap">
              <div class="col">
                <div class="text-subtitle1">{{ row.name }}</div>
                <div v-if="row.description" class="text-caption process-muted q-mt-xs">
                  {{ row.description }}
                </div>
              </div>
              <q-badge
                :color="row.isActive ? 'positive' : 'grey-5'"
                text-color="white"
                :label="row.isActive ? '启用' : '停用'"
              />
            </div>
            <div class="text-caption q-mt-sm process-muted">
              {{ row.nodes?.length ?? 0 }} 个节点 · {{ formatDate(row.updatedAt) }}
            </div>
            <div class="text-caption process-muted">{{ nodePreview(row) }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              v-perm="'approval:process:update'"
              flat
              dense
              icon="rule"
              color="primary"
              :loading="validatingId === row.id"
              :disable="isMutating"
              :aria-label="`校验流程 ${row.name}`"
              @click="onValidate(row)"
            >
              <q-tooltip>校验流程</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:update'"
              flat
              dense
              icon="edit"
              :disable="isMutating"
              :aria-label="`编辑流程 ${row.name}`"
              @click="openEdit(row)"
            >
              <q-tooltip>编辑流程</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:update'"
              flat
              dense
              :icon="row.isActive ? 'toggle_off' : 'toggle_on'"
              :color="row.isActive ? 'warning' : 'positive'"
              :loading="statusId === row.id"
              :disable="isMutating"
              :aria-label="row.isActive ? `禁用流程 ${row.name}` : `启用流程 ${row.name}`"
              @click="onToggleStatus(row)"
            >
              <q-tooltip>{{ row.isActive ? '禁用流程' : '启用流程' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-perm="'approval:process:delete'"
              flat
              dense
              icon="delete"
              color="negative"
              :loading="deletingId === row.id"
              :disable="isMutating"
              :aria-label="`删除流程 ${row.name}`"
              @click="onDelete(row)"
            >
              <q-tooltip>删除流程</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog
      v-model="dialog"
      :maximized="isMobile"
      :transition-show="isMobile ? 'slide-up' : 'scale'"
      :transition-hide="isMobile ? 'slide-down' : 'scale'"
      persistent
    >
      <q-card :style="isMobile ? '' : 'width: 760px; max-width: calc(100vw - 32px)'">
        <q-bar v-if="isMobile">
          <q-space />
          <q-btn dense flat icon="close" aria-label="关闭流程编辑" v-close-popup>
            <q-tooltip>关闭</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section class="text-h6">
          {{ form.id ? '编辑审批流程' : '新建审批流程' }}
        </q-card-section>

        <q-form ref="formRef" greedy>
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="form.name"
              outlined
              label="流程名称"
              lazy-rules="ondemand"
              :rules="[
                (v: string) => !!v || '请输入流程名称',
                (v: string) => v.length <= 50 || '流程名称不超过 50 个字符',
              ]"
            />
            <q-input
              v-model="form.description"
              outlined
              type="textarea"
              autogrow
              label="描述"
            />
            <q-toggle v-model="form.isActive" label="启用" />

            <div>
              <div class="row items-center q-mb-sm">
                <div class="text-subtitle2">审批节点</div>
                <q-space />
                <q-btn flat color="primary" icon="add" label="添加节点" @click="addNode" />
              </div>

              <div v-if="form.nodes.length === 0" class="text-negative text-caption q-mb-sm">
                至少添加 1 个审批节点
              </div>

              <div
                v-for="(node, index) in form.nodes"
                :key="node.localKey"
                class="process-node q-mb-sm"
              >
                <div class="row items-center q-mb-sm">
                  <div>
                    <div class="text-caption process-muted">第 {{ index + 1 }} 步</div>
                    <div class="text-subtitle2">{{ node.name || '未命名节点' }}</div>
                  </div>
                  <q-space />
                  <div class="node-actions row q-gutter-xs">
                    <q-btn
                      flat
                      dense
                      icon="keyboard_arrow_up"
                      :disable="index === 0 || saving"
                      :aria-label="`上移第 ${index + 1} 步`"
                      @click="moveNode(index, -1)"
                    >
                      <q-tooltip>上移节点</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      icon="keyboard_arrow_down"
                      :disable="index === form.nodes.length - 1 || saving"
                      :aria-label="`下移第 ${index + 1} 步`"
                      @click="moveNode(index, 1)"
                    >
                      <q-tooltip>下移节点</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      icon="delete"
                      color="negative"
                      :disable="saving"
                      :aria-label="`删除第 ${index + 1} 步`"
                      @click="removeNode(index)"
                    >
                      <q-tooltip>删除节点</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-md-6">
                    <q-input
                      v-model.trim="node.name"
                      outlined
                      dense
                      label="节点名称"
                      lazy-rules="ondemand"
                      :rules="[(v: string) => !!v || '请输入节点名称']"
                    />
                  </div>
                  <div class="col-12 col-md-6">
                    <q-select
                      v-model="node.approverSourceType"
                      :options="sourceOptions"
                      outlined
                      dense
                      emit-value
                      map-options
                      label="审批人来源"
                      @update:model-value="onNodeSourceChange(node)"
                    />
                  </div>
                  <div v-if="node.approverSourceType === 'USER'" class="col-12 col-md-6">
                    <q-select
                      v-model="node.approverUserId"
                      :options="userOptions"
                      outlined
                      dense
                      emit-value
                      map-options
                      use-input
                      input-debounce="0"
                      label="固定用户"
                      :disable="!auth.hasPerm('user:list')"
                      :rules="[(v: number | null) => !!v || '请选择固定用户']"
                    />
                  </div>
                  <div v-if="node.approverSourceType === 'ROLE'" class="col-12 col-md-6">
                    <q-select
                      v-model="node.approverRoleId"
                      :options="roleOptions"
                      outlined
                      dense
                      emit-value
                      map-options
                      label="角色"
                      :disable="!auth.hasPerm('role:list')"
                      :rules="[(v: number | null) => !!v || '请选择角色']"
                    />
                  </div>
                  <div class="col-12">
                    <div class="text-caption process-muted q-mb-xs">必需动作</div>
                    <div class="row q-gutter-xs">
                      <q-chip dense color="positive" text-color="white" label="通过" />
                      <q-chip dense color="negative" text-color="white" label="驳回" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-form>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" :disable="saving" v-close-popup />
          <q-btn
            flat
            color="primary"
            label="校验流程"
            :loading="dialogValidating"
            :disable="saving"
            @click="onDialogValidate"
          />
          <q-btn
            v-perm="form.id ? 'approval:process:update' : 'approval:process:create'"
            color="primary"
            label="保存流程"
            :loading="saving"
            :disable="dialogValidating"
            @click="onSave"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { QForm } from 'quasar';
import { Dialog, Notify } from 'quasar';
import { api } from 'src/boot/axios';
import EmptyState from 'src/components/EmptyState.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import {
  useApprovalProcessStore,
  type ApprovalProcess,
  type ApprovalProcessNodeDraft,
  type ApproverSourceType,
} from 'src/stores/approvalProcess';

interface FormNode extends ApprovalProcessNodeDraft {
  localKey: string;
  approverSourceType: ApproverSourceType;
  approverUserId: number | null;
  approverRoleId: number | null;
}

interface ProcessForm {
  id: number | null;
  name: string;
  description: string;
  isActive: boolean;
  nodes: FormNode[];
}

const store = useApprovalProcessStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const dialog = ref(false);
const formRef = ref<QForm | null>(null);
const saving = ref(false);
const dialogValidating = ref(false);
const validatingId = ref<number | null>(null);
const statusId = ref<number | null>(null);
const deletingId = ref<number | null>(null);
const userOptions = ref<Array<{ label: string; value: number }>>([]);
const roleOptions = ref<Array<{ label: string; value: number }>>([]);

const form = reactive<ProcessForm>({
  id: null,
  name: '',
  description: '',
  isActive: true,
  nodes: [],
});

const sourceOptions = [
  { label: '固定用户', value: 'USER' },
  { label: '角色', value: 'ROLE' },
  { label: '提交人部门负责人', value: 'DEPARTMENT_MANAGER' },
];

const canCreateProcess = computed(() => auth.hasPerm('approval:process:create'));
const isMutating = computed(() => Boolean(validatingId.value || statusId.value || deletingId.value || saving.value));

const columns = [
  { name: 'name', label: '流程名称', field: 'name', align: 'left' as const },
  { name: 'status', label: '状态', field: 'isActive', align: 'center' as const, style: 'width:80px' },
  { name: 'nodes', label: '节点', field: 'nodes', align: 'left' as const, style: 'width:140px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:160px' },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:180px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

function makeLocalKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeNode(order: number, input?: ApprovalProcessNodeDraft): FormNode {
  return {
    localKey: makeLocalKey(),
    id: input?.id,
    name: input?.name ?? '',
    order,
    approverSourceType: input?.approverSourceType ?? 'USER',
    approverUserId: input?.approverUserId ?? null,
    approverRoleId: input?.approverRoleId ?? null,
    requiredActions: ['APPROVE', 'REJECT'],
  };
}

function resetForm() {
  form.id = null;
  form.name = '';
  form.description = '';
  form.isActive = true;
  form.nodes = [makeNode(1)];
}

function refreshOrders() {
  form.nodes.forEach((node, index) => {
    node.order = index + 1;
  });
}

function addNode() {
  form.nodes.push(makeNode(form.nodes.length + 1));
}

function removeNode(index: number) {
  form.nodes.splice(index, 1);
  refreshOrders();
}

function moveNode(index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= form.nodes.length) return;
  const [node] = form.nodes.splice(index, 1);
  form.nodes.splice(target, 0, node);
  refreshOrders();
}

function onNodeSourceChange(node: FormNode) {
  if (node.approverSourceType === 'USER') {
    node.approverRoleId = null;
  } else if (node.approverSourceType === 'ROLE') {
    node.approverUserId = null;
  } else {
    node.approverUserId = null;
    node.approverRoleId = null;
  }
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

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\//g, '-');
}

function nodePreview(row: ApprovalProcess) {
  if (!row.nodes?.length) return '未配置节点';
  const names = [...row.nodes]
    .sort((a, b) => a.order - b.order)
    .slice(0, 2)
    .map((node) => node.name)
    .filter(Boolean);
  return names.length ? names.join(' / ') : '未命名节点';
}

function normalizeListPayload(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  const candidate = data as { items?: any[]; rows?: any[] };
  return candidate.items ?? candidate.rows ?? [];
}

async function loadDialogMeta() {
  const tasks: Array<Promise<void>> = [];
  if (auth.hasPerm('user:list')) {
    tasks.push(
      api.get('/users', { params: { status: 'ACTIVE', pageSize: 100 } }).then(({ data }) => {
        userOptions.value = normalizeListPayload(data).map((user: any) => ({
          label: `${user.realName}（${user.username}）`,
          value: user.id,
        }));
      }),
    );
  }
  if (auth.hasPerm('role:list')) {
    tasks.push(
      api.get('/roles').then(({ data }) => {
        roleOptions.value = normalizeListPayload(data).map((role: any) => ({
          label: role.name,
          value: role.id,
        }));
      }),
    );
  }
  await Promise.all(tasks);
}

async function openCreate() {
  await loadDialogMeta();
  resetForm();
  dialog.value = true;
}

async function openEdit(row: ApprovalProcess) {
  await loadDialogMeta();
  const detail = await store.fetchOne(row.id);
  form.id = detail.id;
  form.name = detail.name;
  form.description = detail.description ?? '';
  form.isActive = detail.isActive;
  form.nodes = [...detail.nodes]
    .sort((a, b) => a.order - b.order)
    .map((node, index) => makeNode(index + 1, node));
  if (form.nodes.length === 0) form.nodes = [makeNode(1)];
  dialog.value = true;
}

function buildPayload() {
  refreshOrders();
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    isActive: form.isActive,
    nodes: form.nodes.map((node) => ({
      id: node.id,
      name: node.name.trim(),
      order: node.order,
      approverSourceType: node.approverSourceType,
      approverUserId: node.approverSourceType === 'USER' ? node.approverUserId : null,
      approverRoleId: node.approverSourceType === 'ROLE' ? node.approverRoleId : null,
      requiredActions: ['APPROVE', 'REJECT'] as ['APPROVE', 'REJECT'],
    })),
  };
}

async function validateLocalForm() {
  const formValid = await formRef.value?.validate();
  return Boolean(formValid && form.nodes.length > 0);
}

async function onDialogValidate() {
  const valid = await validateLocalForm();
  if (!valid) {
    Notify.create({ type: 'negative', message: '流程配置不完整，请检查节点和审批人来源。' });
    return;
  }
  if (!form.id) {
    Notify.create({ type: 'positive', message: '流程配置格式正确' });
    return;
  }
  dialogValidating.value = true;
  try {
    await store.validate(form.id);
    Notify.create({ type: 'positive', message: '流程校验通过' });
  } finally {
    dialogValidating.value = false;
  }
}

async function onSave() {
  const valid = await validateLocalForm();
  if (!valid) {
    Notify.create({ type: 'negative', message: '流程配置不完整，请检查节点和审批人来源。' });
    return;
  }

  saving.value = true;
  try {
    if (form.id) {
      await store.update(form.id, buildPayload());
    } else {
      await store.create(buildPayload());
    }
    Notify.create({ type: 'positive', message: '流程已保存' });
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function onValidate(row: ApprovalProcess) {
  validatingId.value = row.id;
  try {
    await store.validate(row.id);
    Notify.create({ type: 'positive', message: '流程校验通过' });
  } finally {
    validatingId.value = null;
  }
}

function onToggleStatus(row: ApprovalProcess) {
  const targetActive = !row.isActive;
  Dialog.create({
    title: targetActive ? '启用流程' : '禁用流程',
    message: targetActive
      ? '启用后新模板可绑定该流程。确认启用？'
      : '禁用后新模板不能继续绑定该流程。已发布模板引用时需先解绑或下线。确认禁用？',
    cancel: true,
    ok: { label: targetActive ? '确认启用' : '确认禁用', color: targetActive ? 'primary' : 'warning' },
  }).onOk(async () => {
    statusId.value = row.id;
    try {
      await store.changeStatus(row.id, targetActive);
      Notify.create({ type: 'positive', message: targetActive ? '已启用' : '已停用' });
      await load();
    } finally {
      statusId.value = null;
    }
  });
}

function onDelete(row: ApprovalProcess) {
  Dialog.create({
    title: '删除流程',
    message: `删除流程: 将永久删除流程「${row.name}」。已发布需审批模板引用时无法删除。此操作不可恢复。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    deletingId.value = row.id;
    try {
      await store.remove(row.id);
      Notify.create({ type: 'positive', message: '已删除' });
      await load();
    } finally {
      deletingId.value = null;
    }
  });
}

onMounted(() => load());
</script>

<style scoped>
.process-filter {
  align-items: stretch;
}

.process-search {
  width: 220px;
}

.process-muted {
  color: var(--oa-text-secondary);
}

.process-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.process-node {
  border: 1px solid var(--oa-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--oa-surface);
}

.node-actions .q-btn {
  min-width: 36px;
  min-height: 36px;
}

@media (max-width: 1023px) {
  .process-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .process-search {
    width: 100%;
  }

  .mobile-card .q-btn,
  .node-actions .q-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
