---
item: F21
title: Remove File Decoration System
type: feature
parent: E4
status: Completed
priority: Low
dependencies: [F20]
created: 2025-10-13
updated: 2025-10-17
---

# F21 - Remove File Decoration System (Cleanup)

## Description

Complete removal of the file decoration approach from Epic 03 (archived). This cleanup feature unregisters the FileDecorationProvider, removes the decoration module, and restores the VSCode Explorer to its original undecorated state. The Planning Kanban TreeView (F16-F20) fully replaces the file decoration functionality.

This feature ensures a clean codebase without legacy code or conflicting visualization systems.

### Key Components

**FileDecorationProvider Removal:**
- Unregister `vscode.window.registerFileDecorationProvider()` from extension.ts
- Remove decorationProvider.ts module entirely
- Delete FileDecorationProvider class and related types

**StatusIcons Refactoring:**
- Remove `getFileDecoration()` function (returns FileDecoration objects)
- Keep STATUS_BADGES and STATUS_COLORS mappings (used by TreeView in F17)
- Ensure `getTreeItemIcon()` function is the only export
- Update unit tests to remove FileDecoration test cases

**Extension.ts Cleanup:**
- Remove import of FileDecorationProvider
- Remove provider instantiation code
- Remove provider registration in `activate()` function
- Remove provider disposal in `deactivate()` function
- Keep FileSystemWatcher and FrontmatterCache (used by TreeView)

**Package.json Cleanup:**
- Remove any decoration-related configuration settings
- Remove decoration-related commands (if any)
- Verify no references to FileDecorationProvider in contributes section

**Explorer Verification:**
- Confirm no status badges appear in File Explorer
- Confirm no status colors applied to planning files
- Confirm Explorer behavior returns to VSCode default
- Test with plans/ and specs/ directories

### Technical Details

**Files to Modify:**
```
vscode-extension/
├── src/
│   ├── decorationProvider.ts       # ❌ DELETE entire file
│   ├── statusIcons.ts              # ✏️ EDIT - remove getFileDecoration()
│   ├── extension.ts                # ✏️ EDIT - remove provider code
│   └── treeview/                   # ✅ NO CHANGES - uses getTreeItemIcon()
├── package.json                    # ✏️ EDIT - remove decoration config
└── tests/
    └── statusIcons.test.ts         # ✏️ EDIT - remove FileDecoration tests
```

**Extension.ts Changes:**
```typescript
// BEFORE (remove this)
import { FileDecorationProvider } from './decorationProvider';

export function activate(context: vscode.ExtensionContext) {
  const cache = new FrontmatterCache();
  const fileWatchers = createFileSystemWatchers(cache);

  // ❌ REMOVE: FileDecorationProvider registration
  const decorationProvider = new FileDecorationProvider(cache);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider)
  );

  // ✅ KEEP: TreeView registration
  const treeProvider = new PlanningTreeProvider(cache, fileWatchers);
  context.subscriptions.push(
    vscode.window.createTreeView('planningKanbanView', {
      treeDataProvider: treeProvider
    })
  );
}

// AFTER (clean)
export function activate(context: vscode.ExtensionContext) {
  const cache = new FrontmatterCache();
  const fileWatchers = createFileSystemWatchers(cache);

  // Only TreeView registration remains
  const treeProvider = new PlanningTreeProvider(cache, fileWatchers);
  context.subscriptions.push(
    vscode.window.createTreeView('planningKanbanView', {
      treeDataProvider: treeProvider,
      dragAndDropController: new PlanningDragAndDropController()
    })
  );
}
```

**StatusIcons.ts Changes:**
```typescript
// BEFORE
export function getFileDecoration(status: string): vscode.FileDecoration {
  // ❌ REMOVE this entire function
}

export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  // ✅ KEEP this function
}

// AFTER (only TreeView function remains)
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  const iconMap: Record<string, string> = {
    'Not Started': 'circle-outline',
    'In Planning': 'sync',
    'Ready': 'check',
    'In Progress': 'debug-start',
    'Blocked': 'warning',
    'Completed': 'pass'
  };

  return new vscode.ThemeIcon(iconMap[status] || 'circle-outline');
}

// Internal mappings (reused by TreeView)
const STATUS_BADGES = { /* ... */ };
const STATUS_COLORS = { /* ... */ };
```

**Package.json Changes:**
```json
// BEFORE (if any decoration config existed)
{
  "contributes": {
    "configuration": {
      "properties": {
        "planningExtension.showFileDecorations": {
          "type": "boolean",
          "default": true,
          "description": "Show status badges in File Explorer"
        }
      }
    }
  }
}

// AFTER (remove decoration config)
{
  "contributes": {
    // Only TreeView contributions remain
  }
}
```

**Verification Steps:**
1. Open plans/ directory in File Explorer
2. Verify no status badges on markdown files
3. Verify no color changes on file names
4. Check specs/ directory (same result)
5. Confirm TreeView shows all items correctly
6. Test drag-drop still works in TreeView
7. Test external file edits still refresh TreeView

## Analysis Summary

### Dependencies

**F20 (Real-Time Synchronization):**
- Must be complete before cleanup
- Ensures TreeView fully functional
- Confirms FileDecorationProvider is redundant

**Existing Infrastructure:**
- S38 (FileSystemWatcher): Keep unchanged
- S39 (Parser): Keep unchanged
- S40 (Cache): Keep unchanged
- S42 (Status Icons): Refactor, do not delete

### Rationale for Removal

**Why Remove File Decorations:**
1. TreeView provides superior UX (kanban layout, drag-drop, hierarchy)
2. Decorations cluttered Explorer without adding value
3. Conflicts with user's own decoration extensions
4. Performance overhead for minimal benefit
5. Maintenance burden for deprecated feature

**Why Keep Infrastructure:**
- Parser, Cache, FileSystemWatcher used by TreeView
- statusIcons.ts mappings reused for TreeView icons
- Removes only the decoration-specific code

### Testing Strategy

**Manual Testing:**
- Open extension in development mode
- Verify Explorer shows no decorations
- Verify TreeView functions correctly
- Test all F16-F20 features still work
- Check console for errors

**Automated Testing:**
- Remove FileDecoration unit tests
- Update statusIcons tests to remove decoration cases
- Verify extension activates without errors
- Test cache and parser still function

## Acceptance Criteria

- [ ] decorationProvider.ts file deleted
- [ ] FileDecorationProvider registration removed from extension.ts
- [ ] getFileDecoration() function removed from statusIcons.ts
- [ ] getTreeItemIcon() function remains in statusIcons.ts
- [ ] STATUS_BADGES and STATUS_COLORS mappings remain
- [ ] FileDecorationProvider tests removed
- [ ] Package.json has no decoration-related configuration
- [ ] File Explorer shows no status badges on planning files
- [ ] File Explorer shows no status colors on planning files
- [ ] TreeView (F16-F20) fully functional after cleanup
- [ ] Extension activates without errors
- [ ] No references to FileDecoration in codebase (verified via grep)
- [ ] Documentation updated to remove decoration references

## Child Items

- **S67**: Remove FileDecorationProvider Registration - Priority: Low, Status: Not Started
- **S68**: Clean StatusIcons Module (Keep TreeView Functions) - Priority: Low, Status: Not Started
- **S69**: Update Extension Activation Logging - Priority: Low, Status: Not Started
- **S70**: Verification Testing and Documentation - Priority: Low, Status: Not Started
