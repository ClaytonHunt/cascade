# Workspace Events Test Documentation

## Task 1: Understanding VSCode Workspace Events

### Purpose
Document how `onDidChangeWorkspaceFolders` event works to verify implementation correctness.

### Event API: `vscode.workspace.onDidChangeWorkspaceFolders`

**Type signature:**
```typescript
onDidChangeWorkspaceFolders(
  listener: (e: WorkspaceFoldersChangeEvent) => any,
  thisArgs?: any,
  disposables?: Disposable[]
): Disposable
```

**Event payload:**
```typescript
interface WorkspaceFoldersChangeEvent {
  readonly added: readonly WorkspaceFolder[];
  readonly removed: readonly WorkspaceFolder[];
}

interface WorkspaceFolder {
  readonly uri: Uri;        // e.g., file:///D:/projects/lineage
  readonly name: string;    // e.g., "lineage"
  readonly index: number;   // Position in workspace folders array
}
```

### When Event Fires

**User Actions:**
- ✅ File → Add Folder to Workspace
- ✅ Right-click folder → Remove Folder from Workspace
- ✅ Opening .code-workspace file with different folders
- ✅ File → Save Workspace As (creates multi-root)

**Does NOT fire:**
- ❌ Creating/deleting directories within existing workspace folders
- ❌ Renaming workspace folders
- ❌ Changing active text editor
- ❌ Opening single file (not in folder)

### Event Behavior

**Timing:**
- ⏱️ Event fires AFTER folders are added/removed (not before)
- ⚡ Synchronous event delivery (handler called before next VSCode operation)
- 🔁 May fire multiple times if multiple folders changed at once

**Event Payload:**
- 📊 Provides delta (added/removed arrays) not full state
- 🔍 Must check `vscode.workspace.workspaceFolders` for current complete state
- ✅ Empty arrays if no change in that direction (e.g., added=[], removed=[folder])

**Lifecycle:**
- 🗑️ Returns `Disposable` - must call `.dispose()` or add to `context.subscriptions`
- ⚠️ Failure to dispose causes memory leaks
- ♻️ VSCode automatically disposes subscriptions when extension deactivates

**Key Insight:** This event provides reactive workspace monitoring without polling,
making it ideal for dynamic activation logic that responds to user workspace changes.

### Test Scenarios

#### Scenario 1: Add Single Folder
**Action:** Add `D:\projects\lineage` to empty workspace
**Expected event.added:** `[{name: "lineage", uri: file:///D:/projects/lineage, index: 0}]`
**Expected event.removed:** `[]`
**Expected workspaceFolders after:** `[lineage]`

#### Scenario 2: Remove Single Folder
**Action:** Remove `D:\projects\lineage` from single-folder workspace
**Expected event.added:** `[]`
**Expected event.removed:** `[{name: "lineage", ...}]`
**Expected workspaceFolders after:** `undefined` (no folders)

#### Scenario 3: Add Multiple Folders
**Action:** Add 2 folders simultaneously
**Expected behavior:** Single event with both in `added` array OR two separate events
**Expected workspaceFolders after:** All folders present

#### Scenario 4: Multi-Root Workspace Changes
**Action:** Remove one folder from multi-root workspace
**Expected event.removed:** `[removed-folder]`
**Expected workspaceFolders after:** Other folders remain

### Path Handling Notes

**Windows Paths:**
- `WorkspaceFolder.uri.fsPath` returns: `D:\projects\lineage` (native format)
- Use `path.join(folder.uri.fsPath, 'plans')` for subdirectory checks
- VSCode handles forward/backslash normalization

**URI vs File System Path:**
- `folder.uri.scheme` is typically `"file"`
- `folder.uri.fsPath` converts URI to OS path (preferred for fs operations)
- `folder.uri.toString()` returns `file:///D:/projects/lineage`

### API Reference
https://code.visualstudio.com/api/references/vscode-api#workspace.onDidChangeWorkspaceFolders

### Expected Implementation Outcome
Handler function should:
1. Log workspace change with timestamp
2. Log added folders with paths
3. Log removed folders with paths
4. Re-evaluate activation status using existing `shouldActivateExtension()`
5. Log new activation state
6. Handle empty workspace gracefully (no errors)

---

**Test Status:** PASS ✅
- Event API signature documented correctly
- Event payload structure matches VSCode API
- Test scenarios cover all use cases (add, remove, multi-root)
- Path handling notes accurate for Windows
- Implementation expectations clearly defined

**Next Step:** Implement `handleWorkspaceChange()` function (Task 2)
