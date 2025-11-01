---
spec: S49
phase: 2
title: Implement PlanningTreeProvider Class
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Implement PlanningTreeProvider Class

## Overview

Implement the core `PlanningTreeProvider` class that implements VSCode's `TreeDataProvider` interface. This class scans the plans/ directory, loads planning items via the frontmatter cache, and provides data to the TreeView for display.

## Prerequisites

- Phase 1 completed (PlanningTreeItem interface created)
- Understanding of VSCode TreeDataProvider interface
- Understanding of EventEmitter pattern for tree updates
- Familiarity with FrontmatterCache API (`cache.get()`)

## Tasks

### Task 1: Create PlanningTreeProvider.ts File with Class Skeleton

**Action:**
Create file with class structure, constructor, and private fields.

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Code:**
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeItem } from './PlanningTreeItem';
import { FrontmatterCache } from '../cache';

/**
 * TreeDataProvider implementation for Cascade planning items.
 *
 * This provider scans the plans/ directory, loads planning items using
 * the frontmatter cache, and provides tree structure data to VSCode.
 *
 * Current implementation returns a flat list of all items. Hierarchical
 * grouping (Epic → Feature → Story) will be added in F17.
 */
export class PlanningTreeProvider implements vscode.TreeDataProvider<PlanningTreeItem> {
  /**
   * Event emitter for tree data changes.
   * Fires when refresh() is called to notify VSCode to reload tree.
   */
  private _onDidChangeTreeData = new vscode.EventEmitter<PlanningTreeItem | undefined>();

  /**
   * Event that VSCode subscribes to for tree updates.
   */
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   * Creates a new PlanningTreeProvider.
   *
   * @param workspaceRoot - Absolute path to workspace root directory
   * @param cache - FrontmatterCache instance for parsing files
   * @param outputChannel - Output channel for logging
   */
  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Refreshes the tree view by firing change event.
   * Causes VSCode to call getChildren() again to reload data.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Converts PlanningTreeItem to VSCode TreeItem for display.
   *
   * @param element - The planning item to convert
   * @returns VSCode TreeItem with label, icon, and collapsible state
   */
  getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
    // TODO: Implement in Task 2
    throw new Error('Not implemented');
  }

  /**
   * Returns child elements for the tree.
   *
   * @param element - Parent element (undefined for root)
   * @returns Array of child planning items
   */
  async getChildren(element?: PlanningTreeItem): Promise<PlanningTreeItem[]> {
    // TODO: Implement in Task 3
    throw new Error('Not implemented');
  }
}
```

**References:**
- TreeDataProvider interface: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- EventEmitter pattern: https://code.visualstudio.com/api/references/vscode-api#EventEmitter
- FrontmatterCache: `vscode-extension/src/cache.ts:88-255`

**Validation:**
- File created at `vscode-extension/src/treeview/PlanningTreeProvider.ts`
- Class implements `vscode.TreeDataProvider<PlanningTreeItem>`
- Constructor accepts 3 parameters with correct types
- EventEmitter declared and exposed via readonly property

---

### Task 2: Implement getTreeItem() Method

**Action:**
Convert PlanningTreeItem to vscode.TreeItem with proper formatting.

**Code to Add:**
Replace the `getTreeItem()` method with this implementation:

```typescript
  /**
   * Converts PlanningTreeItem to VSCode TreeItem for display.
   *
   * @param element - The planning item to convert
   * @returns VSCode TreeItem with label, icon, and collapsible state
   */
  getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
    // Format label: "[item] - [title]"
    // Examples: "E4 - Planning Kanban View", "S49 - TreeDataProvider Core Implementation"
    const label = `${element.item} - ${element.title}`;

    // Determine collapsible state based on item type
    // Epic/Feature: Collapsed (prepare for F17 hierarchy)
    // Story/Bug: None (leaf nodes)
    let collapsibleState = vscode.TreeItemCollapsibleState.None;
    if (element.type === 'epic' || element.type === 'feature') {
      collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }

    // Create TreeItem
    const treeItem = new vscode.TreeItem(label, collapsibleState);

    // Set resourceUri for file association (enables icons, click handling)
    treeItem.resourceUri = vscode.Uri.file(element.filePath);

    // Set tooltip (shows on hover)
    treeItem.tooltip = `${element.item}: ${element.title}\nStatus: ${element.status}\nPriority: ${element.priority}`;

    // Set description (shows after label, dimmed)
    treeItem.description = element.status;

    return treeItem;
  }
```

**References:**
- TreeItem: https://code.visualstudio.com/api/references/vscode-api#TreeItem
- TreeItemCollapsibleState: https://code.visualstudio.com/api/references/vscode-api#TreeItemCollapsibleState

**Validation:**
- Method returns vscode.TreeItem
- Label format matches "[item] - [title]"
- Collapsible state set correctly for each type
- ResourceUri set to file path

---

### Task 3: Implement getChildren() Method - File Discovery

**Action:**
Add file scanning logic using vscode.workspace.findFiles().

**Code to Add:**
Replace the `getChildren()` method with this implementation:

```typescript
  /**
   * Returns child elements for the tree.
   *
   * For flat tree (S49), this always returns root-level items.
   * Hierarchy (Epic → Feature → Story) will be added in F17.
   *
   * @param element - Parent element (undefined for root)
   * @returns Array of child planning items
   */
  async getChildren(element?: PlanningTreeItem): Promise<PlanningTreeItem[]> {
    // Flat tree: ignore element parameter, always return root items
    if (element) {
      return [];
    }

    try {
      // Scan plans/ directory for all .md files recursively
      const plansPath = path.join(this.workspaceRoot, 'plans');
      const pattern = new vscode.RelativePattern(plansPath, '**/*.md');

      // Find all markdown files
      const files = await vscode.workspace.findFiles(pattern);

      this.outputChannel.appendLine(`[TreeView] Found ${files.length} markdown files in plans/`);

      // Load and parse each file
      const items: PlanningTreeItem[] = [];

      for (const fileUri of files) {
        const filePath = fileUri.fsPath;

        // Parse frontmatter using cache
        const frontmatter = await this.cache.get(filePath);

        if (frontmatter) {
          // Convert Frontmatter to PlanningTreeItem
          const item: PlanningTreeItem = {
            item: frontmatter.item,
            title: frontmatter.title,
            type: frontmatter.type,
            status: frontmatter.status,
            priority: frontmatter.priority,
            filePath: filePath
          };

          items.push(item);
        } else {
          // Parse failed - log warning and skip file
          const relativePath = path.relative(this.workspaceRoot, filePath);
          this.outputChannel.appendLine(`[TreeView] ⚠️  Skipping file with invalid frontmatter: ${relativePath}`);
        }
      }

      // Sort items by item number
      items.sort((a, b) => this.compareItemNumbers(a.item, b.item));

      this.outputChannel.appendLine(`[TreeView] Loaded ${items.length} planning items`);

      return items;

    } catch (error) {
      this.outputChannel.appendLine(`[TreeView] ❌ Error loading planning items: ${error}`);
      return [];
    }
  }
```

**References:**
- workspace.findFiles(): https://code.visualstudio.com/api/references/vscode-api#workspace.findFiles
- RelativePattern: https://code.visualstudio.com/api/references/vscode-api#RelativePattern
- FrontmatterCache.get(): `vscode-extension/src/cache.ts:134-177`

**Validation:**
- Method uses workspace.findFiles() for file discovery
- Each file parsed via cache.get()
- Invalid files skipped with warning logged
- Items returned as array

---

### Task 4: Add Item Number Sorting Helper Method

**Action:**
Add private method to sort items by number (P1, E1, E2, F1, S1, etc.).

**Code to Add:**
Add this method to the class (before or after existing methods):

```typescript
  /**
   * Compares two item numbers for sorting.
   *
   * Sorts by:
   * 1. Item type prefix (P, E, F, S, B)
   * 2. Item number (numeric comparison)
   *
   * Examples:
   * - P1 < E1 (Project before Epic)
   * - E1 < E2 (Lower number first)
   * - E2 < F1 (Epic before Feature)
   * - F5 < S1 (Feature before Story)
   * - S10 < B1 (Story before Bug)
   *
   * @param a - First item number
   * @param b - Second item number
   * @returns Negative if a < b, positive if a > b, zero if equal
   */
  private compareItemNumbers(a: string, b: string): number {
    // Extract prefix (P, E, F, S, B) and number
    const prefixA = a[0];
    const prefixB = b[0];
    const numberA = parseInt(a.substring(1), 10);
    const numberB = parseInt(b.substring(1), 10);

    // Define sort order for prefixes
    const prefixOrder: { [key: string]: number } = {
      'P': 1,
      'E': 2,
      'F': 3,
      'S': 4,
      'B': 5
    };

    // Compare by prefix first
    const orderA = prefixOrder[prefixA] ?? 999;
    const orderB = prefixOrder[prefixB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Same prefix - compare by number
    return numberA - numberB;
  }
```

**Validation:**
- Method is private
- Sorts by prefix first (P, E, F, S, B order)
- Sorts by number within same prefix
- Handles invalid prefixes gracefully

---

### Task 5: Verify TypeScript Compilation

**Action:**
Compile and verify no type errors.

**Command:**
```bash
cd vscode-extension && npm run compile
```

**Expected Output:**
```
✓ TypeScript compilation successful
```

**Common Errors:**
- Missing vscode import: Add `import * as vscode from 'vscode';`
- Missing path import: Add `import * as path from 'path';`
- TreeDataProvider not implemented: Verify getTreeItem/getChildren signatures match interface

**Validation:**
- No TypeScript errors
- Build succeeds

---

## Completion Criteria

- ✅ File `vscode-extension/src/treeview/PlanningTreeProvider.ts` created
- ✅ Class implements `vscode.TreeDataProvider<PlanningTreeItem>`
- ✅ Constructor accepts workspaceRoot, cache, outputChannel
- ✅ EventEmitter declared for tree updates
- ✅ refresh() method fires change event
- ✅ getTreeItem() converts PlanningTreeItem to vscode.TreeItem
- ✅ getTreeItem() sets label format "[item] - [title]"
- ✅ getTreeItem() sets collapsible state based on type
- ✅ getChildren() uses workspace.findFiles() for file discovery
- ✅ getChildren() uses cache.get() for parsing
- ✅ getChildren() skips invalid files with warnings
- ✅ getChildren() sorts items by item number
- ✅ compareItemNumbers() helper method implemented
- ✅ TypeScript compiles without errors
- ✅ All methods have JSDoc comments

## Next Phase

Proceed to **Phase 3: Create Barrel Export** to set up clean imports for extension.ts integration.
