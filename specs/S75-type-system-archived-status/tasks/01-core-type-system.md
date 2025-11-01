---
spec: S75
phase: 1
title: Core Type System Updates
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: Core Type System Updates

## Overview

This phase updates the foundational type system to include "Archived" as a valid Status value. We modify the TypeScript type definition and validation logic to recognize archived items in frontmatter, laying the groundwork for all subsequent archive functionality.

This is a **pure type system change** - no visual or UI changes occur in this phase.

## Prerequisites

- VSCode extension source code accessible
- Node.js and npm installed
- TypeScript compiler available (`npm run compile`)
- Basic understanding of TypeScript union types

## Tasks

### Task 1: Update Status Type Definition

**File:** `vscode-extension/src/types.ts`
**Line:** 14

**Current Code:**
```typescript
export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed';
```

**Updated Code:**
```typescript
export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed' | 'Archived';
```

**Instructions:**
1. Open `vscode-extension/src/types.ts`
2. Locate the `Status` type definition (line 14)
3. Add `| 'Archived'` to the end of the union type
4. Save file

**Expected Outcome:**
- TypeScript compiler recognizes 'Archived' as valid Status value
- All Status type references accept 'Archived' without errors

**Reference:**
- TypeScript Union Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types

---

### Task 2: Update Frontmatter Validation Logic

**File:** `vscode-extension/src/parser.ts`
**Line:** 71

**Current Code:**
```typescript
function isValidStatus(status: string): boolean {
  const validStatuses = ['Not Started', 'In Planning', 'Ready', 'In Progress', 'Blocked', 'Completed'];
  return validStatuses.includes(status);
}
```

**Updated Code:**
```typescript
function isValidStatus(status: string): boolean {
  const validStatuses = ['Not Started', 'In Planning', 'Ready', 'In Progress', 'Blocked', 'Completed', 'Archived'];
  return validStatuses.includes(status);
}
```

**Instructions:**
1. Open `vscode-extension/src/parser.ts`
2. Locate the `isValidStatus()` function (line 70-73)
3. Add `'Archived'` to the `validStatuses` array
4. Save file

**Expected Outcome:**
- `parseFrontmatter()` accepts `status: Archived` without validation errors
- No "Invalid status value" error when parsing archived files
- FrontmatterCache can load files with Archived status

**Reference:**
- Frontmatter Schema: `docs/frontmatter-schema.md`
- Parser Documentation: `vscode-extension/src/parser.ts:1-14`

---

### Task 3: Verify TypeScript Compilation

**Command:**
```bash
cd vscode-extension
npm run compile
```

**Instructions:**
1. Open integrated terminal in VSCode
2. Navigate to `vscode-extension` directory
3. Run `npm run compile`
4. Check for TypeScript errors

**Expected Outcome:**
- Compilation succeeds with **0 errors**
- No warnings about exhaustive checks on Status type
- Output shows: `Compilation complete. Watching for file changes.`

**Troubleshooting:**
- If errors occur, check for:
  - Status type usage in switch statements (should now include Archived case)
  - Status type usage in Record<Status, T> types (should now require Archived key)
  - Status type guards or validators (should now check for Archived)

**Reference:**
- TypeScript Handbook - Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

---

### Task 4: Verify Parser Accepts Archived Status

**File:** `vscode-extension/src/parser.ts`
**Test:** Manual validation test

**Instructions:**
1. Create a test string with Archived status:
   ```typescript
   const testContent = `---
   item: S999
   title: Test Archived Item
   type: story
   status: Archived
   priority: Medium
   created: 2025-10-23
   updated: 2025-10-23
   ---

   # S999 - Test Archived Item
   Test content.
   `;
   ```
2. In VSCode debugger or Node REPL, import parser:
   ```typescript
   import { parseFrontmatter } from './src/parser';
   ```
3. Parse test content:
   ```typescript
   const result = parseFrontmatter(testContent);
   console.log(result);
   ```
4. Verify result:
   ```typescript
   // Expected:
   {
     success: true,
     frontmatter: {
       item: 'S999',
       status: 'Archived',
       // ... other fields
     }
   }
   ```

**Expected Outcome:**
- `result.success` is `true`
- `result.frontmatter.status` equals `'Archived'`
- No error about invalid status value

**Alternative Test (Integration):**
- Create file `plans/test-archived.md` with Archived frontmatter
- Open file in VSCode with extension enabled
- Check output channel for no parsing errors
- Verify file appears in ItemsCache

---

### Task 5: Document Type System Change

**File:** `vscode-extension/CHANGELOG.md` (if exists) or internal notes

**Instructions:**
1. Add entry documenting the type system change:
   ```markdown
   ## [Unreleased]
   ### Added
   - S75: Added 'Archived' status to type system for archive support
   - Updated Status type enum to include 'Archived' value
   - Updated frontmatter validation to accept 'Archived' status
   ```

**Expected Outcome:**
- Change is documented for future reference
- Other developers aware of new status value

**Note:** This is optional but recommended for team coordination.

## Completion Criteria

Before proceeding to Phase 2, verify:

- ✅ Status type in `types.ts` includes 'Archived'
- ✅ `isValidStatus()` in `parser.ts` includes 'Archived'
- ✅ TypeScript compilation succeeds with 0 errors (`npm run compile`)
- ✅ Parser accepts `status: Archived` in frontmatter (manual test)
- ✅ No console errors or warnings when loading extension
- ✅ All existing unit tests still pass (`npm test`)

**Verification Command:**
```bash
cd vscode-extension
npm run compile && npm test
```

Expected output: All tests pass, 0 TypeScript errors.

## Next Phase

Proceed to **Phase 2: Icon and Visual System Updates** (`02-icon-visual-system.md`)

This phase adds visual representation for Archived status in the TreeView by updating icon mappings and status group ordering.
