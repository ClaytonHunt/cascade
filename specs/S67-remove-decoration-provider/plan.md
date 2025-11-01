---
spec: S67
title: Remove FileDecorationProvider Registration
type: spec
status: Completed
priority: Low
phases: 2
created: 2025-10-23
updated: 2025-10-23
---

# S67 - Remove FileDecorationProvider Registration

## Overview

This specification outlines the removal of the deprecated PlansDecorationProvider system from the Cascade VSCode extension. The FileDecorationProvider was part of Epic 03's file decoration approach, which has been superseded by the Cascade TreeView (F16-F20). This cleanup work removes redundant code and simplifies the extension architecture.

## Background

**Epic 03 Context:**
- Originally implemented file decorations to show status badges and colors on planning files in File Explorer
- Approach: `PlansDecorationProvider` implementing VSCode's `FileDecorationProvider` interface
- Registered in extension.ts and integrated with FileSystemWatcher for real-time updates

**Why Remove:**
- Epic 04's Cascade TreeView provides superior visualization (hierarchical view, drag-drop, context menus)
- File decorations are redundant and add complexity
- F20 (Real-Time Synchronization) is now complete, making TreeView fully functional
- Removing this reduces extension activation time and memory footprint

## Implementation Strategy

This removal follows a **surgical deletion** approach: identify all integration points, remove them systematically, and verify no breakage occurs. The implementation is broken into two phases:

### Phase 1: Remove Registration and Provider Code
- Remove the provider registration from extension.ts activate() function
- Remove the provider disposal from extension.ts deactivate() function
- Delete the decorationProvider.ts source file
- Remove import statement from extension.ts
- Remove module-level variable declaration from extension.ts

### Phase 2: Remove Tests and Documentation
- Delete the decorationProvider.test.ts test file
- Remove references from documentation (DEVELOPMENT.md, TESTING.md, TROUBLESHOOTING.md)
- Verify no remaining references exist in codebase

## Architecture Decisions

**No Migration Needed:**
- PlansDecorationProvider is completely independent (no shared state with other components)
- Removing it does not affect TreeView, cache, or file watchers
- No data migration or compatibility layer required

**Verification Strategy:**
- Use grep to search for all references before and after removal
- Test extension activation and TreeView functionality
- Verify File Explorer no longer shows status badges

## Key Integration Points

**Files to Modify:**
1. `vscode-extension/src/extension.ts` (4 locations)
   - Line 25: Import statement
   - Lines 37-38: Module-level variable
   - Lines 1172-1182: Provider initialization and registration
   - Lines 1459-1467: Provider disposal

**Files to Delete:**
1. `vscode-extension/src/decorationProvider.ts` (entire file, 189 lines)
2. `vscode-extension/src/test/suite/decorationProvider.test.ts` (test file)

**Documentation Files to Update:**
1. `vscode-extension/DEVELOPMENT.md`
2. `vscode-extension/TESTING.md`
3. `vscode-extension/TROUBLESHOOTING.md`

**No Changes Required:**
- `FrontmatterCache` - Not used by decorationProvider (despite original Epic 03 plans)
- `FileSystemWatcher` - Used by TreeView, not affected by this removal
- `PlanningTreeProvider` - Independent component
- `package.json` - No decoration-specific configuration exists

## Risk Assessment

**Low Risk Removal:**
- ✅ PlansDecorationProvider is isolated (no dependencies on it)
- ✅ F20 completed ensures TreeView fully replaces decoration functionality
- ✅ No user-facing configuration to migrate
- ✅ No persistent state to clean up

**Potential Issues:**
- ⚠️ Users may notice File Explorer no longer shows status badges (expected behavior)
- ⚠️ Documentation references may exist outside vscode-extension/ directory
- ⚠️ Git history references will remain (acceptable)

**Mitigation:**
- Verify extension activates without errors after removal
- Test TreeView functionality remains intact
- Search entire codebase for lingering references

## Codebase Analysis Summary

**Files to Modify:** 4 files
- extension.ts (4 edit locations)
- DEVELOPMENT.md (remove references)
- TESTING.md (remove references)
- TROUBLESHOOTING.md (remove references)

**Files to Delete:** 2 files
- decorationProvider.ts (189 lines)
- decorationProvider.test.ts (estimated 100+ lines)

**External Dependencies:** None
- No npm packages to uninstall
- No VSCode APIs that need cleanup beyond unregistration

**VSCode APIs Used (being removed):**
- `vscode.window.registerFileDecorationProvider()` - Provider registration
- `vscode.FileDecorationProvider` interface - Implemented by PlansDecorationProvider
- `vscode.EventEmitter<vscode.Uri>` - Used for decoration change events

## Phase Overview

### Phase 1: Remove Registration and Provider Code
**Goal:** Remove all TypeScript code related to PlansDecorationProvider

**Tasks:**
1. Remove import statement from extension.ts
2. Remove module-level variable declaration
3. Remove provider initialization code from activate()
4. Remove provider disposal code from deactivate()
5. Delete decorationProvider.ts source file
6. Verify no TypeScript compilation errors

**Duration:** 15-20 minutes

**Validation:**
- `npm run compile` succeeds
- `grep -r "decorationProvider" vscode-extension/src/` returns no results (except comments)
- Extension activates in VSCode without errors

### Phase 2: Remove Tests and Documentation
**Goal:** Clean up all supporting files and documentation

**Tasks:**
1. Delete decorationProvider.test.ts
2. Search and remove references from DEVELOPMENT.md
3. Search and remove references from TESTING.md
4. Search and remove references from TROUBLESHOOTING.md
5. Final verification grep for any remaining references

**Duration:** 10-15 minutes

**Validation:**
- `grep -r "PlansDecorationProvider" vscode-extension/` returns no results
- `grep -r "decorationProvider" vscode-extension/` returns no results
- Extension package and installation succeed
- TreeView functionality fully operational

## Completion Criteria

✅ **Code Removal:**
- decorationProvider.ts deleted
- decorationProvider.test.ts deleted
- All references removed from extension.ts
- No compilation errors

✅ **Documentation Cleanup:**
- DEVELOPMENT.md updated
- TESTING.md updated
- TROUBLESHOOTING.md updated

✅ **Verification:**
- No grep results for "decorationProvider"
- No grep results for "PlansDecorationProvider"
- Extension activates successfully
- TreeView displays items correctly
- File Explorer shows no status badges (expected)

✅ **Testing:**
- Extension packages successfully (`npm run package`)
- Installation succeeds (`code --install-extension cascade-0.1.0.vsix --force`)
- Activation logs omit "File Decoration Provider" section
- Cascade TreeView remains fully functional

## Next Steps

After this spec is approved:
1. Run `/build specs/S67-remove-decoration-provider/plan.md`
2. Follow TDD RED-GREEN-REFACTOR cycle for each task
3. Verify all acceptance criteria before committing
4. Mark S67 as "Completed" in plans/
