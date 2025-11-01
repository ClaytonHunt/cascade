import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { FrontmatterCache } from '../src/cache';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test fixture helper
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
    cache.clear(); // Reset for next test
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

describe('FrontmatterCache - LRU Eviction', () => {
  let testDir: string;

  before(async () => {
    testDir = path.join(__dirname, 'temp-cache-lru');
    await fs.mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should evict oldest entry when cache exceeds maxSize', async () => {
    // Create small cache for testing (maxSize = 3)
    const cache = new FrontmatterCache(3);

    // Create 4 test files
    const files = [];
    for (let i = 1; i <= 4; i++) {
      const filePath = await createTestFile(testDir, `test-${i}.md`, `S${i}`);
      files.push(filePath);
    }

    // Add files to cache (should trigger eviction on 4th)
    await cache.get(files[0]);  // Cache: [file1]
    await cache.get(files[1]);  // Cache: [file1, file2]
    await cache.get(files[2]);  // Cache: [file1, file2, file3] (full)

    // Get stats before eviction
    const statsBefore = cache.getStats();
    assert.equal(statsBefore.size, 3, 'Cache should be full');
    assert.equal(statsBefore.evictions, 0, 'No evictions yet');

    // Add 4th file (should evict file1)
    await cache.get(files[3]);  // Cache: [file2, file3, file4]

    // Verify eviction occurred
    const statsAfter = cache.getStats();
    assert.equal(statsAfter.size, 3, 'Cache size should remain at max');
    assert.equal(statsAfter.evictions, 1, 'One eviction should occur');

    // Verify file1 was evicted (cache miss on next get)
    const missesBeforeReaccess = statsAfter.misses;
    await cache.get(files[0]);
    const statsFinal = cache.getStats();
    assert.equal(statsFinal.misses, missesBeforeReaccess + 1, 'File1 should be cache miss after eviction');
  });

  it('should increment evictions counter correctly', async () => {
    const cache = new FrontmatterCache(2);

    // Create 5 test files
    const files = [];
    for (let i = 1; i <= 5; i++) {
      const filePath = await createTestFile(testDir, `bulk-${i}.md`, `S${10+i}`);
      files.push(filePath);
    }

    // Add 5 files to cache with maxSize=2 (should trigger 3 evictions)
    for (const file of files) {
      await cache.get(file);
    }

    const stats = cache.getStats();
    assert.equal(stats.evictions, 3, 'Should have 3 evictions (files 1, 2, 3)');
    assert.equal(stats.size, 2, 'Final size should be 2');
  });

  it('should handle maxSize=1 correctly', async () => {
    const cache = new FrontmatterCache(1);

    // Create 3 test files
    const files = [];
    for (let i = 1; i <= 3; i++) {
      const filePath = await createTestFile(testDir, `single-${i}.md`, `S${20+i}`);
      files.push(filePath);
    }

    // Add 3 files (each should evict previous)
    for (const file of files) {
      await cache.get(file);
    }

    const stats = cache.getStats();
    assert.equal(stats.size, 1, 'Cache size should be 1');
    assert.equal(stats.evictions, 2, 'Should have 2 evictions');
  });
});

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
    cache.clear(); // Start fresh
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
    cache.clear(); // Start fresh
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
    cache.clear(); // Start fresh
    const filePath = await createTestFile(testDir, 'test3.md', 'S12');

    await cache.get(filePath);

    // Create path with mixed slashes - alternate every other character
    const parts = filePath.split(/[\\/]/);
    const mixedPath = parts.join('\\');

    const result = await cache.get(mixedPath);
    assert.ok(result);

    // Should be cache hit
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
  });
});

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

    // Wait to ensure mtime changes (10ms)
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
    cache.clear(); // Start fresh
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
    cache.clear(); // Start fresh
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
