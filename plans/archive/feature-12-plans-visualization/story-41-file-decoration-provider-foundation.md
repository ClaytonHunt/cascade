---
item: S41
title: FileDecorationProvider Foundation
type: story
status: Completed
priority: High
dependencies: [S40]
estimate: M
created: 2025-10-13
updated: 2025-10-13
spec: specs/S41-file-decoration-provider-foundation/
---

# S41 - FileDecorationProvider Foundation

## Description

Create the core infrastructure for file decorations by implementing a FileDecorationProvider class and registering it with VSCode. This foundation will enable all subsequent decoration features (status icons, badges, tooltips) to display visual indicators in the plans/ directory.

## Acceptance Criteria

- [ ] `PlansDecorationProvider` class implements `vscode.FileDecorationProvider` interface
- [ ] Provider registered in `extension.ts` activate() function with proper disposal
- [ ] Provider has `provideFileDecoration(uri)` method that returns decorations
- [ ] Provider has `onDidChangeFileDecorations` event emitter for triggering updates
- [ ] Provider correctly filters to only decorate files in `plans/` directory
- [ ] Provider exports a `refresh()` method for manual decoration updates
- [ ] Provider is accessible from extension module level for FileSystemWatcher integration
- [ ] Empty/placeholder decorations returned initially (no crashes on activation)
- [ ] Provider logs to output channel when decorations are provided
- [ ] All TypeScript strict mode checks pass

## Technical Notes

**VSCode API:**
```typescript
import * as vscode from 'vscode';

class PlansDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    // Return decoration or undefined
    return undefined;
  }

  refresh(uri?: vscode.Uri): void {
    // Trigger decoration update for specific URI or all
    this._onDidChangeFileDecorations.fire(uri ?? undefined);
  }
}

// Registration in extension.ts
const decorationProvider = new PlansDecorationProvider();
context.subscriptions.push(
  vscode.window.registerFileDecorationProvider(decorationProvider)
);
```

**File Structure:**
```
vscode-extension/
├── src/
│   ├── extension.ts           # Existing: Register provider here
│   ├── cache.ts               # Existing: Will be used by provider
│   └── decorationProvider.ts  # NEW: Provider implementation
```

**Path Filtering:**
- Check if `uri.fsPath` contains `/plans/` directory
- Only provide decorations for files within plans hierarchy
- Return `undefined` for files outside plans directory

**Integration Points:**
- Provider will call `frontmatterCache.get()` to retrieve parsed frontmatter
- Provider will be called by FileSystemWatcher when files change
- Provider initialization happens after cache initialization in activate()

## Edge Cases

- Files outside plans/ directory: Return undefined (no decoration)
- Files without frontmatter: Return undefined or error decoration
- Non-markdown files in plans/: Return undefined
- Provider called before cache ready: Return undefined safely
- Concurrent decoration requests: Handle with async/await properly

## Testing Strategy

Unit tests:
1. Provider implements FileDecorationProvider interface
2. Provider filters to plans/ directory only
3. Provider returns undefined for non-plans files
4. Provider emits change events correctly
5. refresh() method triggers onDidChangeFileDecorations event

Manual testing:
1. Launch Extension Development Host
2. Open Lineage workspace
3. Verify no errors in Debug Console
4. Verify provider registered (check output channel)
5. Open plans/ directory - should see no decorations yet (placeholder implementation)

## Definition of Done

- PlansDecorationProvider class created and implements interface
- Provider registered in extension.ts with proper cleanup
- Provider safely handles all edge cases (no crashes)
- Provider logs activity to output channel
- TypeScript compiles without errors
- Manual testing confirms provider activates without issues
- Ready for S42 to add actual icon rendering
