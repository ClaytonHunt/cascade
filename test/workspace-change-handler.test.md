# Workspace Change Handler Test

## Task 2: handleWorkspaceChange() Function Test

### Purpose
Define expected behavior for workspace change handler before implementation (TDD RED phase).

### Function Signature
```typescript
function handleWorkspaceChange(
  event: vscode.WorkspaceFoldersChangeEvent,
  outputChannel: vscode.OutputChannel
): void
```

### Expected Behavior

#### Input Processing
**Event parameter validation:**
- ✅ Must accept `WorkspaceFoldersChangeEvent` with `added` and `removed` arrays
- ✅ Must handle empty arrays (e.g., no folders added or removed)
- ✅ Must process multiple folders in single event

**Output channel usage:**
- ✅ Must use provided `outputChannel` for all logging
- ✅ Must follow existing logging style (separator lines, emoji indicators)
- ✅ Must not create new output channel (reuse provided instance)

#### Logging Requirements

**1. Event Header**
```
============================================================
🔄 Workspace Folders Changed
============================================================
Changed at: 10/12/2025, 3:45:12 PM
```

**2. Added Folders (if event.added.length > 0)**
```
➕ Added 1 folder(s):
   - lineage (D:\projects\lineage)
```

**3. Removed Folders (if event.removed.length > 0)**
```
➖ Removed 1 folder(s):
   - other-project (D:\temp\other-project)
```

**4. Updated Workspace Detection**
```
--- Updated Workspace Detection ---
🔍 Checking 2 workspace folder(s):

   ✅ lineage
      Path: D:\projects\lineage
      Found: plans/
      Found: specs/

   ❌ other-project
      Path: D:\temp\other-project
      Missing: plans/ and specs/

✅ Extension activated - found required directories
```

**5. Activation Status**
- If `shouldActivateExtension()` returns `true`:
  ```
  ✅ Extension remains active (qualifying folders present)
  ```
- If `shouldActivateExtension()` returns `false`:
  ```
  ⏸️  Extension should deactivate (no qualifying folders)
     (Note: VSCode extensions cannot deactivate at runtime)
     (Features will not initialize until qualifying folder added)
  ```

**6. Footer**
```
============================================================
```

#### Function Behavior

**Re-evaluation logic:**
1. Call `shouldActivateExtension()` to check current state
2. Call `logWorkspaceDetection(outputChannel)` to show full workspace analysis
3. Log activation status based on result

**State management:**
- ⚠️ Function does NOT store state (stateless handler)
- ⚠️ Function does NOT initialize/deinitialize features (just logs)
- ✅ Function relies on existing `shouldActivateExtension()` logic
- ✅ Function reuses existing `logWorkspaceDetection()` for consistency

**Error handling:**
- ✅ Must handle empty workspace gracefully (no folders)
- ✅ Must handle null/undefined safely (defensive checks)
- ✅ Must not throw exceptions (log errors if needed)

### Test Scenarios

#### Scenario 1: Add Lineage Folder to Empty Workspace
**Input:**
```typescript
event = {
  added: [{name: "lineage", uri: {fsPath: "D:\\projects\\lineage"}}],
  removed: []
}
```
**Expected output:**
- ✅ Header with timestamp
- ✅ "➕ Added 1 folder(s): lineage"
- ✅ Updated workspace detection showing lineage with plans/ and specs/
- ✅ "✅ Extension remains active (qualifying folders present)"
- ✅ Footer separator

#### Scenario 2: Remove Lineage Folder (Last Qualifying Folder)
**Input:**
```typescript
event = {
  added: [],
  removed: [{name: "lineage", uri: {fsPath: "D:\\projects\\lineage"}}]
}
```
**Expected output:**
- ✅ Header with timestamp
- ✅ "➖ Removed 1 folder(s): lineage"
- ✅ Updated workspace detection showing no qualifying folders
- ✅ "⏸️  Extension should deactivate (no qualifying folders)"
- ✅ Note about VSCode limitation
- ✅ Footer separator

#### Scenario 3: Add Multiple Folders (Mix of Qualifying and Non-qualifying)
**Input:**
```typescript
event = {
  added: [
    {name: "lineage", uri: {fsPath: "D:\\projects\\lineage"}},
    {name: "other-project", uri: {fsPath: "D:\\temp\\other-project"}}
  ],
  removed: []
}
```
**Expected output:**
- ✅ Header with timestamp
- ✅ "➕ Added 2 folder(s): lineage, other-project"
- ✅ Updated workspace detection showing both folders (lineage ✅, other-project ❌)
- ✅ "✅ Extension remains active (qualifying folders present)"
- ✅ Footer separator

#### Scenario 4: Remove Non-qualifying Folder (Keep Lineage)
**Input:**
```typescript
event = {
  added: [],
  removed: [{name: "other-project", uri: {fsPath: "D:\\temp\\other-project"}}]
}
```
**Expected output:**
- ✅ Header with timestamp
- ✅ "➖ Removed 1 folder(s): other-project"
- ✅ Updated workspace detection showing only lineage
- ✅ "✅ Extension remains active (qualifying folders present)"
- ✅ Footer separator

#### Scenario 5: Empty Event (No Added or Removed)
**Input:**
```typescript
event = {
  added: [],
  removed: []
}
```
**Expected output:**
- ✅ Header with timestamp
- ✅ No added/removed sections (both empty)
- ✅ Updated workspace detection showing current state
- ✅ Activation status based on current workspace
- ✅ Footer separator

### Integration with Existing Code

**Dependencies:**
- ✅ Must call `shouldActivateExtension()` (line 18 in extension.ts)
- ✅ Must call `logWorkspaceDetection(outputChannel)` (line 53 in extension.ts)
- ✅ Must use same logging patterns as activate() function (lines 120-150)

**Location:**
- ✅ Add function after `logWorkspaceDetection()` (after line 100)
- ✅ Add before `activate()` function (before line 114)

**TypeScript compliance:**
- ✅ Strict mode compatible (null checks, type annotations)
- ✅ VSCode API types imported (`vscode.WorkspaceFoldersChangeEvent`)
- ✅ No implicit any types

### Expected Test Results

**Before implementation:**
- ❌ FAIL: Function `handleWorkspaceChange` does not exist
- ❌ FAIL: TypeScript compilation error (undefined function)

**After minimal implementation:**
- ✅ PASS: Function exists and compiles
- ✅ PASS: Accepts correct parameters
- ✅ PASS: Logs workspace changes correctly
- ✅ PASS: Calls shouldActivateExtension()
- ✅ PASS: Calls logWorkspaceDetection()
- ✅ PASS: All test scenarios produce expected output

---

**Test Status:** PASS ✅
- Function `handleWorkspaceChange` exists in vscode-extension/src/extension.ts:109-156
- Accepts correct parameters (event, outputChannel)
- Logs workspace changes with correct format
- Calls shouldActivateExtension() for re-evaluation
- Calls logWorkspaceDetection() for detailed logging
- Handles empty arrays correctly
- TypeScript compilation successful
- All test scenarios covered

**Next Step:** Refactor to optimize implementation (REFACTOR phase)
