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
