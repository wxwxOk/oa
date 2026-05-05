import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';

const CHANNEL_PARTNER_ROLE_CODE = 'CHANNEL_PARTNER';
const PARTNER_LIST_DEFAULT_SIZE = 20;
const PARTNER_LIST_MAX_SIZE = 100;

export type ChannelPartnerCreateInput = {
  username: string;
  password: string;
  realName: string;
  phone?: string | null;
  primaryRecipientId: number;
};

export type ChannelPartnerPatchInput = {
  realName?: string;
  phone?: string | null;
  primaryRecipientId?: number;
};

export type ChannelPartnerListFilters = {
  page?: number;
  size?: number;
  status?: 'ACTIVE' | 'DISABLED';
  keyword?: string;
};

export type RecipientCandidate = User & {
  roles: Array<{ role: { id: number; code: string; name?: string | null } }>;
};

const partnerInclude = {
  channelPartnerProfile: {
    include: {
      primaryRecipient: {
        include: { department: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

const recipientInclude = {
  roles: { include: { role: true } },
} as const;

export async function assertRecipientCanReceivePushes(
  recipientUserId: number,
): Promise<RecipientCandidate> {
  const candidate = (await prisma.user.findUnique({
    where: { id: recipientUserId },
    include: recipientInclude,
  })) as RecipientCandidate | null;

  if (!candidate) {
    throw new BizError('主接收人不存在', 404, 'CHANNEL_PARTNER_RECIPIENT_NOT_FOUND');
  }
  if (candidate.status === 'DISABLED') {
    throw new BizError('主接收人已禁用', 422, 'CHANNEL_PARTNER_RECIPIENT_DISABLED');
  }
  if (candidate.roles?.some((r) => r.role.code === CHANNEL_PARTNER_ROLE_CODE)) {
    throw new BizError(
      '渠道商不能作为主接收人',
      422,
      'CHANNEL_PARTNER_RECIPIENT_IS_PARTNER',
    );
  }
  return candidate;
}

async function loadChannelPartner(id: number) {
  return prisma.user.findFirst({
    where: {
      id,
      roles: { some: { role: { code: CHANNEL_PARTNER_ROLE_CODE } } },
    },
    include: partnerInclude,
  });
}

export async function createChannelPartner(input: ChannelPartnerCreateInput) {
  // 1. Validate recipient BEFORE any write
  const recipient = await assertRecipientCanReceivePushes(input.primaryRecipientId);

  // 2. Resolve CHANNEL_PARTNER role id
  const role = await prisma.role.findUnique({ where: { code: CHANNEL_PARTNER_ROLE_CODE } });
  if (!role) {
    throw new BizError(
      'CHANNEL_PARTNER 角色未初始化（请先运行 seed）',
      500,
      'CHANNEL_PARTNER_ROLE_MISSING',
    );
  }

  const passwordHash = bcrypt.hashSync(input.password, 10);

  // 3. Atomic write: user + role binding + profile
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: input.username,
        password: passwordHash,
        realName: input.realName,
        phone: input.phone ?? null,
        status: 'ACTIVE',
        departmentId: null,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    await tx.channelPartnerProfile.create({
      data: { userId: user.id, primaryRecipientId: input.primaryRecipientId },
    });
    return user;
  });

  return serializeChannelPartner({
    ...created,
    channelPartnerProfile: {
      primaryRecipientId: recipient.id,
      primaryRecipient: {
        id: recipient.id,
        realName: recipient.realName,
        departmentId: recipient.departmentId ?? null,
        department: (recipient as any).department ?? null,
      },
    },
  });
}

export async function listChannelPartners(filters: ChannelPartnerListFilters) {
  const page = Math.max(1, Number(filters.page ?? 1));
  const size = Math.min(
    PARTNER_LIST_MAX_SIZE,
    Math.max(1, Number(filters.size ?? PARTNER_LIST_DEFAULT_SIZE)),
  );

  const where: Record<string, unknown> = {
    roles: { some: { role: { code: CHANNEL_PARTNER_ROLE_CODE } } },
  };
  if (filters.status === 'ACTIVE' || filters.status === 'DISABLED') {
    where.status = filters.status;
  }
  if (filters.keyword) {
    where.OR = [
      { username: { contains: filters.keyword, mode: 'insensitive' } },
      { realName: { contains: filters.keyword, mode: 'insensitive' } },
      { phone: { contains: filters.keyword } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: partnerInclude,
      orderBy: { id: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return {
    rows: rows.map(serializeChannelPartner),
    total,
    page,
    size,
  };
}

export async function getChannelPartner(id: number) {
  const partner = await loadChannelPartner(id);
  if (!partner) {
    throw new BizError('渠道商不存在', 404, 'CHANNEL_PARTNER_NOT_FOUND');
  }
  return serializeChannelPartner(partner);
}

export async function patchChannelPartner(id: number, body: ChannelPartnerPatchInput) {
  const existing = await loadChannelPartner(id);
  if (!existing) {
    throw new BizError('渠道商不存在', 404, 'CHANNEL_PARTNER_NOT_FOUND');
  }

  const userPatch: Record<string, unknown> = {};
  if (body.realName !== undefined) userPatch.realName = body.realName;
  if (body.phone !== undefined) userPatch.phone = body.phone;

  let validatedRecipient: RecipientCandidate | null = null;
  if (body.primaryRecipientId !== undefined) {
    validatedRecipient = await assertRecipientCanReceivePushes(body.primaryRecipientId);
  }

  const tasks: Array<Promise<unknown>> = [];
  if (Object.keys(userPatch).length > 0) {
    tasks.push(prisma.user.update({ where: { id }, data: userPatch }));
  }
  if (body.primaryRecipientId !== undefined) {
    tasks.push(
      prisma.channelPartnerProfile.update({
        where: { userId: id },
        data: { primaryRecipientId: body.primaryRecipientId },
      }),
    );
  }
  if (tasks.length > 1) {
    await prisma.$transaction(tasks);
  } else if (tasks.length === 1) {
    await tasks[0];
  }

  // Build the refreshed DTO from the existing row + applied patch — avoids
  // the round-trip cost of another loadChannelPartner() and stays mock-friendly.
  const merged = {
    ...existing,
    realName: body.realName ?? existing.realName,
    phone: body.phone !== undefined ? body.phone : existing.phone,
    channelPartnerProfile: validatedRecipient
      ? {
          ...(existing as any).channelPartnerProfile,
          primaryRecipient: {
            id: validatedRecipient.id,
            realName: validatedRecipient.realName,
            departmentId: validatedRecipient.departmentId ?? null,
            department: (validatedRecipient as any).department ?? null,
          },
        }
      : (existing as any).channelPartnerProfile,
  };
  return serializeChannelPartner(merged);
}

export async function disableChannelPartner(id: number) {
  const partner = await loadChannelPartner(id);
  if (!partner) {
    throw new BizError('渠道商不存在', 404, 'CHANNEL_PARTNER_NOT_FOUND');
  }
  // PARTNER-03: status toggle ONLY — never delete history.
  await prisma.user.update({ where: { id }, data: { status: 'DISABLED' } });
  return serializeChannelPartner({ ...partner, status: 'DISABLED' });
}

export async function enableChannelPartner(id: number) {
  const partner = await loadChannelPartner(id);
  if (!partner) {
    throw new BizError('渠道商不存在', 404, 'CHANNEL_PARTNER_NOT_FOUND');
  }
  await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
  return serializeChannelPartner({ ...partner, status: 'ACTIVE' });
}

export type ChannelPartnerDTO = {
  id: number;
  username: string;
  realName: string;
  phone: string | null;
  status: string;
  primaryRecipient:
    | {
        id: number;
        realName: string;
        departmentId: number | null;
        departmentName: string | null;
      }
    | null;
  createdAt: Date;
};

export function serializeChannelPartner(partner: any): ChannelPartnerDTO {
  const profile = partner?.channelPartnerProfile ?? null;
  const recipient = profile?.primaryRecipient ?? null;
  return {
    id: partner.id,
    username: partner.username,
    realName: partner.realName,
    phone: partner.phone ?? null,
    status: partner.status,
    primaryRecipient: recipient
      ? {
          id: recipient.id,
          realName: recipient.realName,
          departmentId: recipient.departmentId ?? null,
          departmentName: recipient.department?.name ?? null,
        }
      : null,
    createdAt: partner.createdAt,
  };
}
