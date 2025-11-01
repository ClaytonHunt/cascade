---
spec: S40
title: Frontmatter Cache Layer
type: spec
status: Completed
priority: High
phases: 4
created: 2025-10-12
updated: 2025-10-13
---

# S40 - Frontmatter Cache Layer

## Implementation Strategy

Build an in-memory cache layer that optimizes frontmatter parsing performance by caching parsed data with automatic invalidation on file changes. The cache layer sits between the parser (S39) and future visualization features (F12/F13), providing sub-millisecond access to frontmatter data while maintaining freshness through file modification timestamp tracking.

The implementation follows a four-phase approach:
1. **Core Cache Implementation** - In-memory Map-based cache with mtime tracking
2. **FileSystemWatcher Integration** - Cache invalidation on file changes (depends on S38)
3. **LRU Eviction & Statistics** - Bounded cache size with usage metrics
4. **Testing & Integration** - Comprehensive test suite and extension integration

## Architecture Decisions

### Cache Data Structure: Map vs Object
**Decision: Use JavaScript Map for cache storage**
- Preserves insertion order (enables FIFO/LRU eviction)
- Efficient key lookup (O(1) average case)
- Better performance than plain objects for frequent add/delete operations
- Native iteration methods (keys(), values(), entries())
- Clear size property without Object.keys() overhead

**Alternative Considered**: Plain JavaScript object
- Rejected: No guaranteed insertion order before ES2015
- Rejected: Less efficient for cache operations
- Rejected: Requires workarounds for size tracking

### Path Normalization Strategy
**Decision: Normalize Windows paths to lowercase with forward slashes**
- Windows filesystem is case-insensitive (C:\Path = c:\path)
- VSCode may provide paths with mixed slashes (C:\foo\bar vs C:/foo/bar)
- Normalization ensures cache hits for same file with different path formats
- Conversion: Backslashes → forward slashes, uppercase → lowercase

**Example:**
```typescript
normalizePath('D:\\Projects\\Lineage\\plans\\story-40.md')
// Returns: 'd:/projects/lineage/plans/story-40.md'
```

**Edge Cases Handled:**
- Mixed slashes: `D:\plans\epic-03/story-40.md` → normalized
- Case differences: `D:\Plans\Story-40.md` vs `d:\plans\story-40.md` → same cache key
- Relative paths: Not supported (extension always uses absolute paths from VSCode URIs)

### LRU Eviction: Simple vs Complex
**Decision: Use FIFO approximation of LRU with Map insertion order**
- Map maintains insertion order automatically (ES2015 spec)
- On cache full: Delete first (oldest) entry and add new entry at end
- Simple implementation: `map.keys().next().value` gets oldest key
- Good enough for extension use case (access patterns favor recent files)

**Alternative Considered**: Full LRU with access-time tracking
- Rejected: Requires updating entry position on every get() (performance overhead)
- Rejected: More complex implementation with doubly-linked list
- Future enhancement: Can upgrade if access patterns show need for true LRU

**Performance Comparison:**
- FIFO (current): O(1) eviction, no overhead on cache hits
- True LRU: O(1) eviction, O(1) overhead on every cache hit (move to end)
- For extension's access patterns (recent files accessed repeatedly), FIFO is sufficient

### File Modification Time (mtime) Tracking
**Decision: Store mtime with each cache entry for staleness detection**
- Node.js fs.stat() provides mtimeMs (milliseconds since epoch, high precision)
- Compare cached mtime vs current mtime on cache hit
- Mismatch indicates file changed externally (outside VSCode or by other process)
- Stale entries automatically invalidated and re-parsed

**Why mtime over content hash:**
- mtime check requires no file I/O (stat syscall vs full file read)
- mtime sufficient for staleness detection (file changed = needs reparse)
- Content hash would be overkill (already parsing file on cache miss anyway)

**Edge Case**: Rapid saves in < 1ms might preserve same mtime
- Mitigation: FileSystemWatcher (S38) invalidates immediately on save event
- mtimeMs provides microsecond precision (sufficient for most scenarios)

### Cache Size Limit
**Decision: Default maximum of 1000 entries**
- Lineage project currently has ~85 plan/spec files
- 10x current size provides ample headroom for growth
- Memory estimate: ~100 bytes per entry = ~100KB max memory
- Configurable in future via extension settings (out of scope for S40)

**Memory Calculation:**
```typescript
// Typical cache entry:
{
  frontmatter: {
    item: 'S40',           // ~10 bytes
    title: '...',          // ~50 bytes
    // ... other fields     // ~200 bytes total
  },
  mtime: 1697123456789,    // 8 bytes (number)
  cachedAt: 1697123456800  // 8 bytes (number)
}
// Total: ~220 bytes per entry
// 1000 entries = 220KB (acceptable for VSCode extension)
```

### Cache Statistics & Logging
**Decision: Track hits, misses, evictions; log to output channel**
- Statistics help diagnose cache efficiency and performance issues
- Logged periodically (not on every operation to avoid spam)
- Output channel: "Lineage Planning" (same as extension.ts)
- Useful for debugging and understanding extension behavior

**Statistics Tracked:**
```typescript
interface CacheStats {
  hits: number;        // Cache hit count (data found and fresh)
  misses: number;      // Cache miss count (not found or stale)
  evictions: number;   // LRU eviction count (cache full)
  size: number;        // Current cache size
}
```

## Key Integration Points

### Current Integration
1. **Parser (S39)**: Cache calls `parseFrontmatter()` on cache miss
   - Location: `vscode-extension/src/parser.ts`
   - Function: `parseFrontmatter(content: string): ParseResult`
   - Cache will need file path, must read file content separately

2. **Extension Entry Point (S36/S37)**: Cache initialized in `activate()`
   - Location: `vscode-extension/src/extension.ts:193`
   - Cache created after workspace validation succeeds
   - Disposed in `deactivate()` function

3. **Types (S39)**: Reuse existing `Frontmatter` and `ParseResult` types
   - Location: `vscode-extension/src/types.ts`
   - No new types needed for frontmatter data
   - New types: `CacheEntry`, `CacheStats`

### Future Integration (Dependent Stories)
1. **FileSystemWatcher (S38)**: Will call `cache.invalidate()` on file changes
   - Not yet implemented (S38 is "Not Started")
   - **Recommendation**: Implement S38 before S40 Phase 2
   - Cache can function without watcher, but won't invalidate on external changes

2. **Status Visualization (F12/F13)**: Will call `cache.get()` to retrieve frontmatter
   - Cache provides performance benefit for decorations (many files, frequent reads)
   - Sub-millisecond access enables real-time UI updates

### File Structure
```
vscode-extension/
├── src/
│   ├── extension.ts          # Existing: Will initialize cache
│   ├── parser.ts              # Existing: Used by cache
│   ├── types.ts               # Existing: Reused by cache
│   └── cache.ts               # NEW: Cache implementation
├── test/
│   └── cache.test.ts          # NEW: Cache unit tests
└── package.json               # No changes needed
```

## Risk Assessment

### Low Risks (Mitigated)
- **Memory usage**: 1000 entry limit caps memory at ~220KB (acceptable)
- **Path normalization bugs**: Windows-specific, but well-tested pattern
- **mtime precision**: Microsecond precision sufficient for typical workflows

### Medium Risks (Monitoring Required)
- **S38 dependency not met**: S38 (FileSystemWatcher) is "Not Started"
  - **Impact**: Cache won't invalidate on external file changes (changes outside VSCode)
  - **Mitigation**: Phase 1 functional without S38; Phase 2 integrates watcher when ready
  - **Workaround**: Manual cache clear on extension reload
  - **Recommendation**: Complete S38 before implementing Phase 2

- **Cache eviction too aggressive**: If projects grow beyond 1000 files
  - **Mitigation**: 1000 limit is 10x current size
  - **Mitigation**: LRU eviction favors frequently accessed files
  - **Future enhancement**: Make limit configurable via settings

### No High Risks Identified
Cache is self-contained module with clear boundaries and no external API dependencies.

## Codebase Analysis Summary

### Existing Files to Modify
1. **`vscode-extension/src/extension.ts:193-241`**
   - Add cache initialization in `activate()` after workspace validation
   - Add cache disposal in `deactivate()`
   - Import cache module: `import { FrontmatterCache } from './cache';`

### New Files to Create
1. **`vscode-extension/src/cache.ts`** (~250 lines)
   - FrontmatterCache class implementation
   - Path normalization helper function
   - mtime retrieval helper function
   - Export FrontmatterCache class

2. **`vscode-extension/test/cache.test.ts`** (~400 lines)
   - Unit tests for cache operations
   - Test fixtures using existing test files from S39
   - Performance tests for cache hit/miss scenarios
   - Integration tests with real plan files

### External Dependencies
**No new dependencies** - Cache uses only:
- Node.js fs/promises API (already used by parser tests)
- Built-in Map data structure
- Existing parser module (S39)
- Existing types module (S39)

### VSCode APIs Used
- None in cache.ts (pure TypeScript utility class)
- vscode.OutputChannel in extension.ts (already exists, used for cache logging)

## Phase Overview

### Phase 1: Core Cache Implementation
**Goal**: Implement basic cache with Map storage, mtime tracking, get/set/invalidate operations

**Key Tasks**:
- Create cache.ts module with FrontmatterCache class
- Implement get() method with mtime staleness check
- Implement set() method with mtime storage
- Implement invalidate() method for single file
- Implement clear() method for cache reset
- Add path normalization helper function
- Add mtime retrieval helper function

**Deliverable**: Working cache that stores and retrieves frontmatter with staleness detection

**Estimated Implementation Time**: 1.5 hours

**Prerequisites**: S39 (Parser) must be completed ✅ (Status: Completed)

**Dependencies**: None (standalone cache implementation)

### Phase 2: FileSystemWatcher Integration
**Goal**: Integrate cache with file watcher to invalidate on file changes

**Key Tasks**:
- Wait for S38 (FileSystemWatcher) completion
- Modify extension.ts to pass cache to watcher handlers
- Call cache.invalidate() in onDidChange handler
- Call cache.invalidate() in onDidDelete handler
- Add logging for cache invalidation events
- Test cache invalidation with file modifications

**Deliverable**: Cache automatically invalidates on file changes detected by watcher

**Estimated Implementation Time**: 45 minutes

**Prerequisites**:
- S38 (FileSystemWatcher) must be completed ❌ (Status: Not Started)
- Phase 1 must be completed

**Dependencies**: S38

**Note**: This phase cannot start until S38 is implemented. Consider implementing S38 next if cache integration is priority.

### Phase 3: LRU Eviction & Statistics
**Goal**: Add cache size limit with LRU eviction and usage statistics

**Key Tasks**:
- Implement maxSize limit (default 1000 entries)
- Add LRU eviction logic in set() method
- Create CacheStats interface
- Add statistics tracking (hits, misses, evictions)
- Implement getStats() method
- Add periodic stats logging to output channel
- Test eviction behavior with > 1000 entries

**Deliverable**: Bounded cache with LRU eviction and statistics reporting

**Estimated Implementation Time**: 1 hour

**Prerequisites**: Phase 1 must be completed

**Dependencies**: None

### Phase 4: Testing & Integration
**Goal**: Create comprehensive test suite and integrate cache into extension

**Key Tasks**:
- Create cache.test.ts with unit tests
- Test cache hit/miss scenarios
- Test mtime staleness detection
- Test LRU eviction behavior
- Test path normalization (Windows paths)
- Test statistics tracking
- Performance test (cache hit < 1ms, cache miss < 10ms)
- Integration test with real plan/spec files
- Update extension.ts to initialize cache
- Add cache disposal in deactivate()
- Manual testing in Extension Development Host

**Deliverable**: Fully tested cache integrated into extension

**Estimated Implementation Time**: 2 hours

**Prerequisites**: Phases 1 and 3 must be completed

**Dependencies**: None

## Testing Strategy

### Unit Tests (cache.test.ts)

**Cache Operations:**
1. get() on empty cache returns null (cache miss)
2. set() followed by get() returns cached data (cache hit)
3. invalidate() removes entry, subsequent get() returns null
4. clear() removes all entries
5. get() with stale mtime triggers re-parse (cache miss)

**Path Normalization:**
1. Windows backslashes normalized to forward slashes
2. Uppercase letters normalized to lowercase
3. Mixed slash formats resolve to same cache key
4. Multiple calls with different formats hit same cache entry

**LRU Eviction:**
1. Cache respects maxSize limit
2. Oldest entry evicted when cache full
3. Eviction counter increments correctly
4. Recently added entries remain after eviction

**Statistics Tracking:**
1. Cache hit increments hits counter
2. Cache miss increments misses counter
3. Eviction increments evictions counter
4. getStats() returns accurate current state

**Edge Cases:**
1. Empty file path handled gracefully
2. Non-existent file returns null (parser error)
3. File deleted between cache hit and access
4. Rapid set() calls don't corrupt cache state
5. Concurrent get() calls for same file

### Performance Tests
1. **Cache hit latency**: < 1ms (Map lookup + mtime comparison)
2. **Cache miss latency**: < 10ms (file read + parse + cache set)
3. **Eviction overhead**: < 1ms (Map delete + insert)
4. **Normalization overhead**: < 0.1ms (string operations)

### Integration Tests
1. Parse all plan files and cache results
2. Verify cache hits on repeated access
3. Test with actual Lineage project file paths (Windows)
4. Verify cache statistics accuracy on real workload

### Manual Testing
1. Package and install extension locally: `cd vscode-extension && npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window (Ctrl+Shift+P → "Developer: Reload Window")
3. Open Lineage workspace
4. Check output channel for cache initialization message
5. Trigger frontmatter reads (TreeView, decorations)
6. Verify cache hits in output channel statistics
7. Modify plan file, verify invalidation (requires S38)
8. Check cache stats after several operations

## Next Steps After Completion

Once S40 is complete, the cache layer will provide:

1. **Performance Foundation for Visualization** (F12/F13)
   - Sub-millisecond access to frontmatter data
   - Enables real-time status decorations without lag
   - Reduces file I/O from O(n) reads to O(1) cache lookups

2. **Readiness for FileSystemWatcher** (S38)
   - Cache integration hooks prepared (Phase 2)
   - invalidate() API ready for watcher callbacks
   - Automatic cache freshness on file changes

3. **Observable Extension Behavior**
   - Cache statistics visible in output channel
   - Diagnostic data for performance troubleshooting
   - Insight into extension resource usage

**Recommended Implementation Order:**
- Option A (S38 parallel): Implement Phase 1 + 3 + 4 now, defer Phase 2 until S38 complete
- Option B (S38 first): Complete S38, then implement all S40 phases sequentially
- Option C (Feature-driven): Implement Phase 1 + 3 + 4, use cache in F12/F13, add Phase 2 later

**Post-Implementation Verification:**
- ✅ Cache hits avoid redundant file parsing (verified via stats)
- ✅ File changes trigger cache invalidation (with S38)
- ✅ Cache size is bounded (LRU eviction working)
- ✅ Cache statistics logged to output channel
- ✅ Windows path normalization works correctly
- ✅ No memory leaks on repeated cache churn
- ✅ Performance targets met (< 1ms hit, < 10ms miss)
