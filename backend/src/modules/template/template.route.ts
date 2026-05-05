import type { Prisma } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';
import { SchemaV2Body } from './schema.validation';

type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE';

export const SUPPORTED_PROCESSING_FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'radio',
  'checkbox',
  'phone',
] as const;

type ProcessingFieldType = (typeof SUPPORTED_PROCESSING_FIELD_TYPES)[number];

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

export const WATERMARK_MAX_LENGTH = 50;

export function normalizeWatermarkText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > WATERMARK_MAX_LENGTH) {
    throw new BizError(`水印文本不超过 ${WATERMARK_MAX_LENGTH} 字`, 400, 'WATERMARK_TOO_LONG');
  }
  return trimmed;
}

export type TemplateUpdateBody = {
  name?: string;
  description?: string | null;
  schema?: unknown;
  processingSchema?: unknown;
  requireIdentity?: boolean;
  watermarkText?: string | null;
};

const templateInclude = {
  creator: { select: { id: true, realName: true } },
} satisfies Prisma.FormTemplateInclude;

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

function activeTemplateWhere(id: number): Prisma.FormTemplateWhereInput {
  return { id, deletedAt: null };
}

export async function listTemplates(query: {
  page?: number | string;
  size?: number | string;
  status?: TemplateStatus | '';
}) {
  const page = Number(query.page) || 1;
  const size = Number(query.size) || 10;
  const where: Prisma.FormTemplateWhereInput = { deletedAt: null };
  if (query.status) where.status = query.status;

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
}

export async function updateTemplate(
  id: number,
  body: TemplateUpdateBody,
) {
  const tpl = await prisma.formTemplate.findFirst({
    where: activeTemplateWhere(id),
  });
  if (!tpl) throw notFound('模板不存在');

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
  if (body.watermarkText !== undefined) data.watermarkText = normalizeWatermarkText(body.watermarkText);

  return prisma.formTemplate.update({
    where: { id },
    data,
    include: templateInclude,
  });
}

export async function publishTemplate(id: number) {
  const tpl = await prisma.formTemplate.findFirst({ where: activeTemplateWhere(id) });
  if (!tpl) throw notFound('模板不存在');

  const transitions: Record<string, string> = {
    DRAFT: 'PUBLISHED',
    OFFLINE: 'PUBLISHED',
  };
  if (transitions[tpl.status] !== 'PUBLISHED') {
    throw new BizError(`当前状态 ${tpl.status} 不可转为 PUBLISHED`);
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

  const tpl = await prisma.formTemplate.findFirst({ where: activeTemplateWhere(id) });
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
  const tpl = await prisma.formTemplate.findFirst({ where: activeTemplateWhere(templateId) });
  if (!tpl) throw notFound('模板不存在');
  if (tpl.status !== 'PUBLISHED') throw new BizError('仅已发布模板可生成分享链接');

  return prisma.shareLink.create({
    data: {
      code: nanoid(12),
      templateId,
      creatorId,
    },
  });
}

export async function deleteTemplate(id: number) {
  const tpl = await prisma.formTemplate.findFirst({ where: activeTemplateWhere(id) });
  if (!tpl) throw notFound('模板不存在');
  if (tpl.status === 'PUBLISHED') {
    throw new BizError('仅可删除草稿或已下线状态的模板');
  }

  return prisma.formTemplate.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: templateInclude,
  });
}

export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
  .get('/', async ({ query }: any) => listTemplates(query))
  .get('/:id', async ({ params }: any) => {
    const tpl = await prisma.formTemplate.findFirst({
      where: activeTemplateWhere(Number(params.id)),
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
      async ({ params, body }: any) => updateTemplate(Number(params.id), body),
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
          description: t.Optional(t.Nullable(t.String())),
          schema: t.Optional(SchemaV2Body),
          processingSchema: t.Optional(t.Array(ProcessingFieldBodySchema)),
          requireIdentity: t.Optional(t.Boolean()),
          watermarkText: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        }),
      },
    ),
  )
  // Delete (soft delete)
  .guard({}, (app) =>
    app.use(authGuard('form:template:delete')).delete('/:id', async ({ params }: any) => {
      await deleteTemplate(Number(params.id));
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
