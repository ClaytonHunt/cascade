---
spec: S81
title: Badge Renderer Utility
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-24
updated: 2025-10-24
---

# S81 - Badge Renderer Utility

## Implementation Strategy

This specification implements a standalone badge renderer utility that converts Status values into color-coded text badges using VSCode Codicon syntax. The utility provides a centralized, reusable function for badge generation that can be integrated into the TreeView rendering pipeline in S82.

### Context and Analysis

**Existing Status Rendering:**
- Current implementation uses `treeItem.description` for plain text status (PlanningTreeProvider.ts:639-647)
- Status icons already implemented via `getTreeItemIcon()` in statusIcons.ts using ThemeIcon
- TreeItem supports Codicon syntax in description field: `$(icon-name) Text`
- No badge rendering currently exists - status displayed as plain text

**VSCode Codicon Integration:**
- VSCode TreeView descriptions support `$(icon-name)` syntax for inline icons
- Codicons automatically adapt to light/dark themes
- Semantic color theming via ThemeColor (already used for TreeItem icons)
- No ANSI codes or custom HTML needed (simpler than originally anticipated)

**Testing Patterns:**
- Existing test suite uses pure unit tests with mock objects (statusIcons.test.ts, treeItemRendering.test.ts)
- Test patterns: Arrange (create mock) → Act (call function) → Assert (verify output)
- Performance tests not currently in test suite (will add for S81)
- Tests run via `npm test` command

### Architecture Decisions

1. **Pure Function Design:**
   - `renderStatusBadge(status: Status): string` is a pure function (no side effects)
   - Same input always produces same output (deterministic, testable, cacheable)
   - No external dependencies except Status type

2. **Static Badge Mapping:**
   - Use Record<Status, string> for O(1) lookup performance
   - Static mapping eliminates dynamic calculations (< 1ms per call)
   - Codicon names chosen for semantic meaning (aligned with existing statusIcons.ts)

3. **Fallback Strategy:**
   - Unknown status returns plain status string (graceful degradation)
   - No exceptions thrown (fail-safe design)
   - Matches existing pattern in getTreeItemIcon() (statusIcons.ts:130)

4. **File Location:**
   - Place in `vscode-extension/src/treeview/badgeRenderer.ts` (co-located with TreeView code)
   - Consistent with existing TreeView utilities (archiveUtils.ts, PlanningTreeItem.ts)
   - Separate from statusIcons.ts (different responsibility: text badges vs ThemeIcon objects)

### Key Integration Points

**Current Integration:**
- PlanningTreeProvider.ts:639-647 - Status description rendering (will be enhanced in S82)
- types.ts:14 - Status type definition (dependency)
- statusIcons.ts - Codicon reference for consistency (different output format)

**Future Integration (S82):**
- PlanningTreeProvider will import and use renderStatusBadge()
- Replace plain text status with badge format in treeItem.description
- Maintain compatibility with existing progress display (e.g., "$(sync) In Progress (3/5)")

### Risks and Considerations

1. **VSCode API Compatibility:**
   - Risk: Codicon syntax not supported in older VSCode versions
   - Mitigation: VSCode API 1.60+ required (package.json engines field), Codicons stable since 1.50
   - Impact: Low (extension already requires modern VSCode)

2. **Performance:**
   - Risk: Badge rendering called frequently during TreeView refresh (100+ items)
   - Mitigation: Static lookup table (O(1)), pure function (JIT optimization), < 1ms per call
   - Impact: Low (10ms total for 1000 calls per performance acceptance criteria)

3. **Icon/Badge Consistency:**
   - Risk: Badge icons diverge from TreeItem status icons (user confusion)
   - Mitigation: Use same Codicon names as statusIcons.ts mapping
   - Impact: Low (intentional design alignment)

4. **Testing Coverage:**
   - Risk: Missing edge cases in unit tests
   - Mitigation: Test all 7 Status values + unknown status fallback + performance benchmark
   - Impact: Low (comprehensive test plan in Phase 2)

### Phase Overview

**Phase 1: Badge Renderer Implementation**
- Create badgeRenderer.ts file
- Implement renderStatusBadge() function
- Define static badge mapping for all Status values
- Add fallback handling for unknown status

**Phase 2: Unit Testing**
- Create test suite for badge renderer
- Test all Status value mappings
- Test unknown status fallback
- Test badge format correctness

**Phase 3: Performance Validation**
- Add performance benchmark test
- Validate < 1ms per call requirement
- Validate 1000 calls < 10ms requirement
- Verify pure function behavior (determinism)

### Success Criteria

- ✅ All 7 Status values map to distinct badges with Codicon syntax
- ✅ Badge format: `$(icon-name) Status Text`
- ✅ Unknown status returns plain text fallback
- ✅ Badge generation < 1ms per call
- ✅ 1000 badge generations < 10ms
- ✅ Unit tests achieve 100% coverage
- ✅ All tests pass (npm test)

### Files to Create

- `vscode-extension/src/treeview/badgeRenderer.ts` - Badge rendering utility
- `vscode-extension/src/test/suite/badgeRenderer.test.ts` - Unit and performance tests

### Files to Modify

None (S81 is purely additive - S82 will integrate with TreeView)

### Next Steps After Completion

Run `/build specs/S81-badge-renderer-utility/plan.md` to begin TDD implementation with RED-GREEN-REFACTOR cycle.
