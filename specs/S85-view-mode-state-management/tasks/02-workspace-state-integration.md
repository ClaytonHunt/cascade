---
spec: S85
phase: 2
title: Workspace State Integration
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 2: Workspace State Integration

## Overview

This phase integrates view mode state with the VSCode workspace state API (Memento) for session persistence. We'll replace the temporary hardcoded initialization from Phase 1 with workspace state loading, implement the `setViewMode()` method with validation and persistence, and add comprehensive logging for debugging.

After this phase, view mode preferences will persist across VSCode sessions, and consumers (S86, S87) can safely read and modify the view mode state.

## Prerequisites

- Phase 1 completed (ViewMode type and property exist)
- Understanding of VSCode Memento API (synchronous get, async update)
- Existing workspace state integration pattern (S79 - showArchivedItems toggle)

## Tasks

### Task 1: Define Storage Key Constant

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Add storage key constant near existing `STORAGE_KEY_SHOW_ARCHIVED` (around line 119)

**Code to Add:**

```typescript
/**
 * Storage key for persisting view mode preference (F28).
 *
 * Convention: cascade.<featureName>
 * - Prefix: cascade (extension ID)
 * - Separator: . (dotted namespace)
 * - Name: viewMode (descriptive, matches field name)
 */
private static readonly STORAGE_KEY_VIEW_MODE = 'cascade.viewMode';
```

**Rationale:**
- Centralized constant prevents typos in key strings
- Follows same pattern as `STORAGE_KEY_SHOW_ARCHIVED` (line 119)
- Dotted namespace convention matches existing storage keys
- JSDoc explains naming convention for future keys

**Validation:**
- TypeScript accepts static readonly property
- Constant value is a string literal

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:119

---

### Task 2: Update Constructor to Load from Workspace State

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Replace temporary hardcoded initialization (added in Phase 1, around line 273) with workspace state loading

**Code to Replace:**

```typescript
// OLD CODE (from Phase 1):
this.viewMode = 'hierarchy';
this.outputChannel.appendLine(`[ViewMode] Initialized to: ${this.viewMode} (Phase 1 - hardcoded)`);
```

**New Code:**

```typescript
// Load view mode from workspace state (F28)
// Default to 'hierarchy' to match ChatGPT reference design
this.viewMode = this.workspaceState.get<ViewMode>(
  PlanningTreeProvider.STORAGE_KEY_VIEW_MODE,
  'hierarchy'
);

// Validate loaded value (defensive programming)
if (this.viewMode !== 'status' && this.viewMode !== 'hierarchy') {
  this.outputChannel.appendLine(
    `[ViewMode] ⚠️  Invalid stored value: ${this.viewMode}, resetting to 'hierarchy'`
  );
  this.viewMode = 'hierarchy';
  // Persist corrected value back to workspace state
  this.workspaceState.update(PlanningTreeProvider.STORAGE_KEY_VIEW_MODE, 'hierarchy');
}

this.outputChannel.appendLine(`[ViewMode] Initialized to: ${this.viewMode}`);
```

**Rationale:**
- Loads from workspace state with 'hierarchy' as default (first run)
- Defensive validation handles corrupted/invalid stored values
- Automatically corrects invalid values and persists fix
- Logs initialization for debugging

**Edge Cases Handled:**
- First run (no saved state) → defaults to 'hierarchy'
- Invalid stored value (e.g., typo, corruption) → resets to 'hierarchy'
- Valid stored value → loads correctly

**Validation:**
- No TypeScript errors
- Output channel logs initialization with actual loaded value

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:273

---

### Task 3: Implement setViewMode() Method

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Add setter method after `getViewMode()` (around line 510)

**Code to Add:**

```typescript
/**
 * Sets the TreeView display mode and persists to workspace state (F28).
 *
 * This method:
 * 1. Validates the new mode value (must be 'status' or 'hierarchy')
 * 2. Updates the internal viewMode state
 * 3. Persists the change to workspace state for session persistence
 * 4. Triggers a TreeView refresh to rebuild with new mode
 *
 * Called by:
 * - S87: Toolbar button handler (user toggles view mode)
 * - Future features: Programmatic view mode changes
 *
 * @param mode - View mode to set ('status' or 'hierarchy')
 */
public async setViewMode(mode: ViewMode): Promise<void> {
  // Validate mode (defensive programming)
  if (mode !== 'status' && mode !== 'hierarchy') {
    this.outputChannel.appendLine(
      `[ViewMode] ⚠️  Invalid mode: ${mode}, ignoring setViewMode() call`
    );
    return; // Early return, no state change
  }

  // Check if mode actually changed (avoid unnecessary refresh)
  if (this.viewMode === mode) {
    this.outputChannel.appendLine(
      `[ViewMode] Mode already set to: ${mode}, skipping update`
    );
    return; // Early return, no state change
  }

  // Update internal state
  const oldMode = this.viewMode;
  this.viewMode = mode;

  // Persist to workspace state (async operation)
  try {
    await this.workspaceState.update(
      PlanningTreeProvider.STORAGE_KEY_VIEW_MODE,
      mode
    );
    this.outputChannel.appendLine(`[ViewMode] Persisted to workspace state: ${mode}`);
  } catch (error) {
    // Log error but don't fail (graceful degradation)
    this.outputChannel.appendLine(
      `[ViewMode] ⚠️  Failed to persist to workspace state: ${error}`
    );
    // Continue with refresh despite persistence failure
  }

  // Log mode change
  this.outputChannel.appendLine(`[ViewMode] Switched: ${oldMode} → ${mode}`);

  // Trigger TreeView refresh to apply new display mode
  // This will cause VSCode to call getChildren() again,
  // which will use the new viewMode value (S86)
  this.refresh();
}
```

**Rationale:**
- Validation prevents invalid mode values from corrupting state
- Early returns optimize for no-change case
- Try-catch ensures persistence errors don't crash extension
- Logs old→new transition for debugging
- Calls `refresh()` to rebuild TreeView with new mode

**Error Handling:**
- Invalid mode → logs warning, ignores call
- Same mode → skips update, avoids unnecessary refresh
- Persistence failure → logs warning, continues with refresh

**Validation:**
- Method signature is async (returns Promise<void>)
- All validation branches tested (see Phase 3)

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:510

---

### Task 4: Verify Refresh Integration

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Review existing `refresh()` method (around line 525) to ensure it's compatible with view mode changes

**Verification Checklist:**
- ✅ `refresh()` clears all caches (items, hierarchy, progress)
- ✅ `refresh()` triggers `_onDidChangeTreeData.fire(undefined)` (full refresh)
- ✅ `refresh()` is public method (can be called by `setViewMode()`)
- ✅ No modifications needed to `refresh()` for F28

**Rationale:**
- Existing `refresh()` already handles full TreeView rebuild
- Cache clearing ensures new mode takes effect immediately
- S86 will add mode-specific logic to `getChildren()` (separate story)

**Validation:**
- Review code, confirm refresh() is sufficient
- No code changes needed in this task

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:525-569

---

### Task 5: Add Output Channel Logging for State Changes

**Location:** Integrated into Task 3 (setViewMode method)

**Logging Requirements:**

All view mode state changes must be logged to output channel:

1. **Initialization** (constructor):
   - Format: `[ViewMode] Initialized to: {mode}`
   - Example: `[ViewMode] Initialized to: hierarchy`

2. **Invalid Initialization** (constructor):
   - Format: `[ViewMode] ⚠️  Invalid stored value: {value}, resetting to 'hierarchy'`
   - Example: `[ViewMode] ⚠️  Invalid stored value: foo, resetting to 'hierarchy'`

3. **Invalid setViewMode Call**:
   - Format: `[ViewMode] ⚠️  Invalid mode: {mode}, ignoring setViewMode() call`
   - Example: `[ViewMode] ⚠️  Invalid mode: foo, ignoring setViewMode() call`

4. **No-Change setViewMode Call**:
   - Format: `[ViewMode] Mode already set to: {mode}, skipping update`
   - Example: `[ViewMode] Mode already set to: status, skipping update`

5. **Successful Mode Change**:
   - Format: `[ViewMode] Switched: {oldMode} → {newMode}`
   - Example: `[ViewMode] Switched: status → hierarchy`

6. **Persistence Success**:
   - Format: `[ViewMode] Persisted to workspace state: {mode}`
   - Example: `[ViewMode] Persisted to workspace state: hierarchy`

7. **Persistence Failure**:
   - Format: `[ViewMode] ⚠️  Failed to persist to workspace state: {error}`
   - Example: `[ViewMode] ⚠️  Failed to persist to workspace state: Error: storage unavailable`

**Rationale:**
- Consistent `[ViewMode]` prefix enables easy filtering in output channel
- Warning emoji (⚠️) highlights error/edge cases
- Arrow notation (→) clearly shows state transitions
- Error messages include context for debugging

**Validation:**
- All logging statements included in Tasks 2 and 3
- Output channel shows expected logs during manual testing

---

## Completion Criteria

- ✅ Storage key constant defined (`STORAGE_KEY_VIEW_MODE`)
- ✅ Constructor loads view mode from workspace state
- ✅ Constructor validates and corrects invalid stored values
- ✅ `setViewMode()` method implemented with validation
- ✅ `setViewMode()` persists changes to workspace state
- ✅ `setViewMode()` triggers TreeView refresh
- ✅ All state changes logged to output channel
- ✅ Error handling for invalid modes and persistence failures
- ✅ TypeScript compilation succeeds with no errors

## Testing Validation

**Manual Testing:**

1. **First Run (No Saved State):**
   - Install extension fresh (clear workspace state)
   - Open output channel → Cascade
   - Verify log: `[ViewMode] Initialized to: hierarchy`

2. **Mode Change:**
   - Open Developer Console
   - Execute: `vscode.commands.executeCommand('workbench.action.openGlobalSettings')`
   - In Console: `vscode.extensions.getExtension('cascade').exports.treeProvider.setViewMode('status')`
   - Verify logs:
     - `[ViewMode] Persisted to workspace state: status`
     - `[ViewMode] Switched: hierarchy → status`
     - `[TreeView] Refreshing TreeView...` (from refresh() call)

3. **Persistence Across Reload:**
   - Reload VSCode window (Ctrl+Shift+P → Developer: Reload Window)
   - Open output channel → Cascade
   - Verify log: `[ViewMode] Initialized to: status` (loaded from workspace state)

4. **Invalid Mode Handling:**
   - In Console: `vscode.extensions.getExtension('cascade').exports.treeProvider.setViewMode('invalid')`
   - Verify log: `[ViewMode] ⚠️  Invalid mode: invalid, ignoring setViewMode() call`
   - Verify mode unchanged (still 'status')

5. **No-Change Handling:**
   - In Console: `vscode.extensions.getExtension('cascade').exports.treeProvider.setViewMode('status')`
   - Verify log: `[ViewMode] Mode already set to: status, skipping update`
   - Verify no refresh triggered

**Expected Results:**
- All logging statements appear as expected
- State persists across VSCode reloads
- Invalid values rejected with warnings
- TreeView refreshes only on actual mode changes

**Note:** Full automated testing in Phase 3.

---

## Next Phase

**Phase 3: Testing**
- Unit tests for initialization, getters, setters, validation
- Integration tests for workspace state persistence
- Edge case tests (invalid values, concurrent updates)
- Mock setup for isolated testing

**Dependencies for Next Phase:**
- Phase 2 must complete successfully (state management fully implemented)
- Test utilities (mocks for Memento, OutputChannel)
