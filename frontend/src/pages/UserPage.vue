<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">用户管理</div>
      <q-space />
      <q-input v-model="keyword" outlined dense placeholder="搜索用户名/姓名" @keyup.enter="load(1)" clearable>
        <template #append><q-icon name="search" class="cursor-pointer" @click="load(1)" /></template>
      </q-input>
      <q-btn v-perm="'user:create'" color="primary" icon="add" label="新建" @click="openEdit(null)" />
    </div>

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
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn v-perm="'user:update'" size="sm" flat dense icon="edit" @click="openEdit(props.row)" />
          <q-btn v-perm="'user:reset-password'" size="sm" flat dense icon="vpn_key" @click="onReset(props.row)" />
          <q-btn v-perm="'user:delete'" size="sm" flat dense icon="delete" color="negative" @click="onDelete(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- 移动端卡片列表 -->
    <div v-else class="q-gutter-sm">
      <q-card v-for="u in rows" :key="u.id" flat bordered>
        <q-card-section>
          <div class="text-subtitle1">{{ u.realName }} <span class="text-caption text-grey">({{ u.username }})</span></div>
          <div class="text-caption">部门: {{ u.department?.name ?? '-' }}</div>
          <div class="text-caption">角色: {{ u.roles.map((r: any) => r.role.name).join(', ') || '-' }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-perm="'user:update'" flat dense icon="edit" @click="openEdit(u)" />
          <q-btn v-perm="'user:delete'" flat dense icon="delete" color="negative" @click="onDelete(u)" />
        </q-card-actions>
      </q-card>
    </div>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 360px">
        <q-card-section class="text-h6">{{ form.id ? '编辑' : '新建' }}用户</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-if="!form.id" v-model="form.username" label="用户名" outlined />
          <q-input v-if="!form.id" v-model="form.password" label="初始密码 (默认 123456)" outlined />
          <q-input v-model="form.realName" label="真实姓名" outlined />
          <q-input v-model="form.email" label="邮箱" outlined />
          <q-input v-model="form.phone" label="手机" outlined />
          <q-select v-model="form.departmentId" :options="deptOptions" label="部门" outlined emit-value map-options clearable />
          <q-select v-model="form.roleIds" :options="roleOptions" label="角色" outlined multiple emit-value map-options />
          <q-toggle v-if="form.id" v-model="form.statusActive" label="启用" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" label="保存" @click="onSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { Dialog, Notify } from 'quasar';

const loading = ref(false);
const keyword = ref('');
const rows = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const roleOptions = ref<any[]>([]);
const dialog = ref(false);
const form = reactive<any>({});

const columns = [
  { name: 'username', label: '用户名', field: 'username', align: 'left' as const },
  { name: 'realName', label: '姓名', field: 'realName', align: 'left' as const },
  { name: 'dept', label: '部门', field: (r: any) => r.department?.name ?? '-', align: 'left' as const },
  { name: 'roles', label: '角色', field: (r: any) => r.roles.map((x: any) => x.role.name).join(', '), align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const, format: (v: string) => (v === 'ACTIVE' ? '启用' : '禁用') },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const },
];

const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

async function load(page = pagination.value.page) {
  loading.value = true;
  try {
    const { data } = await api.get('/users', {
      params: { page, pageSize: pagination.value.rowsPerPage, keyword: keyword.value || undefined },
    });
    rows.value = data.items;
    pagination.value.rowsNumber = data.total;
    pagination.value.page = data.page;
  } finally {
    loading.value = false;
  }
}

function onReq(props: any) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  load(props.pagination.page);
}

async function loadMeta() {
  const [d, r] = await Promise.all([api.get('/departments'), api.get('/roles')]);
  deptOptions.value = d.data.map((x: any) => ({ label: x.name, value: x.id }));
  roleOptions.value = r.data.map((x: any) => ({ label: x.name, value: x.id }));
}

function openEdit(row: any) {
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
  if (form.id) {
    await api.put(`/users/${form.id}`, {
      realName: form.realName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      departmentId: form.departmentId,
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
      departmentId: form.departmentId ?? undefined,
      roleIds: form.roleIds,
    });
  }
  Notify.create({ type: 'positive', message: '保存成功' });
  dialog.value = false;
  await load();
}

function onDelete(row: any) {
  Dialog.create({ title: '确认删除', message: `删除用户 ${row.username}?`, cancel: true }).onOk(async () => {
    await api.delete(`/users/${row.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}

function onReset(row: any) {
  Dialog.create({ title: '重置密码', message: '将密码重置为 123456?', cancel: true }).onOk(async () => {
    const { data } = await api.post(`/users/${row.id}/reset-password`, {});
    Notify.create({ type: 'positive', message: `新密码: ${data.password}`, timeout: 5000 });
  });
}

onMounted(async () => {
  await loadMeta();
  await load();
});
</script>
