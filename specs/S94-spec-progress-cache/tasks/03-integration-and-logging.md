---
spec: S94
phase: 3
title: Integration and Performance Logging
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 3: Integration and Performance Logging

## Overview

Wire up the spec progress cache in the TreeView rendering flow and add performance monitoring. This phase makes the cache operational and observable.

## Prerequisites

- Phase 1 completed (cache infrastructure exists)
- Phase 2 completed (FileSystemWatcher invalidates cache)
- Understanding of getTreeItem() rendering flow in PlanningTreeProvider

## Tasks

### Task 1: Update getTreeItem() to Use Cache (Future S95 Integration)

Prepare getTreeItem() for future integration with spec progress rendering (S95).

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Context**:

Currently, getTreeItem() does NOT call readSpecProgress() because S95 (Phase Indicator Rendering) is not yet implemented. This task documents where the cache integration WILL happen when S95 is implemented.

**Location**: Inside `getTreeItem()` method (around line 820-840, in the description rendering section)

**Current Code** (around line 820):

```typescript
// Set description (shows after label, dimmed)
// Generate status badge using effective status from above (S82)
const statusBadge = renderStatusBadge(effectiveStatus);

// For Epic/Feature/Project: Include progress indicator if children exist
if (element.type === 'epic' || element.type === 'feature' || element.type === 'project') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);

  if (progress) {
    // Has children - show status badge with progress bar (S90)
    const progressBar = renderProgressBar(progress);  // S89: Unicode bar generation
    treeItem.description = `${statusBadge} ${progressBar}`;
    // Example: "$(sync) In Progress █████░░░░░ 50% (3/5)"
  } else {
    // No children - show status badge only
    treeItem.description = statusBadge;
    // Example: "$(circle-filled) Ready"
  }
} else {
  // Leaf items (story, bug) - show status badge only (no progress)
  treeItem.description = statusBadge;
  // Example: "$(sync) In Progress"
}
```

**ADD COMMENT** before the leaf items section (around line 839):

```typescript
} else {
  // Leaf items (story, bug) - show status badge only (no progress)
  // S95 TODO: For stories with specs, append phase indicator
  // Example: "$(sync) In Progress [2/3]" (phase 2 of 3)
  //
  // Implementation:
  // if (element.type === 'story' && element.spec) {
  //   const specProgress = await this.getSpecProgressCached(element);
  //   if (specProgress) {
  //     const phaseIndicator = `[${specProgress.currentPhase}/${specProgress.totalPhases}]`;
  //     treeItem.description = `${statusBadge} ${phaseIndicator}`;
  //   } else {
  //     treeItem.description = statusBadge;
  //   }
  // } else {
  //   treeItem.description = statusBadge;
  // }
  treeItem.description = statusBadge;
  // Example: "$(sync) In Progress"
}
```

**Validation**:
- Comment added to document future S95 integration
- getSpecProgressCached() is NOT called yet (S95 will implement this)
- Code compiles without changes to runtime behavior

**Explanation**:

S94 provides the cache infrastructure, but S95 (Phase Indicator Rendering) will actually USE the cache to display phase indicators in the TreeView. This comment documents the integration point for S95 implementers.

### Task 2: Add Cache Stats Logging

Add periodic logging of cache hit/miss statistics for performance monitoring.

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Inside constructor, after existing progress cache stats logging (around line 325-333)

**Find this code** (around line 325):

```typescript
// Log progress cache statistics every 60 seconds (S91)
setInterval(() => {
  const total = this.progressCacheHits + this.progressCacheMisses;
  if (total > 0) {
    const hitRate = (this.progressCacheHits / total * 100).toFixed(1);
    this.outputChannel.appendLine(
      `[ProgressCache] Hit rate: ${hitRate}% (${this.progressCacheHits}/${total})`
    );
  }
}, 60000);
```

**Add after it** (new setInterval for spec progress cache):

```typescript
// Log spec progress cache statistics every 60 seconds (S94)
setInterval(() => {
  const total = this.specProgressCacheHits + this.specProgressCacheMisses;
  if (total > 0) {
    const hitRate = (this.specProgressCacheHits / total * 100).toFixed(1);
    this.outputChannel.appendLine(
      `[SpecProgressCache] Hit rate: ${hitRate}% (${this.specProgressCacheHits}/${total})`
    );
  }
}, 60000);
```

**Validation**:
- Code compiles without errors
- Logging interval is 60 seconds (same as ProgressInfo cache)
- Hit rate calculated as percentage with 1 decimal place
- Output channel uses consistent prefix: `[SpecProgressCache]`

**Explanation**:

This logging provides visibility into cache performance:
- **Hit rate**: Percentage of cache lookups that found cached data (target: > 80%)
- **Hits/Total**: Absolute numbers for debugging (e.g., "17/20" means 17 hits, 3 misses)
- **60-second interval**: Balances observability and log spam

### Task 3: Verify Cache Clearing on Manual Refresh

Test that manual TreeView refresh clears the spec progress cache.

**Testing Steps**:

1. **Package and Install Extension** (if not already done):
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

3. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Run "View: Toggle Output"
   - Select "Cascade" from dropdown

4. **Trigger Initial Load**:
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Expand a status group
   - Wait for output channel to show cache activity

5. **Trigger Manual Refresh**:
   - Right-click on TreeView root
   - Select "Refresh" (or press refresh button in toolbar)
   - Alternatively, press `Ctrl+Shift+P` and run "Cascade: Refresh TreeView"

6. **Verify Output Channel**:
   Look for cache clearing logs:
   ```
   [SpecProgressCache] Cache cleared (X entries removed)
   [PROPAGATE] Status propagation completed
   [SpecProgressCache] Cache cleared (X entries removed)
   [SpecProgressCache] Cache cleared (post-propagation)
   ```

**Expected Results**:
- Cache cleared TWICE per refresh cycle (before and after propagation)
- First clear: Before propagation engine runs
- Second clear: After propagation completes (handles any frontmatter changes)
- Cache stats reset to 0 hits / 0 misses (ready for next cycle)

### Task 4: Verify Cache Stats Logging

Test that cache statistics are logged every 60 seconds.

**Testing Steps**:

1. **Ensure Extension is Active**:
   - Open Cascade TreeView
   - Verify output channel shows "Extension activated"

2. **Wait 60+ Seconds**:
   - Keep VSCode open and idle
   - Monitor output channel

3. **Verify Stats Appear**:
   Look for this log entry (appears every 60 seconds):
   ```
   [SpecProgressCache] Hit rate: 0.0% (0/0)
   ```

   Note: Hit rate may show 0.0% if no spec progress has been read yet (S95 not implemented).

**Expected Results**:
- Stats logged every 60 seconds
- Hit rate calculation works (even with 0/0, should show 0.0%)
- Logging stops when extension deactivates

**Note**: Cache stats will show meaningful data (> 0% hit rate) only after S95 is implemented and stories with specs are displayed in TreeView.

### Task 5: Performance Baseline Measurement

Measure current TreeView performance to establish baseline before S95 integration.

**Testing Steps**:

1. **Open Large Workspace**:
   - Use the Lineage project (has multiple stories with specs)
   - Or generate test data: `cd vscode-extension/scripts && node generate-test-data.js 100 test-plans-100`

2. **Clear Extension Host Cache**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

3. **Monitor Output Channel**:
   - Open "Cascade" output channel
   - Watch for timing logs

4. **Expand TreeView**:
   - Open Cascade TreeView
   - Expand all status groups
   - Note timing logs for:
     - `[ItemsCache] Loaded X items in Yms`
     - `[StatusGroups] Built X groups in Yms`
     - `[Hierarchy] Built hierarchy in Yms`

5. **Record Baseline**:
   - Items load time: _____ ms
   - Status groups build time: _____ ms
   - Hierarchy build time: _____ ms

**Expected Performance** (100 items):
- Items load: < 500ms (includes file system scan + parsing)
- Status groups: < 100ms (filtering and grouping)
- Hierarchy: < 50ms per status (hierarchy construction)

**Documentation**:

Record baseline in comment for future comparison when S95 is implemented:

```typescript
// S94 Performance Baseline (before S95 integration):
// - Items load: XXXms with 100 items
// - Status groups: XXms
// - Hierarchy: XXms
// - No spec progress cache activity yet (S95 not implemented)
```

Add this comment to the top of `getSpecProgressCached()` method for reference.

## Completion Criteria

- [ ] getTreeItem() has comment documenting S95 integration point
- [ ] Cache stats logging added to constructor (every 60 seconds)
- [ ] Manual refresh clears spec progress cache (verified in output channel)
- [ ] Cache stats appear every 60 seconds in output channel
- [ ] Performance baseline recorded for future comparison
- [ ] TypeScript compilation succeeds with no errors
- [ ] Extension installs and activates without errors

## Verification Steps

1. **Compile Extension**:
   ```bash
   cd vscode-extension && npm run compile
   ```

2. **Install and Test**:
   ```bash
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload Window**:
   - Press `Ctrl+Shift+P` → "Developer: Reload Window"

4. **Verify Cache Infrastructure**:
   - Open output channel ("Cascade")
   - Open Cascade TreeView
   - Trigger manual refresh
   - Wait 60+ seconds for stats logging
   - Verify all log entries appear as expected

5. **Review Code**:
   - Open PlanningTreeProvider.ts
   - Verify getTreeItem() has S95 TODO comment
   - Verify constructor has spec progress cache stats logging
   - Verify refresh() clears cache twice per cycle

## Success Metrics

Since S95 is not yet implemented, success metrics for S94 focus on infrastructure:

1. **Cache Infrastructure**: ✅ Cache data structures exist and compile
2. **Cache Operations**: ✅ Cache methods (get, invalidate, clear) work without errors
3. **FileSystemWatcher**: ✅ Spec file changes trigger cache invalidation
4. **Logging**: ✅ Cache stats logged every 60 seconds
5. **Manual Refresh**: ✅ Cache cleared on refresh (twice per cycle)

**S95 will verify**:
- Cache hit rate > 80% after initial TreeView load
- TreeView refresh time < 100ms with 50+ stories (most hits cached)
- No stale data displayed (cache always reflects current state)

## Next Steps

1. **Mark S94 as Completed**: All phases implemented and verified
2. **Update Story Status**: Change S94 from "In Progress" to "Completed"
3. **Begin S95 (Phase Indicator Rendering)**: Integrate cache usage in getTreeItem()

## Notes

- S94 provides infrastructure, S95 provides user-visible feature
- Cache is fully functional but not used until S95 calls getSpecProgressCached()
- Performance benefits will be measurable only after S95 integration
- Cache stats will show 0.0% hit rate until S95 is implemented (expected behavior)
