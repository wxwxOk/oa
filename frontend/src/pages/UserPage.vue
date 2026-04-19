<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">用户管理</div>
      <q-space />
      <q-input v-model="keyword" outlined dense placeholder="搜索用户名/姓名" @keyup.enter="load(1)" clearable style="width: 200px">
        <template #append><q-icon name="search" class="cursor-pointer" @click="load(1)" /></template>
      </q-input>
      <q-select
        v-if="canListDept"
        v-model="deptFilter"
        :options="deptFilterOptions"
        label="选择部门"
        outlined
        dense
        emit-value
        map-options
        clearable
        style="width: 160px"
        @update:model-value="load(1)"
      />
      <q-btn-toggle
        v-model="statusFilter"
        toggle-color="primary"
        flat
        bordered
        :options="[
          { label: '全部', value: '' },
          { label: '启用', value: 'ACTIVE' },
          { label: '禁用', value: 'DISABLED' },
        ]"
        @update:model-value="load(1)"
      />
      <q-btn v-if="canCreateUser" color="primary" icon="add" label="新建用户" @click="openEdit(null)" />
    </div>

    <!-- 加载中（首次） -->
    <div v-if="firstLoading" class="q-pa-xl">
      <q-skeleton type="QTable" />
    </div>
    <!-- 错误态 -->
    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <div class="text-body1">加载失败，请检查网络后重试</div>
        <q-btn color="primary" label="重试" class="q-mt-md" @click="load(1)" />
      </div>
    </div>
    <!-- 空态 -->
    <div v-else-if="rows.length === 0 && !loading" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <q-icon name="people" size="4em" color="grey-4" />
        <div class="text-h6 q-mt-md">暂无用户</div>
        <div class="text-body2 text-grey-6 q-mt-sm">创建第一个用户以开始管理</div>
        <q-btn v-if="canCreateUser" color="primary" label="新建用户" icon="add" class="q-mt-md" @click="openEdit(null)" />
      </div>
    </div>
    <!-- 数据态 -->
    <template v-else>
      <q-table
        v-if="$q.screen.gt.sm"
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="pagination"
        @request="onReq"
        flat
        bordered
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.status === 'ACTIVE' ? 'positive' : 'grey-4'"
              :text-color="props.row.status === 'ACTIVE' ? 'white' : 'grey-8'"
              dense
              size="sm"
            >
              {{ props.row.status === 'ACTIVE' ? '启用' : '禁用' }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn v-if="canUpdateUser" size="sm" flat dense icon="edit" @click="openEdit(props.row)" />
            <q-btn v-perm="'user:reset-password'" size="sm" flat dense icon="vpn_key" @click="onReset(props.row)" />
            <q-btn v-perm="'user:delete'" size="sm" flat dense icon="delete" color="negative" @click="onDelete(props.row)" />
          </q-td>
        </template>
      </q-table>

      <!-- 移动端卡片列表 -->
      <div v-else class="q-gutter-sm">
        <q-card v-for="u in rows" :key="u.id" flat bordered>
          <q-card-section>
            <div class="row items-center">
              <div class="text-subtitle1">{{ u.realName }} <span class="text-caption text-grey">({{ u.username }})</span></div>
              <q-space />
              <q-chip
                :color="u.status === 'ACTIVE' ? 'positive' : 'grey-4'"
                :text-color="u.status === 'ACTIVE' ? 'white' : 'grey-8'"
                dense size="sm"
              >{{ u.status === 'ACTIVE' ? '启用' : '禁用' }}</q-chip>
            </div>
            <div class="text-caption q-mt-xs">部门: {{ u.department?.name ?? '-' }}</div>
            <div class="text-caption">角色: {{ u.roles.map((r: any) => r.role.name).join(', ') || '-' }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn v-if="canUpdateUser" flat dense icon="edit" @click="openEdit(u)" />
            <q-btn v-perm="'user:reset-password'" flat dense icon="vpn_key" @click="onReset(u)" />
            <q-btn v-perm="'user:delete'" flat dense icon="delete" color="negative" @click="onDelete(u)" />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 400px">
        <q-card-section class="text-h6">{{ form.id ? '编辑用户' : '新建用户' }}</q-card-section>
        <q-form ref="formRef" greedy>
        <q-card-section class="q-gutter-sm">
          <q-input v-if="!form.id" v-model="form.username" outlined label="用户名 *"
            lazy-rules :rules="[(v: string) => !!v || '请输入用户名', (v: string) => v.length >= 2 || '至少 2 个字符']" />
          <q-input v-if="!form.id" v-model="form.password" outlined label="初始密码 (默认 123456)"
            lazy-rules :rules="[(v: string) => !form.id && !v ? '请输入密码' : true, (v: string) => !v || v.length >= 4 || '至少 4 个字符']" />
          <q-input v-model="form.realName" outlined label="真实姓名 *"
            lazy-rules :rules="[(v: string) => !!v || '请输入真实姓名']" />
          <q-input v-model="form.email" outlined label="邮箱"
            lazy-rules :rules="[(v: string) => !v || /^\S+@\S+\.\S+$/.test(v) || '邮箱格式不正确']" />
          <q-input v-model="form.phone" outlined label="手机"
            lazy-rules :rules="[(v: string) => !v || /^\d{6,15}$/.test(v) || '手机号格式不正确']" />
          <q-select v-model="form.departmentId" :options="deptOptions" label="部门" outlined emit-value map-options clearable />
          <q-select v-model="form.roleIds" :options="roleOptions" label="角色" outlined multiple emit-value map-options />
          <q-toggle v-if="form.id" v-model="form.statusActive" label="启用" />
        </q-card-section>
        </q-form>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" label="保存用户" @click="onSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { QForm } from 'quasar';
import { api } from 'src/boot/axios';
import { Dialog, Notify, useQuasar, copyToClipboard } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

const $q = useQuasar();
const auth = useAuthStore();

// 按钮可见性：新建/编辑用户对话框需要选择角色和部门，必须同时具备三项权限
const canCreateUser = computed(
  () => auth.hasPerm('user:create') && auth.hasPerm('role:list') && auth.hasPerm('department:list'),
);
const canUpdateUser = computed(
  () => auth.hasPerm('user:update') && auth.hasPerm('role:list') && auth.hasPerm('department:list'),
);
const canListDept = computed(() => auth.hasPerm('department:list'));

const loading = ref(false);
const firstLoading = ref(true);
const error = ref(false);
const keyword = ref('');
const statusFilter = ref('');
const deptFilter = ref<number | null>(null);
const deptFilterOptions = ref<Array<{ label: string; value: number }>>([]);
const rows = ref<any[]>([]);
const deptOptions = ref<Array<{ label: string; value: number }>>([]);
const roleOptions = ref<any[]>([]);
const dialog = ref(false);
const form = reactive<any>({});
const formRef = ref<QForm | null>(null);

const columns = [
  { name: 'username', label: '用户名', field: 'username', align: 'left' as const },
  { name: 'realName', label: '姓名', field: 'realName', align: 'left' as const },
  { name: 'dept', label: '部门', field: (r: any) => r.department?.name ?? '-', align: 'left' as const },
  { name: 'roles', label: '角色', field: (r: any) => r.roles.map((x: any) => x.role.name).join(', '), align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const },
];

const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

async function load(page = pagination.value.page) {
  loading.value = true;
  try {
    const { data } = await api.get('/users', {
      params: {
        page,
        pageSize: pagination.value.rowsPerPage,
        keyword: keyword.value || undefined,
        departmentId: deptFilter.value || undefined,
        status: statusFilter.value || undefined,
      },
    });
    rows.value = data.items;
    pagination.value.rowsNumber = data.total;
    pagination.value.page = data.page;
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
    firstLoading.value = false;
  }
}

function onReq(props: any) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  load(props.pagination.page);
}

interface DeptNode {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  children: DeptNode[];
}

function flattenTreeForFilter(nodes: DeptNode[], depth = 0): Array<{ label: string; value: number }> {
  const result: Array<{ label: string; value: number }> = [];
  for (const node of nodes) {
    const indent = depth > 0 ? '\u3000'.repeat(depth) + '\u2514 ' : '';
    result.push({ label: indent + node.name, value: node.id });
    if (node.children?.length) {
      result.push(...flattenTreeForFilter(node.children, depth + 1));
    }
  }
  return result;
}

async function loadDeptFilter() {
  const { data } = await api.get('/departments/tree');
  const flat = flattenTreeForFilter(data);
  deptFilterOptions.value = flat;
  deptOptions.value = flat;
}

// 对话框打开时懒加载 roles（和必要时的 departments），避免进页面就拉冗余 meta
async function loadDialogMeta() {
  const tasks: Array<Promise<void>> = [];
  // 部门：若尚未通过筛选器加载过（如当前用户无 department:list 权限但可进对话框的罕见场景），按需拉取
  if (deptOptions.value.length === 0 && auth.hasPerm('department:list')) {
    tasks.push(
      api.get('/departments/tree').then(({ data }) => {
        deptOptions.value = flattenTreeForFilter(data);
      }),
    );
  }
  // 角色：每次打开对话框刷新，保证权限变更后下拉及时更新
  if (auth.hasPerm('role:list')) {
    tasks.push(
      api.get('/roles').then(({ data }) => {
        roleOptions.value = data.map((x: any) => ({ label: x.name, value: x.id }));
      }),
    );
  }
  await Promise.all(tasks);
}

async function openEdit(row: any) {
  await loadDialogMeta();
  if (row) {
    Object.assign(form, {
      id: row.id,
      realName: row.realName,
      email: row.email,
      phone: row.phone,
      departmentId: row.departmentId,
      roleIds: row.roles.map((x: any) => x.role.id),
      statusActive: row.status === 'ACTIVE',
    });
  } else {
    Object.assign(form, { id: null, username: '', password: '', realName: '', email: '', phone: '', departmentId: null, roleIds: [], statusActive: true });
  }
  dialog.value = true;
}

async function onSave() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  if (form.id) {
    await api.put(`/users/${form.id}`, {
      realName: form.realName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      departmentId: form.departmentId ?? null,
      roleIds: form.roleIds,
      status: form.statusActive ? 'ACTIVE' : 'DISABLED',
    });
  } else {
    await api.post('/users', {
      username: form.username,
      password: form.password || undefined,
      realName: form.realName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      departmentId: form.departmentId ?? null,
      roleIds: form.roleIds,
    });
  }
  Notify.create({ type: 'positive', message: '保存成功' });
  dialog.value = false;
  await load();
}

function onDelete(row: any) {
  Dialog.create({
    title: '删除用户',
    message: `将永久删除用户 ${row.username}。此操作不可恢复。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    await api.delete(`/users/${row.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}

function onReset(row: any) {
  Dialog.create({
    title: '重置密码',
    message: '密码将重置为 123456，用户下次登录需立即修改。',
    cancel: true,
    ok: { label: '确认重置', color: 'primary' },
  }).onOk(async () => {
    const { data } = await api.post(`/users/${row.id}/reset-password`, {});
    // 自动复制到剪贴板
    copyToClipboard(data.password).catch(() => {});
    Dialog.create({
      title: '密码已重置',
      message: `新密码：<code style="font-size:16px;padding:2px 8px;background:#f1f5f9;border-radius:4px">${data.password}</code>`,
      html: true,
      ok: '关闭',
      persistent: true,
    });
    Notify.create({ type: 'positive', message: '密码已复制到剪贴板', timeout: 2000 });
  });
}

onMounted(async () => {
  // 部门筛选器下拉仅在有 department:list 权限时加载；角色 meta 延后到对话框打开时
  if (canListDept.value) {
    await loadDeptFilter();
  }
  await load();
});
</script>
