# Phase 6: Docker 化 + 文档 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 06-docker-docs
**Areas discussed:** Dockerfile 优化深度, docker-compose 生产强化, README 覆盖深度, 部署脚本内容与语言

---

## Dockerfile 优化深度

### 后端 Dockerfile 改造

| Option | Description | Selected |
|--------|-------------|----------|
| 真·多阶段（保留源码） | 仅复制 src/prisma/package.json/node_modules/.prisma，源码保留（Bun 直跑）。省事不打包，镜像略大 | ✓ |
| 真·多阶段+bundle（最瘦） | bun build 打包到 dist，runner 只拷 dist+prisma。镜像最小，但 Prisma 动态 require 要验证 | |
| 轻量修复 | 保持现状，只修正 COPY 范围 | |

**User's choice:** 真·多阶段（保留源码）
**Notes:** 避免 Prisma 动态 require 兼容问题，稳妥优先

### 前端 Dockerfile 构建链

| Option | Description | Selected |
|--------|-------------|----------|
| 切到 Bun 构建（统一栈） | builder 改为 oven/bun:1.3-alpine + bun install + bun run build。与后端一致、更快安装 | ✓ |
| 保留 npm（现状） | 继续 node:20-alpine + npm install --legacy-peer-deps。稳定但两套包管理器 | |

**User's choice:** 切到 Bun 构建（统一栈）

### 健康检查位置

| Option | Description | Selected |
|--------|-------------|----------|
| Dockerfile 内置 HEALTHCHECK | 镜像自带，不依赖 compose | ✓ |
| 只在 compose 配 | 逻辑集中在 compose | |
| 两者都配 | 冗余但稳 | |

**User's choice:** Dockerfile 内置 HEALTHCHECK

---

## docker-compose 生产强化

### 资源限制

| Option | Description | Selected |
|--------|-------------|----------|
| 不配置 | 简单灵活，依赖宿主机资源 | ✓ |
| 配软限（limits） | deploy.resources.limits，需 compose v3.8+ | |
| 用单机写法 (mem_limit/cpus) | 单机绝对生效 | |

**User's choice:** 不配置

### Logging driver

| Option | Description | Selected |
|--------|-------------|----------|
| 配 json-file 轮转上限 | max-size: 10m, max-file: 3。防日志撑爆磁盘 | ✓ |
| 保持默认 | 无上限，依赖系统级 logrotate | |

**User's choice:** 配 json-file 轮转上限

### depends_on 健康等待

| Option | Description | Selected |
|--------|-------------|----------|
| frontend 等 backend healthy | condition: service_healthy，最鲁棒 | ✓ |
| 仅 started（当前写法） | 启动顺序即可 | |

**User's choice:** frontend 等 backend healthy

### profiles 区分环境

| Option | Description | Selected |
|--------|-------------|----------|
| 不配 profiles | 所有 service 默认启动，一条命令搞定 | ✓ |
| 配 profiles (dev/prod) | 快速启停不同场景 | |
| docker-compose.override.yml | 主 compose 为生产，override 提供开发覆盖 | |

**User's choice:** 不配 profiles

---

## README 覆盖深度

### 深度档位

| Option | Description | Selected |
|--------|-------------|----------|
| 中等（架构+排查+升级） | 现有基础 + 架构图 + 端口表 + 故障排查 + 升级流程 | |
| 完整（+HTTPS/备份/截图） | 中等 + 反向代理/HTTPS 示例 + 备份恢复 + 贡献指南 + 截图/GIF | ✓ |
| 分文件 (docs/) | README 简短入口，详细内容拆到 docs/ | |

**User's choice:** 完整（+HTTPS/备份/截图）

### 语言

| Option | Description | Selected |
|--------|-------------|----------|
| 只写中文 | 用户群体对应，维护成本低 | ✓ |
| 中英双语 | README.md 中文 + README.en.md 英文 | |
| 只写英文 | 开源通行 | |

**User's choice:** 只写中文

### 架构图形式

| Option | Description | Selected |
|--------|-------------|----------|
| Mermaid 代码块 | GitHub 自动渲染，好维护 | ✓ |
| ASCII | 万能兼容 | |
| 附图片文件 | 视觉好但更新麻烦 | |

**User's choice:** Mermaid 代码块

---

## 部署脚本内容与语言

### 脚本技术路径

| Option | Description | Selected |
|--------|-------------|----------|
| Bash + PowerShell 双份 | 覆盖 Windows 本地 + Linux 线上 | ✓ |
| 仅 bash | 线上 Linux/Mac；Windows 用 WSL/Git Bash | |
| bun TS 脚本 | 跨平台、与后端统一；但启动需 bun | |

**User's choice:** Bash + PowerShell 双份

### 脚本覆盖操作

| Option | Description | Selected |
|--------|-------------|----------|
| init 首次安装 | 生成 .env + pull + migrate + seed | ✓ |
| backup / restore | pg_dump / pg_restore | ✓ |
| upgrade 升级 | pull + build + migrate | ✓ |
| health 健康检查 | 检查三服务状态 | ✓ |

**User's choice:** 全选

### .env 校验

| Option | Description | Selected |
|--------|-------------|----------|
| 专用 check-env 脚本 | 独立脚本检查 .env 存在、JWT_SECRET ≥32、密码非默认 | ✓ |
| 内嵌在 init | 简单但不能独立运行 | |
| 不增补 | 依赖后端启动校验 | |

**User's choice:** 专用 check-env 脚本

---

## Claude's Discretion

- 后端 runner 阶段额外 apk 包选择
- Mermaid 架构图布局与节点命名
- 反向代理示例选 Caddy 还是 Nginx（或两者）
- 截图/GIF 内容与放置位置
- 脚本错误提示措辞与颜色输出
- backup 文件保留天数策略

## Deferred Ideas

- 镜像发布到 Docker Hub / GHCR + CI 自动构建 — 超出 v1.0 范围
- compose 内置反向代理容器 — README 给示例即可
- 备份定时策略（cron container）— v1.0 手动脚本足够
- docker-compose.override.yml 开发模式 — 当前不区分 dev/prod
