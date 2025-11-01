---
item: E5
title: Rich TreeView Visualization
type: epic
parent: P2
status: In Progress
priority: High
dependencies: []
created: 2025-10-23
updated: 2025-10-24
---

# E5 - Rich TreeView Visualization

## Description

Comprehensive redesign of the Cascade TreeView to match the ChatGPT-generated reference design. This epic transforms the current basic TreeView into a visually rich, information-dense interface with progress bars, spec phase tracking, enhanced status badges, and improved typography.

The redesign maintains all existing functionality (drag-and-drop, context menus, keyboard shortcuts, real-time sync) while significantly enhancing the visual presentation and information density of the TreeView.

## Objectives

- **Enhanced Visual Design**: Implement colored status badges, progress bars, and rich typography
- **Spec Phase Integration**: Display spec phase progress inline within tree items
- **Progress Indicators**: Show completion counts (e.g., "9/9") and visual progress bars
- **Improved Information Architecture**: Better use of TreeItem properties (label, description, tooltip)
- **Maintain Performance**: Ensure caching strategy handles additional rendering complexity
- **Dark Theme Optimization**: Design optimized for VSCode dark themes

## Reference Design

**Design Source**: `c:/Users/Clayton/Downloads/ChatGPT Image Oct 23, 2025, 07_09_15 PM.png`

The target design (from ChatGPT image) includes:

1. **Type Labels**: "Epic", "Feature", "Story", "Spec" prefixes before item titles
2. **Status Badges**: Colored pill-shaped badges with rounded corners
   - Yellow/Gold for "In Progress"
   - Blue for "Ready"
   - Green for "Completed"
   - Orange/Red for "Blocked"
3. **Progress Bars**: **Graphical colored progress bars** (NOT text-based Unicode)
   - Horizontal bar with colored fill (green for completed, blue for in-progress)
   - Percentage display (e.g., "50%")
   - Completion counts shown separately (e.g., "9/9")
   - Positioned on same line as item or below
4. **Spec Phase Tracking**: Individual checkmarks and progress bars for spec phases
   - ✓ Spec Phase 1 with green progress bar: "Completed"
   - ✓ Spec Phase 2 with blue progress bar: "Ready"
   - Progress bar for each phase showing sub-task completion
5. **Rich Icons**: Status-specific icons
   - ✓ green checkmarks for completed items
   - ⚠️ orange warning icons for blocked items
6. **Enhanced Typography**: Different text colors for different information types
   - Item titles in white/primary color
   - Status badges with background colors
   - Completion counts in muted colors
7. **Hierarchical Indentation**: Clear visual hierarchy with expand/collapse arrows

**IMPORTANT - Technical Limitation Discovery (2025-10-25)**:

The reference design shows **graphical/visual progress bars** with rounded corners and smooth color gradients. After researching VSCode's TreeView API (latest 2024-2025), this level of custom rendering is **NOT achievable** without using WebviewView, which requires:
- Complete TreeView reimplementation from scratch (2-3 weeks)
- Loss of all native features (drag-drop, keyboard nav, VSCode theming)
- Significant performance penalties
- High maintenance burden
- Webview UI Toolkit was deprecated January 1, 2025

**Pragmatic Approach Chosen**: Enhanced Unicode progress bars with FileDecorationProvider for colored badges. This achieves ~60% visual similarity while retaining all native VSCode features and performance. See F24 for technical decision details.

## Scope

### In Scope
- Redesign getTreeItem() to use TreeItemLabel and rich descriptions
- Implement custom TreeItem rendering with status badges
- Add progress bar rendering using Unicode characters or custom decorations
- Integrate spec phase data into tree items
- Enhance color scheme and typography
- Update all TreeView rendering code
- Maintain existing drag-and-drop functionality
- Maintain existing context menu actions
- Maintain existing keyboard shortcuts

### Out of Scope
- Changes to underlying data models (PlanningTreeItem, StatusGroupNode)
- Changes to hierarchy building logic (HierarchyNode, StatusPropagationEngine)
- Changes to caching infrastructure (FrontmatterCache, items cache)
- Changes to file system watching or refresh logic
- New TreeView features beyond visual redesign

## Architecture Impact

### Current Architecture
- **getTreeItem()**: Returns basic TreeItem with label string and icon
- **TreeItem.label**: Simple string (e.g., "S49 - TreeDataProvider Core Implementation")
- **TreeItem.description**: Simple progress string (e.g., "(3/5)")
- **TreeItem.iconPath**: ThemeIcon with status-based colors

### Target Architecture
- **getTreeItem()**: Returns enhanced TreeItem with TreeItemLabel and rich description
- **TreeItem.label**: TreeItemLabel object with highlights and formatting
- **TreeItem.description**: Rich string with colored badges and progress bars
- **TreeItem.tooltip**: Markdown string with detailed information
- **Custom Rendering**: Potential use of TreeItem decorations or custom rendering

## Key Technical Challenges

1. **VSCode TreeItem Limitations**: TreeItem API has limited styling capabilities - may need creative workarounds
2. **Progress Bar Rendering**: Need to use Unicode box-drawing characters or custom decorations
3. **Spec Phase Data Integration**: Need to read spec directory structure without slowing down tree rendering
4. **Performance**: Additional rendering complexity must not degrade TreeView responsiveness
5. **Theme Compatibility**: Design must work with light and dark VSCode themes

## Success Metrics

- TreeView matches reference design visually (90%+ similarity)
- No performance degradation (< 500ms refresh time with 100+ items)
- All existing features continue to work (drag-and-drop, context menus, shortcuts)
- User can understand item status and progress at a glance
- Positive user feedback on visual design improvements

## Dependencies

- Existing TreeView infrastructure (PlanningTreeProvider, caching, hierarchy)
- Spec directory structure and frontmatter schema
- VSCode TreeView API (1.80.0+)

## Child Items

### Completed Features
- **F22**: Archive Support - Priority: High - Status: In Progress

### Planned Features
- **F23**: Status Badge Rendering - Priority: High - Status: In Progress
- **F24**: Progress Bar Implementation - Priority: High - Status: Not Started
- **F25**: Spec Phase Integration - Priority: Medium - Status: Not Started
- **F26**: Enhanced Typography and Colors - Priority: Medium - Status: Not Started
- **F27**: TreeItemLabel Migration - Priority: Low - Status: Not Started
- **F28**: TreeView Display Mode Toggle - Priority: High - Status: Not Started

### Feature Summary

**F22 - Archive Support**: Implement comprehensive archive support with "Archived" status, directory detection, and toggle filtering (1/6 stories completed)

**F23 - Status Badge Rendering**: Implement colored pill-shaped status badges using VSCode theme colors and Unicode characters

**F24 - Progress Bar Implementation**: Add visual progress bars with Unicode box-drawing characters showing completion percentages and child counts

**F25 - Spec Phase Integration**: Display spec phase progress inline with Story items, showing completed/total phases and sync status

**F26 - Enhanced Typography and Colors**: Add type labels (Epic, Feature, Story) with improved color scheme and hierarchical styling

**F27 - TreeItemLabel Migration**: Migrate to VSCode TreeItemLabel API for rich text formatting and highlights

**F28 - TreeView Display Mode Toggle**: Add ability to switch between Status-grouped view (current) and Hierarchy view (P→E→F→S structure matching ChatGPT mockup). Includes workspace state persistence, toggle command, and toolbar button. Default to Hierarchy view.
