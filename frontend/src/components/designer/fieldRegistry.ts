import type { FormField } from 'src/stores/template';

export interface FieldTypeDef {
  type: FormField['type'];
  label: string;
  icon: string;
  group: 'basic' | 'special';
  defaultProps: Partial<FormField>;
}

export const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'text', label: '文本', icon: 'text_fields', group: 'basic', defaultProps: { placeholder: '请输入' } },
  { type: 'textarea', label: '多行文本', icon: 'notes', group: 'basic', defaultProps: { placeholder: '请输入' } },
  { type: 'radio', label: '单选', icon: 'radio_button_checked', group: 'basic', defaultProps: { options: ['选项1', '选项2'] } },
  { type: 'checkbox', label: '多选', icon: 'check_box', group: 'basic', defaultProps: { options: ['选项1', '选项2'] } },
  { type: 'date', label: '日期', icon: 'calendar_today', group: 'basic', defaultProps: {} },
  { type: 'phone', label: '手机号', icon: 'phone', group: 'basic', defaultProps: { placeholder: '请输入手机号' } },
  { type: 'signature', label: '手写签名', icon: 'draw', group: 'special', defaultProps: {} },
];

export const FIELD_GROUPS = {
  basic: { label: '基础字段', types: FIELD_TYPES.filter(f => f.group === 'basic') },
  special: { label: '特殊字段', types: FIELD_TYPES.filter(f => f.group === 'special') },
};
