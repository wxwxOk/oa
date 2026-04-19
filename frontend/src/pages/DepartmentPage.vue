<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">部门管理</div>
      <q-space />
      <q-btn v-perm="'department:create'" color="primary" icon="add" label="新建部门" @click="openEdit(null)" />
    </div>

    <!-- 加载中：树形骨架屏 -->
    <div v-if="loading" class="q-gutter-sm q-pa-md">
      <q-skeleton type="rect" height="32px" />
      <q-skeleton type="rect" height="32px" style="margin-left: 24px" />
      <q-skeleton type="rect" height="32px" style="margin-left: 24px" />
      <q-skeleton type="rect" height="32px" style="margin-left: 48px" />
      <q-skeleton type="rect" height="32px" style="margin-left: 48px" />
    </div>
    <!-- 错误态 -->
    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <div class="text-body1">加载失败，请检查网络后重试</div>
        <q-btn color="primary" label="重试" class="q-mt-md" @click="load" />
      </div>
    </div>
    <!-- 空态 -->
    <EmptyState v-else-if="tree.length === 0" icon="account_tree" title="暂无部门"
                description="建立组织架构第一步：添加顶级部门"
                :cta-text="auth.hasPerm('department:create') ? '新建部门' : undefined"
                @action="openEdit(null)" />
    <!-- 数据态 -->
    <q-tree
      v-else
      :nodes="tree"
      node-key="id"
      label-key="name"
      children-key="children"
      default-expand-all
    >
      <template #default-header="props">
        <div class="row items-center full-width">
          <q-icon name="folder" class="q-mr-sm text-amber" />
          <div>{{ props.node.name }}</div>
          <q-space />
          <q-btn v-perm="'department:create'" size="sm" flat dense icon="add" @click.stop="openEdit({ parentId: props.node.id })" />
          <q-btn v-perm="'department:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(props.node)" />
          <q-btn v-perm="'department:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(props.node)" />
        </div>
      </template>
    </q-tree>

    <q-dialog v-model="dialog" :maximized="isMobile"
              :transition-show="isMobile ? 'slide-up' : 'scale'"
              :transition-hide="isMobile ? 'slide-down' : 'scale'">
      <q-card :style="isMobile ? '' : 'min-width: 320px'">
        <q-bar v-if="isMobile">
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <q-card-section class="text-h6">{{ form.id ? '编辑部门' : '新建部门' }}</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            ref="nameRef"
            v-model="form.name"
            outlined
            lazy-rules="ondemand"
            :rules="[(v: string) => !!v || '请输入部门名称']"
          >
            <template #label>部门名称 <span class="text-negative">*</span></template>
          </q-input>
          <q-select
            v-model="form.parentId"
            :options="parentOptions"
            label="上级部门"
            outlined
            emit-value
            map-options
            clearable
          />
          <q-input
            ref="sortRef"
            v-model.number="form.sort"
            type="number"
            outlined
            lazy-rules="ondemand"
            :rules="[
              (v: any) => v !== null && v !== undefined || '请输入排序数字',
              (v: any) => Number.isInteger(Number(v)) || '必须是整数',
            ]"
          >
            <template #label>排序 <span class="text-negative">*</span></template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" label="保存部门" @click="onSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { api } from 'src/boot/axios';
import { Dialog, Notify } from 'quasar';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import EmptyState from 'src/components/EmptyState.vue';

const { isMobile } = useResponsive();
const auth = useAuthStore();

interface DeptNode {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  children: DeptNode[];
}

const tree = ref<DeptNode[]>([]);
const dialog = ref(false);
const loading = ref(false);
const error = ref(false);
const form = reactive<any>({ id: null, name: '', parentId: null, sort: 0 });
const nameRef = ref<any>(null);
const sortRef = ref<any>(null);

// 将树形数据扁平化为 q-select options，带缩进前缀
function flattenTreeForSelect(
  nodes: DeptNode[],
  depth = 0,
  excludeIds = new Set<number>()
): Array<{ label: string; value: number }> {
  const result: Array<{ label: string; value: number }> = [];
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue;
    const indent = depth > 0 ? '\u3000'.repeat(depth) + '\u2514 ' : '';
    result.push({ label: indent + node.name, value: node.id });
    if (node.children?.length) {
      result.push(...flattenTreeForSelect(node.children, depth + 1, excludeIds));
    }
  }
  return result;
}

// 获取节点及其所有子孙的 ID 集合（D-11 前端辅助过滤）
function getSubtreeIds(nodeId: number, nodes: DeptNode[]): Set<number> {
  const ids = new Set<number>([nodeId]);
  const collectChildren = (children: DeptNode[]) => {
    for (const c of children) {
      ids.add(c.id);
      if (c.children?.length) collectChildren(c.children);
    }
  };
  const findNode = (list: DeptNode[]): DeptNode | undefined => {
    for (const n of list) {
      if (n.id === nodeId) return n;
      if (n.children?.length) {
        const found = findNode(n.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  const target = findNode(nodes);
  if (target?.children?.length) collectChildren(target.children);
  return ids;
}

// 父部门选项：编辑时排除自身及子孙（D-11），新建时显示全部
const parentOptions = computed(() => {
  const excludeIds = form.id ? getSubtreeIds(form.id, tree.value) : new Set<number>();
  return flattenTreeForSelect(tree.value, 0, excludeIds);
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/departments/tree');
    tree.value = data;
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function openEdit(node: any) {
  Object.assign(form, { id: null, name: '', parentId: null, sort: 0 });
  if (node?.id && node?.name) {
    // 编辑模式：填充所有字段包括 parentId
    Object.assign(form, { id: node.id, name: node.name, parentId: node.parentId ?? null, sort: node.sort ?? 0 });
  } else if (node?.parentId) {
    // 新建子部门模式
    form.parentId = node.parentId;
  }
  dialog.value = true;
}

async function onSave() {
  // 表单校验
  const nameValid = await nameRef.value?.validate();
  const sortValid = await sortRef.value?.validate();
  if (!nameValid || !sortValid) return;

  if (form.id) {
    await api.put(`/departments/${form.id}`, {
      name: form.name,
      parentId: form.parentId ?? null,
      sort: form.sort,
    });
  } else {
    await api.post('/departments', {
      name: form.name,
      parentId: form.parentId ?? null,
      sort: form.sort,
    });
  }
  Notify.create({ type: 'positive', message: '保存成功' });
  dialog.value = false;
  await load();
}

function onDelete(node: any) {
  Dialog.create({
    title: '删除部门',
    message: `将永久删除部门 ${node.name}。子部门或用户存在时删除会失败。此操作不可恢复。`,
    cancel: true,
    ok: { label: '确认删除', color: 'negative' },
  }).onOk(async () => {
    await api.delete(`/departments/${node.id}`);
    Notify.create({ type: 'positive', message: '已删除' });
    await load();
  });
}

onMounted(load);
</script>
