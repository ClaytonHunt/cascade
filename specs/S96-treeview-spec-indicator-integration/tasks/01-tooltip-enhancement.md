---
spec: S96
phase: 1
title: Tooltip Enhancement
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Tooltip Enhancement

## Overview

Enhance the `buildTooltip()` method in PlanningTreeProvider to display spec progress details when hovering over Story items that have associated specs. This phase implements the only missing functionality from S96 acceptance criteria.

## Prerequisites

- S93 (Spec Progress Reader) completed and integrated ✅
- S94 (Spec Progress Cache) completed and integrated ✅
- S95 (Spec Phase Renderer) completed and integrated ✅
- PlanningTreeProvider.getTreeItem() already calling getSpecProgressCached() ✅

## Tasks

### Task 1: Analyze Current buildTooltip() Implementation

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1549-1564`

Review the existing method:

```typescript
private buildTooltip(element: PlanningTreeItem): string {
  // Calculate relative path from workspace root
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Check if item is archived (S80)
  const archivedTag = isItemArchived(element) ? ' [ARCHIVED]' : '';

  // Build tooltip with structured format
  const lines = [
    `${element.item} - ${element.title}${archivedTag}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  return lines.join('\n');
}
```

**Notes**:
- Simple string concatenation approach using array of lines
- Three-line format: title, metadata, file path
- Already handles archived items (adds `[ARCHIVED]` tag)
- Returns newline-separated string

**Expected Outcome**: Understanding of current implementation to guide enhancement approach.

---

### Task 2: Add Conditional Spec Progress Section

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1549-1564`

**Location**: Insert new logic after file path line, before return statement.

**Implementation**:

```typescript
private async buildTooltip(element: PlanningTreeItem): Promise<string> {
  // Calculate relative path from workspace root
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Check if item is archived (S80)
  const archivedTag = isItemArchived(element) ? ' [ARCHIVED]' : '';

  // Build tooltip with structured format
  const lines = [
    `${element.item} - ${element.title}${archivedTag}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  // NEW: Add spec progress section if story has spec (S96)
  if (element.type === 'story' && element.spec) {
    // Get spec progress from cache (should be cache hit since getTreeItem() already called this)
    const specProgress = await this.getSpecProgressCached(element);

    if (specProgress) {
      // Add blank line separator
      lines.push('');

      // Add spec progress section
      lines.push('Spec Progress:');

      // Calculate relative spec directory path
      const relativeSpecDir = path.relative(this.workspaceRoot, specProgress.specDir);
      lines.push(`- Directory: ${relativeSpecDir}`);

      // Show phase progress
      lines.push(`- Phases: ${specProgress.completedPhases}/${specProgress.totalPhases} complete`);

      // Show spec status
      lines.push(`- Status: ${specProgress.specStatus}`);

      // Add sync warning if out of sync
      if (!specProgress.inSync) {
        lines.push('');
        lines.push('⚠️ Spec and Story status out of sync');
        lines.push('Run /sync to update story status');
      }
    }
  }

  return lines.join('\n');
}
```

**Key Changes**:
1. Method signature now `async` (returns `Promise<string>`)
2. Conditional check: `element.type === 'story' && element.spec`
3. Call `getSpecProgressCached()` to fetch progress (cache hit expected)
4. Build spec progress section with 4 lines:
   - "Spec Progress:" header
   - Directory path (relative to workspace)
   - Phase count (completed/total)
   - Spec status
5. Conditional sync warning (2 lines) if `!specProgress.inSync`
6. Use array.push() for clean line-by-line construction
7. Maintain newline-separated format

**Edge Cases Handled**:
- Story without spec field → No spec section (existing behavior)
- Spec field present but directory not found → getSpecProgressCached() returns null, no section added
- Spec directory exists but no plan.md → getSpecProgressCached() returns null, no section added
- Spec in sync → No warning section
- Spec out of sync → Warning section added

**Expected Outcome**: Tooltip enhancement complete with spec progress details.

---

### Task 3: Update getTreeItem() to Await Tooltip

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:814-915`

**Location**: Line 857 where buildTooltip() is called.

**Change**:

```typescript
// BEFORE:
treeItem.tooltip = this.buildTooltip(element);

// AFTER:
treeItem.tooltip = await this.buildTooltip(element);
```

**Rationale**: buildTooltip() is now async (returns Promise), must await result.

**Note**: getTreeItem() is already async, so this change is safe.

**Expected Outcome**: Tooltip assignment works correctly with async method.

---

### Task 4: Manual Testing - Story with Spec

**Test Case**: Story with spec directory and multiple phases.

**Steps**:
1. Open workspace with S96 story file
2. Verify story has `spec` field in frontmatter:
   ```yaml
   spec: specs/S96-treeview-spec-indicator-integration
   ```
3. Package and install extension:
   ```bash
   cd vscode-extension && npm run compile && npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```
4. Reload VSCode window (Ctrl+Shift+P → "Developer: Reload Window")
5. Open Cascade TreeView
6. Hover over S96 story item
7. Verify tooltip shows:
   - Standard fields (title, type, status, priority, file path)
   - Spec Progress section with:
     - Directory: `specs/S96-treeview-spec-indicator-integration`
     - Phases: `0/2 complete`
     - Status: `Not Started`
   - No sync warning (story and spec both "Not Started")

**Expected Outcome**: Tooltip displays correctly with spec progress section.

---

### Task 5: Manual Testing - Story without Spec

**Test Case**: Story without spec field in frontmatter.

**Steps**:
1. Find a story in plans/ without `spec` field (e.g., older stories)
2. Hover over story item in TreeView
3. Verify tooltip shows:
   - Standard fields only
   - No Spec Progress section
   - No sync warning

**Expected Outcome**: Tooltip remains unchanged for stories without specs.

---

### Task 6: Manual Testing - Sync Warning

**Test Case**: Story with spec where statuses diverge.

**Setup**:
1. Create test story with `status: Ready` and `spec: specs/test-spec`
2. Create test spec directory with `plan.md`:
   ```yaml
   ---
   spec: TEST
   status: In Progress
   phases: 2
   ---
   ```
3. Reload TreeView

**Steps**:
1. Hover over test story
2. Verify tooltip shows:
   - Spec Progress section
   - Status shows "In Progress"
   - Sync warning present:
     ```
     ⚠️ Spec and Story status out of sync
     Run /sync to update story status
     ```

**Expected Outcome**: Sync warning displayed when spec is ahead of story.

---

### Task 7: Verify Cache Hit Rate

**Verification**: Confirm getSpecProgressCached() reuses cache from getTreeItem() call.

**Steps**:
1. Open Output Channel (Ctrl+Shift+P → "View: Toggle Output" → "Cascade")
2. Hover over multiple story items with specs
3. Check output logs for cache hit/miss messages
4. Expected pattern for EACH hover:
   - First call (getTreeItem): `[SpecProgressCache] Cache MISS for S96, reading from filesystem...`
   - Second call (buildTooltip): `[SpecProgressCache] Cache HIT for S96`
5. Verify hit rate > 99% for tooltip calls

**Expected Outcome**: Cache reuse confirmed, no redundant file reads.

---

### Task 8: Performance Measurement

**Objective**: Confirm tooltip enhancement has negligible performance impact.

**Steps**:
1. Use Chrome DevTools to profile TreeView rendering
   - Ctrl+Shift+P → "Developer: Toggle Developer Tools"
   - Switch to "Performance" tab
2. Record session:
   - Expand status group (triggers initial spec reads)
   - Hover over 10 story items with specs
   - Stop recording
3. Analyze flame graph for buildTooltip() calls
4. Expected timing: < 1ms per tooltip (cache hit scenario)

**Expected Outcome**: Performance impact negligible, well under 1ms per tooltip.

---

## Completion Criteria

- ✅ buildTooltip() method enhanced with spec progress section
- ✅ Method signature changed to async (returns Promise<string>)
- ✅ getTreeItem() updated to await buildTooltip() call
- ✅ Stories with specs show detailed tooltips
- ✅ Stories without specs show standard tooltips
- ✅ Sync warnings visible when spec/story diverge
- ✅ Spec directory path displayed as relative path
- ✅ Phase counts match spec phase files
- ✅ Cache hit rate > 99% for tooltip generation
- ✅ Performance impact < 1ms per tooltip
- ✅ No TypeScript compilation errors
- ✅ Extension packages and installs successfully

## Next Phase

Proceed to **Phase 2: Testing and Validation** for comprehensive testing scenarios.

## Notes

- Cache architecture ensures tooltip generation is nearly free (cache hit from getTreeItem)
- Async buildTooltip() is safe because getTreeItem() is already async
- Relative paths more compact than absolute paths (better tooltip readability)
- Sync warning actionable (tells user to run /sync command)
