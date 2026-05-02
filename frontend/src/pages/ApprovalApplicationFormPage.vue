<template>
  <q-page padding class="approval-form-page">
    <div class="form-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">{{ detail?.templateName || '发起申请' }}</div>
          <div v-if="detail" class="text-caption muted">v{{ detail.templateVersion }}</div>
        </div>
      </div>

      <q-card v-if="loading" flat bordered class="form-card">
        <q-card-section>
          <q-skeleton type="text" width="60%" />
          <q-skeleton type="text" width="40%" class="q-mt-sm" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-skeleton v-for="i in 3" :key="i" type="rect" height="56px" class="q-mb-md" />
        </q-card-section>
      </q-card>

      <q-card v-else-if="error" flat bordered class="form-card text-center q-pa-xl">
        <div class="text-body1">申请模板加载失败，请检查网络后重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </q-card>

      <q-card v-else-if="detail" flat bordered class="form-card">
        <q-card-section>
          <div class="snapshot-row row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <span class="muted">申请人：</span>{{ detail.applicantName }}
            </div>
            <div class="col-12 col-sm-6">
              <span class="muted">部门：</span>{{ detail.applicantDepartmentName || '未设置部门' }}
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-form ref="formRef" greedy>
          <q-card-section>
            <GridFormRenderer
              ref="gridRef"
              :schema="detail.schemaSnapshot"
              mode="fill"
              :model-value="formData"
              @update:model-value="formData = $event"
            />
          </q-card-section>
        </q-form>
        <q-card-actions v-if="isDesktop" align="right" class="q-pa-md">
          <q-btn flat label="返回" :disable="isBusy" @click="goBack" />
          <q-btn
            outline
            color="primary"
            label="保存草稿"
            :loading="saving"
            :disable="isBusy"
            @click="saveDraft"
          />
          <q-btn
            color="primary"
            label="提交申请"
            :loading="submitting"
            :disable="isBusy"
            @click="submitApplication"
          />
        </q-card-actions>
      </q-card>
    </div>

    <div v-if="isMobile && detail" class="mobile-actions">
      <q-btn
        outline
        color="primary"
        label="保存草稿"
        :loading="saving"
        :disable="isBusy"
        @click="saveDraft"
      />
      <q-btn
        color="primary"
        label="提交申请"
        :loading="submitting"
        :disable="isBusy"
        @click="submitApplication"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { QForm } from 'quasar';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useApprovalApplicationStore } from 'src/stores/approvalApplication';
import type { ApprovalApplicationDetail } from 'src/types/approvalApplication';

const route = useRoute();
const router = useRouter();
const store = useApprovalApplicationStore();
const { isDesktop, isMobile } = useResponsive();

const formRef = ref<QForm | null>(null);
const gridRef = ref<InstanceType<typeof GridFormRenderer> | null>(null);
const loading = ref(true);
const error = ref(false);
const saving = ref(false);
const submitting = ref(false);
const detail = ref<ApprovalApplicationDetail | null>(null);
const formData = ref<Record<string, unknown>>({});

const applicationId = computed(() => Number(route.params.id));
const isBusy = computed(() => saving.value || submitting.value || store.actionLoading);

async function load() {
  loading.value = true;
  try {
    const data = await store.fetchDetail(applicationId.value);
    if (data.status !== 'DRAFT') {
      router.replace(`/approval/applications/${data.id}`);
      return;
    }
    detail.value = data;
    formData.value = { ...data.formData };
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function mergeSignatureData() {
  const signatures = gridRef.value?.saveSignatures() ?? {};
  formData.value = { ...formData.value, ...signatures };
  return formData.value;
}

async function saveDraft() {
  saving.value = true;
  try {
    const data = mergeSignatureData();
    await store.updateDraft(applicationId.value, data);
    Notify.create({ type: 'positive', message: '草稿已保存' });
  } catch {
    Notify.create({ type: 'negative', message: '草稿保存失败，请检查网络后重试。' });
  } finally {
    saving.value = false;
  }
}

async function submitApplication() {
  const formValid = await formRef.value?.validate();
  const gridValid = gridRef.value?.validateFields() ?? true;
  if (!formValid || !gridValid) {
    Notify.create({ type: 'negative', message: '请完善必填项后再提交申请。' });
    return;
  }

  submitting.value = true;
  try {
    const data = mergeSignatureData();
    await store.submit(applicationId.value, data);
    Notify.create({ type: 'positive', message: '申请已提交' });
    router.push(`/approval/applications/${applicationId.value}`);
  } catch {
    Notify.create({ type: 'negative', message: '申请提交失败，请检查网络后重试。' });
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.push('/approval/applications');
}

onMounted(() => load());
</script>

<style scoped>
.approval-form-page {
  background: var(--oa-bg);
}

.form-wrapper {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 80px;
}

.form-card {
  border-radius: 8px;
  background: var(--oa-surface);
}

.snapshot-row {
  font-size: 14px;
  line-height: 1.5;
}

.muted {
  color: var(--oa-text-secondary);
}

.wrap-text {
  white-space: normal;
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
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 10;
}

.mobile-actions .q-btn {
  min-height: 44px;
}
</style>
