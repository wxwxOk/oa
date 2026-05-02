import type { Prisma } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';
import { validateProcessDefinition } from '../approval/process-config.service';
import { SchemaV2Body } from './schema.validation';

type TemplateBusinessMode = 'COLLECTION_ONLY' | 'APPROVAL_REQUIRED';

export const SUPPORTED_PROCESSING_FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'radio',
  'checkbox',
  'phone',
] as const;

type ProcessingFieldType = (typeof SUPPORTED_PROCESSING_FIELD_TYPES)[number];

type CurrentUser = {
  roleCodes?: string[];
  permissions?: string[];
};

type ProcessingFieldBody = {
  id?: unknown;
  type?: unknown;
  label?: unknown;
  required?: unknown;
  placeholder?: unknown;
  options?: unknown;
};

type ProcessingField = {
  id: string;
  type: ProcessingFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type TemplateUpdateBody = {
  name?: string;
  description?: string | null;
  schema?: unknown;
  processingSchema?: unknown;
  requireIdentity?: boolean;
  businessMode?: TemplateBusinessMode;
  approvalProcessId?: number | null;
  disconnectPublicCollection?: boolean;
};

const templateInclude = {
  creator: { select: { id: true, realName: true } },
  approvalProcess: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.FormTemplateInclude;

const TemplateBusinessModeBody = t.Union([
  t.Literal('COLLECTION_ONLY'),
  t.Literal('APPROVAL_REQUIRED'),
]);

const ProcessingFieldBodySchema = t.Object(
  {
    id: t.String(),
    type: t.String(),
    label: t.String(),
    required: t.Optional(t.Boolean()),
    placeholder: t.Optional(t.String()),
    options: t.Optional(t.Array(t.String())),
  },
  { additionalProperties: false },
);

function hasApprovalTemplateBindPermission(currentUser?: CurrentUser): boolean {
  if (!currentUser) return true;
  if (currentUser.roleCodes?.includes('ADMIN')) return true;
  return currentUser.permissions?.includes('approval:template:bind') === true;
}

function assertApprovalTemplateBindPermission(currentUser?: CurrentUser): void {
  if (!hasApprovalTemplateBindPermission(currentUser)) {
    throw new BizError('缺少权限: approval:template:bind', 403, 'FORBIDDEN');
  }
}

function hasJsonChanged(next: unknown, current: unknown): boolean {
  return JSON.stringify(next) !== JSON.stringify(current);
}

function assertSupportedProcessingFieldType(type: unknown): asserts type is ProcessingFieldType {
  if (
    typeof type !== 'string' ||
    !SUPPORTED_PROCESSING_FIELD_TYPES.includes(type as ProcessingFieldType)
  ) {
    throw new BizError(
      '处理字段类型不支持',
      400,
      'INVALID_PROCESSING_FIELD_TYPE',
    );
  }
}

function normalizeProcessingSchema(value: unknown): ProcessingField[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new BizError('处理字段配置格式无效', 400, 'INVALID_PROCESSING_SCHEMA');
  }

  return value.map((raw, index) => {
    const field = raw as ProcessingFieldBody;
    assertSupportedProcessingFieldType(field.type);

    const id = typeof field.id === 'string' ? field.id.trim() : '';
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    if (!id) {
      throw new BizError(`第 ${index + 1} 个处理字段缺少 id`, 400, 'INVALID_PROCESSING_FIELD_ID');
    }
    if (!label) {
      throw new BizError(`第 ${index + 1} 个处理字段缺少名称`, 400, 'INVALID_PROCESSING_FIELD_LABEL');
    }

    const normalized: ProcessingField = {
      id,
      type: field.type,
      label,
    };

    if (typeof field.required === 'boolean') normalized.required = field.required;
    if (typeof field.placeholder === 'string' && field.placeholder.trim()) {
      normalized.placeholder = field.placeholder.trim();
    }
    if (Array.isArray(field.options)) {
      normalized.options = field.options
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim())
        .filter(Boolean);
    }

    return normalized;
  });
}

async function assertValidApprovalProcess(processId: number | null | undefined): Promise<void> {
  if (processId == null) {
    throw new BizError('请选择启用且有效的审批流程', 400, 'APPROVAL_PROCESS_INVALID');
  }

  try {
    await validateProcessDefinition(processId);
  } catch {
    throw new BizError('请选择启用且有效的审批流程', 400, 'APPROVAL_PROCESS_INVALID');
  }
}

export async function updateTemplate(
  id: number,
  body: TemplateUpdateBody,
  currentUser?: CurrentUser,
) {
  const tpl = await prisma.formTemplate.findUnique({
    where: { id },
    include: { _count: { select: { shareLinks: true } } },
  });
  if (!tpl) throw notFound('模板不存在');

  const targetBusinessMode = (body.businessMode ?? tpl.businessMode) as TemplateBusinessMode;
  const targetApprovalProcessId =
    body.approvalProcessId === undefined ? tpl.approvalProcessId : body.approvalProcessId;
  const businessModeChanged =
    body.businessMode !== undefined && body.businessMode !== tpl.businessMode;
  const approvalProcessChanged =
    body.approvalProcessId !== undefined && body.approvalProcessId !== tpl.approvalProcessId;
  const bindingChanged = businessModeChanged || approvalProcessChanged;

  if (bindingChanged) {
    assertApprovalTemplateBindPermission(currentUser);
  }

  if (targetBusinessMode === 'APPROVAL_REQUIRED') {
    await assertValidApprovalProcess(targetApprovalProcessId);
  }

  if (
    tpl.status === 'PUBLISHED' &&
    tpl.businessMode === 'COLLECTION_ONLY' &&
    targetBusinessMode === 'APPROVAL_REQUIRED' &&
    tpl._count.shareLinks > 0 &&
    body.disconnectPublicCollection !== true
  ) {
    throw new BizError(
      '切换为需审批前必须确认断开公开收集入口',
      400,
      'PUBLIC_COLLECTION_DISCONNECT_REQUIRED',
    );
  }

  const data: Prisma.FormTemplateUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.schema !== undefined) {
    data.schema = body.schema as Prisma.InputJsonValue;
    if (tpl.status === 'PUBLISHED' && hasJsonChanged(body.schema, tpl.schema)) {
      data.schemaVersion = tpl.schemaVersion + 1;
    }
  }
  if (body.processingSchema !== undefined) {
    data.processingSchema = normalizeProcessingSchema(body.processingSchema) as Prisma.InputJsonValue;
  }
  if (body.requireIdentity !== undefined) data.requireIdentity = body.requireIdentity;
  if (body.businessMode !== undefined) data.businessMode = body.businessMode;
  if (body.approvalProcessId !== undefined) {
    data.approvalProcess =
      body.approvalProcessId == null
        ? { disconnect: true }
        : { connect: { id: body.approvalProcessId } };
  }

  return prisma.formTemplate.update({
    where: { id },
    data,
    include: templateInclude,
  });
}

export async function publishTemplate(id: number) {
  const tpl = await prisma.formTemplate.findUnique({ where: { id } });
  if (!tpl) throw notFound('模板不存在');

  const transitions: Record<string, string> = {
    DRAFT: 'PUBLISHED',
    OFFLINE: 'PUBLISHED',
  };
  if (transitions[tpl.status] !== 'PUBLISHED') {
    throw new BizError(`当前状态 ${tpl.status} 不可转为 PUBLISHED`);
  }
  if (tpl.businessMode === 'APPROVAL_REQUIRED') {
    await assertValidApprovalProcess(tpl.approvalProcessId);
  }

  return prisma.formTemplate.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: templateInclude,
  });
}

export async function updateTemplateStatus(id: number, action: 'publish' | 'offline') {
  if (action === 'publish') {
    return publishTemplate(id);
  }

  const tpl = await prisma.formTemplate.findUnique({ where: { id } });
  if (!tpl) throw notFound('模板不存在');
  if (tpl.status !== 'PUBLISHED') {
    throw new BizError(`当前状态 ${tpl.status} 不可转为 OFFLINE`);
  }

  return prisma.formTemplate.update({
    where: { id },
    data: { status: 'OFFLINE' },
    include: templateInclude,
  });
}

export async function createTemplateShareLink(templateId: number, creatorId: number) {
  const tpl = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw notFound('模板不存在');
  if (tpl.businessMode === 'APPROVAL_REQUIRED') {
    throw new BizError(
      '需审批模板不生成公开分享链接',
      400,
      'APPROVAL_TEMPLATE_SHARE_DISABLED',
    );
  }
  if (tpl.status !== 'PUBLISHED') throw new BizError('仅已发布模板可生成分享链接');

  return prisma.shareLink.create({
    data: {
      code: nanoid(12),
      templateId,
      creatorId,
    },
  });
}

export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
  .get('/', async ({ query }: any) => {
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 10;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.businessMode) where.businessMode = query.businessMode;
    const [rows, total] = await Promise.all([
      prisma.formTemplate.findMany({
        where,
        include: templateInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.formTemplate.count({ where }),
    ]);
    return { rows, total, page, size };
  })
  .get('/:id', async ({ params }: any) => {
    const tpl = await prisma.formTemplate.findUnique({
      where: { id: Number(params.id) },
      include: templateInclude,
    });
    if (!tpl) throw notFound('模板不存在');
    return tpl;
  })
  // Create
  .guard({}, (app) =>
    app.use(authGuard('form:template:create')).post(
      '/',
      async ({ body, currentUser }: any) =>
        prisma.formTemplate.create({
          data: { name: body.name, description: body.description, creatorId: currentUser.id },
        }),
      {
        body: t.Object({
          name: t.String({ minLength: 1, maxLength: 50 }),
          description: t.Optional(t.String()),
        }),
      },
    ),
  )
  // Update: if PUBLISHED and schema changed, bump schemaVersion
  .guard({}, (app) =>
    app.use(authGuard('form:template:edit')).put(
      '/:id',
      async ({ params, body, currentUser }: any) => updateTemplate(Number(params.id), body, currentUser),
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
          description: t.Optional(t.Nullable(t.String())),
          schema: t.Optional(SchemaV2Body),
          processingSchema: t.Optional(t.Array(ProcessingFieldBodySchema)),
          requireIdentity: t.Optional(t.Boolean()),
          businessMode: t.Optional(TemplateBusinessModeBody),
          approvalProcessId: t.Optional(t.Nullable(t.Number())),
          disconnectPublicCollection: t.Optional(t.Boolean()),
        }),
      },
    ),
  )
  // Delete (DRAFT only)
  .guard({}, (app) =>
    app.use(authGuard('form:template:delete')).delete('/:id', async ({ params }: any) => {
      const id = Number(params.id);
      const tpl = await prisma.formTemplate.findUnique({ where: { id } });
      if (!tpl) throw notFound('模板不存在');
      if (tpl.status !== 'DRAFT') throw new BizError('仅可删除草稿状态的模板');
      await prisma.formTemplate.delete({ where: { id } });
      return { ok: true };
    }),
  )
  // Status transition: DRAFT->PUBLISHED, PUBLISHED->OFFLINE, OFFLINE->PUBLISHED
  .guard({}, (app) =>
    app.use(authGuard('form:template:publish')).patch(
      '/:id/status',
      async ({ params, body }: any) => updateTemplateStatus(Number(params.id), body.action),
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          action: t.Union([t.Literal('publish'), t.Literal('offline')]),
        }),
      },
    ),
  )
  // 创建分享链接 (per D-01, D-04: 每次生成独立链接，nanoid 12位短码)
  .guard({}, (app) =>
    app.use(authGuard('form:template:share')).post(
      '/:id/share-links',
      async ({ params, currentUser }: any) =>
        createTemplateShareLink(Number(params.id), currentUser.id),
      { params: t.Object({ id: t.String() }) },
    ),
  );
