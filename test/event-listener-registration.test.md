# Event Listener Registration Test

## Task 3: Workspace Change Listener Registration in activate()

### Purpose
Define expected behavior for registering workspace change listener before implementation (TDD RED phase).

### Integration Points

**Target function:** `activate()` in `vscode-extension/src/extension.ts:172`

**Dependencies:**
- ✅ `handleWorkspaceChange()` function (Task 2 - implemented)
- ✅ `shouldActivateExtension()` function (Phase 1 - implemented)
- ✅ `outputChannel` variable (existing)

### Expected Behavior

#### Registration Requirements

**1. Listener must be registered in BOTH code paths:**

**Path A: Extension activates (qualifying workspace)**
```typescript
// After line 199 (before return)
if (!shouldActivate) {
  // ... early return logging ...

  // NEW: Register listener even in dormant state
  const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
    (event) => handleWorkspaceChange(event, outputChannel)
  );
  context.subscriptions.push(workspaceChangeListener);

  return;
}

// NEW: Register listener for active extension
const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
  (event) => handleWorkspaceChange(event, outputChannel)
);
context.subscriptions.push(workspaceChangeListener);

// ... feature initialization ...
```

**2. Subscription management:**
- ✅ Listener must be added to `context.subscriptions` array
- ✅ Ensures automatic disposal when extension deactivates
- ✅ Prevents memory leaks from orphaned event handlers

**3. Logging updates:**

**Dormant path (before return):**
```
⏸️  Extension will not initialize features
   (Add plans/ or specs/ directory and reload window to activate)
   (Workspace change monitoring active)
============================================================
```

**Active path (after initialization):**
```
✅ Extension features initialized successfully

🔄 Workspace monitoring active (will detect folder changes)

Next steps:
  - S38: File system watcher initialization
  - S39: YAML frontmatter parser
  - S40: Frontmatter cache layer
============================================================
```

#### Technical Specifications

**Event registration syntax:**
```typescript
const disposable = vscode.workspace.onDidChangeWorkspaceFolders(
  (event: vscode.WorkspaceFoldersChangeEvent) => {
    handleWorkspaceChange(event, outputChannel);
  }
);
```

**Arrow function shorthand (preferred):**
```typescript
const disposable = vscode.workspace.onDidChangeWorkspaceFolders(
  (event) => handleWorkspaceChange(event, outputChannel)
);
```

**Subscription pattern:**
```typescript
context.subscriptions.push(disposable);
```

#### Why Register in Both Paths?

**Dormant path registration:**
- User may add qualifying folder during session → extension can activate
- Logs workspace changes even if extension dormant (debugging)
- No performance cost (event only fires on user folder actions)

**Active path registration:**
- Logs workspace structure changes (multi-root scenarios)
- Helps debug activation state transitions
- Consistent monitoring across all extension states

### Test Scenarios

#### Scenario 1: Extension Starts Dormant, Folder Added Later
**Initial state:**
- Open unrelated project (no plans/ or specs/)
- Extension activates but enters dormant state
- Listener registered in dormant path

**User action:**
- File → Add Folder to Workspace
- Add Lineage project folder (has plans/)

**Expected behavior:**
- ✅ `handleWorkspaceChange()` called with event
- ✅ Workspace change logged to output channel
- ✅ Extension detects qualifying folder
- ✅ Activation status updated (remains dormant but logs change)

#### Scenario 2: Extension Starts Active, Folder Removed Later
**Initial state:**
- Open Lineage project
- Extension activates fully
- Listener registered in active path

**User action:**
- Add second workspace folder (unrelated project)
- Remove Lineage folder from workspace

**Expected behavior:**
- ✅ `handleWorkspaceChange()` called with event
- ✅ Workspace change logged to output channel
- ✅ Extension detects no qualifying folders remain
- ✅ Deactivation note logged (can't truly deactivate)

#### Scenario 3: Multi-Root Workspace Changes
**Initial state:**
- Multi-root workspace: lineage + other-project
- Extension active

**User action:**
- Remove other-project folder

**Expected behavior:**
- ✅ `handleWorkspaceChange()` called with event
- ✅ Removed folder logged
- ✅ Extension remains active (lineage still present)
- ✅ Updated workspace detection shows only lineage

#### Scenario 4: Extension Lifecycle
**Activation:**
- Extension loads → `activate()` called
- Listener registered via `onDidChangeWorkspaceFolders()`
- Disposable added to `context.subscriptions`

**Deactivation:**
- VSCode closes or extension unloads → `deactivate()` called
- VSCode automatically disposes all `context.subscriptions`
- No explicit cleanup needed in `deactivate()` function

### Expected Compilation Results

**Before implementation:**
- ❌ FAIL: Event listener not registered
- ❌ FAIL: `handleWorkspaceChange()` never called on folder changes
- ❌ FAIL: No workspace change monitoring active

**After minimal implementation:**
- ✅ PASS: TypeScript compiles without errors
- ✅ PASS: Listener registered in both dormant and active paths
- ✅ PASS: Disposable added to context.subscriptions
- ✅ PASS: Logging updated to indicate monitoring active

### TypeScript Compliance

**Strict mode checks:**
- ✅ Event parameter typed as `WorkspaceFoldersChangeEvent`
- ✅ Return type of `onDidChangeWorkspaceFolders()` is `Disposable`
- ✅ No implicit any types
- ✅ Null safety (outputChannel exists at registration time)

**VSCode API imports:**
```typescript
// Already imported at top of file
import * as vscode from 'vscode';

// Use via:
vscode.workspace.onDidChangeWorkspaceFolders(...)
```

### Manual Testing Verification

**Test checklist** (to be executed in Task 4-7):
- [ ] Build extension: `npm run compile` succeeds
- [ ] Launch Extension Development Host (F5)
- [ ] Open "Lineage Planning" output channel
- [ ] Verify monitoring message present in logs
- [ ] Test folder add/remove actions
- [ ] Verify `handleWorkspaceChange()` called (check output logs)

### Integration with Existing Code

**Current activate() structure (lines 172-213):**
```
1. Create output channel
2. Log activation header
3. Check workspace detection (shouldActivateExtension)
4. Log workspace detection results
5. IF dormant: Log message, return early
6. ELSE: Log success, show next steps
7. Console log
```

**Modified activate() structure (with listener):**
```
1. Create output channel
2. Log activation header
3. Check workspace detection (shouldActivateExtension)
4. Log workspace detection results
5. IF dormant:
   - Log message
   - Register workspace change listener ← NEW
   - Add to subscriptions ← NEW
   - Return early
6. ELSE:
   - Register workspace change listener ← NEW
   - Add to subscriptions ← NEW
   - Log success, show next steps with monitoring note ← UPDATED
7. Console log
```

### Expected Modifications

**File:** `vscode-extension/src/extension.ts`

**Lines to modify:**
- Line 196-199: Add listener registration before return
- Line 203-209: Add listener registration after shouldActivate check
- Line 207-209: Update logging to mention workspace monitoring

**Estimated LOC:** +12 lines (including logging updates)

---

**Test Status:** PASS ✅
- Workspace change listener registered in BOTH paths (dormant and active)
- Listener added to context.subscriptions for proper cleanup
- handleWorkspaceChange() will be called on folder changes
- Monitoring active messages added to output logs
- TypeScript compilation successful
- Implementation locations:
  - Dormant path: lines 202-205
  - Active path: lines 213-216
  - Logging updated: lines 198, 221

**Next Step:** Refactor to improve code quality (REFACTOR phase)
