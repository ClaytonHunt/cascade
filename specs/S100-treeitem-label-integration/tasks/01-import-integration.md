---
spec: S100
phase: 1
title: Import and Integration
status: Completed
priority: High
created: 2025-10-28
updated: 2025-10-28
---

# Phase 1: Import and Integration

## Overview

This phase adds the `formatItemLabel` import to `PlanningTreeProvider.ts` and replaces the inline label formatting with the centralized formatter function. This is a minimal change that touches only two lines of code.

## Prerequisites

- S99 completed (labelFormatter module exists and is tested)
- Understanding of TypeScript module imports
- Familiarity with PlanningTreeProvider structure

## Tasks

### Task 1: Add formatItemLabel Import

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:13`

**Current Imports** (lines 1-13):
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
import { FrontmatterCache } from '../cache';
import { Status, ViewMode } from '../types';
import { HierarchyNode, ItemPathParts } from './HierarchyNode';
import { getTreeItemIcon } from '../statusIcons';
import { StatusPropagationEngine } from './StatusPropagationEngine';
import { isItemArchived } from './archiveUtils';
import { renderStatusBadge } from './badgeRenderer';
import { renderProgressBar } from './progressRenderer';
import { readSpecProgress, SpecProgress } from './specProgressReader';
import { renderSpecPhaseIndicator } from './specPhaseRenderer';
```

**Add New Import** (after line 13):
```typescript
import { formatItemLabel } from './labelFormatter';
```

**Expected Outcome**:
- Import statement added at line 14
- TypeScript compiler resolves import successfully
- No compilation errors

**Validation**:
```bash
cd vscode-extension
npm run compile
```

Should complete without errors.

---

### Task 2: Replace Inline Label Formatting

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:840`

**Current Code** (line 838-840):
```typescript
// Existing logic for PlanningTreeItem continues below...
// Format label: "[item] - [title]"
// Examples: "E4 - Planning Kanban View", "S49 - TreeDataProvider Core Implementation"
const label = `${element.item} - ${element.title}`;
```

**Replace With**:
```typescript
// Existing logic for PlanningTreeItem continues below...
// Format label with type prefix: "Type # - Title"
// Examples: "Epic E4 - Planning Kanban View", "Story S49 - TreeDataProvider Core Implementation"
const label = formatItemLabel(element);
```

**Expected Outcome**:
- Label variable now uses `formatItemLabel(element)` instead of inline template literal
- Comment updated to reflect new format
- TypeScript compiler infers correct return type (string)
- No compilation errors

**Validation**:
```bash
cd vscode-extension
npm run compile
```

Should complete without errors.

---

### Task 3: Verify Status Group Labels Unchanged

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:816-835`

**Review Status Group Logic**:
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

**Expected Outcome**:
- Status group early return (line 816-835) occurs BEFORE label formatting code (line 840)
- Status groups continue to use `statusGroup.label` directly (line 821)
- No changes needed to status group logic

**Validation**:
- Visual inspection only
- Confirm status group formatting remains: `{StatusName} ({count})`

---

### Task 4: Verify Compilation Success

**Steps**:
1. Open terminal in `vscode-extension/` directory
2. Run TypeScript compiler:
   ```bash
   npm run compile
   ```
3. Verify no errors or warnings
4. Check output for successful compilation message

**Expected Outcome**:
```
> cascade@0.1.0 compile
> tsc -p ./

[No errors displayed]
```

**Troubleshooting**:
- If import error: Verify `labelFormatter.ts` exists at `src/treeview/labelFormatter.ts`
- If type error: Verify `formatItemLabel` signature matches `(item: PlanningTreeItem) => string`
- If module not found: Run `npm install` to ensure dependencies are installed

---

## Completion Criteria

✅ **Phase 1 Complete When**:
1. `formatItemLabel` import added to line 14 of PlanningTreeProvider.ts
2. Inline label formatting replaced with `formatItemLabel(element)` call at line 840
3. Comment updated to reflect new label format
4. TypeScript compilation succeeds without errors
5. Status group logic confirmed unchanged (visual inspection)

**Validation Command**:
```bash
cd vscode-extension && npm run compile
```

**Output Should Contain**:
- No TypeScript errors
- No linting warnings related to changed lines
- Successful compilation message

---

## Next Phase

Proceed to **Phase 2: Testing and Verification** (`tasks/02-testing-verification.md`)
- Run existing test suite
- Package extension
- Manual verification of all item types
- Verify backward compatibility (badges, progress bars, spec indicators)
