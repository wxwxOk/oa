import type {
  ApprovalActionType,
  ApprovalApplication,
  ApprovalTask,
  Prisma,
} from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import { notifyApplicationFinalized, notifyTaskAssigned } from './notification.service';
import { assertApplicationTransition, assertPendingTask } from './state-machine';

export type ApprovalActor = {
  id: number;
  name: string;
};

export type ApprovalSnapshotNode = {
  order: number;
  name: string;
  approverSourceType: 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
  approverUserId?: number | null;
  approverRoleId?: number | null;
  assigneeId: number;
  assigneeName: string;
  approverSourceLabel?: string;
};

export type ApprovalProcessSnapshot = {
  processId?: number | null;
  processName?: string | null;
  nodes: ApprovalSnapshotNode[];
};

export type CreateDraftApplicationInput = {
  applicationNo: string;
  templateId: number;
  templateName: string;
  templateVersion: number;
  applicantId: number;
  applicantName: string;
  applicantDepartmentId?: number | null;
  applicantDepartmentName?: string | null;
  formData: Prisma.InputJsonValue;
  schemaSnapshot: Prisma.InputJsonValue;
  processSnapshot: ApprovalProcessSnapshot;
};

export type AppendApplicationEventInput = {
  applicationId: number;
  taskId?: number | null;
  actor: ApprovalActor;
  nodeOrder?: number | null;
  nodeName?: string | null;
  type: ApprovalActionType;
  title: string;
  comment?: string | null;
  payload?: Prisma.InputJsonValue;
};

export type ApprovalApplicationWithTasks = Prisma.ApprovalApplicationGetPayload<{
  include: { tasks: true };
}>;

type ApprovalTaskWithApplication = ApprovalTask & {
  application: ApprovalApplication & { tasks: ApprovalTask[] };
};

type ApprovalEventClient = Pick<Prisma.TransactionClient, 'approvalAction' | 'approvalTimelineEvent'>;

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getProcessNodes(snapshot: Prisma.JsonValue | ApprovalProcessSnapshot): ApprovalSnapshotNode[] {
  const candidate = snapshot as ApprovalProcessSnapshot;
  if (!Array.isArray(candidate.nodes) || candidate.nodes.length === 0) {
    throw new BizError('审批流程快照缺少节点', 400, 'INVALID_APPROVAL_PROCESS_SNAPSHOT');
  }

  return [...candidate.nodes].sort((a, b) => a.order - b.order);
}

function getApproverSourceSnapshot(node: ApprovalSnapshotNode): Prisma.InputJsonValue {
  return toInputJson({
    approverSourceType: node.approverSourceType,
    approverUserId: node.approverUserId ?? null,
    approverRoleId: node.approverRoleId ?? null,
    approverSourceLabel: node.approverSourceLabel ?? null,
  });
}

async function createActionAndTimeline(
  tx: ApprovalEventClient,
  input: AppendApplicationEventInput,
): Promise<void> {
  const base = {
    applicationId: input.applicationId,
    taskId: input.taskId ?? null,
    actorId: input.actor.id,
    actorName: input.actor.name,
    nodeOrder: input.nodeOrder ?? null,
    nodeName: input.nodeName ?? null,
    type: input.type,
    comment: input.comment ?? null,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  };

  await tx.approvalAction.create({ data: base });
  await tx.approvalTimelineEvent.create({
    data: {
      ...base,
      title: input.title,
    },
  });
}

async function findTaskWithApplication(
  tx: Prisma.TransactionClient,
  taskId: number,
): Promise<ApprovalTaskWithApplication> {
  const task = await tx.approvalTask.findUnique({
    where: { id: taskId },
    include: { application: { include: { tasks: true } } },
  });

  if (!task) {
    throw notFound('审批任务不存在');
  }

  return task;
}

export async function createDraftApplication(
  input: CreateDraftApplicationInput,
): Promise<ApprovalApplication> {
  return prisma.approvalApplication.create({
    data: {
      applicationNo: input.applicationNo,
      status: 'DRAFT',
      formData: input.formData,
      schemaSnapshot: input.schemaSnapshot,
      processSnapshot: toInputJson(input.processSnapshot),
      templateId: input.templateId,
      templateName: input.templateName,
      templateVersion: input.templateVersion,
      processId: input.processSnapshot.processId ?? null,
      processName: input.processSnapshot.processName ?? null,
      applicantId: input.applicantId,
      applicantName: input.applicantName,
      applicantDepartmentId: input.applicantDepartmentId ?? null,
      applicantDepartmentName: input.applicantDepartmentName ?? null,
    },
  });
}

export async function submitApplication(
  applicationId: number,
  actor: ApprovalActor,
): Promise<ApprovalApplicationWithTasks> {
  return prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({
      where: { id: applicationId },
      include: { tasks: true },
    });
    if (!application) {
      throw notFound('审批申请不存在');
    }

    if (actor.id !== application.applicantId) {
      throw new BizError('无权提交该审批申请', 403, 'APPROVAL_SUBMIT_FORBIDDEN');
    }

    assertApplicationTransition(application.status, 'SUBMITTED');

    await createActionAndTimeline(tx, {
      applicationId: application.id,
      actor,
      type: 'SUBMIT',
      title: '提交申请',
    });

    const [firstNode] = getProcessNodes(application.processSnapshot);
    const firstTask = await tx.approvalTask.create({
      data: {
        applicationId: application.id,
        nodeOrder: firstNode.order,
        nodeName: firstNode.name,
        status: 'PENDING',
        assigneeId: firstNode.assigneeId,
        assigneeName: firstNode.assigneeName,
        approverSourceSnapshot: getApproverSourceSnapshot(firstNode),
      },
    });

    await createActionAndTimeline(tx, {
      applicationId: application.id,
      taskId: firstTask.id,
      actor,
      nodeOrder: firstNode.order,
      nodeName: firstNode.name,
      type: 'ASSIGN',
      title: '分配审批任务',
    });

    await notifyTaskAssigned(tx, {
      task: firstTask,
      application,
      assigneeId: firstNode.assigneeId,
    });

    assertApplicationTransition('SUBMITTED', 'APPROVING');

    return tx.approvalApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVING',
        submittedAt: new Date(),
        currentNodeOrder: firstNode.order,
        currentNodeName: firstNode.name,
      },
      include: { tasks: true },
    });
  });
}

export async function approveTask(
  taskId: number,
  actor: ApprovalActor,
  comment?: string,
): Promise<ApprovalApplicationWithTasks> {
  return prisma.$transaction(async (tx) => {
    const task = await findTaskWithApplication(tx, taskId);
    assertPendingTask(task.status);

    if (actor.id !== task.assigneeId) {
      throw new BizError('无权处理该审批任务', 403, 'APPROVAL_TASK_FORBIDDEN');
    }

    if (task.application.status !== 'APPROVING') {
      assertApplicationTransition(task.application.status, 'APPROVED');
    }

    const claimed = await tx.approvalTask.updateMany({
      where: {
        id: task.id,
        status: 'PENDING',
        assigneeId: actor.id,
      },
      data: {
        status: 'APPROVED',
        handledAt: new Date(),
        comment: comment ?? null,
      },
    });

    if (claimed.count !== 1) {
      throw new BizError('审批任务已被处理', 400, 'INVALID_APPROVAL_TASK_STATUS');
    }

    await createActionAndTimeline(tx, {
      applicationId: task.applicationId,
      taskId: task.id,
      actor,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      type: 'APPROVE',
      title: '审批通过',
      comment,
    });

    const nextNode = getProcessNodes(task.application.processSnapshot).find(
      (node) => node.order > task.nodeOrder,
    );

    if (nextNode) {
      const nextTask = await tx.approvalTask.create({
        data: {
          applicationId: task.applicationId,
          nodeOrder: nextNode.order,
          nodeName: nextNode.name,
          status: 'PENDING',
          assigneeId: nextNode.assigneeId,
          assigneeName: nextNode.assigneeName,
          approverSourceSnapshot: getApproverSourceSnapshot(nextNode),
        },
      });

      await createActionAndTimeline(tx, {
        applicationId: task.applicationId,
        taskId: nextTask.id,
        actor,
        nodeOrder: nextNode.order,
        nodeName: nextNode.name,
        type: 'ASSIGN',
        title: '分配审批任务',
      });

      await notifyTaskAssigned(tx, {
        task: nextTask,
        application: task.application,
        assigneeId: nextNode.assigneeId,
      });

      return tx.approvalApplication.update({
        where: { id: task.applicationId },
        data: {
          currentNodeOrder: nextNode.order,
          currentNodeName: nextNode.name,
        },
        include: { tasks: true },
      });
    }

    assertApplicationTransition('APPROVING', 'APPROVED');

    const approvedApplication = await tx.approvalApplication.update({
      where: { id: task.applicationId },
      data: {
        status: 'APPROVED',
        completedAt: new Date(),
        currentNodeOrder: null,
        currentNodeName: null,
      },
      include: { tasks: true },
    });

    await notifyApplicationFinalized(tx, {
      application: approvedApplication,
      status: 'APPROVED',
      actorName: actor.name,
      comment,
    });

    return approvedApplication;
  });
}

export async function rejectTask(
  taskId: number,
  actor: ApprovalActor,
  comment?: string,
): Promise<ApprovalApplicationWithTasks> {
  return prisma.$transaction(async (tx) => {
    const task = await findTaskWithApplication(tx, taskId);
    assertPendingTask(task.status);

    if (actor.id !== task.assigneeId) {
      throw new BizError('无权处理该审批任务', 403, 'APPROVAL_TASK_FORBIDDEN');
    }

    assertApplicationTransition(task.application.status, 'REJECTED');

    const claimed = await tx.approvalTask.updateMany({
      where: {
        id: task.id,
        status: 'PENDING',
        assigneeId: actor.id,
      },
      data: {
        status: 'REJECTED',
        handledAt: new Date(),
        comment: comment ?? null,
      },
    });

    if (claimed.count !== 1) {
      throw new BizError('审批任务已被处理', 400, 'INVALID_APPROVAL_TASK_STATUS');
    }

    await tx.approvalTask.updateMany({
      where: {
        applicationId: task.applicationId,
        id: { not: task.id },
        status: 'PENDING',
      },
      data: {
        status: 'CANCELED',
        handledAt: new Date(),
      },
    });

    await createActionAndTimeline(tx, {
      applicationId: task.applicationId,
      taskId: task.id,
      actor,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      type: 'REJECT',
      title: '审批驳回',
      comment,
    });

    const rejectedApplication = await tx.approvalApplication.update({
      where: { id: task.applicationId },
      data: {
        status: 'REJECTED',
        completedAt: new Date(),
        currentNodeOrder: null,
        currentNodeName: null,
      },
      include: { tasks: true },
    });

    await notifyApplicationFinalized(tx, {
      application: rejectedApplication,
      status: 'REJECTED',
      actorName: actor.name,
      comment,
    });

    return rejectedApplication;
  });
}

export async function cancelApplication(
  applicationId: number,
  actor: ApprovalActor,
  comment?: string,
): Promise<ApprovalApplicationWithTasks> {
  return prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({
      where: { id: applicationId },
      include: { tasks: true },
    });
    if (!application) {
      throw notFound('审批申请不存在');
    }

    if (actor.id !== application.applicantId) {
      throw new BizError('无权撤销该审批申请', 403, 'APPROVAL_CANCEL_FORBIDDEN');
    }

    assertApplicationTransition(application.status, 'CANCELED');

    await tx.approvalTask.updateMany({
      where: {
        applicationId: application.id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELED',
        handledAt: new Date(),
        comment: comment ?? null,
      },
    });

    await createActionAndTimeline(tx, {
      applicationId: application.id,
      actor,
      nodeOrder: application.currentNodeOrder,
      nodeName: application.currentNodeName,
      type: 'CANCEL',
      title: '撤销申请',
      comment,
    });

    return tx.approvalApplication.update({
      where: { id: application.id },
      data: {
        status: 'CANCELED',
        completedAt: new Date(),
        currentNodeOrder: null,
        currentNodeName: null,
      },
      include: { tasks: true },
    });
  });
}

export async function appendApplicationEvent(input: AppendApplicationEventInput): Promise<void> {
  if (!['COMMENT', 'MARK', 'EDIT'].includes(input.type)) {
    throw new BizError('仅允许追加备注、标记或编辑事件', 400, 'INVALID_APPROVAL_EVENT_TYPE');
  }

  await prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({
      where: { id: input.applicationId },
    });
    if (!application) {
      throw notFound('审批申请不存在');
    }

    await createActionAndTimeline(tx, input);
  });
}
