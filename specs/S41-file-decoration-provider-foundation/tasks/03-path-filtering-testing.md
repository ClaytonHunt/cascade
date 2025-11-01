---
spec: S41
phase: 3
title: Path Filtering & Testing
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 3: Path Filtering & Testing

## Overview

Implement path-based filtering in the `provideFileDecoration()` method to ensure the provider only decorates files within the `plans/` directory hierarchy. This prevents the provider from interfering with other files in the workspace and improves performance by avoiding unnecessary processing.

This phase also includes comprehensive edge case handling and manual testing validation to ensure the provider behaves correctly in all scenarios.

## Prerequisites

- Phase 1 completed (Provider class exists)
- Phase 2 completed (Provider registered in extension)
- Extension Development Host running with Lineage workspace

## Tasks

### Task 1: Implement Path Normalization Helper

Add a helper function to normalize file paths for consistent comparison (handles Windows backslash/forward slash variations).

**File**: `vscode-extension/src/decorationProvider.ts`

**Code to add** (before class definition):
```typescript
/**
 * Normalizes file path for consistent comparison.
 *
 * Handles Windows path variations:
 * - Converts backslashes to forward slashes
 * - Converts to lowercase (Windows is case-insensitive)
 *
 * @param filePath - Absolute file path from uri.fsPath
 * @returns Normalized path (lowercase, forward slashes)
 *
 * @example
 * normalizePath('D:\\Projects\\Lineage\\plans\\story.md')
 * // Returns: 'd:/projects/lineage/plans/story.md'
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}
```

**Reference**: See similar pattern in `cache.ts:50-52` and `extension.ts:209-211`.

**Expected outcome**: Consistent path handling across Windows and Unix systems.

---

### Task 2: Implement Plans Directory Detection

Add method to check if a file URI is within the `plans/` directory.

**File**: `vscode-extension/src/decorationProvider.ts`

**Code to add** (inside class, before `provideFileDecoration` method):
```typescript
/**
 * Checks if a file URI is within the plans/ directory hierarchy.
 *
 * Returns true for any file path containing '/plans/' segment.
 * This includes all subdirectories within plans/ (e.g., plans/epic-03/feature-12/).
 *
 * @param uri - File URI to check
 * @returns true if file is in plans/ directory, false otherwise
 *
 * @example
 * isInPlansDirectory('D:/projects/lineage/plans/story-41.md') // true
 * isInPlansDirectory('D:/projects/lineage/specs/S41/plan.md') // false
 * isInPlansDirectory('D:/projects/lineage/src/main.ts') // false
 */
private isInPlansDirectory(uri: vscode.Uri): boolean {
  const normalizedPath = normalizePath(uri.fsPath);
  return normalizedPath.includes('/plans/');
}
```

**Expected outcome**: Method correctly identifies plans/ directory files.

---

### Task 3: Update provideFileDecoration with Path Filtering

Modify the `provideFileDecoration()` method to filter out non-plans files.

**File**: `vscode-extension/src/decorationProvider.ts`

**Code to replace** (existing `provideFileDecoration` method):
```typescript
/**
 * Provides file decoration for a given URI.
 *
 * Called by VSCode whenever:
 * - File is opened/visible in explorer
 * - onDidChangeFileDecorations event fires
 * - Explorer is refreshed
 *
 * Phase 3 implementation: Returns undefined for non-plans files
 * Later phases (S44+) will implement actual decoration logic based on frontmatter.
 *
 * @param uri - File URI to decorate
 * @returns FileDecoration or undefined (no decoration)
 */
provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
  // Filter: Only decorate files in plans/ directory
  if (!this.isInPlansDirectory(uri)) {
    // Silent return (no logging) - reduces noise for non-plans files
    return undefined;
  }

  // Log decoration attempts for plans/ files (debugging)
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const relativePath = workspaceFolder
    ? uri.fsPath.substring(workspaceFolder.uri.fsPath.length + 1)
    : uri.fsPath;

  this.outputChannel.appendLine(`[DECORATION] Processing: ${relativePath}`);

  // Phase 3: Return undefined (no decoration yet)
  // S44+: Implement actual decoration logic here
  return undefined;
}
```

**Reference**: See similar workspace folder pattern in `extension.ts:283-286`.

**Expected outcome**: Provider only processes plans/ directory files.

---

### Task 4: Add Edge Case Handling Comments

Document edge cases that the current implementation handles.

**File**: `vscode-extension/src/decorationProvider.ts`

**Code to add** (at end of class, before closing brace):
```typescript
/**
 * EDGE CASES HANDLED:
 *
 * 1. Files outside plans/ directory:
 *    - Handled: isInPlansDirectory() returns false, provideFileDecoration() returns undefined
 *    - Example: specs/S41/plan.md, src/extension.ts, README.md
 *
 * 2. Files without frontmatter:
 *    - Handled: Phase 3 returns undefined for all files (no frontmatter parsing yet)
 *    - Future: S44 will call cache.get() and return undefined if frontmatter missing
 *
 * 3. Non-markdown files in plans/:
 *    - Handled: Phase 3 returns undefined (no decoration)
 *    - Future: S43 will add file type detection, S44 will filter to .md files
 *
 * 4. Provider called before cache ready:
 *    - Handled: Phase 3 doesn't use cache (returns undefined)
 *    - Future: S44 will add guard clause (if !cache, return undefined)
 *
 * 5. Concurrent decoration requests:
 *    - Handled: provideFileDecoration() is synchronous (returns undefined immediately)
 *    - Future: S44 will use async cache.get(), VSCode handles concurrent promises
 *
 * 6. Invalid/deleted files:
 *    - Handled: isInPlansDirectory() doesn't check file existence, just path pattern
 *    - Future: S44 cache.get() will return null for deleted files (handled gracefully)
 *
 * 7. Symbolic links in plans/:
 *    - Handled: uri.fsPath resolves to target path, decoration applies to target
 *    - No special handling needed
 *
 * 8. Case sensitivity (Windows vs Linux):
 *    - Handled: normalizePath() converts to lowercase for consistent comparison
 *    - Works correctly on both case-sensitive (Linux) and case-insensitive (Windows) filesystems
 */
```

**Expected outcome**: Edge case handling documented for future reference.

---

### Task 5: Compile and Verify No Errors

Run TypeScript compiler to verify all changes compile correctly.

**Command to run**:
```bash
cd vscode-extension && npm run compile
```

**Expected output**: No TypeScript errors.

**Validation**:
- ✅ `normalizePath()` function compiles
- ✅ `isInPlansDirectory()` method compiles
- ✅ Updated `provideFileDecoration()` compiles
- ✅ All strict mode checks pass

---

### Task 6: Manual Test - Plans Directory Files

Test that provider processes files in `plans/` directory.

**Steps**:
1. Launch Extension Development Host (F5)
2. Open Lineage workspace
3. Open Output panel → "Lineage Planning" channel
4. Navigate to `plans/` folder in explorer
5. Open several story files (e.g., `story-41-*.md`)

**Expected output** (in output channel):
```
[DECORATION] Processing: plans/epic-03-vscode-planning-extension/feature-12-plans-visualization/story-41-file-decoration-provider-foundation.md
[DECORATION] Processing: plans/epic-03-vscode-planning-extension/feature-12-plans-visualization/story-42-status-icon-mapping.md
[DECORATION] Processing: plans/epic-03-vscode-planning-extension/feature-12-plans-visualization/feature.md
```

**Validation**:
- ✅ Logs appear for plans/ directory files
- ✅ Relative paths displayed (not full paths)
- ✅ No errors or crashes

---

### Task 7: Manual Test - Non-Plans Directory Files

Test that provider ignores files outside `plans/` directory.

**Steps**:
1. With Extension Development Host running
2. Navigate to `specs/` folder in explorer
3. Open several spec files (e.g., `S40-*/plan.md`)
4. Navigate to `src/` folder
5. Open source files (e.g., `extension.ts`, `cache.ts`)

**Expected output** (in output channel):
```
(No new decoration logs should appear)
```

**Validation**:
- ✅ No logs for specs/ directory files
- ✅ No logs for src/ directory files
- ✅ No logs for root-level files (README.md, package.json, etc.)
- ✅ No errors or crashes

---

### Task 8: Manual Test - Mixed Navigation

Test that provider correctly differentiates between plans/ and non-plans/ files.

**Steps**:
1. With Extension Development Host running
2. Navigate rapidly between:
   - `plans/` folder (should log)
   - `specs/` folder (should not log)
   - `vscode-extension/src/` folder (should not log)
   - Back to `plans/` folder (should log again)

**Expected output** (in output channel):
```
[DECORATION] Processing: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-40-frontmatter-cache-layer.md
(No logs for specs/ or src/)
[DECORATION] Processing: plans/epic-03-vscode-planning-extension/feature-12-plans-visualization/story-41-file-decoration-provider-foundation.md
```

**Validation**:
- ✅ Logs appear only for plans/ files
- ✅ Navigation to non-plans folders produces no logs
- ✅ Returning to plans/ folder resumes logging
- ✅ No errors or crashes during rapid navigation

---

### Task 9: Manual Test - Edge Cases

Test various edge cases to ensure robust behavior.

**Test cases**:

1. **Subdirectories within plans/**:
   - Navigate to `plans/epic-03/feature-12/`
   - **Expected**: Logs appear for files in subdirectories

2. **Root files in plans/ (if any)**:
   - Navigate to `plans/` root (e.g., `project.md`)
   - **Expected**: Logs appear for root-level plans files

3. **Non-markdown files in plans/ (if any)**:
   - Create temporary `.txt` file in `plans/` (e.g., `notes.txt`)
   - **Expected**: Log appears (provider processes it, returns undefined)
   - Note: S43 will add file type filtering

4. **Empty plans/ directory**:
   - Create temporary empty subdirectory in `plans/` (e.g., `plans/test-empty/`)
   - Navigate to it
   - **Expected**: No logs (no files to process)

5. **Very long paths**:
   - Navigate to deeply nested file in `plans/` (e.g., `plans/epic-03/feature-12/story-41...md`)
   - **Expected**: Log appears with full relative path

**Validation**:
- ✅ All test cases pass
- ✅ No errors or crashes
- ✅ Provider behavior matches expectations

---

### Task 10: Manual Test - Performance

Verify provider doesn't cause performance issues with large directories.

**Steps**:
1. With Extension Development Host running
2. Open `plans/` folder in explorer
3. Expand all subdirectories (epic folders, feature folders)
4. Observe responsiveness

**Validation**:
- ✅ Explorer navigation remains responsive
- ✅ No noticeable lag when expanding folders
- ✅ Decoration logs appear without delay
- ✅ Output channel doesn't get overwhelmed with logs

**Performance notes**:
- Phase 3 implementation is synchronous and fast (path checking only)
- Future phases (S44+) will add async cache lookups - performance monitored then
- Current implementation has minimal performance impact

---

### Task 11: Verify No Visual Decorations Yet

Confirm that no visual decorations appear (since we return undefined).

**Steps**:
1. With Extension Development Host running
2. Navigate through `plans/` folder in explorer
3. Observe file icons and badges

**Expected**:
- Files display default VSCode icons (no status icons)
- No badges visible on any files
- Git status decorations (if present) remain unchanged

**Validation**:
- ✅ No custom decorations visible
- ✅ Default file icons displayed
- ✅ No visual conflicts with git decorations

**Note**: S44 will add actual status icon decorations.

---

## Completion Criteria

✅ `normalizePath()` helper function implemented
✅ `isInPlansDirectory()` method implemented
✅ `provideFileDecoration()` updated with path filtering
✅ Edge case handling documented
✅ TypeScript compiles without errors
✅ Manual test: Plans directory files logged correctly
✅ Manual test: Non-plans directory files ignored
✅ Manual test: Mixed navigation works correctly
✅ Manual test: All edge cases pass
✅ Manual test: No performance issues
✅ Manual test: No visual decorations appear yet
✅ Provider safely handles all scenarios without crashes

## Implementation Complete

S41 is now complete. The `PlansDecorationProvider` is fully functional as a foundation:
- ✅ Provider class implements `FileDecorationProvider` interface
- ✅ Provider registered in extension with proper disposal
- ✅ Provider filters to plans/ directory only
- ✅ Provider logs activity to output channel
- ✅ Provider handles all edge cases safely
- ✅ Ready for S42 to add status icon mapping

## Next Story

**S42: Status Icon Mapping** - Map frontmatter status values to visual icons
- Define icon system for all status types
- Create status-to-icon mapping function
- Ensure icons work in light and dark themes
