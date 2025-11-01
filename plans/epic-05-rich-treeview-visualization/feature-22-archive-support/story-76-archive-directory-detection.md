---
item: S76
title: Archive Directory Detection Logic
type: story
parent: F22
status: Completed
priority: High
dependencies: [S75]
estimate: S
spec: specs/S76-archive-directory-detection/
created: 2025-10-23
updated: 2025-10-23
---

# S76 - Archive Directory Detection Logic

## Description

Implement automatic detection of archived items based on their file path location. Items located in the `plans/archive/` directory (or subdirectories) are automatically treated as archived, regardless of their frontmatter status value.

This enables a simple archival workflow: move a file to `plans/archive/` and it's automatically treated as archived without manual frontmatter updates.

## Acceptance Criteria

1. **Path Detection**:
   - [ ] Function `isItemArchived()` correctly identifies items in `plans/archive/`
   - [ ] Detection works with nested paths: `plans/archive/epic-04-*/feature-16-*/story.md`
   - [ ] Detection works on both Windows and Unix path separators (`/` and `\`)
   - [ ] Detection is case-insensitive (handles `Archive`, `ARCHIVE`, `archive`)

2. **Status Handling**:
   - [ ] Items with `status: Archived` are treated as archived (frontmatter check)
   - [ ] Items in `plans/archive/` are treated as archived (directory check)
   - [ ] Either condition triggers archived treatment (OR logic, not AND)
   - [ ] Original status value is preserved in frontmatter (no automatic updates)

3. **Performance**:
   - [ ] Path check is O(1) string comparison (no file system reads)
   - [ ] No regex compilation on every check (compile once, reuse)
   - [ ] No measurable performance impact with 100+ items

4. **Edge Cases**:
   - [ ] Items in `plans/archive-old/` are NOT treated as archived (exact match required)
   - [ ] Items with "archive" in filename (not directory) are NOT archived
   - [ ] Symbolic links to archive directory are handled correctly

## Technical Implementation

### Files to Modify

1. **Create utility file**: `vscode-extension/src/treeview/archiveUtils.ts`

### Archive Detection Logic

```typescript
/**
 * Checks if a planning item is archived.
 *
 * An item is archived if:
 * 1. Frontmatter status is "Archived", OR
 * 2. File path contains "/archive/" or "\archive\" directory
 *
 * @param item - Planning tree item to check
 * @returns True if item is archived, false otherwise
 */
export function isItemArchived(item: PlanningTreeItem): boolean {
  // Check 1: Frontmatter status
  if (item.status === 'Archived') {
    return true;
  }

  // Check 2: File path contains archive directory
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = item.filePath.toLowerCase().replace(/\\/g, '/');

  // Check for "/archive/" in path (exact match, not substring)
  // Must have path separator before and after to avoid false positives
  if (normalizedPath.includes('/archive/')) {
    return true;
  }

  // Check for path ending with "/archive" (item directly in archive dir)
  if (normalizedPath.endsWith('/archive')) {
    return true;
  }

  return false;
}
```

### Usage in PlanningTreeProvider

The `isItemArchived()` function will be imported and used by:
- S78 (Archive filtering in getChildren())
- S80 (Visual design for muted appearance)

Example usage:
```typescript
import { isItemArchived } from './archiveUtils';

// In getStatusGroups() or getChildren()
const allItems = await this.loadAllPlanningItems();

// Filter out archived items if toggle is OFF
const visibleItems = allItems.filter(item => {
  return showArchivedItems || !isItemArchived(item);
});
```

### Testing Approach

1. **Unit Tests** (create test file):
   ```typescript
   // Test cases for isItemArchived()
   describe('isItemArchived', () => {
     it('returns true for status: Archived', () => {
       const item = { status: 'Archived', filePath: '/plans/epic.md' };
       expect(isItemArchived(item)).toBe(true);
     });

     it('returns true for /archive/ directory', () => {
       const item = { status: 'Ready', filePath: '/plans/archive/epic.md' };
       expect(isItemArchived(item)).toBe(true);
     });

     it('returns true for nested archive path', () => {
       const item = { status: 'Ready', filePath: '/plans/archive/epic-04/feature.md' };
       expect(isItemArchived(item)).toBe(true);
     });

     it('returns false for archive-old directory', () => {
       const item = { status: 'Ready', filePath: '/plans/archive-old/epic.md' };
       expect(isItemArchived(item)).toBe(false);
     });

     it('returns false for active item', () => {
       const item = { status: 'Ready', filePath: '/plans/epic-04/feature.md' };
       expect(isItemArchived(item)).toBe(false);
     });

     it('handles Windows path separators', () => {
       const item = { status: 'Ready', filePath: 'D:\\plans\\archive\\epic.md' };
       expect(isItemArchived(item)).toBe(true);
     });
   });
   ```

2. **Integration Tests**:
   - Create test file: `plans/archive/test-archived.md` with `status: Ready`
   - Verify `isItemArchived()` returns true
   - Move file back to `plans/` directory
   - Verify `isItemArchived()` returns false

3. **Performance Tests**:
   - Benchmark `isItemArchived()` with 1000 items
   - Verify average execution time < 0.01ms per item
   - Check no memory leaks with repeated calls

## Dependencies

- **S75**: Requires 'Archived' status type definition

## Notes

- This story does NOT implement filtering UI (see S78)
- This story does NOT auto-update frontmatter status (intentional - preserves original status)
- Path detection is intentionally simple (string comparison, not filesystem check)
- Consider adding `archived:` frontmatter field in future for metadata tracking
