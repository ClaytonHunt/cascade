---
spec: S74
phase: 1
title: GitOperationDetector Implementation
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: GitOperationDetector Implementation

## Overview

Create a standalone `GitOperationDetector` class that monitors git metadata files (`.git/HEAD`, `.git/index`) to detect git operations (checkout, merge, pull, rebase). The detector uses a 500ms debounce timer to wait for git operation completion and provides a callback mechanism for integration with the extension's refresh logic.

This phase is completely isolated from the rest of the extension, making it easy to test and validate before integration.

## Prerequisites

- Understanding of VSCode FileSystemWatcher API
- Knowledge of git metadata files (`.git/HEAD`, `.git/index`)
- Familiarity with debouncing patterns

## Tasks

### Task 1: Create GitOperationDetector.ts File Structure

Create the new file `vscode-extension/src/utils/GitOperationDetector.ts` with the following structure:

```typescript
import * as vscode from 'vscode';

export interface GitOperationDetectorConfig {
  enabled: boolean;
  debounceDelay: number;
}

export class GitOperationDetector implements vscode.Disposable {
  // Implementation in subsequent tasks
}
```

**File Reference:** Create new file at `vscode-extension/src/utils/GitOperationDetector.ts`

**Expected Outcome:** File created with proper imports and interface definitions

### Task 2: Implement Class Properties and Constructor

Add class properties and constructor to `GitOperationDetector`:

```typescript
export class GitOperationDetector implements vscode.Disposable {
  private gitOperationInProgress = false;
  private gitOperationTimer?: NodeJS.Timeout;
  private gitOperationStartTime: number = 0;
  private debounceDelay: number;
  private enabled: boolean;
  private watchers: vscode.FileSystemWatcher[] = [];

  // Callback triggered when git operation completes
  public onGitOperationComplete: () => void = () => {};

  constructor(
    private workspaceRoot: string,
    private outputChannel: vscode.OutputChannel,
    config: GitOperationDetectorConfig
  ) {
    this.enabled = config.enabled;
    this.debounceDelay = config.debounceDelay;

    this.outputChannel.appendLine(
      `[Git] Detector initialized (enabled: ${this.enabled}, debounce: ${this.debounceDelay}ms)`
    );
  }
}
```

**Expected Outcome:**
- Properties initialized correctly
- Constructor logs initialization message to output channel
- Configuration values stored for later use

### Task 3: Implement createGitWatchers() Method

Add the method to create FileSystemWatchers for git metadata files:

```typescript
/**
 * Creates and registers git metadata file watchers.
 *
 * Monitors:
 * - .git/HEAD: Branch changes (checkout, commit)
 * - .git/index: Staging area changes (add, reset, merge)
 *
 * @returns Array of FileSystemWatcher instances
 */
createGitWatchers(): vscode.FileSystemWatcher[] {
  if (!this.enabled) {
    this.outputChannel.appendLine('[Git] Detection disabled, skipping watcher creation');
    return [];
  }

  // Watch .git/HEAD (branch changes, commits)
  const gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(this.workspaceRoot, '.git/HEAD'),
    true,  // ignoreCreateEvents
    false, // ignoreChangeEvents
    true   // ignoreDeleteEvents
  );

  // Watch .git/index (staging area changes)
  const gitIndexWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(this.workspaceRoot, '.git/index'),
    true,  // ignoreCreateEvents
    false, // ignoreChangeEvents
    true   // ignoreDeleteEvents
  );

  gitHeadWatcher.onDidChange(() => this.handleGitEvent('HEAD changed'));
  gitIndexWatcher.onDidChange(() => this.handleGitEvent('index changed'));

  this.watchers = [gitHeadWatcher, gitIndexWatcher];

  this.outputChannel.appendLine('[Git] Watchers created for .git/HEAD and .git/index');

  return this.watchers;
}
```

**VSCode API Reference:**
- [FileSystemWatcher](https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher)
- [RelativePattern](https://code.visualstudio.com/api/references/vscode-api#RelativePattern)

**Expected Outcome:**
- Two watchers created for `.git/HEAD` and `.git/index`
- Watchers ignore create/delete events (only monitor changes)
- Event handlers registered for both watchers
- Logging confirms watcher creation

### Task 4: Implement handleGitEvent() Method

Add the core git event handling logic with debouncing:

```typescript
/**
 * Handles git metadata file changes.
 * Sets gitOperationInProgress flag and starts/resets debounce timer.
 *
 * @param eventType - Description of git event (e.g., "HEAD changed")
 */
private handleGitEvent(eventType: string): void {
  this.outputChannel.appendLine(`[Git] ${eventType}`);

  // Mark operation as in progress
  if (!this.gitOperationInProgress) {
    this.gitOperationInProgress = true;
    this.gitOperationStartTime = Date.now();
    this.outputChannel.appendLine('[Git] Operation started');
  }

  // Clear existing timer
  if (this.gitOperationTimer) {
    clearTimeout(this.gitOperationTimer);
    this.outputChannel.appendLine('[Git] Operation timer reset');
  }

  // Start new timer (500ms default)
  this.gitOperationTimer = setTimeout(() => {
    this.gitOperationInProgress = false;
    this.gitOperationTimer = undefined;

    const duration = Date.now() - this.gitOperationStartTime;
    this.outputChannel.appendLine(
      `[Git] Operation completed (duration: ${duration}ms, timer expired)`
    );

    // Trigger callback
    this.onGitOperationComplete();
  }, this.debounceDelay);
}
```

**Expected Outcome:**
- Git operation flag set on first event
- Timer reset on subsequent events (debounce behavior)
- Timer expiration triggers callback
- Comprehensive logging for debugging

### Task 5: Implement Status Check and Configuration Methods

Add utility methods for checking git operation status and updating configuration:

```typescript
/**
 * Checks if a git operation is currently in progress.
 *
 * @returns True if git operation is active
 */
isGitOperationInProgress(): boolean {
  return this.gitOperationInProgress;
}

/**
 * Updates debounce delay from configuration.
 *
 * @param newDelay - New debounce delay in milliseconds
 */
updateDebounceDelay(newDelay: number): void {
  this.debounceDelay = newDelay;
  this.outputChannel.appendLine(`[Git] Debounce delay updated: ${newDelay}ms`);
}

/**
 * Enables or disables git operation detection.
 *
 * @param enabled - True to enable, false to disable
 */
setEnabled(enabled: boolean): void {
  this.enabled = enabled;
  this.outputChannel.appendLine(`[Git] Detection ${enabled ? 'enabled' : 'disabled'}`);

  if (!enabled && this.gitOperationInProgress) {
    // Cancel pending operation
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
      this.gitOperationTimer = undefined;
    }
    this.gitOperationInProgress = false;
    this.outputChannel.appendLine('[Git] Pending operation cancelled (detection disabled)');
  }
}
```

**Expected Outcome:**
- `isGitOperationInProgress()` returns current status
- `updateDebounceDelay()` updates timer delay dynamically
- `setEnabled()` cancels pending operations when disabled

### Task 6: Implement dispose() Method

Add cleanup logic for proper resource disposal:

```typescript
/**
 * Cleanup watchers and timers.
 * Called automatically by VSCode when extension deactivates.
 */
dispose(): void {
  this.outputChannel.appendLine('[Git] Disposing detector');

  // Clear timer
  if (this.gitOperationTimer) {
    clearTimeout(this.gitOperationTimer);
    this.gitOperationTimer = undefined;
  }

  // Dispose watchers
  this.watchers.forEach(watcher => watcher.dispose());
  this.watchers = [];
}
```

**Expected Outcome:**
- Timer cleared if active
- All watchers disposed properly
- Memory leaks prevented

### Task 7: Add Git Directory Existence Check

Enhance `createGitWatchers()` to check for `.git/` directory existence:

```typescript
createGitWatchers(): vscode.FileSystemWatcher[] {
  if (!this.enabled) {
    this.outputChannel.appendLine('[Git] Detection disabled, skipping watcher creation');
    return [];
  }

  // Check if .git directory exists (add this before watcher creation)
  const gitDir = path.join(this.workspaceRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    this.outputChannel.appendLine('[Git] No .git directory found, disabling detection');
    this.enabled = false;
    return [];
  }

  // ... rest of watcher creation logic ...
}
```

**Node.js API Reference:**
- `path.join()`: Construct file paths
- `fs.existsSync()`: Check directory existence

**Required Imports:** Add `import * as path from 'path';` and `import * as fs from 'fs';` at top of file

**Expected Outcome:**
- Non-git workspaces handled gracefully
- Detector automatically disabled if `.git/` not found
- Logging indicates why detection was disabled

## Completion Criteria

- [ ] `GitOperationDetector.ts` file created with all imports
- [ ] Class properties and constructor implemented
- [ ] `createGitWatchers()` method creates two watchers
- [ ] `handleGitEvent()` implements debouncing logic
- [ ] `isGitOperationInProgress()` returns correct status
- [ ] `updateDebounceDelay()` and `setEnabled()` methods work
- [ ] `dispose()` method cleans up resources
- [ ] Git directory existence check prevents errors
- [ ] All logging statements present in output channel
- [ ] No compilation errors in TypeScript

## Validation Steps

1. **Compile Extension:**
   ```bash
   cd vscode-extension
   npm run compile
   ```
   Verify no TypeScript errors.

2. **Code Review:**
   - Check all method signatures match spec
   - Verify logging statements present
   - Confirm proper resource disposal

3. **Manual Testing (deferred to Phase 4):**
   - Integration testing after Phase 2 completion

## Next Phase

Proceed to Phase 2: Extension Integration to connect `GitOperationDetector` with existing file watchers and cache management.
