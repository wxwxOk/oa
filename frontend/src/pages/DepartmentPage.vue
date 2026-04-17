<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">部门管理</div>
      <q-space />
      <q-btn v-perm="'department:create'" color="primary" icon="add" label="新建部门" @click="openEdit(null)" />
    </div>

    <q-tree
      :nodes="tree"
      node-key="id"
      label-key="name"
      children-key="children"
      default-expand-all
      no-nodes-label="暂无数据"
    >
      <template #default-header="props">
        <div class="row items-center full-width">
          <q-icon name="folder" class="q-mr-sm text-amber" />
          <div>{{ props.node.name }}</div>
          <q-space />
          <q-btn v-perm="'department:create'" size="sm" flat dense icon="add" @click.stop="openEdit({ parentId: props.node.id })" />
          <q-btn v-perm="'department:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(props.node)" />
          <q-btn v-perm="'department:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(props.node.id)" />
        </div>
      </template>
    </q-tree>

    <q-dialog v-model="dialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">{{ form.id ? '编辑' : '新建' }}部门</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.name" label="名称" outlined />
          <q-input v-model.number="form.sort" label="排序" type="number" outlined />
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
import { ref, onMounted, reactive } from 'vue';
import { api } from 'src/boot/axios';
import { Dialog, Notify } from 'quasar';

const tree = ref<any[]>([]);
const dialog = ref(false);
const form = reactive<any>({ id: null, name: '', parentId: null, sort: 0 });

async function load() {
  const { data } = await api.get('/departments/tree');
  tree.value = data;
}

function openEdit(node: any) {
  Object.assign(form, { id: null, name: '', parentId: null, sort: 0 });
  if (node?.id && node?.name) Object.assign(form, node);
  else if (node?.parentId) form.parentId = node.parentId;
  dialog.value = true;
}

async function onSave() {
  if (form.id) await api.put(`/departments/${form.id}`, { name: form.name, sort: form.sort });
  else await api.post('/departments', { name: form.name, parentId: form.parentId, sort: form.sort });
  Notify.create({ type: 'positive', message: '保存成功' });
  dialog.value = false;
  await load();
}

function onDelete(id: number) {
  Dialog.create({ title: '确认删除', message: '删除后无法恢复', cancel: true }).onOk(async () => {
    await api.delete(`/departments/${id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}

onMounted(load);
</script>
