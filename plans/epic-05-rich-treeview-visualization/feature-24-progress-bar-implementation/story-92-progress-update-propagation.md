---
item: S92
title: Progress Update on Propagation
type: story
parent: F24
status: Completed
priority: Medium
dependencies: [S91]
estimate: XS
created: 2025-10-25
updated: 2025-10-26
spec: specs/S92-progress-update-propagation/
---

# S92 - Progress Update on Propagation

## Description

Ensure progress bars update correctly when child statuses change via the `StatusPropagationEngine`. When a status propagates from child to parent (e.g., Story → Feature → Epic), the progress cache must be invalidated to trigger recalculation on next render.

This story integrates progress caching with the existing status propagation system (S59), ensuring progress bars reflect real-time changes when child items complete or regress.

**Note**: This story is **independent of rendering approach**. The integration works with:
- Current Unicode text-based progress bars (S88-S90)
- Future graphical progress bars (Webview/SVG/etc.)
- The story ensures cache invalidation triggers refresh, regardless of visual implementation

**Dependency Update**: S91 (cache layer) is a dependency. This story ensures the cache updates correctly during status propagation.

## Acceptance Criteria

1. **Propagation Integration**:
   - [ ] Identify where `StatusPropagationEngine` triggers TreeView refresh
   - [ ] Verify `refresh()` method already clears `progressCache` (from S91)
   - [ ] Confirm TreeView refresh triggered after status propagation
   - [ ] No additional cache invalidation needed (rely on existing refresh mechanism)

2. **Progress Update Scenarios**:
   - [ ] Story marked "Completed" → Feature progress bar updates
   - [ ] All Features completed → Epic progress bar shows 100%
   - [ ] Feature status propagates to Epic → Epic progress updates
   - [ ] Child status regresses (Completed → In Progress) → Parent progress updates

3. **Real-Time Update Verification**:
   - [ ] Change Story status in file (via drag-drop or manual edit)
   - [ ] Save file (triggers file watcher)
   - [ ] StatusPropagationEngine runs (updates parent status)
   - [ ] TreeView refreshes (progress cache cleared)
   - [ ] Progress bars reflect new completion counts

4. **Output Channel Logging**:
   - [ ] Existing logs show propagation sequence:
     - `[StatusPropagation] Parent status updated: {parent} → {newStatus}`
     - `[TreeView] Refresh triggered`
     - `[ProgressCache] Built cache for X items in Yms`
   - [ ] Logs confirm progress cache rebuilt after propagation

5. **Edge Cases**:
   - [ ] Multiple children change status simultaneously → Single refresh, progress updates once
   - [ ] Parent already completed, child regresses → Parent stays completed (no downgrade), progress may show < 100%
   - [ ] Item with no children → No progress bar, no cache entry affected

## Technical Approach

### Integration Point

**File**: `vscode-extension/src/treeview/StatusPropagationEngine.ts`

The `StatusPropagationEngine` already triggers TreeView refresh after updating parent frontmatter (lines 100-150). No modifications needed if `refresh()` already clears progress cache (S91).

### Existing Propagation Flow

```
1. File watcher detects change (e.g., story status updated)
   ↓
2. Cache invalidation (FrontmatterCache.invalidate)
   ↓
3. StatusPropagationEngine.propagateStatus() called
   ↓
4. Parent status determined (determineParentStatus)
   ↓
5. Parent frontmatter updated (updateParentFrontmatter)
   ↓
6. TreeView refresh triggered (refresh())
   ↓
7. Progress cache cleared (progressCache.clear()) ← S91
   ↓
8. TreeView reloads → getChildren() → getTreeItem()
   ↓
9. Progress recalculated and cached (buildProgressCache)
   ↓
10. TreeView displays updated progress bars
```

### Verification: refresh() Method

Ensure S91 implementation includes cache clearing in `refresh()`:

```typescript
refresh(): void {
  this.outputChannel.appendLine('[TreeView] Refresh triggered');

  this.allItemsCache = null;
  this.hierarchyCache.clear();
  this.progressCache.clear();  // ✅ Must be present (from S91)

  this._onDidChangeTreeData.fire(undefined);
}
```

### No Additional Code Required

If S91 correctly implements cache clearing in `refresh()`, this story requires **no new code**. It's a verification story to ensure integration works correctly.

### Testing Focus

Manual testing to verify end-to-end flow:

1. **Open TreeView and Output Channel**:
   - Open Cascade TreeView
   - Open Output Channel (Ctrl+Shift+P → "View: Toggle Output" → "Cascade")

2. **Trigger Status Change**:
   - Find Feature with partial completion (e.g., 2/5 stories completed)
   - Note current progress bar (e.g., `"████░░░░░░ 40% (2/5)"`)
   - Drag a "Ready" story to "Completed" status group (via S61 drag-drop)
   - OR manually edit story file: change `status: Ready` → `status: Completed`

3. **Verify Output Channel Logs**:
   ```
   [DragDrop] Status changed: S49 - Ready → Completed
   [StatusPropagation] Checking parent: F16
   [StatusPropagation] Parent status updated: F16 → In Progress
   [TreeView] Refresh triggered
   [ProgressCache] Built cache for 87 items in 23ms
   ```

4. **Verify TreeView Update**:
   - Feature progress bar updates: `"█████░░░░░ 60% (3/5)"` (was 40%, now 60%)
   - Epic progress bar may also update if Feature completed
   - No manual refresh needed (automatic via file watcher)

## Dependencies

- **S91** (Progress Cache Layer) - provides cache invalidation in `refresh()`
- **S59** (Hierarchical Status Propagation) - triggers parent status updates
- **S71** (FileWatcher TreeView Integration) - triggers refresh on file changes
- **S61** (Drag-Drop Status Update) - one way to change child status (testing)
- `StatusPropagationEngine` - existing propagation logic

## Success Metrics

- Progress bars update automatically when child statuses change
- No manual TreeView refresh required
- Output channel logs confirm propagation → refresh → cache rebuild sequence
- Progress bars reflect accurate completion counts after propagation
- Multiple status changes trigger single refresh (debounced, if applicable)
- No race conditions or stale progress data observed

## Testing Strategy

### Manual Test Cases

**Test 1: Single Story Completion**
1. Find Feature with 2/5 stories completed (40%)
2. Mark one "Ready" story as "Completed"
3. Verify Feature progress updates to 3/5 (60%)
4. Verify Epic progress updates if needed

**Test 2: All Stories Completed**
1. Find Feature with 4/5 stories completed (80%)
2. Mark last story as "Completed"
3. Verify Feature progress updates to 5/5 (100%)
4. Verify Feature status propagates to "Completed"
5. Verify Epic progress updates (one more completed feature)

**Test 3: Status Regression**
1. Find Feature with 3/3 stories completed (100%)
2. Mark one story as "In Progress" (regress)
3. Verify Feature progress updates to 2/3 (67%)
4. Verify Feature status may change (Completed → In Progress, if propagation allows)

**Test 4: Bulk Changes**
1. Edit multiple story statuses in quick succession
2. Verify TreeView refreshes once (debounced)
3. Verify all progress bars update correctly

### Automated Testing (Optional)

Create integration test to verify propagation → refresh → cache invalidation:

**File**: `vscode-extension/src/test/suite/progressPropagation.test.ts`

```typescript
test('Progress cache invalidated on status propagation', async () => {
  // Mock setup: Create Feature with 2/5 stories completed
  // Trigger child status change (story → Completed)
  // Simulate StatusPropagationEngine.propagateStatus()
  // Verify refresh() called
  // Verify progressCache.clear() called
  // Verify next getTreeItem() recalculates progress
});
```

## Notes

- This is primarily a **verification story**, not a feature implementation
- If S91 correctly implements cache clearing, no new code needed
- Focus is on testing the integration between existing systems
- Output channel logging is critical for debugging propagation flow
- Propagation engine already triggers refresh (S59, S71) - reuse existing mechanism
- Progress cache lifecycle tied to TreeView refresh lifecycle
- Debounced refresh (S72) ensures bulk changes don't cause multiple cache rebuilds
