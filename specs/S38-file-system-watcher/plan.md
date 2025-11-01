---
spec: S38
title: File System Watcher
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-13
updated: 2025-10-13
---

# S38 - File System Watcher

## Implementation Strategy

Implement real-time file monitoring for `plans/**/*.md` and `specs/**/*.md` files using VSCode's FileSystemWatcher API. The watcher will detect file changes, creations, and deletions to trigger cache invalidation and provide the foundation for future UI visualization features (F12, F13).

The implementation follows a three-phase approach:
1. **Core FileSystemWatcher Setup** - Create watchers with proper multi-root workspace support
2. **Event Handlers with Debouncing** - Implement debounced event processing with logging
3. **Cache Integration & Cleanup** - Connect to cache invalidation and ensure proper disposal

## Architecture Decisions

### FileSystemWatcher API Usage
**Decision: Use `vscode.workspace.createFileSystemWatcher` with `RelativePattern`**
- VSCode's native file watching API (optimal performance)
- `RelativePattern` provides multi-root workspace support automatically
- Glob pattern `**/*.md` efficiently targets only markdown files
- Respects `.gitignore` patterns by default (VSCode behavior)
- Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher

**Pattern Structure:**
```typescript
new vscode.RelativePattern(workspaceFolder, 'plans/**/*.md')
```
- First argument: Workspace folder URI (provides base path)
- Second argument: Glob pattern relative to folder
- Result: Windows-safe paths (`D:\projects\lineage\plans\story-38.md`)

### Multi-Root Workspace Handling
**Decision: Create separate watcher instances per workspace folder**
- Iterate through `vscode.workspace.workspaceFolders`
- Create plans/ and specs/ watchers for each folder with qualifying directories
- Use existing `shouldActivateExtension()` logic from S37 to filter folders
- Each watcher is independent (isolation between folders)

**Rationale:**
- Allows precise control over watched directories
- Prevents cross-workspace interference
- Leverages existing workspace detection logic (DRY principle)
- Easier disposal management (one subscription per watcher)

### Debouncing Strategy
**Decision: Map-based timer storage with 300ms default delay**
```typescript
const changeTimers = new Map<string, NodeJS.Timeout>();
```
- Key: Normalized file path (lowercase, forward slashes)
- Value: Active timeout ID
- Clear existing timer on new event for same file
- Process event only after 300ms of silence

**Rationale:**
- Prevents excessive processing during rapid saves (editor auto-save)
- 300ms is standard debounce delay (balances responsiveness vs efficiency)
- Map allows per-file debouncing (multiple files can process concurrently)
- Timer cleanup prevents memory leaks

**Alternative Considered:** Global debounce (single timer for all files)
- Rejected: Would delay unrelated file changes unnecessarily
- Per-file approach allows concurrent processing of different files

### Event Handler Responsibilities
**Phase 2 Scope (This Story):**
1. Log event to output channel (file path, event type, timestamp)
2. Emit simple notification structure (foundation for S40 cache invalidation)
3. NO file parsing (S39 parser already exists separately)
4. NO cache invalidation yet (implemented in Phase 3)

**Logging Format:**
```
[14:23:45] FILE_CREATED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-38-file-system-watcher.md
[14:23:47] FILE_CHANGED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-38-file-system-watcher.md (debounced)
[14:24:12] FILE_DELETED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-old.md
```

### Cache Integration Strategy
**Decision: Direct cache invalidation on file events**
- Phase 3 integrates existing `FrontmatterCache` class (src/cache.ts:88)
- File change/delete → call `cache.invalidate(filePath)`
- No cache update on create (cache is lazy-loading via `get()`)
- Cache handles path normalization internally (Windows-safe)

**Integration Point:**
- Extension activation creates cache instance
- Watchers reference cache instance from parent scope
- Event handlers call `cache.invalidate()` directly (simple, efficient)

### Disposal Management
**Decision: Register all watchers in `context.subscriptions`**
```typescript
context.subscriptions.push(plansWatcher, specsWatcher, ...changeTimers);
```
- VSCode automatically disposes subscriptions on deactivation
- Ensures no orphaned watchers or timers
- Follows existing extension.ts pattern (line 13, 178, 196)

**Timer Cleanup:**
- Clear individual timers when processing events (immediate cleanup)
- No global timer disposal needed (timers self-clean after firing)

## Key Integration Points

### 1. Extension Activation (`vscode-extension/src/extension.ts:193`)
- Modify `activate()` function after workspace detection (line 208)
- Add watcher initialization after `shouldActivateExtension()` check (line 215)
- Create watchers before "features initialized" log (line 233)
- Output channel already exists (`outputChannel` variable, line 9)

**Insertion Point:**
```typescript
// After line 230: registerWorkspaceChangeListener(context, outputChannel);

// NEW CODE HERE:
// Initialize file system watchers for plans/ and specs/
const watchers = createFileSystemWatchers(context, outputChannel);
outputChannel.appendLine(`📁 Watching ${watchers.length} directories for file changes`);
outputChannel.appendLine('');
```

### 2. Cache Class (`vscode-extension/src/cache.ts:88`)
- Import `FrontmatterCache` class
- Create cache instance in `activate()` function
- Pass cache reference to watcher initialization
- Use `cache.invalidate(filePath)` in event handlers (line 221)

**Cache Instance Creation:**
```typescript
// In activate() function after workspace detection
const cache = new FrontmatterCache(1000); // maxSize=1000 (default)
// Pass cache to watcher creation function
const watchers = createFileSystemWatchers(context, outputChannel, cache);
```

### 3. Types Module (`vscode-extension/src/types.ts`)
- No changes needed for Phase 1-2
- Phase 3 may add event types if needed (TBD during implementation)

### 4. Parser Module (`vscode-extension/src/parser.ts`)
- No direct dependency (parser is used by cache, not watcher)
- Watchers trigger cache invalidation → cache re-parses on next `get()` call

## Risk Assessment

### Low Risks (Mitigated)

**Windows Path Handling:**
- Risk: Backslash vs forward slash inconsistency
- Mitigation: `RelativePattern` normalizes paths automatically (VSCode API)
- Additional safety: Cache `normalizePath()` function handles both formats (cache.ts:50)

**File Renames:**
- Risk: VSCode reports renames as DELETE + CREATE (may cause confusion)
- Mitigation: Document this behavior in event handler comments
- Impact: Cache invalidation works correctly (delete invalidates, create triggers re-parse)

**Rapid Saves/Auto-Save:**
- Risk: Multiple events for single user action
- Mitigation: 300ms debouncing prevents excessive processing
- Tested behavior: VSCode's auto-save typically triggers 1-2 events per save

### Medium Risks (Monitoring Required)

**Memory Usage with Large Workspaces:**
- Risk: Thousands of markdown files could overwhelm cache
- Mitigation: LRU eviction with maxSize=1000 (cache.ts:93)
- Monitoring: Phase 3 adds cache stats logging (hits/misses/evictions)
- Typical workspace: Lineage has ~50 plan/spec files (well under limit)

**Watcher Performance:**
- Risk: File system watchers have OS-level overhead
- Mitigation: Narrow glob patterns (`**/*.md` not `**/*`)
- VSCode optimization: Native file watching (efficient implementation)
- Expected overhead: Negligible for < 1000 files

**Debounce Timer Accumulation:**
- Risk: Timers not cleaned up properly (memory leak)
- Mitigation: Clear timer before setting new one (line 69 in story description)
- Delete timer entry after processing (line 75 in story description)
- Map size bounded by number of unique files with pending changes (typically < 10)

### No High Risks Identified

Standard VSCode API patterns with well-tested debouncing strategy.

## Codebase Analysis Summary

### Existing Files to Modify

**1. `vscode-extension/src/extension.ts` (268 lines)**
- Current state: Workspace activation logic complete (S37)
- Modifications:
  - Add `createFileSystemWatchers()` function (~80 lines)
  - Add `createDebouncedHandler()` function (~40 lines)
  - Initialize watchers in `activate()` function (~5 lines)
  - Import cache module (~1 line)
- Estimated changes: +126 lines total
- Insertion point: After line 230 (workspace change listener registration)

**2. No other file modifications required**
- Parser (S39) already complete
- Cache (S40) already complete
- Types module stable (no new types needed yet)

### New Files to Create

**None.** All functionality integrates into existing `extension.ts`.

### External Dependencies

**No new dependencies required.**
- Uses existing imports:
  - `vscode.workspace.createFileSystemWatcher` (VSCode API)
  - `vscode.RelativePattern` (VSCode API)
  - `vscode.Uri` (VSCode API)
  - Node.js `path` module (already imported, line 3)
- Uses existing cache module (`src/cache.ts`)
- Uses existing output channel (`outputChannel` variable)

### VSCode APIs Used

**1. `vscode.workspace.createFileSystemWatcher(pattern)`**
- Type: `(pattern: GlobPattern | RelativePattern) => FileSystemWatcher`
- Returns: Disposable file system watcher
- Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher

**2. `vscode.RelativePattern`**
- Constructor: `new RelativePattern(base: WorkspaceFolder | Uri | string, pattern: string)`
- Purpose: Multi-root workspace support (base path + relative glob)
- Reference: https://code.visualstudio.com/api/references/vscode-api#RelativePattern

**3. `FileSystemWatcher` Event Handlers**
- `onDidCreate(listener: (uri: Uri) => any)` - File created
- `onDidChange(listener: (uri: Uri) => any)` - File modified
- `onDidDelete(listener: (uri: Uri) => any)` - File deleted
- All return `Disposable` for subscription management
- Reference: https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher

**4. `vscode.Uri.fsPath` Property**
- Type: `string`
- Converts VSCode URI to native file system path
- Example: `vscode.Uri.file('D:\\projects\\lineage\\plans\\story-38.md').fsPath` → `'D:\\projects\\lineage\\plans\\story-38.md'`
- Already used in extension.ts (line 34, 77, etc.)

### Project Context

**Workspace Structure:**
```
D:\projects\lineage\
├── plans\
│   └── epic-03-vscode-planning-extension\
│       └── feature-11-extension-infrastructure\
│           ├── story-36-extension-project-scaffold.md
│           ├── story-37-workspace-activation-logic.md
│           ├── story-38-file-system-watcher.md (THIS STORY)
│           ├── story-39-yaml-frontmatter-parser.md
│           └── story-40-frontmatter-cache-layer.md
├── specs\
│   ├── S37-workspace-activation-logic\ (COMPLETED)
│   └── S38-file-system-watcher\ (THIS SPEC)
└── vscode-extension\
    └── src\
        ├── extension.ts (MAIN FILE TO MODIFY)
        ├── types.ts (NO CHANGES)
        ├── parser.ts (COMPLETE - S39)
        └── cache.ts (COMPLETE - S40)
```

**Story Dependencies:**
- **S37** (Workspace Activation Logic) - ✅ COMPLETED (dependency satisfied)
- **S39** (YAML Parser) - ✅ COMPLETED (parser.ts exists)
- **S40** (Cache Layer) - ✅ COMPLETED (cache.ts exists)

**Operating System:** Windows (MINGW64_NT-10.0-26100)
- Path handling: Critical (backslashes vs forward slashes)
- Case sensitivity: Windows is case-insensitive (cache normalizes to lowercase)
- Node.js version: v22.18.0 (compatible with all APIs used)

### Existing Code Patterns to Follow

**1. Output Channel Logging Style:**
```typescript
// Existing pattern (extension.ts:16-30, 59-106)
outputChannel.appendLine('✅ Success message');
outputChannel.appendLine('ℹ️  Info message');
outputChannel.appendLine('🔍 Debug/analysis message');
outputChannel.appendLine(SEPARATOR); // '='.repeat(60)
```

**2. Subscription Management:**
```typescript
// Existing pattern (extension.ts:13, 178, 196, 222)
context.subscriptions.push(disposable1, disposable2, ...);
// VSCode automatically disposes all on deactivation
```

**3. Workspace Folder Iteration:**
```typescript
// Existing pattern (extension.ts:33-42)
for (const folder of vscode.workspace.workspaceFolders || []) {
  const folderPath = folder.uri.fsPath;
  // Check plans/ and specs/ existence
}
```

**4. Path Construction:**
```typescript
// Existing pattern (extension.ts:35-36)
const plansPath = path.join(folderPath, 'plans');
const specsPath = path.join(folderPath, 'specs');
// NEVER use string concatenation for paths
```

**5. Timestamp Formatting:**
```typescript
// Existing pattern (extension.ts:124, 202)
new Date().toLocaleString() // "10/13/2025, 2:45:30 PM"
```

## Phase Overview

### Phase 1: Core FileSystemWatcher Setup
**Goal:** Create file system watchers for all qualifying workspace folders

**Key Tasks:**
- Implement `createFileSystemWatchers()` function
- Create separate watchers for plans/ and specs/ directories
- Use `RelativePattern` for multi-root workspace support
- Register watchers in `context.subscriptions` for disposal
- Add basic "watcher created" logging

**Deliverable:** Watchers created and registered, ready for event handlers

**Estimated Implementation Time:** 30 minutes

**Testing:** Launch Extension Development Host, verify watchers created (check output channel)

### Phase 2: Event Handlers with Debouncing
**Goal:** Implement debounced event processing with detailed logging

**Key Tasks:**
- Create debounce timer map (`Map<string, NodeJS.Timeout>`)
- Implement `createDebouncedHandler()` wrapper function
- Add event handlers for create/change/delete events
- Implement 300ms debounce logic (clear old timer, set new timer)
- Add detailed logging (timestamp, event type, file path)
- Clean up timers after processing

**Deliverable:** File events logged to output channel with debouncing

**Estimated Implementation Time:** 45 minutes

**Testing:** Create/modify/delete test files in plans/ and specs/, verify debounced logging

### Phase 3: Cache Integration & Cleanup
**Goal:** Connect watchers to cache invalidation and ensure proper cleanup

**Key Tasks:**
- Create `FrontmatterCache` instance in `activate()`
- Pass cache reference to watcher creation
- Call `cache.invalidate(filePath)` on change/delete events
- Verify disposal on extension deactivation
- Add cache statistics logging (hits/misses/evictions)
- Test multi-root workspace scenarios

**Deliverable:** Cache invalidates on file changes, watchers dispose cleanly

**Estimated Implementation Time:** 30 minutes

**Testing:** Modify files and verify cache invalidation (check cache stats), reload extension and verify no orphaned watchers

## Testing Strategy

### Manual Testing Workflow

**Phase 1 - Watcher Creation:**
1. Open Lineage project in VSCode
2. Package and install extension locally: `cd vscode-extension && npm run package && code --install-extension cascade-0.1.0.vsix --force`
3. Reload window (Ctrl+Shift+P → "Developer: Reload Window")
4. Open Output Channel ("Cascade" or "Lineage Planning")
5. Verify log message: "📁 Watching N directories for file changes"
6. Verify no errors in Output Channel

**Phase 2 - Event Handling:**
1. Create new file: `plans/test-story.md`
2. Verify log: `[HH:MM:SS] FILE_CREATED: plans/test-story.md`
3. Edit file multiple times rapidly (auto-save on)
4. Verify log: Single `FILE_CHANGED` message (debounced)
5. Delete file
6. Verify log: `[HH:MM:SS] FILE_DELETED: plans/test-story.md`
7. Repeat for specs/ directory

**Phase 3 - Cache Integration:**
1. Create test file with valid frontmatter
2. Programmatically call `cache.get(filePath)` (via debug console)
3. Verify cache miss (first load)
4. Call `cache.get(filePath)` again
5. Verify cache hit (data cached)
6. Modify file externally (text editor)
7. Verify watcher logs FILE_CHANGED event
8. Call `cache.get(filePath)` again
9. Verify cache miss (invalidation worked)
10. Check `cache.getStats()` for accurate hit/miss counts

### Edge Case Testing

**File Renames:**
1. Rename `story-38.md` to `story-38-renamed.md`
2. Expected: DELETE event for old path + CREATE event for new path
3. Verify: Cache invalidated for old path, new path not cached yet

**Rapid Bulk Changes:**
1. Use Find/Replace across multiple files
2. Expected: Multiple debounced events (one per file)
3. Verify: Each file processed once after 300ms silence
4. Check: No dropped events (all files logged)

**Multi-Root Workspace:**
1. Open workspace with multiple folders
2. Add folder without plans/specs
3. Verify: Watcher NOT created for non-qualifying folder
4. Add folder WITH plans/specs
5. Verify: Watcher created (check workspace change handler logs)

**Watcher Disposal:**
1. Activate extension
2. Verify watchers created (output channel log)
3. Reload window (`Ctrl+Shift+P` → "Reload Window")
4. Verify: No orphaned watchers (check Task Manager for file handles)
5. Verify: No errors in Debug Console about disposed watchers

**Windows Path Handling:**
1. Create file in nested directory: `plans/epic-03/feature-11/story-99.md`
2. Verify: Path logged with backslashes (native Windows format)
3. Verify: Cache normalization works (lowercase, forward slashes internally)

**Gitignore Patterns:**
1. Create `.gitignore` with pattern: `plans/ignored/**`
2. Create file: `plans/ignored/test.md`
3. Expected: No watcher event (VSCode respects .gitignore by default)
4. Verify: No log entry for ignored file

### Validation Checklist

- [ ] Watchers created for all qualifying workspace folders
- [ ] File creation events logged with correct path
- [ ] File modification events logged with correct path (debounced)
- [ ] File deletion events logged with correct path
- [ ] Debouncing prevents multiple events for rapid saves (< 400ms apart)
- [ ] Windows paths handled correctly (backslashes in logs)
- [ ] Multi-root workspace: Each folder's watchers independent
- [ ] Cache invalidation triggered on change/delete events
- [ ] Cache statistics accurate (hits/misses reflect reality)
- [ ] Watchers disposed cleanly on extension deactivation (no orphaned resources)
- [ ] No errors in Debug Console during any operation
- [ ] `.gitignore` patterns respected (ignored files don't trigger events)

### Performance Validation

**Benchmarks:**
- [ ] Watcher initialization: < 100ms for typical workspace (50 files)
- [ ] Event processing: < 50ms from file save to log entry (debounce excluded)
- [ ] Cache invalidation: < 10ms per file
- [ ] Memory usage: < 10MB increase (baseline + cache + watchers)

**Load Testing:**
1. Create 1000 dummy markdown files in plans/
2. Verify: Extension activates in < 500ms
3. Bulk modify 100 files simultaneously
4. Verify: All events processed, no crashes, no memory leaks

## Next Steps After Completion

Once S38 is complete, the extension will have real-time file monitoring. The next features can proceed:

**Immediate Next Steps:**
- **F12 - Planning Status Visualization** (DEPENDS ON S38)
  - Subscribe to file change events
  - Update tree view decorations on file changes
  - Show status icons inline in Explorer

- **F13 - Spec Phase Progress** (DEPENDS ON S38)
  - Subscribe to file change events
  - Update progress bars on spec phase completion
  - Show completion percentage decorations

**Integration Requirements:**
Both F12 and F13 will:
1. Import watcher event emitter (to be added in Phase 2)
2. Register event listeners in `activate()` function
3. Call cache to retrieve updated frontmatter on events
4. Update UI decorations based on new data

**Post-Implementation Verification:**
1. Run manual testing checklist (all phases)
2. Verify edge case handling (all scenarios)
3. Performance validation (benchmarks)
4. Mark S38 story as "Completed" in plans/
5. Commit changes with message: "FEAT: File system watcher for plans/specs (S38)"
6. Ready to proceed with F12/F13 implementation

## Open Questions

**Q1: Should we emit custom events for F12/F13 integration?**
- Option A: Direct callback registration (simple, tightly coupled)
- Option B: VSCode Event API (decoupled, more complex)
- **Recommendation:** Start with Option A (Phase 2), refactor to Option B if F12/F13 require it

**Q2: Should debounce delay be configurable?**
- Current: Hardcoded 300ms
- Alternative: VSCode setting (`lineagePlanning.fileWatcherDebounce`)
- **Recommendation:** Hardcode for S38, make configurable if users request it

**Q3: Should we handle file renames specially?**
- Current: DELETE + CREATE (VSCode default behavior)
- Alternative: Detect DELETE+CREATE pairs and emit RENAME event
- **Recommendation:** Use default behavior (simpler), document in code comments

**These questions will be resolved during implementation based on actual usage patterns.**
