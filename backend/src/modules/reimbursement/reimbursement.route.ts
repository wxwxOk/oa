import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import {
  approveDepartmentReimbursement,
  approveFinanceReimbursement,
  assertCanMutateDraftReimbursement,
  assertCanViewReimbursement,
  createReimbursementDraft,
  getReimbursementDetail,
  listDepartmentReviewReimbursements,
  listFinanceReviewReimbursements,
  listReimbursements,
  rejectDepartmentReimbursement,
  rejectFinanceReimbursement,
  serializeReimbursementRow,
  submitReimbursementDraft,
  updateReimbursementDraft,
  type ReimbursementActor,
  type ReimbursementListFilters,
} from './reimbursement.service';
import {
  MAX_REIMBURSEMENT_ATTACHMENTS,
  assertAllowedReimbursementFile,
  buildReimbursementDownloadHeaders,
  buildReimbursementPreviewHeaders,
  buildReimbursementRelativePath,
  buildReimbursementSignaturePreviewHeaders,
  deleteReimbursementFile,
  getSafeReimbursementStoredName,
  resolveSafeReimbursementPath,
  writeReimbursementFile,
} from './reimbursement-file.service';

export const reimbursementListQuery = t.Object({
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal(''),
      t.Literal('DRAFT'),
      t.Literal('DEPARTMENT_REVIEW'),
      t.Literal('FINANCE_REVIEW'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
    ]),
  ),
  category: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
  keyword: t.Optional(t.String()),
});

export const reimbursementWriteBody = t.Object(
  {
    title: t.String({ minLength: 1 }),
    category: t.String({ minLength: 1 }),
    occurredAt: t.Union([t.String(), t.Date()]),
    amount: t.Union([t.String(), t.Number()]),
    reason: t.String({ minLength: 1 }),
    payeeInfo: t.Optional(t.Union([t.String(), t.Null()])),
    remark: t.Optional(t.Union([t.String(), t.Null()])),
  },
  { additionalProperties: false },
);

export const reimbursementAttachmentUploadBody = t.Object(
  {
    file: t.File(),
  },
  { additionalProperties: false },
);

export const reimbursementReviewApproveBody = t.Object(
  {
    signature: t.File(),
    comment: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

export const reimbursementReviewRejectBody = t.Object(
  {
    comment: t.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const idParams = t.Object({ id: t.String() });
const attachmentParams = t.Object({ id: t.String(), attachmentId: t.String() });
const actionParams = t.Object({ id: t.String(), actionId: t.String() });

function toActor(currentUser: {
  id: number;
  username?: string;
  realName?: string;
  roleCodes?: string[];
  permissions?: string[];
}): ReimbursementActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
    roleCodes: currentUser.roleCodes ?? [],
    permissions: currentUser.permissions ?? [],
  };
}

function serializeAttachment(attachment: any) {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploaderId: attachment.uploaderId,
    createdAt: attachment.createdAt instanceof Date ? attachment.createdAt.toISOString() : attachment.createdAt,
  };
}

export function serializeReimbursementListResponse(response: { rows: any[]; total: number; page: number; size: number }) {
  return {
    rows: response.rows.map(serializeReimbursementRow),
    total: response.total,
    page: response.page,
    size: response.size,
  };
}

function routeDateToBoundary(dateTo?: string) {
  return dateTo ? new Date(dateTo + 'T23:59:59.999Z') : undefined;
}

async function loadActorDepartmentId(actor: ReimbursementActor) {
  const user = await prisma.user.findUnique({ where: { id: actor.id }, select: { departmentId: true } });
  return user?.departmentId ?? null;
}

async function loadApplication(id: number) {
  const application = await (prisma as any).reimbursementApplication.findUnique({ where: { id } });
  if (!application) throw notFound('报销申请不存在');
  return application;
}

async function loadAttachment(applicationId: number, attachmentId: number) {
  const attachment = await (prisma as any).reimbursementAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.applicationId !== applicationId) throw notFound('报销附件不存在');
  return attachment;
}

async function loadVisibleAttachment(actor: ReimbursementActor, applicationId: number, attachmentId: number) {
  const application = await loadApplication(applicationId);
  const attachment = await loadAttachment(application.id, attachmentId);
  assertCanViewReimbursement(actor, application, await loadActorDepartmentId(actor));
  return { application, attachment };
}

async function loadVisibleSignature(actor: ReimbursementActor, applicationId: number, actionId: number) {
  const application = await loadApplication(applicationId);
  assertCanViewReimbursement(actor, application, await loadActorDepartmentId(actor));

  const action = await (prisma as any).reimbursementAction.findUnique({ where: { id: actionId } });
  if (!action || action.applicationId !== applicationId || !action.signatureRelativePath) {
    throw notFound('报销签名不存在');
  }
  return action;
}

function assertCanReadReimbursements(actor: ReimbursementActor) {
  const readPermissions = [
    'reimbursement:own',
    'reimbursement:list',
    'reimbursement:department-review',
    'reimbursement:finance-review',
  ];
  if (actor.roleCodes.includes('ADMIN') || readPermissions.some((permission) => actor.permissions.includes(permission))) return;
  throw new BizError('缺少报销查看权限', 403, 'REIMBURSEMENT_READ_FORBIDDEN');
}

// Read routes authenticate first, then allow any reimbursement read/review scope before object visibility.
// authGuard('reimbursement:own')
// authGuard('reimbursement:list')
export const reimbursementModule = new Elysia({ prefix: '/reimbursements' })
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/',
      async ({ query, currentUser }: any) => {
        void routeDateToBoundary(query.dateTo);
        const actor = toActor(currentUser);
        assertCanReadReimbursements(actor);
        return serializeReimbursementListResponse(await listReimbursements(actor, query as ReimbursementListFilters));
      },
      { query: reimbursementListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:create'))
      .post(
        '/',
        async ({ body, currentUser }: any) => serializeReimbursementRow(await createReimbursementDraft(toActor(currentUser), body)),
        { body: reimbursementWriteBody },
      )
      .put(
        '/:id',
        async ({ params, body, currentUser }: any) =>
          serializeReimbursementRow(await updateReimbursementDraft(toActor(currentUser), Number(params.id), body)),
        { params: idParams, body: reimbursementWriteBody },
      )
      .post(
        '/:id/submit',
        async ({ params, currentUser }: any) =>
          serializeReimbursementRow(await submitReimbursementDraft(toActor(currentUser), Number(params.id))),
        { params: idParams },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:attachment'))
      .post(
        '/:id/attachments',
        async ({ params, body, currentUser }: any) => {
          const actor = toActor(currentUser);
          const applicationId = Number(params.id);
          const application = await loadApplication(applicationId);
          assertCanMutateDraftReimbursement(actor, application);

          const file = body.file as File;
          const count = await (prisma as any).reimbursementAttachment.count({ where: { applicationId } });
          if (count >= MAX_REIMBURSEMENT_ATTACHMENTS) {
            throw new BizError('报销附件数量不能超过 20 个', 400, 'REIMBURSEMENT_ATTACHMENT_LIMIT_EXCEEDED');
          }

          assertAllowedReimbursementFile({ mimeType: file.type, size: file.size, originalName: file.name });
          const storedName = getSafeReimbursementStoredName(file.name, file.type);
          const relativePath = buildReimbursementRelativePath(applicationId, storedName);
          await writeReimbursementFile(relativePath, file);
          const attachment = await (prisma as any).reimbursementAttachment.create({
            data: {
              applicationId,
              originalName: file.name,
              storedName,
              relativePath,
              mimeType: file.type,
              size: file.size,
              uploaderId: currentUser.id,
            },
          });
          return serializeAttachment(attachment);
        },
        { params: idParams, body: reimbursementAttachmentUploadBody },
      )
      .get(
        '/:id/attachments/:attachmentId/preview',
        async ({ params, currentUser }: any) => {
          const { attachment } = await loadVisibleAttachment(toActor(currentUser), Number(params.id), Number(params.attachmentId));
          if (!attachment.mimeType.startsWith('image/')) {
            throw new BizError('该附件不支持预览', 400, 'REIMBURSEMENT_PREVIEW_NOT_SUPPORTED');
          }
          return new Response(Bun.file(resolveSafeReimbursementPath(attachment.relativePath)), {
            headers: buildReimbursementPreviewHeaders(attachment),
          });
        },
        { params: attachmentParams },
      )
      .get(
        '/:id/attachments/:attachmentId/download',
        async ({ params, currentUser }: any) => {
          const { attachment } = await loadVisibleAttachment(toActor(currentUser), Number(params.id), Number(params.attachmentId));
          return new Response(Bun.file(resolveSafeReimbursementPath(attachment.relativePath)), {
            headers: buildReimbursementDownloadHeaders(attachment),
          });
        },
        { params: attachmentParams },
      )
      .delete(
        '/:id/attachments/:attachmentId',
        async ({ params, currentUser }: any) => {
          const actor = toActor(currentUser);
          const application = await loadApplication(Number(params.id));
          const attachment = await loadAttachment(application.id, Number(params.attachmentId));
          assertCanMutateDraftReimbursement(actor, application);
          await (prisma as any).reimbursementAttachment.delete({ where: { id: attachment.id } });
          await deleteReimbursementFile(attachment.relativePath);
          return { ok: true };
        },
        { params: attachmentParams },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:department-review')).get(
      '/review/department',
      async ({ query, currentUser }: any) =>
        serializeReimbursementListResponse(
          await listDepartmentReviewReimbursements(toActor(currentUser), query as ReimbursementListFilters),
        ),
      { query: reimbursementListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:finance-review')).get(
      '/review/finance',
      async ({ query, currentUser }: any) =>
        serializeReimbursementListResponse(
          await listFinanceReviewReimbursements(toActor(currentUser), query as ReimbursementListFilters),
        ),
      { query: reimbursementListQuery },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:department-review'))
      .post(
        '/:id/department-review/approve',
        async ({ params, body, currentUser }: any) =>
          serializeReimbursementRow(await approveDepartmentReimbursement(toActor(currentUser), Number(params.id), body)),
        { params: idParams, body: reimbursementReviewApproveBody },
      )
      .post(
        '/:id/department-review/reject',
        async ({ params, body, currentUser }: any) =>
          serializeReimbursementRow(await rejectDepartmentReimbursement(toActor(currentUser), Number(params.id), body)),
        { params: idParams, body: reimbursementReviewRejectBody },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard('reimbursement:finance-review'))
      .post(
        '/:id/finance-review/approve',
        async ({ params, body, currentUser }: any) =>
          serializeReimbursementRow(await approveFinanceReimbursement(toActor(currentUser), Number(params.id), body)),
        { params: idParams, body: reimbursementReviewApproveBody },
      )
      .post(
        '/:id/finance-review/reject',
        async ({ params, body, currentUser }: any) =>
          serializeReimbursementRow(await rejectFinanceReimbursement(toActor(currentUser), Number(params.id), body)),
        { params: idParams, body: reimbursementReviewRejectBody },
      ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/:id/actions/:actionId/signature',
      async ({ params, currentUser }: any) => {
        const action = await loadVisibleSignature(toActor(currentUser), Number(params.id), Number(params.actionId));
        return new Response(Bun.file(resolveSafeReimbursementPath(action.signatureRelativePath)), {
          headers: buildReimbursementSignaturePreviewHeaders(),
        });
      },
      { params: actionParams },
    ),
  )
  .guard({}, (app) =>
    app.use(authGuard()).get(
      '/:id',
      async ({ params, currentUser }: any) => {
        const actor = toActor(currentUser);
        assertCanReadReimbursements(actor);
        return await getReimbursementDetail(actor, Number(params.id));
      },
      { params: idParams },
    ),
  );
