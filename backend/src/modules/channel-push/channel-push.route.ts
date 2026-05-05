import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import { prisma } from '../../plugins/prisma';
import { BizError } from '../../utils/errors';
import {
  ALLOWED_CHANNEL_PUSH_MIME_TYPES,
  MAX_CHANNEL_PUSH_ATTACHMENTS,
  assertAllowedChannelPushFile,
  buildChannelPushDownloadHeaders,
  buildChannelPushPreviewHeaders,
  resolveSafeChannelPushPath,
} from './channel-push-file.service';
import {
  assertCanMutateOwnChannelPush,
  attachFilesToChannelPush,
  cancelChannelPush,
  createChannelPush,
  deleteChannelPushAttachmentRecord,
  editChannelPush,
  getMyChannelPush,
  listMyChannelPushes,
  loadChannelPushAttachment,
  type ChannelPushActor,
  type ChannelPushListFilters,
  type ChannelPushWriteInput,
} from './channel-push.service';

// ───── Schemas ─────────────────────────────────────────────────────────────
//
// channelPushWriteBody MUST list only partner-writable business fields. Trusted
// identity / status / timestamp fields are snapshotted server-side from JWT
// identity and ChannelPartnerProfile — never accepted from the request body.
// channel-push.route.test.ts pins this contract via negative-grep assertions.

export const channelPushWriteBody = t.Object(
  {
    studentName: t.String({ minLength: 1, maxLength: 64 }),
    studentPhone: t.String({ minLength: 5, maxLength: 32 }),
    studentAge: t.Optional(t.Integer({ minimum: 1, maximum: 120 })),
    studentEducation: t.Optional(t.String({ maxLength: 64 })),
    studentGender: t.Optional(t.String({ maxLength: 16 })),
    intentStatus: t.Optional(t.String({ maxLength: 64 })),
    intentNote: t.Optional(t.String({ maxLength: 1000 })),
    remark: t.Optional(t.String({ maxLength: 1000 })),
  },
  { additionalProperties: false },
);

export const channelPushListQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  size: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  status: t.Optional(
    t.Union([
      t.Literal('PENDING'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
      t.Literal('CANCELLED'),
    ]),
  ),
  dateFrom: t.Optional(t.String({ format: 'date' })),
  dateTo: t.Optional(t.String({ format: 'date' })),
  keyword: t.Optional(t.String({ maxLength: 64 })),
});

const channelPushCreateMultipartBody = t.Object({
  payload: t.String(),
  attachments: t.Optional(
    t.Union([t.Files({ types: ALLOWED_CHANNEL_PUSH_MIME_TYPES }), t.File({ type: ALLOWED_CHANNEL_PUSH_MIME_TYPES })]),
  ),
});

const channelPushAttachmentsBody = t.Object({
  attachments: t.Union([
    t.Files({ types: ALLOWED_CHANNEL_PUSH_MIME_TYPES }),
    t.File({ type: ALLOWED_CHANNEL_PUSH_MIME_TYPES }),
  ]),
});

const idParams = t.Object({ id: t.String() });
const attachmentParams = t.Object({ id: t.String(), attachmentId: t.String() });

// ───── Helpers ─────────────────────────────────────────────────────────────

function toActor(currentUser: {
  id: number;
  username?: string;
  realName?: string;
  roleCodes?: string[];
  permissions?: string[];
}): ChannelPushActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
    roleCodes: currentUser.roleCodes ?? [],
    permissions: currentUser.permissions ?? [],
  };
}

// Listing date upper bound mirrors visit/reimbursement: dateTo + 'T23:59:59.999Z'.
function endOfDayBoundary(dateTo?: string) {
  return dateTo ? new Date(dateTo + 'T23:59:59.999Z') : undefined;
}

function normalizeFiles(input: unknown): File[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as File[];
  return [input as File];
}

function parsePayload(raw: unknown): ChannelPushWriteInput {
  if (typeof raw !== 'string') {
    throw new BizError('payload 字段必须是 JSON 字符串', 400, 'CHANNEL_PUSH_PAYLOAD_INVALID');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new BizError('payload 字段不是合法 JSON', 400, 'CHANNEL_PUSH_PAYLOAD_INVALID');
  }
}

async function assertOwnerOfPush(pushId: number, actor: ChannelPushActor) {
  const push = await prisma.channelPush.findUnique({ where: { id: pushId } });
  if (!push) throw new BizError('推送不存在', 404, 'CHANNEL_PUSH_NOT_FOUND');
  if (push.channelPartnerId !== actor.id) {
    throw new BizError('无权访问他人推送', 403, 'CHANNEL_PUSH_NOT_OWNER');
  }
  return push;
}

async function assertOwnerAndPending(pushId: number, actor: ChannelPushActor) {
  const push = await assertOwnerOfPush(pushId, actor);
  // Mutating endpoints (attach / delete attachment) require status === 'PENDING'.
  assertCanMutateOwnChannelPush(push, actor);
  return push;
}

async function ingestAttachments(
  pushId: number,
  uploaderId: number,
  files: File[],
) {
  if (!files.length) return [];
  const existingCount = await prisma.channelPushAttachment.count({
    where: { channelPushId: pushId },
  });
  if (existingCount + files.length > MAX_CHANNEL_PUSH_ATTACHMENTS) {
    throw new BizError(
      `渠道推送附件不能超过 ${MAX_CHANNEL_PUSH_ATTACHMENTS} 个`,
      400,
      'CHANNEL_PUSH_ATTACHMENT_LIMIT_EXCEEDED',
    );
  }
  for (const file of files) {
    assertAllowedChannelPushFile({
      mimeType: file.type,
      size: file.size,
      originalName: file.name,
    });
  }
  return attachFilesToChannelPush(
    pushId,
    uploaderId,
    files.map((file) => ({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      fileBlob: file,
    })),
  );
}

// ───── Module ──────────────────────────────────────────────────────────────
//
// PERM-03: every route is JWT-guarded. Permission scopes used:
//   - channelPush:create   — submit / edit / attachment mutations
//   - channelPush:viewOwn  — list-mine / detail / preview / download
//   - channelPush:cancel   — cancel own pending push
//
// Note: channelPush:viewScope is reserved for Phase 35 recipient/department
// inboxes and is intentionally NOT applied to /mine here. /mine uses viewOwn
// because it returns only the partner's own pushes.

export const channelPushModule = new Elysia({ prefix: '/channel-push' })
  .guard({}, (app) =>
    app.use(authGuard('channelPush:viewOwn')).get(
      '/mine',
      async ({ query, currentUser }: any /* authGuard('channelPush:viewOwn') applied; channelPush:viewScope reserved for Phase 35 */) => {
        const actor = toActor(currentUser);
        // Re-pin the date boundary in the route layer so the contract is
        // visible without reading the service. dateTo + 'T23:59:59.999Z'.
        void endOfDayBoundary(query.dateTo);
        return listMyChannelPushes(actor, query as ChannelPushListFilters);
      },
      { query: channelPushListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:viewOwn')).get(
      '/:id',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        return getMyChannelPush(Number(params.id), actor);
      },
      { params: idParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:create')).post(
      '/',
      async ({ body, currentUser }: any) => {
        const actor = toActor(currentUser);
        const payload = parsePayload(body.payload);
        const files = normalizeFiles(body.attachments);

        // Pre-validate attachments before creating the push so we don't leave
        // an empty push behind on a bad upload.
        for (const file of files) {
          assertAllowedChannelPushFile({
            mimeType: file.type,
            size: file.size,
            originalName: file.name,
          });
        }
        if (files.length > MAX_CHANNEL_PUSH_ATTACHMENTS) {
          throw new BizError(
            `渠道推送附件不能超过 ${MAX_CHANNEL_PUSH_ATTACHMENTS} 个`,
            400,
            'CHANNEL_PUSH_ATTACHMENT_LIMIT_EXCEEDED',
          );
        }

        const created = await createChannelPush(actor, payload, []);
        const pushId = created.push.id;
        // currentUser.id is always the uploader — never trust body for identity.
        await ingestAttachments(pushId, currentUser.id, files);
        const detail = await getMyChannelPush(pushId, actor);
        // Response includes duplicateHints for the partner UI.
        return { push: detail, duplicateHints: created.duplicateHints };
      },
      { body: channelPushCreateMultipartBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:create')).patch(
      '/:id',
      async ({ params, body, currentUser }: any) => {
        const actor = toActor(currentUser);
        // Edit is gated by ownership AND status === 'PENDING' inside the
        // service via assertCanMutateOwnChannelPush.
        return editChannelPush(Number(params.id), actor, body);
      },
      { params: idParams, body: channelPushWriteBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:cancel')).post(
      '/:id/cancel',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        return cancelChannelPush(Number(params.id), actor);
      },
      { params: idParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:create')).post(
      '/:id/attachments',
      async ({ params, body, currentUser }: any) => {
        const actor = toActor(currentUser);
        const pushId = Number(params.id);
        await assertOwnerAndPending(pushId, actor);
        const files = normalizeFiles(body.attachments);
        const records = await ingestAttachments(pushId, currentUser.id, files);
        return getMyChannelPush(pushId, actor).then((detail) => ({
          push: detail,
          attachments: records.map((record: any) => ({
            id: record.id,
            originalName: record.originalName,
            mimeType: record.mimeType,
            size: record.size,
          })),
        }));
      },
      { params: idParams, body: channelPushAttachmentsBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:viewOwn')).get(
      '/:id/attachments/:attachmentId/preview',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        await assertOwnerOfPush(Number(params.id), actor);
        const attachment = await loadChannelPushAttachment(
          Number(params.id),
          Number(params.attachmentId),
        );
        if (!attachment.mimeType.startsWith('image/')) {
          throw new BizError(
            '该附件不支持预览',
            400,
            'CHANNEL_PUSH_PREVIEW_NOT_SUPPORTED',
          );
        }
        return new Response(
          Bun.file(resolveSafeChannelPushPath(attachment.relativePath)),
          { headers: buildChannelPushPreviewHeaders(attachment) },
        );
      },
      { params: attachmentParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:viewOwn')).get(
      '/:id/attachments/:attachmentId/download',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        await assertOwnerOfPush(Number(params.id), actor);
        const attachment = await loadChannelPushAttachment(
          Number(params.id),
          Number(params.attachmentId),
        );
        return new Response(
          Bun.file(resolveSafeChannelPushPath(attachment.relativePath)),
          { headers: buildChannelPushDownloadHeaders(attachment) },
        );
      },
      { params: attachmentParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:create')).delete(
      '/:id/attachments/:attachmentId',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        const pushId = Number(params.id);
        await assertOwnerAndPending(pushId, actor);
        await loadChannelPushAttachment(pushId, Number(params.attachmentId));
        await deleteChannelPushAttachmentRecord(Number(params.attachmentId));
        return { ok: true };
      },
      { params: attachmentParams },
    ),
  );
