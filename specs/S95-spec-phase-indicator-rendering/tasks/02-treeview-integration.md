---
spec: S95
phase: 2
title: TreeView Integration
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: TreeView Integration

## Overview

Integrate the spec phase indicator renderer with PlanningTreeProvider to display spec progress information in the VSCode TreeView. This phase replaces the TODO comment at line 879 with actual implementation that shows phase indicators for stories with specs.

The integration displays indicators like:
- `"$(sync) In Progress 📋 ↻ Phase 2/3"` (story with spec in progress)
- `"$(pass-filled) Completed 📋 ✓ Phase 3/3"` (story with completed spec)
- `"⚠️ $(sync) In Progress 📋 ✓ Phase 3/3"` (spec complete, story still in progress - out of sync)

## Prerequisites

- Phase 1 completed (specPhaseRenderer.ts implemented and tested)
- Understanding of PlanningTreeProvider.getTreeItem() method
- Understanding of VSCode TreeItem.description field
- S94 completed (spec progress cache available)

## Tasks

### Task 1: Import Renderer in PlanningTreeProvider

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add import for the spec phase renderer at the top of the file (after existing renderer imports):

**Location**: After line 11 (after progressRenderer import)

```typescript
import { renderSpecPhaseIndicator } from './specPhaseRenderer';
```

**Expected Outcome**: Import added without compilation errors.

**File Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:10-11 (existing renderer imports)

---

### Task 2: Update getTreeItem() for Story Items

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Lines 877-896 (leaf items section with S95 TODO comment)

Replace the TODO comment block and simple badge assignment with spec indicator logic:

**Current Code** (lines 877-896):
```typescript
} else {
  // Leaf items (story, bug) - show status badge only (no progress)
  // S95 TODO: For stories with specs, append phase indicator
  // Example: "$(sync) In Progress [2/3]" (phase 2 of 3)
  //
  // Implementation:
  // if (element.type === 'story' && element.spec) {
  //   const specProgress = await this.getSpecProgressCached(element);
  //   if (specProgress) {
  //     const phaseIndicator = `[${specProgress.currentPhase}/${specProgress.totalPhases}]`;
  //     treeItem.description = `${statusBadge} ${phaseIndicator}`;
  //   } else {
  //     treeItem.description = statusBadge;
  //   }
  // } else {
  //   treeItem.description = statusBadge;
  // }
  treeItem.description = statusBadge;
  // Example: "$(sync) In Progress"
}
```

**Updated Code**:
```typescript
} else {
  // Leaf items (story, bug)
  // For stories with specs, append phase indicator (S95)
  if (element.type === 'story' && element.spec) {
    // Get spec progress from cache (S94)
    const specProgress = await this.getSpecProgressCached(element);

    if (specProgress) {
      // Render spec phase indicator (S95)
      const phaseIndicator = renderSpecPhaseIndicator(specProgress);

      // Combine status badge with phase indicator
      // Example: "$(sync) In Progress 📋 ↻ Phase 2/3"
      treeItem.description = `${statusBadge} ${phaseIndicator}`;
    } else {
      // Spec field present but spec directory not found/invalid
      // Show badge only (no indicator)
      treeItem.description = statusBadge;
    }
  } else {
    // Bug items or stories without specs - show status badge only
    treeItem.description = statusBadge;
    // Example: "$(sync) In Progress"
  }
}
```

**Expected Outcome**:
- Stories with `spec` field in frontmatter display phase indicators
- Stories without `spec` field display badge only
- Bug items display badge only (no spec support)
- Format: `"{statusBadge} {phaseIndicator}"`

**File Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:863-876 (parent items progress logic for pattern)

---

### Task 3: Verify TypeScript Compilation

Compile the TypeScript code to check for type errors:

```bash
cd vscode-extension && npm run compile
```

**Expected Outcome**:
- No TypeScript compilation errors
- Import resolves correctly
- Type checking passes for specProgress and renderSpecPhaseIndicator

**Troubleshooting**:
- If import error: Check specPhaseRenderer.ts is in correct location
- If type error: Verify SpecProgress interface matches between modules
- If async error: Verify getTreeItem() is still marked as async

---

### Task 4: Package and Install Extension

Package the extension and install it locally for testing:

```bash
cd vscode-extension && npm run package
code --install-extension cascade-0.1.0.vsix --force
```

**Expected Outcome**:
- VSIX file created successfully
- Extension installed in current VSCode instance
- No installation errors

**File Reference**: CLAUDE.md:107-112 (extension installation workflow)

---

### Task 5: Reload VSCode and Open Output Channel

Reload the VSCode window to activate the updated extension:

1. Press `Ctrl+Shift+P` → "Developer: Reload Window"
2. Press `Ctrl+Shift+P` → "View: Toggle Output" → Select "Cascade"

**Expected Outcome**:
- Extension activates successfully
- Output channel shows activation logs
- No JavaScript runtime errors

**File Reference**: CLAUDE.md:114-117 (testing the extension)

---

### Task 6: Visual Validation in TreeView

Open the Cascade TreeView and verify spec indicators appear correctly:

1. Open Activity Bar (left sidebar)
2. Click Cascade icon (tree icon)
3. Expand status groups (Ready, In Progress, Completed)
4. Find stories with specs and verify indicators appear

**Visual Validation Checklist**:

**Stories with Specs - Not Started**:
- [ ] Indicator format: `"$(circle-filled) Ready 📋 ○ Phase 0/X"`
- [ ] Clipboard icon (📋) visible
- [ ] Empty circle icon (○) visible
- [ ] Phase count shows 0/X

**Stories with Specs - In Progress**:
- [ ] Indicator format: `"$(sync) In Progress 📋 ↻ Phase 2/X"`
- [ ] Refresh icon (↻) visible
- [ ] Phase count shows progress (not 0, not complete)

**Stories with Specs - Complete**:
- [ ] Indicator format: `"$(pass-filled) Completed 📋 ✓ Phase X/X"`
- [ ] Checkmark icon (✓) visible
- [ ] Phase count shows X/X (all complete)

**Stories with Specs - Out of Sync**:
- [ ] Indicator format: `"⚠️ $(status-icon) Status 📋 ✓ Phase X/X"`
- [ ] Warning icon (⚠️) prefix visible
- [ ] Warning highly visible (not obscured)

**Stories without Specs**:
- [ ] Indicator format: `"$(status-icon) Status"` (badge only, no phase indicator)
- [ ] No clipboard icon (📋)
- [ ] No phase count

**Bug Items**:
- [ ] Indicator format: `"$(status-icon) Status"` (badge only)
- [ ] No spec indicators (bugs don't use specs)

**Expected Outcome**:
- All spec indicators render correctly
- Icons are visually clear and distinguishable
- Format consistent across all stories
- No layout issues or text truncation

**Known Specs for Testing**:
- S93 - Spec Progress Reader Utility (`specs/S93-spec-progress-reader-utility/`)
- S94 - Spec Progress Cache (`specs/S94-spec-progress-cache/`)
- S95 - Spec Phase Indicator Rendering (`specs/S95-spec-phase-indicator-rendering/` - this spec)

**File Reference**: CLAUDE.md:119-124 (Cascade TreeView usage)

---

### Task 7: Verify Spec Progress Cache Integration

Check the output channel for cache hit/miss logs:

**Expected Log Pattern**:
```
[SpecProgressCache] Cache MISS for S93, reading from filesystem...
[SpecProgressCache] Cache HIT for S93
[SpecProgressCache] Cache HIT for S94
[SpecProgressCache] Cache MISS for S95, reading from filesystem...
```

**Cache Validation**:
- [ ] First TreeView load shows cache misses (expected)
- [ ] Subsequent refreshes show cache hits (> 80% hit rate)
- [ ] Cache stats logged every 60 seconds
- [ ] No excessive file system reads

**Expected Outcome**:
- Cache working as designed
- Performance optimized (< 100ms TreeView refresh)
- Cache hit rate > 80% after initial load

**File Reference**: vscode-extension/src/treeview/PlanningTreeProvider.ts:928-953 (getSpecProgressCached method)

---

### Task 8: Test Edge Cases

Verify edge case handling:

**Test Case 1: Story with malformed spec path**
1. Find a story with invalid `spec:` field
2. Verify TreeView shows badge only (no crash)
3. Check output channel for error handling

**Test Case 2: Story with missing spec directory**
1. Temporarily rename a spec directory
2. Refresh TreeView
3. Verify badge only (no indicator, no crash)
4. Restore spec directory

**Test Case 3: Spec with 0 phases**
1. Find/create spec with 0 phases
2. Verify indicator shows `"📋 ○ Phase 0/0"`
3. No crash or rendering issues

**Test Case 4: Out-of-sync spec**
1. Find story with status "Ready" and spec status "In Progress"
2. Verify warning icon (⚠️) appears
3. Indicator format: `"⚠️ $(circle-filled) Ready 📋 ↻ Phase X/Y"`

**Expected Outcome**:
- All edge cases handled gracefully
- No TreeView crashes or errors
- Appropriate fallback behavior

---

### Task 9: Performance Validation

Measure TreeView performance with spec indicators enabled:

**Performance Metrics** (from output channel):
- `[ItemsCache] Loaded X items in Yms` - File loading time
- `[StatusGroups] Built X groups in Yms` - Status grouping time
- `[Hierarchy] Built hierarchy in Yms` - Hierarchy build time
- `[CACHE STATS]` - Cache hit rate (logged every 60s)

**Performance Targets** (from CLAUDE.md:60-67):
- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- Cache hit rate > 80% after initial load

**Performance Validation**:
- [ ] TreeView refresh time within targets
- [ ] No visible lag in UI
- [ ] Cache hit rate > 80% after initial load
- [ ] Spec progress cache hit rate > 80%

**Expected Outcome**:
- Performance targets met
- No regression from previous version
- Spec indicators don't impact responsiveness

**File Reference**: CLAUDE.md:60-67 (performance testing section)

---

### Task 10: Create Integration Test (Optional)

**File**: `vscode-extension/src/test/suite/integration/specIndicatorIntegration.test.ts`

Create integration test to verify end-to-end behavior:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../../treeview/PlanningTreeProvider';
import { PlanningTreeItem } from '../../../treeview/PlanningTreeItem';

suite('Spec Indicator Integration Tests', () => {
  let treeProvider: PlanningTreeProvider;
  let outputChannel: vscode.OutputChannel;

  suiteSetup(async () => {
    // Get extension and tree provider
    const ext = vscode.extensions.getExtension('your-publisher.cascade');
    await ext?.activate();

    // Create output channel for testing
    outputChannel = vscode.window.createOutputChannel('Cascade Test');
  });

  test('Story with spec should show phase indicator', async function() {
    // This test requires real workspace with specs/ directory
    // Skip if not in correct workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      this.skip();
      return;
    }

    // TODO: Implement full integration test
    // 1. Load tree provider
    // 2. Find story with spec
    // 3. Call getTreeItem()
    // 4. Verify description includes phase indicator
  });
});
```

**Note**: This is optional for S95. Full integration testing may be deferred to S97 (Spec Integration Testing story).

---

## Completion Criteria

**Phase 2 Complete When**:
- ✅ renderSpecPhaseIndicator imported in PlanningTreeProvider
- ✅ getTreeItem() method updated with spec indicator logic
- ✅ TypeScript compilation succeeds
- ✅ Extension packaged and installed locally
- ✅ VSCode reloaded and extension activated
- ✅ Visual validation passed (all checklist items verified)
- ✅ Spec progress cache integration verified
- ✅ Edge cases tested and handled correctly
- ✅ Performance validation passed (targets met)

**Visual Validation Summary**:
- ✅ Stories with specs show phase indicators
- ✅ Stories without specs show badge only
- ✅ Icons render correctly (📋, ✓, ↻, ○, ⚠️)
- ✅ Out-of-sync warnings visible
- ✅ Format consistent across all items

**Performance Validation Summary**:
- ✅ TreeView refresh < 500ms with 100+ items
- ✅ Status group expansion < 100ms
- ✅ Cache hit rate > 80% after initial load
- ✅ No visible lag or rendering issues

## Next Steps

**After Phase 2 Complete**:
1. Mark S95 story as "Ready" in plans/ directory
2. Create git commit with changes
3. Update story status to "Completed" after merge
4. Proceed to S96 (TreeView Spec Indicator Integration) if applicable

**Related Stories**:
- **S96**: TreeView Spec Indicator Integration (may be duplicate/follow-up)
- **S97**: Spec Integration Testing (comprehensive test coverage)

## Troubleshooting

**Issue**: Icons not rendering correctly
- **Solution**: Check VSCode font supports Unicode emojis/symbols
- **Alternative**: Use Codicon fallbacks if needed

**Issue**: TreeView performance degraded
- **Solution**: Verify spec progress cache working (check output channel)
- **Investigate**: Cache hit rate should be > 80%

**Issue**: Spec indicators not appearing
- **Solution**: Check story has `spec:` field in frontmatter
- **Verify**: Spec directory exists and is valid
- **Debug**: Check output channel for cache miss/error logs

**Issue**: Warning icon not visible for out-of-sync specs
- **Solution**: Verify checkSyncStatus() logic in specProgressReader.ts
- **Test**: Manually create out-of-sync condition (spec status > story status)
