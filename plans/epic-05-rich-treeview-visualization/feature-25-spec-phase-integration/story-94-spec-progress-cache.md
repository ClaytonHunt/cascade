---
item: S94
title: Spec Progress Cache Layer
type: story
parent: F25
status: Completed
priority: High
dependencies: [S93]
estimate: S
created: 2025-10-26
updated: 2025-10-27
spec: specs/S94-spec-progress-cache
---

# S94 - Spec Progress Cache Layer

## Description

Implement an in-memory cache for spec progress data to avoid re-reading spec directories on every TreeView refresh. The cache stores SpecProgress objects keyed by story item number and invalidates entries when spec files change.

This cache follows the same pattern as the existing ProgressInfo cache (S91) and integrates with the FileSystemWatcher to detect spec file changes.

## Acceptance Criteria

1. **Cache Structure**:
   - [ ] Map-based cache: `Map<string, SpecProgress>`
   - [ ] Key: Story item number (e.g., "S75")
   - [ ] Value: SpecProgress object from readSpecProgress()
   - [ ] In-memory cache (cleared on extension reload)

2. **Cache Operations**:
   - [ ] `getSpecProgress(storyItem: string): SpecProgress | undefined` - Cache lookup
   - [ ] `setSpecProgress(storyItem: string, progress: SpecProgress)` - Cache write
   - [ ] `invalidateSpecProgress(storyItem: string)` - Invalidate single entry
   - [ ] `clearSpecProgress()` - Clear entire cache

3. **Cache Integration**:
   - [ ] Add `specProgressCache` Map to PlanningTreeProvider
   - [ ] Check cache first in getTreeItem() before calling readSpecProgress()
   - [ ] Store result in cache after reading from filesystem
   - [ ] Cache hit/miss tracking for performance monitoring

4. **Cache Invalidation**:
   - [ ] Invalidate when spec plan.md changes
   - [ ] Invalidate when phase files (tasks/*.md) change
   - [ ] Invalidate on manual TreeView refresh
   - [ ] Use FileSystemWatcher to detect spec file changes

5. **FileSystemWatcher Integration**:
   - [ ] Watch spec directories: `specs/**/plan.md`
   - [ ] Watch phase files: `specs/**/tasks/*.md`
   - [ ] On file change: extract story number from spec path
   - [ ] Call `invalidateSpecProgress(storyItem)` to clear cache entry

6. **Performance Metrics**:
   - [ ] Track cache hit rate (same pattern as ProgressInfo cache)
   - [ ] Log cache stats every 60 seconds
   - [ ] Target: > 80% hit rate after initial load
   - [ ] Log format: `[SpecProgressCache] Hit rate: 85% (17 hits / 3 misses)`

## Technical Approach

**PlanningTreeProvider Updates**:

```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  // ... existing code ...

  /**
   * Cache for spec progress data (S94).
   * Key: Story item number (e.g., "S75")
   * Value: SpecProgress object
   */
  private specProgressCache = new Map<string, SpecProgress>();

  /**
   * Cache hit/miss tracking for performance monitoring.
   */
  private specProgressCacheHits = 0;
  private specProgressCacheMisses = 0;

  /**
   * Gets spec progress for a story, using cache if available.
   */
  private async getSpecProgressCached(
    item: PlanningTreeItem
  ): Promise<SpecProgress | null> {
    // Check cache first
    if (this.specProgressCache.has(item.item)) {
      this.specProgressCacheHits++;
      return this.specProgressCache.get(item.item)!;
    }

    // Cache miss - read from filesystem
    this.specProgressCacheMisses++;

    // Check if story has spec field
    if (!item.spec) {
      return null;
    }

    const progress = await readSpecProgress(item.spec, item.status);

    if (progress !== null) {
      // Store in cache
      this.specProgressCache.set(item.item, progress);
    }

    return progress;
  }

  /**
   * Invalidates spec progress cache entry for a story.
   */
  private invalidateSpecProgress(storyItem: string): void {
    this.specProgressCache.delete(storyItem);
    this.outputChannel.appendLine(
      `[SpecProgressCache] Invalidated cache for ${storyItem}`
    );
  }

  /**
   * Clears entire spec progress cache.
   */
  private clearSpecProgressCache(): void {
    this.specProgressCache.clear();
    this.specProgressCacheHits = 0;
    this.specProgressCacheMisses = 0;
    this.outputChannel.appendLine('[SpecProgressCache] Cache cleared');
  }
}
```

**FileSystemWatcher Integration** (in extension.ts):

```typescript
// Watch spec directories for changes
const specWatcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceFolder, 'specs/**/+(plan.md|tasks/*.md)')
);

specWatcher.onDidChange(uri => {
  // Extract story number from spec path
  // Example: specs/story-75-type-system/plan.md → S75
  const storyItem = extractStoryItemFromSpecPath(uri.fsPath);

  if (storyItem) {
    treeProvider.invalidateSpecProgress(storyItem);
    treeProvider.refresh();
  }
});

context.subscriptions.push(specWatcher);
```

**Helper Function**:

```typescript
function extractStoryItemFromSpecPath(specPath: string): string | null {
  // Match pattern: specs/story-{number}-{name}/...
  const match = specPath.match(/specs[\/\\]story-(\d+)-/);
  if (match) {
    return `S${match[1]}`;
  }
  return null;
}
```

**Cache Stats Logging**:

```typescript
// Log cache stats every 60 seconds
setInterval(() => {
  const total = this.specProgressCacheHits + this.specProgressCacheMisses;
  if (total > 0) {
    const hitRate = Math.round((this.specProgressCacheHits / total) * 100);
    this.outputChannel.appendLine(
      `[SpecProgressCache] Hit rate: ${hitRate}% (${this.specProgressCacheHits} hits / ${this.specProgressCacheMisses} misses)`
    );
  }
}, 60000);
```

## Dependencies

- S93 (Spec Progress Reader) - Must be completed first
- Existing FileSystemWatcher infrastructure
- PlanningTreeProvider (S49)

## Testing Strategy

**Unit Tests**:
- Test cache stores and retrieves SpecProgress objects
- Test cache invalidation clears specific entry
- Test clearSpecProgressCache() clears all entries
- Test cache hit/miss tracking increments correctly

**Integration Tests**:
- Test FileSystemWatcher triggers cache invalidation
- Test spec file change invalidates correct cache entry
- Verify cache hit rate > 80% with multiple refreshes
- Test extractStoryItemFromSpecPath() with various paths

## Files to Modify

1. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Add specProgressCache Map
   - Add getSpecProgressCached() method
   - Add cache invalidation methods
   - Add cache stats logging

2. **Update**: `vscode-extension/src/extension.ts`
   - Add FileSystemWatcher for spec directories
   - Wire up cache invalidation on file changes
   - Add extractStoryItemFromSpecPath() helper

3. **Create**: `vscode-extension/src/test/suite/specProgressCache.test.ts`
   - Unit tests for cache operations
   - Integration tests for FileSystemWatcher

## Success Metrics

- Cache hit rate > 80% after initial load
- Cache invalidation triggers on spec file changes
- No stale data displayed (cache always reflects current state)
- Performance: < 100ms refresh time with 50+ stories (most hits cached)
- Cache stats logged every 60 seconds to output channel

## Notes

- Follow same pattern as ProgressInfo cache (S91) for consistency
- Cache invalidation must be precise (only affected story, not entire cache)
- Consider adding cache warming on extension activation (preload all specs)
- FileSystemWatcher must watch both plan.md and tasks/*.md files
- Log cache stats to help debug performance issues
