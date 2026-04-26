import { describe, expect, it } from 'bun:test';

import {
  addArchiveNoteBodySchema,
  approvalArchiveModule,
  archiveListQuerySchema,
  correctArchiveDataBodySchema,
  serializeArchiveDetail,
  serializeArchiveListResponse,
  setArchiveTagsBodySchema,
  updateProcessingDataBodySchema,
  type ArchiveRouteDetail,
} from '../archive.route';

const forbiddenTrustedFields = [
  'sourceType',
  'sourceId',
  'approvalApplicationId',
  'submissionId',
  'actorId',
  'actorName',
  'formData',
  'data',
  'schemaSnapshot',
  'createdAt',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function expectStrictPayloadSchema(schema: unknown, allowedFields: string[]) {
  const propertyNames = schemaPropertyNames(schema);
  expect(propertyNames).toEqual(allowedFields);
  for (const field of forbiddenTrustedFields) {
    expect(propertyNames).not.toContain(field);
  }
  expect((schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
}

function makeDetail(): ArchiveRouteDetail {
  return {
    archiveKey: 'approval:17',
    sourceType: 'approval',
    sourceId: 17,
    templateId: 3,
    templateName: '请假申请',
    departmentId: 2,
    departmentName: '研发部',
    personName: '申请人',
    status: 'APPROVED',
    tags: ['待跟进'],
    formData: { reason: '年度调休' },
    effectiveData: { reason: '年度调休', phone: '13999999999' },
    processingData: { followUpResult: '已电话回访' },
    schemaSnapshot: { version: 2, items: [] },
    notes: [
      {
        id: 5,
        comment: '内部备注',
        actorId: 7,
        actorName: '运营人员',
        createdAt: new Date('2026-04-26T08:00:00.000Z'),
      },
    ],
    correctionHistory: [
      {
        id: 6,
        field: 'phone',
        before: '13800138000',
        after: '13999999999',
        reason: '复核修正手机号',
        actorId: 7,
        actorName: '运营人员',
        createdAt: new Date('2026-04-26T08:01:00.000Z'),
      },
    ],
    events: [
      {
        id: 8,
        type: 'EDIT',
        title: '修正提交数据',
        comment: '复核修正手机号',
        actorId: 7,
        actorName: '运营人员',
        createdAt: new Date('2026-04-26T08:01:00.000Z'),
      },
    ],
    createdAt: new Date('2026-04-25T08:00:00.000Z'),
    updatedAt: new Date('2026-04-26T08:01:00.000Z'),
  };
}

describe('approval archive route contract', () => {
  it('exports the authenticated archive module under /approval/archive', () => {
    expect(approvalArchiveModule.config.prefix).toBe('/approval/archive');
  });

  it('list query schema exposes archive filters without trusted mutation fields', () => {
    expect(schemaPropertyNames(archiveListQuerySchema)).toEqual(
      expect.arrayContaining([
        'sourceType',
        'templateId',
        'departmentId',
        'personName',
        'status',
        'dateFrom',
        'dateTo',
        'tags',
      ]),
    );
    for (const field of forbiddenTrustedFields.filter((name) => !['sourceType'].includes(name))) {
      expect(schemaPropertyNames(archiveListQuerySchema)).not.toContain(field);
    }
  });

  it('T-19-TAMPER hardens operation payload schemas with additionalProperties: false and no forbiddenTrustedFields', () => {
    expectStrictPayloadSchema(setArchiveTagsBodySchema, ['tags']);
    expectStrictPayloadSchema(addArchiveNoteBodySchema, ['comment']);
    expectStrictPayloadSchema(updateProcessingDataBodySchema, ['processingData']);
    expectStrictPayloadSchema(correctArchiveDataBodySchema, ['changes', 'reason']);

    const reasonProperty = (correctArchiveDataBodySchema as { properties?: Record<string, unknown> }).properties?.reason;
    expect(reasonProperty).toMatchObject({ minLength: 1 });
  });

  it('T-19-IDOR serializes archive list rows as normalized source records', () => {
    const detail = makeDetail();
    const response = serializeArchiveListResponse({
      rows: [detail],
      total: 1,
      page: 2,
      size: 10,
    });

    expect(response).toEqual({
      rows: [
        expect.objectContaining({
          archiveKey: 'approval:17',
          sourceType: 'approval',
          sourceId: 17,
          templateName: '请假申请',
          personName: '申请人',
          status: 'APPROVED',
          tags: ['待跟进'],
          updatedAt: '2026-04-26T08:01:00.000Z',
        }),
      ],
      total: 1,
      page: 2,
      size: 10,
    });
  });

  it('T-19-DATA-SEPARATION serializes detail with formal data, processing data, notes and correction history separated', () => {
    const serialized = serializeArchiveDetail(makeDetail());

    expect(serialized).toMatchObject({
      sourceType: 'approval',
      sourceId: 17,
      formData: { reason: '年度调休' },
      effectiveData: { reason: '年度调休', phone: '13999999999' },
      processingData: { followUpResult: '已电话回访' },
      notes: [
        expect.objectContaining({
          comment: '内部备注',
          createdAt: '2026-04-26T08:00:00.000Z',
        }),
      ],
      correctionHistory: [
        expect.objectContaining({
          field: 'phone',
          before: '13800138000',
          after: '13999999999',
          reason: '复核修正手机号',
        }),
      ],
    });
  });
});
