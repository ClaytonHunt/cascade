---
spec: S91
phase: 2
title: Integrate with Hierarchy Building and Test
status: Completed
priority: Medium
created: 2025-10-25
updated: 2025-10-25
---

# Phase 2: Integrate with Hierarchy Building and Test

## Overview

This phase integrates the `buildProgressCache()` method into the hierarchy building workflow and verifies the cache is populated correctly. We'll call `buildProgressCache()` after hierarchy construction completes, ensuring the cache is ready before `getTreeItem()` calls begin.

**Key Integration Point**: The `getChildrenForStatusGroup()` method (around line 1750) builds hierarchy and returns children. This is the optimal place to build the progress cache.

**Estimated Time**: 15 minutes

## Prerequisites

- Phase 1 completed (`buildProgressCache()` method implemented)
- Understanding of TreeView data flow (getChildren → buildHierarchy → getTreeItem)
- Output channel accessible for log verification

## Tasks

### Task 1: Identify Integration Point

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action**: Find where `buildHierarchy()` is called and hierarchy is available.

**Primary Integration Point** (around line 1750-1765):

```typescript
private async getChildrenForStatusGroup(status: Status): Promise<TreeNode[]> {
  // ... existing code ...

  // Build hierarchy
  const hierarchy = this.buildHierarchy(items);

  // Cache hierarchy
  this.hierarchyCache.set(status, hierarchy);

  // ← INSERT buildProgressCache() call HERE

  return hierarchy.map(node => node.item);
}
```

**Why This Location**:
- Hierarchy just built (fresh data available)
- Before returning children (before `getTreeItem()` calls)
- Called once per status group (efficient, not per-item)
- Already has `items` array available (needed for cache build)

**References**:
- `getChildrenForStatusGroup()` method: PlanningTreeProvider.ts:~1750
- `buildHierarchy()` call: PlanningTreeProvider.ts:1759
- `hierarchyCache.set()`: PlanningTreeProvider.ts:1764

---

### Task 2: Add buildProgressCache() Call

**Location**: `getChildrenForStatusGroup()` method (after `hierarchyCache.set()`)

**Action**: Call `buildProgressCache()` after hierarchy is cached.

**Code to Add**:

```typescript
private async getChildrenForStatusGroup(status: Status): Promise<TreeNode[]> {
  const items = await this.loadAllPlanningItems();

  // Filter items by status
  const filteredItems = items.filter(item => {
    const effectiveStatus = isItemArchived(item) ? 'Archived' : item.status;
    return effectiveStatus === status;
  });

  // Build hierarchy
  const hierarchy = this.buildHierarchy(filteredItems);

  // Cache hierarchy
  this.hierarchyCache.set(status, hierarchy);

  // NEW: Build progress cache for all items (not just filtered)
  // Must use ALL items because parents may be in different status groups
  await this.buildProgressCache(items);

  this.outputChannel.appendLine(`[StatusGroup] Built hierarchy for "${status}" (${hierarchy.length} root nodes)`);

  return hierarchy.map(node => node.item);
}
```

**Why Use `items` Not `filteredItems`**:
- Epics in "In Progress" may have Features in "Ready"
- Progress calculation needs access to ALL children, not just same-status children
- Cache should contain progress for ALL parent items, not just current status group

**Performance Note**:
- This gets called once per status group (6-7 times per refresh)
- Multiple calls won't duplicate work (cache lookup in `calculateProgress()` prevents redundant calculations)
- First call populates cache, subsequent calls are cache hits

**Expected Outcome**:
- Progress cache built after hierarchy available
- Cache populated before TreeView rendering begins
- Output channel shows `[ProgressCache] Built cache for X parent items in Yms`

**References**:
- `loadAllPlanningItems()` returns all items: PlanningTreeProvider.ts:~1230
- `buildHierarchy()` uses filtered items: PlanningTreeProvider.ts:~1759

---

### Task 3: Optimize to Build Cache Once Per Refresh

**Location**: Same as Task 2

**Problem**: `getChildrenForStatusGroup()` is called 6-7 times per refresh (once per status group), causing cache to be built multiple times.

**Solution**: Check if cache already populated before building.

**Optimized Code**:

```typescript
private async getChildrenForStatusGroup(status: Status): Promise<TreeNode[]> {
  const items = await this.loadAllPlanningItems();

  // Filter items by status
  const filteredItems = items.filter(item => {
    const effectiveStatus = isItemArchived(item) ? 'Archived' : item.status;
    return effectiveStatus === status;
  });

  // Build hierarchy
  const hierarchy = this.buildHierarchy(filteredItems);

  // Cache hierarchy
  this.hierarchyCache.set(status, hierarchy);

  // NEW: Build progress cache ONCE per refresh (check if empty first)
  if (this.progressCache.size === 0) {
    await this.buildProgressCache(items);
  }

  this.outputChannel.appendLine(`[StatusGroup] Built hierarchy for "${status}" (${hierarchy.length} root nodes)`);

  return hierarchy.map(node => node.item);
}
```

**Why This Works**:
- `progressCache.size === 0` means cache not yet built this refresh
- First status group builds cache, subsequent groups skip
- Cache cleared in `refresh()` (lines 672, 690), so check resets each refresh
- Builds cache exactly once per refresh cycle

**Performance Impact**:
- Before: Cache built 6-7 times per refresh (~300-350ms overhead)
- After: Cache built once per refresh (~50ms overhead)
- Savings: ~250-300ms per refresh

**Expected Outcome**:
- Cache built only once per refresh
- Output channel shows `[ProgressCache] Built cache...` only once, not 6-7 times
- TreeView refresh performance improves

**References**:
- `refresh()` clears `progressCache`: PlanningTreeProvider.ts:672, 690
- Cache lifecycle: Cleared on refresh, rebuilt on first `getChildren()` call

---

### Task 4: Compile and Verify No Errors

**Action**: Run TypeScript compilation to verify integration.

**Steps**:
1. Save all changes to `PlanningTreeProvider.ts`
2. Run compilation:
   ```bash
   cd vscode-extension
   npm run compile
   ```
3. Verify no compilation errors

**Expected Output**:
```
> cascade@0.1.0 compile
> tsc -p ./

# No errors, clean compilation
```

**Troubleshooting**:

If compilation fails with "Cannot find name 'buildProgressCache'":
- Verify method is declared in `PlanningTreeProvider` class (Phase 1)
- Method is `private`, should be accessible within same class

If compilation fails with async/await issues:
- `getChildrenForStatusGroup()` is already `async` (no changes needed)
- `buildProgressCache()` is `async`, use `await` when calling

**References**:
- TypeScript compilation: `package.json` compile script
- Compiler options: `tsconfig.json`

---

### Task 5: Manual Testing with Extension

**Action**: Package extension, install, and verify cache population.

**Steps**:

1. **Package Extension**:
   ```bash
   cd vscode-extension
   npm run package
   ```

2. **Install Extension**:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

4. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Run "View: Toggle Output"
   - Select "Cascade" from dropdown

5. **Open Cascade TreeView**:
   - Click Cascade icon in Activity Bar (left sidebar)
   - TreeView should load

6. **Verify Cache Logs**:
   - Look for `[ProgressCache] Built cache for X parent items in Yms`
   - Should appear once per refresh, not 6-7 times
   - Build time should be < 50ms with typical workspace

**Expected Logs**:
```
[TreeView] Refresh triggered
[ItemsCache] Cache cleared
[Hierarchy] Cache cleared
[Progress] Cache cleared
[ItemsCache] Loaded 45 items in 125ms
[ProgressCache] Built cache for 12 parent items in 28ms
[StatusGroup] Built hierarchy for "Not Started" (3 root nodes)
[StatusGroup] Built hierarchy for "Ready" (2 root nodes)
...
```

**Success Criteria**:
- `[ProgressCache] Built cache...` appears once
- Build time < 50ms
- No errors or warnings related to progress cache

**References**:
- Extension installation: CLAUDE.md lines 98-131
- Output channel usage: Existing throughout PlanningTreeProvider

---

### Task 6: Verify Cache Hit Rate

**Action**: Monitor cache hit rate after 60 seconds (if Task 5 from Phase 1 implemented).

**Steps**:
1. Open Cascade TreeView (TreeView loads)
2. Expand/collapse status groups several times
3. Scroll through tree items
4. Wait 60 seconds
5. Check output channel for cache statistics

**Expected Logs** (if statistics tracking implemented):
```
[ProgressCache] Hit rate: 87.3% (234/268)
```

**Success Criteria**:
- Hit rate > 80%
- Total calls > 100 (indicates TreeView rendering multiple items)
- Few misses (only initial lazy calculations before eager build)

**If Hit Rate < 80%**:
- Check if cache built successfully (look for build log)
- Check if cache cleared unexpectedly (look for multiple build logs)
- Consider adding leaf item caching (Phase 1, Task 2)

**References**:
- Cache statistics implementation: Phase 1, Task 5
- Items cache hit rate monitoring: S58 documentation

---

### Task 7: Performance Testing (Optional)

**Action**: Test TreeView performance with 100+ items.

**Steps**:

1. **Generate Test Data** (if needed):
   ```bash
   cd vscode-extension/scripts
   node generate-test-data.js 100 test-plans-100
   ```

2. **Open Workspace** with test data:
   - Point VSCode to `test-plans-100/` directory
   - Open Cascade TreeView

3. **Measure Refresh Time**:
   - Edit a planning file
   - Save (triggers refresh)
   - Check output channel for timing logs:
     ```
     [TreeView] Refresh triggered
     [ItemsCache] Loaded 100 items in 180ms
     [ProgressCache] Built cache for 28 parent items in 42ms
     [StatusGroup] Built hierarchy for "In Progress" (8 root nodes)
     ```

4. **Verify Performance Targets**:
   - Items cache load: < 200ms (existing target)
   - Progress cache build: < 50ms (S91 target)
   - Total refresh: < 500ms (existing target)

**Success Criteria**:
- Progress cache build < 50ms with 100 items
- TreeView responsive (no observable lag)
- No performance regression vs before S91

**References**:
- Performance testing guide: CLAUDE.md lines 50-95
- Test data generation: `vscode-extension/scripts/generate-test-data.js`
- Performance targets: S91 acceptance criteria

---

### Task 8: Cache Invalidation Testing

**Action**: Verify cache invalidation works correctly.

**Test Scenario**:
1. Open Cascade TreeView (cache populated)
2. Note progress bar for an Epic (e.g., "E5 - Rich TreeView █████░░░░░ 50% (3/6)")
3. Edit a child Story status (change "In Progress" → "Completed")
4. Save file (triggers file watcher → `refresh()` → cache cleared)
5. Verify TreeView refreshes
6. Verify progress bar updates (e.g., "E5 - Rich TreeView ██████░░░░ 60% (4/6)")
7. Check output channel for cache rebuild log

**Expected Behavior**:
- Cache cleared: `[Progress] Cache cleared`
- Cache rebuilt: `[ProgressCache] Built cache for X parent items in Yms`
- Progress bar updates to reflect new child status
- No stale cache data displayed

**Failure Scenarios**:
- Progress bar doesn't update → Cache not invalidated correctly
- Progress bar wrong value → Cache not rebuilt correctly
- TreeView doesn't refresh → File watcher not triggering

**References**:
- Cache invalidation: `refresh()` method (lines 672, 690)
- File watcher: Existing infrastructure (S58)

---

## Completion Criteria

- ✅ `buildProgressCache()` called after `buildHierarchy()` completes
- ✅ Cache built once per refresh (optimization check implemented)
- ✅ TypeScript compilation succeeds with no errors
- ✅ Extension packages and installs successfully
- ✅ Output channel shows cache build logs
- ✅ Cache hit rate > 80% (if statistics implemented)
- ✅ Performance target met (< 50ms cache build with 100 items)
- ✅ Cache invalidation works (progress updates when files change)
- ✅ No observable performance regression in TreeView

## Next Steps

1. **Mark Phase 2 Complete**: All tasks executed successfully
2. **Mark S91 Story Complete**: Both phases done, all acceptance criteria met
3. **Update Story Status**: Change `status: "Completed"` in story file frontmatter
4. **Optional**: Consider S92 (Progress Update on Propagation) next - ensures cache updates during status propagation events
5. **Optional**: Monitor cache hit rate over time to verify optimization effectiveness

**S91 Implementation Complete!** Progress cache layer now eagerly populates after hierarchy building, eliminating redundant calculations and improving TreeView rendering performance.
