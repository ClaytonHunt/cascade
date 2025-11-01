---
spec: S101
title: TreeItemLabel API Migration
type: spec
status: Completed
priority: Medium
phases: 2
created: 2025-10-28
updated: 2025-10-28
---

# S101 - TreeItemLabel API Migration

## Overview

Migrate PlanningTreeProvider from plain string labels to VSCode's `TreeItemLabel` API to enable rich text formatting and highlighting. This migration provides the foundation for future color coding and text styling enhancements (S102).

The TreeItemLabel API was introduced in VSCode 1.76.0 (March 2023) and allows highlighting specific text ranges within labels. This story focuses on API migration and infrastructure setup - visual styling will be addressed in a separate story.

## Implementation Strategy

This migration is a **low-risk, incremental change** that preserves exact visual appearance while enabling future enhancements:

1. **Phase 1: Core API Migration** - Replace plain strings with TreeItemLabel objects
2. **Phase 2: Validation and Testing** - Verify compatibility and visual consistency

The implementation touches only the `getTreeItem()` method in PlanningTreeProvider, minimizing risk of regression. All existing functionality (label formatting, icons, status badges, progress bars) remains unchanged.

## Architecture Decisions

### TreeItemLabel vs. Plain String

**Current Implementation (S100):**
```typescript
const label = formatItemLabel(element);
const treeItem = new vscode.TreeItem(label, collapsibleState);
```

**New Implementation (S101):**
```typescript
const labelText = formatItemLabel(element);
const typeLabel = getTypeLabel(element.type);
const highlightRanges: [number, number][] = [[0, typeLabel.length]];
const label = new vscode.TreeItemLabel(labelText, highlightRanges);
const treeItem = new vscode.TreeItem(label, collapsibleState);
```

### Highlight Range Strategy

Initially, highlight ranges will be calculated but not styled (empty visual change). The ranges will be:
- **Type prefix**: `[0, typeLabel.length]` (e.g., "Story" in "Story S75 - Title")

This prepares the infrastructure for S102 to apply color styling without requiring code changes.

### Status Group Handling

Status group nodes (collapsible folders) continue using plain string labels - only planning items use TreeItemLabel. This separation ensures:
- Status groups remain simple/lightweight
- TreeItemLabel used only where needed (planning items)
- Clear separation of concerns

## Key Integration Points

**Files Modified:**
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (getTreeItem method, lines ~815-915)
- `vscode-extension/src/treeview/labelFormatter.ts` (export getTypeLabel function)

**Dependencies:**
- S99: Type label formatter utility (provides getTypeLabel function)
- S100: Label formatter integration (provides formatItemLabel function)
- VSCode API: TreeItemLabel constructor (vscode.TreeItemLabel)

**Integration Flow:**
```
formatItemLabel(item) → labelText string
  ↓
getTypeLabel(item.type) → typeLabel string
  ↓
Calculate highlight ranges: [[0, typeLabel.length]]
  ↓
new vscode.TreeItemLabel(labelText, highlightRanges)
  ↓
new vscode.TreeItem(label, collapsibleState)
```

## Risks and Considerations

### Low-Risk Factors
- **Minimal code change**: Only affects label creation in getTreeItem()
- **Backward compatible**: TreeItemLabel is supported by current VSCode engine (^1.80.0)
- **No visual change**: Highlight ranges prepared but not styled yet
- **Isolated change**: No impact on cache, hierarchy, or refresh logic

### Potential Issues
- **API unavailability**: If VSCode version < 1.76, TreeItemLabel may not exist
  - **Mitigation**: Current package.json requires ^1.80.0 (already above 1.76)
  - **No action needed**: All users will have TreeItemLabel support

- **Highlight rendering**: Default highlighting uses blue selection color
  - **Impact**: Minimal (highlights not styled until S102)
  - **Future enhancement**: S102 will explore color customization options

- **Performance**: Creating TreeItemLabel objects adds minor overhead
  - **Impact**: Negligible (TreeItems created lazily, not eagerly)
  - **Measurement**: Monitor TreeView rendering performance in tests

## Codebase Analysis Summary

### Current State (S100)
- `formatItemLabel()` generates label strings in format: "Type # - Title"
- `getTypeLabel()` maps ItemType to display labels (e.g., "story" → "Story")
- Both functions are in `labelFormatter.ts` module
- `getTreeItem()` uses `formatItemLabel()` at line 841

### Required Changes
1. **Export getTypeLabel()** from labelFormatter.ts (currently private)
2. **Import vscode.TreeItemLabel** in PlanningTreeProvider.ts
3. **Modify getTreeItem()** to create TreeItemLabel instead of plain string
4. **Calculate highlight ranges** using type label length
5. **Preserve status group logic** (no TreeItemLabel for status groups)

### Test Coverage
- Extension has manual testing workflow (package → install → reload)
- Output channel logs for debugging (Ctrl+Shift+P → "View: Toggle Output" → "Cascade")
- No automated tests exist yet (TDD framework is Godot-based, not VSCode extension)

## Next Steps After Completion

Once S101 is complete and merged:
1. **S102: Color Coding** - Apply color styling to highlight ranges
2. **Performance testing** - Measure TreeView rendering with 100+ items
3. **User feedback** - Gather feedback on visual appearance
4. **Future enhancements** - Explore additional TreeItemLabel capabilities (tooltip styling, custom colors, etc.)

---

**Implementation Phases:**
1. Phase 1: Core API Migration → `tasks/01-core-api-migration.md`
2. Phase 2: Validation and Testing → `tasks/02-validation-testing.md`
