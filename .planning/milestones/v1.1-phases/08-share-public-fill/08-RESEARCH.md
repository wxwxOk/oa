# Phase 8: 分享链接 + 公开填写 - Research

**Researched:** 2026-04-20
**Domain:** 分享链接生成、公开表单填写、数据归档
**Confidence:** HIGH

## Summary

Phase 8 在 Phase 7（模板管理 + 表单设计器）基础上扩展，核心任务是：(1) 后端新增 ShareLink + Submission 两个 Prisma 模型及对应 API；(2) 前端新增公开填写页 `/f/:code`（独立于 MainLayout）；(3) 在模板管理页增加"分享"操作和分享弹窗；(4) 在设计器中增加身份信息开关。

技术栈完全沿用现有项目：Bun + Elysia + Prisma（后端），Vue 3 + Quasar + Pinia（前端）。新增依赖仅 nanoid（后端短码生成）和 qrcode（前端二维码渲染），均为成熟稳定的 npm 包。关键架构决策已在 CONTEXT.md 中锁定，无需探索替代方案。

公开填写页是本阶段最大的新模式——它是项目中首个面向外部匿名用户的页面，需要独立的后端路由组（无 authGuard）和前端路由（meta.public: true，独立 layout）。数据模型设计需确保 Submission 正确关联 ShareLink 和 FormTemplate 的 schemaVersion 快照。

**Primary recommendation:** 按"数据层 → 后端 API → 前端公开页 → 管理端集成"的顺序分层实现，公开填写页作为独立 surface 与管理后台解耦。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 分享链接标识符使用 nanoid 生成短码（如 /f/abc123xyz），不可猜测且短小美观
- **D-02:** 二维码在前端实时生成（qrcode 库），无需后端存储图片
- **D-03:** 链接无过期时间/次数限制，仅随模板下线而失效
- **D-04:** 每人每次分享生成独立链接，可追踪每个分享人的收集量
- **D-05:** 填写页采用卡片式居中布局，白色背景，类似问卷星/金数据风格
- **D-06:** 提交成功后显示静态成功页（"提交成功"文字 + 图标），无额外操作
- **D-07:** 不支持暂存草稿，关闭即丢失，降低实现复杂度
- **D-08:** 填写页移动优先响应式设计（扫码场景主要在手机端）
- **D-09:** 身份信息要求在模板级配置（设计器中设置），所有分享链接统一生效
- **D-10:** 身份字段仅提供姓名和手机号两个选项
- **D-11:** 手机号不做短信验证，仅填写即可，降低填写门槛
- **D-12:** 单个开关控制：开启后填写页顶部显示姓名+手机号字段，关闭则不显示
- **D-13:** 提交数据（表单字段值）以 JSONB 格式存储，与模板 schema 结构一致
- **D-14:** 提交记录关联 schemaVersion 整数，查看时从模板历史版本还原字段定义
- **D-15:** Submission 关联 ShareLink 记录，可追溯"谁分享的链接收集了这条数据"
- **D-16:** 填写者身份信息存为 Submission 表独立字段（submitterName, submitterPhone），方便筛选查询

### Claude's Discretion
- 具体 nanoid 长度（建议 10-12 位）
- 二维码前端库选择（qrcode / qrcode.vue 等）
- 填写页具体 UI 细节（间距、字体大小等）
- API 路由命名和错误码设计

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHARE-01 | 用户可为已发布模板生成唯一分享链接，记录分享人和时间 | ShareLink 模型 + nanoid 短码 + POST API（需 authGuard） |
| SHARE-02 | 分享链接可生成二维码供扫码填写 | qrcode 库前端 canvas 渲染，分享弹窗中展示 |
| SHARE-03 | 外部人员通过浏览器打开链接免登录填写表单 | 公开路由组（无 authGuard）+ 前端 meta.public 路由 + 独立 layout |
| SHARE-04 | 模板可配置是否要求填写者提供身份信息 | FormTemplate 新增 requireIdentity 布尔字段 + 设计器 QToggle |
| SHARE-05 | 填写者提交后数据自动归档存储 | Submission 模型 + JSONB data 字段 + schemaVersion 快照关联 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 分享链接生成（nanoid 短码） | API / Backend | — | 短码生成和持久化必须在服务端，确保唯一性和安全性 |
| 二维码生成 | Browser / Client | — | D-02 锁定前端实时生成，无需后端参与 |
| 公开表单渲染 | Browser / Client | API / Backend | 前端渲染表单字段，后端提供 schema 数据 |
| 表单数据提交与归档 | API / Backend | Database / Storage | 后端验证+写入，PostgreSQL JSONB 存储 |
| 身份信息配置 | API / Backend | Browser / Client | 配置持久化在后端（FormTemplate 字段），前端设计器提供 UI |
| 模板状态校验（是否可填写） | API / Backend | — | 链接有效性和模板状态校验必须在服务端 |

## Standard Stack

### Core (已有)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Elysia | ^1.1.24 | 后端 HTTP 框架 | 项目已用，Bun 原生 [VERIFIED: backend/package.json] |
| @prisma/client | ^5.22.0 | ORM / 数据库访问 | 项目已用 [VERIFIED: backend/package.json] |
| Vue 3 | ^3.5.12 | 前端框架 | 项目已用 [VERIFIED: frontend/package.json] |
| Quasar | ^2.17.0 | UI 组件库 | 项目已用，提供 QDialog/QForm/QInput 等 [VERIFIED: frontend/package.json] |
| Pinia | ^2.2.4 | 状态管理 | 项目已用 [VERIFIED: frontend/package.json] |
| signature_pad | ^5.1.3 | 手写签名 | 项目已安装，Phase 7 引入 [VERIFIED: frontend/package.json] |

### New Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nanoid | 5.1.9 | 后端生成 URL-safe 短码 | 118 bytes，加密安全随机，ESM 原生，Bun 兼容 [VERIFIED: npm registry] |
| qrcode | 1.5.4 | 前端生成二维码 canvas | 纯 JS 实现，支持 toCanvas()，无需 DOM 依赖 [VERIFIED: npm registry] |
| @types/qrcode | 1.5.6 | qrcode 的 TypeScript 类型 | 开发依赖 [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid | uuid v4 | uuid 更长（36 chars），nanoid 更短（12 chars）且 URL-safe，D-01 锁定 nanoid |
| qrcode (npm) | qrcode.vue | qrcode.vue 是 Vue 封装，但 qrcode 原生 toCanvas() 更灵活，无额外抽象层 |
| qrcode (npm) | vue-qrcode | 同上，直接用 qrcode 更轻量 |

**Discretion decision:** 使用 `qrcode` 原生库（非 Vue 封装），通过 `QRCode.toCanvas()` 直接渲染到 canvas 元素。理由：API 简单，无需额外 Vue 组件封装，与 UI-SPEC 中的 canvas 渲染方案一致。

**Discretion decision:** nanoid 长度设为 12 位。理由：12 位 URL-safe 字符（62^12 ≈ 3.2×10^21 种组合）在可预见的使用量下碰撞概率极低，同时保持链接短小美观。

**Installation:**
```bash
# 后端
cd backend && bun add nanoid

# 前端
cd frontend && bun add qrcode && bun add -d @types/qrcode
```

**Version verification:**
- nanoid: 5.1.9 (latest, 2026-04-20 verified) [VERIFIED: npm registry]
- qrcode: 1.5.4 (latest, 2026-04-20 verified) [VERIFIED: npm registry]
- @types/qrcode: 1.5.6 (latest, 2026-04-20 verified) [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
[员工浏览器 - 管理端]                    [外部用户浏览器 - 填写端]
        |                                         |
   POST /api/v1/templates/:id/share-links    GET /api/public/f/:code
   (authGuard + 权限校验)                    (无鉴权)
        |                                         |
        v                                         v
  ┌─────────────────────────────────────────────────────┐
  │                  Elysia Backend                      │
  │                                                      │
  │  /api/v1/templates/...  │  /api/public/f/...         │
  │  (authGuard group)      │  (public group, no auth)   │
  │                         │                            │
  │  shareModule            │  publicFillModule          │
  │  - POST share-links     │  - GET /:code (schema)    │
  │                         │  - POST /:code/submit     │
  └────────────┬────────────┴──────────┬─────────────────┘
               │                       │
               v                       v
  ┌──────────────────────────────────────────────┐
  │              PostgreSQL (Prisma)              │
  │                                              │
  │  FormTemplate ──< ShareLink ──< Submission   │
  │  + requireIdentity   + code(nanoid)  + data  │
  │  + schemaVersion     + creatorId     + JSONB  │
  └──────────────────────────────────────────────┘
```

数据流：
1. 员工在管理端点击"分享" → POST 创建 ShareLink → 返回 code → 前端拼接完整 URL + 生成二维码
2. 外部用户扫码/点击链接 → GET 获取模板 schema + requireIdentity → 渲染表单
3. 外部用户填写提交 → POST 提交数据 → 后端校验 → 创建 Submission（关联 ShareLink + schemaVersion）
### Recommended Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # 新增 ShareLink + Submission 模型, FormTemplate 新增 requireIdentity
│   └── migrations/            # 新 migration
├── src/
│   ├── modules/
│   │   ├── template/
│   │   │   └── template.route.ts   # 现有，新增 POST /:id/share-links 端点
│   │   └── public/
│   │       └── public.route.ts     # 新建：公开填写 API（GET /:code, POST /:code/submit）
│   └── index.ts               # 注册 publicFillModule（独立于 /api/v1 group）

frontend/
├── src/
│   ├── pages/
│   │   └── PublicFillPage.vue      # 新建：公开填写页（独立 layout）
│   ├── components/
│   │   ├── ShareDialog.vue         # 新建：分享弹窗（链接 + 二维码）
│   │   └── public-fill/
│   │       └── FormFieldRenderer.vue  # 新建：公开填写页字段渲染器
│   ├── stores/
│   │   └── template.ts             # 扩展：新增 createShareLink action
│   └── router/
│       └── routes.ts               # 新增 /f/:code 路由
```

### Pattern 1: 公开路由组（无鉴权）

**What:** 在 Elysia 中创建独立的路由组，不使用 authGuard，专门服务公开 API。
**When to use:** 外部匿名用户访问的端点。
**Example:**
```typescript
// backend/src/modules/public/public.route.ts
// 遵循项目现有模块化模式：每模块一个 route.ts
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { notFound, BizError } from '../../utils/errors';

export const publicFillModule = new Elysia({ prefix: '/public/f' })
  // 无 authGuard — 公开访问
  .get('/:code', async ({ params }) => {
    const link = await prisma.shareLink.findUnique({
      where: { code: params.code },
      include: {
        template: {
          select: {
            id: true, name: true, description: true,
            schema: true, schemaVersion: true,
            status: true, requireIdentity: true,
          },
        },
      },
    });
    if (!link) throw notFound('链接无效');
    if (link.template.status !== 'PUBLISHED') {
      throw new BizError('该表单已停止收集', 410, 'TEMPLATE_OFFLINE');
    }
    return {
      templateName: link.template.name,
      description: link.template.description,
      schema: link.template.schema,
      requireIdentity: link.template.requireIdentity,
    };
  })
  .post('/:code/submit', async ({ params, body }) => {
    // 提交逻辑...
  });
```

```typescript
// backend/src/index.ts — 注册方式
// 公开模块注册在 /api/v1 group 之外，或在 group 内但不加 authGuard
.group('/api', (app) =>
  app
    .group('/v1', (app) =>
      app.use(authModule).use(formTemplateModule) // 需鉴权
    )
    .use(publicFillModule) // /api/public/f/:code — 无鉴权
)
```

### Pattern 2: 前端公开路由（独立 Layout）

**What:** 公开填写页使用独立的 q-layout，不嵌套在 MainLayout 中。
**When to use:** 不需要侧边栏/顶栏的独立页面。
**Example:**
```typescript
// frontend/src/router/routes.ts
// 遵循 LoginPage 的 meta.public 模式
{
  path: '/f/:code',
  component: () => import('pages/PublicFillPage.vue'),
  meta: { public: true },
}
```

路由守卫已有 `meta.public` 判断逻辑（见 `router/index.ts:21`），公开页面自动跳过鉴权。

### Pattern 3: Prisma 数据模型扩展

**What:** 新增 ShareLink 和 Submission 模型，扩展 FormTemplate。
**When to use:** 本阶段数据层变更。
**Example:**
```prisma
// backend/prisma/schema.prisma — 新增内容

model FormTemplate {
  // ... 现有字段
  requireIdentity Boolean @default(false)
  shareLinks      ShareLink[]
  submissions     Submission[]
}

model ShareLink {
  id         Int          @id @default(autoincrement())
  code       String       @unique
  templateId Int
  template   FormTemplate @relation(fields: [templateId], references: [id])
  creatorId  Int
  creator    User         @relation(fields: [creatorId], references: [id])
  createdAt  DateTime     @default(now())
  submissions Submission[]

  @@index([templateId])
  @@index([creatorId])
}

model Submission {
  id              Int          @id @default(autoincrement())
  data            Json
  schemaVersion   Int
  submitterName   String?
  submitterPhone  String?
  templateId      Int
  template        FormTemplate @relation(fields: [templateId], references: [id])
  shareLinkId     Int
  shareLink       ShareLink    @relation(fields: [shareLinkId], references: [id])
  createdAt       DateTime     @default(now())

  @@index([templateId])
  @@index([shareLinkId])
  @@index([createdAt])
}
```

注意：User 模型需新增 `shareLinks ShareLink[]` 关系字段。

### Pattern 4: 二维码 Canvas 渲染

**What:** 使用 qrcode 库的 toCanvas API 将二维码渲染到 canvas 元素。
**When to use:** 分享弹窗中展示二维码。
**Example:**
```typescript
// frontend/src/components/ShareDialog.vue 中的核心逻辑
import QRCode from 'qrcode';
import { ref, nextTick, watch } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const shareUrl = ref('');

watch(shareUrl, async (url) => {
  if (!url || !canvasRef.value) return;
  await nextTick();
  await QRCode.toCanvas(canvasRef.value, url, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
});
```

### Anti-Patterns to Avoid

- **在公开路由中泄露内部数据:** 公开 API 返回的模板数据应只包含填写所需字段（name, description, schema, requireIdentity），不暴露 creatorId、updatedAt 等内部信息。
- **前端拼接 API URL 作为分享链接:** 分享链接应是前端路由 URL（如 `https://domain.com/f/abc123`），不是 API 端点。
- **在公开提交 API 中信任客户端 schemaVersion:** schemaVersion 应在后端从 FormTemplate 当前值读取，不从客户端传入。
- **签名数据未做大小限制:** signature_pad 的 toDataURL 输出可能很大（几百 KB），后端应限制请求体大小。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe 随机短码 | 自定义 Math.random 拼接 | nanoid | 加密安全、碰撞概率可控、URL-safe 字符集 |
| 二维码生成 | Canvas 手动绘制 QR 矩阵 | qrcode.toCanvas() | QR 编码算法复杂，纠错级别处理繁琐 |
| 表单验证 | 自定义验证逻辑 | Quasar QForm rules | 内置错误展示、提交时触发、aria 支持 |
| 剪贴板复制 | document.execCommand('copy') | navigator.clipboard.writeText() | 现代 API，已废弃的 execCommand 不可靠 |
| 手写签名 | 自定义 Canvas 绑定 | signature_pad（已安装） | 压力感应、平滑曲线、跨设备兼容 |

**Key insight:** 本阶段所有"看似简单但实际复杂"的功能（短码、二维码、签名、表单验证）都有成熟的库解决方案，且大部分已在项目中安装或决策锁定。

## Common Pitfalls

### Pitfall 1: nanoid ESM-only 导入问题
**What goes wrong:** nanoid v5 是纯 ESM 包，CommonJS 项目中 `require('nanoid')` 会失败。
**Why it happens:** nanoid v4+ 移除了 CJS 支持。
**How to avoid:** 项目后端使用 Bun 运行，package.json 已设置 `"type": "module"`，ESM 导入无问题。直接 `import { nanoid } from 'nanoid'` 即可。[VERIFIED: backend/package.json type: module]
**Warning signs:** 如果看到 `ERR_REQUIRE_ESM` 错误，说明导入方式不对。

### Pitfall 2: 公开 API 与鉴权 API 路由冲突
**What goes wrong:** 公开路由被 authGuard 拦截，外部用户收到 401。
**Why it happens:** Elysia 的 `.use()` 链中 authGuard 作用域可能意外扩展到公开路由。
**How to avoid:** 公开模块必须注册在 authGuard 作用域之外。推荐方案：公开模块在 `/api/v1` group 之外注册，或在 group 内但确保不继承 authGuard。STATE.md 已记录 Elysia route group isolation 的 Issue #1752，需用集成测试验证。
**Warning signs:** 公开页面加载时返回 401 或 "未登录" 错误。

### Pitfall 3: 签名数据过大导致请求失败
**What goes wrong:** signature_pad 的 toDataURL('image/png') 输出 base64 字符串可能达到 200-500KB，多个签名字段会使请求体膨胀。
**Why it happens:** PNG base64 编码效率低，复杂签名笔画多时数据量大。
**How to avoid:** (1) 后端设置合理的请求体大小限制（如 5MB）；(2) 前端在提交前可用 toDataURL('image/jpeg', 0.5) 压缩；(3) 单个 Submission 的 data JSONB 字段通常不会超过 1MB。
**Warning signs:** 提交时出现 413 Payload Too Large 或请求超时。

### Pitfall 4: 二维码在 Dialog 中渲染时机问题
**What goes wrong:** QRCode.toCanvas() 在 canvas 元素还未挂载到 DOM 时调用，导致渲染失败。
**Why it happens:** QDialog 的内容是延迟渲染的，canvas ref 在 dialog 打开前为 null。
**How to avoid:** 使用 `watch` + `nextTick` 确保 canvas 已挂载后再调用 toCanvas()，或在 dialog 的 `@show` 事件中触发渲染。
**Warning signs:** 二维码区域空白，控制台报 canvas 为 null 的错误。

### Pitfall 5: schemaVersion 快照不一致
**What goes wrong:** 提交时记录的 schemaVersion 与实际 schema 不匹配，导致 Phase 9 查看数据时字段错位。
**Why it happens:** 在提交处理过程中，模板可能被同时编辑并 bump 了 version。
**How to avoid:** 在提交 API 中，使用事务读取当前 schemaVersion 并写入 Submission，确保原子性。
**Warning signs:** 提交记录的 schemaVersion 与模板当前版本不一致。

### Pitfall 6: 移动端签名 Canvas 触摸事件冲突
**What goes wrong:** 在移动端签名时，触摸事件同时触发页面滚动，导致签名无法正常绘制。
**Why it happens:** Canvas 的 touch 事件未阻止默认行为。
**How to avoid:** signature_pad 内部已处理 `touchstart/touchmove` 的 `preventDefault()`，但需确保 canvas 容器不被 Quasar 的滚动容器干扰。填写页使用 `q-page` 的默认滚动即可，签名区域不需要额外的滚动容器。
**Warning signs:** 移动端签名时页面跟着滚动。
## Code Examples

### nanoid 短码生成（后端）
```typescript
// backend/src/modules/template/template.route.ts — 新增分享链接端点
import { nanoid } from 'nanoid';

// POST /api/v1/templates/:id/share-links
// 需要 authGuard('form:template:share') 或复用 'form:template:edit'
async ({ params, currentUser }) => {
  const templateId = Number(params.id);
  const tpl = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw notFound('模板不存在');
  if (tpl.status !== 'PUBLISHED') throw new BizError('仅已发布模板可生成分享链接');

  const link = await prisma.shareLink.create({
    data: {
      code: nanoid(12), // 12 位 URL-safe 短码
      templateId,
      creatorId: currentUser.id,
    },
  });
  return link;
}
```

### qrcode Canvas 渲染（前端）
```typescript
// frontend/src/components/ShareDialog.vue
import QRCode from 'qrcode';

async function renderQR(canvas: HTMLCanvasElement, url: string) {
  await QRCode.toCanvas(canvas, url, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
```

### 剪贴板复制
```typescript
// 复制链接到剪贴板
async function copyLink(url: string) {
  await navigator.clipboard.writeText(url);
  Notify.create({ type: 'positive', message: '链接已复制' });
}
```

### 公开提交 API（后端）
```typescript
// POST /api/public/f/:code/submit
async ({ params, body }) => {
  const link = await prisma.shareLink.findUnique({
    where: { code: params.code },
    include: { template: true },
  });
  if (!link) throw notFound('链接无效');
  if (link.template.status !== 'PUBLISHED') {
    throw new BizError('该表单已停止收集', 410, 'TEMPLATE_OFFLINE');
  }

  // 如果模板要求身份信息，校验必填
  if (link.template.requireIdentity) {
    if (!body.submitterName?.trim()) throw new BizError('请输入姓名');
    if (!/^1\d{10}$/.test(body.submitterPhone ?? '')) throw new BizError('请输入有效手机号');
  }

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
}
```

### 分享链接 URL 拼接（前端）
```typescript
// 分享链接 = 前端域名 + /f/ + code
function getShareUrl(code: string): string {
  return `${window.location.origin}/f/${code}`;
}
```

## Project Constraints (from CLAUDE.md)

项目根目录无 CLAUDE.md 文件。全局 CLAUDE.md 中的相关约束：
- 代码注释使用中文（除非有特殊要求）
- 对话和解释使用中文
- 网络请求优先使用 Tavily（研究阶段适用）

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| uuid v4 作为分享标识 | nanoid 短码 | nanoid v3+ (2020) | URL 更短，更美观，同等安全性 |
| 后端生成二维码图片 | 前端 Canvas 实时渲染 | qrcode 库成熟后 | 减少后端负担，无需存储图片 |
| document.execCommand('copy') | navigator.clipboard.writeText() | Clipboard API 标准化 (2021) | 更可靠，异步 API，现代浏览器全面支持 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | nanoid 在 Bun 运行时中可正常工作（使用 crypto.getRandomValues） | Standard Stack | LOW — Bun 完整支持 Web Crypto API，但未在本项目中实际测试 |
| A2 | Elysia 默认请求体大小限制足够容纳签名数据（~5MB） | Pitfalls | MEDIUM — 如果默认限制过小，签名提交会失败，需显式配置 |
| A3 | 权限码使用 form:template:edit 复用于分享操作 | Code Examples | LOW — 可能需要新增 form:template:share 权限码，取决于 RBAC 粒度需求 |

## Open Questions (RESOLVED)

1. **分享权限码是否需要独立？**
   - What we know: 现有权限体系有 form:template:list/create/edit/delete/publish
   - What's unclear: 分享操作是否需要独立的 form:template:share 权限码
   - Recommendation: 复用 form:template:edit 权限即可，分享是编辑模板的延伸操作。如需更细粒度控制，可在 Phase 9 或后续迭代中拆分。
   - RESOLVED: Plan 08-01 新增 form:template:share 权限码，Plan 08-02 在分享端点中使用该权限。

2. **公开 API 是否需要速率限制？**
   - What we know: 公开提交 API 无鉴权，理论上可被滥用
   - What's unclear: 当前阶段是否需要实现速率限制
   - Recommendation: v1.1 暂不实现，但在 API 设计中预留扩展点。可在 Elysia 层面后续添加 IP 限流中间件。
   - RESOLVED: 当前阶段不实现速率限制，后续可在 Elysia 层面添加 IP 限流中间件。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | 后端运行时 | Yes | (项目已用) | — |
| PostgreSQL | 数据存储 | Yes | (项目已用) | — |
| Node.js/npm | 包管理 | Yes | (项目已用) | — |
| nanoid | 短码生成 | No (需安装) | 5.1.9 | `bun add nanoid` |
| qrcode | 二维码生成 | No (需安装) | 1.5.4 | `bun add qrcode` |

**Missing dependencies with no fallback:** None — 所有缺失依赖均可通过 bun add 安装。

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | 公开填写页无需认证（设计决策） |
| V3 Session Management | No | 公开页面无 session |
| V4 Access Control | Yes | 分享链接创建需 authGuard；公开 API 仅暴露必要数据 |
| V5 Input Validation | Yes | Elysia t.Object schema 验证 + 后端业务校验 |
| V6 Cryptography | Yes | nanoid 使用 crypto.getRandomValues()，短码不可猜测 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 短码枚举攻击 | Information Disclosure | nanoid 12 位（62^12 组合），暴力枚举不可行 |
| 公开 API 滥用提交 | Denial of Service | 后续可加 IP 速率限制；当前 Elysia 请求体大小限制 |
| JSONB 注入 | Tampering | Prisma 参数化查询，JSONB 值不参与 SQL 拼接 |
| XSS via 提交数据 | Tampering | 提交数据存储为 JSONB，Phase 9 展示时需转义 |
| 签名数据过大 | Denial of Service | 后端请求体大小限制 |

## Sources

### Primary (HIGH confidence)
- backend/package.json — 确认现有依赖和项目配置 [VERIFIED: codebase]
- frontend/package.json — 确认前端依赖 [VERIFIED: codebase]
- backend/prisma/schema.prisma — 现有数据模型 [VERIFIED: codebase]
- backend/src/index.ts — Elysia 应用结构和路由注册模式 [VERIFIED: codebase]
- backend/src/middlewares/auth.ts — authGuard 实现模式 [VERIFIED: codebase]
- frontend/src/router/ — 路由守卫和 meta.public 模式 [VERIFIED: codebase]
- npm registry — nanoid 5.1.9, qrcode 1.5.4, @types/qrcode 1.5.6 [VERIFIED: npm view]
- 08-UI-SPEC.md — UI 设计合约 [VERIFIED: codebase]
- 08-CONTEXT.md — 用户决策 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- LoginPage.vue — 公开页面独立 layout 模式参考 [VERIFIED: codebase]
- SignatureField.vue — 签名组件复用参考 [VERIFIED: codebase]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 所有库版本已通过 npm registry 验证，项目现有依赖已通过 package.json 确认
- Architecture: HIGH — 所有模式均基于项目现有代码模式（authGuard、meta.public、Prisma 模型）推导
- Pitfalls: HIGH — 基于代码审查和已知的 Elysia route group issue (#1752) 识别

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — 技术栈稳定，无快速变化风险)
