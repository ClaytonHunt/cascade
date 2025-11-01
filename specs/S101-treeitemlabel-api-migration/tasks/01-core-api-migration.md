---
spec: S101
phase: 1
title: Core API Migration
status: Completed
priority: Medium
created: 2025-10-28
updated: 2025-10-28
---

# Phase 1: Core API Migration

## Overview

Replace plain string labels with `vscode.TreeItemLabel` objects in PlanningTreeProvider's `getTreeItem()` method. This phase implements the API migration while preserving exact visual appearance and all existing functionality.

## Prerequisites

- S99 completed (Type label formatter utility exists)
- S100 completed (formatItemLabel integrated)
- VSCode engine ^1.80.0 (already satisfied in package.json)
- Understanding of TreeItem construction in PlanningTreeProvider

## Tasks

### Task 1: Export getTypeLabel Function

**File**: `vscode-extension/src/treeview/labelFormatter.ts`

**Current State** (line 93-95):
```typescript
export function getTypeLabel(type: ItemType): string {
	return TYPE_LABELS[type] || capitalize(type);
}
```

**Action Required**: Function is already exported. No changes needed.

**Verification**:
- Confirm `getTypeLabel` has `export` keyword
- Confirm it accepts `ItemType` parameter
- Confirm it returns `string`

**Expected Outcome**: Function is accessible for import in PlanningTreeProvider.

---

### Task 2: Import Dependencies

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Current Imports** (lines 1-14):
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
import { formatItemLabel } from './labelFormatter';
```

**Action Required**: Add `getTypeLabel` to the import from `./labelFormatter`.

**Implementation**:
```typescript
// Line 14 - Update import statement
import { formatItemLabel, getTypeLabel } from './labelFormatter';
```

**Verification**:
- No TypeScript errors after adding import
- IntelliSense recognizes getTypeLabel function

**Expected Outcome**: Both formatItemLabel and getTypeLabel are available in PlanningTreeProvider.

---

### Task 3: Modify getTreeItem for Planning Items

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Current Implementation** (lines 838-847):
```typescript
// Existing logic for PlanningTreeItem continues below...
// Format label with type prefix: "Type # - Title"
// Examples: "Epic E4 - Planning Kanban View", "Story S49 - TreeDataProvider Core Implementation"
const label = formatItemLabel(element);

// Determine collapsible state (parent items collapse, leaf items don't)
const collapsibleState = this.getCollapsibleState(element);

// Create TreeItem
const treeItem = new vscode.TreeItem(label, collapsibleState);
```

**Action Required**: Replace plain string label with TreeItemLabel object.

**Implementation**:
```typescript
// Existing logic for PlanningTreeItem continues below...
// Format label with type prefix: "Type # - Title"
// Examples: "Epic E4 - Planning Kanban View", "Story S49 - TreeDataProvider Core Implementation"
const labelText = formatItemLabel(element);

// Calculate type prefix range for future highlighting (S102)
const typeLabel = getTypeLabel(element.type);
const highlightRanges: [number, number][] = [
  [0, typeLabel.length]  // Highlight "Story" in "Story S75 - Title"
];

// Create TreeItemLabel instead of plain string
const label = new vscode.TreeItemLabel(labelText, highlightRanges);

// Determine collapsible state (parent items collapse, leaf items don't)
const collapsibleState = this.getCollapsibleState(element);

// Create TreeItem with TreeItemLabel
const treeItem = new vscode.TreeItem(label, collapsibleState);
```

**Verification Steps**:
1. Confirm `labelText` uses existing `formatItemLabel(element)` call
2. Confirm `typeLabel` is calculated using `getTypeLabel(element.type)`
3. Confirm highlight range is `[0, typeLabel.length]` (type prefix only)
4. Confirm `label` is now a `vscode.TreeItemLabel` instance
5. Confirm `treeItem` constructor receives TreeItemLabel (not string)
6. Confirm rest of getTreeItem() logic remains unchanged (icon, tooltip, description, command)

**Code Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:838-847`

**Expected Outcome**:
- Planning items (Epic, Feature, Story, Bug) use TreeItemLabel
- Visual appearance unchanged (no styling applied yet)
- TypeScript compilation succeeds
- No runtime errors

---

### Task 4: Preserve Status Group Handling

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Current Implementation** (lines 816-835):
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

**Action Required**: **NO CHANGES** - Status groups continue using plain string labels.

**Verification**:
- Status group logic remains at lines 816-835
- `statusGroup.label` is still a plain string (not TreeItemLabel)
- Early return prevents status groups from reaching TreeItemLabel code

**Rationale**: Status groups are simple folder nodes and don't need rich text formatting.

**Expected Outcome**: Status groups render identically to before migration.

---

## Completion Criteria

- ✅ `getTypeLabel` function is exported from labelFormatter.ts
- ✅ `getTypeLabel` is imported in PlanningTreeProvider.ts
- ✅ `getTreeItem()` creates TreeItemLabel for planning items
- ✅ Highlight ranges calculated using type label length
- ✅ Status groups continue using plain string labels
- ✅ TypeScript compilation succeeds with no errors
- ✅ No changes to other methods (getChildren, refresh, etc.)
- ✅ Code follows existing style and conventions

## Next Phase

Proceed to **Phase 2: Validation and Testing** (`02-validation-testing.md`) to verify the migration works correctly and produces no visual regressions.
