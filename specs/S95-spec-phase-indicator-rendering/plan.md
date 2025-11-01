---
spec: S95
title: Spec Phase Indicator Rendering
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-27
updated: 2025-10-27
---

# S95 - Spec Phase Indicator Rendering

## Overview

Create a rendering utility that formats SpecProgress data into compact visual indicators for TreeView display. The renderer generates strings like "📋 ✓ Phase 3/3" or "📋 ↻ Phase 2/3" that show spec presence, completion status, and phase progress.

This follows the same architectural pattern as `badgeRenderer.ts` (S81) and `progressRenderer.ts` (S89), providing a pure rendering function that takes progress data and returns formatted strings.

## Implementation Strategy

### Architecture Pattern

This implementation follows the established **Renderer Pattern** used throughout the extension:

1. **Pure Function Design**: Stateless function with no side effects
2. **Constant-Based Icons**: Module-level constants for Unicode icons
3. **Performance First**: O(1) operations for high-frequency calls
4. **Comprehensive Documentation**: JSDoc with examples and specifications

### Key Design Decisions

**1. Icon Selection Strategy**

Use Unicode icons that are universally supported:
- `📋` (U+1F4CB) - Clipboard for spec presence
- `✓` (U+2713) - Checkmark for completion
- `↻` (U+21BB) - Refresh/cycle for in-progress
- `○` (U+25CB) - Empty circle for not started
- `⚠️` (U+26A0) - Warning for out-of-sync

**Rationale**: These icons work across all VSCode themes and require no custom fonts.

**2. Format Specification**

Primary format: `"📋 {icon} Phase {completed}/{total}"`

With sync warning: `"⚠️ 📋 {icon} Phase {completed}/{total}"`

**Rationale**:
- Clipboard icon immediately identifies spec presence
- Status icon provides at-a-glance completion state
- Phase count gives precise progress information
- Warning prefix highly visible for out-of-sync conditions

**3. Edge Case Handling**

- `null` progress → return empty string (no spec present)
- `0/0` phases → display as-is (malformed spec edge case)
- `completed > total` → display actual values (data integrity issue)

**Rationale**: Defensive programming ensures renderer never crashes TreeView rendering.

## Integration Points

### 1. PlanningTreeProvider (vscode-extension/src/treeview/PlanningTreeProvider.ts:879)

Current TODO comment marks integration point:
```typescript
// S95 TODO: For stories with specs, append phase indicator
// Example: "$(sync) In Progress [2/3]" (phase 2 of 3)
```

Integration will:
1. Call `getSpecProgressCached()` to retrieve SpecProgress
2. Call `renderSpecPhaseIndicator()` to format indicator
3. Append indicator to TreeItem.description after status badge

### 2. SpecProgress Interface (vscode-extension/src/treeview/specProgressReader.ts:74-101)

The renderer consumes the SpecProgress interface:
```typescript
interface SpecProgress {
  completedPhases: number;
  totalPhases: number;
  inSync: boolean;
  // ... other fields not used by renderer
}
```

**Note**: Renderer only needs 3 fields (completedPhases, totalPhases, inSync).

### 3. Spec Progress Cache (vscode-extension/src/treeview/PlanningTreeProvider.ts:198-204)

Cache provides performance optimization:
- Avoids redundant file system reads
- Target > 80% hit rate
- Renderer benefits from cached data without awareness

## Architecture Decisions

### Why Pure Function Pattern?

**Chosen**: Pure function with no state or side effects
**Alternative**: Class-based renderer with configuration

**Rationale**:
- Consistent with badgeRenderer.ts and progressRenderer.ts patterns
- Simpler to test (no setup/teardown required)
- No memory overhead (no instances created)
- Easier to understand and maintain

### Why Unicode Icons vs Codicon Syntax?

**Chosen**: Unicode emojis/symbols (📋, ✓, ↻, ○, ⚠️)
**Alternative**: VSCode Codicon syntax ($(...))

**Rationale**:
- More visually distinctive than monochrome Codicons
- Clipboard emoji (📋) clearly indicates spec presence
- Warning emoji (⚠️) highly visible for out-of-sync state
- Consistent with existing patterns in codebase
- No theme adaptation needed

### Why Inline Format vs Separate Lines?

**Chosen**: Inline format in TreeItem.description
**Alternative**: Multi-line tooltip or dedicated TreeItem field

**Rationale**:
- TreeItem.description designed for compact metadata
- Inline format maximizes information density
- Consistent with status badge + progress bar pattern
- No TreeView API changes required

## Risk Assessment

### Low Risk

- **Pattern Familiarity**: Exact same pattern as badgeRenderer.ts and progressRenderer.ts
- **No Breaking Changes**: Additive change, no existing functionality modified
- **Well-Defined Interface**: SpecProgress interface already implemented and tested (S93)
- **Cached Data Source**: SpecProgressCache (S94) provides fast data access

### Minimal Risk Areas

1. **Icon Rendering**: Unicode icons may render differently across fonts
   - **Mitigation**: Use universally supported Unicode characters
   - **Fallback**: VSCode defaults provide consistent rendering

2. **TreeView Space**: Description field has limited horizontal space
   - **Mitigation**: Compact format designed to fit alongside status badge
   - **Validation**: Visual testing with actual TreeView

3. **Performance**: High-frequency calls during TreeView rendering
   - **Mitigation**: Pure function with O(1) operations
   - **Validation**: Performance testing with 100+ items

## Phase Overview

### Phase 1: Core Renderer Implementation (S95 Phase 1)

**Scope**: Create specPhaseRenderer.ts module with pure rendering function

**Deliverables**:
- specPhaseRenderer.ts implementation
- Complete unit test suite
- Module exports validated

**Success Criteria**:
- All unit tests pass
- 100% code coverage
- No performance regressions

### Phase 2: TreeView Integration (S95 Phase 2)

**Scope**: Integrate renderer with PlanningTreeProvider

**Deliverables**:
- Updated getTreeItem() method
- Integration testing
- Visual validation in TreeView

**Success Criteria**:
- Spec indicators visible in TreeView
- TreeItem.description format correct
- No TreeView rendering issues
- Performance targets met (< 100ms TreeView refresh)

## Completion Criteria

**Phase 1 Complete When**:
- ✅ specPhaseRenderer.ts file created
- ✅ renderSpecPhaseIndicator() function implemented
- ✅ All icon constants exported
- ✅ Unit tests pass (100% coverage)

**Phase 2 Complete When**:
- ✅ getTreeItem() method updated with renderer integration
- ✅ Spec indicators visible in TreeView for stories with specs
- ✅ Sync warnings visible for out-of-sync specs
- ✅ TreeView performance maintained (< 100ms refresh with 100+ items)
- ✅ Visual testing confirms correct rendering

**Story S95 Complete When**:
- ✅ All phases completed
- ✅ Code reviewed and approved
- ✅ Documentation updated
- ✅ Extension packaged and tested locally

## References

- **S93**: Spec Progress Reader Utility (provides SpecProgress interface)
- **S94**: Spec Progress Cache Layer (provides cached data source)
- **S81**: Badge Renderer Utility (architectural pattern reference)
- **S89**: Progress Bar Rendering (architectural pattern reference)
- **S96**: TreeView Spec Indicator Integration (follows this story)
