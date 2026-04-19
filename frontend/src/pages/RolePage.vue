<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">角色与权限</div>
      <q-space />
      <q-btn v-perm="'role:create'" color="primary" icon="add" label="新建角色" @click="openEdit(null)" />
    </div>

    <!-- PC 端双栏布局 -->
    <template v-if="isDesktop">
      <div class="row q-gutter-md">
        <!-- 角色列表 -->
        <q-list bordered class="col-12 col-md-4" style="border-radius: 6px; background: var(--oa-surface)">
          <q-item
            v-for="r in roles"
            :key="r.id"
            clickable
            :active="selected?.id === r.id"
            active-class="text-primary"
            :style="selected?.id === r.id ? 'background: var(--oa-hover)' : ''"
            @click="selectRole(r)"
          >
            <q-item-section>
              <q-item-label>{{ r.name }}</q-item-label>
              <q-item-label caption>{{ r.code }} · 成员: {{ r._count?.users ?? 0 }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-xs">
                <q-btn v-perm="'role:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(r)" />
                <q-btn
                  v-perm="'role:delete'"
                  size="sm" flat dense icon="delete" color="negative"
                  :disable="r.code === 'ADMIN' || (r._count?.users ?? 0) > 0"
                  @click.stop="onDelete(r)"
                >
                  <q-tooltip v-if="r.code === 'ADMIN'">系统角色不可删除</q-tooltip>
                  <q-tooltip v-else-if="(r._count?.users ?? 0) > 0">
                    请先解绑 {{ r._count?.users ?? 0 }} 个用户
                  </q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- 权限分配 -->
        <q-card class="col" flat bordered>
          <q-card-section>
            <div class="text-subtitle1">权限分配 - {{ selected?.name ?? '请选择角色' }}</div>
          </q-card-section>
          <q-card-section v-if="selected">
            <div v-for="(perms, module) in groupedPerms" :key="module" class="q-mb-md">
              <div class="text-subtitle2 text-primary q-mb-xs">{{ moduleLabel(module) }}</div>
              <q-option-group
                v-model="checkedIds"
                :options="perms.map((p: any) => ({ label: p.name + ' (' + p.code + ')', value: p.id }))"
                type="checkbox"
                inline
              />
            </div>
            <q-btn
              v-perm="'role:assign-permission'"
              color="primary"
              label="保存权限"
              :disable="isAdminSelected && checkedIds.length === 0"
              @click="savePerms"
            >
              <q-tooltip v-if="isAdminSelected && checkedIds.length === 0">
                ADMIN 角色不能清空所有权限
              </q-tooltip>
            </q-btn>
          </q-card-section>
        </q-card>
      </div>
    </template>

    <!-- 移动端单栏切换 -->
    <template v-if="isMobile">
      <!-- 权限视图 -->
      <div v-if="mobileView === 'permissions' && selected">
        <div class="row items-center q-mb-md">
          <q-btn flat icon="arrow_back" label="返回角色列表" @click="mobileView = 'list'" />
        </div>
        <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)" class="q-mb-md">
          {{ selected.name }} 的权限
        </div>
        <!-- 权限 checkbox 区域 -->
        <div v-for="(perms, module) in groupedPerms" :key="module" class="q-mb-md">
          <div class="text-subtitle2 text-primary q-mb-xs">{{ moduleLabel(module) }}</div>
          <q-option-group v-model="checkedIds"
            :options="perms.map((p: any) => ({ label: p.name + ' (' + p.code + ')', value: p.id }))"
            type="checkbox" />
        </div>
        <q-btn v-perm="'role:assign-permission'" color="primary" label="保存权限" @click="savePerms" />
      </div>
      <!-- 角色列表视图 -->
      <div v-else>
        <EmptyState v-if="roles.length === 0" icon="security" title="暂无角色"
                    description="创建角色并分配权限以管理系统访问" />
        <q-list v-else bordered style="border-radius: 8px; background: var(--oa-surface)">
          <q-item v-for="r in roles" :key="r.id" clickable @click="selectRoleMobile(r)">
            <q-item-section>
              <q-item-label>{{ r.name }}</q-item-label>
              <q-item-label caption>{{ r.code }} · 成员: {{ r._count?.users ?? 0 }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </template>

    <q-dialog v-model="dialog" :maximized="isMobile"
              :transition-show="isMobile ? 'slide-up' : 'scale'"
              :transition-hide="isMobile ? 'slide-down' : 'scale'">
      <q-card :style="isMobile ? '' : 'min-width: 320px'">
        <q-bar v-if="isMobile">
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <q-card-section class="text-h6">{{ form.id ? '编辑' : '新建' }}角色</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-if="!form.id" v-model="form.code" label="角色代码（如 HR）" outlined />
          <q-input v-model="form.name" label="名称" outlined />
          <q-input v-model="form.description" label="描述" outlined type="textarea" />
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
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import { Dialog, Notify } from 'quasar';
import { useResponsive } from 'src/composables/useResponsive';
import EmptyState from 'src/components/EmptyState.vue';

const { isDesktop, isMobile } = useResponsive();
const mobileView = ref<'list' | 'permissions'>('list');

const roles = ref<any[]>([]);
const permissions = ref<any[]>([]);
const selected = ref<any | null>(null);
const checkedIds = ref<number[]>([]);
const dialog = ref(false);
const form = reactive<any>({});

const MODULE_LABELS: Record<string, string> = { user: '用户', department: '部门', role: '角色' };
const moduleLabel = (m: string) => MODULE_LABELS[m] ?? m;

const groupedPerms = computed(() => {
  const g: Record<string, any[]> = {};
  permissions.value.forEach((p) => ((g[p.module] ||= []).push(p)));
  return g;
});

// 当前选中角色是否为 ADMIN
const isAdminSelected = computed(() => selected.value?.code === 'ADMIN');

async function loadRoles() {
  const { data } = await api.get('/roles');
  roles.value = data;
  if (selected.value) {
    const fresh = data.find((r: any) => r.id === selected.value!.id);
    if (fresh) selectRole(fresh);
  }
}

async function loadPerms() {
  const { data } = await api.get('/permissions');
  permissions.value = data;
}

function selectRole(r: any) {
  selected.value = r;
  checkedIds.value = r.permissions.map((p: any) => p.permission.id);
}

function selectRoleMobile(r: any) {
  selectRole(r);
  mobileView.value = 'permissions';
}

function openEdit(r: any) {
  Object.assign(form, { id: null, code: '', name: '', description: '' });
  if (r) Object.assign(form, r);
  dialog.value = true;
}

async function onSave() {
  if (form.id) await api.put(`/roles/${form.id}`, { name: form.name, description: form.description });
  else await api.post('/roles', { code: form.code, name: form.name, description: form.description });
  dialog.value = false;
  Notify.create({ type: 'positive', message: '保存成功' });
  await loadRoles();
}

function onDelete(r: any) {
  Dialog.create({
    title: '删除角色',
    message: `将永久删除角色 ${r.name}。此操作不可恢复。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    await api.delete(`/roles/${r.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    if (selected.value?.id === r.id) selected.value = null;
    await loadRoles();
  });
}

async function savePerms() {
  if (!selected.value) return;
  await api.put(`/roles/${selected.value.id}/permissions`, { permissionIds: checkedIds.value });
  Notify.create({ type: 'positive', message: '权限已更新' });
  await loadRoles();
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadPerms()]);
});
</script>
