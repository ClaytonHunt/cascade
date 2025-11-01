---
spec: S78
phase: 1
title: Status Group Array Modification
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: Status Group Array Modification

## Overview

This phase modifies the `getStatusGroups()` method to conditionally include the 'Archived' status in the status group array based on the `showArchivedItems` flag. When the flag is ON, the "Archived" status group appears; when OFF, it's excluded from the array.

## Prerequisites

- ✅ S75 completed ('Archived' added to Status type in types.ts)
- ✅ S77 completed (`showArchivedItems` flag and `toggleArchivedItems()` method exist)
- ✅ Understanding of VSCode TreeView status group rendering

## Tasks

### Task 1: Review Current Status Group Array

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:659-699`

**Current Implementation**:
```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed',
    'Archived'  // ← Currently ALWAYS included
  ];

  // ... rest of method
}
```

**Analysis**:
- Status array currently includes 'Archived' unconditionally (line 670)
- No logic to check `showArchivedItems` flag
- Status order is correct (Archived appears last)

**Expected Outcome**: Understand current behavior before modification.

---

### Task 2: Add Conditional Archived Status

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:659-671`

**Implementation**:

**BEFORE**:
```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed',
    'Archived'  // Always included
  ];

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // ... rest of method
}
```

**AFTER**:
```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Add Archived status ONLY when showArchivedItems flag is ON
  // This makes the Archived status group conditional (appears/disappears with toggle)
  if (this.showArchivedItems) {
    statuses.push('Archived');
    this.outputChannel.appendLine('[Archive] Including Archived status group');
  } else {
    this.outputChannel.appendLine('[Archive] Excluding Archived status group (toggle OFF)');
  }

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // ... rest of method
}
```

**Changes**:
1. Remove 'Archived' from initial status array (line 670)
2. Add conditional logic after status array definition
3. Push 'Archived' to array only when `this.showArchivedItems === true`
4. Add output channel logging for debugging

**Expected Outcome**:
- When toggle is OFF: statuses array has 6 entries (no Archived)
- When toggle is ON: statuses array has 7 entries (includes Archived at end)
- Output channel logs the decision

---

### Task 3: Verify Status Group Order

**Goal**: Ensure "Archived" status group appears LAST in the TreeView (after "Completed").

**Verification Steps**:
1. Check that `statuses.push('Archived')` adds to end of array
2. Verify array order matches workflow progression
3. Confirm no sorting applied after conditional push

**Expected Order**:
```typescript
// When showArchivedItems = true:
const statuses = [
  'Not Started',  // 0
  'In Planning',  // 1
  'Ready',        // 2
  'In Progress',  // 3
  'Blocked',      // 4
  'Completed',    // 5
  'Archived'      // 6 ← Last position
];
```

**VSCode TreeView Rendering**:
- TreeView displays status groups in array order (top to bottom)
- "Archived" group appears at bottom of TreeView
- Matches visual design requirements (de-emphasize archived items)

**Expected Outcome**: Archived status group appears last in TreeView when visible.

---

### Task 4: Add Output Channel Logging

**Goal**: Provide debugging information about status group construction.

**Logging Points**:

**Point 1**: Status group inclusion decision (added in Task 2)
```typescript
if (this.showArchivedItems) {
  statuses.push('Archived');
  this.outputChannel.appendLine('[Archive] Including Archived status group');
} else {
  this.outputChannel.appendLine('[Archive] Excluding Archived status group (toggle OFF)');
}
```

**Point 2**: Status group count in existing log (line 696)
```typescript
// Existing log (no changes needed, but verify it shows correct count)
const duration = Date.now() - startTime;
this.outputChannel.appendLine(`[StatusGroups] Built ${groups.length} status groups in ${duration}ms`);
```

**Expected Output**:

**Toggle OFF**:
```
[Archive] Excluding Archived status group (toggle OFF)
[StatusGroups] Built 6 status groups in 5ms
```

**Toggle ON**:
```
[Archive] Including Archived status group
[StatusGroups] Built 7 status groups in 6ms
```

**Expected Outcome**: Clear output channel logs showing status group construction logic.

---

### Task 5: Manual Testing - Toggle State Verification

**Test Setup**:
1. Package extension: `cd vscode-extension && npm run package`
2. Install: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
4. Open output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"

**Test Case 1: Default State (Toggle OFF)**

**Steps**:
1. Open Cascade TreeView (Activity Bar → Cascade icon)
2. Count visible status groups
3. Check output channel for log message

**Expected Results**:
- 6 status groups visible: Not Started, In Planning, Ready, In Progress, Blocked, Completed
- No "Archived" status group
- Output channel shows: `[Archive] Excluding Archived status group (toggle OFF)`
- Output channel shows: `[StatusGroups] Built 6 status groups in Xms`

**Test Case 2: Toggle ON**

**Steps**:
1. Click "Show Archived Items" button (archive icon in TreeView toolbar)
2. Count visible status groups
3. Check output channel for log message

**Expected Results**:
- 7 status groups visible (includes "Archived")
- "Archived" group appears LAST (after "Completed")
- Output channel shows: `[Archive] Including Archived status group`
- Output channel shows: `[StatusGroups] Built 7 status groups in Xms`
- Output channel shows: `[Archive] Toggled archived items: visible` (from toggleArchivedItems)

**Test Case 3: Toggle OFF Again**

**Steps**:
1. Click "Show Archived Items" button again (toggle OFF)
2. Count visible status groups
3. Verify "Archived" group disappears

**Expected Results**:
- 6 status groups visible (Archived group removed)
- TreeView updates immediately
- Output channel shows: `[Archive] Toggled archived items: hidden`
- Output channel shows: `[Archive] Excluding Archived status group (toggle OFF)`

**Expected Outcome**: Toggle controls status group array correctly.

---

## Completion Criteria

### Code Changes
- ✅ 'Archived' removed from initial status array definition
- ✅ Conditional logic added to push 'Archived' when `showArchivedItems === true`
- ✅ Output channel logging added for debugging

### Functional Validation
- ✅ TreeView shows 6 status groups when toggle is OFF
- ✅ TreeView shows 7 status groups when toggle is ON
- ✅ "Archived" status group appears LAST (after "Completed")
- ✅ Toggle state changes take effect immediately (full refresh triggered)

### Output Channel Verification
- ✅ Log shows "[Archive] Excluding Archived status group (toggle OFF)" when OFF
- ✅ Log shows "[Archive] Including Archived status group" when ON
- ✅ Log shows correct status group count (6 or 7)

### Edge Cases
- ✅ Multiple rapid toggle clicks handled gracefully (debounce from S72)
- ✅ Extension reload preserves default OFF state (until S79 adds persistence)

## Notes

### Why Conditional Array Construction?

This approach (conditionally pushing to array) is simpler than:
- ✅ **Alternative 1**: Filtering status groups after construction (extra iteration)
- ✅ **Alternative 2**: Separate status arrays for toggle ON/OFF (code duplication)
- ✅ **Alternative 3**: Ternary expression in array literal (less readable)

The chosen approach is clear, efficient, and maintainable.

### Performance Impact

**Before**: Loop over 7 statuses (always)
**After**: Loop over 6 or 7 statuses (conditional)

**Impact**: Negligible (< 0.1ms difference)
- Array push operation: O(1)
- Loop iteration: O(n) where n=6 or 7 (trivial)
- No file system access or parsing in this phase

### Interaction with S77 (Toggle Command)

**S77 Implementation** (`PlanningTreeProvider.ts:432-440`):
```typescript
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

**Integration**:
- `toggleArchivedItems()` flips flag → calls `refresh()`
- `refresh()` clears caches → fires `_onDidChangeTreeData`
- VSCode calls `getChildren()` → calls `getStatusGroups()`
- `getStatusGroups()` reads `showArchivedItems` flag (NOW conditional)
- Status group array constructed with correct length
- TreeView renders with correct group count

**Expected Outcome**: Seamless integration with existing toggle command.

## Next Phase

Proceed to Phase 2: Archive Filtering Logic

**Phase 2 Goals**:
- Add filtering logic to exclude archived items from non-Archived status groups
- Implement special handling for "Archived" status group
- Modify `getItemsForStatus()` to filter archived items
