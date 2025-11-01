---
spec: S37
phase: 2
title: Activation Event Updates
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 2: Activation Event Updates

## Overview

Optimize VSCode extension activation by updating `package.json` to use workspace-specific activation events. This allows VSCode to skip loading the extension entirely in workspaces that don't contain `plans/` or `specs/` directories, improving startup performance and reducing memory footprint.

**What this phase accomplishes**:
- Adds `workspaceContains` activation events for instant detection
- Maintains `onStartupFinished` as fallback for edge cases
- Reduces extension loading overhead in unrelated projects
- Leverages VSCode's built-in workspace scanning (faster than custom code)

**Performance improvement**: VSCode checks for directories before activating extension (pre-load vs post-load detection).

## Prerequisites

- Phase 1 completed (workspace detection logic implemented)
- Extension currently uses `onStartupFinished` activation event (package.json:18)
- Understanding of VSCode activation events: https://code.visualstudio.com/api/references/activation-events

## Tasks

### Task 1: Understand VSCode Activation Events

**Objective**: Learn how `workspaceContains` events work and why they're optimal for this use case.

**Key Concepts**:

**Current behavior** (`onStartupFinished`):
1. VSCode finishes startup
2. Loads extension code (activates)
3. Extension runs `shouldActivateExtension()` check
4. Extension decides to stay dormant (but already loaded)

**Improved behavior** (`workspaceContains`):
1. VSCode scans workspace for glob patterns BEFORE loading extensions
2. If pattern matches, loads extension immediately (no delay)
3. If pattern doesn't match, extension never loads (saves memory)
4. Extension `activate()` is only called when directories exist

**Activation event types**:
- `onStartupFinished`: Always activates after startup (generic)
- `workspaceContains:pattern`: Activates only if glob pattern matches files/folders
- Multiple events: Extension activates if ANY event triggers (OR logic)

**Glob pattern syntax**:
- `**/plans/**`: Matches any `plans/` directory at any depth, containing anything
- `**/specs/**`: Matches any `specs/` directory at any depth, containing anything
- Patterns are checked against workspace file tree

**Reference**: https://code.visualstudio.com/api/references/activation-events#workspaceContains

**Expected outcome**: Understanding that `workspaceContains` is a pre-activation filter, not a runtime check.

### Task 2: Update `package.json` Activation Events

**Objective**: Add workspace-specific activation events while maintaining backward compatibility.

**Location**: `vscode-extension/package.json:17-19`

**Current code**:
```json
{
  "activationEvents": [
    "onStartupFinished"
  ]
}
```

**New code**:
```json
{
  "activationEvents": [
    "onStartupFinished",
    "workspaceContains:**/plans/**",
    "workspaceContains:**/specs/**"
  ]
}
```

**Explanation**:
- **`onStartupFinished`**: Fallback for edge cases (e.g., user creates `plans/` mid-session)
- **`workspaceContains:**/plans/**`**: Instant activation if plans/ directory exists anywhere
- **`workspaceContains:**/specs/**`**: Instant activation if specs/ directory exists anywhere

**Why keep `onStartupFinished`**:
- Ensures extension loads even if directories are created after VSCode startup
- Allows runtime detection to handle dynamic workspace changes
- Minimal overhead (extension will early-return if workspace doesn't qualify)

**Why OR logic is correct**:
- Extension needs to activate if EITHER directory exists
- Multiple `activationEvents` use OR logic (any one triggers activation)
- Aligns with `shouldActivateExtension()` logic (Phase 1)

**File reference**: `vscode-extension/package.json:17-19`

**Validation**:
- JSON syntax valid (no trailing commas, proper quotes)
- Array contains 3 string elements
- Glob patterns use correct syntax (`**/directory/**`)

### Task 3: Rebuild Extension

**Objective**: Compile updated package.json into extension bundle.

**Steps**:
1. Open terminal in `vscode-extension/` directory
2. Run build command:
   ```bash
   npm run compile
   ```
3. Verify successful build:
   - Output: "✅ Build complete"
   - No TypeScript errors
   - `dist/extension.js` updated (check file timestamp)

**Expected outcome**: Extension bundle includes updated `package.json` metadata.

**Troubleshooting**:
- If build fails: Check for JSON syntax errors in package.json
- If warnings appear: Review but can proceed if only warnings (not errors)

### Task 4: Test Activation Behavior in Lineage Project

**Objective**: Verify extension activates correctly when directories are present.

**Test Procedure**:

1. **Clean slate**: Close all VSCode windows running Extension Development Host
2. **Open Lineage project**: Open VSCode in `D:\projects\lineage`
3. **Start debugging**: Press **F5** in extension source
4. **Observe activation timing**:
   - Extension Development Host opens
   - "Lineage Planning" output channel appears quickly (< 1 second)
5. **Check output channel**:
   - View → Output → "Lineage Planning"
   - Verify workspace detection logs show activation
6. **Check timing**:
   - Note timestamp on first log line (e.g., "Activated at: 10/12/2025, 3:30:45 PM")
   - Compare to VSCode window open time (should be near-instant)

**Expected results**:
- ✅ Extension activates immediately (workspaceContains triggered)
- ✅ Workspace detection shows `✅ lineage` with plans/ and specs/
- ✅ "Extension features initialized successfully" message present
- ✅ No delay between window open and activation
- ✅ No errors in Debug Console

**Performance validation**:
- Activation should happen within 1 second of window opening
- If using `onStartupFinished` only, there might be 2-3 second delay
- With `workspaceContains`, activation is nearly instant

### Task 5: Test Non-Activation in Unrelated Project

**Objective**: Verify extension does NOT load in projects without plans/specs directories.

**Test Procedure**:

1. **Create test project**:
   ```bash
   mkdir D:\temp\no-plans-project
   echo "test" > D:\temp\no-plans-project\readme.txt
   ```
2. **Close Extension Development Host** (if running)
3. **Open unrelated project**: Open VSCode in `D:\temp\no-plans-project`
4. **Start debugging**: Press **F5** in extension source
5. **Check if extension loaded**:
   - Open View → Output dropdown
   - Look for "Lineage Planning" channel

**Expected results**:
- ❌ "Lineage Planning" output channel should NOT appear (extension never activated)
- ❌ No activation logs (extension code never ran)
- ✅ Extension Development Host opens normally (no errors)
- ✅ Debug Console shows no errors related to extension

**Why this matters**: Extension isn't using memory/CPU in unrelated projects (performance win).

**Fallback verification**:
- If extension DID activate (unexpected):
  - Check workspace detection logs
  - Should show "Extension will not initialize features"
  - This means `workspaceContains` matched something (investigate glob pattern)

### Task 6: Test Multi-Root Workspace Behavior

**Objective**: Verify activation works correctly when multiple workspace folders are open.

**Test Procedure**:

**Scenario A: One qualifying folder**
1. In Extension Development Host, open empty workspace
2. File → Add Folder to Workspace → `D:\projects\lineage`
3. File → Add Folder to Workspace → `D:\temp\no-plans-project`
4. Check "Lineage Planning" output channel
5. Verify extension activated (at least one folder qualifies)

**Scenario B: No qualifying folders**
1. Open new Extension Development Host
2. File → Add Folder to Workspace → `D:\temp\no-plans-project`
3. File → Add Folder to Workspace → `D:\temp\test-project` (also no plans/specs)
4. Verify extension did NOT activate (no output channel)

**Expected results**:
- Scenario A: Extension activates, logs show both folders checked (✅ lineage, ❌ no-plans-project)
- Scenario B: Extension doesn't activate (no qualifying folders)

**Multi-root glob matching**: VSCode checks patterns against ALL workspace folders (correct behavior for our use case).

### Task 7: Test Edge Case - Directory Created After Activation

**Objective**: Verify `onStartupFinished` fallback handles mid-session directory creation.

**Test Procedure**:

1. **Start with empty project**:
   ```bash
   mkdir D:\temp\empty-project
   ```
2. **Open in Extension Development Host**: VSCode in `D:\temp\empty-project`
3. **Verify extension dormant**: No "Lineage Planning" output channel
4. **Create plans directory** (while VSCode running):
   ```bash
   mkdir D:\temp\empty-project\plans
   ```
5. **Reload window**: Ctrl+Shift+P → "Developer: Reload Window"
6. **Check activation**: "Lineage Planning" output channel should now appear

**Expected results**:
- ✅ Extension activates after window reload (onStartupFinished catches it)
- ✅ Workspace detection shows `✅ empty-project` with plans/ found
- ✅ Extension features initialized

**Why this works**: `onStartupFinished` runs every startup, so even if `workspaceContains` didn't match initially, the fallback triggers after reload.

**Alternative**: Phase 3 will add dynamic monitoring (no reload needed), but this proves fallback works.

## Completion Criteria

This phase is complete when:

- ✅ `package.json` updated with 3 activation events
- ✅ Extension builds successfully after changes
- ✅ Extension activates instantly in Lineage project (workspaceContains triggered)
- ✅ Extension does NOT load in unrelated projects (verified by missing output channel)
- ✅ Multi-root workspace activates if ANY folder qualifies
- ✅ Fallback activation event works when directory created mid-session
- ✅ No JSON syntax errors
- ✅ No runtime errors in any test scenario

**Performance validation**:
- Activation time in Lineage project: < 1 second from window open
- Memory usage in unrelated projects: Extension not loaded (check Task Manager if needed)

**Deliverable artifacts**:
- Modified `vscode-extension/package.json` with updated activationEvents
- Extension builds successfully: `npm run compile` exits with code 0
- All 7 tasks validated with passing tests

## Next Phase

Proceed to **Phase 3: Dynamic Workspace Monitoring** to add real-time detection of workspace folder changes without requiring window reload.

**Why Phase 3 is next**: Phase 2 handles startup activation optimally, but Phase 3 improves user experience by detecting changes dynamically (better UX, matches acceptance criteria).
