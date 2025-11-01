---
item: F24
title: Progress Bar Implementation
type: feature
parent: E5
status: Completed
priority: High
dependencies: []
estimate: L
created: 2025-10-23
updated: 2025-10-25
---

# F24 - Progress Bar Implementation

## Description

Implement **graphical colored progress bars** to display completion percentages and child item counts, matching the ChatGPT reference design. Progress bars provide immediate visual feedback on Epic, Feature, and Spec completion status directly in the TreeView.

**Reference Design**: `c:/Users/Clayton/Downloads/ChatGPT Image Oct 23, 2025, 07_09_15 PM.png`

This feature adds graphical progress bar visualization as shown in the reference design:
- **Colored horizontal bars** (green for completed, blue for in-progress)
- **Percentage display** alongside the bar
- **Completion counts** (e.g., "9/9")
- **NOT** text-based Unicode blocks (█░) - requires custom rendering

**Note**: S88-S90 (completed) implemented Unicode text-based progress bars, which do NOT match the ChatGPT design. Those stories are superseded by this feature's requirements for graphical progress bars.

## Objectives

- **Graphical Progress Bars**: Render colored horizontal progress bars (not Unicode text blocks)
- **Color Coding**: Green for completed sections, blue for in-progress sections
- **Completion Counts**: Display "completed/total" counts alongside bars (e.g., "9/9")
- **Percentage Display**: Show completion percentage (e.g., "50%")
- **Hierarchical Progress**: Calculate progress for Epics, Features, and Specs based on child items
- **Custom Rendering**: Implement VSCode API workarounds for graphical elements in TreeView
- **Performance**: Maintain < 500ms refresh time with 100+ items

## Reference Design (from ChatGPT Image)

**IMPORTANT**: The design shows **graphical colored progress bars**, NOT Unicode text blocks.

From the ChatGPT reference design:
- **Bar Format**: Horizontal colored bar (graphical, not text)
- **Filled Segment**: Solid color (green for completed, blue for in-progress)
- **Empty Segment**: Gray/dimmed background
- **Bar Length**: Proportional to available space, typically 50-100px width
- **Position**: Appears inline with item or on separate line below
- **Percentage**: Displayed at end of bar (e.g., "50%")
- **Counts**: Displayed separately (e.g., "9/9")

Example from reference image:
```
Epic                Cascade VSC Extension         [In Progress]
  Feature           Extension Infrastructure      [Ready]
    Story           Testing System Plugin         [In Progress]
      ✓ Spec Phase 1  ████████████ Completed
      ✓ Spec Phase 2  ████████ Ready
      Tree Child Items                            [Completed]
        9/9 ████████████████ Ready
```

**Key Difference from S88-S90**: The completed implementation used Unicode text (`█░`), but the reference design shows graphical bars with colors. This requires a different technical approach.

## Acceptance Criteria

1. **Progress Calculation**:
   - [ ] Epics calculate progress from completed Features
   - [ ] Features calculate progress from completed Stories/Bugs
   - [ ] Specs calculate progress from completed Phases
   - [ ] Projects calculate progress from completed Epics
   - [ ] Progress rounds to nearest integer percentage

2. **Visual Rendering**:
   - [ ] Progress bar uses 10 Unicode block characters
   - [ ] Filled blocks represent completed percentage
   - [ ] Empty blocks represent remaining percentage
   - [ ] Bar scales correctly (e.g., 30% = 3 filled, 7 empty)
   - [ ] Bar rendering works in monospace and proportional fonts

3. **Count Display**:
   - [ ] Format: `(completed/total)` after percentage
   - [ ] Counts reflect direct children only (not grandchildren)
   - [ ] Zero-child items show no progress bar (leaf nodes)
   - [ ] Single-child items show `(1/1)` when completed

4. **TreeItem Integration**:
   - [ ] Progress bar appears in TreeItem.description
   - [ ] Progress updates when child status changes (via propagation)
   - [ ] Progress bar positioned after status badge (if both present)
   - [ ] Long descriptions truncate gracefully (no overflow)

5. **Performance**:
   - [ ] Progress calculation cached (not recomputed on every render)
   - [ ] Bar rendering < 1ms per item
   - [ ] No observable lag with 100+ items

6. **Edge Cases**:
   - [ ] Items with 0 children show no progress bar
   - [ ] Items with 100% completion show full bar: `██████████ 100%`
   - [ ] Items with 0% completion show empty bar: `░░░░░░░░░░ 0%`
   - [ ] Rounding handles edge cases (e.g., 1/3 = 33%, 2/3 = 67%)

## Technical Approach

**Challenge**: VSCode's TreeView API (`TreeItem.description`) only supports plain text, not graphical elements. To achieve the ChatGPT design's graphical progress bars, we need alternative approaches.

### Approach Options

#### Option 1: VSCode TreeView Webview (Recommended)
- **Method**: Replace standard TreeView with custom Webview-based tree
- **Pros**: Full control over rendering (HTML/CSS), exact match to design
- **Cons**: Major architectural change, need to reimplement tree behavior
- **Effort**: Large (2-3 weeks)

#### Option 2: Custom TreeDataProvider with HTML Decorations
- **Method**: Use VSCode's file decoration API to add custom HTML badges
- **Pros**: Keep existing TreeView structure
- **Cons**: Limited to small decorations, may not support full progress bars
- **Effort**: Medium (1 week)

#### Option 3: SVG Icon Progress Bars
- **Method**: Generate SVG images dynamically for each progress state, use as TreeItem icons
- **Pros**: Works within TreeView API, graphical output
- **Cons**: Limited icon size, need to generate many SVG variants
- **Effort**: Medium (1 week)

#### Option 4: Enhanced Unicode with ANSI Colors (Fallback)
- **Method**: Use colored Unicode blocks with terminal escape codes
- **Pros**: Minimal change from S88-S90 implementation
- **Cons**: Still text-based, may not render colors in TreeView
- **Effort**: Small (2-3 days)

### **TECHNICAL DECISION: Option 4 - Enhanced Unicode with FileDecorationProvider**

**Decision Date**: 2025-10-25
**Research Summary**: VSCode TreeView API does not support custom HTML/CSS rendering or graphical progress bars within TreeItems. WebviewView approach could achieve 100% design match but requires:
- Complete TreeView reimplementation (2-3 weeks)
- Loss of native features (drag-drop, keyboard nav, theming)
- Performance penalties (webviews are resource-intensive)
- High maintenance burden
- Webview UI Toolkit deprecated January 2025

**Chosen Approach**: Enhance existing Unicode progress bars (S88-S90) with FileDecorationProvider for colored badges/icons.

**What We Get**:
- ✅ Colored progress indicators (theme-based)
- ✅ All native VSCode features retained (drag-drop, keyboard nav, performance)
- ✅ Fast implementation (2-3 days)
- ✅ Builds on completed S88-S90 work
- ✅ User-customizable colors via VSCode themes
- ⚠️ Text-based Unicode bars (not graphical)
- ⚠️ ~60% visual match to ChatGPT design

**What We Don't Get**:
- ❌ True graphical horizontal progress bars
- ❌ Rounded corners and smooth gradients
- ❌ 100% ChatGPT design replication

### Implementation Plan (Option 4)

```typescript
// 1. Define custom theme colors in package.json
"contributes": {
  "colors": [
    {
      "id": "cascade.progressBar.completed",
      "description": "Color for completed progress sections",
      "defaults": { "dark": "#4caf50", "light": "#2e7d32" }
    },
    {
      "id": "cascade.progressBar.inProgress",
      "description": "Color for in-progress sections",
      "defaults": { "dark": "#2196f3", "light": "#1565c0" }
    }
  ]
}

// 2. Implement FileDecorationProvider
class ProgressDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const item = this.getItemFromUri(uri);
    if (!item || !this.isParentItem(item)) return undefined;

    const progress = this.calculateProgress(item);
    if (!progress) return undefined;

    // Badge: Show percentage or checkmark
    const badge = progress.percentage === 100 ? "✓" : `${progress.percentage}%`;

    // Color: Green if completed, blue if in-progress
    const color = progress.percentage === 100
      ? new vscode.ThemeColor('cascade.progressBar.completed')
      : new vscode.ThemeColor('cascade.progressBar.inProgress');

    return new vscode.FileDecoration(badge, undefined, color);
  }
}

// 3. Keep existing Unicode rendering in TreeItem.description
treeItem.description = `${statusBadge} ${renderProgressBar(progress)}`;
// Example: "$(sync) In Progress █████░░░░░ 50% (3/6)"

// 4. Assign resourceUri to parent items
treeItem.resourceUri = vscode.Uri.parse(`cascade-progress:///${item.item}`);
```

### Progress Calculation (Reuse from S88)

Progress calculation logic from S88 is fully reusable:
- `calculateProgress()` method exists (PlanningTreeProvider.ts:1872-1912)
- Returns `ProgressInfo { completed, total, percentage, display }`
- Cached via `progressCache` Map for performance
- No changes needed to calculation layer

## Architecture Impact

### Files to Modify

1. **Create utility file**: `vscode-extension/src/treeview/progressRenderer.ts`
   - Export `calculateProgress(item, hierarchy): ProgressInfo`
   - Export `renderProgressBar(progress): string`
   - Export Unicode character constants

2. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Import progress rendering utilities
   - Modify `getTreeItem()` to include progress bar for parent items
   - Cache progress calculations to avoid recomputation

3. **Integrate with**: `vscode-extension/src/treeview/StatusPropagationEngine.ts`
   - Progress updates when child statuses propagate upward
   - Trigger TreeView refresh when progress changes

4. **Update tests**: `vscode-extension/src/test/suite/progressCalculation.test.ts`
   - Add test cases for progress calculation logic
   - Test edge cases (0 children, 100%, rounding)

### Performance Considerations

- Progress calculated during hierarchy building (StatusPropagationEngine)
- Progress values stored in HierarchyNode or cached separately
- Bar rendering is simple string repetition (O(1) with fixed bar length)
- Cache invalidation when child status changes

## Success Metrics

- All parent items (Epics, Features, Projects) display progress bars
- Progress bars accurately reflect child completion status
- Percentage and counts match actual hierarchy state
- No performance degradation (< 500ms refresh with 100+ items)
- User can assess project health by scanning progress bars alone

## Dependencies

- Hierarchy building system (HierarchyNode, hierarchy.ts)
- Status propagation engine (for progress updates)
- TreeItem rendering infrastructure (PlanningTreeProvider)
- Child item counting logic

## Notes

- Progress bars only shown for items with children (Epics, Features, Projects, Specs)
- Stories and Bugs do not show progress bars (leaf nodes)
- Spec progress already calculated in S56; can reuse that logic
- Consider adding progress bar color coding (green = high, yellow = medium, red = low)
- Unicode box characters may render differently in different fonts

## Child Items

### Completed (Unicode Text-Based Implementation - Superseded)
- **S88**: Progress Calculation Core - Priority: High - Status: **Completed** ✓
  - Implemented `calculateProgress()` method for parent items
  - Cached progress calculation for performance
  - **Note**: Calculation logic is reusable for graphical progress bars
- **S89**: Progress Bar Rendering - Priority: High - Status: **Completed** ✓
  - Implemented Unicode text-based progress bars (`█░`)
  - **Note**: Does NOT match ChatGPT design (text-based, not graphical)
  - **Superseded**: Needs replacement with graphical rendering
- **S90**: TreeItem Integration - Priority: High - Status: **Completed** ✓
  - Integrated Unicode progress bars into TreeItem.description
  - **Note**: Does NOT match ChatGPT design requirements
  - **Superseded**: Needs replacement with graphical approach

### To Be Updated (Graphical Progress Bar Implementation)
- **S91**: Progress Cache Layer - Priority: Medium - Status: **Not Started**
  - **Update Needed**: Align with chosen graphical rendering approach (Option 1-4)
- **S92**: Progress Update on Propagation - Priority: Medium - Status: **Not Started**
  - **Update Needed**: Ensure progress updates trigger graphical bar refresh

### New Stories Required (Option 4 Implementation)

Based on technical decision to use FileDecorationProvider approach:

1. **S93**: Theme Color Definitions (package.json)
   - Define custom theme colors for progress indicators
   - Add color contribution points (cascade.progressBar.completed, cascade.progressBar.inProgress)
   - **Priority**: High, **Estimate**: XS (1-2 hours)

2. **S94**: ProgressDecorationProvider Implementation
   - Implement FileDecorationProvider for colored badges
   - URI scheme for parent items (cascade-progress:///)
   - Badge generation (percentage or checkmark)
   - Color selection based on completion state
   - **Priority**: High, **Estimate**: S (4-6 hours)

3. **S95**: TreeItem ResourceUri Assignment
   - Assign resourceUri to parent items (Epics, Features, Projects)
   - Integrate with FileDecorationProvider
   - Test decoration rendering in TreeView
   - **Priority**: High, **Estimate**: XS (2-3 hours)

4. **S96**: Decoration Provider Registration and Testing
   - Register ProgressDecorationProvider in extension.ts
   - Manual testing with various progress states (0%, 50%, 100%)
   - Verify theme color customization
   - Edge case testing (no children, all completed, etc.)
   - **Priority**: High, **Estimate**: S (3-4 hours)

**Total Estimated Effort**: 10-15 hours (~2 days)
