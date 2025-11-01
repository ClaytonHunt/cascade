---
spec: S59
phase: 1
title: StatusPropagationEngine Core Implementation
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# Phase 1: StatusPropagationEngine Core Implementation

## Overview

Create the `StatusPropagationEngine` class with core status determination logic and atomic file update methods. This phase builds the foundation for propagation without integrating it into the refresh cycle yet.

## Prerequisites

- VSCode extension codebase checked out
- TypeScript compilation working (`npm run compile`)
- Existing test suite passing
- Understanding of `PlanningTreeProvider` architecture (vscode-extension/src/treeview/PlanningTreeProvider.ts)

## Tasks

### Task 1: Create StatusPropagationEngine Class Skeleton

**Objective**: Create new TypeScript file with class definition and constructor.

**Implementation**:

1. Create new file: `vscode-extension/src/treeview/StatusPropagationEngine.ts`

2. Add imports:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { FrontmatterCache } from '../cache';
import { Status } from '../types';
import { HierarchyNode } from './HierarchyNode';
import { PlanningTreeItem } from './PlanningTreeItem';
```

3. Define class with constructor:
```typescript
/**
 * Handles automatic status propagation from children to parents.
 *
 * Triggered by FileSystemWatcher events after cache invalidation.
 * Uses cached hierarchy to identify parent-child relationships.
 * Writes status changes to parent markdown files atomically.
 */
export class StatusPropagationEngine {
  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {}
}
```

**Validation**:
- File compiles without errors (`npm run compile`)
- No linter warnings
- Export is accessible from other files

---

### Task 2: Implement determineParentStatus() Method

**Objective**: Implement status transition rules based on children states.

**Implementation**:

Add method to `StatusPropagationEngine` class:

```typescript
/**
 * Determines new status for a parent based on children states.
 *
 * Rules:
 * - All children "Completed" → Parent "Completed"
 * - Any child "In Progress" → Parent "In Progress" (if not already)
 * - Mixed states (not all completed) → Parent "In Progress" (if was "Not Started" or "In Planning")
 * - No status downgrade (Completed → In Progress not allowed)
 *
 * @param parent - Parent node with children
 * @returns New status for parent, or null if no change needed
 */
private determineParentStatus(parent: HierarchyNode): Status | null {
  const children = parent.children;

  if (children.length === 0) {
    // No children - no basis for status update
    return null;
  }

  const currentStatus = parent.item.status;
  const completedCount = children.filter(c => c.item.status === 'Completed').length;
  const inProgressCount = children.filter(c => c.item.status === 'In Progress').length;
  const totalCount = children.length;

  // Rule 1: All children completed → Parent completed
  if (completedCount === totalCount) {
    if (currentStatus !== 'Completed') {
      return 'Completed';
    }
  }

  // Rule 2: Any child in progress → Parent in progress (if not already)
  if (inProgressCount > 0) {
    if (currentStatus === 'Not Started' || currentStatus === 'In Planning') {
      return 'In Progress';
    }
  }

  // Rule 3: Mixed states → Parent in progress (if was "Not Started" or "In Planning")
  if (completedCount > 0 && completedCount < totalCount) {
    if (currentStatus === 'Not Started' || currentStatus === 'In Planning') {
      return 'In Progress';
    }
  }

  // Rule 4: Never downgrade status
  if (currentStatus === 'Completed') {
    // Parent already completed - don't change even if children regress
    return null;
  }

  // No change needed
  return null;
}
```

**Reference**:
- Status type definition: `vscode-extension/src/types.ts:14`
- HierarchyNode structure: `vscode-extension/src/treeview/HierarchyNode.ts:20-29`

**Validation**:
- Method compiles without errors
- Return type matches `Status | null`
- All status enum values handled

---

### Task 3: Implement updateParentFrontmatter() Method

**Objective**: Implement atomic frontmatter file updates using VSCode workspace API.

**Implementation**:

Add method to `StatusPropagationEngine` class:

```typescript
/**
 * Updates parent item status in frontmatter file.
 *
 * Atomic updates using vscode.workspace.fs.writeFile:
 * 1. Read current file content
 * 2. Parse frontmatter
 * 3. Replace status line
 * 4. Replace updated timestamp line
 * 5. Write back to file
 *
 * @param parent - Parent node to update
 * @param newStatus - New status value
 * @returns 'updated' | 'skipped' | 'error'
 */
private async updateParentFrontmatter(
  parent: HierarchyNode,
  newStatus: Status
): Promise<'updated' | 'skipped' | 'error'> {
  try {
    const filePath = parent.item.filePath;
    const fileUri = vscode.Uri.file(filePath);

    // Read current file content
    const contentBytes = await vscode.workspace.fs.readFile(fileUri);
    const content = Buffer.from(contentBytes).toString('utf8');

    // Parse frontmatter to get current values
    const frontmatter = await this.cache.get(filePath);

    if (!frontmatter) {
      this.outputChannel.appendLine(
        `[PROPAGATE] ⚠️  Skipping ${parent.item.item}: Invalid frontmatter`
      );
      return 'error';
    }

    const oldStatus = frontmatter.status;
    const oldUpdated = frontmatter.updated;
    const newUpdated = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Replace status line (multiline mode, exact match)
    const statusRegex = new RegExp(`^status: ${oldStatus}$`, 'm');
    let newContent = content.replace(statusRegex, `status: ${newStatus}`);

    // Replace updated line (multiline mode, exact match)
    const updatedRegex = new RegExp(`^updated: ${oldUpdated}$`, 'm');
    newContent = newContent.replace(updatedRegex, `updated: ${newUpdated}`);

    // Verify changes were made
    if (newContent === content) {
      this.outputChannel.appendLine(
        `[PROPAGATE] ⚠️  Failed to update ${parent.item.item}: Pattern match failed`
      );
      return 'error';
    }

    // Write back to file (atomic operation)
    const newContentBytes = Buffer.from(newContent, 'utf8');
    await vscode.workspace.fs.writeFile(fileUri, newContentBytes);

    // Invalidate cache (will be reparsed on next access)
    this.cache.invalidate(filePath);

    // Log success
    this.outputChannel.appendLine(
      `[PROPAGATE] ✅ ${parent.item.item} status updated: ${oldStatus} → ${newStatus}`
    );
    this.outputChannel.appendLine(
      `[PROPAGATE]    File: ${path.relative(this.workspaceRoot, filePath)}`
    );
    this.outputChannel.appendLine(
      `[PROPAGATE]    Children: ${parent.children.length} (all completed: ${this.allChildrenCompleted(parent)})`
    );

    return 'updated';

  } catch (error) {
    this.outputChannel.appendLine(
      `[PROPAGATE] ❌ Error updating ${parent.item.item}: ${error}`
    );
    return 'error';
  }
}
```

**Reference**:
- VSCode workspace.fs API: https://code.visualstudio.com/api/references/vscode-api#workspace.fs
- FrontmatterCache.get(): `vscode-extension/src/cache.ts:134-177`
- Existing file read pattern: `vscode-extension/src/extension.ts:769`

**Validation**:
- Method compiles without TypeScript errors
- Uses async/await correctly
- Error handling with try-catch
- Returns correct result type

---

### Task 4: Add Helper Methods

**Objective**: Add utility methods used by core propagation logic.

**Implementation**:

Add to `StatusPropagationEngine` class:

```typescript
/**
 * Checks if all children of a parent have "Completed" status.
 *
 * @param parent - Parent node to check
 * @returns true if all children completed, false otherwise
 */
private allChildrenCompleted(parent: HierarchyNode): boolean {
  return parent.children.every(c => c.item.status === 'Completed');
}

/**
 * Propagates status for a single parent node.
 *
 * Determines new status and updates frontmatter if needed.
 *
 * @param node - Parent node to check and update
 * @returns 'updated' | 'skipped' | 'error'
 */
private async propagateParentStatus(node: HierarchyNode): Promise<'updated' | 'skipped' | 'error'> {
  // Determine new status based on children
  const newStatus = this.determineParentStatus(node);

  if (!newStatus) {
    // No change needed
    return 'skipped';
  }

  // Update parent frontmatter
  return await this.updateParentFrontmatter(node, newStatus);
}
```

**Validation**:
- Methods compile without errors
- Return types match usage

---

### Task 5: Write Unit Tests for Status Determination

**Objective**: Create comprehensive unit tests for `determineParentStatus()` logic.

**Implementation**:

1. Create test file: `vscode-extension/src/test/suite/statusPropagation.test.ts`

2. Add test setup:
```typescript
import * as assert from 'assert';
import { StatusPropagationEngine } from '../../treeview/StatusPropagationEngine';
import { HierarchyNode } from '../../treeview/HierarchyNode';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { Status } from '../../types';

// Mock helper to create hierarchy nodes
function createMockNode(status: Status, children: HierarchyNode[] = []): HierarchyNode {
  const item: PlanningTreeItem = {
    item: 'TEST',
    title: 'Test Item',
    type: 'feature',
    status: status,
    priority: 'Medium',
    filePath: '/test/path.md'
  };

  return {
    item,
    children,
    parent: null
  };
}
```

3. Add test cases:
```typescript
suite('StatusPropagationEngine - determineParentStatus', () => {
  test('All children completed → Parent becomes completed', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('Completed'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('In Progress', children);

    // Access private method via type assertion for testing
    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, 'Completed');
  });

  test('Any child in progress → Parent becomes in progress', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('In Progress'),
      createMockNode('Ready')
    ];
    const parent = createMockNode('Not Started', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, 'In Progress');
  });

  test('No children → No status change', () => {
    const parent = createMockNode('Not Started', []);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null);
  });

  test('Never downgrade from completed', () => {
    const children = [
      createMockNode('In Progress'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('Completed', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null); // No downgrade
  });

  test('Parent already in correct state → No change', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('Completed', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null); // Already completed
  });
});
```

**Reference**:
- Existing test pattern: `vscode-extension/src/test/suite/hierarchyBuilder.test.ts`
- Test runner: `vscode-extension/src/test/suite/index.ts`

**Validation**:
- All tests pass: `npm test`
- Test coverage includes all status transition rules
- Edge cases covered (no children, already completed, etc.)

---

### Task 6: Write Unit Tests for Frontmatter Updates

**Objective**: Test frontmatter regex replacement logic (without file system operations).

**Implementation**:

Add to `statusPropagation.test.ts`:

```typescript
suite('StatusPropagationEngine - updateParentFrontmatter', () => {
  test('Status line regex matches and replaces correctly', () => {
    const content = `---
item: F16
title: Foundation
type: feature
status: In Progress
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Content here`;

    // Test regex pattern
    const statusRegex = new RegExp(`^status: In Progress$`, 'm');
    const newContent = content.replace(statusRegex, 'status: Completed');

    assert.ok(newContent.includes('status: Completed'));
    assert.ok(!newContent.includes('status: In Progress'));
  });

  test('Updated line regex matches and replaces correctly', () => {
    const content = `---
updated: 2025-10-14
---`;

    const updatedRegex = new RegExp(`^updated: 2025-10-14$`, 'm');
    const newContent = content.replace(updatedRegex, 'updated: 2025-10-15');

    assert.ok(newContent.includes('updated: 2025-10-15'));
    assert.ok(!newContent.includes('updated: 2025-10-14'));
  });

  test('Regex fails gracefully on malformed frontmatter', () => {
    const content = `---
status: In Progress Extra Text
---`;

    const statusRegex = new RegExp(`^status: In Progress$`, 'm');
    const newContent = content.replace(statusRegex, 'status: Completed');

    // No match - content unchanged
    assert.strictEqual(newContent, content);
  });
});
```

**Validation**:
- All tests pass: `npm test`
- Regex patterns match expected frontmatter format
- Edge cases handled (malformed frontmatter)

## Completion Criteria

- ✅ `StatusPropagationEngine` class created and compiles
- ✅ `determineParentStatus()` method implements all status transition rules
- ✅ `updateParentFrontmatter()` method performs atomic file updates
- ✅ Helper methods (`allChildrenCompleted()`, `propagateParentStatus()`) implemented
- ✅ Unit tests pass for status determination logic (5 test cases)
- ✅ Unit tests pass for frontmatter regex patterns (3 test cases)
- ✅ No TypeScript compilation errors
- ✅ No linter warnings

## Next Phase

Proceed to **Phase 2: PlanningTreeProvider Integration** to integrate the engine with the refresh cycle and implement full hierarchy traversal.
