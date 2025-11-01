---
item: S46
title: Parent Item Badge Decorations
type: story
status: Not Started
priority: High
dependencies: [S41, S43, S45]
estimate: M
created: 2025-10-13
updated: 2025-10-13
---

# S46 - Parent Item Badge Decorations

## Description

Implement completion badge decorations for parent items (features, epics, projects) showing "X/Y" format where X is completed children and Y is total children. This provides at-a-glance progress visibility for hierarchical planning items directly in the file explorer.

## Acceptance Criteria

- [ ] Features display badge in format "X/Y" (completed/total stories+bugs)
- [ ] Epics display badge in format "X/Y" (completed/total features)
- [ ] Projects display badge in format "X/Y" (completed/total epics)
- [ ] Badge color reflects completion percentage (green ≥75%, yellow ≥50%, red <50%)
- [ ] Tooltip shows "[Type]: [Title] - X of Y [children] completed"
- [ ] Only parent items get badges (not leaf items)
- [ ] Badge updates automatically when child item status changes
- [ ] Empty parents show "0/0" badge
- [ ] Badge visible in both light and dark themes
- [ ] Decoration appears within 1 second of child file changes

## Technical Notes

**Implementation in provideFileDecoration():**
```typescript
async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
  // Filter to plans/ directory
  if (!uri.fsPath.includes('/plans/')) {
    return undefined;
  }

  // Check if parent item (feature/epic/project)
  const itemType = await getItemType(uri, this.cache);
  if (itemType !== 'parent') {
    return undefined; // Let S44 handle leaf items
  }

  // Calculate progress
  const progress = await calculateProgress(uri, this.cache, this.progressCache);

  // Format badge: "2/5"
  const badge = `${progress.completed}/${progress.total}`;

  // Determine color based on completion percentage
  const completionPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const color = getProgressColor(completionPercent);

  // Get frontmatter for tooltip
  const frontmatter = await this.cache.get(uri.fsPath);
  const childType = getChildTypeName(uri); // "features", "stories/bugs", "epics"

  const tooltip = frontmatter
    ? `${frontmatter.type}: ${frontmatter.title} - ${progress.completed} of ${progress.total} ${childType} completed`
    : `Progress: ${progress.completed} of ${progress.total} ${childType} completed`;

  return new vscode.FileDecoration(badge, tooltip, color);
}
```

**Progress Color Mapping:**
```typescript
function getProgressColor(completionPercent: number): vscode.ThemeColor {
  if (completionPercent >= 75) {
    return new vscode.ThemeColor('testing.iconPassed'); // Green
  } else if (completionPercent >= 50) {
    return new vscode.ThemeColor('editorWarning.foreground'); // Yellow
  } else if (completionPercent > 0) {
    return new vscode.ThemeColor('editorError.foreground'); // Red
  } else {
    return new vscode.ThemeColor('descriptionForeground'); // Gray (0% complete)
  }
}
```

**Child Type Names:**
```typescript
function getChildTypeName(uri: vscode.Uri): string {
  const fileName = path.basename(uri.fsPath);

  if (fileName === 'feature.md') {
    return 'stories/bugs';
  }
  if (fileName === 'epic.md') {
    return 'features';
  }
  if (fileName === 'project.md') {
    return 'epics';
  }

  return 'items';
}
```

**Badge Format Constraints:**
- VSCode FileDecoration badge supports 1-2 characters OR numeric badge
- For "X/Y" format: Works but may truncate on narrow displays
- Alternative: Show only X (completed count) with color indicating progress
- Recommended: Use "X/Y" format, tooltips provide full context

**Badge Display Examples:**
```
feature.md    [2/5]  "Feature: User Authentication - 2 of 5 stories/bugs completed"
epic.md       [1/3]  "Epic: VSCode Extension - 1 of 3 features completed"
project.md    [0/4]  "Project: Lineage - 0 of 4 epics completed"
```

## Decoration Refresh Strategy

**When to Refresh:**
1. Child file status changed → Refresh parent
2. Child file created → Refresh parent (total increments)
3. Child file deleted → Refresh parent (total decrements)
4. Parent file opened → Calculate on-demand

**Refresh Trigger:**
```typescript
// In FileSystemWatcher handler
const handleChange = (uri: vscode.Uri) => {
  // Invalidate frontmatter cache
  cache.invalidate(uri.fsPath);

  // Invalidate progress cache for parent items
  progressCache.invalidate(uri);

  // Refresh decoration for this file
  decorationProvider.refresh(uri);

  // Refresh parent item decoration (progress changed)
  const parentUri = getParentItemUri(uri);
  if (parentUri) {
    decorationProvider.refresh(parentUri);
  }
};
```

**Parent URI Resolution:**
```typescript
function getParentItemUri(childUri: vscode.Uri): vscode.Uri | undefined {
  const filePath = childUri.fsPath;
  const fileName = path.basename(filePath);

  // Story/Bug → Feature
  if (/^(story|bug)-\d+/.test(fileName)) {
    const featurePath = path.join(path.dirname(filePath), 'feature.md');
    return vscode.Uri.file(featurePath);
  }

  // Feature → Epic
  if (fileName === 'feature.md') {
    const epicPath = path.join(path.dirname(path.dirname(filePath)), 'epic.md');
    return vscode.Uri.file(epicPath);
  }

  // Epic → Project
  if (fileName === 'epic.md') {
    const projectPath = path.join(path.dirname(path.dirname(filePath)), 'project.md');
    return vscode.Uri.file(projectPath);
  }

  return undefined;
}
```

## Edge Cases

- Parent with zero children: Show "0/0" badge with gray color
- Parent with all children completed: Show green badge
- Parent with no completed children: Show red badge (if total > 0)
- Child file without status field: Exclude from completed count
- Parent file itself moved: Decoration refreshes automatically (VSCode re-queries)
- Rapid child changes: Debouncing (300ms) prevents excessive recalculation

## Testing Strategy

Unit tests:
1. Feature with 3 stories (2 completed) → badge "2/3"
2. Epic with 5 features (0 completed) → badge "0/5"
3. Project with 2 epics (2 completed) → badge "2/2" (green)
4. Empty feature → badge "0/0" (gray)
5. Feature with 75% completion → green color
6. Feature with 50% completion → yellow color
7. Feature with 25% completion → red color

Manual testing:
1. Open F11 feature folder → verify badge shows correct count
2. Mark story as completed → verify feature badge increments completed count
3. Create new story → verify feature badge increments total count
4. Delete story → verify feature badge decrements total count
5. Test with nested hierarchy (project → epic → feature → story)
6. Verify colors match completion percentages
7. Verify tooltips show correct information

Performance testing:
1. Open epic folder with 10 features → verify badges appear within 1 second
2. Modify child item → verify parent badge updates within 1 second
3. Verify progress cache prevents redundant calculations (check output channel)

## Definition of Done

- Parent items (features/epics/projects) show "X/Y" completion badges
- Badge colors reflect completion percentage
- Tooltips provide detailed progress information
- Badges update automatically when child items change
- Progress calculation uses cache for performance
- No visual issues in light or dark themes
- Manual testing confirms correct behavior
- Integration with FileSystemWatcher works correctly
- Feature F12 complete (all child stories done)
