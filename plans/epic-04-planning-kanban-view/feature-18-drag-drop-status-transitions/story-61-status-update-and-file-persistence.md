---
item: S61
title: Status Update and File Persistence
type: story
parent: F18
status: Completed
priority: High
estimate: M
dependencies: [S60]
spec: specs/S61-status-update-and-file-persistence/
created: 2025-10-16
updated: 2025-10-16
---

# S61 - Status Update and File Persistence

## Description

Implement status transition validation and frontmatter file updates when items are dropped in the TreeView. This story handles the core business logic of updating markdown files and triggering cache invalidation.

Builds on S60's drag-and-drop controller infrastructure to complete the status change workflow.

### Scope

**In Scope:**
- Implement status transition validation rules
- Update markdown file frontmatter `status:` field
- Update markdown file `updated:` timestamp
- Preserve all other frontmatter fields
- Integrate with existing FileSystemWatcher for auto-refresh
- Handle validation errors (invalid transitions)
- Handle file write errors
- Add comprehensive logging

**Out of Scope:**
- Visual feedback (cursor, highlights) - S62
- User notifications - S62
- Optimistic UI updates (future enhancement)

### Technical Implementation

**Status Transition Rules:**
```typescript
const validTransitions: Record<Status, Status[]> = {
  'Not Started': ['In Planning'],
  'In Planning': ['Ready', 'Not Started'],
  'Ready': ['In Progress', 'In Planning'],
  'In Progress': ['Completed', 'Blocked', 'Ready'],
  'Blocked': ['Ready', 'In Progress'],
  'Completed': ['In Progress']  // Reopen if needed
};

function isValidTransition(from: Status, to: Status): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
```

**File Update Function:**
```typescript
async function updateItemStatus(
  filePath: string,
  newStatus: Status,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  // Read file content
  const uri = vscode.Uri.file(filePath);
  const content = await vscode.workspace.fs.readFile(uri);
  const contentStr = Buffer.from(content).toString('utf-8');

  // Parse frontmatter
  const parsed = parseFrontmatter(contentStr);
  if (!parsed.success) {
    throw new Error(`Failed to parse frontmatter: ${parsed.error}`);
  }

  // Update status and timestamp
  const frontmatter = parsed.frontmatter!;
  const updatedFrontmatter = {
    ...frontmatter,
    status: newStatus,
    updated: new Date().toISOString().split('T')[0]  // YYYY-MM-DD
  };

  // Reconstruct file with updated frontmatter
  const yamlStr = yaml.dump(updatedFrontmatter);
  const newContent = `---\n${yamlStr}---\n${parsed.content}`;

  // Write file (atomic operation)
  await vscode.workspace.fs.writeFile(uri, Buffer.from(newContent, 'utf-8'));

  outputChannel.appendLine(`[DragDrop] Updated status: ${filePath}`);
  outputChannel.appendLine(`  ${frontmatter.status} → ${newStatus}`);

  // Note: FileSystemWatcher will automatically:
  // - Detect file change
  // - Invalidate cache
  // - Trigger TreeView refresh
}
```

**Integration with S60 Controller:**
```typescript
async handleDrop(
  target: TreeNode | undefined,
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): Promise<void> {
  // ... existing validation from S60 ...

  // Extract target status
  const targetStatus = (target as StatusGroupNode).status;

  // Validate transition
  if (!isValidTransition(item.status, targetStatus)) {
    this.outputChannel.appendLine(`[DragDrop] ❌ Invalid transition: ${item.status} → ${targetStatus}`);
    // TODO S62: Show error notification
    return;
  }

  // Update file
  try {
    await updateItemStatus(item.filePath, targetStatus, this.outputChannel);
    // TODO S62: Show success notification
  } catch (error) {
    this.outputChannel.appendLine(`[DragDrop] ❌ File update failed: ${error}`);
    // TODO S62: Show error notification
  }
}
```

**Frontmatter Parsing:**
Reuses existing `parseFrontmatter()` from `parser.ts` to extract YAML and markdown content.

**File Write Strategy:**
- Use `vscode.workspace.fs.writeFile()` for atomic writes
- FileSystemWatcher detects change automatically (300ms debounce)
- Cache invalidation happens automatically
- TreeView refresh happens automatically

### Dependencies

**S60 (Drag-and-Drop Controller):**
- Provides drop event handling infrastructure
- Validates drop targets and source items
- Integrates status update calls

**Existing Infrastructure:**
- S38 (FileSystemWatcher): Detects file changes
- S40 (FrontmatterCache): Invalidates on file change
- S39 (Parser): `parseFrontmatter()` function
- `js-yaml` library: YAML serialization

## Acceptance Criteria

- [ ] `isValidTransition()` function implemented with all 6 statuses
- [ ] `updateItemStatus()` function reads file and parses frontmatter
- [ ] `updateItemStatus()` updates `status:` field to new status
- [ ] `updateItemStatus()` updates `updated:` field to current date (YYYY-MM-DD)
- [ ] `updateItemStatus()` preserves all other frontmatter fields (item, title, type, etc.)
- [ ] `updateItemStatus()` writes file atomically
- [ ] Drop handler validates transition before updating file
- [ ] Invalid transitions are rejected (no file write, logged as error)
- [ ] File write errors are caught and logged
- [ ] FileSystemWatcher detects file change and refreshes TreeView
- [ ] Dropped item moves to target status group after refresh
- [ ] No duplicate files created
- [ ] No data loss in frontmatter fields

## Test Scenarios

**Valid Transitions:**
1. Drag Story from "Ready" → "In Progress"
   - File `status:` changes to "In Progress"
   - File `updated:` changes to today's date
   - TreeView refreshes, item appears in "In Progress" group

2. Drag Story from "In Progress" → "Completed"
   - File `status:` changes to "Completed"
   - TreeView refreshes, item appears in "Completed" group

**Invalid Transitions:**
1. Drag Story from "Not Started" → "In Progress"
   - Drop rejected (logs error)
   - File unchanged
   - TreeView unchanged
   - (S62 will add error notification)

2. Drag Story from "Completed" → "Ready"
   - Drop rejected (logs error)
   - File unchanged

**Edge Cases:**
1. Drag Story to its current status group
   - Transition validated (same status is valid)
   - File updated with new timestamp
   - TreeView refreshes (no visible change)

2. File write fails (read-only file, disk full)
   - Error caught and logged
   - TreeView unchanged
   - (S62 will add error notification)

## Implementation Notes

**Date Format:**
```typescript
// Generate YYYY-MM-DD date
const today = new Date().toISOString().split('T')[0];
// Example: "2025-10-16"
```

**Frontmatter Preservation:**
Ensure all optional fields are preserved:
- `dependencies: []`
- `estimate: M`
- `spec: specs/S60-...`
- Any future fields

**Error Recovery:**
- File parse errors: Log and abort (don't corrupt file)
- File write errors: Log and show notification (S62)
- Invalid transitions: Log and show notification (S62)

**Performance:**
- File reads are fast (< 10ms for typical markdown files)
- File writes are atomic (VSCode API guarantees)
- FileSystemWatcher debouncing prevents excessive refreshes

## Related Stories

- **S60:** Drag-and-Drop Controller Implementation (dependency)
- **S62:** Visual Feedback and Notifications (depends on S61)
- **S38:** File System Watcher (infrastructure)
- **S40:** Frontmatter Cache Layer (infrastructure)
