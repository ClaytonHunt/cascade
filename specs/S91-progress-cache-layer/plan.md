---
spec: S91
title: Progress Cache Layer
type: spec
status: Completed
priority: Medium
phases: 2
created: 2025-10-25
updated: 2025-10-25
---

# S91 - Progress Cache Layer

## Implementation Strategy

### Overview

This specification details the optimization of progress calculation by implementing **eager cache population** for the existing `progressCache` Map. Currently, progress is calculated lazily (on-demand during `getTreeItem()` calls). This spec adds a `buildProgressCache()` method that eagerly populates the cache after hierarchy construction, reducing redundant calculations and improving TreeView rendering performance.

**Current State**: Progress cache exists (line 175 in PlanningTreeProvider.ts) with:
- ✅ Cache declaration: `private progressCache = new Map<string, ProgressInfo>()`
- ✅ Cache invalidation: `progressCache.clear()` in `refresh()` (lines 672, 690)
- ✅ Cache lookup: Check in `calculateProgress()` (lines 1883-1884)
- ✅ Cache write: Store result in `calculateProgress()` (line 1916)
- ❌ **Missing**: Eager cache population after hierarchy building

**What S91 Adds**: A `buildProgressCache()` method that pre-populates the cache for all parent items (Epics, Features, Projects) immediately after hierarchy construction, before `getTreeItem()` calls begin.

### Architecture Decisions

**Design Pattern**: Eager initialization following existing cache patterns
- Follows same lifecycle as `hierarchyCache` (built after hierarchy construction)
- Integrates with Tier 3 derived caches (line 77 architecture documentation)
- No changes to cache invalidation (already implemented)

**Performance Strategy**:
- Build cache in single pass after hierarchy available
- O(N) where N = number of parent items (typically 10-30% of total items)
- Eliminates O(N*M) calls during TreeView rendering (N items × M render passes)
- Target: Cache build time < 50ms with 100 items

**Integration Points**:
1. **buildHierarchy()** (line 1473): After hierarchy built, call `buildProgressCache()`
2. **calculateProgress()** (line 1881): Keep existing cache lookup logic (no changes)
3. **refresh()** (line 672, 690): Cache invalidation already implemented
4. **Output Channel**: Add cache build timing logs

### Key Technical Considerations

**Cache Build Timing**:
- Must build AFTER hierarchy is available (depends on hierarchy data)
- Must build BEFORE `getTreeItem()` calls (eager, not lazy)
- Build during `getChildren()` for status groups (optimal timing)

**Child Counting Logic**:
- Reuse existing `getDirectChildren()` method (line 1924)
- Leverages hierarchy structure (no file system reads)
- Same logic as current `calculateProgress()` implementation

**Edge Cases**:
- Parent items with no children: Store `null` in cache
- Leaf items (Stories, Bugs): Skip (not parent items)
- Empty workspace: Cache remains empty (no error)

### Risk Assessment

**Low Risk Implementation**:
- ✅ Cache structure already exists (no new data structures)
- ✅ Cache invalidation already working
- ✅ Adds only one new method (`buildProgressCache()`)
- ✅ No changes to `calculateProgress()` logic
- ✅ Falls back gracefully (lazy calculation still works if cache empty)

**Potential Issues**:
1. **Build time overhead**: Building all progress upfront adds ~20-50ms per refresh
   - Mitigation: Still faster than lazy calculation (repeated calls cost more)
   - Mitigation: Only builds for parent items (10-30% of total)
2. **Memory overhead**: Storing ProgressInfo objects for all parents
   - Mitigation: Small objects (4 fields), bounded by item count
   - Mitigation: Cleared on each refresh (not unbounded growth)

### Phase Overview

**Phase 1: Implement buildProgressCache() Method** (~30 minutes)
- Add `buildProgressCache()` method to PlanningTreeProvider
- Iterate all parent items (Epics, Features, Projects)
- Calculate progress for each using existing `calculateProgress()` logic
- Store results in `progressCache` Map
- Add output channel logging for timing

**Phase 2: Integrate with Hierarchy Building** (~15 minutes)
- Call `buildProgressCache()` after `buildHierarchy()` completes
- Verify cache populated before TreeView rendering
- Test cache hit rates
- Manual verification with test data

**Total Estimated Time**: ~45 minutes

## Next Steps

1. Execute Phase 1 (buildProgressCache implementation)
2. Execute Phase 2 (integration and testing)
3. Verify cache hit rate > 80% in output channel logs
4. Mark S91 story as "Completed"
