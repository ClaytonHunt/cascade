---
item: S55
title: Hierarchical Item Display
type: story
parent: F17
status: Completed
priority: High
dependencies: [S54]
estimate: L
spec: specs/S55-hierarchical-item-display/
created: 2025-10-14
updated: 2025-10-14
---

# S55 - Hierarchical Item Display

## Description

Implement Epic → Feature → Story/Bug hierarchical relationships within each status group. Items are displayed with proper parent-child nesting, showing the directory structure as a tree hierarchy.

This story transforms the flat item list into a structured hierarchy that reflects the actual project organization.

### Key Requirements

**Hierarchy Detection:**
- Parse directory structure to determine parent-child relationships
- Epic files in `epic-XX-name/epic.md`
- Feature files in `epic-XX-name/feature-YY-name/feature.md`
- Story/Bug files in `epic-XX-name/feature-YY-name/story-ZZ-name.md`
- Detect relationships from file paths

**Tree Structure:**
```
Ready (5)
├─ Epic 04 - Planning Kanban View
│  ├─ Feature 16 - TreeView Foundation
│  │  └─ Story 53 - Specs-to-Plans Progress Sync
│  └─ Feature 17 - Status-Based Kanban Layout
└─ Story 19 - Progressive Disclosure UI
```

**Parent-Child Logic:**
- Epic → Contains Features (same epic directory)
- Feature → Contains Stories/Bugs (same feature directory)
- Story/Bug → Leaf nodes (no children)
- Orphan items (no parent) displayed at top of status group

**Collapsible State:**
- Epics and Features: Collapsed by default (expandable)
- Stories and Bugs: None (leaf nodes)
- Preserve collapse state across refreshes (VSCode handles this)

**Item Ordering Within Status:**
1. Orphan items first (no parent)
2. Epic items (sorted by item number)
3. Within Epic: Features (sorted by item number)
4. Within Feature: Stories/Bugs (sorted by item number)

### Technical Implementation

**Hierarchy Builder:**
```typescript
interface ItemHierarchy {
  epic?: PlanningTreeItem;
  feature?: PlanningTreeItem;
  item: PlanningTreeItem;
  children?: ItemHierarchy[];
}

/**
 * Builds hierarchical structure from flat list of items.
 * Groups items by parent-child relationships detected from file paths.
 */
private buildHierarchy(items: PlanningTreeItem[]): ItemHierarchy[] {
  // Parse file paths to extract parent relationships
  const epicMap = new Map<string, PlanningTreeItem>();
  const featureMap = new Map<string, PlanningTreeItem>();
  const storyMap = new Map<string, PlanningTreeItem[]>();

  for (const item of items) {
    const pathParts = this.parseItemPath(item.filePath);

    if (item.type === 'epic') {
      epicMap.set(pathParts.epicDir, item);
    } else if (item.type === 'feature') {
      featureMap.set(pathParts.featureDir, item);
    } else {
      // Story or Bug - group by parent feature
      const key = pathParts.featureDir || 'orphan';
      if (!storyMap.has(key)) {
        storyMap.set(key, []);
      }
      storyMap.get(key)!.push(item);
    }
  }

  // Build tree structure
  const roots: ItemHierarchy[] = [];

  // Process epics as root nodes
  for (const [epicDir, epic] of epicMap) {
    const epicNode: ItemHierarchy = {
      epic: epic,
      item: epic,
      children: []
    };

    // Find features under this epic
    for (const [featureDir, feature] of featureMap) {
      if (featureDir.startsWith(epicDir)) {
        const featureNode: ItemHierarchy = {
          epic: epic,
          feature: feature,
          item: feature,
          children: []
        };

        // Find stories under this feature
        const stories = storyMap.get(featureDir) || [];
        for (const story of stories) {
          featureNode.children!.push({
            epic: epic,
            feature: feature,
            item: story
          });
        }

        epicNode.children!.push(featureNode);
      }
    }

    roots.push(epicNode);
  }

  // Add orphan features (no parent epic)
  // Add orphan stories (no parent feature)

  return roots;
}
```

**Path Parser:**
```typescript
interface ItemPathParts {
  epicDir?: string;      // "epic-04-planning-kanban-view"
  featureDir?: string;   // "epic-04-.../feature-17-status-based-kanban-layout"
  itemFile: string;      // "story-54-status-column-grouping.md"
}

private parseItemPath(filePath: string): ItemPathParts {
  // Extract directory structure from file path
  // Match patterns: epic-XX-name/, feature-YY-name/, story-ZZ-name.md
}
```

**Modified getChildren():**
```typescript
async getChildren(element?: any): Promise<any[]> {
  if (!element) {
    // Root level: return status groups
    return this.getStatusGroups();
  }

  if (element.type === 'status-group') {
    // Status group: return items with hierarchy
    const items = await this.getItemsForStatus(element.status);
    const hierarchy = this.buildHierarchy(items);
    return this.flattenTopLevel(hierarchy);  // Return top-level items only
  }

  if (element.type === 'epic') {
    // Epic clicked: return child features
    return this.getChildrenForEpic(element);
  }

  if (element.type === 'feature') {
    // Feature clicked: return child stories/bugs
    return this.getChildrenForFeature(element);
  }

  // Story/Bug: no children
  return [];
}
```

**Collapsible State:**
```typescript
private getCollapsibleState(element: PlanningTreeItem, hasChildren: boolean): vscode.TreeItemCollapsibleState {
  if (!hasChildren) {
    return vscode.TreeItemCollapsibleState.None;
  }

  // Parent items default to collapsed
  if (element.type === 'epic' || element.type === 'feature') {
    return vscode.TreeItemCollapsibleState.Collapsed;
  }

  return vscode.TreeItemCollapsibleState.None;
}
```

### Integration Points

**Dependencies:**
- S54 (Status Column Grouping) - Extends status node children logic
- PlanningTreeProvider.ts - Adds hierarchy building and traversal
- File path parsing utilities

**Caching Strategy:**
- Cache hierarchy per status group
- Invalidate cache on file changes (via FileSystemWatcher from S38)
- Avoid rebuilding hierarchy on every expand/collapse

### Testing Approach

**Unit Tests:**
- parseItemPath() correctly extracts directory structure
- buildHierarchy() creates correct parent-child relationships
- getChildrenForEpic() returns correct features
- getChildrenForFeature() returns correct stories
- Orphan items handled properly
- Empty parent items show no children

**Manual Verification:**
- Epic → Feature → Story hierarchy displays correctly
- Expanding epic shows features
- Expanding feature shows stories
- Collapsing works correctly
- Item ordering correct within each level
- Mixed hierarchy (orphans + structured) renders properly

## Acceptance Criteria

- [ ] Epic → Feature → Story/Bug hierarchy displays correctly
- [ ] Items grouped by directory structure
- [ ] Parent items show child count indicator
- [ ] Expanding epic reveals child features
- [ ] Expanding feature reveals child stories/bugs
- [ ] Collapsing hides children
- [ ] Orphan items (no parent) display at top of status group
- [ ] Item ordering correct within each level
- [ ] Visual indentation shows hierarchy depth
- [ ] Collapsible state persists across refreshes
- [ ] Performance acceptable with deep hierarchies

## Analysis Summary

**Complexity:**
- File path parsing to detect relationships
- Multi-level tree traversal
- Caching for performance
- Edge cases: orphans, missing parents, cross-references

**VSCode Patterns:**
- Dynamic getChildren() based on node type
- Lazy loading (only fetch children when expanded)
- Collapsible state management

**Existing Infrastructure:**
- File paths available in PlanningTreeItem
- Directory structure follows consistent pattern
- FileSystemWatcher already monitoring changes
