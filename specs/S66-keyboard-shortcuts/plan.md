---
spec: S66
title: Keyboard Shortcuts for Context Actions
type: spec
status: Completed
priority: Low
phases: 2
created: 2025-10-17
updated: 2025-10-17
---

# S66 - Keyboard Shortcuts for Context Actions - Implementation Plan

## Overview

This specification adds keyboard shortcuts for frequently used context menu actions in the Cascade TreeView. Users can trigger actions via keyboard when the TreeView has focus, improving productivity for keyboard-driven workflows.

## Implementation Strategy

### Approach

This is a lightweight enhancement that adds keybindings to existing commands (S63, S64, S65). The implementation focuses on:

1. **Keybinding Registration**: Add keybindings to package.json with proper `when` clauses
2. **Command Modification**: Update existing commands to support both context menu (item passed) and keyboard invocation (no item, get from selection)

### Architecture Decisions

**Design Choice: Optional Parameter Pattern**

Existing commands already accept `item: PlanningTreeItem` parameter from context menu. We'll make this parameter optional and add fallback logic:
```typescript
async function changeStatusCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
  }

  // Existing validation and logic...
}
```

This pattern:
- Maintains backward compatibility with context menu
- Adds keyboard support without code duplication
- Uses VSCode's built-in TreeView selection API

**When Clause Strategy**

VSCode keybindings use `when` clauses to control activation context:
- `focusedView == cascadeView`: TreeView has keyboard focus
- `viewItem == story`: Selected item type (from TreeItem.contextValue)
- Combine with `&&`, `||`, `!=` operators

Example: `"when": "focusedView == cascadeView && (viewItem == story || viewItem == bug)"`

### Key Integration Points

**1. VSCode TreeView Selection API**
- `cascadeTreeView.selection: readonly T[]` - Array of selected items
- Works automatically with keyboard navigation (arrow keys, Enter)
- Updated when user clicks or uses keyboard to select

**2. TreeItem contextValue**
- Already set in PlanningTreeItem (S51): `contextValue: 'story' | 'epic' | 'feature' | 'bug' | 'status-group'`
- Used by when clauses to filter shortcuts by item type

**3. Command Registration**
- Commands already registered in extension.ts:548-582
- We'll update parameter type to optional: `(item?: PlanningTreeItem)`

**4. Package.json Contributions**
- Add `contributes.keybindings` section
- Reference existing command IDs
- Specify key combinations and when clauses

### Keyboard Shortcut Selection

| Shortcut | Action | Rationale |
|----------|--------|-----------|
| `Enter` | Open File | Default TreeView behavior (already works, no keybinding needed) |
| `Ctrl+Shift+S` | Change Status | "S" for Status, Shift avoids conflict with Ctrl+S (Save) |
| `Ctrl+Shift+N` | Create Child Item | "N" for New, common pattern in VSCode |
| `Ctrl+C` | Copy Item Number | Standard copy shortcut, scoped to TreeView only |

**Potential Conflicts**:
- `Ctrl+Shift+S`: VSCode default "Save All" - Our `when` clause prevents conflict (only active in TreeView)
- `Ctrl+C`: VSCode default "Copy" - Our `when` clause prevents conflict (only active in TreeView)

Alternative shortcuts available if users report issues:
- Change Status: `F2` (rename pattern) or `Ctrl+Alt+S`
- Copy: `Ctrl+Shift+C` (less conflict risk)

### Risk Assessment

**Low Risk Areas**:
- Keybinding registration (declarative, low complexity)
- TreeView selection API (well-documented, stable VSCode API)
- Command parameter modification (backward compatible change)

**Medium Risk Areas**:
- Keyboard shortcut conflicts (mitigated by `when` clauses, but user feedback may require adjustment)
- Focus management (TreeView must have focus for shortcuts to work - users may be confused if they expect shortcuts to work from editor)

**Mitigation**:
- Clear documentation in Command Palette (shortcuts visible next to command names)
- Output channel logging for debugging
- User warning messages if shortcuts triggered without valid selection

### Testing Strategy

**Manual Testing**:
1. Keyboard shortcut activation (press keys, verify action)
2. When clause validation (shortcuts disabled in wrong context)
3. Focus management (TreeView focus required)
4. Edge cases (no selection, invalid item type)

**Test Cases**:
- Story selected + Ctrl+Shift+S → Change status quick pick opens
- Epic selected + Ctrl+Shift+S → Warning message (Change Status only for Stories/Bugs)
- No selection + Ctrl+C → Warning message (No item selected)
- Editor focused + Ctrl+C → Normal copy (not item number)
- TreeView focused + Ctrl+C → Item number copied

## Phases Overview

### Phase 1: Package.json Keybindings
Register keyboard shortcuts in package.json with proper when clauses. This phase is purely declarative - no TypeScript code changes.

**Tasks**: 2 configuration tasks
**Estimated Time**: 15 minutes

### Phase 2: Command Parameter Updates
Modify existing commands to support keyboard invocation by making the item parameter optional and adding selection fallback logic.

**Tasks**: 3 command modifications + validation
**Estimated Time**: 30 minutes

## Completion Criteria

- [ ] All three shortcuts registered in package.json
- [ ] When clauses correctly restrict shortcuts to valid contexts
- [ ] Commands work with both context menu (item provided) and keyboard (item from selection)
- [ ] Shortcuts appear in Command Palette with key labels
- [ ] Warning messages shown for invalid contexts
- [ ] Manual testing passes all test cases
- [ ] No regressions to existing context menu functionality

## Next Steps

After specification approval, run `/build specs/S66-keyboard-shortcuts/plan.md` to begin implementation.
