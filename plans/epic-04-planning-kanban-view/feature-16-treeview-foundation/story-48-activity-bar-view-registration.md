---
item: S48
title: Activity Bar View Registration
type: story
parent: F16
status: Completed
priority: High
dependencies: []
estimate: S
spec: specs/s48-activity-bar-view-registration/
created: 2025-10-13
updated: 2025-10-14
---

# S48 - Activity Bar View Registration

## Description

Register a custom view container and TreeView in the VSCode Activity Bar to provide a dedicated space for the Cascade planning panel. This story establishes the foundational UI element that users will interact with to view their planning items.

This is the first implementable story in F16 and creates the basic view structure before adding data and behavior.

### Technical Approach

**package.json Contributions:**
- Add `viewsContainers.activitybar` contribution with unique ID and icon
- Add `views` contribution mapping to the view container
- Create activity bar icon (SVG format)
- Register view activation event

**View Configuration:**
- View container ID: `cascade`
- View container title: `Cascade`
- View ID: `cascadeView`
- View name: `Planning Items`
- Icon: Custom SVG icon representing hierarchical cascade

**Icon Design:**
- Stacked cards flowing downward (represents Epic → Feature → Story hierarchy)
- Monochrome (VSCode will theme it automatically)
- 24x24px viewBox for crisp rendering
- Follows VSCode icon design guidelines

### Integration Points

- Uses existing extension activation logic from S37 (workspace detection)
- Will be populated by S49 (TreeDataProvider implementation)
- Icon file stored in `vscode-extension/resources/` directory

## Acceptance Criteria

- [ ] View container registered in Activity Bar with custom icon
- [ ] View appears in Activity Bar sidebar (icon is clickable)
- [ ] Clicking icon opens empty TreeView panel
- [ ] View container title "Planning Kanban" displays correctly
- [ ] View title "Planning Items" displays in panel header
- [ ] Icon renders correctly in light and dark themes
- [ ] View persists across VSCode sessions (state preserved)
- [ ] No console errors during registration
- [ ] Extension continues to respect workspace activation logic (S37)
- [ ] View only registers when workspace has plans/ or specs/ directories

## Analysis Summary

### Existing Infrastructure

**Extension Activation (S37):**
- Extension only activates when `plans/` or `specs/` directories exist
- View registration should respect this activation logic
- Registration happens in `extension.ts` activate() function

**Registration Pattern:**
- VSCode uses package.json contributions for view registration
- Programmatic registration via `vscode.window.createTreeView()` in activate()
- Context subscriptions handle proper disposal

### File Changes Required

1. **package.json** - Add view contributions
2. **vscode-extension/resources/cascade-icon.svg** - Create icon
3. **vscode-extension/src/extension.ts** - Register TreeView programmatically

### VSCode API References

- `vscode.window.createTreeView()` - Programmatic view registration
- `contributes.viewsContainers.activitybar` - Activity Bar registration
- `contributes.views` - View mapping to container

## Implementation Notes

- Keep TreeDataProvider implementation simple for this story (empty or placeholder)
- Full provider implementation happens in S49
- Icon should be simple and clear at small sizes
- Follow existing extension patterns for logging and error handling
- Test with both light and dark themes to ensure icon visibility

## Test Strategy

**Manual Testing:**
1. Reload VSCode window after code changes
2. Verify icon appears in Activity Bar
3. Click icon and verify panel opens
4. Check icon rendering in both light and dark themes
5. Close and reopen VSCode to verify state persistence
6. Test in workspace without plans/ directory (should not register)

**No Unit Tests Required:**
- View registration is declarative (package.json)
- Integration testing via manual verification sufficient for UI elements
