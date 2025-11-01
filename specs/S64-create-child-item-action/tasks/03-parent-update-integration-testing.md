---
spec: S64
phase: 3
title: Parent File Update and Integration Testing
status: Completed
priority: High
created: 2025-10-17
updated: 2025-10-17
---

# Phase 3: Parent File Update and Integration Testing

## Overview

Implement parent file updating to add references to newly created child items in the "## Child Items" section. Perform end-to-end testing to verify FileSystemWatcher integration and TreeView auto-refresh behavior.

## Prerequisites

- Phase 2 completed (main command creates files successfully)
- Understanding of markdown content manipulation
- Knowledge of FileSystemWatcher behavior (S38)

## Tasks

### Task 1: Implement updateParentWithChild() Function

**Location:** `vscode-extension/src/extension.ts` (after generateChildItemTemplate function)

Create function to update parent file with child reference:

```typescript
/**
 * Updates parent file to add reference to newly created child item.
 *
 * Adds child reference to "## Child Items" section in parent markdown.
 * Creates section if it doesn't exist.
 *
 * Section format:
 * ```markdown
 * ## Child Items
 *
 * - **F20**: User Authentication
 * - **S65**: Test Story Creation
 * ```
 *
 * @param parentPath - Absolute path to parent item file
 * @param childItem - Child item number (e.g., "F20", "S65")
 * @param childTitle - Child item title
 * @throws Error if file read/write fails
 */
async function updateParentWithChild(
  parentPath: string,
  childItem: string,
  childTitle: string
): Promise<void> {
  // Read parent file
  const uri = vscode.Uri.file(parentPath);
  const content = await vscode.workspace.fs.readFile(uri);
  const contentStr = Buffer.from(content).toString('utf-8');

  let updatedContent: string;

  // Check if "## Child Items" section exists
  if (contentStr.includes('## Child Items')) {
    // Append to existing section (after header line)
    // Find section and add new item as first entry (prepend to list)
    updatedContent = contentStr.replace(
      /## Child Items\n\n/,
      `## Child Items\n\n- **${childItem}**: ${childTitle}\n`
    );
  } else {
    // Add new section at end of file
    updatedContent = contentStr.trimEnd() + `\n\n## Child Items\n\n- **${childItem}**: ${childTitle}\n`;
  }

  // Write updated parent file
  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(updatedContent, 'utf-8')
  );

  outputChannel.appendLine(`[CreateChild] Updated parent: ${parentPath}`);
  outputChannel.appendLine(`  Added child: ${childItem} - ${childTitle}`);
}
```

**Parent File Updates:**

Before (Epic without Child Items section):
```markdown
---
item: E4
...
---

# E4 - Planning Kanban View

## Description

Epic for building kanban-style planning view.
```

After (Epic with new Feature):
```markdown
---
item: E4
...
---

# E4 - Planning Kanban View

## Description

Epic for building kanban-style planning view.

## Child Items

- **F20**: User Authentication
```

**Edge Cases:**
- Section exists but is empty → Adds first item
- Section exists with items → Prepends new item at top
- Section doesn't exist → Creates section at end

**Expected Outcome:** Parent file updated with child reference in correct format

### Task 2: Integrate Parent Update into Main Command

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand function, after file write)

Call updateParentWithChild() after creating child file:

```typescript
// Write file atomically (from Phase 2, Task 5)
await vscode.workspace.fs.writeFile(
  vscode.Uri.file(childPath),
  Buffer.from(content, 'utf-8')
);

outputChannel.appendLine(`[CreateChild] ✅ File created: ${childPath}`);

// Update parent file with child reference
await updateParentWithChild(parentItem.filePath, itemNumber, title);

// Open file in editor (continues from Phase 2)
const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(childPath));
// ...
```

**Execution Order:**
1. Create child file
2. Update parent file (adds reference)
3. Open child file in editor
4. Show success notification

**FileSystemWatcher Triggers:**
- Child file creation → Triggers refresh (new file detected)
- Parent file update → Triggers refresh (file changed detected)
- 300ms debounce prevents double refresh

**Expected Outcome:** Parent file updated immediately after child creation, before opening in editor

### Task 3: Verify FileSystemWatcher Integration

**Testing Steps:**

1. **Package and Install Extension:**
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode Window:**
   - Press Ctrl+Shift+P → "Developer: Reload Window"

3. **Open Output Channel:**
   - Press Ctrl+Shift+P → "View: Toggle Output"
   - Select "Cascade" from dropdown

4. **Test Child Item Creation:**
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Expand "Not Started" status group (or any group with Epics/Features)
   - Right-click on an Epic (e.g., E4)
   - Select "Create Child Item"
   - Enter title: "Test Feature Creation"
   - Observe output channel

**Expected Output Channel Logs:**
```
[CreateChild] Creating child feature for E4
[CreateChild] Title: Test Feature Creation
[CreateChild] Generated item number: F20
[CreateChild] Slugified title: test-feature-creation
[CreateChild] Target path: D:\projects\lineage\plans\epic-04-...\feature-20-test-feature-creation\feature.md
[CreateChild] Created directory: D:\projects\lineage\plans\epic-04-...\feature-20-test-feature-creation
[CreateChild] Frontmatter created:
  Item: F20
  Type: feature
  Status: Not Started
  Priority: Medium
[CreateChild] ✅ File created: D:\projects\lineage\plans\...\feature.md
[CreateChild] Updated parent: D:\projects\lineage\plans\epic-04-...\epic.md
  Added child: F20 - Test Feature Creation
[CreateChild] File opened in editor
[CreateChild] ✅ Command completed successfully

[2025-10-17 14:30:45] FILE_CREATED: plans/epic-04-.../feature-20-.../feature.md
[2025-10-17 14:30:45] REFRESH: TreeView updated (new file)
[2025-10-17 14:30:45] FILE_CHANGED: plans/epic-04-.../epic.md
[2025-10-17 14:30:45] REFRESH: TreeView updated (file changed)
```

**Expected Behavior:**
- File created successfully
- Parent file updated with child reference
- File opens in editor
- Success toast notification: "F20 - Test Feature Creation created successfully"
- TreeView refreshes automatically (shows new Feature)
- No errors in output channel

### Task 4: Test Edge Cases

**Test Case 1: Empty Title**
1. Right-click Epic → "Create Child Item"
2. Leave input box empty → Press Enter
3. Validation error shown: "Title cannot be empty"
4. No file created

**Test Case 2: Very Long Title (>100 chars)**
1. Right-click Epic → "Create Child Item"
2. Enter 101-character title
3. Validation error shown: "Title too long (max 100 characters)"
4. No file created

**Test Case 3: Special Characters in Title**
1. Right-click Epic → "Create Child Item"
2. Enter title: "User Auth & Session Management (v2.0)!"
3. File created with slugified name: `feature-XX-user-auth-session-management-v2-0`
4. Title preserved in frontmatter exactly: "User Auth & Session Management (v2.0)!"

**Test Case 4: Cancel Input**
1. Right-click Epic → "Create Child Item"
2. Press ESC in input box
3. Output channel logs: "User cancelled"
4. No file created, no error shown

**Test Case 5: Story Under Feature**
1. Right-click Feature → "Create Child Item"
2. Enter title: "Test Story Creation"
3. Story file created in Feature directory (no subdirectory)
4. File path: `plans/epic-XX-.../feature-YY-.../story-ZZ-test-story-creation.md`
5. Feature file updated with story reference

**Test Case 6: Multiple Child Items**
1. Create first child: F20
2. Verify parent shows: `- **F20**: First Feature`
3. Create second child: F21
4. Verify parent shows both (F21 first):
   ```markdown
   ## Child Items

   - **F21**: Second Feature
   - **F20**: First Feature
   ```

**Expected Outcome:** All edge cases handled gracefully, no crashes or data corruption

### Task 5: Verify TreeView Auto-Refresh

**Testing Steps:**

1. **Before Creating Child:**
   - Note items count in status group (e.g., "Not Started (5)")
   - Expand status group to view items

2. **Create Child Item:**
   - Right-click Epic → "Create Child Item"
   - Enter valid title → Confirm

3. **Observe TreeView:**
   - Status group count increments automatically (e.g., "Not Started (6)")
   - New item appears in list (no manual refresh needed)
   - TreeView expansion state preserved (Epic still expanded)

4. **Verify Parent Shows Progress (S56):**
   - Epic shows progress indicator (if Feature created)
   - Feature shows progress indicator (if Story created)
   - Example: "E4 - Planning Kanban View" → "E4 - Planning Kanban View (In Progress) (5/8)"

**FileSystemWatcher Behavior:**
- 300ms debounce prevents immediate double-refresh
- Child file creation triggers first refresh
- Parent file update triggers second refresh (debounced)
- Result: Single TreeView update after both operations complete

**Expected Outcome:** TreeView updates automatically within 300ms, no manual refresh needed

### Task 6: Performance and Memory Testing

**Testing Steps:**

1. **Create Multiple Child Items Rapidly:**
   - Right-click Epic → Create 5 Features in quick succession
   - Observe output channel for timing logs
   - Check for memory leaks (Task Manager → VSCode process)

2. **Verify Cache Behavior:**
   - Output channel shows cache hit/miss logs
   - Subsequent operations use cached data
   - No redundant file scans

3. **Test with Large Workspace (100+ items):**
   - Generate test data (if needed): `node scripts/generate-test-data.js 100`
   - Create child item
   - Verify command completes in < 500ms
   - Check cache statistics: Ctrl+Shift+P → "Cascade: Show Cache Statistics"

**Performance Targets (from CLAUDE.md):**
- TreeView refresh < 500ms with 100+ items
- Cache hit rate > 80% after initial load
- No visible lag in TreeView updates

**Expected Outcome:** Acceptable performance, no memory leaks, cache working efficiently

## Completion Criteria

- ✅ `updateParentWithChild()` function correctly updates parent markdown
- ✅ Parent file shows child references in "## Child Items" section
- ✅ Function handles both existing and new "## Child Items" sections
- ✅ Parent update integrated into main command flow
- ✅ FileSystemWatcher triggers refresh automatically
- ✅ Output channel logs show complete workflow
- ✅ All edge cases tested and handled (empty title, special chars, cancel, etc.)
- ✅ TreeView refreshes automatically without manual intervention
- ✅ Status group counts update correctly
- ✅ No errors in console or output channel
- ✅ Performance acceptable with 100+ items
- ✅ Extension packaged and installed successfully

## Next Steps

✅ **S64 Implementation Complete!**

The "Create Child Item" context menu action is fully implemented and tested. Users can now:
- Right-click Epics to create Features
- Right-click Features to create Stories
- Automatic item number generation
- Automatic parent file updates
- Automatic TreeView refresh

Mark S64 as "Completed" in planning files.
