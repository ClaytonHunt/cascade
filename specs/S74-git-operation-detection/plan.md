---
spec: S74
title: Git Operation Detection
type: spec
status: Completed
priority: Low
phases: 4
created: 2025-10-23
updated: 2025-10-23
---

# S74 - Git Operation Detection

## Implementation Strategy

This specification implements git operation detection to optimize TreeView refresh behavior during batch git operations (checkout, merge, pull, rebase). The current implementation (S71-S72) triggers individual refresh events for each file change, which is suboptimal for git operations that modify 10-100+ files simultaneously.

### Problem Statement

**Current Behavior:**
- Git merge with 50 file changes → 50 individual file change events
- Each event invalidates cache and schedules debounced refresh (300ms timer reset)
- Final refresh executes after last file change settles
- Cache retains 50+ stale entries from pre-merge state (memory waste)
- No user feedback that batch operation occurred

**Desired Behavior:**
- Detect git operation via `.git/HEAD` and `.git/index` monitoring
- Suppress individual file change refresh events during git operation
- Wait for git operation completion (500ms debounce on git metadata changes)
- Full cache clear (not just invalidate changed files)
- Single immediate TreeView refresh (bypass normal 300ms debounce)

### Architecture Decisions

1. **GitOperationDetector Class**: New utility class in `src/utils/GitOperationDetector.ts`
   - Monitors `.git/HEAD` and `.git/index` via FileSystemWatcher
   - Uses 500ms debounce (longer than file change debounce to ensure git operation completes)
   - Provides `isGitOperationInProgress()` status check for integration
   - Exposes `onGitOperationComplete` callback for refresh coordination

2. **Integration Point**: Modify `createFileSystemWatchers()` in `extension.ts`
   - Pass `GitOperationDetector` reference to file change handlers
   - Check `gitDetector.isGitOperationInProgress()` before scheduling refresh
   - Still invalidate cache per-file (correctness), but suppress refresh
   - Register git operation completion handler to trigger full cache clear + immediate refresh

3. **Cache Strategy**: Leverage existing `FrontmatterCache.clear()` method
   - Current implementation already has `clear()` method (cache.ts:231)
   - Git operation completion triggers full cache clear instead of per-file invalidation
   - Frees memory from stale entries immediately

4. **Configuration**: Add VSCode settings for git detection
   - `planningKanban.enableGitOperationDetection` (boolean, default true)
   - `planningKanban.gitOperationDebounceDelay` (number, default 500ms)
   - Settings listener updates detector configuration dynamically

### Key Integration Points

1. **extension.ts**:
   - Line ~200: Import `GitOperationDetector` class
   - Line ~410: Create `GitOperationDetector` instance in `activate()`
   - Line ~422: Register `onGitOperationComplete` callback
   - Line ~431: Create git watchers and register for disposal
   - Line ~434: Pass `gitDetector` to `createFileSystemWatchers()`
   - Line ~554: Add configuration change listener for git settings

2. **createFileSystemWatchers()** (extension.ts:348):
   - Add `gitDetector: GitOperationDetector` parameter
   - Modify `handleChange()` (line 368): Check `gitDetector.isGitOperationInProgress()` before scheduling refresh
   - Modify `handleCreate()` (line 357): Check git operation status
   - Modify `handleDelete()` (line 408): Check git operation status

3. **cache.ts**:
   - Existing `clear()` method (line 231) already implemented
   - No modifications needed

4. **package.json**:
   - Add two new configuration properties in `contributes.configuration`

### Risk Assessment

**Low Risk:**
- GitOperationDetector is isolated utility (no impact on existing code if disabled)
- Graceful degradation: If `.git/` directory doesn't exist, detector disables itself
- Configuration allows users to disable feature if issues arise
- Existing S71-S72 behavior preserved when git detection disabled

**Potential Issues:**
- Git operations interrupted (timeout after 5 seconds to force completion)
- Concurrent git operations (e.g., git pull during merge) → Timer resets, last operation wins
- Non-git `.git/` changes (e.g., config edits) → Only monitor HEAD/index, ignore other files

**Mitigation:**
- Timeout mechanism prevents indefinite suppression of refreshes
- Configuration allows disabling if problematic
- Extensive logging for debugging (output channel shows all git events)

## Phase Overview

### Phase 1: GitOperationDetector Implementation
Create standalone `GitOperationDetector` class with git metadata monitoring, debouncing, and completion detection.

**Duration:** 1-2 hours
**Deliverables:** `src/utils/GitOperationDetector.ts` with complete implementation

### Phase 2: Extension Integration
Integrate `GitOperationDetector` with existing file watchers and cache management.

**Duration:** 1-2 hours
**Deliverables:** Modified `extension.ts` with git-aware file change handling

### Phase 3: Configuration and Settings
Add VSCode settings for git detection configuration and dynamic reconfiguration support.

**Duration:** 30 minutes
**Deliverables:** Updated `package.json` with settings, configuration change listener in `extension.ts`

### Phase 4: Testing and Validation
Comprehensive testing with git operations, edge cases, and performance validation.

**Duration:** 1 hour
**Deliverables:** Verified git detection behavior, performance metrics, logging validation

## Codebase Analysis Summary

### Files to Modify

1. **vscode-extension/src/extension.ts** (existing):
   - Add `GitOperationDetector` import
   - Create detector instance in `activate()`
   - Pass detector to `createFileSystemWatchers()`
   - Add configuration change listener
   - Modify file change handlers to check git operation status

2. **vscode-extension/package.json** (existing):
   - Add configuration properties for git detection settings

### New Files to Create

1. **vscode-extension/src/utils/GitOperationDetector.ts**:
   - Complete `GitOperationDetector` class implementation
   - Configuration interface
   - Git watcher creation and event handling
   - Debouncing and timeout logic

### External Dependencies

**VSCode APIs:**
- `vscode.workspace.createFileSystemWatcher()`: Monitor `.git/HEAD` and `.git/index`
- `vscode.RelativePattern`: Create workspace-relative patterns for git metadata
- `vscode.workspace.getConfiguration()`: Read git detection settings
- `vscode.workspace.onDidChangeConfiguration()`: Listen for settings changes

**Node.js APIs:**
- `setTimeout()` / `clearTimeout()`: Debounce timer management
- `path.join()`: Construct `.git/` directory paths

**Godot APIs:**
- None (VSCode extension only)

### Integration with Existing Systems

1. **FileSystemWatcher (S71)**:
   - Existing: Monitors `plans/**/*.md` and `specs/**/*.md`
   - Integration: Add git operation check before scheduling refresh
   - No changes to watcher creation, only event handler logic

2. **FrontmatterCache (S40)**:
   - Existing: `clear()` method (cache.ts:231) already implemented
   - Integration: Call `cache.clear()` on git operation completion
   - No modifications to cache implementation needed

3. **Debounced Refresh (S72)**:
   - Existing: `scheduleRefresh()` with 300ms debounce
   - Integration: Bypass debounce for git completion (call `refresh()` directly)
   - No modifications to refresh mechanism needed

4. **Change Detection (S73)**:
   - Existing: `detectChangeType()` analyzes file changes
   - Integration: Skip change detection during git operation (suppressed)
   - Change detection still runs on final refresh after git completion

## Next Steps

After specification approval, run `/build specs/S74-git-operation-detection/plan.md` to begin TDD implementation with RED-GREEN-REFACTOR cycle.

**Implementation Order:**
1. Phase 1: Create `GitOperationDetector` class (isolated, testable)
2. Phase 2: Integrate with extension (modify existing code)
3. Phase 3: Add configuration support (settings + listener)
4. Phase 4: Test with real git operations (manual validation)
