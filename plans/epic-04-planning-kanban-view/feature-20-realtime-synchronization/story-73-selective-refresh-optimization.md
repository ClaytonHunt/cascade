---
item: S73
title: Selective Refresh Optimization
type: story
parent: F20
status: Completed
priority: Medium
dependencies: [S71, S72]
estimate: M
created: 2025-10-17
updated: 2025-10-22
spec: specs/S73-selective-refresh-optimization/
---

# S73 - Selective Refresh Optimization

## Description

Optimize TreeView refresh performance by implementing selective refresh strategies based on the type of file change detected. Instead of always performing a full tree refresh, detect whether changes require full rebuild (structure changes) or can use partial refresh (content changes), significantly improving performance for large repositories.

Currently (after S71-S72), all file changes trigger a full TreeView refresh (`_onDidChangeTreeData.fire(undefined)`), which rebuilds the entire tree structure even for minor changes like updating a single item's title or description. For large repositories (100+ items), this can cause noticeable lag.

This story implements intelligent refresh strategies:
- **Full Refresh**: Structure changes (file add/delete, status changes affecting grouping)
- **Partial Refresh**: Content changes (title, description, non-status frontmatter)
- **No Refresh**: Changes to non-frontmatter content (body text, acceptance criteria)

### The Problem

**Current Behavior (Full Refresh Always):**
```
User edits Story 49 title: "Core Implementation" → "Core TreeView Implementation"
  ↓
FileSystemWatcher detects change
  ↓
Full TreeView refresh
  ↓
Reload all 100+ planning items
  ↓
Rebuild entire hierarchy
  ↓
Rebuild all status groups
  ↓
Re-render all tree nodes
  ↓
Time: ~500ms for 100 items
```

**Impact:**
- Editing single title causes 500ms refresh lag
- Users experience UI freeze during refresh
- Wasted CPU rebuilding unchanged hierarchy
- Poor experience for large repositories

**Desired Behavior (Selective Refresh):**
```
User edits Story 49 title
  ↓
FileSystemWatcher detects change
  ↓
Detect change type: CONTENT (title changed, status unchanged)
  ↓
Partial TreeView refresh (fire with specific item)
  ↓
Re-render only Story 49 node
  ↓
Time: ~10ms
```

### The Solution

**Change Detection Strategy:**
```typescript
enum ChangeType {
  STRUCTURE,  // File added/deleted, status changed (affects grouping)
  CONTENT,    // Title/priority changed (affects display but not structure)
  BODY        // Non-frontmatter content changed (no UI impact)
}

async function detectChangeType(uri: vscode.Uri, cache: FrontmatterCache): Promise<ChangeType> {
  // Get cached data (before invalidation)
  const oldData = cache.get(uri.fsPath);

  // Invalidate cache and re-parse
  cache.invalidate(uri.fsPath);
  const newData = await cache.get(uri.fsPath);

  // File created or deleted
  if (!oldData || !newData) {
    return ChangeType.STRUCTURE;
  }

  // Status changed (affects status group membership)
  if (oldData.status !== newData.status) {
    return ChangeType.STRUCTURE;
  }

  // Priority or title changed (affects display)
  if (oldData.priority !== newData.priority || oldData.title !== newData.title) {
    return ChangeType.CONTENT;
  }

  // Only body content changed (no frontmatter changes)
  return ChangeType.BODY;
}
```

**Refresh Strategy:**
```typescript
async function handleFileChange(uri: vscode.Uri): Promise<void> {
  const changeType = await detectChangeType(uri, cache);

  switch (changeType) {
    case ChangeType.STRUCTURE:
      // Full refresh needed (status groups may change)
      treeProvider.scheduleRefresh();
      outputChannel.appendLine('[TreeView] Full refresh scheduled (structure change)');
      break;

    case ChangeType.CONTENT:
      // Partial refresh (update specific item)
      const item = treeProvider.findItemByPath(uri.fsPath);
      if (item) {
        treeProvider.scheduleRefresh(item);
        outputChannel.appendLine(`[TreeView] Partial refresh scheduled (content change: ${item.label})`);
      }
      break;

    case ChangeType.BODY:
      // No refresh needed (body content doesn't affect TreeView)
      outputChannel.appendLine('[TreeView] Refresh skipped (body-only change)');
      break;
  }
}
```

## Acceptance Criteria

### Change Detection
- [ ] Status changes detected as STRUCTURE (full refresh)
- [ ] File creation detected as STRUCTURE (full refresh)
- [ ] File deletion detected as STRUCTURE (full refresh)
- [ ] Title changes detected as CONTENT (partial refresh)
- [ ] Priority changes detected as CONTENT (partial refresh)
- [ ] Description changes detected as BODY (no refresh)
- [ ] Acceptance criteria changes detected as BODY (no refresh)

### Refresh Strategies
- [ ] Full refresh rebuilds entire tree structure
- [ ] Partial refresh updates only changed item
- [ ] Body-only changes skip refresh entirely
- [ ] Partial refresh falls back to full refresh if item not found
- [ ] Multiple partial refreshes batched with debouncing

### Performance
- [ ] Full refresh completes in < 500ms (100 items)
- [ ] Partial refresh completes in < 50ms (single item)
- [ ] Body-only changes cause 0ms refresh overhead
- [ ] Change detection overhead < 10ms per file
- [ ] Memory usage stable (no cache leaks)

### Logging
- [ ] Log change type detection: `[ChangeDetect] Status changed: Ready → In Progress (STRUCTURE)`
- [ ] Log refresh strategy: `[TreeView] Full refresh scheduled (structure change)`
- [ ] Log refresh strategy: `[TreeView] Partial refresh scheduled (content change: S49)`
- [ ] Log skipped refreshes: `[TreeView] Refresh skipped (body-only change)`
- [ ] Log change detection timing (for performance analysis)

### Edge Cases
- [ ] File created with no cached data (STRUCTURE)
- [ ] File deleted (cache returns null) (STRUCTURE)
- [ ] Malformed frontmatter after edit (log error, full refresh)
- [ ] Concurrent changes to same file (last change wins)
- [ ] Change detection during cache invalidation (race condition handled)

## Analysis Summary

### Technical Implementation

#### 1. Change Detection Utilities

**File:** `vscode-extension/src/utils/changeDetection.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { FrontmatterCache } from '../cache/FrontmatterCache';
import { PlanningItem } from '../types';

export enum ChangeType {
  STRUCTURE = 'STRUCTURE',  // Affects tree structure (status, add/delete)
  CONTENT = 'CONTENT',      // Affects display (title, priority)
  BODY = 'BODY'             // No UI impact (description, body content)
}

export interface ChangeDetectionResult {
  type: ChangeType;
  oldData?: PlanningItem;
  newData?: PlanningItem;
  changedFields: string[];
}

/**
 * Detects the type of change made to a markdown file.
 *
 * Strategy:
 * 1. Retrieve cached frontmatter before invalidation (oldData)
 * 2. Invalidate cache and re-parse file (newData)
 * 3. Compare frontmatter fields to determine change type
 * 4. Return ChangeType + metadata
 *
 * @param uri - URI of changed file
 * @param cache - FrontmatterCache instance
 * @returns ChangeDetectionResult with type and changed fields
 */
export async function detectChangeType(
  uri: vscode.Uri,
  cache: FrontmatterCache,
  outputChannel: vscode.OutputChannel
): Promise<ChangeDetectionResult> {
  const startTime = Date.now();
  const filePath = uri.fsPath;

  // Get cached data (before invalidation)
  const oldData = cache.get(filePath);

  // Invalidate cache and re-parse
  cache.invalidate(filePath);
  const newData = await cache.get(filePath);

  const duration = Date.now() - startTime;
  outputChannel.appendLine(`[ChangeDetect] Analyzed in ${duration}ms: ${filePath}`);

  // File created (no old data)
  if (!oldData && newData) {
    outputChannel.appendLine(`[ChangeDetect] File created (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      newData,
      changedFields: ['created']
    };
  }

  // File deleted (no new data)
  if (oldData && !newData) {
    outputChannel.appendLine(`[ChangeDetect] File deleted (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      changedFields: ['deleted']
    };
  }

  // Both null (error state)
  if (!oldData && !newData) {
    outputChannel.appendLine(`[ChangeDetect] ⚠️  No data (STRUCTURE fallback)`);
    return {
      type: ChangeType.STRUCTURE,
      changedFields: []
    };
  }

  // Detect changed frontmatter fields
  const changedFields: string[] = [];

  if (oldData!.status !== newData!.status) {
    changedFields.push('status');
  }
  if (oldData!.priority !== newData!.priority) {
    changedFields.push('priority');
  }
  if (oldData!.title !== newData!.title) {
    changedFields.push('title');
  }
  if (oldData!.item !== newData!.item) {
    changedFields.push('item');
  }
  if (JSON.stringify(oldData!.dependencies) !== JSON.stringify(newData!.dependencies)) {
    changedFields.push('dependencies');
  }

  // Status change → STRUCTURE (affects status group membership)
  if (changedFields.includes('status')) {
    outputChannel.appendLine(
      `[ChangeDetect] Status changed: ${oldData!.status} → ${newData!.status} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // Item number change → STRUCTURE (affects hierarchy position)
  if (changedFields.includes('item')) {
    outputChannel.appendLine(
      `[ChangeDetect] Item number changed: ${oldData!.item} → ${newData!.item} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // Dependencies change → STRUCTURE (may affect hierarchy)
  if (changedFields.includes('dependencies')) {
    outputChannel.appendLine(
      `[ChangeDetect] Dependencies changed (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // Title or priority change → CONTENT (affects display)
  if (changedFields.includes('title') || changedFields.includes('priority')) {
    outputChannel.appendLine(
      `[ChangeDetect] Display fields changed: ${changedFields.join(', ')} (CONTENT)`
    );
    return {
      type: ChangeType.CONTENT,
      oldData,
      newData,
      changedFields
    };
  }

  // No frontmatter changes → BODY (description, acceptance criteria, etc.)
  if (changedFields.length === 0) {
    outputChannel.appendLine(`[ChangeDetect] Body-only change (BODY)`);
    return {
      type: ChangeType.BODY,
      oldData,
      newData,
      changedFields: []
    };
  }

  // Unknown change → STRUCTURE (safe fallback)
  outputChannel.appendLine(
    `[ChangeDetect] ⚠️  Unknown changes: ${changedFields.join(', ')} (STRUCTURE fallback)`
  );
  return {
    type: ChangeType.STRUCTURE,
    oldData,
    newData,
    changedFields
  };
}
```

#### 2. Enhanced PlanningTreeProvider with Selective Refresh

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**New Method: Partial Refresh**
```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  // ... existing code ...

  /**
   * Schedules a full TreeView refresh (entire tree rebuilt).
   */
  scheduleRefresh(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Refresh debounced (timer reset)');
    }

    this.refreshDebounceTimer = setTimeout(() => {
      this.refresh();
      this.refreshDebounceTimer = undefined;
    }, this.debounceDelay);

    this.outputChannel.appendLine(`[TreeView] Full refresh scheduled in ${this.debounceDelay}ms`);
  }

  /**
   * Schedules a partial TreeView refresh (single item updated).
   *
   * @param item - Specific TreeNode to refresh
   */
  schedulePartialRefresh(item: TreeNode): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Partial refresh debounced (timer reset)');
    }

    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshPartial(item);
      this.refreshDebounceTimer = undefined;
    }, this.debounceDelay);

    const label = 'label' in item ? item.label : item.status;
    this.outputChannel.appendLine(
      `[TreeView] Partial refresh scheduled in ${this.debounceDelay}ms: ${label}`
    );
  }

  /**
   * Immediately refreshes entire TreeView (bypasses debounce).
   */
  refresh(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
    }

    this.outputChannel.appendLine('[TreeView] Refreshing TreeView (full)...');
    this.allItemsCache = null;
    this.hierarchyCache.clear();
    this.progressCache.clear();
    this._onDidChangeTreeData.fire(undefined); // undefined = full refresh
    this.outputChannel.appendLine('[TreeView] Full refresh complete');
  }

  /**
   * Immediately refreshes a specific TreeView item (bypasses debounce).
   *
   * @param item - Specific TreeNode to refresh
   */
  refreshPartial(item: TreeNode): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
    }

    const label = 'label' in item ? item.label : item.status;
    this.outputChannel.appendLine(`[TreeView] Refreshing TreeView (partial: ${label})...`);

    // Clear item from cache (will re-parse on next getTreeItem call)
    if ('filePath' in item && item.filePath) {
      this.cache.invalidate(item.filePath);
    }

    // Fire change event for specific item
    this._onDidChangeTreeData.fire(item);
    this.outputChannel.appendLine('[TreeView] Partial refresh complete');
  }

  /**
   * Finds a TreeNode by file path.
   *
   * @param filePath - Absolute file path
   * @returns TreeNode if found, undefined otherwise
   */
  async findItemByPath(filePath: string): Promise<TreeNode | undefined> {
    const items = await this.loadAllPlanningItems();
    return items.find(item => item.filePath === filePath);
  }
}
```

#### 3. Update FileSystemWatcher with Change Detection

**File:** `vscode-extension/src/extension.ts`

**Enhanced Event Handlers:**
```typescript
import { detectChangeType, ChangeType } from './utils/changeDetection';

function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider,
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher('**/plans/**/*.md');

  planWatcher.onDidCreate(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File created: ${relativePath}`);

    // File creation always requires full refresh (STRUCTURE)
    cache.invalidate(uri.fsPath);
    treeProvider.scheduleRefresh();
  });

  planWatcher.onDidChange(async uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

    // Detect change type
    const result = await detectChangeType(uri, cache, outputChannel);

    switch (result.type) {
      case ChangeType.STRUCTURE:
        // Full refresh needed (status groups may reorganize)
        treeProvider.scheduleRefresh();
        break;

      case ChangeType.CONTENT:
        // Partial refresh (update specific item)
        const item = await treeProvider.findItemByPath(uri.fsPath);
        if (item) {
          treeProvider.schedulePartialRefresh(item);
        } else {
          // Item not found, fall back to full refresh
          outputChannel.appendLine(
            `[ChangeDetect] ⚠️  Item not found for ${relativePath}, falling back to full refresh`
          );
          treeProvider.scheduleRefresh();
        }
        break;

      case ChangeType.BODY:
        // No refresh needed (body content doesn't affect TreeView)
        outputChannel.appendLine('[TreeView] Refresh skipped (body-only change)');
        break;
    }
  });

  planWatcher.onDidDelete(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File deleted: ${relativePath}`);

    // File deletion always requires full refresh (STRUCTURE)
    cache.invalidate(uri.fsPath);
    treeProvider.scheduleRefresh();
  });

  return [planWatcher];
}
```

### Performance Analysis

**Test Scenario: Edit Title (100 items total)**

**Before S73 (Full Refresh Always):**
- Change detection: 0ms (no detection)
- Cache invalidation: 1ms
- Reload all items: 150ms
- Rebuild hierarchy: 100ms
- Rebuild status groups: 50ms
- Re-render tree: 200ms
- **Total: ~500ms**

**After S73 (Selective Refresh):**
- Change detection: 5ms
- Cache invalidation: 1ms
- Reload single item: 2ms
- Re-render single node: 10ms
- **Total: ~18ms (27× faster)**

**Test Scenario: Change Status (100 items total)**

**Before S73:**
- Total: ~500ms

**After S73:**
- Change detection: 5ms (detects STRUCTURE)
- Full refresh: 500ms
- **Total: ~505ms (no optimization, as expected)**

**Memory Usage:**
- Change detection: +2KB per change (ChangeDetectionResult object)
- Partial refresh: No additional memory (reuses existing cache)
- Full refresh: Same as before

### Edge Cases

**Race Condition: Concurrent Changes to Same File**
```typescript
// File changes twice within 100ms
// Change 1: Title edit (CONTENT) - schedules partial refresh at t=300ms
// Change 2: Status edit (STRUCTURE) - cancels partial, schedules full refresh at t=350ms
// Result: Full refresh at t=350ms (correct, status change takes precedence)
```

**Malformed Frontmatter After Edit:**
```typescript
// User introduces YAML syntax error
// detectChangeType() returns newData = null
// Falls back to STRUCTURE (full refresh)
// TreeView rebuilds, skips malformed item
// User sees warning in output channel
```

**Partial Refresh Fallback:**
```typescript
// findItemByPath() returns undefined (item moved or deleted)
// Falls back to full refresh (safe)
// Logs warning to output channel
```

## Test Strategy

### Unit Tests

**Change Detection Tests:**
```typescript
test('status change detected as STRUCTURE', async () => {
  const oldData = { status: 'Ready', title: 'Test' };
  const newData = { status: 'In Progress', title: 'Test' };

  cache.get.mockReturnValueOnce(oldData).mockReturnValueOnce(newData);

  const result = await detectChangeType(uri, cache, outputChannel);

  expect(result.type).toBe(ChangeType.STRUCTURE);
  expect(result.changedFields).toContain('status');
});

test('title change detected as CONTENT', async () => {
  const oldData = { status: 'Ready', title: 'Old Title' };
  const newData = { status: 'Ready', title: 'New Title' };

  cache.get.mockReturnValueOnce(oldData).mockReturnValueOnce(newData);

  const result = await detectChangeType(uri, cache, outputChannel);

  expect(result.type).toBe(ChangeType.CONTENT);
  expect(result.changedFields).toContain('title');
});

test('no frontmatter change detected as BODY', async () => {
  const oldData = { status: 'Ready', title: 'Test' };
  const newData = { status: 'Ready', title: 'Test' };

  cache.get.mockReturnValueOnce(oldData).mockReturnValueOnce(newData);

  const result = await detectChangeType(uri, cache, outputChannel);

  expect(result.type).toBe(ChangeType.BODY);
  expect(result.changedFields).toHaveLength(0);
});

test('file creation detected as STRUCTURE', async () => {
  cache.get.mockReturnValueOnce(null).mockReturnValueOnce({ status: 'Ready' });

  const result = await detectChangeType(uri, cache, outputChannel);

  expect(result.type).toBe(ChangeType.STRUCTURE);
  expect(result.changedFields).toContain('created');
});
```

**Partial Refresh Tests:**
```typescript
test('schedulePartialRefresh() fires event for specific item', async () => {
  const item = createMockPlanningItem();
  const fireSpy = jest.spyOn(treeProvider['_onDidChangeTreeData'], 'fire');

  treeProvider.schedulePartialRefresh(item);

  await new Promise(resolve => setTimeout(resolve, 350));

  expect(fireSpy).toHaveBeenCalledWith(item);
});

test('refreshPartial() bypasses debounce', () => {
  const item = createMockPlanningItem();
  const fireSpy = jest.spyOn(treeProvider['_onDidChangeTreeData'], 'fire');

  treeProvider.refreshPartial(item);

  expect(fireSpy).toHaveBeenCalledWith(item);
});
```

### Integration Tests

**End-to-End Selective Refresh:**
1. Install extension in test workspace
2. Open Cascade TreeView
3. Edit story markdown file (change title only)
4. Verify output channel shows: `[ChangeDetect] Display fields changed: title (CONTENT)`
5. Verify output channel shows: `[TreeView] Partial refresh scheduled...`
6. Verify TreeView updates single item (not entire tree)
7. Verify refresh completes in < 50ms (check logs)

**Full Refresh Fallback:**
1. Edit story markdown file (change status)
2. Verify output channel shows: `[ChangeDetect] Status changed: Ready → In Progress (STRUCTURE)`
3. Verify output channel shows: `[TreeView] Full refresh scheduled...`
4. Verify TreeView rebuilds entire tree

### Manual Testing Checklist

**Performance Verification:**
- [ ] Open Cascade output channel
- [ ] Open 100+ item workspace
- [ ] Edit single story title
- [ ] Verify partial refresh logs
- [ ] Verify refresh time < 50ms (check timestamp delta)
- [ ] Edit single story status
- [ ] Verify full refresh logs
- [ ] Verify refresh time ~500ms

**Change Detection Accuracy:**
- [ ] Edit title only → CONTENT
- [ ] Edit priority only → CONTENT
- [ ] Edit status only → STRUCTURE
- [ ] Edit description only → BODY
- [ ] Edit acceptance criteria only → BODY
- [ ] Edit multiple frontmatter fields → STRUCTURE (if status changed) or CONTENT

**Fallback Verification:**
- [ ] Delete file while TreeView open → Full refresh
- [ ] Introduce YAML syntax error → Full refresh
- [ ] Change item number → Full refresh (STRUCTURE)

## Dependencies

**Required:**
- **S71 (FileSystemWatcher to TreeView Integration)** - Provides onChange event handlers
- **S72 (Debounced Refresh Mechanism)** - Provides debouncing infrastructure

**Blocks:**
- None (S74 can be implemented independently)

## Future Enhancements

**Not in Scope for S73:**
- Hash-based change detection (compare file hashes to skip parsing)
- Change detection for specs directory (currently only plans/)
- Configurable change detection (user-defined STRUCTURE vs CONTENT fields)
- Partial refresh for parent items when child changes
- Animation/transitions for partial refreshes

**Potential Future Stories:**
- S72: Hash-based change detection optimization
- S73: User-configurable change detection rules
- S74: Visual feedback for partial vs full refresh
