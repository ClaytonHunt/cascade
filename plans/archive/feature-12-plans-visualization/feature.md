---
item: F12
title: Plans Directory Visualization
type: feature
status: In Progress
priority: High
dependencies: [F11]
created: 2025-10-12
updated: 2025-10-13
---

# F12 - Plans Directory Visualization

## Description

Implement file decorations (icons and badges) for the `plans/` directory structure, showing hierarchical status tracking for Projects, Epics, Features, Stories, and Bugs. Parent items display aggregate completion counts, while leaf items show individual status icons.

## Objectives

- Display status icons for Stories and Bugs based on frontmatter status field
- Show aggregate completion badges for Epics and Features (e.g., "2/5")
- Implement FileDecorationProvider for plans directory
- Support status types: Not Started, In Planning, Ready, In Progress, Blocked, Completed
- Update decorations in real-time when files change
- Design icons that work in light and dark themes

## Scope

- FileDecorationProvider implementation for plans directory
- Status-to-icon mapping for all status values
- Hierarchical progress calculation (count completed children)
- Badge rendering for parent items (Epics, Features)
- Icon rendering for leaf items (Stories, Bugs)
- Tooltip text showing detailed status information
- Theme-aware icon design

## Acceptance Criteria

- Epics show badge with format "X/Y" where X is completed features, Y is total features
- Features show badge with format "X/Y" where X is completed stories/bugs, Y is total
- Stories/Bugs show status icon based on frontmatter `status` field
- Decorations update within 1 second of file changes
- Icons are visible and distinguishable in both light and dark themes
- Tooltips provide additional context (e.g., "Epic: 2 of 5 features completed")
- No visual conflicts with git status decorations

## Status Icon Mapping

- **Not Started**: ⚪ (hollow circle)
- **In Planning**: 📝 (clipboard/document)
- **Ready**: ✅ (checkmark)
- **In Progress**: ⏳ (hourglass) or 🔵 (blue circle)
- **Blocked**: 🚫 (blocked sign) or ⛔ (red circle)
- **Completed**: ✔️ (check mark) or 🟢 (green circle)

## Technical Notes

**VSCode APIs:**
- `vscode.window.registerFileDecorationProvider` - Register decoration provider
- `vscode.FileDecoration` - Decoration object with badge and tooltip
- `vscode.EventEmitter` - Emit decoration change events

**Hierarchical Calculation:**
```typescript
// For Epic: count completed/total features in epic folder
// For Feature: count completed/total stories in feature folder
function calculateProgress(folderUri: vscode.Uri): {completed: number, total: number} {
  // Parse all child item files
  // Count items with status === "Completed"
  // Return {completed, total}
}
```

**Performance:**
- Cache aggregated counts per folder
- Invalidate cache when child files change
- Use debouncing to batch decoration updates

## Child Items

### Implementation Stories (7)

1. **S41: FileDecorationProvider Foundation** - Priority: High - Status: Not Started
   - Create core infrastructure for registering FileDecorationProvider
   - Implement provider interface with provideFileDecoration() method
   - Filter decorations to plans/ directory only
   - Register provider in extension.ts with proper disposal

2. **S42: Status Icon Mapping** - Priority: High - Status: Not Started
   - Map frontmatter status values to visual icons
   - Define icons for all 6 status types (Not Started, In Planning, Ready, In Progress, Blocked, Completed)
   - Ensure icons work in light and dark themes
   - Create helper function for status-to-icon translation

3. **S43: File Type Detection** - Priority: High - Status: Not Started
   - Implement logic to detect file type from path patterns
   - Distinguish between leaf items (stories/bugs) and parent items (features/epics/projects)
   - Handle edge cases (unknown files, non-standard naming)
   - Support both path-based and frontmatter-based detection

4. **S44: Leaf Item Decorations** - Priority: High - Status: Not Started
   - Display status icons for stories and bugs
   - Integrate with frontmatter cache for status retrieval
   - Show tooltips with item type, title, and status
   - Handle files without frontmatter gracefully

5. **S45: Hierarchical Progress Calculation** - Priority: High - Status: Not Started
   - Calculate completion statistics for parent items
   - Count completed/total children (features count features, epics count features, project counts epics)
   - Implement progress caching with invalidation on child changes
   - Optimize performance for large directories

6. **S46: Parent Item Badge Decorations** - Priority: High - Status: Not Started
   - Display "X/Y" completion badges for features, epics, and projects
   - Color-code badges based on completion percentage (green ≥75%, yellow ≥50%, red <50%)
   - Show detailed tooltips with progress information
   - Update badges when child item status changes

7. **S47: Real-time Decoration Updates** - Priority: High - Status: Not Started
   - Integrate with FileSystemWatcher for automatic refresh
   - Refresh decorations within 1 second of file changes
   - Update parent badges when child status changes
   - Implement batching to prevent excessive refreshes

### Implementation Order

**Phase 1 - Foundation (S41, S42, S43):**
- Establish decoration infrastructure
- Define icon system
- Implement file type detection
- Estimated time: 3-4 days

**Phase 2 - Basic Decorations (S44):**
- Show status icons for leaf items
- First visible feature (stories/bugs decorated)
- Estimated time: 2-3 days

**Phase 3 - Hierarchical Progress (S45, S46):**
- Calculate and display parent progress
- Complete hierarchical visualization
- Estimated time: 4-5 days

**Phase 4 - Real-time Updates (S47):**
- Wire up automatic refresh
- Polish user experience
- Estimated time: 1-2 days

**Total Estimated Time: 10-14 days**

## Dependencies

- **F11**: Extension Infrastructure (requires file watching and frontmatter parsing)

## Analysis Summary

**Files to Decorate:**
- Project files: `plans/project.md`
- Epic folders: `plans/epic-##-name/`
- Epic files: `plans/epic-##-name/epic.md`
- Feature folders: `plans/epic-##-name/feature-##-name/`
- Feature files: `plans/epic-##-name/feature-##-name/feature.md`
- Story files: `plans/epic-##-name/feature-##-name/story-##-name.md`
- Bug files: `plans/epic-##-name/feature-##-name/bug-##-name.md`

**Hierarchy:**
```
plans/
├── project.md (aggregate epic count)
└── epic-##-name/
    ├── epic.md (aggregate feature count: "2/5")
    └── feature-##-name/
        ├── feature.md (aggregate story count: "3/8")
        ├── story-##.md (status icon)
        └── bug-##.md (status icon)
```

**Integration Points:**
- Uses F11's file watching system
- Uses F11's frontmatter parser
- Decorations applied via FileDecorationProvider API
