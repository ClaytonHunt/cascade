---
spec: S73
phase: 2
title: Selective Refresh Integration
status: Completed
priority: Medium
created: 2025-10-22
updated: 2025-10-22
---

# Phase 2: Selective Refresh Integration

## Overview

Integrate change detection with PlanningTreeProvider and FileSystemWatcher to enable selective refresh strategies. This phase adds partial refresh capability and routes file changes to the appropriate refresh strategy based on change type.

## Prerequisites

- Phase 1 completed (change detection infrastructure ready)
- Understanding of VSCode TreeDataProvider API
- Familiarity with `_onDidChangeTreeData.fire()` behavior

## Tasks

### Task 1: Add Partial Refresh Methods to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add after existing scheduleRefresh() method

**Add schedulePartialRefresh() method:**

```typescript
/**
 * Schedules a partial TreeView refresh (single item updated) (S73).
 *
 * When only content fields change (title, priority), this method
 * refreshes only the specific item instead of rebuilding the entire tree.
 *
 * Uses the same debounce mechanism as full refresh (S72).
 *
 * @param item - Specific TreeNode to refresh
 */
schedulePartialRefresh(item: TreeNode): void {
  // Clear existing timer if present (reset debounce window)
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.outputChannel.appendLine('[TreeView] Partial refresh debounced (timer reset)');
  }

  // Handle delay=0 case (immediate refresh)
  if (this.debounceDelay === 0) {
    this.outputChannel.appendLine('[TreeView] Debounce disabled (delay=0), refreshing immediately');
    this.refreshPartial(item);
    return;
  }

  // Start new debounce timer
  this.refreshDebounceTimer = setTimeout(() => {
    this.outputChannel.appendLine('[TreeView] Debounce timer expired, executing partial refresh');
    this.refreshPartial(item);
    this.refreshDebounceTimer = undefined;
  }, this.debounceDelay);

  const label = 'label' in item ? item.label : item.status;
  this.outputChannel.appendLine(
    `[TreeView] Partial refresh scheduled in ${this.debounceDelay}ms: ${label}`
  );
}
```

**Expected Outcome:**
- schedulePartialRefresh() method added
- Uses same debounce logic as scheduleRefresh()
- Calls refreshPartial() after debounce delay
- Logging shows which item is scheduled for refresh

---

### Task 2: Add Immediate Partial Refresh Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add after schedulePartialRefresh() method

**Add refreshPartial() method:**

```typescript
/**
 * Immediately refreshes a specific TreeView item (bypasses debounce) (S73).
 *
 * Fires _onDidChangeTreeData event with specific item, causing VSCode
 * to refresh only that item's TreeItem representation.
 *
 * Note: This does NOT rebuild hierarchy or clear caches. Only the
 * TreeItem label/icon/description is updated for the specific item.
 *
 * @param item - Specific TreeNode to refresh
 */
refreshPartial(item: TreeNode): void {
  // Cancel any pending debounced refresh
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.refreshDebounceTimer = undefined;
    this.outputChannel.appendLine('[TreeView] Pending debounced refresh cancelled (manual partial refresh)');
  }

  const label = 'label' in item ? item.label : item.status;
  this.outputChannel.appendLine(`[TreeView] Refreshing TreeView (partial: ${label})...`);

  // Invalidate cache for specific item (will re-parse on next getTreeItem)
  if ('filePath' in item && item.filePath) {
    this.cache.invalidate(item.filePath);
    this.outputChannel.appendLine(`[TreeView] Cache invalidated: ${item.filePath}`);
  }

  // Fire change event for specific item (VSCode will call getTreeItem for this item)
  this._onDidChangeTreeData.fire(item);
  this.outputChannel.appendLine('[TreeView] Partial refresh complete');
}
```

**Expected Outcome:**
- refreshPartial() method added
- Fires _onDidChangeTreeData with specific item (not undefined)
- Invalidates cache for specific item
- Logging confirms partial refresh execution

---

### Task 3: Add Item Lookup Helper Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add after refreshPartial() method

**Add findItemByPath() method:**

```typescript
/**
 * Finds a TreeNode by file path (S73).
 *
 * Searches through all loaded planning items to find the item
 * matching the specified file path.
 *
 * Used by selective refresh to locate the specific item to update.
 *
 * @param filePath - Absolute file path to search for
 * @returns TreeNode if found, undefined otherwise
 */
async findItemByPath(filePath: string): Promise<PlanningTreeItem | undefined> {
  // Load all items from cache (will use cached data if available)
  const items = await this.loadAllPlanningItems();

  // Find item with matching file path
  const item = items.find(item => item.filePath === filePath);

  if (item) {
    this.outputChannel.appendLine(`[TreeView] Found item by path: ${item.label}`);
  } else {
    this.outputChannel.appendLine(`[TreeView] ⚠️  Item not found for path: ${filePath}`);
  }

  return item;
}
```

**Expected Outcome:**
- findItemByPath() method added
- Searches through loaded items
- Returns PlanningTreeItem if found
- Logging confirms search result

---

### Task 4: Update FileSystemWatcher to Use Change Detection

**File:** `vscode-extension/src/extension.ts`

**Location:** Top of file (imports section)

**Add import:**

```typescript
import { detectChangeType, ChangeType } from './utils/changeDetection';
```

**Location:** handleChange event handler (around line 362)

**Replace existing handleChange implementation:**

```typescript
const handleChange = async (uri: vscode.Uri) => {
  const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
  outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

  // Detect change type (S73)
  const result = await detectChangeType(uri, cache, outputChannel);

  switch (result.type) {
    case ChangeType.STRUCTURE:
      // Full refresh needed (status groups may reorganize)
      if (planningTreeProvider) {
        planningTreeProvider.scheduleRefresh();
        outputChannel.appendLine('[TreeView] Full refresh scheduled (structure change)');
      }
      break;

    case ChangeType.CONTENT:
      // Partial refresh (update specific item)
      if (planningTreeProvider) {
        const item = await planningTreeProvider.findItemByPath(uri.fsPath);
        if (item) {
          planningTreeProvider.schedulePartialRefresh(item);
          outputChannel.appendLine(`[TreeView] Partial refresh scheduled (content change)`);
        } else {
          // Item not found, fall back to full refresh
          outputChannel.appendLine(
            `[ChangeDetect] ⚠️  Item not found for ${relativePath}, falling back to full refresh`
          );
          planningTreeProvider.scheduleRefresh();
        }
      }
      break;

    case ChangeType.BODY:
      // No refresh needed (body content doesn't affect TreeView)
      outputChannel.appendLine('[TreeView] Refresh skipped (body-only change)');
      break;
  }
};
```

**Expected Outcome:**
- Import changeDetection utilities
- handleChange uses detectChangeType()
- Routes to appropriate refresh based on ChangeType
- Fallback to full refresh if item not found
- BODY changes skip refresh entirely

---

### Task 5: Verify onCreate and onDelete Handlers

**File:** `vscode-extension/src/extension.ts`

**Location:** handleCreate and handleDelete event handlers

**Verify handleCreate (should already be correct):**

```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh(); // Always full refresh for creation
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: New file detected`);
  }
};
```

**Verify handleDelete (should already be correct):**

```typescript
const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh(); // Always full refresh for deletion
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: File deleted`);
  }
};
```

**Note:** onCreate and onDelete should NOT use change detection - they always trigger full refresh (STRUCTURE changes).

**Expected Outcome:**
- onCreate always calls scheduleRefresh() (no change needed)
- onDelete always calls scheduleRefresh() (no change needed)
- Only handleChange uses change detection

---

### Task 6: Update refresh() Method Documentation

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** refresh() method JSDoc comment

**Update documentation:**

```typescript
/**
 * Refreshes the tree view by firing change event.
 * Causes VSCode to call getChildren() again to reload data.
 * Also clears all caches to reflect file system changes.
 *
 * Cache invalidation order (dependency chain):
 * 1. Items cache (root data source)
 * 2. Hierarchy cache (built from items)
 * 3. Progress cache (built from hierarchy)
 *
 * Enhanced in S59: Triggers status propagation before TreeView refresh
 * to ensure parent statuses are up-to-date when tree renders.
 *
 * Enhanced in S72: Cancels pending debounced refreshes to ensure immediate
 * refresh for user-initiated actions (manual refresh command, button click).
 *
 * Enhanced in S73: Full refresh for STRUCTURE changes. For CONTENT changes,
 * use refreshPartial() instead for better performance.
 *
 * All caches cleared together (simple, safe strategy).
 * File watcher debouncing (300ms) prevents excessive refresh calls.
 */
async refresh(): Promise<void> {
  // ... existing implementation unchanged ...
}
```

**Expected Outcome:**
- Documentation updated to mention S73 partial refresh
- Users understand when to use refresh() vs refreshPartial()

---

## Completion Criteria

### Code Verification
- [ ] schedulePartialRefresh() added to PlanningTreeProvider
- [ ] refreshPartial() added to PlanningTreeProvider
- [ ] findItemByPath() added to PlanningTreeProvider
- [ ] handleChange() uses change detection
- [ ] Appropriate refresh strategy for each ChangeType
- [ ] Fallback to full refresh if item not found
- [ ] onCreate and onDelete unchanged (always full refresh)
- [ ] Documentation updated

### Compilation Verification
- [ ] TypeScript compiles without errors: `npm run compile`
- [ ] No import errors for changeDetection utilities
- [ ] No type errors in updated methods

### Manual Testing Checklist

**Test 1: Content Change (Title)**
- [ ] Open Cascade TreeView
- [ ] Open output channel (View → Output → "Cascade")
- [ ] Edit story markdown file (change title only)
- [ ] Verify output: `[ChangeDetect] Display fields changed: title (CONTENT)`
- [ ] Verify output: `[TreeView] Partial refresh scheduled...`
- [ ] Verify TreeView updates only changed item
- [ ] Verify refresh time < 50ms (check timestamps)

**Test 2: Structure Change (Status)**
- [ ] Edit story markdown file (change status: Ready → In Progress)
- [ ] Verify output: `[ChangeDetect] Status changed: Ready → In Progress (STRUCTURE)`
- [ ] Verify output: `[TreeView] Full refresh scheduled...`
- [ ] Verify TreeView rebuilds (item moves to new status group)
- [ ] Verify refresh time ~500ms

**Test 3: Body Change (Description)**
- [ ] Edit story markdown file (change description/acceptance criteria)
- [ ] Verify output: `[ChangeDetect] Body-only change (BODY)`
- [ ] Verify output: `[TreeView] Refresh skipped (body-only change)`
- [ ] Verify TreeView does NOT refresh (0ms)

**Test 4: File Creation**
- [ ] Create new story markdown file
- [ ] Verify output: `[TreeView] Full refresh scheduled...` (no change detection)
- [ ] Verify TreeView shows new item

**Test 5: File Deletion**
- [ ] Delete story markdown file
- [ ] Verify output: `[TreeView] Full refresh scheduled...` (no change detection)
- [ ] Verify TreeView removes item

**Test 6: Fallback Behavior**
- [ ] Edit file to introduce YAML syntax error
- [ ] Verify fallback to full refresh
- [ ] Verify warning in output channel

**Test 7: Performance Validation**
- [ ] Open workspace with 100+ planning items
- [ ] Edit single story title
- [ ] Record timestamps in output channel
- [ ] Verify partial refresh completes in < 50ms
- [ ] Edit same story status
- [ ] Verify full refresh completes in ~500ms

### Performance Metrics (from output channel logs)
- [ ] Content change (title): < 50ms total
- [ ] Structure change (status): ~505ms total (change detection + full refresh)
- [ ] Body change (description): 0ms (skipped)
- [ ] Change detection overhead: < 10ms per file

## Next Steps

After completing Phase 2:

1. **Package and Install Extension:**
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   # Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   ```

2. **Validation Testing:**
   - Run all manual tests from checklist above
   - Verify performance improvements
   - Check output channel logs for correctness

3. **Mark Story Complete:**
   - Update S73 status: Not Started → Ready → In Progress → Completed
   - Update spec status: Not Started → Completed
   - Commit all changes

4. **Optional Follow-ups:**
   - S74 (Git Operation Detection)
   - Hash-based change detection (future)
   - Configurable change detection rules (future)
