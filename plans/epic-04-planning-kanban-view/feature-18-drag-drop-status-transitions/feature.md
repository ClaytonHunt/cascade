---
item: F18
title: Drag-and-Drop Status Transitions
type: feature
parent: E4
status: Completed
priority: High
dependencies: [F17]
created: 2025-10-13
updated: 2025-10-16
---

# F18 - Drag-and-Drop Status Transitions

## Description

Enable direct manipulation of planning items through drag-and-drop between status columns. Users can drag a Story or Bug from one status group to another, automatically updating the markdown file's frontmatter and triggering a TreeView refresh.

This feature provides the most intuitive interaction pattern for status management, eliminating manual file editing for status changes.

### Key Components

**Drag-and-Drop Controller:**
- Implement `vscode.TreeDragAndDropController` interface
- Configure drag MIME types for planning items
- Handle drop events between status groups
- Validate status transitions

**Drag Restrictions:**
- Only Stories and Bugs are draggable (leaf items)
- Epics and Features are not draggable (status derived from children)
- Status groups are not drag targets for non-item elements
- Cannot drag items outside TreeView

**Drop Handling:**
- Parse target status from drop location
- Validate status transition is legal (see Status Transition Rules)
- Update markdown file frontmatter `status:` field
- Preserve all other frontmatter fields
- Update `updated:` timestamp

**Visual Feedback:**
- Show drag preview with item label
- Highlight valid drop targets during drag
- Show error indicator for invalid drops
- Display VSCode notification on successful/failed drop

**File Update Mechanism:**
```typescript
1. User drags Story 39 from "Ready" to "In Progress"
2. Drop handler identifies target status: "In Progress"
3. Validate transition: Ready → In Progress ✅
4. Read markdown file for Story 39
5. Parse frontmatter using parseFrontmatter()
6. Update status field: "In Progress"
7. Update updated field: current date
8. Write file using Edit tool
9. FileSystemWatcher detects change (automatic from S38)
10. Cache invalidates (automatic from S40)
11. TreeView refreshes (trigger _onDidChangeTreeData.fire())
```

### Technical Details

**TreeDragAndDropController Interface:**
```typescript
class PlanningDragAndDropController implements vscode.TreeDragAndDropController<PlanningTreeItem> {
  dropMimeTypes = ['application/vnd.code.tree.planningKanbanView'];
  dragMimeTypes = ['application/vnd.code.tree.planningKanbanView'];

  handleDrag(
    source: PlanningTreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Serialize dragged items
  }

  handleDrop(
    target: PlanningTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Update status and write file
  }
}
```

**Status Transition Validation:**
```typescript
const validTransitions: Record<string, string[]> = {
  'Not Started': ['In Planning'],
  'In Planning': ['Ready', 'Not Started'],
  'Ready': ['In Progress', 'In Planning'],
  'In Progress': ['Completed', 'Blocked', 'Ready'],
  'Blocked': ['Ready', 'In Progress'],
  'Completed': ['In Progress']  // Reopen if needed
};

function isValidTransition(from: string, to: string): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
```

**Frontmatter Update:**
```typescript
async function updateItemStatus(
  filePath: string,
  newStatus: string
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = parseFrontmatter(content);

  // Validate frontmatter exists
  if (!parsed.frontmatter) {
    throw new Error('No frontmatter found');
  }

  // Update status and timestamp
  const updatedFrontmatter = {
    ...parsed.frontmatter,
    status: newStatus,
    updated: new Date().toISOString().split('T')[0]
  };

  // Reconstruct file with updated frontmatter
  const newContent = `---\n${yaml.stringify(updatedFrontmatter)}---\n${parsed.content}`;

  await fs.writeFile(filePath, newContent, 'utf-8');

  // Note: FileSystemWatcher (S38) will automatically:
  // - Detect file change
  // - Invalidate cache (S40)
  // - Trigger TreeView refresh
}
```

## Analysis Summary

### Dependencies

**F17 (Status-Based Kanban Layout):**
- Depends on status group structure for drop targets
- Extends TreeDataProvider with drag-and-drop controller
- Uses existing status validation logic

**Existing Infrastructure:**
- S38 (FileSystemWatcher): Detects file changes automatically
- S40 (Cache): Invalidates on file change
- S39 (Parser): Used for reading/updating frontmatter
- Edit tool: For precise frontmatter field updates

### VSCode API Integration

**TreeView Registration with DnD:**
```typescript
const treeView = vscode.window.createTreeView('planningKanbanView', {
  treeDataProvider: planningTreeProvider,
  dragAndDropController: new PlanningDragAndDropController(),
  canSelectMany: false
});
```

**MIME Type Configuration:**
- Use unique MIME type for planning items
- Prevents dragging into unrelated views
- Enables multi-item drag (future enhancement)

### Error Handling

**Invalid Transitions:**
- Show warning notification: "Cannot transition from X to Y"
- Do not update file
- Log error for debugging

**File Write Failures:**
- Catch file system errors
- Show error notification with details
- Revert UI state if possible
- Log stack trace

**Parse Failures:**
- Handle malformed frontmatter gracefully
- Notify user of frontmatter issues
- Provide "Open File" action in notification

## Acceptance Criteria

- [ ] Stories and Bugs draggable between status columns
- [ ] Epics and Features not draggable (status derived from children)
- [ ] Valid drop targets highlighted during drag
- [ ] Invalid drops rejected with error notification
- [ ] Status transition validation enforces legal transitions
- [ ] Markdown file frontmatter `status:` field updates on drop
- [ ] Markdown file `updated:` timestamp updates on drop
- [ ] TreeView refreshes automatically after drop
- [ ] FileSystemWatcher integration works (no manual refresh)
- [ ] Error notifications show for file write failures
- [ ] Performance: drop completes within 200ms
- [ ] Multi-item drag disabled (single item only)

## Child Items

### Stories

**S60: Drag-and-Drop Controller Implementation** - Priority: High, Est: M
- Implement `TreeDragAndDropController` interface
- Handle drag and drop events
- Validate draggable items (Stories/Bugs only)
- Validate drop targets (status groups only)
- Integrate with TreeView registration
- Status: Not Started

**S61: Status Update and File Persistence** - Priority: High, Est: M
- Implement status transition validation
- Update markdown file frontmatter
- Preserve all frontmatter fields
- Handle validation and file write errors
- Integrate with FileSystemWatcher for auto-refresh
- Status: Not Started
- Dependencies: S60

**S62: Visual Feedback and Notifications** - Priority: Medium, Est: S
- Success notifications for valid transitions
- Error notifications for invalid transitions
- Error notifications for file write failures
- Action buttons for error recovery ("Open File")
- Status: Not Started
- Dependencies: S61
