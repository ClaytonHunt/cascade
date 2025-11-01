---
item: S81
title: Badge Renderer Utility
type: story
parent: F23
status: Completed
priority: High
dependencies: []
estimate: S
spec: specs/S81-badge-renderer-utility/
created: 2025-10-24
updated: 2025-10-24
---

# S81 - Badge Renderer Utility

## Description

Create a standalone badge renderer utility that converts Status values into color-coded text badges using VSCode Codicon syntax. The utility provides a centralized, testable function for badge generation that can be used throughout the TreeView rendering pipeline.

This story focuses exclusively on the badge rendering logic without TreeView integration, enabling isolated unit testing and performance validation.

## Acceptance Criteria

1. **Badge Renderer Function**:
   - [ ] Create `badgeRenderer.ts` in `vscode-extension/src/treeview/`
   - [ ] Export `renderStatusBadge(status: Status): string` function
   - [ ] Function returns Codicon syntax for status badge (e.g., `$(circle-filled)`)
   - [ ] Function handles all Status values: Not Started, In Planning, Ready, In Progress, Blocked, Completed, Archived

2. **Status-to-Badge Mapping**:
   - [ ] Not Started: Gray circle ($(circle-outline))
   - [ ] In Planning: Yellow/amber circle ($(circle-filled))
   - [ ] Ready: Green circle ($(circle-filled))
   - [ ] In Progress: Blue circle ($(sync))
   - [ ] Blocked: Red circle ($(error))
   - [ ] Completed: Green checkmark ($(pass-filled))
   - [ ] Archived: Gray archive icon ($(archive))

3. **Badge Format**:
   - [ ] Badge format: `$(icon-name) Status Text`
   - [ ] Include status text after icon for clarity
   - [ ] Return plain status string if badge rendering fails (fallback)

4. **Performance**:
   - [ ] Badge generation < 1ms per call
   - [ ] No dynamic color calculations (use static Codicon names)
   - [ ] Function is pure (no side effects, same input = same output)

5. **Testing**:
   - [ ] Unit tests for all Status values
   - [ ] Test badge format matches expected output
   - [ ] Test fallback behavior for unknown status
   - [ ] Performance test for 1000 badge generations < 10ms

## Technical Notes

**VSCode Codicon Syntax**:
- VSCode TreeView descriptions support `$(icon-name)` syntax
- Codicons inherit color from theme or can use semantic colors
- Icons automatically adapt to light/dark themes
- No ANSI codes or custom HTML needed

**Implementation Example**:
```typescript
export function renderStatusBadge(status: Status): string {
  const badges: Record<Status, string> = {
    'Not Started': '$(circle-outline) Not Started',
    'In Planning': '$(circle-filled) In Planning',
    'Ready': '$(circle-filled) Ready',
    'In Progress': '$(sync) In Progress',
    'Blocked': '$(error) Blocked',
    'Completed': '$(pass-filled) Completed',
    'Archived': '$(archive) Archived'
  };

  return badges[status] || status;
}
```

**Codicon Reference**:
- `$(circle-outline)` - Empty circle (Not Started)
- `$(circle-filled)` - Filled circle (generic status)
- `$(sync)` - Sync/progress icon (In Progress)
- `$(error)` - Error/block icon (Blocked)
- `$(pass-filled)` - Checkmark (Completed)
- `$(archive)` - Archive icon (Archived)

## Files to Create

- `vscode-extension/src/treeview/badgeRenderer.ts` - Badge rendering utility
- `vscode-extension/src/test/suite/badgeRenderer.test.ts` - Unit tests

## Success Metrics

- All 7 Status values map to distinct badges
- Badge generation is fast (< 1ms)
- Unit tests achieve 100% coverage
- Badges render correctly in TreeView (verified visually in S82)
