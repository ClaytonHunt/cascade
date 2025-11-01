---
spec: S73
title: Selective Refresh Optimization
type: spec
status: Completed
priority: Medium
phases: 2
created: 2025-10-22
updated: 2025-10-22
---

# S73 - Selective Refresh Optimization

## Overview

This specification implements intelligent refresh strategies for the Cascade TreeView by detecting the type of change (structure vs content vs body) and applying the appropriate refresh strategy. This optimization dramatically improves performance for content-only changes (title edits, priority changes) while maintaining full refresh for structural changes (status updates, file add/delete).

**Performance Goal:** Reduce refresh time from ~500ms to ~18ms for content-only changes (27× faster).

## Problem Statement

Currently (after S71-S72), all file changes trigger a full TreeView refresh via `_onDidChangeTreeData.fire(undefined)`, which rebuilds the entire tree structure even for minor changes. For large repositories (100+ items), this causes noticeable lag during simple operations like editing a story title.

**Current Behavior:**
```
Edit Story 49 title → Full TreeView refresh → 500ms lag
```

**Desired Behavior:**
```
Edit Story 49 title → Partial TreeView refresh → 18ms lag (97% faster)
Edit Story 49 status → Full TreeView refresh → 505ms (change detection overhead minimal)
```

## Solution Architecture

### Three-Tier Change Classification

**STRUCTURE Changes (Full Refresh Required):**
- File creation/deletion
- Status changes (affects status group membership)
- Item number changes (affects hierarchy position)
- Dependencies changes (may affect hierarchy)

**CONTENT Changes (Partial Refresh Sufficient):**
- Title changes (affects label display)
- Priority changes (affects display)

**BODY Changes (No Refresh Needed):**
- Description changes
- Acceptance criteria changes
- Non-frontmatter markdown content

### Change Detection Strategy

```typescript
Old Data (cached) + New Data (re-parsed) → Compare Frontmatter → Classify Change Type

STRUCTURE: Fire _onDidChangeTreeData.fire(undefined)  // Full tree rebuild
CONTENT:   Fire _onDidChangeTreeData.fire(item)       // Single item update
BODY:      No fire (skip refresh entirely)            // No UI impact
```

## Implementation Strategy

### Phase 1: Change Detection Infrastructure
- Create changeDetection.ts utility module
- Implement detectChangeType() function
- Add ChangeType enum (STRUCTURE, CONTENT, BODY)
- Implement change detection logic with logging
- Unit tests for all change type scenarios

### Phase 2: Selective Refresh Integration
- Add schedulePartialRefresh() method to PlanningTreeProvider
- Add refreshPartial() method (bypasses debounce)
- Add findItemByPath() helper method
- Update FileSystemWatcher handlers to use change detection
- Integrate with existing debouncing (S72)
- Manual testing and validation

## Technical Details

### Files to Create

1. **vscode-extension/src/utils/changeDetection.ts (NEW)**
   - ChangeType enum
   - ChangeDetectionResult interface
   - detectChangeType() function
   - Frontmatter comparison logic
   - Performance logging

### Files to Modify

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts**
   - Add schedulePartialRefresh() method
   - Add refreshPartial() method
   - Add findItemByPath() helper
   - Export TreeNode type for change detection

2. **vscode-extension/src/extension.ts**
   - Import changeDetection utilities
   - Update handleChange() event handler
   - Add async change type detection
   - Route to appropriate refresh strategy

### Integration Points

**FileSystemWatcher Integration (S71):**
- onCreate → Always STRUCTURE (full refresh)
- onChange → Detect type → Route to appropriate refresh
- onDelete → Always STRUCTURE (full refresh)

**Debouncing Integration (S72):**
- scheduleRefresh() → Debounced full refresh
- schedulePartialRefresh() → Debounced partial refresh (NEW)
- Both use same debounce delay (configurable)

**Cache Integration (S40):**
- Read old data before invalidation (for comparison)
- Invalidate cache after reading old data
- Re-parse to get new data
- Compare frontmatter fields

## Performance Analysis

**Test Scenario: Edit Title (100 items)**

| Metric | Before S73 | After S73 | Improvement |
|--------|-----------|-----------|-------------|
| Change Detection | 0ms | 5ms | +5ms overhead |
| Cache Operations | 1ms | 1ms | Same |
| Items Reloaded | 100 | 1 | 99% reduction |
| Hierarchy Rebuilt | Yes | No | Skipped |
| Total Time | ~500ms | ~18ms | **27× faster** |

**Test Scenario: Change Status (100 items)**

| Metric | Before S73 | After S73 | Improvement |
|--------|-----------|-----------|-------------|
| Change Detection | 0ms | 5ms | +5ms overhead |
| Total Time | ~500ms | ~505ms | Minimal impact |

**Memory Impact:**
- Change detection: +2KB per change (temporary ChangeDetectionResult)
- Partial refresh: No additional memory (reuses existing cache)
- Net impact: Negligible

## Edge Cases

### Race Condition: Concurrent Changes
```
t=0ms:   Title edit (CONTENT) → schedule partial refresh at t=300ms
t=100ms: Status edit (STRUCTURE) → cancel partial, schedule full at t=400ms
Result:  Full refresh executes at t=400ms (correct, structure wins)
```

### Malformed Frontmatter
```
User introduces YAML error → newData = null → STRUCTURE (fallback)
Full refresh executes → Malformed item skipped → Warning logged
```

### Partial Refresh Fallback
```
findItemByPath() returns undefined → Fall back to full refresh
Log warning → User informed via output channel
```

## Risk Assessment

**Low Risk Implementation:**
- ✅ Non-breaking change (full refresh still works)
- ✅ Safe fallbacks (always defaults to full refresh on error)
- ✅ Comprehensive logging (easy debugging)
- ✅ Performance regression impossible (only optimizes, never slows down)

**Potential Issues:**
- **Change detection overhead**: +5ms per file change
  - Mitigation: Minimal impact, saves 482ms on content changes
- **False negatives**: Missing a STRUCTURE change
  - Mitigation: Conservative classification, unknown changes → STRUCTURE

## Success Criteria

- [ ] Content changes (title, priority) trigger partial refresh (< 50ms)
- [ ] Structure changes (status, add/delete) trigger full refresh (~500ms)
- [ ] Body changes (description) skip refresh entirely (0ms)
- [ ] Change detection completes in < 10ms per file
- [ ] No false negatives (all structure changes detected)
- [ ] Logging clearly shows change type and refresh strategy
- [ ] Fallback to full refresh on errors (safe degradation)
- [ ] Performance gain validated (27× faster for content changes)

## Definition of Done

- [ ] Phase 1 complete (change detection implemented and tested)
- [ ] Phase 2 complete (selective refresh integrated)
- [ ] All unit tests passing
- [ ] Manual testing completed with all change types
- [ ] Performance validated (title edit < 50ms)
- [ ] No regressions in existing functionality
- [ ] Story S73 marked "Completed" in plans/

## Related Stories

**Dependencies:**
- S71 (FileSystemWatcher to TreeView Integration) - ✅ Completed
- S72 (Debounced Refresh Mechanism) - ✅ Completed

**Follow-ups:**
- S74 (Git Operation Detection) - Independent, can implement separately
- Hash-based change detection (future optimization)
- Configurable change detection rules (future enhancement)
