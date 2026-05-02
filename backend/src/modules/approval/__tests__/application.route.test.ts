import { describe, expect, it } from 'bun:test';

import {
  approvalApplicationModule,
  createDraftBodySchema,
  serializeApplicationDetail,
  serializeApplicationListResponse,
  submitBodySchema,
  updateDraftBodySchema,
  type ApplicationRouteDetail,
} from '../application.route';

const forbiddenTrustedFields = [
  'applicationNo',
  'schemaSnapshot',
  'processSnapshot',
  'applicantId',
  'applicantName',
  'applicantDepartmentId',
  'applicantDepartmentName',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function makeDetail(): ApplicationRouteDetail {
  return {
    id: 17,
    applicationNo: 'APP-20260425-ABCDEFGH',
    status: 'APPROVING',
    templateId: 3,
    templateName: '请假申请',
    templateVersion: 5,
    processId: 8,
    processName: '请假审批流程',
    applicantName: '申请人',
    applicantDepartmentName: '研发部',
    currentNodeOrder: 1,
    currentNodeName: '部门负责人审批',
    submittedAt: new Date('2026-04-25T08:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-04-25T07:30:00.000Z'),
    updatedAt: new Date('2026-04-25T08:00:00.000Z'),
    canCancel: true,
    formData: { reason: '年度调休' },
    schemaSnapshot: { version: 2, items: [] },
    processSnapshot: { processId: 8, processName: '请假审批流程', nodes: [] },
    timeline: [
      {
        id: 1,
        taskId: null,
        actorId: 10,
        actorName: '申请人',
        nodeOrder: null,
        nodeName: null,
        type: 'SUBMIT',
        title: '提交申请',
        comment: null,
        payload: null,
        createdAt: new Date('2026-04-25T08:00:00.000Z'),
      },
    ],
    tasks: [
      {
        id: 2,
        nodeOrder: 1,
        nodeName: '部门负责人审批',
        status: 'PENDING',
        assigneeId: 20,
        assigneeName: '审批人',
        assignedAt: new Date('2026-04-25T08:01:00.000Z'),
        handledAt: null,
        comment: null,
      },
    ],
  };
}

describe('approval application route contract', () => {
  it('exports the authenticated application module under /approval/applications', () => {
    expect(approvalApplicationModule.config.prefix).toBe('/approval/applications');
  });

  it('request body schemas exclude trusted snapshots and applicant identity fields', () => {
    for (const schema of [createDraftBodySchema, updateDraftBodySchema, submitBodySchema]) {
      const propertyNames = schemaPropertyNames(schema);
      for (const field of forbiddenTrustedFields) {
        expect(propertyNames).not.toContain(field);
      }
    }
    expect(schemaPropertyNames(createDraftBodySchema)).toEqual(['templateId', 'formData']);
    expect(schemaPropertyNames(updateDraftBodySchema)).toEqual(['formData']);
    expect(schemaPropertyNames(submitBodySchema)).toEqual(['formData']);
  });

  it('serializes list rows to frontend-ready application fields', () => {
    const detail = makeDetail();
    const response = serializeApplicationListResponse({
      rows: [detail],
      total: 1,
      page: 2,
      size: 10,
    });

    expect(response).toEqual({
      rows: [
        expect.objectContaining({
          id: 17,
          applicationNo: 'APP-20260425-ABCDEFGH',
          status: 'APPROVING',
          templateName: '请假申请',
          templateVersion: 5,
          currentNodeName: '部门负责人审批',
          canCancel: true,
          submittedAt: '2026-04-25T08:00:00.000Z',
          updatedAt: '2026-04-25T08:00:00.000Z',
        }),
      ],
      total: 1,
      page: 2,
      size: 10,
    });
  });

  it('serializes detail with snapshots, timeline, tasks, and canCancel', () => {
    const serialized = serializeApplicationDetail(makeDetail());

    expect(serialized).toMatchObject({
      id: 17,
      applicationNo: 'APP-20260425-ABCDEFGH',
      templateName: '请假申请',
      templateVersion: 5,
      formData: { reason: '年度调休' },
      schemaSnapshot: { version: 2, items: [] },
      canCancel: true,
      timeline: [
        expect.objectContaining({
          type: 'SUBMIT',
          actorName: '申请人',
          createdAt: '2026-04-25T08:00:00.000Z',
        }),
      ],
      tasks: [
        expect.objectContaining({
          status: 'PENDING',
          nodeName: '部门负责人审批',
          assignedAt: '2026-04-25T08:01:00.000Z',
        }),
      ],
    });
  });
});
