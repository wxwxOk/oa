import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const listSource = readFileSync(resolve(__dirname, '../ReimbursementPage.vue'), 'utf8');
const formSource = readFileSync(resolve(__dirname, '../ReimbursementFormPage.vue'), 'utf8');
const detailSource = readFileSync(resolve(__dirname, '../ReimbursementDetailPage.vue'), 'utf8');
const statusChipSource = readFileSync(resolve(__dirname, '../../components/reimbursement/ReimbursementStatusChip.vue'), 'utf8');
const attachmentSource = readFileSync(resolve(__dirname, '../../components/reimbursement/ReimbursementAttachmentPanel.vue'), 'utf8');
const timelineSource = readFileSync(resolve(__dirname, '../../components/reimbursement/ReimbursementActionTimeline.vue'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../router/routes.ts'), 'utf8');
const menuSource = readFileSync(resolve(__dirname, '../../layouts/MainLayout.vue'), 'utf8');
const uiSource = `${listSource}\n${formSource}\n${detailSource}\n${statusChipSource}\n${attachmentSource}\n${timelineSource}`;

const readPermAny = "['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review']";

describe('Reimbursement UI source contract', () => {
  it('pins routes, menu and permission boundaries', () => {
    expect(routeSource).toContain("path: 'reimbursements'");
    expect(routeSource).toContain("path: 'reimbursements/new'");
    expect(routeSource).toContain("path: 'reimbursements/:id/edit'");
    expect(routeSource).toContain("path: 'reimbursements/:id'");
    expect(routeSource).toContain('我的报销');
    expect(routeSource).toContain(readPermAny);
    expect(menuSource).toContain("path: '/reimbursements'");
    expect(menuSource).toContain("title: '报销管理'");
    expect(menuSource).toContain(readPermAny);
    expect(routeSource).toContain("perm: 'reimbursement:create'");
    expect(attachmentSource).toContain('reimbursement:attachment');
    expect(uiSource).toContain('auth.hasPerm');
  });

  it('pins responsive list filters, table and card structure', () => {
    for (const value of ['我的报销', '新建报销申请', '暂无报销申请', '查询', '重置筛选', '应用筛选']) {
      expect(listSource).toContain(value);
    }
    for (const key of ['keyword', 'status', 'category', 'dateFrom', 'dateTo']) {
      expect(listSource).toContain(key);
    }
    expect(listSource).toContain('q-table');
    expect(listSource).toContain('@request');
    expect(listSource).toContain(':rows-per-page-options="[10, 20, 50]"');
    expect(listSource).toContain('reimbursement-card');
    expect(listSource).toContain('q-dialog');
  });

  it('pins the fixed form and draft-first attachment flow', () => {
    for (const value of ['title', 'category', 'occurredAt', 'amount', 'reason', 'payeeInfo', 'remark']) {
      expect(formSource).toContain(value);
    }
    for (const copy of ['请输入报销标题', '请输入报销类别', '请选择发生日期', '报销金额必须大于 0', '请输入报销事由']) {
      expect(formSource).toContain(copy);
    }
    expect(formSource).toContain('保存草稿');
    expect(formSource).toContain('提交申请');
    expect(formSource).toContain('先保存草稿后上传附件');
    expect(formSource).toContain('mobile-actions');
    expect(formSource).toContain('env(safe-area-inset-bottom)');
    expect(formSource).toContain('min-height: 44px');
  });

  it('pins authenticated attachment preview and download behavior', () => {
    expect(attachmentSource).toContain('ReimbursementAttachmentPanel');
    expect(attachmentSource).toContain('q-file');
    expect(attachmentSource).toContain('image/jpeg,image/png,image/webp,application/pdf');
    expect(attachmentSource).toContain('10 * 1024 * 1024');
    expect(attachmentSource).toContain('20');
    expect(attachmentSource).toContain('预览');
    expect(attachmentSource).toContain('下载');
    expect(attachmentSource).toContain('确认删除附件');
    expect(attachmentSource).toContain('URL.createObjectURL');
    expect(attachmentSource).toContain('URL.revokeObjectURL');
  });

  it('pins detail and timeline display without Phase 26 or Phase 27 scope', () => {
    expect(detailSource).toContain('ReimbursementDetailPage');
    expect(detailSource).toContain('ReimbursementActionTimeline');
    for (const value of ['申请信息', '申请人信息', '报销明细', '附件', '审核轨迹', '继续编辑', '提交申请']) {
      expect(detailSource).toContain(value);
    }
    expect(timelineSource).toContain('审核轨迹');
    expect(timelineSource).toContain('暂无审核轨迹');
    expect(timelineSource).toContain('签名附件');
    expect(detailSource).toContain('detail-grid');
    expect(detailSource).toContain('detail-main');
    expect(detailSource).toContain('detail-side');

    for (const forbidden of [
      '部门初审通过',
      '财务复核通过',
      '驳回申请',
      '手写签名',
      '导出 Excel',
      'OCR',
      '发票验真',
      '/approval/applications',
      '/reimbursements/export',
      'window.open',
    ]) {
      expect(uiSource).not.toContain(forbidden);
    }
  });
});
