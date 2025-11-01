---
item: S99
title: Type Label Formatter Utility
type: story
parent: F26
status: Completed
priority: High
dependencies: []
estimate: XS
spec: specs/S99-type-label-formatter/
created: 2025-10-28
updated: 2025-10-28
---

# S99 - Type Label Formatter Utility

## Description

Create a new utility module for formatting item labels with type prefixes. This foundational story provides the core label formatting logic that will be used by subsequent stories to enhance TreeItem display.

The formatter generates labels in the format: `Type # - Title` (e.g., `Story 75 - Archive Detection`, `Epic 5 - Rich TreeView`).

## Acceptance Criteria

1. **Module Creation**:
   - [ ] Create `vscode-extension/src/treeview/labelFormatter.ts`
   - [ ] Export `formatItemLabel(item: PlanningTreeItem): string` function
   - [ ] Export `getTypeLabel(type: ItemType): string` helper function

2. **Type Label Mapping**:
   - [ ] Project → "Project"
   - [ ] Epic → "Epic"
   - [ ] Feature → "Feature"
   - [ ] Story → "Story"
   - [ ] Bug → "Bug"
   - [ ] Spec → "Spec"
   - [ ] Phase → "Phase"

3. **Label Format**:
   - [ ] Format: `{TypeLabel} {ItemNumber} - {Title}`
   - [ ] Example: `Story 75 - Archive Detection`
   - [ ] Separator: Space-dash-space (` - `)
   - [ ] Number format: No zero-padding (S5, not S05)

4. **Edge Cases**:
   - [ ] Handle unknown types gracefully (fallback to capitalized type string)
   - [ ] Handle missing/empty titles (use item number only)
   - [ ] Handle undefined item numbers (use "Unknown")

5. **Testing**:
   - [ ] Unit tests for all item types
   - [ ] Edge case tests (unknown type, missing title)
   - [ ] Format consistency tests

## Technical Approach

**File**: `vscode-extension/src/treeview/labelFormatter.ts`

```typescript
import { PlanningTreeItem } from './PlanningTreeItem';
import { ItemType } from '../types';

/**
 * Get display label for item type (e.g., "Story", "Epic").
 *
 * @param type - Item type from frontmatter
 * @returns Human-readable type label
 */
export function getTypeLabel(type: ItemType): string {
  const labels: Record<ItemType, string> = {
    'project': 'Project',
    'epic': 'Epic',
    'feature': 'Feature',
    'story': 'Story',
    'bug': 'Bug',
    'spec': 'Spec',
    'phase': 'Phase'
  };

  return labels[type] || capitalize(type);
}

/**
 * Format item label with type prefix.
 *
 * Format: "Type # - Title"
 * Example: "Story 75 - Archive Detection"
 *
 * @param item - Planning tree item to format
 * @returns Formatted label string
 */
export function formatItemLabel(item: PlanningTreeItem): string {
  const typeLabel = getTypeLabel(item.type);
  const number = item.item || 'Unknown';
  const title = item.title || number;

  return `${typeLabel} ${number} - ${title}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

**Integration Point**: Will be imported and used in `PlanningTreeProvider.getTreeItem()` (subsequent story).

## Analysis Summary

**Current State**:
- Labels currently formatted as: `{ItemNumber} - {Title}` (e.g., `S75 - Archive Detection`)
- Format logic is inline in `PlanningTreeProvider.getTreeItem()` at line 840

**Impact**:
- No breaking changes (utility module only)
- No performance impact (simple string operations)
- Enables consistent label formatting across all TreeItem rendering

**Dependencies**:
- Uses existing `PlanningTreeItem` type
- Uses existing `ItemType` type from `types.ts`

## Implementation Notes

- Keep functions pure (no side effects)
- Use TypeScript strict mode
- Export all functions for testing
- Consider adding JSDoc comments for IntelliSense
