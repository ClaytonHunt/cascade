---
spec: S37
phase: 1
title: Workspace Detection Logic
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 1: Workspace Detection Logic

## Overview

Implement the core workspace detection functionality that determines whether the extension should activate based on the presence of `plans/` or `specs/` directories. This phase adds a helper function and integrates it into the existing `activate()` function with comprehensive logging.

**What this phase accomplishes**:
- Creates reusable `shouldActivateExtension()` function
- Checks all workspace folders for required directories
- Handles Windows paths and multi-root workspaces correctly
- Provides clear logging for debugging and user visibility
- Enables early return if workspace doesn't qualify

## Prerequisites

- S36 completed (extension scaffold exists at `vscode-extension/`)
- Extension builds successfully (`npm run compile`)
- Familiarity with VSCode Extension Development Host (F5 debugging)

## Tasks

### Task 1: Review Current Extension Structure

**Objective**: Understand the existing activation flow and identify integration points.

**Steps**:
1. Read `vscode-extension/src/extension.ts` (current implementation from S36)
2. Note the current `activate()` function structure:
   - Output channel creation (line 12)
   - Logging pattern (lines 16-30)
   - Subscription management (line 13)
3. Identify insertion point for workspace detection (before line 15)

**Expected outcome**: Clear understanding of where to add new code without breaking existing functionality.

### Task 2: Implement `shouldActivateExtension()` Helper Function

**Objective**: Create a pure function that determines activation eligibility based on workspace folders.

**Location**: Add after imports, before `activate()` function in `extension.ts`

**Implementation**:
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Determines if the extension should activate based on workspace contents.
 * Checks all workspace folders for the presence of 'plans/' or 'specs/' directories.
 *
 * @returns {boolean} True if any workspace folder contains plans/ or specs/, false otherwise
 */
function shouldActivateExtension(): boolean {
  // Get all open workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // No workspace folders = no activation (e.g., single file open)
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  // Check each workspace folder for required directories
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    const plansPath = path.join(folderPath, 'plans');
    const specsPath = path.join(folderPath, 'specs');

    // Activate if either directory exists
    if (fs.existsSync(plansPath) || fs.existsSync(specsPath)) {
      return true;
    }
  }

  // No qualifying folders found
  return false;
}
```

**Key details**:
- Uses `fs.existsSync()` for synchronous checking (fast, no race conditions)
- Uses `path.join()` for correct Windows path handling (`D:\projects\lineage\plans`)
- Short-circuits on first match (performance optimization)
- Returns false for edge cases (null workspace, single file open)

**API References**:
- `vscode.workspace.workspaceFolders`: https://code.visualstudio.com/api/references/vscode-api#workspace.workspaceFolders
- `WorkspaceFolder.uri.fsPath`: Converts VSCode URI to native file system path
- Node.js `fs.existsSync()`: https://nodejs.org/api/fs.html#fsexistssyncpath
- Node.js `path.join()`: https://nodejs.org/api/path.html#pathjoinpaths

**Validation**:
- Function should compile without TypeScript errors (strict mode enabled)
- No runtime dependencies beyond Node.js built-ins and VSCode API

### Task 3: Add Workspace Detection Logging Helper

**Objective**: Create a helper function to log detailed workspace detection results.

**Location**: Add after `shouldActivateExtension()`, before `activate()`

**Implementation**:
```typescript
/**
 * Logs detailed information about workspace detection for debugging.
 *
 * @param outputChannel The output channel to log to
 */
function logWorkspaceDetection(outputChannel: vscode.OutputChannel): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('ℹ️  No workspace folders open');
    outputChannel.appendLine('   Extension will remain dormant');
    return;
  }

  outputChannel.appendLine(`🔍 Checking ${workspaceFolders.length} workspace folder(s):`);
  outputChannel.appendLine('');

  let foundAny = false;

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    const plansPath = path.join(folderPath, 'plans');
    const specsPath = path.join(folderPath, 'specs');

    const hasPlans = fs.existsSync(plansPath);
    const hasSpecs = fs.existsSync(specsPath);

    if (hasPlans || hasSpecs) {
      outputChannel.appendLine(`   ✅ ${folder.name}`);
      outputChannel.appendLine(`      Path: ${folderPath}`);
      if (hasPlans) outputChannel.appendLine(`      Found: plans/`);
      if (hasSpecs) outputChannel.appendLine(`      Found: specs/`);
      foundAny = true;
    } else {
      outputChannel.appendLine(`   ❌ ${folder.name}`);
      outputChannel.appendLine(`      Path: ${folderPath}`);
      outputChannel.appendLine(`      Missing: plans/ and specs/`);
    }
    outputChannel.appendLine('');
  }

  if (foundAny) {
    outputChannel.appendLine('✅ Extension activated - found required directories');
  } else {
    outputChannel.appendLine('ℹ️  Extension dormant - no plans/ or specs/ directories found');
  }
}
```

**Key details**:
- Provides per-folder breakdown for multi-root workspace debugging
- Shows exact paths (helpful on Windows: `D:\projects\lineage`)
- Uses emoji prefixes consistent with existing logging style (extension.ts:23)
- Explains why extension is/isn't activating

**Expected output examples**:

*Lineage project (activates)*:
```
🔍 Checking 1 workspace folder(s):

   ✅ lineage
      Path: D:\projects\lineage
      Found: plans/
      Found: specs/

✅ Extension activated - found required directories
```

*Unrelated project (dormant)*:
```
🔍 Checking 1 workspace folder(s):

   ❌ my-other-project
      Path: D:\projects\my-other-project
      Missing: plans/ and specs/

ℹ️  Extension dormant - no plans/ or specs/ directories found
```

### Task 4: Integrate Workspace Detection into `activate()`

**Objective**: Add workspace detection check at the start of activation, with early return if workspace doesn't qualify.

**Location**: Modify `vscode-extension/src/extension.ts` - `activate()` function

**Implementation**:
```typescript
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging (keep existing code)
  outputChannel = vscode.window.createOutputChannel('Lineage Planning');
  context.subscriptions.push(outputChannel);

  // Log activation header (keep existing code)
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('Lineage Planning & Spec Status Extension');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Activated at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine(`Extension version: ${getExtensionVersion()}`);
  outputChannel.appendLine(`VSCode version: ${vscode.version}`);
  outputChannel.appendLine('');

  // NEW: Check workspace activation eligibility
  const shouldActivate = shouldActivateExtension();

  outputChannel.appendLine('--- Workspace Detection ---');
  logWorkspaceDetection(outputChannel);
  outputChannel.appendLine('');

  // NEW: Early return if workspace doesn't qualify
  if (!shouldActivate) {
    outputChannel.appendLine('⏸️  Extension will not initialize features');
    outputChannel.appendLine('   (Add plans/ or specs/ directory and reload window to activate)');
    outputChannel.appendLine('='.repeat(60));
    return; // Stop here - don't initialize watchers, parsers, etc.
  }

  // Keep existing success message (modify slightly)
  outputChannel.appendLine('✅ Extension features initialized successfully');
  outputChannel.appendLine('');
  outputChannel.appendLine('Next steps:');
  outputChannel.appendLine('  - S38: File system watcher initialization');
  outputChannel.appendLine('  - S39: YAML frontmatter parser');
  outputChannel.appendLine('  - S40: Frontmatter cache layer');
  outputChannel.appendLine('='.repeat(60));

  // Log to console as well (keep existing code)
  console.log('Lineage Planning extension activated');
}
```

**Key changes**:
- Call `shouldActivateExtension()` immediately after header logging
- Call `logWorkspaceDetection()` to show detailed folder analysis
- **Early return** if `shouldActivate` is false (prevents feature initialization)
- Updated success message to reflect feature initialization (vs just loading)

**File reference**: `vscode-extension/src/extension.ts:10-34`

**Expected behavior**:
- In Lineage project: Full activation, all logs present
- In other projects: Activation stops after workspace detection, shows dormant message
- Output channel always created (even if dormant) for user visibility

### Task 5: Test Workspace Detection

**Objective**: Verify activation logic works correctly in multiple scenarios.

**Test Procedure**:

**Test Case 1: Lineage Project (Should Activate)**
1. Open VSCode in `D:\projects\lineage`
2. Open extension source: `vscode-extension/src/extension.ts`
3. Press **F5** to launch Extension Development Host
4. In new window, open View → Output → "Lineage Planning"
5. Verify output shows:
   - Workspace detection section with `✅ lineage`
   - "Extension features initialized successfully"
   - No errors in Debug Console

**Test Case 2: Unrelated Project (Should NOT Activate)**
1. Create temporary directory: `D:\temp\test-project`
2. Open VSCode in `D:\temp\test-project`
3. Press **F5** (still debugging extension)
4. In new Extension Development Host window, check "Lineage Planning" output
5. Verify output shows:
   - Workspace detection section with `❌ test-project`
   - "Extension will not initialize features"
   - No activation success message
   - No errors

**Test Case 3: No Workspace Folders (Single File)**
1. In Extension Development Host, close all folders
2. Open a single file: File → Open File → any .txt file
3. Check "Lineage Planning" output
4. Verify output shows:
   - "No workspace folders open"
   - "Extension will remain dormant"
   - No errors

**Test Case 4: Multi-Root Workspace (Mixed)**
1. In Extension Development Host: File → Add Folder to Workspace
2. Add both `D:\projects\lineage` and `D:\temp\test-project`
3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
4. Check "Lineage Planning" output
5. Verify output shows:
   - Multiple folders checked (✅ lineage, ❌ test-project)
   - Extension activates (because lineage qualifies)

**Expected validation checklist**:
- [ ] Extension activates in Lineage project
- [ ] Extension stays dormant in unrelated projects
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in Debug Console
- [ ] Windows paths logged correctly (`D:\...` format)
- [ ] Multi-root workspace shows all folders
- [ ] Performance: Detection completes in < 100ms (check timestamps)

### Task 6: Edge Case Verification

**Objective**: Test edge cases mentioned in acceptance criteria.

**Edge Case Tests**:

1. **Empty directories**:
   - Create `D:\temp\test2\plans\` (empty directory)
   - Open VSCode in `D:\temp\test2`
   - Verify extension activates (existence check only, not contents)

2. **Only specs/ present**:
   - Create `D:\temp\test3\specs\` (no plans/)
   - Open VSCode in `D:\temp\test3`
   - Verify extension activates (either directory sufficient)

3. **Case sensitivity on Windows**:
   - Rename `D:\temp\test2\plans` to `D:\temp\test2\Plans` (capital P)
   - Verify extension still activates (Windows is case-insensitive)

4. **Symbolic links** (if applicable):
   - Create symlink: `mklink /D "D:\temp\test4\plans" "D:\projects\lineage\plans"`
   - Open VSCode in `D:\temp\test4`
   - Verify extension activates (follows symlink)

**Expected results**: All edge cases handled gracefully without errors.

## Completion Criteria

This phase is complete when:

- ✅ `shouldActivateExtension()` function implemented and compiles
- ✅ `logWorkspaceDetection()` function implemented and compiles
- ✅ `activate()` function modified to use workspace detection with early return
- ✅ Extension activates in Lineage project with detailed logs
- ✅ Extension stays dormant in unrelated projects with clear messaging
- ✅ No TypeScript errors (strict mode)
- ✅ No runtime errors in any test scenario
- ✅ All 4 main test cases pass
- ✅ All edge cases verified
- ✅ Detection completes in < 100ms (check log timestamps)

**Deliverable artifacts**:
- Modified `vscode-extension/src/extension.ts` with workspace detection logic
- Extension builds successfully: `npm run compile` exits with code 0
- Manual testing checklist completed with no failures

## Next Phase

Proceed to **Phase 2: Activation Event Updates** to optimize VSCode startup behavior by adding workspace-specific activation events to `package.json`.

**Why Phase 2 is next**: Phase 1 provides runtime detection, but Phase 2 makes VSCode skip loading the extension entirely in unrelated workspaces (better performance).
