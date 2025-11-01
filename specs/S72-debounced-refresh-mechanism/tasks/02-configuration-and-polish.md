---
spec: S72
phase: 2
title: Configuration and Polish
status: Completed
priority: High
created: 2025-10-22
updated: 2025-10-22
---

# Phase 2: Configuration and Polish

## Overview

Add VSCode configuration setting for debounce delay, implement configuration change listener, and polish edge cases. This phase makes the debounce delay user-configurable and ensures the feature integrates smoothly with VSCode's configuration system.

## Prerequisites

- Phase 1 completed (core debouncing implemented)
- Understanding of VSCode configuration contributions
- Familiarity with VSCode configuration API

## Tasks

### Task 1: Add Configuration Contribution to package.json

**File:** `vscode-extension/package.json`

**Location:** contributes section (after views/commands/menus)

**Current Structure (find this section):**
```json
{
  "contributes": {
    "viewsContainers": { ... },
    "commands": [ ... ],
    "views": { ... },
    "menus": { ... }
  }
}
```

**Enhanced Structure (add configuration):**
```json
{
  "contributes": {
    "viewsContainers": { ... },
    "commands": [ ... ],
    "views": { ... },
    "menus": { ... },
    "configuration": {
      "title": "Cascade",
      "properties": {
        "cascade.refreshDebounceDelay": {
          "type": "number",
          "default": 300,
          "minimum": 0,
          "maximum": 5000,
          "markdownDescription": "Delay in milliseconds before refreshing TreeView after file changes. Higher values reduce CPU usage during batch operations (e.g., git merge) but increase latency. Set to `0` to disable debouncing (immediate refresh)."
        }
      }
    }
  }
}
```

**Configuration Details:**
- **Setting Name:** `cascade.refreshDebounceDelay`
- **Type:** number (milliseconds)
- **Default:** 300ms (balances responsiveness and performance)
- **Minimum:** 0ms (disables debouncing)
- **Maximum:** 5000ms (prevents excessive delay)
- **Description:** Clear explanation with use cases

**Expected Outcome:**
- Configuration setting appears in VSCode Settings UI
- Search "cascade" shows the setting
- Setting has input validation (0-5000 range)
- Default value is 300

---

### Task 2: Update PlanningTreeProvider Constructor to Read Configuration

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Constructor (around line 100-130)

**Current Code (from Phase 1):**
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private propagationEngine: StatusPropagationEngine
) {
  // ... existing constructor code ...

  // Initialize debounce delay (hardcoded for Phase 1)
  this.debounceDelay = 300;

  this.outputChannel.appendLine(`[TreeView] Debounce delay: ${this.debounceDelay}ms`);
}
```

**Enhanced Code (read from configuration):**
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private propagationEngine: StatusPropagationEngine
) {
  // ... existing constructor code ...

  // Initialize debounce delay from VSCode configuration
  const config = vscode.workspace.getConfiguration('cascade');
  this.debounceDelay = config.get<number>('refreshDebounceDelay', 300);

  this.outputChannel.appendLine(`[TreeView] Debounce delay: ${this.debounceDelay}ms`);
}
```

**Expected Outcome:**
- Constructor reads setting from workspace configuration
- Falls back to 300ms if setting not found (defensive)
- Log entry shows configured delay value
- Extension respects user's custom delay on activation

---

### Task 3: Add updateDebounceDelay() Method to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add after scheduleRefresh() method (around line 250)

**Implementation:**
```typescript
/**
 * Updates debounce delay from configuration changes.
 *
 * Called by configuration change listener when user modifies
 * cascade.refreshDebounceDelay setting. Allows delay changes
 * to take effect immediately without reloading extension.
 *
 * Note: If a debounce timer is currently active, it continues
 * with the old delay. The new delay applies to subsequent
 * scheduleRefresh() calls.
 *
 * @param newDelay - New debounce delay in milliseconds (0-5000)
 */
updateDebounceDelay(newDelay: number): void {
  const oldDelay = this.debounceDelay;
  this.debounceDelay = newDelay;

  this.outputChannel.appendLine(
    `[TreeView] Debounce delay updated: ${oldDelay}ms → ${newDelay}ms`
  );

  // Log special cases
  if (newDelay === 0) {
    this.outputChannel.appendLine('[TreeView] Debouncing disabled (delay=0)');
  }
  if (newDelay > 1000) {
    this.outputChannel.appendLine(
      `[TreeView] Warning: High debounce delay (${newDelay}ms) may feel sluggish`
    );
  }
}
```

**Expected Outcome:**
- Method updates debounce delay field
- Logs old → new delay change
- Warns user about extreme values
- No extension reload required

---

### Task 4: Add Configuration Change Listener to Extension

**File:** `vscode-extension/src/extension.ts`

**Location:** activate() function, after watchers created (around line 1180)

**Implementation:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... existing extension setup code ...

  // Create file system watchers
  const watchers = createFileSystemWatchers(context, outputChannel, frontmatterCache);

  // Listen for configuration changes (NEW in S72)
  const configListener = vscode.workspace.onDidChangeConfiguration(event => {
    // Check if our setting changed
    if (event.affectsConfiguration('cascade.refreshDebounceDelay')) {
      // Read new value from configuration
      const config = vscode.workspace.getConfiguration('cascade');
      const newDelay = config.get<number>('refreshDebounceDelay', 300);

      // Update PlanningTreeProvider
      if (planningTreeProvider) {
        planningTreeProvider.updateDebounceDelay(newDelay);
      }

      outputChannel.appendLine(
        `[Config] Refresh debounce delay changed to ${newDelay}ms`
      );
    }
  });

  // Register configuration listener for disposal
  context.subscriptions.push(configListener);

  // ... rest of activation code ...
}
```

**Expected Outcome:**
- Listener detects configuration changes
- Only responds to cascade.refreshDebounceDelay changes (efficient)
- Updates PlanningTreeProvider when setting changes
- Listener disposed on extension deactivation

---

### Task 5: Add Validation and Edge Case Handling

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** updateDebounceDelay() method (enhance existing implementation)

**Enhanced Implementation:**
```typescript
updateDebounceDelay(newDelay: number): void {
  const oldDelay = this.debounceDelay;

  // Validate delay value (defensive programming)
  if (newDelay < 0) {
    this.outputChannel.appendLine(
      `[TreeView] Invalid debounce delay (${newDelay}ms), using 0ms instead`
    );
    newDelay = 0;
  }
  if (newDelay > 5000) {
    this.outputChannel.appendLine(
      `[TreeView] Warning: Debounce delay (${newDelay}ms) exceeds recommended maximum (5000ms)`
    );
  }

  this.debounceDelay = newDelay;

  this.outputChannel.appendLine(
    `[TreeView] Debounce delay updated: ${oldDelay}ms → ${newDelay}ms`
  );

  // Log special cases
  if (newDelay === 0) {
    this.outputChannel.appendLine('[TreeView] Debouncing disabled (delay=0), refreshes will be immediate');
  }
  if (newDelay > 1000) {
    this.outputChannel.appendLine(
      `[TreeView] High debounce delay (${newDelay}ms) may increase latency for file changes`
    );
  }
}
```

**Expected Outcome:**
- Negative values clamped to 0 (defensive)
- Values > 5000ms warned (guidance)
- Special cases logged (delay=0, high delays)
- Robust error handling

---

### Task 6: Update scheduleRefresh() Edge Case Handling

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** scheduleRefresh() method (enhance existing implementation)

**Enhanced Implementation:**
```typescript
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

**This code was already added in Phase 1, Task 2. Verify it's present and unchanged.**

**Expected Outcome:**
- delay=0 bypasses debouncing (immediate refresh)
- Logging confirms immediate vs debounced behavior
- Edge case handling tested

---

### Task 7: Test Configuration Integration

**Manual Testing Steps:**

1. **Install Updated Extension:**
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode:**
   - Press Ctrl+Shift+P
   - Run "Developer: Reload Window"

3. **Open Settings:**
   - Press Ctrl+,
   - Search for "cascade refresh"
   - Find "Cascade: Refresh Debounce Delay" setting

4. **Test Default Value:**
   - Verify default is 300
   - Open output channel (View → Output → Cascade)
   - Look for: `[TreeView] Debounce delay: 300ms`

5. **Test Configuration Change:**
   - Change setting to 1000
   - Check output channel for: `[TreeView] Debounce delay updated: 300ms → 1000ms`
   - Modify a planning file
   - Verify refresh waits 1000ms (check timestamps in output)

6. **Test delay=0 (Disable Debouncing):**
   - Change setting to 0
   - Check output channel for: `[TreeView] Debouncing disabled (delay=0)`
   - Modify a planning file
   - Verify immediate refresh (no delay)

7. **Test High Delay Warning:**
   - Change setting to 3000
   - Check output channel for warning message
   - Verify refresh still works (just slower)

8. **Test Invalid Values:**
   - Try to set negative value (VSCode should prevent)
   - Try to set value > 5000 (VSCode should prevent)
   - Verify extension handles edge cases gracefully

**Expected Results:**
- ✅ Setting appears in VSCode Settings UI
- ✅ Default value is 300ms
- ✅ Configuration changes logged to output channel
- ✅ Configuration changes take effect immediately (no reload)
- ✅ delay=0 disables debouncing (immediate refresh)
- ✅ High delays show warning but work correctly
- ✅ Invalid values prevented by VSCode validation

---

## Completion Criteria

### Code Changes Verified
- [ ] package.json has configuration contribution
- [ ] PlanningTreeProvider constructor reads configuration
- [ ] updateDebounceDelay() method implemented
- [ ] Configuration change listener added to extension.ts
- [ ] Edge case handling in scheduleRefresh() (delay=0)
- [ ] Validation in updateDebounceDelay() (negative, > 5000)

### Configuration Integration Verified
- [ ] Setting appears in VSCode Settings UI
- [ ] Default value (300ms) works on fresh install
- [ ] Changing setting updates debounce delay immediately
- [ ] delay=0 disables debouncing (immediate refresh)
- [ ] High delays (> 1000ms) show warning
- [ ] Configuration listener disposed on deactivation

### Manual Testing Completed
- [ ] Test 1: Default 300ms delay works
- [ ] Test 2: Change to 1000ms, verify delay change
- [ ] Test 3: Set to 0, verify immediate refresh
- [ ] Test 4: Set to 3000, verify warning but functional
- [ ] Test 5: Batch file changes (10 files) → single refresh
- [ ] Test 6: Manual refresh bypasses debounce

### Logging Verified
- [ ] `[TreeView] Debounce delay: 300ms` on activation
- [ ] `[TreeView] Debounce delay updated: X → Y` on config change
- [ ] `[TreeView] Debouncing disabled (delay=0)` when appropriate
- [ ] `[TreeView] Warning: High debounce delay...` for delays > 1000ms

## Performance Validation

**Test Scenario: Git Merge with 10 Files**

1. **Setup:**
   - Open Cascade TreeView
   - Open output channel
   - Set debounce delay to 300ms

2. **Execute:**
   - Run git merge affecting 10 planning files
   - Or: Use script to modify 10 files in < 100ms

3. **Verify Output Logs:**
   ```
   [14:23:45.123] FILE_CHANGED: plans/.../story-01.md
   [14:23:45.123] SCHEDULE_REFRESH: File changed
   [TreeView] Refresh scheduled in 300ms

   [14:23:45.145] FILE_CHANGED: plans/.../story-02.md
   [14:23:45.145] SCHEDULE_REFRESH: File changed
   [TreeView] Refresh debounced (timer reset)
   [TreeView] Refresh scheduled in 300ms

   [14:23:45.167] FILE_CHANGED: plans/.../story-03.md
   [14:23:45.167] SCHEDULE_REFRESH: File changed
   [TreeView] Refresh debounced (timer reset)
   [TreeView] Refresh scheduled in 300ms

   ... (7 more files, each resetting timer) ...

   [14:23:45.467] [TreeView] Debounce timer expired, executing refresh
   [ItemsCache] Cache cleared
   [Hierarchy] Cache cleared
   [Progress] Cache cleared
   [ItemsCache] Loaded 85 items in 178ms
   ```

4. **Performance Metrics:**
   - ✅ Total SCHEDULE_REFRESH events: 10
   - ✅ Total refresh executions: 1
   - ✅ Refresh batching: 90% reduction (10 → 1)
   - ✅ TreeView updates: 1 (smooth, no flicker)
   - ✅ Total latency: ~650ms (file debounce + TreeView debounce)

**Expected Outcome:**
- Single refresh after batch operation
- 90% reduction in refresh calls
- Smooth UI (no flicker)
- Total latency < 1 second

## Next Steps

After completing Phase 2:

1. **Run Full Test Suite:**
   - Unit tests (if implemented)
   - Integration tests (manual)
   - Performance validation (10+ files)

2. **Update Documentation:**
   - README.md (if extension has public docs)
   - DEVELOPMENT.md (developer notes)
   - Output channel help text

3. **Mark Story Complete:**
   - Update S72 status: Ready → In Progress → Completed
   - Update spec status: Not Started → Completed
   - Commit all changes with TDD methodology

4. **Optional Follow-ups:**
   - S73 (Selective Refresh Optimization)
   - S74 (Git Operation Detection)
   - Performance profiling with VSCode DevTools
