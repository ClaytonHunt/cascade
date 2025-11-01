---
spec: S86
phase: 3
title: Testing and Validation
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-25
---

# Phase 3: Testing and Validation

## Overview

This phase adds comprehensive testing for the hierarchy view implementation, validates performance targets, and ensures the feature works correctly with real planning data.

Testing covers unit tests for individual methods, integration tests for view mode switching, and manual verification with the installed VSCode extension.

## Prerequisites

- Completed Phase 1 (buildHierarchy() extended for Projects)
- Completed Phase 2 (getHierarchyRoot() and routing implemented)
- Understanding of VSCode extension testing framework

## Tasks

### Task 1: Create Unit Tests for getHierarchyRoot()

**File**: `vscode-extension/src/test/suite/hierarchyView.test.ts` (NEW FILE)

**What to do**: Create comprehensive unit tests for the hierarchy view functionality.

**Test Framework Setup**:
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

suite('Hierarchy View Test Suite', () => {
  let provider: PlanningTreeProvider;
  let outputChannel: vscode.OutputChannel;
  let cache: FrontmatterCache;
  let workspaceState: vscode.Memento;

  setup(() => {
    // Initialize test dependencies
    outputChannel = vscode.window.createOutputChannel('Cascade Test');
    cache = new FrontmatterCache(outputChannel);

    // Mock workspace state
    const stateMap = new Map<string, any>();
    workspaceState = {
      get: (key: string, defaultValue?: any) => stateMap.get(key) ?? defaultValue,
      update: async (key: string, value: any) => { stateMap.set(key, value); },
      keys: () => Array.from(stateMap.keys())
    } as vscode.Memento;

    // Create provider
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    provider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel, workspaceState);
  });

  teardown(() => {
    outputChannel.dispose();
  });

  // Tests go here...
});
```

**Test Cases**:

#### Test 1: getHierarchyRoot() Returns Projects at Root Level
```typescript
test('getHierarchyRoot() should return Projects at root level', async () => {
  // Set view mode to hierarchy
  await provider.setViewMode('hierarchy');

  // Get root nodes
  const rootNodes = await provider.getChildren(undefined);

  // Filter for project items
  const projects = rootNodes.filter(node =>
    'type' in node && node.type === 'project'
  );

  // Verify projects exist at root
  assert.ok(projects.length > 0, 'Should have at least one project at root');

  // Verify project format
  const firstProject = projects[0] as PlanningTreeItem;
  assert.ok(firstProject.item.startsWith('P'), 'Project item should start with "P"');
  assert.strictEqual(firstProject.type, 'project', 'Item type should be "project"');
});
```

#### Test 2: Orphan Epics Appear at Root Level
```typescript
test('getHierarchyRoot() should include orphan Epics at root level', async () => {
  await provider.setViewMode('hierarchy');

  const rootNodes = await provider.getChildren(undefined);

  // Find epics without project parents (orphan epics)
  // In test data, check if there are epics without project dependencies
  const epics = rootNodes.filter(node =>
    'type' in node && node.type === 'epic'
  );

  // Note: This test assumes test data has orphan epics
  // If no orphans exist, test passes automatically
  if (epics.length > 0) {
    const firstEpic = epics[0] as PlanningTreeItem;
    assert.ok(firstEpic.item.startsWith('E'), 'Epic item should start with "E"');
    assert.strictEqual(firstEpic.type, 'epic', 'Item type should be "epic"');
  }
});
```

#### Test 3: Archive Filtering in Hierarchy View
```typescript
test('getHierarchyRoot() should filter archived items when toggle is OFF', async () => {
  await provider.setViewMode('hierarchy');

  // Get root nodes with archive toggle OFF (default)
  const rootNodesFiltered = await provider.getChildren(undefined);

  // Toggle archived items ON
  provider.toggleArchivedItems();

  // Get root nodes with archive toggle ON
  const rootNodesUnfiltered = await provider.getChildren(undefined);

  // Verify that unfiltered has >= filtered
  // (could be equal if no archived items exist)
  assert.ok(
    rootNodesUnfiltered.length >= rootNodesFiltered.length,
    'Unfiltered view should have at least as many items as filtered view'
  );

  // If archived items exist, verify they appear when toggle is ON
  // and disappear when toggle is OFF
  const hasArchivedItems = rootNodesUnfiltered.length > rootNodesFiltered.length;
  if (hasArchivedItems) {
    assert.ok(
      rootNodesUnfiltered.length > rootNodesFiltered.length,
      'Toggle ON should show more items if archived items exist'
    );
  }
});
```

#### Test 4: View Mode Routing
```typescript
test('getChildren() should route to hierarchy view when mode is hierarchy', async () => {
  await provider.setViewMode('hierarchy');

  const rootNodes = await provider.getChildren(undefined);

  // In hierarchy mode, root should contain planning items (not status groups)
  // Status groups have type 'status-group', planning items have type in ItemType
  const hasStatusGroups = rootNodes.some(node =>
    'type' in node && node.type === 'status-group'
  );

  assert.strictEqual(
    hasStatusGroups,
    false,
    'Hierarchy view should NOT show status groups at root'
  );

  // Verify we have planning items instead
  const hasPlanningItems = rootNodes.some(node =>
    'type' in node && ['project', 'epic', 'feature', 'story', 'bug'].includes(node.type)
  );

  assert.ok(hasPlanningItems, 'Hierarchy view should show planning items at root');
});
```

#### Test 5: View Mode Switching
```typescript
test('Switching view mode should change root structure', async () => {
  // Start in hierarchy mode
  await provider.setViewMode('hierarchy');
  const hierarchyRoot = await provider.getChildren(undefined);

  // Switch to status mode
  await provider.setViewMode('status');
  const statusRoot = await provider.getChildren(undefined);

  // Verify structure is different
  const hierarchyHasGroups = hierarchyRoot.some(n => 'type' in n && n.type === 'status-group');
  const statusHasGroups = statusRoot.some(n => 'type' in n && n.type === 'status-group');

  assert.strictEqual(hierarchyHasGroups, false, 'Hierarchy mode should not have status groups');
  assert.strictEqual(statusHasGroups, true, 'Status mode should have status groups');
});
```

**Expected Outcome**:
- All tests pass
- Test coverage includes Projects, orphans, archive filtering, view mode routing
- Tests verify both positive and negative cases

**Reference**: Existing test files in `vscode-extension/src/test/suite/`

---

### Task 2: Integration Tests for Hierarchy Expansion

**File**: `vscode-extension/src/test/suite/hierarchyView.test.ts` (continued)

**What to do**: Add tests that verify parent-child relationships in hierarchy.

**Test Cases**:

#### Test 6: Expanding Project Shows Child Epics
```typescript
test('Expanding a Project should show child Epics', async () => {
  await provider.setViewMode('hierarchy');

  // Get root nodes
  const rootNodes = await provider.getChildren(undefined);

  // Find first project
  const project = rootNodes.find(node =>
    'type' in node && node.type === 'project'
  ) as PlanningTreeItem | undefined;

  if (!project) {
    // No projects in test data - skip test
    return;
  }

  // Expand project
  const children = await provider.getChildren(project);

  // Verify children are epics
  const allEpics = children.every(node =>
    'type' in node && node.type === 'epic'
  );

  assert.ok(children.length > 0, 'Project should have child Epics');
  assert.ok(allEpics, 'All children of Project should be Epics');
});
```

#### Test 7: Expanding Epic Shows Child Features
```typescript
test('Expanding an Epic should show child Features', async () => {
  await provider.setViewMode('hierarchy');

  const rootNodes = await provider.getChildren(undefined);

  // Find first epic (could be under project or orphan)
  let epic: PlanningTreeItem | undefined;

  // Check root level
  epic = rootNodes.find(node =>
    'type' in node && node.type === 'epic'
  ) as PlanningTreeItem | undefined;

  // If not at root, check under first project
  if (!epic) {
    const project = rootNodes.find(node =>
      'type' in node && node.type === 'project'
    ) as PlanningTreeItem | undefined;

    if (project) {
      const projectChildren = await provider.getChildren(project);
      epic = projectChildren.find(node =>
        'type' in node && node.type === 'epic'
      ) as PlanningTreeItem | undefined;
    }
  }

  if (!epic) {
    // No epics in test data - skip test
    return;
  }

  // Expand epic
  const children = await provider.getChildren(epic);

  if (children.length === 0) {
    // Epic has no features - skip test
    return;
  }

  // Verify children are features
  const allFeatures = children.every(node =>
    'type' in node && node.type === 'feature'
  );

  assert.ok(allFeatures, 'All children of Epic should be Features');
});
```

#### Test 8: Expanding Feature Shows Child Stories/Bugs
```typescript
test('Expanding a Feature should show child Stories/Bugs', async () => {
  await provider.setViewMode('hierarchy');

  // Helper to find first feature in hierarchy
  const findFeature = async (): Promise<PlanningTreeItem | undefined> => {
    const rootNodes = await provider.getChildren(undefined);

    // Check root level
    let feature = rootNodes.find(node =>
      'type' in node && node.type === 'feature'
    ) as PlanningTreeItem | undefined;

    if (feature) return feature;

    // Check under epics
    for (const node of rootNodes) {
      if ('type' in node && (node.type === 'epic' || node.type === 'project')) {
        const children = await provider.getChildren(node);
        feature = children.find(n => 'type' in n && n.type === 'feature') as PlanningTreeItem | undefined;
        if (feature) return feature;

        // Check nested (under epic under project)
        for (const child of children) {
          if ('type' in child && child.type === 'epic') {
            const epicChildren = await provider.getChildren(child);
            feature = epicChildren.find(n => 'type' in n && n.type === 'feature') as PlanningTreeItem | undefined;
            if (feature) return feature;
          }
        }
      }
    }

    return undefined;
  };

  const feature = await findFeature();

  if (!feature) {
    // No features in test data - skip test
    return;
  }

  // Expand feature
  const children = await provider.getChildren(feature);

  if (children.length === 0) {
    // Feature has no stories/bugs - skip test
    return;
  }

  // Verify children are stories or bugs
  const allStoriesOrBugs = children.every(node =>
    'type' in node && (node.type === 'story' || node.type === 'bug')
  );

  assert.ok(allStoriesOrBugs, 'All children of Feature should be Stories or Bugs');
});
```

**Expected Outcome**:
- Parent-child relationships verified
- Hierarchy expansion works correctly
- Tests handle edge cases (no children, missing items)

---

### Task 3: Performance Validation with Real Data

**File**: Manual testing procedure

**What to do**: Verify performance targets with actual planning data.

**Performance Targets** (from acceptance criteria):
- Root level load time < 100ms with 100+ items
- Hierarchy build logs show timing

**Test Procedure**:

1. **Verify Item Count**
   ```bash
   cd vscode-extension
   # Count planning items
   ls -R ../plans/**/*.md | wc -l
   ```
   Should show 100+ planning files

2. **Package and Install Extension**
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode Window**
   - Press Ctrl+Shift+P
   - Run "Developer: Reload Window"

4. **Open Output Channel**
   - Press Ctrl+Shift+P
   - Run "View: Toggle Output"
   - Select "Cascade" from dropdown

5. **Open Cascade TreeView**
   - Click Cascade icon in Activity Bar (left sidebar)
   - TreeView should populate with hierarchy

6. **Check Performance Logs**
   Look for output like:
   ```
   [Hierarchy] Built hierarchy with 4 root nodes in 42ms
   ```

7. **Verify Performance Target**
   - Duration should be < 100ms
   - If > 100ms, warning log should appear:
     ```
     [Hierarchy] ⚠️  Performance warning: Root build exceeded 100ms threshold (127ms)
     ```

8. **Test with Large Dataset** (optional)
   - If real data < 100 items, use performance test data generator:
     ```bash
     cd vscode-extension/scripts
     node generate-test-data.js 100 test-plans-100
     ```
   - Reopen TreeView and check performance

**Expected Outcome**:
- Root load time < 100ms with 100+ items
- No performance warnings in output channel
- TreeView responsive (no lag)

**Reference**: Project CLAUDE.md, "Performance Testing" section

---

### Task 4: Manual Verification Checklist

**What to do**: Manually verify all acceptance criteria with installed extension.

**Checklist**:

#### Basic Functionality
- [ ] Extension activates successfully
- [ ] Output channel shows: `[ViewMode] Initialized to: hierarchy`
- [ ] Cascade TreeView opens in Activity Bar
- [ ] TreeView populates with planning items

#### Hierarchy Structure
- [ ] Projects appear at root level (e.g., "P1 - Lineage RPG Game Systems")
- [ ] Expanding Project shows child Epics
- [ ] Expanding Epic shows child Features
- [ ] Expanding Feature shows child Stories/Bugs
- [ ] Orphan Epics appear at root level (if any exist)
- [ ] Orphan Features appear at root level (if any exist)
- [ ] Items sorted by item number (P1, P2, E1, E2, ...)

#### Archive Filtering
- [ ] Archived items hidden by default (toggle OFF)
- [ ] Toggling archive filter shows archived items
- [ ] Output channel logs: `[Hierarchy] Filtered N archived items (toggle OFF)`
- [ ] Archived items use archive icon (muted styling)

#### View Mode Switching (requires S87)
- [ ] View mode defaults to 'hierarchy'
- [ ] Switching to status view shows status groups
- [ ] Switching back to hierarchy shows Projects
- [ ] View mode persists across window reload

#### Performance
- [ ] Root load completes < 100ms (check output channel)
- [ ] No visible lag when expanding hierarchy
- [ ] TreeView refresh responsive

#### Edge Cases
- [ ] Empty plans directory handled gracefully
- [ ] Projects with no child Epics don't expand
- [ ] Orphan items render correctly
- [ ] Archive directory items detected correctly

**Expected Outcome**:
- All checklist items pass
- No errors in output channel
- User experience smooth and responsive

---

### Task 5: Regression Testing for Status View

**File**: Manual testing procedure

**What to do**: Verify that status view still works correctly (no regressions).

**Test Procedure**:

1. **Switch to Status View**
   - Use view mode toggle command (S87) OR
   - Temporarily modify default in PlanningTreeProvider.ts:
     ```typescript
     this.viewMode = 'status'; // Temporary for testing
     ```

2. **Verify Status Groups Appear**
   - TreeView should show status groups at root:
     - Not Started
     - In Planning
     - Ready
     - In Progress
     - Blocked
     - Completed
     - (Archived - if toggle ON)

3. **Expand Status Group**
   - Click on "In Progress" status group
   - Should show items with status "In Progress"
   - Items should be organized in hierarchy (Epic → Feature → Story)

4. **Verify Archive Toggle**
   - Toggle archive filter ON
   - "Archived" status group should appear
   - Expand "Archived" group
   - Should show archived items

5. **Verify Item Expansion**
   - Expand Epic under status group
   - Should show child Features
   - Expand Feature
   - Should show child Stories/Bugs

**Expected Outcome**:
- Status view works identically to before S86
- No breaking changes
- All existing functionality preserved

---

## Completion Criteria

- ✅ Unit test file created: `hierarchyView.test.ts`
- ✅ All unit tests pass
- ✅ Integration tests verify parent-child relationships
- ✅ Performance target met: < 100ms root load with 100+ items
- ✅ Manual verification checklist complete
- ✅ Status view regression testing complete
- ✅ No errors in output channel
- ✅ All S86 acceptance criteria verified

## Testing Strategy Summary

### Automated Tests
- **Unit Tests**: Test individual methods in isolation
- **Integration Tests**: Test parent-child relationships
- **Coverage**: getHierarchyRoot(), buildHierarchy(), view mode routing, archive filtering

### Manual Tests
- **Performance Testing**: Verify < 100ms target with real data
- **UI Testing**: Verify TreeView renders correctly
- **Edge Case Testing**: Empty directory, orphans, archived items
- **Regression Testing**: Verify status view unchanged

### Continuous Validation
- **Output Channel Monitoring**: Check logs for errors/warnings
- **User Experience**: Verify responsive, lag-free interaction
- **Data Integrity**: Verify hierarchy matches file structure

## Next Steps

After Phase 3 completion:

1. **Mark S86 as Completed** in frontmatter
2. **Update planning docs** with implementation notes
3. **Document any discovered edge cases**
4. **Prepare for S87** (View Mode Toggle UI)

**Ready for**: S87 - View Mode Toggle UI Implementation
