---
spec: S56
phase: 2
title: TreeItem Integration
status: Completed
priority: Medium
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: TreeItem Integration

## Overview

This phase integrates progress calculation into the TreeView rendering pipeline. The `getTreeItem()` method is modified to call `calculateProgress()` for Epic and Feature items, displaying progress in the TreeItem description field.

**Deliverables**:
1. Modified `getTreeItem()` method to calculate and display progress
2. Description field formatting: `"${status} ${progressDisplay}"`
3. Graceful handling of null progress (items without children)
4. Visual verification in TreeView

## Prerequisites

- Phase 1 completed: Progress calculation core implemented
- `calculateProgress()` method working and tested
- Progress cache functional
- Understanding of TreeItem description field behavior in VSCode

## Tasks

### Task 1: Modify getTreeItem() for Epic and Feature Items

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts:89

**Action**: Add progress calculation and display to TreeItem rendering

**Current Code** (lines 112-146):

```typescript
// Existing logic for PlanningTreeItem continues below...
// Format label: "[item] - [title]"
// Examples: "E4 - Planning Kanban View", "S49 - TreeDataProvider Core Implementation"
const label = `${element.item} - ${element.title}`;

// Determine collapsible state (parent items collapse, leaf items don't)
const collapsibleState = this.getCollapsibleState(element);

// Create TreeItem
const treeItem = new vscode.TreeItem(label, collapsibleState);

// Set icon based on item type
treeItem.iconPath = this.getIconForItemType(element.type);

// Set resourceUri for file association (enables click handling)
treeItem.resourceUri = vscode.Uri.file(element.filePath);

// Set tooltip with comprehensive metadata
treeItem.tooltip = this.buildTooltip(element);

// Set description (shows after label, dimmed)
treeItem.description = element.status;

// Set context value for context menu filtering (used in F19)
// Enables type-specific menu items via "when": "viewItem == [type]"
treeItem.contextValue = element.type;

// Assign command for click handling (S51)
treeItem.command = {
  command: 'cascade.openFile',
  title: 'Open File',
  arguments: [element.filePath]
};

return treeItem;
```

**New Code**:

Replace lines 133-134 with:

```typescript
// Set description (shows after label, dimmed)
// For Epic/Feature: Include progress indicator if children exist
if (element.type === 'epic' || element.type === 'feature') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);

  if (progress) {
    // Has children - show status with progress
    treeItem.description = `${element.status} ${progress.display}`;
    // Example: "In Progress (3/5)"
  } else {
    // No children - show status only
    treeItem.description = element.status;
  }
} else {
  // Leaf items (story, bug) - show status only (no progress)
  treeItem.description = element.status;
}
```

**Location Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:133-134

**Implementation Notes**:
- Only calculate progress for `epic` and `feature` types (parent items)
- Preserve existing behavior for `story` and `bug` (leaf items)
- Handle null progress gracefully (items without children yet)
- Progress display appends to status string with space separator

**VSCode API Reference**:
- `TreeItem.description` field: https://code.visualstudio.com/api/references/vscode-api#TreeItem.description
- Displays after label in dimmed color
- Automatically truncates with ellipsis if too long

**Edge Cases Handled**:
- Epic/Feature with no children: Shows status only (no "(0/0)")
- Epic/Feature with children: Shows status + progress
- Story/Bug: Unchanged behavior (status only)
- Async operation: Method signature already async

---

### Task 2: Update Method Signature if Needed

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts:89

**Action**: Verify getTreeItem() signature allows async operations

**Current Signature** (line 89):
```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
```

**Analysis**:
- VSCode TreeDataProvider interface defines `getTreeItem()` as synchronous
- However, TypeScript allows returning `Promise<TreeItem>` or `TreeItem | Promise<TreeItem>`
- Need to verify if async operations work in practice

**Documentation**:
- VSCode TreeDataProvider: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- `getTreeItem` signature: `(element: T) => TreeItem | Thenable<TreeItem>`
- **Conclusion**: Async is supported via `Thenable<TreeItem>`

**Implementation Options**:

**Option A: Make method async (preferred)**
```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // ... existing code with await ...
  const progress = await this.calculateProgress(element);
  // ... rest of method ...
}
```

**Option B: Use .then() for progress only**
```typescript
getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
  // ... sync code for status groups ...

  // For planning items, return promise if progress needed
  if (element.type === 'epic' || element.type === 'feature') {
    return this.calculateProgress(element).then(progress => {
      // Build and return TreeItem
    });
  }

  // Sync return for other types
}
```

**Recommendation**: Use Option A (async/await)
- Cleaner code, easier to read
- VSCode supports Promise return type
- Consistent with existing async patterns in codebase

**Action**: Change method signature to:
```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
```

**Location Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:89

---

### Task 3: Handle Status Groups (No Progress)

**Location**: vscode-extension/src/treeview/PlanningTreeProvider.ts:91

**Action**: Ensure status group rendering unchanged

**Current Code** (lines 91-110):
```typescript
// Handle status group nodes
if (element.type === 'status-group') {
  const statusGroup = element as StatusGroupNode;

  // Create TreeItem with label (includes count badge)
  const treeItem = new vscode.TreeItem(
    statusGroup.label,
    statusGroup.collapsibleState
  );

  // Set folder icon for status groups
  treeItem.iconPath = new vscode.ThemeIcon('folder');

  // Set context value for context menu filtering (future use)
  treeItem.contextValue = 'status-group';

  // No command assignment (status groups aren't clickable/openable)
  // No resourceUri (not backed by file)

  return treeItem;
}
```

**Action**: No changes needed for status groups

**Validation**:
- Status groups render identically before and after change
- No progress calculation attempted for status groups
- Early return prevents progress logic execution

---

### Task 4: Compile and Install Extension

**Action**: Build and install extension for manual testing

**Commands**:

```bash
# Navigate to extension directory
cd vscode-extension

# Clean previous build
rm -f *.vsix

# Compile TypeScript
npm run compile

# Package extension as VSIX
npm run package

# Install in VSCode (force reinstall)
code --install-extension cascade-0.1.0.vsix --force
```

**Expected Output**:
```
> cascade@0.1.0 compile
> tsc -p ./

> cascade@0.1.0 package
> vsce package

Executing prepublish script 'npm run compile'...
...
DONE  Packaged: cascade-0.1.0.vsix (X files, Y MB)

Extension 'cascade-0.1.0.vsix' was successfully installed.
```

**Validation**:
- [ ] TypeScript compiles without errors
- [ ] VSIX package created successfully
- [ ] Extension installs in VSCode
- [ ] No installation errors or warnings

---

### Task 5: Manual Visual Testing

**Action**: Verify progress display in TreeView

**Test Procedure**:

1. **Reload VSCode Window**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Developer: Reload Window"
   - Press Enter

2. **Open Output Channel**
   - Press `Ctrl+Shift+P` → "View: Toggle Output"
   - Select "Cascade" from dropdown
   - Verify: "Extension activated" message appears
   - Verify: "[Progress] Cache cleared" messages appear

3. **Open Cascade TreeView**
   - Click Cascade icon in Activity Bar (left sidebar)
   - TreeView should display planning items

4. **Visual Verification - Epic Items**
   - Locate an Epic item (e.g., "E4 - Planning Kanban View")
   - **Expected**: Description shows status + progress
     - Example: "In Progress (3/4)" if 3 of 4 features completed
     - Example: "Ready (0/2)" if 0 of 2 features completed
   - **Edge Case**: Epic with no features shows status only (no progress)

5. **Visual Verification - Feature Items**
   - Expand an Epic to see Feature items
   - Locate a Feature item (e.g., "F17 - Status-Based Kanban Layout")
   - **Expected**: Description shows status + progress
     - Example: "Completed (3/3)" if all stories completed
     - Example: "In Progress (2/5)" if 2 of 5 stories completed
   - **Edge Case**: Feature with no stories shows status only (no progress)

6. **Visual Verification - Story Items**
   - Expand a Feature to see Story items
   - Locate a Story item (e.g., "S56 - Progress Indicators")
   - **Expected**: Description shows status only (no progress)
     - Example: "Not Started" or "In Progress" or "Completed"
   - **No Change**: Stories never show progress (they're leaf nodes)

7. **Test Status Change Updates**
   - Open a story file from TreeView
   - Change status in frontmatter (e.g., "Not Started" → "Completed")
   - Save file
   - **Expected**: TreeView refreshes, parent Feature progress updates
   - **Example**: Feature progress changes from "(2/5)" to "(3/5)"

8. **Test Cache Performance**
   - Collapse and re-expand same status group multiple times
   - Check Output Channel for cache messages
   - **Expected**: "[Progress] Calculated for E4: (3/4)" appears once
   - **Expected**: Subsequent expansions use cached value (no new messages)
   - **Performance**: No visible lag when expanding nodes

**Test Data Requirements**:
- At least one Epic with multiple Features (to show progress)
- At least one Feature with multiple Stories (to show progress)
- Mixed completion statuses (some completed, some not) for interesting progress

**Documentation**:
- Take screenshots of TreeView showing progress indicators
- Note any display issues (truncation, formatting, alignment)

---

### Task 6: Edge Case Testing

**Action**: Test boundary conditions and edge cases

**Test Cases**:

1. **Epic with No Features**
   - Create or find Epic with no child features
   - **Expected**: Description shows status only (e.g., "In Planning")
   - **Not Expected**: "(0/0)" or error messages

2. **Feature with No Stories**
   - Create or find Feature with no child stories
   - **Expected**: Description shows status only (e.g., "Not Started")
   - **Not Expected**: "(0/0)" or error messages

3. **All Children Completed**
   - Feature with all stories status "Completed"
   - **Expected**: Progress shows "(3/3)" with 100%
   - **Visual**: Should match other completed items

4. **No Children Completed**
   - Feature with all stories status "Not Started"
   - **Expected**: Progress shows "(0/3)" with 0%
   - **Visual**: Clear indication of no progress

5. **Mixed Statuses**
   - Feature with children in various states: Completed, In Progress, Not Started, Blocked
   - **Expected**: Only counts "Completed" status
   - **Example**: 2 Completed + 1 In Progress + 2 Not Started = "(2/5)"

6. **Bug Items**
   - Verify Bug items (B1, B2, etc.) never show progress
   - **Expected**: Status only, no progress indicator
   - **Same as Stories**: Leaf nodes don't track progress

7. **Long Description Text**
   - Epic with long title + long status + progress
   - **Expected**: VSCode truncates with ellipsis automatically
   - **No Error**: Text doesn't overflow or break layout

**Validation Checklist**:
- [ ] Epics without Features show status only
- [ ] Features without Stories show status only
- [ ] All-completed shows correct progress (X/X)
- [ ] Zero-completed shows correct progress (0/X)
- [ ] Mixed statuses count only "Completed"
- [ ] Bug items never show progress
- [ ] Long text truncates gracefully

---

## Completion Criteria

### Code Quality
- [ ] getTreeItem() method updated with progress logic
- [ ] Method signature changed to async if needed
- [ ] Code follows existing conventions (style, comments)
- [ ] No TypeScript compilation errors

### Functionality
- [ ] Epic items show progress when they have Features
- [ ] Feature items show progress when they have Stories/Bugs
- [ ] Story/Bug items show status only (no progress)
- [ ] Items without children show status only (no "(0/0)")
- [ ] Progress format: "[status] (X/Y)" with space separator

### Testing
- [ ] Extension compiles and packages successfully
- [ ] Extension installs in VSCode without errors
- [ ] TreeView displays progress for parent items
- [ ] Progress updates when child status changes
- [ ] Cache improves performance (no recalculation lag)
- [ ] All edge cases handled gracefully

### Visual Verification
- [ ] Progress displays correctly in light theme
- [ ] Progress displays correctly in dark theme
- [ ] Text alignment and spacing looks professional
- [ ] No layout issues or text overflow
- [ ] Consistent with existing TreeView styling

### Documentation
- [ ] Code comments explain progress integration
- [ ] Output channel logs progress calculations
- [ ] Screenshots captured for documentation (optional)

## Next Phase

**Phase 3: Testing and Validation** - Create comprehensive unit tests for progress calculation logic, validate cache behavior, and perform final end-to-end testing across various scenarios.

**Changes in Phase 3**:
- Create `progressCalculation.test.ts` test suite
- Test calculateProgress() with various child configurations
- Test getDirectChildren() correctness
- Test cache invalidation timing
- Manual testing: large hierarchies, performance validation
