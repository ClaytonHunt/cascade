---
spec: S86
phase: 1
title: Extend buildHierarchy() for Projects
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 1: Extend buildHierarchy() for Projects

## Overview

This phase extends the existing `buildHierarchy()` method to support Project nodes in the planning hierarchy. Currently, `buildHierarchy()` only handles Epic → Feature → Story/Bug relationships. We need to add Project → Epic relationships while preserving all existing functionality.

The key insight is that **Projects are detected by type, not by directory structure**. Project files live at the root of the `plans/` directory (e.g., `plans/project.md`, `plans/project-cascade.md`), not in subdirectories.

## Prerequisites

- Completed S85 (View Mode State Management)
- Understanding of existing `buildHierarchy()` logic
- Familiarity with TypeScript interfaces and Maps

## Tasks

### Task 1: Extend ItemPathParts Interface

**File**: `vscode-extension/src/treeview/HierarchyNode.ts`

**What to do**: Add `projectDir` field to `ItemPathParts` interface.

**Current Interface** (line 58-67):
```typescript
export interface ItemPathParts {
  /** Epic directory name (e.g., "epic-04-kanban-view") or null if no epic */
  epicDir: string | null;

  /** Feature directory name (e.g., "feature-16-foundation") or null if no feature */
  featureDir: string | null;

  /** File name (e.g., "epic.md", "story-49-core.md") */
  fileName: string;
}
```

**New Interface**:
```typescript
export interface ItemPathParts {
  /** Project directory name (e.g., "project-01-planning") or null if no project */
  projectDir: string | null;

  /** Epic directory name (e.g., "epic-04-kanban-view") or null if no epic */
  epicDir: string | null;

  /** Feature directory name (e.g., "feature-16-foundation") or null if no feature */
  featureDir: string | null;

  /** File name (e.g., "epic.md", "story-49-core.md") */
  fileName: string;
}
```

**Update Documentation Examples**:
Add project file example to the interface doc comment:

```typescript
/**
 * Parsed directory structure extracted from a file path.
 *
 * This interface captures the project, epic, and feature directory names
 * parsed from a planning item's file path, enabling hierarchy detection.
 *
 * Examples:
 * - Project file: `plans/project.md` or `plans/project-cascade.md`
 *   - projectDir: null (projects live at root, not in subdirectory)
 *   - epicDir: null
 *   - featureDir: null
 *   - fileName: "project.md"
 *
 * - Epic file: `plans/epic-04-kanban-view/epic.md`
 *   - projectDir: null (not in project subdirectory)
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: null
 *   - fileName: "epic.md"
 *
 * - Feature file: `plans/epic-04-kanban-view/feature-16-foundation/feature.md`
 *   - projectDir: null
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "feature.md"
 *
 * - Story file: `plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md`
 *   - projectDir: null
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "story-49-core.md"
 *
 * - Orphan story: `plans/story-19-standalone.md`
 *   - projectDir: null
 *   - epicDir: null
 *   - featureDir: null
 *   - fileName: "story-19-standalone.md"
 */
```

**Expected Outcome**:
- TypeScript interface includes `projectDir` field
- Documentation explains project detection strategy
- No breaking changes (projectDir is nullable)

**Reference**: `vscode-extension/src/treeview/HierarchyNode.ts:58-67`

---

### Task 2: Modify parseItemPath() to Detect Project Directories

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Update `parseItemPath()` method to set `projectDir` field in returned object.

**Current Behavior**: Returns `{ epicDir, featureDir, fileName }`

**New Behavior**: Returns `{ projectDir, epicDir, featureDir, fileName }`

**Important Note**: Projects are detected by **type**, not directory. Project files live at the root of `plans/` (e.g., `plans/project.md`), so `projectDir` will typically be `null`. However, we include the field for consistency and future-proofing.

**Implementation Strategy**:
```typescript
private parseItemPath(filePath: string): ItemPathParts {
  const parts = filePath.split(path.sep);

  // Initialize result
  const result: ItemPathParts = {
    projectDir: null,
    epicDir: null,
    featureDir: null,
    fileName: parts[parts.length - 1]
  };

  // Find plans/ directory index
  const plansIndex = parts.findIndex(p => p === 'plans');
  if (plansIndex === -1) {
    return result; // Not in plans/ directory
  }

  // Parse directories after plans/
  for (let i = plansIndex + 1; i < parts.length - 1; i++) {
    const dir = parts[i];

    // Check for project directory (e.g., "project-01-planning")
    if (dir.startsWith('project-')) {
      result.projectDir = dir;
    }
    // Check for epic directory (e.g., "epic-04-kanban-view")
    else if (dir.startsWith('epic-')) {
      result.epicDir = dir;
    }
    // Check for feature directory (e.g., "feature-16-foundation")
    else if (dir.startsWith('feature-')) {
      result.featureDir = dir;
    }
  }

  return result;
}
```

**Testing Examples**:
- `plans/project.md` → `{ projectDir: null, epicDir: null, featureDir: null, fileName: "project.md" }`
- `plans/epic-05/epic.md` → `{ projectDir: null, epicDir: "epic-05", featureDir: null, fileName: "epic.md" }`
- `plans/epic-05/feature-28/story-86.md` → `{ projectDir: null, epicDir: "epic-05", featureDir: "feature-28", fileName: "story-86.md" }`

**Expected Outcome**:
- `parseItemPath()` returns `projectDir` field
- Existing epic/feature detection unchanged
- No breaking changes to calling code

**Reference**: Existing `parseItemPath()` method in PlanningTreeProvider.ts

---

### Task 3: Extend buildHierarchy() to Handle Project Nodes

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Extend `buildHierarchy()` method to handle Project → Epic relationships.

**Current Structure** (line 1360-1487):
```typescript
private buildHierarchy(items: PlanningTreeItem[]): HierarchyNode[] {
  // Maps for quick lookup by directory path
  const epicMap = new Map<string, HierarchyNode>();
  const featureMap = new Map<string, HierarchyNode>();
  const storyBugItems: PlanningTreeItem[] = [];
  const orphans: HierarchyNode[] = [];

  // Step 1: Parse all items and categorize by type
  for (const item of items) {
    const pathParts = this.parseItemPath(item.filePath);
    const node: HierarchyNode = { item, children: [], parent: null };

    if (item.type === 'epic' && pathParts.epicDir) {
      epicMap.set(pathParts.epicDir, node);
    } else if (item.type === 'feature' && pathParts.featureDir) {
      // ... feature handling
    } else if (item.type === 'story' || item.type === 'bug') {
      storyBugItems.push(item);
    } else {
      orphans.push(node); // Projects currently fall here!
    }
  }

  // Step 2: Build parent-child relationships
  // ... (existing code)

  return roots;
}
```

**New Structure**:
```typescript
private buildHierarchy(items: PlanningTreeItem[]): HierarchyNode[] {
  // Maps for quick lookup
  const projectMap = new Map<string, HierarchyNode>();  // item ID → Project node (NEW)
  const epicMap = new Map<string, HierarchyNode>();
  const featureMap = new Map<string, HierarchyNode>();
  const storyBugItems: PlanningTreeItem[] = [];
  const orphans: HierarchyNode[] = [];

  // Step 1: Parse all items and categorize by type
  for (const item of items) {
    const pathParts = this.parseItemPath(item.filePath);
    const node: HierarchyNode = { item, children: [], parent: null };

    // NEW: Handle projects (detected by type, not directory)
    if (item.type === 'project') {
      // Projects are indexed by their item ID (e.g., "P1", "P2")
      // because they live at root, not in subdirectories
      projectMap.set(item.item, node);
    } else if (item.type === 'epic' && pathParts.epicDir) {
      epicMap.set(pathParts.epicDir, node);
    } else if (item.type === 'feature' && pathParts.featureDir) {
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      featureMap.set(featureKey, node);
    } else if (item.type === 'story' || item.type === 'bug') {
      storyBugItems.push(item);
    } else {
      // Specs, phases, or items without proper directory structure
      orphans.push(node);
    }
  }

  // Step 2: Build parent-child relationships
  const roots: HierarchyNode[] = [];

  // Process stories/bugs - attach to parent features (UNCHANGED)
  for (const item of storyBugItems) {
    const pathParts = this.parseItemPath(item.filePath);
    const node: HierarchyNode = { item, children: [], parent: null };

    if (pathParts.featureDir) {
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      const parentFeature = featureMap.get(featureKey);

      if (parentFeature) {
        node.parent = parentFeature;
        parentFeature.children.push(node);
      } else {
        this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent feature not found for ${item.item}: ${featureKey}`);
        orphans.push(node);
      }
    } else {
      orphans.push(node);
    }
  }

  // Process features - attach to parent epics (UNCHANGED)
  for (const [featureKey, featureNode] of featureMap) {
    const pathParts = this.parseItemPath(featureNode.item.filePath);

    if (pathParts.epicDir) {
      const parentEpic = epicMap.get(pathParts.epicDir);

      if (parentEpic) {
        featureNode.parent = parentEpic;
        parentEpic.children.push(featureNode);
      } else {
        this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent epic not found for ${featureNode.item.item}: ${pathParts.epicDir}`);
        roots.push(featureNode);
      }
    } else {
      roots.push(featureNode);
    }
  }

  // NEW: Process epics - attach to parent projects
  for (const [epicDir, epicNode] of epicMap) {
    // Check if epic has dependencies that reference a project
    // Example: Epic E1 with dependencies: ["P1"]
    const epicItem = epicNode.item;

    if (epicItem.dependencies && epicItem.dependencies.length > 0) {
      // Find first project dependency (e.g., "P1", "P2")
      const projectDep = epicItem.dependencies.find(dep => dep.startsWith('P'));

      if (projectDep) {
        const parentProject = projectMap.get(projectDep);

        if (parentProject) {
          epicNode.parent = parentProject;
          parentProject.children.push(epicNode);
          this.outputChannel.appendLine(`[Hierarchy] Attached ${epicItem.item} to project ${projectDep}`);
        } else {
          this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent project not found for ${epicItem.item}: ${projectDep}`);
          roots.push(epicNode); // Orphan epic
        }
      } else {
        // Epic has dependencies but none are projects → root-level epic
        roots.push(epicNode);
      }
    } else {
      // Epic has no dependencies → root-level epic
      roots.push(epicNode);
    }
  }

  // Add all projects as root nodes (they have no parents)
  for (const projectNode of projectMap.values()) {
    roots.push(projectNode);
  }

  // Add all orphans as root nodes (UNCHANGED)
  roots.push(...orphans);

  // Enhanced logging for debugging
  if (items.length > 0) {
    const totalItems = items.length;
    const projectCount = projectMap.size;
    const epicCount = epicMap.size;
    const featureCount = featureMap.size;
    const storyBugCount = storyBugItems.length;
    const orphanCount = orphans.length;
    const rootCount = roots.length;

    this.outputChannel.appendLine(`[Hierarchy] buildHierarchy summary:`);
    this.outputChannel.appendLine(`  - Total items: ${totalItems}`);
    this.outputChannel.appendLine(`  - Projects: ${projectCount}, Epics: ${epicCount}, Features: ${featureCount}, Stories/Bugs: ${storyBugCount}`);
    this.outputChannel.appendLine(`  - Orphans: ${orphanCount} (items without parents)`);
    this.outputChannel.appendLine(`  - Root nodes: ${rootCount}`);

    if (orphanCount > 0) {
      this.outputChannel.appendLine(`  - First orphans: ${orphans.slice(0, 5).map(n => n.item.item).join(', ')}`);
    }
  }

  // Step 3: Sort root nodes and children by item number (UNCHANGED)
  this.sortHierarchyNodes(roots);

  return roots;
}
```

**Key Changes**:
1. Add `projectMap` to store Project nodes
2. Handle `item.type === 'project'` in categorization step
3. NEW section: Process epics and attach to parent projects (via dependencies)
4. Projects use **dependency-based parent detection**, not directory structure
5. Projects always appear as root nodes
6. Enhanced logging includes project count

**Expected Outcome**:
- Projects appear in hierarchy
- Epics correctly attach to Projects (if dependency exists)
- Orphan Epics still appear at root level
- Existing Epic → Feature → Story logic unchanged

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1360-1487`

---

### Task 4: Update getChildrenForItem() to Support Project Type

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Extend conditional check to include 'project' type.

**Current Code** (line 841):
```typescript
if (item.type === 'epic' || item.type === 'feature') {
  // Parent item - return children from hierarchy
  return await this.getChildrenForItem(item);
}
```

**New Code**:
```typescript
if (item.type === 'project' || item.type === 'epic' || item.type === 'feature') {
  // Parent item - return children from hierarchy
  return await this.getChildrenForItem(item);
}
```

**Expected Outcome**:
- Projects can be expanded in TreeView
- Expanding a Project shows its child Epics
- No changes to `getChildrenForItem()` implementation needed (it already uses `buildHierarchy()`)

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:841`

---

### Task 5: Update HierarchyNode Documentation

**File**: `vscode-extension/src/treeview/HierarchyNode.ts`

**What to do**: Update `HierarchyNode` interface documentation to reflect P→E→F→S hierarchy.

**Current Documentation** (line 3-19):
```typescript
/**
 * Represents a node in the hierarchical tree structure.
 *
 * This structure captures the parent-child relationships between
 * planning items (Epic → Feature → Story/Bug) for display in TreeView.
 *
 * Each node contains:
 * - item: The actual planning item data
 * - children: Child nodes in the hierarchy (features under epic, stories under feature)
 * - parent: Reference to parent node (null for root/orphan items)
 *
 * Examples:
 * - Epic node: children = [Feature nodes], parent = null
 * - Feature node: children = [Story nodes], parent = Epic node
 * - Story node: children = [], parent = Feature node
 * - Orphan Story: children = [], parent = null
 */
```

**New Documentation**:
```typescript
/**
 * Represents a node in the hierarchical tree structure.
 *
 * This structure captures the parent-child relationships between
 * planning items (Project → Epic → Feature → Story/Bug) for display in TreeView.
 *
 * Each node contains:
 * - item: The actual planning item data
 * - children: Child nodes in the hierarchy
 * - parent: Reference to parent node (null for root/orphan items)
 *
 * Examples:
 * - Project node: children = [Epic nodes], parent = null
 * - Epic node: children = [Feature nodes], parent = Project node (or null if orphan)
 * - Feature node: children = [Story/Bug nodes], parent = Epic node (or null if orphan)
 * - Story/Bug node: children = [], parent = Feature node (or null if orphan)
 * - Orphan Epic: children = [Feature nodes], parent = null (no parent project)
 * - Orphan Story: children = [], parent = null (no parent feature)
 */
```

**Expected Outcome**:
- Documentation accurately describes P→E→F→S hierarchy
- Examples include Project nodes
- Orphan cases clearly explained

**Reference**: `vscode-extension/src/treeview/HierarchyNode.ts:3-19`

---

## Completion Criteria

- ✅ `ItemPathParts` interface includes `projectDir` field
- ✅ `parseItemPath()` returns `projectDir` (typically null for projects at root)
- ✅ `buildHierarchy()` handles Project nodes
- ✅ Projects indexed by item ID (e.g., "P1")
- ✅ Epics attach to Projects via dependency references
- ✅ `getChildrenForItem()` supports 'project' type
- ✅ Documentation updated for P→E→F→S hierarchy
- ✅ Logging shows project counts
- ✅ No breaking changes to existing Epic→Feature→Story logic

## Testing Strategy

**Manual Verification**:
1. Read `plans/project.md` frontmatter
2. Verify item type is 'project'
3. Check epic dependencies reference projects (e.g., E1 → P1)
4. Run buildHierarchy() on test data
5. Verify Projects appear in returned roots
6. Verify Epics with project dependencies attach correctly

**Unit Tests** (to be added in Phase 3):
- Test `parseItemPath()` with project file paths
- Test `buildHierarchy()` with project items
- Test orphan epic handling
- Test project-epic attachment via dependencies

## Next Phase

Proceed to **Phase 2: Implement getHierarchyRoot() and Routing** after completing all tasks in this phase.

**File**: `tasks/02-implement-hierarchy-root.md`
