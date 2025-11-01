---
item: S91
title: Progress Cache Layer
type: story
parent: F24
status: Completed
priority: Medium
dependencies: [S90]
estimate: S
created: 2025-10-25
updated: 2025-10-25
spec: specs/S91-progress-cache-layer/
---

# S91 - Progress Cache Layer

## Description

Implement a caching layer for progress calculations to avoid recomputing progress on every `getTreeItem()` call. Progress values are cached per refresh cycle and invalidated when the file watcher triggers a TreeView refresh.

This optimization follows the existing three-tier caching architecture (S58):
- **Tier 1**: Frontmatter Cache (files)
- **Tier 2**: Items Cache (all items)
- **Tier 3**: Derived Caches (hierarchy, **progress** ← NEW)

Progress cache stores `ProgressInfo` per item ID, built once during hierarchy construction and reused for all TreeItem rendering calls.

**Note**: This story is **independent of rendering approach**. The cache layer works with:
- Current Unicode text-based progress bars (S88-S90)
- Future graphical progress bars (Webview/SVG/etc.)
- The cache stores calculation results, not rendered output

**Dependency Update**: S90 is complete (Unicode implementation). This story can proceed regardless of whether graphical progress bars are implemented later.

## Acceptance Criteria

1. **Progress Cache Data Structure**:
   - [ ] Add `private progressCache: Map<string, ProgressInfo | null> = new Map()`
   - [ ] Key: Item ID (e.g., `"E5"`, `"F24"`)
   - [ ] Value: `ProgressInfo` object or `null` (for items with no children)
   - [ ] Cache declared in `PlanningTreeDataProvider` class

2. **Cache Population**:
   - [ ] Build cache during hierarchy construction (or immediately after)
   - [ ] Populate cache for all parent items (Epics, Features, Projects)
   - [ ] Store `null` for leaf items (Stories, Bugs)
   - [ ] Cache built once per refresh cycle

3. **Cache Lookup**:
   - [ ] Modify `getTreeItem()` to check cache first
   - [ ] If cache hit: Return cached `ProgressInfo` (no recalculation)
   - [ ] If cache miss: Calculate progress, store in cache, return
   - [ ] Cache lookup is O(1) (Map.get)

4. **Cache Invalidation**:
   - [ ] Clear `progressCache` in `refresh()` method
   - [ ] Clear alongside `allItemsCache` and `hierarchyCache` (line ~200 in PlanningTreeProvider.ts)
   - [ ] File watcher triggers `refresh()` → cache cleared
   - [ ] Next `getChildren()` call rebuilds cache

5. **Performance Metrics**:
   - [ ] Cache hit rate > 80% after initial load (same as items cache)
   - [ ] Progress calculation called once per item per refresh (not per render)
   - [ ] No observable performance regression
   - [ ] TreeView refresh < 500ms with 100+ items (existing target)

6. **Logging**:
   - [ ] Add output channel log: `"[ProgressCache] Built cache for X items in Yms"`
   - [ ] Add cache stats log every 60s: `"[ProgressCache] Hit rate: XX%"`
   - [ ] Use existing output channel (no new channel needed)

## Technical Approach

### Implementation Location

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add cache as class member and modify `refresh()` and `getTreeItem()` methods.

### Cache Declaration

```typescript
export class PlanningTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private allItemsCache: PlanningTreeItem[] | null = null;
  private hierarchyCache: Map<Status, HierarchyNode[]> = new Map();
  private progressCache: Map<string, ProgressInfo | null> = new Map();  // NEW

  // ... existing code
}
```

### Cache Population

Option 1: Populate during hierarchy building (recommended)

```typescript
/**
 * Builds progress cache for all parent items.
 * Called after hierarchy construction completes.
 */
private buildProgressCache(hierarchy: HierarchyNode[]): void {
  const start = Date.now();

  for (const node of hierarchy) {
    const item = node.item;

    // Only cache parent items
    if (item.type === 'epic' || item.type === 'feature' || item.type === 'project') {
      const progress = this.calculateProgress(item, hierarchy);
      this.progressCache.set(item.item, progress);
    } else {
      // Leaf items: store null
      this.progressCache.set(item.item, null);
    }
  }

  const elapsed = Date.now() - start;
  this.outputChannel.appendLine(`[ProgressCache] Built cache for ${this.progressCache.size} items in ${elapsed}ms`);
}
```

Option 2: Lazy population during `getTreeItem()` (fallback)

```typescript
// In getTreeItem():
let progress = this.progressCache.get(item.item);
if (progress === undefined) {
  // Cache miss - calculate and store
  progress = this.calculateProgress(item, this.hierarchy);
  this.progressCache.set(item.item, progress);
}
```

### Cache Invalidation

Modify the existing `refresh()` method:

```typescript
refresh(): void {
  this.outputChannel.appendLine('[TreeView] Refresh triggered');

  // Clear all caches
  this.allItemsCache = null;
  this.hierarchyCache.clear();
  this.progressCache.clear();  // NEW: Clear progress cache

  this._onDidChangeTreeData.fire(undefined);
}
```

### getTreeItem() Integration

```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
  if (element.type === 'item') {
    const item = element.item;
    // ... existing setup ...

    // Build description
    const parts: string[] = [];
    parts.push(renderStatusBadge(item.status));

    // Add progress bar (with caching)
    if (this.hasChildren(item) && this.hierarchy) {
      const progress = this.progressCache.get(item.item);  // Cache lookup

      if (progress !== undefined && progress !== null) {
        const progressBar = renderProgressBar(progress);
        parts.push(progressBar);
      }
    }

    treeItem.description = parts.join(' ');
    return treeItem;
  }
  // ... rest of method
}
```

### Cache Hit Rate Tracking (Optional)

Similar to items cache tracking (S58):

```typescript
private progressCacheHits = 0;
private progressCacheMisses = 0;

// In getTreeItem():
const cached = this.progressCache.get(item.item);
if (cached !== undefined) {
  this.progressCacheHits++;
} else {
  this.progressCacheMisses++;
}

// Log stats every 60 seconds:
setInterval(() => {
  const total = this.progressCacheHits + this.progressCacheMisses;
  const hitRate = total > 0 ? (this.progressCacheHits / total * 100).toFixed(1) : 0;
  this.outputChannel.appendLine(`[ProgressCache] Hit rate: ${hitRate}% (${this.progressCacheHits}/${total})`);
}, 60000);
```

## Testing Strategy

### Performance Testing

1. **Generate test data** (if not already done):
   ```bash
   cd vscode-extension/scripts
   node generate-test-data.js 100 test-plans-100
   ```

2. **Open Cascade Output Channel**:
   - Ctrl+Shift+P → "View: Toggle Output"
   - Select "Cascade" from dropdown

3. **Trigger TreeView operations**:
   - Open Cascade TreeView
   - Expand status groups
   - Scroll through items
   - Edit a file (trigger cache invalidation)

4. **Verify cache logs**:
   - Look for `[ProgressCache] Built cache for X items in Yms`
   - Verify build time < 50ms with 100 items
   - Look for `[ProgressCache] Hit rate: XX%` (after 60s)
   - Verify hit rate > 80%

5. **Measure TreeView performance**:
   - TreeView refresh < 500ms (same as before caching)
   - No observable lag when expanding/collapsing groups

### Manual Verification

1. **Cache Invalidation Test**:
   - Open TreeView, note progress bars
   - Edit a planning file (change a story status)
   - Save file (triggers file watcher)
   - Verify TreeView refreshes
   - Verify progress bars update correctly
   - Check output channel for cache rebuild log

2. **Cache Hit Rate Test**:
   - Open TreeView
   - Expand/collapse groups multiple times
   - Wait 60 seconds
   - Check output channel for hit rate log
   - Verify hit rate > 80%

## Dependencies

- **S90** (TreeItem Integration) - provides progress bar rendering in TreeView
- **S88** (Progress Calculation Core) - provides `calculateProgress()` function
- Existing cache infrastructure (S58) - follows same pattern (items cache, hierarchy cache)
- `refresh()` method - cache invalidation point
- Output channel - for performance logging

## Success Metrics

- Cache hit rate > 80% after initial TreeView load
- Progress calculation called once per item per refresh cycle
- Cache build time < 50ms with 100 items
- TreeView refresh performance maintained (< 500ms with 100+ items)
- No observable lag in TreeView interactions
- Cache invalidation works correctly (progress updates when files change)

## Notes

- This story focuses solely on caching, not calculation or rendering
- Cache follows same lifecycle as items cache and hierarchy cache (S58)
- Cache invalidation tied to file watcher events (existing infrastructure)
- Hit rate tracking is optional but recommended for monitoring
- Cache size is bounded by number of planning items (not unbounded)
- Map data structure provides O(1) lookup performance
- Progress cache is Tier 3 (derived from hierarchy cache)
