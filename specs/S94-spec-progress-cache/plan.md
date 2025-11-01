---
spec: S94
title: Spec Progress Cache Layer
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-27
updated: 2025-10-27
---

# S94 - Spec Progress Cache Layer Implementation Specification

## Overview

Implement an in-memory cache for spec progress data to avoid re-reading spec directories on every TreeView refresh. This cache follows the same pattern as the existing ProgressInfo cache (S91) and integrates with the FileSystemWatcher to detect spec file changes.

## Implementation Strategy

The implementation is divided into 3 incremental phases, each building upon the previous:

1. **Phase 1: Cache Infrastructure** - Add cache data structures and core cache operations to PlanningTreeProvider
2. **Phase 2: FileSystemWatcher Integration** - Set up watchers for spec directories and implement cache invalidation
3. **Phase 3: Integration and Performance Logging** - Wire up cache usage in getTreeItem() and add performance metrics

## Architecture Decisions

### Cache Storage

The spec progress cache will be stored as a `Map<string, SpecProgress>` in PlanningTreeProvider, keyed by story item number (e.g., "S75"). This design:

- Provides O(1) lookup time for cache hits
- Stores rich SpecProgress objects returned by readSpecProgress() (S93)
- Shares lifecycle with existing caches (cleared on refresh)
- Matches the pattern used for ProgressInfo cache (S91)

### Cache Invalidation Strategy

Cache invalidation occurs in three scenarios:

1. **Manual refresh**: All caches cleared together in refresh() method
2. **Spec file changes**: FileSystemWatcher detects changes to spec directories
3. **Phase file changes**: FileSystemWatcher watches tasks/*.md files for updates

The invalidation is **selective** - only the affected story's cache entry is cleared, not the entire cache. This preserves cache hits for unmodified specs while ensuring data accuracy.

### FileSystemWatcher Pattern

The implementation extends the existing FileSystemWatcher infrastructure in extension.ts:

```typescript
// Watch spec directories for changes
const specWatcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceFolder, 'specs/**/+(plan.md|tasks/*.md)')
);
```

The glob pattern `+(plan.md|tasks/*.md)` ensures we capture:
- Changes to spec plan.md files
- Changes to any phase task file in tasks/ subdirectory

### Integration with Existing Code

The cache integrates with these existing components:

1. **readSpecProgress() (S93)**: Called on cache miss to populate cache
2. **PlanningTreeProvider.refresh()**: Clears spec progress cache along with other caches
3. **PlanningTreeProvider.getTreeItem()**: Checks cache before calling readSpecProgress()
4. **FileSystemWatcher (extension.ts)**: Extended to watch spec directories

## Key Integration Points

### PlanningTreeProvider Updates

File: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Key changes:
- Add `specProgressCache` Map (line ~175, near progressCache)
- Add `specProgressCacheHits/Misses` counters (line ~180)
- Add `getSpecProgressCached()` method (new method after getTreeItem)
- Add `invalidateSpecProgress()` method (new method)
- Add `clearSpecProgressCache()` method (new method)
- Update `refresh()` to clear spec progress cache (line ~710)
- Add cache stats logging in constructor (line ~325, in setInterval)

### extension.ts Updates

File: `vscode-extension/src/extension.ts`

Key changes:
- Add spec FileSystemWatcher in `createFileSystemWatchers()` (after line ~490)
- Add `extractStoryItemFromSpecPath()` helper function (new function)
- Wire up cache invalidation on spec file changes

### New PlanningTreeItem Field

The `spec` field is already defined in the Frontmatter interface (types.ts:73) and PlanningTreeItem interface, so no changes needed to data structures.

## Risk Assessment

### Low Risk

- Cache follows proven pattern from ProgressInfo cache (S91)
- Selective invalidation prevents cache staleness
- FileSystemWatcher already exists and is tested
- readSpecProgress() (S93) is already implemented and tested

### Potential Issues

1. **Path extraction from spec paths**: The `extractStoryItemFromSpecPath()` function must correctly parse story numbers from various spec directory formats
   - Mitigation: Comprehensive unit tests for path parsing edge cases

2. **Cache consistency during batch operations**: Multiple spec files changing simultaneously (e.g., git merge) could trigger multiple invalidations
   - Mitigation: FileSystemWatcher already has debouncing (300ms) to batch rapid changes

3. **Memory overhead**: Caching all spec progress data could increase memory usage
   - Mitigation: Spec progress objects are small (~200 bytes), cache is cleared on refresh, typical workspaces have < 100 specs

## Phase Overview

### Phase 1: Cache Infrastructure
- Add specProgressCache Map to PlanningTreeProvider
- Implement getSpecProgressCached() method
- Implement invalidateSpecProgress() and clearSpecProgressCache() methods
- Update refresh() to clear spec progress cache
- **Completion Criteria**: Cache methods exist and compile, no runtime integration yet

### Phase 2: FileSystemWatcher Integration
- Add FileSystemWatcher for specs/** directories in extension.ts
- Implement extractStoryItemFromSpecPath() helper function
- Wire up cache invalidation on spec file changes
- Register watcher in context.subscriptions
- **Completion Criteria**: Spec file changes trigger cache invalidation, output channel logs events

### Phase 3: Integration and Performance Logging
- Update getTreeItem() to use getSpecProgressCached() instead of direct readSpecProgress()
- Add cache hit/miss tracking logic
- Add cache stats logging (every 60 seconds, following ProgressInfo cache pattern)
- Verify cache invalidation on manual refresh
- **Completion Criteria**: Cache operational, hit rate > 80% after initial load, logs show cache stats

## Success Metrics

1. **Performance**: Cache hit rate > 80% after initial TreeView load
2. **Correctness**: Cache invalidation triggers on all spec file changes
3. **Consistency**: No stale data displayed (cache always reflects current state)
4. **Speed**: TreeView refresh time < 100ms with 50+ stories (most hits cached)
5. **Observability**: Cache stats logged every 60 seconds to output channel

## Testing Strategy

### Unit Tests

File: `vscode-extension/src/test/suite/specProgressCache.test.ts` (create new)

Test cases:
- Cache stores and retrieves SpecProgress objects
- Cache invalidation clears specific entry
- clearSpecProgressCache() clears all entries
- Cache hit/miss tracking increments correctly
- extractStoryItemFromSpecPath() parses various path formats

### Integration Tests

Test scenarios:
- FileSystemWatcher triggers cache invalidation on spec plan.md change
- FileSystemWatcher triggers cache invalidation on phase file change
- Cache hit rate > 80% with multiple TreeView refreshes
- Manual refresh clears entire cache
- Cache survives partial refreshes (only affected entry cleared)

### Manual Testing

1. Open Cascade TreeView with stories that have specs
2. Verify output channel shows cache misses on first load
3. Collapse/expand TreeView, verify cache hits
4. Edit spec plan.md file, save, verify cache invalidation in output channel
5. Edit phase file, save, verify cache invalidation
6. Wait 60 seconds, verify cache stats appear in output channel

## Files Modified

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts** (Phase 1, Phase 3)
   - Add cache infrastructure
   - Add cache methods
   - Update refresh() and getTreeItem()

2. **vscode-extension/src/extension.ts** (Phase 2)
   - Add FileSystemWatcher for specs
   - Add helper function for path extraction
   - Wire up cache invalidation

3. **vscode-extension/src/test/suite/specProgressCache.test.ts** (Phase 3 - NEW FILE)
   - Unit tests for cache operations
   - Integration tests for FileSystemWatcher

## Dependencies

- **S93 (Spec Progress Reader)**: Must be completed - provides readSpecProgress() function
- **S91 (Progress Cache Infrastructure)**: Reference implementation for cache pattern
- **S58 (Items Cache)**: Reference implementation for cache lifecycle
- **S71 (FileSystemWatcher)**: Existing infrastructure for file change detection

## Notes

- Follow same logging pattern as ProgressInfo cache: `[SpecProgressCache]` prefix
- Cache cleared twice per refresh (same pattern as ProgressInfo cache in S92)
- Consider adding cache warming on extension activation (preload all specs) in future enhancement
- FileSystemWatcher glob pattern uses `+(plan.md|tasks/*.md)` syntax to match both files
- Cache stats logged every 60 seconds to help debug performance issues
