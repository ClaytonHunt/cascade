# Phase 2 Manual Testing Guide

This guide provides step-by-step instructions for validating the updated activation events in the Lineage Planning extension.

## Prerequisites

- Extension has been rebuilt (`npm run compile` completed successfully)
- Visual Studio Code with extension source available
- Access to D:\projects\lineage (Lineage project with plans/ and specs/)

## Test 4: Activation in Lineage Project

**Objective**: Verify extension activates instantly when workspace contains plans/ or specs/ directories.

### Steps:

1. **Close all VSCode windows** running Extension Development Host (if any)
2. **Open Lineage project**: Open VSCode in `D:\projects\lineage`
3. **Start debugging**:
   - Open extension source folder in separate VSCode window
   - Press **F5** to launch Extension Development Host
4. **Check activation timing**:
   - Extension Development Host window opens
   - Wait 1-2 seconds
5. **Open output channel**:
   - View → Output
   - Select "Lineage Planning" from dropdown
6. **Verify logs**:
   - Should see workspace detection section
   - Should show "✅ lineage" with plans/ and specs/ detected
   - Should show "Extension features initialized successfully"

### Expected Results:

✅ Extension activates within 1 second of window opening
✅ "Lineage Planning" output channel appears automatically
✅ Workspace detection logs show successful activation
✅ Both plans/ and specs/ directories detected
✅ No errors in Debug Console
✅ Timestamp shows near-instant activation (not delayed 2-3 seconds)

### Performance Validation:

- With `workspaceContains` events: Activation should be < 1 second
- Old behavior (onStartupFinished only): Would have 2-3 second delay
- Instant appearance = workspaceContains triggered correctly

---

## Test 5: Non-Activation in Unrelated Project

**Objective**: Verify extension does NOT load in projects without plans/specs directories.

### Steps:

1. **Create test project** (if not already created):
   ```bash
   mkdir D:\temp\no-plans-project
   echo "test content" > D:\temp\no-plans-project\readme.txt
   ```
2. **Close Extension Development Host** (if running from Test 4)
3. **Open unrelated project**:
   - Close Lineage project window
   - Open VSCode in `D:\temp\no-plans-project`
4. **Start debugging**: Press **F5** in extension source window
5. **Check output channels**:
   - View → Output
   - Look at dropdown list
6. **Verify NO activation**:
   - "Lineage Planning" should NOT appear in dropdown
   - Extension never loaded (memory saved)

### Expected Results:

❌ "Lineage Planning" output channel does NOT exist
❌ No activation logs (extension code never ran)
✅ Extension Development Host opens normally (no errors)
✅ Debug Console shows no extension-related errors
✅ VSCode uses less memory (extension not loaded)

### Why This Matters:

- Extension isn't consuming resources in unrelated projects
- Performance optimization: No watchers, no cache, no overhead
- VSCode native filtering (workspaceContains) prevented load

### Troubleshooting:

If extension DID activate unexpectedly:
- Check workspace detection logs (should show "Extension will not initialize features")
- Verify no plans/ or specs/ directories exist in test project
- Check glob pattern matching in package.json

---

## Test 6: Multi-Root Workspace Behavior

**Objective**: Verify activation works correctly with multiple workspace folders.

### Scenario A: One Qualifying Folder

**Steps:**
1. **Open empty workspace**: File → New Window → Don't open folder
2. **Add folders**:
   - File → Add Folder to Workspace → `D:\projects\lineage`
   - File → Add Folder to Workspace → `D:\temp\no-plans-project`
3. **Check output channel**: View → Output → "Lineage Planning"
4. **Verify logs**:
   - Should show TWO folders checked
   - ✅ lineage (plans/ and specs/ found)
   - ❌ no-plans-project (no directories)
   - Extension activated (at least one folder qualifies)

**Expected Results:**
✅ Extension activates (lineage folder triggered it)
✅ Logs show both folders evaluated
✅ Multi-root detection working correctly

### Scenario B: No Qualifying Folders

**Steps:**
1. **Open new Extension Development Host**: Close previous, start fresh with F5
2. **Add only non-qualifying folders**:
   - File → Add Folder to Workspace → `D:\temp\no-plans-project`
   - File → Add Folder to Workspace → `D:\temp\another-test` (if exists)
3. **Check output**: View → Output dropdown
4. **Verify NO activation**: "Lineage Planning" should not appear

**Expected Results:**
❌ Extension does not activate (no qualifying folders)
✅ Memory saved (extension never loaded)

---

## Test 7: Edge Case - Directory Created After Activation

**Objective**: Verify `onStartupFinished` fallback handles mid-session directory creation.

### Steps:

1. **Create empty project**:
   ```bash
   mkdir D:\temp\empty-project
   cd D:\temp\empty-project
   echo "test" > file.txt
   ```
2. **Open in Extension Development Host**:
   - Open VSCode in `D:\temp\empty-project`
   - Press F5 in extension source
3. **Verify extension dormant**:
   - View → Output → "Lineage Planning" should NOT appear
4. **Create plans directory** (while VSCode running):
   ```bash
   mkdir D:\temp\empty-project\plans
   ```
5. **Reload window**:
   - Ctrl+Shift+P
   - Type "Developer: Reload Window"
   - Press Enter
6. **Check activation**:
   - View → Output → "Lineage Planning" should NOW appear
   - Workspace detection should show ✅ empty-project with plans/ found

### Expected Results:

**Before directory creation:**
❌ Extension not activated (no plans/ or specs/)

**After directory creation + reload:**
✅ Extension activates (onStartupFinished fallback caught it)
✅ Workspace detection shows plans/ directory found
✅ Extension features initialized

### Why This Works:

- `onStartupFinished` runs every startup (including reloads)
- Even though `workspaceContains` didn't initially match, fallback triggers
- Phase 3 will add dynamic monitoring (no reload needed)

---

## Summary Checklist

After completing all tests, verify:

- [ ] Test 4: Extension activates in Lineage project (< 1 second)
- [ ] Test 5: Extension does NOT activate in unrelated projects
- [ ] Test 6A: Multi-root activation works (one qualifying folder)
- [ ] Test 6B: Multi-root non-activation works (no qualifying folders)
- [ ] Test 7: Fallback activation after directory creation + reload
- [ ] No errors in Debug Console for any scenario
- [ ] JSON syntax valid (already verified in Task 2)
- [ ] Build successful (already verified in Task 3)

## Performance Validation

Key metrics to observe:
- **Activation time**: < 1 second in Lineage project (workspaceContains optimized)
- **Memory usage**: Extension not loaded in unrelated projects (check Task Manager if curious)
- **Log timestamps**: First log should appear within 500-1000ms of window open

## Next Steps

Once all tests pass:
- Commit phase completion: "PHASE COMPLETE: Phase 2 - Activation Event Updates"
- Update phase 2 frontmatter: status → Completed
- Proceed to Phase 3: Dynamic Workspace Monitoring

## Troubleshooting

### Extension doesn't activate in Lineage project
- Verify package.json has all 3 activation events
- Check that npm run compile completed successfully
- Try closing and reopening Extension Development Host

### Extension activates in empty projects
- Check workspace detection logs (might be early-return logic from Phase 1)
- Verify test project truly has no plans/ or specs/ directories
- Check for hidden directories: `ls -la` or `dir /a`

### No output channel appears at all
- Check Debug Console for errors
- Verify extension.ts has output channel creation code (Phase 1)
- Try View → Output → select "Lineage Planning" manually

---

**After completing these tests, proceed to creating test result commits following TDD methodology.**
