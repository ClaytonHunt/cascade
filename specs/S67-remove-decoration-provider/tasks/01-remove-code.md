---
spec: S67
phase: 1
title: Remove Registration and Provider Code
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: Remove Registration and Provider Code

## Overview

This phase removes all TypeScript code related to the PlansDecorationProvider system. We'll systematically remove the import, variable declaration, registration code, disposal code, and finally delete the source file itself.

The removal follows a specific order to minimize intermediate compilation errors:
1. Remove usage sites first (registration, disposal)
2. Remove variable declaration
3. Remove import
4. Delete source file

## Prerequisites

- Understanding of VSCode extension lifecycle (activate/deactivate)
- Familiarity with extension.ts structure
- Git working directory clean (recommended for easy rollback)

## Tasks

### Task 1: Remove Provider Registration from activate()

**Location:** `vscode-extension/src/extension.ts:1172-1182`

**Current Code:**
```typescript
// Initialize decoration provider for plans/ directory
outputChannel.appendLine('--- File Decoration Provider ---');
decorationProvider = new PlansDecorationProvider(outputChannel);

// Register provider with VSCode
const decorationDisposable = vscode.window.registerFileDecorationProvider(decorationProvider);
context.subscriptions.push(decorationDisposable);

outputChannel.appendLine('✅ Decoration provider registered');
outputChannel.appendLine('   Provider will decorate files in plans/ directory');
outputChannel.appendLine('');
```

**Action:** Delete the entire block (lines 1172-1182)

**Expected Outcome:**
- activate() function compiles without the decoration provider initialization
- No output channel messages about "File Decoration Provider"
- Git diff shows 11 lines removed

**Verification:**
```bash
# Check line was removed
grep -n "Initialize decoration provider" vscode-extension/src/extension.ts
# Expected: No results

# Check registration removed
grep -n "registerFileDecorationProvider" vscode-extension/src/extension.ts
# Expected: No results
```

---

### Task 2: Remove Provider Disposal from deactivate()

**Location:** `vscode-extension/src/extension.ts:1459-1467`

**Current Code:**
```typescript
// Dispose decoration provider
if (decorationProvider) {
  decorationProvider.dispose();
  decorationProvider = null;

  if (outputChannel) {
    outputChannel.appendLine('✅ Decoration provider disposed');
  }
}
```

**Action:** Delete the entire block (lines 1459-1467)

**Expected Outcome:**
- deactivate() function no longer references decorationProvider
- Git diff shows 9 lines removed
- Function still properly disposes other resources (cache, TreeView, etc.)

**Verification:**
```bash
# Check disposal code removed
grep -n "Dispose decoration provider" vscode-extension/src/extension.ts
# Expected: No results

# Verify deactivate() still exists and has other disposal logic
grep -n "export function deactivate" vscode-extension/src/extension.ts
# Expected: Should find the function definition
```

---

### Task 3: Remove Module-Level Variable Declaration

**Location:** `vscode-extension/src/extension.ts:37-38`

**Current Code:**
```typescript
// Decoration provider for extension (module-level for FileSystemWatcher access)
let decorationProvider: PlansDecorationProvider | null = null;
```

**Action:** Delete both lines (the comment and variable declaration)

**Expected Outcome:**
- Variable no longer declared at module scope
- TypeScript will show errors about undefined `decorationProvider` if any references remain
- Git diff shows 2 lines removed

**Verification:**
```bash
# Check variable removed
grep -n "let decorationProvider" vscode-extension/src/extension.ts
# Expected: No results

# Compile to catch any remaining references
cd vscode-extension && npm run compile
# Expected: Should fail if any references remain, succeed if clean
```

---

### Task 4: Remove Import Statement

**Location:** `vscode-extension/src/extension.ts:25`

**Current Code:**
```typescript
import { PlansDecorationProvider } from './decorationProvider';
```

**Action:** Delete the entire line

**Expected Outcome:**
- Import statement removed
- TypeScript will error if PlansDecorationProvider is referenced anywhere
- Git diff shows 1 line removed

**Verification:**
```bash
# Check import removed
grep -n "PlansDecorationProvider" vscode-extension/src/extension.ts
# Expected: No results

# Check decorationProvider import removed
grep -n "from './decorationProvider'" vscode-extension/src/extension.ts
# Expected: No results
```

---

### Task 5: Delete decorationProvider.ts Source File

**Location:** `vscode-extension/src/decorationProvider.ts`

**Action:** Delete the entire file (189 lines)

**Command:**
```bash
rm vscode-extension/src/decorationProvider.ts
```

**Expected Outcome:**
- File no longer exists in src/ directory
- Git shows file deletion
- TypeScript compilation succeeds (no imports reference this file)

**Verification:**
```bash
# Verify file deleted
ls vscode-extension/src/decorationProvider.ts
# Expected: No such file or directory

# Check git status
git status
# Expected: Should show "deleted: vscode-extension/src/decorationProvider.ts"
```

---

### Task 6: Compile and Verify No Errors

**Action:** Run TypeScript compilation to ensure no errors

**Commands:**
```bash
cd vscode-extension
npm run compile
```

**Expected Outcome:**
- Compilation succeeds with no errors
- No warnings about missing imports or undefined variables
- Output files generated in out/ directory

**Verification:**
```bash
# Check compilation output
echo $?
# Expected: 0 (success)

# Verify no references remain
grep -r "decorationProvider" vscode-extension/src/
# Expected: No results (or only in comments)

grep -r "PlansDecorationProvider" vscode-extension/src/
# Expected: No results
```

**Troubleshooting:**
- If compilation fails, review error messages for any missed references
- Check if test files still import PlansDecorationProvider (will be removed in Phase 2)
- Verify git diff shows all expected removals

---

## Completion Criteria

✅ **Code Removed:**
- [ ] Provider registration removed from activate() (extension.ts:1172-1182)
- [ ] Provider disposal removed from deactivate() (extension.ts:1459-1467)
- [ ] Module-level variable removed (extension.ts:37-38)
- [ ] Import statement removed (extension.ts:25)
- [ ] decorationProvider.ts file deleted

✅ **Verification:**
- [ ] `npm run compile` succeeds with no errors
- [ ] `grep -r "decorationProvider" vscode-extension/src/` returns no results
- [ ] `grep -r "PlansDecorationProvider" vscode-extension/src/` returns no results
- [ ] Git diff shows 4 edit locations + 1 file deletion

✅ **Testing:**
- [ ] Extension can be packaged: `npm run package`
- [ ] Extension activates in VSCode without errors
- [ ] Output channel does NOT show "File Decoration Provider" section
- [ ] File Explorer shows no status badges on planning files

## Next Phase

Proceed to **Phase 2: Remove Tests and Documentation** to complete the cleanup by removing test files and documentation references.
