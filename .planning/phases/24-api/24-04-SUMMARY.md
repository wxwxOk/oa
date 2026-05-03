---
phase: 24-api
plan: 4
subsystem: api
tags: [bun, elysia, uploads, file-safety, reimbursement, attachments]

requires:
  - phase: 24-api plan 3
    provides: Reimbursement route module, service helpers and object authorization
  - phase: 24-api plan 2
    provides: Attachment metadata model and upload storage baseline
provides:
  - Reimbursement file safety service with MIME, size, count, safe-name and path checks
  - Real attachment upload, image preview, original download and delete route handlers
  - Attachment access rechecked through reimbursement object visibility
  - Final Phase 24 focused verification evidence
affects: [24-api, 25-reimbursement-ui, 26-reimbursement-review, 27-reimbursement-export]

tech-stack:
  added: []
  patterns:
    - Bun/Web `File` APIs handle uploads without multer, formidable or busboy
    - Database stores relative attachment paths only; filesystem paths are resolved through a safety helper
    - Image preview and original download use separate response header helpers

key-files:
  created:
    - backend/src/modules/reimbursement/reimbursement-file.service.ts
  modified:
    - backend/src/modules/reimbursement/reimbursement.route.ts
    - backend/src/modules/reimbursement/reimbursement.service.ts

key-decisions:
  - "Allowed reimbursement attachment MIME types are exactly JPEG, PNG, WebP and PDF."
  - "Each attachment is limited to 10MB and each application is capped at 20 attachments."
  - "Preview is image-only; PDF/original access uses the download endpoint."
  - "Upload and delete stay draft-only through `assertCanMutateDraftReimbursement`; read access reuses object visibility."

patterns-established:
  - "Generated stored filenames use `nanoid(16)` plus a MIME-derived extension and never reuse the original basename."
  - "Preview/download headers sanitize filenames to avoid CRLF and path separator injection."

requirements-completed: [REIM-01, REIM-02, REIM-03, REIM-04, INV-01, INV-02, INV-03, INV-04, PERM-02, NFR-01, NFR-02]

duration: 35min
completed: 2026-05-03
---

# Phase 24 Plan 4: Attachment API and Verification Summary

**Local invoice attachment upload, safe image preview/download/delete handlers and Phase 24 backend-focused verification.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-03T02:59:00Z
- **Completed:** 2026-05-03T03:34:00Z
- **Tasks:** 3
- **Files modified:** 3 implementation files + planning updates

## Accomplishments

- Added reimbursement file service constants and helpers for MIME whitelist, 10MB limit, 20-file cap, safe stored names, traversal-safe path resolution and response headers.
- Wired real `POST /:id/attachments`, preview, download and delete handlers using Bun `File`/`Bun.file` APIs.
- Kept attachment upload/delete draft-only and preview/download guarded by reimbursement object visibility.
- Verified all Phase 24 focused contracts and backend build are green.

## Task Commits

No git commits were created. The repository already had unrelated uncommitted changes and `.planning/config.json` has `workflow.autoCommit: false`.

## Files Created/Modified

- `backend/src/modules/reimbursement/reimbursement-file.service.ts` - File limits, MIME mapping, safe names, path resolution, write/delete and headers.
- `backend/src/modules/reimbursement/reimbursement.route.ts` - Attachment upload, preview, download and delete handlers.
- `backend/src/modules/reimbursement/reimbursement.service.ts` - Detail serialization keeps attachment/action metadata frontend-ready without absolute paths.

## Decisions Made

- Kept attachment implementation dependency-light and aligned with Bun/Web file APIs.
- Kept filesystem safety centralized in `reimbursement-file.service.ts`; routes never concatenate absolute paths directly.
- Kept non-image previews blocked so PDF access uses explicit download behavior.

## Deviations from Plan

None - plan behavior was implemented as specified. Final full-suite verification exposed unrelated existing backend regression failures, documented below, but no Phase 24 implementation change was required for them.

## Issues Encountered

- Full backend gate `bun test && bun run build` was attempted from `backend/` and failed before build on existing non-Phase 24 approval tests, including `approval archive stats contract`, `approval archive route contract`, and `approval task route contract`. The Phase 24 focused suite and backend build both pass, so this remains a pre-existing/full-suite cleanup concern outside the reimbursement API scope.

## Verification

- `bun test src/modules/reimbursement/__tests__ src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` — passed with 25 tests, 0 failures, 146 assertions.
- `bun run build` from `backend/` — passed.
- `bunx prisma@5.22.0 validate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` — passed.
- `bunx prisma@5.22.0 generate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` — passed.
- `rg "uploads|REIMBURSEMENT_UPLOAD_DIR|oa_uploads" .gitignore docker-compose.yml` — found expected upload storage markers.
- IDE diagnostics for edited Phase 24 backend files — clean.

## User Setup Required

For runtime attachment checks, apply the Phase 24 Prisma migration and ensure `REIMBURSEMENT_UPLOAD_DIR` is writable. Docker Compose already persists `/app/uploads` via `oa_uploads`.

## Next Phase Readiness

Phase 24 backend APIs are ready for Phase 25 employee reimbursement UI. Phase 26 review actions and Phase 27 export remain intentionally out of scope.

---
*Phase: 24-api*
*Completed: 2026-05-03*
