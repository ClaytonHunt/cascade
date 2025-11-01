---
spec: S37
phase: 3
title: Dynamic Workspace Monitoring
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 3: Dynamic Workspace Monitoring

## Overview

Implement real-time monitoring of workspace folder changes to detect when users add or remove workspace folders during a VSCode session. This eliminates the need for manual window reloads and provides seamless activation/deactivation as the workspace structure changes.

**What this phase accomplishes**:
- Detects when workspace folders are added or removed
- Re-evaluates activation status dynamically
- Logs workspace changes with clear reasoning
- Handles edge cases (empty workspace → folders added, folders removed → empty workspace)
- Improves user experience (no reload required)

**User scenario**: User opens empty workspace, then adds Lineage project folder → extension activates automatically.

## Prerequisites

- Phase 1 completed (workspace detection logic exists)
- Phase 2 completed (activation events configured)
- Familiarity with VSCode event-driven APIs: https://code.visualstudio.com/api/references/vscode-api#events

## Tasks

### Task 1: Understand VSCode Workspace Events

**Objective**: Learn how `onDidChangeWorkspaceFolders` event works and when it fires.

**Key Concepts**:

**Event trigger conditions**:
- User adds folder: File → Add Folder to Workspace
- User removes folder: Right-click folder in Explorer → Remove Folder from Workspace
- Workspace file changes: Opening .code-workspace file with different folders
- Multi-root workspace creation: File → Save Workspace As

**Event payload** (`WorkspaceFoldersChangeEvent`):
```typescript
interface WorkspaceFoldersChangeEvent {
  readonly added: readonly WorkspaceFolder[];   // Folders added in this change
  readonly removed: readonly WorkspaceFolder[]; // Folders removed in this change
}
```

**Event registration pattern**:
```typescript
vscode.workspace.onDidChangeWorkspaceFolders((event) => {
  // Handle workspace change
});
```

**Important notes**:
- Event fires AFTER folders are added/removed (not before)
- Event provides delta (added/removed), not full workspace state
- Check `vscode.workspace.workspaceFolders` for current state
- Event may fire multiple times if multiple folders changed at once

**API Reference**: https://code.visualstudio.com/api/references/vscode-api#workspace.onDidChangeWorkspaceFolders

**Expected outcome**: Understanding that this event enables reactive workspace detection without polling.

### Task 2: Implement Workspace Change Handler Function

**Objective**: Create a handler function that re-evaluates activation status when workspace changes.

**Location**: Add after `logWorkspaceDetection()`, before `activate()` in `extension.ts`

**Implementation**:
```typescript
/**
 * Handles workspace folder changes by re-evaluating activation status.
 * This allows the extension to respond to folders being added or removed dynamically.
 *
 * @param event The workspace folders change event
 * @param outputChannel The output channel for logging
 */
function handleWorkspaceChange(
  event: vscode.WorkspaceFoldersChangeEvent,
  outputChannel: vscode.OutputChannel
): void {
  // Log the change event
  outputChannel.appendLine('');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('🔄 Workspace Folders Changed');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Changed at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine('');

  // Log added folders
  if (event.added.length > 0) {
    outputChannel.appendLine(`➕ Added ${event.added.length} folder(s):`);
    for (const folder of event.added) {
      outputChannel.appendLine(`   - ${folder.name} (${folder.uri.fsPath})`);
    }
    outputChannel.appendLine('');
  }

  // Log removed folders
  if (event.removed.length > 0) {
    outputChannel.appendLine(`➖ Removed ${event.removed.length} folder(s):`);
    for (const folder of event.removed) {
      outputChannel.appendLine(`   - ${folder.name} (${folder.uri.fsPath})`);
    }
    outputChannel.appendLine('');
  }

  // Re-evaluate activation status
  const shouldActivate = shouldActivateExtension();

  outputChannel.appendLine('--- Updated Workspace Detection ---');
  logWorkspaceDetection(outputChannel);
  outputChannel.appendLine('');

  // Determine action based on new state
  if (shouldActivate) {
    outputChannel.appendLine('✅ Extension remains active (qualifying folders present)');
  } else {
    outputChannel.appendLine('⏸️  Extension should deactivate (no qualifying folders)');
    outputChannel.appendLine('   (Note: VSCode extensions cannot deactivate at runtime)');
    outputChannel.appendLine('   (Features will not initialize until qualifying folder added)');
  }

  outputChannel.appendLine('='.repeat(60));
}
```

**Key details**:
- Logs added/removed folders explicitly (debugging multi-root scenarios)
- Calls existing `shouldActivateExtension()` to check new state (reuses Phase 1 logic)
- Calls `logWorkspaceDetection()` to show full workspace analysis (consistency)
- Notes that VSCode extensions cannot truly deactivate (architectural limitation)
- Uses separator lines consistent with existing logging style

**VSCode limitation note**: Extensions cannot unload themselves once activated. However, we can:
- Prevent feature initialization (file watchers, parsers) if workspace doesn't qualify
- Log clear status messages about activation state
- Future story (S38) will conditionally initialize watchers based on `shouldActivateExtension()`

**Expected output example** (adding Lineage folder):
```
============================================================
🔄 Workspace Folders Changed
============================================================
Changed at: 10/12/2025, 3:45:12 PM

➕ Added 1 folder(s):
   - lineage (D:\projects\lineage)

--- Updated Workspace Detection ---
🔍 Checking 2 workspace folder(s):

   ✅ lineage
      Path: D:\projects\lineage
      Found: plans/
      Found: specs/

   ❌ other-project
      Path: D:\temp\other-project
      Missing: plans/ and specs/

✅ Extension activated - found required directories

✅ Extension remains active (qualifying folders present)
============================================================
```

### Task 3: Register Event Listener in `activate()`

**Objective**: Wire up the workspace change handler to VSCode's event system.

**Location**: Modify `vscode-extension/src/extension.ts` - `activate()` function

**Where to add**: After workspace detection check, before final success message

**Implementation**:
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... existing code (output channel, workspace detection) ...

  // NEW: Early return if workspace doesn't qualify (keep from Phase 1)
  if (!shouldActivate) {
    outputChannel.appendLine('⏸️  Extension will not initialize features');
    outputChannel.appendLine('   (Add plans/ or specs/ directory and reload window to activate)');
    outputChannel.appendLine('='.repeat(60));

    // NEW: Even if dormant, register workspace change listener
    // This allows extension to activate if qualifying folder added later
    const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
      (event) => handleWorkspaceChange(event, outputChannel)
    );
    context.subscriptions.push(workspaceChangeListener);

    return; // Stop here - don't initialize features yet
  }

  // NEW: Register workspace change listener for active extension
  const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
    (event) => handleWorkspaceChange(event, outputChannel)
  );
  context.subscriptions.push(workspaceChangeListener);

  // ... existing success message ...
  outputChannel.appendLine('✅ Extension features initialized successfully');
  outputChannel.appendLine('');
  outputChannel.appendLine('🔄 Workspace monitoring active (will detect folder changes)');
  outputChannel.appendLine('');
  outputChannel.appendLine('Next steps:');
  outputChannel.appendLine('  - S38: File system watcher initialization');
  outputChannel.appendLine('  - S39: YAML frontmatter parser');
  outputChannel.appendLine('  - S40: Frontmatter cache layer');
  outputChannel.appendLine('='.repeat(60));

  console.log('Lineage Planning extension activated');
}
```

**Key changes**:
- Register listener in BOTH branches (dormant and active paths)
- Even if extension starts dormant, it can activate later via workspace change
- Add listener to `context.subscriptions` for proper cleanup
- Log that monitoring is active (user visibility)

**Important**: Listener is registered in both code paths because:
- **Dormant path**: Allows activation if user adds qualifying folder
- **Active path**: Allows logging if workspace structure changes (debugging)

**Subscription management**: Adding to `context.subscriptions` ensures:
- Listener is automatically disposed when extension deactivates
- No memory leaks from orphaned event handlers
- VSCode handles cleanup lifecycle

**File reference**: `vscode-extension/src/extension.ts:10-50`

### Task 4: Test Dynamic Folder Addition

**Objective**: Verify extension detects when qualifying folder is added to workspace.

**Test Procedure**:

1. **Start with empty workspace**:
   - Launch Extension Development Host
   - Don't open any folders initially (empty workspace)
   - Verify no "Lineage Planning" output channel (extension dormant)

2. **Add qualifying folder**:
   - In Extension Development Host: File → Add Folder to Workspace
   - Select `D:\projects\lineage`
   - Wait 1-2 seconds

3. **Check for activation**:
   - View → Output → "Lineage Planning" (should now exist)
   - Read output logs:
     - Should show workspace change event (➕ Added 1 folder)
     - Should show updated workspace detection (✅ lineage)
     - Should show activation message

4. **Verify features ready**:
   - Output should indicate extension is now active
   - No errors in Debug Console

**Expected results**:
- ✅ Workspace change event logged with added folder details
- ✅ Extension recognizes new folder has plans/ and specs/
- ✅ Activation status changes from dormant to active
- ✅ No window reload required

**Why this matters**: User can start with empty workspace, add Lineage project later, and extension activates seamlessly.

### Task 5: Test Dynamic Folder Removal

**Objective**: Verify extension detects when qualifying folder is removed from workspace.

**Test Procedure**:

1. **Start with active extension**:
   - Open Extension Development Host with Lineage project
   - Verify "Lineage Planning" output channel shows activation

2. **Add second folder** (to keep workspace non-empty):
   - File → Add Folder to Workspace → `D:\temp\other-project`
   - Wait for workspace change event to log

3. **Remove qualifying folder**:
   - In Explorer, right-click "lineage" folder
   - Select "Remove Folder from Workspace"
   - Wait 1-2 seconds

4. **Check output**:
   - "Lineage Planning" output channel should log:
     - Workspace change event (➖ Removed 1 folder)
     - Updated workspace detection (❌ other-project only)
     - Deactivation note (no qualifying folders)

5. **Verify behavior**:
   - Extension still loaded (can't unload, VSCode limitation)
   - Output indicates features should not initialize
   - No errors in Debug Console

**Expected results**:
- ✅ Workspace change event logged with removed folder details
- ✅ Extension recognizes no qualifying folders remain
- ✅ Clear message about deactivation (even if can't truly unload)
- ✅ No errors or crashes

**VSCode behavior note**: Extension remains in memory (architectural limitation), but:
- Future features (S38 watchers) will check `shouldActivateExtension()` before starting
- Output makes status clear to developers
- Production users won't notice (extension is lightweight when dormant)

### Task 6: Test Multi-Root Workspace Scenarios

**Objective**: Verify correct behavior with multiple workspace folders being added/removed.

**Test Scenarios**:

**Scenario A: Add multiple folders at once**
1. Open empty Extension Development Host
2. Create multi-root workspace: File → Add Folder to Workspace
   - Add `D:\projects\lineage`
   - Add `D:\temp\other-project`
   - Add `D:\temp\test-project`
3. Verify output shows all added folders logged
4. Verify activation (lineage qualifies)

**Scenario B: Remove non-qualifying folder (keep qualifying)**
1. Start with multi-root workspace (lineage + other-project)
2. Remove "other-project" folder
3. Verify extension remains active (lineage still present)
4. Verify workspace change logged correctly

**Scenario C: Add qualifying folder to unrelated workspace**
1. Start with `D:\temp\other-project` only (dormant)
2. Add `D:\projects\lineage` folder
3. Verify extension activates
4. Verify both folders shown in workspace detection

**Scenario D: Remove all folders (return to empty)**
1. Start with single Lineage folder workspace
2. Remove Lineage folder (workspace becomes empty)
3. Verify output shows deactivation
4. Verify no errors (handles empty workspace gracefully)

**Expected results**: All scenarios handle folder changes correctly with appropriate logging and no errors.

### Task 7: Edge Case Testing

**Objective**: Test edge cases and error conditions.

**Edge Cases**:

1. **Rapid folder changes**:
   - Add folder A
   - Immediately add folder B (before first event processes)
   - Verify both events logged (or single event with both added)
   - Verify no race conditions or errors

2. **Folder with same name in different paths**:
   - Add `D:\projects\lineage`
   - Add `D:\backup\lineage` (different path, same name)
   - Verify both logged with full paths (disambiguation)

3. **Workspace change while extension dormant**:
   - Start with non-qualifying folder
   - Add another non-qualifying folder (still dormant)
   - Verify workspace change logged (even if no activation)
   - Verify output channel exists for logging

4. **Remove folder that was never qualifying**:
   - Start with lineage (active) + other-project
   - Remove other-project
   - Verify extension stays active
   - Verify removed folder logged

**Expected results**: All edge cases handled gracefully without errors or unexpected behavior.

## Completion Criteria

This phase is complete when:

- ✅ `handleWorkspaceChange()` function implemented and compiles
- ✅ Event listener registered in both dormant and active paths
- ✅ Extension builds successfully after changes
- ✅ Dynamic folder addition activates extension (Task 4 passes)
- ✅ Dynamic folder removal logged correctly (Task 5 passes)
- ✅ Multi-root workspace scenarios work correctly (Task 6 passes)
- ✅ All edge cases handled (Task 7 passes)
- ✅ No TypeScript errors (strict mode)
- ✅ No runtime errors in any scenario
- ✅ Workspace change events logged clearly with added/removed details

**User experience validation**:
- ✅ No window reload required for folder changes to take effect
- ✅ Clear logging explains activation status changes
- ✅ Multi-root workspace behavior is intuitive (activate if ANY folder qualifies)

**Deliverable artifacts**:
- Modified `vscode-extension/src/extension.ts` with workspace change monitoring
- Extension builds successfully: `npm run compile` exits with code 0
- All 7 tasks validated with passing tests
- Manual testing checklist completed

## Story Completion

After Phase 3 is complete, all acceptance criteria for **S37 - Workspace Activation Logic** are met:

- ✅ Extension checks for existence of `plans/` or `specs/` directories on activation (Phase 1)
- ✅ Extension fully activates only when directories are present (Phase 1)
- ✅ Extension gracefully handles absence of directories (Phase 1 early return)
- ✅ Works correctly with multi-root workspaces (checks all folders) (Phase 1 + Phase 3)
- ✅ Handles Windows paths correctly (Phase 1 uses `path.join()`)
- ✅ Logs activation status to output channel with clear messaging (Phase 1)
- ✅ Activation check completes quickly (< 100ms) (Phase 1 uses sync fs calls)
- ✅ Re-checks workspace when workspace folders are added/removed dynamically (Phase 3)

## Next Steps After S37 Completion

With S37 complete, the extension has intelligent activation. Recommended next stories:

1. **Update S37 story status**: Mark as "Completed" in plans/
2. **Update S36 story status**: Mark as "Ready" (was blocking dependency)
3. **Implement S39 next**: YAML Frontmatter Parser (can develop independently, easier to test)
4. **Then implement S38**: File System Watcher (depends on activation logic, will use S39 parser)
5. **Finally implement S40**: Frontmatter Cache Layer (depends on S38 + S39)

**Testing recommendation**:
- Run all Phase 1-3 tests again after Phase 3 completion (regression testing)
- Verify no interactions between phases broke earlier functionality
- Test complete user workflow: empty workspace → add folder → extension activates → features work

**Documentation update**:
- Update `vscode-extension/README.md` to mark S37 as ✅ complete
- Add user documentation about workspace activation behavior (if needed)
