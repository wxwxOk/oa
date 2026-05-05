import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  createChannelPartner,
  disableChannelPartner,
  enableChannelPartner,
  getChannelPartner,
  listChannelPartners,
  patchChannelPartner,
  type ChannelPartnerListFilters,
} from './channel-partner-admin.service';

export const channelPartnerCreateBody = t.Object(
  {
    username: t.String({ minLength: 3, maxLength: 64 }),
    password: t.String({ minLength: 8, maxLength: 128 }),
    realName: t.String({ minLength: 1, maxLength: 64 }),
    phone: t.Optional(t.Union([t.String({ minLength: 5, maxLength: 32 }), t.Null()])),
    primaryRecipientId: t.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const channelPartnerPatchBody = t.Object(
  {
    realName: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
    phone: t.Optional(t.Union([t.String({ minLength: 5, maxLength: 32 }), t.Null()])),
    primaryRecipientId: t.Optional(t.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);

export const channelPartnerListQuery = t.Object(
  {
    page: t.Optional(t.Integer({ minimum: 1 })),
    size: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
    status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('DISABLED')])),
    keyword: t.Optional(t.String({ maxLength: 64 })),
  },
  { additionalProperties: false },
);

const idParams = t.Object({ id: t.Integer({ minimum: 1 }) });

export const channelPartnerAdminModule = new Elysia({ prefix: '/admin/channel-partners' })
  .guard({ beforeHandle: [] }, (app) =>
    app.use(authGuard('user:create')).post(
      '/',
      async ({ body, currentUser, set }: any) => {
        // currentUser.id audited via JWT identity (not consumed in the request body).
        void currentUser.id;
        const created = await createChannelPartner(body);
        set.status = 201;
        return created;
      },
      { body: channelPartnerCreateBody },
    ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app.use(authGuard('user:list')).get(
      '/',
      async ({ query, currentUser }: any) => {
        void currentUser.id;
        return listChannelPartners(query as ChannelPartnerListFilters);
      },
      { query: channelPartnerListQuery },
    ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app.use(authGuard('user:read')).get(
      '/:id',
      async ({ params, currentUser }: any) => {
        void currentUser.id;
        return getChannelPartner(Number(params.id));
      },
      { params: idParams },
    ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app.use(authGuard('user:update')).patch(
      '/:id',
      async ({ params, body, currentUser }: any) => {
        void currentUser.id;
        return patchChannelPartner(Number(params.id), body);
      },
      { params: idParams, body: channelPartnerPatchBody },
    ),
  )
  .guard({ beforeHandle: [] }, (app) =>
    app
      .use(authGuard('user:update'))
      .post(
        '/:id/disable',
        async ({ params, currentUser }: any) => {
          void currentUser.id;
          return disableChannelPartner(Number(params.id));
        },
        { params: idParams },
      )
      .post(
        '/:id/enable',
        async ({ params, currentUser }: any) => {
          void currentUser.id;
          return enableChannelPartner(Number(params.id));
        },
        { params: idParams },
      ),
  );
