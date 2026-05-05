---
phase: 32-api-rbac
plan: 1
subsystem: testing
tags: [bun, elysia, prisma, rbac, channel-push, partner, dedup, uploads, review-04, review-06]

requires:
  - phase: 24-api
    provides: shipped fixed-module reimbursement Wave 0 contract pattern (route/schema/file/seed)
  - phase: 23-stats
    provides: visit module list-filter and date-normalization patterns
provides:
  - Wave 0 channel-push backend contract tests (6 files)
  - Permission seed contracts for 5 channelPush:* codes + CHANNEL_PARTNER role grants
  - Prisma schema contracts for ChannelPush + ChannelPushAttachment + ChannelPushReviewAction + ChannelPartnerProfile
  - Partner-side /channel-push route + ownership + state + dedup contracts
  - Partner attachment safety contracts (MIME / size / count / safe-name / traversal / headers)
  - Partner-scoped dedup helper signature + read-only behavior + DEDUP-02 inclusivity contracts
  - Admin /admin/channel-partners route + service contracts for create/list/detail/patch/disable/enable
affects: [32-api-rbac, 33-frontend, 34-excel-import, 35-review-ui, 36-notifications]

tech-stack:
  added: []
  patterns:
    - Bun contract tests directly import future channel-push and channel-partner-admin modules
    - Schema tests assert source-text presence of enums, model fields, indexes, relations and negatives
    - Route tests assert exact prefix, route signatures, additionalProperties=false bodies and trusted-field rejection
    - File tests assert MIME whitelist, byte-size limits, safe stored names, path-traversal rejection and CRLF-sanitised headers
    - Dedup test uses bun:test mock.module to replace prisma singleton without introducing new deps
    - Service contract tests assert helper names + status-toggle literals + history-preservation negatives

key-files:
  created:
    - backend/src/modules/role/__tests__/channel-push-permissions.seed.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.schema.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.route.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push-file.service.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push-dedup.service.test.ts
    - backend/src/modules/user/__tests__/channel-partner-admin.route.test.ts
  modified: []

key-decisions:
  - "Wave 0 contract tests intentionally fail (TDD red) until 32-02 (schema/seed/migration), 32-03 (admin service+route) and 32-04 (channel-push service+route+dedup+file) implement the locked exports."
  - "Channel-push partner write contract rejects mass-assignment of channelPartnerId / recipientUserId / status — those are derived server-side from JWT identity + ChannelPartnerProfile snapshot."
  - "Admin route reuses existing user:* permission scopes; no new admin permission code is introduced. CHANNEL_PARTNER is the ONLY new role."
  - "Dedup is partner-scoped (channelPartnerId === currentUser.id) and includes CANCELLED/REJECTED rows so partners see all conflicts (DEDUP-02), bounded to 10 rows by submittedAt desc."
  - "REVIEW-06 (no VisitRecord coupling) and REVIEW-04 (internal supplemental fields exist on the data model even though the review UI ships in Phase 35) are pinned at the schema/route/source layer in Wave 0."
  - "Attachment safety contract mirrors v1.4 reimbursement-file.service.ts exactly (MIME whitelist, 10MiB/file, 20 files/push, traversal rejection, inline/attachment Content-Disposition) but uses the separate CHANNEL_PUSH_UPLOAD_DIR env var bound to the existing oa_uploads volume."

patterns-established:
  - "Channel-push contract tests directly import future module exports so impl plans cannot silently drift from the locked contract."
  - "Service-level contract tests use the source-text triple-check (route.ts + service.ts + negatives) when behaviour straddles two files."
  - "Schema source-text checks rely on the existing block(source, kind, name) helper from reimbursement.schema.test.ts, including the lazy `\\n}` boundary regex which works under CRLF line endings."

requirements-completed: []
requirements-progressed:
  - PARTNER-01
  - PARTNER-02
  - PARTNER-03
  - PUSH-01
  - PUSH-02
  - PUSH-05
  - PUSH-06
  - DEDUP-01
  - REVIEW-04
  - REVIEW-06
  - PERM-01
  - PERM-02
  - PERM-03

duration: 25min
completed: 2026-05-05
---

# Phase 32 Plan 1: Wave 0 Backend Contract Tests Summary

**Backend Wave 0 contracts for v1.6 渠道商信息推送：渠道推送权限种子、ChannelPush 数据层、渠道商提交 API、附件安全、去重助手、渠道商管理员 API。**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-05T12:50:00+08:00
- **Completed:** 2026-05-05T13:15:00+08:00
- **Tasks:** 6 (one atomic commit per test file)
- **Files modified:** 6 new test files (no source/migration changes in Plan 32-01)

## Accomplishments

- Added channel-push permission seed contracts: 5 `channelPush:*` codes locked, CHANNEL_PARTNER role default 3-grant subset, ADMIN inheritance via existing all-permissions flow, EMPLOYEE excluded.
- Added Prisma schema source contracts for `ChannelPushStatus`, `ChannelPushReviewActionType`, `ChannelPush`, `ChannelPushAttachment`, `ChannelPushReviewAction`, `ChannelPartnerProfile`, including 5 ChannelPush indexes (partner+status, recipient+status, dedup `[studentName, studentPhone]`, status, submittedAt) and full User backref set.
- Added `/channel-push` route contracts: 9 partner-side route signatures, strict `channelPushWriteBody` (8 writable fields) + 15 trusted-field rejections, dedup `duplicateHints` wiring on create/edit, ownership+state guard helper name, date-end normalisation, REVIEW-06 negative anti-mass-assignment.
- Added attachment file-service contracts: MIME whitelist (jpg/png/webp/pdf), 10 MiB / 20-file limits, `getSafeChannelPushStoredName`, `resolveSafeChannelPushPath`, env-bound default upload dir, preview/download header builders, dependency exclusion (multer/formidable/busboy).
- Added partner-scoped dedup helper contracts: `findChannelPushDuplicates({ channelPartnerId, studentName, studentPhone, excludeId? })` query shape, `submittedAt desc / take 10`, narrow `select` projection, DEDUP-02 inclusion of CANCELLED/REJECTED rows, read-only negative against any `channelPush.create/update/delete/upsert`.
- Added `/admin/channel-partners` admin route contracts: 6 lifecycle endpoints, `channelPartnerCreateBody` (5 fields) and `channelPartnerPatchBody` (3 fields, no status), reuse of `user:*` authGuards, CHANNEL_PARTNER role + ChannelPartnerProfile binding, `assertRecipientCanReceivePushes` (DISABLED + partner-role rejection), disable/enable status toggle, PARTNER-03 history-preserved negative against any `deleteMany` of channel-push history.

## Task Commits

| Commit | Task | File |
|--------|------|------|
| `40ab006` | Task 1 | `channel-push-permissions.seed.test.ts` |
| `20c4fdd` | Task 2 | `channel-push.schema.test.ts` |
| `932473a` | Task 3 | `channel-push.route.test.ts` |
| `306ccc4` | Task 4 | `channel-push-file.service.test.ts` |
| `f407081` | Task 5 | `channel-push-dedup.service.test.ts` |
| `7fc48f2` | Task 6 | `channel-partner-admin.route.test.ts` |

Each commit message follows `test(32-01): …` Conventional Commit style and includes the requirement IDs covered.

## Files Created/Modified

- `backend/src/modules/role/__tests__/channel-push-permissions.seed.test.ts` — 5 `channelPush:*` codes, CHANNEL_PARTNER 3-grant subset, module='channelPush', ADMIN inheritance, EMPLOYEE exclusion, seed-source CHANNEL_PARTNER role grant.
- `backend/src/modules/channel-push/__tests__/channel-push.schema.test.ts` — Two enums + four models + User backrefs + dedup index + REVIEW-04 internal fields + REVIEW-06 / no-Json-payload / no-ApprovalApplication negatives.
- `backend/src/modules/channel-push/__tests__/channel-push.route.test.ts` — Module prefix, 9 routes, body/query schemas, authGuard scopes, ownership helper, dateTo normalisation, mass-assignment + visit-record negatives, /mine viewOwn-only constraint.
- `backend/src/modules/channel-push/__tests__/channel-push-file.service.test.ts` — Allowed MIMEs, byte limits, safe stored names, MIME→ext map, BizError on oversize/unsupported, traversal rejection, env-bound upload dir, header builders, dependency exclusion.
- `backend/src/modules/channel-push/__tests__/channel-push-dedup.service.test.ts` — `findChannelPushDuplicates` query shape, `excludeId` toggle, sort+limit, DEDUP-02 inclusion of CANCELLED/REJECTED, read-only negatives, `mock.module` of prisma singleton.
- `backend/src/modules/user/__tests__/channel-partner-admin.route.test.ts` — `/admin/channel-partners` prefix, 6 routes, create/patch body schemas, list query, `user:*` authGuards, CHANNEL_PARTNER + ChannelPartnerProfile binding, `assertRecipientCanReceivePushes`, status toggle, PARTNER-03 history-preserved negatives.

## Decisions Made

- Kept Wave 0 tests as direct contract imports (no behaviour stubs) so the implementation plans (32-02/03/04) cannot silently drift from the locked exports.
- Kept channel-push as a fixed business module contract: explicit Prisma columns, strict TypeBox bodies and explicit ownership helpers — no generic JSON payload writes, no rebinding of partner/recipient/status from request bodies.
- Reused existing `user:*` permission scopes for the admin lifecycle endpoints. CHANNEL_PARTNER is the only new role; no new `admin:*` permission code is introduced this milestone.
- Pinned REVIEW-04 internal supplemental fields and REVIEW-06 no-VisitRecord-coupling at the **schema** layer in Wave 0 even though the review UI ships in Phase 35, to prevent later phases from coupling channel-push to the visit module.
- Mirrored v1.4 reimbursement-file.service.ts safety semantics 1:1 for attachments — same MIME allow-list, byte limits, naming and traversal protection — diverging only on the env var (`CHANNEL_PUSH_UPLOAD_DIR`) and helper namespace.
- Dedup helper kept partner-scoped (no cross-partner enumeration) and read-only; CANCELLED/REJECTED rows are deliberately included to satisfy DEDUP-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Documentation] Project CLAUDE.md `AI 仅生成/维护文档` boundary overridden**
- **Found during:** Pre-execution context alignment.
- **Issue:** `E:/webspace/oa/CLAUDE.md` declares the safety boundary `AI 仅生成 / 维护文档（CLAUDE.md、.planning/），不修改源代码或迁移文件`, which conflicts with `/gsd-execute-phase` writing real backend code.
- **Fix:** Surfaced the conflict to the user via `AskUserQuestion` before any code change; user explicitly authorised override for Phase 32. Plan 32-01 stays close to the boundary (only test files), but Plans 32-02..04 will land schema, migration, services and routes. The CLAUDE.md clause should be revisited after v1.6 ships.
- **Files modified:** None in this plan (only docs decision).
- **Verification:** User confirmed override and chose Sequential inline execution mode.
- **Committed in:** Not committed; recorded in Plan 32-01 SUMMARY only.

**2. [Rule 3 - Tooling] `gsd-sdk` not available**
- **Found during:** Workflow initialisation.
- **Issue:** `which gsd-sdk` returned not-found, so the workflow's automated `gsd-sdk query` calls (init, plan-index, state.begin-phase, roadmap.update-plan-progress, etc.) cannot run.
- **Fix:** Manually replicate the equivalent steps — discover plans from filesystem, group by `wave` frontmatter, execute Sequential inline, hand-update STATE.md and ROADMAP.md at phase close.
- **Files modified:** None in this plan; STATE.md / ROADMAP.md updates land at the end of Phase 32 verification step.
- **Verification:** All Plan 32-01 acceptance criteria still met via direct `bun test` and `rg` runs.
- **Committed in:** Not committed; recorded here.

---

**Total deviations:** 2 auto-fixed (0 blocking)
**Impact on plan:** No behavioural change to Plan 32-01 outputs. Both deviations only affect orchestration mechanics.

## Issues Encountered

- Focused Bun tests for all 6 Wave 0 files are expected RED in this plan (import-not-found / model-not-found / function-not-implemented). This is the contracted TDD red state — they go green incrementally as 32-02, 32-03 and 32-04 land.
- Bash session retained an out-of-tree CWD (`/e/webspace/oa/backend/backend`) after the first `cd backend`; switched to fully-qualified `cd /e/webspace/oa/backend` thereafter.

## Verification

- File existence: all 6 Wave 0 test files exist and are tracked.
- Acceptance grep coverage spot-checked:
  - `rg "CHANNEL_PUSH_PERMISSION_CODES|channelPush:create|channelPush:viewOwn|channelPush:cancel|channelPush:review|channelPush:viewScope" backend/src/modules/role/__tests__/channel-push-permissions.seed.test.ts` — 19 matches across 1 file.
- Focused Bun runs:
  - `bun test src/modules/role/__tests__/channel-push-permissions.seed.test.ts` — fails on `Export named 'CHANNEL_PUSH_PERMISSION_CODES' not found` (expected).
  - `bun test src/modules/channel-push/__tests__/channel-push.schema.test.ts` — 0 pass / 8 fail (expected; models not yet in schema.prisma).
  - `bun test src/modules/channel-push/__tests__/channel-push.route.test.ts` — fails on `Cannot find module '../channel-push.route'` (expected).
  - `bun test src/modules/channel-push/__tests__/channel-push-file.service.test.ts` — fails on `Cannot find module '../channel-push-file.service'` (expected).
  - `bun test src/modules/channel-push/__tests__/channel-push-dedup.service.test.ts` — fails on `Cannot find module '../channel-push-dedup.service'` (expected).
  - `bun test src/modules/user/__tests__/channel-partner-admin.route.test.ts` — fails on `Cannot find module '../channel-partner-admin.route'` (expected).
- Existing tests untouched: `bun test src/modules/reimbursement/__tests__/reimbursement.schema.test.ts` still passes 4/4.

## User Setup Required

None for Plan 32-01. The local PostgreSQL is required for Plan 32-02 Task 4 `[BLOCKING] migrate dev` (already up via `docker compose up -d postgres`).

## Next Phase Readiness

Phase 32 Wave 0 contracts are locked. Wave 1 ready to start:

- `/gsd-execute-phase 32 --plan 02` (Plan 32-02): schema + migration + seed + upload baseline.
- `/gsd-execute-phase 32 --plan 03` (Plan 32-03): channel-partner admin service + route.

Wave 2 (Plan 32-04: channel-push service + route + dedup + file) blocks on **both** Wave 1 plans because it imports CHANNEL_PARTNER role grants and ChannelPartnerProfile.primaryRecipientId.

## Self-Check: PASSED

- Verified all 6 planned test files exist and are committed.
- Verified the focused contract suite is RED for the intended missing-implementation reasons.
- Verified each task created its own atomic commit (6 commits total).
- Verified CLAUDE.md override was explicitly authorised by the user before any code change.

---
*Phase: 32-api-rbac*
*Completed: 2026-05-05*
