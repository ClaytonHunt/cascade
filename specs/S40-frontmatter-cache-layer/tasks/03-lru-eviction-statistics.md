---
spec: S40
phase: 3
title: LRU Eviction & Statistics Enhancement
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-13
---

# Phase 3: LRU Eviction & Statistics Enhancement

## Overview

Implement cache size limiting with LRU (Least Recently Used) eviction to prevent unbounded memory growth. This phase adds logic to the set() method to evict the oldest entry when the cache reaches its maximum size (default: 1000 entries). Additionally, enhance statistics tracking to include eviction counts and improve logging.

This phase can be implemented immediately after Phase 1, even if Phase 2 (FileSystemWatcher Integration) is blocked by S38 dependencies.

## Prerequisites

- ✅ Phase 1 (Core Cache Implementation) completed
- ✅ FrontmatterCache.set() method exists
- ✅ FrontmatterCache.stats structure includes evictions field
- No external dependencies (independent of S38)

## Tasks

### Task 1: Update set() Method with LRU Eviction Logic

**Goal**: Add cache size check and evict oldest entry when limit exceeded

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache.set method)

**Current Implementation** (from Phase 1):
```typescript
private async set(filePath: string, frontmatter: Frontmatter): Promise<void> {
  const mtime = await getFileMtime(filePath);

  const entry: CacheEntry = {
    frontmatter,
    mtime,
    cachedAt: Date.now()
  };

  this.cache.set(filePath, entry);
  // Note: Phase 3 will add LRU eviction logic here
}
```

**Updated Implementation with LRU Eviction**:
```typescript
private async set(filePath: string, frontmatter: Frontmatter): Promise<void> {
  // LRU eviction: Remove oldest entry if cache is full
  if (this.cache.size >= this.maxSize) {
    // Get first key (oldest entry due to Map insertion order)
    const oldestKey = this.cache.keys().next().value;

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;

      // Optional: Log eviction for debugging (remove in production)
      // console.log(`[CACHE] Evicted: ${oldestKey}`);
    }
  }

  // Get current file mtime for staleness detection
  const mtime = await getFileMtime(filePath);

  // Create cache entry
  const entry: CacheEntry = {
    frontmatter,
    mtime,
    cachedAt: Date.now()
  };

  // Store in cache (new entries added at end due to Map insertion order)
  this.cache.set(filePath, entry);
}
```

**How LRU Works with Map Insertion Order**:
- JavaScript Map maintains insertion order (ES2015 spec guarantee)
- `this.cache.keys().next().value` returns first (oldest) key
- Delete oldest entry when cache size >= maxSize
- New entry added at end (most recently used)
- This is FIFO approximation of LRU (sufficient for extension use case)

**Important Notes**:
- Check `>= maxSize` before adding (ensures limit never exceeded)
- Eviction happens before new entry added
- Increment evictions counter for statistics
- Map.keys() returns iterator; .next().value gets first element

**Edge Cases Handled**:
- Empty cache: `oldestKey` will be undefined, safe to check
- Single entry cache: Works correctly (evicts only entry if maxSize=1)
- maxSize=0: Constructor prevents this (requires maxSize > 0)

**Validation**:
- ✅ Cache size never exceeds maxSize
- ✅ Oldest entry evicted first
- ✅ Evictions counter increments correctly
- ✅ New entry added after eviction
- ✅ No errors with edge cases

**References**:
- S40 story LRU eviction: `plans/.../story-40-frontmatter-cache-layer.md:86-90`
- LRU strategy design: `specs/S40-frontmatter-cache-layer/plan.md:106-127`
- Map insertion order: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

### Task 2: Verify Statistics Tracking

**Goal**: Ensure all statistics fields update correctly

**Location**: `vscode-extension/src/cache.ts` (verify across all methods)

**Statistics Fields**:
```typescript
interface CacheStats {
  hits: number;        // Incremented in get() on cache hit
  misses: number;      // Incremented in get() on cache miss
  evictions: number;   // Incremented in set() on LRU eviction
  size: number;        // Derived from cache.size in getStats()
}
```

**Verification Checklist**:
- ✅ `hits` incremented in get() when mtime matches (Phase 1, Task 5)
- ✅ `misses` incremented in get() on cache miss (Phase 1, Task 5)
- ✅ `evictions` incremented in set() on eviction (Task 1 above)
- ✅ `size` computed from cache.size in getStats() (Phase 1, Task 9)
- ✅ clear() resets all fields to 0 (Phase 1, Task 8)

**No changes needed if Phase 1 implemented correctly.**

**Validation**:
- ✅ All statistics fields functional
- ✅ Counters never negative
- ✅ getStats() returns accurate current state

**References**:
- CacheStats interface: Phase 1, Task 1
- Statistics tracking design: `specs/S40-frontmatter-cache-layer/plan.md:180-199`

### Task 3: Add Configurable maxSize in Constructor

**Goal**: Allow customization of cache size limit (with sensible default)

**Location**: `vscode-extension/src/cache.ts` (FrontmatterCache constructor)

**Current Implementation** (from Phase 1):
```typescript
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
```

**Enhanced Implementation**:
```typescript
/**
 * Creates a new frontmatter cache instance.
 *
 * @param maxSize - Maximum number of cached entries (default: 1000)
 *                  Must be positive integer. Values < 1 will use default.
 */
constructor(maxSize?: number) {
  this.cache = new Map<string, CacheEntry>();

  // Set maxSize with validation
  if (maxSize !== undefined && maxSize > 0 && Number.isInteger(maxSize)) {
    this.maxSize = maxSize;
  } else if (maxSize !== undefined) {
    // Log warning if invalid value provided
    console.warn(`[CACHE] Invalid maxSize: ${maxSize}. Using default: 1000`);
  }
  // Default maxSize = 1000 set by property initializer

  this.stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };
}
```

**Validation Logic**:
- Must be positive integer (> 0)
- Non-integer values rejected (1000.5 → use default)
- Negative/zero values rejected
- undefined uses default (1000)

**Important Notes**:
- Default remains 1000 (sufficient for Lineage project)
- Warning logged if invalid value provided (helps catch bugs)
- Future enhancement: Make configurable via VSCode settings

**Validation**:
- ✅ Default maxSize is 1000
- ✅ Valid custom size accepted (e.g., new FrontmatterCache(500))
- ✅ Invalid sizes rejected with warning
- ✅ Zero and negative values use default

**References**:
- Cache size design: `specs/S40-frontmatter-cache-layer/plan.md:166-179`
- S40 story maxSize: `plans/.../story-40-frontmatter-cache-layer.md:50`

### Task 4: Enhance Logging in extension.ts

**Goal**: Improve cache initialization logging to show maxSize

**Location**: `vscode-extension/src/extension.ts` (activate function)

**Current Logging** (from Phase 2):
```typescript
outputChannel.appendLine('📦 Initializing frontmatter cache...');
frontmatterCache = new FrontmatterCache();
outputChannel.appendLine('   Cache created with max size: 1000 entries');
outputChannel.appendLine('   Cache ready for frontmatter parsing');
outputChannel.appendLine('');
```

**Enhanced Logging**:
```typescript
outputChannel.appendLine('📦 Initializing frontmatter cache...');
frontmatterCache = new FrontmatterCache();

// Get initial stats to confirm maxSize
const initialStats = frontmatterCache.getStats();
outputChannel.appendLine('   Cache created successfully');
outputChannel.appendLine('   Max entries: 1000 (LRU eviction when exceeded)');
outputChannel.appendLine('   Memory estimate: ~220KB at full capacity');
outputChannel.appendLine('   Cache ready for frontmatter parsing');
outputChannel.appendLine('');
```

**Memory Estimate Calculation**:
- ~220 bytes per cache entry (frontmatter + mtime + cachedAt)
- 1000 entries × 220 bytes = 220,000 bytes ≈ 220KB
- Shows users the memory overhead is minimal

**Validation**:
- ✅ Clear message about cache capacity
- ✅ Memory estimate helps set expectations
- ✅ LRU eviction strategy mentioned

**References**:
- Memory calculation: `specs/S40-frontmatter-cache-layer/plan.md:166-179`

### Task 5: Update Periodic Statistics Logging

**Goal**: Enhance stats logging to include eviction information

**Location**: `vscode-extension/src/extension.ts` (periodic stats logging)

**Current Implementation** (from Phase 2):
```typescript
const statsInterval = setInterval(() => {
  if (frontmatterCache) {
    const stats = frontmatterCache.getStats();

    if (stats.hits > 0 || stats.misses > 0) {
      outputChannel.appendLine('');
      outputChannel.appendLine(`[CACHE STATS] ${new Date().toLocaleTimeString()}`);
      outputChannel.appendLine(`  Hits: ${stats.hits} | Misses: ${stats.misses} | Evictions: ${stats.evictions} | Size: ${stats.size}`);

      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0';
      outputChannel.appendLine(`  Hit rate: ${hitRate}%`);
    }
  }
}, 60000);
```

**Enhanced Implementation**:
```typescript
const statsInterval = setInterval(() => {
  if (frontmatterCache) {
    const stats = frontmatterCache.getStats();

    // Only log if cache has been used
    if (stats.hits > 0 || stats.misses > 0) {
      outputChannel.appendLine('');
      outputChannel.appendLine(`[CACHE STATS] ${new Date().toLocaleTimeString()}`);
      outputChannel.appendLine(`  Hits: ${stats.hits} | Misses: ${stats.misses} | Size: ${stats.size}/1000`);

      // Calculate and display hit rate
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0';
      outputChannel.appendLine(`  Hit rate: ${hitRate}%`);

      // Show evictions if any occurred
      if (stats.evictions > 0) {
        outputChannel.appendLine(`  ⚠️  Evictions: ${stats.evictions} (cache reached capacity)`);
      }

      // Show capacity warning if cache is near full
      if (stats.size > 900) {
        const utilization = ((stats.size / 1000) * 100).toFixed(1);
        outputChannel.appendLine(`  ⚠️  Cache utilization: ${utilization}% (consider increasing maxSize)`);
      }
    }
  }
}, 60000);
```

**Enhanced Features**:
- Size displayed as "current/max" (e.g., "500/1000")
- Evictions shown with warning emoji if > 0
- High utilization warning if cache > 90% full
- Helps diagnose if cache size should be increased

**Validation**:
- ✅ Evictions logged when they occur
- ✅ Capacity warning shown when cache nearly full
- ✅ Statistics remain readable and concise

**References**:
- Statistics logging: Phase 2, Task 7
- S40 story logging examples: `plans/.../story-40-frontmatter-cache-layer.md:166-172`

### Task 6: Create Unit Test for LRU Eviction

**Goal**: Write comprehensive tests for eviction behavior

**Location**: `vscode-extension/test/cache.test.ts` (new test suite)

**Implementation**:
```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { FrontmatterCache } from '../src/cache';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FrontmatterCache - LRU Eviction', () => {
  it('should evict oldest entry when cache exceeds maxSize', async () => {
    // Create small cache for testing (maxSize = 3)
    const cache = new FrontmatterCache(3);

    // Create temporary test files
    const testDir = path.join(__dirname, 'temp-cache-test');
    await fs.mkdir(testDir, { recursive: true });

    try {
      // Create 4 test files with frontmatter
      for (let i = 1; i <= 4; i++) {
        const filePath = path.join(testDir, `test-${i}.md`);
        const content = `---
item: S${i}
title: Test Story ${i}
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.`;
        await fs.writeFile(filePath, content, 'utf-8');
      }

      // Add files to cache (should trigger eviction on 4th)
      const file1 = path.join(testDir, 'test-1.md');
      const file2 = path.join(testDir, 'test-2.md');
      const file3 = path.join(testDir, 'test-3.md');
      const file4 = path.join(testDir, 'test-4.md');

      await cache.get(file1);  // Cache: [file1]
      await cache.get(file2);  // Cache: [file1, file2]
      await cache.get(file3);  // Cache: [file1, file2, file3] (full)

      // Get stats before eviction
      const statsBefore = cache.getStats();
      assert.equal(statsBefore.size, 3, 'Cache should be full');
      assert.equal(statsBefore.evictions, 0, 'No evictions yet');

      // Add 4th file (should evict file1)
      await cache.get(file4);  // Cache: [file2, file3, file4]

      // Verify eviction occurred
      const statsAfter = cache.getStats();
      assert.equal(statsAfter.size, 3, 'Cache size should remain at max');
      assert.equal(statsAfter.evictions, 1, 'One eviction should occur');

      // Verify file1 was evicted (cache miss on next get)
      const result1 = await cache.get(file1);
      assert.ok(result1, 'File1 should still parse (re-added to cache)');

      const statsFinal = cache.getStats();
      assert.equal(statsFinal.misses, 4, 'File1 should be cache miss after eviction');

    } finally {
      // Clean up test files
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it('should increment evictions counter correctly', async () => {
    const cache = new FrontmatterCache(2);
    const testDir = path.join(__dirname, 'temp-cache-test-2');
    await fs.mkdir(testDir, { recursive: true });

    try {
      // Create 5 test files
      for (let i = 1; i <= 5; i++) {
        const filePath = path.join(testDir, `test-${i}.md`);
        const content = `---
item: S${i}
title: Test ${i}
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---
Content.`;
        await fs.writeFile(filePath, content, 'utf-8');
      }

      // Add 5 files to cache with maxSize=2 (should trigger 3 evictions)
      for (let i = 1; i <= 5; i++) {
        const filePath = path.join(testDir, `test-${i}.md`);
        await cache.get(filePath);
      }

      const stats = cache.getStats();
      assert.equal(stats.evictions, 3, 'Should have 3 evictions (files 1, 2, 3)');
      assert.equal(stats.size, 2, 'Final size should be 2');

    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it('should handle maxSize=1 correctly', async () => {
    const cache = new FrontmatterCache(1);
    const testDir = path.join(__dirname, 'temp-cache-test-3');
    await fs.mkdir(testDir, { recursive: true });

    try {
      // Create 3 test files
      for (let i = 1; i <= 3; i++) {
        const filePath = path.join(testDir, `test-${i}.md`);
        const content = `---
item: S${i}
title: Test ${i}
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---
Content.`;
        await fs.writeFile(filePath, content, 'utf-8');
      }

      // Add 3 files (each should evict previous)
      for (let i = 1; i <= 3; i++) {
        const filePath = path.join(testDir, `test-${i}.md`);
        await cache.get(filePath);
      }

      const stats = cache.getStats();
      assert.equal(stats.size, 1, 'Cache size should be 1');
      assert.equal(stats.evictions, 2, 'Should have 2 evictions');

    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });
});
```

**Test Coverage**:
- ✅ Eviction occurs when maxSize exceeded
- ✅ Oldest entry evicted first
- ✅ Evictions counter increments correctly
- ✅ Cache size never exceeds maxSize
- ✅ Edge case: maxSize=1 handled correctly

**Validation**:
- ✅ All tests pass
- ✅ Eviction logic works as designed
- ✅ No memory leaks or errors

**References**:
- Testing strategy: `specs/S40-frontmatter-cache-layer/plan.md:268-295`
- S40 testing notes: `plans/.../story-40-frontmatter-cache-layer.md:198-205`

### Task 7: Run Tests and Verify LRU Behavior

**Goal**: Execute test suite and confirm eviction works correctly

**Commands**:
```bash
# Compile TypeScript
cd vscode-extension
npm run compile

# Run tests (assuming test script configured)
npm test

# Or run directly with Node
node --test test/cache.test.ts
```

**Expected Output**:
```
✔ FrontmatterCache - LRU Eviction > should evict oldest entry when cache exceeds maxSize (45ms)
✔ FrontmatterCache - LRU Eviction > should increment evictions counter correctly (38ms)
✔ FrontmatterCache - LRU Eviction > should handle maxSize=1 correctly (28ms)

3 tests passed
```

**Validation**:
- ✅ All tests pass without errors
- ✅ Eviction behavior matches design
- ✅ Performance acceptable (< 50ms per test)

**Troubleshooting**:
- If tests fail, check set() method logic
- Verify Map insertion order maintained
- Check evictions counter increments

**References**:
- Parser test example: `vscode-extension/test/parser.test.ts`
- Node test runner docs: https://nodejs.org/api/test.html

## Completion Criteria

**Functional Requirements:**
- ✅ Cache size limited to maxSize (default 1000)
- ✅ LRU eviction implemented (oldest entry removed first)
- ✅ Evictions counter tracked in statistics
- ✅ maxSize configurable in constructor

**Code Quality:**
- ✅ Eviction logic added to set() method
- ✅ Constructor validates maxSize parameter
- ✅ Logging enhanced with eviction info
- ✅ Comments document eviction strategy

**Testing:**
- ✅ Unit tests for eviction scenarios
- ✅ Tests cover edge cases (maxSize=1, multiple evictions)
- ✅ All tests pass

**Performance:**
- ✅ Eviction operation: < 1ms (Map delete + insert)
- ✅ No performance degradation with eviction

**Documentation:**
- ✅ Eviction strategy documented in code comments
- ✅ Logging shows eviction warnings when appropriate

## Next Phase

**Phase 4: Testing & Integration**
- Create comprehensive test suite for all cache functionality
- Integration tests with real plan/spec files
- Performance benchmarks (cache hit/miss latency)
- Manual testing in Extension Development Host
- Final validation of all acceptance criteria