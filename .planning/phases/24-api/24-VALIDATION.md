---

phase: 24

slug: api

status: passed_with_known_external_failures

nyquist_compliant: true

wave_0_complete: true

implementation_complete: true

created: 2026-05-02

updated: 2026-05-03

---



# Phase 24 — Validation Strategy



> Per-phase validation contract for feedback sampling during execution.



---



## Test Infrastructure



| Property | Value |

|----------|-------|

| **Framework** | `bun:test` + Prisma CLI |

| **Config file** | `backend/package.json`, `backend/prisma/schema.prisma` |

| **Quick run command** | `cd backend && bun test src/modules/reimbursement/__tests__ src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` |

| **Full suite command** | `cd backend && bun test && bun run build` |

| **Estimated runtime** | ~60-180 seconds |



---



## Sampling Rate



- **After every task commit:** Run the focused test command for that task.

- **After every plan wave:** Run `cd backend && bun test src/modules/reimbursement/__tests__`.

- **Before `$gsd-verify-work`:** `cd backend && bun test && bun run build` must be green.

- **Max feedback latency:** 180 seconds for focused backend checks.



---



## Per-Task Verification Map



| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |

|---------|------|------|-------------|-----------|-------------------|-------------|--------|

| 24-01-01 | 01 | 0 | PERM-01/PERM-02/PERM-03 | seed contract | `cd backend && bun test src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` | ✅ | ✅ green |

| 24-01-02 | 01 | 0 | REIM-01/REIM-02/APPROVAL-01/NFR-02 | schema contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.schema.test.ts` | ✅ | ✅ green |

| 24-01-03 | 01 | 0 | REIM-03/REIM-04/INV-03/PERM-02 | route contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts` | ✅ | ✅ green |

| 24-01-04 | 01 | 0 | INV-01/INV-02/INV-03/NFR-01 | file safety contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` | ✅ | ✅ green |

| 24-02-01 | 02 | 1 | REIM-01/REIM-02/APPROVAL-01 | prisma validation | `bunx prisma@5.22.0 validate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma" && bunx prisma@5.22.0 generate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` | ✅ | ✅ green |

| 24-02-02 | 02 | 1 | PERM-01/PERM-02/PERM-03 | seed test | `cd backend && bun test src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` | ✅ | ✅ green |

| 24-02-03 | 02 | 1 | INV-01/INV-02/NFR-01 | storage config check | `rg "uploads|REIMBURSEMENT_UPLOAD_DIR|oa_uploads" .gitignore docker-compose.yml` | ✅ | ✅ green |

| 24-03-01 | 03 | 2 | REIM-01/REIM-02 | state/service test | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts` | ✅ | ✅ green |

| 24-03-02 | 03 | 2 | REIM-03/REIM-04/PERM-02/NFR-02 | route/API test | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts` | ✅ | ✅ green |

| 24-04-01 | 04 | 3 | INV-01/INV-02/NFR-01 | file service test | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` | ✅ | ✅ green |

| 24-04-02 | 04 | 3 | INV-03/PERM-02 | attachment route test | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts` | ✅ | ✅ green |

| 24-04-03 | 04 | 3 | all Phase 24 IDs | full gate | `cd backend && bun test && bun run build` | ✅ | ⚠️ existing non-Phase-24 approval test failures; Phase 24 focused suite and backend build are green |



*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*



---



## Wave 0 Requirements



- [x] `backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` — pins `reimbursement:*` permission seed and default role grants.

- [x] `backend/src/modules/reimbursement/__tests__/reimbursement.schema.test.ts` — pins Prisma model, enum, index, Decimal and audit trail contract.

- [x] `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — pins `/reimbursements` route signatures, schemas, list/detail/create/edit/submit and auth contracts.

- [x] `backend/src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` — pins upload MIME/size/count/path/filename/headers safety contract.



---



## Manual-Only Verifications



| Behavior | Requirement | Why Manual | Test Instructions |

|----------|-------------|------------|-------------------|

| Browser upload UX | UX-01/UX-02 | Phase 25 frontend scope | Verify during Phase 25 implementation. |

| Canvas handwritten signature | APPROVAL-03 | Phase 26 frontend/reviewer scope | Verify during Phase 26 implementation. |

| Excel reimbursement export UAT | EXPORT-01/EXPORT-02/EXPORT-03 | Phase 27 export scope | Verify during Phase 27 implementation. |



---



## Validation Sign-Off



- [x] All tasks have `<automated>` verify or Wave 0 dependencies

- [x] Sampling continuity: no 3 consecutive tasks without automated verify

- [x] Wave 0 covers all MISSING references

- [x] No watch-mode flags

- [x] Feedback latency < 180s for focused checks

- [x] `nyquist_compliant: true` set in frontmatter



**Approval:** approved 2026-05-02
