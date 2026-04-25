<template>
  <q-page padding class="approval-app-page">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">我的申请</div>
      <q-space />
      <q-btn
        v-if="isMobile"
        flat
        dense
        round
        icon="filter_list"
        aria-label="筛选我的申请"
        @click="filterDialog = true"
      >
        <q-tooltip>筛选</q-tooltip>
      </q-btn>
      <q-btn
        v-perm="'approval:application:create'"
        color="primary"
        :icon="isMobile ? 'add' : 'add'"
        :label="isMobile ? '' : '发起申请'"
        :round="isMobile"
        :aria-label="isMobile ? '发起申请' : undefined"
        :style="isMobile ? 'min-width:44px;min-height:44px' : ''"
        @click="openTemplatePicker"
      >
        <q-tooltip v-if="isMobile">发起申请</q-tooltip>
      </q-btn>
    </div>

    <div v-if="isDesktop" class="application-filter row items-center q-gutter-sm q-mb-md">
      <q-btn-toggle
        v-model="store.statusFilter"
        toggle-color="primary"
        flat
        bordered
        :options="statusOptions"
        @update:model-value="applyFilters"
      />
      <q-input v-model="store.dateFrom" outlined dense readonly label="开始日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="store.dateFrom" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input v-model="store.dateTo" outlined dense readonly label="结束日期" class="date-filter">
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="store.dateTo" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
    </div>

    <div v-if="firstLoading" class="q-pa-md">
      <template v-if="isDesktop">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton v-for="i in 5" :key="i" type="rect" height="48px" class="q-mb-xs" />
      </template>
      <template v-else>
        <q-card v-for="i in 3" :key="i" flat bordered class="application-card q-mb-sm">
          <q-card-section>
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="80%" class="q-mt-xs" />
            <q-skeleton type="text" width="52%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </template>
    </div>

    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <div class="text-body1">我的申请加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </div>
    </div>

    <EmptyState
      v-else-if="store.rows.length === 0 && !store.loading"
      icon="assignment"
      title="暂无申请记录"
      description="发起第一份审批申请后，可在这里跟踪草稿、审批进度和结果。"
      :cta-text="canCreateApplication ? '发起申请' : undefined"
      @action="openTemplatePicker"
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
        <template #body-cell-templateName="props">
          <q-td :props="props">
            <div class="text-body2">{{ props.row.templateName }}</div>
            <div class="text-caption muted">v{{ props.row.templateVersion }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <ApplicationStatusChip :status="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-currentNodeName="props">
          <q-td :props="props">{{ props.row.currentNodeName || '—' }}</q-td>
        </template>
        <template #body-cell-updatedAt="props">
          <q-td :props="props">{{ formatDate(props.row.updatedAt) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              :icon="props.row.status === 'DRAFT' ? 'edit' : 'visibility'"
              :label="props.row.status === 'DRAFT' ? '继续填写' : '查看详情'"
              :aria-label="`${props.row.status === 'DRAFT' ? '继续填写' : '查看详情'} ${props.row.applicationNo}`"
              @click="openApplication(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <div v-else class="q-gutter-sm">
        <q-card
          v-for="row in store.rows"
          :key="row.id"
          flat
          bordered
          class="application-card cursor-pointer"
          @click="openApplication(row)"
        >
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col min-width-0">
                <div class="text-subtitle1 wrap-text">{{ row.templateName }}</div>
                <div class="text-caption muted">申请编号：{{ row.applicationNo }}</div>
              </div>
              <ApplicationStatusChip :status="row.status" />
            </div>
            <div class="text-caption muted q-mt-sm">当前节点：{{ row.currentNodeName || '—' }}</div>
            <div class="text-caption muted">更新时间：{{ formatDate(row.updatedAt) }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              dense
              color="primary"
              :icon="row.status === 'DRAFT' ? 'edit' : 'visibility'"
              :label="row.status === 'DRAFT' ? '继续填写' : '查看详情'"
              :aria-label="`${row.status === 'DRAFT' ? '继续填写' : '查看详情'} ${row.applicationNo}`"
              @click.stop="openApplication(row)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <q-dialog v-model="filterDialog" position="bottom">
      <q-card class="filter-sheet">
        <q-card-section class="text-h6">筛选</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-btn-toggle
            v-model="store.statusFilter"
            toggle-color="primary"
            flat
            bordered
            spread
            :options="statusOptions"
          />
          <q-input v-model="store.dateFrom" outlined dense readonly label="开始日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="store.dateFrom" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input v-model="store.dateTo" outlined dense readonly label="结束日期">
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="store.dateTo" mask="YYYY-MM-DD" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="返回" v-close-popup />
          <q-btn color="primary" label="重新加载" @click="applyFilters" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="templateDialog"
      :maximized="isMobile"
      :transition-show="isMobile ? 'slide-up' : 'scale'"
      :transition-hide="isMobile ? 'slide-down' : 'scale'"
    >
      <q-card :style="isMobile ? '' : 'width:720px;max-width:calc(100vw - 32px)'">
        <q-bar v-if="isMobile">
          <q-space />
          <q-btn dense flat icon="close" aria-label="关闭发起申请" v-close-popup>
            <q-tooltip>关闭</q-tooltip>
          </q-btn>
        </q-bar>
        <q-card-section class="text-h6">发起申请</q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="templateLoading">
            <q-skeleton v-for="i in 4" :key="i" type="rect" height="56px" class="q-mb-sm" />
          </div>
          <EmptyState
            v-else-if="store.templates.length === 0"
            icon="assignment"
            title="暂无可发起申请"
            description="当前没有已发布且绑定审批流程的模板，请联系管理员。"
          />
          <q-list v-else separator>
            <q-item
              v-for="template in store.templates"
              :key="template.id"
              clickable
              v-ripple
              class="template-row"
              @click="selectTemplate(template.id)"
            >
              <q-item-section>
                <q-item-label class="wrap-text">{{ template.name }}</q-item-label>
                <q-item-label v-if="template.description" caption class="wrap-text">
                  {{ template.description }}
                </q-item-label>
                <q-item-label caption>
                  {{ template.approvalProcessName }} · v{{ template.schemaVersion }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  color="primary"
                  icon="arrow_forward"
                  label="选择模板"
                  :loading="selectingTemplateId === template.id"
                  :disable="selectingTemplateId !== null"
                  :aria-label="`选择模板 ${template.name}`"
                  @click.stop="selectTemplate(template.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import { useRouter } from 'vue-router';
import EmptyState from 'src/components/EmptyState.vue';
import ApplicationStatusChip from 'src/components/approval/ApplicationStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useAuthStore } from 'src/stores/auth';
import { useApprovalApplicationStore } from 'src/stores/approvalApplication';
import type { ApprovalApplicationRow } from 'src/types/approvalApplication';

const router = useRouter();
const store = useApprovalApplicationStore();
const auth = useAuthStore();
const { isDesktop, isMobile } = useResponsive();

const firstLoading = ref(true);
const error = ref(false);
const filterDialog = ref(false);
const templateDialog = ref(false);
const templateLoading = ref(false);
const selectingTemplateId = ref<number | null>(null);

const canCreateApplication = computed(() => auth.hasPerm('approval:application:create'));

const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '审批中', value: 'IN_PROGRESS' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已撤销', value: 'CANCELED' },
];

const columns = [
  { name: 'applicationNo', label: '申请编号', field: 'applicationNo', align: 'left' as const, style: 'width:140px' },
  { name: 'templateName', label: '申请类型', field: 'templateName', align: 'left' as const },
  { name: 'status', label: '状态', field: 'status', align: 'center' as const, style: 'width:96px' },
  { name: 'currentNodeName', label: '当前节点', field: 'currentNodeName', align: 'left' as const, style: 'width:160px' },
  { name: 'updatedAt', label: '更新时间', field: 'updatedAt', align: 'left' as const, style: 'width:160px' },
  { name: 'actions', label: '操作', field: 'id', align: 'center' as const, style: 'width:140px' },
];

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

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

function applyFilters() {
  store.page = 1;
  filterDialog.value = false;
  load();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\//g, '-');
}

function openApplication(row: ApprovalApplicationRow) {
  if (row.status === 'DRAFT') {
    router.push(`/approval/applications/${row.id}/edit`);
    return;
  }
  router.push(`/approval/applications/${row.id}`);
}

async function openTemplatePicker() {
  templateDialog.value = true;
  templateLoading.value = true;
  try {
    await store.fetchTemplates();
  } finally {
    templateLoading.value = false;
  }
}

async function selectTemplate(templateId: number) {
  selectingTemplateId.value = templateId;
  try {
    const draft = await store.createDraft({ templateId, formData: {} });
    templateDialog.value = false;
    router.push(`/approval/applications/${draft.id}/edit`);
  } catch {
    Notify.create({ type: 'negative', message: '申请模板加载失败，请检查网络后重试。' });
  } finally {
    selectingTemplateId.value = null;
  }
}

onMounted(() => load());
</script>

<style scoped>
.approval-app-page {
  background: var(--oa-bg);
}

.application-filter {
  align-items: stretch;
}

.date-filter {
  width: 160px;
}

.muted {
  color: var(--oa-text-secondary);
}

.application-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.template-row {
  min-height: 56px;
}

.filter-sheet {
  border-radius: 8px 8px 0 0;
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 1023px) {
  .application-card .q-btn,
  .filter-sheet .q-btn,
  .template-row {
    min-height: 44px;
  }
}
</style>
