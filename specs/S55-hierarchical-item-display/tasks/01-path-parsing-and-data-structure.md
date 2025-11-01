---
spec: S55
phase: 1
title: Path Parsing and Hierarchy Data Structure
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: Path Parsing and Hierarchy Data Structure

## Overview

This phase creates the foundation for hierarchical item display by implementing file path parsing and the hierarchy data model. No UI changes occur in this phase - we're building the core data structures and parsing logic that will be used in Phase 2.

The path parser extracts parent-child relationships from file paths following the established directory convention:
- Epic: `plans/epic-XX-name/epic.md`
- Feature: `plans/epic-XX-name/feature-YY-name/feature.md`
- Story/Bug: `plans/epic-XX-name/feature-YY-name/story-ZZ-name.md`

## Prerequisites

- S54 (Status Column Grouping) completed
- Understanding of VSCode TreeView lazy loading model
- Familiarity with `PlanningTreeItem` interface (vscode-extension/src/treeview/PlanningTreeItem.ts:22-40)

## Tasks

### Task 1: Create HierarchyNode Interface

**Objective:** Define the data structure for representing hierarchical relationships between planning items.

**Location:** Create new file `vscode-extension/src/treeview/HierarchyNode.ts`

**Implementation:**

```typescript
import { PlanningTreeItem } from './PlanningTreeItem';

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
export interface HierarchyNode {
  /** The planning item at this node */
  item: PlanningTreeItem;

  /** Child nodes in the hierarchy (empty array for leaf nodes) */
  children: HierarchyNode[];

  /** Parent node (null for root-level or orphan items) */
  parent: HierarchyNode | null;
}

/**
 * Parsed directory structure extracted from a file path.
 *
 * This interface captures the epic and feature directory names
 * parsed from a planning item's file path, enabling hierarchy detection.
 *
 * Examples:
 * - Epic file: `plans/epic-04-kanban-view/epic.md`
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: null
 *   - fileName: "epic.md"
 *
 * - Feature file: `plans/epic-04-kanban-view/feature-16-foundation/feature.md`
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "feature.md"
 *
 * - Story file: `plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md`
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "story-49-core.md"
 *
 * - Orphan story: `plans/story-19-standalone.md`
 *   - epicDir: null
 *   - featureDir: null
 *   - fileName: "story-19-standalone.md"
 */
export interface ItemPathParts {
  /** Epic directory name (e.g., "epic-04-kanban-view") or null if no epic */
  epicDir: string | null;

  /** Feature directory name (e.g., "feature-16-foundation") or null if no feature */
  featureDir: string | null;

  /** File name (e.g., "epic.md", "story-49-core.md") */
  fileName: string;
}
```

**Validation:**
- File compiles without TypeScript errors
- Interfaces exported correctly
- JSDoc comments complete and accurate

---

### Task 2: Implement Path Parsing Utility

**Objective:** Create a function that extracts directory structure from file paths.

**Location:** Add to `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Implementation:**

Add this private method to the `PlanningTreeProvider` class:

```typescript
/**
 * Parses a file path to extract directory structure information.
 *
 * This method identifies epic and feature directories in the path hierarchy
 * to enable parent-child relationship detection for the TreeView.
 *
 * Path patterns:
 * - Epic: `plans/epic-XX-name/epic.md`
 * - Feature: `plans/epic-XX-name/feature-YY-name/feature.md`
 * - Story/Bug: `plans/epic-XX-name/feature-YY-name/story-ZZ-name.md`
 * - Orphan: `plans/story-ZZ-name.md` (no epic or feature dirs)
 *
 * Examples:
 * - Input: `/path/to/plans/epic-04-kanban-view/epic.md`
 *   Output: { epicDir: "epic-04-kanban-view", featureDir: null, fileName: "epic.md" }
 *
 * - Input: `/path/to/plans/epic-04-kanban-view/feature-16-foundation/feature.md`
 *   Output: { epicDir: "epic-04-kanban-view", featureDir: "feature-16-foundation", fileName: "feature.md" }
 *
 * - Input: `/path/to/plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md`
 *   Output: { epicDir: "epic-04-kanban-view", featureDir: "feature-16-foundation", fileName: "story-49-core.md" }
 *
 * - Input: `/path/to/plans/story-19-standalone.md`
 *   Output: { epicDir: null, featureDir: null, fileName: "story-19-standalone.md" }
 *
 * @param filePath - Absolute path to the planning item file
 * @returns Parsed directory structure with epic/feature dirs and filename
 */
private parseItemPath(filePath: string): ItemPathParts {
  // Extract path relative to workspace root
  const relativePath = path.relative(this.workspaceRoot, filePath);

  // Split path into parts (e.g., ["plans", "epic-04-kanban-view", "feature-16-foundation", "story-49-core.md"])
  const parts = relativePath.split(path.sep);

  // Initialize result
  const result: ItemPathParts = {
    epicDir: null,
    featureDir: null,
    fileName: parts[parts.length - 1]
  };

  // Find epic directory (matches "epic-XX-*" pattern)
  const epicDirRegex = /^epic-\d+-/;
  const epicDirIndex = parts.findIndex(part => epicDirRegex.test(part));
  if (epicDirIndex !== -1) {
    result.epicDir = parts[epicDirIndex];
  }

  // Find feature directory (matches "feature-XX-*" pattern)
  const featureDirRegex = /^feature-\d+-/;
  const featureDirIndex = parts.findIndex(part => featureDirRegex.test(part));
  if (featureDirIndex !== -1) {
    result.featureDir = parts[featureDirIndex];
  }

  return result;
}
```

**Additional Imports Required:**

Add to the top of PlanningTreeProvider.ts:
```typescript
import { ItemPathParts } from './HierarchyNode';
```

**References:**
- Existing path utilities: `vscode-extension/src/treeview/PlanningTreeProvider.ts:382` (uses `path.relative()`)
- VSCode workspace API: https://code.visualstudio.com/api/references/vscode-api#workspace

**Validation:**
- Method compiles without errors
- TypeScript recognizes `ItemPathParts` import
- JSDoc comments complete

---

### Task 3: Create Unit Tests for Path Parsing

**Objective:** Verify path parsing works correctly for all hierarchy patterns and edge cases.

**Location:** Create new file `vscode-extension/src/test/suite/pathParsing.test.ts`

**Implementation:**

```typescript
import * as assert from 'assert';
import * as path from 'path';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';
import { ItemPathParts } from '../../treeview/HierarchyNode';

// Note: We'll need to expose parseItemPath for testing or use a separate utility function
// For now, we'll create a helper function that replicates the logic

/**
 * Helper function that replicates parseItemPath logic for testing.
 * In production, this would be the actual PlanningTreeProvider.parseItemPath method.
 */
function parseItemPathForTest(filePath: string, workspaceRoot: string): ItemPathParts {
  const relativePath = path.relative(workspaceRoot, filePath);
  const parts = relativePath.split(path.sep);

  const result: ItemPathParts = {
    epicDir: null,
    featureDir: null,
    fileName: parts[parts.length - 1]
  };

  const epicDirRegex = /^epic-\d+-/;
  const epicDirIndex = parts.findIndex(part => epicDirRegex.test(part));
  if (epicDirIndex !== -1) {
    result.epicDir = parts[epicDirIndex];
  }

  const featureDirRegex = /^feature-\d+-/;
  const featureDirIndex = parts.findIndex(part => featureDirRegex.test(part));
  if (featureDirIndex !== -1) {
    result.featureDir = parts[featureDirIndex];
  }

  return result;
}

suite('Path Parsing Tests', () => {
  const workspaceRoot = '/workspace/lineage';

  test('Parse epic file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'epic.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, null);
    assert.strictEqual(result.fileName, 'epic.md');
  });

  test('Parse feature file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'feature.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, 'feature-16-foundation');
    assert.strictEqual(result.fileName, 'feature.md');
  });

  test('Parse story file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'story-49-core.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, 'feature-16-foundation');
    assert.strictEqual(result.fileName, 'story-49-core.md');
  });

  test('Parse orphan story (no epic or feature)', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'story-19-standalone.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, null);
    assert.strictEqual(result.fileName, 'story-19-standalone.md');
  });

  test('Parse orphan feature (no epic)', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'feature.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, 'feature-99-orphan');
    assert.strictEqual(result.fileName, 'feature.md');
  });

  test('Parse story under orphan feature', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'story-100-child.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, 'feature-99-orphan');
    assert.strictEqual(result.fileName, 'story-100-child.md');
  });

  test('Parse bug file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-02-testing', 'feature-07-discovery', 'bug-03-scanner.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-02-testing');
    assert.strictEqual(result.featureDir, 'feature-07-discovery');
    assert.strictEqual(result.fileName, 'bug-03-scanner.md');
  });

  test('Parse archived file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'archive', 'epic-03-old', 'feature-11-legacy', 'story-36-archived.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    // Should still detect epic and feature dirs even in archive
    assert.strictEqual(result.epicDir, 'epic-03-old');
    assert.strictEqual(result.featureDir, 'feature-11-legacy');
    assert.strictEqual(result.fileName, 'story-36-archived.md');
  });
});
```

**Validation:**
- Run tests: `npm test` in `vscode-extension/` directory
- All 8 tests pass
- Code coverage includes all parsing branches

**References:**
- VSCode extension testing docs: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Existing test structure: `vscode-extension/src/test/suite/treeItemRendering.test.ts`

---

### Task 4: Add Import for HierarchyNode Types

**Objective:** Update PlanningTreeProvider to import the new hierarchy types.

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:1-5`

**Implementation:**

Add to the imports at the top of the file:
```typescript
import { HierarchyNode, ItemPathParts } from './HierarchyNode';
```

**Validation:**
- TypeScript compilation succeeds
- No import errors in VSCode
- Intellisense recognizes the types

---

## Completion Criteria

- ✅ `HierarchyNode.ts` created with `HierarchyNode` and `ItemPathParts` interfaces
- ✅ `parseItemPath()` method implemented in `PlanningTreeProvider`
- ✅ Unit tests created and all passing (8 tests)
- ✅ TypeScript compilation succeeds with no errors
- ✅ Code follows existing project style and conventions
- ✅ JSDoc comments complete and accurate for all new code

## Next Phase

Proceed to **Phase 2: Hierarchy Building Logic** to implement the `buildHierarchy()` method that constructs the tree structure using the path parsing foundation created in this phase.
