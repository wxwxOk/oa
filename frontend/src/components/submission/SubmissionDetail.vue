<template>
  <div class="drawer-content">
    <!-- 抽屉头部 — 打印时隐藏 -->
    <div class="drawer-header row items-center justify-between q-mb-md">
      <div style="font-size: 20px; font-weight: 600">提交详情</div>
      <q-btn flat round icon="close" @click="emit('close')" />
    </div>

    <!-- 操作按钮 — 打印时隐藏 -->
    <div class="drawer-actions row q-gutter-sm q-mb-md">
      <q-btn outline icon="print" label="打印" @click="emit('print')" aria-label="打印当前提交数据" />
      <q-btn outline icon="picture_as_pdf" label="导出 PDF" @click="emit('exportPdf')" aria-label="导出当前提交为PDF" />
    </div>

    <!-- 打印区域 -->
    <div
      id="print-area"
      class="detail-body"
      :data-form-title="templateName"
      :data-submit-time="formatDate(submission.createdAt)"
    >
      <!-- 打印表头 -->
      <div class="print-header" style="text-align: center; margin-bottom: 16px">
        <div style="font-size: 16pt; font-weight: 600">{{ templateName }}</div>
        <div style="font-size: 12pt; color: var(--oa-text-secondary)">
          提交时间：{{ formatDate(submission.createdAt) }}
        </div>
      </div>

      <!-- v2 schema: GridFormRenderer print 模式 -->
      <template v-if="isV2Schema && v2Schema">
        <GridFormRenderer
          :schema="v2Schema"
          mode="print"
          :model-value="submission.data as Record<string, any>"
        />
      </template>

      <!-- v1 schema fallback: 保留现有 table 渲染 -->
      <template v-else>
        <table class="detail-table" style="width: 100%; border-collapse: collapse">
          <tr v-for="field in displayFields" :key="field.id">
            <th>{{ field.label }}</th>
            <td>{{ formatFieldValue(field) }}</td>
          </tr>
        </table>
        <div v-if="signatureField" class="signature-section" style="margin-top: 16px">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px">签名</div>
          <img :src="signatureField.value" style="max-width: 300px; max-height: 150px; border: 1px solid var(--oa-border)" alt="手写签名" />
        </div>
      </template>

      <!-- 版本不一致提示 -->
      <q-banner v-if="versionMismatch" class="q-mt-md" type="warning" dense>
        字段定义可能已更新，显示为原始提交数据
      </q-banner>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SubmissionDetail } from 'src/stores/submission';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';
import type { SchemaV2 } from 'src/types/schema';

const props = defineProps<{
  submission: SubmissionDetail;
  templateName: string;
}>();

const emit = defineEmits<{
  print: [];
  exportPdf: [];
  close: [];
}>();

// v2 schema 检测
const isV2Schema = computed(() => {
  const schema = props.submission.template.schema;
  return schema && typeof schema === 'object' && !Array.isArray(schema) && (schema as any).version === 2;
});

const v2Schema = computed(() =>
  isV2Schema.value ? (props.submission.template.schema as unknown as SchemaV2) : null
);

// 版本是否一致
const versionMismatch = computed(() =>
  props.submission.schemaVersion !== props.submission.template.schemaVersion
);

// 安全解析 schema（可能是字符串或数组）
function parseSchema(raw: any): any[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : null; } catch { return null; }
  }
  return null;
}

// 解析字段展示列表
const displayFields = computed(() => {
  const schema = parseSchema(props.submission.template.schema);
  const data = props.submission.data as Record<string, any>;

  if (!versionMismatch.value && schema) {
    // 版本一致：用 schema 字段定义渲染
    return schema
      .filter((f: any) => f.type !== 'signature')
      .map((f: any) => ({
        id: f.id,
        label: f.label || f.id,
        value: data[f.id],
        type: f.type,
        options: f.options,
      }));
  } else {
    // 版本不一致或 schema 无法解析：用 schema 做 label 映射
    const labelMap = schema
      ? Object.fromEntries(schema.map((f: any) => [f.id, f.label]))
      : {};
    return Object.entries(data)
      .filter(([key]) => {
        if (schema) {
          const field = schema.find((f: any) => f.id === key);
          return !field || field.type !== 'signature';
        }
        return !key.startsWith('signature');
      })
      .map(([key, value]) => ({
        id: key,
        label: labelMap[key] || key,
        value,
        type: schema?.find((f: any) => f.id === key)?.type || 'text',
        options: schema?.find((f: any) => f.id === key)?.options,
      }));
  }
});

// 签名字段
const signatureField = computed(() => {
  const schema = parseSchema(props.submission.template.schema);
  const data = props.submission.data as Record<string, any>;
  const sigField = schema ? schema.find((f: any) => f.type === 'signature') : null;
  if (sigField && data[sigField.id]) {
    return { value: data[sigField.id] };
  }
  // fallback: 查找 data 中以 signature 开头的 key
  const sigKey = Object.keys(data).find(k => k.startsWith('signature'));
  if (sigKey && data[sigKey]) {
    return { value: data[sigKey] };
  }
  return null;
});

// 格式化字段值
function formatFieldValue(field: { value: any; type: string; options?: any[] }) {
  if (field.value == null || field.value === '') return '—';
  if (field.type === 'checkbox' && Array.isArray(field.value)) {
    return field.value.join('、');
  }
  if (field.type === 'date' && typeof field.value === 'string' && field.value.includes('T')) {
    return field.value.split('T')[0];
  }
  return String(field.value);
}

// 格式化日期
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<style scoped>
.drawer-content {
  padding: 24px;
}

.detail-table th,
.detail-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--oa-border, #e5e7eb);
}
.detail-table th {
  font-size: 14px;
  font-weight: 600;
  width: 30%;
  color: var(--oa-text-secondary);
  background: var(--oa-hover, #f8fafc);
}
.detail-table td {
  font-size: 16px;
}
</style>
