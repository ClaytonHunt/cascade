---
spec: S60
phase: 1
title: Core Controller Implementation
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 1: Core Controller Implementation

## Overview

This phase creates the `PlanningDragAndDropController` class implementing VSCode's `TreeDragAndDropController` interface. The controller handles drag start and drop events, serializes/deserializes item data, and validates drag sources and drop targets according to the requirements in S60.

This phase establishes the foundation for drag-and-drop functionality without implementing status updates (deferred to S61) or visual feedback (deferred to S62).

## Prerequisites

- Understanding of VSCode `TreeDragAndDropController` interface
- Familiarity with existing `TreeNode` type system (`PlanningTreeItem` and `StatusGroupNode`)
- Access to VSCode API documentation for DataTransfer

## Tasks

### Task 1: Create PlanningDragAndDropController File

**Objective:** Create the controller class file with proper TypeScript imports and class structure.

**File:** `vscode-extension/src/treeview/PlanningDragAndDropController.ts`

**Implementation:**

```typescript
import * as vscode from 'vscode';
import { TreeNode, PlanningTreeItem, StatusGroupNode } from './PlanningTreeItem';

/**
 * Drag-and-drop controller for Cascade TreeView.
 *
 * Implements VSCode's TreeDragAndDropController interface to enable
 * dragging Stories and Bugs between status groups for workflow transitions.
 *
 * This controller handles:
 * - Drag start: Serializes dragged items to DataTransfer
 * - Drop: Validates drop targets and source items
 * - Validation: Only Stories/Bugs draggable, only status groups droppable
 *
 * Integration points:
 * - S60: Core drag-and-drop infrastructure (this story)
 * - S61: Status update and file persistence (TODO markers)
 * - S62: Visual feedback and notifications (TODO markers)
 */
export class PlanningDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  // MIME type for Cascade planning items
  // Matches TreeView ID 'cascadeView' to scope drag-and-drop to this extension
  readonly dropMimeTypes = ['application/vnd.code.tree.cascadeView'];
  readonly dragMimeTypes = ['application/vnd.code.tree.cascadeView'];

  /**
   * Creates a new PlanningDragAndDropController.
   *
   * @param outputChannel - Output channel for logging drag-and-drop events
   */
  constructor(
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Handles drag start event.
   *
   * Serializes dragged items to DataTransfer for drop handling.
   * Only allows dragging of Stories and Bugs (rejects Epics, Features, Status Groups).
   *
   * @param source - Array of tree nodes being dragged
   * @param dataTransfer - VSCode DataTransfer object for serialization
   * @param token - Cancellation token
   */
  handleDrag(
    source: TreeNode[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Implementation in Task 2
  }

  /**
   * Handles drop event.
   *
   * Validates drop target (must be status group) and source items (must be Stories/Bugs).
   * Extracts target status and logs drop event.
   *
   * Status update logic is deferred to S61 - this handler only validates and logs.
   *
   * @param target - Tree node where items were dropped (or undefined if dropped on empty space)
   * @param dataTransfer - VSCode DataTransfer object containing serialized items
   * @param token - Cancellation token
   */
  async handleDrop(
    target: TreeNode | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Implementation in Task 3
  }
}
```

**Validation:**
- File created at `vscode-extension/src/treeview/PlanningDragAndDropController.ts`
- TypeScript imports resolve correctly
- Class implements `TreeDragAndDropController<TreeNode>` interface
- MIME types configured correctly

**References:**
- VSCode API: [TreeDragAndDropController](https://code.visualstudio.com/api/references/vscode-api#TreeDragAndDropController)
- Existing types: `vscode-extension/src/treeview/PlanningTreeItem.ts:79`

---

### Task 2: Implement handleDrag() Method

**Objective:** Implement drag start handler that validates draggable items and serializes them to DataTransfer.

**Implementation:**

Replace the `handleDrag()` method stub with this implementation:

```typescript
handleDrag(
  source: TreeNode[],
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): void | Thenable<void> {
  // Multi-item drag not supported in S60 (future enhancement)
  // Process only first item
  if (source.length === 0) {
    this.outputChannel.appendLine('[DragDrop] ⚠️  No items to drag');
    return;
  }

  const node = source[0];

  // Validate: Only planning items can be dragged (not status groups)
  if (node.type === 'status-group') {
    this.outputChannel.appendLine('[DragDrop] ⚠️  Cannot drag status groups');
    return;
  }

  // Validate: Only Stories and Bugs are draggable (not Epics or Features)
  const item = node as PlanningTreeItem;
  if (item.type !== 'story' && item.type !== 'bug') {
    this.outputChannel.appendLine(`[DragDrop] ⚠️  Cannot drag ${item.type} items (only stories and bugs)`);
    return;
  }

  // Serialize item data for drop handler
  // Include essential fields for validation and future status update (S61)
  const itemData = JSON.stringify({
    item: item.item,           // e.g., "S49"
    title: item.title,         // e.g., "TreeDataProvider Core Implementation"
    filePath: item.filePath,   // Absolute path to markdown file
    status: item.status,       // Current status (for transition validation)
    type: item.type            // 'story' or 'bug'
  });

  // Set DataTransfer with MIME type
  dataTransfer.set(
    this.dragMimeTypes[0],
    new vscode.DataTransferItem(itemData)
  );

  // Log drag start event
  this.outputChannel.appendLine(`[DragDrop] Drag started: ${item.item} - ${item.title}`);
  this.outputChannel.appendLine(`  Status: ${item.status}`);
  this.outputChannel.appendLine(`  Type: ${item.type}`);
}
```

**Validation:**
- TypeScript compiles without errors
- Dragging Stories/Bugs shows drag cursor in TreeView
- Dragging Epics/Features does not show drag cursor
- Dragging status groups does not show drag cursor
- Output channel logs drag start events with item details

**Testing:**
1. Open Cascade TreeView
2. Hover over Story item → Cursor should indicate draggable
3. Hover over Epic/Feature → No drag cursor
4. Start dragging Story → Output channel logs: `[DragDrop] Drag started: S49 - ...`
5. Verify log includes status and type

**References:**
- DataTransfer API: [vscode.DataTransfer](https://code.visualstudio.com/api/references/vscode-api#DataTransfer)
- DataTransferItem: [vscode.DataTransferItem](https://code.visualstudio.com/api/references/vscode-api#DataTransferItem)

---

### Task 3: Implement handleDrop() Method

**Objective:** Implement drop handler that validates drop targets, deserializes items, and logs drop events.

**Implementation:**

Replace the `handleDrop()` method stub with this implementation:

```typescript
async handleDrop(
  target: TreeNode | undefined,
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): Promise<void> {
  // Validate: Drop target must exist (not dropped on empty space)
  if (!target) {
    this.outputChannel.appendLine('[DragDrop] ⚠️  Drop target is undefined (dropped outside tree)');
    return;
  }

  // Validate: Drop target must be a status group
  if (target.type !== 'status-group') {
    this.outputChannel.appendLine('[DragDrop] ⚠️  Invalid drop target (not a status group)');
    this.outputChannel.appendLine(`  Target type: ${target.type}`);
    return;
  }

  // Deserialize dragged item data
  const dataTransferItem = dataTransfer.get(this.dragMimeTypes[0]);
  if (!dataTransferItem) {
    this.outputChannel.appendLine('[DragDrop] ⚠️  No data in DataTransfer');
    return;
  }

  let itemData: any;
  try {
    const itemDataStr = await dataTransferItem.asString();
    itemData = JSON.parse(itemDataStr);
  } catch (error) {
    this.outputChannel.appendLine('[DragDrop] ❌ Failed to deserialize item data');
    this.outputChannel.appendLine(`  Error: ${error}`);
    return;
  }

  // Validate deserialized data structure
  if (!itemData.item || !itemData.filePath || !itemData.status || !itemData.type) {
    this.outputChannel.appendLine('[DragDrop] ❌ Invalid item data structure');
    this.outputChannel.appendLine(`  Data: ${JSON.stringify(itemData)}`);
    return;
  }

  // Extract target status from status group
  const statusGroup = target as StatusGroupNode;
  const targetStatus = statusGroup.status;

  // Validate: Source must be Story or Bug (redundant check for safety)
  if (itemData.type !== 'story' && itemData.type !== 'bug') {
    this.outputChannel.appendLine('[DragDrop] ❌ Invalid source item type');
    this.outputChannel.appendLine(`  Type: ${itemData.type}`);
    return;
  }

  // Log successful drop event
  this.outputChannel.appendLine('[DragDrop] Drop received:');
  this.outputChannel.appendLine(`  Item: ${itemData.item} - ${itemData.title}`);
  this.outputChannel.appendLine(`  Source status: ${itemData.status}`);
  this.outputChannel.appendLine(`  Target status: ${targetStatus}`);
  this.outputChannel.appendLine(`  File: ${itemData.filePath}`);

  // TODO S61: Validate status transition
  // TODO S61: Update file frontmatter
  // TODO S62: Show success/error notification
  this.outputChannel.appendLine('[DragDrop] ℹ️  Status update deferred to S61');
}
```

**Validation:**
- TypeScript compiles without errors
- Dropping Stories/Bugs on status groups logs drop event
- Dropping on non-status-group nodes does nothing (logged as warning)
- Dropping outside TreeView does nothing (logged as warning)
- Output channel shows detailed drop information

**Testing:**
1. Drag Story from "Ready" to "In Progress" status group
2. Drop on "In Progress" group header
3. Output channel logs:
   ```
   [DragDrop] Drop received:
     Item: S49 - TreeDataProvider Core Implementation
     Source status: Ready
     Target status: In Progress
     File: D:\projects\lineage\plans\...\story-49-core.md
   [DragDrop] ℹ️  Status update deferred to S61
   ```
4. Try dropping on Story item (not status group) → Warning logged
5. Try dropping outside TreeView → Warning logged

**References:**
- DataTransfer.get(): [vscode.DataTransfer.get](https://code.visualstudio.com/api/references/vscode-api#DataTransfer.get)
- DataTransferItem.asString(): [vscode.DataTransferItem.asString](https://code.visualstudio.com/api/references/vscode-api#DataTransferItem.asString)

---

### Task 4: Add Helper Methods for Validation

**Objective:** Extract validation logic into reusable helper methods for cleaner code.

**Implementation:**

Add these private helper methods to the `PlanningDragAndDropController` class:

```typescript
/**
 * Validates if a tree node can be dragged.
 *
 * Draggable items:
 * - Stories (type === 'story')
 * - Bugs (type === 'bug')
 *
 * Non-draggable items:
 * - Status groups (virtual nodes)
 * - Epics (organizational containers)
 * - Features (organizational containers)
 * - Specs (implementation artifacts)
 * - Phases (implementation artifacts)
 *
 * @param node - Tree node to validate
 * @returns true if node can be dragged, false otherwise
 */
private isDraggable(node: TreeNode): boolean {
  // Status groups are virtual nodes (not backed by files)
  if (node.type === 'status-group') {
    return false;
  }

  // Only Stories and Bugs can be dragged
  const item = node as PlanningTreeItem;
  return item.type === 'story' || item.type === 'bug';
}

/**
 * Validates if a tree node is a valid drop target.
 *
 * Valid drop targets:
 * - Status groups (type === 'status-group')
 *
 * Invalid drop targets:
 * - Planning items (Stories, Bugs, Epics, Features, etc.)
 * - undefined (dropped outside tree)
 *
 * @param node - Tree node to validate (or undefined)
 * @returns true if node is valid drop target, false otherwise
 */
private isValidDropTarget(node: TreeNode | undefined): boolean {
  if (!node) {
    return false;
  }
  return node.type === 'status-group';
}
```

**Refactor existing methods to use helpers:**

Update `handleDrag()`:
```typescript
handleDrag(
  source: TreeNode[],
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): void | Thenable<void> {
  if (source.length === 0) {
    this.outputChannel.appendLine('[DragDrop] ⚠️  No items to drag');
    return;
  }

  const node = source[0];

  // Validate draggable using helper
  if (!this.isDraggable(node)) {
    this.outputChannel.appendLine(`[DragDrop] ⚠️  Cannot drag ${node.type} items`);
    return;
  }

  // Rest of implementation remains same...
  const item = node as PlanningTreeItem;
  // ... serialization code ...
}
```

Update `handleDrop()` target validation:
```typescript
async handleDrop(
  target: TreeNode | undefined,
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): Promise<void> {
  // Validate drop target using helper
  if (!this.isValidDropTarget(target)) {
    this.outputChannel.appendLine('[DragDrop] ⚠️  Invalid drop target');
    if (target) {
      this.outputChannel.appendLine(`  Target type: ${target.type}`);
    } else {
      this.outputChannel.appendLine('  Target is undefined (dropped outside tree)');
    }
    return;
  }

  // Rest of implementation remains same...
}
```

**Validation:**
- Code is more readable and maintainable
- Validation logic is centralized
- TypeScript compiles without errors
- All existing tests pass

**Benefits:**
- Easier to modify validation rules in future
- Reduces code duplication
- Improves testability (helpers can be unit tested)
- Makes intent explicit through method names

---

### Task 5: Add Error Handling for Edge Cases

**Objective:** Add robust error handling for malformed data and unexpected scenarios.

**Implementation:**

Add try-catch blocks and additional validation:

```typescript
async handleDrop(
  target: TreeNode | undefined,
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    // Existing validation code...

    // Deserialize with error handling
    const dataTransferItem = dataTransfer.get(this.dragMimeTypes[0]);
    if (!dataTransferItem) {
      this.outputChannel.appendLine('[DragDrop] ⚠️  No data in DataTransfer (MIME type mismatch?)');
      return;
    }

    let itemData: any;
    try {
      const itemDataStr = await dataTransferItem.asString();
      itemData = JSON.parse(itemDataStr);
    } catch (parseError) {
      this.outputChannel.appendLine('[DragDrop] ❌ Failed to deserialize item data');
      this.outputChannel.appendLine(`  Error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      return;
    }

    // Validate required fields exist and are non-empty
    const requiredFields = ['item', 'filePath', 'status', 'type'];
    const missingFields = requiredFields.filter(field => !itemData[field]);
    if (missingFields.length > 0) {
      this.outputChannel.appendLine('[DragDrop] ❌ Invalid item data structure');
      this.outputChannel.appendLine(`  Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    // Existing drop logic...

  } catch (error) {
    // Catch-all for unexpected errors
    this.outputChannel.appendLine('[DragDrop] ❌ Unexpected error in handleDrop');
    this.outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    this.outputChannel.appendLine(`  Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
  }
}
```

**Validation:**
- Controller handles malformed DataTransfer gracefully
- All errors are logged to output channel
- No uncaught exceptions or extension crashes
- User experience is not disrupted by errors

**Edge Cases Covered:**
1. Empty DataTransfer (MIME type mismatch)
2. Invalid JSON in DataTransfer
3. Missing required fields in item data
4. Unexpected exceptions in async operations
5. Null/undefined values in item data

---

## Completion Criteria

- [ ] `PlanningDragAndDropController.ts` created with proper structure
- [ ] `handleDrag()` implemented with serialization and validation
- [ ] `handleDrop()` implemented with deserialization and validation
- [ ] Helper methods `isDraggable()` and `isValidDropTarget()` implemented
- [ ] Error handling for edge cases added
- [ ] TypeScript compiles without errors
- [ ] All code documented with TSDoc comments
- [ ] Manual testing shows correct drag/drop behavior
- [ ] Output channel logs all drag/drop events

## Next Phase

Proceed to **Phase 2: TreeView Integration** to register the controller with VSCode and enable drag-and-drop in the Cascade TreeView.
