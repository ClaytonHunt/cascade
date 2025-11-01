---
spec: S76
title: Archive Directory Detection Logic
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-23
updated: 2025-10-23
---

# S76 - Archive Directory Detection Logic

## Overview

This specification implements automatic detection of archived items based on file path location. Items in the `plans/archive/` directory are automatically treated as archived, enabling a simple archival workflow: move a file to the archive directory and it's instantly recognized without manual frontmatter updates.

The implementation creates a reusable utility function `isItemArchived()` that checks both frontmatter status ("Archived") and file path location ("/archive/"), providing flexible archival options for users.

## Implementation Strategy

The implementation follows a **utility-first approach**, building a standalone, testable function before integrating it into the TreeView infrastructure:

1. **Phase 1: Core Archive Detection Utility**
   - Create `archiveUtils.ts` with `isItemArchived()` function
   - Implement path normalization for cross-platform support
   - Handle both frontmatter and directory-based detection
   - Write comprehensive unit tests

2. **Phase 2: Integration Testing**
   - Test with real planning files in archive directory
   - Verify Windows and Unix path separator handling
   - Test edge cases (symbolic links, nested paths, false positives)
   - Performance benchmarking with large item sets

3. **Phase 3: Documentation and Export**
   - Document function API and usage examples
   - Export from treeview module index
   - Update TSDoc comments for IntelliSense
   - Add inline code examples for consumers

## Architecture Decisions

### Utility Function Design

**Rationale:**
- Keep archive detection logic separate from TreeView provider (single responsibility)
- Enable easy reuse across multiple features (S78 filtering, S80 visual design)
- Facilitate unit testing without TreeView dependencies
- Allow future extension (e.g., custom archive paths, archive metadata)

**Alternative Considered:**
- Inline logic in PlanningTreeProvider.getChildren()
- **Rejected:** Violates DRY, harder to test, couples detection to filtering

### Path Normalization Strategy

**Chosen Approach:** Normalize to lowercase with forward slashes
```typescript
const normalizedPath = item.filePath.toLowerCase().replace(/\\/g, '/');
```

**Rationale:**
- Handles Windows backslashes (`\`) and Unix forward slashes (`/`)
- Case-insensitive matching (handles Archive, ARCHIVE, archive)
- Simple string operations (no regex compilation overhead)
- Covers 99% of real-world use cases

**Edge Cases Handled:**
- Mixed separators: `plans\archive/epic.md` → normalized to `/`
- Trailing slashes: `plans/archive/` vs `plans/archive` → both work
- Relative paths: `./plans/archive/` → contains `/archive/`, works
- Absolute paths: `D:\projects\plans\archive\` → normalized, works

### OR Logic for Archive Detection

**Design Decision:** Either condition triggers archived status (OR, not AND)

```typescript
if (item.status === 'Archived') return true;  // Condition 1
if (normalizedPath.includes('/archive/')) return true;  // Condition 2
return false;
```

**Rationale:**
- **Flexibility**: Users can archive by status OR by moving file
- **Migration path**: Old files with `status: Archived` still work when moved
- **Intentional status preservation**: Moving to archive/ doesn't auto-update frontmatter
- **Future-proof**: Enables additional archive conditions (e.g., `archived:` field)

**Implication:**
- Files in `plans/archive/` with `status: In Progress` still show as archived
- This is **intentional** - file location takes precedence
- Original status preserved for historical context

### False Positive Prevention

**Problem:** Avoid matching paths like `plans/archive-old/` or `archived-features/`

**Solution:** Require exact directory match with separators
```typescript
// Match: /archive/ (with separators on both sides)
if (normalizedPath.includes('/archive/')) return true;

// Also match: path ending with /archive (root level)
if (normalizedPath.endsWith('/archive')) return true;
```

**Edge Cases Prevented:**
- ✅ `/archive-old/` → NOT matched (no separator after "archive")
- ✅ `/my-archived-work/` → NOT matched (no exact /archive/ substring)
- ✅ `story-archived.md` → NOT matched (in filename, not directory)
- ✅ `/plans/archive/epic.md` → Matched correctly
- ✅ `/plans/archive/epic-04/feature.md` → Matched (nested)

## Key Integration Points

### PlanningTreeItem Interface

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts:22`

The `isItemArchived()` function consumes this interface:
```typescript
export interface PlanningTreeItem {
  item: string;      // Not used for detection
  title: string;     // Not used for detection
  type: ItemType;    // Not used for detection
  status: Status;    // ✅ Used: Check if === 'Archived'
  priority: Priority;// Not used for detection
  filePath: string;  // ✅ Used: Check if contains '/archive/'
}
```

**Required Fields:** `status` and `filePath` only

### Status Type Definition

**File:** `vscode-extension/src/types.ts:14`

```typescript
export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed' | 'Archived';
```

The 'Archived' status was added in S75, enabling frontmatter-based archive detection.

### Future Integration Points (Not in This Story)

**S78 (Archive Filtering):**
```typescript
// In PlanningTreeProvider.getChildren()
import { isItemArchived } from './archiveUtils';

const visibleItems = allItems.filter(item => {
  return showArchivedItems || !isItemArchived(item);
});
```

**S80 (Visual Design):**
```typescript
// In PlanningTreeProvider.getTreeItem()
import { isItemArchived } from './archiveUtils';

if (isItemArchived(element.item)) {
  treeItem.description = `${treeItem.description} (Archived)`;
  // Apply muted styling
}
```

## Risk Assessment

### Low Risk Factors

- **Isolated utility function** - No side effects, pure logic
- **Simple string operations** - No complex regex or filesystem I/O
- **Comprehensive test coverage** - Unit and integration tests
- **Backward compatible** - No changes to existing code paths
- **Type-safe** - TypeScript enforces Status type correctness

### Potential Issues

1. **Symbolic Links**
   - **Risk:** Symlinks to archive directory may resolve differently
   - **Mitigation:** Path normalization uses provided filePath (already resolved by VSCode)
   - **Severity:** Low (VSCode resolves symlinks before passing paths)

2. **Custom Archive Paths**
   - **Risk:** Users may want custom archive directories (e.g., `plans/old/`)
   - **Mitigation:** Current implementation hardcodes `/archive/` only
   - **Future Enhancement:** Add configuration option for custom paths (out of scope)
   - **Severity:** Low (documented limitation)

3. **Performance with Large File Sets**
   - **Risk:** String operations on 1000+ items might slow TreeView refresh
   - **Mitigation:** Phase 2 includes performance benchmarking
   - **Target:** < 0.01ms per item, < 10ms for 1000 items
   - **Severity:** Low (string operations are O(n) but with very small constant)

## Testing Strategy

### Unit Tests (Phase 1)

**File:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Test Coverage:**
- ✅ Status-based detection (`status: 'Archived'`)
- ✅ Path-based detection (`/archive/` in path)
- ✅ Nested archive paths (`/archive/epic-04/feature.md`)
- ✅ Windows path separators (`D:\\plans\\archive\\file.md`)
- ✅ Case sensitivity (`/Archive/`, `/ARCHIVE/`)
- ✅ False positive prevention (`/archive-old/`)
- ✅ Filename edge cases (`archived-story.md` in non-archive dir)
- ✅ OR logic (either status OR path triggers)
- ✅ Both conditions true (redundant but valid)

**Test Pattern:**
```typescript
suite('Archive Detection', () => {
  test('returns true for status: Archived', () => { ... });
  test('returns true for /archive/ directory', () => { ... });
  test('returns false for archive-old directory', () => { ... });
  // ... 10+ test cases
});
```

### Integration Tests (Phase 2)

**Approach:** Create real files in archive directory, verify detection

**Test Setup:**
1. Create `plans/archive/test-archived.md` with `status: Ready`
2. Create `plans/test-active.md` with `status: Ready`
3. Load items via FrontmatterCache (or mock PlanningTreeItem)
4. Call `isItemArchived()` on both items
5. Assert archived item returns true, active item returns false
6. Clean up test files

**Performance Test:**
- Generate 1000 mock PlanningTreeItem objects
- Benchmark `isItemArchived()` execution time
- Verify average < 0.01ms per item
- Total for 1000 items < 10ms

### Manual Verification (Phase 3)

**Steps:**
1. Package extension: `npm run package`
2. Install: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload VSCode window
4. Move a planning file to `plans/archive/`
5. Open VSCode DevTools console
6. Import and test `isItemArchived()` function
7. Verify return value matches expectation

## Success Criteria

Before marking this story as complete, verify:

### Phase 1 Complete
- ✅ `archiveUtils.ts` created with `isItemArchived()` function
- ✅ Path normalization handles Windows and Unix separators
- ✅ OR logic correctly implements frontmatter OR path detection
- ✅ All unit tests passing (10+ test cases)
- ✅ TypeScript compilation succeeds

### Phase 2 Complete
- ✅ Integration tests pass with real archive files
- ✅ Performance benchmarks meet targets (< 0.01ms per item)
- ✅ Edge cases verified (symlinks, nested paths, false positives)
- ✅ Cross-platform testing (Windows and Unix paths)

### Phase 3 Complete
- ✅ TSDoc comments complete with usage examples
- ✅ Function exported from treeview module index
- ✅ IntelliSense shows correct documentation
- ✅ No console warnings or errors
- ✅ Manual verification successful

## Dependencies

- **S75** (Type System Updates for Archived Status) - ✅ Completed
  - Provides `Status` type with 'Archived' value
  - Required for frontmatter-based archive detection

## Notes

- This story creates the detection utility but does NOT implement filtering UI (see S78)
- This story does NOT auto-update frontmatter status when files are moved (intentional design)
- Path detection is intentionally simple (string comparison, not filesystem check)
- Future enhancement: Add `archived:` frontmatter field for metadata (date archived, reason, etc.)
- Function is pure (no side effects) - easy to test and reason about
- Integration with TreeView will happen in S78 (Archive Filtering)
