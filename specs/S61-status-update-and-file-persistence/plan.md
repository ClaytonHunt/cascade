---
spec: S61
title: Status Update and File Persistence
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-16
updated: 2025-10-16
---

# S61 - Status Update and File Persistence

## Overview

This specification details the implementation of status transition validation and frontmatter file updates for the Cascade TreeView drag-and-drop workflow. Building on S60's controller infrastructure, S61 adds the core business logic to validate status changes and persist them to markdown files.

The implementation completes the drag-and-drop status change workflow, with visual feedback (S62) following as a separate enhancement.

## Implementation Strategy

### Architectural Approach

**Status Transition State Machine:**
The implementation uses a state machine approach to validate status transitions. Each status has a defined set of valid next states, preventing invalid workflow transitions (e.g., jumping from "Not Started" directly to "Completed").

```typescript
const validTransitions: Record<Status, Status[]> = {
  'Not Started': ['In Planning'],
  'In Planning': ['Ready', 'Not Started'],
  'Ready': ['In Progress', 'In Planning'],
  'In Progress': ['Completed', 'Blocked', 'Ready'],
  'Blocked': ['Ready', 'In Progress'],
  'Completed': ['In Progress']  // Reopen if needed
};
```

**File Update Strategy:**
Frontmatter updates use a read-parse-modify-write cycle to preserve all existing fields while updating only `status` and `updated`. This ensures no data loss and maintains YAML structure.

**Auto-Refresh Integration:**
File writes trigger the existing FileSystemWatcher (S38), which invalidates the cache (S40) and refreshes the TreeView automatically. No manual refresh logic needed.

### Key Integration Points

**1. PlanningDragAndDropController**
The controller's `handleDrop()` method (vscode-extension/src/treeview/PlanningDragAndDropController.ts:162-234) contains TODO markers at lines 223-224:
```typescript
// TODO S61: Validate status transition
// TODO S61: Update file frontmatter
```

These lines will be replaced with calls to:
- `isValidTransition(sourceStatus, targetStatus)` - Validate transition
- `updateItemStatus(filePath, targetStatus, outputChannel)` - Update file

**2. Parser Module (parser.ts)**
Existing `parseFrontmatter()` function (vscode-extension/src/parser.ts:171-287) handles YAML parsing. S61 will reuse this for reading frontmatter before updates.

**3. js-yaml Library**
Already installed (package.json:74) for YAML serialization. S61 uses `yaml.dump()` to serialize updated frontmatter back to YAML format.

**4. VSCode Workspace FS API**
`vscode.workspace.fs.readFile()` and `vscode.workspace.fs.writeFile()` provide atomic file operations with proper error handling.

**5. FileSystemWatcher (S38)**
Automatically detects file changes (300ms debounce) and triggers:
- Cache invalidation (S40)
- TreeView refresh
- No manual intervention needed

### Phase Overview

**Phase 1: Status Transition Validation**
- Create `statusTransitions.ts` module with transition rules
- Implement `isValidTransition()` function
- Add comprehensive unit tests for all 6 statuses
- Define all valid and invalid transitions

**Phase 2: File Update Function**
- Implement `updateItemStatus()` function
- Read file using VSCode FS API
- Parse frontmatter using existing `parseFrontmatter()`
- Update `status` and `updated` fields
- Serialize frontmatter using `yaml.dump()`
- Write file atomically
- Handle errors (parse failures, write failures)

**Phase 3: Integration and Testing**
- Integrate validation and file update into `handleDrop()`
- Replace TODO markers with actual logic
- Add error logging for invalid transitions
- Add success logging for file updates
- Manual testing with real drag-and-drop operations
- Verify auto-refresh works correctly

## Key Architecture Decisions

### Decision 1: Separate Transition Validation Module
**Rationale:** Status transition rules are business logic independent of drag-and-drop or file I/O. Extracting to a separate module enables:
- Unit testing without file system mocks
- Reuse in future features (bulk status updates, CLI tools)
- Clear separation of concerns

**Impact:** `statusTransitions.ts` can be imported and tested independently.

### Decision 2: Preserve All Frontmatter Fields
**Rationale:** Frontmatter may contain optional fields (`dependencies`, `estimate`, `spec`) that must not be lost during updates. Using spread operator `{...frontmatter, status, updated}` ensures safe updates.

**Impact:** No data loss risk, even for future frontmatter fields not yet defined.

### Decision 3: Atomic File Writes
**Rationale:** `vscode.workspace.fs.writeFile()` provides atomic writes (temp file + rename pattern). This prevents corruption if write fails mid-operation.

**Impact:** No partial writes or corrupted files, even on crash or timeout.

### Decision 4: Rely on Existing Auto-Refresh
**Rationale:** FileSystemWatcher (S38) already handles file change detection and cache invalidation. Triggering manual refresh would cause double-refresh and race conditions.

**Impact:** No manual TreeView refresh code needed. File write automatically triggers refresh within 300ms.

### Decision 5: No Optimistic UI Updates (S61)
**Rationale:** Optimistic updates (immediately move item in UI before file write completes) add complexity:
- Rollback logic needed if write fails
- Race conditions with file watcher
- User confusion if update fails silently

**Impact:** User sees item move only after file write + cache refresh (300-500ms delay). Future enhancement (S62+) can add optimistic updates if needed.

## Risk Assessment

### Risk 1: YAML Serialization Formatting
**Likelihood:** Low
**Impact:** Medium
**Mitigation:** `js-yaml` library maintains YAML structure and formatting. Testing with real frontmatter samples verifies no formatting changes.

### Risk 2: File Write Conflicts
**Likelihood:** Low
**Impact:** Low
**Mitigation:** VSCode FS API uses atomic writes. If file changes between read and write, write succeeds and FileSystemWatcher detects conflict. Cache refresh resolves.

### Risk 3: Invalid Transition Attempts
**Likelihood:** Medium (user error)
**Impact:** Low
**Mitigation:** Validation rejects invalid transitions and logs clear error. S62 will add user-visible notifications.

### Risk 4: Date Field Type Handling
**Likelihood:** Low
**Impact:** Low
**Mitigation:** `js-yaml` auto-parses YYYY-MM-DD dates as Date objects. S61 generates date strings using `new Date().toISOString().split('T')[0]` to ensure string format.

## Phase Breakdown

### Phase 1: Status Transition Validation
- **Duration:** ~1 hour
- **Deliverable:** `statusTransitions.ts` with validation function and tests
- **Testing:** Unit tests for all transition combinations (36 test cases)

### Phase 2: File Update Function
- **Duration:** ~2 hours
- **Deliverable:** `updateItemStatus()` function with error handling
- **Testing:** Unit tests with mock file system

### Phase 3: Integration and Testing
- **Duration:** ~2 hours
- **Deliverable:** Integrated controller with working status updates
- **Testing:** Manual drag-and-drop testing, auto-refresh verification

**Total Estimated Effort:** 5 hours (Medium story, at upper bound)

## Success Criteria

### Functional Requirements
- ✅ `isValidTransition()` correctly validates all 6 statuses
- ✅ Invalid transitions are rejected (no file write)
- ✅ Valid transitions update file `status:` field
- ✅ Valid transitions update file `updated:` field to current date
- ✅ All other frontmatter fields preserved
- ✅ File writes are atomic (no partial writes)
- ✅ FileSystemWatcher detects changes and refreshes TreeView
- ✅ Dropped items appear in target status group after refresh

### Code Quality Requirements
- ✅ No TypeScript compilation errors
- ✅ All functions documented with TSDoc
- ✅ Error handling for parse failures and write failures
- ✅ Logging for all success and error cases
- ✅ Code follows extension patterns

### Integration Requirements
- ✅ TODO markers in `handleDrop()` replaced with actual logic
- ✅ No impact on existing drag-and-drop validation (S60)
- ✅ No manual refresh code (relies on FileSystemWatcher)
- ✅ Output channel shows validation and update events

## Related Documentation

- **VSCode API:** [Workspace FileSystem](https://code.visualstudio.com/api/references/vscode-api#workspace.fs)
- **js-yaml:** [dump() documentation](https://github.com/nodeca/js-yaml#dump-object---options-)
- **Existing Infrastructure:**
  - `vscode-extension/src/parser.ts` (parseFrontmatter function)
  - `vscode-extension/src/types.ts` (Status and Frontmatter types)
  - `vscode-extension/src/treeview/PlanningDragAndDropController.ts` (handleDrop integration)
  - `vscode-extension/src/extension.ts:333` (FileSystemWatcher setup)

## Next Steps

After completing this specification:
1. Run `/build specs/S61-status-update-and-file-persistence/plan.md` to begin implementation
2. Follow RED-GREEN-REFACTOR cycle for each phase
3. Upon S61 completion, proceed to S62 (Visual Feedback and Notifications)
