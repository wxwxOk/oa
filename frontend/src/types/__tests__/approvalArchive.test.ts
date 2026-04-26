import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_RECOMMENDED_TAGS,
  COLLECTED_ARCHIVE_STATUS,
  CREATE_ARCHIVE_CORRECTION_PAYLOAD_KEYS,
  CREATE_ARCHIVE_NOTE_PAYLOAD_KEYS,
  UPDATE_ARCHIVE_PROCESSING_PAYLOAD_KEYS,
  UPDATE_ARCHIVE_TAGS_PAYLOAD_KEYS,
  archiveStatusLabel,
  sourceTypeLabel,
} from '../approvalArchive';

describe('approval archive type helpers', () => {
  it('maps source type labels for the unified archive query', () => {
    expect(sourceTypeLabel('approval')).toBe('审批申请');
    expect(sourceTypeLabel('collection')).toBe('公开收集');
  });

  it('maps the collection-only archive status without mixing approval workflow states', () => {
    expect(COLLECTED_ARCHIVE_STATUS).toBe('COLLECTED');
    expect(archiveStatusLabel('COLLECTED')).toBe('已收集');
  });

  it('documents the recommended lightweight tag set for operations staff', () => {
    expect(ARCHIVE_RECOMMENDED_TAGS).toEqual(['待跟进', '已核对', '资料不全', '重点']);
  });

  it('keeps archive operation payload constants limited to user-editable fields', () => {
    expect(UPDATE_ARCHIVE_TAGS_PAYLOAD_KEYS).toEqual(['tags']);
    expect(CREATE_ARCHIVE_NOTE_PAYLOAD_KEYS).toEqual(['content']);
    expect(UPDATE_ARCHIVE_PROCESSING_PAYLOAD_KEYS).toEqual(['processingData']);
    expect(CREATE_ARCHIVE_CORRECTION_PAYLOAD_KEYS).toEqual(['changes', 'reason']);

    const forbiddenTrustedKeys = [
      'sourceType',
      'sourceId',
      'id',
      'actorId',
      'actorName',
      'userId',
      'applicantId',
      'submitterId',
      'templateId',
      'departmentId',
      'formData',
      'data',
      'schemaSnapshot',
      'processSnapshot',
      'createdAt',
      'updatedAt',
    ];

    const operationPayloads = [
      UPDATE_ARCHIVE_TAGS_PAYLOAD_KEYS,
      CREATE_ARCHIVE_NOTE_PAYLOAD_KEYS,
      UPDATE_ARCHIVE_PROCESSING_PAYLOAD_KEYS,
      CREATE_ARCHIVE_CORRECTION_PAYLOAD_KEYS,
    ];

    for (const keys of operationPayloads) {
      for (const field of forbiddenTrustedKeys) {
        expect(keys).not.toContain(field);
      }
    }
  });
});
