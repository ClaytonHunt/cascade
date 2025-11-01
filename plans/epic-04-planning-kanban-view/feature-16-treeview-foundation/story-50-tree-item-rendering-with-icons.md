---
item: S50
title: Tree Item Rendering with Icons
type: story
parent: F16
status: Completed
priority: High
dependencies: [S49]
estimate: M
created: 2025-10-13
updated: 2025-10-14
spec: specs/S50-tree-item-rendering-with-icons/
---

# S50 - Tree Item Rendering with Icons

## Description

Enhance tree item rendering to include type-specific icons, tooltips with additional metadata, and proper collapsible state. This story makes the TreeView visually informative and user-friendly by providing visual cues about item types and status.

This builds on S49's basic data loading to create a polished tree presentation.

### Technical Approach

**Icon Mapping:**
```typescript
function getIconForItemType(type: ItemType): vscode.ThemeIcon {
  const iconMap: Record<ItemType, string> = {
    'project': 'project',
    'epic': 'layers',
    'feature': 'package',
    'story': 'check',
    'bug': 'bug',
    'spec': 'file-code',
    'phase': 'milestone'
  };

  return new vscode.ThemeIcon(iconMap[type]);
}
```

**TreeItem Configuration:**
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  const treeItem = new vscode.TreeItem(
    `${element.item} - ${element.title}`,
    this.getCollapsibleState(element)
  );

  // Set icon based on item type
  treeItem.iconPath = getIconForItemType(element.type);

  // Set tooltip with metadata
  treeItem.tooltip = this.buildTooltip(element);

  // Set description (right-aligned secondary text)
  treeItem.description = element.status;

  // Store element for command handling (S51)
  treeItem.contextValue = element.type;

  return treeItem;
}
```

**Tooltip Content:**
```
[E4] Planning Kanban View
Type: Epic
Status: In Progress
Priority: High
File: plans/epic-04-planning-kanban-view/epic.md
```

**Collapsible State Logic:**
- Project/Epic/Feature: `TreeItemCollapsibleState.Collapsed` (prepares for hierarchy in F17)
- Story/Bug/Spec/Phase: `TreeItemCollapsibleState.None` (leaf items)
- Even in flat tree, set correct state for future hierarchy

### Integration Points

- **S49 (TreeDataProvider)**: Enhance getTreeItem() implementation
- **types.ts**: Use ItemType enum for icon mapping
- **VSCode ThemeIcon**: Use built-in icons (theme-aware)

## Acceptance Criteria

- [ ] Each item displays appropriate icon based on type
  - Project: `project` icon
  - Epic: `layers` icon
  - Feature: `package` icon
  - Story: `check` icon
  - Bug: `bug` icon
  - Spec: `file-code` icon
  - Phase: `milestone` icon
- [ ] Icons render correctly in light and dark themes
- [ ] Item label format: "[item] - [title]" (e.g., "E4 - Planning Kanban View")
- [ ] Item description shows status (right-aligned gray text)
- [ ] Tooltip displays item metadata on hover
- [ ] Tooltip includes: item number, title, type, status, priority, file path
- [ ] Parent items (Project/Epic/Feature) show collapse arrow
- [ ] Leaf items (Story/Bug/Spec/Phase) show no arrow
- [ ] Icons use vscode.ThemeIcon for theme consistency
- [ ] No custom icon files needed (uses VSCode built-ins)

## Analysis Summary

### VSCode Icon System

**ThemeIcon vs Icon Path:**
- `vscode.ThemeIcon` - Built-in icon IDs (theme-aware, recommended)
- `iconPath` - Custom icon files (unnecessary for standard icons)
- ThemeIcon automatically adapts to theme (light/dark/high-contrast)

**Available Icons:**
VSCode provides extensive built-in icon set via ThemeIcon:
- `project`, `layers`, `package`, `check`, `bug`, `file-code`, `milestone`
- Full list: https://code.visualstudio.com/api/references/icons-in-labels

**Icon Reference:**
- Use icon ID strings (e.g., 'bug', 'check')
- VSCode maps to appropriate Codicon font glyph
- Works across all themes automatically

### Collapsible State

Even though current tree is flat (hierarchy in F17), set correct collapsible state now:
- Avoids refactoring when hierarchy is implemented
- State has no effect in flat tree (no children to collapse)
- Prepares UI for future expansion

### Tooltip Design

**Information Hierarchy:**
1. Item number and title (bold)
2. Type, Status, Priority (key metadata)
3. File path (for navigation context)

**Formatting:**
- Use markdown for tooltip (VSCode supports it)
- Keep concise but informative
- Include absolute path for clarity

## Implementation Notes

**Icon Selection Rationale:**
- `project` - Folder with special marker (projects contain epics)
- `layers` - Stacked layers (epics contain features)
- `package` - Box/package (features contain stories)
- `check` - Checkmark (stories are tasks to complete)
- `bug` - Bug symbol (standard bug representation)
- `file-code` - Code file (specs are technical documents)
- `milestone` - Flag/marker (phases are spec milestones)

**Description Field:**
- Right-aligned gray text in tree item
- Perfect for status display (e.g., "In Progress", "Ready")
- Alternative: Could show priority, estimate, or dependency count
- Status chosen for immediate visual feedback on progress

**Context Value:**
- Used by context menus (F19) to show type-specific actions
- Set to item type for now (can be refined later)
- Enables right-click menu filtering by type

## Test Strategy

**Manual Testing:**
1. Open TreeView and verify icons appear
2. Check each item type has correct icon
3. Hover over items to verify tooltip content
4. Verify description shows status correctly
5. Test in light and dark themes
6. Verify parent items show collapse arrow (even if no children yet)
7. Verify leaf items show no arrow

**Visual Regression Testing:**
1. Take screenshot of TreeView with various item types
2. Compare against expected rendering
3. Verify alignment, spacing, colors

**Unit Tests (test/treeview/PlanningTreeProvider.test.ts):**
Uses Mocha + Node.js test runner with TypeScript assertions:

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { ThemeIcon } from 'vscode';

describe('Tree Item Rendering', () => {
  it('should return correct ThemeIcon for each item type', () => {
    assert.equal(getIconForItemType('epic').id, 'layers');
    assert.equal(getIconForItemType('story').id, 'check');
    // etc.
  });

  it('should format tooltip correctly', () => {
    const tooltip = buildTooltip(mockItem);
    assert.ok(tooltip.includes('E4'));
    assert.ok(tooltip.includes('Planning Kanban View'));
  });

  it('should return correct collapsible state', () => {
    assert.equal(getCollapsibleState({type: 'epic'}), TreeItemCollapsibleState.Collapsed);
    assert.equal(getCollapsibleState({type: 'story'}), TreeItemCollapsibleState.None);
  });

  it('should set all TreeItem properties correctly', () => {
    const treeItem = provider.getTreeItem(mockPlanningItem);
    assert.ok(treeItem.iconPath instanceof ThemeIcon);
    assert.ok(treeItem.tooltip);
    assert.equal(treeItem.description, 'Ready');
  });
});
```

**No Integration Tests Required:**
- Icon rendering is VSCode framework responsibility
- Manual verification sufficient for UI elements
