---
spec: S58
phase: 1
title: Add Root-Level Items Cache
status: Completed
priority: Low
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: Add Root-Level Items Cache

## Overview

This phase implements caching for `loadAllPlanningItems()` results at the PlanningTreeProvider level. This eliminates redundant file system scans when multiple methods need the same planning items data (status groups, filtering, hierarchy building).

**Current Problem:**
- `loadAllPlanningItems()` is called by:
  - `getStatusGroups()` - To count items per status
  - `getItemsForStatus()` - To filter items by status
  - `getHierarchyForStatus()` - To build hierarchy per status
- With 84 files, this means 84 file reads PER method call
- Multiple status group expansions = multiple full directory scans

**Solution:**
- Cache `loadAllPlanningItems()` results at provider level
- Share cached items across all consumers
- Invalidate cache on `refresh()` (existing pattern)
- Add performance timing logs

## Prerequisites

- Understanding of existing cache patterns in PlanningTreeProvider.ts:
  - `hierarchyCache` (line 71) - Caches hierarchy per status
  - `progressCache` (line 88) - Caches progress per item
  - `refresh()` (line 108) - Clears all caches
- Understanding of `loadAllPlanningItems()` implementation (line 329)
- Understanding of cache invalidation timing (file watcher with 300ms debounce)

## Tasks

### Task 1: Add Cache Properties to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Add after line 88 (after `progressCache` declaration)

**Code to Add:**
```typescript
/**
 * Cache for all planning items loaded from plans/ directory.
 *
 * Key: None (single cache for entire workspace)
 * Value: Array of all planning items (all types, all statuses)
 *
 * Invalidated when:
 * - File system changes detected (refresh() called)
 * - Extension reloads
 *
 * Benefits:
 * - Single file scan per refresh cycle (vs multiple scans)
 * - Shared data source for status groups, filtering, hierarchy
 * - Reduces redundant vscode.workspace.findFiles() calls
 * - Memory overhead: ~20KB for 100 items (negligible)
 *
 * Usage pattern:
 * ```typescript
 * const items = await this.getAllPlanningItems();
 * const filtered = items.filter(item => item.status === 'Ready');
 * ```
 */
private allItemsCache: PlanningTreeItem[] | null = null;
```

**Expected Outcome:**
- New property added to PlanningTreeProvider class
- Property initialized to `null` (cache empty until first load)
- Documentation explains purpose, invalidation, and usage

**Validation:**
- TypeScript compiles without errors
- Property is accessible within class methods

---

### Task 2: Create Cached Version of loadAllPlanningItems

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Approach:** Rename existing `loadAllPlanningItems()` to `loadAllPlanningItemsUncached()`, create new cached wrapper.

**Step 2.1: Rename Existing Method**

**Location:** Line 329 (method declaration)

**Change:**
```typescript
// OLD:
private async loadAllPlanningItems(): Promise<PlanningTreeItem[]> {

// NEW:
private async loadAllPlanningItemsUncached(): Promise<PlanningTreeItem[]> {
```

**Why:** Preserve existing logic, wrap with caching layer.

**Step 2.2: Create New Cached Wrapper Method**

**Location:** Add after `loadAllPlanningItemsUncached()` method (before `compareItemNumbers()`)

**Code to Add:**
```typescript
/**
 * Loads all planning items from plans/ directory with caching.
 *
 * This is the primary entry point for accessing planning items.
 * It checks the cache first and only performs file system scan on cache miss.
 *
 * Cache hit: Returns cached data (O(1) operation, instant)
 * Cache miss: Scans file system, caches result, returns data
 *
 * Cache is invalidated by refresh() when file changes are detected.
 * This ensures data is always fresh while minimizing redundant file reads.
 *
 * Performance:
 * - Cache hit: < 1ms (array reference return)
 * - Cache miss: ~100-200ms for 100 files (file system scan + parsing)
 * - Hit rate: > 80% expected (multiple consumers per refresh cycle)
 *
 * @returns Array of all planning items (all types, all statuses)
 */
private async loadAllPlanningItems(): Promise<PlanningTreeItem[]> {
  // Check cache first
  if (this.allItemsCache !== null) {
    // Cache hit - return cached data immediately
    this.outputChannel.appendLine('[ItemsCache] Cache HIT - returning cached items');
    return this.allItemsCache;
  }

  // Cache miss - load from file system
  this.outputChannel.appendLine('[ItemsCache] Cache MISS - loading from file system...');

  // Start timing
  const startTime = Date.now();

  // Load items using existing logic
  const items = await this.loadAllPlanningItemsUncached();

  // Calculate duration
  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(`[ItemsCache] Loaded ${items.length} items in ${duration}ms`);

  // Cache the result
  this.allItemsCache = items;

  return items;
}
```

**Expected Outcome:**
- New method wraps existing file loading logic
- Cache checked first (instant return on hit)
- Performance timing logged to Output Channel
- Cache populated on miss

**Validation:**
- TypeScript compiles without errors
- Method signature matches original (drop-in replacement)
- Logging appears in Output Channel

---

### Task 3: Update refresh() to Invalidate Items Cache

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Line 108 (inside `refresh()` method)

**Change:**
```typescript
// OLD:
refresh(): void {
  this.hierarchyCache.clear();
  this.progressCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');
  this.outputChannel.appendLine('[Progress] Cache cleared');
  this._onDidChangeTreeData.fire(undefined);
}

// NEW:
refresh(): void {
  // Clear items cache (forces reload on next access)
  this.allItemsCache = null;
  this.outputChannel.appendLine('[ItemsCache] Cache cleared');

  // Clear hierarchy cache (depends on items data)
  this.hierarchyCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');

  // Clear progress cache (depends on hierarchy data)
  this.progressCache.clear();
  this.outputChannel.appendLine('[Progress] Cache cleared');

  // Notify VSCode to reload tree
  this._onDidChangeTreeData.fire(undefined);
}
```

**Expected Outcome:**
- Items cache invalidated first (root of dependency chain)
- Order: Items → Hierarchy → Progress (reflects data flow)
- All three caches cleared on every refresh
- Logging shows cache invalidation sequence

**Validation:**
- After file change, Output Channel shows all three "Cache cleared" logs
- Next TreeView interaction loads fresh data from file system
- No stale data displayed

---

### Task 4: Add Performance Timing Logs

**Note:** Timing logs already added in Task 2.2 (inside `loadAllPlanningItems()`).

**Additional Timing: getStatusGroups()**

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Line 265 (inside `getStatusGroups()` method)

**Change:**
```typescript
// OLD:
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // Build status group for each status
  const groups: StatusGroupNode[] = [];
  // ... rest of method ...
}

// NEW:
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // Build status group for each status
  const groups: StatusGroupNode[] = [];
  // ... rest of method (unchanged) ...

  // Add at end of method, before return statement:
  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(`[StatusGroups] Built ${groups.length} status groups in ${duration}ms`);

  return groups;
}
```

**Expected Outcome:**
- Status group generation time logged
- Should be < 10ms on cache hit (no file I/O)
- Should be ~100-200ms on cache miss (file loading included)

**Additional Timing: getHierarchyForStatus()**

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location:** Line 718 (inside `getHierarchyForStatus()` method)

**Change:**
```typescript
// Add timing to existing cache miss logic:

// OLD:
// Cache miss - build hierarchy
this.outputChannel.appendLine(`[Hierarchy] Cache miss for status: ${status}, building...`);

// Load items for this status (uses existing method)
const items = await this.getItemsForStatus(status);

// Build hierarchy
const hierarchy = this.buildHierarchy(items);

// NEW:
// Cache miss - build hierarchy
this.outputChannel.appendLine(`[Hierarchy] Cache miss for status: ${status}, building...`);

const hierarchyStartTime = Date.now();

// Load items for this status (uses existing method)
const items = await this.getItemsForStatus(status);

// Build hierarchy
const hierarchy = this.buildHierarchy(items);

const hierarchyDuration = Date.now() - hierarchyStartTime;

// Cache result
this.hierarchyCache.set(status, hierarchy);

this.outputChannel.appendLine(`[Hierarchy] Built hierarchy for ${status}: ${hierarchy.length} root nodes in ${hierarchyDuration}ms`);
```

**Expected Outcome:**
- Hierarchy build time logged per status
- Should be < 50ms even with 100+ items
- Helps identify if hierarchy building becomes bottleneck

---

### Task 5: Test Cache Behavior

**Manual Testing Steps:**

1. **Open VSCode Extension Development Host:**
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   # Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   ```

2. **View Output Channel:**
   - Ctrl+Shift+P → "View: Toggle Output"
   - Select "Cascade" from dropdown

3. **Test Cache Hit Pattern:**
   - Open Cascade TreeView (Activity Bar)
   - Observe Output Channel logs
   - **Expected:**
     ```
     [ItemsCache] Cache MISS - loading from file system...
     [ItemsCache] Loaded 84 items in ~100ms
     [StatusGroups] Built 6 status groups in ~110ms
     ```
   - Expand "Ready" status group
   - **Expected:**
     ```
     [ItemsCache] Cache HIT - returning cached items
     [Hierarchy] Cache miss for status: Ready, building...
     [Hierarchy] Built hierarchy for Ready: 5 root nodes in ~5ms
     ```
   - Expand "In Progress" status group
   - **Expected:**
     ```
     [ItemsCache] Cache HIT - returning cached items
     [Hierarchy] Cache miss for status: In Progress, building...
     [Hierarchy] Built hierarchy for In Progress: 10 root nodes in ~8ms
     ```

4. **Test Cache Invalidation:**
   - Edit any file in `plans/` directory
   - Save file (triggers file watcher after 300ms debounce)
   - Observe Output Channel
   - **Expected:**
     ```
     [FILE_CHANGED]: plans/some-file.md
     [ItemsCache] Cache cleared
     [Hierarchy] Cache cleared
     [Progress] Cache cleared
     REFRESH: TreeView updated (file changed)
     ```
   - Expand any status group again
   - **Expected:**
     ```
     [ItemsCache] Cache MISS - loading from file system...
     [ItemsCache] Loaded 84 items in ~100ms
     ```

5. **Test Cache Hit Rate:**
   - Expand all 6 status groups in sequence
   - Count "Cache HIT" vs "Cache MISS" in Output Channel
   - **Expected:** 1 MISS (first call) + 5+ HITs (subsequent calls) = > 80% hit rate

**Validation Criteria:**
- ✅ First TreeView load shows cache MISS and timing log
- ✅ Subsequent operations show cache HIT
- ✅ File changes trigger cache invalidation
- ✅ Next operation after invalidation shows cache MISS
- ✅ Status group timing < 50ms on cache hit
- ✅ Hierarchy timing < 50ms on cache hit

## Completion Criteria

- ✅ `allItemsCache` property added to PlanningTreeProvider
- ✅ `loadAllPlanningItems()` uses cache (check first, populate on miss)
- ✅ `refresh()` invalidates items cache (clears `allItemsCache`)
- ✅ Performance timing logs added for key operations
- ✅ Manual testing confirms cache behavior correct
- ✅ Output Channel shows cache hit/miss logs
- ✅ Cache hit rate > 80% after initial load
- ✅ No regressions in TreeView functionality

## Next Phase

Proceed to **Phase 2: Performance Measurement** to validate optimization effectiveness with stress testing and performance profiling.
