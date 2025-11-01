---
item: S60
title: Drag-and-Drop Controller Implementation
type: story
parent: F18
status: Completed
priority: High
estimate: M
dependencies: [F17]
spec: specs/S60-drag-drop-controller-implementation/
created: 2025-10-16
updated: 2025-10-16
---

# S60 - Drag-and-Drop Controller Implementation

## Description

Implement the `TreeDragAndDropController` interface to enable drag-and-drop functionality in the Cascade TreeView. This controller will handle drag start and drop events, serialize item data for transfer, and validate drop targets.

This story establishes the core drag-and-drop infrastructure without implementing the status update logic (deferred to S61).

### Scope

**In Scope:**
- Implement `PlanningDragAndDropController` class
- Configure MIME types for planning items
- Handle `handleDrag()` to serialize dragged items
- Handle `handleDrop()` to receive drop events
- Validate that only Stories and Bugs are draggable
- Validate drop targets (status groups only)
- Integrate controller with TreeView registration
- Add logging for drag-and-drop events

**Out of Scope:**
- Status transition validation (S61)
- Frontmatter file updates (S61)
- Visual feedback and notifications (S62)
- Multi-item drag (future enhancement)

### Technical Implementation

**File Structure:**
```
vscode-extension/src/
├── treeview/
│   ├── PlanningTreeProvider.ts (existing)
│   ├── PlanningDragAndDropController.ts (new)
│   └── index.ts (update exports)
├── extension.ts (update TreeView registration)
```

**PlanningDragAndDropController Class:**
```typescript
export class PlanningDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  // MIME type configuration
  readonly dropMimeTypes = ['application/vnd.code.tree.cascadeView'];
  readonly dragMimeTypes = ['application/vnd.code.tree.cascadeView'];

  constructor(
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Handles drag start event.
   * Serializes dragged items to DataTransfer for drop handling.
   */
  handleDrag(
    source: TreeNode[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Validate source items
    // Reject if not Stories/Bugs
    // Serialize to DataTransfer
    // Log drag event
  }

  /**
   * Handles drop event.
   * Validates drop target and delegates to status update logic.
   */
  async handleDrop(
    target: TreeNode | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Deserialize dragged items from DataTransfer
    // Validate drop target is StatusGroupNode
    // Extract target status
    // Validate source items are Stories/Bugs
    // Log drop event
    // TODO S61: Call status update logic
  }
}
```

**TreeView Integration (extension.ts):**
```typescript
// Create drag-and-drop controller
const dragDropController = new PlanningDragAndDropController(outputChannel);

// Register TreeView with drag-and-drop enabled
cascadeTreeView = vscode.window.createTreeView('cascadeView', {
  treeDataProvider: planningTreeProvider,
  dragAndDropController: dragDropController  // NEW
});
```

**Validation Logic:**
- **Draggable items:** Only `type: 'story'` or `type: 'bug'`
- **Drop targets:** Only `type: 'status-group'`
- **Reject:** Dragging epics, features, or dropping outside status groups

### Dependencies

**F17 (Status-Based Kanban Layout):**
- Depends on status group structure for drop targets
- Requires `StatusGroupNode` type definition
- Uses existing TreeView hierarchy

**Existing Infrastructure:**
- `PlanningTreeProvider` (TreeView provider)
- `TreeNode` and `PlanningTreeItem` types
- Output channel for logging

## Acceptance Criteria

- [ ] `PlanningDragAndDropController` class created in new file
- [ ] `handleDrag()` serializes Stories and Bugs to DataTransfer
- [ ] `handleDrag()` rejects drag for Epics and Features
- [ ] `handleDrop()` deserializes items from DataTransfer
- [ ] `handleDrop()` validates drop target is status group
- [ ] `handleDrop()` extracts target status from status group
- [ ] `handleDrop()` validates source items are Stories/Bugs
- [ ] Controller integrated with TreeView registration in `extension.ts`
- [ ] Drag events logged to output channel
- [ ] Drop events logged to output channel
- [ ] No TypeScript compilation errors
- [ ] Dragging Stories/Bugs shows drag cursor in TreeView
- [ ] Dropping on status groups triggers drop handler (logged)
- [ ] Dropping outside status groups does nothing

## Implementation Notes

**MIME Type Naming:**
- Use `application/vnd.code.tree.cascadeView` (matches TreeView ID)
- Prevents dragging into other VSCode views
- Enables drag-and-drop within Cascade TreeView only

**DataTransfer Serialization:**
```typescript
// Serialize dragged item
const item = source[0] as PlanningTreeItem;
const itemData = JSON.stringify({
  item: item.item,
  filePath: item.filePath,
  status: item.status,
  type: item.type
});
dataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(itemData));
```

**Validation Pattern:**
```typescript
// Validate draggable items
const isDraggable = (node: TreeNode): boolean => {
  if (node.type === 'status-group') return false;
  const item = node as PlanningTreeItem;
  return item.type === 'story' || item.type === 'bug';
};
```

**Error Handling:**
- Log warnings for invalid drag attempts (don't block UI)
- Silently ignore drops on invalid targets
- Handle malformed DataTransfer gracefully

**Testing Approach:**
- Manual testing in VSCode Development Host
- Drag Story from "Ready" to "In Progress" (should log drop event)
- Try dragging Epic (should not show drag cursor)
- Try dropping on Story (should do nothing)
- Verify output channel logs show drag/drop events

## Related Stories

- **S61:** Status transition validation and file updates (depends on S60)
- **S62:** Visual feedback and user notifications (depends on S61)
- **F17:** Status-Based Kanban Layout (dependency)
