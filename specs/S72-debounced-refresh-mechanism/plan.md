---
spec: S72
title: Debounced Refresh Mechanism
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-22
updated: 2025-10-22
---

# S72 - Debounced Refresh Mechanism

## Overview

This specification implements TreeView-level debouncing to prevent excessive UI updates during rapid file changes. While S71 established file-level debouncing (300ms per file) in the FileSystemWatcher, multiple files changing within that window still trigger multiple TreeView refreshes. S72 adds a second debounce layer at the TreeView level to batch all file change events into a single refresh operation.

**Current Architecture (S71):**
```
File 1 changes → 300ms debounce → refresh() called → TreeView updates
File 2 changes (50ms later) → 300ms debounce → refresh() called → TreeView updates
File 3 changes (100ms later) → 300ms debounce → refresh() called → TreeView updates

Result: 3 separate refreshes (one per file)
```

**Enhanced Architecture (S72):**
```
File 1 changes → 300ms debounce → scheduleRefresh() called → 300ms debounce started
File 2 changes (50ms later) → 300ms debounce → scheduleRefresh() called → timer reset
File 3 changes (100ms later) → 300ms debounce → scheduleRefresh() called → timer reset
  ↓
300ms elapses with no new scheduleRefresh() calls
  ↓
refresh() executes once
  ↓
TreeView updates once

Result: 1 refresh (batched)
```

## Problem Statement

**Scenario: Git Merge with 10 Files**

Without TreeView-level debouncing:
- 10 files change within 50ms
- Each file's change is debounced 300ms (FileSystemWatcher level)
- Each debounced event calls `planningTreeProvider.refresh()` directly
- Result: 10 TreeView refreshes over ~350ms period
- Impact: UI flickers, cache thrashing, poor UX

With TreeView-level debouncing:
- 10 files change within 50ms
- Each file's change is debounced 300ms (FileSystemWatcher level)
- Each debounced event calls `planningTreeProvider.scheduleRefresh()` (NEW)
- scheduleRefresh() implements additional 300ms debounce
- Result: 1 TreeView refresh after ~650ms
- Impact: Smooth UI, efficient cache usage, great UX

## Solution Architecture

### Two-Layer Debouncing Strategy

**Layer 1: FileSystemWatcher (Per-File Debouncing) - Already Exists**
- Location: `extension.ts:278-320` (createDebouncedHandler)
- Purpose: Batch rapid saves of individual files
- Delay: 300ms (DEBOUNCE_DELAY_MS constant)
- Scope: Per file (Map<filePath, timer>)

**Layer 2: PlanningTreeProvider (TreeView-Level Debouncing) - NEW in S72**
- Location: `PlanningTreeProvider.ts` (new scheduleRefresh method)
- Purpose: Batch refresh calls from multiple file changes
- Delay: 300ms (configurable via settings)
- Scope: Single timer for entire TreeView

### Key Implementation Changes

1. **Add scheduleRefresh() method to PlanningTreeProvider**
   - Implements debounce timer logic
   - Cancels existing timer on each call
   - Starts new 300ms timer
   - Calls refresh() when timer expires

2. **Update FileSystemWatcher to call scheduleRefresh()**
   - Change from: `planningTreeProvider.refresh()`
   - Change to: `planningTreeProvider.scheduleRefresh()`

3. **Keep refresh() for manual/immediate refreshes**
   - User clicks "Refresh" button → calls refresh() directly
   - Command palette action → calls refresh() directly
   - Extension activation → calls refresh() directly

4. **Add VSCode configuration setting**
   - Setting: `cascade.refreshDebounceDelay`
   - Default: 300ms
   - Range: 0-5000ms
   - Description: "Delay before refreshing TreeView after file changes"

5. **Add configuration change listener**
   - Detects setting changes
   - Updates PlanningTreeProvider debounce delay
   - No extension reload required

## Implementation Strategy

### Phase 1: Core Debouncing Implementation
- Add debounce state to PlanningTreeProvider (timer field, delay field)
- Implement scheduleRefresh() method with debounce logic
- Update refresh() to cancel pending debounced refreshes
- Add dispose() method to cleanup timer on deactivation
- Update FileSystemWatcher handlers to call scheduleRefresh()
- Add comprehensive logging for debugging

### Phase 2: Configuration and Polish
- Add configuration contribution to package.json
- Implement configuration change listener in extension.ts
- Add updateDebounceDelay() method to PlanningTreeProvider
- Add edge case handling (delay=0 disables debouncing)
- Validate configuration min/max values
- Update documentation

## Technical Details

### Files to Modify

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts**
   - Add private fields: refreshDebounceTimer, debounceDelay
   - Add scheduleRefresh() method (NEW)
   - Update refresh() to cancel pending timer
   - Add updateDebounceDelay() method (NEW)
   - Add dispose() method for cleanup

2. **vscode-extension/src/extension.ts**
   - Update handleCreate/handleChange/handleDelete to call scheduleRefresh()
   - Add configuration change listener (onDidChangeConfiguration)
   - Register dispose() on extension deactivation

3. **vscode-extension/package.json**
   - Add configuration contribution section (NEW)
   - Add cascade.refreshDebounceDelay setting

### Integration Points

**FileSystemWatcher Integration:**
- Current: FileSystemWatcher → debounce(300ms) → refresh()
- After S72: FileSystemWatcher → debounce(300ms) → scheduleRefresh() → debounce(300ms) → refresh()

**Manual Refresh Integration:**
- Refresh command → refresh() directly (bypasses debounce)
- Refresh button → refresh() directly (bypasses debounce)
- Extension activation → refresh() directly (bypasses debounce)

**Status Propagation Integration (S59):**
- scheduleRefresh() → (timer expires) → refresh() → propagateStatuses()
- Propagation only runs once after debounce (not per file)

## Performance Analysis

**Baseline (No TreeView Debouncing):**
- 10 files change in 50ms
- Layer 1: Each file debounced 300ms → 10 refresh() calls over ~350ms
- Result: 10 TreeView refreshes, 10 cache clears, 10 re-renders

**With S72 (TreeView Debouncing):**
- 10 files change in 50ms
- Layer 1: Each file debounced 300ms → 10 scheduleRefresh() calls over ~350ms
- Layer 2: scheduleRefresh() debounced 300ms → 1 refresh() call at ~650ms
- Result: 1 TreeView refresh, 1 cache clear, 1 re-render

**Performance Gain:**
- 90% reduction in TreeView refreshes (10 → 1)
- 90% reduction in cache thrashing
- 90% reduction in DOM re-renders
- Smoother UI (no flicker)
- Lower CPU usage

**Total Latency:**
- Without S72: ~350ms (300ms file debounce + last refresh)
- With S72: ~650ms (300ms file debounce + 300ms TreeView debounce)
- Trade-off: +300ms latency for 90% fewer refreshes
- User impact: Minimal (650ms is still imperceptible)

## Edge Cases

### Extension Deactivation During Debounce
**Scenario:** User closes VSCode while debounce timer active

**Handling:**
```typescript
dispose(): void {
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    // Optionally execute pending refresh before cleanup
    this.refresh();
    this.refreshDebounceTimer = undefined;
  }
}
```

### Debounce Delay Set to 0
**Scenario:** User sets `cascade.refreshDebounceDelay = 0`

**Handling:**
```typescript
scheduleRefresh(): void {
  if (this.debounceDelay === 0) {
    this.refresh(); // Immediate refresh (no debounce)
    return;
  }
  // Normal debounce logic...
}
```

### Manual Refresh During Debounce
**Scenario:** User clicks "Refresh" button while timer active

**Handling:**
```typescript
refresh(): void {
  // Cancel pending debounced refresh
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);
    this.refreshDebounceTimer = undefined;
  }
  // Immediate refresh...
}
```

### Concurrent scheduleRefresh() Calls
**Scenario:** Multiple file changes call scheduleRefresh() simultaneously

**Handling:**
- Only one `refreshDebounceTimer` field exists
- Each call cancels existing timer
- Last call wins (correct behavior)

## Testing Strategy

### Unit Tests
- Test scheduleRefresh() delays refresh by debounceDelay
- Test multiple scheduleRefresh() calls reset timer
- Test refresh() cancels pending debounced refresh
- Test debounce delay of 0 triggers immediate refresh
- Test dispose() clears pending timer
- Test configuration changes update debounce delay

### Integration Tests
- Test batch file changes (git merge simulation)
- Test manual refresh during debounce
- Test configuration setting changes
- Test extension activation/deactivation
- Test performance (10 files → 1 refresh)

### Manual Testing
- Install extension, enable output channel
- Run git merge affecting 10+ files
- Verify single refresh after 600ms (2 × 300ms)
- Verify output logs show timer resets
- Verify TreeView shows all changes correctly

## Risk Assessment

**Low Risk Implementation:**
- Simple debounce pattern (proven in FileSystemWatcher)
- Non-breaking change (refresh() still works immediately)
- Graceful degradation (delay=0 disables debouncing)
- Comprehensive logging (easy debugging)

**Potential Issues:**
- **Delayed UI updates**: Users might perceive 650ms latency
  - Mitigation: 650ms is still imperceptible for most users
  - Mitigation: Manual refresh always available (immediate)
- **Configuration complexity**: Users might not understand setting
  - Mitigation: Good default (300ms), clear description
  - Mitigation: Documentation with examples

## Success Criteria

- [ ] Multiple file changes (10+) trigger single TreeView refresh
- [ ] Manual refresh bypasses debounce (immediate update)
- [ ] Configuration setting works (delay changes apply immediately)
- [ ] Performance validated (90% reduction in refreshes)
- [ ] No memory leaks (timer cleanup on dispose)
- [ ] Logging shows debounce behavior clearly
- [ ] Edge cases handled gracefully (delay=0, deactivation, etc.)

## Definition of Done

- [ ] Phase 1 complete (core debouncing implemented and tested)
- [ ] Phase 2 complete (configuration and polish)
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed with 10+ file batch
- [ ] Performance gain validated (1 refresh instead of 10)
- [ ] Documentation updated
- [ ] Story S72 marked "Completed" in plans/

## Related Stories

**Dependencies:**
- S71 (FileSystemWatcher to TreeView Integration) - ✅ Completed

**Follow-ups:**
- S73 (Selective Refresh Optimization) - Can be independent
- S74 (Git Operation Detection) - Builds on S72 debouncing

**Integration:**
- S59 (Hierarchical Status Propagation) - Benefits from reduced refresh calls
