# S92 - Regression Test Checklist

Quick checklist for verifying progress update on propagation (5-10 minutes).

## Pre-Test Setup

- [ ] Extension installed: `code --install-extension cascade-0.1.0.vsix --force`
- [ ] VSCode reloaded: `Ctrl+Shift+P` → "Developer: Reload Window"
- [ ] Cascade TreeView open (Activity Bar)
- [ ] Output Channel open (View → Output → Cascade)

## Critical Test Cases

### ✅ Test 1: Single Story Completion (2 minutes)

- [ ] Find Feature with partial completion (e.g., 4/5 = 80%)
- [ ] Change one story status: In Progress → Completed
- [ ] Verify progress bar updates (e.g., 5/5 = 100%)
- [ ] Verify output channel shows: `[ProgressCache] Built cache...`
- [ ] Verify Feature status changes to "Completed"

**Expected Progress**: `████████░░ 80% (4/5)` → `██████████ 100% (5/5)`

**Expected Logs**:
```
[FileWatcher] File changed: ...
[TreeView] Refresh triggered
[Progress] Cache cleared
[PROPAGATE] Starting status propagation...
[PROPAGATE] Parent status updated: F24 → Completed
[ProgressCache] Built cache for X items in Yms
```

---

### ✅ Test 2: 100% Progress → Feature Status Change (2 minutes)

- [ ] Complete last story in a Feature (80% → 100%)
- [ ] Verify progress bar shows 100%
- [ ] Verify Feature status changes to "Completed"
- [ ] Verify Feature moves to "Completed" status group

**Note**: This test is combined with Test 1 if using F24 as test subject.

---

### ✅ Test 3: Status Regression (2 minutes)

- [ ] Find Feature with 5/5 stories completed (100%)
- [ ] Change one story: Completed → In Progress
- [ ] Verify progress bar shows 80% (4/5)
- [ ] Verify Feature status stays "Completed" (no downgrade)
- [ ] Verify progress bar and status mismatch (expected)

**Expected Progress**: `██████████ 100% (5/5)` → `████████░░ 80% (4/5)`

**Expected Behavior**: Status stays "Completed" (no downgrade per S59), but progress bar accurately shows 80%.

---

### ✅ Test 4: Bulk Changes (2 minutes)

- [ ] Change 2-3 story statuses within 1 second
- [ ] Verify single refresh (debounced)
- [ ] Verify progress cache rebuilt ONCE (not per file)
- [ ] Verify all changes reflected in TreeView after single refresh

**Expected Logs**:
```
[FileWatcher] File changed: ...
[FileWatcher] Debouncing refresh (300ms)...
[FileWatcher] File changed: ...
[FileWatcher] Refresh timer reset (multiple changes detected)
[TreeView] Refresh triggered (debounced, 300ms elapsed)
[ProgressCache] Built cache for X items in Yms (ONCE)
```

---

## Success Criteria

- [ ] All progress bars update automatically (no manual refresh)
- [ ] Output channel shows complete propagation → cache rebuild sequence
- [ ] No errors or warnings in output channel
- [ ] TreeView update within 500ms of file save
- [ ] Cache rebuild time < 50ms
- [ ] No observable lag or flickering

---

## Common Issues

### Progress bar not updating

**Symptoms**: TreeView doesn't reflect status changes

**Troubleshooting**:
- Check if `progressCache.clear()` present in `refresh()` method
- Verify file watcher enabled (VSCode settings)
- Check output channel for propagation errors
- Reload VSCode window: Ctrl+Shift+P → "Developer: Reload Window"

---

### Multiple refreshes (flickering)

**Symptoms**: TreeView flickers or updates multiple times

**Troubleshooting**:
- Verify debounce timer working (300ms delay)
- Check output channel for multiple refresh logs
- Look for `[FileWatcher] Refresh timer reset` messages

---

### Slow performance

**Symptoms**: TreeView takes > 500ms to update

**Troubleshooting**:
- Check cache rebuild time in output channel
- Verify cache size check working (`progressCache.size === 0`)
- Look for excessive cache rebuilds in logs
- Check workspace size (> 100 items may affect performance)

---

### Status/Progress Mismatch

**Symptoms**: Feature shows "Completed" but progress bar shows < 100%

**Status**: This is **EXPECTED BEHAVIOR** per S59 rules:
- Status propagation never downgrades from "Completed" to "In Progress"
- Progress bar always shows accurate completion count
- If a child regresses, parent status stays "Completed" but progress bar shows < 100%
- This mismatch provides visibility into regression without losing completion status

---

## Quick Git Commands

### Undo all test changes
```bash
git checkout HEAD -- plans/
```

### Undo specific file
```bash
git checkout HEAD -- plans/epic-05-rich-treeview-visualization/feature-24-progress-bar-implementation/story-92-progress-update-propagation.md
```

### View current changes
```bash
git status
git diff plans/
```

---

## Test Environment

**Recommended Test Subject**: Feature F24 - Progress Bar Implementation
- **Location**: `plans/epic-05-rich-treeview-visualization/feature-24-progress-bar-implementation/`
- **Stories**: S88, S89, S90, S91, S92
- **Initial State**: 4/5 completed (80%)
- **Test Story**: S92 (In Progress → Completed → In Progress)

---

## Performance Targets

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Cache rebuild time | < 30ms | < 50ms |
| Total refresh time | < 300ms | < 500ms |
| Debounce delay | 300ms | 300ms (fixed) |
| TreeView lag | None | < 100ms |

---

## Notes

- Each test should complete in < 2 minutes
- Total regression test time: 5-10 minutes
- Output channel logging is critical for verification
- Debounced refresh prevents excessive cache rebuilds
- Progress cache lifecycle tied to TreeView refresh
- Status propagation never downgrades (S59 rule)
