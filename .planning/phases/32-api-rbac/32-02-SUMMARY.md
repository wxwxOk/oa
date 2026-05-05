---
phase: 32-api-rbac
plan: 2
subsystem: backend-data-layer
tags: [prisma, postgres, migration, seed, rbac, channel-push, channel-partner-role, uploads, env]

requires:
  - phase: 32-api-rbac
    plan: 1
    provides: Wave 0 channel-push permission seed and Prisma schema contracts
provides:
  - ChannelPush, ChannelPushAttachment, ChannelPushReviewAction and ChannelPartnerProfile Prisma models
  - 20260505100000_add_channel_push_v16 migration applied to dev database
  - CHANNEL_PUSH_PERMISSION_CODES (5), CHANNEL_PARTNER_PERMISSION_CODES (3) and CHANNEL_PARTNER role seed
  - Shared backend/src/modules/channel-push/channel-push.constants.ts (status/action values, mutable statuses, DuplicateHint type)
  - CHANNEL_PUSH_UPLOAD_DIR env var on docker-compose backend service + .env.example documentation
affects: [32-api-rbac, 33-frontend, 34-excel-import, 35-review-ui, 36-notifications]

tech-stack:
  added: []
  patterns:
    - Prisma migrate dev --create-only used to generate SQL, then renamed to plan-spec timestamp before apply
    - CHANNEL_PARTNER role mirrors EMPLOYEE role-grant pattern in seed.ts
    - channel-push.constants.ts as the single source of truth for status values + DuplicateHint type for downstream service/route consumers

key-files:
  created:
    - backend/prisma/migrations/20260505100000_add_channel_push_v16/migration.sql
    - backend/src/modules/channel-push/channel-push.constants.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/prisma/seed.ts
    - docker-compose.yml
    - .env.example

key-decisions:
  - "Migration directory renamed from Prisma's auto-generated 20260505053317 timestamp to plan-spec 20260505100000 so downstream verification commands hit the documented path. Renamed BEFORE first apply so Prisma's _prisma_migrations table picks up the final name."
  - "CHANNEL_PARTNER role default grants stay strictly the 3-code subset (create/viewOwn/cancel). Review and viewScope are reserved for explicit Phase 35 grants."
  - "CHANNEL_PUSH_UPLOAD_DIR reuses the existing oa_uploads volume — no new volume declared, mirroring v1.4 reimbursement pattern."
  - "channel-push.constants.ts re-exports permission code arrays from prisma/seed.ts to keep the seed as the single source of truth (avoiding two copies that drift)."
  - "FK semantics: ChannelPushAttachment + ChannelPushReviewAction cascade-delete when their parent ChannelPush is removed; ChannelPartnerProfile cascade-deletes when its User is removed; all User-referencing FKs (channelPartnerId, recipientUserId, attachment uploaderId, action actorId) use ON DELETE RESTRICT to preserve history."
  - "internalScheduledReceiverId FK uses ON DELETE SET NULL — internal scheduling can clear when a recipient leaves, while the push itself stays auditable."

patterns-established:
  - "Prisma's auto-generated timestamp can be safely renamed BEFORE the first migrate dev apply; rename AFTER apply would require manual _prisma_migrations updates."
  - "Channel-push downstream modules will always import status/action enums and DuplicateHint from channel-push.constants.ts, never directly from @prisma/client, to keep the contract centralised."

requirements-completed:
  - PERM-01
  - PERM-02
  - REVIEW-04
  - REVIEW-06
requirements-progressed:
  - PARTNER-01
  - PARTNER-02
  - PARTNER-03
  - PUSH-01
  - PUSH-02
  - PUSH-05
  - PUSH-06
  - DEDUP-01
  - PERM-03

duration: 18min
completed: 2026-05-05
---

# Phase 32 Plan 2: Schema + Migration + Seed + Upload Baseline Summary

**Wave 1 schema/seed gap closure: Prisma data layer, migration, channel-push permissions and CHANNEL_PARTNER role seed, plus durable local attachment storage baseline.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-05T13:15:00+08:00
- **Completed:** 2026-05-05T13:33:00+08:00
- **Tasks:** 6 (5 atomic commits — Task 4 has no files to commit)
- **Files modified:** 4 source/config files + 1 new migration directory

## Accomplishments

- Added Prisma data layer: 2 enums + 4 models + 7 User backrefs satisfying the Wave 0 schema contract pinned in Plan 32-01.
- Generated SQL migration `20260505100000_add_channel_push_v16/migration.sql` (27 DDL statements: 2 enums, 4 tables, 12 indexes incl. dedup composite, 9 FKs with appropriate cascade semantics).
- Applied migration to dev PostgreSQL via `bunx prisma migrate dev --skip-seed`. Verified with `node -e "...['channelPush','channelPushAttachment','channelPushReviewAction','channelPartnerProfile'].every(k => k in prisma)"` → `OK_ALL_DELEGATES`.
- Updated `prisma/seed.ts`:
  - Exported `CHANNEL_PUSH_PERMISSION_CODES` (5 codes) and `CHANNEL_PARTNER_PERMISSION_CODES` (3-grant subset)
  - Added 5 `module: 'channelPush'` rows to PERMISSIONS
  - Added CHANNEL_PARTNER role upsert with default-grant binding
  - EMPLOYEE_PERMISSION_CODES untouched (no `channelPush:*` by default)
- Added `CHANNEL_PUSH_UPLOAD_DIR` to docker-compose backend service env (default `/app/uploads/channel-push` mapped onto existing `oa_uploads` volume).
- Documented both `REIMBURSEMENT_UPLOAD_DIR` and `CHANNEL_PUSH_UPLOAD_DIR` in `.env.example` with a Chinese comment.
- Created `backend/src/modules/channel-push/channel-push.constants.ts` re-exporting permission code arrays from seed and defining `CHANNEL_PUSH_STATUS_VALUES`, `CHANNEL_PUSH_REVIEW_ACTION_VALUES`, `CHANNEL_PUSH_OWNER_MUTABLE_STATUSES` and `DuplicateHint` type.

## Task Commits

| Commit | Task | Scope |
|--------|------|-------|
| `1a5c58d` | Task 1 | Prisma schema additions (enums + 4 models + User backrefs) |
| `c6cce63` | Task 2 | Migration SQL `20260505100000_add_channel_push_v16/migration.sql` |
| `309eaee` | Task 3 | seed.ts permission codes + CHANNEL_PARTNER role grants |
| —        | Task 4 | [BLOCKING] migrate dev applied — no files to commit (DB-state change only) |
| `abbccb1` | Task 5 | docker-compose CHANNEL_PUSH_UPLOAD_DIR + .env.example |
| `ddef985` | Task 6 | channel-push.constants.ts (+ incidental FormTemplate.watermarkText sync) |

## Files Created/Modified

- `backend/prisma/schema.prisma` — Added `ChannelPushStatus`, `ChannelPushReviewActionType` enums, 4 channel-push models, User backrefs. (Also surfaces a pre-existing DB-only `FormTemplate.watermarkText` column that `prisma migrate dev` re-introspected back into the schema.)
- `backend/prisma/migrations/20260505100000_add_channel_push_v16/migration.sql` — 27-statement migration creating enums, tables, indexes, FKs.
- `backend/prisma/seed.ts` — Added permission code arrays, 5 PERMISSIONS rows, CHANNEL_PARTNER role grants.
- `backend/src/modules/channel-push/channel-push.constants.ts` — Centralised status values, mutable-status guard list, permission re-exports, `DuplicateHint` type.
- `docker-compose.yml` — `CHANNEL_PUSH_UPLOAD_DIR` env var on backend service.
- `.env.example` — Documented `REIMBURSEMENT_UPLOAD_DIR` and `CHANNEL_PUSH_UPLOAD_DIR`.

## Decisions Made

- Renamed Prisma's auto-generated migration timestamp `20260505053317` → plan-spec `20260505100000` BEFORE first apply, so the migration's identity in `_prisma_migrations` matches the plan-documented path forever.
- Kept CHANNEL_PARTNER's default grants narrow (3 codes). Review and viewScope codes exist in `PERMISSIONS` but are NOT auto-granted to the role — they will be granted explicitly to recipient users in Phase 35.
- Used `ON DELETE CASCADE` only where data ownership is unambiguous (attachments and review actions belong to a specific ChannelPush; ChannelPartnerProfile belongs to a specific User). All other FKs use Prisma's default `RESTRICT` to preserve history.
- `internalScheduledReceiverId` uses `ON DELETE SET NULL` — when a recipient leaves the company, internal scheduling clears but the push remains auditable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Tooling] Pre-existing schema/DB drift on FormTemplate.watermarkText**
- **Found during:** Task 4 [BLOCKING] `prisma migrate dev` apply.
- **Issue:** The dev database already had a `watermarkText VARCHAR(100)` column on FormTemplate that was not declared in `schema.prisma`. `prisma migrate dev` re-introspected this back into the schema as part of its sync.
- **Fix:** Committed the introspected schema field alongside the channel-push constants (Task 6). Schema and DB are now consistent.
- **Files modified:** `backend/prisma/schema.prisma` (`+watermarkText String? @db.VarChar(100)` on FormTemplate).
- **Verification:** `bunx prisma validate` exits 0; `bunx prisma migrate status` reports up-to-date.
- **Committed in:** `ddef985`

**2. [Rule 3 - Tooling] Windows query_engine.dll lock during prisma generate**
- **Found during:** Task 4 final `prisma generate` step.
- **Issue:** `EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'` — a Windows process (likely the editor's TypeScript server) held the engine DLL open.
- **Fix:** Confirmed that the Linux engine binary (`libquery_engine-linux-musl-openssl-3.0.x.so.node`) and TypeScript types (`index.d.ts`, 2751 channelPush/ChannelPush references) were generated successfully. Verified via `node -e "...new PrismaClient()..."` that all 4 channel-push delegates exist on the client. Skipped the Windows DLL refresh — Bun's runtime resolves the right engine automatically.
- **Files modified:** None.
- **Verification:** All 4 model delegates accessible from Node + Bun runtime.
- **Committed in:** N/A — runtime-only fix.

---

**Total deviations:** 2 auto-fixed (0 blocking)
**Impact on plan:** No behavioural change. The watermarkText sync is purely additive; the Windows DLL lock does not affect Linux/Bun runtime correctness.

## Issues Encountered

- Wave 0 channel-push permission seed test had 5 sibling failures in `approval-permissions.seed.test.ts` due to pre-existing `prisma.user.deleteMany` blocked by `VisitRecord_creatorId_fkey` constraint. Confirmed unrelated to Plan 32-02 (test cleanup ordering issue from earlier phases). Did NOT regress.
- Bash session cwd resets required `cd /e/webspace/oa/backend` (full path) instead of `cd backend`.

## Verification

- `bunx prisma validate` exits 0.
- `bunx prisma migrate status` reports `Database schema is up to date!` and lists 9 migrations.
- `bunx prisma migrate dev --skip-seed` applied `20260505100000_add_channel_push_v16` (no errors).
- `node -e "const c=require('@prisma/client'); const p=new c.PrismaClient(); console.log(['channelPush','channelPushAttachment','channelPushReviewAction','channelPartnerProfile'].every(k => k in p) ? 'OK_ALL_DELEGATES' : 'MISSING'); p.\$disconnect()"` → `OK_ALL_DELEGATES`.
- Wave 0 schema test (`channel-push.schema.test.ts`): 8/8 PASS, 94 expect calls.
- Wave 0 seed test (`channel-push-permissions.seed.test.ts`): 6/6 PASS, 33 expect calls.
- Combined Wave 0 schema+seed run: 14 pass / 0 fail.

## User Setup Required

None — local PostgreSQL was already running per pre-execution alignment. The migration is now permanent in the dev DB. No teardown needed.

## Next Phase Readiness

Plan 32-03 (channel-partner admin service + route) and Plan 32-04 (channel-push partner-side API) can now run. Both depend on:
- ChannelPush + ChannelPartnerProfile Prisma models ✓
- CHANNEL_PARTNER role + permission codes seeded ✓
- channel-push.constants.ts shared module ✓
- CHANNEL_PUSH_UPLOAD_DIR env var ✓ (used by 32-04 file service)

## Self-Check: PASSED

- Verified all 4 expected new Prisma model delegates exist on the runtime client.
- Verified `bunx prisma migrate status` reports up-to-date.
- Verified Wave 0 schema and seed tests now pass GREEN (14/14).
- Verified seed.ts contains all 5 channelPush:* permission rows with `module: 'channelPush'` and the CHANNEL_PARTNER role + 3-code grant.
- Verified `CHANNEL_PUSH_UPLOAD_DIR` is declared in docker-compose.yml backend service env.

---
*Phase: 32-api-rbac*
*Completed: 2026-05-05*
