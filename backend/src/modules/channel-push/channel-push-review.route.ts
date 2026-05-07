import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import { BizError } from '../../utils/errors';
import {
  buildChannelPushDownloadHeaders,
  buildChannelPushPreviewHeaders,
  resolveSafeChannelPushPath,
} from './channel-push-file.service';
import {
  approveReviewChannelPush,
  getReviewChannelPush,
  listReviewHandledChannelPushes,
  listReviewPendingChannelPushes,
  rejectReviewChannelPush,
  saveReviewInternalFields,
  type ChannelPushReviewListFilters,
} from './channel-push-review.service';
import {
  loadChannelPushAttachment,
  type ChannelPushActor,
} from './channel-push.service';

export const channelPushReviewListQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  size: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  channelPartnerKeyword: t.Optional(t.String({ maxLength: 64 })),
  status: t.Optional(
    t.Union([
      t.Literal('PENDING'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
    ]),
  ),
  dateFrom: t.Optional(t.String({ format: 'date' })),
  dateTo: t.Optional(t.String({ format: 'date' })),
});

export const channelPushReviewInternalFieldsBody = t.Object(
  {
    internalScheduledReceiverId: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
    internalScheduledDate: t.Optional(t.Union([t.String({ format: 'date' }), t.Null()])),
    internalNote: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
  },
  { additionalProperties: false },
);

export const channelPushReviewApproveBody = t.Object(
  {
    comment: t.Optional(t.String({ maxLength: 1000 })),
  },
  { additionalProperties: false },
);

export const channelPushReviewRejectBody = t.Object(
  {
    comment: t.String({ minLength: 1, maxLength: 1000 }),
  },
  { additionalProperties: false },
);

const idParams = t.Object({ id: t.String() });
const attachmentParams = t.Object({ id: t.String(), attachmentId: t.String() });

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

async function loadVisibleReviewAttachment(pushId: number, attachmentId: number, actor: ChannelPushActor) {
  await getReviewChannelPush(pushId, actor);
  return loadChannelPushAttachment(pushId, attachmentId);
}

// Phase 36: read routes use authGuard() so channelPush:viewScope users can pass
// JWT auth and then be checked by object-scope logic in the service. Mutations
// stay behind authGuard('channelPush:review') and recipient-only service checks.
// Route-order guardrail: pending before handled before :id.
// GET /review/channel-push/pending -> GET /review/channel-push/handled -> GET /review/channel-push/:id
export const channelPushReviewModule = new Elysia({ prefix: '/review/channel-push' })
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/pending',
      async ({ query, currentUser }: any) =>
        listReviewPendingChannelPushes(
          toActor(currentUser),
          query as ChannelPushReviewListFilters,
        ),
      { query: channelPushReviewListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/handled',
      async ({ query, currentUser }: any) =>
        listReviewHandledChannelPushes(
          toActor(currentUser),
          query as ChannelPushReviewListFilters,
        ),
      { query: channelPushReviewListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/:id',
      async ({ params, currentUser }: any) =>
        getReviewChannelPush(Number(params.id), toActor(currentUser)),
      { params: idParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:review')).patch(
      '/:id/internal-fields',
      async ({ params, body, currentUser }: any) =>
        saveReviewInternalFields(Number(params.id), toActor(currentUser), body),
      { params: idParams, body: channelPushReviewInternalFieldsBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:review')).post(
      '/:id/approve',
      async ({ params, body, currentUser }: any) =>
        approveReviewChannelPush(Number(params.id), toActor(currentUser), body),
      { params: idParams, body: channelPushReviewApproveBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('channelPush:review')).post(
      '/:id/reject',
      async ({ params, body, currentUser }: any) =>
        rejectReviewChannelPush(Number(params.id), toActor(currentUser), body),
      { params: idParams, body: channelPushReviewRejectBody },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/:id/attachments/:attachmentId/preview',
      async ({ params, currentUser }: any) => {
        const attachment = await loadVisibleReviewAttachment(
          Number(params.id),
          Number(params.attachmentId),
          toActor(currentUser),
        );
        if (!attachment.mimeType.startsWith('image/')) {
          throw new BizError(
            '该附件不支持预览',
            400,
            'CHANNEL_PUSH_PREVIEW_NOT_SUPPORTED',
          );
        }
        return new Response(Bun.file(resolveSafeChannelPushPath(attachment.relativePath)), {
          headers: buildChannelPushPreviewHeaders(attachment),
        });
      },
      { params: attachmentParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/:id/attachments/:attachmentId/download',
      async ({ params, currentUser }: any) => {
        const attachment = await loadVisibleReviewAttachment(
          Number(params.id),
          Number(params.attachmentId),
          toActor(currentUser),
        );
        return new Response(Bun.file(resolveSafeChannelPushPath(attachment.relativePath)), {
          headers: buildChannelPushDownloadHeaders(attachment),
        });
      },
      { params: attachmentParams },
    ),
  );
