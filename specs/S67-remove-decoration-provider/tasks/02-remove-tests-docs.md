---
spec: S67
phase: 2
title: Remove Tests and Documentation
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Remove Tests and Documentation

## Overview

This phase completes the removal of PlansDecorationProvider by deleting test files and removing all documentation references. This ensures no orphaned tests or confusing documentation remains after the provider code is removed.

The cleanup covers:
- Test file deletion (decorationProvider.test.ts)
- Documentation updates (DEVELOPMENT.md, TESTING.md, TROUBLESHOOTING.md)
- Final verification to catch any remaining references

## Prerequisites

- Phase 1 completed (all provider code removed from extension.ts and decorationProvider.ts deleted)
- Extension compiles successfully without errors
- Understanding of Cascade documentation structure

## Tasks

### Task 1: Delete decorationProvider.test.ts

**Location:** `vscode-extension/src/test/suite/decorationProvider.test.ts`

**Action:** Delete the entire test file

**Command:**
```bash
rm vscode-extension/src/test/suite/decorationProvider.test.ts
```

**Expected Outcome:**
- Test file no longer exists
- Git shows file deletion
- Test suite still runs (other tests unaffected)

**Verification:**
```bash
# Verify file deleted
ls vscode-extension/src/test/suite/decorationProvider.test.ts
# Expected: No such file or directory

# Run remaining tests to verify no breakage
cd vscode-extension && npm test
# Expected: All remaining tests pass (decorationProvider tests skipped)

# Check git status
git status
# Expected: Should show "deleted: vscode-extension/src/test/suite/decorationProvider.test.ts"
```

**Documentation Reference:**
- VSCode Extension Testing: https://code.visualstudio.com/api/working-with-extensions/testing-extension

---

### Task 2: Update DEVELOPMENT.md

**Location:** `vscode-extension/DEVELOPMENT.md`

**Action:** Search for references to PlansDecorationProvider or decorationProvider and remove/update them

**Commands:**
```bash
# Search for references
grep -n "decoration" vscode-extension/DEVELOPMENT.md

# Open file for manual editing
code vscode-extension/DEVELOPMENT.md
```

**Expected Changes:**
- Remove any sections describing file decoration provider
- Update component diagrams if they show PlansDecorationProvider
- Remove mentions of decoration from architecture overview
- Update "Features" list to remove file decoration references

**Example Changes:**

**Before:**
```markdown
## Components

- **PlansDecorationProvider**: Decorates planning files with status badges
- **PlanningTreeProvider**: Hierarchical view of planning items
- **FrontmatterCache**: Caches parsed frontmatter data
```

**After:**
```markdown
## Components

- **PlanningTreeProvider**: Hierarchical view of planning items
- **FrontmatterCache**: Caches parsed frontmatter data
```

**Verification:**
```bash
# Check no decoration references remain
grep -i "decoration" vscode-extension/DEVELOPMENT.md
# Expected: Should return minimal results (only general VSCode decoration APIs if any)

grep -i "PlansDecorationProvider" vscode-extension/DEVELOPMENT.md
# Expected: No results
```

---

### Task 3: Update TESTING.md

**Location:** `vscode-extension/TESTING.md`

**Action:** Remove references to decorationProvider tests and update test suite documentation

**Commands:**
```bash
# Search for references
grep -n "decoration" vscode-extension/TESTING.md

# Open file for manual editing
code vscode-extension/TESTING.md
```

**Expected Changes:**
- Remove decorationProvider.test.ts from test file listings
- Update test count if documented
- Remove any specific test instructions for decoration provider

**Example Changes:**

**Before:**
```markdown
## Test Suites

- `decorationProvider.test.ts` - File decoration provider tests
- `cache.test.ts` - Frontmatter cache tests
- `parser.test.ts` - YAML frontmatter parser tests
```

**After:**
```markdown
## Test Suites

- `cache.test.ts` - Frontmatter cache tests
- `parser.test.ts` - YAML frontmatter parser tests
```

**Verification:**
```bash
# Check no decoration test references remain
grep -i "decorationProvider.test" vscode-extension/TESTING.md
# Expected: No results

grep -i "decoration.*test" vscode-extension/TESTING.md
# Expected: No results
```

---

### Task 4: Update TROUBLESHOOTING.md

**Location:** `vscode-extension/TROUBLESHOOTING.md`

**Action:** Remove troubleshooting guides related to file decoration provider

**Commands:**
```bash
# Search for references
grep -n "decoration" vscode-extension/TROUBLESHOOTING.md

# Open file for manual editing
code vscode-extension/TROUBLESHOOTING.md
```

**Expected Changes:**
- Remove any "File decorations not showing" troubleshooting entries
- Remove decoration-related error messages
- Update component diagnostic commands if they reference decoration provider

**Example Changes:**

**Before:**
```markdown
### File Decorations Not Showing

If status badges aren't appearing in File Explorer:
1. Check output channel for decoration provider logs
2. Verify files are in plans/ directory
3. Check frontmatter syntax is valid
```

**After:**
```markdown
(Section removed - decorations no longer supported)
```

**Verification:**
```bash
# Check no decoration troubleshooting remains
grep -i "decoration" vscode-extension/TROUBLESHOOTING.md
# Expected: No results

grep -i "badge" vscode-extension/TROUBLESHOOTING.md
# Expected: No results (unless badges mentioned in TreeView context)
```

---

### Task 5: Final Verification - Comprehensive Search

**Action:** Perform comprehensive grep search across entire vscode-extension directory to catch any remaining references

**Commands:**
```bash
# Search entire vscode-extension directory
cd vscode-extension

# Check for decorationProvider references
grep -r "decorationProvider" .
# Expected: No results in src/, docs/, or config files (may appear in git history)

# Check for PlansDecorationProvider references
grep -r "PlansDecorationProvider" .
# Expected: No results

# Check for generic decoration references (review each result)
grep -r "decoration" . --exclude-dir=node_modules --exclude-dir=.git
# Expected: Only general VSCode API references (e.g., FileDecoration type in comments)
```

**Review Each Result:**
- If result is in documentation: Update or remove
- If result is in code comments: Review for accuracy, remove if outdated
- If result is in git history: Acceptable (history should be preserved)
- If result is in node_modules: Ignore (third-party code)

**Verification:**
```bash
# Generate final grep report
echo "=== decorationProvider References ===" > /tmp/cleanup-report.txt
grep -rn "decorationProvider" vscode-extension/ >> /tmp/cleanup-report.txt 2>&1 || echo "None found" >> /tmp/cleanup-report.txt

echo "=== PlansDecorationProvider References ===" >> /tmp/cleanup-report.txt
grep -rn "PlansDecorationProvider" vscode-extension/ >> /tmp/cleanup-report.txt 2>&1 || echo "None found" >> /tmp/cleanup-report.txt

# Review report
cat /tmp/cleanup-report.txt
# Expected: "None found" for both sections
```

---

### Task 6: Package and Test Extension

**Action:** Package extension and verify full functionality with provider removed

**Commands:**
```bash
cd vscode-extension

# Clean build
npm run clean
npm run compile

# Run tests
npm test
# Expected: All tests pass

# Package extension
npm run package
# Expected: cascade-0.1.0.vsix created successfully

# Install in current VSCode instance
code --install-extension cascade-0.1.0.vsix --force

# Reload VSCode window
# (Manually: Ctrl+Shift+P → "Developer: Reload Window")
```

**Manual Testing Checklist:**

1. **Activation Logs:**
   - Open Output Channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
   - Verify no "File Decoration Provider" section appears
   - Verify "Cascade TreeView" section still present
   - Verify "Frontmatter Cache" section still present

2. **File Explorer Verification:**
   - Navigate to plans/ directory in File Explorer
   - Open several planning markdown files
   - Confirm NO status badges appear on file names
   - Confirm NO color changes on file names (expected behavior)

3. **TreeView Functionality:**
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Verify items load correctly
   - Expand status groups
   - Drag item between status groups (if F18 implemented)
   - Verify TreeView still functional

4. **Performance Check:**
   - Extension should activate faster (no decoration provider overhead)
   - No errors in Developer Tools console (Ctrl+Shift+I)

**Expected Outcomes:**
- ✅ Extension packages successfully
- ✅ Installation succeeds without errors
- ✅ Activation logs omit decoration provider section
- ✅ File Explorer shows no status badges (as intended)
- ✅ TreeView remains fully functional
- ✅ No console errors or warnings

**Verification:**
```bash
# Check package size (should be slightly smaller)
ls -lh vscode-extension/cascade-0.1.0.vsix
# Expected: File exists, size reasonable (few KB smaller than before)

# Verify VSIX contents (optional)
unzip -l vscode-extension/cascade-0.1.0.vsix | grep decoration
# Expected: No decorationProvider.js or decorationProvider.test.js files
```

---

## Completion Criteria

✅ **Test Cleanup:**
- [ ] decorationProvider.test.ts file deleted
- [ ] Test suite runs successfully without decoration tests
- [ ] No orphaned test imports or references

✅ **Documentation Updates:**
- [ ] DEVELOPMENT.md updated (decoration references removed)
- [ ] TESTING.md updated (test file references removed)
- [ ] TROUBLESHOOTING.md updated (decoration troubleshooting removed)

✅ **Verification:**
- [ ] `grep -r "decorationProvider" vscode-extension/` returns no results
- [ ] `grep -r "PlansDecorationProvider" vscode-extension/` returns no results
- [ ] Final cleanup report shows "None found"

✅ **Functional Testing:**
- [ ] Extension packages successfully
- [ ] Extension installs without errors
- [ ] Activation logs omit "File Decoration Provider"
- [ ] File Explorer shows no status badges (expected)
- [ ] Cascade TreeView fully functional
- [ ] No console errors during activation

✅ **Git Status:**
- [ ] All changes staged
- [ ] Git diff reviewed for accuracy
- [ ] Ready to commit (once S67 build process complete)

## Next Steps

After completing this phase:
1. Verify all acceptance criteria from S67 story are met
2. Mark S67 as "Completed" in planning system
3. Commit changes with message:
   ```
   S67 STORY COMPLETE: Remove FileDecorationProvider Registration

   - Removed PlansDecorationProvider from extension.ts
   - Deleted decorationProvider.ts and decorationProvider.test.ts
   - Updated documentation (DEVELOPMENT.md, TESTING.md, TROUBLESHOOTING.md)
   - Verified extension activation and TreeView functionality

   File decoration system fully removed. TreeView (F16-F20) now provides
   all visualization functionality.

   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

## Documentation References

- **VSCode Extension API - FileDecorationProvider:** https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider
- **VSCode Extension Testing:** https://code.visualstudio.com/api/working-with-extensions/testing-extension
- **Git Best Practices - File Deletion:** https://git-scm.com/docs/git-rm
