# Phase 6: Docker 化 + 文档 - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

交付生产级 Dockerfile（前后端真·多阶段构建）、docker-compose 生产强化（healthcheck/logging/depends_on）、完整 README（架构图+HTTPS+备份+故障排查+升级）、Bash+PowerShell 双份部署脚本（init/backup/restore/upgrade/health/check-env）。

</domain>

<decisions>
## Implementation Decisions

### Dockerfile 优化
- **D-01:** 后端 Dockerfile 改为真·多阶段构建（保留源码模式）：builder 阶段 `bun install` + `prisma generate`；runner 阶段仅复制 `src/`、`prisma/`、`package.json`、`node_modules/.prisma`，不复制整个 `/app`
- **D-02:** 前端 Dockerfile 切换到 Bun 构建链：builder 阶段 `oven/bun:1.3-alpine` + `bun install` + `bun run build`（quasar build）；runner 阶段保持 `nginx:1.27-alpine`。去掉 `npm install --legacy-peer-deps`
- **D-03:** 前后端 Dockerfile 均内置 `HEALTHCHECK` 指令：后端 `curl -f http://localhost:3000/health`；前端 `wget -qO /dev/null http://localhost:80/`

### docker-compose 生产强化
- **D-04:** 不配置资源限制（mem_limit/cpus），保持简单
- **D-05:** 所有 service 配置 logging driver：`json-file`，`max-size: 10m`，`max-file: "3"`，防日志撑爆磁盘
- **D-06:** frontend depends_on backend 改为 `condition: service_healthy`（需后端 healthcheck 就绪）
- **D-07:** 不配 profiles，不区分 dev/prod。`docker compose up -d` 一条命令启动全部

### README 覆盖深度
- **D-08:** 完整档：现有基础 + 架构图（Mermaid 代码块）+ 默认端口表 + 反向代理/HTTPS 示例（Caddy/Nginx）+ 备份恢复说明 + 故障排查 FAQ + 升级流程 + 贡献指南 + 截图/GIF
- **D-09:** 只写中文（技术词/命令保留英文原文）
- **D-10:** 架构图使用 Mermaid 代码块，GitHub 自动渲染

### 部署脚本
- **D-11:** 双份脚本：`scripts/*.sh`（Bash）+ `scripts/*.ps1`（PowerShell），功能对等
- **D-12:** 脚本覆盖 4 类操作：
  - `init` — 从 `.env.example` 生成 `.env`（随机 JWT_SECRET + POSTGRES_PASSWORD）、pull 镜像、首次 migrate + seed
  - `backup` / `restore` — pg_dump 到 `backups/YYYY-MM-DD.sql` / 从指定文件恢复
  - `upgrade` — `docker compose pull` + `docker compose up -d --build` + 自动 migrate
  - `health` — 检查 postgres 连通、backend /health、frontend /，打印状态
- **D-13:** 专用 `check-env` 脚本：检查 `.env` 存在、JWT_SECRET 长度 ≥32 且非默认值、POSTGRES_PASSWORD 非默认值。init 脚本自动调用

### Claude's Discretion
- 后端 runner 阶段是否需要额外 apk 包（如 openssl）
- Mermaid 架构图的具体布局与节点命名
- 反向代理示例选 Caddy 还是 Nginx（或两者都给）
- 截图/GIF 的具体内容与放置位置
- 脚本内部的错误提示措辞与颜色输出
- backup 文件保留天数策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 部署需求
- `.planning/REQUIREMENTS.md` §NFR-4 — `docker compose up -d` 一条命令启动
- `.planning/REQUIREMENTS.md` §NFR-2 — JWT secret ≥32 字符、安全约束

### 现有 Docker 配置
- `docker-compose.yml` — 当前三服务编排（postgres/backend/frontend）
- `backend/Dockerfile` — 当前伪多阶段，需重写
- `frontend/Dockerfile` — 当前 node+npm 构建，需切 bun
- `.env.example` — 环境变量模板

### 前序 phase 决策
- `.planning/phases/05-responsive/05-CONTEXT.md` — Phase 5 UI/UX 完成状态
- `.planning/PROJECT.md` §Constraints — Windows 本地开发、Bun 后端、Docker Compose 单机

### 现有文档
- `README.md` — 当前基础版，需扩充
- `frontend/nginx.conf` — 前端 Nginx 配置

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/index.ts` — 已有 `/health` 端点（Phase 1 实现），Dockerfile HEALTHCHECK 可直接引用
- `docker-compose.yml` — postgres healthcheck 已配好（`pg_isready`），backend/frontend 需补充
- `.env.example` — 已有完整环境变量模板，init 脚本可基于此生成

### Established Patterns
- 后端 Bun + Elysia + Prisma：启动时 `prisma migrate deploy` + `seed` + `bun run src/index.ts`
- 前端 Quasar SPA：构建产物在 `dist/spa/`，Nginx 托管
- JWT_SECRET 启动校验已在后端实现（Phase 2）

### Integration Points
- `backend/Dockerfile` — 重写多阶段构建
- `frontend/Dockerfile` — 切换 bun 构建链
- `docker-compose.yml` — 增加 healthcheck/logging/depends_on 强化
- `scripts/` — 新建目录，放置部署脚本
- `README.md` — 扩充为完整文档

</code_context>

<specifics>
## Specific Ideas

- 后端多阶段保留源码（Bun 直跑 TS），不做 bundle，避免 Prisma 动态 require 兼容问题
- 前端统一 Bun 构建链，与后端技术栈一致
- 脚本 Bash + PowerShell 双份，覆盖 Windows 本地 + Linux 线上两种场景
- README 完整档包含截图/GIF，给用户直观感受

</specifics>

<deferred>
## Deferred Ideas

- 镜像发布到 Docker Hub / GHCR + CI 自动构建 — 超出 v1.0 范围
- compose 内置反向代理容器（Caddy/Traefik）— README 给示例即可，不内置
- 备份定时策略（cron container）— v1.0 手动脚本足够
- docker-compose.override.yml 开发模式 — 当前不区分 dev/prod

</deferred>

---

*Phase: 06-docker-docs*
*Context gathered: 2026-04-20*
