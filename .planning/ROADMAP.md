# Roadmap - OA v1.0

| Phase | 名称 | 交付物 | 状态 |
|---|---|---|---|
| 1 | 基础脚手架 | docker-compose, backend/frontend 目录骨架, /health 打通 | 🔄 |
| 2 | 数据层 + 认证 | Prisma schema + migration + seed, JWT 登录/刷新, 前端登录页 | ⏳ |
| 3 | 组织架构 CRUD | 部门树、用户 CRUD 页面 | ⏳ |
| 4 | RBAC | 角色管理、权限分配、前端 v-perm 指令 | ⏳ |
| 5 | 响应式体验 | PC/Mobile 双布局、暗色模式 | ⏳ |
| 6 | Docker 化 + 文档 | 多阶段 Dockerfile、README、部署脚本 | ⏳ |

## Dependencies
- Phase 2 依赖 Phase 1
- Phase 3/4 依赖 Phase 2
- Phase 5 依赖 Phase 3/4
- Phase 6 收尾

### Phase 2: 数据层 + 认证

**Goal:** 修复双 JWT 实例（access 2h + refresh 7d），验证 Prisma schema/migration/seed 端到端可运行，前端登录流程完整。

**Requirements:** FR-1.1, FR-1.2, FR-1.3, FR-1.4, NFR-2, NFR-4

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — 后端双 JWT 实例 + secret 校验 + Dockerfile 修复
- [ ] 02-02-PLAN.md — 端到端验证（API 测试 + 前端登录流程）
