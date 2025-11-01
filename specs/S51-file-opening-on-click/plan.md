---
spec: S51
title: File Opening on Click
type: spec
status: Completed
priority: High
phases: 4
created: 2025-10-13
updated: 2025-10-13
---

# Implementation Specification: S51 - File Opening on Click

## Overview

This specification implements click-to-open functionality for the Cascade TreeView, enabling users to open planning item markdown files in the VSCode editor by clicking tree items. This completes the basic user interaction flow: view items → click → open file.

## Implementation Strategy

The implementation follows VSCode's declarative command pattern, where TreeItem objects specify which command to execute on click. This approach is cleaner and more maintainable than event-based handlers (like `onDidChangeSelection`).

**Key Design Decisions:**

1. **Command-Based Approach**: Use `TreeItem.command` property rather than selection events
   - More declarative and follows VSCode conventions
   - Automatically handles click events (single click)
   - Simpler than event-based approach (no selection state management)

2. **File Opening Behavior**: Open files in permanent tabs with editor focus
   - `preview: false` - Prevents tab from being replaced by next preview
   - `preserveFocus: false` - Editor receives focus after opening (expected behavior)
   - Matches VSCode File Explorer behavior (user expectations)

3. **Error Handling**: Graceful degradation for file access errors
   - Show user-friendly error notification
   - Log detailed error information to output channel
   - Don't crash extension (resilient behavior)

4. **Testing Strategy**: Unit tests with mocked VSCode API
   - Test helper function in isolation
   - Verify command registration
   - Test TreeItem command assignment
   - Edge cases: missing files, permission errors

## Architecture Integration

### Existing Components

- **PlanningTreeProvider** (`vscode-extension/src/treeview/PlanningTreeProvider.ts`)
  - Current: Creates TreeItems with icons, tooltips, descriptions
  - Change: Add command property to TreeItem (line 82, after contextValue)
  - Impact: Minimal - single property assignment

- **Extension Activation** (`vscode-extension/src/extension.ts`)
  - Current: Registers commands (e.g., `cascade.showCacheStats` at line 562)
  - Change: Register new `cascade.openFile` command
  - Pattern: Same as existing command registration (consistency)

- **PlanningTreeItem** (`vscode-extension/src/treeview/PlanningTreeItem.ts`)
  - Current: Contains `filePath` property (line 36)
  - Change: None - already has required data
  - Usage: Pass to command as argument

### New Components

- **openPlanningFile Function** (`vscode-extension/src/extension.ts`)
  - Location: Top-level helper function (after deactivate(), before getExtensionVersion())
  - Purpose: Opens file in VSCode editor with error handling
  - Dependencies: vscode.workspace, vscode.window, OutputChannel
  - Export: No (internal helper function)

### VSCode APIs Used

- **vscode.commands.registerCommand**: Register command handler
- **vscode.Uri.file**: Convert file path to URI
- **vscode.workspace.openTextDocument**: Load document from file
- **vscode.window.showTextDocument**: Display document in editor
- **vscode.window.showErrorMessage**: Display error notification
- **TreeItem.command**: Declarative click handler

## File Modifications

### Modified Files (2)

1. **vscode-extension/src/extension.ts**
   - Add `openPlanningFile` helper function
   - Register `cascade.openFile` command in activate()
   - ~30 lines of new code

2. **vscode-extension/src/treeview/PlanningTreeProvider.ts**
   - Add command property to TreeItem in getTreeItem()
   - ~6 lines of new code

### New Test Files (1)

3. **vscode-extension/src/test/suite/fileOpening.test.ts**
   - Unit tests for openPlanningFile function
   - Command registration verification
   - TreeItem command assignment tests
   - ~100-150 lines of test code

## Phases

### Phase 1: File Opening Helper Function
**Focus**: Create core file opening functionality with error handling

- Implement `openPlanningFile()` function in extension.ts
- Handle file URI conversion
- Configure editor display options (preview: false, preserveFocus: false)
- Implement comprehensive error handling
- Add error logging to output channel

**Completion Criteria**:
- ✅ Function accepts filePath and outputChannel parameters
- ✅ Converts path to URI using vscode.Uri.file()
- ✅ Opens document with correct options
- ✅ Errors logged to output channel
- ✅ User notifications shown for errors

### Phase 2: Command Registration
**Focus**: Register command in extension activation

- Register `cascade.openFile` command in activate()
- Pass outputChannel to command handler
- Add command to context.subscriptions (automatic disposal)
- Follow existing command registration pattern (cascade.showCacheStats)

**Completion Criteria**:
- ✅ Command registered with ID "cascade.openFile"
- ✅ Command added to context.subscriptions
- ✅ outputChannel passed to handler
- ✅ Follows existing code patterns

### Phase 3: TreeItem Command Assignment
**Focus**: Connect TreeItem clicks to command execution

- Modify PlanningTreeProvider.getTreeItem()
- Add command property to TreeItem
- Pass element.filePath as argument
- Maintain existing TreeItem properties

**Completion Criteria**:
- ✅ TreeItem.command property set
- ✅ Command ID is "cascade.openFile"
- ✅ filePath passed as argument
- ✅ All existing TreeItem properties preserved

### Phase 4: Unit Tests
**Focus**: Verify implementation with comprehensive tests

- Create fileOpening.test.ts
- Test openPlanningFile function behavior
- Test command registration
- Test TreeItem command assignment
- Test error handling (missing files, permissions)
- Follow existing test patterns (treeItemRendering.test.ts)

**Completion Criteria**:
- ✅ All tests pass
- ✅ Error cases covered
- ✅ Command registration verified
- ✅ TreeItem configuration tested

## Risks and Considerations

### File Path Handling
- **Risk**: Windows/Unix path differences
- **Mitigation**: vscode.Uri.file() handles cross-platform conversion automatically
- **Impact**: Low - VSCode API abstracts platform differences

### File Access Errors
- **Risk**: File deleted between tree load and click
- **Mitigation**: Try-catch with user notification and logging
- **Impact**: Low - rare edge case, handled gracefully

### Editor Focus Behavior
- **Risk**: Unexpected focus behavior (TreeView losing focus)
- **Mitigation**: Use `preserveFocus: false` (standard VSCode behavior)
- **Impact**: Low - matches user expectations from File Explorer

### Performance
- **Risk**: Opening very large files
- **Mitigation**: None needed - VSCode handles large file optimization
- **Impact**: None - VSCode's responsibility

### Testing Challenges
- **Risk**: Mocking VSCode APIs for unit tests
- **Mitigation**: Use existing test patterns (decorationProvider.test.ts)
- **Impact**: Low - existing tests demonstrate feasibility

## Dependencies

### Internal Dependencies
- PlanningTreeProvider (existing)
- PlanningTreeItem interface (existing)
- OutputChannel (existing, passed from extension.ts)
- Extension context (existing, for command registration)

### External Dependencies
- VSCode API v1.80.0+ (already required by extension)
- No new npm packages required

### Story Dependencies
- **S50 (Tree Item Rendering)**: COMPLETED (status: Ready)
  - Provides TreeItem creation in getTreeItem()
  - Provides filePath in PlanningTreeItem
  - This spec modifies getTreeItem() to add command property

## Validation

### Manual Testing Checklist
1. ✅ Click story item in TreeView → File opens in editor
2. ✅ Click epic item in TreeView → File opens in editor
3. ✅ File opens in permanent tab (not preview)
4. ✅ Editor receives focus after opening
5. ✅ Click same item twice → Switches to existing tab
6. ✅ Click different items → Opens multiple tabs
7. ✅ Delete file, then click item → Error notification shown
8. ✅ Check output channel → Error logged with details
9. ✅ No console errors during command execution

### Unit Testing Checklist
1. ✅ openPlanningFile() opens file with valid path
2. ✅ openPlanningFile() handles invalid path with error
3. ✅ Command registered with correct ID
4. ✅ TreeItem.command property set correctly
5. ✅ Command arguments passed correctly
6. ✅ Error logged to output channel
7. ✅ User notification shown for errors

## Success Metrics

- All unit tests pass
- Manual testing checklist complete
- No console errors during normal operation
- Error handling works for edge cases
- Code follows existing patterns and conventions

## Next Steps

After implementation:
1. Run unit tests: `npm test`
2. Package extension: `npm run package`
3. Install locally: `code --install-extension cascade-0.1.0.vsix --force`
4. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
5. Test manually using checklist above
6. Mark S51 as "Completed" in plans/

## References

### VSCode API Documentation
- [TreeItem API](https://code.visualstudio.com/api/references/vscode-api#TreeItem)
- [Commands API](https://code.visualstudio.com/api/references/vscode-api#commands)
- [TextDocument API](https://code.visualstudio.com/api/references/vscode-api#TextDocument)
- [Window API](https://code.visualstudio.com/api/references/vscode-api#window)

### Project Files
- Story: `plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-51-file-opening-on-click.md`
- Extension: `vscode-extension/src/extension.ts`
- TreeProvider: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
- TreeItem: `vscode-extension/src/treeview/PlanningTreeItem.ts`
- Test Pattern: `vscode-extension/src/test/suite/treeItemRendering.test.ts`

### Similar Implementations
- Existing command: `cascade.showCacheStats` (extension.ts:562-569)
- TreeItem pattern: PlanningTreeProvider.getTreeItem() (PlanningTreeProvider.ts:54-82)
