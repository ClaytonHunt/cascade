---
spec: S50
phase: 2
title: Enhanced Tooltip System
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Enhanced Tooltip System

## Overview

This phase replaces the simple string tooltip with a structured markdown-formatted tooltip that displays comprehensive item metadata. The enhancement provides users with detailed information on hover, including item identification, status, priority, and file location.

The current tooltip (line 74 of PlanningTreeProvider.ts) shows basic information: `[item]: [title]\nStatus: [status]\nPriority: [priority]`. This phase restructures the content using markdown for better readability and adds the file path for navigation context.

## Prerequisites

- Phase 1 completed (icon mapping implemented)
- TreeView displays items with correct icons
- TypeScript compiles without errors
- Understanding of VSCode markdown tooltip support

## Tasks

### Task 1: Review Tooltip API and Markdown Support

**Objective**: Understand TreeItem.tooltip property and markdown capabilities.

**Documentation**:
- VSCode API: https://code.visualstudio.com/api/references/vscode-api#TreeItem.tooltip
- MarkdownString API: https://code.visualstudio.com/api/references/vscode-api#MarkdownString

**Key concepts**:
- `TreeItem.tooltip` accepts `string | vscode.MarkdownString | undefined`
- Plain strings support `\n` for line breaks (current implementation)
- MarkdownString enables formatting: **bold**, *italic*, `code`, lists
- Markdown tooltips render with VSCode's markdown renderer (same as hover documentation)

**Verification**:
- ✅ Understand MarkdownString constructor and properties
- ✅ Confirm markdown subset supported in tooltips (headers, lists, bold/italic, code)
- ✅ Understand when to use MarkdownString vs plain string (enhancement vs simplicity)

**Decision**: Use plain string with improved structure. MarkdownString provides minimal benefit for simple key-value metadata display, and plain strings have better performance and simpler code.

### Task 2: Design Tooltip Content Structure

**Objective**: Define tooltip information hierarchy and formatting.

**Content structure**:
```
[item] - [title]
Type: [type] | Status: [status] | Priority: [priority]
File: [relative-path]
```

**Example output**:
```
E4 - Planning Kanban View
Type: epic | Status: In Progress | Priority: High
File: plans/epic-04-planning-kanban-view/epic.md
```

**Design rationale**:
- **Line 1**: Item identifier and title (most important info)
- **Line 2**: Metadata bar with type, status, priority (pipe-separated for compactness)
- **Line 3**: File path (relative to workspace root for readability)

**Information hierarchy**: Primary (item/title) → Secondary (type/status/priority) → Contextual (file path)

**Alternative considered**: Multi-line key-value format
```
Item: E4
Title: Planning Kanban View
Type: epic
Status: In Progress
Priority: High
File: plans/epic-04-planning-kanban-view/epic.md
```
Rejected: Too verbose, wastes vertical space, separates related info.

### Task 3: Create Tooltip Builder Helper Function

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Add new private method after `getIconForItemType()` (created in Phase 1)

**Implementation**:

```typescript
/**
 * Builds a formatted tooltip string for a planning item.
 *
 * Tooltip structure:
 * - Line 1: Item identifier and title
 * - Line 2: Type, Status, Priority (pipe-separated)
 * - Line 3: Relative file path (for navigation context)
 *
 * Example:
 * ```
 * E4 - Planning Kanban View
 * Type: epic | Status: In Progress | Priority: High
 * File: plans/epic-04-planning-kanban-view/epic.md
 * ```
 *
 * @param element - Planning tree item
 * @returns Formatted tooltip string with metadata
 */
private buildTooltip(element: PlanningTreeItem): string {
  // Calculate relative path from workspace root
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Build tooltip with structured format
  const lines = [
    `${element.item} - ${element.title}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  return lines.join('\n');
}
```

**Code explanation**:
- Uses `path.relative()` to convert absolute path to workspace-relative path
- Constructs 3-line tooltip with consistent structure
- Uses pipe separator (`|`) for metadata fields (compact, readable)
- Returns plain string (not MarkdownString) for performance
- Comprehensive documentation with example output

**Import requirement**: Ensure `path` module imported at top of file (already present from S49)

**Expected outcome**: Helper function compiles and returns formatted tooltip string.

### Task 4: Integrate Tooltip Builder into getTreeItem()

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Modify `getTreeItem()` method (currently contains basic tooltip at line 74)

**Current code** (line 73-77):
```typescript
// Set tooltip (shows on hover)
treeItem.tooltip = `${element.item}: ${element.title}\nStatus: ${element.status}\nPriority: ${element.priority}`;

// Set description (shows after label, dimmed)
treeItem.description = element.status;
```

**Modified code**:
```typescript
// Set tooltip with comprehensive metadata
treeItem.tooltip = this.buildTooltip(element);

// Set description (shows after label, dimmed)
treeItem.description = element.status;
```

**Changes**:
- Replace inline string concatenation with `this.buildTooltip(element)` call
- Update comment to reflect "comprehensive metadata" instead of "shows on hover"
- No other changes needed (description remains unchanged)

**Expected outcome**: TreeView items display enhanced tooltip on hover.

### Task 5: Compile and Verify TypeScript

**Command**:
```bash
cd vscode-extension
npm run compile
```

**Verification**:
- ✅ No TypeScript compilation errors
- ✅ No warnings about unused variables or imports
- ✅ Output: "Compiled successfully"

**Common issues**:
- `path` module not imported: Should already be imported from S49 (`import * as path from 'path';`)
- Type error on `buildTooltip()` return: Ensure returns `string` type
- `this.workspaceRoot` undefined: Already defined in constructor from S49

**Resolution**: Fix any compilation errors before proceeding to manual testing.

### Task 6: Manual Testing - Tooltip Display

**Setup**:
1. Package extension: `npm run package`
2. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"

**Test procedure**:
1. Open Cascade TreeView (Activity Bar → Cascade icon)
2. Hover over various items (Epic, Feature, Story, Bug)
3. Verify tooltip displays 3-line format:
   - Line 1: Item ID and title
   - Line 2: Type, Status, Priority (pipe-separated)
   - Line 3: Relative file path

**Test cases**:

**Case 1: Epic item**
- Hover over an epic (e.g., "E4 - Planning Kanban View")
- Expected tooltip:
  ```
  E4 - Planning Kanban View
  Type: epic | Status: In Progress | Priority: High
  File: plans/epic-04-planning-kanban-view/epic.md
  ```

**Case 2: Story item**
- Hover over a story (e.g., "S49 - TreeDataProvider Core Implementation")
- Expected tooltip:
  ```
  S49 - TreeDataProvider Core Implementation
  Type: story | Status: Ready | Priority: High
  File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-49-treedataprovider-core-implementation.md
  ```

**Case 3: Bug item** (if any exist)
- Hover over a bug item
- Verify Type field shows "bug"

**Verification checklist**:
- ✅ Tooltip appears on hover (no delay or flicker)
- ✅ All three lines display correctly
- ✅ Metadata fields show correct values (type, status, priority match file frontmatter)
- ✅ File path is relative to workspace root (not absolute path)
- ✅ Pipe separators properly formatted (spaces before/after)
- ✅ Tooltip readable in current theme (light/dark)
- ✅ No truncation or line wrapping issues

**Troubleshooting**:
- Tooltip not appearing: Check `treeItem.tooltip` assignment, verify no TypeScript errors
- Absolute path shown: Verify `path.relative()` call uses `this.workspaceRoot`
- Incorrect data: Check element properties match frontmatter data
- Formatting issues: Verify `\n` line breaks, pipe separators, spacing

### Task 7: Test Path Calculation Edge Cases

**Objective**: Verify relative path calculation works for different directory structures.

**Test cases**:

**Case 1: Root-level file** (e.g., `plans/project.md`)
- Expected: `File: plans/project.md`

**Case 2: Nested epic** (e.g., `plans/epic-04-planning-kanban-view/epic.md`)
- Expected: `File: plans/epic-04-planning-kanban-view/epic.md`

**Case 3: Deeply nested story** (e.g., `plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-49-treedataprovider-core-implementation.md`)
- Expected: Full relative path displayed without truncation

**Verification**:
- ✅ All path depths handled correctly
- ✅ Paths use forward slashes (consistent with VSCode display conventions)
- ✅ No absolute path components (e.g., no `D:\projects\lineage\...`)

**Windows-specific**: `path.relative()` returns backslashes on Windows. VSCode tooltips handle both forward and backslashes, so no conversion needed.

### Task 8: Output Channel Logging Verification

**Objective**: Ensure tooltip implementation doesn't generate errors.

**Steps**:
1. Open Output → Cascade
2. Check for errors during TreeView load or hover events

**Expected**: No new errors or warnings logged.

**If errors present**: Review `buildTooltip()` implementation, check path calculation, verify element properties exist.

## Completion Criteria

- ✅ `buildTooltip()` method created with full documentation
- ✅ Method returns 3-line formatted tooltip string
- ✅ File path calculated relative to workspace root
- ✅ `getTreeItem()` uses `buildTooltip()` instead of inline string
- ✅ TypeScript compiles without errors
- ✅ Extension packages successfully
- ✅ Manual testing confirms enhanced tooltip displays correctly
- ✅ All metadata fields (type, status, priority) show correct values
- ✅ Relative paths display for all directory depths
- ✅ Tooltip readable in light and dark themes
- ✅ Output channel shows no new errors

## Next Phase

**Phase 3: Collapsible State and Context Value**

With icons and tooltips complete, Phase 3 will refactor collapsible state logic into a dedicated helper function and add the `contextValue` property to enable type-specific context menus (used in F19).

This phase completes the TreeItem configuration by extracting collapsible state logic for maintainability and preparing for future context menu integration.
