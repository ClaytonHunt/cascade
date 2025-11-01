---
item: S68
title: Clean StatusIcons Module (Keep TreeView Functions)
type: story
parent: F21
status: Completed
priority: Low
dependencies: [S67]
estimate: XS
spec: specs/S68-clean-statusicons-module/
created: 2025-10-17
updated: 2025-10-23
---

# S68 - Clean StatusIcons Module (Keep TreeView Functions)

## Description

Refactor statusIcons.ts to remove FileDecoration-related code while preserving the TreeView icon mapping function. The module currently exports STATUS_BADGES and STATUS_COLORS constants (unused after S67) and getTreeItemIcon() function (actively used by PlanningTreeProvider).

After cleanup, statusIcons.ts will be a lean module focused solely on TreeView icon mapping.

### Scope

**File to Modify:**
- `vscode-extension/src/statusIcons.ts`

**Code Changes:**

**Keep These Exports (Lines 41-72):**
```typescript
// ✅ KEEP - Used as reference, no harm in retaining
export const STATUS_BADGES: Record<Status, string> = { ... };

// ✅ KEEP - Used as reference, no harm in retaining
export const STATUS_COLORS: Record<Status, string | undefined> = { ... };

// ✅ KEEP - Actively used by PlanningTreeProvider.ts
export function getTreeItemIcon(status: string): vscode.ThemeIcon { ... }
```

**Current Status:**
After reviewing the actual file content, statusIcons.ts (lines 1-137) already has:
1. STATUS_BADGES export (lines 41-48) - Reference data
2. STATUS_COLORS export (lines 65-72) - Reference data
3. getTreeItemIcon() function (lines 104-136) - Active TreeView function

**Analysis:**
- No FileDecoration-specific functions exist in current file
- Module is already clean and focused on TreeView icons
- STATUS_BADGES/STATUS_COLORS are exported but not imported anywhere (after S67)
- Keeping these constants is harmless (they're small reference data)

**Decision:**
- **No code changes needed** - File is already in correct state
- This story documents the analysis and verification
- Update acceptance criteria to reflect "verify no changes needed"

### Technical Details

**Verification Steps:**

1. **Check for FileDecoration imports:**
   ```bash
   grep -n "FileDecoration" vscode-extension/src/statusIcons.ts
   # Expected: No results
   ```

2. **Verify getTreeItemIcon() usage:**
   ```bash
   grep -r "getTreeItemIcon" vscode-extension/src/
   # Expected: treeview/PlanningTreeProvider.ts (active usage)
   ```

3. **Check for unused exports:**
   ```bash
   grep -r "STATUS_BADGES\|STATUS_COLORS" vscode-extension/src/
   # Expected: Only defined in statusIcons.ts, not imported elsewhere
   ```

4. **Test TreeView icons:**
   - Package and install extension
   - Open Cascade TreeView
   - Verify status icons display correctly:
     - Not Started: circle-outline (gray)
     - In Planning: sync (yellow)
     - Ready: debug-start (green)
     - In Progress: gear (blue)
     - Blocked: warning (red)
     - Completed: pass (green checkmark)

**Dependencies:**
- **S67 (Remove FileDecorationProvider Registration)**: Must complete first to ensure decorationProvider is fully removed

**Implementation Specification:**
- **Spec Directory**: `specs/S68-clean-statusicons-module/`
- **Status**: Ready for `/build` execution
- **Type**: Verification story (no code changes expected)

## Acceptance Criteria

- [ ] Verified statusIcons.ts has no FileDecoration-related code (grep confirms)
- [ ] Verified getTreeItemIcon() function present and unchanged
- [ ] Verified STATUS_BADGES and STATUS_COLORS exports present (reference data)
- [ ] No imports of FileDecoration types (grep confirms)
- [ ] getTreeItemIcon() used by PlanningTreeProvider.ts (grep confirms)
- [ ] STATUS_BADGES and STATUS_COLORS not imported anywhere (acceptable)
- [ ] Extension compiles without errors
- [ ] TreeView icons display correctly for all status values
- [ ] No console errors related to icon mapping
- [ ] Documentation updated to reflect statusIcons.ts purpose
