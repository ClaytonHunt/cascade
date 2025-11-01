---
spec: S59
phase: 2
title: PlanningTreeProvider Integration
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# Phase 2: PlanningTreeProvider Integration

## Overview

Integrate the `StatusPropagationEngine` into the `PlanningTreeProvider` refresh cycle. This phase implements the main orchestration method (`propagateStatuses()`), depth-first hierarchy traversal, and modifies `refresh()` to trigger propagation automatically.

## Prerequisites

- Phase 1 completed (StatusPropagationEngine class exists)
- Phase 1 unit tests passing
- Understanding of PlanningTreeProvider refresh lifecycle

## Tasks

### Task 1: Add StatusPropagationEngine to PlanningTreeProvider

**Objective**: Instantiate propagation engine in PlanningTreeProvider constructor.

**Implementation**:

1. Open file: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

2. Add import at top of file (after existing imports):
```typescript
import { StatusPropagationEngine } from './StatusPropagationEngine';
```

3. Add private field to class (after existing cache fields around line 161):
```typescript
/**
 * Engine for automatic status propagation from children to parents.
 *
 * Triggered during refresh() to update parent statuses based on
 * completed children. Ensures frontmatter status fields stay synchronized
 * with actual completion state.
 */
private propagationEngine: StatusPropagationEngine;
```

4. Initialize engine in constructor (after line 174):
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel
) {
  // Initialize propagation engine (new)
  this.propagationEngine = new StatusPropagationEngine(
    workspaceRoot,
    cache,
    outputChannel
  );
}
```

**Reference**:
- PlanningTreeProvider constructor: `vscode-extension/src/treeview/PlanningTreeProvider.ts:170-174`

**Validation**:
- File compiles without errors
- No import conflicts
- Constructor parameters match engine requirements

---

### Task 2: Implement propagateStatuses() Method in StatusPropagationEngine

**Objective**: Create main orchestration method that traverses hierarchy and propagates statuses.

**Implementation**:

1. Open file: `vscode-extension/src/treeview/StatusPropagationEngine.ts`

2. Add public method:
```typescript
/**
 * Propagates status changes from children to parents.
 *
 * Flow:
 * 1. Traverse hierarchy depth-first (children before parents)
 * 2. Analyze each parent to determine if status update needed
 * 3. Apply status updates to parent frontmatter files
 * 4. Log all actions to Output Channel
 *
 * This method is the main entry point called by PlanningTreeProvider.refresh().
 *
 * @param items - All planning items (from cache)
 * @param hierarchy - Hierarchical structure (from cache)
 */
async propagateStatuses(
  items: PlanningTreeItem[],
  hierarchy: HierarchyNode[]
): Promise<void> {
  this.outputChannel.appendLine('[PROPAGATE] Starting status propagation...');

  const startTime = Date.now();
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Traverse hierarchy depth-first (children before parents)
  // This ensures bottom-up propagation (Story→Feature→Epic→Project)
  await this.propagateNode(hierarchy, async (node) => {
    // Only propagate for parent types (epic, feature, project)
    if (node.item.type === 'epic' || node.item.type === 'feature' || node.item.type === 'project') {
      const result = await this.propagateParentStatus(node);

      if (result === 'updated') {
        updatedCount++;
      } else if (result === 'skipped') {
        skippedCount++;
      } else if (result === 'error') {
        errorCount++;
      }
    }
  });

  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(
    `[PROPAGATE] Completed in ${duration}ms: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`
  );
}
```

**Reference**:
- PlanningTreeItem type: `vscode-extension/src/treeview/PlanningTreeItem.ts`
- HierarchyNode type: `vscode-extension/src/treeview/HierarchyNode.ts:20-29`

**Validation**:
- Method signature matches expected usage
- Performance logging includes timing
- All result types counted (updated, skipped, error)

---

### Task 3: Implement propagateNode() Recursive Traversal

**Objective**: Implement depth-first hierarchy traversal helper method.

**Implementation**:

Add private method to `StatusPropagationEngine` class:

```typescript
/**
 * Traverses hierarchy depth-first and calls callback for each node.
 *
 * Visits children before parents (bottom-up traversal) to ensure
 * child status changes propagate upward correctly.
 *
 * Example hierarchy:
 * - E4 (children: [F16, F17])
 *   - F16 (children: [S49, S50])
 *     - S49 (no children) ← Visited first
 *     - S50 (no children) ← Visited second
 *   ← F16 processed after its children
 *   - F17 (children: [S51])
 *     - S51 (no children)
 *   ← F17 processed after its children
 * ← E4 processed after all children
 *
 * @param hierarchy - Root nodes to traverse
 * @param callback - Async function to call for each node
 */
private async propagateNode(
  hierarchy: HierarchyNode[],
  callback: (node: HierarchyNode) => Promise<void>
): Promise<void> {
  for (const node of hierarchy) {
    // Process children first (depth-first, bottom-up)
    if (node.children.length > 0) {
      await this.propagateNode(node.children, callback);
    }

    // Then process this node
    await callback(node);
  }
}
```

**Reference**:
- Existing hierarchy traversal pattern: `vscode-extension/src/treeview/PlanningTreeProvider.ts:836-845` (sortHierarchyNodes)

**Validation**:
- Recursion correctly visits children before parents
- Callback invoked for every node in hierarchy
- No infinite loops or stack overflows

---

### Task 4: Enhance refresh() Method to Trigger Propagation

**Objective**: Modify `PlanningTreeProvider.refresh()` to call propagation engine.

**Implementation**:

1. Open file: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

2. Find `refresh()` method (line 189-204)

3. Change method signature from `void` to `Promise<void>`:
```typescript
async refresh(): Promise<void> {
```

4. Replace method body with enhanced logic:
```typescript
async refresh(): Promise<void> {
  // Clear items cache first (forces reload on next access)
  this.allItemsCache = null;
  this.outputChannel.appendLine('[ItemsCache] Cache cleared');

  // Clear hierarchy cache (depends on items data)
  this.hierarchyCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');

  // Clear progress cache (depends on hierarchy data)
  this.progressCache.clear();
  this.outputChannel.appendLine('[Progress] Cache cleared');

  // Trigger status propagation before TreeView refresh
  // This ensures parent statuses are up-to-date when tree renders
  try {
    // Load items and hierarchy (will repopulate caches)
    const items = await this.loadAllPlanningItems();

    // Build full hierarchy across all statuses for propagation
    const fullHierarchy = this.buildHierarchy(items);

    // Run propagation (may update parent frontmatter files)
    await this.propagationEngine.propagateStatuses(items, fullHierarchy);

    // Clear caches again (propagation may have changed files)
    this.allItemsCache = null;
    this.hierarchyCache.clear();
    this.progressCache.clear();

  } catch (error) {
    this.outputChannel.appendLine(`[PROPAGATE] ❌ Error during propagation: ${error}`);
    // Continue with refresh even if propagation fails (non-blocking)
  }

  // Notify VSCode to reload tree
  this._onDidChangeTreeData.fire(undefined);
}
```

**Reference**:
- Current refresh() implementation: `vscode-extension/src/treeview/PlanningTreeProvider.ts:189-204`
- loadAllPlanningItems() method: `vscode-extension/src/treeview/PlanningTreeProvider.ts:493-518`
- buildHierarchy() method: `vscode-extension/src/treeview/PlanningTreeProvider.ts:717-822`

**Validation**:
- Method signature changed to async
- Propagation called after cache clear but before TreeView fire
- Error handling is non-blocking (try-catch around propagation)
- Caches cleared again after propagation

---

### Task 5: Update FileSystemWatcher Call Sites

**Objective**: Ensure all callers of `refresh()` handle async properly.

**Implementation**:

1. Open file: `vscode-extension/src/extension.ts`

2. Find `handleCreate` function (line 339-348):

Update to await refresh():
```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically

  // Refresh TreeView to show new file
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (new file)`);
  }
};
```

3. Find `handleChange` function (line 350-359):

Update to await refresh():
```typescript
const handleChange = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to show updated data
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file changed)`);
  }
};
```

4. Find `handleDelete` function (line 361-370):

Update to await refresh():
```typescript
const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to remove deleted file
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file deleted)`);
  }
};
```

5. Find manual refresh command (line 589-609):

Update to await refresh():
```typescript
const refreshCommand = vscode.commands.registerCommand(
  'cascade.refresh',
  async () => {
    if (planningTreeProvider) {
      // Trigger TreeView refresh (now async)
      await planningTreeProvider.refresh();

      // Log to output channel
      const timestamp = new Date().toLocaleTimeString();
      outputChannel.appendLine(`[${timestamp}] REFRESH: Manual refresh triggered by user`);

      // Show confirmation message to user
      vscode.window.showInformationMessage('Cascade TreeView refreshed');
    } else {
      // Provider not initialized (should not happen in normal use)
      vscode.window.showWarningMessage('TreeView provider not initialized');
      outputChannel.appendLine('[ERROR] Manual refresh failed - provider not initialized');
    }
  }
);
```

**Reference**:
- FileSystemWatcher handlers: `vscode-extension/src/extension.ts:339-370`
- Manual refresh command: `vscode-extension/src/extension.ts:589-609`

**Validation**:
- All handler functions marked `async`
- All `refresh()` calls use `await`
- No unawaited promises (compile without warnings)

---

### Task 6: Write Integration Tests

**Objective**: Test full propagation flow with mock file system.

**Implementation**:

1. Create test file: `vscode-extension/src/test/suite/propagationIntegration.test.ts`

2. Add test setup with mocks:
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusPropagationEngine } from '../../treeview/StatusPropagationEngine';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { HierarchyNode } from '../../treeview/HierarchyNode';

// Mock output channel
class MockOutputChannel implements vscode.OutputChannel {
  name: string = 'Test';
  messages: string[] = [];

  append(value: string): void { this.messages.push(value); }
  appendLine(value: string): void { this.messages.push(value + '\n'); }
  clear(): void { this.messages = []; }
  show(): void {}
  hide(): void {}
  dispose(): void {}
}

suite('Propagation Integration Tests', () => {
  // Test cases here
});
```

3. Add integration test cases:
```typescript
test('Complete all stories → Feature becomes completed', async () => {
  // Setup: Create hierarchy with feature and 3 completed stories
  const story1: PlanningTreeItem = {
    item: 'S1', title: 'Story 1', type: 'story', status: 'Completed',
    priority: 'High', filePath: '/test/s1.md'
  };
  const story2: PlanningTreeItem = {
    item: 'S2', title: 'Story 2', type: 'story', status: 'Completed',
    priority: 'High', filePath: '/test/s2.md'
  };
  const story3: PlanningTreeItem = {
    item: 'S3', title: 'Story 3', type: 'story', status: 'Completed',
    priority: 'High', filePath: '/test/s3.md'
  };

  const feature: PlanningTreeItem = {
    item: 'F1', title: 'Feature 1', type: 'feature', status: 'In Progress',
    priority: 'High', filePath: '/test/f1.md'
  };

  const storyNodes: HierarchyNode[] = [
    { item: story1, children: [], parent: null },
    { item: story2, children: [], parent: null },
    { item: story3, children: [], parent: null }
  ];

  const featureNode: HierarchyNode = {
    item: feature,
    children: storyNodes,
    parent: null
  };

  // Update parent references
  storyNodes.forEach(n => n.parent = featureNode);

  // Execute: Call propagateStatuses with hierarchy
  const outputChannel = new MockOutputChannel();
  const engine = new StatusPropagationEngine('/test', null as any, outputChannel);

  // Note: This test verifies logic only. Full file system tests in Phase 3.
  // We're testing that determineParentStatus() returns 'Completed' for this case.
  const newStatus = (engine as any).determineParentStatus(featureNode);

  assert.strictEqual(newStatus, 'Completed', 'Feature should become Completed when all stories completed');
});

test('Start one story → Feature becomes in progress', async () => {
  const story1: PlanningTreeItem = {
    item: 'S1', title: 'Story 1', type: 'story', status: 'In Progress',
    priority: 'High', filePath: '/test/s1.md'
  };
  const story2: PlanningTreeItem = {
    item: 'S2', title: 'Story 2', type: 'story', status: 'Not Started',
    priority: 'High', filePath: '/test/s2.md'
  };

  const feature: PlanningTreeItem = {
    item: 'F1', title: 'Feature 1', type: 'feature', status: 'Not Started',
    priority: 'High', filePath: '/test/f1.md'
  };

  const featureNode: HierarchyNode = {
    item: feature,
    children: [
      { item: story1, children: [], parent: null },
      { item: story2, children: [], parent: null }
    ],
    parent: null
  };

  const outputChannel = new MockOutputChannel();
  const engine = new StatusPropagationEngine('/test', null as any, outputChannel);

  const newStatus = (engine as any).determineParentStatus(featureNode);

  assert.strictEqual(newStatus, 'In Progress', 'Feature should become In Progress when any child in progress');
});
```

**Reference**:
- Existing integration test pattern: `vscode-extension/src/test/suite/hierarchyBuilder.test.ts`

**Validation**:
- All integration tests pass: `npm test`
- Test coverage includes common propagation scenarios
- Mock objects correctly simulate dependencies

## Completion Criteria

- ✅ `StatusPropagationEngine` instantiated in PlanningTreeProvider constructor
- ✅ `propagateStatuses()` method implements main orchestration logic
- ✅ `propagateNode()` method performs depth-first hierarchy traversal
- ✅ `refresh()` method enhanced to trigger propagation automatically
- ✅ All FileSystemWatcher call sites updated to await async refresh()
- ✅ Integration tests pass (2 test cases minimum)
- ✅ No TypeScript compilation errors
- ✅ No async/await warnings

## Next Phase

Proceed to **Phase 3: Testing, Logging, and Polish** to add end-to-end tests, enhance logging, validate performance, and handle edge cases.
