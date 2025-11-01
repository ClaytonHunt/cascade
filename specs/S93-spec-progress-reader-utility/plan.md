---
spec: S93
title: Spec Progress Reader Utility
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-27
updated: 2025-10-27
---

# S93 - Spec Progress Reader Utility

## Work Item Reference

**Story**: S93 - Spec Progress Reader Utility
**Type**: Story
**Priority**: High
**Estimate**: Medium
**Status**: Not Started

## Overview

Create a foundational utility module for reading spec phase progress from spec directories in the VSCode extension. This module provides a clean interface for reading spec plan.md frontmatter, counting completed phases, and detecting sync issues between story status and spec status.

The reader serves as a critical integration point for Feature 25 (Spec Phase Integration) and future enhancements to the `/plan` command (Mode 3 reporting).

## Implementation Strategy

### Approach

Build a standalone TypeScript module (`specProgressReader.ts`) that encapsulates all spec progress reading logic. The module will:

1. **Read spec directory metadata** - Parse plan.md frontmatter to extract total phases and spec status
2. **Count phase completion** - Scan phase task files to count how many phases are completed
3. **Detect sync issues** - Compare story status vs spec status to flag mismatches
4. **Handle errors gracefully** - Return `null` for missing/invalid specs without throwing exceptions

**Design Principles**:
- **Single Responsibility**: Module only reads data, doesn't modify files
- **Async/Non-blocking**: All file operations use async APIs
- **Defensive Coding**: Graceful error handling for missing files, malformed YAML
- **Performance Focused**: Single pass through phase files, < 10ms per spec
- **Reusable Interface**: Clean function signature for multiple consumers

### Key Design Decisions

**1. Return Type: `SpecProgress | null`**
- `null` indicates missing or invalid spec (expected case, not an error)
- Consumers can safely handle `null` without try-catch
- Eliminates need for exception handling in common scenarios

**2. Sync Status Detection**
- Detects when spec has advanced beyond story status
- Examples of out-of-sync states:
  - Story "Ready" + Spec "In Progress" → spec ahead of story
  - Story "Ready" + Spec "Completed" → spec completed but story not updated
  - Story "In Progress" + Spec "Completed" → spec done but story still in progress

**3. Frontmatter Parsing**
- Reuse existing `parseFrontmatter()` function from parser.ts
- No need to duplicate YAML parsing logic
- Leverage existing validation and error handling

**4. File System Operations**
- Use Node.js `fs.promises` for async file reading
- Use `glob` package for pattern matching phase files
- Check directory/file existence before reading (avoid exceptions)

## Architecture Decisions

### Module Structure

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Exports**:
```typescript
// Main function for reading spec progress
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null>

// Helper function for sync detection
export function checkSyncStatus(
  storyStatus: Status,
  specStatus: Status
): boolean

// Data interface
export interface SpecProgress {
  specDir: string;
  totalPhases: number;
  completedPhases: number;
  currentPhase: number;
  specStatus: Status;
  inSync: boolean;
}
```

### Integration Points

**1. PlanningTreeProvider (S95 - Phase Indicator Rendering)**
- Calls `readSpecProgress()` when rendering tree items
- Uses `SpecProgress` data to display phase indicators
- Example: "S93 - Spec Progress Reader [2/3]"

**2. /plan Command (Future - Mode 3 Reporting)**
- Generates status reports for planning pipeline
- Uses `readSpecProgress()` to check spec completion
- Reports specs that are ahead of story status

**3. FrontmatterCache**
- `readSpecProgress()` reads files directly (not cached)
- Spec progress is ephemeral data (doesn't need caching)
- Keeps cache focused on plan file frontmatter

### Data Flow

```
Story Item (PlanningTreeItem)
  ↓
  item.spec field → "specs/S93-spec-progress-reader-utility/"
  ↓
readSpecProgress(specDir, storyStatus)
  ↓
  1. Read specs/S93-.../plan.md frontmatter → { status, phases }
  2. Glob specs/S93-.../tasks/*.md → [task files]
  3. Read each task file frontmatter → { status }
  4. Count completed phases
  5. Check sync status
  ↓
SpecProgress {
  specDir: "specs/S93-...",
  totalPhases: 3,
  completedPhases: 2,
  currentPhase: 3,
  specStatus: "In Progress",
  inSync: true
}
```

## Key Integration Points

1. **parser.ts** (`parseFrontmatter()`)
   - Reuse existing frontmatter parsing logic
   - Reference: `vscode-extension/src/parser.ts:171-287`

2. **types.ts** (`Status` type)
   - Import Status enum for type safety
   - Reference: `vscode-extension/src/types.ts:14`

3. **Node.js fs.promises**
   - `fs.readFile()` for reading markdown files
   - `fs.access()` for checking file existence

4. **glob package**
   - Pattern matching for phase task files
   - Example: `glob('specs/S93-*/tasks/*.md')`

5. **PlanningTreeItem interface**
   - Optional `spec` field contains spec directory path
   - Reference: `vscode-extension/src/treeview/PlanningTreeItem.ts:22-46`

## Risk Assessment

### Low Risk
- **Standalone module**: No modifications to existing code
- **Read-only operations**: Doesn't modify any files
- **Defensive error handling**: Returns `null` on errors, no exceptions
- **Well-established patterns**: Uses same APIs as existing code

### Considerations

**1. Missing spec directories**
- **Risk**: Story has `spec` field but directory doesn't exist
- **Mitigation**: Check directory existence before reading, return `null`

**2. Malformed frontmatter**
- **Risk**: Spec files have invalid YAML or missing fields
- **Mitigation**: Use existing `parseFrontmatter()` validation, return `null` on parse failure

**3. Phase file count mismatch**
- **Risk**: `phases` field in plan.md doesn't match actual task file count
- **Mitigation**: Fall back to counting actual files if `phases` field missing

**4. Performance with many phase files**
- **Risk**: Specs with 10+ phases might slow down TreeView rendering
- **Mitigation**: Single pass through files, async operations, target < 10ms per spec

## Phase Overview

### Phase 1: Core Implementation (Estimated: 60 min)
- Create `specProgressReader.ts` module
- Implement `readSpecProgress()` function
- Implement `checkSyncStatus()` helper
- Define `SpecProgress` interface
- Add error handling for missing files

**Deliverable**: Working module that reads spec progress and detects sync issues

### Phase 2: Unit Tests (Estimated: 45 min)
- Create test file with comprehensive test cases
- Test valid spec directories with completed phases
- Test missing spec directories (return `null`)
- Test malformed frontmatter handling
- Test sync status detection logic
- Test edge cases (0 phases, missing fields, etc.)

**Deliverable**: Full test coverage with passing tests

### Phase 3: Integration and Documentation (Estimated: 30 min)
- Export functions from module
- Add JSDoc comments for all public functions
- Document usage examples
- Verify integration with existing types
- Performance validation on real spec directories

**Deliverable**: Production-ready module with documentation

## Codebase Analysis Summary

**Existing Patterns to Follow**:
- Frontmatter parsing: `parser.ts:171-287` (parseFrontmatter function)
- Async file reading: `cache.ts:158-176` (FrontmatterCache.get method)
- Type imports: `types.ts:14` (Status type)
- Tree item interface: `PlanningTreeItem.ts:22-46`

**Files to Create**:
1. `vscode-extension/src/treeview/specProgressReader.ts` (implementation)
2. `vscode-extension/src/test/suite/specProgressReader.test.ts` (tests)

**Dependencies Required**:
- `fs/promises` (Node.js built-in)
- `path` (Node.js built-in)
- `glob` (already in package.json)
- `parser.ts` (existing module)
- `types.ts` (existing module)

**Files to Modify**: None (standalone module)

**External Dependencies**:
- No new npm packages required
- Uses existing project dependencies

**Godot APIs Used**: None (VSCode extension code only)

## Expected Outcomes

### Success Criteria

1. ✅ `readSpecProgress()` correctly reads spec directories
2. ✅ Phase completion counting accurate (matches manual count)
3. ✅ Sync status detection works for all status combinations
4. ✅ Missing spec directories return `null` (no exceptions)
5. ✅ Malformed frontmatter handled gracefully
6. ✅ Performance < 10ms per spec directory
7. ✅ All unit tests pass
8. ✅ Module exports clean public API

### Performance Targets

- **Spec progress read**: < 10ms (typical case with 3-5 phases)
- **Phase file scanning**: < 5ms (glob + parse)
- **Sync detection**: < 1ms (simple comparison logic)
- **Error handling**: No exceptions thrown for expected failures

### Usage Example

```typescript
import { readSpecProgress } from './treeview/specProgressReader';

// Read progress for a story with spec
const specDir = 'specs/S93-spec-progress-reader-utility';
const storyStatus = 'In Progress';

const progress = await readSpecProgress(specDir, storyStatus);

if (progress) {
  console.log(`Spec: ${progress.specDir}`);
  console.log(`Progress: ${progress.completedPhases}/${progress.totalPhases}`);
  console.log(`Current Phase: ${progress.currentPhase}`);
  console.log(`Spec Status: ${progress.specStatus}`);
  console.log(`In Sync: ${progress.inSync ? 'Yes' : 'No'}`);
} else {
  console.log('Spec not found or invalid');
}
```

## Next Steps

🎯 Ready to implement! Run `/build specs/S93-spec-progress-reader-utility/plan.md` to begin execution.

**Implementation Order**:
1. Phase 1: Core implementation (readSpecProgress + checkSyncStatus)
2. Phase 2: Comprehensive unit tests
3. Phase 3: Integration and documentation

**Status Update**: Work item S93 will be marked "Ready" after spec generation is complete.
