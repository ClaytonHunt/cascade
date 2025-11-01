---
item: S49
title: TreeDataProvider Core Implementation
type: story
parent: F16
status: Completed
priority: High
dependencies: [S48]
estimate: M
created: 2025-10-13
updated: 2025-10-14
spec: specs/S49-treedataprovider-core-implementation/
---

# S49 - TreeDataProvider Core Implementation

## Description

Implement the core `PlanningTreeProvider` class that implements `vscode.TreeDataProvider<T>` interface. This provider is responsible for scanning the plans/ directory, loading planning items using the existing parser and cache, and providing tree structure data to VSCode.

This story creates the data layer that powers the TreeView, enabling it to display actual planning items from the file system.

### Technical Approach

**PlanningTreeProvider Class:**
```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<PlanningTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PlanningTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
    // Convert PlanningTreeItem to vscode.TreeItem
  }

  async getChildren(element?: PlanningTreeItem): Promise<PlanningTreeItem[]> {
    // Return root items or children
  }
}
```

**PlanningTreeItem Model:**
```typescript
export interface PlanningTreeItem {
  item: string;        // E.g., "E4", "F16", "S48"
  title: string;       // Item title
  type: ItemType;      // "epic" | "feature" | "story" | "bug"
  status: Status;      // Item status
  priority: Priority;  // Item priority
  filePath: string;    // Absolute path to markdown file
}
```

**Data Loading:**
- Scan plans/ directory for all .md files recursively
- Use `glob` or `vscode.workspace.findFiles()` for file discovery
- Use `FrontmatterCache.get()` to parse each file (leverages S40 cache)
- Build flat list of PlanningTreeItem objects
- Sort by item number (P1, E1, F1, S1, etc.)

**Error Handling:**
- Skip files with invalid frontmatter (log warning)
- Handle files that fail to parse gracefully
- Log errors to output channel for debugging
- Return empty array if plans/ directory doesn't exist

### Integration Points

- **S39 (Parser)**: Use `parseFrontmatter()` via cache
- **S40 (Cache)**: Use `FrontmatterCache.get()` for performance
- **S38 (FileSystemWatcher)**: Cache invalidation already handled
- **S48 (View Registration)**: Provider connects to registered view
- **types.ts**: Use existing Frontmatter interface

## Acceptance Criteria

- [ ] PlanningTreeProvider class implements vscode.TreeDataProvider interface
- [ ] getTreeItem() returns valid vscode.TreeItem for each planning item
- [ ] getChildren() returns flat list of all planning items from plans/ directory
- [ ] TreeView displays all planning items with format "[item] - [title]"
- [ ] Items use frontmatter cache for parsing (no redundant file reads)
- [ ] Items sorted by item number (P1, E1, E2, F1, F2, etc.)
- [ ] Files with invalid frontmatter are skipped (logged to output channel)
- [ ] Empty plans/ directory shows empty TreeView (no errors)
- [ ] refresh() method triggers tree update (event emitter pattern)
- [ ] All files scanned use workspace-relative paths
- [ ] Unit tests for getChildren() data loading logic

## Analysis Summary

### Existing Infrastructure

**Frontmatter Cache (S40):**
- Already initialized in extension.ts activate()
- Provides cached parsing results
- Automatically invalidates on file changes
- Inject cache instance via constructor

**Parser (S39):**
- Validates all required frontmatter fields
- Returns ParseResult with success flag
- Cache internally uses parser (no direct parser calls needed)

**Workspace Detection (S37):**
- Extension only activates with plans/ directory present
- Safe to assume plans/ directory exists when provider initializes
- Still handle empty directory gracefully

**File System Watcher (S38):**
- Already monitors plans/ directory
- Provider doesn't need its own watcher
- Refresh mechanism (S51) will respond to watcher events

### File Structure

```
vscode-extension/src/
├── treeview/
│   ├── PlanningTreeProvider.ts    # New: Provider implementation
│   ├── PlanningTreeItem.ts        # New: Tree item model interface
│   └── index.ts                   # New: Exports
├── extension.ts                   # Modified: Instantiate provider
└── types.ts                       # Existing: Use Frontmatter interface
```

### VSCode API References

- `vscode.TreeDataProvider<T>` - Interface to implement
- `vscode.TreeItem` - Base class for tree nodes
- `vscode.EventEmitter<T>` - Change notification
- `vscode.workspace.findFiles()` - File discovery pattern
- `vscode.workspace.workspaceFolders` - Workspace root access

## Implementation Notes

**Flat Tree Structure:**
- This story implements flat list rendering only
- Hierarchy (Epic → Feature → Story) comes in F17
- For now, all items at root level, sorted by number

**Collapsible State:**
- Set `collapsibleState` based on item type:
  - Epic/Feature: `TreeItemCollapsibleState.Collapsed`
  - Story/Bug: `TreeItemCollapsibleState.None`
- Even though tree is flat, prepare for hierarchy in F17

**Performance:**
- Use cache.get() to avoid redundant parsing
- Cache handles staleness detection automatically
- Initial load may have cache misses (acceptable)

**Logging:**
- Log file discovery count to output channel
- Log parse errors for debugging
- Log tree structure on refresh (helpful for development)

## Test Strategy

**Unit Tests (test/treeview/PlanningTreeProvider.test.ts):**
Uses Mocha + Node.js test runner with `describe`/`it` pattern:

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { PlanningTreeProvider } from '../../src/treeview/PlanningTreeProvider';

describe('PlanningTreeProvider', () => {
  it('should return all .md files from plans/', async () => {
    // Test implementation with mock FrontmatterCache
  });

  it('should sort items by item number', async () => {
    // Test implementation
  });

  it('should skip invalid frontmatter files', async () => {
    // Test implementation
  });

  it('should return empty array for empty directory', async () => {
    // Test implementation
  });

  it('should fire change event on refresh()', () => {
    // Test EventEmitter behavior
  });
});
```

**Integration Tests:**
1. Create test workspace with sample plans/ files
2. Verify provider loads and parses all files
3. Verify cache is used (check cache stats)
4. Verify TreeView renders items correctly

**Manual Testing:**
1. Open workspace with plans/ directory
2. Open Planning Kanban view
3. Verify all items appear in tree
4. Verify format: "[item] - [title]"
5. Check output channel for any errors
