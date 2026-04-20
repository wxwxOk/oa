# Phase 8: 分享链接 + 公开填写 - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

员工可为已发布模板生成分享链接和二维码，外部人员通过链接免登录填写表单（含签名），提交数据自动归档并关联分享记录。

</domain>

<decisions>
## Implementation Decisions

### 链接与二维码
- **D-01:** 分享链接标识符使用 nanoid 生成短码（如 /f/abc123xyz），不可猜测且短小美观
- **D-02:** 二维码在前端实时生成（qrcode 库），无需后端存储图片
- **D-03:** 链接无过期时间/次数限制，仅随模板下线而失效
- **D-04:** 每人每次分享生成独立链接，可追踪每个分享人的收集量

### 填写页体验
- **D-05:** 填写页采用卡片式居中布局，白色背景，类似问卷星/金数据风格
- **D-06:** 提交成功后显示静态成功页（"提交成功"文字 + 图标），无额外操作
- **D-07:** 不支持暂存草稿，关闭即丢失，降低实现复杂度
- **D-08:** 填写页移动优先响应式设计（扫码场景主要在手机端）

### 身份信息配置
- **D-09:** 身份信息要求在模板级配置（设计器中设置），所有分享链接统一生效
- **D-10:** 身份字段仅提供姓名和手机号两个选项
- **D-11:** 手机号不做短信验证，仅填写即可，降低填写门槛
- **D-12:** 单个开关控制：开启后填写页顶部显示姓名+手机号字段，关闭则不显示

### 数据归档模型
- **D-13:** 提交数据（表单字段值）以 JSONB 格式存储，与模板 schema 结构一致
- **D-14:** 提交记录关联 schemaVersion 整数，查看时从模板历史版本还原字段定义
- **D-15:** Submission 关联 ShareLink 记录，可追溯"谁分享的链接收集了这条数据"
- **D-16:** 填写者身份信息存为 Submission 表独立字段（submitterName, submitterPhone），方便筛选查询

### Claude's Discretion
- 具体 nanoid 长度（建议 10-12 位）
- 二维码前端库选择（qrcode / qrcode.vue 等）
- 填写页具体 UI 细节（间距、字体大小等）
- API 路由命名和错误码设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据层
- `backend/prisma/schema.prisma` — 现有 FormTemplate 模型，需新增 ShareLink + Submission 模型
- `.planning/REQUIREMENTS.md` §分享与填写 — SHARE-01~05 完整需求定义

### 后端模块
- `backend/src/modules/template/` — 模板模块，分享功能需在此基础上扩展或新建 share 模块
- `backend/src/index.ts` — Elysia 应用入口，新模块注册
- `backend/src/utils/errors.ts` — BizError 错误处理模式

### 前端
- `frontend/src/router/routes.ts` — 路由定义，需新增公开填写路由（meta.public: true）
- `frontend/src/pages/FormDesignerPage.vue` — 设计器页面，身份信息开关需集成到模板配置中
- `frontend/src/components/` — 共享组件

### Phase 7 上下文
- `.planning/phases/07-template-designer/07-CONTEXT.md` — 模板生命周期、签名存储等已锁定决策

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `signature_pad` 库已安装 — 填写页签名字段可直接复用
- `FormDesignerPage.vue` 中的字段渲染逻辑 — 填写页渲染表单字段可参考
- `meta.public: true` 路由模式 — 免登录页面已有成熟模式（LoginPage, ForbiddenPage）

### Established Patterns
- 后端模块化：每模块一个 route.ts，通过 .use() 注册
- 前端路由：meta.public 标记公开页面，路由守卫自动放行
- 数据存储：FormTemplate.schema 已使用 JSONB，Submission.data 可沿用相同模式
- 状态管理：Pinia store per feature

### Integration Points
- Prisma schema 扩展：新增 ShareLink + Submission 模型，关联 FormTemplate 和 User
- 前端路由：新增 /f/:code 公开填写路由（独立于 MainLayout）
- 模板设计器：新增"身份信息要求"开关到模板配置区域
- 模板列表/详情：新增"分享"操作按钮

</code_context>

<specifics>
## Specific Ideas

- 填写页路由 `/f/:code` — 独立于后台管理布局，无侧边栏/顶栏
- 二维码展示在分享弹窗中，点击"分享"按钮弹出包含链接+二维码的对话框
- 签名字段在填写页的渲染应与设计器预览一致（400x200px 签名板）

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-分享链接+公开填写*
*Context gathered: 2026-04-20*
