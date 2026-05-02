import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve(__dirname, '../VisitPage.vue'), 'utf8');
const dialogSource = readFileSync(resolve(__dirname, '../../components/visit/VisitFormDialog.vue'), 'utf8');
const importDialogSource = readFileSync(resolve(__dirname, '../../components/visit/VisitImportDialog.vue'), 'utf8');
const statsPanelSource = readFileSync(resolve(__dirname, '../../components/visit/VisitStatsPanel.vue'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../router/routes.ts'), 'utf8');
const menuSource = readFileSync(resolve(__dirname, '../../layouts/MainLayout.vue'), 'utf8');
const uiSource = `${pageSource}\n${dialogSource}\n${importDialogSource}\n${statsPanelSource}`;

describe('VisitPage contract', () => {
  it('pins route, menu, page copy, and permission strings', () => {
    expect(routeSource).toContain("path: 'visits'");
    expect(routeSource).toContain("component: () => import('pages/VisitPage.vue')");
    expect(routeSource).toContain("perm: 'visit:list'");
    expect(menuSource).toContain("path: '/visits'");
    expect(menuSource).toContain("title: '到访管理'");
    expect(menuSource).toContain("perm: 'visit:list'");
    expect(pageSource).toContain('到访管理');
    expect(pageSource).toContain('暂无到访记录');
    expect(pageSource).toContain('新建到访记录');
    expect(pageSource).toContain('导入 Excel');
    expect(pageSource).toContain("v-perm=\"'visit:create'\"");
    expect(pageSource).toContain("v-perm=\"'visit:update'\"");
    expect(pageSource).toContain("v-perm=\"'visit:delete'\"");
    expect(pageSource).toContain("v-perm=\"'visit:import'\"");
    expect(pageSource).toContain("v-perm=\"'visit:stats'\"");
  });

  it('pins filters, desktop table, mobile cards, and filter sheet', () => {
    for (const key of [
      'keyword',
      'channelPartner',
      'consultant',
      'receptionist',
      'receptionStatus',
      'consultationStatus',
      'statusCategory',
      'dateFrom',
      'dateTo',
    ]) {
      expect(pageSource).toContain(key);
    }

    expect(pageSource).toContain('关键词');
    expect(pageSource).toContain('渠道商');
    expect(pageSource).toContain('咨询师');
    expect(pageSource).toContain('接待人');
    expect(pageSource).toContain('接待状态');
    expect(pageSource).toContain('咨询后状态');
    expect(pageSource).toContain('状态类别');
    expect(pageSource).toContain('开始接待日期');
    expect(pageSource).toContain('结束接待日期');
    expect(pageSource).toContain('q-table');
    expect(pageSource).toContain(':rows-per-page-options="[10, 20, 50]"');
    expect(pageSource).toContain('visit-card');
    expect(pageSource).toContain('q-dialog');
    expect(pageSource).toContain('筛选到访记录');
    expect(pageSource).toContain('应用筛选');
    expect(pageSource).toContain('store.filterOptions');
  });

  it('pins CRUD dialog, delete confirmation, and negative phase scope', () => {
    expect(pageSource).toContain('VisitFormDialog');
    expect(pageSource).toContain('查看');
    expect(pageSource).toContain('编辑');
    expect(pageSource).toContain('删除');
    expect(pageSource).toContain('确认删除');
    expect(pageSource).toContain('fetchDetail');
    expect(pageSource).toContain('createVisit');
    expect(pageSource).toContain('updateVisit');
    expect(pageSource).toContain('deleteVisit');
    expect(dialogSource).toContain('create');
    expect(dialogSource).toContain('edit');
    expect(dialogSource).toContain('detail');
    expect(dialogSource).toContain('学员基础信息');
    expect(dialogSource).toContain('渠道与接待');
    expect(dialogSource).toContain('跟进状态');
    expect(dialogSource).toContain('试听与解决方案');
    expect(dialogSource).toContain('statusDescription');
    expect(dialogSource).toContain('solution');

    expect(pageSource).toContain('upload_file');
    expect(pageSource).toContain('VisitImportDialog');
    expect(pageSource).toContain('importDialogOpen');
    expect(pageSource).toContain('handleImportSuccess');
    expect(pageSource).toContain('fetchFilterOptions');
    expect(importDialogSource).toContain('readAsArrayBuffer');
    expect(importDialogSource).toContain('XLSX.read');
    expect(importDialogSource).toContain('sheet_to_json');
    expect(importDialogSource).toContain('parseVisitImportRows');
    expect(importDialogSource).toContain('validRows');
    expect(importDialogSource).toContain('invalidRows');
    expect(importDialogSource).toContain('duplicateWarnings');

    expect(pageSource).toContain('统计');
    expect(pageSource).toContain('visit:stats');
    expect(pageSource).toContain('VisitStatsPanel');
    expect(pageSource).toContain('statsPanelOpen');
    expect(pageSource).toContain('openStats');
    expect(pageSource).toContain('initial-date-from');
    expect(pageSource).toContain('initial-date-to');
    expect(statsPanelSource).toContain('到访统计');
    expect(statsPanelSource).toContain('fetchStats');
    expect(statsPanelSource).toContain('到访总数');
    expect(statsPanelSource).toContain('意向数量');
    expect(statsPanelSource).toContain('签约类数量');
    expect(statsPanelSource).toContain('role="img"');
    expect(statsPanelSource).toContain('暂无统计数据');

    for (const forbidden of ['导出 Excel', '/visits/export', 'skipDuplicates', 'upsert', '自动合并']) {
      expect(uiSource).not.toContain(forbidden);
    }
  });
});
