---
item: S84
title: Badge Performance Validation
type: story
parent: F23
status: Archived
priority: Low
dependencies: [S82]
estimate: XS
created: 2025-10-24
updated: 2025-10-25
---

# S84 - Badge Performance Validation

## Description

Validate that badge rendering does not introduce performance regressions in TreeView refresh times. This story uses the existing performance testing infrastructure (documented in CLAUDE.md) to measure badge rendering overhead with large datasets.

Ensures badge generation meets the < 1ms per item target and TreeView refresh stays under 500ms with 100+ items.

## Acceptance Criteria

1. **Generate Test Data**:
   - [ ] Use `generate-test-data.js` to create 100 synthetic planning files
   - [ ] Ensure test data includes variety of status values (all 7 types)
   - [ ] Place test data in `test-plans-100/` directory

2. **Performance Measurement**:
   - [ ] Open Cascade Output Channel to view timing logs
   - [ ] Trigger TreeView refresh with test data loaded
   - [ ] Record timing logs from output channel:
     - `[ItemsCache] Loaded X items in Yms`
     - `[StatusGroups] Built X groups in Yms`
     - `[Hierarchy] Built hierarchy in Yms`

3. **Performance Targets**:
   - [ ] TreeView refresh < 500ms with 100+ items (unchanged from baseline)
   - [ ] Badge rendering overhead < 10ms total (< 0.1ms per item)
   - [ ] Cache hit rate > 80% after initial load (unchanged)

4. **Baseline Comparison**:
   - [ ] Record baseline timing BEFORE badge integration (use git checkout)
   - [ ] Record timing AFTER badge integration
   - [ ] Calculate overhead: (After - Before) / Before * 100%
   - [ ] Document overhead in performance results file

5. **Profiling (if needed)**:
   - [ ] If overhead > 5%, use VSCode DevTools profiler
   - [ ] Identify bottleneck (badge generation vs. string concatenation)
   - [ ] Optimize if necessary (e.g., cache badge strings)

## Technical Notes

**Performance Testing Workflow** (from CLAUDE.md):
```bash
# 1. Generate test data
cd vscode-extension/scripts
node generate-test-data.js 100 test-plans-100

# 2. Open VSCode with test workspace
code D:/projects/lineage

# 3. Open Cascade Output Channel
# Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade"

# 4. Expand Cascade TreeView
# Activity Bar → Cascade icon

# 5. Read timing logs
# [ItemsCache] Loaded 100 items in 45ms
# [StatusGroups] Built 7 groups in 12ms
# [Hierarchy] Built hierarchy in 23ms

# 6. Compare to baseline
```

**Expected Overhead**:
Badge rendering is pure string concatenation:
- Input: `'In Progress'`
- Output: `'$(sync) In Progress'`
- Overhead: ~0.01ms per item (negligible)

**Performance Targets** (from CLAUDE.md):
- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- Hierarchy expansion < 50ms per level
- Cache hit rate > 80% after initial load

**Profiling with DevTools** (if needed):
- Ctrl+Shift+P → "Developer: Toggle Developer Tools"
- Switch to "Performance" tab
- Click "Record" button
- Expand TreeView
- Stop recording
- Analyze flame graph for `renderStatusBadge()` calls

## Files to Create/Update

- `vscode-extension/performance-results.md` - Add S84 performance test results

## Testing Strategy

1. **Baseline Test** (no badges):
   - Checkout commit before S81/S82
   - Generate test data
   - Record timing logs
   - Document baseline: "TreeView refresh: 123ms"

2. **Badge Test** (with badges):
   - Checkout commit after S82
   - Use same test data
   - Record timing logs
   - Document result: "TreeView refresh: 127ms"

3. **Overhead Calculation**:
   - Overhead = (127ms - 123ms) / 123ms = 3.2%
   - Acceptable if < 5%

4. **Edge Case Test**:
   - Test with 200 items (stress test)
   - Verify TreeView still responsive
   - Verify no UI lag or jank

## Success Metrics

- Badge rendering overhead < 5%
- TreeView refresh time < 500ms with 100 items
- No observable lag or jank when expanding status groups
- Performance results documented in `performance-results.md`
