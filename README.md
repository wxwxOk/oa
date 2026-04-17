# OA 管理系统

前后端分离的 OA 管理系统，v1.0 聚焦「组织架构与用户管理」。

## 技术栈

- **前端**: Vue 3 + Quasar Framework（PC/Mobile 自适应）+ TypeScript + Pinia
- **后端**: Bun + Elysia + Prisma + TypeScript
- **数据库**: PostgreSQL 16
- **认证**: JWT (access + refresh)
- **部署**: Docker Compose

## 快速开始

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
bun install        # 或 npm/pnpm install
bun run dev        # http://localhost:9000
```

### 一键部署

```bash
cp .env.example .env   # 修改密码与 JWT_SECRET
docker compose up -d --build
# 访问 http://localhost:9000
```

## 默认账号

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | ADMIN（全部权限） |

## 目录结构

```
.
├── backend/        # Elysia + Bun + Prisma
├── frontend/       # Quasar (Vue3)
├── docker-compose.yml
└── .env.example
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
