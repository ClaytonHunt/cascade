---
spec: S52
title: TreeView Refresh Mechanism
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-13
updated: 2025-10-13
---

# S52 - TreeView Refresh Mechanism

## Overview

This specification details the implementation of automatic TreeView refresh integration with the existing FileSystemWatcher (S38). The goal is to ensure the Cascade TreeView always reflects the current state of the plans/ directory by automatically updating when planning files are created, modified, or deleted.

## Implementation Strategy

The implementation follows a three-phase approach that builds incrementally from FileSystemWatcher integration to manual refresh commands to comprehensive testing.

### Architecture Summary

**Existing Infrastructure (Already Implemented):**
- FileSystemWatcher with 300ms debouncing (extension.ts:330-431)
- PlanningTreeProvider with refresh() method (treeview/PlanningTreeProvider.ts:44-46)
- EventEmitter for tree change events (treeview/PlanningTreeProvider.ts:20-25)
- FrontmatterCache with invalidation (cache.ts)
- Module-level provider reference (extension.ts:23)

**New Integration Points:**
1. Modify existing FileSystemWatcher handlers to call refresh()
2. Add manual refresh command for explicit user control
3. Implement refresh logging for debugging

**Key Design Decisions:**

1. **Module-Level Provider Reference**: The `planningTreeProvider` variable is already declared at module level (extension.ts:23), allowing watcher handlers to access it.

2. **Debouncing Inheritance**: FileSystemWatcher already implements 300ms debouncing. TreeView refresh automatically inherits this behavior by being called from debounced handlers.

3. **Full Tree Refresh**: Using `fire(undefined)` refreshes entire tree. This is appropriate for flat tree structure and small dataset (< 1000 items expected).

4. **Graceful Error Handling**: Refresh operations should never throw exceptions. PlanningTreeProvider.getChildren() already has try-catch error handling (lines 154-157).

5. **State Preservation**: VSCode automatically preserves scroll position and selection for items with stable IDs (file paths). No additional code required.

## Integration Points

### FileSystemWatcher (S38)
- **Location**: extension.ts:330-431
- **Modification**: Add refresh() calls to event handlers
- **Impact**: Minimal - single line addition per handler
- **Existing Logic**: Cache invalidation remains unchanged

### PlanningTreeProvider (S49)
- **Location**: treeview/PlanningTreeProvider.ts
- **Interface**: refresh() method already implemented
- **Change**: None - provider ready for integration

### FrontmatterCache (S40)
- **Location**: cache.ts
- **Relationship**: Invalidation happens before refresh
- **Sequence**: invalidate() → debounce → refresh() → getChildren() → cache.get()

### Extension Commands
- **Location**: extension.ts activate() function
- **Pattern**: Follow existing command registration (lines 571-578)
- **Package.json**: Add command declaration to "contributes.commands"

## Phase Breakdown

### Phase 1: FileSystemWatcher Integration
- Modify handleCreate, handleChange, handleDelete handlers
- Add refresh() calls after cache invalidation
- Add refresh event logging to output channel
- Test automatic refresh on file operations

### Phase 2: Manual Refresh Command
- Register cascade.refresh command
- Add command to package.json
- Implement confirmation message on manual refresh
- Test command execution from Command Palette

### Phase 3: Testing and Validation
- Test rapid file changes (debouncing verification)
- Test state preservation (scroll, selection)
- Test error handling (invalid frontmatter, missing files)
- Verify output channel logging
- Performance test with 100+ files

## Risks and Considerations

### Low Risk
- **Existing Infrastructure**: All required components already implemented
- **Minimal Code Changes**: < 20 lines of new code total
- **Isolated Changes**: No impact on other features
- **Backward Compatible**: No breaking changes

### Testing Considerations
- **Debouncing**: Verify single refresh after rapid saves
- **Cache Integration**: Ensure fresh data loaded after invalidation
- **State Preservation**: Check scroll/selection maintained
- **Error Handling**: Invalid files should not break refresh

### Performance Considerations
- **Small Dataset**: Plans directory expected < 1000 items
- **Fast Refresh**: Full tree reload acceptable at this scale
- **Future Optimization**: Granular refresh (fire(element)) if needed later

## Success Criteria

1. **Automatic Refresh**: File create/modify/delete updates TreeView within ~300ms
2. **Debouncing**: Multiple rapid changes trigger single refresh
3. **Manual Command**: cascade.refresh command available and working
4. **Logging**: Refresh events logged to output channel with timestamps
5. **Error Handling**: Invalid files don't break refresh operation
6. **State Preservation**: Scroll position and selection maintained when possible
7. **Cache Integration**: Refreshed tree shows latest file data

## Implementation Files

### Files to Modify
- `vscode-extension/src/extension.ts` (add refresh calls, register command)
- `vscode-extension/package.json` (add command declaration)

### Files to Read (Reference)
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (understand provider interface)
- `vscode-extension/src/cache.ts` (understand cache invalidation)

### No New Files Required
All functionality integrates into existing codebase.

## External Documentation

**VSCode API References:**
- TreeView refresh: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- EventEmitter: https://code.visualstudio.com/api/references/vscode-api#EventEmitter
- Commands: https://code.visualstudio.com/api/references/vscode-api#commands

**Implementation Patterns:**
- Follow existing command registration pattern (extension.ts:571-578)
- Follow existing output channel logging pattern (extension.ts:299)
- Use existing module-level provider reference (extension.ts:23)

## Next Steps

After specification approval:
1. Run `/build specs/S52-treeview-refresh-mechanism/plan.md`
2. Follow RED-GREEN-REFACTOR cycle for each phase
3. Test thoroughly before marking complete
4. Update S52 status to "Completed" after all tests pass
