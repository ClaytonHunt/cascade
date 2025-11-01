---
spec: S76
phase: 3
title: Documentation and Export
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 3: Documentation and Export

## Overview

This phase completes the `isItemArchived()` utility by polishing documentation, exporting from the module index, and preparing for consumption by dependent stories (S78, S80). We'll ensure the function has complete TSDoc comments, usage examples, and is properly exposed for import.

By the end of this phase, the archive detection utility will be production-ready and documented for other developers to use.

## Prerequisites

- Phase 1 completed (function implemented and unit tested)
- Phase 2 completed (integration tested and performance validated)
- All tests passing (`npm test`)
- TypeScript compilation succeeding (`npm run compile`)

## Tasks

### Task 1: Enhance TSDoc Documentation

**File to Modify:** `vscode-extension/src/treeview/archiveUtils.ts`

**Instructions:**
1. Review existing TSDoc comment on `isItemArchived()`
2. Add comprehensive documentation
3. Include multiple usage examples
4. Document edge cases and behavior

**Code to Update:**

Replace the existing TSDoc comment with this enhanced version:

```typescript
/**
 * Checks if a planning item is archived based on status or file location.
 *
 * An item is considered archived if **any** of these conditions are true:
 * 1. Frontmatter `status` field is `'Archived'`
 * 2. File path contains `/archive/` directory (case-insensitive)
 *
 * ## Detection Logic
 *
 * The function uses **OR logic**: either the status check OR the path check
 * can trigger archived detection. This provides flexibility:
 * - Users can set `status: Archived` in frontmatter
 * - Users can move files to `plans/archive/` directory
 * - Both methods work independently or together
 *
 * ## Path Normalization
 *
 * File paths are normalized for cross-platform compatibility:
 * - Converted to lowercase (case-insensitive matching)
 * - Backslashes (`\`) replaced with forward slashes (`/`)
 * - Works with Windows, Unix, and mixed separators
 *
 * ## False Positive Prevention
 *
 * The function checks for exact `/archive/` directory match, not substring:
 * - ✅ `/plans/archive/epic.md` → archived
 * - ✅ `/plans/archive/epic-04/story.md` → archived (nested)
 * - ❌ `/plans/archive-old/epic.md` → NOT archived
 * - ❌ `/plans/archived-items/epic.md` → NOT archived
 * - ❌ `/plans/epic-05/archive-story.md` → NOT archived (filename, not directory)
 *
 * @param item - Planning tree item to check for archived status
 * @returns `true` if item is archived (by status or location), `false` otherwise
 *
 * @example
 * // Example 1: Archived by frontmatter status
 * const item1 = {
 *   status: 'Archived',
 *   filePath: '/plans/epic-05/story.md',
 *   // ... other fields
 * };
 * isItemArchived(item1); // → true
 *
 * @example
 * // Example 2: Archived by directory location
 * const item2 = {
 *   status: 'Ready',
 *   filePath: '/plans/archive/epic-04/feature.md',
 *   // ... other fields
 * };
 * isItemArchived(item2); // → true
 *
 * @example
 * // Example 3: Both conditions met (redundant but valid)
 * const item3 = {
 *   status: 'Archived',
 *   filePath: '/plans/archive/epic.md',
 *   // ... other fields
 * };
 * isItemArchived(item3); // → true
 *
 * @example
 * // Example 4: Not archived (neither condition met)
 * const item4 = {
 *   status: 'In Progress',
 *   filePath: '/plans/epic-05/story.md',
 *   // ... other fields
 * };
 * isItemArchived(item4); // → false
 *
 * @example
 * // Example 5: Windows path with archive directory
 * const item5 = {
 *   status: 'Ready',
 *   filePath: 'D:\\projects\\plans\\archive\\epic.md',
 *   // ... other fields
 * };
 * isItemArchived(item5); // → true
 *
 * @example
 * // Example 6: Case-insensitive matching
 * const item6 = {
 *   status: 'Ready',
 *   filePath: '/plans/Archive/epic.md', // Capital A
 *   // ... other fields
 * };
 * isItemArchived(item6); // → true
 *
 * @see {@link PlanningTreeItem} for the item interface structure
 * @see S78 for archive filtering implementation
 * @see S80 for archived item visual design
 *
 * @remarks
 * This function is intentionally stateless and side-effect-free. It does not:
 * - Modify the item's frontmatter
 * - Access the filesystem
 * - Update any global state
 *
 * Performance: O(1) time complexity, average execution < 0.01ms per item.
 *
 * @since S76 - Archive Directory Detection Logic
 */
export function isItemArchived(item: PlanningTreeItem): boolean {
  // Function implementation remains the same...
```

**Expected Outcome:**
- TSDoc comment is comprehensive and detailed
- Multiple usage examples provided
- Edge cases documented
- IntelliSense shows rich documentation in VSCode
- "Go to Definition" shows helpful comments

**Validation:**
1. Open `archiveUtils.ts` in VSCode
2. Hover over `isItemArchived` usage
3. Verify IntelliSense shows full documentation
4. Check that examples are visible

---

### Task 2: Add File Header Documentation

**File to Modify:** `vscode-extension/src/treeview/archiveUtils.ts`

**Instructions:**
1. Update file header comment
2. Document module purpose and exports
3. Add usage examples at module level

**Code to Update:**

Replace the existing file header with this enhanced version:

```typescript
/**
 * Archive detection utilities for Cascade TreeView.
 *
 * This module provides functions to identify archived planning items based on:
 * - **Frontmatter status** (`status: Archived`)
 * - **File path location** (`plans/archive/` directory)
 *
 * ## Purpose
 *
 * Enables flexible archival workflows where users can archive items by:
 * 1. Setting frontmatter status to "Archived"
 * 2. Moving files to `plans/archive/` directory
 * 3. Both methods (redundant but supported)
 *
 * ## Exports
 *
 * - {@link isItemArchived} - Main detection function
 *
 * ## Integration
 *
 * Used by:
 * - **S78** (Archive Filtering): Filters archived items from TreeView
 * - **S80** (Visual Design): Applies muted styling to archived items
 * - **S77** (Toggle Command): Determines which items to show/hide
 *
 * ## Usage Example
 *
 * ```typescript
 * import { isItemArchived } from './archiveUtils';
 *
 * // In TreeView filtering logic
 * const visibleItems = allItems.filter(item => {
 *   return showArchivedItems || !isItemArchived(item);
 * });
 * ```
 *
 * @module treeview/archiveUtils
 * @since S76 - Archive Directory Detection Logic
 */

import { PlanningTreeItem } from './PlanningTreeItem';

// Rest of file...
```

**Expected Outcome:**
- Module-level documentation complete
- Purpose clearly explained
- Integration points documented
- Usage example at module level
- Exports clearly listed

---

### Task 3: Export from TreeView Module Index

**File to Modify:** `vscode-extension/src/treeview/index.ts`

**Instructions:**
1. Add export statement for archiveUtils
2. Maintain alphabetical export order
3. Verify re-export works correctly

**Code to Add:**

Read the current exports in `index.ts` and add this line in alphabetical order:

```typescript
export { isItemArchived } from './archiveUtils';
```

**Full Expected File Structure:**
```typescript
/**
 * TreeView module exports.
 *
 * This module provides the TreeView infrastructure for Cascade extension:
 * - PlanningTreeProvider (main TreeView provider)
 * - Data models (PlanningTreeItem, StatusGroupNode, HierarchyNode)
 * - Utilities (archive detection, drag-and-drop controller, status propagation)
 */

export { isItemArchived } from './archiveUtils';
export { HierarchyNode } from './HierarchyNode';
export { PlanningDragAndDropController } from './PlanningDragAndDropController';
export { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
export { PlanningTreeProvider } from './PlanningTreeProvider';
export { StatusPropagationEngine } from './StatusPropagationEngine';
```

**Expected Outcome:**
- archiveUtils re-exported from treeview module
- Import path simplified: `import { isItemArchived } from './treeview'`
- Alphabetical order maintained
- TypeScript compilation succeeds

**Validation:**
```bash
cd vscode-extension
npm run compile
```

---

### Task 4: Create Usage Examples File

**File to Create:** `vscode-extension/src/treeview/archiveUtils.examples.md`

**Instructions:**
1. Create markdown file with usage examples
2. Document common patterns
3. Show integration with TreeView
4. Provide troubleshooting tips

**Code to Add:**
```markdown
# Archive Utils Usage Examples

This document provides real-world usage examples for the `isItemArchived()` function.

## Basic Usage

### Example 1: Filter Archived Items from TreeView

```typescript
import { isItemArchived } from './archiveUtils';

// In PlanningTreeProvider.getChildren()
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  const allItems = await this.loadAllPlanningItems();

  // Apply archive filter if toggle is OFF
  const visibleItems = this.showArchivedItems
    ? allItems
    : allItems.filter(item => !isItemArchived(item));

  return this.buildStatusGroups(visibleItems);
}
```

### Example 2: Apply Visual Styling to Archived Items

```typescript
import { isItemArchived } from './archiveUtils';

// In PlanningTreeProvider.getTreeItem()
getTreeItem(element: TreeNode): vscode.TreeItem {
  const treeItem = new vscode.TreeItem(element.item.title);

  if (isItemArchived(element.item)) {
    // Apply muted styling
    treeItem.description = `${treeItem.description} (Archived)`;
    // Use muted icon color
    treeItem.iconPath = new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.gray'));
  }

  return treeItem;
}
```

### Example 3: Count Archived Items

```typescript
import { isItemArchived } from './archiveUtils';

function getArchivedItemsCount(items: PlanningTreeItem[]): number {
  return items.filter(item => isItemArchived(item)).length;
}

// Usage
const total = allItems.length;
const archived = getArchivedItemsCount(allItems);
const active = total - archived;

console.log(`${active} active items, ${archived} archived items`);
```

## Advanced Usage

### Example 4: Separate Archived and Active Items

```typescript
import { isItemArchived } from './archiveUtils';

function partitionItems(items: PlanningTreeItem[]): {
  active: PlanningTreeItem[];
  archived: PlanningTreeItem[];
} {
  return items.reduce((acc, item) => {
    if (isItemArchived(item)) {
      acc.archived.push(item);
    } else {
      acc.active.push(item);
    }
    return acc;
  }, { active: [] as PlanningTreeItem[], archived: [] as PlanningTreeItem[] });
}

// Usage
const { active, archived } = partitionItems(allItems);
```

### Example 5: Conditional Processing Based on Archive Status

```typescript
import { isItemArchived } from './archiveUtils';

function processItem(item: PlanningTreeItem): void {
  if (isItemArchived(item)) {
    // Skip archived items from status propagation
    return;
  }

  // Process active item
  updateStatus(item);
  propagateToParent(item);
}
```

## Edge Cases

### Example 6: Handling Both Status and Path

```typescript
// Item in archive directory with Archived status (redundant but valid)
const item = {
  status: 'Archived',
  filePath: '/plans/archive/epic.md',
  // ... other fields
};

// Both conditions met - still returns true
console.log(isItemArchived(item)); // → true
```

### Example 7: Preserving Original Status in Archive

```typescript
// Item in archive directory but still shows In Progress
// This is intentional - location takes precedence
const item = {
  status: 'In Progress',
  filePath: '/plans/archive/epic-05/story.md',
  // ... other fields
};

// Detected as archived despite In Progress status
console.log(isItemArchived(item)); // → true

// Original status preserved for historical context
console.log(item.status); // → 'In Progress'
```

## Performance Considerations

### Example 8: Efficient Filtering of Large Item Sets

```typescript
import { isItemArchived } from './archiveUtils';

// For large item sets (1000+), filter() is efficient
const activeItems = allItems.filter(item => !isItemArchived(item));

// Average performance: < 0.01ms per item
// Total for 1000 items: < 10ms
```

## Troubleshooting

### Issue: Items Not Detected as Archived

**Problem:** File is in archive directory but not detected

**Solution:** Check path normalization
```typescript
console.log(item.filePath); // Verify path includes '/archive/' or '\archive\'
console.log(item.filePath.toLowerCase()); // Check case sensitivity
```

**Common Causes:**
- Path is `archive-old` not `archive` (exact match required)
- Filename contains "archive" but directory doesn't
- Typo in directory name

### Issue: Performance Degradation

**Problem:** Filtering 1000+ items is slow

**Solution:** Verify you're not calling isItemArchived() multiple times per item
```typescript
// ❌ BAD: Multiple calls per item
items.forEach(item => {
  if (isItemArchived(item)) { ... }
  if (isItemArchived(item)) { ... } // Called again!
});

// ✅ GOOD: Single call, cached result
items.forEach(item => {
  const archived = isItemArchived(item);
  if (archived) { ... }
  if (archived) { ... } // Reuses cached result
});
```

## Testing

### Example 9: Unit Test Pattern

```typescript
import { isItemArchived } from '../../treeview/archiveUtils';

test('detects archived item', () => {
  const item = {
    item: 'S99',
    title: 'Test',
    type: 'story',
    status: 'Archived',
    priority: 'Medium',
    filePath: '/plans/epic.md'
  };

  expect(isItemArchived(item)).toBe(true);
});
```

## See Also

- **S78** - Archive Filtering in TreeView
- **S80** - Visual Design for Archived Items
- **S77** - Toggle Command and UI Integration
```

**Expected Outcome:**
- Examples file created
- Real-world usage patterns documented
- Troubleshooting guide included
- Reference examples for future developers

---

### Task 5: Verify TypeScript Compilation and Exports

**Instructions:**
1. Clean build the project
2. Verify exports work correctly
3. Test import from external modules
4. Check IntelliSense

**Validation Commands:**
```bash
cd vscode-extension

# Clean and rebuild
rm -rf dist/
npm run compile

# Verify no compilation errors
echo $?  # Should output 0 (success)

# Check exports
grep -r "isItemArchived" dist/treeview/index.js
```

**Expected Outcome:**
- TypeScript compilation succeeds
- Exports present in compiled JavaScript
- No errors or warnings
- Import paths resolve correctly

**IntelliSense Verification:**
1. Open a different TypeScript file (e.g., `PlanningTreeProvider.ts`)
2. Type: `import { isItemArchived } from './archiveUtils';`
3. Verify IntelliSense shows function with full documentation
4. Hover over function name - see TSDoc comments

---

### Task 6: Add README Entry

**File to Modify:** `vscode-extension/README.md`

**Instructions:**
1. Find the "Archive Support" section (or create if missing)
2. Document the archive detection feature
3. Explain usage for end users

**Code to Add:**

Add this section to the README under "Features":

```markdown
## Archive Support

### Archive Detection

Cascade automatically detects archived planning items using two methods:

1. **Frontmatter Status**: Items with `status: Archived` in frontmatter
2. **Directory Location**: Items in `plans/archive/` directory

#### Usage

**Archive by Frontmatter:**
```yaml
---
item: S75
title: Old Feature
type: story
status: Archived  # Marks item as archived
priority: Low
---
```

**Archive by Moving File:**
```bash
# Move file to archive directory
mv plans/epic-05/story-75-old.md plans/archive/
```

Both methods work independently - choose the workflow that fits your needs.

#### Technical Details

- Path detection is case-insensitive (`Archive`, `ARCHIVE`, `archive` all work)
- Works with nested paths: `plans/archive/epic-04/feature-16/story.md`
- Cross-platform: Handles Windows (`\`) and Unix (`/`) path separators
- Performance: < 0.01ms per item, efficient with 1000+ items

For implementation details, see `vscode-extension/src/treeview/archiveUtils.ts`.
```

**Expected Outcome:**
- README updated with archive detection documentation
- End users understand how archiving works
- Technical details available for developers
- Links to source code provided

---

### Task 7: Final Verification

**Instructions:**
1. Run complete test suite
2. Verify all documentation is in place
3. Check exports work correctly
4. Review code quality

**Verification Checklist:**

**Documentation:**
- ✅ TSDoc comments complete on `isItemArchived()`
- ✅ File header documentation updated
- ✅ Usage examples file created
- ✅ README.md updated with feature documentation

**Exports:**
- ✅ Function exported from `archiveUtils.ts`
- ✅ Re-exported from `treeview/index.ts`
- ✅ Import paths work: `import { isItemArchived } from './treeview'`

**Testing:**
- ✅ All unit tests passing (20+ tests)
- ✅ All integration tests passing (13+ tests)
- ✅ TypeScript compilation succeeds
- ✅ No linting errors

**Validation Commands:**
```bash
cd vscode-extension

# Full test suite
npm test

# TypeScript compilation
npm run compile

# Linting
npm run lint

# Check exports
grep "isItemArchived" dist/treeview/index.d.ts
```

**Expected Test Output:**
```
Archive Detection Utility
  ✓ 20+ unit tests passing

Archive Detection - Integration Tests
  ✓ 13+ integration tests passing

Total: 33+ tests passing
```

---

## Completion Criteria

Before marking S76 as complete, verify:

### Documentation Complete
- ✅ TSDoc comments comprehensive (6+ usage examples)
- ✅ File header documentation complete
- ✅ Usage examples file created (`archiveUtils.examples.md`)
- ✅ README.md updated with feature documentation
- ✅ IntelliSense shows rich documentation in VSCode

### Exports Working
- ✅ Function exported from `archiveUtils.ts`
- ✅ Re-exported from `treeview/index.ts`
- ✅ Import paths simplified and working
- ✅ TypeScript definitions (.d.ts) include exports

### Code Quality
- ✅ All tests passing (33+ total tests)
- ✅ TypeScript compilation succeeds (0 errors)
- ✅ No linting warnings
- ✅ Code follows existing project conventions

### Integration Ready
- ✅ Function available for S78 (Archive Filtering)
- ✅ Function available for S80 (Visual Design)
- ✅ Function available for S77 (Toggle Command)
- ✅ No breaking changes to existing code

## Story Complete

After completing Phase 3, the Archive Directory Detection utility is **production-ready**:
- ✅ Implemented and tested
- ✅ Documented and exported
- ✅ Performance validated
- ✅ Ready for integration

**Next Steps:**
1. Mark S76 story as "Ready" in plans/ directory
2. Proceed to S77 (Toggle Command) or S78 (Archive Filtering)
3. Use `isItemArchived()` in downstream features

**Story S76 Status:** ✅ Complete
