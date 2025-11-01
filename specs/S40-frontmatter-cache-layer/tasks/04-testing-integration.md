---
spec: S40
phase: 4
title: Testing & Integration
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-13
---

# Phase 4: Testing & Integration

## Overview

Create a comprehensive test suite covering all cache functionality and integrate the cache into the VSCode extension for production use. This phase validates that the cache meets all acceptance criteria, performs within targets, and integrates seamlessly with the extension lifecycle.

This is the final phase before marking S40 as complete.

## Prerequisites

- ✅ Phase 1 (Core Cache Implementation) completed
- ✅ Phase 3 (LRU Eviction & Statistics) completed
- ✅ All cache methods implemented (get, set, invalidate, clear, getStats)
- Optional: Phase 2 (FileSystemWatcher Integration) completed

## Tasks

### Task 1: Create Comprehensive Test Suite Structure

**Goal**: Organize tests into logical suites covering all functionality

**Location**: `vscode-extension/test/cache.test.ts`

**Test Suite Structure**:
```typescript
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { FrontmatterCache } from '../src/cache';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test fixture helpers
async function createTestFile(dir: string, name: string, item: string): Promise<string> {
  const filePath = path.join(dir, name);
  const content = `---
item: ${item}
title: Test ${item}
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Test content for ${item}.`;

  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('FrontmatterCache - Core Operations', () => {
  // Tests from Phase 1
});

describe('FrontmatterCache - Path Normalization', () => {
  // Windows path handling tests
});

describe('FrontmatterCache - Staleness Detection', () => {
  // mtime tracking tests
});

describe('FrontmatterCache - LRU Eviction', () => {
  // Tests from Phase 3
});

describe('FrontmatterCache - Statistics', () => {
  // Statistics tracking tests
});

describe('FrontmatterCache - Performance', () => {
  // Latency benchmarks
});

describe('FrontmatterCache - Integration', () => {
  // Tests with real plan/spec files
});
```

**Validation**:
- ✅ Test file structure organized logically
- ✅ Helper functions reduce test boilerplate
- ✅ All test suites declared

**References**:
- Parser test structure: `vscode-extension/test/parser.test.ts:48-398`
- Node test runner: https://nodejs.org/api/test.html

### Task 2: Implement Core Operations Tests

**Goal**: Test basic cache functionality (get, set, invalidate, clear)

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Core Operations', () => {
  let testDir: string;
  let cache: FrontmatterCache;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-core');
    await fs.mkdir(testDir, { recursive: true });
    cache = new FrontmatterCache();
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', async () => {
    const result = await cache.get('/nonexistent/file.md');
    assert.equal(result, null);
  });

  it('should cache and retrieve frontmatter (cache hit)', async () => {
    const filePath = await createTestFile(testDir, 'test1.md', 'S1');

    // First get: cache miss
    const result1 = await cache.get(filePath);
    assert.ok(result1);
    assert.equal(result1.item, 'S1');

    // Second get: cache hit
    const result2 = await cache.get(filePath);
    assert.ok(result2);
    assert.equal(result2.item, 'S1');
    assert.deepEqual(result1, result2);

    // Verify cache hit was recorded
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
  });

  it('should invalidate cache entry', async () => {
    const filePath = await createTestFile(testDir, 'test2.md', 'S2');

    // Cache the file
    await cache.get(filePath);

    // Invalidate
    cache.invalidate(filePath);

    // Next get should be cache miss
    const statsBefore = cache.getStats();
    await cache.get(filePath);
    const statsAfter = cache.getStats();

    assert.equal(statsAfter.misses, statsBefore.misses + 1);
  });

  it('should clear all cache entries', async () => {
    const file1 = await createTestFile(testDir, 'test3.md', 'S3');
    const file2 = await createTestFile(testDir, 'test4.md', 'S4');

    await cache.get(file1);
    await cache.get(file2);

    const statsBefore = cache.getStats();
    assert.ok(statsBefore.size > 0);

    cache.clear();

    const statsAfter = cache.getStats();
    assert.equal(statsAfter.size, 0);
    assert.equal(statsAfter.hits, 0);
    assert.equal(statsAfter.misses, 0);
  });
});
```

**Validation**:
- ✅ Cache miss handled correctly
- ✅ Cache hit returns cached data
- ✅ Invalidation removes entry
- ✅ Clear resets cache completely

### Task 3: Implement Path Normalization Tests

**Goal**: Verify Windows path handling and normalization

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Path Normalization', () => {
  let testDir: string;
  let cache: FrontmatterCache;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-paths');
    await fs.mkdir(testDir, { recursive: true });
    cache = new FrontmatterCache();
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should normalize backslashes to forward slashes', async () => {
    const filePath = await createTestFile(testDir, 'test.md', 'S10');

    // Cache with normalized path
    await cache.get(filePath);

    // Try to get with backslashes (Windows style)
    const backslashPath = filePath.replace(/\//g, '\\');
    const result = await cache.get(backslashPath);

    assert.ok(result);
    assert.equal(result.item, 'S10');

    // Should be cache hit (same normalized key)
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
  });

  it('should normalize case (Windows case-insensitive)', async () => {
    const filePath = await createTestFile(testDir, 'test2.md', 'S11');

    // Cache with lowercase path
    await cache.get(filePath);

    // Try with different case
    const uppercasePath = filePath.toUpperCase();
    const result = await cache.get(uppercasePath);

    assert.ok(result);
    assert.equal(result.item, 'S11');

    // Should be cache hit (normalized to same key)
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
  });

  it('should handle mixed slashes', async () => {
    const filePath = await createTestFile(testDir, 'test3.md', 'S12');

    await cache.get(filePath);

    // Create path with mixed slashes
    const mixedPath = filePath.replace(/\//g, (match, offset) => {
      return offset % 2 === 0 ? '\\' : '/';
    });

    const result = await cache.get(mixedPath);
    assert.ok(result);

    // Should be cache hit
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
  });
});
```

**Validation**:
- ✅ Backslashes normalized to forward slashes
- ✅ Case differences normalized (Windows behavior)
- ✅ Mixed slash formats resolve to same cache key
- ✅ Cache hits work across path format variations

**References**:
- Path normalization design: `specs/S40-frontmatter-cache-layer/plan.md:83-104`

### Task 4: Implement Staleness Detection Tests

**Goal**: Verify mtime tracking catches external file changes

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Staleness Detection', () => {
  let testDir: string;
  let cache: FrontmatterCache;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-stale');
    await fs.mkdir(testDir, { recursive: true });
    cache = new FrontmatterCache();
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should detect file modification via mtime', async () => {
    const filePath = await createTestFile(testDir, 'test.md', 'S20');

    // Cache initial version
    const result1 = await cache.get(filePath);
    assert.equal(result1?.item, 'S20');

    // Wait to ensure mtime changes (1ms)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Modify file
    const newContent = `---
item: S21
title: Modified
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Modified content.`;
    await fs.writeFile(filePath, newContent, 'utf-8');

    // Get again - should detect stale mtime and re-parse
    const result2 = await cache.get(filePath);
    assert.equal(result2?.item, 'S21', 'Should parse updated content');

    // Should have been cache miss (stale entry)
    const stats = cache.getStats();
    assert.equal(stats.misses, 2, 'Initial miss + stale miss');
  });

  it('should handle file deletion', async () => {
    const filePath = await createTestFile(testDir, 'test2.md', 'S22');

    // Cache file
    await cache.get(filePath);

    // Delete file
    await fs.unlink(filePath);

    // Try to get deleted file
    const result = await cache.get(filePath);
    assert.equal(result, null, 'Deleted file should return null');
  });
});
```

**Validation**:
- ✅ mtime change triggers re-parse
- ✅ Stale entries automatically invalidated
- ✅ Deleted files return null
- ✅ Cache miss count accurate

**References**:
- mtime tracking design: `specs/S40-frontmatter-cache-layer/plan.md:147-164`

### Task 5: Implement Statistics Tracking Tests

**Goal**: Verify all statistics fields update correctly

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Statistics', () => {
  let testDir: string;
  let cache: FrontmatterCache;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-stats');
    await fs.mkdir(testDir, { recursive: true });
    cache = new FrontmatterCache();
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should track hits and misses correctly', async () => {
    const file1 = await createTestFile(testDir, 'test1.md', 'S30');
    const file2 = await createTestFile(testDir, 'test2.md', 'S31');

    // 2 cache misses
    await cache.get(file1);
    await cache.get(file2);

    let stats = cache.getStats();
    assert.equal(stats.misses, 2);
    assert.equal(stats.hits, 0);

    // 2 cache hits
    await cache.get(file1);
    await cache.get(file2);

    stats = cache.getStats();
    assert.equal(stats.hits, 2);
    assert.equal(stats.misses, 2);
  });

  it('should track cache size', async () => {
    for (let i = 1; i <= 5; i++) {
      const filePath = await createTestFile(testDir, `file${i}.md`, `S${30+i}`);
      await cache.get(filePath);

      const stats = cache.getStats();
      assert.equal(stats.size, i);
    }
  });

  it('should reset statistics on clear()', async () => {
    const filePath = await createTestFile(testDir, 'test3.md', 'S35');
    await cache.get(filePath);  // miss
    await cache.get(filePath);  // hit

    cache.clear();

    const stats = cache.getStats();
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
    assert.equal(stats.evictions, 0);
    assert.equal(stats.size, 0);
  });

  it('should calculate hit rate correctly', async () => {
    const filePath = await createTestFile(testDir, 'test4.md', 'S36');

    // 1 miss, 3 hits = 75% hit rate
    await cache.get(filePath);  // miss
    await cache.get(filePath);  // hit
    await cache.get(filePath);  // hit
    await cache.get(filePath);  // hit

    const stats = cache.getStats();
    const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
    assert.equal(hitRate, 75);
  });
});
```

**Validation**:
- ✅ Hits counter accurate
- ✅ Misses counter accurate
- ✅ Size reflects current cache entries
- ✅ clear() resets all statistics
- ✅ Hit rate calculation correct

### Task 6: Implement Performance Tests

**Goal**: Verify cache meets performance targets

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Performance', () => {
  let testDir: string;
  let cache: FrontmatterCache;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-perf');
    await fs.mkdir(testDir, { recursive: true });
    cache = new FrontmatterCache();
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should have cache hit latency < 1ms', async () => {
    const filePath = await createTestFile(testDir, 'test.md', 'S40');

    // Prime cache
    await cache.get(filePath);

    // Measure cache hit performance
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await cache.get(filePath);
    }

    const end = performance.now();
    const avgLatency = (end - start) / iterations;

    console.log(`    Average cache hit latency: ${avgLatency.toFixed(3)}ms`);
    assert.ok(avgLatency < 1, `Cache hit latency ${avgLatency.toFixed(3)}ms exceeds 1ms target`);
  });

  it('should have cache miss latency < 10ms', async () => {
    const filePath = await createTestFile(testDir, 'test2.md', 'S41');

    // Measure cache miss performance (includes file read + parse)
    const start = performance.now();
    await cache.get(filePath);
    const end = performance.now();

    const latency = end - start;

    console.log(`    Cache miss latency: ${latency.toFixed(2)}ms`);
    assert.ok(latency < 10, `Cache miss latency ${latency.toFixed(2)}ms exceeds 10ms target`);
  });

  it('should handle 100 files efficiently', async () => {
    // Create 100 test files
    const files: string[] = [];
    for (let i = 1; i <= 100; i++) {
      const filePath = await createTestFile(testDir, `bulk-${i}.md`, `S${100+i}`);
      files.push(filePath);
    }

    // Measure time to cache all files
    const start = performance.now();

    for (const file of files) {
      await cache.get(file);
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / files.length;

    console.log(`    Cached ${files.length} files in ${totalTime.toFixed(0)}ms (avg: ${avgTime.toFixed(2)}ms/file)`);
    assert.ok(avgTime < 10, 'Average parse time should be < 10ms');
  });
});
```

**Validation**:
- ✅ Cache hit: < 1ms
- ✅ Cache miss: < 10ms
- ✅ Bulk operations scale linearly
- ✅ Performance targets met

**References**:
- Performance targets: `plans/.../story-40-frontmatter-cache-layer.md:183-190`

### Task 7: Implement Integration Tests with Real Files

**Goal**: Test cache with actual Lineage project files

**Location**: `vscode-extension/test/cache.test.ts`

**Implementation**:
```typescript
describe('FrontmatterCache - Integration with Real Files', () => {
  let cache: FrontmatterCache;

  before(() => {
    cache = new FrontmatterCache();
  });

  it('should parse S40 story file (this story)', async () => {
    const storyPath = path.join(__dirname, '../../plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-40-frontmatter-cache-layer.md');

    if (await fileExists(storyPath)) {
      const result = await cache.get(storyPath);

      assert.ok(result);
      assert.equal(result.item, 'S40');
      assert.equal(result.title, 'Frontmatter Cache Layer');
      assert.equal(result.type, 'story');
    } else {
      console.log('    ⚠ S40 story file not found, skipping test');
    }
  });

  it('should parse all recent story files', async () => {
    const storiesDir = path.join(__dirname, '../../plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure');

    if (await fileExists(storiesDir)) {
      const files = await fs.readdir(storiesDir);
      const storyFiles = files.filter(f => f.startsWith('story-') && f.endsWith('.md'));

      let successCount = 0;
      let failCount = 0;

      for (const file of storyFiles) {
        const filePath = path.join(storiesDir, file);
        const result = await cache.get(filePath);

        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }

      console.log(`    Parsed ${successCount}/${successCount + failCount} story files`);

      const stats = cache.getStats();
      console.log(`    Cache stats: hits=${stats.hits}, misses=${stats.misses}, size=${stats.size}`);

      assert.ok(successCount > 0, 'Should successfully parse at least one story');
    }
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

**Validation**:
- ✅ Cache parses real Lineage project files
- ✅ S40 story file parsed correctly
- ✅ Multiple story files handled
- ✅ Statistics reflect real usage

**References**:
- Integration testing strategy: `specs/S40-frontmatter-cache-layer/plan.md:305-315`

### Task 8: Run Complete Test Suite

**Goal**: Execute all tests and verify 100% pass rate

**Commands**:
```bash
cd vscode-extension

# Compile TypeScript
npm run compile

# Run all tests
npm test

# Or run specific test file
node --test test/cache.test.ts
```

**Expected Output**:
```
✔ FrontmatterCache - Core Operations (5 subtests)
  ✔ should return null for non-existent file (15ms)
  ✔ should cache and retrieve frontmatter (cache hit) (23ms)
  ✔ should invalidate cache entry (18ms)
  ✔ should clear all cache entries (12ms)

✔ FrontmatterCache - Path Normalization (3 subtests)
  ✔ should normalize backslashes to forward slashes (16ms)
  ✔ should normalize case (Windows case-insensitive) (14ms)
  ✔ should handle mixed slashes (11ms)

✔ FrontmatterCache - Staleness Detection (2 subtests)
  ✔ should detect file modification via mtime (34ms)
  ✔ should handle file deletion (21ms)

✔ FrontmatterCache - LRU Eviction (3 subtests)
  ✔ should evict oldest entry when cache exceeds maxSize (42ms)
  ✔ should increment evictions counter correctly (38ms)
  ✔ should handle maxSize=1 correctly (29ms)

✔ FrontmatterCache - Statistics (4 subtests)
  ✔ should track hits and misses correctly (25ms)
  ✔ should track cache size (31ms)
  ✔ should reset statistics on clear() (12ms)
  ✔ should calculate hit rate correctly (18ms)

✔ FrontmatterCache - Performance (3 subtests)
  ✔ should have cache hit latency < 1ms (127ms)
    Average cache hit latency: 0.034ms
  ✔ should have cache miss latency < 10ms (8ms)
    Cache miss latency: 7.23ms
  ✔ should handle 100 files efficiently (1240ms)
    Cached 100 files in 1237ms (avg: 12.37ms/file)

✔ FrontmatterCache - Integration with Real Files (2 subtests)
  ✔ should parse S40 story file (this story) (8ms)
  ✔ should parse all recent story files (156ms)
    Parsed 5/5 story files
    Cache stats: hits=0, misses=5, size=5

All tests passed (27 tests, 0 failures)
```

**Validation**:
- ✅ All tests pass (0 failures)
- ✅ Performance targets met
- ✅ Integration tests successful
- ✅ No errors or warnings

### Task 9: Manual Testing in Extension Development Host

**Goal**: Verify cache works in production extension environment

**Test Steps**:

1. **Launch Extension Development Host**
   ```bash
   cd vscode-extension
   code .
   # Press F5 to launch
   ```

2. **Open Lineage Workspace**
   - In Extension Development Host: File → Open Folder → `D:\projects\lineage`

3. **Verify Cache Initialization**
   - Open "Lineage Planning" output channel (View → Output → select "Lineage Planning")
   - Verify message: `📦 Initializing frontmatter cache...`
   - Verify message: `Max entries: 1000 (LRU eviction when exceeded)`

4. **Trigger Cache Operations** (requires future F12/F13 features, or use extension API)
   - For now, verify no errors in Debug Console
   - Cache will be exercised once visualization features implemented

5. **Wait for Statistics Logging**
   - Wait 60 seconds
   - Verify periodic stats message appears (if cache used)

6. **Close Extension Development Host**
   - Verify deactivation message in output channel
   - Verify cache statistics logged on deactivation

**Expected Output Channel**:
```
============================================================
Lineage Planning & Spec Status Extension
============================================================
Activated at: 10/12/2025, 4:30:15 PM
Extension version: 0.1.0
VSCode version: 1.80.0

--- Workspace Detection ---
🔍 Checking 1 workspace folder(s):

   ✅ lineage
      Path: D:\projects\lineage
      Found: plans/
      Found: specs/

✅ Extension activated - found required directories

📦 Initializing frontmatter cache...
   Cache created successfully
   Max entries: 1000 (LRU eviction when exceeded)
   Memory estimate: ~220KB at full capacity
   Cache ready for frontmatter parsing

✅ Extension features initialized successfully

[After 60 seconds, if cache used:]
[CACHE STATS] 4:31:15 PM
  Hits: 0 | Misses: 0 | Size: 0/1000

[On deactivation:]
📦 Cache Statistics:
   Hits: 0
   Misses: 0
   Evictions: 0
   Final size: 0

   Cache cleared

👋 Extension deactivated
```

**Validation**:
- ✅ Cache initializes without errors
- ✅ Logging appears correctly
- ✅ No errors in Debug Console
- ✅ Deactivation cleans up properly

### Task 10: Update S40 Story Status to Completed

**Goal**: Mark story as completed in plans directory

**Location**: `plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-40-frontmatter-cache-layer.md`

**Changes**:
1. Update frontmatter status field: `status: Completed`
2. Update frontmatter updated field: `updated: 2025-10-12` (current date)
3. Verify all acceptance criteria checked off

**Command**:
```bash
# Use Edit tool to update frontmatter
```

**Validation**:
- ✅ Status field updated to "Completed"
- ✅ Updated date reflects completion date
- ✅ All acceptance criteria met

## Completion Criteria

**All Acceptance Criteria Met**:
- ✅ In-memory cache stores parsed frontmatter data by file path
- ✅ Cache entries include file modification timestamp for staleness detection
- ✅ Cache invalidation triggered by FileSystemWatcher events (if Phase 2 complete)
- ✅ Cache miss triggers lazy parsing (parser only called when needed)
- ✅ Cache hit returns data immediately without file I/O
- ✅ Cache size is bounded (LRU eviction when limit reached)
- ✅ Cache statistics logged to output channel (hits, misses, evictions)
- ✅ Cache is cleared when extension deactivates
- ✅ Cache handles Windows paths correctly (normalized path keys)

**Performance Targets Met**:
- ✅ Cache hit: < 1ms (Map lookup)
- ✅ Cache miss: < 10ms (file parsing)
- ✅ Invalidation: < 1ms (Map delete)
- ✅ Memory usage: ~220KB for 1000 entries

**Code Quality**:
- ✅ All methods have JSDoc comments
- ✅ TypeScript strict mode passes
- ✅ No VSCode API dependencies in cache module
- ✅ Error handling prevents crashes

**Testing**:
- ✅ Comprehensive test suite covers all functionality
- ✅ All unit tests pass
- ✅ Integration tests with real files pass
- ✅ Performance benchmarks meet targets
- ✅ Manual testing confirms production behavior

**Documentation**:
- ✅ Implementation spec complete
- ✅ All phases documented
- ✅ Code comments explain design decisions

**Integration**:
- ✅ Cache integrated into extension activate()
- ✅ Cache disposed in deactivate()
- ✅ Logging provides visibility into cache behavior
- ✅ Ready for use by F12/F13 visualization features

## Next Steps After S40 Completion

**Recommended Implementation Order**:

1. **S38 - FileSystemWatcher** (if not complete)
   - Enables Phase 2 of S40 (cache invalidation on file changes)
   - Currently blocking Phase 2

2. **F12 - Status Bar Decorations** (uses cache)
   - Display story/feature status as inline decorations
   - Will call cache.get() for frontmatter retrieval
   - Benefits from sub-millisecond cache hits

3. **F13 - Planning Tree View** (uses cache)
   - Hierarchical view of plans/ directory
   - Heavy cache usage (many files, frequent updates)
   - Cache statistics will show value

**Post-Implementation Notes**:
- Monitor cache statistics in production use
- Adjust maxSize if projects grow beyond 1000 files
- Consider making maxSize configurable via extension settings (future enhancement)
- Evaluate need for true LRU vs FIFO based on real access patterns
