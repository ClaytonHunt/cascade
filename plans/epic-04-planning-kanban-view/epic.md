---
item: E4
title: Planning Kanban View
type: epic
parent: P2
status: Completed
priority: High
dependencies: []
created: 2025-10-13
updated: 2025-10-15
---

# E4 - Planning Kanban View

## Description

Create a custom TreeView panel in the Cascade VSCode extension that displays the planning hierarchy (Epic → Feature → Story/Bug) in a vertical kanban layout organized by status. This replaces the file decoration approach with a dedicated interactive view that provides better UX for managing planning items.

The view will display items in a hierarchical tree structure grouped by status columns (Not Started → In Planning → Ready → In Progress → Blocked → Completed), allowing users to see the entire planning pipeline at a glance and interact with items through drag-and-drop status transitions, context menus, and inline actions.

### Key Features

**Visual Organization:**
- Hierarchical tree display showing Epic → Feature → Story/Bug relationships
- Vertical kanban layout with status-based grouping
- Expandable/collapsible nodes for managing complexity
- Inline status badges and progress indicators for parent items

**Interaction:**
- Drag-and-drop items between status columns to update status
- Context menu actions (change status, open file, create child items)
- Click to open corresponding markdown file in editor
- Activity Bar icon for quick access to view

**Data Integration:**
- Bidirectional sync with markdown frontmatter (status changes update files)
- Real-time updates via FileSystemWatcher integration
- Leverages existing cache layer (S40) and parser (S39)
- Uses existing status icons (S42) for visual consistency

### Benefits Over File Decoration Approach

1. **Better Information Density**: See entire planning pipeline in one view instead of scattered across file explorer
2. **Status-Based Organization**: Natural kanban flow shows work progression
3. **Hierarchical Context**: See parent-child relationships clearly without navigating directories
4. **Direct Manipulation**: Drag-and-drop status changes vs. manual file editing
5. **Progress Visibility**: Parent items show aggregate progress of children
6. **Focused Workflow**: Dedicated view reduces cognitive load vs. file tree clutter

## Analysis Summary

### Reusable Infrastructure

Existing completed work from archived E3 that remains valuable:

- **S39 (YAML Frontmatter Parser)**: ✅ Complete - parses planning item frontmatter
  - File: `vscode-extension/src/parser.ts`
  - Exports: `parseFrontmatter(content: string)`

- **S40 (Frontmatter Cache Layer)**: ✅ Complete - caches parsed frontmatter
  - File: `vscode-extension/src/cache.ts`
  - Class: `FrontmatterCache`
  - Methods: `get()`, `invalidate()`, `clear()`, `getStats()`

- **S38 (File System Watcher)**: ✅ Complete - watches plans/ and specs/ directories
  - Implementation: `extension.ts` `createFileSystemWatchers()`
  - Integrates with cache invalidation

- **S42 (Status Icon Mapping)**: ⚠️ Adapt for TreeView - maps status to icons
  - File: `vscode-extension/src/statusIcons.ts`
  - Current: Returns `FileDecoration` for Explorer badges (to be removed)
  - New: Refactor to return icon identifiers for TreeView items
  - Reuse: STATUS_BADGES and STATUS_COLORS mappings

### New Implementation Required

**VSCode API Patterns:**
- `vscode.TreeDataProvider` - Core interface for TreeView data
- `vscode.window.createTreeView()` - Register TreeView in Activity Bar
- `vscode.TreeItem` - Individual tree node representation
- `vscode.TreeDragAndDropController` - Drag-and-drop status changes
- Activity Bar contribution in `package.json`

**Data Loading:**
- Scan `plans/` directory for markdown files
- Parse frontmatter using existing `parseFrontmatter()`
- Build hierarchical tree structure based on directory layout
- Group items by status for kanban columns

**Update Flow:**
- User drags item to new status column
- Update markdown file frontmatter `status:` field
- FileSystemWatcher detects change
- Cache invalidates
- TreeView refreshes

### Architecture Decisions

**TreeView Structure:**
```
Cascade (root)
├─ Not Started
│  ├─ Epic 01
│  │  ├─ Feature 03
│  │  │  ├─ Story 15
│  │  │  └─ Story 16
├─ In Planning
│  ├─ Feature 04
│  │  └─ Story 17
├─ Ready
│  ├─ Story 18
│  └─ Story 19
├─ In Progress
│  └─ Story 20
├─ Blocked
└─ Completed
   └─ Epic 02
      └─ Feature 01 (100%)
         ├─ Story 10 ✅
         └─ Story 11 ✅
```

**Status-First vs. Hierarchy-First:**
- **Chosen**: Status-first grouping (kanban columns)
- **Rationale**: Users care most about "what's ready" or "what's blocked"
- Alternative: Hierarchy-first with status badges (more complex navigation)

**Drag-and-Drop Scope:**
- Stories/Bugs only (leaf items)
- Parent items (Epics/Features) status derived from children
- Prevents accidental hierarchy changes

## Child Items

**Implementation Order: F16 → F17 → F18 → F19 → F20 → F21**

### Created Features

- **F16**: TreeView Foundation - Priority: High, Status: Not Started
  - File: `plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/feature.md`
  - Activity Bar integration, TreeDataProvider, basic item rendering, click-to-open

- **F17**: Status-Based Kanban Layout - Priority: High, Status: Completed ✅, Depends: [F16]
  - File: `plans/epic-04-planning-kanban-view/feature-17-status-based-kanban-layout/feature.md`
  - Status column grouping, hierarchical display, progress indicators, icon integration

- **F18**: Drag-and-Drop Status Transitions - Priority: High, Status: Not Started, Depends: [F17]
  - File: `plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/feature.md`
  - TreeDragAndDropController, frontmatter updates, status transition validation

- **F19**: Context Menu Actions - Priority: Medium, Status: Not Started, Depends: [F18]
  - File: `plans/epic-04-planning-kanban-view/feature-19-context-menu-actions/feature.md`
  - Right-click actions, keyboard shortcuts, create child items, command palette

- **F20**: Real-Time Synchronization - Priority: Medium, Status: Not Started, Depends: [F19]
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/feature.md`
  - FileSystemWatcher integration, cache invalidation, debouncing, external change detection

- **F21**: Remove File Decoration System - Priority: Low, Status: Not Started, Depends: [F20]
  - File: `plans/epic-04-planning-kanban-view/feature-21-remove-file-decoration/feature.md`
  - Cleanup of E3 file decoration approach, unregister provider, refactor statusIcons.ts

## Acceptance Criteria

- [ ] File decoration system completely removed (no Explorer badges)
- [ ] Explorer shows files in original undecorated state
- [ ] Custom TreeView visible in VSCode Activity Bar
- [ ] Planning items displayed hierarchically grouped by status
- [ ] Drag-and-drop changes item status and updates markdown file
- [ ] Context menu provides status change and file operations
- [ ] Parent items show progress indicators (e.g., "3/5 complete")
- [ ] TreeView updates in real-time when files change
- [ ] Clicking item opens corresponding markdown file
- [ ] Status icons adapted from statusIcons.ts for TreeView
- [ ] Works with existing plans/ directory structure
- [ ] Performance acceptable with 100+ planning items

## Next Steps

1. Run `/plan #E4` to break Epic into Features
2. Prioritize Features based on MVP scope
3. Break priority Feature into Stories
4. Implement Stories using `/spec` and `/build` workflow
