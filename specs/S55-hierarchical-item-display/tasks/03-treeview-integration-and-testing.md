---
spec: S55
phase: 3
title: TreeView Integration and Testing
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 3: TreeView Integration and Testing

## Overview

This phase integrates the hierarchy building logic (Phase 2) into the VSCode TreeView's `getChildren()` method and verifies the hierarchical display works correctly. We modify the existing flat tree logic to use hierarchy nodes for parent items (epics and features) while maintaining compatibility with status groups and leaf items.

After integration, we perform comprehensive manual testing to ensure:
- Hierarchy displays correctly
- Expand/collapse behavior works
- Cache invalidation responds to file changes
- Performance is acceptable

## Prerequisites

- Phase 1 and Phase 2 completed
- Hierarchy building methods tested and working
- VSCode extension development environment set up
- Understanding of VSCode TreeView API

## Tasks

### Task 1: Modify getChildren() for Hierarchy Support

**Objective:** Update the `getChildren()` method to return hierarchical children for planning items.

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:137-152`

**Current Implementation:**
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level: Return status groups
  if (!element) {
    return await this.getStatusGroups();
  }

  // Status group expanded: Return items with that status
  if (element.type === 'status-group') {
    const statusGroup = element as StatusGroupNode;
    return await this.getItemsForStatus(statusGroup.status);
  }

  // Planning item expanded: No children (flat structure within status groups)
  // Hierarchical nesting (Epic → Feature → Story) will be added in S55
  return [];
}
```

**New Implementation:**
```typescript
/**
 * Returns child elements for the tree.
 *
 * Tree structure with hierarchy (S55):
 * - Root level (element = undefined): Returns 6 status group nodes
 * - Status group level (element = StatusGroupNode): Returns top-level items in hierarchy (epics + orphans)
 * - Epic level (element = epic PlanningTreeItem): Returns child features
 * - Feature level (element = feature PlanningTreeItem): Returns child stories/bugs
 * - Story/Bug level: Returns empty array (leaf nodes)
 *
 * Hierarchy is built using directory structure parsed from file paths.
 * Items are cached per status group to avoid rebuilding on every interaction.
 *
 * @param element - Parent element (undefined for root)
 * @returns Array of child nodes (status groups, or planning items)
 */
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level: Return status groups
  if (!element) {
    return await this.getStatusGroups();
  }

  // Status group expanded: Return top-level items in hierarchy
  if (element.type === 'status-group') {
    const statusGroup = element as StatusGroupNode;
    const hierarchy = await this.getHierarchyForStatus(statusGroup.status);

    // Return root-level items (epics + orphans)
    return hierarchy.map(node => node.item);
  }

  // Planning item expanded: Return children based on type
  const item = element as PlanningTreeItem;

  if (item.type === 'epic' || item.type === 'feature') {
    // Parent item - return children from hierarchy
    return await this.getChildrenForItem(item);
  }

  // Leaf item (story, bug, spec, phase) - no children
  return [];
}
```

**Validation:**
- Code compiles without TypeScript errors
- Method signature unchanged (maintains interface contract)
- JSDoc comments updated to reflect hierarchy
- Logic handles all node types correctly

**References:**
- VSCode TreeDataProvider API: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- Existing implementation: `vscode-extension/src/treeview/PlanningTreeProvider.ts:137-152`

---

### Task 2: Update getTreeItem() Collapsible State

**Objective:** Ensure collapsible state reflects actual children count, not just item type.

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:66-124`

**Current Implementation:**
The `getCollapsibleState()` method (line 412-422) already sets correct state based on type:
- Parent types (epic, feature, project): Collapsed
- Leaf types (story, bug, spec, phase): None

However, this doesn't account for parents with no children. We should update it to check actual children.

**Updated Implementation:**

Replace the call to `getCollapsibleState()` in `getTreeItem()` (around line 95):

```typescript
// Determine collapsible state based on type and children
const collapsibleState = await this.getCollapsibleStateForItem(element);
```

Add new method:

```typescript
/**
 * Determines the collapsible state for a planning item based on type and children.
 *
 * Collapsible state logic:
 * - Parent items (Project, Epic, Feature) with children: Collapsed
 * - Parent items with NO children: None (no collapse arrow)
 * - Leaf items (Story, Bug, Spec, Phase): None
 *
 * This method checks the hierarchy to see if the item actually has children
 * before setting the collapsible state, preventing empty parent items from
 * showing collapse arrows.
 *
 * @param element - Planning tree item
 * @returns Collapsible state for the item
 */
private async getCollapsibleStateForItem(element: PlanningTreeItem): Promise<vscode.TreeItemCollapsibleState> {
  // Leaf types never have children
  const leafTypes = ['story', 'bug', 'spec', 'phase'];
  if (leafTypes.includes(element.type)) {
    return vscode.TreeItemCollapsibleState.None;
  }

  // Parent types - check if they have children
  const parentTypes = ['project', 'epic', 'feature'];
  if (parentTypes.includes(element.type)) {
    // Get children from hierarchy
    const children = await this.getChildrenForItem(element);

    if (children.length > 0) {
      // Has children - collapsible
      return vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      // No children - not collapsible
      return vscode.TreeItemCollapsibleState.None;
    }
  }

  // Default: not collapsible
  return vscode.TreeItemCollapsibleState.None;
}
```

**IMPORTANT:** This creates an async call in `getTreeItem()`, which was previously synchronous. VSCode's `getTreeItem()` method supports both sync and async return values, so we need to update the signature:

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:66`

**Change:**
```typescript
getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
```

And update the method to be async:
```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // ... existing code ...

  // Around line 95 - update collapsible state call
  const collapsibleState = await this.getCollapsibleStateForItem(element);

  // ... rest of method ...
}
```

**Alternative (Simpler):** Keep the original synchronous approach and just use type-based state. Empty parents will show collapse arrows but expand to empty (acceptable UX). This avoids async complexity.

**Recommendation:** Use simpler approach initially. Optimize later if needed.

**Validation:**
- If using async approach: `getTreeItem()` signature updated correctly
- If using simple approach: No changes needed to `getTreeItem()`
- Collapsible state shows/hides arrows appropriately

---

### Task 3: Build and Install Extension for Testing

**Objective:** Package the extension and install it in VSCode for manual testing.

**Location:** `vscode-extension/` directory

**Steps:**

1. **Compile TypeScript:**
   ```bash
   cd vscode-extension
   npm run compile
   ```

2. **Package extension as VSIX:**
   ```bash
   npm run package
   ```
   This creates `cascade-0.1.0.vsix` file.

3. **Install in VSCode:**
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

4. **Reload VSCode window:**
   - Press Ctrl+Shift+P
   - Run "Developer: Reload Window"

5. **Open Cascade TreeView:**
   - Click Cascade icon in Activity Bar (left sidebar)
   - TreeView should populate with planning items

**Validation:**
- Extension compiles without errors
- VSIX package created successfully
- Extension installs without errors
- VSCode recognizes the extension
- TreeView loads and displays items

**Troubleshooting:**
- Compilation errors: Check TypeScript version, dependencies
- Installation errors: Try uninstalling first: `code --uninstall-extension cascade`
- TreeView not showing: Check Output panel (Cascade channel) for errors

**References:**
- Extension testing instructions: `CLAUDE.md:77-103` (VSCode Extension Testing section)

---

### Task 4: Manual Testing - Basic Hierarchy Display

**Objective:** Verify that the hierarchy displays correctly with proper nesting.

**Test Cases:**

**Test 1: Epic → Feature → Story hierarchy**
- Navigate to a status group containing items from `epic-04-planning-kanban-view`
- Expand the status group
- **Expected:**
  - Epic E4 appears at top level
  - Epic has collapse arrow (indicates children)
- Click to expand Epic E4
- **Expected:**
  - Features F16, F17 appear indented under E4
  - Features have collapse arrows
- Click to expand Feature F16
- **Expected:**
  - Stories appear indented under F16
  - Stories have NO collapse arrows (leaf nodes)

**Test 2: Orphan items display**
- Navigate to a status group containing orphan items (stories without parent feature)
- Expand the status group
- **Expected:**
  - Orphan stories appear at top level (same level as epics)
  - Orphan stories have NO collapse arrows

**Test 3: Mixed hierarchy**
- Find a status group with both structured (epic→feature→story) and orphan items
- Expand the status group
- **Expected:**
  - Orphan items appear first (top)
  - Epic items appear next
  - All items sorted by item number within their level

**Test 4: Empty parent**
- Find an epic with no features (or create test case)
- Expand status group containing the epic
- **Expected:**
  - Epic appears in list
  - If using simple approach: Epic has collapse arrow but expands to empty
  - If using async approach: Epic has NO collapse arrow

**Test 5: Deep hierarchy**
- Navigate to a deeply nested story (Epic → Feature → Story)
- **Expected:**
  - Visual indentation shows depth correctly
  - Breadcrumb path matches directory structure

**Validation:**
- All test cases pass
- Visual hierarchy matches directory structure
- No missing items
- No duplicate items
- Item order correct at each level

---

### Task 5: Manual Testing - Expand/Collapse Behavior

**Objective:** Verify expand/collapse interactions work correctly.

**Test Cases:**

**Test 1: Expand/collapse epic**
- Expand an epic → features appear
- Collapse the epic → features disappear
- Expand again → features reappear
- **Expected:** Smooth toggle behavior, no flicker

**Test 2: Expand/collapse nested features**
- Expand epic
- Expand feature under epic → stories appear
- Collapse feature → stories disappear
- **Expected:** Children hide correctly

**Test 3: Multiple items expanded**
- Expand epic E4
- Expand epic E1
- Both should stay expanded
- **Expected:** Multiple expansion states maintained simultaneously

**Test 4: Collapse state persistence**
- Expand epic E4
- Expand feature F16
- Trigger refresh (edit a file, save)
- **Expected:**
  - VSCode should maintain collapse state (implementation detail)
  - Items remain expanded after refresh

**Test 5: Status group collapse**
- Collapse a status group
- Expand it again
- **Expected:**
  - Items reappear
  - Child expansion state reset (VSCode default)

**Validation:**
- All expand/collapse operations work smoothly
- No lag or delays
- No errors in Output panel
- Hierarchy rebuilds correctly on refresh

---

### Task 6: Manual Testing - Cache Behavior

**Objective:** Verify hierarchy caching works correctly and invalidates on file changes.

**Test Cases:**

**Test 1: Cache hit logging**
- Open Output panel → Select "Cascade" channel
- Expand a status group (first time)
- **Expected:** Log shows "Cache miss for status: Ready, building..."
- Collapse and expand again
- **Expected:** Log shows "Cache hit for status: Ready"

**Test 2: Cache invalidation on file change**
- Expand a status group
- Edit a planning file (change title in frontmatter)
- Save the file
- **Expected:**
  - FileSystemWatcher triggers refresh
  - Log shows "Cache cleared"
  - Log shows "Cache miss" on next expand (hierarchy rebuilt)

**Test 3: Cache invalidation on new file**
- Expand a status group
- Create a new planning file in plans/ directory
- **Expected:**
  - TreeView refreshes automatically (FileSystemWatcher)
  - New item appears in hierarchy
  - Cache rebuilt

**Test 4: Cache invalidation on delete**
- Expand a status group
- Delete a planning file
- **Expected:**
  - TreeView refreshes
  - Deleted item removed from hierarchy
  - Cache rebuilt

**Validation:**
- Cache logs appear in Output panel
- Cache hits occur on repeated expansion
- Cache invalidates on file changes
- No stale data displayed

**References:**
- FileSystemWatcher implementation: `vscode-extension/src/extension.ts` (S38)

---

### Task 7: Manual Testing - Performance

**Objective:** Verify performance is acceptable with realistic data volumes.

**Test Cases:**

**Test 1: Load time with many items**
- Use existing plans/ directory (50+ items)
- Open TreeView
- **Expected:** TreeView loads in < 1 second

**Test 2: Expand epic with many features**
- Find/create epic with 10+ features
- Expand the epic
- **Expected:** Children appear in < 200ms (imperceptible delay)

**Test 3: Expand feature with many stories**
- Find/create feature with 20+ stories
- Expand the feature
- **Expected:** Children appear in < 200ms

**Test 4: Rapid expand/collapse**
- Rapidly click expand/collapse on several items
- **Expected:**
  - No lag or freeze
  - Smooth animation
  - No errors in console

**Test 5: Large hierarchy rebuild**
- Trigger cache invalidation (edit file)
- Immediately expand multiple status groups
- **Expected:**
  - Hierarchy builds in background
  - UI remains responsive
  - Cache hit on subsequent expansions

**Validation:**
- All operations feel responsive (< 200ms)
- No UI freezing
- No JavaScript errors
- Cache improves performance on repeated operations

---

### Task 8: Update Documentation Comments

**Objective:** Update JSDoc comments throughout the file to reflect hierarchy changes.

**Locations:**

1. **Class-level comment:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:7-19`
   - Update line 16: Remove "Hierarchical grouping (Epic → Feature → Story) will be added in S55"
   - Update line 14-15 to reflect hierarchy: "Status group children: Top-level planning items (epics + orphans) with hierarchical nesting"

2. **getChildren() comment:** Already updated in Task 1

3. **Any TODO comments:** Search for "S55" and remove completed references

**Example update:**
```typescript
/**
 * TreeDataProvider implementation for Cascade planning items.
 *
 * This provider scans the plans/ directory, loads planning items using
 * the frontmatter cache, and provides hierarchical tree structure to VSCode.
 *
 * Tree structure (S54 + S55):
 * - Root level: 6 status group nodes (Not Started → Completed)
 * - Status group children: Top-level items (epics + orphans)
 * - Epic children: Features under that epic
 * - Feature children: Stories/Bugs under that feature
 * - Story/Bug children: None (leaf nodes)
 *
 * Hierarchy is detected from file paths and cached per status group.
 */
```

**Validation:**
- All comments accurate and up-to-date
- No references to "will be added in S55"
- No stale TODO comments

---

### Task 9: Run Unit Tests

**Objective:** Verify all unit tests still pass with hierarchy changes.

**Location:** `vscode-extension/` directory

**Steps:**

1. **Run test suite:**
   ```bash
   cd vscode-extension
   npm test
   ```

2. **Review test results:**
   - All existing tests should pass
   - Path parsing tests (Phase 1) should pass
   - Hierarchy building tests (Phase 2) should pass (if implemented)

3. **Fix any failures:**
   - Update test expectations if behavior changed intentionally
   - Fix bugs if unexpected failures

**Validation:**
- All tests pass
- No test errors or warnings
- Test coverage acceptable

**References:**
- Test execution: VSCode Extension Testing Guide
- Existing tests: `vscode-extension/src/test/suite/`

---

### Task 10: Create Test Data for Edge Cases

**Objective:** Manually create test planning files to cover edge cases.

**Location:** `plans/test-cases/` (create if needed)

**Test Files to Create:**

1. **Orphan story:**
   ```
   plans/story-999-orphan-test.md
   ```
   - Story with no parent feature directory

2. **Orphan feature:**
   ```
   plans/feature-998-orphan-feature/feature.md
   ```
   - Feature with no parent epic directory

3. **Empty epic:**
   ```
   plans/epic-997-empty-test/epic.md
   ```
   - Epic with no child features

4. **Empty feature:**
   ```
   plans/epic-996-test/feature-996-empty/feature.md
   ```
   - Feature with no child stories

5. **Deep hierarchy:**
   ```
   plans/epic-995-deep/feature-995-nested/story-995-deep.md
   ```
   - Full Epic → Feature → Story chain

**Validation:**
- All test files created with valid frontmatter
- Test files appear in TreeView
- Hierarchy displays correctly for edge cases
- No errors or crashes

**Cleanup:**
- After testing, move to `plans/archive/` or delete

---

## Completion Criteria

- ✅ `getChildren()` method updated to use hierarchy logic
- ✅ `getTreeItem()` collapsible state reflects children (optional async optimization)
- ✅ Extension compiles without errors
- ✅ Extension packages and installs successfully
- ✅ All manual tests pass:
  - Basic hierarchy display correct
  - Expand/collapse behavior works
  - Cache behavior verified
  - Performance acceptable
- ✅ Unit tests pass
- ✅ Documentation comments updated
- ✅ Edge cases tested with test data
- ✅ No errors in VSCode Output panel (Cascade channel)
- ✅ TreeView displays hierarchy matching directory structure
- ✅ Visual indentation shows depth correctly

## Acceptance Criteria Verification

Review story acceptance criteria (S55) and verify each:

- [ ] Epic → Feature → Story/Bug hierarchy displays correctly ✅
- [ ] Items grouped by directory structure ✅
- [ ] Parent items show child count indicator (optional - may need UI enhancement)
- [ ] Expanding epic reveals child features ✅
- [ ] Expanding feature reveals child stories/bugs ✅
- [ ] Collapsing hides children ✅
- [ ] Orphan items (no parent) display at top of status group ✅
- [ ] Item ordering correct within each level ✅
- [ ] Visual indentation shows hierarchy depth ✅ (VSCode default)
- [ ] Collapsible state persists across refreshes ✅ (VSCode default)
- [ ] Performance acceptable with deep hierarchies ✅

## Next Steps

After Phase 3 completion:
- Mark S55 story as "Completed"
- Update planning file status
- Consider follow-up enhancements:
  - Show child count badges on parent items (e.g., "E4 (3)")
  - Add context menu items for hierarchy navigation
  - Implement "Expand All" / "Collapse All" commands
  - Add keyboard shortcuts for tree navigation
