---
spec: S78
phase: 3
title: Edge Case Handling and Polish
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 3: Edge Case Handling and Polish

## Overview

This phase addresses edge cases, optimizes performance, adds comprehensive testing, and polishes the implementation. It ensures the archive filtering feature handles all scenarios defined in the story acceptance criteria and provides excellent debugging support through output channel logging.

## Prerequisites

- ✅ Phase 1 completed (conditional status group array)
- ✅ Phase 2 completed (archive filtering logic)
- ✅ Manual testing with basic scenarios complete

## Tasks

### Task 1: Handle Empty Archived Status Group

**Scenario**: No archived items exist in workspace, but toggle is ON.

**Current Behavior** (after Phase 2):
- "Archived" status group appears (included in array)
- Count shows "Archived (0)"
- Expanding group shows no children (empty hierarchy)

**Acceptance Criteria Requirement** (S78):
> Empty status groups hidden (no "Archived (0)" when no archived items)

**Analysis**:

**Option A**: Filter out empty status groups
```typescript
// After building all groups, filter out empty ones
const nonEmptyGroups = groups.filter(group => group.count > 0);
return nonEmptyGroups;
```

**Option B**: Don't create empty Archived group
```typescript
if (status === 'Archived') {
  itemsInStatus = allItems.filter(item => isItemArchived(item));
  count = itemsInStatus.length;

  // Only add group if archived items exist
  if (count > 0) {
    groups.push({ /* ... */ });
  }
  continue; // Skip to next status
}
```

**Recommendation**: **Option B** (conditional push)

**Rationale**:
- More explicit (clear intent to skip empty Archived group)
- Preserves other empty status groups (e.g., "Blocked (0)" is useful)
- Avoids filtering all groups (only Archived is special case)

**Implementation**:

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:~685-710`

**Modify Archived Status Handling**:
```typescript
// Special handling for Archived status group
if (status === 'Archived') {
  // Include ALL items where isItemArchived() returns true
  itemsInStatus = allItems.filter(item => isItemArchived(item));
  count = itemsInStatus.length;

  // Only add Archived status group if archived items exist
  // This prevents "Archived (0)" from appearing when no items are archived
  if (count === 0) {
    this.outputChannel.appendLine('[Archive] No archived items found, skipping Archived status group');
    continue; // Skip to next status (don't push group)
  }

  this.outputChannel.appendLine(`[Archive] Archived status group: ${count} items`);

  // Push group (only reached if count > 0)
  groups.push({
    type: 'status-group',
    status: status,
    label: `${status} (${count})`,
    count: count,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
  });

  continue; // Skip normal group push below
}

// Normal status handling...
// Push group for all non-Archived statuses (even if count is 0)
groups.push({
  type: 'status-group',
  status: status,
  label: `${status} (${count})`,
  count: count,
  collapsibleState: vscode.TreeItemCollapsibleState.Expanded
});
```

**Key Changes**:
1. Add `if (count === 0)` check after filtering
2. Log skip message and `continue` to next iteration
3. Move group push INSIDE Archived branch (not shared with normal path)
4. Add `continue` after Archived group push to prevent double-push

**Testing**:

**Test Case**: No archived items, toggle ON
```bash
# Ensure no archived items exist
rm -rf plans/archive
grep -r "status: Archived" plans/  # Should return nothing
```

**Expected Results**:
- TreeView shows 6 status groups (no Archived group)
- Output channel shows: `[Archive] No archived items found, skipping Archived status group`
- No "Archived (0)" in TreeView

**Test Case**: One archived item, toggle ON
```bash
mkdir -p plans/archive
# Create single archived item
```

**Expected Results**:
- TreeView shows 7 status groups (includes Archived)
- "Archived (1)" label
- Output channel shows: `[Archive] Archived status group: 1 items`

**Expected Outcome**: Empty Archived group never appears.

---

### Task 2: Verify Directory-Based Detection Edge Cases

**Goal**: Ensure all directory-based edge cases from S76 work correctly.

**Test Cases**:

**Case 1**: Nested archive directory
```bash
mkdir -p plans/archive/epic-05-old
cat > plans/archive/epic-05-old/story.md << 'EOF'
---
item: S996
title: Nested Archive Story
type: story
status: Ready
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---
# S996 - Nested Archive Story
EOF
```

**Expected**: S996 appears in Archived group (nested paths detected)

**Case 2**: Archive-like directory (false positive prevention)
```bash
mkdir -p plans/archive-old
cat > plans/archive-old/story.md << 'EOF'
---
item: S995
title: Not Actually Archived
type: story
status: Ready
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---
# S995 - Not Actually Archived
EOF
```

**Expected**: S995 appears in "Ready" group (NOT archived, `archive-old` ≠ `archive`)

**Case 3**: Windows path with backslashes
```bash
# Already handled by isItemArchived() normalization
# File path: D:\projects\plans\archive\story.md
# Normalized: d:/projects/plans/archive/story.md
# Detected: /archive/ present → archived
```

**Expected**: Windows paths correctly identified as archived

**Verification**:
1. Create test files for each case
2. Toggle ON and verify correct status group placement
3. Toggle OFF and verify archived items hidden
4. Check output channel for filter logs

**Expected Outcome**: All directory-based edge cases handled correctly.

---

### Task 3: Verify Status-Based Detection Edge Cases

**Goal**: Ensure `status: Archived` detection works regardless of directory.

**Test Cases**:

**Case 1**: Archived status in active directory
```bash
cat > plans/epic-05/story-archived.md << 'EOF'
---
item: S994
title: Status Archived in Active Dir
type: story
status: Archived
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---
# S994 - Status Archived in Active Dir
EOF
```

**Expected**: S994 appears in "Archived" group (status overrides directory)

**Case 2**: Both conditions met (redundant but valid)
```bash
mkdir -p plans/archive
cat > plans/archive/story-both.md << 'EOF'
---
item: S993
title: Both Archived Status and Directory
type: story
status: Archived
priority: Low
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-23
---
# S993 - Both Archived
EOF
```

**Expected**: S993 appears in "Archived" group (either condition triggers detection)

**Verification**:
1. Create test files
2. Toggle ON → verify in Archived group
3. Toggle OFF → verify hidden
4. No duplicate entries or errors

**Expected Outcome**: Status-based detection works across all directories.

---

### Task 4: Verify Hierarchy Preservation in Archived Group

**Goal**: Ensure Epic → Feature → Story hierarchy works within Archived status group.

**Test Setup**:

**Create Archived Epic with Children**:
```bash
mkdir -p plans/archive/epic-99-old-epic/feature-99-old-feature

# Archived Epic
cat > plans/archive/epic-99-old-epic/epic.md << 'EOF'
---
item: E99
title: Old Epic
type: epic
status: Completed
priority: Low
dependencies: []
created: 2025-10-23
updated: 2025-10-23
---
# E99 - Old Epic
EOF

# Archived Feature (child of E99)
cat > plans/archive/epic-99-old-epic/feature-99-old-feature/feature.md << 'EOF'
---
item: F99
title: Old Feature
type: feature
status: Completed
priority: Low
dependencies: []
created: 2025-10-23
updated: 2025-10-23
---
# F99 - Old Feature
EOF

# Archived Story (child of F99)
cat > plans/archive/epic-99-old-epic/feature-99-old-feature/story-99-old.md << 'EOF'
---
item: S992
title: Old Story
type: story
status: Completed
priority: Low
dependencies: []
estimate: M
created: 2025-10-23
updated: 2025-10-23
---
# S992 - Old Story
EOF
```

**Testing Steps**:
1. Toggle ON to show archived items
2. Expand "Archived" status group
3. Verify E99 appears as root item
4. Expand E99 → verify F99 appears as child
5. Expand F99 → verify S992 appears as child
6. Verify item counts: "Archived (3)"

**Expected Results**:
- Hierarchy structure preserved (E99 → F99 → S992)
- All items appear in Archived group (not by original status)
- Expansion works smoothly (no errors)
- Collapsible icons appear correctly

**Implementation Notes**:

**No Code Changes Needed**:
- Hierarchy built by existing `buildHierarchy()` method (PlanningTreeProvider.ts:1022-1127)
- Hierarchy uses file path parsing (directory structure)
- Archive directory structure same as active structure (epic-XX/feature-YY pattern)
- Filtering happens BEFORE hierarchy build → hierarchy sees filtered items only

**Verification**:
- Check that `getHierarchyForStatus('Archived')` returns correct hierarchy
- Verify no special handling needed for Archived status in hierarchy code

**Expected Outcome**: Hierarchy works within Archived group without code changes.

---

### Task 5: Performance Optimization - Minimize Redundant isItemArchived Calls

**Current Implementation Analysis**:

**Redundant Calls**:
```typescript
// In getStatusGroups() loop (called once per status):
for (const status of statuses) {
  if (status === 'Archived') {
    // Call isItemArchived for ALL items
    itemsInStatus = allItems.filter(item => isItemArchived(item));
  } else {
    // Call isItemArchived for ALL items again
    itemsInStatus = allItems.filter(item => {
      const isArchived = isItemArchived(item);
      return item.status === status && (this.showArchivedItems || !isArchived);
    });
  }
}
```

**Problem**: With 100 items and 6-7 statuses:
- Worst case: ~700 calls to `isItemArchived()` per refresh
- Each call: string normalization + path check

**Optimization Strategy**: Cache archived detection results

**Implementation**:

**Location**: Beginning of `getStatusGroups()` method

```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Add Archived status ONLY when showArchivedItems flag is ON
  if (this.showArchivedItems) {
    statuses.push('Archived');
    this.outputChannel.appendLine('[Archive] Including Archived status group');
  } else {
    this.outputChannel.appendLine('[Archive] Excluding Archived status group (toggle OFF)');
  }

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // Performance optimization: Cache archived detection results
  // This avoids redundant isItemArchived() calls during filtering
  // With 100 items and 7 statuses: 700 calls → 100 calls (7x speedup)
  const archivedCache = new Map<string, boolean>();
  for (const item of allItems) {
    archivedCache.set(item.item, isItemArchived(item));
  }

  this.outputChannel.appendLine(
    `[Archive] Cached archived status for ${archivedCache.size} items`
  );

  // Build status group for each status
  const groups: StatusGroupNode[] = [];

  for (const status of statuses) {
    let itemsInStatus: PlanningTreeItem[];
    let count: number;

    // Special handling for Archived status group
    if (status === 'Archived') {
      // Use cached results instead of calling isItemArchived()
      itemsInStatus = allItems.filter(item => archivedCache.get(item.item) === true);
      count = itemsInStatus.length;

      if (count === 0) {
        this.outputChannel.appendLine('[Archive] No archived items found, skipping Archived status group');
        continue;
      }

      this.outputChannel.appendLine(`[Archive] Archived status group: ${count} items`);

      groups.push({
        type: 'status-group',
        status: status,
        label: `${status} (${count})`,
        count: count,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      });

      continue;
    } else {
      // Normal status group - use cached results
      itemsInStatus = allItems.filter(item => {
        const matchesStatus = item.status === status;
        const isArchived = archivedCache.get(item.item) === true;  // Cache lookup
        const includeItem = matchesStatus && (this.showArchivedItems || !isArchived);
        return includeItem;
      });
      count = itemsInStatus.length;

      // Log filtered archived items for debugging
      if (!this.showArchivedItems) {
        const archivedInStatus = allItems.filter(
          item => item.status === status && archivedCache.get(item.item) === true
        );
        if (archivedInStatus.length > 0) {
          this.outputChannel.appendLine(
            `[Archive] Filtered ${archivedInStatus.length} archived items from "${status}" status group`
          );
        }
      }
    }

    // Create status group node
    groups.push({
      type: 'status-group',
      status: status,
      label: `${status} (${count})`,
      count: count,
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded
    });
  }

  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(
    `[StatusGroups] Built ${groups.length} status groups in ${duration}ms (${allItems.length} items scanned)`
  );

  return groups;
}
```

**Key Changes**:
1. Create `archivedCache` Map before filter loop
2. Populate cache with single pass over all items (100 calls instead of 700)
3. Replace `isItemArchived(item)` calls with `archivedCache.get(item.item)`
4. Add cache population log for debugging

**Performance Impact**:

**Before Optimization**:
- 100 items × 7 statuses = 700 `isItemArchived()` calls
- Each call: ~0.01ms (string normalization)
- Total: ~7ms filter overhead

**After Optimization**:
- 100 items × 1 cache population = 100 `isItemArchived()` calls
- 700 cache lookups: ~0.001ms each = 0.7ms
- Total: ~1ms + 0.7ms = ~1.7ms filter overhead
- **Speedup**: 4x faster

**Verification**:
- Run performance test with 100+ items
- Check output channel for cache log
- Verify total time stays < 10ms
- No functional changes (behavior identical)

**Expected Outcome**: 4x performance improvement, well under 10ms target.

---

### Task 6: Add Comprehensive Output Channel Logging

**Goal**: Provide excellent debugging experience through detailed logs.

**Logging Points to Add/Enhance**:

**1. Archive Filter Summary** (end of `getStatusGroups()`):
```typescript
const duration = Date.now() - startTime;

// Calculate summary stats
const totalItems = allItems.length;
const archivedCount = Array.from(archivedCache.values()).filter(v => v).length;
const visibleCount = totalItems - (this.showArchivedItems ? 0 : archivedCount);

this.outputChannel.appendLine(
  `[StatusGroups] Built ${groups.length} status groups in ${duration}ms (${totalItems} items scanned)`
);

if (archivedCount > 0) {
  this.outputChannel.appendLine(
    `[Archive] Summary: ${archivedCount} archived items (${visibleCount} visible in TreeView)`
  );
}
```

**2. Toggle State Change Log** (existing, verify present):
```typescript
// In toggleArchivedItems() - already implemented by S77
this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);
```

**3. getItemsForStatus Logging** (add to Phase 2 code):
```typescript
private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllPlanningItems();

  if (status === 'Archived') {
    const archivedItems = allItems.filter(item => isItemArchived(item));
    this.outputChannel.appendLine(
      `[Archive] getItemsForStatus(Archived): ${archivedItems.length} items`
    );
    return archivedItems;
  }

  // Add logging for filtered count in normal status
  const matchingItems = allItems.filter(item => item.status === status);
  const archivedInStatus = matchingItems.filter(item => isItemArchived(item));
  const visibleItems = matchingItems.filter(item => {
    return this.showArchivedItems || !isItemArchived(item);
  });

  if (archivedInStatus.length > 0 && !this.showArchivedItems) {
    this.outputChannel.appendLine(
      `[Archive] getItemsForStatus(${status}): ${visibleItems.length} visible (${archivedInStatus.length} archived filtered)`
    );
  }

  return visibleItems;
}
```

**Expected Output Examples**:

**Toggle OFF (100 items, 8 archived)**:
```
[Archive] Excluding Archived status group (toggle OFF)
[Archive] Cached archived status for 100 items
[Archive] Filtered 3 archived items from "Ready" status group
[Archive] Filtered 2 archived items from "In Progress" status group
[Archive] Filtered 3 archived items from "Completed" status group
[StatusGroups] Built 6 status groups in 8ms (100 items scanned)
[Archive] Summary: 8 archived items (92 visible in TreeView)
```

**Toggle ON (100 items, 8 archived)**:
```
[Archive] Toggled archived items: visible
[Archive] Including Archived status group
[Archive] Cached archived status for 100 items
[Archive] Archived status group: 8 items
[StatusGroups] Built 7 status groups in 9ms (100 items scanned)
[Archive] Summary: 8 archived items (100 visible in TreeView)
```

**Expected Outcome**: Comprehensive, readable output channel logs for debugging.

---

### Task 7: Code Cleanup and Documentation

**Goal**: Ensure code is clean, well-documented, and maintainable.

**Documentation Updates**:

**1. Update File Header Comment** (`PlanningTreeProvider.ts:10-93`):

Add section about archive filtering:
```typescript
/**
 * TreeDataProvider implementation for Cascade planning items.
 *
 * ...existing documentation...
 *
 * ## Archive Filtering (S78)
 *
 * Archived items can be shown/hidden via toggle command:
 * - Default: Archived items filtered out (hidden)
 * - Toggle ON: Archived items visible in "Archived" status group
 *
 * Detection methods (S76):
 * - Frontmatter: `status: Archived`
 * - Directory: Items in `plans/archive/` directory
 *
 * Performance optimization:
 * - Archived detection cached per refresh (single pass)
 * - Filter operation < 10ms with 100+ items
 *
 * ...rest of documentation...
 */
```

**2. Add JSDoc for getStatusGroups Archive Handling**:

```typescript
/**
 * Generates status group nodes for the root level of the tree.
 *
 * Creates 6-7 status groups ordered by workflow progression:
 * Not Started → In Planning → Ready → In Progress → Blocked → Completed [→ Archived]
 *
 * The "Archived" status group appears conditionally:
 * - Shown when `showArchivedItems` flag is ON
 * - Hidden when flag is OFF
 * - Only included if archived items exist (never shows "Archived (0)")
 *
 * Archive filtering (S78):
 * - Archived items excluded from standard status groups (unless toggle ON)
 * - Archived items appear ONLY in "Archived" group (when visible)
 * - Detection via `isItemArchived()` from S76
 *
 * Performance optimization:
 * - Archived detection cached (single pass over items)
 * - Filter operation < 10ms with 100+ items
 *
 * @returns Array of status group nodes (6-7 groups depending on toggle state)
 */
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  // ... implementation ...
}
```

**3. Add Inline Comments for Complex Logic**:

```typescript
// Performance optimization: Cache archived detection results
// This avoids redundant isItemArchived() calls during filtering
// With 100 items and 7 statuses: 700 calls → 100 calls (7x speedup)
const archivedCache = new Map<string, boolean>();
```

```typescript
// Only add Archived status group if archived items exist
// This prevents "Archived (0)" from appearing when no items are archived
if (count === 0) {
  this.outputChannel.appendLine('[Archive] No archived items found, skipping Archived status group');
  continue;
}
```

**4. Code Formatting**:
- Ensure consistent indentation (2 spaces)
- Remove any commented-out code
- Group related variables together
- Add blank lines between logical sections

**Expected Outcome**: Clean, well-documented code ready for review.

---

### Task 8: Comprehensive Testing - All Acceptance Criteria

**Goal**: Verify ALL acceptance criteria from S78 story are met.

**Acceptance Criteria Checklist**:

**1. Default Behavior (Toggle OFF)**:
- [ ] Archived items hidden from all status groups
- [ ] "Archived" status group NOT displayed
- [ ] TreeView shows only active work (non-archived items)
- [ ] No "Archived" count badge in status groups

**2. Toggle ON Behavior**:
- [ ] Archived items visible in "Archived" status group (not original status)
- [ ] "Archived" status group displayed (collapsed by default)
- [ ] Archived status group shows count of archived items
- [ ] Archived status group appears LAST (after "Completed")

**3. Filtering Logic**:
- [ ] Filter applied in `getStatusGroups()` and `getItemsForStatus()`
- [ ] Uses `isItemArchived()` from S76 for detection
- [ ] Filter operation < 10ms with 100+ items (performance requirement)
- [ ] No duplicate filtering (cache optimization implemented)

**4. Status Group Handling**:
- [ ] Status group order: Not Started → In Planning → Ready → In Progress → Blocked → Completed → Archived
- [ ] Archived status group only appears when `showArchivedItems = true`
- [ ] Archived status group shows count: "Archived (X)"
- [ ] Archived status group collapsed by default (not expanded)

**5. Edge Cases**:
- [ ] Items with `status: Archived` appear in "Archived" status group (not original status)
- [ ] Items in `plans/archive/` with `status: Ready` appear in "Archived" group (directory overrides status)
- [ ] Empty Archived group hidden (no "Archived (0)" when no archived items)
- [ ] Hierarchy preserved within Archived status group (epics → features → stories)

**Testing Procedure**:

For each criterion:
1. Create specific test scenario
2. Verify behavior manually in TreeView
3. Check output channel logs
4. Document result (✅ or ❌)
5. Fix any issues before proceeding

**Expected Outcome**: All acceptance criteria met and verified.

---

## Completion Criteria

### Code Quality
- ✅ Empty Archived group handling implemented
- ✅ Performance optimization (archived detection cache) implemented
- ✅ Comprehensive output channel logging added
- ✅ Code documentation updated (file header, JSDoc, inline comments)
- ✅ Code formatted consistently

### Edge Cases Validated
- ✅ Empty Archived group hidden correctly
- ✅ Directory-based detection works (all S76 scenarios)
- ✅ Status-based detection works (all S76 scenarios)
- ✅ Hierarchy preserved in Archived group
- ✅ Mixed statuses in archive directory handled

### Performance Validated
- ✅ Filter operation < 10ms with 100+ items
- ✅ Cache optimization reduces redundant calls (4x improvement)
- ✅ TreeView refresh < 500ms total (no degradation)
- ✅ Output channel logs show performance metrics

### All Acceptance Criteria Met
- ✅ Default behavior (toggle OFF) working
- ✅ Toggle ON behavior working
- ✅ Filtering logic correct
- ✅ Status group handling correct
- ✅ All edge cases handled

### Documentation Complete
- ✅ File header updated with archive filtering info
- ✅ Method JSDoc updated
- ✅ Inline comments explain complex logic
- ✅ Output channel provides excellent debugging

## Final Verification

### Pre-Commit Checklist

Before marking S78 as completed:

1. **Code Review**:
   - [ ] All changes in `PlanningTreeProvider.ts` reviewed
   - [ ] No breaking changes to existing functionality
   - [ ] TypeScript type safety maintained
   - [ ] No lint errors or warnings

2. **Functional Testing**:
   - [ ] Default state (toggle OFF) tested
   - [ ] Toggle ON/OFF transitions tested
   - [ ] Edge cases tested (all 5 categories)
   - [ ] Hierarchy expansion tested

3. **Performance Testing**:
   - [ ] Tested with 100+ items
   - [ ] Filter time < 10ms confirmed
   - [ ] Cache optimization working (output logs show cache)

4. **Documentation**:
   - [ ] Code comments clear and accurate
   - [ ] Output channel logs helpful for debugging
   - [ ] No stale comments or TODOs left

5. **Integration**:
   - [ ] Works with existing TreeView features (S49-S77)
   - [ ] No conflicts with status propagation (S59)
   - [ ] No conflicts with drag-and-drop (S60-S62)

### Post-Implementation Actions

After all phases complete:

1. **Update Story Status**:
   - Mark S78 as "Completed" in frontmatter
   - Update `updated:` timestamp
   - Add completion notes to story file

2. **Commit Changes**:
   ```bash
   git add vscode-extension/src/treeview/PlanningTreeProvider.ts
   git commit -m "GREEN: S78 - Archive filtering in TreeView complete"
   ```

3. **Prepare for Next Story**:
   - Review S79 (Persistence for Archive Toggle State)
   - Verify readiness to implement (dependencies met)

## Notes

### Design Decision: Late Filtering vs Early Filtering

**Late Filtering** (chosen approach):
- Filter in `getStatusGroups()` and `getItemsForStatus()`
- Allows special handling for "Archived" status
- Clear separation between data loading and filtering

**Early Filtering** (rejected):
- Filter in `loadAllPlanningItems()`
- Simpler but less flexible
- Can't show archived items in separate group (would need to filter differently)

**Conclusion**: Late filtering is the right choice for this feature.

### Performance Optimization Rationale

**Why Cache?**
- `isItemArchived()` called O(n × m) times where n=items, m=statuses
- String operations (normalization) are relatively expensive
- Cache reduces to O(n) calls + O(n × m) lookups (map lookup is faster)

**Trade-offs**:
- Memory: ~100 bytes per 100 items (negligible)
- Code complexity: Minimal (simple Map)
- Performance gain: 4x speedup

**Conclusion**: Optimization is worth the minimal complexity increase.

### Integration with Future Stories

**S79 (Persistence)**:
- Will read/write `showArchivedItems` to VSCode memento
- No changes needed to filtering logic
- Persistence layer sits above TreeView

**S80 (Visual Design)**:
- Will add icon/color changes to archived items
- May use `isItemArchived()` in `getTreeItem()` for styling
- No impact on filtering logic

## Next Steps

After completing Phase 3:
1. Run full test suite (all acceptance criteria)
2. Package and install extension for final verification
3. Mark S78 as "Completed"
4. Prepare for S79 implementation
