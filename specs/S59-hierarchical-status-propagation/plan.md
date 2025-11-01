---
spec: S59
title: Hierarchical Status Propagation
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-15
updated: 2025-10-15
---

# S59 - Hierarchical Status Propagation Implementation Specification

## Overview

This specification implements automatic status propagation from child items to parent items in the VSCode extension's Cascade TreeView. When all children of a parent reach "Completed" status, the parent automatically updates to "Completed". Similarly, when any child enters "In Progress", the parent moves from "Not Started" or "In Planning" to "In Progress".

This eliminates manual status management overhead and ensures parent frontmatter status fields stay synchronized with actual completion state.

## Implementation Strategy

### Core Approach

Build a new `StatusPropagationEngine` class that integrates with the existing `PlanningTreeProvider.refresh()` lifecycle. The engine will:

1. **Leverage Existing Infrastructure**: Use cached hierarchy and frontmatter parsing
2. **Bottom-Up Traversal**: Process children before parents (Story → Feature → Epic → Project)
3. **Atomic File Updates**: Use VSCode's workspace.fs API for safe frontmatter writes
4. **Non-Blocking Design**: Errors in propagation don't block TreeView refresh
5. **Comprehensive Logging**: All actions logged to Cascade Output Channel

### Integration Points

**Existing Systems to Reuse:**
- `PlanningTreeProvider.refresh()` - Entry point for propagation (line 189-204)
- `buildHierarchy()` - Provides parent-child relationships (line 717-822)
- `FrontmatterCache` - Parses and caches frontmatter (cache.ts)
- `FileSystemWatcher` - Already detects file changes with 300ms debouncing (extension.ts:330-449)
- Output Channel - Logging infrastructure (extension.ts:14)

**New Components to Create:**
- `StatusPropagationEngine` class - Core propagation logic
- `determineParentStatus()` method - Status transition rules
- `updateParentFrontmatter()` method - Atomic file updates
- `propagateStatuses()` method - Main orchestration

### Status Transition Rules

| Child States | Current Parent Status | New Parent Status | Action |
|--------------|----------------------|-------------------|--------|
| All "Completed" | Any status | "Completed" | Update parent |
| Any "In Progress" | "Not Started" or "In Planning" | "In Progress" | Update parent |
| Mixed states (some completed) | "Not Started" or "In Planning" | "In Progress" | Update parent |
| All "Not Started" | Any status | No change | Skip |
| No children (empty parent) | Any status | No change | Skip |
| Parent already "Completed" | "Completed" | "Completed" | Skip (no downgrade) |

### Performance Characteristics

**Target Performance (100 items, 20 parents):**
- Propagation completes within 100ms
- Uses cached hierarchy (no additional file system scans)
- Batched with refresh debouncing (leverages 300ms debounce)
- Async/non-blocking execution

**Optimization Strategy:**
- Single hierarchy traversal per refresh cycle
- Only write files when status changes (skip unchanged parents)
- Parallel frontmatter writes using Promise.all()
- Cache invalidation after writes (ensures fresh data on next load)

## Architecture Decisions

### Decision 1: Integrate with refresh() vs Separate Watcher

**Chosen Approach**: Integrate with `PlanningTreeProvider.refresh()`

**Rationale**:
- Leverages existing 300ms debouncing (prevents excessive propagation)
- Uses cached hierarchy data (already loaded during refresh)
- Ensures propagation completes before TreeView renders (UI consistency)
- Simpler architecture (one entry point vs two)

**Trade-offs**:
- Slightly longer refresh time (adds ~50-100ms to refresh cycle)
- Propagation runs even if file change wasn't status-related (acceptable overhead)

### Decision 2: File Update Strategy

**Chosen Approach**: Direct frontmatter line replacement with regex

**Rationale**:
- Simple and reliable (no YAML library dependencies for writing)
- Preserves exact formatting and comments
- Works with VSCode's workspace.fs API (atomic writes)
- Already validated by FrontmatterCache parsing

**Trade-offs**:
- Requires careful regex patterns (status line, updated line)
- Edge case: User manually edits frontmatter incorrectly (fails gracefully)

### Decision 3: Error Handling Philosophy

**Chosen Approach**: Non-blocking propagation with comprehensive logging

**Rationale**:
- Propagation failures shouldn't prevent TreeView refresh
- User can manually fix parent status if propagation fails
- Next refresh cycle will correct any missed updates
- Logs provide full debugging context

**Implementation**:
- Try-catch around each parent update
- Continue processing remaining parents on error
- Log all errors with file paths and context
- Return status summary (updated count, skipped count, error count)

## Key Integration Points

### 1. PlanningTreeProvider.refresh() Enhancement

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:189-204`

**Current Logic**:
```typescript
refresh(): void {
  // Clear items cache first (forces reload on next access)
  this.allItemsCache = null;
  this.outputChannel.appendLine('[ItemsCache] Cache cleared');

  // Clear hierarchy cache (depends on items data)
  this.hierarchyCache.clear();
  this.outputChannel.appendLine('[Hierarchy] Cache cleared');

  // Clear progress cache (depends on hierarchy data)
  this.progressCache.clear();
  this.outputChannel.appendLine('[Progress] Cache cleared');

  // Notify VSCode to reload tree
  this._onDidChangeTreeData.fire(undefined);
}
```

**Enhanced Logic** (add propagation step):
```typescript
async refresh(): Promise<void> {
  // Clear caches (existing logic)
  this.allItemsCache = null;
  this.hierarchyCache.clear();
  this.progressCache.clear();

  // NEW: Trigger status propagation before TreeView refresh
  try {
    // Load items and build hierarchy
    const items = await this.loadAllPlanningItems();
    const fullHierarchy = this.buildHierarchy(items);

    // Run propagation
    await this.propagationEngine.propagateStatuses(items, fullHierarchy);

    // Clear caches again (propagation may have changed files)
    this.allItemsCache = null;
    this.hierarchyCache.clear();
    this.progressCache.clear();
  } catch (error) {
    this.outputChannel.appendLine(`[PROPAGATE] ❌ Error: ${error}`);
    // Continue with refresh even if propagation fails
  }

  // Notify VSCode to reload tree
  this._onDidChangeTreeData.fire(undefined);
}
```

### 2. FileSystemWatcher Integration

**Location**: `vscode-extension/src/extension.ts:350-359`

**Current Logic**:
```typescript
const handleChange = (uri: vscode.Uri) => {
  // Invalidate cache entry (file content changed, old data stale)
  cache.invalidate(uri.fsPath);

  // Refresh TreeView to show updated data
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] REFRESH: TreeView updated (file changed)`);
  }
};
```

**No changes needed** - `refresh()` already called, which will now trigger propagation automatically.

### 3. FrontmatterCache Integration

**Location**: `vscode-extension/src/cache.ts`

**Usage Pattern**:
```typescript
// Read current frontmatter
const frontmatter = await this.cache.get(filePath);
if (!frontmatter) {
  // Handle error
}

// Update file content (regex replacement)
const newContent = content.replace(statusRegex, `status: ${newStatus}`);
await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));

// Invalidate cache (will be reparsed on next access)
this.cache.invalidate(filePath);
```

## Phases Overview

### Phase 1: StatusPropagationEngine Core Implementation
**Duration**: ~2 hours
**Tasks**: 6 tasks
**Focus**: Create `StatusPropagationEngine` class with status determination logic and file update methods

**Deliverables**:
- `StatusPropagationEngine` class skeleton
- `determineParentStatus()` method with status transition rules
- `updateParentFrontmatter()` method for atomic file updates
- Unit tests for status determination logic

### Phase 2: PlanningTreeProvider Integration
**Duration**: ~1.5 hours
**Tasks**: 4 tasks
**Focus**: Integrate propagation engine with refresh cycle and hierarchy traversal

**Deliverables**:
- Enhanced `refresh()` method with propagation step
- `propagateStatuses()` orchestration method
- Depth-first hierarchy traversal
- Integration tests with mock file system

### Phase 3: Testing, Logging, and Polish
**Duration**: ~2 hours
**Tasks**: 5 tasks
**Focus**: Comprehensive testing, logging infrastructure, and edge case handling

**Deliverables**:
- End-to-end propagation tests
- Cascade Output Channel logging
- Error handling and recovery
- Performance validation
- Documentation updates

## Testing Strategy

### Unit Tests

**Test File**: `vscode-extension/src/test/suite/statusPropagation.test.ts`

**Coverage**:
- Status determination logic (all transition rules)
- Frontmatter regex replacement
- Error handling (malformed frontmatter, file write failures)
- Edge cases (no children, empty hierarchy, concurrent updates)

### Integration Tests

**Test Scenarios**:
1. Complete all stories in feature → Feature becomes "Completed"
2. Complete all features in epic → Epic becomes "Completed"
3. Start one story → Feature becomes "In Progress"
4. Mixed states (some completed) → Parent becomes "In Progress"
5. Manual override respected (user sets parent status explicitly)

### Manual Testing

**Test Plan**:
1. Open Cascade TreeView
2. Complete final story in feature (via drag-drop or manual edit)
3. Wait for refresh (< 1 second)
4. Verify feature status shows "Completed"
5. Verify feature progress shows "(N/N)"
6. Verify Output Channel logs propagation action

## Error Handling

### Propagation Error Categories

1. **File Read Errors**: File doesn't exist, permission denied
   - Action: Log error, skip parent, continue processing
   - Recovery: Next refresh cycle will retry

2. **Malformed Frontmatter**: Invalid YAML, missing fields
   - Action: Log warning, skip parent, continue processing
   - Recovery: User must fix frontmatter manually

3. **File Write Errors**: Permission denied, disk full
   - Action: Log error, skip parent, continue processing
   - Recovery: Next refresh cycle will retry

4. **Regex Match Failures**: Status/updated line not found
   - Action: Log error, skip parent, continue processing
   - Recovery: User must fix frontmatter manually

### Logging Format

**Success Log**:
```
[PROPAGATE] ✅ F16 status updated: In Progress → Completed
[PROPAGATE]    File: plans/epic-04-kanban-view/feature-16-foundation/feature.md
[PROPAGATE]    Children: 6 (all completed: true)
```

**Error Log**:
```
[PROPAGATE] ❌ Error updating F16: Pattern match failed
[PROPAGATE]    File: plans/epic-04-kanban-view/feature-16-foundation/feature.md
[PROPAGATE]    Status regex did not match frontmatter
```

**Summary Log**:
```
[PROPAGATE] Starting status propagation...
[PROPAGATE] Completed in 87ms: 3 updated, 12 skipped, 0 errors
```

## Dependencies

### Existing Infrastructure
- S38 (FileSystemWatcher) - Detects file changes
- S40 (FrontmatterCache) - Parses and caches frontmatter
- S55 (Hierarchical Item Display) - Provides parent-child relationships
- S56 (Progress Indicators) - Uses same hierarchy for progress calculation

### No New External Dependencies
All functionality implemented using existing VSCode APIs and extension infrastructure.

## Future Enhancements

**Not in Scope for S59**:
- Bi-directional propagation (parent status propagating to children)
- Custom propagation rules per item type (via frontmatter configuration)
- Propagation history tracking (audit log of status changes)
- UI confirmation before propagating (automatic only for now)
- Spec status propagation (currently only plans/ items)

**Potential Future Stories**:
- S60: Configurable propagation rules (enable/disable per workspace)
- S61: Propagation conflict resolution UI (handle manual override conflicts)
- S62: Spec-to-Story-to-Feature-to-Epic full propagation chain
- S63: Propagation preview mode (show proposed changes before applying)

## Success Criteria

### Functional Requirements
- ✅ When all stories in feature complete → Feature status becomes "Completed"
- ✅ When all features in epic complete → Epic status becomes "Completed"
- ✅ When any child enters "In Progress" → Parent becomes "In Progress"
- ✅ Propagation triggered automatically by FileSystemWatcher events
- ✅ Parent `updated:` timestamp refreshed on status change

### Non-Functional Requirements
- ✅ Propagation completes within 100ms (typical hierarchy)
- ✅ No UI blocking during propagation
- ✅ All actions logged to Cascade Output Channel
- ✅ Error handling is non-blocking (TreeView refresh continues)
- ✅ Cache hit rate maintained (> 80% expected)

### Safety Requirements
- ✅ Never downgrade status (Completed → In Progress not allowed)
- ✅ Manual overrides respected (user retains control)
- ✅ Empty parents (0 children) not propagated
- ✅ Propagation is idempotent (running twice safe)

## Next Steps

After spec approval, run:
```bash
/build specs/S59-hierarchical-status-propagation/plan.md
```

This will execute Phase 1 with RED-GREEN-REFACTOR TDD cycle.
