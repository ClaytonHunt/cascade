---
item: S38
title: File System Watcher
type: story
status: Completed
priority: High
dependencies: [S37]
estimate: M
created: 2025-10-12
updated: 2025-10-13
spec: specs/S38-file-system-watcher/
---

# S38 - File System Watcher

## Description

Implement real-time file monitoring for `plans/**/*.md` and `specs/**/*.md` files using VSCode's FileSystemWatcher API. The watcher detects file changes, creations, and deletions to trigger cache invalidation and UI updates in future features (F12, F13).

## Acceptance Criteria

- [x] FileSystemWatcher created for `plans/**/*.md` and `specs/**/*.md` glob patterns
- [x] Watcher detects file creation events
- [x] Watcher detects file modification events
- [x] Watcher detects file deletion events
- [x] File change events are debounced to prevent excessive processing (300ms default)
- [x] Watcher handles Windows paths without errors
- [x] Watcher is properly disposed when extension deactivate
- [x] Events logged to output channel for debugging
- [x] Watcher respects `.gitignore` patterns (VSCode default behavior)

## Technical Notes

**FileSystemWatcher Creation:**
```typescript
import * as vscode from 'vscode';

function createFileWatchers(context: vscode.ExtensionContext) {
  const plansWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolder, 'plans/**/*.md')
  );

  const specsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolder, 'specs/**/*.md')
  );

  // Register event handlers
  plansWatcher.onDidCreate((uri) => handleFileCreated(uri));
  plansWatcher.onDidChange((uri) => handleFileChanged(uri));
  plansWatcher.onDidDelete((uri) => handleFileDeleted(uri));

  // Same for specsWatcher...

  // Register for disposal
  context.subscriptions.push(plansWatcher, specsWatcher);
}
```

**Debouncing Strategy:**
Implement debounce to batch rapid file changes:
```typescript
const changeTimers = new Map<string, NodeJS.Timeout>();

function handleFileChanged(uri: vscode.Uri) {
  const filePath = uri.fsPath;

  // Clear existing timer for this file
  const existingTimer = changeTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    processFileChange(uri);
    changeTimers.delete(filePath);
  }, 300); // 300ms debounce

  changeTimers.set(filePath, timer);
}
```

**Event Handling:**
For this story, event handlers should:
1. Log event to output channel (file path, event type, timestamp)
2. Emit a simple "file changed" notification (structure for S40 cache invalidation)
3. Not parse files yet (that's S39)

**Logging Format:**
```
[14:23:45] FILE_CREATED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-36-extension-project-scaffold.md
[14:23:47] FILE_CHANGED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-36-extension-project-scaffold.md (debounced)
[14:24:12] FILE_DELETED: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-old.md
```

**Multi-Root Workspace Handling:**
Create separate watchers for each workspace folder that has plans/ or specs/:
```typescript
for (const folder of vscode.workspace.workspaceFolders || []) {
  if (shouldActivateExtension(folder)) {
    createFileWatchersForFolder(folder, context);
  }
}
```

## Edge Cases

- **Rapid saves:** Debouncing prevents multiple events for single edit
- **File renames:** Detected as DELETE + CREATE (VSCode behavior)
- **Bulk operations:** Debouncing batches mass file changes
- **Watcher disposal:** Ensure watchers are cleaned up on deactivation
- **Ignored files:** `.gitignore` patterns automatically excluded (VSCode default)

## Performance Considerations

- Debounce delay: 300ms is reasonable balance between responsiveness and performance
- Glob pattern specificity: `**/*.md` is efficient (VSCode optimizes internally)
- Memory: Debounce timer map should be bounded (cleared on processing)
- No synchronous file I/O: All file operations should be async

## Integration Points

- S39 (YAML Parser) will be called by file change handlers to parse frontmatter
- S40 (Cache Layer) will be invalidated by file change/delete events
- F12/F13 (Visualization) will subscribe to file change events to update decorations

## Definition of Done

- File changes in plans/ and specs/ directories are detected in real-time
- Events are debounced and logged to output channel
- Watchers do not cause VSCode performance degradation
- Watchers are properly disposed when extension deactivates
- Multi-root workspace handling works correctly
- No errors with Windows paths (backslashes handled correctly)
