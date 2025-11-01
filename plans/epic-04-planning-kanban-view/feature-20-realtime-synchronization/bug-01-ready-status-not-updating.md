---
item: B1
title: Ready Status Not Updating in TreeView
type: bug
parent: F20
status: Completed
priority: High
dependencies: []
estimate: S
spec: specs/B1-ready-status-not-updating/
created: 2025-10-28
updated: 2025-10-28
---

# B1 - Ready Status Not Updating in TreeView

## Description

When a story's status is changed to "Ready" in the markdown file, the Cascade TreeView does not reflect the update. All other status changes ("Not Started", "In Planning", "In Progress", "Blocked", "Completed") are detected and updated correctly, but "Ready" status changes are not being picked up.

**Symptoms:**
- Change `status: Not Started` → `status: Ready` in markdown file
- Save file (FileSystemWatcher should trigger)
- TreeView does not refresh or item remains in wrong status group
- Other status transitions work correctly

**Impact:**
- Breaks workflow after running `/spec` command (which marks stories as "Ready")
- Users cannot see which stories are ready for implementation
- "Ready" status group appears empty even when stories are marked ready

## Environment

- **Extension**: Cascade (Hierarchical Planning)
- **VSCode Version**: Latest
- **OS**: Windows (MINGW64_NT-10.0-26100)
- **Affected Files**:
  - `vscode-extension/src/utils/changeDetection.ts` (status change detection)
  - `vscode-extension/src/extension.ts` (FileSystemWatcher handlers)
  - `vscode-extension/src/cache.ts` (frontmatter caching)

## Steps to Reproduce

1. Open VSCode in Lineage project
2. Open Cascade TreeView (Activity Bar → Cascade icon)
3. Open a story markdown file (e.g., `plans/.../story-*.md`)
4. Change frontmatter: `status: Not Started` → `status: Ready`
5. Save file (Ctrl+S)
6. Observe Cascade TreeView

**Expected Behavior:**
- FileSystemWatcher detects file change
- Output Channel shows `[ChangeDetect] Status changed: Not Started → Ready (STRUCTURE)`
- TreeView refreshes automatically
- Story appears in "Ready" status group

**Actual Behavior:**
- TreeView does not update
- Story remains in "Not Started" status group
- OR no status group changes visible

## Analysis Summary

### Code Review Findings

**changeDetection.ts:133-162** - Status Change Detection:
```typescript
if (oldData!.status !== newData!.status) {
  changedFields.push('status');
}

if (changedFields.includes('status')) {
  outputChannel.appendLine(
    `[ChangeDetect] Status changed: ${oldData!.status} → ${newData!.status} (STRUCTURE)`
  );
  return {
    type: ChangeType.STRUCTURE,
    oldData,
    newData,
    changedFields
  };
}
```

**Finding**: Logic appears correct. Should detect ANY status change including "Ready".

**extension.ts:520-522** - FileSystemWatcher:
```typescript
plansWatcher.onDidChange(
  createDebouncedHandler(handleChange, changeTimers, outputChannel, 'FILE_CHANGED')
);
```

**Finding**: Watcher is properly registered for `plans/**/*.md` files.

**extension.ts:422-468** - Change Handler:
```typescript
const handleChange = async (uri: vscode.Uri) => {
  // ...
  const result = await detectChangeType(uri, cache, outputChannel);

  switch (result.type) {
    case ChangeType.STRUCTURE:
      if (planningTreeProvider) {
        planningTreeProvider.scheduleRefresh();
        outputChannel.appendLine('[TreeView] Full refresh scheduled (structure change)');
      }
      break;
    // ...
  }
};
```

**Finding**: STRUCTURE changes (including status changes) trigger full TreeView refresh. Logic appears correct.

### Hypotheses

**Hypothesis 1: Cache Staleness**
- Cache may not be detecting mtime changes for "Ready" status updates
- Possible timing issue with file save and mtime update
- **Test**: Check Output Channel for cache invalidation logs

**Hypothesis 2: String Comparison Issue**
- "Ready" string may have whitespace or encoding issue
- Possible YAML parsing discrepancy
- **Test**: Log `oldData.status` and `newData.status` values with `.length` and character codes

**Hypothesis 3: Debounce Timing**
- Debounce may be canceling refresh for "Ready" status changes
- Possible race condition with rapid file saves
- **Test**: Check if increasing `DEBOUNCE_DELAY_MS` affects behavior

**Hypothesis 4: Git Operation Suppression**
- GitOperationDetector may be incorrectly flagging manual edits as git operations
- Refresh suppressed when it shouldn't be
- **Test**: Check Output Channel for `[FileWatcher] Refresh suppressed (git operation in progress)`

**Hypothesis 5: TreeView State Issue**
- Status groups may not be rebuilt for "Ready" status
- Possible filtering issue in status group generation
- **Test**: Check StatusGroupNode generation logic in PlanningTreeProvider

### Investigation Steps

1. **Enable Debug Logging**:
   - Open Output Channel: View → Output → Select "Cascade"
   - Reproduce issue (change status to "Ready")
   - Look for these log messages:
     - `[FileWatcher] File changed: {path}`
     - `[ChangeDetect] Analyzed in {time}ms: {path}`
     - `[ChangeDetect] Status changed: {old} → {new} (STRUCTURE)`
     - `[TreeView] Full refresh scheduled (structure change)`
     - `[FileWatcher] Refresh suppressed (git operation in progress)`

2. **Manual Testing**:
   - Try changing status to other values ("In Progress", "Blocked", "Completed")
   - Confirm those changes work correctly
   - Try changing to "Ready" again
   - Check if only "Ready" fails

3. **Add Debug Logging**:
   - In `changeDetection.ts:133`, add:
     ```typescript
     outputChannel.appendLine(`[DEBUG] Comparing statuses:`);
     outputChannel.appendLine(`  Old: "${oldData!.status}" (length: ${oldData!.status.length})`);
     outputChannel.appendLine(`  New: "${newData!.status}" (length: ${newData!.status.length})`);
     outputChannel.appendLine(`  Equal: ${oldData!.status === newData!.status}`);
     ```

4. **Check Status Type Definition**:
   - Verify `types.ts:14`: `type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed' | 'Archived';`
   - Confirm "Ready" is correctly defined

5. **Test Cache Invalidation**:
   - Add breakpoint in `cache.ts:221` (`invalidate()` method)
   - Change status to "Ready"
   - Verify cache is invalidated

## Acceptance Criteria

- [ ] **Status Detection**:
  - "Ready" status changes detected by `detectChangeType()`
  - Output Channel shows `[ChangeDetect] Status changed: {old} → Ready (STRUCTURE)`
  - `changedFields` includes "status"

- [ ] **TreeView Refresh**:
  - TreeView refreshes automatically when status changed to "Ready"
  - Story moves to "Ready" status group
  - Output Channel shows `[TreeView] Full refresh scheduled (structure change)`

- [ ] **Cache Invalidation**:
  - Cache entry invalidated when file changes
  - Fresh frontmatter parsed on next access
  - mtime comparison works correctly

- [ ] **Consistency**:
  - "Ready" status behaves identically to other statuses
  - No special-case logic needed
  - All status transitions work uniformly

- [ ] **Regression Testing**:
  - Other status transitions still work ("In Progress", "Blocked", "Completed")
  - FileSystemWatcher continues to detect all file changes
  - Debouncing works correctly

## Root Cause (CONFIRMED)

**Race Condition in Cache Mtime Validation**

**Suspected Area**: Cache auto-invalidation interferes with change detection
**File**: `vscode-extension/src/utils/changeDetection.ts` and `vscode-extension/src/cache.ts`
**Lines**:
- `changeDetection.ts:87` - First `cache.get()` call gets NEW data instead of OLD
- `cache.ts:144` - Auto-invalidation based on mtime comparison

**Sequence of Events**:
1. User saves file with `status: Ready` → File mtime updated
2. FileSystemWatcher triggers `onDidChange` event
3. `detectChangeType()` calls `cache.get(filePath)` to get "old" data (line 87)
4. **Cache checks mtime** (line 142) → Detects mtime change → Auto-invalidates → Re-parses file
5. Returns **NEW data** with `status: Ready` instead of old cached data
6. Manual `cache.invalidate()` at line 90 does nothing (already invalidated)
7. Second `cache.get()` at line 91 returns **same NEW data** again
8. Comparison: `oldData.status === newData.status` → `"Ready" === "Ready"` → TRUE
9. Result: `changedFields: []` → Classified as BODY change → TreeView refresh skipped

**Log Evidence**:
```
[FileWatcher] File changed: ...story-101...
[ChangeDetect] Analyzed in 2ms: ...story-101...
[ChangeDetect] Changed fields: none    ← Should show "status"
[ChangeDetect] Body-only change (BODY) ← Should be STRUCTURE
[TreeView] Refresh skipped (body-only change) ← Should refresh!
```

**Why This Affects All Status Changes**:
This bug affects **ALL** status changes, not just "Ready". The mtime-based auto-invalidation causes the cache to always return fresh data on the first `get()` call, making change detection impossible.

**Fix Approach**:

**Option 1: Separate Old Data Cache**
- Store old frontmatter separately before invalidation
- Don't rely on cache for "before" state
- Add `previousData: Map<filePath, Frontmatter>` to store last known state

**Option 2: Disable Auto-Invalidation During Change Detection**
- Add `skipMtimeCheck` parameter to `cache.get()`
- Call `cache.get(filePath, { skipMtimeCheck: true })` for old data
- Then invalidate and call normally for new data

**Option 3: Event Handler Cache Snapshot**
- In `extension.ts:handleChange`, capture cache state before calling `detectChangeType()`
- Pass old data explicitly to `detectChangeType()`
- Remove first `cache.get()` call from change detection

**Recommended Fix**: Option 1 (Separate Old Data Cache)
- Cleanest separation of concerns
- No changes to cache API
- Explicit before/after state tracking

## References

- **F20 - Real-Time Synchronization**: Parent feature
- **S73 - Change Detection Logic**: Implemented `detectChangeType()`
- **S74 - Git Operation Detection**: May affect refresh suppression
- **changeDetection.ts:133-162**: Status comparison logic
- **extension.ts:422-468**: FileSystemWatcher change handler
- **types.ts:14**: Status type definition

## Notes

- User reports ALL other statuses work correctly except "Ready"
- Issue may be specific to "Not Started" → "Ready" transition
- OR may affect "Ready" status in general (any transition to/from "Ready")
- Needs reproduction and debug logging to confirm root cause
