---
spec: S37
title: Workspace Activation Logic
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-12
updated: 2025-10-12
---

# S37 - Workspace Activation Logic

## Implementation Strategy

Implement intelligent workspace detection to ensure the Lineage Planning extension only activates in workspaces containing `plans/` or `specs/` directories. This prevents unnecessary activation in unrelated projects and optimizes VSCode performance by avoiding file system watchers in irrelevant workspaces.

The implementation follows a three-phase approach:
1. **Workspace Detection Logic** - Core directory checking with proper path handling
2. **Activation Event Updates** - Refine package.json activation events for optimal startup
3. **Dynamic Workspace Monitoring** - Handle workspace folder changes at runtime

## Architecture Decisions

### Directory Detection Approach
**Decision: Synchronous `fs.existsSync()` with early return pattern**
- Simple and fast (< 100ms requirement easily met)
- Synchronous is acceptable during activation (blocking is expected)
- No race conditions with file system state
- Built-in Node.js `fs` module (no external dependencies)

**Alternative Considered**: Async `fs.promises.access()`
- Rejected: Adds unnecessary complexity for activation check
- Activation functions can be synchronous or async; sync is simpler here

### Activation Events Strategy
**Decision: Hybrid approach with multiple triggers**
```json
"activationEvents": [
  "onStartupFinished",           // Fallback for first-time detection
  "workspaceContains:**/plans/**",  // Instant activation if plans/ exists
  "workspaceContains:**/specs/**"   // Instant activation if specs/ exists
]
```
- `workspaceContains` triggers before extension loads (VSCode native optimization)
- `onStartupFinished` ensures detection runs even if dirs created after startup
- Reference: https://code.visualstudio.com/api/references/activation-events

### Multi-Root Workspace Handling
**Decision: Activate if ANY workspace folder qualifies**
- Iterate through all `vscode.workspace.workspaceFolders`
- Return `true` on first match (short-circuit optimization)
- Log which specific folder(s) triggered activation

### Windows Path Handling
**Decision: Use `path.join()` for all path construction**
- Handles backslashes vs forward slashes automatically
- Works correctly with `D:\projects\lineage` style paths
- Built-in Node.js `path` module (platform-agnostic)

**Case Sensitivity**: Use exact casing (`plans/` and `specs/`) but `fs.existsSync()` is case-insensitive on Windows by default (OS handles it)

### Logging Strategy
**Decision: Use existing output channel pattern from S36**
- Extension already has "Lineage Planning" output channel (lines 12-30 in extension.ts)
- Extend logging to include activation decisions
- Format:
  - ✅ Success messages for activation
  - ℹ️ Info messages for dormant state
  - 🔍 Debug messages for multi-root details

## Key Integration Points

1. **Extension Entry Point** (`vscode-extension/src/extension.ts:10`)
   - Modify `activate()` function to add workspace detection before other initialization
   - Early return if workspace doesn't qualify (prevents resource allocation)
   - Output channel already exists (lines 12-30)

2. **Package.json Activation Events** (`vscode-extension/package.json:17-19`)
   - Update `activationEvents` array to include workspace-based triggers
   - Maintains backward compatibility with existing `onStartupFinished`

3. **Future Story Dependencies**
   - **S38 (File System Watcher)**: Will only initialize if `shouldActivateExtension()` returns true
   - **S39 (YAML Parser)**: No direct dependency (utility module)
   - **S40 (Cache Layer)**: Will only initialize if workspace is active

## Risk Assessment

### Low Risks (Mitigated)
- **Symbolic link handling**: `fs.existsSync()` follows symlinks by default (Node.js behavior)
- **Performance impact**: Directory existence checks are O(1) disk operations (< 1ms each)
- **Missing directories**: Returns false gracefully (no exceptions)

### Medium Risks (Monitoring Required)
- **Race condition with directory creation**: User creates `plans/` after extension activates
  - **Mitigation**: Phase 3 implements `onDidChangeWorkspaceFolders` event listener
  - User can reload window (`Ctrl+Shift+P` → "Reload Window") as manual workaround

- **Multi-root workspace complexity**: Different folders may have different states
  - **Mitigation**: Clear logging shows exactly which folders triggered activation
  - Extension activates globally (can't activate per-folder in VSCode)

### No High Risks Identified
Standard VSCode API patterns with well-documented behavior.

## Codebase Analysis Summary

### Existing Files to Modify
1. **`vscode-extension/src/extension.ts`** (57 lines)
   - Current state: Basic activation with output channel logging
   - Modification: Add workspace detection logic before line 15 (output channel creation)
   - Estimated changes: +40 lines (new function + conditional logic)

2. **`vscode-extension/package.json`** (33 lines)
   - Current state: Single `onStartupFinished` activation event (line 18)
   - Modification: Expand `activationEvents` array to 3 items
   - Estimated changes: +2 lines

### New Files to Create
None. All functionality fits within existing extension structure.

### External Dependencies
**No new dependencies required.**
- Uses built-in Node.js modules: `fs`, `path`
- Uses existing VSCode API imports: `vscode.workspace`, `vscode.window`

### VSCode APIs Used
1. **`vscode.workspace.workspaceFolders`** - Array of open workspace folders
   - Type: `readonly WorkspaceFolder[] | undefined`
   - Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.workspaceFolders

2. **`vscode.workspace.onDidChangeWorkspaceFolders`** - Event when folders added/removed
   - Type: `Event<WorkspaceFoldersChangeEvent>`
   - Reference: https://code.visualstudio.com/api/references/vscode-api#workspace.onDidChangeWorkspaceFolders

3. **`vscode.window.createOutputChannel`** - Already used in extension.ts:12
   - No changes to output channel creation

4. **`WorkspaceFolder.uri.fsPath`** - Converts URI to file system path
   - Returns native OS path format (e.g., `D:\projects\lineage` on Windows)

### Project Context
- **Workspace root**: `D:\projects\lineage\`
- **Extension location**: `D:\projects\lineage\vscode-extension\`
- **Target directories**:
  - `D:\projects\lineage\plans\` (exists, contains epic/feature/story files)
  - `D:\projects\lineage\specs\` (exists, contains spec directories)
- **Operating system**: Windows (MINGW64_NT-10.0-26100)
- **Node.js version**: v22.18.0 (compatible with ES2020 target)

### Existing Code Patterns to Follow
1. **Output channel usage** (extension.ts:16-30):
   - Decorative separator lines with `'='.repeat(60)`
   - Emoji prefixes (✅, ℹ️, 👋, 🔍)
   - Structured logging with sections

2. **Subscription management** (extension.ts:13):
   - All disposables added to `context.subscriptions`
   - Ensures proper cleanup in `deactivate()`

3. **TypeScript configuration** (tsconfig.json):
   - Strict mode enabled
   - ES2020 target with CommonJS modules
   - No changes needed to support this feature

## Phase Overview

### Phase 1: Workspace Detection Logic
**Goal**: Implement core directory checking function with proper path handling and logging

**Key Tasks**:
- Create `shouldActivateExtension()` helper function
- Add workspace folder iteration with null checks
- Implement `plans/` and `specs/` directory existence checks
- Add detailed logging for activation decisions
- Integrate with `activate()` function

**Deliverable**: Extension activates only in workspaces with `plans/` or `specs/` directories, with clear logging

**Estimated Implementation Time**: 30 minutes

### Phase 2: Activation Event Updates
**Goal**: Optimize VSCode startup by using workspace-specific activation events

**Key Tasks**:
- Update package.json `activationEvents` array
- Add `workspaceContains:**/plans/**` trigger
- Add `workspaceContains:**/specs/**` trigger
- Test activation behavior in Extension Development Host
- Verify no activation in unrelated projects

**Deliverable**: Extension uses optimal activation triggers for instant loading when directories present

**Estimated Implementation Time**: 15 minutes

### Phase 3: Dynamic Workspace Monitoring
**Goal**: Handle workspace folders added/removed during VSCode session

**Key Tasks**:
- Register `onDidChangeWorkspaceFolders` event listener
- Re-evaluate activation status when folders change
- Log workspace changes with folder names
- Add subscription to context for cleanup
- Test with multi-root workspace scenarios

**Deliverable**: Extension responds to workspace changes without requiring window reload

**Estimated Implementation Time**: 20 minutes

## Testing Strategy

### Manual Testing (All Phases)

**Phase 1 - Workspace Detection**:
1. Open Lineage project (`D:\projects\lineage`) in VSCode
2. Package and install extension locally: `cd vscode-extension && npm run package && code --install-extension cascade-0.1.0.vsix --force`
3. Reload window (Ctrl+Shift+P → "Developer: Reload Window")
4. Check Output Channel ("Cascade" or "Lineage Planning")
5. Verify activation message includes workspace folder path
6. Open unrelated project (no `plans/` or `specs/`)
7. Reload window
8. Verify dormant/no activation message

**Phase 2 - Activation Events**:
1. Ensure extension is installed locally
2. Close all VSCode windows
3. Open Lineage project fresh
4. Extension should activate automatically (check output channel)
5. Verify no delay in activation (instant vs delayed)
6. Open project without `plans/specs`, verify no activation

**Phase 3 - Dynamic Monitoring**:
1. Open empty workspace folder
2. Verify extension dormant
3. Add Lineage workspace folder (`File → Add Folder to Workspace`)
4. Verify extension activates (check output channel logs)
5. Remove Lineage folder from workspace
6. Verify extension logs deactivation (if implemented)

### Validation Checklist
- [ ] Extension activates in Lineage project (has `plans/` and `specs/`)
- [ ] Extension does NOT activate in unrelated projects
- [ ] Activation status logged clearly to "Lineage Planning" output channel
- [ ] Multi-root workspace: Activates if ANY folder has directories
- [ ] Windows paths handled correctly (`D:\projects\lineage\plans` works)
- [ ] No errors in Debug Console during activation
- [ ] Workspace folder added dynamically triggers re-evaluation
- [ ] Activation check completes in < 100ms (check output timestamps)

### Edge Case Testing
- [ ] **No workspace folders**: Open single file in VSCode (no folder)
  - Expected: Extension dormant, no errors
- [ ] **Symbolic link directories**: Create symlink to `plans/`
  - Expected: Extension activates (follows symlink)
- [ ] **Case variations**: Rename to `Plans/` or `PLANS/` on Windows
  - Expected: Extension activates (case-insensitive on Windows)
- [ ] **Empty directories**: `plans/` exists but is empty
  - Expected: Extension activates (existence check only)
- [ ] **Mid-session creation**: Create `plans/` folder while extension running
  - Expected: Requires workspace folder add/remove to trigger re-check

## Next Steps After Completion

Once S37 is complete, the extension will have intelligent activation. The next stories can proceed:

1. **S39 - YAML Frontmatter Parser** (Recommended next)
   - Can be developed independently
   - Easier to unit test in isolation
   - S38 will depend on parser for frontmatter extraction

2. **S38 - File System Watcher** (After S39)
   - Will use `shouldActivateExtension()` to decide whether to initialize watcher
   - Will rely on workspace folder paths from Phase 1

3. **S40 - Frontmatter Cache Layer** (After S38, S39)
   - Will only initialize cache if workspace is active
   - Depends on parser (S39) and watcher (S38)

**Post-Implementation Verification**:
- Run `/build specs/S37-workspace-activation-logic/plan.md` to begin TDD implementation
- All phases should pass manual testing checklist before marking story complete
- Update S36 story status to "Ready" after S37 completion (unblocks S38)
