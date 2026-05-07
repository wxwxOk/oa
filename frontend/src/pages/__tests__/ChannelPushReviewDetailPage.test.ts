import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const detailSource = readFileSync(resolve(__dirname, '../ChannelPushReviewDetailPage.vue'), 'utf8');
const attachmentSource = readFileSync(
  resolve(__dirname, '../../components/channel-push/ChannelPushReviewAttachmentPanel.vue'),
  'utf8',
);

describe('ChannelPushReviewDetailPage contract', () => {
  it('pins review detail sections and internal-field copy', () => {
    for (const copy of [
      '推送审核详情',
      '渠道商提交信息',
      '重复提示',
      '暂无重复提示',
      '附件',
      '内部字段',
      '计划接待人',
      '预期接待日期',
      '内部备注',
      '审核时间线',
    ]) {
      expect(detailSource).toContain(copy);
    }
  });

  it('pins review store calls and cache refresh after actions', () => {
    for (const call of [
      'saveReviewInternalFields',
      'approveReview',
      'rejectReview',
      'fetchReviewDetail',
      'fetchReviewPending',
      'fetchReviewHandled',
    ]) {
      expect(detailSource).toContain(call);
    }
  });

  it('pins permission-gated action selectors and mobile touch guardrails', () => {
    expect(detailSource).toContain("auth.hasPerm('channelPush:review')");
    for (const selector of [
      'mobile-review-actions',
      'review-action-save',
      'review-action-approve',
      'review-action-reject',
      'min-height: 44px',
    ]) {
      expect(detailSource).toContain(selector);
    }
    expect(detailSource).toContain("detail.value?.status === 'PENDING'");
  });

  it('pins approve/reject dialogs and rejection validation', () => {
    expect(detailSource).toContain('确认通过审核');
    expect(detailSource).toContain('审核备注（选填）');
    expect(detailSource).toContain('确认驳回审核');
    expect(detailSource).toContain('驳回意见 *');
    expect(detailSource).toContain('canSubmitReject');
    expect(detailSource).toContain('rejectComment.value.trim().length > 0');
  });

  it('keeps reviewer attachments read-only and on review blob endpoints', () => {
    expect(attachmentSource).toContain('previewReviewAttachmentBlob');
    expect(attachmentSource).toContain('downloadReviewAttachmentBlob');
    for (const forbidden of ['q-file', 'deleteAttachment', '上传', '删除']) {
      expect(attachmentSource).not.toContain(forbidden);
    }
  });
});
