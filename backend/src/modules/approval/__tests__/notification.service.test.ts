import { describe, expect, it, mock } from 'bun:test';

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyApplicationFinalized,
  notifyTaskAssigned,
} from '../notification.service';

const currentUser = {
  id: 12,
  name: '当前用户',
};

function makeNotificationClient() {
  return {
    notification: {
      create: mock(async (input: unknown) => ({ id: 1, input })),
      findMany: mock(async () => []),
      count: mock(async () => 0),
      updateMany: mock(async () => ({ count: 1 })),
    },
  };
}

describe('approval notification service contract', () => {
  it('creates NEW_TASK notification in the supplied transaction when a first or next approval task is assigned', async () => {
    const tx = makeNotificationClient();

    await notifyTaskAssigned(tx, {
      taskId: 33,
      applicationId: 17,
      assigneeId: currentUser.id,
      applicantName: '申请人',
      templateName: '请假申请',
    });

    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: currentUser.id,
        type: 'NEW_TASK',
        title: '新待办审批',
        targetRoute: '/approval/tasks/33',
        sourceType: 'approval',
        sourceId: 17,
        readAt: null,
      }),
    });
  });

  it('creates APPROVED and REJECTED final-state notifications in the same transaction as terminal flow changes', async () => {
    const tx = makeNotificationClient();

    await notifyApplicationFinalized(tx, {
      applicationId: 17,
      applicantId: currentUser.id,
      status: 'APPROVED',
      templateName: '请假申请',
      actorName: '审批人',
    });
    await notifyApplicationFinalized(tx, {
      applicationId: 18,
      applicantId: currentUser.id,
      status: 'REJECTED',
      templateName: '报销申请',
      actorName: '审批人',
      comment: '资料不完整',
    });

    expect(tx.notification.create).toHaveBeenCalledTimes(2);
    expect(tx.notification.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        userId: currentUser.id,
        type: 'APPROVED',
        title: '申请已通过',
        targetRoute: '/approval/applications/17',
      }),
    });
    expect(tx.notification.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        userId: currentUser.id,
        type: 'REJECTED',
        title: '申请已驳回',
        targetRoute: '/approval/applications/18',
      }),
    });
  });

  it('does not create notifications for tags, notes, processing updates, or controlled edits', async () => {
    const tx = makeNotificationClient();

    for (const status of ['MARK', 'COMMENT', 'PROCESSING_UPDATE', 'EDIT']) {
      await notifyApplicationFinalized(tx, {
        applicationId: 17,
        applicantId: currentUser.id,
        status,
        templateName: '请假申请',
        actorName: '运营人员',
      });
    }

    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('T-19-NOTIFICATION-LEAK scopes listNotifications and unread count queries to userId = currentUser.id', async () => {
    const client = makeNotificationClient();

    await listNotifications(currentUser, { page: 1, size: 20 }, client);
    await getUnreadNotificationCount(currentUser, client);

    expect(client.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: currentUser.id }),
      }),
    );
    expect(client.notification.count).toHaveBeenCalledWith({
      where: { userId: currentUser.id, readAt: null },
    });
  });

  it('markNotificationRead and markAllNotificationsRead update only unread notifications owned by the current user', async () => {
    const client = makeNotificationClient();

    await markNotificationRead(currentUser, 99, client);
    await markAllNotificationsRead(currentUser, client);

    expect(client.notification.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 99, userId: currentUser.id, readAt: null },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
    expect(client.notification.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: currentUser.id, readAt: null },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
  });
});
