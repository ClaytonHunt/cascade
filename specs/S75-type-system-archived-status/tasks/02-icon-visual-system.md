---
spec: S75
phase: 2
title: Icon and Visual System Updates
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Icon and Visual System Updates

## Overview

This phase adds visual representation for the "Archived" status in the Cascade TreeView. We update icon mappings, color definitions, and status group ordering to render archived items with appropriate muted styling.

After this phase, archived items will display in the TreeView with:
- **Icon:** Archive/box icon (`archive` Codicon)
- **Color:** Muted gray (`charts.gray`)
- **Position:** Last status group (after "Completed")

## Prerequisites

- Phase 1 completed (Status type includes 'Archived')
- TypeScript compilation succeeds
- VSCode extension development environment set up

## Tasks

### Task 1: Add Archived to STATUS_BADGES

**File:** `vscode-extension/src/statusIcons.ts`
**Lines:** 41-47

**Current Code:**
```typescript
export const STATUS_BADGES: Record<Status, string> = {
  'Not Started': '○',
  'In Planning': '✎',
  'Ready': '✓',
  'In Progress': '↻',
  'Blocked': '⊘',
  'Completed': '✔',
};
```

**Updated Code:**
```typescript
export const STATUS_BADGES: Record<Status, string> = {
  'Not Started': '○',
  'In Planning': '✎',
  'Ready': '✓',
  'In Progress': '↻',
  'Blocked': '⊘',
  'Completed': '✔',
  'Archived': '📦',  // Box emoji for archived items
};
```

**Instructions:**
1. Open `vscode-extension/src/statusIcons.ts`
2. Locate the `STATUS_BADGES` constant (lines 41-48)
3. Add `'Archived': '📦',` after the 'Completed' entry
4. Save file

**Expected Outcome:**
- TypeScript compilation succeeds (Record<Status, string> now complete)
- STATUS_BADGES includes entry for Archived status
- Can be used for future badge/decoration features

**Icon Options:**
- `'📦'` - Box emoji (recommended, clear archive meaning)
- `'□'` - Empty box (minimalist, monochrome)
- `'◻'` - White square (alternative minimalist)

**Reference:**
- STATUS_BADGES documentation: `vscode-extension/src/statusIcons.ts:28-40`

---

### Task 2: Add Archived to STATUS_COLORS

**File:** `vscode-extension/src/statusIcons.ts`
**Lines:** 65-71

**Current Code:**
```typescript
export const STATUS_COLORS: Record<Status, string | undefined> = {
  'Not Started': undefined,          // Use default color
  'In Planning': 'charts.yellow',    // Warning/planning color
  'Ready': 'charts.green',           // Success/ready color
  'In Progress': 'charts.blue',      // Info/active color
  'Blocked': 'charts.red',           // Error/blocked color
  'Completed': 'testing.iconPassed'  // Success/completion color
};
```

**Updated Code:**
```typescript
export const STATUS_COLORS: Record<Status, string | undefined> = {
  'Not Started': undefined,          // Use default color
  'In Planning': 'charts.yellow',    // Warning/planning color
  'Ready': 'charts.green',           // Success/ready color
  'In Progress': 'charts.blue',      // Info/active color
  'Blocked': 'charts.red',           // Error/blocked color
  'Completed': 'testing.iconPassed', // Success/completion color
  'Archived': 'charts.gray'          // Muted/inactive color
};
```

**Instructions:**
1. Open `vscode-extension/src/statusIcons.ts`
2. Locate the `STATUS_COLORS` constant (lines 65-72)
3. Add `'Archived': 'charts.gray'` after the 'Completed' entry
4. Save file

**Expected Outcome:**
- TypeScript compilation succeeds (Record<Status, string | undefined> now complete)
- STATUS_COLORS includes muted gray color for Archived
- Color adapts to user's theme (light/dark)

**Color Options:**
- `'charts.gray'` - Recommended (consistent with "Not Started")
- `undefined` - Use default theme color (less distinct)
- `'editorGutter.commentRangeForeground'` - Very muted gray

**Reference:**
- VSCode Theme Colors: https://code.visualstudio.com/api/references/theme-color
- STATUS_COLORS documentation: `vscode-extension/src/statusIcons.ts:50-64`

---

### Task 3: Add Archived to getTreeItemIcon() Icon Map

**File:** `vscode-extension/src/statusIcons.ts`
**Lines:** 106-113

**Current Code:**
```typescript
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  // Map status to Codicon ID
  const iconMap: { [key: string]: string } = {
    'Not Started': 'circle-outline',
    'In Planning': 'sync',
    'Ready': 'debug-start',
    'In Progress': 'gear',
    'Blocked': 'warning',
    'Completed': 'pass'
  };
  // ... rest of function
```

**Updated Code:**
```typescript
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  // Map status to Codicon ID
  const iconMap: { [key: string]: string } = {
    'Not Started': 'circle-outline',
    'In Planning': 'sync',
    'Ready': 'debug-start',
    'In Progress': 'gear',
    'Blocked': 'warning',
    'Completed': 'pass',
    'Archived': 'archive'  // Archive/box icon for archived items
  };
  // ... rest of function
```

**Instructions:**
1. Open `vscode-extension/src/statusIcons.ts`
2. Locate the `getTreeItemIcon()` function (starts at line 104)
3. Find the `iconMap` constant (lines 106-113)
4. Add `'Archived': 'archive'` after the 'Completed' entry
5. Save file

**Expected Outcome:**
- Archived items render with archive icon in TreeView
- Icon is visually distinct from other status icons
- No fallback to 'circle-outline' for Archived status

**Icon Options:**
- `'archive'` - Recommended (clear semantic meaning)
- `'box'` - Generic box icon (alternative)
- `'folder'` - Folder icon (may conflict with groups)

**Preview Codicons:**
- Browse: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- Search for "archive" or "box" to preview icons

**Reference:**
- Codicons Gallery: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- getTreeItemIcon() documentation: `vscode-extension/src/statusIcons.ts:75-103`

---

### Task 4: Add Archived to getTreeItemIcon() Color Map

**File:** `vscode-extension/src/statusIcons.ts`
**Lines:** 116-123

**Current Code:**
```typescript
  // Map status to ThemeColor ID
  const colorMap: { [key: string]: string | undefined } = {
    'Not Started': 'charts.gray',
    'In Planning': 'charts.yellow',
    'Ready': 'charts.green',
    'In Progress': 'charts.blue',
    'Blocked': 'charts.red',
    'Completed': 'testing.iconPassed'
  };
```

**Updated Code:**
```typescript
  // Map status to ThemeColor ID
  const colorMap: { [key: string]: string | undefined } = {
    'Not Started': 'charts.gray',
    'In Planning': 'charts.yellow',
    'Ready': 'charts.green',
    'In Progress': 'charts.blue',
    'Blocked': 'charts.red',
    'Completed': 'testing.iconPassed',
    'Archived': 'charts.gray'  // Muted gray to de-emphasize archived items
  };
```

**Instructions:**
1. Open `vscode-extension/src/statusIcons.ts`
2. Locate the `colorMap` constant inside `getTreeItemIcon()` (lines 116-123)
3. Add `'Archived': 'charts.gray'` after the 'Completed' entry
4. Save file

**Expected Outcome:**
- Archived items render with muted gray icon color
- Color matches STATUS_COLORS definition
- Icons de-emphasized compared to active statuses

**Consistency Note:**
- This color should match `STATUS_COLORS['Archived']` from Task 2
- Keeping colors synchronized ensures consistent visual language

---

### Task 5: Add Archived to Status Group Ordering

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`
**Lines:** 626-633

**Current Code:**
```typescript
    // Define status order (workflow progression)
    const statuses: Status[] = [
      'Not Started',
      'In Planning',
      'Ready',
      'In Progress',
      'Blocked',
      'Completed'
    ];
```

**Updated Code:**
```typescript
    // Define status order (workflow progression)
    const statuses: Status[] = [
      'Not Started',
      'In Planning',
      'Ready',
      'In Progress',
      'Blocked',
      'Completed',
      'Archived'  // Last group - archived items are de-emphasized
    ];
```

**Instructions:**
1. Open `vscode-extension/src/treeview/PlanningTreeProvider.ts`
2. Locate the `getStatusGroups()` method (starts around line 618)
3. Find the `statuses` array definition (lines 626-633)
4. Add `'Archived'` as the LAST entry in the array
5. Save file

**Expected Outcome:**
- "Archived" status group appears LAST in TreeView
- Archived items grouped separately from active workflow statuses
- Status group auto-generates with "(count)" suffix

**Ordering Rationale:**
- Archived is not part of active workflow
- Should be visually separated from working items
- User can collapse group to hide archived items (or toggle visibility in S79)

**Reference:**
- Status Grouping Logic: `vscode-extension/src/treeview/PlanningTreeProvider.ts:618-655`
- S56 (Status Groups): Status group generation implementation

---

### Task 6: Verify Icon Rendering in TreeView

**Manual Test:**

**Instructions:**
1. Compile extension:
   ```bash
   cd vscode-extension
   npm run compile
   ```

2. Package and install extension:
   ```bash
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. Reload VSCode window:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

4. Create test file:
   - Path: `plans/test-archived.md`
   - Content:
     ```markdown
     ---
     item: S999
     title: Test Archived Item
     type: story
     status: Archived
     priority: Medium
     created: 2025-10-23
     updated: 2025-10-23
     ---

     # S999 - Test Archived Item
     This is a test item with Archived status.
     ```

5. Open Cascade TreeView:
   - Click Cascade icon in Activity Bar
   - Expand "Archived" status group (should be LAST)

6. Verify rendering:
   - Item appears in Archived group
   - Icon is archive/box icon (not default circle)
   - Color is muted gray (not bright/bold)
   - No console errors in Output Channel

**Expected Outcome:**
- Archived status group visible in TreeView
- Test item displays with archive icon
- Icon color is muted gray
- No errors in "Cascade" output channel

**Troubleshooting:**
- If icon is circle-outline (fallback), check iconMap in Task 3
- If color is red (unknown), check colorMap in Task 4
- If group doesn't appear, check statuses array in Task 5
- If compilation fails, check all Record<Status, T> types are complete

---

### Task 7: Verify TypeScript Compilation

**Command:**
```bash
cd vscode-extension
npm run compile
```

**Expected Outcome:**
- Compilation succeeds with **0 errors**
- No warnings about incomplete Record<Status, T> types
- All icon mappings now exhaustive

**Files Checked by Compiler:**
- `statusIcons.ts` - STATUS_BADGES, STATUS_COLORS complete
- `types.ts` - Status type includes Archived
- `parser.ts` - isValidStatus includes Archived

---

## Completion Criteria

Before proceeding to Phase 3, verify:

- ✅ STATUS_BADGES includes 'Archived' entry
- ✅ STATUS_COLORS includes 'Archived' entry (gray color)
- ✅ getTreeItemIcon() iconMap includes 'Archived' → 'archive'
- ✅ getTreeItemIcon() colorMap includes 'Archived' → 'charts.gray'
- ✅ PlanningTreeProvider statuses array includes 'Archived' (LAST position)
- ✅ TypeScript compilation succeeds (`npm run compile`)
- ✅ Manual test shows Archived items render correctly in TreeView
- ✅ No console errors when viewing Archived group

**Verification Command:**
```bash
cd vscode-extension
npm run compile
# Then perform manual TreeView test (Task 6)
```

## Next Phase

Proceed to **Phase 3: Testing and Verification** (`03-testing-verification.md`)

This phase adds automated unit tests and performs comprehensive regression testing to ensure Archived status integrates seamlessly with existing functionality.
