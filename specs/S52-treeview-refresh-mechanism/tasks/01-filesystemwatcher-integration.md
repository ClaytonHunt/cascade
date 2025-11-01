---
spec: S52
phase: 1
title: FileSystemWatcher Integration
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: FileSystemWatcher Integration

## Overview

Modify the existing FileSystemWatcher event handlers to trigger TreeView refresh after cache operations. This phase integrates the PlanningTreeProvider refresh mechanism with the debounced file system monitoring infrastructure.

## Prerequisites

- S49 (PlanningTreeProvider) completed - refresh() method exists
- S38 (FileSystemWatcher) completed - watchers monitoring plans/
- S40 (FrontmatterCache) completed - cache invalidation working
- Module-level `planningTreeProvider` reference exists (extension.ts:23)

## Tasks

### Task 1: Add Refresh Call to handleCreate Handler

**File**: `vscode-extension/src/extension.ts`
**Location**: Line 339-342 (inside handleCreate function)

**Current Code**:
```typescript
const handleCreate = (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically
};
```

**Modification**: Add refresh call after existing comment
```typescript
const handleCreate = (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically

  // Refresh TreeView to show new file
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};
```

**Rationale**:
- New files should appear in TreeView immediately (after debounce)
- No cache invalidation needed since file is not yet cached
- Null check prevents errors if provider not initialized

**Expected Outcome**: Creating a new .md file in plans/ triggers TreeView refresh after 300ms debounce delay.

---

### Task 2: Add Refresh Call to handleChange Handler

**File**: `vscode-extension/src/extension.ts`
**Location**: Line 344-347 (inside handleChange function)

**Current Code**:
```typescript
const handleChange = (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);
};
```

**Modification**: Add refresh call after cache invalidation
```typescript
const handleChange = (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to show updated data
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};
```

**Rationale**:
- Cache invalidation must happen first (ensures fresh data loaded)
- Refresh triggers getChildren() which calls cache.get()
- cache.get() re-parses file since entry was invalidated
- TreeView displays updated frontmatter data

**Expected Outcome**: Editing a file's frontmatter (e.g., changing status) updates TreeView display after 300ms debounce delay.

---

### Task 3: Add Refresh Call to handleDelete Handler

**File**: `vscode-extension/src/extension.ts`
**Location**: Line 349-352 (inside handleDelete function)

**Current Code**:
```typescript
const handleDelete = (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);
};
```

**Modification**: Add refresh call after cache invalidation
```typescript
const handleDelete = (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to remove deleted file
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};
```

**Rationale**:
- Cache invalidation removes stale entry from cache
- Refresh triggers getChildren() which scans plans/ directory
- Deleted file not found in scan, so removed from tree
- Prevents showing deleted items in TreeView

**Expected Outcome**: Deleting a file removes it from TreeView after 300ms debounce delay.

---

### Task 4: Add Refresh Event Logging

**File**: `vscode-extension/src/extension.ts`
**Location**: Line 284-307 (inside createDebouncedHandler, after handler execution)

**Current Code** (line 286-288):
```typescript
const timer = setTimeout(() => {
  // Timer fired - process event

  // Execute handler
  handler(uri);

  // Log event with timestamp and relative path
  const timestamp = new Date().toLocaleTimeString();
  // ... existing logging ...
```

**Modification**: Add refresh-specific logging after handler execution
```typescript
const timer = setTimeout(() => {
  // Timer fired - process event

  // Execute handler
  handler(uri);

  // Log TreeView refresh trigger (if provider exists)
  if (planningTreeProvider && eventType !== 'FILE_CREATED') {
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (triggered by ${eventType})`);
  } else if (planningTreeProvider && eventType === 'FILE_CREATED') {
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (new file added)`);
  }

  // Log event with timestamp and relative path
  const timestamp = new Date().toLocaleTimeString();
  // ... existing logging ...
```

**Rationale**:
- Provides visibility into refresh behavior for debugging
- Shows cause-and-effect relationship between file events and refreshes
- Helps diagnose issues with automatic refresh not working
- Matches existing output channel logging pattern

**Alternative Simpler Approach** (Recommended):
Add logging inside each handler after refresh() call instead:

```typescript
// In handleCreate
if (planningTreeProvider) {
  planningTreeProvider.refresh();
  outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (new file)`);
}

// In handleChange
if (planningTreeProvider) {
  planningTreeProvider.refresh();
  outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file changed)`);
}

// In handleDelete
if (planningTreeProvider) {
  planningTreeProvider.refresh();
  outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file deleted)`);
}
```

**Expected Outcome**: Output channel shows refresh events with timestamps and trigger reasons.

---

## Completion Criteria

- [ ] handleCreate handler calls refresh() after debounce
- [ ] handleChange handler calls refresh() after cache invalidation
- [ ] handleDelete handler calls refresh() after cache invalidation
- [ ] All handlers check planningTreeProvider null safety
- [ ] Refresh events logged to output channel with timestamps
- [ ] Code compiles without errors
- [ ] Manual testing: Create file → TreeView updates
- [ ] Manual testing: Edit file → TreeView updates
- [ ] Manual testing: Delete file → TreeView updates
- [ ] Output channel shows refresh log entries

## Testing Instructions

### Test 1: File Creation
1. Open VSCode with Cascade extension active
2. Open "Cascade" output channel (View → Output → Select "Cascade")
3. Create new .md file in plans/ directory with valid frontmatter
4. Wait 300ms (debounce delay)
5. **Verify**: TreeView shows new item
6. **Verify**: Output channel shows "REFRESH: TreeView updated (new file)"

### Test 2: File Modification
1. Open existing .md file in plans/ directory
2. Modify frontmatter (e.g., change status: "Not Started" → "In Progress")
3. Save file
4. Wait 300ms
5. **Verify**: TreeView item updates (description shows new status)
6. **Verify**: Output channel shows "REFRESH: TreeView updated (file changed)"

### Test 3: File Deletion
1. Delete .md file from plans/ directory
2. Wait 300ms
3. **Verify**: Item removed from TreeView
4. **Verify**: Output channel shows "REFRESH: TreeView updated (file deleted)"

### Test 4: Rapid Changes (Debouncing)
1. Open .md file in plans/ directory
2. Make multiple rapid edits (save 5 times in 1 second)
3. Wait 500ms after last save
4. **Verify**: Output channel shows only ONE refresh log entry
5. **Verify**: TreeView shows final state (not intermediate states)

## Next Phase

Proceed to Phase 2: Manual Refresh Command

Phase 2 adds explicit user control with the cascade.refresh command, complementing the automatic refresh implemented in Phase 1.
