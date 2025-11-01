---
spec: S100
title: TreeItem Label Integration
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-28
updated: 2025-10-28
---

# S100 - TreeItem Label Integration

## Implementation Strategy

This specification details the integration of the `formatItemLabel()` utility (from S99) into the `PlanningTreeProvider.getTreeItem()` method. The implementation replaces inline label formatting with a centralized formatter function to display enhanced type-prefixed labels throughout the TreeView.

**Current State (Line 840):**
```typescript
const label = `${element.item} - ${element.title}`;
// Example: "S75 - Archive Detection"
```

**Target State:**
```typescript
const label = formatItemLabel(element);
// Example: "Story S75 - Archive Detection"
```

### Architecture Decisions

1. **Import Location**: Add `formatItemLabel` import at the top of `PlanningTreeProvider.ts` alongside existing utility imports (line ~13).

2. **Scope of Change**:
   - **Modified**: `getTreeItem()` method label assignment (line 840)
   - **Unchanged**: Status group label formatting (line 821)
   - **Unchanged**: Description field (badges, progress bars, spec phase indicators)
   - **Unchanged**: All other TreeItem properties

3. **Status Group Handling**: Status groups (`element.type === 'status-group'`) return early before reaching the label formatting code, so they remain unaffected by this change.

4. **Backward Compatibility**: The change is purely visual (label format only). All existing TreeView functionality continues to work:
   - Click handling (line 908)
   - Icon mapping (line 851)
   - Tooltip generation (line 857)
   - Badge rendering (line 861)
   - Progress bars (line 870)
   - Spec phase indicators (line 887)

### Key Integration Points

1. **PlanningTreeProvider.getTreeItem()** (line 814-915):
   - Label formatting (line 840) ← **Integration point**
   - TreeItem property assignment (line 846)
   - Description field logic (line 861-901) ← Unchanged

2. **Existing Imports** (line 1-13):
   - Add `formatItemLabel` import from `./labelFormatter`
   - Position after `renderSpecPhaseIndicator` import (line 13)

3. **Testing Infrastructure**:
   - Unit tests: `labelFormatter.test.ts` (S99 coverage)
   - Integration tests: `treeItemRendering.test.ts` (existing TreeItem rendering tests)
   - Manual verification: Install extension, open TreeView, verify all item types

### Risk Assessment

**Low Risk** - This is a minimal change with strong isolation:

✅ **Mitigations**:
- Function already tested in S99 (100% unit test coverage)
- Single line change (minimal surface area)
- Type-safe (TypeScript compiler enforces PlanningTreeItem interface)
- Status groups protected by early return (line 816-835)
- Description field logic untouched (badges/progress preserved)

⚠️ **Potential Issues**:
- Long type labels may exceed TreeView width (mitigated: VSCode truncates labels automatically)
- Performance degradation (mitigated: O(1) string interpolation, negligible overhead)

### Phase Overview

**Phase 1: Import and Integration** (Estimated: 5 minutes)
- Add import statement
- Replace inline label formatting
- Verify compilation

**Phase 2: Testing and Verification** (Estimated: 10 minutes)
- Run existing test suite
- Package and install extension
- Manual verification across all item types
- Verify badges/progress bars/spec indicators unaffected

**Total Estimated Time**: 15 minutes

---

## Codebase Analysis Summary

### Files to Modify
1. `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Line 13: Add import
   - Line 840: Replace label formatting

### Files Referenced (No Changes)
1. `vscode-extension/src/treeview/labelFormatter.ts` (S99)
2. `vscode-extension/src/test/suite/labelFormatter.test.ts` (S99)
3. `vscode-extension/src/test/suite/treeItemRendering.test.ts` (existing)

### External Dependencies
- **VSCode API**: `vscode.TreeItem` (no changes to usage)
- **TypeScript**: Compiler ensures type safety

### Godot APIs Used
- None (VSCode extension only)

---

## Implementation Phases

1. **Phase 1: Import and Integration** - `tasks/01-import-integration.md`
   - Add import statement
   - Replace inline label formatting
   - Verify compilation

2. **Phase 2: Testing and Verification** - `tasks/02-testing-verification.md`
   - Run existing test suite
   - Package and install extension
   - Manual verification
   - Verify backward compatibility

---

## Next Steps

Run `/build specs/S100-treeitem-label-integration/plan.md` to begin TDD implementation.
