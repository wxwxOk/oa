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
