import { prisma } from '../../plugins/prisma';
import type { DuplicateHint } from './channel-push.constants';

export async function findChannelPushDuplicates(input: {
  channelPartnerId: number;
  studentName: string;
  studentPhone: string;
  excludeId?: number;
}): Promise<DuplicateHint[]> {
  const rows = await prisma.channelPush.findMany({
    where: {
      channelPartnerId: input.channelPartnerId,
      studentName: input.studentName,
      studentPhone: input.studentPhone,
      ...(input.excludeId !== undefined ? { id: { not: input.excludeId } } : {}),
    },
    select: {
      id: true,
      studentName: true,
      studentPhone: true,
      status: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  return rows;
}
