# Phase 24: 报销数据模型 + 附件上传 API - Research

**Date:** 2026-05-02
**Phase:** 24 - 报销数据模型 + 附件上传 API
**Status:** Ready for planning

## Planning Answer

Phase 24 should be planned as a backend foundation phase: fixed Prisma schema, reimbursement permission seed, reimbursement API/service contracts, and local attachment storage with object-level authorization. It should not implement employee UI, reviewer UI, handwritten-signature interaction, Excel export, OCR, invoice verification, payment, statistics, or dynamic workflow branching.

## Existing Patterns to Reuse

### Prisma and migrations
- `backend/prisma/schema.prisma` uses explicit enums, `Int @id @default(autoincrement())`, relation fields paired with foreign keys, `createdAt @default(now())`, `updatedAt @updatedAt`, and `@@index` for filter fields.
- `VisitRecord` is the closest fixed-module precedent: explicit business columns, creator relation, nullable strings for flexible business labels, and direct query indexes.
- Approval models provide append-only event patterns: `ApprovalAction` and `ApprovalTimelineEvent` record actor, node/action, comment, payload, and time.

### Permissions
- `backend/prisma/seed.ts` is the single source for permission seed data.
- `ADMIN` receives all permissions through `allPerms`; new reimbursement codes only need to be added to `PERMISSIONS` for admin inheritance.
- `EMPLOYEE_PERMISSION_CODES` is the default role boundary. For reimbursement, employees should receive only create/own/attachment basics; review/export permissions stay excluded.

### Auth and visibility
- `authGuard(requiredPerm)` verifies route-level permission and derives `currentUser.id`, `realName`, `roleCodes`, and `permissions`.
- Phase 24 needs service-level object authorization after route auth: own application, all-list permission, department-review scope, finance-review scope, and attachment access are not interchangeable.

### Route and service style
- `backend/src/modules/visit/visit.route.ts` shows the fixed-module route style: Elysia module prefix, TypeBox schemas, serializers, defensive pagination, explicit field picking, `notFound`, and `{ rows, total, page, size }` responses.
- `backend/src/modules/approval/application-submission.service.ts` shows applicant-owned draft/list/detail/submit patterns, date filters, status normalization, and generated application numbers.
- `backend/src/modules/approval/application.service.ts` shows transaction-bound state changes plus action/timeline writes.
- `backend/src/modules/approval/state-machine.ts` is the compact transition guard pattern to copy for reimbursement-specific statuses.

### Export and file-related safety references
- `backend/src/modules/approval/archive-export.service.ts` already includes row caps and Excel formula-injection sanitization for Phase 27 reuse.
- No existing backend upload module exists. Phase 24 should prefer Bun/Web `File` and `Blob` APIs plus Node `path` helpers instead of adding multer/formidable-style dependencies.

## Recommended Target Contracts

### Models
- Add `ReimbursementStatus`: `DRAFT`, `DEPARTMENT_REVIEW`, `FINANCE_REVIEW`, `APPROVED`, `REJECTED`.
- Add `ReimbursementActionType`: `SUBMIT`, `DEPARTMENT_APPROVE`, `DEPARTMENT_REJECT`, `FINANCE_APPROVE`, `FINANCE_REJECT`.
- Add `ReimbursementApplication` with fixed fields: reimbursement number, title, category, occurred date, Decimal amount, reason, payee info, remark, applicant/department snapshots, status, submit/complete timestamps, attachments, actions, created/updated timestamps.
- Add `ReimbursementAttachment` with application relation, original name, stored name, relative path, MIME, size, uploader, and created time.
- Add `ReimbursementAction` for append-only audit trail; include actor, type, node name, comment, signature metadata/payload, and created time.

### Permissions
Recommended permission codes:
- `reimbursement:create`
- `reimbursement:own`
- `reimbursement:list`
- `reimbursement:department-review`
- `reimbursement:finance-review`
- `reimbursement:attachment`
- `reimbursement:export`

Employee baseline should include `reimbursement:create`, `reimbursement:own`, and `reimbursement:attachment` only. Export and review permissions should remain privileged.

### API
Recommended module prefix: `/api/v1/reimbursements`.

Core endpoints:
- `GET /reimbursements` — visible-scope paginated list, filters: `status`, `category`, `dateFrom`, `dateTo`, `keyword`, `page`, `size`.
- `GET /reimbursements/:id` — detail with attachment metadata and action trail.
- `POST /reimbursements` — create draft.
- `PUT /reimbursements/:id` — edit draft only.
- `POST /reimbursements/:id/submit` — validate required fields/amount, move to department review, append submit action.

Attachment endpoints:
- `POST /reimbursements/:id/attachments`
- `GET /reimbursements/:id/attachments/:attachmentId/preview`
- `GET /reimbursements/:id/attachments/:attachmentId/download`
- `DELETE /reimbursements/:id/attachments/:attachmentId`

## Attachment Implementation Notes

- Use a runtime root such as `REIMBURSEMENT_UPLOAD_DIR`, defaulting to `uploads/reimbursements` in local dev and `/app/uploads/reimbursements` in Docker.
- Store only relative paths in DB. Resolve all reads against the configured root and reject any resolved path outside that root.
- Generate server-side stored names with `nanoid` plus a safe extension derived from MIME type; never trust `originalName` for paths.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Default limits: single file <= 10MB, max 20 attachments per application.
- Use inline `Content-Disposition` for image preview; use attachment disposition for original download.
- Add `uploads/` to `.gitignore` and a Docker volume for `/app/uploads` so container rebuilds do not delete files.

## Main Risks

| Risk | Mitigation for plans |
|------|----------------------|
| Path traversal | Generate stored names, store relative path only, verify resolved path stays under upload root. |
| MIME spoofing | Check declared MIME and extension mapping; keep whitelist small. |
| Oversized files | Enforce 10MB per file before writing to disk. |
| Too many attachments | Count existing rows and cap at 20 per application. |
| Object-level authorization gaps | Centralize visibility helpers used by detail, list, preview, download, delete, and submit. |
| Decimal JSON drift | Serialize Decimal amount as string or normalized number consistently; avoid raw Decimal leaking unpredictably. |
| Submitted data mutation | Allow field/attachment mutation only in `DRAFT`. Later phases append actions instead of changing core fields. |
| Contract instability | Freeze status values and endpoint paths in Phase 24 so Phases 25-27 can build on them. |
| Docker file loss | Add upload volume and env path. |

## Recommended Plan Shape

1. **Wave 0: backend contract tests** — Permission seed, schema/model contract, route contract, attachment safety contract.
2. **Wave 1: model, migration, seed, storage baseline** — Prisma enums/models/migration, generated client gate, reimbursement permissions, `.gitignore`/Docker upload path.
3. **Wave 2: reimbursement application API** — state helper, service, list/detail/create/edit/submit, object authorization, route registration.
4. **Wave 3: attachment API and final backend gate** — file validation, upload, preview, download, draft delete, full tests/build.

## Validation Architecture

### Automated gates
- Schema gate: `cd backend && bun --env-file=../.env prisma validate && bun --env-file=../.env prisma generate`.
- Migration gate: `cd backend && bun --env-file=../.env prisma migrate dev` when DB is available; if local `.env` points to Docker service host `postgres`, override `DATABASE_URL` to localhost for host-run migration without editing `.env`.
- Seed gate: focused Bun tests for reimbursement permission constants and employee/admin grants.
- API gate: focused Bun tests for route prefix/signatures, TypeBox strict schemas, serializers, pagination, filters, create/edit/submit, and object-level access checks.
- File gate: focused Bun tests for MIME whitelist, size cap, max attachment count, safe name generation, path traversal rejection, preview/download headers, and missing-file handling.
- Final build gate: `cd backend && bun test && bun run build`.

### Manual checks deferred to later phases
- Browser upload UX and mobile preview/download flows belong to Phase 25.
- Department/finance reviewer signature UI belongs to Phase 26.
- Export UAT belongs to Phase 27.

## Planning Constraints

- Do not add upload dependencies unless Bun/Elysia built-ins prove insufficient during implementation.
- Do not implement OCR, invoice validation, duplicate detection, payment, budget control, accounting integration, statistics dashboard, amount-based routing, delegation, or timeout escalation.
- Keep route/service code split enough that file IO and authorization are not buried in route handlers.
