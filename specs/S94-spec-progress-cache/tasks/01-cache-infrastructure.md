---
spec: S94
phase: 1
title: Cache Infrastructure
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Cache Infrastructure

## Overview

Add the cache data structures and core cache operation methods to PlanningTreeProvider. This phase establishes the foundation for the spec progress cache without integrating it into the runtime flow.

## Prerequisites

- S93 (Spec Progress Reader) completed
- Understanding of Map-based caching pattern from S91 (ProgressInfo cache)
- Familiarity with PlanningTreeProvider architecture

## Tasks

### Task 1: Add Cache Data Structures

Add the spec progress cache Map and hit/miss counters to PlanningTreeProvider class.

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: After line ~175 (near existing progressCache declaration)

**Code to Add**:

```typescript
/**
 * Cache for spec progress data (S94).
 * Key: Story item number (e.g., "S75")
 * Value: SpecProgress object from readSpecProgress()
 *
 * Invalidated when:
 * - File system changes detected (refresh() called)
 * - Spec files modified (FileSystemWatcher events)
 *
 * Benefits:
 * - Avoid re-reading spec directories on every TreeView interaction
 * - O(1) lookup during getTreeItem() rendering
 * - Minimal memory overhead (SpecProgress objects are small)
 */
private specProgressCache = new Map<string, SpecProgress>();

/**
 * Spec progress cache hit/miss tracking for performance monitoring (S94).
 */
private specProgressCacheHits = 0;
private specProgressCacheMisses = 0;
```

**Validation**:
- TypeScript compilation succeeds
- No type errors for SpecProgress (verify import exists)

**Import Required**:

Add import at top of file (after line ~10):

```typescript
import { readSpecProgress, SpecProgress } from './specProgressReader';
```

### Task 2: Implement getSpecProgressCached() Method

Add the method that performs cache lookup and populates cache on miss.

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: After `getTreeItem()` method (after line ~856)

**Code to Add**:

```typescript
/**
 * Gets spec progress for a story, using cache if available (S94).
 *
 * This method wraps readSpecProgress() with a caching layer to avoid
 * redundant file system reads when the same story's progress is requested
 * multiple times during a TreeView refresh cycle.
 *
 * Cache flow:
 * 1. Check if story item exists in cache (cache hit → return cached value)
 * 2. If not cached (cache miss → call readSpecProgress())
 * 3. Store result in cache (if non-null)
 * 4. Return result
 *
 * @param item - Planning tree item (must be a story with spec field)
 * @returns SpecProgress if spec exists, null if no spec or invalid
 */
private async getSpecProgressCached(
  item: PlanningTreeItem
): Promise<SpecProgress | null> {
  // Check cache first
  if (this.specProgressCache.has(item.item)) {
    this.specProgressCacheHits++;
    this.outputChannel.appendLine(
      `[SpecProgressCache] Cache HIT for ${item.item}`
    );
    return this.specProgressCache.get(item.item)!;
  }

  // Cache miss - read from filesystem
  this.specProgressCacheMisses++;
  this.outputChannel.appendLine(
    `[SpecProgressCache] Cache MISS for ${item.item}, reading from filesystem...`
  );

  // Check if story has spec field in frontmatter
  if (!item.spec) {
    // No spec field → return null (not an error, just no spec)
    return null;
  }

  // Build absolute path to spec directory
  const specDir = path.join(this.workspaceRoot, item.spec);

  // Read spec progress (delegates to S93 utility)
  const progress = await readSpecProgress(specDir, item.status);

  if (progress !== null) {
    // Store in cache for future lookups
    this.specProgressCache.set(item.item, progress);
    this.outputChannel.appendLine(
      `[SpecProgressCache] Cached progress for ${item.item}: ${progress.completedPhases}/${progress.totalPhases}`
    );
  } else {
    this.outputChannel.appendLine(
      `[SpecProgressCache] No valid spec found for ${item.item}`
    );
  }

  return progress;
}
```

**Validation**:
- Method compiles without errors
- Path import is available (should already exist)
- Logic follows ProgressInfo cache pattern from calculateProgress() method

**Import Required** (if not already present):

```typescript
import * as path from 'path';
```

### Task 3: Implement Cache Invalidation Methods

Add methods to invalidate single cache entries or clear entire cache.

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: After `getSpecProgressCached()` method (new code)

**Code to Add**:

```typescript
/**
 * Invalidates spec progress cache entry for a specific story (S94).
 *
 * Called when:
 * - Spec plan.md file is modified (FileSystemWatcher event)
 * - Phase task file is modified (FileSystemWatcher event)
 * - Manual cache invalidation needed
 *
 * Selective invalidation preserves cache hits for unmodified specs.
 *
 * @param storyItem - Story item number (e.g., "S75")
 */
invalidateSpecProgress(storyItem: string): void {
  const hadEntry = this.specProgressCache.has(storyItem);

  this.specProgressCache.delete(storyItem);

  if (hadEntry) {
    this.outputChannel.appendLine(
      `[SpecProgressCache] Invalidated cache for ${storyItem}`
    );
  } else {
    this.outputChannel.appendLine(
      `[SpecProgressCache] No cache entry to invalidate for ${storyItem}`
    );
  }
}

/**
 * Clears entire spec progress cache (S94).
 *
 * Called during refresh() to clear all cached spec progress data
 * along with other caches (items cache, hierarchy cache, progress cache).
 *
 * Also resets hit/miss counters to prepare for new refresh cycle.
 */
private clearSpecProgressCache(): void {
  const size = this.specProgressCache.size;

  this.specProgressCache.clear();
  // Note: Do NOT reset hit/miss counters here - they accumulate across
  // refresh cycles for performance monitoring (logged every 60s)

  this.outputChannel.appendLine(
    `[SpecProgressCache] Cache cleared (${size} entries removed)`
  );
}
```

**Validation**:
- Methods compile without errors
- invalidateSpecProgress() is public (needed for extension.ts to call it)
- clearSpecProgressCache() is private (internal use only)

### Task 4: Update refresh() Method to Clear Cache

Integrate spec progress cache clearing into the existing refresh() method.

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Inside `refresh()` method (line ~710)

**Find this code** (around line 710):

```typescript
// Clear progress cache (depends on hierarchy data)
this.progressCache.clear();
this.outputChannel.appendLine('[Progress] Cache cleared');
```

**Add after it**:

```typescript
// Clear spec progress cache (S94)
this.clearSpecProgressCache();
```

**Then find this code** (around line 735, after propagation):

```typescript
// S92: Enhanced logging for post-propagation cache clearing
this.outputChannel.appendLine('[ItemsCache] Cache cleared (post-propagation)');
this.outputChannel.appendLine('[Hierarchy] Cache cleared (post-propagation)');
this.outputChannel.appendLine('[Progress] Cache cleared (post-propagation)');
```

**Add after it**:

```typescript
this.clearSpecProgressCache(); // S94: Clear again after propagation
this.outputChannel.appendLine('[SpecProgressCache] Cache cleared (post-propagation)');
```

**Validation**:
- Spec progress cache cleared twice per refresh (same pattern as ProgressInfo cache)
- First clear: Before propagation (line ~713)
- Second clear: After propagation (line ~738)
- Output channel shows both clear events

**Explanation**:

The cache is cleared twice per refresh cycle to handle status propagation changes:
1. **Before propagation** (line ~713): Prepare for propagation engine to analyze hierarchy
2. **After propagation** (line ~738): Handle any frontmatter files modified by propagation

This matches the pattern used for ProgressInfo cache in S92.

## Completion Criteria

- [ ] Cache data structures added to PlanningTreeProvider (specProgressCache Map, hit/miss counters)
- [ ] SpecProgress import added from specProgressReader module
- [ ] getSpecProgressCached() method implemented with cache hit/miss logic
- [ ] invalidateSpecProgress() method implemented (public, for extension.ts)
- [ ] clearSpecProgressCache() method implemented (private, for refresh())
- [ ] refresh() method updated to clear spec progress cache (twice per cycle)
- [ ] TypeScript compilation succeeds with no errors
- [ ] All new code follows existing logging patterns (`[SpecProgressCache]` prefix)

## Verification Steps

1. **Compile Extension**:
   ```bash
   cd vscode-extension && npm run compile
   ```
   Verify no TypeScript errors.

2. **Review Code Structure**:
   - Open PlanningTreeProvider.ts
   - Verify cache fields near line 175
   - Verify methods after getTreeItem()
   - Verify refresh() has two clearSpecProgressCache() calls

3. **Check Imports**:
   - Verify `import { readSpecProgress, SpecProgress }` exists
   - Verify `import * as path from 'path'` exists

## Next Phase

Proceed to **Phase 2: FileSystemWatcher Integration** to wire up cache invalidation when spec files change.
