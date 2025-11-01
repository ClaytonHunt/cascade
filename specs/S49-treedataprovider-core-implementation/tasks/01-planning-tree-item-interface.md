---
spec: S49
phase: 1
title: Create PlanningTreeItem Interface
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: Create PlanningTreeItem Interface

## Overview

Define the `PlanningTreeItem` interface that represents planning items in the TreeView. This interface is a streamlined subset of the `Frontmatter` interface, containing only the fields needed for tree display.

## Prerequisites

- Understanding of TypeScript interface syntax
- Familiarity with existing `Frontmatter` interface in `vscode-extension/src/types.ts:33-73`
- Understanding of VSCode TreeView data requirements

## Tasks

### Task 1: Create treeview Module Directory

**Action:**
Create new directory for treeview-related code.

**Command:**
```bash
mkdir -p vscode-extension/src/treeview
```

**Validation:**
- Directory `vscode-extension/src/treeview/` exists

---

### Task 2: Create PlanningTreeItem.ts File

**Action:**
Create new file with interface definition and documentation.

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

**Code:**
```typescript
/**
 * Data model for planning items displayed in the Cascade TreeView.
 *
 * This interface represents a subset of the Frontmatter interface,
 * containing only the fields needed for tree display and interaction.
 *
 * Conversion happens in PlanningTreeProvider.getChildren() when loading
 * planning items from the file system.
 */

import { ItemType, Status, Priority } from '../types';

/**
 * Planning item displayed in TreeView.
 *
 * Each item corresponds to one markdown file in the plans/ directory.
 * The provider loads these items by scanning the directory and parsing
 * frontmatter using the FrontmatterCache.
 */
export interface PlanningTreeItem {
  /** Unique identifier (e.g., "E4", "F16", "S48") */
  item: string;

  /** Human-readable title */
  title: string;

  /** Item type (determines icon and hierarchy) */
  type: ItemType;

  /** Current lifecycle state */
  status: Status;

  /** Importance/urgency level */
  priority: Priority;

  /** Absolute path to the markdown file */
  filePath: string;
}
```

**References:**
- Existing types: `vscode-extension/src/types.ts:9-19` (ItemType, Status, Priority)
- Frontmatter interface: `vscode-extension/src/types.ts:33-73`

**Validation:**
- File exists at `vscode-extension/src/treeview/PlanningTreeItem.ts`
- Imports resolve correctly
- JSDoc comments present and descriptive

---

### Task 3: Verify TypeScript Compilation

**Action:**
Compile TypeScript to verify interface is valid.

**Command:**
```bash
cd vscode-extension && npm run compile
```

**Expected Output:**
```
✓ TypeScript compilation successful
No errors
```

**Troubleshooting:**
- If import errors: Verify relative path `../types` is correct
- If type errors: Verify ItemType, Status, Priority are exported from types.ts

**Validation:**
- No TypeScript compilation errors
- Build output directory contains compiled JavaScript

---

## Completion Criteria

- ✅ Directory `vscode-extension/src/treeview/` created
- ✅ File `vscode-extension/src/treeview/PlanningTreeItem.ts` created with interface definition
- ✅ Interface has 6 required fields: item, title, type, status, priority, filePath
- ✅ Imports from `../types` resolve correctly
- ✅ JSDoc comments document interface purpose and fields
- ✅ TypeScript compiles without errors
- ✅ Interface exported with `export` keyword

## Next Phase

Proceed to **Phase 2: Implement PlanningTreeProvider Class** where this interface will be used as the generic type parameter for `TreeDataProvider<PlanningTreeItem>`.
