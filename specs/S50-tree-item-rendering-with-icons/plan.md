---
spec: S50
title: Tree Item Rendering with Icons
type: spec
status: Completed
priority: High
phases: 4
created: 2025-10-13
updated: 2025-10-13
---

# S50 - Tree Item Rendering with Icons

## Implementation Strategy

This specification enhances the existing `PlanningTreeProvider.getTreeItem()` method to provide richer visual presentation for planning items in the Cascade TreeView. The implementation focuses on three key improvements:

1. **Type-specific icons** using VSCode's built-in ThemeIcon system
2. **Enhanced tooltips** with comprehensive metadata display
3. **Context values** for enabling type-specific context menus (used in F19)

The story builds directly on S49's foundation (PlanningTreeProvider core implementation) by modifying the existing `getTreeItem()` method without requiring architectural changes. All dependencies (cache, parser, types) are already in place.

## Architecture Decisions

### Icon System Choice

**Decision**: Use `vscode.ThemeIcon` with built-in icon IDs instead of custom SVG files.

**Rationale**:
- Theme-aware: Automatically adapts to light/dark/high-contrast themes
- Zero maintenance: No custom icon files to manage
- Performance: Icons are font-based glyphs (Codicons), not image files
- Consistency: Matches VSCode's native UI aesthetic

**Implementation**: Create helper function `getIconForItemType()` that maps ItemType enum to ThemeIcon instances.

### Tooltip Design

**Decision**: Use markdown-formatted tooltip with structured metadata display.

**Rationale**:
- VSCode TreeItem.tooltip accepts `string | vscode.MarkdownString`
- Markdown enables formatting (bold headers, lists, code blocks)
- Structured format provides quick information access on hover
- Includes file path for navigation context

**Content hierarchy**: Item number/title → Type/Status/Priority → File path

### Collapsible State

**Decision**: Set collapsible state based on item type even though tree is currently flat.

**Rationale**:
- Prepares for F17 (hierarchical grouping) without refactoring
- No negative impact in flat tree (state ignored when no children)
- Clear semantic distinction between parent items (Project/Epic/Feature) and leaf items (Story/Bug/Spec/Phase)

**Implementation**: Parent types get `TreeItemCollapsibleState.Collapsed`, leaf types get `TreeItemCollapsibleState.None`.

## Key Integration Points

### Existing Code (S49)

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:54-80`

Current `getTreeItem()` implementation already includes:
- Label formatting (`${element.item} - ${element.title}`)
- Basic tooltip with status and priority
- Description field showing status
- Collapsible state logic for epic/feature types
- ResourceUri for file association

**Enhancement approach**: Extend existing implementation rather than rewrite. Add icon mapping and enhance tooltip formatting.

### Types System

**File**: `vscode-extension/src/types.ts:9`

`ItemType` enum defines all item types: `'project' | 'epic' | 'feature' | 'story' | 'bug' | 'spec' | 'phase'`

**Usage**: Map each type to corresponding VSCode icon ID.

### TreeItem API

**VSCode API**: `vscode.TreeItem` class

Key properties for this story:
- `iconPath`: Set to ThemeIcon instance (replaces default icon)
- `tooltip`: Set to markdown string with metadata
- `contextValue`: Set to item type string (enables context menu filtering in F19)
- `description`: Already set to status (no change needed)

## Risks/Considerations

### Risk 1: Icon Availability

**Risk**: Chosen icon IDs might not exist in older VSCode versions.

**Mitigation**: Extension requires VSCode 1.80.0+ (package.json engines field). All selected icons (`project`, `layers`, `package`, `check`, `bug`, `file-code`, `milestone`) have been available since VSCode 1.40.0+.

### Risk 2: Tooltip Formatting

**Risk**: Markdown tooltips might render differently across platforms (Windows/Mac/Linux).

**Mitigation**: Use simple markdown subset (headers, lists, no complex formatting). Test on Windows (primary development platform). Markdown support is core VSCode API feature with consistent rendering.

### Risk 3: Context Value Conflicts

**Risk**: Context value might conflict with future extension features or other extensions.

**Mitigation**: Use simple item type string for now. Can be namespaced later if conflicts arise (e.g., `cascade.epic`). Context values are scoped to this extension's TreeView only.

## Codebase Analysis Summary

### Files to Modify

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts** (primary modification)
   - Modify `getTreeItem()` method (lines 54-80)
   - Add helper functions: `getIconForItemType()`, `buildTooltip()`, `getCollapsibleState()`
   - Estimated changes: ~60 lines added/modified

### New Files to Create

1. **vscode-extension/src/test/suite/treeItemRendering.test.ts** (unit tests)
   - Test icon mapping for all item types
   - Test tooltip content generation
   - Test collapsible state logic
   - Test TreeItem property assignment
   - Estimated size: ~150 lines

### External Dependencies

**VSCode APIs used**:
- `vscode.ThemeIcon` - Icon creation with built-in IDs
- `vscode.TreeItem` - Base tree item class
- `vscode.TreeItemCollapsibleState` - Enum for collapsible state
- `vscode.MarkdownString` - Optional, for enhanced tooltip formatting

**Godot APIs**: None (VSCode extension only)

**External packages**: None (uses existing dependencies)

## Phase Overview

### Phase 1: Icon Mapping Implementation
**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Create `getIconForItemType()` helper function and integrate into `getTreeItem()` method. This phase focuses on the visual icon system only.

**Deliverable**: Each item type displays correct icon in TreeView.

### Phase 2: Enhanced Tooltip System
**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Replace simple tooltip with markdown-formatted tooltip containing comprehensive metadata. Create `buildTooltip()` helper function.

**Deliverable**: Hovering over items shows detailed metadata (item, title, type, status, priority, file path).

### Phase 3: Collapsible State and Context Value
**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Extract collapsible state logic into `getCollapsibleState()` helper and add `contextValue` property for context menu support (F19).

**Deliverable**: Parent items show collapse arrow, leaf items don't. Context value enables future context menu filtering.

### Phase 4: Unit Tests
**File**: `vscode-extension/src/test/suite/treeItemRendering.test.ts`

Create comprehensive unit tests for all helper functions and TreeItem property assignment. Uses Mocha test framework.

**Deliverable**: All tests pass, validating icon mapping, tooltip generation, collapsible state, and TreeItem configuration.

## Next Steps

After completing this specification:

1. Run `/build specs/S50-tree-item-rendering-with-icons/plan.md` to begin implementation
2. Follow RED-GREEN-REFACTOR TDD cycle for each phase
3. Manual testing workflow:
   - Package extension: `cd vscode-extension && npm run package`
   - Install VSIX: `code --install-extension cascade-0.1.0.vsix --force`
   - Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   - Verify icons, tooltips, and tree structure in Cascade TreeView
4. Mark S50 as "Completed" after all tests pass and manual verification succeeds
