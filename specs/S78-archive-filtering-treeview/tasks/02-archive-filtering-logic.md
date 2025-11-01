---
spec: S78
phase: 2
title: Archive Filtering Logic
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Archive Filtering Logic

## Overview

This phase implements the core filtering logic that excludes archived items from non-Archived status groups and provides special handling for the "Archived" status group. The filtering uses `isItemArchived()` from S76 to detect archived items based on either frontmatter status or file path location.

## Prerequisites

- ✅ Phase 1 completed (conditional "Archived" status group)
- ✅ S76 completed (`isItemArchived()` function available)
- ✅ Understanding of archive detection logic (status OR directory)

## Tasks

### Task 1: Add Import for Archive Detection

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1-10`

**Current Imports**:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
import { FrontmatterCache } from '../cache';
import { Status } from '../types';
import { HierarchyNode, ItemPathParts } from './HierarchyNode';
import { getTreeItemIcon } from '../statusIcons';
import { StatusPropagationEngine } from './StatusPropagationEngine';
```

**Required Addition**:
```typescript
import { isItemArchived } from './archiveUtils';
```

**Verification**:
- Check if import already exists (may have been added by S76 or S77)
- If present, no changes needed
- If missing, add after other treeview imports (line 7-8)

**Expected Outcome**: `isItemArchived()` function available for use in filtering logic.

---

### Task 2: Modify getStatusGroups() - Add Archive Filtering

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:680-693`

**Current Implementation** (after Phase 1):
```typescript
// Build status group for each status
const groups: StatusGroupNode[] = [];

for (const status of statuses) {
  // Filter items matching this status
  const itemsInStatus = allItems.filter(item => item.status === status);
  const count = itemsInStatus.length;

  // Create status group node
  groups.push({
    type: 'status-group',
    status: status,
    label: `${status} (${count})`,
    count: count,
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded
  });
}
```

**New Implementation**:
```typescript
// Build status group for each status
const groups: StatusGroupNode[] = [];

for (const status of statuses) {
  let itemsInStatus: PlanningTreeItem[];
  let count: number;

  // Special handling for Archived status group
  if (status === 'Archived') {
    // Include ALL items where isItemArchived() returns true
    // This includes:
    // - Items with status: Archived (any directory)
    // - Items in plans/archive/ directory (any status)
    itemsInStatus = allItems.filter(item => isItemArchived(item));
    count = itemsInStatus.length;

    this.outputChannel.appendLine(`[Archive] Archived status group: ${count} items`);
  } else {
    // Normal status group - filter by status AND exclude archived items
    itemsInStatus = allItems.filter(item => {
      // Item must match this status
      const matchesStatus = item.status === status;

      // Check if item is archived
      const isArchived = isItemArchived(item);

      // Include item if:
      // - Matches status AND
      // - (showArchivedItems is ON OR item is not archived)
      const includeItem = matchesStatus && (this.showArchivedItems || !isArchived);

      return includeItem;
    });
    count = itemsInStatus.length;

    // Log filtered archived items for debugging
    if (!this.showArchivedItems) {
      const archivedInStatus = allItems.filter(item => item.status === status && isItemArchived(item));
      if (archivedInStatus.length > 0) {
        this.outputChannel.appendLine(
          `[Archive] Filtered ${archivedInStatus.length} archived items from "${status}" status group`
        );
      }
    }
  }

  // Create status group node
  groups.push({
    type: 'status-group',
    status: status,
    label: `${status} (${count})`,
    count: count,
    collapsibleState: status === 'Archived'
      ? vscode.TreeItemCollapsibleState.Collapsed  // Archived group collapsed by default
      : vscode.TreeItemCollapsibleState.Expanded   // Other groups expanded
  });
}
```

**Key Changes**:

1. **Variable Declaration**:
   - Declare `itemsInStatus` and `count` outside conditional logic
   - Allows different filtering strategies per status type

2. **Archived Status Handling** (lines ~685-692):
   - Special `if (status === 'Archived')` branch
   - Filter using `isItemArchived()` instead of status match
   - Log count of archived items found

3. **Normal Status Filtering** (lines ~693-709):
   - Filter by status match (existing logic)
   - **NEW**: Exclude archived items (unless `showArchivedItems` is ON)
   - Composite boolean logic: `matchesStatus && (showArchivedItems || !isArchived)`
   - Log how many archived items were filtered out

4. **Collapsible State**:
   - Archived group: Collapsed by default (reduce visual clutter)
   - Other groups: Expanded (existing behavior)

**Expected Outcome**:
- Archived items excluded from standard status groups when toggle is OFF
- Archived items appear in "Archived" group when toggle is ON
- Output channel logs filtering activity

---

### Task 3: Modify getItemsForStatus() - Add Archive Filtering

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:710-713`

**Current Implementation**:
```typescript
private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllPlanningItems();
  return allItems.filter(item => item.status === status);
}
```

**New Implementation**:
```typescript
private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllPlanningItems();

  // Special handling for Archived status
  if (status === 'Archived') {
    // Return ALL items where isItemArchived() returns true
    // This includes items in plans/archive/ directory OR with status: Archived
    const archivedItems = allItems.filter(item => isItemArchived(item));

    this.outputChannel.appendLine(
      `[Archive] getItemsForStatus(Archived): ${archivedItems.length} items`
    );

    return archivedItems;
  }

  // Normal status - filter by status and exclude archived items
  return allItems.filter(item => {
    const matchesStatus = item.status === status;
    const isArchived = isItemArchived(item);

    // Include if matches status AND (toggle is ON OR not archived)
    return matchesStatus && (this.showArchivedItems || !isArchived);
  });
}
```

**Key Changes**:

1. **Archived Status Branch** (lines ~714-723):
   - Special handling for `status === 'Archived'`
   - Uses `isItemArchived()` instead of status comparison
   - Logs result for debugging

2. **Normal Status Filtering** (lines ~725-731):
   - Existing status match logic
   - **NEW**: Archive filtering (same logic as `getStatusGroups()`)
   - Composite filter: match status AND exclude archived items (unless toggle ON)

**Why Duplicate Filtering?**

Both `getStatusGroups()` and `getItemsForStatus()` need filtering because:
- `getStatusGroups()`: Called at root level, builds count badges
- `getItemsForStatus()`: Called when expanding status group, builds hierarchy

This ensures consistency between counts and actual children.

**Expected Outcome**:
- Status group expansion shows correct items (matches count badge)
- Archived items excluded consistently across TreeView
- No "missing items" when expanding status groups

---

### Task 4: Add Performance Timing Logs

**Goal**: Measure filter operation performance to ensure < 10ms target.

**Implementation**:

**Location 1**: `getStatusGroups()` - Add timing around filter loop

**BEFORE** (Phase 1 version):
```typescript
for (const status of statuses) {
  // ... filtering logic ...
}

const duration = Date.now() - startTime;
this.outputChannel.appendLine(`[StatusGroups] Built ${groups.length} status groups in ${duration}ms`);
```

**AFTER**:
```typescript
for (const status of statuses) {
  // ... filtering logic ...
}

const duration = Date.now() - startTime;
this.outputChannel.appendLine(
  `[StatusGroups] Built ${groups.length} status groups in ${duration}ms (${allItems.length} items scanned)`
);
```

**Changes**:
- Add item count to existing log (helps correlate time with data size)
- Verify total duration stays < 100ms target (status group construction)

**Location 2**: Add filter-specific timing (optional, for debugging)

```typescript
// At start of filter loop
const filterStartTime = Date.now();

for (const status of statuses) {
  // ... filtering logic ...
}

const filterDuration = Date.now() - filterStartTime;
if (filterDuration > 10) {
  this.outputChannel.appendLine(
    `[Archive] ⚠️  Filter operation took ${filterDuration}ms (target: <10ms)`
  );
}
```

**Expected Output** (100 items, toggle OFF):
```
[Archive] Excluding Archived status group (toggle OFF)
[Archive] Filtered 5 archived items from "Ready" status group
[Archive] Filtered 3 archived items from "In Progress" status group
[StatusGroups] Built 6 status groups in 8ms (100 items scanned)
```

**Expected Output** (100 items, toggle ON):
```
[Archive] Including Archived status group
[Archive] Archived status group: 8 items
[StatusGroups] Built 7 status groups in 9ms (100 items scanned)
```

**Expected Outcome**: Performance metrics logged, < 10ms filter time confirmed.

---

### Task 5: Manual Testing - Archive Filtering Behavior

**Test Setup**:
1. Create test archived items in workspace
2. Package and install extension
3. Open output channel for debugging

**Test Data Creation**:

```bash
# Create archive directory
mkdir -p plans/archive

# Create archived item (directory-based)
cat > plans/archive/story-archived-1.md << 'EOF'
---
item: S999
title: Archived Test Story 1
type: story
status: Ready
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---

# S999 - Archived Test Story 1
This story is archived by DIRECTORY location (in plans/archive/).
Status is "Ready" but should appear in Archived group.
EOF

# Create archived item (status-based)
cat > plans/story-archived-2.md << 'EOF'
---
item: S998
title: Archived Test Story 2
type: story
status: Archived
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---

# S998 - Archived Test Story 2
This story is archived by STATUS field (status: Archived).
Not in archive directory but should still appear in Archived group.
EOF
```

**Test Case 1: Default State (Toggle OFF)**

**Steps**:
1. Open Cascade TreeView
2. Expand "Ready" status group
3. Look for S999 (should NOT be present)
4. Verify no "Archived" status group visible

**Expected Results**:
- S999 NOT in "Ready" status group (filtered out)
- S998 NOT visible anywhere (filtered out)
- No "Archived" status group in TreeView
- Output channel shows filtered item counts:
  ```
  [Archive] Excluding Archived status group (toggle OFF)
  [Archive] Filtered 1 archived items from "Ready" status group
  ```

**Test Case 2: Toggle ON**

**Steps**:
1. Click "Show Archived Items" button
2. Verify "Archived" status group appears
3. Expand "Archived" status group
4. Verify S999 and S998 appear in Archived group
5. Expand "Ready" status group
6. Verify S999 NOT in "Ready" (still filtered)

**Expected Results**:
- "Archived" status group visible at bottom
- "Archived (2)" label (count = 2)
- S999 and S998 both in Archived group (not their original status groups)
- S999 NOT in Ready group (directory overrides status)
- Output channel shows:
  ```
  [Archive] Toggled archived items: visible
  [Archive] Including Archived status group
  [Archive] Archived status group: 2 items
  ```

**Test Case 3: Mixed Statuses in Archive Directory**

**Create Additional Test Data**:
```bash
cat > plans/archive/story-archived-3.md << 'EOF'
---
item: S997
title: In Progress Archived Story
type: story
status: In Progress
priority: Medium
dependencies: []
estimate: M
created: 2025-10-23
updated: 2025-10-23
---

# S997 - In Progress Archived Story
Status is "In Progress" but in archive directory.
EOF
```

**Steps**:
1. Reload TreeView (Ctrl+Shift+P → "Cascade: Refresh TreeView")
2. With toggle ON, verify S997 appears in "Archived" group
3. With toggle ON, verify S997 does NOT appear in "In Progress" group
4. With toggle OFF, verify S997 not visible anywhere

**Expected Results**:
- Directory location takes precedence over status
- Archived items NEVER appear in their original status groups
- "Archived" group shows "Archived (3)" when toggle is ON

**Test Case 4: Performance Test (100+ Items)**

**Use Performance Test Script**:
```bash
cd vscode-extension/scripts
node generate-test-data.js 100 test-plans-100

# Move some items to archive
mkdir -p ../../plans/archive
mv ../../test-plans-100/story-0*.md ../../plans/archive/
# (Moves 10 items to archive directory)
```

**Steps**:
1. Load TreeView with 100+ items
2. Toggle archived items ON and OFF
3. Check output channel for timing logs
4. Verify filter operation < 10ms

**Expected Results**:
- Filter completes in < 10ms with 100 items
- Status group construction < 100ms total
- No visible lag when toggling
- Output shows performance metrics:
  ```
  [StatusGroups] Built 7 status groups in 12ms (110 items scanned)
  ```

**Expected Outcome**: All filtering behaviors work correctly across test cases.

---

## Completion Criteria

### Code Changes
- ✅ `isItemArchived()` import added (if not already present)
- ✅ `getStatusGroups()` modified with special Archived handling
- ✅ `getItemsForStatus()` modified with archive filtering
- ✅ Performance timing logs added
- ✅ Output channel logging comprehensive

### Functional Validation
- ✅ Archived items excluded from standard status groups (toggle OFF)
- ✅ Archived items appear ONLY in "Archived" group (toggle ON)
- ✅ Directory-based detection works (`plans/archive/`)
- ✅ Status-based detection works (`status: Archived`)
- ✅ Items in archive directory don't appear in original status groups
- ✅ Status group counts match expanded children counts

### Performance Validation
- ✅ Filter operation < 10ms with 100+ items
- ✅ Status group construction < 100ms total
- ✅ No degradation in TreeView responsiveness

### Edge Case Validation
- ✅ Empty Archived group shows "Archived (0)" when toggle is ON
- ✅ Mixed statuses in archive directory all appear in Archived group
- ✅ Toggle state transitions work smoothly (no cached stale data)

## Notes

### Archive Detection Logic (S76)

**Function Signature**:
```typescript
export function isItemArchived(item: PlanningTreeItem): boolean
```

**Detection Rules** (OR logic):
1. `item.status === 'Archived'` → true
2. `item.filePath` contains `/archive/` → true
3. Otherwise → false

**Path Normalization**:
- Lowercase comparison (case-insensitive)
- Forward slashes (cross-platform)
- Exact `/archive/` match (prevents false positives)

**Example Paths**:
- ✅ `D:\projects\plans\archive\story.md` → archived
- ✅ `D:\projects\plans\archive\epic-05\feature.md` → archived (nested)
- ❌ `D:\projects\plans\archive-old\story.md` → NOT archived

### Why Filter in Both Methods?

**Question**: Why duplicate filtering logic in `getStatusGroups()` and `getItemsForStatus()`?

**Answer**: Different call contexts:

1. **getStatusGroups()**: Called at TreeView root level
   - Builds status group nodes with count badges
   - Filtering affects counts displayed to user
   - Example: "Ready (15)" should reflect filtered count

2. **getItemsForStatus()**: Called when expanding status group
   - Returns children for hierarchy building
   - Must match counts from `getStatusGroups()`
   - Filtering ensures no "missing items" when expanding

**Consistency Requirement**:
- Count in badge: 15 items
- Expand group: Shows 15 items (not 20 with 5 hidden)
- Both methods must apply same filter

### Collapsible State Decision

**Archived Group**: `TreeItemCollapsibleState.Collapsed`
**Other Groups**: `TreeItemCollapsibleState.Expanded`

**Rationale**:
- Archived items are de-emphasized (visual design)
- Users toggle ON to access archived items, but don't need them expanded immediately
- Reduces visual clutter (archived items stay hidden until manually expanded)
- Matches typical "archive" behavior in other tools

**User Experience**:
1. Toggle ON → "Archived" group appears (collapsed)
2. User clicks to expand → See archived items
3. Toggle OFF → "Archived" group disappears entirely

## Next Phase

Proceed to Phase 3: Edge Case Handling and Polish

**Phase 3 Goals**:
- Handle empty Archived status group case
- Verify all edge cases from story acceptance criteria
- Performance optimization (minimize redundant isItemArchived calls)
- Code cleanup and documentation updates
