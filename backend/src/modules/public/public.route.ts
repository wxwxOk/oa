import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { notFound, BizError } from '../../utils/errors';

export const publicFillModule = new Elysia({ prefix: '/public/f' })
  // GET /:code — 获取模板 schema（公开，无鉴权）(per D-03: 仅模板下线时失效)
  .get('/:code', async ({ params }: any) => {
    const link = await prisma.shareLink.findUnique({
      where: { code: params.code },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            schema: true,
            schemaVersion: true,
            status: true,
            requireIdentity: true,
          },
        },
      },
    });
    if (!link) throw notFound('链接无效');
    if (link.template.status !== 'PUBLISHED') {
      throw new BizError('该表单已停止收集', 410, 'TEMPLATE_OFFLINE');
    }
    // 仅返回填写所需字段，不暴露内部数据
    return {
      templateName: link.template.name,
      description: link.template.description,
      schema: link.template.schema,
      requireIdentity: link.template.requireIdentity,
    };
  })
  // POST /:code/submit — 提交表单数据（公开，无鉴权）
  // per D-13: JSONB 存储, D-14: schemaVersion 快照, D-15: 关联 ShareLink, D-16: 独立身份字段
  .post(
    '/:code/submit',
    async ({ params, body }: any) => {
      const link = await prisma.shareLink.findUnique({
        where: { code: params.code },
        include: { template: true },
      });
      if (!link) throw notFound('链接无效');
      if (link.template.status !== 'PUBLISHED') {
        throw new BizError('该表单已停止收集', 410, 'TEMPLATE_OFFLINE');
      }
      // per D-09/D-12: 如果模板要求身份信息，校验必填
      if (link.template.requireIdentity) {
        if (!body.submitterName?.trim()) throw new BizError('请输入姓名');
        if (!/^1\d{10}$/.test(body.submitterPhone ?? '')) throw new BizError('请输入有效手机号');
      }
      // per D-14: schemaVersion 从服务端读取，不信任客户端
      const submission = await prisma.submission.create({
        data: {
          data: body.data,
          schemaVersion: link.template.schemaVersion,
          submitterName: body.submitterName || null,
          submitterPhone: body.submitterPhone || null,
          templateId: link.template.id,
          shareLinkId: link.id,
        },
      });
      return { id: submission.id };
    },
    {
      body: t.Object({
        data: t.Any(),
        submitterName: t.Optional(t.String()),
        submitterPhone: t.Optional(t.String()),
      }),
    },
  );
