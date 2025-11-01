---
spec: S38
phase: 3
title: Cache Integration & Cleanup
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 3: Cache Integration & Cleanup

## Overview

Integrate file system watchers with the frontmatter cache layer to enable automatic cache invalidation on file changes. This phase connects the watcher events from Phase 2 to the existing `FrontmatterCache` class (S40), ensuring cached frontmatter data stays synchronized with file system state. Additionally, verify proper cleanup and disposal to prevent memory leaks.

## Prerequisites

- Phase 2 completed (debounced event handlers working)
- Event handlers log file changes with timestamps
- `FrontmatterCache` class available (`vscode-extension/src/cache.ts:88`)
- Cache instance can be created and passed to watchers
- Watchers registered in `context.subscriptions` for disposal

## Tasks

### Task 1: Review FrontmatterCache API

**Objective:** Understand cache interface and invalidation mechanism

**Cache Class Location:** `vscode-extension/src/cache.ts:88-255`

**Key Methods:**
```typescript
class FrontmatterCache {
  // Get frontmatter (lazy-loading, staleness detection)
  async get(filePath: string): Promise<Frontmatter | null>

  // Invalidate cached entry (called by file watcher)
  invalidate(filePath: string): void

  // Clear all cached entries
  clear(): void

  // Get cache statistics (hits, misses, evictions, size)
  getStats(): CacheStats
}
```

**Invalidation Behavior:**
- `invalidate(filePath)` removes entry from cache (line 221-224)
- Path is normalized internally (lowercase, forward slashes)
- Safe to call even if entry doesn't exist (no-op)
- Next `get()` call will re-parse file (cache miss)

**Integration Pattern:**
```typescript
// In event handler:
const cache = /* ... get cache instance ... */;
cache.invalidate(uri.fsPath); // Remove stale entry
// Next access will re-parse file automatically
```

**Reference Documentation:**
- Cache implementation: `vscode-extension/src/cache.ts`
- Parser integration: `vscode-extension/src/parser.ts`
- Type definitions: `vscode-extension/src/types.ts`

**Verification:**
- [ ] Understand `invalidate()` method signature
- [ ] Understand path normalization (matches watcher normalization)
- [ ] Understand lazy-loading behavior (get() re-parses after invalidation)
- [ ] Understand cache statistics (CacheStats interface)

### Task 2: Create Cache Instance in `activate()` Function

**Objective:** Instantiate cache during extension activation and make it available to watchers

**Location:** `vscode-extension/src/extension.ts:193` (activate function)

**Import Statement (add at top of file):**
```typescript
import { FrontmatterCache } from './cache';
```

**Implementation (add after workspace detection, before watcher creation):**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... existing code (output channel creation, workspace detection) ...

  // Early return if workspace doesn't qualify (line 215-226)
  if (!shouldActivate) {
    registerWorkspaceChangeListener(context, outputChannel);
    outputChannel.appendLine(SEPARATOR);
    return;
  }

  // Register workspace change listener (line 228-230)
  registerWorkspaceChangeListener(context, outputChannel);

  // NEW CODE: Create frontmatter cache instance
  outputChannel.appendLine('--- Frontmatter Cache ---');
  const cache = new FrontmatterCache(1000); // maxSize=1000 (default)
  outputChannel.appendLine('✅ Cache initialized (maxSize: 1000)');
  outputChannel.appendLine('');

  // Initialize file system watchers (line 232-235)
  outputChannel.appendLine('--- File System Watchers ---');
  const watchers = createFileSystemWatchers(context, outputChannel, cache);
  outputChannel.appendLine(`📁 Watching ${watchers.length} directories for file changes`);
  outputChannel.appendLine('');

  // ... rest of function ...
}
```

**Expected Output:**
```
--- Frontmatter Cache ---
✅ Cache initialized (maxSize: 1000)

--- File System Watchers ---
   ✅ Watching: lineage/plans/**/*.md
   ✅ Watching: lineage/specs/**/*.md
📁 Watching 2 directories for file changes
```

**File Reference:** `vscode-extension/src/extension.ts:193`

**Verification:**
- [ ] Import statement added (FrontmatterCache)
- [ ] Cache created before watchers
- [ ] Cache initialized with default maxSize (1000)
- [ ] Output channel logs cache initialization
- [ ] No TypeScript compilation errors

### Task 3: Update `createFileSystemWatchers()` Signature

**Objective:** Accept cache parameter and pass to event handlers

**Location:** `vscode-extension/src/extension.ts` (createFileSystemWatchers function)

**OLD Signature:**
```typescript
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[]
```

**NEW Signature:**
```typescript
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  cache: FrontmatterCache
): vscode.FileSystemWatcher[]
```

**Update Function Documentation:**
```typescript
/**
 * Creates file system watchers for plans/ and specs/ directories.
 *
 * Iterates through all workspace folders and creates watchers for folders
 * containing plans/ or specs/ directories. Each folder gets two watchers:
 * - plans/**/*.md watcher
 * - specs/**/*.md watcher
 *
 * Watchers automatically invalidate cache on file changes/deletions.
 *
 * @param context VSCode extension context for subscription management
 * @param outputChannel Output channel for logging watcher creation
 * @param cache Frontmatter cache instance (for invalidation on file changes)
 * @returns Array of created FileSystemWatcher instances (for testing/debugging)
 */
```

**Verification:**
- [ ] Function signature updated (cache parameter added)
- [ ] JSDoc updated to mention cache invalidation
- [ ] TypeScript compiles without errors

### Task 4: Implement Cache Invalidation in Event Handlers

**Objective:** Update event handlers to call `cache.invalidate()` on file changes/deletions

**Location:** In `createFileSystemWatchers()` function (event handler definitions)

**Update `handleChange` Handler:**
```typescript
const handleChange = (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed)
  cache.invalidate(uri.fsPath);

  // Logging handled by createDebouncedHandler wrapper
};
```

**Update `handleDelete` Handler:**
```typescript
const handleDelete = (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists)
  cache.invalidate(uri.fsPath);

  // Logging handled by createDebouncedHandler wrapper
};
```

**`handleCreate` Handler (No Changes):**
```typescript
const handleCreate = (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically

  // Logging handled by createDebouncedHandler wrapper
};
```

**Rationale:**
- **FILE_CHANGED**: Invalidate cache (content changed, old data stale)
- **FILE_DELETED**: Invalidate cache (file gone, cache entry invalid)
- **FILE_CREATED**: No invalidation (file wasn't cached yet, lazy-loading handles it)

**Expected Behavior:**
1. User modifies `story-38.md`
2. Watcher detects change (after 300ms debounce)
3. Handler calls `cache.invalidate('D:\\projects\\lineage\\plans\\story-38.md')`
4. Cache removes entry (internally normalizes path)
5. Next `cache.get()` call re-parses file (cache miss → fresh data)

**Verification:**
- [ ] handleChange calls cache.invalidate()
- [ ] handleDelete calls cache.invalidate()
- [ ] handleCreate does NOT call cache.invalidate() (intentional)
- [ ] Comments explain rationale for each handler

### Task 5: Add Cache Statistics Logging

**Objective:** Periodically log cache performance stats for monitoring

**Location:** Add new function to extension.ts

**Implementation:**
```typescript
/**
 * Logs cache statistics to output channel for debugging and monitoring.
 *
 * Called periodically (e.g., every 5 minutes) or on-demand via command.
 * Provides insights into cache performance (hit rate, evictions, size).
 *
 * @param cache The frontmatter cache instance
 * @param outputChannel Output channel for logging
 */
function logCacheStats(cache: FrontmatterCache, outputChannel: vscode.OutputChannel): void {
  const stats = cache.getStats();

  outputChannel.appendLine('');
  outputChannel.appendLine('--- Cache Statistics ---');
  outputChannel.appendLine(`Hits: ${stats.hits} | Misses: ${stats.misses}`);
  outputChannel.appendLine(`Evictions: ${stats.evictions} | Current Size: ${stats.size}`);

  // Calculate hit rate if there are any requests
  const totalRequests = stats.hits + stats.misses;
  if (totalRequests > 0) {
    const hitRate = ((stats.hits / totalRequests) * 100).toFixed(1);
    outputChannel.appendLine(`Hit Rate: ${hitRate}%`);
  } else {
    outputChannel.appendLine('Hit Rate: N/A (no requests yet)');
  }

  outputChannel.appendLine('');
}
```

**Option A: Periodic Logging (Timer-Based)**
Add to `activate()` function:
```typescript
// Log cache stats every 5 minutes (optional - for development/debugging)
const statsTimer = setInterval(() => {
  logCacheStats(cache, outputChannel);
}, 5 * 60 * 1000); // 5 minutes in milliseconds

// Cleanup timer on deactivation
context.subscriptions.push({
  dispose: () => clearInterval(statsTimer)
});
```

**Option B: On-Demand Logging (Command)**
Register VSCode command:
```typescript
const showCacheStatsCommand = vscode.commands.registerCommand(
  'lineage-planning.showCacheStats',
  () => {
    logCacheStats(cache, outputChannel);
    outputChannel.show(); // Bring output channel to front
  }
);
context.subscriptions.push(showCacheStatsCommand);
```

**Recommendation:** Implement Option B (command-based) for S38. Add Option A (periodic) later if needed for production monitoring.

**Expected Output:**
```
--- Cache Statistics ---
Hits: 45 | Misses: 12
Evictions: 0 | Current Size: 12
Hit Rate: 78.9%
```

**Verification:**
- [ ] logCacheStats function implemented
- [ ] Stats command registered (Option B)
- [ ] Hit rate calculated correctly (percentage)
- [ ] Command accessible via Ctrl+Shift+P: "Show Cache Stats"

### Task 6: Test Cache Invalidation Workflow

**Objective:** Verify cache invalidation happens correctly on file changes

**Test Scenario 1: Cache Miss → Hit → Invalidation → Miss**

**Setup:**
1. Activate extension
2. Ensure cache statistics command registered

**Steps:**
1. Open Debug Console in Extension Development Host
2. Programmatically access cache (via debug console or temporary test command):
   ```typescript
   // In activate() function, add temporary test command:
   const testCacheCommand = vscode.commands.registerCommand(
     'lineage-planning.testCache',
     async () => {
       const testFile = path.join(
         vscode.workspace.workspaceFolders![0].uri.fsPath,
         'plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-38-file-system-watcher.md'
       );

       outputChannel.appendLine('--- Cache Test ---');

       // First access (cache miss)
       const result1 = await cache.get(testFile);
       outputChannel.appendLine(`First access: ${result1 ? 'SUCCESS' : 'FAILED'}`);
       logCacheStats(cache, outputChannel);

       // Second access (cache hit)
       const result2 = await cache.get(testFile);
       outputChannel.appendLine(`Second access: ${result2 ? 'SUCCESS' : 'FAILED'}`);
       logCacheStats(cache, outputChannel);

       // Modify file externally, then access again
       outputChannel.appendLine('Now modify the file and run command again...');
     }
   );
   context.subscriptions.push(testCacheCommand);
   ```

3. Run command: `Lineage Planning: Test Cache` (first time)
4. Expected output:
   ```
   --- Cache Test ---
   First access: SUCCESS
   --- Cache Statistics ---
   Hits: 0 | Misses: 1

   Second access: SUCCESS
   --- Cache Statistics ---
   Hits: 1 | Misses: 1
   Hit Rate: 50.0%
   ```

5. Modify file externally (edit in VSCode, save)
6. Wait for watcher log: `[2:45:30 PM] FILE_CHANGED: plans/.../story-38-file-system-watcher.md`
7. Run command again: `Lineage Planning: Test Cache`
8. Expected output:
   ```
   --- Cache Test ---
   First access: SUCCESS
   --- Cache Statistics ---
   Hits: 1 | Misses: 2  (cache miss due to invalidation)
   Hit Rate: 33.3%

   Second access: SUCCESS
   --- Cache Statistics ---
   Hits: 2 | Misses: 2  (cache hit)
   Hit Rate: 50.0%
   ```

**Verification:**
- [ ] First access is cache miss (file not cached)
- [ ] Second access is cache hit (data cached from first access)
- [ ] File modification triggers watcher event (FILE_CHANGED log)
- [ ] Next access after modification is cache miss (invalidation worked)
- [ ] Cache statistics accurate (hits/misses reflect reality)

**Test Scenario 2: File Deletion Cache Invalidation**

**Steps:**
1. Create test file: `plans/cache-delete-test.md` with valid frontmatter
2. Access file via cache.get() (should cache it)
3. Delete file in VSCode
4. Verify watcher logs: `[...] FILE_DELETED: plans/cache-delete-test.md`
5. Try to access file via cache.get() again
6. Expected: Returns null (file doesn't exist, cache was invalidated)
7. Check cache stats: Size should decrease by 1 (entry removed)

**Verification:**
- [ ] File deletion triggers watcher event
- [ ] Cache invalidated on delete (entry removed)
- [ ] Subsequent access returns null (file gone)
- [ ] Cache size decreases (entry removed)

### Task 7: Test Multi-Root Workspace Cache Behavior

**Objective:** Verify cache works correctly with multiple workspace folders

**Test Scenario: Independent Caches per Folder**

**Setup:**
1. Create multi-root workspace:
   - Folder 1: `D:\projects\lineage` (has plans/ and specs/)
   - Folder 2: `D:\projects\other-project` (has plans/)
2. Create test files in both folders:
   - `lineage/plans/test-lineage.md`
   - `other-project/plans/test-other.md`

**Steps:**
1. Activate extension (watchers created for both folders)
2. Access both files via cache (cache both)
3. Modify `test-lineage.md`
4. Verify: Only lineage file's cache invalidated (not other-project)
5. Check cache stats: 1 hit, 2 misses (one invalidation)

**Expected Behavior:**
- Cache is global (single instance)
- Watchers are per-folder (multiple instances)
- Invalidation only affects specific file (not whole cache)
- Path normalization ensures correct entry invalidated

**Verification:**
- [ ] Multi-root workspace activates correctly (watchers for both folders)
- [ ] Cache stores entries for both folders
- [ ] Invalidation only affects specific file (not all files)
- [ ] No cross-folder interference

### Task 8: Verify Watcher Disposal and Cleanup

**Objective:** Ensure watchers and timers are properly disposed on extension deactivation

**Test Scenario 1: Extension Reload**

**Steps:**
1. Activate extension (watchers and cache created)
2. Modify test file (trigger watcher event, cache invalidation)
3. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
4. Wait for extension to reactivate
5. Check output channel for new activation log
6. Modify test file again
7. Verify: Single event log (no duplicates from old watchers)

**Expected Behavior:**
- Old watchers disposed on deactivation
- New watchers created on reactivation
- No orphaned event handlers (would cause duplicate logs)

**Verification:**
- [ ] Extension reloads without errors
- [ ] No duplicate event logs (old watchers disposed)
- [ ] New watchers functional (events logged)

**Test Scenario 2: Timer Cleanup**

**Steps:**
1. Rapidly modify file multiple times (create debounce timers)
2. Immediately reload window (before timers fire)
3. Wait 500ms after reload
4. Verify: No late event logs (timers cleared on disposal)
5. Check Debug Console: No errors about disposed watchers

**Expected Behavior:**
- Pending timers cancelled on disposal
- No timer callbacks executed after deactivation
- No errors about disposed objects

**Verification:**
- [ ] No late event logs after reload (timers cleaned up)
- [ ] No errors in Debug Console
- [ ] No memory leaks (timers garbage collected)

**Test Scenario 3: Memory Leak Check**

**Steps:**
1. Activate extension
2. Modify 100 files rapidly (create many timers)
3. Wait for all events to process (timers fire)
4. Run cache stats command
5. Verify: Timer map empty (check via debug inspection)
6. Reload window
7. Check Task Manager: VSCode memory usage stable (no continuous increase)

**Expected Behavior:**
- Timer map clears after processing (no orphaned timers)
- Watchers dispose cleanly (no file handle leaks)
- Memory usage stable across reloads

**Verification:**
- [ ] Timer map empty after processing (no orphaned timers)
- [ ] Memory usage stable (no leaks)
- [ ] File handle count stable (no orphaned watchers)

### Task 9: Update `deactivate()` Function

**Objective:** Add explicit cleanup logic for cache and timers (belt-and-suspenders)

**Location:** `vscode-extension/src/extension.ts:251` (deactivate function)

**Implementation:**
```typescript
export function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine('');
    outputChannel.appendLine('👋 Extension deactivating...');

    // Cache is automatically garbage collected (no explicit disposal needed)
    // Watchers are automatically disposed via context.subscriptions
    // Timers are automatically cleared when watchers dispose

    outputChannel.appendLine('✅ Cleanup complete');
    outputChannel.dispose();
  }

  console.log('Lineage Planning extension deactivated');
}
```

**Note:** Explicit cleanup not required (VSCode handles it via subscriptions), but documenting the cleanup behavior is useful.

**Alternative (Explicit Cleanup):**
If you want explicit cache clearing for debugging:
```typescript
// In activate() function, store cache in module-level variable:
let cacheInstance: FrontmatterCache | undefined;

export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...
  cacheInstance = new FrontmatterCache(1000);
  // ... rest of activation ...
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine('👋 Extension deactivating...');

    // Clear cache explicitly (for debugging)
    if (cacheInstance) {
      const stats = cacheInstance.getStats();
      outputChannel.appendLine(`📊 Final cache stats: ${stats.hits} hits, ${stats.misses} misses`);
      cacheInstance.clear();
      cacheInstance = undefined;
    }

    outputChannel.appendLine('✅ Cleanup complete');
    outputChannel.dispose();
  }

  console.log('Lineage Planning extension deactivated');
}
```

**Recommendation:** Use implicit cleanup (first version) for S38. Add explicit cleanup (second version) if memory profiling reveals issues.

**Verification:**
- [ ] Deactivate function logs cleanup message
- [ ] No errors during deactivation
- [ ] Cache cleared (if using explicit cleanup)

## Completion Criteria

- [ ] Cache instance created in `activate()` function
- [ ] Cache passed to `createFileSystemWatchers()` function
- [ ] Event handlers call `cache.invalidate()` on changes/deletions
- [ ] Cache statistics logging implemented (command or periodic)
- [ ] Cache invalidation tested (miss → hit → invalidation → miss)
- [ ] Multi-root workspace cache behavior verified
- [ ] Watcher disposal verified (no duplicate events after reload)
- [ ] Timer cleanup verified (no late events after deactivation)
- [ ] Memory leak check passed (stable memory usage)
- [ ] Deactivate function updated (cleanup logged)
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in Debug Console

## Final Testing Checklist

**Acceptance Criteria from Story S38:**
- [ ] FileSystemWatcher created for `plans/**/*.md` and `specs/**/*.md` glob patterns
- [ ] Watcher detects file creation events
- [ ] Watcher detects file modification events
- [ ] Watcher detects file deletion events
- [ ] File change events are debounced (300ms default)
- [ ] Watcher handles Windows paths without errors
- [ ] Watcher is properly disposed when extension deactivates
- [ ] Events logged to output channel for debugging
- [ ] Watcher respects `.gitignore` patterns (VSCode default behavior)

**Additional Phase 3 Criteria:**
- [ ] Cache invalidates on file changes
- [ ] Cache invalidates on file deletions
- [ ] Cache does NOT invalidate on file creations (intentional)
- [ ] Cache statistics accurate and accessible
- [ ] Multi-root workspace support verified
- [ ] No memory leaks (watchers, timers, cache)

## Next Steps After S38 Completion

**Story Status Update:**
1. Mark S38 as "Completed" in `plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-38-file-system-watcher.md`
2. Update frontmatter: `status: Completed`, `updated: 2025-10-13`

**Git Commit:**
```bash
git add vscode-extension/src/extension.ts
git commit -m "FEAT: File system watcher for plans/specs (S38)

- Created FileSystemWatcher for plans/**/*.md and specs/**/*.md
- Implemented debouncing (300ms) to prevent excessive processing
- Integrated with FrontmatterCache for automatic invalidation
- Multi-root workspace support with per-folder watchers
- Proper disposal and cleanup on extension deactivation

Acceptance Criteria:
✅ Detects file creation, modification, deletion
✅ Events debounced (300ms delay)
✅ Windows path handling verified
✅ Proper disposal (no memory leaks)
✅ Detailed logging to output channel
✅ Respects .gitignore patterns

Integration:
- S37: Workspace activation logic (dependency)
- S39: YAML parser (used by cache)
- S40: Cache layer (invalidation on file changes)

Next Stories:
- F12: Planning status visualization (depends on S38)
- F13: Spec phase progress (depends on S38)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Unblock Dependent Features:**
- **F12 (Planning Status Visualization)**: Can now subscribe to file change events
- **F13 (Spec Phase Progress)**: Can now subscribe to file change events

**Feature Integration Pattern:**
Both F12 and F13 will follow this pattern:
1. Subscribe to file change events (via watcher or cache)
2. Call `cache.get(filePath)` to retrieve updated frontmatter
3. Update UI decorations based on new data
4. Use debounced events to prevent UI flicker

**Post-Implementation Review:**
- Run all test scenarios (Phases 1-3)
- Verify performance benchmarks met (< 100ms activation, < 50ms event processing)
- Check memory usage (< 10MB overhead)
- Review code for TODOs or cleanup items
- Update documentation if behavior differs from spec

**S38 Implementation Complete! 🎉**
