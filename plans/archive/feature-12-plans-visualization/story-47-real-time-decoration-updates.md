---
item: S47
title: Real-time Decoration Updates
type: story
status: Not Started
priority: High
dependencies: [S44, S46]
estimate: S
created: 2025-10-13
updated: 2025-10-13
---

# S47 - Real-time Decoration Updates

## Description

Integrate the FileDecorationProvider with the existing FileSystemWatcher (S38) to automatically refresh decorations when plan files change. This ensures status icons and progress badges stay synchronized with file content without requiring manual refresh or window reload.

## Acceptance Criteria

- [ ] Decorations update automatically within 1 second of file save
- [ ] Status icon changes reflect in file explorer immediately
- [ ] Parent progress badges update when child status changes
- [ ] Multiple rapid saves trigger only one decoration update (debounced)
- [ ] Decoration updates don't block file save operations
- [ ] No memory leaks from decoration refresh subscriptions
- [ ] Decoration provider disposed properly on extension deactivation
- [ ] Output channel logs decoration refresh events (debug mode)
- [ ] Works correctly in multi-root workspaces

## Technical Notes

**Integration with FileSystemWatcher:**

The FileSystemWatcher (S38) already handles file change events with 300ms debouncing. We need to extend the existing handlers to trigger decoration refreshes.

**Modified Event Handlers:**
```typescript
// In createFileSystemWatchers() - extend existing handlers

const handleCreate = (uri: vscode.Uri) => {
  // Existing: No cache invalidation needed (file is new)

  // NEW: Refresh parent decoration (total child count increased)
  const parentUri = getParentItemUri(uri);
  if (parentUri && decorationProvider) {
    progressCache.invalidate(parentUri);
    decorationProvider.refresh(parentUri);
  }
};

const handleChange = (uri: vscode.Uri) => {
  // Existing: Invalidate cache entry
  cache.invalidate(uri.fsPath);

  // NEW: Invalidate progress cache and refresh decorations
  progressCache.invalidate(uri);

  // Refresh this file's decoration (status may have changed)
  if (decorationProvider) {
    decorationProvider.refresh(uri);
  }

  // Refresh parent decoration (child status may have changed)
  const parentUri = getParentItemUri(uri);
  if (parentUri) {
    progressCache.invalidate(parentUri);
    decorationProvider.refresh(parentUri);
  }
};

const handleDelete = (uri: vscode.Uri) => {
  // Existing: Invalidate cache entry
  cache.invalidate(uri.fsPath);

  // NEW: Refresh parent decoration (total child count decreased)
  const parentUri = getParentItemUri(uri);
  if (parentUri && decorationProvider) {
    progressCache.invalidate(parentUri);
    decorationProvider.refresh(parentUri);
  }
};
```

**Decoration Provider Access:**

Make decoration provider accessible from FileSystemWatcher handlers:
```typescript
// In extension.ts - module level
let decorationProvider: PlansDecorationProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Create decoration provider BEFORE file watchers
  decorationProvider = new PlansDecorationProvider(frontmatterCache, outputChannel);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider)
  );

  // Create file watchers (will use decorationProvider)
  const watchers = createFileSystemWatchers(
    context,
    outputChannel,
    frontmatterCache,
    decorationProvider // Pass as parameter
  );

  // ... rest of activation ...
}
```

**Refresh Batching:**

FileSystemWatcher already debounces events (300ms), but we should also batch decoration refreshes:
```typescript
class PlansDecorationProvider implements vscode.FileDecorationProvider {
  private refreshTimeout: NodeJS.Timeout | null = null;
  private pendingRefreshUris: Set<string> = new Set();

  refresh(uri?: vscode.Uri): void {
    if (uri) {
      this.pendingRefreshUris.add(uri.toString());
    }

    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Batch refreshes (50ms delay)
    this.refreshTimeout = setTimeout(() => {
      if (this.pendingRefreshUris.size > 0) {
        // Convert URIs back to array
        const uris = Array.from(this.pendingRefreshUris).map(s => vscode.Uri.parse(s));
        this._onDidChangeFileDecorations.fire(uris);
        this.pendingRefreshUris.clear();
      } else {
        // Refresh all
        this._onDidChangeFileDecorations.fire(uri);
      }

      this.refreshTimeout = null;
    }, 50);
  }
}
```

**Logging:**
```typescript
// In handleChange (debug logging)
outputChannel.appendLine(`[DECORATION] Refreshing: ${path.basename(uri.fsPath)}`);

if (parentUri) {
  outputChannel.appendLine(`[DECORATION] Refreshing parent: ${path.basename(parentUri.fsPath)}`);
}
```

## Edge Cases

- Multiple files changed simultaneously: Batch refresh once
- Parent and child both changed: Refresh both (debounced)
- File changed while decoration provider calculating: Handle race condition gracefully
- Extension deactivated during refresh: Ensure cleanup (no dangling timers)
- Workspace folder removed: Stop refreshing decorations for that folder
- File watcher disposed before decoration provider: Handle null checks

## Testing Strategy

Manual testing (primary):
1. **Status Change Test:**
   - Open story file
   - Change status from "Not Started" to "In Progress"
   - Save file
   - Verify icon updates in file explorer within 1 second

2. **Parent Progress Test:**
   - Open story file
   - Change status to "Completed"
   - Save file
   - Verify feature.md badge increments completed count

3. **Rapid Save Test:**
   - Open story file
   - Make multiple rapid edits (trigger auto-save)
   - Verify only one decoration refresh happens

4. **Multi-file Test:**
   - Mark 3 stories as completed in quick succession
   - Verify all 3 icons update
   - Verify parent badge updates once

5. **Create/Delete Test:**
   - Create new story file
   - Verify parent badge total increments
   - Delete story file
   - Verify parent badge total decrements

Performance testing:
1. Measure decoration refresh latency (should be < 100ms)
2. Verify debouncing reduces refresh count (check output channel)
3. Test with 50+ files in plans/ directory

Integration testing:
1. Verify existing FileSystemWatcher still works (S38 acceptance criteria)
2. Verify cache invalidation still works (S40 acceptance criteria)
3. No conflicts between watcher and decoration provider

## Definition of Done

- Decorations update automatically when files change
- Debouncing prevents excessive refresh operations
- Parent decorations update when child status changes
- FileSystemWatcher integration complete and tested
- No memory leaks or performance regressions
- Output channel logs decoration refresh events
- Manual testing confirms real-time updates work
- All F12 acceptance criteria met
- Feature F12 complete and ready for user testing
