---
spec: S90
phase: 1
title: Import and Core Integration
status: Completed
priority: High
created: 2025-10-25
updated: 2025-10-25
---

# Phase 1: Import and Core Integration

## Overview

This phase integrates the `renderProgressBar()` function from S89 into the `getTreeItem()` method in `PlanningTreeProvider.ts`. The integration is minimal because the progress calculation infrastructure (S88) is already in place.

**Key Insight**: The existing code at line 772 uses `progress.display` (count format: `"(3/5)"`). We replace this with `renderProgressBar(progress)` to get the Unicode bar format: `"█████░░░░░ 50% (3/5)"`.

**Estimated Time**: 15 minutes

## Prerequisites

- S88 completed (progress calculation)
- S89 completed (progress bar rendering)
- `PlanningTreeProvider.ts` file read and understood
- `progressRenderer.ts` module exists and exports `renderProgressBar()`

## Tasks

### Task 1: Add Import Statement

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:10`

**Current Imports** (lines 1-10):
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
```

**Action**: Add import for `renderProgressBar` after line 10:

```typescript
import { renderProgressBar } from './progressRenderer';
```

**Expected Outcome**:
- New import appears after `renderStatusBadge` import
- No compilation errors
- Module resolution succeeds

**Verification**:
```bash
cd vscode-extension
npm run compile
# Should complete with no errors
```

**References**:
- `vscode-extension/src/treeview/progressRenderer.ts:117` - `renderProgressBar` function
- S89 specification - Progress Bar Rendering module design

---

### Task 2: Modify Description Building for Parent Items

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:766-778`

**Current Code** (lines 766-778):
```typescript
if (element.type === 'epic' || element.type === 'feature') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);

  if (progress) {
    // Has children - show status badge with progress
    treeItem.description = `${statusBadge} ${progress.display}`;
    // Example: "$(sync) In Progress (3/5)"
  } else {
    // No children - show status badge only
    treeItem.description = statusBadge;
    // Example: "$(circle-filled) Ready"
  }
}
```

**Action**: Replace `progress.display` with `renderProgressBar(progress)` on line 772:

**New Code**:
```typescript
if (element.type === 'epic' || element.type === 'feature') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);

  if (progress) {
    // Has children - show status badge with progress bar
    const progressBar = renderProgressBar(progress);
    treeItem.description = `${statusBadge} ${progressBar}`;
    // Example: "$(sync) In Progress █████░░░░░ 50% (3/5)"
  } else {
    // No children - show status badge only
    treeItem.description = statusBadge;
    // Example: "$(circle-filled) Ready"
  }
}
```

**Key Changes**:
1. **Line 772**: Add `const progressBar = renderProgressBar(progress);`
2. **Line 773**: Change `${progress.display}` to `${progressBar}`
3. **Line 774**: Update example comment to show Unicode bar

**Why This Works**:
- `calculateProgress()` returns `ProgressInfo` type (lines 1872-1912)
- `renderProgressBar()` accepts `ProgressInfo` parameter (line 117 of progressRenderer.ts)
- Type compatibility guaranteed by shared `ProgressInfo` interface

**Expected Outcome**:
- Parent items (epics, features) show Unicode progress bars
- Leaf items (stories, bugs) unchanged (lines 780-783)
- Format: `"{statusBadge} {progressBar}"` with space separator

**Verification**:
```bash
cd vscode-extension
npm run compile
# Should complete with no errors
```

**References**:
- `vscode-extension/src/treeview/PlanningTreeProvider.ts:18-30` - `ProgressInfo` interface
- `vscode-extension/src/treeview/progressRenderer.ts:117` - `renderProgressBar` function signature
- S88 specification - Progress calculation infrastructure

---

### Task 3: Handle Projects (Optional Enhancement)

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:766`

**Current Code**: Only handles `'epic' || 'feature'`

**Enhancement**: Add `'project'` to parent item check:

**Modified Code**:
```typescript
if (element.type === 'epic' || element.type === 'feature' || element.type === 'project') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);
  // ... rest of logic unchanged
}
```

**Why This Matters**:
- Projects are parent items (contain Epics)
- Existing `calculateProgress()` already supports projects (S88)
- No additional logic needed, just include in type check

**Expected Outcome**:
- Projects show progress bars (% of Epics completed)
- Consistent behavior across all parent item types

**Verification**: Manual testing with Projects (if any exist in workspace)

**Note**: This enhancement is included in S90 acceptance criteria (line 33 of story file: "Show progress bar for Projects")

---

### Task 4: Compile and Verify No Errors

**Action**: Run TypeScript compilation and verify no errors:

```bash
cd vscode-extension
npm run compile
```

**Expected Output**:
```
> cascade@0.1.0 compile
> tsc -p ./

# No errors, clean compilation
```

**Troubleshooting**:

If compilation fails with import errors:
- Verify `progressRenderer.ts` exists at `vscode-extension/src/treeview/progressRenderer.ts`
- Check file exports `renderProgressBar` function
- Verify `ProgressInfo` interface is exported from `PlanningTreeProvider.ts`

If compilation fails with type errors:
- Verify `renderProgressBar(progress: ProgressInfo): string` signature matches
- Check `progress` variable type is `ProgressInfo | null` (handle null case already exists)

**References**:
- `package.json` - TypeScript compilation configuration
- `tsconfig.json` - Compiler options

---

### Task 5: Manual Visual Verification

**Action**: Package extension and verify progress bars appear in TreeView:

**Steps**:
1. **Package Extension**:
   ```bash
   cd vscode-extension
   npm run package
   ```

2. **Install Extension**:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

4. **Open Cascade TreeView**:
   - Click Activity Bar (left sidebar)
   - Click Cascade icon (tree icon)
   - Expand status groups

5. **Verify Progress Bars**:
   - Epic items should show Unicode progress bars
   - Feature items should show Unicode progress bars
   - Story/Bug items should NOT show progress bars (only status badge)

**Example Visual Output**:

**Epic with 3/5 Features completed**:
```
E4 - Planning Kanban View    $(sync) In Progress ██████░░░░ 60% (3/5)
```

**Feature with all Stories completed**:
```
F16 - Foundation             $(pass-filled) Completed ██████████ 100% (6/6)
```

**Story (leaf node, no progress bar)**:
```
S49 - Core Implementation    $(sync) In Progress
```

**Expected Outcome**:
- Progress bars visible for parent items
- Unicode characters render correctly (█ and ░)
- Spacing and alignment correct
- No layout issues or truncation

**Troubleshooting**:

If progress bars don't appear:
- Check Output Channel: `Ctrl+Shift+P` → "View: Toggle Output" → "Cascade"
- Look for errors or warnings
- Verify `[Progress] Calculated for ...` logs appear

If Unicode characters render incorrectly:
- Check VSCode font settings (should use monospace font with Unicode support)
- Try different terminal fonts: Consolas, Monaco, Menlo, "Cascadia Code"

**References**:
- CLAUDE.md lines 98-131 - VSCode Extension Testing workflow
- S89 specification - Progress bar Unicode characters

## Completion Criteria

- ✅ `renderProgressBar` import added to `PlanningTreeProvider.ts`
- ✅ Description building logic modified to use `renderProgressBar(progress)`
- ✅ Projects added to parent item type check (optional)
- ✅ TypeScript compilation succeeds with no errors
- ✅ Extension packages successfully (`cascade-0.1.0.vsix` created)
- ✅ Extension installs without errors
- ✅ Progress bars visible in TreeView for parent items (manual verification)
- ✅ Unicode characters render correctly
- ✅ Leaf items unchanged (stories/bugs show only status badge)

## Next Phase

Proceed to **Phase 2: Test Suite Extension** to add automated tests for progress bar integration.
