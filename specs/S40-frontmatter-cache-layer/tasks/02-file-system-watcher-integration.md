---
spec: S40
phase: 2
title: FileSystemWatcher Integration
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-13
---

# Phase 2: FileSystemWatcher Integration

## Overview

Integrate the FrontmatterCache with the FileSystemWatcher (S38) to automatically invalidate cache entries when files change or are deleted. This phase ensures cache freshness by responding to file system events in real-time, preventing stale data from being served to visualization features.

**IMPORTANT**: This phase has a hard dependency on S38 (FileSystemWatcher). S38 must be completed before starting Phase 2. If S38 is not yet implemented, proceed to Phase 3 (LRU Eviction & Statistics) instead.

## Prerequisites

- ❌ **S38 (FileSystemWatcher) must be completed** - Status: Not Started
- ✅ Phase 1 (Core Cache Implementation) completed
- ✅ FrontmatterCache class available in `vscode-extension/src/cache.ts`
- ✅ Extension activate() function in `vscode-extension/src/extension.ts`

**Blocker**: Cannot start until S38 is implemented. S38 creates the FileSystemWatcher that monitors plans/ and specs/ directories for changes.

## Tasks

### Task 1: Wait for S38 Completion

**Goal**: Ensure FileSystemWatcher is implemented and functional

**Verification Steps**:
1. Check S38 story status in `plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-38-file-system-watcher.md`
2. Verify status field is "Completed" or "In Progress" (with spec created)
3. Confirm watcher is initialized in extension.ts activate() function
4. Verify watcher exports event handlers or provides API for callbacks

**Expected S38 Deliverables** (based on S38 story):
- FileSystemWatcher created for `plans/**/*.md` and `specs/**/*.md`
- Event handlers: onDidCreate, onDidChange, onDidDelete
- Debouncing implemented (300ms default)
- Watcher registered in extension context subscriptions

**If S38 Not Complete**:
- Document this blocker in Phase 2 status
- Recommend completing S38 next
- Proceed to Phase 3 (LRU Eviction) which has no dependencies
- Return to Phase 2 after S38 completion

**References**:
- S38 story: `plans/.../story-38-file-system-watcher.md`
- S38 acceptance criteria: Lines 19-29 of S38 story

### Task 2: Initialize Cache in extension.ts activate()

**Goal**: Create FrontmatterCache instance when extension activates

**Location**: `vscode-extension/src/extension.ts:193-241` (activate function)

**Implementation**:
```typescript
// Add import at top of file
import { FrontmatterCache } from './cache';

// Add after output channel creation, before workspace detection
let frontmatterCache: FrontmatterCache;

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging (existing code)
  outputChannel = vscode.window.createOutputChannel('Lineage Planning');
  context.subscriptions.push(outputChannel);

  // Log activation header (existing code)
  outputChannel.appendLine(SEPARATOR);
  outputChannel.appendLine('Lineage Planning & Spec Status Extension');
  // ... existing logging ...

  // Workspace detection: Check if current workspace qualifies (existing code)
  const shouldActivate = shouldActivateExtension();
  outputChannel.appendLine('--- Workspace Detection ---');
  logWorkspaceDetection(outputChannel);
  outputChannel.appendLine('');

  // Early return if workspace doesn't qualify (existing code)
  if (!shouldActivate) {
    outputChannel.appendLine('⏸️  Extension will not initialize features');
    // ... existing early return ...
    return;
  }

  // Register workspace change listener (existing code)
  registerWorkspaceChangeListener(context, outputChannel);

  // NEW: Initialize frontmatter cache
  outputChannel.appendLine('📦 Initializing frontmatter cache...');
  frontmatterCache = new FrontmatterCache();
  outputChannel.appendLine('   Cache created with max size: 1000 entries');
  outputChannel.appendLine('   Cache ready for frontmatter parsing');
  outputChannel.appendLine('');

  // Feature initialization section (existing code)
  outputChannel.appendLine('✅ Extension features initialized successfully');
  // ... rest of activate function ...
}
```

**Important Notes**:
- Cache initialized after workspace validation passes
- Cache variable declared at module level (accessible to deactivate() and future features)
- Logging confirms cache initialization
- No cache created if workspace doesn't qualify (resource optimization)

**Validation**:
- ✅ Cache instance created on activation
- ✅ Log message appears in output channel
- ✅ Cache accessible from other functions
- ✅ No cache created if workspace validation fails

**References**:
- Extension activate function: `vscode-extension/src/extension.ts:193`
- Cache initialization design: `specs/S40-frontmatter-cache-layer/plan.md:224-236`

### Task 3: Connect Cache to FileSystemWatcher Events (onDidChange)

**Goal**: Invalidate cache entries when files are modified

**Location**: `vscode-extension/src/extension.ts` (after S38 watcher initialization)

**Implementation**:
```typescript
// Assuming S38 provides watchers as variables:
// plansWatcher: vscode.FileSystemWatcher
// specsWatcher: vscode.FileSystemWatcher

// Register change handler for plans watcher
plansWatcher.onDidChange((uri: vscode.Uri) => {
  const filePath = uri.fsPath;

  // Invalidate cache entry
  frontmatterCache.invalidate(filePath);

  // Log invalidation for debugging
  outputChannel.appendLine(`[CACHE] Invalidated: ${filePath} (file changed)`);
});

// Register change handler for specs watcher
specsWatcher.onDidChange((uri: vscode.Uri) => {
  const filePath = uri.fsPath;

  // Invalidate cache entry
  frontmatterCache.invalidate(filePath);

  // Log invalidation for debugging
  outputChannel.appendLine(`[CACHE] Invalidated: ${filePath} (file changed)`);
});
```

**Alternative Approach** (if S38 uses different pattern):
```typescript
// If S38 uses shared handler function, modify it:
function handleFileChanged(uri: vscode.Uri) {
  const filePath = uri.fsPath;

  // Existing S38 logging (if any)
  outputChannel.appendLine(`[FILE_CHANGED] ${filePath}`);

  // NEW: Cache invalidation
  frontmatterCache.invalidate(filePath);
  outputChannel.appendLine(`[CACHE] Invalidated: ${filePath}`);

  // Existing S38 processing (if any)
}
```

**Important Notes**:
- vscode.Uri.fsPath converts URI to native file system path (Windows-compatible)
- Cache.invalidate() handles path normalization internally
- Logging helps diagnose cache behavior in development
- Safe to call invalidate() even if entry doesn't exist

**Validation**:
- ✅ File modification triggers cache invalidation
- ✅ Log message appears in output channel
- ✅ Next get() for that file triggers re-parse (cache miss)
- ✅ Windows paths handled correctly

**References**:
- S40 story watcher integration: `plans/.../story-40-frontmatter-cache-layer.md:126-140`
- S38 event handlers: `plans/.../story-38-file-system-watcher.md:46-55`
- VSCode Uri docs: https://code.visualstudio.com/api/references/vscode-api#Uri

### Task 4: Connect Cache to FileSystemWatcher Events (onDidDelete)

**Goal**: Remove cache entries when files are deleted

**Location**: `vscode-extension/src/extension.ts` (same location as Task 3)

**Implementation**:
```typescript
// Register delete handler for plans watcher
plansWatcher.onDidDelete((uri: vscode.Uri) => {
  const filePath = uri.fsPath;

  // Invalidate cache entry (removes deleted file from cache)
  frontmatterCache.invalidate(filePath);

  // Log removal for debugging
  outputChannel.appendLine(`[CACHE] Removed: ${filePath} (file deleted)`);
});

// Register delete handler for specs watcher
specsWatcher.onDidDelete((uri: vscode.Uri) => {
  const filePath = uri.fsPath;

  // Invalidate cache entry
  frontmatterCache.invalidate(filePath);

  // Log removal for debugging
  outputChannel.appendLine(`[CACHE] Removed: ${filePath} (file deleted)`);
});
```

**Important Notes**:
- Delete events use same invalidate() method as change events
- Cache.invalidate() is idempotent (safe even if file not in cache)
- Prevents cache from holding entries for deleted files
- Frees memory when files removed from project

**Validation**:
- ✅ File deletion triggers cache removal
- ✅ Log message appears in output channel
- ✅ get() for deleted file returns null (not cached data)
- ✅ Cache size decreases after deletion

**References**:
- S40 story watcher integration: `plans/.../story-40-frontmatter-cache-layer.md:134-137`
- S38 delete handler: `plans/.../story-38-file-system-watcher.md:49`

### Task 5: Skip onDidCreate Events (No Cache Action Needed)

**Goal**: Document why create events don't need cache invalidation

**Reasoning**:
- File creation events don't require cache invalidation
- Cache.get() will handle new files automatically (cache miss → parse → cache)
- No stale data risk (file didn't exist before, so no cache entry exists)
- Avoids unnecessary invalidate() calls on file creation

**Documentation**:
Add comment in extension.ts near watcher registration:
```typescript
// Note: onDidCreate events don't need cache invalidation
// New files will be cache misses and get parsed on first access
// This avoids unnecessary invalidate() calls for files not yet in cache
```

**References**:
- S40 story create events: `plans/.../story-40-frontmatter-cache-layer.md:139`

### Task 6: Update deactivate() to Clear Cache

**Goal**: Clean up cache when extension deactivates

**Location**: `vscode-extension/src/extension.ts:251-259` (deactivate function)

**Implementation**:
```typescript
export function deactivate() {
  // NEW: Clear cache and free memory
  if (frontmatterCache) {
    const stats = frontmatterCache.getStats();
    outputChannel.appendLine('');
    outputChannel.appendLine('📦 Cache Statistics:');
    outputChannel.appendLine(`   Hits: ${stats.hits}`);
    outputChannel.appendLine(`   Misses: ${stats.misses}`);
    outputChannel.appendLine(`   Evictions: ${stats.evictions}`);
    outputChannel.appendLine(`   Final size: ${stats.size}`);
    outputChannel.appendLine('');

    frontmatterCache.clear();
    outputChannel.appendLine('   Cache cleared');
  }

  // Existing deactivation logging
  if (outputChannel) {
    outputChannel.appendLine('');
    outputChannel.appendLine('👋 Extension deactivated');
    outputChannel.dispose();
  }

  console.log('Lineage Planning extension deactivated');
}
```

**Important Notes**:
- Log cache statistics before clearing (useful for debugging)
- clear() frees memory and resets statistics
- Check if cache exists before clearing (handles early deactivation)

**Validation**:
- ✅ Cache statistics logged on deactivation
- ✅ Cache cleared successfully
- ✅ No memory leaks (cache entries released)
- ✅ Log message appears in output channel

**References**:
- Extension deactivation: `vscode-extension/src/extension.ts:251`
- Cache clear method: Phase 1, Task 8

### Task 7: Add Periodic Cache Statistics Logging

**Goal**: Log cache statistics periodically for monitoring

**Location**: `vscode-extension/src/extension.ts` (activate function, after cache init)

**Implementation**:
```typescript
// Add after cache initialization
outputChannel.appendLine('📊 Cache statistics will be logged every 60 seconds');

// Set up periodic statistics logging
const statsInterval = setInterval(() => {
  if (frontmatterCache) {
    const stats = frontmatterCache.getStats();

    // Only log if cache has been used
    if (stats.hits > 0 || stats.misses > 0) {
      outputChannel.appendLine('');
      outputChannel.appendLine(`[CACHE STATS] ${new Date().toLocaleTimeString()}`);
      outputChannel.appendLine(`  Hits: ${stats.hits} | Misses: ${stats.misses} | Evictions: ${stats.evictions} | Size: ${stats.size}`);

      // Calculate hit rate
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0';
      outputChannel.appendLine(`  Hit rate: ${hitRate}%`);
    }
  }
}, 60000); // Log every 60 seconds

// Register interval for cleanup on deactivation
context.subscriptions.push({
  dispose: () => clearInterval(statsInterval)
});
```

**Important Notes**:
- Only logs if cache has been used (avoids spam)
- Hit rate calculation helps evaluate cache effectiveness
- Interval registered in context subscriptions (auto-cleanup)
- 60-second interval balances visibility vs noise

**Optional Enhancement**:
- Make interval configurable via extension settings (future improvement)
- Log only on significant changes (e.g., every 100 operations)

**Validation**:
- ✅ Statistics logged every 60 seconds
- ✅ Only logs if cache has activity
- ✅ Hit rate calculated correctly
- ✅ Interval cleared on deactivation

**References**:
- Statistics logging design: `specs/S40-frontmatter-cache-layer/plan.md:180-199`
- S40 story logging examples: `plans/.../story-40-frontmatter-cache-layer.md:166-172`

### Task 8: Manual Testing with Extension Development Host

**Goal**: Verify cache invalidation works with real file changes

**Test Steps**:
1. Press F5 in `vscode-extension/` to launch Extension Development Host
2. Open Lineage workspace in Extension Development Host
3. Open "Lineage Planning" output channel (View → Output)
4. Verify cache initialization message appears
5. Modify a story file in plans/ directory (add space, save)
6. Check output channel for invalidation message: `[CACHE] Invalidated: <path>`
7. Delete a story file
8. Check output channel for removal message: `[CACHE] Removed: <path>`
9. Wait 60 seconds, verify statistics logged
10. Close Extension Development Host, verify cache stats logged on deactivation

**Expected Output**:
```
[CACHE] Invalidated: d:/projects/lineage/plans/epic-03/.../story-40.md (file changed)
[CACHE] Removed: d:/projects/lineage/plans/epic-03/.../story-old.md (file deleted)

[CACHE STATS] 3:45:23 PM
  Hits: 12 | Misses: 5 | Evictions: 0 | Size: 5
  Hit rate: 70.6%
```

**Validation**:
- ✅ Cache initialized on activation
- ✅ File changes trigger invalidation messages
- ✅ File deletions trigger removal messages
- ✅ Statistics logged periodically
- ✅ Cache cleared on deactivation

**Troubleshooting**:
- If no messages appear, check S38 watcher is initialized
- Verify file paths are within plans/ or specs/ directories
- Check for TypeScript compilation errors in Debug Console

**References**:
- Extension Development Host docs: https://code.visualstudio.com/api/get-started/your-first-extension#debugging-the-extension

## Completion Criteria

**Functional Requirements:**
- ✅ Cache initialized in extension activate()
- ✅ File change events trigger cache invalidation
- ✅ File delete events trigger cache removal
- ✅ Cache statistics logged periodically
- ✅ Cache cleared on deactivation

**Integration:**
- ✅ S38 FileSystemWatcher integrated successfully
- ✅ Cache.invalidate() called from watcher handlers
- ✅ Windows paths handled correctly

**Logging:**
- ✅ Invalidation messages appear in output channel
- ✅ Statistics logged every 60 seconds
- ✅ Deactivation statistics logged

**Testing:**
- ✅ Manual testing confirms file changes invalidate cache
- ✅ Manual testing confirms file deletions remove entries
- ✅ No errors in Debug Console

**Performance:**
- ✅ Cache invalidation: < 1ms (Map delete operation)
- ✅ No noticeable delay on file save

## Next Phase

**Phase 3: LRU Eviction & Statistics**
- Implement cache size limit (maxSize = 1000)
- Add LRU eviction when cache exceeds limit
- Enhance statistics tracking with eviction counter
- Test eviction behavior with large numbers of files

**Note**: Phase 3 has no external dependencies and can be implemented immediately after Phase 1, even if Phase 2 is blocked by S38.
