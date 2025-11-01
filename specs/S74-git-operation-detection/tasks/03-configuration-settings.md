---
spec: S74
phase: 3
title: Configuration and Settings
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 3: Configuration and Settings

## Overview

Add VSCode settings to allow users to configure git operation detection behavior. This phase adds two new settings to `package.json` and implements a configuration change listener in `extension.ts` to update the detector dynamically when settings change.

**Settings to Add:**
- `planningKanban.enableGitOperationDetection`: Enable/disable git detection
- `planningKanban.gitOperationDebounceDelay`: Configure debounce delay (100-5000ms)

## Prerequisites

- Phase 1 completed (`GitOperationDetector` class implemented)
- Phase 2 completed (extension integration)
- Understanding of VSCode configuration API

## Tasks

### Task 1: Add Configuration Properties to package.json

Add git detection settings to the `contributes.configuration` section.

**Location:** `vscode-extension/package.json` (in `contributes.configuration.properties` object)

**Find this section:**
```json
{
  "contributes": {
    "configuration": {
      "title": "Planning Kanban",
      "properties": {
        // Existing properties here...
      }
    }
  }
}
```

**Add two new properties:**
```json
{
  "contributes": {
    "configuration": {
      "title": "Planning Kanban",
      "properties": {
        "planningKanban.enableGitOperationDetection": {
          "type": "boolean",
          "default": true,
          "description": "Enable git operation detection for optimized TreeView refresh during git operations (checkout, merge, pull, rebase)."
        },
        "planningKanban.gitOperationDebounceDelay": {
          "type": "number",
          "default": 500,
          "minimum": 100,
          "maximum": 5000,
          "description": "Delay in milliseconds to wait after last git metadata change before triggering TreeView refresh. Increase for slower systems or large repositories."
        }
      }
    }
  }
}
```

**VSCode API Reference:**
- [Configuration Contribution](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)

**Expected Outcome:**
- Settings appear in VSCode Settings UI under "Planning Kanban" section
- `enableGitOperationDetection` defaults to `true`
- `gitOperationDebounceDelay` defaults to `500` with range validation (100-5000)

**Validation:**
1. Package extension: `npm run package`
2. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
3. Open Settings (Ctrl+,)
4. Search for "Planning Kanban"
5. Verify two new settings appear with correct defaults

### Task 2: Create Configuration Change Listener in extension.ts

Add a configuration change listener in the `activate()` function to update the git detector when settings change.

**Location:** `vscode-extension/src/extension.ts:~554` (after git detector creation and watcher registration)

**Add this code:**
```typescript
// Configuration change listener for git detection settings (S74)
const configListener = vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('planningKanban.enableGitOperationDetection')) {
    const enabled = vscode.workspace.getConfiguration('planningKanban')
      .get<boolean>('enableGitOperationDetection', true);
    gitDetector.setEnabled(enabled);
  }

  if (event.affectsConfiguration('planningKanban.gitOperationDebounceDelay')) {
    const delay = vscode.workspace.getConfiguration('planningKanban')
      .get<number>('gitOperationDebounceDelay', 500);
    gitDetector.updateDebounceDelay(delay);
  }
});
```

**VSCode API Reference:**
- [onDidChangeConfiguration](https://code.visualstudio.com/api/references/vscode-api#workspace.onDidChangeConfiguration)
- [WorkspaceConfiguration](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration)

**Expected Outcome:**
- Listener fires when either setting changes
- `gitDetector.setEnabled()` called when detection enabled/disabled
- `gitDetector.updateDebounceDelay()` called when delay changes
- Logging shows configuration updates

### Task 3: Register Configuration Listener for Disposal

Add the configuration listener to `context.subscriptions` for proper cleanup.

**Location:** Same disposal block as Task 6 in Phase 2 (around line 560-570)

**Current code:**
```typescript
context.subscriptions.push(
  cascadeTreeView,
  outputChannel,
  gitDetector,
  ...gitWatchers,
  // ... other disposables ...
);
```

**Add config listener:**
```typescript
context.subscriptions.push(
  cascadeTreeView,
  outputChannel,
  gitDetector,
  ...gitWatchers,
  configListener,  // Add this
  // ... rest of disposables ...
);
```

**Expected Outcome:**
- Config listener disposed when extension deactivates
- No memory leaks

## Completion Criteria

- [ ] `enableGitOperationDetection` setting added to `package.json`
- [ ] `gitOperationDebounceDelay` setting added to `package.json`
- [ ] Settings appear in VSCode Settings UI
- [ ] Configuration change listener implemented in `extension.ts`
- [ ] Listener calls `setEnabled()` when detection setting changes
- [ ] Listener calls `updateDebounceDelay()` when delay setting changes
- [ ] Config listener registered in `context.subscriptions`
- [ ] Extension compiles without errors

## Validation Steps

1. **Compile and Package Extension:**
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   ```

2. **Install Extension:**
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode:**
   - Press Ctrl+Shift+P
   - Run "Developer: Reload Window"

4. **Test Settings UI:**
   - Open Settings (Ctrl+,)
   - Search for "Planning Kanban"
   - Verify new settings appear:
     - "Enable Git Operation Detection" (checkbox)
     - "Git Operation Debounce Delay" (number input with validation)

5. **Test Configuration Changes:**
   - Open Cascade output channel (Ctrl+Shift+P → "View: Toggle Output" → "Cascade")
   - Toggle "Enable Git Operation Detection" setting
   - Verify output channel shows: `[Git] Detection enabled/disabled`
   - Change "Git Operation Debounce Delay" to 1000
   - Verify output channel shows: `[Git] Debounce delay updated: 1000ms`

6. **Test Configuration Persistence:**
   - Change settings
   - Reload window
   - Verify settings retained and detector uses new values

## Edge Cases to Handle

1. **Invalid Delay Values:**
   - VSCode enforces minimum/maximum automatically (100-5000)
   - Values outside range clamped to valid range

2. **Disable During Active Git Operation:**
   - `setEnabled(false)` cancels pending operation (implemented in Phase 1)
   - Refresh triggers immediately on cancellation

3. **Change Delay During Active Git Operation:**
   - Existing timer continues with old delay
   - New delay applies to next git operation

## Next Phase

Proceed to Phase 4: Testing and Validation for comprehensive testing with real git operations and performance validation.
