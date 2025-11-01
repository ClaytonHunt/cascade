---
item: F16
title: TreeView Foundation
type: feature
parent: E4
status: Completed
priority: High
dependencies: []
created: 2025-10-13
updated: 2025-10-14
---

# F16 - TreeView Foundation

## Description

Establish the core TreeView infrastructure for the Cascade Kanban panel. This feature implements the foundational VSCode TreeDataProvider pattern, registers the view in the Activity Bar, and provides basic item rendering with icons and click-to-open functionality.

This is the first feature in the implementation sequence and creates the essential structure that all subsequent features will build upon.

### Key Components

**Activity Bar Integration:**
- Register custom view container in Activity Bar
- Configure package.json contributions for view registration
- Set up view icon and title
- Provide view toggle command

**TreeDataProvider Implementation:**
- Create `PlanningTreeProvider` class implementing `vscode.TreeDataProvider<T>`
- Implement `getTreeItem()` for node rendering
- Implement `getChildren()` for tree structure
- Create refresh mechanism via `_onDidChangeTreeData` event emitter

**Tree Item Rendering:**
- Display planning item number and title (e.g., "E4 - Planning Kanban View")
- Show appropriate icons using VSCode's built-in ThemeIcon
- Set collapsible state for parent items (Epic/Feature)
- Configure tooltip with additional item information

**File Opening:**
- Implement click handler to open markdown file in editor
- Use `vscode.window.showTextDocument()` for file display
- Preserve editor focus behavior
- Handle file not found errors gracefully

### Technical Details

**VSCode APIs:**
- `vscode.TreeDataProvider` - Core interface
- `vscode.TreeItem` - Node representation
- `vscode.window.createTreeView()` - View registration
- `vscode.EventEmitter` - Change notification
- `vscode.commands.registerCommand()` - Click handlers

**Data Source:**
- Scan `plans/` directory for markdown files
- Use existing `parseFrontmatter()` from parser.ts
- Leverage `FrontmatterCache` for performance
- Build flat list of items initially (hierarchy in F17)

**Item Structure:**
```typescript
interface PlanningTreeItem {
  item: string;        // E.g., "E4", "F16", "S39"
  title: string;
  type: string;        // "epic" | "feature" | "story" | "bug"
  status: string;
  filePath: string;
  // Additional metadata as needed
}
```

## Analysis Summary

### Reusable Infrastructure

- **S39 (Parser)**: Use `parseFrontmatter()` to extract item metadata
- **S40 (Cache)**: Use `FrontmatterCache.get()` for performance
- **S38 (FileSystemWatcher)**: Already monitoring plans/ directory
- **S42 (Status Icons)**: Will adapt icon mapping for TreeView (later in F17)

### VSCode Extension Patterns

**TreeDataProvider Pattern:**
```typescript
class PlanningTreeProvider implements vscode.TreeDataProvider<PlanningTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PlanningTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
    // Convert PlanningTreeItem to vscode.TreeItem
  }

  getChildren(element?: PlanningTreeItem): Thenable<PlanningTreeItem[]> {
    // Return child items or root items
  }
}
```

**Activity Bar Registration (package.json):**
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "cascade",
        "title": "Cascade",
        "icon": "resources/cascade-icon.svg"
      }]
    },
    "views": {
      "cascade": [{
        "id": "cascadeView",
        "name": "Planning Items"
      }]
    }
  }
}
```

### File Structure

```
vscode-extension/
├── src/
│   ├── treeview/
│   │   ├── PlanningTreeProvider.ts    # TreeDataProvider implementation
│   │   ├── PlanningTreeItem.ts        # Tree item model
│   │   └── index.ts                   # Exports
│   ├── parser.ts                      # ✅ Existing
│   ├── cache.ts                       # ✅ Existing
│   └── extension.ts                   # Register TreeView
├── resources/
│   └── cascade-icon.svg               # Activity Bar icon
└── package.json                       # View contributions
```

## Acceptance Criteria

- [ ] TreeView visible in Activity Bar with custom icon
- [ ] View displays list of planning items from plans/ directory
- [ ] Each item shows format: "[item] - [title]" (e.g., "E4 - Planning Kanban View")
- [ ] Items display appropriate icons (generic for now, refined in F17)
- [ ] Clicking item opens corresponding markdown file in editor
- [ ] Parent items (Epic/Feature) show as collapsible nodes
- [ ] View refreshes when `refresh()` method called
- [ ] No crashes or errors when plans/ directory is empty
- [ ] Performance acceptable with 50+ planning items
- [ ] Unit tests for TreeDataProvider core methods

## Child Items

- **S48**: Activity Bar View Registration - Est: S - Status: Ready
- **S49**: TreeDataProvider Core Implementation - Est: M - Status: Ready
- **S50**: Tree Item Rendering with Icons - Est: M - Status: Ready
- **S51**: File Opening on Click - Est: S - Status: Ready
- **S52**: TreeView Refresh Mechanism - Est: S - Status: Ready
- **S53**: Specs-to-Plans Progress Synchronization - Est: M - Status: Not Started

### Implementation Sequence

1. **S48** - Foundation: Register view container and TreeView in Activity Bar
2. **S49** - Data Layer: Implement provider to load and display planning items
3. **S50** - Polish: Add icons, tooltips, and visual formatting
4. **S51** - Interaction: Enable file opening on click
5. **S52** - Automation: Integrate automatic refresh on file changes
6. **S53** - Integration: Sync spec completion status back to story status

Total Estimate: 3M + 3S (approximately 2-3 days)
