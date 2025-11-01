---
spec: S40
phase: 1
title: Core Cache Implementation
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-13
---

# Phase 1: Core Cache Implementation

## Overview

Implement the foundational FrontmatterCache class with Map-based storage, file modification time (mtime) tracking, and core operations (get, set, invalidate, clear). This phase creates a standalone cache module that can store and retrieve parsed frontmatter data while detecting staleness through mtime comparison.

The cache operates as a pure TypeScript utility class with no VSCode API dependencies, making it easily testable and portable. It acts as an intelligent wrapper around the parser (S39), avoiding redundant file parsing by caching results and automatically invalidating stale entries.

## Prerequisites

- ✅ S39 (YAML Frontmatter Parser) completed
- ✅ Parser types available in `vscode-extension/src/types.ts`
- ✅ Parser function `parseFrontmatter()` available in `vscode-extension/src/parser.ts`
- Node.js fs/promises API for file operations

## Tasks

### Task 1: Create Cache Types and Interfaces

**Goal**: Define TypeScript interfaces for cache entries and statistics

**Location**: `vscode-extension/src/cache.ts` (new file)

**Implementation**:
```typescript
import { Frontmatter } from './types';

/**
 * Cache entry storing parsed frontmatter with metadata
 */
interface CacheEntry {
  /** Parsed frontmatter data */
  frontmatter: Frontmatter;

  /** File modification time in milliseconds since epoch */
  mtime: number;

  /** Timestamp when entry was cached (for debugging) */
  cachedAt: number;
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  /** Number of cache hits (data found and fresh) */
  hits: number;

  /** Number of cache misses (not found or stale) */
  misses: number;

  /** Number of LRU evictions */
  evictions: number;

  /** Current number of cached entries */
  size: number;
}
```

**Validation**:
- ✅ CacheEntry interface matches design spec
- ✅ CacheStats interface exported (used by extension.ts for logging)
- ✅ Types compile without errors

**References**:
- Frontmatter type: `vscode-extension/src/types.ts:33-73`
- Design doc: `specs/S40-frontmatter-cache-layer/plan.md:150-167`

### Task 2: Implement Path Normalization Helper

**Goal**: Create helper function to normalize Windows paths for consistent cache keys

**Location**: `vscode-extension/src/cache.ts`

**Implementation**:
```typescript
/**
 * Normalizes file path for consistent cache keys.
 *
 * Handles Windows path variations:
 * - Converts backslashes to forward slashes
 * - Converts to lowercase (Windows is case-insensitive)
 *
 * Examples:
 * - 'D:\\Projects\\Lineage\\plans\\story-40.md' → 'd:/projects/lineage/plans/story-40.md'
 * - 'D:/Projects/Lineage/plans/story-40.md' → 'd:/projects/lineage/plans/story-40.md'
 *
 * @param filePath - Absolute file path (Windows or Unix style)
 * @returns Normalized path (lowercase, forward slashes)
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}
```

**Validation**:
- ✅ Backslashes converted to forward slashes
- ✅ Path converted to lowercase
- ✅ Mixed formats normalize to same result
- ✅ Empty string handled without error

**Test Cases**:
```typescript
normalizePath('D:\\plans\\story-40.md') === 'd:/plans/story-40.md'
normalizePath('D:/plans/story-40.md') === 'd:/plans/story-40.md'
normalizePath('D:\\Plans\\Story-40.md') === 'd:/plans/story-40.md'
```

**References**:
- Path normalization design: `specs/S40-frontmatter-cache-layer/plan.md:83-104`
- S40 story technical notes: `plans/.../story-40-frontmatter-cache-layer.md:116-124`

### Task 3: Implement mtime Retrieval Helper

**Goal**: Create async helper function to retrieve file modification time

**Location**: `vscode-extension/src/cache.ts`

**Implementation**:
```typescript
import * as fs from 'fs/promises';

/**
 * Retrieves file modification time (mtime) in milliseconds.
 *
 * Uses Node.js fs.stat() to get file metadata without reading file content.
 * Returns 0 if file doesn't exist or stat fails (indicates invalid cache entry).
 *
 * @param filePath - Absolute path to file
 * @returns File modification time in milliseconds since epoch, or 0 if file doesn't exist
 */
async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs; // Microsecond precision
  } catch (error) {
    // File doesn't exist or permission denied
    return 0;
  }
}
```

**Validation**:
- ✅ Returns valid timestamp for existing files
- ✅ Returns 0 for non-existent files
- ✅ Async function (non-blocking I/O)
- ✅ Error handling prevents exceptions

**References**:
- Node.js fs.stat() docs: https://nodejs.org/api/fs.html#fspromisesstatpath-options
- S40 story technical notes: `plans/.../story-40-frontmatter-cache-layer.md:142-154`
- mtime tracking design: `specs/S40-frontmatter-cache-layer/plan.md:147-164`

### Task 4: Create FrontmatterCache Class Structure

**Goal**: Define class structure with private cache Map and statistics

**Location**: `vscode-extension/src/cache.ts`

**Implementation**:
```typescript
/**
 * In-memory cache for parsed frontmatter data with automatic staleness detection.
 *
 * The cache stores parsed frontmatter by file path, avoiding redundant file parsing.
 * Staleness is detected by comparing cached mtime vs current file mtime.
 *
 * Usage:
 * ```typescript
 * const cache = new FrontmatterCache();
 * const frontmatter = await cache.get('/path/to/file.md');
 * if (frontmatter) {
 *   console.log(`Item: ${frontmatter.item}`);
 * }
 * ```
 */
export class FrontmatterCache {
  /** Internal cache storage (path → entry) */
  private cache: Map<string, CacheEntry>;

  /** Maximum cache size (LRU eviction when exceeded) */
  private maxSize: number = 1000;

  /** Cache statistics */
  private stats: CacheStats;

  /**
   * Creates a new frontmatter cache instance.
   *
   * @param maxSize - Maximum number of cached entries (default: 1000)
   */
  constructor(maxSize?: number) {
    this.cache = new Map<string, CacheEntry>();

    if (maxSize !== undefined && maxSize > 0) {
      this.maxSize = maxSize;
    }

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  // Methods implemented in subsequent tasks
}
```

**Validation**:
- ✅ Class exports correctly
- ✅ Constructor initializes cache Map
- ✅ Constructor accepts optional maxSize parameter
- ✅ Statistics initialized to zeros
- ✅ Default maxSize is 1000

**References**:
- Cache interface design: `plans/.../story-40-frontmatter-cache-layer.md:48-113`
- Architecture decision: `specs/S40-frontmatter-cache-layer/plan.md:27-46`

### Task 5: Implement get() Method with Staleness Detection

**Goal**: Implement cache retrieval with mtime-based staleness checking

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache class)

**Implementation**:
```typescript
/**
 * Retrieves frontmatter from cache or parses file on cache miss.
 *
 * Cache hit: Returns cached data if mtime matches (data is fresh)
 * Cache miss: Parses file and caches result
 * Stale data: Invalidates cache entry and re-parses file
 *
 * @param filePath - Absolute path to markdown file
 * @returns Parsed frontmatter, or null if file doesn't exist or parsing fails
 */
async get(filePath: string): Promise<Frontmatter | null> {
  const normalizedPath = normalizePath(filePath);

  // Check cache for existing entry
  const cached = this.cache.get(normalizedPath);

  if (cached) {
    // Verify freshness by comparing mtime
    const currentMtime = await getFileMtime(filePath);

    if (currentMtime === cached.mtime && currentMtime !== 0) {
      // Cache hit: Data is fresh
      this.stats.hits++;
      return cached.frontmatter;
    } else {
      // Stale data: mtime mismatch or file deleted
      this.cache.delete(normalizedPath);
      // Fall through to cache miss logic
    }
  }

  // Cache miss: Parse file and cache result
  this.stats.misses++;

  try {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter using S39 parser
    const parseResult = parseFrontmatter(content);

    if (parseResult.success && parseResult.frontmatter) {
      // Cache the result
      await this.set(normalizedPath, parseResult.frontmatter);
      return parseResult.frontmatter;
    } else {
      // Parse failed - return null (don't cache errors)
      return null;
    }
  } catch (error) {
    // File read failed (doesn't exist, permission denied, etc.)
    return null;
  }
}
```

**Important Notes**:
- Import parseFrontmatter: `import { parseFrontmatter } from './parser';`
- Import fs: `import * as fs from 'fs/promises';`
- get() calls set() to cache parsed data (set() implemented in Task 6)
- Parse errors not cached (avoid caching transient failures)

**Validation**:
- ✅ Cache hit returns cached data immediately
- ✅ Cache miss triggers file parse and caching
- ✅ Stale mtime triggers re-parse
- ✅ Non-existent file returns null
- ✅ Parse errors return null (not cached)
- ✅ Statistics increment correctly

**References**:
- S40 story cache interface: `plans/.../story-40-frontmatter-cache-layer.md:53-80`
- Parser API: `vscode-extension/src/parser.ts:171-287`
- Design rationale: `specs/S40-frontmatter-cache-layer/plan.md:147-164`

### Task 6: Implement set() Method

**Goal**: Store parsed frontmatter in cache with mtime

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache class)

**Implementation**:
```typescript
/**
 * Stores frontmatter in cache with current file mtime.
 *
 * Note: LRU eviction implemented in Phase 3.
 * For Phase 1, this method simply stores the entry without size checks.
 *
 * @param filePath - Absolute path to markdown file (pre-normalized)
 * @param frontmatter - Parsed frontmatter data
 */
private async set(filePath: string, frontmatter: Frontmatter): Promise<void> {
  // Get current file mtime for staleness detection
  const mtime = await getFileMtime(filePath);

  // Create cache entry
  const entry: CacheEntry = {
    frontmatter,
    mtime,
    cachedAt: Date.now()
  };

  // Store in cache (overwrites existing entry if present)
  this.cache.set(filePath, entry);

  // Note: Phase 3 will add LRU eviction logic here
}
```

**Important Notes**:
- Method is `private` (called only by get())
- filePath should already be normalized by caller (get())
- LRU eviction deferred to Phase 3 (allows Phase 1 to remain simple)
- Overwrites existing entries (Map.set() behavior)

**Validation**:
- ✅ Entry stored with frontmatter, mtime, cachedAt
- ✅ Overwrites existing entry for same path
- ✅ mtime retrieved correctly
- ✅ cachedAt timestamp set to current time

**References**:
- S40 story cache interface: `plans/.../story-40-frontmatter-cache-layer.md:82-98`
- CacheEntry structure: Task 1 above

### Task 7: Implement invalidate() Method

**Goal**: Remove single entry from cache by file path

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache class)

**Implementation**:
```typescript
/**
 * Invalidates (removes) a cached entry by file path.
 *
 * Called by FileSystemWatcher when file changes or is deleted.
 * Safe to call even if entry doesn't exist (no-op).
 *
 * @param filePath - Absolute path to markdown file
 */
invalidate(filePath: string): void {
  const normalizedPath = normalizePath(filePath);
  this.cache.delete(normalizedPath);
}
```

**Important Notes**:
- Method is `public` (called by extension.ts and S38 watcher)
- Path normalized before lookup (handles different formats)
- Map.delete() is idempotent (safe to call multiple times)
- Synchronous operation (no async needed for Map delete)

**Validation**:
- ✅ Existing entry removed from cache
- ✅ Non-existent entry handled gracefully (no error)
- ✅ Path normalization applied
- ✅ Synchronous execution

**References**:
- S40 story invalidation: `plans/.../story-40-frontmatter-cache-layer.md:100-103`
- FileSystemWatcher integration: `plans/.../story-40-frontmatter-cache-layer.md:126-140`

### Task 8: Implement clear() Method

**Goal**: Remove all entries from cache and reset statistics

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache class)

**Implementation**:
```typescript
/**
 * Clears all cached entries and resets statistics.
 *
 * Called when extension deactivates or for testing purposes.
 */
clear(): void {
  this.cache.clear();

  this.stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };
}
```

**Important Notes**:
- Resets both cache data and statistics
- Used in extension deactivation cleanup
- Useful for testing (clean state between tests)

**Validation**:
- ✅ All cache entries removed
- ✅ Statistics reset to zeros
- ✅ Cache size becomes 0

**References**:
- S40 story clear method: `plans/.../story-40-frontmatter-cache-layer.md:105-108`
- Extension deactivation: `vscode-extension/src/extension.ts:251-259`

### Task 9: Implement getStats() Method

**Goal**: Retrieve current cache statistics

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache class)

**Implementation**:
```typescript
/**
 * Returns current cache statistics.
 *
 * Used for logging and debugging cache performance.
 *
 * @returns Copy of cache statistics (hits, misses, evictions, size)
 */
getStats(): CacheStats {
  return {
    ...this.stats,
    size: this.cache.size  // Use current Map size (accurate count)
  };
}
```

**Important Notes**:
- Returns copy of stats (prevents external mutation)
- size field updated from Map.size (always accurate)
- Used by extension.ts for periodic logging

**Validation**:
- ✅ Returns object with hits, misses, evictions, size
- ✅ size field matches cache.size
- ✅ Returns copy (not reference to internal stats)

**References**:
- CacheStats interface: Task 1 above
- S40 story getStats: `plans/.../story-40-frontmatter-cache-layer.md:110-112`
- Logging design: `specs/S40-frontmatter-cache-layer/plan.md:180-199`

### Task 10: Add Module Exports and Imports

**Goal**: Ensure all necessary exports and imports are in place

**Location**: `vscode-extension/src/cache.ts`

**Implementation**:
```typescript
// At top of file:
import { Frontmatter } from './types';
import { parseFrontmatter } from './parser';
import * as fs from 'fs/promises';

// At bottom of file:
export { FrontmatterCache };
export type { CacheStats };
```

**Validation**:
- ✅ All imports resolve correctly
- ✅ FrontmatterCache class exported
- ✅ CacheStats type exported (used by extension.ts)
- ✅ No TypeScript compilation errors

**References**:
- Types module: `vscode-extension/src/types.ts`
- Parser module: `vscode-extension/src/parser.ts`

## Completion Criteria

**Functional Requirements:**
- ✅ FrontmatterCache class created with all core methods
- ✅ Cache stores and retrieves frontmatter correctly
- ✅ mtime staleness detection works (stale entries invalidated)
- ✅ Path normalization handles Windows paths
- ✅ invalidate() removes entries
- ✅ clear() resets cache and statistics
- ✅ getStats() returns accurate statistics

**Code Quality:**
- ✅ All methods have JSDoc comments
- ✅ TypeScript strict mode passes (no type errors)
- ✅ No VSCode API dependencies (pure TypeScript utility)
- ✅ Error handling prevents crashes

**Performance:**
- ✅ Cache hit: < 1ms (Map lookup + mtime check)
- ✅ Cache miss: < 10ms (file read + parse + cache set)

**Testing Readiness:**
- ✅ Module exports correctly
- ✅ Class instantiable with new FrontmatterCache()
- ✅ Methods callable from tests

**Documentation:**
- ✅ JSDoc comments for all public methods
- ✅ Usage examples in class documentation
- ✅ Implementation notes documented

## Next Phase

**Phase 2: FileSystemWatcher Integration**
- Integrate cache with S38 FileSystemWatcher
- Call cache.invalidate() on file change/delete events
- Add logging for cache invalidation

**Prerequisite**: S38 (FileSystemWatcher) must be completed before starting Phase 2.

**Alternative Path**: If S38 not ready, proceed to Phase 3 (LRU Eviction & Statistics) which has no external dependencies.
