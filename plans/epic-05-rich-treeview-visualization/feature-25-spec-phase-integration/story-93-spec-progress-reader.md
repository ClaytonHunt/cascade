---
item: S93
title: Spec Progress Reader Utility
type: story
parent: F25
status: Completed
priority: High
dependencies: []
estimate: M
spec: specs/S93-spec-progress-reader-utility
created: 2025-10-26
updated: 2025-10-27
---

# S93 - Spec Progress Reader Utility

## Description

Create a utility module for reading spec phase progress from spec directories. This module reads spec plan.md frontmatter to extract total phase count and status, then scans phase task files to count completed phases.

The reader provides a clean interface for other modules (TreeProvider, /plan command) to access spec progress data without duplicating file reading logic.

## Acceptance Criteria

1. **Spec Detection**:
   - [ ] Function `readSpecProgress(specDir: string): Promise<SpecProgress | null>`
   - [ ] Read spec plan.md file at `{specDir}/plan.md`
   - [ ] Parse frontmatter to extract `status` and `phases` fields
   - [ ] Return `null` if spec directory or plan.md missing

2. **Phase Counting**:
   - [ ] Glob for phase files: `{specDir}/tasks/*.md`
   - [ ] Read each phase file's frontmatter
   - [ ] Count phases where `status: Completed`
   - [ ] Handle missing or malformed phase files gracefully

3. **Sync Status Detection**:
   - [ ] Function `checkSyncStatus(storyStatus: Status, specStatus: Status): boolean`
   - [ ] Compare story status vs spec status
   - [ ] Return `false` if spec status more advanced than story status
   - [ ] Examples:
     - Story "Ready", Spec "In Progress" → out of sync
     - Story "Ready", Spec "Completed" → out of sync
     - Story "In Progress", Spec "In Progress" → in sync

4. **SpecProgress Interface**:
   ```typescript
   export interface SpecProgress {
     specDir: string;
     totalPhases: number;
     completedPhases: number;
     currentPhase: number;
     specStatus: Status;
     inSync: boolean;
   }
   ```

5. **Error Handling**:
   - [ ] Missing spec directory → return `null`
   - [ ] Malformed frontmatter → log error, return `null`
   - [ ] Missing `phases` field → count from task files
   - [ ] File read errors don't throw exceptions

6. **Performance**:
   - [ ] Async file reading (non-blocking)
   - [ ] Single pass through phase files
   - [ ] < 10ms per spec directory (typical case)

## Technical Approach

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Core Function**:
```typescript
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // 1. Check if spec directory exists
  if (!await fs.exists(specDir)) {
    return null;
  }

  // 2. Read spec plan.md
  const planPath = path.join(specDir, 'plan.md');
  const planContent = await fs.readFile(planPath, 'utf8');
  const planFrontmatter = parseFrontmatter(planContent);

  // 3. Get total phases from frontmatter or count from files
  let totalPhases = planFrontmatter.phases || 0;

  // 4. Find and count completed phases
  const taskFiles = await glob(`${specDir}/tasks/*.md`);
  if (totalPhases === 0) {
    totalPhases = taskFiles.length;
  }

  let completedPhases = 0;
  for (const taskFile of taskFiles) {
    const content = await fs.readFile(taskFile, 'utf8');
    const frontmatter = parseFrontmatter(content);
    if (frontmatter.status === 'Completed') {
      completedPhases++;
    }
  }

  // 5. Check sync status
  const inSync = checkSyncStatus(storyStatus, planFrontmatter.status);

  return {
    specDir,
    totalPhases,
    completedPhases,
    currentPhase: completedPhases + 1,
    specStatus: planFrontmatter.status,
    inSync
  };
}
```

**Sync Logic**:
```typescript
export function checkSyncStatus(
  storyStatus: Status,
  specStatus: Status
): boolean {
  // Spec completed but story not completed → out of sync
  if (specStatus === 'Completed' && storyStatus !== 'Completed') {
    return false;
  }

  // Spec in progress but story still ready → out of sync
  if (specStatus === 'In Progress' && storyStatus === 'Ready') {
    return false;
  }

  // Otherwise in sync
  return true;
}
```

## Dependencies

- `glob` package for file pattern matching
- `fs.promises` for async file reading
- Existing frontmatter parser (from FrontmatterCache or inline)
- `Status` type from types.ts

## Testing Strategy

**Unit Tests** (`specProgressReader.test.ts`):
- Test spec directory with 3 phases, 2 completed
- Test missing spec directory returns null
- Test malformed frontmatter returns null
- Test missing phases field falls back to counting files
- Test sync status detection for various status combinations
- Test file read errors handled gracefully

**Integration Tests**:
- Test reading actual spec directories from specs/ folder
- Verify performance < 10ms per spec

## Files to Create

1. **Implementation**: `vscode-extension/src/treeview/specProgressReader.ts`
2. **Tests**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

## Success Metrics

- Reads spec progress accurately (100% match with manual counts)
- Returns null for invalid/missing specs (no exceptions thrown)
- Sync detection correctly flags mismatched statuses
- Performance < 10ms per spec directory
- All edge cases handled gracefully

## Notes

- This utility is foundational for both F25 (TreeView integration) and /plan command (Mode 3)
- Keep interface simple: single function for reading progress
- Use existing FrontmatterCache if available to avoid duplicate parsing
- Consider adding logging for debugging spec read failures
