import { describe, expect, it } from 'bun:test';

async function readPrismaSchema() {
  return Bun.file(new URL('../../../../prisma/schema.prisma', import.meta.url)).text();
}

function block(source: string, kind: 'enum' | 'model', name: string) {
  const match = source.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  expect(match?.[0]).toBeTruthy();
  return match![0];
}

describe('channel-push Prisma schema contract', () => {
  it('pins ChannelPushStatus and ChannelPushReviewActionType enums', async () => {
    const schema = await readPrismaSchema();
    const statusEnum = block(schema, 'enum', 'ChannelPushStatus');
    const actionEnum = block(schema, 'enum', 'ChannelPushReviewActionType');

    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']) {
      expect(statusEnum).toContain(status);
    }
    for (const action of ['SUBMIT', 'EDIT', 'CANCEL', 'APPROVE', 'REJECT']) {
      expect(actionEnum).toContain(action);
    }
  });

  it('pins ChannelPush business fields with no JSON business payloads', async () => {
    const schema = await readPrismaSchema();
    const push = block(schema, 'model', 'ChannelPush');

    expect(push).toMatch(/studentName\s+String/);
    expect(push).toMatch(/studentPhone\s+String/);
    expect(push).toMatch(/studentAge\s+Int\?/);
    expect(push).toMatch(/studentEducation\s+String\?/);
    expect(push).toMatch(/studentGender\s+String\?/);
    expect(push).toMatch(/intentStatus\s+String\?/);
    expect(push).toMatch(/intentNote\s+String\?/);
    expect(push).toMatch(/remark\s+String\?/);

    expect(push).toMatch(/channelPartnerId\s+Int/);
    expect(push).toMatch(/channelPartner\s+User\s+@relation\("ChannelPushPartner"/);
    expect(push).toMatch(/recipientUserId\s+Int/);
    expect(push).toMatch(/recipient\s+User\s+@relation\("ChannelPushRecipient"/);

    expect(push).toMatch(/status\s+ChannelPushStatus\s+@default\(PENDING\)/);
    expect(push).toMatch(/submittedAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(push).toMatch(/lastEditedAt\s+DateTime\?/);
    expect(push).toMatch(/cancelledAt\s+DateTime\?/);

    // REVIEW-04: internal supplemental fields exist on data model
    expect(push).toMatch(/internalScheduledReceiverId\s+Int\?/);
    expect(push).toMatch(
      /internalScheduledReceiver\s+User\?\s+@relation\("ChannelPushInternalScheduledReceiver"/,
    );
    expect(push).toMatch(/internalScheduledDate\s+DateTime\?/);
    expect(push).toMatch(/internalNote\s+String\?/);

    expect(push).toMatch(/attachments\s+ChannelPushAttachment\[\]/);
    expect(push).toMatch(/reviewActions\s+ChannelPushReviewAction\[\]/);

    expect(push).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(push).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);

    // Negatives: no JSON business payloads, no ApprovalApplication relation
    expect(push).not.toMatch(/\b(?:formData|data|payload)\s+Json\b/);
    expect(push).not.toContain('ApprovalApplication');
  });

  it('pins ChannelPush indexes for partner / recipient scope, dedup, status and timeline', async () => {
    const push = block(await readPrismaSchema(), 'model', 'ChannelPush');

    expect(push).toContain('@@index([channelPartnerId, status])');
    expect(push).toContain('@@index([recipientUserId, status])');
    expect(push).toContain('@@index([studentName, studentPhone])');
    expect(push).toContain('@@index([status])');
    expect(push).toContain('@@index([submittedAt])');
  });

  it('pins ChannelPushAttachment metadata and cascade delete', async () => {
    const attachment = block(await readPrismaSchema(), 'model', 'ChannelPushAttachment');

    expect(attachment).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    expect(attachment).toMatch(/channelPushId\s+Int/);
    expect(attachment).toMatch(
      /channelPush\s+ChannelPush\s+@relation\(fields:\s*\[channelPushId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
    );
    for (const field of ['originalName', 'storedName', 'relativePath', 'mimeType', 'size', 'uploaderId']) {
      expect(attachment).toContain(field);
    }
    expect(attachment).toMatch(/uploader\s+User\s+@relation\("ChannelPushAttachmentUploader"/);
    expect(attachment).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(attachment).toContain('@@index([channelPushId])');
    expect(attachment).toContain('@@index([uploaderId])');
  });

  it('pins ChannelPushReviewAction audit trail (REVIEW-06: no VisitRecord coupling)', async () => {
    const action = block(await readPrismaSchema(), 'model', 'ChannelPushReviewAction');

    expect(action).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    expect(action).toMatch(/channelPushId\s+Int/);
    expect(action).toMatch(
      /channelPush\s+ChannelPush\s+@relation\(fields:\s*\[channelPushId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
    );
    expect(action).toMatch(/actorId\s+Int/);
    expect(action).toMatch(/actor\s+User\s+@relation\("ChannelPushReviewActionActor"/);
    expect(action).toMatch(/actorName\s+String/);
    expect(action).toMatch(/type\s+ChannelPushReviewActionType/);
    expect(action).toMatch(/comment\s+String\?/);
    expect(action).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(action).toContain('@@index([channelPushId])');
    expect(action).toContain('@@index([actorId])');
    expect(action).toContain('@@index([type])');
    expect(action).toContain('@@index([createdAt])');

    // REVIEW-06: never coupled to visit records
    expect(action).not.toMatch(/visitRecordId/);
    expect(action).not.toContain('VisitRecord');
  });

  it('pins ChannelPartnerProfile (1 user → 1 primary recipient)', async () => {
    const profile = block(await readPrismaSchema(), 'model', 'ChannelPartnerProfile');

    expect(profile).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    expect(profile).toMatch(/userId\s+Int\s+@unique/);
    expect(profile).toMatch(
      /user\s+User\s+@relation\("ChannelPartnerProfileUser",\s*fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
    );
    expect(profile).toMatch(/primaryRecipientId\s+Int/);
    expect(profile).toMatch(
      /primaryRecipient\s+User\s+@relation\("ChannelPartnerProfileRecipient",\s*fields:\s*\[primaryRecipientId\],\s*references:\s*\[id\]\)/,
    );
    expect(profile).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(profile).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    expect(profile).toContain('@@index([primaryRecipientId])');
  });

  it('declares User backrefs for every channel-push relation', async () => {
    const user = block(await readPrismaSchema(), 'model', 'User');

    expect(user).toMatch(/channelPushesAsPartner\s+ChannelPush\[\]\s+@relation\("ChannelPushPartner"\)/);
    expect(user).toMatch(/channelPushesAsRecipient\s+ChannelPush\[\]\s+@relation\("ChannelPushRecipient"\)/);
    expect(user).toMatch(
      /channelPushesAsInternalScheduledReceiver\s+ChannelPush\[\]\s+@relation\("ChannelPushInternalScheduledReceiver"\)/,
    );
    expect(user).toMatch(
      /channelPushAttachments\s+ChannelPushAttachment\[\]\s+@relation\("ChannelPushAttachmentUploader"\)/,
    );
    expect(user).toMatch(
      /channelPushReviewActions\s+ChannelPushReviewAction\[\]\s+@relation\("ChannelPushReviewActionActor"\)/,
    );
    expect(user).toMatch(
      /channelPartnerProfile\s+ChannelPartnerProfile\?\s+@relation\("ChannelPartnerProfileUser"\)/,
    );
    expect(user).toMatch(
      /channelPartnerProfilesAsRecipient\s+ChannelPartnerProfile\[\]\s+@relation\("ChannelPartnerProfileRecipient"\)/,
    );
  });

  it('REVIEW-06: ChannelPush has no relation to VisitRecord at the model layer', async () => {
    const push = block(await readPrismaSchema(), 'model', 'ChannelPush');
    expect(push).not.toContain('VisitRecord');
    expect(push).not.toMatch(/visitRecordId/);
  });
});
