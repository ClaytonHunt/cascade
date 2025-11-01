---
item: S40
title: Frontmatter Cache Layer
type: story
status: Completed
priority: High
dependencies: [S38, S39]
estimate: M
spec: specs/S40-frontmatter-cache-layer/
created: 2025-10-12
updated: 2025-10-13
---

# S40 - Frontmatter Cache Layer

## Description

Implement an in-memory cache layer for parsed frontmatter data with automatic invalidation on file changes. The cache optimizes performance by avoiding redundant file parsing while ensuring data freshness through file modification timestamp tracking and FileSystemWatcher integration.

## Acceptance Criteria

- [ ] In-memory cache stores parsed frontmatter data by file path
- [ ] Cache entries include file modification timestamp for staleness detection
- [ ] Cache invalidation triggered by FileSystemWatcher events (change, delete)
- [ ] Cache miss triggers lazy parsing (parser only called when needed)
- [ ] Cache hit returns data immediately without file I/O
- [ ] Cache size is bounded (LRU eviction when limit reached)
- [ ] Cache statistics logged to output channel (hits, misses, evictions)
- [ ] Cache is cleared when extension deactivates
- [ ] Cache handles Windows paths correctly (normalized path keys)

## Technical Notes

**Cache Interface:**
```typescript
interface CacheEntry {
  frontmatter: Frontmatter;
  mtime: number;           // File modification timestamp (ms since epoch)
  cachedAt: number;        // When cache entry was created
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class FrontmatterCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number = 1000;  // Maximum cache entries
  private stats: CacheStats;

  async get(filePath: string): Promise<Frontmatter | null> {
    const normalizedPath = normalizePath(filePath);

    // Check cache
    const cached = this.cache.get(normalizedPath);
    if (cached) {
      // Verify freshness
      const currentMtime = await getFileMtime(filePath);
      if (currentMtime === cached.mtime) {
        this.stats.hits++;
        return cached.frontmatter;
      } else {
        // Stale cache entry, invalidate
        this.cache.delete(normalizedPath);
      }
    }

    // Cache miss - parse file
    this.stats.misses++;
    const parseResult = await parseFrontmatter(filePath);

    if (parseResult.success && parseResult.frontmatter) {
      await this.set(normalizedPath, parseResult.frontmatter);
      return parseResult.frontmatter;
    }

    return null;
  }

  async set(filePath: string, frontmatter: Frontmatter): Promise<void> {
    const normalizedPath = normalizePath(filePath);

    // LRU eviction if cache full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    const mtime = await getFileMtime(filePath);
    this.cache.set(normalizedPath, {
      frontmatter,
      mtime,
      cachedAt: Date.now()
    });
  }

  invalidate(filePath: string): void {
    const normalizedPath = normalizePath(filePath);
    this.cache.delete(normalizedPath);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats, size: this.cache.size };
  }
}
```

**Path Normalization:**
Normalize Windows paths for consistent cache keys:
```typescript
function normalizePath(filePath: string): string {
  // Convert backslashes to forward slashes
  // Convert to lowercase on Windows for case-insensitive comparison
  return filePath.replace(/\\/g, '/').toLowerCase();
}
```

**Integration with FileSystemWatcher (S38):**
```typescript
// In file change handler
plansWatcher.onDidChange((uri) => {
  frontmatterCache.invalidate(uri.fsPath);
  outputChannel.appendLine(`[CACHE] Invalidated: ${uri.fsPath}`);
});

plansWatcher.onDidDelete((uri) => {
  frontmatterCache.invalidate(uri.fsPath);
  outputChannel.appendLine(`[CACHE] Removed: ${uri.fsPath}`);
});

// Create events don't need invalidation (no cache entry exists yet)
```

**File Modification Time (mtime):**
```typescript
import * as fs from 'fs/promises';

async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch (error) {
    return 0; // File doesn't exist
  }
}
```

**LRU Eviction Strategy:**
- Use Map's insertion order property (FIFO approximation of LRU)
- On cache full, evict oldest entry (first key in Map)
- More sophisticated LRU can be implemented later if needed

**Cache Size Limit:**
- Default: 1000 entries (should cover most projects)
- Configurable via extension settings in future (not required for this story)
- For Lineage project: ~35 stories + ~15 features + ~5 epics + ~30 specs = ~85 files (well under limit)

**Logging Examples:**
```
[CACHE] Miss: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-36-extension-project-scaffold.md
[CACHE] Hit: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-36-extension-project-scaffold.md (mtime match)
[CACHE] Invalidated: plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-36-extension-project-scaffold.md
[CACHE] Stats: hits=245, misses=38, evictions=0, size=85
```

## Edge Cases

- **File deleted:** Cache invalidation removes entry, subsequent get returns null
- **File modified outside VSCode:** mtime check catches external changes
- **Rapid file changes:** FileSystemWatcher debouncing (from S38) reduces invalidation churn
- **Cache size exceeded:** LRU eviction maintains bounded memory usage
- **Extension reload:** Cache cleared and rebuilt on deactivation/activation
- **Concurrent reads:** Map is safe for concurrent reads in single-threaded JS

## Performance Targets

- **Cache hit:** < 1ms (Map lookup)
- **Cache miss:** < 10ms (file parsing from S39)
- **Invalidation:** < 1ms (Map delete)
- **Memory usage:** ~100 bytes per cache entry (rough estimate)
- **Max memory:** ~100KB for 1000 entries (acceptable overhead)

## Integration Points

- S38 (FileSystemWatcher) calls `cache.invalidate()` on file changes
- S39 (Parser) is called by `cache.get()` on cache miss
- F12/F13 (Visualization) will call `cache.get()` to retrieve frontmatter for decorations

## Testing Strategy

Unit tests for:
1. **Cache miss → parse → cache hit:** Verify parsing happens once
2. **mtime change → cache miss:** Verify staleness detection
3. **Invalidation → cache miss:** Verify watcher integration
4. **LRU eviction:** Fill cache beyond limit, verify oldest entry removed
5. **Path normalization:** Windows paths (backslashes) normalized correctly

## Definition of Done

- Cache successfully stores and retrieves frontmatter data
- Cache hits avoid redundant file parsing (verified via stats)
- File changes trigger cache invalidation and re-parsing
- Cache size is bounded (LRU eviction working)
- Cache statistics logged periodically to output channel
- Windows path normalization works correctly
- No memory leaks on repeated cache churn
