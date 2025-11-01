---
spec: S72
phase: 1
title: Core Debouncing Implementation
status: Completed
priority: High
created: 2025-10-22
updated: 2025-10-22
---

# Phase 1: Core Debouncing Implementation

## Overview

Implement TreeView-level debouncing by adding `scheduleRefresh()` method to PlanningTreeProvider and updating FileSystemWatcher handlers to use it. This phase focuses on the core debounce logic, timer management, and integration with existing refresh infrastructure.

## Prerequisites

- S71 (FileSystemWatcher to TreeView Integration) completed
- Understanding of JavaScript setTimeout/clearTimeout
- Familiarity with VSCode extension lifecycle (activate/deactivate)

## Tasks

### Task 1: Add Debounce State to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Class fields section (around line 40-60)

**Add Private Fields:**
```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  // ... existing fields ...

  // Debounce state (NEW in S72)
  private refreshDebounceTimer?: NodeJS.Timeout;
  private debounceDelay: number = 300; // Default 300ms
```

**Update Constructor:**

Find the constructor (around line 100-130) and add debounce delay initialization:

```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private propagationEngine: StatusPropagationEngine
) {
  // ... existing constructor code ...

  // Initialize debounce delay from configuration (will be added in Phase 2)
  // For now, use hardcoded 300ms default
  this.debounceDelay = 300;

  this.outputChannel.appendLine(`[TreeView] Debounce delay: ${this.debounceDelay}ms`);
}
```

**Expected Outcome:**
- Two new fields added to class
- Constructor initializes debounce delay
- Output channel confirms debounce delay on extension activation

---

### Task 2: Implement scheduleRefresh() Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add before existing refresh() method (around line 200)

**Implementation:**
```typescript
/**
 * Schedules a debounced TreeView refresh.
 *
 * When multiple file changes occur in rapid succession (e.g., git merge),
 * this method batches them into a single refresh operation instead of
 * refreshing after every individual file change.
 *
 * Each call to scheduleRefresh() resets the debounce timer. The actual
 * refresh executes only after the debounce delay elapses with no new calls.
 *
 * Use Case Examples:
 * - File change events from FileSystemWatcher (S71)
 * - Batch operations (git merge, search-and-replace)
 * - Auto-save with rapid edits
 *
 * For immediate refreshes (user-initiated), use refresh() instead.
 *
 * @see refresh() - Immediate refresh that bypasses debounce
 */
scheduleRefresh(): void {
  // Clear existing timer if present (reset debounce window)
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.outputChannel.appendLine('[TreeView] Refresh debounced (timer reset)');
  }

  // Handle delay=0 case (immediate refresh, no debouncing)
  if (this.debounceDelay === 0) {
    this.outputChannel.appendLine('[TreeView] Debounce disabled (delay=0), refreshing immediately');
    this.refresh();
    return;
  }

  // Start new debounce timer
  this.refreshDebounceTimer = setTimeout(() => {
    this.outputChannel.appendLine('[TreeView] Debounce timer expired, executing refresh');
    this.refresh();
    this.refreshDebounceTimer = undefined; // Clear timer reference
  }, this.debounceDelay);

  this.outputChannel.appendLine(`[TreeView] Refresh scheduled in ${this.debounceDelay}ms`);
}
```

**Expected Outcome:**
- scheduleRefresh() method added to class
- Method implements standard debounce pattern:
  - Cancel existing timer
  - Start new timer
  - Execute refresh() when timer expires
- Comprehensive logging for debugging
- Edge case handling (delay=0)

---

### Task 3: Update refresh() to Cancel Pending Debounced Refreshes

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Existing refresh() method (around line 209)

**Current Code (before modification):**
```typescript
async refresh(): Promise<void> {
  // Clear items cache first (forces reload on next access)
  this.allItemsCache = null;
  this.outputChannel.appendLine('[ItemsCache] Cache cleared');
  // ... rest of refresh logic ...
}
```

**Enhanced Code (after modification):**
```typescript
async refresh(): Promise<void> {
  // Cancel any pending debounced refresh (if user manually refreshed)
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.refreshDebounceTimer = undefined;
    this.outputChannel.appendLine('[TreeView] Pending debounced refresh cancelled (manual refresh)');
  }

  // Clear items cache first (forces reload on next access)
  this.allItemsCache = null;
  this.outputChannel.appendLine('[ItemsCache] Cache cleared');

  // ... rest of existing refresh logic (unchanged) ...
}
```

**Expected Outcome:**
- refresh() cancels pending timer before executing
- Manual refresh bypasses debounce (immediate)
- Log entry confirms cancellation
- Existing refresh logic unchanged

---

### Task 4: Add dispose() Method for Timer Cleanup

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** End of class (around line 600, after last method)

**Implementation:**
```typescript
/**
 * Disposes of resources when extension is deactivated.
 *
 * Cleanup Steps:
 * 1. Cancel pending debounced refresh timer (if any)
 * 2. Optionally execute pending refresh before cleanup
 *    (ensures final state is persisted)
 *
 * This prevents memory leaks from uncancelled timers and ensures
 * pending refreshes complete before extension unloads.
 *
 * Called automatically by VSCode when extension deactivates.
 */
dispose(): void {
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.outputChannel.appendLine('[TreeView] Debounce timer cleared (extension deactivating)');

    // Execute pending refresh before cleanup (ensure final state persisted)
    // This is a judgment call - you can remove this if you prefer
    // to skip pending refreshes on deactivation
    this.refresh();

    this.refreshDebounceTimer = undefined;
  }

  this.outputChannel.appendLine('[TreeView] PlanningTreeProvider disposed');
}
```

**Expected Outcome:**
- dispose() method added to class
- Timer cleanup on extension deactivation
- Optional final refresh before cleanup
- Prevents memory leaks

---

### Task 5: Update FileSystemWatcher Handlers to Use scheduleRefresh()

**File:** `vscode-extension/src/extension.ts`

**Location:** Event handler functions (lines 351-382)

**Current Code (before modification):**
```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)

  // Refresh TreeView to show new file
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (new file)`);
  }
};

const handleChange = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to show updated data
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file changed)`);
  }
};

const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to remove deleted file
  if (planningTreeProvider) {
    await planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file deleted)`);
  }
};
```

**Enhanced Code (after modification):**
```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh(); // Changed from refresh()
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: New file detected`);
  }
};

const handleChange = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh(); // Changed from refresh()
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: File changed`);
  }
};

const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh(); // Changed from refresh()
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: File deleted`);
  }
};
```

**Key Changes:**
- Change `refresh()` → `scheduleRefresh()` (3 locations)
- Update log messages: `REFRESH:` → `SCHEDULE_REFRESH:`
- Remove `await` (scheduleRefresh is synchronous, starts timer)

**Expected Outcome:**
- File change events trigger debounced refresh
- Multiple rapid changes batched into single refresh
- Logging shows scheduled vs executed refreshes

---

### Task 6: Register PlanningTreeProvider Disposal

**File:** `vscode-extension/src/extension.ts`

**Location:** activate() function, context.subscriptions section (around line 1200)

**Current Code (find this section):**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... extension setup code ...

  // Register disposables
  context.subscriptions.push(
    cascadeTreeView,
    outputChannel,
    frontmatterCache,
    // ... other disposables ...
  );
}
```

**Enhanced Code (add planningTreeProvider):**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... extension setup code ...

  // Register disposables
  context.subscriptions.push(
    cascadeTreeView,
    outputChannel,
    frontmatterCache,
    planningTreeProvider, // Add this line (NEW)
    // ... other disposables ...
  );
}
```

**Expected Outcome:**
- planningTreeProvider.dispose() called on extension deactivation
- Timer cleanup guaranteed
- No memory leaks

---

## Completion Criteria

### Code Changes Verified
- [ ] PlanningTreeProvider has refreshDebounceTimer and debounceDelay fields
- [ ] scheduleRefresh() method implemented with debounce logic
- [ ] refresh() cancels pending debounced refresh
- [ ] dispose() method cleans up timer
- [ ] FileSystemWatcher handlers call scheduleRefresh() instead of refresh()
- [ ] planningTreeProvider registered in context.subscriptions

### Behavior Verified
- [ ] Single file change triggers debounced refresh (300ms delay)
- [ ] Multiple rapid file changes batched into single refresh
- [ ] Manual refresh (command) bypasses debounce (immediate)
- [ ] Extension deactivation cleans up timer (no memory leak)
- [ ] Logging shows debounce behavior:
  - `[TreeView] Refresh scheduled in 300ms`
  - `[TreeView] Refresh debounced (timer reset)`
  - `[TreeView] Debounce timer expired, executing refresh`

### Testing Checklist
- [ ] Modify single file → verify 300ms delay before refresh
- [ ] Modify 10 files rapidly → verify single refresh after last file
- [ ] Click "Refresh" button → verify immediate refresh
- [ ] Check output channel → verify debounce logs present
- [ ] Reload extension → verify timer cleanup (no errors)

## Next Phase

Proceed to **Phase 2: Configuration and Polish** to add:
- VSCode configuration setting (`cascade.refreshDebounceDelay`)
- Configuration change listener
- updateDebounceDelay() method
- Documentation and edge case handling
