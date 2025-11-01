---
spec: S49
phase: 3
title: Create Barrel Export
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 3: Create Barrel Export

## Overview

Create an `index.ts` barrel export file in the treeview module to provide clean import paths for extension.ts. This follows standard TypeScript module organization patterns.

## Prerequisites

- Phase 1 completed (PlanningTreeItem interface exists)
- Phase 2 completed (PlanningTreeProvider class exists)
- Understanding of TypeScript module exports

## Tasks

### Task 1: Create index.ts File

**Action:**
Create barrel export file to re-export all treeview module components.

**File:** `vscode-extension/src/treeview/index.ts`

**Code:**
```typescript
/**
 * Barrel export for treeview module.
 *
 * Provides clean import paths:
 * - import { PlanningTreeProvider, PlanningTreeItem } from './treeview';
 *
 * Instead of:
 * - import { PlanningTreeProvider } from './treeview/PlanningTreeProvider';
 * - import { PlanningTreeItem } from './treeview/PlanningTreeItem';
 */

export { PlanningTreeItem } from './PlanningTreeItem';
export { PlanningTreeProvider } from './PlanningTreeProvider';
```

**Benefits:**
- Cleaner imports in extension.ts
- Single import statement for multiple components
- Standard TypeScript module pattern
- Easier to refactor internal structure

**Validation:**
- File exists at `vscode-extension/src/treeview/index.ts`
- Exports PlanningTreeItem interface
- Exports PlanningTreeProvider class
- JSDoc comment explains module purpose

---

### Task 2: Verify TypeScript Compilation

**Action:**
Compile and verify barrel export resolves correctly.

**Command:**
```bash
cd vscode-extension && npm run compile
```

**Expected Output:**
```
✓ TypeScript compilation successful
```

**Troubleshooting:**
- If export errors: Verify file names match exactly (case-sensitive)
- If import errors: Verify relative paths use `./` prefix

**Validation:**
- No TypeScript errors
- Build succeeds
- Output directory contains compiled JavaScript

---

### Task 3: Test Import Path in Extension.ts (Preview)

**Action:**
Verify that the import statement will work in Phase 4.

**Test Import (DO NOT ADD YET):**
```typescript
import { PlanningTreeProvider, PlanningTreeItem } from './treeview';
```

**This import will be added in Phase 4** when integrating the provider into extension.ts. For now, just verify mentally that the structure is correct:
- `extension.ts` is in `src/`
- `index.ts` is in `src/treeview/`
- Relative path from extension.ts: `./treeview`

**References:**
- TypeScript module resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- Barrel exports pattern: https://basarat.gitbook.io/typescript/main-1/barrel

**Validation:**
- Import path `./treeview` is correct from extension.ts
- Module structure follows TypeScript conventions

---

## Completion Criteria

- ✅ File `vscode-extension/src/treeview/index.ts` created
- ✅ PlanningTreeItem exported from index.ts
- ✅ PlanningTreeProvider exported from index.ts
- ✅ JSDoc comment documents barrel export purpose
- ✅ TypeScript compiles without errors
- ✅ Import path verified for Phase 4 integration

## Next Phase

Proceed to **Phase 4: Integrate Provider in Extension** to replace the PlaceholderTreeProvider with PlanningTreeProvider and connect everything together.
