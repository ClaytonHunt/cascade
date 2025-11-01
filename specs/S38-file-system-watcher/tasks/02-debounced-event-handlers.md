---
spec: S38
phase: 2
title: Event Handlers with Debouncing
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Event Handlers with Debouncing

## Overview

Implement production-ready event handlers with debouncing to prevent excessive processing during rapid file saves. This phase replaces the placeholder handlers from Phase 1 with a robust debouncing system that batches rapid changes per file while allowing concurrent processing of different files.

## Prerequisites

- Phase 1 completed (watchers created and functional)
- Placeholder event handlers working (`[CREATE]`, `[CHANGE]`, `[DELETE]` logs)
- Output channel available for detailed logging
- Watchers registered in `context.subscriptions`

## Tasks

### Task 1: Design Debouncing Strategy

**Objective:** Understand the debouncing requirements and implementation approach

**Debouncing Requirements:**
- **Per-file debouncing**: Each file has independent timer (not global debounce)
- **300ms delay**: Standard debounce interval (balances responsiveness vs efficiency)
- **Timer cancellation**: New event clears old timer for same file
- **Timer cleanup**: Remove timer entry after processing
- **Path normalization**: Consistent cache keys (Windows path handling)

**Why Per-File Debouncing?**
- Scenario: User saves `story-38.md` and `story-39.md` simultaneously
- Global debounce: Second file delayed by first file's timer (BAD)
- Per-file debounce: Both process concurrently after their own 300ms (GOOD)

**Data Structure: Timer Map**
```typescript
// Key: Normalized file path (lowercase, forward slashes)
// Value: Active NodeJS.Timeout for that file
const changeTimers = new Map<string, NodeJS.Timeout>();
```

**Timer Lifecycle:**
1. File event received → Normalize path
2. Check map for existing timer for this file
3. If timer exists → Clear it (cancel old timer)
4. Create new timer (300ms delay)
5. Store timer in map
6. Timer fires → Process event, delete timer from map

**Path Normalization Example:**
```typescript
// Input: 'D:\\Projects\\Lineage\\plans\\story-38.md'
// Output: 'd:/projects/lineage/plans/story-38.md'
const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
```

**Verification:**
- [ ] Understand per-file vs global debouncing difference
- [ ] Understand timer cancellation mechanism
- [ ] Understand path normalization rationale (Windows)

### Task 2: Implement Path Normalization Helper

**Objective:** Create helper function to normalize file paths for consistent timer keys

**Location:** `vscode-extension/src/extension.ts` (add before `createFileSystemWatchers`, around line 163)

**Implementation:**
```typescript
/**
 * Normalizes file path for consistent cache keys and timer lookups.
 *
 * Handles Windows path variations by:
 * - Converting backslashes to forward slashes
 * - Converting to lowercase (Windows file system is case-insensitive)
 *
 * This ensures that different representations of the same file path
 * (e.g., 'D:\\plans\\story.md' vs 'D:/plans/story.md' vs 'd:/Plans/story.md')
 * all map to the same normalized key.
 *
 * @param filePath - Raw file path from vscode.Uri.fsPath (may have backslashes)
 * @returns Normalized path (lowercase, forward slashes)
 *
 * @example
 * normalizeWatcherPath('D:\\Projects\\Lineage\\plans\\story-38.md')
 * // Returns: 'd:/projects/lineage/plans/story-38.md'
 */
function normalizeWatcherPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}
```

**Note:** This is separate from `normalizePath()` in cache.ts (different use case, same logic).

**Testing:**
```typescript
// Test cases (add as inline comments or unit test)
// normalizeWatcherPath('D:\\plans\\story.md') === 'd:/plans/story.md'
// normalizeWatcherPath('D:/plans/story.md') === 'd:/plans/story.md'
// normalizeWatcherPath('d:/Plans/Story.md') === 'd:/plans/story.md'
```

**Verification:**
- [ ] Function compiles without errors
- [ ] Backslashes converted to forward slashes
- [ ] Mixed case converted to lowercase
- [ ] Already-normalized paths pass through unchanged

### Task 3: Implement `createDebouncedHandler()` Function

**Objective:** Create higher-order function that wraps event handlers with debouncing logic

**Location:** `vscode-extension/src/extension.ts` (add before `createFileSystemWatchers`)

**Function Signature:**
```typescript
/**
 * Creates a debounced file change handler.
 *
 * Wraps an event handler with debouncing logic to prevent excessive processing
 * during rapid file saves. Each file has an independent timer (300ms default).
 *
 * When a file event occurs:
 * 1. Clear any existing timer for this file
 * 2. Create new timer (300ms delay)
 * 3. Timer fires → Execute handler, remove timer from map
 *
 * This ensures:
 * - Multiple rapid saves to same file → Single handler execution (after 300ms silence)
 * - Different files → Concurrent processing (independent timers)
 *
 * @param handler - Event handler function to debounce
 * @param changeTimers - Map storing active timers by file path
 * @param outputChannel - Output channel for logging
 * @param eventType - Event type label for logging ('CREATE', 'CHANGE', 'DELETE')
 * @returns Debounced event handler
 */
function createDebouncedHandler(
  handler: (uri: vscode.Uri) => void,
  changeTimers: Map<string, NodeJS.Timeout>,
  outputChannel: vscode.OutputChannel,
  eventType: string
): (uri: vscode.Uri) => void {
  // Implementation here
}
```

**Implementation Steps:**

**Step 1:** Return wrapper function
```typescript
return (uri: vscode.Uri) => {
  const filePath = uri.fsPath; // Native OS path
  const normalizedPath = normalizeWatcherPath(filePath);

  // Debouncing logic here (next steps)
};
```

**Step 2:** Clear existing timer for this file
```typescript
const existingTimer = changeTimers.get(normalizedPath);
if (existingTimer) {
  clearTimeout(existingTimer);
  // Old timer cancelled - new event will reset delay
}
```

**Step 3:** Create new timer
```typescript
const timer = setTimeout(() => {
  // Timer fired - process event

  // Execute handler
  handler(uri);

  // Log event with timestamp
  const timestamp = new Date().toLocaleTimeString();
  outputChannel.appendLine(`[${timestamp}] ${eventType}: ${filePath}`);

  // Clean up: Remove timer from map
  changeTimers.delete(normalizedPath);
}, 300); // 300ms debounce delay
```

**Step 4:** Store timer in map
```typescript
changeTimers.set(normalizedPath, timer);
```

**Expected Behavior:**
- First save: Timer starts (300ms countdown)
- Second save (< 300ms later): Old timer cancelled, new timer starts
- Timer fires: Handler executes, log entry created, timer deleted
- Next save: Process repeats (no stale timer)

**Verification:**
- [ ] Function compiles without TypeScript errors
- [ ] Timer cleared before setting new one
- [ ] Timer removed from map after firing
- [ ] Normalized path used as map key

### Task 4: Create Timer Map and Update Handler Registration

**Objective:** Replace placeholder handlers with debounced handlers in `createFileSystemWatchers()`

**Location:** `vscode-extension/src/extension.ts` in `createFileSystemWatchers()` function

**Step 1: Create Timer Map**
Add at the beginning of `createFileSystemWatchers()`:
```typescript
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[] {
  // Create debounce timer map (shared across all watchers)
  const changeTimers = new Map<string, NodeJS.Timeout>();

  const watchers: vscode.FileSystemWatcher[] = [];
  // ... rest of function
}
```

**Step 2: Define Event Handlers**
Add before the workspace folder loop:
```typescript
// Event handlers (will be wrapped with debouncing)
const handleCreate = (uri: vscode.Uri) => {
  // Phase 2: Just logging (cache integration in Phase 3)
  // Handler body intentionally empty - debouncer handles logging
};

const handleChange = (uri: vscode.Uri) => {
  // Phase 2: Just logging (cache integration in Phase 3)
  // Handler body intentionally empty - debouncer handles logging
};

const handleDelete = (uri: vscode.Uri) => {
  // Phase 2: Just logging (cache integration in Phase 3)
  // Handler body intentionally empty - debouncer handles logging
};
```

**Step 3: Replace Placeholder Handlers**
Replace the placeholder handler registration code (from Phase 1) with debounced handlers:

**OLD (Phase 1 - Remove this):**
```typescript
plansWatcher.onDidCreate((uri) => {
  outputChannel.appendLine(`[CREATE] ${uri.fsPath}`);
});
// ... etc
```

**NEW (Phase 2 - Replace with this):**
```typescript
// Register event handlers with debouncing
plansWatcher.onDidCreate(
  createDebouncedHandler(handleCreate, changeTimers, outputChannel, 'FILE_CREATED')
);

plansWatcher.onDidChange(
  createDebouncedHandler(handleChange, changeTimers, outputChannel, 'FILE_CHANGED')
);

plansWatcher.onDidDelete(
  createDebouncedHandler(handleDelete, changeTimers, outputChannel, 'FILE_DELETED')
);
```

**Step 4: Repeat for specs/ watcher**
```typescript
// Same pattern for specsWatcher
specsWatcher.onDidCreate(
  createDebouncedHandler(handleCreate, changeTimers, outputChannel, 'FILE_CREATED')
);

specsWatcher.onDidChange(
  createDebouncedHandler(handleChange, changeTimers, outputChannel, 'FILE_CHANGED')
);

specsWatcher.onDidDelete(
  createDebouncedHandler(handleDelete, changeTimers, outputChannel, 'FILE_DELETED')
);
```

**Expected Output Format:**
```
[2:45:30 PM] FILE_CREATED: D:\projects\lineage\plans\test-story.md
[2:45:35 PM] FILE_CHANGED: D:\projects\lineage\plans\test-story.md
[2:45:40 PM] FILE_DELETED: D:\projects\lineage\plans\test-story.md
```

**Verification:**
- [ ] Placeholder handlers removed
- [ ] Debounced handlers registered
- [ ] Timer map shared across all watchers
- [ ] Event type labels descriptive (FILE_CREATED, etc.)

### Task 5: Test Debouncing Behavior

**Objective:** Verify debouncing prevents multiple events for rapid saves

**Test Scenario 1: Single Rapid Save**
1. Create file: `plans/debounce-test.md`
2. Add content and save
3. Immediately edit and save again (< 300ms)
4. Wait 350ms
5. Expected output:
   ```
   [2:45:30 PM] FILE_CREATED: plans/debounce-test.md
   [2:45:31 PM] FILE_CHANGED: plans/debounce-test.md
   ```
   (Only ONE FILE_CHANGED log, despite two saves)

**Test Scenario 2: Multiple Rapid Saves (Auto-Save)**
1. Enable VSCode auto-save: `File → Auto Save`
2. Edit file continuously (type multiple lines)
3. Stop editing, wait 350ms
4. Expected: Single FILE_CHANGED log (after 300ms silence)
5. Verify: No log spam during active typing

**Test Scenario 3: Concurrent File Edits**
1. Open two files: `plans/story-38.md` and `plans/story-39.md`
2. Save story-38.md
3. Immediately save story-39.md (< 100ms later)
4. Wait 350ms
5. Expected output:
   ```
   [2:45:30 PM] FILE_CHANGED: plans/story-38.md
   [2:45:30 PM] FILE_CHANGED: plans/story-39.md
   ```
   (Both files process concurrently - independent timers)

**Test Scenario 4: Debounce Window Verification**
1. Save file
2. Wait 200ms (timer still active)
3. Save file again
4. Wait 350ms
5. Expected: Single log entry at T+500ms (200ms + 300ms)
6. Verify: Timer reset by second save

**Verification:**
- [ ] Rapid saves produce single log entry (debounced)
- [ ] Different files process concurrently (per-file timers)
- [ ] Debounce window accurately 300ms
- [ ] Timer reset by subsequent events

### Task 6: Add Detailed Logging for Debugging

**Objective:** Enhance logging with additional debug information

**Location:** In `createDebouncedHandler()` function

**Implementation:**
Update the log line to include relative path (more readable):
```typescript
// Inside timer callback, after handler execution:
const timestamp = new Date().toLocaleTimeString();

// Extract relative path (remove workspace folder prefix)
const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
const relativePath = workspaceFolder
  ? path.relative(workspaceFolder.uri.fsPath, filePath)
  : filePath;

// Log with relative path (cleaner output)
outputChannel.appendLine(`[${timestamp}] ${eventType}: ${relativePath}`);
```

**Before:**
```
[2:45:30 PM] FILE_CHANGED: D:\projects\lineage\plans\epic-03-vscode-planning-extension\feature-11-extension-infrastructure\story-38-file-system-watcher.md
```

**After:**
```
[2:45:30 PM] FILE_CHANGED: plans\epic-03-vscode-planning-extension\feature-11-extension-infrastructure\story-38-file-system-watcher.md
```

**Optional: Add Debounce Indicator**
For FILE_CHANGED events that were debounced:
```typescript
// Add flag to track if timer was reset
let wasDebounced = false;

// In wrapper function, before creating new timer:
if (existingTimer) {
  clearTimeout(existingTimer);
  wasDebounced = true;
}

// In timer callback:
const debounceSuffix = wasDebounced ? ' (debounced)' : '';
outputChannel.appendLine(`[${timestamp}] ${eventType}: ${relativePath}${debounceSuffix}`);
```

**Note:** Debounce indicator is optional (adds complexity). Skip if not needed for debugging.

**Verification:**
- [ ] Logs use relative paths (cleaner output)
- [ ] Timestamps accurate (matches system clock)
- [ ] Debounce indicator works (optional)

### Task 7: Test Edge Cases

**Objective:** Verify debouncing handles edge cases correctly

**Edge Case 1: File Deleted During Debounce Window**
1. Edit file and save (timer starts)
2. Immediately delete file (< 300ms)
3. Wait 350ms
4. Expected output:
   ```
   [2:45:30 PM] FILE_CHANGED: plans/test.md
   [2:45:30 PM] FILE_DELETED: plans/test.md
   ```
   (Both events fire - independent timers)

**Edge Case 2: File Renamed (DELETE + CREATE)**
1. Create file: `plans/old-name.md`
2. Rename to: `plans/new-name.md`
3. Expected output:
   ```
   [2:45:30 PM] FILE_DELETED: plans/old-name.md
   [2:45:30 PM] FILE_CREATED: plans/new-name.md
   ```
   (VSCode reports rename as DELETE + CREATE)

**Edge Case 3: Bulk File Operations**
1. Use Find/Replace across 10 files in plans/
2. Replace all and save
3. Wait 350ms
4. Expected: 10 FILE_CHANGED logs (one per file, debounced)
5. Verify: All files processed (no dropped events)

**Edge Case 4: Timer Map Memory Usage**
1. Rapidly edit 100 files (rapid saves)
2. Wait for all timers to fire
3. Verify: Timer map empty after processing (no memory leak)
4. Check: `changeTimers.size === 0` after 500ms idle

**Edge Case 5: Case-Insensitive Path Handling (Windows)**
1. Save file: `plans/Story.md`
2. Immediately save again (case changed): `plans/STORY.md`
3. Expected: Single timer (normalized path matches)
4. Verify: Only one FILE_CHANGED log (debounced)

**Verification:**
- [ ] Delete during debounce works (both events fire)
- [ ] Renames handled as DELETE + CREATE
- [ ] Bulk operations process all files
- [ ] Timer map cleaned up after processing
- [ ] Case-insensitive path matching works

### Task 8: Performance Testing

**Objective:** Verify debouncing doesn't introduce performance issues

**Benchmark 1: Event Processing Latency**
1. Disable debouncing temporarily (set delay to 0ms)
2. Save file and measure time to log entry
3. Expected: < 50ms (handler + logging overhead)
4. Re-enable debouncing (300ms)

**Benchmark 2: Timer Map Memory Usage**
1. Create 1000 dummy files in plans/
2. Bulk modify all files simultaneously
3. Measure: Timer map size during processing
4. Expected: ~1000 entries briefly, then 0 after processing
5. Memory increase: < 1MB (minimal overhead)

**Benchmark 3: Concurrent File Processing**
1. Modify 100 files simultaneously
2. Measure: Time from first save to last log entry
3. Expected: ~350ms (300ms debounce + 50ms processing)
4. Verify: All files processed (no dropped events)

**Stress Test: Rapid Saves**
1. Enable auto-save with 200ms delay
2. Edit file continuously for 30 seconds
3. Verify: No errors, no memory leaks, no dropped events
4. Check: Debug Console for warnings

**Verification:**
- [ ] Event processing latency < 50ms (excluding debounce)
- [ ] Timer map size bounded (cleans up after processing)
- [ ] Concurrent processing works (100+ files)
- [ ] Stress test passes (no crashes, no memory leaks)

### Task 9: Add Inline Documentation

**Objective:** Document debouncing behavior for future maintainers

**Location:** Add comments in `createDebouncedHandler()` function

**Documentation Points:**
```typescript
/**
 * Debouncing prevents excessive processing during rapid saves.
 *
 * Example: User has auto-save enabled (saves every 200ms).
 * Without debouncing: 10 saves in 2 seconds → 10 handler executions
 * With debouncing: 10 saves in 2 seconds → 1 handler execution (after 300ms silence)
 *
 * This is critical for:
 * - Cache invalidation efficiency (S40)
 * - UI update performance (F12, F13)
 * - Avoiding redundant file parsing (S39)
 *
 * Timer Management:
 * - Each file has independent timer (Map key = normalized path)
 * - New event clears old timer (resets countdown)
 * - Timer cleaned up after firing (prevents memory leak)
 *
 * Path Normalization:
 * - Windows: 'D:\\plans\\story.md' → 'd:/plans/story.md'
 * - Ensures same file always maps to same timer key
 * - Case-insensitive (Windows file system behavior)
 */
```

**Verification:**
- [ ] Comments explain "why" not just "what"
- [ ] Example scenario included
- [ ] Integration points noted (S40, F12, F13)
- [ ] Path normalization rationale documented

## Completion Criteria

- [ ] Path normalization helper implemented (`normalizeWatcherPath()`)
- [ ] `createDebouncedHandler()` function implemented and working
- [ ] Placeholder handlers replaced with debounced handlers
- [ ] Timer map created and shared across watchers
- [ ] Debouncing prevents multiple events for rapid saves (tested)
- [ ] Per-file timers allow concurrent processing (tested)
- [ ] Edge cases handled correctly (delete during debounce, renames, bulk ops)
- [ ] Performance benchmarks pass (latency, memory, stress test)
- [ ] Inline documentation added (explains debouncing behavior)
- [ ] Logs use relative paths and timestamps
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in Debug Console

## Next Phase

**Phase 3: Cache Integration & Cleanup**

Now that debouncing is working, Phase 3 will integrate with the cache layer:
- Create `FrontmatterCache` instance in `activate()`
- Pass cache reference to watcher creation
- Call `cache.invalidate(filePath)` in event handlers
- Add cache statistics logging (hits/misses/evictions)
- Verify disposal and cleanup (no memory leaks)

The event handlers from Phase 2 will be enhanced to trigger cache invalidation, completing the S38 implementation.
