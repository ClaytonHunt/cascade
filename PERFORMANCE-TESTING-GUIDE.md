# Performance Testing Guide - S58 Optimization

This guide provides step-by-step instructions for executing manual performance tests to validate the items cache optimization (S58 Phase 1).

## Prerequisites

1. **Extension Built and Packaged:**
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   npm run package
   ```

2. **Test Datasets Generated:**
   ```bash
   cd vscode-extension/scripts
   node generate-test-data.js 50 test-plans-50
   node generate-test-data.js 100 test-plans-100
   node generate-test-data.js 200 test-plans-200
   ```

3. **Performance Results Template Ready:**
   - File: `vscode-extension/performance-results.md`
   - Fill in metrics during testing

## Task 2: Run Performance Tests with Different Dataset Sizes

### Scenario 1: Baseline (Current Workspace - 84 items)

**Setup:**
1. Open current workspace (lineage project)
2. Ensure extension is installed: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"

**Testing:**
1. Open Cascade Output Channel:
   - Ctrl+Shift+P → "View: Toggle Output"
   - Select "Cascade" from dropdown

2. Open Cascade TreeView (Activity Bar - Cascade icon)

3. **Record Initial Load Time:**
   - Look for: `[ItemsCache] Loaded X items in Yms`
   - Look for: `[StatusGroups] Built 6 status groups in Yms`
   - Record values in `performance-results.md` under "Scenario 1"

4. **Measure Status Group Expansion:**
   - Expand "Ready" status group
   - Look for: `[Hierarchy] Built hierarchy for Ready: X root nodes in Yms`
   - Record value in performance-results.md

5. **Measure Cache Hit Rate:**
   - Expand all 6 status groups in sequence
   - Count "Cache HIT" vs "Cache MISS" logs
   - Calculate percentage: (HITs / (HITs + MISSes)) * 100
   - Record in performance-results.md

6. **Test Cache Invalidation:**
   - Edit any file in plans/ directory (change a status)
   - Save file
   - Observe Output Channel for cache clear logs
   - Expand status group again
   - Verify cache MISS followed by cache HITs
   - Record refresh cycle time

**Expected Results:**
- Initial load: < 500ms
- Status expansion: < 100ms
- Cache hit rate: > 80%

---

### Scenario 2: Small Dataset (50 items)

**Setup:**
1. Create temporary workspace:
   ```bash
   mkdir temp-workspace-50
   cp -r vscode-extension/scripts/test-plans-50 temp-workspace-50/plans
   code temp-workspace-50
   ```

2. Install extension in new window:
   ```bash
   code --install-extension vscode-extension/cascade-0.1.0.vsix --force
   ```

3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"

**Testing:**
- Follow same steps as Scenario 1
- Record metrics in "Scenario 2" section of performance-results.md

---

### Scenario 3: Medium Dataset (100 items) ⭐ PRIMARY TARGET

**Setup:**
1. Create temporary workspace:
   ```bash
   mkdir temp-workspace-100
   cp -r vscode-extension/scripts/test-plans-100 temp-workspace-100/plans
   code temp-workspace-100
   ```

2. Install extension and reload

**Testing:**
- Follow same steps as Scenario 1
- Record metrics in "Scenario 3" section
- **This is the primary validation scenario** - all targets must be met

**Critical Metrics:**
- [ ] TreeView refresh < 500ms
- [ ] Status group expansion < 100ms
- [ ] Hierarchy expansion < 50ms
- [ ] Cache hit rate > 80%

---

### Scenario 4: Large Dataset (200 items) - Stress Test

**Setup:**
1. Create temporary workspace:
   ```bash
   mkdir temp-workspace-200
   cp -r vscode-extension/scripts/test-plans-200 temp-workspace-200/plans
   code temp-workspace-200
   ```

2. Install extension and reload

**Testing:**
- Follow same steps as Scenario 1
- Record metrics in "Scenario 4" section
- Note any performance degradation compared to 100-item scenario

---

## Task 3: Stress Testing

### Test 1: Rapid File Changes

**Scenario:** Test file watcher debouncing under rapid file saves

**Steps:**
1. Use 100-item test workspace
2. Open 5-10 planning files in editor
3. Make changes to each file (modify status or title)
4. Save all files rapidly (Ctrl+S on each within 1 second)
5. Observe Output Channel for FILE_CHANGED events

**Expected:**
- File watcher debouncing batches changes
- Single refresh triggered after 300ms debounce delay
- Output shows: Multiple FILE_CHANGED events → Single cache clear → Single refresh

**Record:** Pass/Fail in performance-results.md "Stress Test Results"

---

### Test 2: Concurrent Status Group Expansions

**Scenario:** Test TreeView responsiveness under rapid interactions

**Steps:**
1. Use 100-item test workspace
2. Collapse all status groups (if expanded)
3. Rapidly click to expand all 6 status groups (as fast as possible)
4. Observe TreeView behavior

**Expected:**
- No UI freezing or lag
- All groups expand smoothly
- No errors in Output Channel
- Cache HITs for all expansions after first

**Record:** Pass/Fail in performance-results.md

---

### Test 3: Deep Hierarchy Navigation

**Scenario:** Test hierarchy expansion performance at multiple levels

**Steps:**
1. Use 200-item test workspace (more hierarchy depth)
2. Find an Epic with nested Features and Stories
3. Expand Epic → Observe timing
4. Expand Feature under that Epic → Observe timing
5. Expand multiple levels rapidly

**Expected:**
- Each level expands in < 50ms (check Output Channel logs)
- No noticeable lag between clicks and expansion
- Smooth navigation experience

**Record:** Pass/Fail and timing notes in performance-results.md

---

### Test 4: Memory Stability

**Scenario:** Test for memory leaks over extended session

**Steps:**
1. Use 200-item test workspace
2. Open Task Manager (Windows) or Activity Monitor (Mac)
3. Find VSCode process, note memory usage (baseline)
4. Trigger 20+ cache invalidations:
   - Edit files, save, observe TreeView update
   - Repeat 20 times over 5-10 minutes
5. Note memory usage after 20 cycles

**Expected:**
- Memory usage stable (no significant growth)
- Extension process stays under 100MB
- No continuous memory growth pattern

**Record:** Baseline memory, final memory, result (Pass/Fail) in performance-results.md

---

## Task 4: Profile with VSCode DevTools

### Setup Profiling

**Steps:**
1. Use 100-item test workspace
2. Open VSCode Developer Tools:
   - Ctrl+Shift+P → "Developer: Toggle Developer Tools"
3. Switch to "Performance" tab in DevTools

### Record Performance Profile

**Steps:**
1. Click "Record" button (red circle)
2. Perform these operations:
   - Open Cascade TreeView (initial load)
   - Expand 2-3 status groups
   - Edit a file and save (trigger refresh)
   - Expand another status group
3. Stop recording after ~10 seconds
4. Wait for flame graph to render

### Analyze Flame Graph

**Look for:**
- ⚠️ Long synchronous operations (> 100ms blocks)
- ⚠️ Repeated file system calls (should be cached)
- ⚠️ Memory allocation spikes (GC pressure)
- ✅ Most operations < 50ms (cached)
- ✅ `loadAllPlanningItemsUncached()` called only once per refresh
- ✅ No excessive GC activity

**Document:**
1. Take screenshot of flame graph
2. Note any methods taking > 50ms
3. Identify any bottlenecks
4. Compare time spent in cached vs uncached operations
5. Add findings to performance-results.md

### Export Profile (Optional)

**Steps:**
1. Click "Save Profile" button in Performance tab
2. Export as JSON
3. Store in `vscode-extension/profiling/` directory
4. Document filename and scenario in performance-results.md

---

## Task 5: Document Performance Characteristics

After completing all tests above:

1. **Fill Performance Results Template:**
   - Complete all "[To be measured]" fields in performance-results.md
   - Fill timing tables with actual data
   - Check/uncheck target compliance checkboxes
   - Update summary section with overall assessment

2. **Calculate Metrics:**
   - Cache hit rate percentage
   - Performance improvement vs baseline
   - Memory usage per item
   - Scalability assessment

3. **Write Recommendations:**
   - Production readiness assessment
   - Future optimization opportunities
   - Monitoring recommendations

4. **Document Issues:**
   - Any problems encountered during testing
   - Unexpected behavior or edge cases
   - Lessons learned

---

## Completion Checklist

Phase 2 is complete when:

- [ ] All 4 performance test scenarios executed
- [ ] Metrics recorded in performance-results.md
- [ ] All 4 stress tests executed and documented
- [ ] VSCode DevTools profiling completed
- [ ] Performance characteristics documented
- [ ] Recommendations section filled
- [ ] Summary assessment completed
- [ ] All targets met for 100-item scenario:
  - [ ] TreeView refresh < 500ms
  - [ ] Status group expansion < 100ms
  - [ ] Hierarchy expansion < 50ms
  - [ ] Cache hit rate > 80%

---

## Troubleshooting

### Extension Not Loading
- Verify installation: `code --list-extensions | grep cascade`
- Check Output Channel for activation errors
- Reload window: Ctrl+Shift+P → "Developer: Reload Window"

### No Timing Logs Appearing
- Verify you're viewing "Cascade" Output Channel (not "Extension Host")
- Check that Phase 1 optimization was implemented (timing logs added)
- Try manual refresh: Ctrl+Shift+P → "Cascade: Refresh TreeView"

### TreeView Not Displaying Items
- Verify plans/ directory exists in workspace
- Check that test data has valid frontmatter
- Look for errors in Output Channel or Debug Console (F12)

### Performance Worse Than Expected
- Check if other extensions are interfering
- Disable antivirus scanning for workspace directory
- Ensure test data is on SSD (not HDD or network drive)
- Check for background processes using disk I/O

---

## Next Steps After Testing

1. **If all targets met:**
   - Update Phase 2 status to "Completed"
   - Commit performance-results.md with actual data
   - Proceed to Phase 3 (Documentation and Polish)

2. **If targets not met:**
   - Document specific failures in performance-results.md
   - Analyze bottlenecks from profiling data
   - Consider additional optimization (partial cache invalidation, etc.)
   - Consult with team on acceptable performance trade-offs

3. **Phase 3 Preview:**
   - Document cache architecture in code comments
   - Update CLAUDE.md with performance testing guidance
   - Create troubleshooting guide
   - Final validation and polish
