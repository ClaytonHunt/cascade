---
spec: S55
title: Hierarchical Item Display
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-14
updated: 2025-10-14
---

# S55 - Hierarchical Item Display

## Implementation Strategy

This specification transforms the flat list of planning items within each status group into a hierarchical tree structure that reflects the Epic → Feature → Story/Bug organization. The implementation parses file paths to detect parent-child relationships and builds a tree hierarchy for display in the VSCode TreeView.

### Architecture Overview

**Current State (S54):**
```
Ready (5)
├─ E4 - Planning Kanban View
├─ F16 - TreeView Foundation
├─ F17 - Status-Based Kanban Layout
├─ S53 - Specs-to-Plans Progress Sync
└─ S19 - Progressive Disclosure UI
```

**Target State (S55):**
```
Ready (5)
├─ E4 - Planning Kanban View
│  ├─ F16 - TreeView Foundation
│  │  └─ S53 - Specs-to-Plans Progress Sync
│  └─ F17 - Status-Based Kanban Layout
└─ S19 - Progressive Disclosure UI (orphan)
```

### Key Design Decisions

**1. Path-Based Hierarchy Detection**
- Parse file paths to extract parent-child relationships
- Epic files: `epic-XX-name/epic.md`
- Feature files: `epic-XX-name/feature-YY-name/feature.md`
- Story/Bug files: `epic-XX-name/feature-YY-name/story-ZZ-name.md`
- No database or index required - directory structure is source of truth

**2. Lazy Loading Tree Traversal**
- VSCode TreeView supports lazy loading via `getChildren()`
- Only compute children when parent node is expanded
- Cache hierarchy structure per status group to avoid repeated parsing
- Invalidate cache on file system changes (existing FileSystemWatcher from S38)

**3. Orphan Handling**
- Items without parent directories displayed at top level of status group
- Examples: standalone stories, features without epic
- Ensures all items are always visible

**4. Collapsible State Management**
- Epics default to Collapsed (expandable to show features)
- Features default to Collapsed (expandable to show stories/bugs)
- Stories/Bugs have no children (None state)
- VSCode persists collapse state across refreshes automatically

**5. Item Ordering**
- Within each hierarchy level: sort by item number (numeric)
- Orphan items displayed first, then hierarchical items
- Type ordering: Epic → Feature → Story/Bug

### Integration Points

**Modified Components:**
- `PlanningTreeProvider.getChildren()` - Add hierarchy logic for planning items
- `PlanningTreeProvider.getTreeItem()` - Update collapsible state based on children
- New method: `buildHierarchy()` - Parse paths and construct tree
- New method: `parseItemPath()` - Extract directory structure from file path
- New method: `getChildrenForItem()` - Return child items for parent nodes

**Data Flow:**
1. Status group expanded → `getChildren(statusGroup)` called
2. Load all items with that status (existing `getItemsForStatus()`)
3. Parse file paths to detect hierarchy
4. Return top-level items (epics + orphans)
5. Epic expanded → `getChildren(epic)` returns child features
6. Feature expanded → `getChildren(feature)` returns child stories/bugs

**Unchanged Components:**
- `getStatusGroups()` - Root level status groups (no changes)
- `loadAllPlanningItems()` - File scanning and parsing (no changes)
- `FrontmatterCache` - Already provides file paths
- Status group rendering (S54 implementation)

### Caching Strategy

**Cache Hierarchy Per Status:**
- Key: Status value ("Ready", "In Progress", etc.)
- Value: Hierarchical structure of items
- Invalidation: FileSystemWatcher events (file add/change/delete)
- Benefit: Avoid rebuilding hierarchy on every expand/collapse

**Implementation:**
```typescript
private hierarchyCache = new Map<Status, HierarchyNode[]>();

private invalidateCache(): void {
  this.hierarchyCache.clear();
  this.refresh(); // Trigger TreeView reload
}
```

**FileSystemWatcher Integration:**
- Already implemented in extension.ts (S38)
- Already calls `provider.refresh()` on file changes
- Add cache invalidation before refresh

### Risk Assessment

**Low Risk:**
- File path parsing is deterministic and testable
- VSCode TreeView handles lazy loading automatically
- Existing caching infrastructure can be reused

**Medium Risk:**
- Edge case: Orphan items (no parent) must be handled correctly
- Edge case: Circular references (shouldn't exist but need safeguard)
- Performance: Deep hierarchies (5+ levels) may cause lag
  - Mitigation: Lazy loading + caching

**Testing Considerations:**
- Unit tests for path parsing logic
- Unit tests for hierarchy building with various structures
- Manual testing with mixed hierarchies (orphans + structured)
- Performance testing with large number of items (100+)

## Phase Overview

### Phase 1: Path Parsing and Hierarchy Data Structure
**Goal:** Implement file path parsing and hierarchy data model
- Create `HierarchyNode` interface for tree structure
- Implement `parseItemPath()` to extract directory information
- Unit tests for path parsing edge cases
- No UI changes - foundation only

### Phase 2: Hierarchy Building Logic
**Goal:** Build hierarchical tree from flat item list
- Implement `buildHierarchy()` to construct parent-child relationships
- Implement `getChildrenForItem()` for lazy loading
- Add hierarchy caching with invalidation
- Unit tests for hierarchy construction

### Phase 3: TreeView Integration and Testing
**Goal:** Integrate hierarchy into TreeView and verify behavior
- Modify `getChildren()` to use hierarchy logic
- Update `getTreeItem()` collapsible state based on children
- Connect cache invalidation to FileSystemWatcher
- Manual testing and verification

## Success Criteria

- [ ] Epic → Feature → Story/Bug hierarchy displays correctly in TreeView
- [ ] Expanding epic reveals child features
- [ ] Expanding feature reveals child stories/bugs
- [ ] Collapsing hides children correctly
- [ ] Orphan items (no parent) display at top of status group
- [ ] Item ordering correct within each hierarchy level
- [ ] Visual indentation shows hierarchy depth
- [ ] Collapsible state persists across TreeView refreshes (VSCode default)
- [ ] Performance acceptable with deep hierarchies (no lag on expand)
- [ ] Cache invalidates correctly on file system changes
- [ ] All unit tests pass
- [ ] Manual testing with various hierarchy structures confirms correct behavior
