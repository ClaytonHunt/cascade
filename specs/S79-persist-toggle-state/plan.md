---
spec: S79
title: Persist Toggle State Across Sessions
type: spec
status: Completed
priority: Medium
phases: 2
created: 2025-10-23
updated: 2025-10-24
---

# Implementation Specification: S79 - Persist Toggle State Across Sessions

## Overview

This specification defines the implementation strategy for persisting the "Show Archived Items" toggle state across VSCode sessions using workspace state storage. The implementation ensures user preferences are remembered between reloads and window reopens, providing a better user experience.

## Work Item Reference

- **Story**: S79 - Persist Toggle State Across Sessions
- **Feature**: F22 - Archive Support
- **Epic**: E5 - Rich TreeView Visualization
- **Story File**: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-79-persist-toggle-state.md`

## Dependencies

All dependencies are completed:
- ✅ **S77**: Toggle Command and UI Integration (provides `showArchivedItems` flag and `toggleArchivedItems()` method)
- ✅ **S78**: Archive Filtering in TreeView (ensures state affects TreeView correctly)

## Implementation Strategy

### Core Approach

The implementation uses **workspace state storage** (`context.workspaceState`) to persist toggle state across sessions. This approach provides:

1. **Workspace-scoped storage**: Different preferences per workspace
2. **Automatic persistence**: VSCode handles storage/retrieval
3. **Cross-platform**: Works on Windows, Mac, Linux
4. **Multi-root support**: Independent state per workspace folder

### Key Design Decisions

#### 1. Storage Location (Encapsulated in PlanningTreeProvider)

**Chosen Approach**: Pass `vscode.Memento` (workspaceState) to PlanningTreeProvider constructor

**Rationale**:
- **Encapsulation**: Provider owns its state and persistence logic
- **Testability**: Easier to mock Memento for testing
- **Separation of Concerns**: extension.ts doesn't need to know about toggle state details
- **Consistency**: Follows existing pattern (provider owns `showArchivedItems` field)

**Alternative Rejected**: Persist in extension.ts command handler
- ❌ Violates encapsulation (extension.ts manipulates provider's internal state)
- ❌ Harder to test (tight coupling between extension.ts and provider)
- ❌ More code in extension.ts (command handler needs to read/write state)

#### 2. Storage Key Convention

**Key**: `cascade.showArchived`

**Convention**:
- Prefix with extension ID (`cascade`)
- Descriptive name (`showArchived`)
- Dotted namespace (VSCode convention)
- Matches existing pattern in codebase

#### 3. Default Value

**Default**: `false` (archived items hidden)

**Rationale**:
- Conservative choice (hide complexity by default)
- Matches current behavior (S77/S78 default)
- Users opt-in to see archived items
- Reduces visual clutter for new users

#### 4. State Restoration Timing

**Timing**: During provider construction (before TreeView registration)

**Flow**:
1. Extension activates → `activate()` called
2. Create PlanningTreeProvider (pass workspaceState)
3. Constructor reads state from storage → sets `showArchivedItems`
4. Register TreeView with provider
5. TreeView renders with correct initial state (no flicker)

**Why This Timing**:
- ✅ No visual flicker (state set before first render)
- ✅ Simple implementation (no post-init setup)
- ✅ Consistent with VSCode patterns

### Architecture Integration Points

#### Modified Files

**vscode-extension/src/treeview/PlanningTreeProvider.ts**:
- Constructor: Add `workspaceState: vscode.Memento` parameter
- Constructor body: Read state from storage, set `showArchivedItems`
- `toggleArchivedItems()`: Write state to storage after toggle

**vscode-extension/src/extension.ts**:
- `activate()`: Pass `context.workspaceState` to provider constructor

#### No Breaking Changes

- Constructor parameter is **appended** (backward compatible if testing mocks exist)
- Existing behavior preserved (default `false` matches current behavior)
- No changes to public API (toggle command unchanged)

### Error Handling Strategy

**Storage Read Errors**:
- Default to `false` if read fails
- Log warning to output channel
- Continue activation (non-blocking)

**Storage Write Errors**:
- Log warning to output channel
- Toggle still works (just doesn't persist)
- No user-facing error (degraded gracefully)

**No State Exists** (First Run):
- Memento.get() returns undefined → default to `false`
- Normal behavior (no error)

### Testing Strategy

**Manual Testing Scenarios**:

1. **Persistence Test** (Basic):
   - Toggle ON → Reload window → Verify still ON
   - Toggle OFF → Reload window → Verify still OFF

2. **Default State Test**:
   - Fresh workspace (no saved state) → Verify default OFF

3. **Multi-Workspace Test**:
   - Workspace A: Toggle ON
   - Workspace B: Verify OFF (independent state)
   - Return to Workspace A: Verify ON (state preserved)

4. **Error Handling Test**:
   - Mock storage read error → Verify defaults to OFF
   - Mock storage write error → Verify toggle still works

**Automated Testing** (Optional):
- Unit tests for PlanningTreeProvider constructor (mock Memento)
- Unit tests for toggleArchivedItems() (verify Memento.update called)

### Performance Characteristics

**Storage Operations**:
- Read: < 1ms (synchronous, in-memory lookup)
- Write: < 5ms (asynchronous, persisted to disk)

**Activation Impact**:
- No measurable impact (single Memento.get() call)
- No file I/O during activation (VSCode handles persistence)

**Toggle Command Impact**:
- Adds ~5ms for Memento.update() (asynchronous)
- Non-blocking (doesn't delay TreeView refresh)

### VSCode Storage API Reference

**Memento Interface**:
```typescript
interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Thenable<void>;
}
```

**Workspace State**:
- Accessed via `ExtensionContext.workspaceState`
- Scoped to current workspace
- Persists across VSCode sessions
- JSON-serializable values only (boolean, string, number, object, array)

**Documentation**:
- [VSCode API Reference](https://code.visualstudio.com/api/references/vscode-api#Memento)
- [State and Storage Guide](https://code.visualstudio.com/api/extension-guides/state-and-storage)

## Implementation Phases

### Phase 1: Add Workspace State Storage
**Goal**: Modify PlanningTreeProvider to accept and use workspace state for persistence

**Tasks**:
- Update constructor signature to accept `workspaceState: vscode.Memento`
- Read saved state in constructor and initialize `showArchivedItems`
- Update `toggleArchivedItems()` to persist state after toggle
- Add output channel logging for debugging

**Validation**:
- TypeScript compilation succeeds
- No breaking changes to existing tests
- Output channel logs show state restoration

### Phase 2: Integrate with Extension Activation
**Goal**: Pass workspace state from extension.ts to provider and enable manual testing

**Tasks**:
- Modify extension.ts activate() to pass `context.workspaceState` to provider
- Test persistence across reloads
- Test multi-workspace scenarios
- Verify error handling (missing state, read/write failures)

**Validation**:
- Extension activates without errors
- Toggle state persists across reloads
- Multi-workspace state is independent
- Default value works for new workspaces

## Risk Assessment

### Low Risk Areas
- VSCode Memento API is stable and well-documented
- Storage is automatic (no file I/O code needed)
- Non-breaking change (appends constructor parameter)
- Minimal code changes (< 20 lines total)

### No Known Blockers
- All dependencies completed (S77, S78)
- No external dependencies required
- No database or file format changes
- No performance concerns

## Completion Criteria

### Functional Requirements
- ✅ Toggle state saved to `context.workspaceState` when changed
- ✅ State persists across VSCode reloads
- ✅ State persists across window close/reopen
- ✅ State restored on extension activation
- ✅ Default to `false` if no saved state exists
- ✅ State is workspace-scoped (independent per workspace)

### Error Handling Requirements
- ✅ Gracefully handle storage read errors (default to `false`)
- ✅ Gracefully handle storage write errors (log warning, continue)
- ✅ No crashes or exceptions during storage operations

### Code Quality Requirements
- ✅ TypeScript type safety maintained
- ✅ Output channel logging for debugging
- ✅ Clear code comments explaining storage logic
- ✅ No breaking changes to existing API

## Next Steps

After completing this specification:
1. Run `/build specs/S79-persist-toggle-state/plan.md` to begin implementation
2. Follow TDD approach with manual testing (VSCode extension testing)
3. Test with various scenarios (persistence, multi-workspace, error handling)
4. Mark S79 as "Completed" after all phases pass

## References

### Codebase Files
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (primary modification target)
- `vscode-extension/src/extension.ts` (pass workspaceState to provider)

### Related Stories
- S77 - Toggle Command and UI Integration (provides toggle functionality)
- S78 - Archive Filtering in TreeView (ensures state affects TreeView)
- S80 - Visual Design for Archived Items (future story, uses same toggle state)

### External Documentation
- [VSCode Extension API - Memento](https://code.visualstudio.com/api/references/vscode-api#Memento)
- [VSCode Extension Guide - State and Storage](https://code.visualstudio.com/api/extension-guides/state-and-storage)
- [TypeScript Handbook - Optional Parameters](https://www.typescriptlang.org/docs/handbook/2/functions.html#optional-parameters)

### Documentation
- Story file: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-79-persist-toggle-state.md`
- CLAUDE.md: VSCode extension testing section
