---
spec: S56
phase: 1
title: Progress Calculation Core
status: Completed
priority: Medium
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: Progress Calculation Core

## Overview

This phase implements the core progress calculation logic in `PlanningTreeProvider`. It adds a progress cache, calculation methods, and cache invalidation to efficiently compute completion percentages for Epic and Feature items.

**Deliverables**:
1. Progress cache Map added to PlanningTreeProvider
2. `calculateProgress()` method for computing completion stats
3. `getDirectChildren()` helper for finding children in hierarchy
4. Cache invalidation integrated into existing refresh mechanism

## Prerequisites

- S55 (Hierarchical Item Display) completed and working
- Understanding of hierarchy cache structure (Map<Status, HierarchyNode[]>)
- Familiarity with PlanningTreeProvider class structure
- TypeScript interfaces for PlanningTreeItem and HierarchyNode

## Tasks

### Task 1: Add Progress Cache and Interface

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts

**Action**: Add progress cache field and ProgressInfo interface

**Implementation**:

1. Add ProgressInfo interface at top of file (after imports):

```typescript
/**
 * Progress information for a parent item (Epic or Feature).
 *
 * Captures completion statistics and formatted display string
 * for showing progress in TreeView.
 */
interface ProgressInfo {
  /** Number of completed children */
  completed: number;

  /** Total number of children */
  total: number;

  /** Completion percentage (0-100, rounded) */
  percentage: number;

  /** Formatted display string for TreeItem description */
  display: string;  // e.g., "(3/5)" or "(60%)"
}
```

2. Add progress cache field in PlanningTreeProvider class (around line 50, after hierarchyCache):

```typescript
/**
 * Cache for progress calculations by item.
 *
 * Key: Item identifier (e.g., "E4", "F16")
 * Value: Calculated progress information
 *
 * Invalidated when:
 * - File system changes detected (refresh() called)
 * - Hierarchy cache cleared (shares lifecycle)
 *
 * Benefits:
 * - Avoid recalculating progress for visible items
 * - O(1) lookup during getTreeItem() rendering
 * - Minimal memory overhead (~50-100 entries typical)
 */
private progressCache = new Map<string, ProgressInfo>();
```

**Location Reference**: After line 50 in PlanningTreeProvider.ts

**Validation**:
- TypeScript compilation succeeds
- No runtime errors when extension loads
- Cache field visible in class structure

---

### Task 2: Implement getDirectChildren() Helper

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts

**Action**: Add helper method to get direct children of an item

**Implementation**:

Add this method after `findNodeInHierarchy()` (around line 773):

```typescript
/**
 * Returns direct children of an item from the hierarchy.
 *
 * This method extracts the children array from the HierarchyNode
 * corresponding to the given item. Used by progress calculation
 * to count completed children.
 *
 * Children are filtered from cached hierarchy, avoiding file system reads.
 *
 * Examples:
 * - Epic → Features (children in hierarchy)
 * - Feature → Stories/Bugs (children in hierarchy)
 * - Story/Bug → Empty array (leaf nodes)
 *
 * @param item - Parent planning item to get children for
 * @returns Array of child planning items (empty if no children)
 */
private async getDirectChildren(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
  // Get hierarchy for this item's status
  const hierarchy = await this.getHierarchyForStatus(item.status);

  // Find the node for this item
  const node = this.findNodeInHierarchy(hierarchy, item);

  if (!node) {
    this.outputChannel.appendLine(`[Progress] ⚠️  Node not found for ${item.item}`);
    return [];
  }

  // Extract children as PlanningTreeItem array
  return node.children.map(child => child.item);
}
```

**Location Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:773 (after findNodeInHierarchy)

**VSCode API Reference**:
- No VSCode-specific APIs (uses existing hierarchy structure)

**Validation**:
- Method compiles without errors
- Returns empty array for leaf items (story, bug)
- Returns correct children for parent items (epic, feature)

---

### Task 3: Implement calculateProgress() Method

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts

**Action**: Add core progress calculation method

**Implementation**:

Add this method before `getDirectChildren()` (around line 773):

```typescript
/**
 * Calculates progress for a parent item (Epic or Feature).
 *
 * Progress is determined by counting completed children:
 * - Epic: Percentage of Features with status "Completed"
 * - Feature: Percentage of Stories/Bugs with status "Completed"
 *
 * Uses cached hierarchy to avoid file system reads. Returns null
 * if the item has no children (nothing to calculate).
 *
 * Display format: "(completed/total)" - e.g., "(3/5)"
 * Alternative formats commented for future enhancement:
 * - Percentage only: "(60%)"
 * - Combined: "(3/5 - 60%)"
 *
 * @param item - Parent planning item (epic or feature)
 * @returns Progress information, or null if no children
 */
private async calculateProgress(item: PlanningTreeItem): Promise<ProgressInfo | null> {
  // Check cache first for O(1) lookup
  if (this.progressCache.has(item.item)) {
    return this.progressCache.get(item.item)!;
  }

  // Get all direct children of this item
  const children = await this.getDirectChildren(item);

  if (children.length === 0) {
    // No children - no progress to calculate
    return null;
  }

  // Count completed children
  const completed = children.filter(child => child.status === 'Completed').length;
  const total = children.length;
  const percentage = Math.round((completed / total) * 100);

  // Format display string (count format)
  const display = `(${completed}/${total})`;

  // Alternative display formats (for future consideration):
  // const display = `(${percentage}%)`;  // Percentage only
  // const display = `(${completed}/${total} - ${percentage}%)`;  // Combined

  // Build progress info object
  const progress: ProgressInfo = {
    completed,
    total,
    percentage,
    display
  };

  // Cache result for subsequent calls
  this.progressCache.set(item.item, progress);

  this.outputChannel.appendLine(`[Progress] Calculated for ${item.item}: ${display}`);

  return progress;
}
```

**Location Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:773 (before getDirectChildren)

**Implementation Notes**:
- Caches result to avoid redundant calculation during tree refresh
- Counts only direct children (not recursive descendants)
- Considers only status "Completed" as complete (not "Ready" or "In Progress")
- Returns null for items without children (handled gracefully in Phase 2)

**Edge Cases Handled**:
- No children: Returns null (not 0/0)
- All completed: Returns (total/total) with 100%
- None completed: Returns (0/total) with 0%

**Validation**:
- Method compiles and runs without errors
- Cache hit on second call for same item
- Correct calculation for various child counts
- Logs to output channel for debugging

---

### Task 4: Add Cache Invalidation to refresh()

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts:70

**Action**: Clear progress cache when hierarchy refreshes

**Implementation**:

Modify the `refresh()` method to also clear progress cache:

**Current Code** (line 70-74):
```typescript
refresh(): void {
  this.hierarchyCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');
  this._onDidChangeTreeData.fire(undefined);
}
```

**New Code**:
```typescript
refresh(): void {
  this.hierarchyCache.clear();
  this.progressCache.clear();  // Add this line
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');
  this.outputChannel.appendLine('[Progress] Cache cleared');  // Add this line
  this._onDidChangeTreeData.fire(undefined);
}
```

**Location Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:70-74

**Rationale**:
- Progress depends on hierarchy structure and child statuses
- When hierarchy rebuilds, progress must recalculate
- Clearing both caches together ensures consistency
- File watcher triggers refresh() on status changes

**Validation**:
- Both caches clear on refresh() call
- Output channel shows both cache clear messages
- Progress recalculates after file changes

---

### Task 5: Verify Compilation and Initial Testing

**Action**: Compile TypeScript and run basic validation

**Commands**:

```bash
# Navigate to extension directory
cd vscode-extension

# Compile TypeScript
npm run compile

# Check for compilation errors
echo $?  # Should be 0
```

**Manual Testing**:

1. Open VSCode with extension installed
2. Check Output Channel → "Cascade"
3. Verify no errors on extension activation
4. Expand a status group in TreeView
5. Check output for "[Progress] Cache cleared" messages on refresh

**Expected Behavior**:
- TypeScript compiles without errors
- Extension activates successfully
- No runtime exceptions in output channel
- Progress cache field exists but not yet used (Phase 2)

**Validation Checklist**:
- [ ] TypeScript compilation succeeds (no errors)
- [ ] Extension loads without runtime errors
- [ ] Output channel shows cache clearing messages
- [ ] PlanningTreeProvider instantiates correctly
- [ ] No performance regression visible

---

## Completion Criteria

### Code Quality
- [ ] All methods have TSDoc comments following existing conventions
- [ ] Code style matches existing PlanningTreeProvider conventions
- [ ] No TypeScript compilation errors or warnings
- [ ] Cache fields initialized in constructor

### Functionality
- [ ] Progress cache Map created and accessible
- [ ] `calculateProgress()` method implemented and functional
- [ ] `getDirectChildren()` method implemented and returns correct results
- [ ] Cache invalidation integrated into `refresh()` method
- [ ] Both caches clear on refresh

### Testing
- [ ] Manual compilation test passes
- [ ] Extension loads in VSCode without errors
- [ ] Output channel logging works for progress cache
- [ ] No runtime exceptions when expanding tree nodes

### Documentation
- [ ] ProgressInfo interface documented
- [ ] Progress cache field documented with lifecycle notes
- [ ] All methods have clear TSDoc comments
- [ ] Edge cases documented in method comments

## Next Phase

**Phase 2: TreeItem Integration** - Integrate progress calculation into `getTreeItem()` to display progress in TreeView description field. This connects the calculation logic to the user-visible interface.

**Changes in Phase 2**:
- Modify `getTreeItem()` to call `calculateProgress()` for epics/features
- Format description field to include progress display
- Handle null progress gracefully (items without children)
- Visual testing to verify display formatting
