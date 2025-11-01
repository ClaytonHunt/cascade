---
spec: S38
phase: 1
title: Core FileSystemWatcher Setup
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: Core FileSystemWatcher Setup

## Overview

Create file system watchers for `plans/**/*.md` and `specs/**/*.md` files using VSCode's FileSystemWatcher API. This phase establishes the foundation for real-time file monitoring by creating watcher instances for all qualifying workspace folders, properly registering them for disposal, and adding basic logging.

## Prerequisites

- Story S37 (Workspace Activation Logic) completed
- Extension activates only in workspaces with plans/ or specs/ directories
- Output channel created and available (`outputChannel` variable in extension.ts:9)
- `context.subscriptions` available for disposal management (extension.ts:193)

## Tasks

### Task 1: Review VSCode FileSystemWatcher API

**Objective:** Understand the API surface and multi-root workspace patterns

**Documentation:**
- VSCode API Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher
- RelativePattern API: https://code.visualstudio.com/api/references/vscode-api#RelativePattern
- FileSystemWatcher API: https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher

**Key API Points:**
```typescript
// Create watcher with relative pattern
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceFolder, 'plans/**/*.md')
);

// Returns FileSystemWatcher with event handlers:
watcher.onDidCreate((uri: vscode.Uri) => { /* ... */ });
watcher.onDidChange((uri: vscode.Uri) => { /* ... */ });
watcher.onDidDelete((uri: vscode.Uri) => { /* ... */ });

// Disposable interface (auto-cleanup)
context.subscriptions.push(watcher);
```

**Verification:**
- [ ] Understand `RelativePattern` constructor parameters
- [ ] Understand event handler signature (`(uri: Uri) => void`)
- [ ] Understand disposal pattern (`context.subscriptions`)

### Task 2: Implement `createFileSystemWatchers()` Function

**Objective:** Create main function that initializes watchers for all qualifying workspace folders

**Location:** `vscode-extension/src/extension.ts` (add after `handleWorkspaceChange` function, around line 163)

**Function Signature:**
```typescript
/**
 * Creates file system watchers for plans/ and specs/ directories.
 *
 * Iterates through all workspace folders and creates watchers for folders
 * containing plans/ or specs/ directories. Each folder gets two watchers:
 * - plans/**/*.md watcher
 * - specs/**/*.md watcher
 *
 * Watchers are automatically registered in context.subscriptions for disposal.
 *
 * @param context VSCode extension context for subscription management
 * @param outputChannel Output channel for logging watcher creation
 * @returns Array of created FileSystemWatcher instances (for testing/debugging)
 */
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[] {
  // Implementation here
}
```

**Implementation Steps:**

**Step 1:** Initialize watcher array and get workspace folders
```typescript
const watchers: vscode.FileSystemWatcher[] = [];
const workspaceFolders = vscode.workspace.workspaceFolders;

if (!workspaceFolders) {
  outputChannel.appendLine('⚠️  No workspace folders to watch');
  return watchers;
}
```

**Step 2:** Iterate through workspace folders
```typescript
for (const folder of workspaceFolders) {
  const folderPath = folder.uri.fsPath;
  const plansPath = path.join(folderPath, 'plans');
  const specsPath = path.join(folderPath, 'specs');

  // Check if folder qualifies (has plans/ or specs/)
  const hasPlans = fs.existsSync(plansPath);
  const hasSpecs = fs.existsSync(specsPath);

  if (!hasPlans && !hasSpecs) {
    continue; // Skip non-qualifying folders
  }

  // Create watchers for this folder (next step)
}
```

**Step 3:** Create watchers for qualifying folders
```typescript
// Inside the for loop, after the exists checks:

if (hasPlans) {
  // Create plans/ watcher
  const plansWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(folder, 'plans/**/*.md')
  );

  // Register for disposal
  context.subscriptions.push(plansWatcher);
  watchers.push(plansWatcher);

  // Log creation
  outputChannel.appendLine(`   ✅ Watching: ${folder.name}/plans/**/*.md`);
}

if (hasSpecs) {
  // Create specs/ watcher
  const specsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(folder, 'specs/**/*.md')
  );

  // Register for disposal
  context.subscriptions.push(specsWatcher);
  watchers.push(specsWatcher);

  // Log creation
  outputChannel.appendLine(`   ✅ Watching: ${folder.name}/specs/**/*.md`);
}
```

**Step 4:** Return watcher array
```typescript
return watchers;
```

**Expected Output:**
- Function returns array of created watchers (length = 2 * qualifying folders)
- Output channel logs watcher creation for each directory
- Watchers registered in `context.subscriptions` (auto-disposal)

**File Reference:** `vscode-extension/src/extension.ts:163` (insertion point)

**Verification:**
- [ ] Function compiles without TypeScript errors
- [ ] Function handles empty workspace folders gracefully
- [ ] Function skips non-qualifying folders (no plans/specs)
- [ ] Function creates 2 watchers per qualifying folder
- [ ] Watchers registered in context.subscriptions

### Task 3: Add Placeholder Event Handlers

**Objective:** Register basic event handlers to verify watchers are working (detailed handlers in Phase 2)

**Location:** Inside `createFileSystemWatchers()` function, after creating each watcher

**Implementation:**
```typescript
// After creating plansWatcher:
plansWatcher.onDidCreate((uri) => {
  outputChannel.appendLine(`[CREATE] ${uri.fsPath}`);
});

plansWatcher.onDidChange((uri) => {
  outputChannel.appendLine(`[CHANGE] ${uri.fsPath}`);
});

plansWatcher.onDidDelete((uri) => {
  outputChannel.appendLine(`[DELETE] ${uri.fsPath}`);
});

// Repeat for specsWatcher
```

**Note:** These are placeholder handlers for testing. Phase 2 will replace them with debounced handlers.

**Expected Output:**
- File creation logs: `[CREATE] D:\projects\lineage\plans\test.md`
- File modification logs: `[CHANGE] D:\projects\lineage\plans\test.md`
- File deletion logs: `[DELETE] D:\projects\lineage\plans\test.md`

**Verification:**
- [ ] Create test file in plans/ → log appears
- [ ] Modify test file → log appears
- [ ] Delete test file → log appears
- [ ] No errors in Debug Console

### Task 4: Integrate Watcher Creation into `activate()` Function

**Objective:** Call `createFileSystemWatchers()` from main activation flow

**Location:** `vscode-extension/src/extension.ts:232` (after workspace change listener registration)

**Implementation:**
```typescript
// After line 230: registerWorkspaceChangeListener(context, outputChannel);

// Initialize file system watchers for plans/ and specs/
outputChannel.appendLine('--- File System Watchers ---');
const watchers = createFileSystemWatchers(context, outputChannel);
outputChannel.appendLine(`📁 Watching ${watchers.length} directories for file changes`);
outputChannel.appendLine('');
```

**Expected Output:**
```
--- File System Watchers ---
   ✅ Watching: lineage/plans/**/*.md
   ✅ Watching: lineage/specs/**/*.md
📁 Watching 2 directories for file changes

✅ Extension features initialized successfully
```

**File Reference:** `vscode-extension/src/extension.ts:232`

**Verification:**
- [ ] Watchers initialized after workspace detection
- [ ] Watchers initialized before "features initialized" log
- [ ] Output channel shows watcher count
- [ ] Extension activates without errors

### Task 5: Test Multi-Root Workspace Handling

**Objective:** Verify watchers created correctly for multi-root workspaces

**Test Scenario 1: Single Workspace Folder**
1. Open Lineage project (`D:\projects\lineage`)
2. Press F5 to launch Extension Development Host
3. Open "Lineage Planning" output channel
4. Expected output:
   ```
   --- File System Watchers ---
      ✅ Watching: lineage/plans/**/*.md
      ✅ Watching: lineage/specs/**/*.md
   📁 Watching 2 directories for file changes
   ```

**Test Scenario 2: Multi-Root Workspace with Qualifying Folders**
1. Create workspace with two folders (both with plans/)
2. Expected output:
   ```
   --- File System Watchers ---
      ✅ Watching: folder1/plans/**/*.md
      ✅ Watching: folder1/specs/**/*.md
      ✅ Watching: folder2/plans/**/*.md
   📁 Watching 3 directories for file changes
   ```

**Test Scenario 3: Multi-Root Workspace with Non-Qualifying Folder**
1. Add folder without plans/ or specs/ to workspace
2. Expected: Folder skipped silently (no watcher created)
3. Verify: Watcher count matches qualifying folders only

**Test Scenario 4: Empty Workspace (No Folders)**
1. Open VSCode with no workspace open (single file mode)
2. Expected output:
   ```
   --- File System Watchers ---
   ⚠️  No workspace folders to watch
   📁 Watching 0 directories for file changes
   ```

**Verification:**
- [ ] Single folder: 2 watchers created
- [ ] Multi-root: N watchers created (2 per qualifying folder)
- [ ] Non-qualifying folders skipped
- [ ] Empty workspace handled gracefully

### Task 6: Test Watcher Event Triggering

**Objective:** Verify placeholder event handlers respond to file system events

**Test Workflow:**

**Step 1: Create Test File**
1. In Extension Development Host, create file: `plans/test-watcher.md`
2. Save file
3. Check output channel for: `[CREATE] D:\projects\lineage\plans\test-watcher.md`

**Step 2: Modify Test File**
1. Edit `plans/test-watcher.md` (add content)
2. Save file (Ctrl+S)
3. Check output channel for: `[CHANGE] D:\projects\lineage\plans\test-watcher.md`
4. Edit and save multiple times rapidly
5. Expected: Multiple `[CHANGE]` logs (no debouncing yet)

**Step 3: Delete Test File**
1. Delete `plans/test-watcher.md`
2. Check output channel for: `[DELETE] D:\projects\lineage\plans\test-watcher.md`

**Step 4: Test specs/ Directory**
1. Repeat above tests for `specs/test-watcher.md`
2. Verify all events trigger correctly

**Verification:**
- [ ] CREATE events logged with correct path
- [ ] CHANGE events logged with correct path
- [ ] DELETE events logged with correct path
- [ ] Events logged for both plans/ and specs/ directories
- [ ] Windows paths displayed correctly (backslashes)
- [ ] No errors in Debug Console

### Task 7: Test Watcher Disposal

**Objective:** Verify watchers are properly disposed on extension deactivation

**Test Workflow:**

**Step 1: Verify Watchers Active**
1. Activate extension (F5)
2. Create/modify test file in plans/
3. Verify event logs appear (watchers active)

**Step 2: Reload Window**
1. Press `Ctrl+Shift+P`
2. Run command: "Developer: Reload Window"
3. Wait for extension to reload
4. Check output channel for new activation log

**Step 3: Verify Watchers Recreated**
1. Create/modify test file in plans/
2. Verify event logs appear (new watchers active)
3. Expected: No duplicate events (old watchers disposed)

**Step 4: Check for Orphaned Resources**
1. Open Task Manager (Windows)
2. Find VSCode process
3. Check file handle count (should not increase continuously on reloads)
4. Verify: Handle count stable (watchers properly disposed)

**Verification:**
- [ ] Watchers disposed on extension deactivation
- [ ] No duplicate events after reload
- [ ] No orphaned file handles (Task Manager check)
- [ ] No errors about disposed watchers in Debug Console

## Completion Criteria

- [ ] `createFileSystemWatchers()` function implemented and working
- [ ] Watchers created for all qualifying workspace folders
- [ ] Watchers properly registered in `context.subscriptions`
- [ ] Placeholder event handlers log file events
- [ ] Multi-root workspace support verified (all scenarios tested)
- [ ] Watcher disposal verified (no orphaned resources)
- [ ] Windows path handling verified (backslashes in logs)
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in Debug Console
- [ ] Output channel shows clear watcher status (count, directories)

## Next Phase

**Phase 2: Event Handlers with Debouncing**

Now that watchers are created and functional, Phase 2 will implement:
- Debounce timer map for per-file delays
- `createDebouncedHandler()` wrapper function
- Detailed logging with timestamps and event types
- Timer cleanup to prevent memory leaks

The placeholder event handlers from Phase 1 will be replaced with production-ready debounced handlers.
