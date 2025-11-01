---
item: S56
title: Progress Indicators
type: story
parent: F17
status: Completed
priority: Medium
dependencies: [S55]
estimate: M
created: 2025-10-14
updated: 2025-10-14
spec: specs/S56-progress-indicators/
---

# S56 - Progress Indicators

## Description

Calculate and display completion percentage indicators for Epic and Feature items. Show progress in TreeView as "[item] - [title] ([progress])" format, making pipeline progress visible at a glance.

This story adds the "at-a-glance" progress visibility that makes kanban views valuable.

### Key Requirements

**Progress Display Formats:**
- Epic: "E4 - Planning Kanban View (75%)" or "E4 - Planning Kanban View (3/4)"
- Feature: "F17 - Status-Based Kanban Layout (60%)" or "F17 - Status-Based Kanban Layout (3/5)"
- Story/Bug: No progress indicator (leaf items)

**Progress Calculation Logic:**
- Epic progress: Percentage of completed child Features
- Feature progress: Percentage of completed child Stories/Bugs
- Completed = status "Completed"
- Handle edge cases: 0 children, all blocked, mixed statuses

**Update Triggers:**
- Progress recalculates on tree refresh
- Triggered by status changes in child items
- Efficient: use cached hierarchy, don't re-scan files

**Visual Presentation:**
- Use TreeItem.description field for progress text
- Format: "(3/5)" or "(60%)" or "(3/5 - 60%)"
- Color-coding via ThemeColor (optional enhancement)
- Dim text when no progress (0/0)

### Technical Implementation

**Progress Calculator:**
```typescript
interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
  display: string;  // "(3/5)" or "(60%)"
}

/**
 * Calculates progress for a parent item (Epic or Feature).
 * Returns completion count, total count, percentage, and display string.
 */
private calculateProgress(item: PlanningTreeItem): ProgressInfo | null {
  // Get all children of this item
  const children = this.getDirectChildren(item);

  if (children.length === 0) {
    return null;  // No progress for items without children
  }

  // Count completed children
  const completed = children.filter(child => child.status === 'Completed').length;
  const total = children.length;
  const percentage = Math.round((completed / total) * 100);

  // Format display string
  const display = `(${completed}/${total})`;
  // Alternative: `(${percentage}%)`
  // Alternative: `(${completed}/${total} - ${percentage}%)`

  return { completed, total, percentage, display };
}

/**
 * Gets direct children of an item (no grandchildren).
 * Epic → Features, Feature → Stories/Bugs
 */
private getDirectChildren(item: PlanningTreeItem): PlanningTreeItem[] {
  if (item.type === 'epic') {
    // Return features in this epic
    return this.featuresCache.filter(f => this.isChildOfEpic(f, item));
  } else if (item.type === 'feature') {
    // Return stories/bugs in this feature
    return this.storiesCache.filter(s => this.isChildOfFeature(s, item));
  }

  return [];
}
```

**TreeItem Integration:**
```typescript
getTreeItem(element: any): vscode.TreeItem {
  // ... existing code ...

  // Add progress indicator for parent items
  if (element.type === 'epic' || element.type === 'feature') {
    const progress = this.calculateProgress(element);
    if (progress) {
      treeItem.description = `${element.status} ${progress.display}`;
      // Example: "In Progress (3/5)"
    }
  }

  return treeItem;
}
```

**Caching Strategy:**
- Cache children lists per item
- Invalidate on file changes
- Recalculate progress only for affected items
- Avoid full tree traversal on every getTreeItem() call

**Progress Color Coding (Optional):**
```typescript
// Use TreeItem.iconPath with ThemeColor for visual progress
if (progress.percentage === 100) {
  treeItem.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
} else if (progress.percentage >= 50) {
  treeItem.iconPath = new vscode.ThemeIcon('sync', new vscode.ThemeColor('notificationsWarningIcon.foreground'));
} else {
  treeItem.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('notificationsInfoIcon.foreground'));
}
```

### Integration Points

**Dependencies:**
- S55 (Hierarchical Item Display) - Uses hierarchy to determine children
- Hierarchy cache from S55 for efficient lookups
- Status information from frontmatter

**Performance Considerations:**
- Cache progress calculations per item
- Batch recalculations on refresh
- Avoid recursive calculations (use flat cached lists)

### Testing Approach

**Unit Tests:**
- calculateProgress() with various child counts
- Edge cases: 0 children, all completed, none completed
- getDirectChildren() filters correctly by parent
- Progress display formatting
- Cache invalidation on status change

**Manual Verification:**
- Epic shows aggregate feature progress
- Feature shows aggregate story progress
- Progress updates when child status changes
- Format readable and consistent
- No performance lag with large hierarchies

## Acceptance Criteria

- [ ] Epic items show completion percentage (e.g., "75%")
- [ ] Feature items show completion percentage (e.g., "3/5")
- [ ] Story/Bug items have no progress indicator
- [ ] Progress format: "(completed/total)" or "(percentage%)"
- [ ] Progress updates when child status changes
- [ ] Items with 0 children show no progress indicator
- [ ] Progress calculation efficient (no lag)
- [ ] Progress visible in TreeView description field
- [ ] Progress readable against VSCode themes (light/dark)
- [ ] Cache invalidation correct on file changes

## Analysis Summary

**Calculation Strategy:**
- Top-down: Epic calculates from Features, Feature from Stories
- Cached: Store children lists to avoid repeated scans
- Efficient: Only recalculate affected branches on change

**Display Options:**
- Count format: "(3/5)" - shows exact numbers
- Percentage format: "(60%)" - shows relative progress
- Combined format: "(3/5 - 60%)" - shows both (verbose)
- Recommendation: Use count format for clarity

**VSCode Integration:**
- TreeItem.description field for progress text
- ThemeColor for optional color-coding
- Automatic dimming via VSCode theming
