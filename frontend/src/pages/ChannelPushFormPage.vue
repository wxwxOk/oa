<template>
  <q-page padding class="channel-push-form-page">
    <div class="form-wrapper">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
          <q-tooltip>返回</q-tooltip>
        </q-btn>
        <div class="col min-width-0">
          <div class="text-h6 wrap-text">{{ isCreateMode ? '新建学员推送' : '编辑学员推送' }}</div>
          <div class="text-body2 muted wrap-text">提交后由内部主接收人审核，待审核状态可编辑或撤回</div>
        </div>
        <ChannelPushStatusChip v-if="detail" :status="detail.status" />
      </div>

      <q-card v-if="loading" flat bordered class="form-card">
        <q-card-section><q-skeleton type="text" width="60%" /></q-card-section>
      </q-card>

      <q-card v-else-if="error" flat bordered class="form-card text-center q-pa-xl">
        <div class="text-body1">推送数据加载失败，请返回列表或重试。</div>
        <q-btn color="primary" label="重新加载" class="q-mt-md" @click="load" />
      </q-card>

      <template v-else>
        <q-card flat bordered class="form-card">
          <q-form ref="formRef" greedy @submit.prevent="onSubmit">
            <q-card-section class="q-gutter-md">
              <div class="section-title">学员信息</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.studentName"
                    outlined
                    label="学员姓名 *"
                    maxlength="64"
                    :rules="[(v) => !!String(v || '').trim() || '请输入学员姓名']"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.studentPhone"
                    outlined
                    label="手机号 *"
                    maxlength="32"
                    :rules="[(v) => !!String(v || '').trim() || '请输入手机号']"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model.number="form.studentAge" outlined type="number" min="1" max="120" label="年龄" />
                </div>
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="form.studentGender"
                    outlined
                    emit-value
                    map-options
                    use-input
                    new-value-mode="add-unique"
                    :options="genderOptions"
                    label="性别"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.studentEducation" outlined maxlength="64" label="学历" />
                </div>
              </div>
              <div class="section-title">意向信息</div>
              <q-select
                v-model="form.intentStatus"
                outlined
                emit-value
                map-options
                use-input
                new-value-mode="add-unique"
                :options="intentStatusOptions"
                label="意向状态"
              />
              <q-input v-model="form.intentNote" outlined type="textarea" autogrow label="意向说明" maxlength="1000" />
              <q-input v-model="form.remark" outlined type="textarea" autogrow label="备注" maxlength="1000" />
            </q-card-section>
            <q-card-actions v-if="isDesktop" align="right" class="q-pa-md">
              <q-btn flat label="返回" :disable="isBusy" @click="goBack" />
              <q-btn
                color="primary"
                :label="isCreateMode ? '提交推送' : '保存修改'"
                :loading="submitting"
                :disable="isBusy"
                @click="onSubmit"
              />
            </q-card-actions>
          </q-form>
        </q-card>

        <div class="q-mt-md">
          <ChannelPushAttachmentPanel
            :push-id="attachmentPushId"
            :attachments="detail?.attachments ?? []"
            :editable="canMutate"
            @uploaded="reloadDetail"
            @deleted="reloadDetail"
          />
        </div>
      </template>
    </div>

    <div v-if="isMobile && !loading && !error" class="mobile-actions">
      <q-btn flat label="返回" :disable="isBusy" @click="goBack" />
      <q-btn
        color="primary"
        :label="isCreateMode ? '提交推送' : '保存修改'"
        :loading="submitting"
        :disable="isBusy"
        @click="onSubmit"
      />
    </div>

    <ChannelPushDuplicateDialog v-model="duplicateDialogOpen" :hints="duplicateHints" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { QForm } from 'quasar';
import { Notify } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import ChannelPushAttachmentPanel from 'src/components/channel-push/ChannelPushAttachmentPanel.vue';
import ChannelPushDuplicateDialog from 'src/components/channel-push/ChannelPushDuplicateDialog.vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import { useResponsive } from 'src/composables/useResponsive';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  channelPushStatusLabel,
  type ChannelPushDetail,
  type ChannelPushDuplicateHint,
  type ChannelPushWritePayload,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushFormPage' });

const route = useRoute();
const router = useRouter();
const store = useChannelPushStore();
const { isDesktop, isMobile } = useResponsive();

const formRef = ref<QForm | null>(null);
const loading = ref(false);
const error = ref(false);
const submitting = ref(false);
const detail = ref<ChannelPushDetail | null>(null);
const duplicateDialogOpen = ref(false);
const duplicateHints = ref<ChannelPushDuplicateHint[]>([]);

const form = reactive<ChannelPushWritePayload>({
  studentName: '',
  studentPhone: '',
  studentAge: null,
  studentEducation: '',
  studentGender: '',
  intentStatus: '',
  intentNote: '',
  remark: '',
});

const isCreateMode = computed(() => route.path === '/channel-push/new');
const routeId = computed(() => Number(route.params.id) || null);
const attachmentPushId = computed(() => detail.value?.id ?? routeId.value ?? null);
const canMutate = computed(() => detail.value?.status === 'PENDING');
const isBusy = computed(() => submitting.value || store.actionLoading || store.uploadLoading);

const genderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '其他', value: '其他' },
];

const intentStatusOptions = [
  { label: '待跟进', value: '待跟进' },
  { label: '有意向', value: '有意向' },
  { label: '无意向', value: '无意向' },
  { label: '暂时观望', value: '暂时观望' },
  { label: '其他', value: '其他' },
];

function fillForm(data: ChannelPushDetail) {
  form.studentName = data.studentName;
  form.studentPhone = data.studentPhone;
  form.studentAge = data.studentAge ?? null;
  form.studentEducation = data.studentEducation ?? '';
  form.studentGender = data.studentGender ?? '';
  form.intentStatus = data.intentStatus ?? '';
  form.intentNote = data.intentNote ?? '';
  form.remark = data.remark ?? '';
}

async function loadDetail(id: number) {
  const data = await store.fetchDetail(id);
  if (data.status !== 'PENDING') {
    Notify.create({ type: 'warning', message: `该推送已${channelPushStatusLabel(data.status)}，无法继续编辑` });
    await router.replace(`/channel-push/${id}`);
    return;
  }
  detail.value = data;
  fillForm(data);
}

async function load() {
  if (isCreateMode.value) {
    detail.value = null;
    return;
  }
  const id = routeId.value;
  if (!id) {
    await router.replace('/channel-push');
    return;
  }
  loading.value = true;
  try {
    await loadDetail(id);
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

async function onSubmit() {
  if (!(await validateForm())) {
    Notify.create({ type: 'negative', message: '请检查表单' });
    return;
  }
  submitting.value = true;
  try {
    if (isCreateMode.value) {
      const response = await store.create(form, []);
      duplicateHints.value = response.duplicateHints ?? [];
      if (duplicateHints.value.length > 0) duplicateDialogOpen.value = true;
      Notify.create({ type: 'positive', message: '推送提交成功' });
      await router.replace(`/channel-push/${response.push.id}`);
    } else {
      const id = routeId.value as number;
      const response = await store.update(id, form);
      duplicateHints.value = response.duplicateHints ?? [];
      if (duplicateHints.value.length > 0) duplicateDialogOpen.value = true;
      Notify.create({ type: 'positive', message: '推送已更新' });
      await router.replace(`/channel-push/${response.push.id}`);
    }
  } catch {
    // axios interceptor handles error notify
  } finally {
    submitting.value = false;
  }
}

async function reloadDetail() {
  const id = attachmentPushId.value;
  if (!id) return;
  try {
    const data = await store.fetchDetail(id);
    detail.value = data;
  } catch {
    Notify.create({ type: 'negative', message: '附件列表刷新失败，请重试。' });
  }
}

function goBack() {
  void router.push('/channel-push');
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.channel-push-form-page { background: var(--oa-bg); }
.form-wrapper { max-width: 960px; width: 100%; margin: 0 auto; padding-bottom: 88px; }
.form-card { border-radius: 8px; background: var(--oa-surface); }
.section-title { font-size: 16px; font-weight: 600; }
.muted { color: var(--oa-text-secondary); }
.wrap-text { overflow-wrap: anywhere; }
.min-width-0 { min-width: 0; }
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
.mobile-actions .q-btn { min-height: 44px; }
</style>
