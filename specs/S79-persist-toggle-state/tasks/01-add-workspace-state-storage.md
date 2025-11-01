---
spec: S79
phase: 1
title: Add Workspace State Storage
status: Completed
priority: Medium
created: 2025-10-23
updated: 2025-10-24
---

# Phase 1: Add Workspace State Storage

## Overview

This phase modifies the `PlanningTreeProvider` class to accept workspace state storage via constructor parameter and use it to persist the `showArchivedItems` toggle state. The provider will read the saved state on initialization and write updates when the toggle changes.

## Prerequisites

- ✅ S77 completed (`showArchivedItems` field and `toggleArchivedItems()` method exist)
- ✅ S78 completed (filtering logic uses `showArchivedItems` flag)
- ✅ Understanding of VSCode Memento API

## Tasks

### Task 1: Update Constructor Signature

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:231-241`

**Current Implementation**:
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel
) {
  // Initialize propagation engine
  this.propagationEngine = new StatusPropagationEngine(
    workspaceRoot,
    cache,
    outputChannel
  );
}
```

**New Implementation**:
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private workspaceState: vscode.Memento  // NEW parameter
) {
  // Initialize propagation engine
  this.propagationEngine = new StatusPropagationEngine(
    workspaceRoot,
    cache,
    outputChannel
  );

  // Restore toggle state from workspace storage (S79)
  // Default to false if no saved state exists (first run)
  this.showArchivedItems = workspaceState.get<boolean>('cascade.showArchived', false);
  this.outputChannel.appendLine(
    `[Archive] Initialized toggle state: ${this.showArchivedItems} (from workspace storage)`
  );
}
```

**Changes**:
1. Add `private workspaceState: vscode.Memento` parameter (4th parameter)
2. After propagation engine initialization, read state from storage
3. Use `workspaceState.get<boolean>('cascade.showArchived', false)` with default
4. Set `this.showArchivedItems` to restored value
5. Log restoration to output channel

**Expected Outcome**:
- Constructor accepts 4 parameters (backward compatible if parameter is appended)
- `showArchivedItems` initialized from storage (not hardcoded `false`)
- Output channel shows initialization log

**TypeScript Type Safety**:
- `vscode.Memento` is imported from VSCode API (already in imports)
- `get<boolean>()` is type-safe (returns `boolean`, never `undefined` with default)

---

### Task 2: Update toggleArchivedItems() Method

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:432-440`

**Current Implementation**:
```typescript
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

**New Implementation**:
```typescript
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Persist state to workspace storage (S79)
  this.workspaceState.update('cascade.showArchived', this.showArchivedItems)
    .then(
      () => {
        this.outputChannel.appendLine(
          `[Archive] Persisted toggle state: ${this.showArchivedItems}`
        );
      },
      (error) => {
        // Log error but don't fail (graceful degradation)
        this.outputChannel.appendLine(
          `[Archive] Warning: Failed to persist toggle state: ${error}`
        );
      }
    );

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

**Changes**:
1. After toggle, call `this.workspaceState.update()`
2. Storage key: `'cascade.showArchived'` (matches constructor read)
3. Value: `this.showArchivedItems` (current boolean value)
4. Handle promise resolution: log success
5. Handle promise rejection: log warning (graceful degradation)
6. Refresh still called (non-blocking, async update doesn't delay refresh)

**Expected Outcome**:
- Toggle state persisted to workspace storage after each toggle
- Success logged to output channel
- Errors handled gracefully (warning logged, toggle still works)

**Error Handling**:
- `update()` returns `Thenable<void>` (promise-like)
- Failure scenarios: storage full, permissions, VSCode bug
- Graceful degradation: toggle works, just doesn't persist
- User not notified (silent failure, logged for debugging)

---

### Task 3: Verify TypeScript Compilation

**Goal**: Ensure code compiles without errors after changes

**Steps**:
1. Run `npm run compile` in `vscode-extension/` directory
2. Check for TypeScript errors
3. Fix any type issues or import errors

**Common Issues to Check**:
- `vscode.Memento` type imported correctly
- Constructor parameter types match
- `get<boolean>()` and `update()` calls type-safe
- No breaking changes to existing code

**Expected Outcome**:
- Compilation succeeds with no errors
- No new TypeScript warnings
- Build output confirms successful compilation

---

### Task 4: Add Output Channel Logging

**Goal**: Provide debugging visibility into state persistence

**Logging Points** (already added in Tasks 1 and 2):

**Point 1**: Constructor initialization
```typescript
this.outputChannel.appendLine(
  `[Archive] Initialized toggle state: ${this.showArchivedItems} (from workspace storage)`
);
```

**Point 2**: Toggle persistence success
```typescript
this.outputChannel.appendLine(
  `[Archive] Persisted toggle state: ${this.showArchivedItems}`
);
```

**Point 3**: Toggle persistence error
```typescript
this.outputChannel.appendLine(
  `[Archive] Warning: Failed to persist toggle state: ${error}`
);
```

**Expected Output Examples**:

**First Activation (No Saved State)**:
```
[Archive] Initialized toggle state: false (from workspace storage)
```

**After Toggle ON**:
```
[Archive] Toggled archived items: visible
[Archive] Persisted toggle state: true
```

**After Reload (State Restored)**:
```
[Archive] Initialized toggle state: true (from workspace storage)
```

**Expected Outcome**:
- Clear logging shows state restoration and persistence
- Debugging visibility for manual testing
- Error logging for troubleshooting storage failures

---

### Task 5: Update Constructor Documentation

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:224-230`

**Current JSDoc**:
```typescript
/**
 * Creates a new PlanningTreeProvider.
 *
 * @param workspaceRoot - Absolute path to workspace root directory
 * @param cache - FrontmatterCache instance for parsing files
 * @param outputChannel - Output channel for logging
 */
constructor(
```

**New JSDoc**:
```typescript
/**
 * Creates a new PlanningTreeProvider.
 *
 * Initializes the provider with workspace state storage for persisting
 * toggle preferences (e.g., showArchivedItems) across VSCode sessions.
 *
 * @param workspaceRoot - Absolute path to workspace root directory
 * @param cache - FrontmatterCache instance for parsing files
 * @param outputChannel - Output channel for logging
 * @param workspaceState - Workspace state storage for persisting toggle preferences (S79)
 */
constructor(
```

**Changes**:
1. Add description line about state storage persistence
2. Add `@param workspaceState` documentation
3. Reference S79 for context

**Expected Outcome**:
- JSDoc complete and accurate
- IDE shows parameter documentation on hover
- Clear explanation of new parameter purpose

---

## Completion Criteria

### Code Changes
- ✅ Constructor signature updated with `workspaceState: vscode.Memento` parameter
- ✅ Constructor reads state from storage and initializes `showArchivedItems`
- ✅ `toggleArchivedItems()` writes state to storage after toggle
- ✅ Output channel logging added for debugging
- ✅ JSDoc updated for constructor

### Compilation
- ✅ TypeScript compilation succeeds
- ✅ No type errors or warnings
- ✅ No breaking changes to existing code

### Logging
- ✅ Initialization log shows restored state
- ✅ Toggle persistence log shows success/error
- ✅ Output channel provides debugging visibility

## Notes

### Storage Key Convention

**Key**: `cascade.showArchived`

**Pattern**:
- Prefix: `cascade` (extension ID)
- Separator: `.` (dotted namespace)
- Name: `showArchived` (descriptive, matches field name)

**Why This Convention**:
- Matches VSCode extension ID (`cascade`)
- Clear, readable key name
- Consistent with VSCode storage patterns
- Easy to grep in workspace state file (debugging)

### Default Value Strategy

**Default**: `false` (archived items hidden)

**Why `false`**:
- Conservative choice (hide complexity by default)
- Matches existing behavior (S77/S78 default)
- Users opt-in to see archived items
- Reduces visual clutter for new users

**Alternative Considered**: `true` (show archived by default)
- ❌ More visual clutter (all items visible)
- ❌ Breaks existing behavior expectations
- ❌ Users might not understand "Archived" group initially

### Error Handling Philosophy

**Approach**: Graceful degradation

**Read Errors**:
- Default to `false` (safe fallback)
- Log warning to output channel
- Continue activation (non-blocking)

**Write Errors**:
- Toggle still works (no user impact)
- Log warning to output channel
- No user-facing error message

**Why This Approach**:
- Persistence is a **nice-to-have**, not critical feature
- Extension should work even if storage fails
- Errors rare in practice (VSCode handles storage reliably)
- Logging sufficient for debugging if issues occur

### VSCode Memento API Details

**Interface**:
```typescript
interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Thenable<void>;
}
```

**Characteristics**:
- **Synchronous read**: `get()` returns immediately
- **Asynchronous write**: `update()` returns promise
- **JSON serialization**: Only JSON-serializable values (boolean, string, number, object, array)
- **Workspace-scoped**: Different state per workspace folder
- **Persistent**: Survives VSCode restarts and window close/reopen

**Performance**:
- Read: < 1ms (in-memory lookup)
- Write: < 5ms (async, persisted to disk)
- No impact on extension activation or toggle command

### Backward Compatibility

**Constructor Parameter Addition**:
- Parameter **appended** (4th parameter, not inserted)
- If tests mock constructor, they may fail (need update)
- No public API change (internal class)

**Field Initialization**:
- `showArchivedItems` still boolean (type unchanged)
- Default value still `false` (behavior unchanged for new workspaces)
- Existing S77/S78 code works without modification

## Next Phase

Proceed to Phase 2: Integrate with Extension Activation

**Phase 2 Goals**:
- Modify `extension.ts` to pass `context.workspaceState` to provider
- Test persistence across reloads and window restarts
- Verify multi-workspace scenarios
- Test error handling with mocked storage failures
