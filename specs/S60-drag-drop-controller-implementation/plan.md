---
spec: S60
title: Drag-and-Drop Controller Implementation
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-16
updated: 2025-10-16
---

# S60 - Drag-and-Drop Controller Implementation

## Overview

This specification details the implementation of drag-and-drop functionality for the Cascade TreeView. The controller enables users to drag Stories and Bugs between status groups to change their lifecycle state, establishing the foundation for the interactive kanban workflow in Feature 18.

This implementation focuses solely on the drag-and-drop infrastructure (S60), deferring status updates (S61) and visual feedback (S62) to subsequent stories.

## Implementation Strategy

### Architectural Approach

**VSCode TreeDragAndDropController Integration:**
The implementation leverages VSCode's native `TreeDragAndDropController` interface, which provides a standardized API for drag-and-drop operations in TreeViews. This interface requires implementing two key methods:

1. `handleDrag()` - Called when drag operation starts
2. `handleDrop()` - Called when drop operation completes

**MIME Type Isolation:**
Uses custom MIME type `application/vnd.code.tree.cascadeView` (matching TreeView ID) to ensure drag-and-drop is scoped to the Cascade extension only, preventing cross-extension interference.

**Data Transfer Pattern:**
Items are serialized to JSON and transferred through VSCode's `DataTransfer` API, carrying essential metadata (item number, file path, status, type) needed for drop validation and future status updates.

### Key Integration Points

**1. PlanningTreeProvider Extension**
The controller integrates with the existing `PlanningTreeProvider` without modifying its core logic. The provider continues to manage tree structure and rendering while the controller handles drag-and-drop events.

**2. TreeView Registration (extension.ts)**
TreeView registration requires updating to pass the `dragAndDropController` parameter. This is the only change needed in the activation flow.

**3. Output Channel Logging**
Reuses the existing output channel for consistent logging of drag-and-drop events, aiding debugging and user visibility.

**4. TreeNode Type System**
Leverages existing `TreeNode` union type (`PlanningTreeItem | StatusGroupNode`) for type-safe validation of drag sources and drop targets.

### Phase Overview

**Phase 1: Core Controller Implementation**
- Create `PlanningDragAndDropController` class
- Implement MIME type configuration
- Implement `handleDrag()` with item serialization
- Implement `handleDrop()` with deserialization and validation
- Add comprehensive logging

**Phase 2: TreeView Integration**
- Update TreeView registration in extension.ts
- Update barrel exports in treeview/index.ts
- Wire up controller with output channel
- Test drag cursor behavior

**Phase 3: Testing and Documentation**
- Manual testing of drag operations
- Verify validation rules
- Document controller API
- Update CLAUDE.md with drag-and-drop workflow

## Key Architecture Decisions

### Decision 1: Deferred Status Updates
**Rationale:** Separating drag-and-drop infrastructure (S60) from status update logic (S61) enables independent testing and reduces implementation complexity. The controller establishes the plumbing while S61 adds the business logic.

**Impact:** S60 provides TODO comments marking integration points for S61, making the transition clear and traceable.

### Decision 2: Status Groups as Drop Targets
**Rationale:** Dropping on status groups (not individual items) provides clear visual targets and simplifies target validation. Users drag items to status columns, matching kanban board metaphor.

**Impact:** Drop validation only needs to check `target.type === 'status-group'`, making the logic simple and robust.

### Decision 3: Stories and Bugs Only as Drag Sources
**Rationale:** Epics and Features represent organizational containers and should not be moved via drag-and-drop. Only Stories and Bugs (the work items) can transition through workflow states.

**Impact:** Drag validation rejects Epics and Features, preventing accidental hierarchy changes.

### Decision 4: Single-Item Drag (No Multi-Select)
**Rationale:** Multi-item drag adds significant complexity (validation conflicts, partial failures, undo) without proportional user value in initial release. Single-item drag covers 90% of use cases.

**Impact:** `handleDrag()` processes only `source[0]`, simplifying serialization and validation logic. Multi-select is deferred to future enhancement.

## Risk Assessment

### Risk 1: VSCode API Version Compatibility
**Likelihood:** Low
**Impact:** High
**Mitigation:** Extension targets VSCode ^1.80.0, which includes stable TreeDragAndDropController API. TypeScript compilation will catch breaking changes.

### Risk 2: MIME Type Collisions
**Likelihood:** Low
**Impact:** Medium
**Mitigation:** Custom MIME type `application/vnd.code.tree.cascadeView` uses extension-specific namespace following VSCode conventions, minimizing collision risk.

### Risk 3: DataTransfer Serialization Limits
**Likelihood:** Low
**Impact:** Low
**Mitigation:** Serialized item data is small (~200 bytes per item). VSCode DataTransfer handles KB-sized payloads without issue.

### Risk 4: Drop Handler Performance
**Likelihood:** Low
**Impact:** Low
**Mitigation:** Drop validation is synchronous and lightweight (type checks only in S60). File updates (S61) will be async to prevent UI blocking.

## Phase Breakdown

### Phase 1: Core Controller Implementation
- **Duration:** ~2 hours
- **Deliverable:** `PlanningDragAndDropController.ts` with drag/drop handlers
- **Testing:** Unit validation of serialization/deserialization

### Phase 2: TreeView Integration
- **Duration:** ~1 hour
- **Deliverable:** Updated extension.ts and exports
- **Testing:** Drag cursor appears for stories/bugs in TreeView

### Phase 3: Testing and Documentation
- **Duration:** ~1 hour
- **Deliverable:** Manual test results and updated documentation
- **Testing:** Full acceptance criteria validation

**Total Estimated Effort:** 4 hours (Medium story)

## Success Criteria

### Functional Requirements
- ✅ Stories and Bugs show drag cursor when hovering
- ✅ Epics and Features do not show drag cursor
- ✅ Dropping on status groups triggers `handleDrop()` (logged)
- ✅ Dropping outside status groups does nothing
- ✅ Drop handler logs source item and target status

### Code Quality Requirements
- ✅ No TypeScript compilation errors
- ✅ Controller follows existing extension patterns
- ✅ Logging format matches extension standards
- ✅ Code is documented with TSDoc comments

### Integration Requirements
- ✅ TreeView registration includes drag-and-drop controller
- ✅ Extension activates without errors
- ✅ No impact on existing TreeView functionality
- ✅ Output channel shows drag-and-drop events

## Related Documentation

- **VSCode API:** [TreeDragAndDropController](https://code.visualstudio.com/api/references/vscode-api#TreeDragAndDropController)
- **VSCode API:** [DataTransfer](https://code.visualstudio.com/api/references/vscode-api#DataTransfer)
- **Existing Infrastructure:**
  - `vscode-extension/src/treeview/PlanningTreeProvider.ts` (TreeView provider)
  - `vscode-extension/src/treeview/PlanningTreeItem.ts` (TreeNode types)
  - `vscode-extension/src/extension.ts` (TreeView registration)

## Next Steps

After completing this specification:
1. Run `/build specs/S60-drag-drop-controller-implementation/plan.md` to begin implementation
2. Follow RED-GREEN-REFACTOR cycle for each phase
3. Upon S60 completion, proceed to S61 (Status Update and File Persistence)
