---
item: S97
title: Spec Integration End-to-End Testing
type: story
parent: F25
status: Completed
priority: Medium
dependencies: [S93, S94, S95, S96]
estimate: S
spec: specs/S97-spec-integration-testing
created: 2025-10-26
updated: 2025-10-28
---

# S97 - Spec Integration End-to-End Testing

## Description

Comprehensive end-to-end testing and validation of the spec phase integration feature. This story ensures all components work together correctly in real-world scenarios, validates performance targets, and verifies edge cases are handled gracefully.

This includes manual testing workflows, performance validation with realistic data, and verification of the complete user experience from spec creation to TreeView display.

## Acceptance Criteria

1. **End-to-End Workflow Testing**:
   - [ ] Create story with spec field in frontmatter
   - [ ] Create spec directory with plan.md and phase files
   - [ ] Verify indicator appears in TreeView
   - [ ] Edit phase file (mark as completed)
   - [ ] Verify TreeView updates automatically (cache invalidation)
   - [ ] Check tooltip shows correct phase counts

2. **Sync Status Testing**:
   - [ ] Create story with status "Ready"
   - [ ] Create spec with status "Completed"
   - [ ] Verify sync warning (⚠️) appears in TreeView
   - [ ] Verify tooltip suggests running /sync
   - [ ] Run /sync command
   - [ ] Verify sync warning disappears after sync

3. **Performance Validation**:
   - [ ] Load TreeView with 50+ stories (mix with/without specs)
   - [ ] Measure initial load time (< 500ms)
   - [ ] Measure refresh time after cache warmed (< 100ms)
   - [ ] Verify cache hit rate > 80%
   - [ ] Check output channel for cache stats logs
   - [ ] No observable lag during TreeView interactions

4. **Edge Case Testing**:
   - [ ] Story without spec field → no indicator shown
   - [ ] Story with invalid spec path → no error, no indicator
   - [ ] Spec with 0 phases → shows "Phase 0/0"
   - [ ] Spec with malformed frontmatter → graceful fallback
   - [ ] Spec directory deleted → cache invalidated, no indicator
   - [ ] Phase count mismatch (frontmatter vs files) → uses file count

5. **Cache Invalidation Testing**:
   - [ ] View story with spec in TreeView
   - [ ] Edit spec plan.md (change phase count)
   - [ ] Verify TreeView updates indicator
   - [ ] Edit phase file (mark completed)
   - [ ] Verify TreeView updates completed count
   - [ ] Check output channel logs cache invalidation

6. **Multi-Story Testing**:
   - [ ] Load TreeView with multiple stories, various spec states:
     - Story with no spec
     - Story with spec not started (0/3)
     - Story with spec in progress (2/3)
     - Story with spec completed (3/3)
     - Story with spec out of sync
   - [ ] Verify each displays correct indicator
   - [ ] Verify tooltips accurate for each

## Testing Workflow

### Manual Test Script

**Test 1: Basic Spec Indicator Display**

1. Create test story in plans/:
   ```yaml
   ---
   item: S999
   title: Test Story
   type: story
   parent: F25
   status: Ready
   spec: specs/story-999-test
   ---
   ```

2. Create spec directory:
   ```
   specs/story-999-test/
   ├── plan.md (frontmatter: phases: 3, status: In Progress)
   └── tasks/
       ├── phase-1.md (status: Completed)
       ├── phase-2.md (status: In Progress)
       └── phase-3.md (status: Not Started)
   ```

3. Open Cascade TreeView

4. Verify story shows: `📋 ↻ Phase 1/3`

5. Open tooltip

6. Verify shows:
   - Directory: specs/story-999-test
   - Phases: 1/3 complete
   - Status: In Progress

**Test 2: Cache Invalidation**

1. With TreeView open from Test 1

2. Edit `specs/story-999-test/tasks/phase-2.md`

3. Change status to "Completed"

4. Save file

5. Wait 2 seconds (debounce)

6. Verify TreeView indicator updates to: `📋 ↻ Phase 2/3`

7. Check output channel

8. Verify logs: `[SpecProgressCache] Invalidated cache for S999`

**Test 3: Sync Warning Display**

1. Edit test story frontmatter: change status to "Ready"

2. Edit spec plan.md: change status to "Completed"

3. Edit all phase files: change status to "Completed"

4. Refresh TreeView

5. Verify indicator shows: `⚠️ 📋 ✓ Phase 3/3`

6. Open tooltip

7. Verify warning message: "Spec and Story status out of sync - run /sync to update"

**Test 4: Performance Validation**

1. Use test data generator: `node generate-test-data.js 50 test-plans`

2. Add spec field to 30 stories (60% with specs)

3. Create corresponding spec directories

4. Open Cascade TreeView

5. Measure initial load time (Output channel: TreeView refresh time)

6. Expand all status groups

7. Collapse and re-expand

8. Verify smooth interaction (no lag)

9. Wait 60 seconds

10. Check output channel for cache stats

11. Verify hit rate > 80%

### Performance Targets

- **Initial load**: < 500ms (with 50+ stories, 30+ specs)
- **Refresh (cached)**: < 100ms
- **Cache hit rate**: > 80% after initial load
- **File watcher response**: < 2s from edit to TreeView update
- **No UI blocking**: TreeView remains responsive during spec reading

## Dependencies

- S93 (Spec Progress Reader) - Core reading logic
- S94 (Spec Progress Cache) - Cache implementation
- S95 (Spec Phase Renderer) - Indicator formatting
- S96 (TreeView Integration) - Display in TreeView
- Test data generator script (for performance testing)

## Testing Artifacts

1. **Test Stories**: Create test-plans/ directory with test data
2. **Test Specs**: Create test-specs/ directory with spec fixtures
3. **Test Report**: Document test results and performance measurements
4. **Screenshots**: Capture TreeView with indicators for documentation

## Files to Create

1. **Test Script**: `vscode-extension/manual-tests/spec-integration-test.md`
   - Step-by-step manual test instructions
   - Expected results for each test case
   - Performance measurement procedures

2. **Test Fixtures**: `vscode-extension/test-fixtures/spec-integration/`
   - Sample story files with spec fields
   - Sample spec directories with phases
   - Various sync status combinations

3. **Performance Report**: `vscode-extension/performance-results.md` (update)
   - Add F25 performance test results
   - Cache hit rates
   - Refresh timing measurements

## Success Metrics

- All manual tests pass with expected results
- Performance targets met (< 500ms load, > 80% cache hit rate)
- No errors or exceptions in output channel
- Edge cases handled gracefully (no crashes)
- Sync warnings accurately identify status mismatches
- Cache invalidation responds to file changes within 2 seconds
- TreeView remains responsive with 50+ stories with specs

## Verification Checklist

- [ ] Spec indicators display for all stories with specs
- [ ] Stories without specs show no indicator (clean display)
- [ ] Phase counts accurate (match spec directory state)
- [ ] Sync warnings visible for out-of-sync stories
- [ ] Cache invalidation works (edit spec → TreeView updates)
- [ ] Performance targets met
- [ ] Cache hit rate > 80%
- [ ] No console errors or warnings
- [ ] Tooltips show detailed spec information
- [ ] File watcher responds to spec changes
- [ ] Output channel logs cache stats every 60s
- [ ] Edge cases handled (invalid paths, malformed data)

## Notes

- This story validates the entire F25 feature is production-ready
- Performance testing critical to ensure scalability
- Edge case testing prevents future bug reports
- Manual testing complements automated unit/integration tests
- Document any issues found for future iteration improvements
- Consider creating automated E2E tests using VSCode extension test framework
- Test with various workspace sizes (small, medium, large)
- Verify behavior across VSCode themes (light, dark, high contrast)
