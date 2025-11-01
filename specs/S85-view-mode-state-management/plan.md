---
spec: S85
title: View Mode State Management
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-24
updated: 2025-10-24
---

# S85 - View Mode State Management

## Implementation Strategy

This specification implements the foundational state management infrastructure for F28 (TreeView Display Mode Toggle). The implementation adds view mode state tracking ('status' | 'hierarchy') to PlanningTreeProvider with workspace persistence, enabling the TreeView to maintain display preferences across VSCode sessions.

### Architecture Decisions

**State Management Approach:**
- Single `viewMode` property on PlanningTreeProvider controls display logic
- Workspace state API (`vscode.Memento`) for session persistence
- Default to 'hierarchy' mode to align with reference design (ChatGPT)
- State changes trigger full TreeView refresh via existing `refresh()` method

**Integration with Existing Patterns:**
- Follows same pattern as `showArchivedItems` toggle (S77-S79)
- Reuses existing workspace state Memento passed to constructor
- No new constructor parameters or API changes needed
- Type definition exported from centralized `types.ts`

**Performance Considerations:**
- State read: Synchronous (Memento.get)
- State write: Asynchronous (Memento.update)
- View mode change triggers full refresh (acceptable for infrequent user action)
- No caching needed (single property, O(1) access)

### Key Integration Points

1. **PlanningTreeProvider Constructor** (vscode-extension/src/treeview/PlanningTreeProvider.ts:246)
   - Initialize `viewMode` from workspace state
   - Default to 'hierarchy' if no saved state exists
   - Log initialization to output channel

2. **Workspace State API** (existing Memento)
   - Read: `workspaceState.get<ViewMode>('cascadeViewMode', 'hierarchy')`
   - Write: `await workspaceState.update('cascadeViewMode', mode)`
   - Storage key pattern: `'cascade.viewMode'` (follows `cascade.showArchived` convention)

3. **Type Definitions** (vscode-extension/src/types.ts)
   - Export `ViewMode` type alongside `Status`, `Priority`, etc.
   - Used by S86 (getChildren logic) and S87 (toolbar button handler)

4. **TreeView Refresh** (PlanningTreeProvider.refresh)
   - Called after `setViewMode()` to rebuild TreeView with new display mode
   - Existing method, no changes needed

### Risk Assessment

**Low Risk Areas:**
- Type definition (simple union type, no breaking changes)
- State persistence (proven pattern from S79)
- Getter method (trivial accessor, no side effects)

**Medium Risk Areas:**
- Constructor initialization (must handle missing/invalid saved state)
- Setter method validation (must reject invalid mode values)

**Mitigation Strategies:**
- Defensive validation in `setViewMode()` with fallback to 'hierarchy'
- Output channel logging for all state changes (debugging visibility)
- Unit tests for all validation branches
- Integration tests for persistence across TreeView recreation

### Phase Overview

**Phase 1: Type Definition and Property** (15 min)
- Define `ViewMode` type in types.ts
- Add `viewMode` property to PlanningTreeProvider
- Add getter method
- Update documentation

**Phase 2: Workspace State Integration** (20 min)
- Initialize view mode from workspace state in constructor
- Implement `setViewMode()` with persistence
- Add validation and error handling
- Log all state changes to output channel

**Phase 3: Testing** (25 min)
- Unit tests for initialization, getters, setters, validation
- Integration tests for persistence across TreeView recreation
- Edge case tests (invalid stored values, concurrent updates)

**Total Estimated Time:** 60 minutes

## Codebase Analysis Summary

**Files to Modify:**
1. `vscode-extension/src/types.ts` - Add ViewMode type definition
2. `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Add state management

**New Files to Create:**
1. `vscode-extension/src/test/suite/viewMode.test.ts` - Unit tests

**External Dependencies:**
- VSCode API: `vscode.Memento` (workspace state storage)
- No new npm packages required

**Godot Engine APIs:** None (VSCode extension only)

## Next Steps

After S85 completion:
1. **S86**: Implement hierarchy display logic using `getViewMode()` in `getChildren()`
2. **S87**: Add toolbar button and command to call `setViewMode()`
3. Integration testing across all three stories (F28 E2E)
