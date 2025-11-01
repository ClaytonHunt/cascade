---
item: F19
title: Context Menu Actions
type: feature
parent: E4
status: Completed
priority: Medium
dependencies: [F18]
created: 2025-10-13
updated: 2025-10-16
---

# F19 - Context Menu Actions

## Description

Provide rich context menu (right-click) actions for planning items in the TreeView. Users can change status, open files, create child items, and perform other common operations without leaving the kanban view or manually editing files.

This feature enhances productivity by surfacing frequent actions directly in the TreeView interface.

### Key Components

**Context Menu Actions:**
- **Change Status**: Submenu with valid status transitions
- **Open File**: Open markdown file in editor (same as click)
- **Create Child Item**: Create Story under Feature, or Feature under Epic
- **Copy Item Number**: Copy item ID (e.g., "S39") to clipboard
- **Reveal in Explorer**: Show file in File Explorer view
- **Refresh View**: Manually refresh TreeView (debug/troubleshooting)

**Keyboard Shortcuts:**
- `Enter`: Open file (same as click)
- `Ctrl+Shift+S`: Change status (open quick pick)
- `Ctrl+Shift+N`: Create child item
- `Ctrl+C`: Copy item number (when item focused)

**Command Palette Integration:**
- Register commands with meaningful names
- Make commands discoverable via Command Palette (Ctrl+Shift+P)
- Enable commands only when Planning Kanban view is focused

**Action Availability:**
```
Item Type       | Change Status | Create Child | Open File | Other Actions
----------------|---------------|--------------|-----------|---------------
Epic            | No*           | Yes (Feature)| Yes       | Copy, Reveal
Feature         | No*           | Yes (Story)  | Yes       | Copy, Reveal
Story/Bug       | Yes           | No           | Yes       | Copy, Reveal

*Epic/Feature status derived from children, not directly changeable
```

### Technical Details

**Command Registration (package.json):**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "planningKanban.changeStatus",
        "title": "Change Status",
        "icon": "$(edit)"
      },
      {
        "command": "planningKanban.createChildItem",
        "title": "Create Child Item",
        "icon": "$(add)"
      },
      {
        "command": "planningKanban.openFile",
        "title": "Open File",
        "icon": "$(go-to-file)"
      },
      {
        "command": "planningKanban.copyItemNumber",
        "title": "Copy Item Number",
        "icon": "$(clippy)"
      },
      {
        "command": "planningKanban.revealInExplorer",
        "title": "Reveal in Explorer",
        "icon": "$(folder-opened)"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "planningKanban.changeStatus",
          "when": "view == planningKanbanView && viewItem == story || viewItem == bug",
          "group": "1_modification@1"
        },
        {
          "command": "planningKanban.createChildItem",
          "when": "view == planningKanbanView && viewItem == epic || viewItem == feature",
          "group": "1_modification@2"
        },
        {
          "command": "planningKanban.openFile",
          "when": "view == planningKanbanView && viewItem != statusGroup",
          "group": "2_navigation@1"
        },
        {
          "command": "planningKanban.copyItemNumber",
          "when": "view == planningKanbanView && viewItem != statusGroup",
          "group": "3_utils@1"
        },
        {
          "command": "planningKanban.revealInExplorer",
          "when": "view == planningKanbanView && viewItem != statusGroup",
          "group": "3_utils@2"
        }
      ]
    },
    "keybindings": [
      {
        "command": "planningKanban.changeStatus",
        "key": "ctrl+shift+s",
        "when": "focusedView == planningKanbanView"
      },
      {
        "command": "planningKanban.createChildItem",
        "key": "ctrl+shift+n",
        "when": "focusedView == planningKanbanView"
      }
    ]
  }
}
```

**Change Status Implementation:**
```typescript
async function changeStatusCommand(item: PlanningTreeItem): Promise<void> {
  // Get valid transitions for current status
  const validStatuses = getValidTransitions(item.status);

  // Show quick pick
  const selected = await vscode.window.showQuickPick(
    validStatuses.map(s => ({ label: s, description: getStatusDescription(s) })),
    { placeHolder: `Change status from "${item.status}" to...` }
  );

  if (!selected) return;

  // Update file (reuse logic from F18)
  await updateItemStatus(item.filePath, selected.label);

  vscode.window.showInformationMessage(
    `${item.item} status changed to "${selected.label}"`
  );
}
```

**Create Child Item Implementation:**
```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // Determine child type
  const childType = parentItem.type === 'epic' ? 'Feature' : 'Story';

  // Prompt for title
  const title = await vscode.window.showInputBox({
    prompt: `Enter ${childType} title`,
    placeHolder: `e.g., User Authentication`
  });

  if (!title) return;

  // Generate child item number (e.g., F17, S40)
  const itemNumber = await generateNextItemNumber(childType);

  // Create directory and file
  const childPath = path.join(
    path.dirname(parentItem.filePath),
    `${childType.toLowerCase()}-${itemNumber}-${slugify(title)}`,
    `${childType.toLowerCase()}.md`
  );

  // Write file with frontmatter
  await createPlanningItemFile(childPath, {
    item: itemNumber,
    title,
    type: childType.toLowerCase(),
    status: 'Not Started',
    priority: 'Medium',
    dependencies: [],
    created: getCurrentDate(),
    updated: getCurrentDate()
  });

  // Refresh TreeView
  planningTreeProvider.refresh();

  // Open new file in editor
  vscode.window.showTextDocument(vscode.Uri.file(childPath));
}
```

**Context Value Setting (F17 enhancement):**
```typescript
// In PlanningTreeProvider.getTreeItem()
treeItem.contextValue = item.type;  // "epic" | "feature" | "story" | "bug"
```

## Analysis Summary

### Dependencies

**F18 (Drag-and-Drop):**
- Reuses status update logic from updateItemStatus()
- Extends command infrastructure
- Shares status validation

**F17 (Status Layout):**
- Requires contextValue for menu filtering
- Uses tree structure for child creation

**Existing Infrastructure:**
- Write tool: For creating new child item files
- Edit tool: For updating parent's child list
- parser.ts/cache.ts: For item number generation

### VSCode Command System

**Command vs. Menu:**
- Commands: Reusable functions registered in extension
- Menus: UI surfaces that invoke commands (context menu, editor title, etc.)
- `when` clause: Controls command visibility based on context

**Context Value Strategy:**
- Set `treeItem.contextValue` to item type (epic/feature/story/bug/statusGroup)
- Use in menu `when` clauses to show/hide commands
- Enables fine-grained control over action availability

### Item Number Generation

**Algorithm:**
```typescript
async function generateNextItemNumber(type: string): Promise<string> {
  // Get all existing items of this type from cache
  const existingItems = cache.getAll().filter(i => i.type === type);

  // Extract numbers (e.g., "F16" → 16)
  const numbers = existingItems.map(i => parseInt(i.item.substring(1)));

  // Get max and increment
  const nextNumber = Math.max(0, ...numbers) + 1;

  // Return formatted (e.g., "F17")
  const prefix = type.charAt(0).toUpperCase();
  return `${prefix}${nextNumber}`;
}
```

### File Creation Template

**New Item Frontmatter:**
```yaml
---
item: F17
title: TreeView Foundation
type: feature
parent: E4
status: Not Started
priority: Medium
dependencies: []
created: 2025-10-13
updated: 2025-10-13
---

# F17 - TreeView Foundation

## Description

[User enters description]

## Acceptance Criteria

- [ ]

## Child Items

Stories will be created when this Feature is selected for implementation.
```

## Acceptance Criteria

- [ ] Right-click on Story/Bug shows "Change Status" action
- [ ] "Change Status" opens quick pick with valid transitions only
- [ ] Status change updates file and refreshes TreeView
- [ ] Right-click on Epic/Feature shows "Create Child Item" action
- [ ] "Create Child Item" prompts for title and creates child
- [ ] Child item file created with valid frontmatter
- [ ] Parent item updated with reference to new child
- [ ] "Open File" action opens markdown file in editor
- [ ] "Copy Item Number" copies to clipboard (e.g., "S39")
- [ ] "Reveal in Explorer" shows file in File Explorer view
- [ ] Keyboard shortcuts work as specified
- [ ] Commands appear in Command Palette when view focused
- [ ] Context menu items only show for appropriate item types
- [ ] Error handling for invalid operations

## Child Items

- **S63**: Change Status Context Menu Action - Priority: High - Status: Not Started
- **S64**: Create Child Item Context Menu Action - Priority: High - Status: Not Started
- **S65**: Utility Context Menu Actions (Open, Copy, Reveal) - Priority: Medium - Status: Not Started
- **S66**: Keyboard Shortcuts for Context Actions - Priority: Low - Status: Not Started
