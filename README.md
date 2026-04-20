# OA 管理系统

前后端分离的 OA 管理系统，v1.0 聚焦「组织架构与用户管理」。

## 架构

```mermaid
graph LR
  User([用户/浏览器]) --> Frontend[Frontend<br/>Nginx :9000]
  Frontend -->|/api/*| Backend[Backend<br/>Bun+Elysia :3000]
  Backend --> DB[(PostgreSQL :5432)]

  subgraph Docker Compose
    Frontend
    Backend
    DB
  end
```

## 技术栈

- **前端**: Vue 3 + Quasar Framework（PC/Mobile 自适应）+ TypeScript + Pinia
- **后端**: Bun + Elysia + Prisma + TypeScript
- **数据库**: PostgreSQL 16
- **认证**: JWT (access + refresh)
- **部署**: Docker Compose

## 默认端口

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| PostgreSQL | oa-postgres | 5432 | 数据库 |
| Backend | oa-backend | 3000 | API 服务 |
| Frontend | oa-frontend | 9000 | Web 界面 |

## 快速开始

### 一键部署

Linux / macOS:

```bash
bash scripts/init.sh
```

Windows (PowerShell):

```powershell
.\scripts\init.ps1
```

`init` 脚本会自动从 `.env.example` 生成 `.env`（随机 JWT_SECRET 和数据库密码），校验环境变量，然后启动所有服务。

### 手动部署

```bash
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET（>=32 字符）和 POSTGRES_PASSWORD
docker compose up -d --build
# 访问 http://localhost:9000
```

### 本地开发

```bash
# 1. 启动数据库
cp .env.example .env
docker compose up -d postgres

# 2. 启动后端
cd backend
bun install
bunx prisma migrate dev
bun run seed
bun run dev        # http://localhost:3000

# 3. 启动前端
cd frontend
bun install
bun run dev        # http://localhost:9000
```

### 默认账号

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | ADMIN（全部权限） |

## 环境变量

所有变量定义在 `.env.example` 中，部署前复制为 `.env` 并修改标注项。

| 变量 | 默认值 | 说明 | 必须修改 |
|------|--------|------|----------|
| `POSTGRES_USER` | `oa` | 数据库用户名 | |
| `POSTGRES_PASSWORD` | `oa_pass_change_me` | 数据库密码 | **是** |
| `POSTGRES_DB` | `oa_db` | 数据库名 | |
| `POSTGRES_PORT` | `5432` | 数据库端口 | |
| `BACKEND_PORT` | `3000` | 后端端口 | |
| `DATABASE_URL` | `postgresql://oa:...@postgres:5432/oa_db?schema=public` | Prisma 连接串 | 随密码同步 |
| `JWT_SECRET` | `please-change-this-to-a-long-random-string` | JWT 签名密钥（>=32 字符） | **是** |
| `JWT_EXPIRES_IN` | `2h` | Access Token 有效期 | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token 有效期 | |
| `CORS_ORIGIN` | `http://localhost:9000` | 允许的跨域来源 | 生产环境改为实际域名 |
| `FRONTEND_PORT` | `9000` | 前端端口 | |
| `VITE_API_BASE` | `http://localhost:3000/api/v1` | 前端 API 地址 | 生产环境改为实际地址 |

## 部署脚本

`scripts/` 目录提供 Bash + PowerShell 双份脚本，功能对等。

| 脚本 | 用途 | 用法 |
|------|------|------|
| `scripts/init.sh` / `init.ps1` | 首次部署：生成 .env、校验、启动服务 | `bash scripts/init.sh` |
| `scripts/check-env.sh` / `check-env.ps1` | 校验 .env（JWT_SECRET 长度、非默认密码） | `bash scripts/check-env.sh` |
| `scripts/backup.sh` / `backup.ps1` | 数据库备份到 `backups/` 目录 | `bash scripts/backup.sh` |
| `scripts/restore.sh` / `restore.ps1` | 从备份文件恢复数据库 | `bash scripts/restore.sh backups/2026-04-20.sql` |
| `scripts/upgrade.sh` / `upgrade.ps1` | 拉取最新代码、重建镜像、自动迁移 | `bash scripts/upgrade.sh` |
| `scripts/health.sh` / `health.ps1` | 检查所有服务健康状态 | `bash scripts/health.sh` |

Windows 用户将 `bash scripts/xxx.sh` 替换为 `.\scripts\xxx.ps1`。

## 反向代理 / HTTPS

生产环境建议在前面加一层反向代理终止 HTTPS。以下两种方案任选其一。

### Caddy（推荐，自动 HTTPS）

```
# Caddyfile
your-domain.com {
  reverse_proxy localhost:9000
}
```

安装 Caddy 后执行 `caddy run` 即可，自动申请并续期 Let's Encrypt 证书。

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-domain.pem;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，将 `.env` 中 `CORS_ORIGIN` 改为 `https://your-domain.com`，`VITE_API_BASE` 改为 `https://your-domain.com/api/v1`。

## 备份与恢复

### 备份

```bash
bash scripts/backup.sh
# 输出: backups/oa_db_2026-04-20_153000.sql
```

备份文件保存在项目根目录 `backups/` 下（已加入 `.gitignore`）。建议定期执行并将备份文件转移到外部存储。

定时备份示例（Linux crontab）:

```bash
# 每天凌晨 3 点备份
0 3 * * * cd /path/to/oa && bash scripts/backup.sh
```

### 恢复

```bash
bash scripts/restore.sh backups/oa_db_2026-04-20_153000.sql
```

恢复会覆盖当前数据库内容，操作前请确认备份文件正确。

## 故障排查 FAQ

**Q: 容器启动失败**

查看日志定位原因:

```bash
docker compose logs -f --tail=50
# 查看单个服务
docker compose logs backend
```

**Q: 数据库连接失败**

1. 确认 postgres 容器运行中: `docker compose ps postgres`
2. 检查 `.env` 中 `DATABASE_URL` 的用户名、密码、端口与 `POSTGRES_*` 变量一致
3. 确认 postgres healthcheck 通过: `docker inspect oa-postgres | grep -A5 Health`

**Q: 前端白屏 / API 请求 404**

1. 检查 `.env` 中 `VITE_API_BASE` 是否指向正确的后端地址
2. 确认 backend 容器健康: `docker compose ps backend`
3. 检查 nginx 代理配置: 前端容器内 `/api/*` 请求会转发到 `backend:3000`

**Q: healthcheck 持续 unhealthy**

1. 检查对应服务端口是否正确（backend 3000, frontend 80, postgres 5432）
2. 确认依赖服务已就绪（backend 依赖 postgres，frontend 依赖 backend）
3. 查看容器日志: `docker compose logs <service>`

**Q: JWT 相关错误（401 / token invalid）**

1. 确认 `JWT_SECRET` 长度 >= 32 字符: `bash scripts/check-env.sh`
2. 如果修改过 `JWT_SECRET`，所有已签发的 token 将失效，用户需重新登录

## 升级流程

### 使用脚本

```bash
bash scripts/upgrade.sh
```

脚本自动执行: 备份数据库 → 拉取最新代码 → 重建镜像 → 数据库迁移 → 健康检查。

### 手动升级

```bash
# 1. 备份
bash scripts/backup.sh

# 2. 拉取最新代码
git pull

# 3. 重建并启动
docker compose up -d --build

# 4. 验证
bash scripts/health.sh
```

## 目录结构

```
.
├── backend/            # Elysia + Bun + Prisma
│   ├── Dockerfile      # 多阶段构建
│   ├── .dockerignore
│   ├── prisma/         # Schema + 迁移 + Seed
│   └── src/            # 业务代码
├── frontend/           # Quasar (Vue3)
│   ├── Dockerfile      # Bun 构建 + Nginx 托管
│   ├── .dockerignore
│   ├── nginx.conf      # SPA 路由 + API 代理
│   └── src/            # 业务代码
├── scripts/            # 部署脚本（Bash + PowerShell）
│   ├── init.sh / .ps1
│   ├── check-env.sh / .ps1
│   ├── backup.sh / .ps1
│   ├── restore.sh / .ps1
│   ├── upgrade.sh / .ps1
│   └── health.sh / .ps1
├── docker-compose.yml  # 三服务编排
├── .env.example        # 环境变量模板
└── README.md
```

## 模块

- [x] 用户管理（CRUD + 重置密码 + 启/禁用）
- [x] 部门管理（树形结构）
- [x] 角色与权限（RBAC）
- [x] 登录 / JWT 刷新
- [x] PC + 移动端响应式
- [ ] 考勤、工作流、公告（v2+）

## 接口文档

后端启动后访问 `http://localhost:3000/swagger`。

## 贡献指南

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feat/your-feature`
3. 提交更改: `git commit -m "feat: add your feature"`
4. 推送分支: `git push origin feat/your-feature`
5. 创建 Pull Request

代码规范:
- TypeScript 严格模式
- 后端使用 Bun 运行时
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

## License

MIT
