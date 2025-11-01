---
spec: S49
title: TreeDataProvider Core Implementation
type: spec
status: Completed
priority: High
phases: 4
created: 2025-10-13
updated: 2025-10-13
---

# S49 - TreeDataProvider Core Implementation

## Overview

This specification implements the core `PlanningTreeProvider` class that powers the Cascade TreeView with actual planning data. The provider scans the plans/ directory, loads planning items using the existing frontmatter cache and parser, and provides tree structure data to VSCode for display.

This is the data layer that transforms the empty TreeView placeholder (from S48) into a functional view showing all planning items as a flat list. Hierarchical grouping will be added in F17.

## Implementation Strategy

### Approach

**Three-Component Architecture:**
1. **PlanningTreeItem Interface** (`treeview/PlanningTreeItem.ts`) - Data model for tree items
2. **PlanningTreeProvider Class** (`treeview/PlanningTreeProvider.ts`) - TreeDataProvider implementation
3. **Extension Integration** (`extension.ts`) - Replace placeholder with real provider

**Data Flow:**
```
VSCode TreeView → PlanningTreeProvider.getChildren()
                  ↓
                  Scan plans/ directory (vscode.workspace.findFiles)
                  ↓
                  Load each file via FrontmatterCache.get()
                  ↓
                  Convert Frontmatter → PlanningTreeItem
                  ↓
                  Sort by item number (P1, E1, F1, S1)
                  ↓
                  Return flat array to VSCode
                  ↓
VSCode TreeView ← Display as list
```

### Architecture Decisions

**1. Flat List vs. Hierarchy:**
- **Chosen**: Flat list (all items at root level)
- **Rationale**: S49 focuses on data loading, hierarchy comes in F17, simpler implementation
- **Collapsible State**: Set based on type (Epic/Feature = Collapsed, Story/Bug = None) to prepare for F17

**2. Data Model: PlanningTreeItem Interface vs. Direct Frontmatter:**
- **Chosen**: PlanningTreeItem interface (subset of Frontmatter fields)
- **Rationale**: TreeView only needs 6 fields (item, title, type, status, priority, filePath), cleaner API, decouples view from parser

**3. File Discovery: glob vs. vscode.workspace.findFiles:**
- **Chosen**: `vscode.workspace.findFiles()`
- **Rationale**: VSCode-native API, respects .gitignore, consistent with extension patterns, returns Uri objects

**4. Error Handling Strategy:**
- **Chosen**: Skip invalid files, log warnings, continue processing
- **Rationale**: One broken file shouldn't break entire view, user can fix file after seeing warning

### Key Integration Points

**FrontmatterCache (S40):**
- File: `vscode-extension/src/cache.ts`
- Method: `cache.get(filePath: string): Promise<Frontmatter | null>`
- Already initialized in extension.ts:535
- Provider receives cache instance via constructor

**Parser (S39):**
- File: `vscode-extension/src/parser.ts`
- Used internally by cache (no direct parser calls needed)
- Validates all required frontmatter fields

**FileSystemWatcher (S38):**
- File: `vscode-extension/src/extension.ts:351-452`
- Already monitors plans/ directory changes
- Automatic cache invalidation on file changes
- Provider refresh mechanism (S51) will respond to watcher events

**TreeView Registration (S48):**
- File: `vscode-extension/src/extension.ts:558-569`
- Currently uses PlaceholderTreeProvider
- Will be replaced with PlanningTreeProvider

**Types (types.ts):**
- File: `vscode-extension/src/types.ts`
- Existing: `Frontmatter`, `ItemType`, `Status`, `Priority`
- Will add: `PlanningTreeItem` interface

## Risks and Considerations

### Performance Considerations

**Initial Load Time:**
- Plans directory may have 50-100 files (typical project)
- Cache misses on first load (all files parsed)
- **Mitigation**: Use workspace.findFiles (fast), cache all results, subsequent loads use cache

**Memory Usage:**
- Each PlanningTreeItem ~500 bytes (6 strings + references)
- 100 items = ~50KB (negligible)
- Cache holds full Frontmatter (~1KB per item) = ~100KB (acceptable)

### Error Scenarios

**Invalid Frontmatter:**
- **Impact**: File skipped, warning logged
- **User Experience**: Other items still load, user sees warning in output channel
- **Recovery**: User fixes file, FileSystemWatcher triggers cache invalidation

**Empty plans/ Directory:**
- **Impact**: TreeView shows empty (no errors)
- **User Experience**: Same as placeholder view from S48
- **Recovery**: User adds files, watcher detects, refresh triggered (S51)

**File Read Errors:**
- **Impact**: File skipped (cache.get returns null)
- **User Experience**: Item missing from tree, warning logged
- **Recovery**: Fix permissions/access, manual refresh

### No Breaking Changes

- Replaces PlaceholderTreeProvider (same interface, drop-in replacement)
- No changes to package.json contributions
- No changes to existing cache/parser APIs
- Additive changes only (new files, new provider registration)

## Phase Overview

### Phase 1: Create PlanningTreeItem Interface
**File**: `vscode-extension/src/treeview/PlanningTreeItem.ts`
- Define interface with 6 required fields
- Add JSDoc documentation
- Export from module

### Phase 2: Implement PlanningTreeProvider Class
**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
- Implement `TreeDataProvider<PlanningTreeItem>` interface
- Add constructor (workspaceRoot, cache, outputChannel)
- Implement `getTreeItem()` method (convert to vscode.TreeItem)
- Implement `getChildren()` method (scan, load, sort, return)
- Add EventEmitter for refresh capability
- Add error handling and logging

### Phase 3: Create Barrel Export
**File**: `vscode-extension/src/treeview/index.ts`
- Export PlanningTreeItem interface
- Export PlanningTreeProvider class
- Provides clean import path for extension.ts

### Phase 4: Integrate Provider in Extension
**File**: `vscode-extension/src/extension.ts`
- Remove PlaceholderTreeProvider class
- Import PlanningTreeProvider from treeview module
- Instantiate provider with dependencies
- Replace TreeView registration
- Add module-level variable for disposal
- Update logging messages

## Files Modified

1. **vscode-extension/src/extension.ts** (Phase 4)
   - Remove PlaceholderTreeProvider
   - Add PlanningTreeProvider registration
   - Add provider disposal in deactivate()

## Files Created

1. **vscode-extension/src/treeview/PlanningTreeItem.ts** (Phase 1)
   - Interface definition for tree item data model

2. **vscode-extension/src/treeview/PlanningTreeProvider.ts** (Phase 2)
   - TreeDataProvider implementation with data loading

3. **vscode-extension/src/treeview/index.ts** (Phase 3)
   - Barrel export for clean imports

## Validation Strategy

### Compilation Validation

**TypeScript Compilation:**
```bash
npm run compile
```
- Verify no type errors
- Verify TreeDataProvider interface correctly implemented
- Verify all imports resolve

### Manual Testing

**Setup:**
1. Ensure test workspace has plans/ directory with sample files
2. Package and install extension locally: `cd vscode-extension && npm run package && code --install-extension cascade-0.1.0.vsix --force`
3. Reload window (Ctrl+Shift+P → "Developer: Reload Window")
4. Open workspace with plans/ directory

**Test Cases:**

**TC1: Basic Data Loading**
1. Open Cascade view in Activity Bar
2. Verify all planning items appear
3. Verify format: "[item] - [title]" (e.g., "S49 - TreeDataProvider Core Implementation")
4. Verify items sorted by item number

**TC2: Empty Directory**
1. Open workspace with empty plans/ directory
2. Verify TreeView shows empty (no errors in Output Channel "Cascade")

**TC3: Invalid Frontmatter**
1. Create test file with malformed YAML
2. Verify file skipped, warning logged in output channel
3. Verify other items still load

**TC4: Cache Performance**
1. Open Cascade view (first load)
2. Run command: "Cascade: Show Cache Statistics"
3. Verify cache misses = file count
4. Close and reopen view
5. Verify cache hits > 0 (data served from cache)

**TC5: Collapsible State**
1. Verify Epic/Feature items show collapse arrow
2. Verify Story/Bug items have no arrow
3. Note: Arrow is visible but clicking does nothing (F17 will add children)

### Automated Testing

**Test Framework:** Mocha + Node.js test runner

**Test File:** `vscode-extension/test/treeview/PlanningTreeProvider.test.ts`

**Test Suites:**

**Suite 1: PlanningTreeProvider.getChildren()**
- Should return all .md files from plans/ directory
- Should skip files with invalid frontmatter
- Should return empty array for empty directory
- Should sort items by item number (P1, E1, E2, F1, S1, etc.)
- Should use cache for file parsing (verify cache.get called)

**Suite 2: PlanningTreeProvider.getTreeItem()**
- Should convert PlanningTreeItem to vscode.TreeItem
- Should set label format: "[item] - [title]"
- Should set collapsibleState based on type
- Should set resourceUri to file path

**Suite 3: EventEmitter Integration**
- Should fire change event on refresh()
- Should allow subscribers to listen to changes

**Suite 4: Error Handling**
- Should handle file read errors gracefully
- Should log warnings for invalid files
- Should continue processing after errors

**Test Execution:**
```bash
npm test
```

### Success Criteria

- ✅ TypeScript compiles without errors
- ✅ All unit tests pass
- ✅ TreeView displays all planning items from plans/ directory
- ✅ Items formatted as "[item] - [title]"
- ✅ Items sorted by item number
- ✅ Invalid files skipped with warnings logged
- ✅ Empty directory shows empty TreeView (no errors)
- ✅ Cache used for file parsing (hit rate > 0 on second load)
- ✅ Epic/Feature items have collapse arrow
- ✅ Story/Bug items have no collapse arrow
- ✅ No console errors in Output Channel ("Cascade")

## Next Steps

After S49 completion:
1. **S50** - Add icons and status badges to tree items
2. **S51** - Add click-to-open functionality
3. **S52** - Connect refresh mechanism to FileSystemWatcher
4. **F17** - Implement hierarchical grouping (Epic → Feature → Story)

## References

**VSCode API Documentation:**
- TreeDataProvider: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- TreeItem: https://code.visualstudio.com/api/references/vscode-api#TreeItem
- TreeItemCollapsibleState: https://code.visualstudio.com/api/references/vscode-api#TreeItemCollapsibleState
- workspace.findFiles(): https://code.visualstudio.com/api/references/vscode-api#workspace.findFiles
- EventEmitter: https://code.visualstudio.com/api/references/vscode-api#EventEmitter

**VSCode Extension Guides:**
- Tree View Guide: https://code.visualstudio.com/api/extension-guides/tree-view
- Tree View API: https://code.visualstudio.com/api/extension-capabilities/common-capabilities#tree-view

**Project Documentation:**
- Frontmatter Schema: `docs/frontmatter-schema.md`
- Parser Implementation: `vscode-extension/src/parser.ts`
- Cache Implementation: `vscode-extension/src/cache.ts`
- Types Definition: `vscode-extension/src/types.ts`
