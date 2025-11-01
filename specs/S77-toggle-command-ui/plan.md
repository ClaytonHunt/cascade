---
spec: S77
title: Toggle Command and UI Integration
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-23
updated: 2025-10-23
---

# S77 - Toggle Command and UI Integration

## Overview

This specification implements a toggle command and UI button that allows users to show/hide archived items in the Cascade TreeView. The toggle state is stored in memory during the VSCode session, providing immediate visual feedback for archive visibility control.

This is the user-facing control mechanism for the archive filtering feature (implemented in S78), making it easy to switch between viewing active work only vs. viewing all items including archived. The toggle command provides both Command Palette access and a TreeView toolbar button for convenient switching.

## Implementation Strategy

The implementation follows a **UI-first, state-driven approach**, building the toggle infrastructure before implementing actual filtering logic:

1. **Phase 1: Toggle State Management**
   - Add `showArchivedItems` boolean flag to PlanningTreeProvider
   - Implement `toggleArchivedItems()` method with logging
   - Verify state toggling works via output channel logs
   - Default state: `false` (archived items hidden by default)

2. **Phase 2: Command and Button Registration**
   - Register `cascade.toggleArchived` command in extension.ts
   - Add command to package.json `contributes.commands`
   - Add TreeView toolbar button in package.json `contributes.menus`
   - Configure icon, tooltip, and visibility conditions
   - Verify command appears in Command Palette and toolbar

3. **Phase 3: Visual Feedback and Integration**
   - Trigger TreeView refresh when toggle state changes
   - Update output channel logging with state info
   - Verify button click triggers state change and refresh
   - Test Command Palette invocation
   - Manual testing workflow validation

## Architecture Decisions

### In-Memory Toggle State (No Persistence)

**Design Decision:** Store `showArchivedItems` as instance variable in PlanningTreeProvider

**Rationale:**
- **Simplicity:** No configuration management needed in S77
- **Session-scoped:** State resets on VSCode reload (predictable behavior)
- **Testability:** Easy to verify state changes via logging
- **Separation of concerns:** S79 will add persistence separately
- **User expectation:** Archive visibility is session-specific preference

**Implication:**
- State lost on window reload (expected behavior until S79)
- No synchronization needed across VSCode instances
- State isolated to TreeView provider (single source of truth)

### Toggle-Then-Refresh Pattern

**Design Decision:** Flip state flag, then trigger `refresh()` to rebuild tree

```typescript
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;
  this.outputChannel.appendLine(`[Archive] Toggled: ${this.showArchivedItems ? 'visible' : 'hidden'}`);
  this.refresh();  // Trigger full TreeView rebuild
}
```

**Rationale:**
- **Consistency:** Matches existing pattern for status changes (S61, S73)
- **Simplicity:** Avoids partial refresh complexity
- **Correctness:** Full refresh ensures status groups recalculate counts
- **Performance:** Acceptable for user-initiated action (not auto-triggered)

**Alternative Considered:**
- Partial refresh (update only visible items)
- **Rejected:** Requires complex diff logic, not worth optimization for toggle

### TreeView Toolbar Button Placement

**Design Decision:** Place button in TreeView toolbar (navigation group)

**Rationale:**
- **Visibility:** Always visible in TreeView header (no scrolling needed)
- **Accessibility:** Click target near TreeView content
- **Convention:** Matches VSCode patterns (Explorer "New File" button, etc.)
- **Icon choice:** `$(archive)` Codicon for semantic clarity

**Alternative Considered:**
- Status bar button (bottom-right corner)
- **Rejected:** Too far from TreeView, less discoverable

### Icon: Static vs. Dynamic

**Chosen Approach:** Static `$(archive)` icon

**Rationale:**
- **Semantic clarity:** Archive icon represents feature domain
- **Simplicity:** No icon switching logic needed
- **Tooltip clarity:** Tooltip indicates current state ("Show/Hide Archived Items")

**Alternative Considered:**
- Dynamic icon (`$(eye)` vs. `$(eye-closed)`)
- **Rejected:** Adds complexity, tooltip provides state info already

## Key Integration Points

### PlanningTreeProvider State (New Property)

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:194`

Add after `debounceDelay` property declaration:
```typescript
/**
 * Controls visibility of archived items in TreeView (S77).
 *
 * When false (default), archived items are filtered out.
 * When true, archived items are shown in TreeView.
 *
 * State is session-scoped (lost on reload) until S79 implements persistence.
 *
 * Used by:
 * - S78 (Archive Filtering): Filter logic checks this flag
 * - S77 (Toggle Command): toggleArchivedItems() method flips this flag
 * - S79 (Persistence): Will read/write this from VSCode memento
 */
private showArchivedItems: boolean = false;
```

### PlanningTreeProvider Toggle Method (New Method)

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:404`

Add after `updateDebounceDelay()` method:
```typescript
/**
 * Toggles visibility of archived items in TreeView (S77).
 *
 * Flips the showArchivedItems flag and triggers full refresh
 * to rebuild status groups with new filter.
 *
 * Triggered by:
 * - Command Palette: "Cascade: Toggle Archived Items"
 * - TreeView toolbar button (archive icon)
 *
 * Output channel logs state change for debugging.
 */
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

### Command Registration

**File:** `vscode-extension/src/extension.ts:1350`

Add after utility commands (revealInExplorerCmd):
```typescript
// Register toggle archived items command (S77)
const toggleArchivedCmd = vscode.commands.registerCommand(
  'cascade.toggleArchived',
  () => {
    if (planningTreeProvider) {
      planningTreeProvider.toggleArchivedItems();
    }
  }
);
context.subscriptions.push(toggleArchivedCmd);
```

### Package.json Command Definition

**File:** `vscode-extension/package.json:67`

Add after existing commands:
```json
{
  "command": "cascade.toggleArchived",
  "title": "Toggle Archived Items",
  "category": "Cascade",
  "icon": "$(archive)"
}
```

### Package.json TreeView Toolbar Button

**File:** `vscode-extension/package.json:76`

Add new menu contribution section after `view/item/context`:
```json
"view/title": [
  {
    "command": "cascade.toggleArchived",
    "when": "view == cascadeView",
    "group": "navigation"
  }
]
```

**Note:** This creates a new `view/title` menu section for toolbar buttons. The `navigation` group places the button in the TreeView header next to other toolbar actions.

### Extension Activation Logging

**File:** `vscode-extension/src/extension.ts:1388`

Add to command list output:
```typescript
outputChannel.appendLine('  - Cascade: Toggle Archived Items (command + toolbar button)');
```

## Risk Assessment

### Low Risk Factors

- **Isolated state management:** Toggle state is self-contained in provider
- **Simple boolean logic:** No complex state transitions
- **No file system changes:** Toggle only affects in-memory state
- **Existing refresh pattern:** Uses proven `refresh()` method
- **Type safety:** TypeScript enforces method signatures

### Potential Issues

1. **TreeView Refresh Performance**
   - **Risk:** Full refresh on toggle might be slow for large workspaces
   - **Mitigation:** Existing caching (S58) handles refresh efficiently
   - **Severity:** Low (refresh < 500ms for 100+ items per S58 targets)

2. **Button Icon Visibility**
   - **Risk:** Archive icon might not be discoverable to new users
   - **Mitigation:** Tooltip provides context, Command Palette provides alternative
   - **Severity:** Low (toolbar buttons are standard VSCode UX pattern)

3. **State Lost on Reload**
   - **Risk:** Users expect toggle state to persist across sessions
   - **Mitigation:** S79 will add persistence, documented limitation for S77
   - **Severity:** Low (session-scoped state is reasonable interim behavior)

## Testing Strategy

### Manual Testing (Phase 3)

**Test Setup:**
1. Package extension: `npm run package`
2. Install: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
4. Open output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"

**Test Cases:**

1. **Command Palette Test**
   - Open Command Palette (Ctrl+Shift+P)
   - Type "Toggle Archived"
   - Verify "Cascade: Toggle Archived Items" appears
   - Execute command
   - Verify output channel logs: `[Archive] Toggled archived items: visible`
   - Execute again
   - Verify output channel logs: `[Archive] Toggled archived items: hidden`

2. **Toolbar Button Test**
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Verify archive icon button appears in TreeView header (top-right)
   - Hover button
   - Verify tooltip: "Toggle Archived Items"
   - Click button
   - Verify output channel logs state change
   - Verify TreeView refreshes (status groups rebuild)

3. **State Toggle Test**
   - Initial state: `showArchivedItems = false` (default)
   - Click button → state flips to `true`
   - Click button → state flips to `false`
   - Verify each click triggers `refresh()` (watch output channel)

4. **Session Persistence Test**
   - Toggle ON (archived visible)
   - Reload VSCode window (Ctrl+R)
   - Verify state resets to OFF (expected behavior - no persistence yet)
   - Output channel should show: `[Archive] Toggled archived items: hidden` (implicit default)

5. **Integration with Existing Commands**
   - Toggle archived visibility
   - Execute "Cascade: Refresh TreeView" command
   - Verify toggle state preserved (not reset by manual refresh)

### Unit Testing (Not Required for S77)

**Rationale:** S77 implements UI integration, not logic. Testing requires:
- VSCode extension host (not available in unit tests)
- TreeView rendering (visual validation)
- Command registration (extension activation context)

**Alternative:** Manual testing provides adequate coverage for UI integration story.

## Success Criteria

Before marking this story as complete, verify:

### Phase 1 Complete
- ✅ `showArchivedItems` property added to PlanningTreeProvider
- ✅ `toggleArchivedItems()` method implemented
- ✅ Method logs state changes to output channel
- ✅ Method calls `refresh()` after state change
- ✅ TypeScript compilation succeeds

### Phase 2 Complete
- ✅ Command registered in extension.ts with proper typing
- ✅ Command added to package.json `contributes.commands`
- ✅ TreeView toolbar button added to package.json `view/title` menu
- ✅ Icon configured as `$(archive)`
- ✅ Command appears in Command Palette ("Cascade: Toggle Archived Items")

### Phase 3 Complete
- ✅ Toolbar button visible in TreeView header
- ✅ Button click toggles state (verified via output channel)
- ✅ TreeView refreshes after toggle (status groups rebuild)
- ✅ Command Palette invocation works
- ✅ State resets on window reload (expected behavior)
- ✅ No console errors or warnings
- ✅ Tooltip displays correctly on hover

## Dependencies

- **S75** (Type System Updates for Archived Status) - ✅ Completed
  - Provides 'Archived' status type definition
  - Required for status filtering in S78

- **S76** (Archive Directory Detection Logic) - ✅ Completed
  - Provides `isItemArchived()` utility function
  - Will be used by S78 filtering logic (not directly by S77)

## Next Steps

After completing S77:
1. Mark S77 as "Completed" when all success criteria met
2. Proceed to **S78** (Archive Filtering Logic)
   - Implement actual filtering using `showArchivedItems` flag
   - Use `isItemArchived()` to detect archived items
3. Then **S79** (Toggle State Persistence)
   - Add VSCode memento storage for toggle state
   - State persists across sessions
4. Finally **S80** (Archived Item Visual Design)
   - Apply muted styling to archived items
   - Enhance UX with visual differentiation

## Notes

- This story does NOT implement actual filtering logic (see S78)
- This story does NOT implement state persistence (see S79)
- This story ONLY sets up the UI control mechanism
- Toggle state is intentionally in-memory for this story (simple, testable)
- Button placement in TreeView toolbar follows VSCode conventions (navigation group)
- Archive icon matches the semantic domain (archival feature)
- Output channel logging enables debugging and verification
