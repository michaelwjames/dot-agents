# Foundation Refactor (Spec #0)

**Status:** Completed

## Phases

### Phase 1: Database Layer Implementation
- [x] Install `@libsql/client` (using pnpm)
- [x] Create `backend/src/core/lib/data/turso_db.ts` (SQLite/LibSQL wrapper)
- [x] Implement `db.init()` with required tables: `sessions`, `memory`, `logs`, `jules_cache`, `cache`

### Phase 2: FileSystem Migration
- [x] Update `backend/src/core/lib/data/file_system.ts` to use `TursoDB`
- [x] Migrate `saveSession` and `loadSession` logic
- [x] Migrate `writeNote` and `readFileContent` logic
- [x] Migrate `getFileSystemIndex` logic
- [x] Remove 10-minute session rotation logic

### Phase 3: Logger Migration
- [x] Update `backend/src/core/lib/utils/logger.ts` to write to the `logs` table

### Phase 4: MakeExecutor & run_make Deprecation
- [x] Delete `Makefile` and `backend/src/core/lib/executors/make_executor.ts`
- [x] Remove `RunMakeTool` from `ToolRegistry` in `backend/src/core/lib/tools.ts`
- [x] Remove `run_make.ts` tool file

### Phase 5: New Native Tools
- [x] Create `backend/src/core/lib/tools/linear.ts` (using `@linear/sdk`)
- [x] Create `backend/src/core/lib/tools/vercel.ts` (using `axios`)
- [x] Register new tools in `ToolRegistry`

### Phase 6: Integration and Cleanup
- [x] Call `db.init()` in `backend/src/index.ts`
- [x] Update `.env.example` with new environment variables
- [x] Final verification of all refactored systems

## Errors Encountered
(None)
