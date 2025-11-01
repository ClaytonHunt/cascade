---
item: S58
title: Kanban Performance Optimization
type: story
parent: F17
status: Completed
priority: Low
dependencies: [S54, S55, S56]
estimate: M
created: 2025-10-14
updated: 2025-10-14
spec: specs/S58-kanban-performance-optimization/
---

# S58 - Kanban Performance Optimization

## Description

Implement caching and lazy-loading strategies to ensure TreeView performance remains acceptable with 100+ planning items. Optimize status grouping, hierarchy building, and progress calculations to minimize file system operations and repeated computations.

This story ensures the kanban view scales efficiently as the planning pipeline grows.

### Key Requirements

**Performance Targets:**
- TreeView refresh < 500ms with 100 items
- Status group expansion < 100ms
- Hierarchy expansion (Epic/Feature) < 50ms
- Progress calculation < 50ms per parent item
- No visible lag or UI freezing

**Optimization Areas:**

1. **Status Grouping Cache:**
   - Cache status group counts
   - Invalidate on file changes (via FileSystemWatcher)
   - Avoid re-scanning all files on every refresh

2. **Hierarchy Cache:**
   - Cache parent-child relationships per status group
   - Invalidate only affected branches on file change
   - Use Map<itemId, children[]> for O(1) lookups

3. **Progress Calculation Cache:**
   - Cache progress per Epic/Feature
   - Recalculate only when child status changes
   - Use dirty-flag approach to track invalidation

4. **Lazy Loading:**
   - Load status groups immediately (6 items max)
   - Load items within status group on first expansion
   - Load hierarchy children on parent expansion
   - Defer progress calculation until item visible

5. **Batch Operations:**
   - Batch file reads during initial scan
   - Batch cache invalidations during refresh
   - Use single refresh event for multiple file changes

### Technical Implementation

**Cache Architecture:**
```typescript
interface TreeViewCache {
  statusGroups: StatusGroupNode[];
  statusGroupCounts: Map<string, number>;
  itemsByStatus: Map<string, PlanningTreeItem[]>;
  hierarchyByStatus: Map<string, ItemHierarchy[]>;
  progressByItem: Map<string, ProgressInfo>;
  lastRefresh: number;
}

class CachedPlanningTreeProvider extends PlanningTreeProvider {
  private cache: TreeViewCache;
  private cacheInvalidated: boolean = true;

  constructor(...) {
    super(...);
    this.cache = this.initializeCache();
    this.setupCacheInvalidation();
  }

  /**
   * Setup cache invalidation on file changes.
   * Uses FileSystemWatcher from S38 to detect changes.
   */
  private setupCacheInvalidation(): void {
    // Watch for file changes in plans/ directory
    this.fileWatcher.onDidChange((uri) => {
      this.invalidateCacheForFile(uri.fsPath);
    });

    this.fileWatcher.onDidCreate((uri) => {
      this.cacheInvalidated = true;  // Full refresh on new files
    });

    this.fileWatcher.onDidDelete((uri) => {
      this.cacheInvalidated = true;  // Full refresh on deletions
    });
  }

  /**
   * Invalidates cache entries affected by a file change.
   * Partial invalidation: only affected status group and parent items.
   */
  private invalidateCacheForFile(filePath: string): void {
    const item = this.cache.itemsByPath?.get(filePath);
    if (!item) {
      this.cacheInvalidated = true;  // Unknown file, full refresh
      return;
    }

    // Invalidate status group count
    this.cache.statusGroupCounts.delete(item.status);

    // Invalidate hierarchy for this status
    this.cache.hierarchyByStatus.delete(item.status);

    // Invalidate progress for parent items
    this.invalidateProgressForParents(item);
  }
}
```

**Lazy Status Group Loading:**
```typescript
async getChildren(element?: any): Promise<any[]> {
  if (!element) {
    // Root level: return status groups (always fast, 6 items max)
    if (this.cache.statusGroups.length === 0) {
      this.cache.statusGroups = await this.loadStatusGroups();
    }
    return this.cache.statusGroups;
  }

  if (element.type === 'status-group') {
    // Status group expanded: load items lazily
    return this.getItemsForStatusCached(element.status);
  }

  // ... hierarchy logic ...
}
```

**Cached Item Loading:**
```typescript
private async getItemsForStatusCached(status: string): Promise<PlanningTreeItem[]> {
  // Check cache first
  if (this.cache.itemsByStatus.has(status) && !this.cacheInvalidated) {
    return this.cache.itemsByStatus.get(status)!;
  }

  // Load from file system
  const allItems = await this.loadAllItems();
  const itemsInStatus = allItems.filter(item => item.status === status);

  // Cache for next time
  this.cache.itemsByStatus.set(status, itemsInStatus);

  return itemsInStatus;
}
```

**Hierarchy Caching:**
```typescript
private async getHierarchyCached(status: string): Promise<ItemHierarchy[]> {
  // Check cache
  if (this.cache.hierarchyByStatus.has(status) && !this.cacheInvalidated) {
    return this.cache.hierarchyByStatus.get(status)!;
  }

  // Build hierarchy
  const items = await this.getItemsForStatusCached(status);
  const hierarchy = this.buildHierarchy(items);

  // Cache for next time
  this.cache.hierarchyByStatus.set(status, hierarchy);

  return hierarchy;
}
```

**Progress Caching:**
```typescript
private calculateProgressCached(item: PlanningTreeItem): ProgressInfo | null {
  const cacheKey = item.item;  // E.g., "E4", "F17"

  // Check cache
  if (this.cache.progressByItem.has(cacheKey)) {
    return this.cache.progressByItem.get(cacheKey)!;
  }

  // Calculate progress
  const progress = this.calculateProgress(item);

  // Cache result
  if (progress) {
    this.cache.progressByItem.set(cacheKey, progress);
  }

  return progress;
}
```

**Batch File Reading:**
```typescript
private async loadAllItems(): Promise<PlanningTreeItem[]> {
  // Use FrontmatterCache.getAll() to batch-load all files
  const allFrontmatter = await this.cache.getAll('plans/**/*.md');

  // Convert to PlanningTreeItem
  const items = allFrontmatter.map(fm => ({
    item: fm.item,
    title: fm.title,
    type: fm.type,
    status: fm.status,
    priority: fm.priority,
    filePath: fm.filePath
  }));

  return items;
}
```

### Integration Points

**Dependencies:**
- S38 (FileSystemWatcher) - Trigger cache invalidation
- S40 (FrontmatterCache) - Batch file reading
- S54 (Status Grouping) - Add caching layer
- S55 (Hierarchy) - Cache hierarchy structure
- S56 (Progress) - Cache progress calculations

**VSCode API:**
- Lazy loading via getChildren() async pattern
- Cache invalidation via _onDidChangeTreeData event
- Performance profiling via Developer Tools

### Testing Approach

**Performance Tests:**
- Measure refresh time with 50, 100, 200 items
- Measure status group expansion time
- Measure hierarchy expansion time
- Measure cache hit/miss ratios
- Profile with VSCode DevTools

**Stress Tests:**
- 100+ items in plans/ directory
- 10+ levels of hierarchy depth
- Rapid file changes (multiple per second)
- Multiple concurrent expansions/collapses

**Cache Invalidation Tests:**
- File change invalidates correct cache entries
- File creation triggers full refresh
- File deletion triggers full refresh
- Multiple changes batched into single refresh

**Manual Verification:**
- No visible lag when expanding status groups
- Progress indicators appear immediately
- Rapid clicks don't cause freezing
- File changes reflected quickly
- Memory usage stable over time

## Acceptance Criteria

- [ ] TreeView refresh < 500ms with 100+ items
- [ ] Status group expansion < 100ms
- [ ] Hierarchy expansion < 50ms per level
- [ ] Progress calculation < 50ms per parent
- [ ] Cache hit rate > 80% after initial load
- [ ] File changes invalidate only affected cache entries
- [ ] No UI freezing or lag during normal usage
- [ ] Memory usage stable (no leaks)
- [ ] Cache invalidation correct on all change types
- [ ] Performance acceptable across platforms (Windows/Mac/Linux)

## Analysis Summary

**Optimization Strategy:**
- Cache at multiple levels: status groups, items, hierarchy, progress
- Lazy load: defer work until user expands sections
- Partial invalidation: only refresh affected cache entries
- Batch operations: minimize file system roundtrips

**Caching Trade-offs:**
- Memory vs Speed: Cache uses memory but improves responsiveness
- Complexity vs Performance: Caching adds complexity but necessary for scale
- Staleness vs Freshness: Cache delays reflect file changes, use FSW to minimize

**VSCode Patterns:**
- Async getChildren() for lazy loading
- Event emitter for cache invalidation
- Map-based caches for O(1) lookups

**Performance Monitoring:**
- Use VSCode DevTools for profiling
- Add timing logs in Output Channel
- Track cache hit/miss statistics
