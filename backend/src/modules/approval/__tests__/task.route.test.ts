import { describe, expect, it } from 'bun:test';

import {
  approvalTaskModule,
  approveBodySchema,
  commentBodySchema,
  rejectBodySchema,
  serializeApprovalTaskDetail,
  serializeApprovalTaskListResponse,
  type ApprovalTaskRouteDetail,
} from '../task.route';

const forbiddenTrustedFields = [
  'applicationNo',
  'schemaSnapshot',
  'processSnapshot',
  'applicantId',
  'applicantName',
  'applicantDepartmentId',
  'applicantDepartmentName',
  'taskStatus',
  'applicationStatus',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

function makeDetail(): ApprovalTaskRouteDetail {
  return {
    id: 9,
    applicationId: 17,
    applicationNo: 'APP-20260426-ABCDEFGH',
    taskStatus: 'PENDING',
    applicationStatus: 'APPROVING',
    templateId: 3,
    templateName: '请假申请',
    templateVersion: 5,
    processId: 8,
    processName: '请假审批流程',
    applicantName: '申请人',
    applicantDepartmentId: 2,
    applicantDepartmentName: '研发部',
    currentNodeOrder: 1,
    currentNodeName: '部门负责人审批',
    nodeOrder: 1,
    nodeName: '部门负责人审批',
    assigneeId: 20,
    assigneeName: '审批人',
    assignedAt: new Date('2026-04-26T08:00:00.000Z'),
    handledAt: null,
    taskComment: null,
    submittedAt: new Date('2026-04-26T07:59:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-04-26T07:30:00.000Z'),
    updatedAt: new Date('2026-04-26T08:00:00.000Z'),
    canHandle: true,
    canComment: true,
    formData: { reason: '年度调休' },
    schemaSnapshot: { version: 2, items: [] },
    processSnapshot: { processId: 8, processName: '请假审批流程', nodes: [] },
    timeline: [
      {
        id: 1,
        taskId: 9,
        actorId: 20,
        actorName: '审批人',
        nodeOrder: 1,
        nodeName: '部门负责人审批',
        type: 'COMMENT',
        title: '内部备注',
        comment: '需要核对余额',
        payload: { visibility: 'INTERNAL' },
        createdAt: new Date('2026-04-26T08:05:00.000Z'),
      },
    ],
    tasks: [
      {
        id: 9,
        nodeOrder: 1,
        nodeName: '部门负责人审批',
        status: 'PENDING',
        assigneeId: 20,
        assigneeName: '审批人',
        assignedAt: new Date('2026-04-26T08:00:00.000Z'),
        handledAt: null,
        comment: null,
      },
    ],
  };
}

describe('approval task route contract', () => {
  it('exports the authenticated task module under /approval/tasks', () => {
    expect(approvalTaskModule.config.prefix).toBe('/approval/tasks');
  });

  it('approve/reject/comment schemas accept only opinion payloads and forbidden trusted fields are absent', () => {
    expect(schemaPropertyNames(approveBodySchema)).toEqual(['comment']);
    expect(schemaPropertyNames(rejectBodySchema)).toEqual(['comment']);
    expect(schemaPropertyNames(commentBodySchema)).toEqual(['comment']);

    for (const schema of [approveBodySchema, rejectBodySchema, commentBodySchema]) {
      const propertyNames = schemaPropertyNames(schema);
      for (const field of forbiddenTrustedFields) {
        expect(propertyNames).not.toContain(field);
      }
      expect((schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
  });

  it('serializes task list rows for /approval/tasks with task and application status split', () => {
    const detail = makeDetail();
    const response = serializeApprovalTaskListResponse({
      rows: [detail],
      total: 1,
      page: 2,
      size: 10,
      view: 'pending',
    });

    expect(response).toEqual({
      rows: [
        expect.objectContaining({
          id: 9,
          applicationNo: 'APP-20260426-ABCDEFGH',
          taskStatus: 'PENDING',
          applicationStatus: 'APPROVING',
          templateName: '请假申请',
          applicantName: '申请人',
          nodeName: '部门负责人审批',
          assignedAt: '2026-04-26T08:00:00.000Z',
          canHandle: true,
        }),
      ],
      total: 1,
      page: 2,
      size: 10,
      view: 'pending',
    });
  });

  it('serializes task detail with internal remark timeline and snapshot payload', () => {
    const serialized = serializeApprovalTaskDetail(makeDetail());

    expect(serialized).toMatchObject({
      id: 9,
      applicationNo: 'APP-20260426-ABCDEFGH',
      taskStatus: 'PENDING',
      formData: { reason: '年度调休' },
      schemaSnapshot: { version: 2, items: [] },
      timeline: [
        expect.objectContaining({
          type: 'COMMENT',
          title: '内部备注',
          payload: { visibility: 'INTERNAL' },
          createdAt: '2026-04-26T08:05:00.000Z',
        }),
      ],
    });
  });
});
