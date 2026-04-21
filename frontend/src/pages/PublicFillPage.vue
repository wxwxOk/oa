<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="public-fill-page flex flex-center">
        <div class="form-wrapper" :style="wrapperStyle">

          <!-- 加载中 -->
          <q-card v-if="pageState === 'loading'" flat class="form-card">
            <q-card-section>
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="40%" class="q-mt-sm" />
            </q-card-section>
            <q-separator />
            <q-card-section>
              <q-skeleton v-for="i in 3" :key="i" type="rect" height="56px" class="q-mb-md" />
            </q-card-section>
          </q-card>

          <!-- 错误页 -->
          <q-card v-else-if="pageState === 'error'" flat class="form-card text-center q-pa-xl">
            <q-icon name="error_outline" size="64px" color="grey-5" />
            <div class="text-h6 q-mt-md">{{ errorTitle }}</div>
            <div class="text-body2 q-mt-sm" style="color: var(--oa-text-secondary, #64748B)">{{ errorBody }}</div>
          </q-card>

          <!-- 成功页 -->
          <q-card v-else-if="pageState === 'success'" flat class="form-card text-center q-pa-xl">
            <q-icon name="check_circle" size="80px" color="positive" />
            <div style="font-size: 28px; font-weight: 600; margin-top: 24px">提交成功</div>
            <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary, #64748B)">
              您的信息已成功提交，感谢填写
            </div>
          </q-card>

          <!-- 表单 -->
          <q-card v-else flat class="form-card">
            <q-card-section>
              <div style="font-size: 20px; font-weight: 600; line-height: 1.2">{{ templateData.templateName }}</div>
              <div v-if="templateData.description" class="q-mt-xs" style="font-size: 14px; color: var(--oa-text-secondary, #64748B)">
                {{ templateData.description }}
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <q-form ref="formRef" greedy>
                <!-- 身份信息区域 -->
                <div v-if="templateData.requireIdentity" class="identity-section q-mb-md" style="border-bottom: 1px solid var(--oa-border, #E2E8F0); padding-bottom: 16px">
                  <q-input
                    v-model="identity.name"
                    outlined
                    label="姓名"
                    :rules="[(v: string) => !!v?.trim() || '请输入姓名']"
                  />
                  <q-input
                    v-model="identity.phone"
                    outlined
                    label="手机号"
                    type="tel"
                    mask="###########"
                    class="q-mt-sm"
                    :rules="[(v: string) => /^1\d{10}$/.test(v) || '请输入有效手机号']"
                  />
                </div>

                <!-- 动态表单字段 -->
                <GridFormRenderer
                  v-if="schema"
                  ref="gridRef"
                  :schema="schema"
                  mode="fill"
                  :model-value="formData"
                  @update:model-value="Object.assign(formData, $event)"
                />
              </q-form>
            </q-card-section>
            <q-card-section>
              <q-btn
                color="primary"
                label="提交"
                :loading="submitting"
                class="full-width"
                size="lg"
                style="min-height: 44px"
                @click="handleSubmit"
              />
            </q-card-section>
          </q-card>

        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { QForm } from 'quasar';
import { Notify } from 'quasar';
import axios from 'axios';
import { useResponsive } from 'src/composables/useResponsive';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import type { SchemaV2 } from 'src/types/schema';
import { flattenFields } from 'src/types/schema';

// 独立 axios 实例，无 token 拦截器
const publicApi = axios.create({ baseURL: '/api', timeout: 15000 });

const route = useRoute();
const { isMobile } = useResponsive();
const code = route.params.code as string;

const pageState = ref<'loading' | 'error' | 'form' | 'success'>('loading');
const errorTitle = ref('');
const errorBody = ref('');
const submitting = ref(false);
const formRef = ref<QForm | null>(null);
const gridRef = ref<InstanceType<typeof GridFormRenderer> | null>(null);

const templateData = reactive({
  templateName: '',
  description: '' as string | null,
  requireIdentity: false,
});
const schema = ref<SchemaV2 | null>(null);
const formData = reactive<Record<string, any>>({});
const identity = reactive({ name: '', phone: '' });

const wrapperStyle = computed(() => ({
  maxWidth: '640px',
  width: '100%',
  padding: isMobile.value ? '16px' : '64px 0',
}));

onMounted(async () => {
  try {
    const { data } = await publicApi.get(`/public/f/${code}`);
    templateData.templateName = data.templateName;
    templateData.description = data.description;
    templateData.requireIdentity = data.requireIdentity;
    schema.value = data.schema as SchemaV2;
    // 初始化 formData（使用 flattenFields 遍历嵌套结构）
    for (const f of flattenFields(schema.value)) {
      formData[f.id] = f.type === 'checkbox' ? [] : (f.type === 'signature' ? '' : '');
    }
    // 初始化动态表格数据（D-14: 1 行空值）
    for (const item of schema.value.items) {
      if (item.type === 'dynamic-table') {
        const emptyRow: Record<string, any> = {};
        for (const col of item.columns) {
          emptyRow[col.key] = col.type === 'checkbox' ? [] : '';
        }
        formData[item.id] = [emptyRow];
      }
    }
    pageState.value = 'form';
  } catch (err: any) {
    const status = err.response?.status;
    const errCode = err.response?.data?.code;
    if (status === 404) {
      errorTitle.value = '链接无效';
      errorBody.value = '该链接不存在或已失效，请联系分享者获取新链接';
    } else if (errCode === 'TEMPLATE_OFFLINE' || status === 410) {
      errorTitle.value = '该表单已停止收集';
      errorBody.value = '此表单已被管理员关闭，暂时无法填写';
    } else {
      errorTitle.value = '加载失败';
      errorBody.value = '加载失败，请检查网络后重试';
    }
    pageState.value = 'error';
  }
});

async function handleSubmit() {
  // QForm 验证（QInput rules）
  const formValid = await formRef.value?.validate();

  // 通过 GridFormRenderer 验证 radio/checkbox/signature 字段
  const customValid = gridRef.value?.validateFields() ?? true;

  if (!formValid || !customValid) return;

  // 保存签名字段数据
  const sigData = gridRef.value?.saveSignatures() ?? {};
  Object.assign(formData, sigData);

  submitting.value = true;
  try {
    await publicApi.post(`/public/f/${code}/submit`, {
      data: { ...formData },
      submitterName: templateData.requireIdentity ? identity.name : undefined,
      submitterPhone: templateData.requireIdentity ? identity.phone : undefined,
    });
    pageState.value = 'success';
  } catch {
    Notify.create({ type: 'negative', message: '提交失败，请稍后重试' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.public-fill-page {
  background: #F1F5F9;
  min-height: 100vh;
}
.form-wrapper {
  margin: 0 auto;
}
.form-card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06);
}
@media (max-width: 599px) {
  .form-card {
    border-radius: 8px;
  }
  .form-wrapper {
    padding: 16px !important;
  }
}
@media (min-width: 600px) and (max-width: 1023px) {
  .form-card {
    padding: 24px;
  }
}
@media (min-width: 1024px) {
  .form-card {
    padding: 32px;
  }
}
</style>
