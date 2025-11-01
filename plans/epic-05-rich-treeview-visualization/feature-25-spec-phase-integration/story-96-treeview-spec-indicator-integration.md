---
item: S96
title: TreeView Spec Indicator Integration
type: story
parent: F25
status: Completed
priority: High
dependencies: [S93, S94, S95]
estimate: M
spec: specs/S96-treeview-spec-indicator-integration
created: 2025-10-26
updated: 2025-10-27
---

# S96 - TreeView Spec Indicator Integration

## Description

Integrate spec phase indicators into PlanningTreeProvider.getTreeItem() to display spec progress inline with Story items. This story combines the spec progress reader, cache, and renderer to surface implementation progress directly in the TreeView.

Users will see at a glance which stories have specs, how many phases are complete, and whether spec/story status is synchronized.

## Acceptance Criteria

1. **TreeItem Description Integration**:
   - [ ] Modify getTreeItem() for Story items
   - [ ] Call `getSpecProgressCached(item)` to fetch spec progress
   - [ ] Call `renderSpecPhaseIndicator(progress)` to format indicator
   - [ ] Append indicator to TreeItem.description
   - [ ] Format: `{statusBadge} {specIndicator} {progressBar}`

2. **Display Logic**:
   - [ ] Only show indicators for Story items (not Epics/Features)
   - [ ] Stories without specs show no indicator (empty string)
   - [ ] Stories with specs show phase progress
   - [ ] Maintain existing status badge and progress bar display

3. **Tooltip Enhancement**:
   - [ ] Add spec progress details to TreeItem.tooltip
   - [ ] Show spec directory path
   - [ ] Show individual phase status (if available)
   - [ ] Add sync warning message if out of sync
   - [ ] Example tooltip:
     ```
     Story 75 - Type System
     Status: Completed

     Spec Progress:
     - Directory: specs/story-75-type-system
     - Phases: 3/3 complete
     - Status: Completed

     ⚠️ Spec and Story status out of sync
     Run /sync to update story status
     ```

4. **Spec Field Reading**:
   - [ ] Read `spec` field from story frontmatter
   - [ ] Field should contain relative path to spec directory
   - [ ] Example: `spec: specs/story-75-type-system`
   - [ ] Resolve path relative to workspace root

5. **PlanningTreeItem Interface Update**:
   - [ ] Add optional `spec?: string` field to PlanningTreeItem interface
   - [ ] Populated during frontmatter parsing in getChildren()
   - [ ] Used by getSpecProgressCached() to read spec

6. **Performance**:
   - [ ] Use cached spec progress (S94) - no re-reading on every render
   - [ ] Async spec reading doesn't block TreeView rendering
   - [ ] < 500ms refresh time with 50+ stories with specs

## Technical Approach

**PlanningTreeItem Interface Update**:

```typescript
export interface PlanningTreeItem {
  item: string;
  title: string;
  type: ItemType;
  status: Status;
  priority: Priority;
  filePath: string;
  parent?: string;
  dependencies?: string[];
  spec?: string;  // NEW: Relative path to spec directory
}
```

**Frontmatter Parsing Update** (in getChildren()):

```typescript
private async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // ... existing code ...

  const item: PlanningTreeItem = {
    item: frontmatter.item,
    title: frontmatter.title,
    type: frontmatter.type,
    status: frontmatter.status,
    priority: frontmatter.priority,
    filePath: file.fsPath,
    parent: frontmatter.parent,
    dependencies: frontmatter.dependencies,
    spec: frontmatter.spec  // NEW: Read spec field
  };

  // ... existing code ...
}
```

**getTreeItem() Integration**:

```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // ... existing code ...

  // For Story items: Add spec phase indicator
  if (element.type === 'story') {
    // Get spec progress (uses cache if available)
    const specProgress = await this.getSpecProgressCached(element);

    // Render spec indicator
    const specIndicator = renderSpecPhaseIndicator(specProgress);

    // Combine status badge with spec indicator
    treeItem.description = `${statusBadge}${specIndicator ? ' ' + specIndicator : ''}`;

    // Add spec details to tooltip
    if (specProgress) {
      treeItem.tooltip = this.buildTooltipWithSpec(element, specProgress);
    }

    // Add sync warning to tooltip if out of sync
    if (specProgress && !specProgress.inSync) {
      treeItem.tooltip += '\n\n⚠️ Spec and Story status out of sync - run /sync to update';
    }
  }

  // For Epic/Feature/Project: Include progress bar (existing logic)
  if (element.type === 'epic' || element.type === 'feature' || element.type === 'project') {
    const progress = await this.calculateProgress(element);
    if (progress) {
      const progressBar = renderProgressBar(progress);
      treeItem.description = `${statusBadge} ${progressBar}`;
    }
  }

  return treeItem;
}
```

**Tooltip Builder**:

```typescript
private buildTooltipWithSpec(
  item: PlanningTreeItem,
  specProgress: SpecProgress
): string {
  let tooltip = `${item.item} - ${item.title}\n`;
  tooltip += `Status: ${item.status}\n`;
  tooltip += `Priority: ${item.priority}\n`;

  // Add spec progress section
  tooltip += `\nSpec Progress:\n`;
  tooltip += `- Directory: ${specProgress.specDir}\n`;
  tooltip += `- Phases: ${specProgress.completedPhases}/${specProgress.totalPhases} complete\n`;
  tooltip += `- Status: ${specProgress.specStatus}\n`;

  return tooltip;
}
```

## Dependencies

- S93 (Spec Progress Reader) - Provides readSpecProgress()
- S94 (Spec Progress Cache) - Provides getSpecProgressCached()
- S95 (Spec Phase Renderer) - Provides renderSpecPhaseIndicator()
- PlanningTreeProvider (S49) - Target integration point

## Testing Strategy

**Unit Tests**:
- Test spec field parsed from frontmatter
- Test getTreeItem() calls getSpecProgressCached() for stories
- Test indicator appended to TreeItem.description
- Test tooltip includes spec details
- Test sync warning added to tooltip when out of sync
- Test stories without specs show no indicator

**Integration Tests**:
- Create test story with spec field in frontmatter
- Verify indicator appears in TreeView
- Verify tooltip shows spec details
- Test cache hit rate > 80% with multiple refreshes
- Verify file watcher invalidates cache on spec changes

**Visual Tests**:
- View TreeView with stories that have specs
- Verify indicator displays correctly
- Check tooltip formatting and content
- Confirm sync warnings visible

## Files to Modify

1. **Update**: `vscode-extension/src/treeview/PlanningTreeItem.ts`
   - Add `spec?: string` field to interface

2. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Import renderSpecPhaseIndicator
   - Add spec field parsing in getChildren()
   - Integrate spec indicator in getTreeItem()
   - Add buildTooltipWithSpec() method

3. **Create**: `vscode-extension/src/test/suite/treeviewSpecIntegration.test.ts`
   - Integration tests for spec indicator display

## Success Metrics

- All stories with specs show phase indicators
- Phase counts accurately reflect spec state
- Sync warnings visible when spec/story diverge
- Performance < 500ms refresh with 50+ stories
- Cache hit rate > 80% after initial load
- User can see implementation progress at a glance

## Notes

- This is the final integration story bringing all pieces together
- Spec indicators should not clutter TreeView (only show for stories with specs)
- Tooltip enhancement provides detailed context without overwhelming main view
- Sync warnings critical for maintaining data integrity
- Consider adding click handler to jump to spec directory in future iteration
- Test with various story/spec status combinations to ensure sync logic correct
