---
spec: S92
title: Progress Update on Propagation
type: spec
status: Completed
priority: Medium
phases: 2
created: 2025-10-26
updated: 2025-10-26
---

# S92 - Progress Update on Propagation

## Implementation Strategy

### Overview

This specification verifies that progress bars update correctly when child statuses change via the StatusPropagationEngine. The integration between progress caching (S91) and status propagation (S59) ensures progress bars reflect real-time changes when child items complete or regress.

**Key Insight**: S91 already implements `progressCache.clear()` in the `refresh()` method (PlanningTreeProvider.ts:689-690), which is called after status propagation completes. This means the integration is **already implemented** - this spec focuses on **verification and testing**.

**Current State Analysis**:
- ✅ Progress cache declared and managed (S91)
- ✅ Cache cleared in `refresh()` method (line 689)
- ✅ Cache cleared again after propagation (line 707)
- ✅ Status propagation triggers refresh (line 702)
- ✅ `buildProgressCache()` rebuilds cache on next `getHierarchyForStatus()` call
- ❌ **Missing**: Enhanced logging to track propagation → refresh → cache rebuild sequence
- ❌ **Missing**: Comprehensive manual test scenarios documented

**What S92 Adds**: Enhanced output channel logging and comprehensive manual testing to verify the integration works correctly in all scenarios.

### Architecture Review

**Existing Propagation → Progress Update Flow**:

```
1. File watcher detects change (story status updated)
   ↓
2. FileSystemWatcher triggers refresh (debounced 300ms)
   ↓
3. PlanningTreeProvider.refresh() called
   ↓
4. Caches cleared (items, hierarchy, progress) [Line 681-690]
   ↓
5. Items and hierarchy reloaded [Line 696-699]
   ↓
6. StatusPropagationEngine.propagateStatuses() called [Line 702]
   ↓
7. Parent statuses updated in frontmatter files
   ↓
8. Caches cleared again (propagation may have changed files) [Line 707]
   ↓
9. TreeView refresh fires (_onDidChangeTreeData.fire)
   ↓
10. TreeView calls getChildren() for each status group
   ↓
11. getHierarchyForStatus() called (first status group)
   ↓
12. buildProgressCache() called (progressCache.size === 0) [Line 1785-1788]
   ↓
13. Progress cache populated for all parent items
   ↓
14. TreeView calls getTreeItem() for each item
   ↓
15. Progress bars rendered with cached values
```

**Key Integration Points**:
1. **PlanningTreeProvider.refresh()** (line 672): Cache clearing entry point
2. **progressCache.clear()** (line 689, 707): Invalidation happens twice per refresh
3. **buildProgressCache()** (line 1787): Cache rebuilt eagerly after hierarchy available
4. **StatusPropagationEngine.propagateStatuses()** (line 702): Triggers between cache clears

**Why This Works**:
- Cache cleared BEFORE propagation (ensures fresh state)
- Cache cleared AFTER propagation (handles propagation-modified files)
- Cache rebuilt lazily (first `getHierarchyForStatus()` call after refresh)
- All parent progress recalculated with updated child statuses

### Risk Assessment

**Low Risk Verification**:
- ✅ No code changes required (integration already working)
- ✅ Cache lifecycle already correct (cleared in refresh, rebuilt on demand)
- ✅ Propagation engine already triggers refresh
- ✅ Debounced refresh prevents excessive cache rebuilds

**Potential Issues**:
1. **Logging gaps**: Hard to debug propagation → refresh → cache rebuild sequence
   - Mitigation: Add enhanced logging in Phase 1
2. **Race conditions**: Multiple file changes in quick succession
   - Mitigation: Already handled by 300ms debounce (S72)
3. **Status regression edge cases**: Child regresses but parent stays "Completed"
   - Mitigation: Test in Phase 2, verify progress bar shows accurate count

### Phase Overview

**Phase 1: Enhanced Logging and Code Review** (~20 minutes)
- Review existing cache clearing implementation
- Verify `progressCache.clear()` called in all necessary locations
- Add enhanced output channel logging for propagation → cache rebuild sequence
- Document integration flow in code comments

**Phase 2: Comprehensive Manual Testing** (~25 minutes)
- Execute manual test scenarios (story completion, all completed, regression, bulk changes)
- Verify output channel logs show correct sequence
- Verify progress bars update in real-time
- Document test results and edge cases
- Create test checklist for future regression testing

**Total Estimated Time**: ~45 minutes

## Technical Considerations

### Cache Lifecycle

The progress cache follows this lifecycle:

1. **Creation**: `progressCache = new Map<string, ProgressInfo>()` (line 175)
2. **Population**: `buildProgressCache()` called after hierarchy built (line 1787)
3. **Usage**: `calculateProgress()` checks cache first (line 1883)
4. **Invalidation**: `progressCache.clear()` in `refresh()` (line 689, 707)

**Critical Timing**:
- Must clear BEFORE propagation (ensures fresh child statuses considered)
- Must clear AFTER propagation (ensures propagation-modified files trigger rebuild)
- Must rebuild AFTER hierarchy available (depends on hierarchy data)

### Propagation Engine Integration

The StatusPropagationEngine is called from `refresh()` method:

```typescript
async refresh(): Promise<void> {
  // Clear caches first
  this.allItemsCache = null;
  this.hierarchyCache.clear();
  this.progressCache.clear(); // ✅ First clear

  // Run propagation
  const items = await this.loadAllPlanningItems();
  const fullHierarchy = this.buildHierarchy(items);
  await this.propagationEngine.propagateStatuses(items, fullHierarchy);

  // Clear caches again (propagation may have changed files)
  this.allItemsCache = null;
  this.hierarchyCache.clear();
  this.progressCache.clear(); // ✅ Second clear

  // Fire TreeView refresh
  this._onDidChangeTreeData.fire(undefined);
}
```

**Why Two Clears**:
- First clear: Prepare for propagation with fresh data
- Second clear: Invalidate caches if propagation modified files
- Both necessary to prevent stale data in edge cases

### Debounced Refresh

The FileSystemWatcher uses 300ms debounce (S72):
- Multiple file changes within 300ms → Single refresh
- Single refresh → Single propagation run → Single cache rebuild
- Prevents excessive cache churning during bulk operations

### Edge Cases to Test

1. **Multiple children change simultaneously**: Debounce ensures single refresh
2. **Parent stays "Completed", child regresses**: Progress bar shows accurate count (not 100%)
3. **Status propagation changes parent status**: Both status AND progress update
4. **Propagation encounters error**: Refresh continues (non-blocking), cache still cleared

## Next Steps

1. Execute Phase 1 (Enhanced Logging and Code Review)
2. Execute Phase 2 (Comprehensive Manual Testing)
3. Document test results in phase completion report
4. Mark S92 story as "Completed"
