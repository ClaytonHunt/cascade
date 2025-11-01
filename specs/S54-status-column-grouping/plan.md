---
spec: S54
title: Status Column Grouping
type: spec
status: Completed
priority: High
phases: 4
created: 2025-10-14
updated: 2025-10-14
---

# S54 - Status Column Grouping Implementation Specification

## Overview

This specification implements kanban-style status column grouping for the Cascade TreeView. It transforms the current flat list of planning items into a hierarchical view where items are grouped under virtual "status nodes" representing their current lifecycle state.

The implementation creates 6 status columns (Not Started → In Planning → Ready → In Progress → Blocked → Completed) that serve as top-level grouping nodes in the TreeView, with planning items appearing as children under their respective status.

## Implementation Strategy

### Architecture Decision: Virtual Status Nodes

Status groups are **virtual nodes** - they are not backed by files on disk. They exist only in memory as tree structure metadata. This approach:

- Keeps the file system clean (no dummy status files needed)
- Allows dynamic count calculation without file synchronization
- Simplifies refresh logic (recalculate on-demand, no stale data)
- Follows VSCode TreeView patterns for non-file-backed nodes

### Key Design Principles

1. **Type-based Rendering**: Use TypeScript union types to distinguish between `PlanningTreeItem` and `StatusGroupNode` in `getChildren()` and `getTreeItem()`
2. **Lazy Loading**: Status groups calculate counts by filtering cached items (no additional file I/O)
3. **Stateless Calculation**: Every refresh recalculates groups from scratch (avoids state management complexity)
4. **Incremental Implementation**: Build status grouping first, defer hierarchical item display to S55

### Integration Points

**Files to Modify:**
- `vscode-extension/src/treeview/PlanningTreeItem.ts` - Add `StatusGroupNode` interface
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Modify `getChildren()` and `getTreeItem()`

**Dependencies:**
- `types.ts:14` - Status enum already defined (reuse)
- `cache.ts` - FrontmatterCache for status extraction
- `parser.ts` - Status field validation already implemented

### Risk Assessment

**Low Risk:**
- ✅ Status enum already exists and validated
- ✅ Cache infrastructure working
- ✅ TreeView registration complete

**Medium Risk:**
- ⚠️ TypeScript union type handling (may require type guards)
- ⚠️ Performance with 100+ items (requires count caching strategy)

**Mitigation:**
- Use TypeScript discriminated unions (`type: 'status-group'` field)
- Implement single-pass filtering for count calculation
- Reuse existing `loadAllItems()` logic with caching

## Phase Overview

### Phase 1: Create StatusGroupNode Type (Foundation)
Define TypeScript interfaces for status group nodes with type discrimination.

**Deliverable:** Type definitions ready for use in provider logic.

### Phase 2: Implement Status Group Generation (Core Logic)
Create methods to generate 6 status groups with counts by filtering cached items.

**Deliverable:** Working `getStatusGroups()` and `getItemsForStatus()` methods.

### Phase 3: Modify TreeView Provider Methods (Integration)
Update `getChildren()` to return status groups at root level, and `getTreeItem()` to render them.

**Deliverable:** TreeView displays status columns with items grouped underneath.

### Phase 4: Testing and Refinement (Validation)
Manual testing with various item counts, edge cases (empty status, no files), and performance verification.

**Deliverable:** All acceptance criteria met, ready for production use.

## External Documentation

**VSCode API:**
- [TreeDataProvider Interface](https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider)
- [TreeItem Class](https://code.visualstudio.com/api/references/vscode-api#TreeItem)
- [ThemeIcon](https://code.visualstudio.com/api/references/vscode-api#ThemeIcon)

**TypeScript:**
- [Discriminated Unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)

**Project Documentation:**
- `docs/frontmatter-schema.md` - Status field definition
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Existing provider implementation

## Success Criteria

Implementation is complete when:

1. ✅ TreeView displays 6 status groups at root level
2. ✅ Status groups ordered: Not Started → In Planning → Ready → In Progress → Blocked → Completed
3. ✅ Each status group shows count badge (e.g., "Ready (3)")
4. ✅ Status groups default to expanded state
5. ✅ Planning items grouped under their current status
6. ✅ Status groups collapsible/expandable
7. ✅ Count badges update on refresh
8. ✅ No errors when plans directory is empty
9. ✅ Performance acceptable with 100+ items
10. ✅ TypeScript compilation succeeds with no errors
