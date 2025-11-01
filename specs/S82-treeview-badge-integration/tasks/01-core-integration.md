---
spec: S82
phase: 1
title: Core Integration
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 1: Core Integration

## Overview

Integrate the badge renderer utility into `PlanningTreeProvider.getTreeItem()` to display color-coded Codicon badges in TreeView item descriptions. This phase modifies the description assignment logic to use `renderStatusBadge()` instead of plain-text status strings.

**Scope**: Single method modification in `PlanningTreeProvider.ts` (lines 631-648)

**Expected Outcome**: All TreeView items display badges with format `$(icon-name) Status` or `$(icon-name) Status (3/5)`

## Prerequisites

- S81 (Badge Renderer Utility) completed and tested
- S80 (Archive Detection) completed (provides `isItemArchived()`)
- VSCode extension development environment set up
- Understanding of VSCode TreeView API and Codicon syntax

## Tasks

### Task 1: Add Badge Renderer Import

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1-10`

**Current State**: No badge renderer import exists

**Implementation**:

1. Add import statement at module level (after existing imports):

```typescript
import { renderStatusBadge } from './badgeRenderer';
```

**Expected Result**:
- Import appears after existing imports (around line 9)
- No TypeScript errors
- Import follows alphabetical ordering with other local imports

**Validation**:
- Run TypeScript compiler: `npm run compile`
- Verify no import errors

**References**:
- Badge renderer module: `vscode-extension/src/treeview/badgeRenderer.ts:76`
- VSCode import conventions: https://code.visualstudio.com/api/references/vscode-api

---

### Task 2: Determine Effective Status for Badge Rendering

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:631`

**Current State**: Description assignment uses `element.status` directly

**Implementation**:

1. Add effective status determination logic **before** description assignment block (insert at line 631):

```typescript
    // Set description (shows after label, dimmed)
    // Determine effective status (handles archived items from S80)
    const effectiveStatus = isItemArchived(element) ? 'Archived' : element.status;
    const statusBadge = renderStatusBadge(effectiveStatus);

    // For Epic/Feature: Include progress indicator if children exist
```

**Reasoning**:
- Reuses existing `isItemArchived()` pattern from icon handling (line 622)
- Ensures archived items always show "$(archive) Archived" badge
- Precomputes badge string for use in both progress and non-progress branches

**Expected Result**:
- Archived items (in `plans/archive/` dir or with `status: Archived`) display archive badge
- Non-archived items display badge matching their frontmatter status

**Validation**:
- Check TypeScript compilation: `npm run compile`
- Verify `isItemArchived` import exists (line 9)
- Verify `renderStatusBadge` import added in Task 1

**References**:
- Archived detection: `vscode-extension/src/treeview/archiveUtils.ts:1-50`
- Existing icon handling pattern: `vscode-extension/src/treeview/PlanningTreeProvider.ts:622`

---

### Task 3: Update Epic/Feature Description Assignment

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:637-644`

**Current Code**:
```typescript
      if (progress) {
        // Has children - show status with progress
        treeItem.description = `${element.status} ${progress.display}`;
        // Example: "In Progress (3/5)"
      } else {
        // No children - show status only
        treeItem.description = element.status;
      }
```

**Updated Code**:
```typescript
      if (progress) {
        // Has children - show status badge with progress
        treeItem.description = `${statusBadge} ${progress.display}`;
        // Example: "$(sync) In Progress (3/5)"
      } else {
        // No children - show status badge only
        treeItem.description = statusBadge;
        // Example: "$(circle-filled) Ready"
      }
```

**Changes**:
- Replace `element.status` with `statusBadge` variable (from Task 2)
- Update comments to reflect badge rendering

**Expected Result**:
- Epics/Features with children: `$(icon) Status (completed/total)`
- Epics/Features without children: `$(icon) Status`

**Validation**:
- Verify variable `statusBadge` is defined in scope (Task 2)
- Check example comment matches badge format

**References**:
- Progress calculation: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1104-1150`
- Badge format spec: `vscode-extension/src/treeview/badgeRenderer.ts:50-60`

---

### Task 4: Update Story/Bug Description Assignment

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:646-647`

**Current Code**:
```typescript
    } else {
      // Leaf items (story, bug) - show status only (no progress)
      treeItem.description = element.status;
    }
```

**Updated Code**:
```typescript
    } else {
      // Leaf items (story, bug) - show status badge only (no progress)
      treeItem.description = statusBadge;
      // Example: "$(sync) In Progress"
    }
```

**Changes**:
- Replace `element.status` with `statusBadge` variable (from Task 2)
- Update comment to reflect badge rendering
- Add example comment for clarity

**Expected Result**:
- Stories/Bugs display: `$(icon) Status`
- No progress indicator (leaf items don't have children)

**Validation**:
- Verify `statusBadge` is in scope (defined in Task 2)
- Ensure no other references to `element.status` in description assignment block

**References**:
- Story/Bug item types: `vscode-extension/src/types.ts:1-50`
- Badge renderer examples: `vscode-extension/src/treeview/badgeRenderer.ts:65-71`

---

## Completion Criteria

### Code Quality
- [ ] TypeScript compilation succeeds with no errors
- [ ] No ESLint warnings in modified file
- [ ] All comments updated to reflect badge rendering
- [ ] Code follows existing patterns (e.g., `isItemArchived()` usage)

### Functional Requirements
- [ ] Badge import added and compiles successfully
- [ ] Effective status determination handles archived items
- [ ] Epic/Feature descriptions include badges
- [ ] Story/Bug descriptions include badges
- [ ] Progress indicators preserved (not modified)

### Visual Verification (Manual Testing)

**Setup**:
1. Package extension: `cd vscode-extension && npm run package`
2. Install locally: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
4. Open Cascade TreeView (Activity Bar → Cascade icon)

**Test Cases**:
- [ ] **Not Started items**: Display `$(circle-outline) Not Started`
- [ ] **In Planning items**: Display `$(circle-filled) In Planning`
- [ ] **Ready items**: Display `$(circle-filled) Ready`
- [ ] **In Progress items**: Display `$(sync) In Progress`
- [ ] **Blocked items**: Display `$(error) Blocked`
- [ ] **Completed items**: Display `$(pass-filled) Completed`
- [ ] **Archived items**: Display `$(archive) Archived` (regardless of frontmatter status)
- [ ] **Epic/Feature with children**: Display `$(icon) Status (X/Y)`
- [ ] **Epic/Feature without children**: Display `$(icon) Status`
- [ ] **Story/Bug**: Display `$(icon) Status` (no progress)

**Theme Testing**:
- [ ] Badges render correctly in Dark+ theme
- [ ] Badges render correctly in Light+ theme
- [ ] Icons are visible and color-coded
- [ ] No broken Codicon syntax (no raw `$()` strings)

**Output Channel Verification**:
- [ ] Open output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
- [ ] No errors or warnings related to badge rendering
- [ ] TreeView refresh logs appear normal

### Performance Verification

**Baseline Performance** (from CLAUDE.md):
- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- No visible lag in TreeView

**Test Procedure**:
1. Open workspace with 100+ planning items (use test data generator if needed)
2. Open Cascade output channel
3. Expand status groups and observe timing logs
4. Verify refresh times meet targets

**Performance Assertions**:
- [ ] `[TreeView] Loaded X items in Yms` - Y < 500ms
- [ ] No performance degradation vs. baseline (pre-S82)
- [ ] Badge rendering overhead negligible (< 5ms for 100 items)

---

## Next Phase

Once all completion criteria are met:

1. **Commit Changes** (if standalone testing):
   ```bash
   git add vscode-extension/src/treeview/PlanningTreeProvider.ts
   git commit -m "feat(treeview): integrate badge renderer into TreeView (S82 Phase 1)"
   ```

2. **Proceed to Phase 2**:
   - Run `/build specs/S82-treeview-badge-integration/tasks/02-test-updates.md`
   - Update automated tests to verify badge rendering
   - Ensure all tests pass before final commit

**Note**: If running full `/build` process, defer commit until all phases complete.

---

## Troubleshooting

### Issue: TypeScript Import Error

**Symptom**: `Cannot find module './badgeRenderer'`

**Solution**:
- Verify file exists: `vscode-extension/src/treeview/badgeRenderer.ts`
- Check export syntax in badgeRenderer.ts (should use `export function`)
- Verify no circular imports

### Issue: Badges Display as Plain Text

**Symptom**: TreeView shows `$(sync) In Progress` as literal text instead of icon

**Solution**:
- Verify badge strings use correct Codicon syntax: `$(icon-name)`
- Check VSCode version supports Codicons (1.40+)
- Inspect badge string in debugger (should match format from badgeRenderer.ts)

### Issue: Archived Items Show Wrong Status

**Symptom**: Archived items display non-archived status badge

**Solution**:
- Verify `isItemArchived()` import exists
- Check effective status calculation uses `isItemArchived(element)`
- Test with item in `plans/archive/` directory and item with `status: Archived`

### Issue: Progress Indicator Missing

**Symptom**: Epic/Feature items don't show `(X/Y)` progress

**Solution**:
- Verify Task 3 only replaced status string, not progress calculation
- Check `progress.display` is still appended after badge
- Ensure `calculateProgress()` method not modified

---

## Code References

- **PlanningTreeProvider.ts**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:631-648` (modification target)
- **Badge Renderer**: `vscode-extension/src/treeview/badgeRenderer.ts:76` (import source)
- **Archive Utils**: `vscode-extension/src/treeview/archiveUtils.ts:35` (isItemArchived function)
- **Status Type**: `vscode-extension/src/types.ts:1-50` (Status type definition)
- **Codicon Reference**: https://microsoft.github.io/vscode-codicons/dist/codicon.html (icon names)
