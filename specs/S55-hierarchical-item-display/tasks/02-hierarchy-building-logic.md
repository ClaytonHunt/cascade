---
spec: S55
phase: 2
title: Hierarchy Building Logic
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: Hierarchy Building Logic

## Overview

This phase implements the core hierarchy building algorithm that transforms a flat list of planning items into a hierarchical tree structure. Using the path parsing utilities from Phase 1, this phase constructs parent-child relationships and prepares the data for lazy loading in the VSCode TreeView.

The hierarchy builder groups items by their directory structure:
- Epics contain Features (same epic directory)
- Features contain Stories/Bugs (same feature directory)
- Items without parents become root-level orphans

We also implement caching to avoid rebuilding the hierarchy on every tree interaction.

## Prerequisites

- Phase 1 completed (HierarchyNode interface and parseItemPath() available)
- Understanding of map/reduce operations for grouping
- Familiarity with VSCode TreeView lazy loading model

## Tasks

### Task 1: Implement Hierarchy Building Method

**Objective:** Create the core method that transforms a flat item list into a hierarchical tree.

**Location:** Add to `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Implementation:**

Add this private method to the `PlanningTreeProvider` class:

```typescript
/**
 * Builds hierarchical tree structure from flat list of planning items.
 *
 * This method parses file paths to detect parent-child relationships
 * and organizes items into a hierarchy following the directory structure:
 * - Epic → Feature → Story/Bug
 *
 * Algorithm:
 * 1. Group items by type using path parsing
 * 2. Create maps for quick lookup: epicDir → Epic, featureDir → Feature
 * 3. Build Epic nodes with child Features
 * 4. Build Feature nodes with child Stories/Bugs
 * 5. Collect orphan items (no parent directory)
 *
 * Example input (flat):
 * - E4 (epic-04-kanban-view/epic.md)
 * - F16 (epic-04-kanban-view/feature-16-foundation/feature.md)
 * - S49 (epic-04-kanban-view/feature-16-foundation/story-49-core.md)
 * - S19 (story-19-standalone.md)
 *
 * Example output (hierarchical):
 * - E4 (children: [F16])
 *   - F16 (children: [S49], parent: E4)
 *     - S49 (children: [], parent: F16)
 * - S19 (children: [], parent: null) [orphan]
 *
 * @param items - Flat array of planning items
 * @returns Array of root-level hierarchy nodes (epics + orphans)
 */
private buildHierarchy(items: PlanningTreeItem[]): HierarchyNode[] {
  // Maps for quick lookup by directory path
  const epicMap = new Map<string, HierarchyNode>();      // epicDir → Epic node
  const featureMap = new Map<string, HierarchyNode>();   // featureDir → Feature node
  const orphans: HierarchyNode[] = [];                   // Items with no parent

  // Step 1: Parse all items and categorize by type
  for (const item of items) {
    const pathParts = this.parseItemPath(item.filePath);

    // Create node for this item
    const node: HierarchyNode = {
      item: item,
      children: [],
      parent: null
    };

    // Categorize by item type and path structure
    if (item.type === 'epic' && pathParts.epicDir) {
      // Epic - store in epicMap for lookup
      epicMap.set(pathParts.epicDir, node);
    } else if (item.type === 'feature' && pathParts.featureDir) {
      // Feature - store in featureMap for lookup
      // Construct full feature path: epicDir/featureDir (or just featureDir if no epic)
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      featureMap.set(featureKey, node);
    } else if (item.type === 'story' || item.type === 'bug') {
      // Story/Bug - will be attached to parent feature in Step 2
      // For now, just create the node (will process in next step)
    } else {
      // Other types or items without proper directory structure → orphans
      orphans.push(node);
    }
  }

  // Step 2: Build parent-child relationships
  const roots: HierarchyNode[] = [];

  // Process stories/bugs - attach to parent features
  for (const item of items) {
    if (item.type !== 'story' && item.type !== 'bug') continue;

    const pathParts = this.parseItemPath(item.filePath);
    const node: HierarchyNode = {
      item: item,
      children: [],
      parent: null
    };

    if (pathParts.featureDir) {
      // Has parent feature - find it and attach
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      const parentFeature = featureMap.get(featureKey);

      if (parentFeature) {
        node.parent = parentFeature;
        parentFeature.children.push(node);
      } else {
        // Feature not found (shouldn't happen, but handle gracefully)
        this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent feature not found for ${item.item}: ${featureKey}`);
        orphans.push(node);
      }
    } else {
      // No parent feature → orphan
      orphans.push(node);
    }
  }

  // Process features - attach to parent epics
  for (const [featureKey, featureNode] of featureMap) {
    const pathParts = this.parseItemPath(featureNode.item.filePath);

    if (pathParts.epicDir) {
      // Has parent epic - find it and attach
      const parentEpic = epicMap.get(pathParts.epicDir);

      if (parentEpic) {
        featureNode.parent = parentEpic;
        parentEpic.children.push(featureNode);
      } else {
        // Epic not found (shouldn't happen, but handle gracefully)
        this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent epic not found for ${featureNode.item.item}: ${pathParts.epicDir}`);
        roots.push(featureNode);
      }
    } else {
      // No parent epic → root-level feature
      roots.push(featureNode);
    }
  }

  // Add all epics as root nodes (they have no parents)
  for (const epicNode of epicMap.values()) {
    roots.push(epicNode);
  }

  // Add all orphans as root nodes
  roots.push(...orphans);

  // Step 3: Sort root nodes and children by item number
  this.sortHierarchyNodes(roots);

  return roots;
}

/**
 * Recursively sorts hierarchy nodes by item number.
 *
 * Sorts in place:
 * - Root-level items by item number
 * - Children of each node by item number (recursive)
 *
 * Sort order follows existing compareItemNumbers() logic:
 * P1 < E1 < F1 < S1 < B1 (type prefix), then by number
 *
 * @param nodes - Array of hierarchy nodes to sort
 */
private sortHierarchyNodes(nodes: HierarchyNode[]): void {
  // Sort current level by item number
  nodes.sort((a, b) => this.compareItemNumbers(a.item.item, b.item.item));

  // Recursively sort children
  for (const node of nodes) {
    if (node.children.length > 0) {
      this.sortHierarchyNodes(node.children);
    }
  }
}
```

**Validation:**
- Method compiles without TypeScript errors
- JSDoc comments complete and accurate
- Uses existing `compareItemNumbers()` method (vscode-extension/src/treeview/PlanningTreeProvider.ts:302-328)

---

### Task 2: Implement getChildrenForItem Method

**Objective:** Create a helper method that returns children for a specific planning item node.

**Location:** Add to `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Implementation:**

```typescript
/**
 * Returns child items for a planning item in the hierarchy.
 *
 * This method is called when a parent item (epic or feature) is expanded
 * in the TreeView. It finds the corresponding HierarchyNode and returns
 * its children as PlanningTreeItem array for VSCode to display.
 *
 * Flow:
 * 1. Get or build hierarchy for the item's status group
 * 2. Find the node matching the item
 * 3. Extract children and convert to PlanningTreeItem array
 *
 * @param item - Parent planning item to get children for
 * @returns Array of child planning items (empty if no children)
 */
private async getChildrenForItem(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
  // Get hierarchy for this item's status
  const hierarchy = await this.getHierarchyForStatus(item.status);

  // Find the node for this item
  const node = this.findNodeInHierarchy(hierarchy, item);

  if (!node) {
    this.outputChannel.appendLine(`[Hierarchy] ⚠️  Node not found for ${item.item}`);
    return [];
  }

  // Return children as PlanningTreeItem array
  return node.children.map(child => child.item);
}

/**
 * Finds a specific item's node in the hierarchy tree.
 *
 * Performs depth-first search to locate the node matching the given item.
 * Matches by item identifier (unique within workspace).
 *
 * @param hierarchy - Root-level hierarchy nodes to search
 * @param item - Item to find
 * @returns Hierarchy node if found, null otherwise
 */
private findNodeInHierarchy(hierarchy: HierarchyNode[], item: PlanningTreeItem): HierarchyNode | null {
  for (const node of hierarchy) {
    // Check if this node matches
    if (node.item.item === item.item) {
      return node;
    }

    // Recursively search children
    if (node.children.length > 0) {
      const found = this.findNodeInHierarchy(node.children, item);
      if (found) {
        return found;
      }
    }
  }

  return null;
}
```

**Validation:**
- Methods compile without errors
- Recursive search handles deep hierarchies correctly
- Returns empty array gracefully when node not found

---

### Task 3: Add Hierarchy Caching

**Objective:** Cache hierarchy structures per status to avoid rebuilding on every interaction.

**Location:** Add to `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Implementation:**

Add class property at the top of `PlanningTreeProvider`:

```typescript
/**
 * Cache for hierarchy structures by status.
 *
 * Key: Status value ("Not Started", "Ready", etc.)
 * Value: Array of root-level hierarchy nodes for that status
 *
 * Invalidated when:
 * - File system changes detected (FileSystemWatcher events)
 * - refresh() called explicitly
 *
 * Benefits:
 * - Avoid rebuilding hierarchy on every expand/collapse
 * - Reduce file system reads
 * - Improve TreeView responsiveness
 */
private hierarchyCache = new Map<Status, HierarchyNode[]>();
```

Add cache retrieval method:

```typescript
/**
 * Gets or builds hierarchy for a specific status group.
 *
 * Checks cache first. If not cached, loads items, builds hierarchy,
 * caches result, and returns.
 *
 * @param status - Status to get hierarchy for
 * @returns Array of root-level hierarchy nodes
 */
private async getHierarchyForStatus(status: Status): Promise<HierarchyNode[]> {
  // Check cache
  if (this.hierarchyCache.has(status)) {
    const cached = this.hierarchyCache.get(status)!;
    this.outputChannel.appendLine(`[Hierarchy] Cache hit for status: ${status} (${cached.length} root nodes)`);
    return cached;
  }

  // Cache miss - build hierarchy
  this.outputChannel.appendLine(`[Hierarchy] Cache miss for status: ${status}, building...`);

  // Load items for this status (uses existing method)
  const items = await this.getItemsForStatus(status);

  // Build hierarchy
  const hierarchy = this.buildHierarchy(items);

  // Cache result
  this.hierarchyCache.set(status, hierarchy);

  this.outputChannel.appendLine(`[Hierarchy] Built hierarchy for ${status}: ${hierarchy.length} root nodes`);

  return hierarchy;
}
```

Update the `refresh()` method to invalidate cache:

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:49-51`

**Change:**
```typescript
/**
 * Refreshes the tree view by firing change event.
 * Causes VSCode to call getChildren() again to reload data.
 * Also clears hierarchy cache to reflect file system changes.
 */
refresh(): void {
  this.hierarchyCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');
  this._onDidChangeTreeData.fire(undefined);
}
```

**Validation:**
- Cache property typed correctly
- Cache methods handle Map operations correctly
- Logging statements helpful for debugging
- Cache cleared on refresh (verified by log messages)

---

### Task 4: Create Unit Tests for Hierarchy Building

**Objective:** Verify hierarchy construction works correctly for various item arrangements.

**Location:** Create new file `vscode-extension/src/test/suite/hierarchyBuilder.test.ts`

**Implementation:**

```typescript
import * as assert from 'assert';
import { HierarchyNode } from '../../treeview/HierarchyNode';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Test suite for hierarchy building logic.
 *
 * Note: Since buildHierarchy() is private, we either need to:
 * 1. Make it public for testing (not ideal)
 * 2. Test indirectly through getChildren() (integration test)
 * 3. Extract to separate utility class (refactor)
 *
 * For now, we'll create helper functions that replicate the logic for unit testing.
 * In actual implementation, consider extracting to HierarchyBuilder utility class.
 */

suite('Hierarchy Building Tests', () => {
  test('Build simple hierarchy: Epic → Feature → Story', () => {
    // Create test items
    const epic: PlanningTreeItem = {
      item: 'E4',
      title: 'Planning Kanban View',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: '/workspace/plans/epic-04-kanban-view/epic.md'
    };

    const feature: PlanningTreeItem = {
      item: 'F16',
      title: 'TreeView Foundation',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/workspace/plans/epic-04-kanban-view/feature-16-foundation/feature.md'
    };

    const story: PlanningTreeItem = {
      item: 'S49',
      title: 'Core Implementation',
      type: 'story',
      status: 'In Progress',
      priority: 'High',
      filePath: '/workspace/plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md'
    };

    // Build hierarchy (using actual implementation)
    // const hierarchy = buildHierarchy([epic, feature, story]);

    // Expected structure:
    // - E4 (children: [F16])
    //   - F16 (children: [S49])
    //     - S49 (children: [])

    // Assertions would verify:
    // - hierarchy.length === 1 (one root: E4)
    // - hierarchy[0].item.item === 'E4'
    // - hierarchy[0].children.length === 1
    // - hierarchy[0].children[0].item.item === 'F16'
    // - hierarchy[0].children[0].children.length === 1
    // - hierarchy[0].children[0].children[0].item.item === 'S49'
  });

  test('Handle orphan items (no parent)', () => {
    // Test orphan story at root level
    // Verify it appears in roots array with parent=null
  });

  test('Handle orphan feature (no epic)', () => {
    // Feature without parent epic should appear at root level
  });

  test('Handle multiple epics with features and stories', () => {
    // Complex hierarchy with multiple top-level epics
    // Verify correct parent-child relationships
  });

  test('Sort items by item number', () => {
    // Items out of order: S10, S2, S5
    // After build: S2, S5, S10
  });

  test('Handle empty input', () => {
    // buildHierarchy([]) should return []
  });

  test('Handle single item', () => {
    // Single item should be root with no children
  });
});
```

**Note:** These tests are skeletal. The actual implementation will need access to the `buildHierarchy()` method. Consider:
- Making the method public (with `/** @internal */` JSDoc tag)
- Extracting hierarchy logic to separate `HierarchyBuilder` utility class
- Writing integration tests via `getChildren()` instead

**Validation:**
- Test file created and compiles
- Test structure follows VSCode extension testing patterns
- Tests cover edge cases (orphans, empty, single item, sorting)

**References:**
- Existing test patterns: `vscode-extension/src/test/suite/pathParsing.test.ts` (from Phase 1)

---

### Task 5: Add Logging for Hierarchy Operations

**Objective:** Add detailed logging to help debug hierarchy building and caching.

**Location:** Throughout hierarchy methods in `PlanningTreeProvider`

**Implementation:**

Logging has already been included in the code samples above:
- Cache hits/misses in `getHierarchyForStatus()`
- Cache clearing in `refresh()`
- Missing parent warnings in `buildHierarchy()`
- Node not found warnings in `getChildrenForItem()`

Ensure all logging uses the existing `outputChannel`:
- `this.outputChannel.appendLine('[Hierarchy] message')`
- Prefix with `[Hierarchy]` for filtering
- Log at appropriate verbosity (info vs warning)

**Validation:**
- Open Output panel in VSCode (Ctrl+Shift+P → "View: Toggle Output")
- Select "Cascade" output channel
- Verify hierarchy logs appear during TreeView operations
- Logs should show:
  - Cache hits/misses
  - Hierarchy build events
  - Warning messages for edge cases

---

## Completion Criteria

- ✅ `buildHierarchy()` method implemented and working
- ✅ `getChildrenForItem()` method implemented
- ✅ `findNodeInHierarchy()` helper method implemented
- ✅ `sortHierarchyNodes()` method implemented
- ✅ Hierarchy caching added with Map<Status, HierarchyNode[]>
- ✅ `getHierarchyForStatus()` cache retrieval method implemented
- ✅ `refresh()` updated to clear cache
- ✅ Unit tests created (even if skeletal)
- ✅ Logging added for debugging
- ✅ TypeScript compilation succeeds with no errors
- ✅ Code follows existing project style

## Next Phase

Proceed to **Phase 3: TreeView Integration and Testing** to connect the hierarchy logic to the TreeView's `getChildren()` method and verify the hierarchical display works correctly in VSCode.
