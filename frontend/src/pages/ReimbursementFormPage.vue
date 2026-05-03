<template>
  <q-page padding class="reimbursement-form-page">
    <div class="form-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">{{ isCreateMode ? '新建报销申请' : '编辑报销申请' }}</div>
          <div class="text-body2 muted wrap-text">填写固定报销信息，保存草稿后上传附件。</div>
        </div>
        <ReimbursementStatusChip v-if="detail" :status="detail.status" />
      </div>

      <q-card v-if="loading" flat bordered class="form-card">
        <q-card-section>
          <q-skeleton type="text" width="60%" />
          <q-skeleton v-for="i in 6" :key="i" type="rect" height="56px" class="q-mt-md" />
        </q-card-section>
      </q-card>

      <q-card v-else-if="error" flat bordered class="form-card text-center q-pa-xl">
        <div class="text-body1">报销草稿加载失败，请返回列表或重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </q-card>

      <template v-else>
        <q-card flat bordered class="form-card">
          <q-form ref="formRef" greedy @submit.prevent="saveDraft">
            <q-card-section class="q-gutter-md">
              <div class="section-title">报销信息</div>
              <q-input v-model="form.title" outlined label="报销标题" :rules="[(v) => !!String(v || '').trim() || '请输入报销标题']" />
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.category" outlined label="报销类别" :rules="[(v) => !!String(v || '').trim() || '请输入报销类别']" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.occurredAt" outlined readonly label="发生日期" :rules="[(v) => !!v || '请选择发生日期']">
                    <template #append>
                      <q-icon name="event" class="cursor-pointer" aria-label="选择发生日期">
                        <q-tooltip>选择发生日期</q-tooltip>
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <q-date v-model="form.occurredAt" mask="YYYY-MM-DD" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </div>
              <q-input
                v-model="form.amount"
                outlined
                type="number"
                step="0.01"
                min="0"
                label="报销金额"
                :rules="[(v) => Number(v) > 0 || '报销金额必须大于 0']"
              />
              <q-input
                v-model="form.reason"
                outlined
                type="textarea"
                autogrow
                label="报销事由"
                :rules="[(v) => !!String(v || '').trim() || '请输入报销事由']"
              />
              <q-input v-model="form.payeeInfo" outlined label="收款信息" />
              <q-input v-model="form.remark" outlined type="textarea" autogrow label="备注" />
            </q-card-section>
            <q-card-actions v-if="isDesktop" align="right" class="q-pa-md">
              <q-btn flat label="返回" :disable="isBusy" @click="goBack" />
              <q-btn outline color="primary" label="保存草稿" :loading="saving" :disable="isBusy" @click="saveDraft" />
              <q-btn color="primary" label="提交申请" :loading="submitting" :disable="isBusy" @click="submitApplication" />
            </q-card-actions>
          </q-form>
        </q-card>

        <div class="q-mt-md">
          <div v-if="!savedApplicationId" class="text-caption muted q-mb-sm">先保存草稿后上传附件</div>
          <ReimbursementAttachmentPanel
            :application-id="savedApplicationId"
            :attachments="attachments"
            :editable="true"
            @uploaded="reloadDetail"
            @deleted="reloadDetail"
          />
        </div>
      </template>
    </div>

    <div v-if="isMobile && !loading && !error" class="mobile-actions">
      <q-btn outline color="primary" label="保存草稿" :loading="saving" :disable="isBusy" @click="saveDraft" />
      <q-btn color="primary" label="提交申请" :loading="submitting" :disable="isBusy" @click="submitApplication" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { QForm } from 'quasar';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ReimbursementAttachmentPanel from 'src/components/reimbursement/ReimbursementAttachmentPanel.vue';
import ReimbursementStatusChip from 'src/components/reimbursement/ReimbursementStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useReimbursementStore } from 'src/stores/reimbursement';
import { isDraftReimbursement, type ReimbursementDetail, type ReimbursementWritePayload } from 'src/types/reimbursement';

defineOptions({ name: 'ReimbursementFormPage' });

const route = useRoute();
const router = useRouter();
const store = useReimbursementStore();
const { isDesktop, isMobile } = useResponsive();

const formRef = ref<QForm | null>(null);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const submitting = ref(false);
const detail = ref<ReimbursementDetail | null>(null);
const savedId = ref<number | null>(null);
const form = reactive<ReimbursementWritePayload>({
  title: '',
  category: '',
  occurredAt: '',
  amount: '',
  reason: '',
  payeeInfo: '',
  remark: '',
});

const isCreateMode = computed(() => route.path === '/reimbursements/new');
const routeId = computed(() => Number(route.params.id));
const savedApplicationId = computed(() => detail.value?.id ?? savedId.value ?? null);
const attachments = computed(() => detail.value?.attachments ?? []);
const isBusy = computed(() => saving.value || submitting.value || store.actionLoading || store.uploadLoading);

function fillForm(data: ReimbursementDetail) {
  form.title = data.title;
  form.category = data.category;
  form.occurredAt = data.occurredAt?.slice(0, 10) ?? '';
  form.amount = data.amount;
  form.reason = data.reason;
  form.payeeInfo = data.payeeInfo ?? '';
  form.remark = data.remark ?? '';
}

async function loadDetail(id: number) {
  const data = await store.fetchDetail(id);
  if (!isDraftReimbursement(data)) {
    await router.replace(`/reimbursements/${id}`);
    return;
  }
  detail.value = data;
  savedId.value = data.id;
  fillForm(data);
}

async function load() {
  if (isCreateMode.value) return;
  loading.value = true;
  try {
    await loadDetail(routeId.value);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function validateForm() {
  return (await formRef.value?.validate()) ?? false;
}

async function persistDraft() {
  const id = savedApplicationId.value;
  if (id) {
    const row = await store.updateDraft(id, form);
    await loadDetail(row.id);
    return row;
  }
  const row = await store.createDraft(form);
  savedId.value = row.id;
  await router.replace(`/reimbursements/${row.id}/edit`);
  await loadDetail(row.id);
  return row;
}

async function saveDraft() {
  if (!(await validateForm())) return;
  saving.value = true;
  try {
    await persistDraft();
    Notify.create({ type: 'positive', message: '草稿已保存' });
  } catch {
    Notify.create({ type: 'negative', message: '草稿保存失败，请检查后重试。' });
  } finally {
    saving.value = false;
  }
}

async function submitApplication() {
  if (!(await validateForm())) return;
  submitting.value = true;
  try {
    const row = await persistDraft();
    await store.submitDraft(row.id);
    Notify.create({ type: 'positive', message: '报销申请已提交，等待部门初审' });
    await router.push(`/reimbursements/${row.id}`);
  } catch {
    Notify.create({ type: 'negative', message: '报销申请提交失败，请检查后重试。' });
  } finally {
    submitting.value = false;
  }
}

async function reloadDetail() {
  if (!savedApplicationId.value) return;
  try {
    await loadDetail(savedApplicationId.value);
  } catch {
    Notify.create({ type: 'negative', message: '附件列表刷新失败，请重试。' });
  }
}

function goBack() {
  router.push('/reimbursements');
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.reimbursement-form-page {
  background: var(--oa-bg);
}

.form-wrapper {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 88px;
}

.form-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  overflow-wrap: anywhere;
}

.min-width-0 {
  min-width: 0;
}

.mobile-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: var(--oa-surface);
  border-top: 1px solid var(--oa-border);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 10;
}

.mobile-actions .q-btn {
  min-height: 44px;
}
</style>
