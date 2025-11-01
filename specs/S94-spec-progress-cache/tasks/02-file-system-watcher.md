---
spec: S94
phase: 2
title: FileSystemWatcher Integration
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: FileSystemWatcher Integration

## Overview

Set up FileSystemWatcher for spec directories and wire up cache invalidation when spec files change. This phase makes the cache reactive to file system changes.

## Prerequisites

- Phase 1 completed (cache infrastructure in place)
- Familiarity with FileSystemWatcher pattern from S71
- Understanding of createFileSystemWatchers() in extension.ts

## Tasks

### Task 1: Implement extractStoryItemFromSpecPath() Helper Function

Create a utility function to extract story item numbers from spec directory paths.

**File**: `vscode-extension/src/extension.ts`

**Location**: Before `createFileSystemWatchers()` function (around line 340)

**Code to Add**:

```typescript
/**
 * Extracts story item number from a spec directory path (S94).
 *
 * Spec paths follow the pattern:
 * - specs/S{number}-{name}/plan.md
 * - specs/S{number}-{name}/tasks/*.md
 * - specs/story-{number}-{name}/plan.md (legacy format)
 *
 * This function parses the path to extract the story number and
 * format it as "S{number}" for cache lookup.
 *
 * @param specPath - Absolute path to spec file
 * @returns Story item number (e.g., "S75") or null if path doesn't match
 *
 * @example
 * ```typescript
 * extractStoryItemFromSpecPath('D:/projects/lineage/specs/S93-spec-progress-reader-utility/plan.md')
 * // Returns: "S93"
 *
 * extractStoryItemFromSpecPath('D:/projects/lineage/specs/story-75-type-system/tasks/01-core.md')
 * // Returns: "S75"
 *
 * extractStoryItemFromSpecPath('D:/projects/lineage/plans/epic-05/story-49.md')
 * // Returns: null (not a spec path)
 * ```
 */
function extractStoryItemFromSpecPath(specPath: string): string | null {
  // Normalize path separators (Windows uses backslash, need forward slash for regex)
  const normalizedPath = specPath.replace(/\\/g, '/');

  // Match pattern: specs/S{number}-{name}/...
  // Example: specs/S93-spec-progress-reader-utility/plan.md → S93
  let match = normalizedPath.match(/specs\/S(\d+)-/);
  if (match) {
    return `S${match[1]}`;
  }

  // Match legacy pattern: specs/story-{number}-{name}/...
  // Example: specs/story-75-type-system/tasks/01-core.md → S75
  match = normalizedPath.match(/specs\/story-(\d+)-/);
  if (match) {
    return `S${match[1]}`;
  }

  // Path doesn't match spec directory pattern
  return null;
}
```

**Validation**:
- Function compiles without errors
- Handles both modern (S93-...) and legacy (story-93-...) formats
- Returns null for non-spec paths
- Normalizes Windows backslashes to forward slashes

### Task 2: Add Spec FileSystemWatcher

Add a FileSystemWatcher for spec directories to detect file changes.

**File**: `vscode-extension/src/extension.ts`

**Location**: Inside `createFileSystemWatchers()` function, after specs watcher creation (around line 510)

**Find this code** (around line 490-510):

```typescript
if (hasSpecs) {
  // Create specs/ watcher
  const specsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(folder, 'specs/**/*.md')
  );

  // Register event handlers with debouncing
  specsWatcher.onDidCreate(
    (uri) => debouncedHandleChange(uri, handleCreate, 'create', changeTimers)
  );
  specsWatcher.onDidChange(
    (uri) => debouncedHandleChange(uri, handleChange, 'change', changeTimers)
  );
  specsWatcher.onDidDelete(
    (uri) => debouncedHandleChange(uri, handleDelete, 'delete', changeTimers)
  );

  watchers.push(specsWatcher);

  outputChannel.appendLine(`   ✅ Watching: ${folder.name}/specs/**/*.md`);
}
```

**Replace the `specsWatcher.onDidChange()` handler with**:

```typescript
specsWatcher.onDidChange(
  (uri) => {
    // Standard file change handling (cache invalidation, refresh)
    debouncedHandleChange(uri, handleChange, 'change', changeTimers);

    // S94: Spec progress cache invalidation
    // Extract story number from spec path (e.g., "specs/S93-.../plan.md" → "S93")
    const storyItem = extractStoryItemFromSpecPath(uri.fsPath);

    if (storyItem) {
      // Invalidate spec progress cache for this specific story
      planningTreeProvider.invalidateSpecProgress(storyItem);
      outputChannel.appendLine(
        `[SpecProgressCache] File changed: ${path.basename(uri.fsPath)} → Invalidated cache for ${storyItem}`
      );
    } else {
      // Path doesn't match spec pattern (shouldn't happen, but log for debugging)
      outputChannel.appendLine(
        `[SpecProgressCache] ⚠️  Could not extract story item from spec path: ${uri.fsPath}`
      );
    }
  }
);
```

**Import Required**:

Verify `path` is imported at top of file:

```typescript
import * as path from 'path';
```

**Validation**:
- Code compiles without errors
- planningTreeProvider is accessible in this scope (should be, it's passed to event handlers)
- extractStoryItemFromSpecPath() is called with correct argument
- Cache invalidation logs include file name and story item

**Explanation**:

The watcher monitors ALL .md files in specs/** directories (plan.md and tasks/*.md). When any spec file changes:

1. Standard change handler fires (existing behavior: cache invalidation, refresh)
2. **NEW**: Extract story number from path using helper function
3. **NEW**: Invalidate spec progress cache for that specific story
4. **NEW**: Log invalidation event to output channel

This selective invalidation preserves cache hits for unmodified specs while ensuring data accuracy for changed specs.

### Task 3: Verify Watcher Registration

Ensure the spec watcher is properly registered in context.subscriptions.

**File**: `vscode-extension/src/extension.ts`

**Location**: Inside `createFileSystemWatchers()` function

**Verification**:

Check that the existing code already registers watchers (around line 515):

```typescript
watchers.push(specsWatcher);
```

And later in `activate()` function, watchers are added to subscriptions:

```typescript
context.subscriptions.push(...watchers);
```

**No code changes needed** - just verify the infrastructure exists.

### Task 4: Test Cache Invalidation with Manual File Edit

Manually test that spec file changes trigger cache invalidation.

**Testing Steps**:

1. **Package and Install Extension**:
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

3. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Run "View: Toggle Output"
   - Select "Cascade" from dropdown

4. **Open Cascade TreeView**:
   - Click Cascade icon in Activity Bar (left sidebar)
   - Expand a status group with stories that have specs

5. **Edit a Spec File**:
   - Open a spec plan.md file (e.g., `specs/S93-spec-progress-reader-utility/plan.md`)
   - Make a trivial change (add a space, change a comment)
   - Save file (`Ctrl+S`)

6. **Verify Output Channel**:
   Look for these log entries:
   ```
   [SpecProgressCache] File changed: plan.md → Invalidated cache for S93
   [SpecProgressCache] Invalidated cache for S93
   ```

7. **Edit a Phase File**:
   - Open a phase task file (e.g., `specs/S93-.../tasks/01-reader-utility.md`)
   - Make a trivial change
   - Save file

8. **Verify Output Channel Again**:
   ```
   [SpecProgressCache] File changed: 01-reader-utility.md → Invalidated cache for S93
   [SpecProgressCache] Invalidated cache for S93
   ```

**Expected Results**:
- Cache invalidation logs appear immediately after saving spec files
- Story number is correctly extracted from path
- Both plan.md and phase file changes trigger invalidation

**Troubleshooting**:

If logs don't appear:
- Verify extension is active (check for "Extension activated" in output channel)
- Verify FileSystemWatcher is registered (check for "Watching: .../specs/**/*.md")
- Verify spec file path matches expected pattern (S93-... or story-93-...)
- Check for TypeScript compilation errors (`npm run compile`)

## Completion Criteria

- [ ] extractStoryItemFromSpecPath() function implemented and handles both path formats
- [ ] Spec FileSystemWatcher onDidChange handler updated with cache invalidation logic
- [ ] planningTreeProvider.invalidateSpecProgress() called on spec file changes
- [ ] Output channel logs show cache invalidation events
- [ ] Manual testing confirms cache invalidation on plan.md changes
- [ ] Manual testing confirms cache invalidation on phase file changes
- [ ] TypeScript compilation succeeds with no errors

## Verification Steps

1. **Compile Extension**:
   ```bash
   cd vscode-extension && npm run compile
   ```

2. **Review Code Changes**:
   - Open extension.ts
   - Verify extractStoryItemFromSpecPath() exists before createFileSystemWatchers()
   - Verify specsWatcher.onDidChange() calls invalidateSpecProgress()

3. **Manual Testing**:
   - Follow testing steps in Task 4
   - Verify output channel shows cache invalidation logs
   - Test with different spec files (plan.md and phase files)

## Next Phase

Proceed to **Phase 3: Integration and Performance Logging** to wire up cache usage in getTreeItem() and add performance metrics.
