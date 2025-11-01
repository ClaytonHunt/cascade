---
spec: S64
title: Create Child Item Context Menu Action
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-17
updated: 2025-10-17
---

# S64 - Create Child Item Context Menu Action

## Implementation Strategy

This specification implements the "Create Child Item" context menu action for Epics and Features in the Cascade TreeView. The feature enables users to create new child items (Features under Epics, Stories under Features) directly from the TreeView without manually creating files or writing frontmatter.

### Architecture Overview

The implementation follows VSCode extension patterns established in S63 (Change Status action):

1. **Command Registration** (package.json)
   - Register `cascade.createChildItem` command
   - Add context menu contribution for epic/feature items
   - Use `when` clause to show only on appropriate items

2. **Item Number Generation** (extension.ts)
   - Scan TreeView items cache for existing items of target type
   - Extract numeric portion, find maximum, increment by 1
   - Format with type prefix (F for features, S for stories)

3. **File Creation** (extension.ts)
   - Generate slugified directory/file names from user input
   - Create directory structure following existing patterns
   - Write file with complete frontmatter using js-yaml
   - Update parent file with child reference

4. **Integration with Existing Systems**
   - FileSystemWatcher (S38) detects new file and triggers TreeView refresh
   - FrontmatterCache (S40) parses new file on next access
   - TreeView automatically displays new item after refresh

### Key Integration Points

**Existing Infrastructure:**
- `PlanningTreeProvider.loadAllPlanningItems()` - Source for finding max item numbers
- `vscode.workspace.fs.writeFile()` - Atomic file writes (same pattern as S61)
- `js-yaml.dump()` - YAML serialization (same pattern as fileUpdates.ts)
- `FileSystemWatcher` - Automatic TreeView refresh on file creation
- Context menu system - Same pattern as cascade.changeStatus command

**New Utilities to Create:**
- `generateNextItemNumber()` - Item number generation algorithm
- `slugify()` - Title to filesystem-safe name conversion
- `generateChildItemTemplate()` - Frontmatter and markdown template generation
- `updateParentWithChild()` - Parent file markdown content update

### Directory Structure Patterns

**Feature Under Epic:**
```
plans/epic-04-planning-kanban-view/
├── epic.md
├── feature-18-drag-drop/
│   └── feature.md
└── feature-20-new-feature/     ← Created by action
    └── feature.md               ← Generated file
```

**Story Under Feature:**
```
plans/epic-04-planning-kanban-view/feature-19-context-menu/
├── feature.md
├── story-63-change-status.md
└── story-65-new-story.md        ← Created by action
```

### Risk Assessment

**Low Risk:**
- File creation pattern well-established (atomic writes, same as S61)
- YAML serialization proven (js-yaml used throughout extension)
- Item number generation is deterministic (no race conditions in single-user scenario)
- FileSystemWatcher integration tested (S38, S61)

**Medium Risk:**
- Concurrent item creation (two users creating items simultaneously)
  - Mitigation: Item numbers based on scan at command invocation time
  - Collision would result in file overwrite (last write wins)
  - Accept risk - rare in single-developer workflow

- Invalid title input (special characters, very long titles)
  - Mitigation: Input validation in showInputBox
  - Slugification handles special characters safely
  - Max length validation prevents path issues

**Mitigation Strategies:**
- Extensive input validation (title length, empty strings)
- Path length validation before file creation
- Comprehensive error handling with user-friendly messages
- Test edge cases (special characters, very long titles, permission errors)

## Phase Overview

### Phase 1: Command Registration and Helper Functions
**Duration: 30 min**

Register the command in package.json and implement core helper functions (item number generation, slugify, template generation). These are pure functions that can be tested independently.

**Deliverables:**
- Command registered in package.json with context menu
- `generateNextItemNumber()` function implemented
- `slugify()` function implemented
- `generateChildItemTemplate()` function implemented

### Phase 2: Main Command Implementation
**Duration: 45 min**

Implement the main command handler that orchestrates the entire workflow: prompt user, generate paths, create files, and handle errors.

**Deliverables:**
- `createChildItemCommand()` function implemented
- File and directory creation logic
- Error handling and user notifications
- Integration with existing cache and TreeView

### Phase 3: Parent File Update and Integration Testing
**Duration: 30 min**

Implement parent file updating (adding child references to "## Child Items" section) and perform end-to-end testing to verify FileSystemWatcher integration and TreeView refresh.

**Deliverables:**
- `updateParentWithChild()` function implemented
- Parent file markdown updated with child references
- End-to-end testing with TreeView
- Verification of auto-refresh behavior

## Codebase Analysis Summary

**Files to Modify:**
1. `vscode-extension/package.json` - Add command and menu contribution
2. `vscode-extension/src/extension.ts` - Add command handler and helper functions

**Files to Reference:**
1. `vscode-extension/src/fileUpdates.ts` - YAML serialization pattern
2. `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Items cache access pattern
3. `vscode-extension/src/types.ts` - Frontmatter interface

**External Dependencies:**
- js-yaml (already imported in package.json)
- VSCode Workspace FS API (vscode.workspace.fs.writeFile)
- Node.js path and fs modules

**VSCode APIs Used:**
- `vscode.window.showInputBox()` - User input prompting
- `vscode.window.showInformationMessage()` - Success notification
- `vscode.window.showErrorMessage()` - Error notification
- `vscode.workspace.fs.writeFile()` - Atomic file creation
- `vscode.workspace.openTextDocument()` - Open file in editor
- `vscode.window.showTextDocument()` - Show file in editor

## Next Steps

Ready to implement! Run `/build specs/S64-create-child-item-action/plan.md` to begin execution with RED-GREEN-REFACTOR TDD cycle.
