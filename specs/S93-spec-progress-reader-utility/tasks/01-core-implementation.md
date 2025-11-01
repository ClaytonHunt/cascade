---
spec: S93
phase: 1
title: Core Implementation
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Core Implementation

## Overview

Implement the core `specProgressReader.ts` module with two main functions: `readSpecProgress()` for reading spec progress data from spec directories, and `checkSyncStatus()` for detecting sync issues between story and spec status.

This phase delivers a working module that can read spec plan.md frontmatter, count completed phases from task files, and detect when specs are ahead of their parent stories.

## Prerequisites

- Understanding of async/await patterns in TypeScript
- Familiarity with Node.js fs.promises API
- Knowledge of glob pattern matching
- Understanding of existing frontmatter parsing (parser.ts)
- Access to spec directories in specs/ folder

## Tasks

### Task 1: Create Module File and Imports

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Create new file with required imports

**Implementation**:
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { parseFrontmatter } from '../parser';
import { Status } from '../types';
```

**Expected Outcome**: File created with all necessary imports

**Validation**:
- ✅ File exists at correct path
- ✅ All imports resolve without errors
- ✅ TypeScript compilation succeeds

---

### Task 2: Define SpecProgress Interface

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Define the data interface for spec progress information

**Implementation**:
```typescript
/**
 * Progress information for a spec directory.
 *
 * Contains phase completion statistics and sync status relative to parent story.
 * Return value from readSpecProgress() when spec is found and valid.
 */
export interface SpecProgress {
  /** Absolute path to spec directory */
  specDir: string;

  /** Total number of phases in spec (from plan.md frontmatter or counted) */
  totalPhases: number;

  /** Number of phases with status: Completed */
  completedPhases: number;

  /** Current phase number (completedPhases + 1) */
  currentPhase: number;

  /** Spec status from plan.md frontmatter */
  specStatus: Status;

  /** True if spec status matches story status, false if spec is ahead */
  inSync: boolean;
}
```

**Expected Outcome**: Interface defined and exported

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:19-31` (ProgressInfo interface for similar pattern)

---

### Task 3: Implement checkSyncStatus() Helper

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Create helper function to detect sync issues

**Implementation**:
```typescript
/**
 * Checks if story status and spec status are in sync.
 *
 * Sync rules:
 * - Spec "Completed" but story not "Completed" → out of sync
 * - Spec "In Progress" but story "Ready" → out of sync
 * - Otherwise → in sync
 *
 * @param storyStatus - Status from parent story frontmatter
 * @param specStatus - Status from spec plan.md frontmatter
 * @returns true if in sync, false if spec is ahead of story
 *
 * @example
 * ```typescript
 * checkSyncStatus('Ready', 'In Progress')      // false (spec ahead)
 * checkSyncStatus('In Progress', 'In Progress') // true (in sync)
 * checkSyncStatus('Completed', 'Completed')     // true (in sync)
 * ```
 */
export function checkSyncStatus(
  storyStatus: Status,
  specStatus: Status
): boolean {
  // Spec completed but story not completed → out of sync
  if (specStatus === 'Completed' && storyStatus !== 'Completed') {
    return false;
  }

  // Spec in progress but story still ready → out of sync
  if (specStatus === 'In Progress' && storyStatus === 'Ready') {
    return false;
  }

  // All other combinations are in sync
  return true;
}
```

**Expected Outcome**: Function correctly detects out-of-sync conditions

**Validation**:
- ✅ Story "Ready" + Spec "In Progress" → returns `false`
- ✅ Story "Ready" + Spec "Completed" → returns `false`
- ✅ Story "In Progress" + Spec "In Progress" → returns `true`
- ✅ Story "In Progress" + Spec "Completed" → returns `false`
- ✅ Story "Completed" + Spec "Completed" → returns `true`

---

### Task 4: Implement Directory Existence Check

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Add helper to check if directory exists

**Implementation**:
```typescript
/**
 * Checks if a directory exists and is accessible.
 *
 * @param dirPath - Absolute path to directory
 * @returns true if directory exists, false otherwise
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    // Directory doesn't exist or permission denied
    return false;
  }
}
```

**Expected Outcome**: Function safely checks directory existence without throwing

**Reference**: `vscode-extension/src/cache.ts:63-71` (getFileMtime pattern)

---

### Task 5: Implement readSpecProgress() - Part 1 (Directory Check)

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Start main function with directory validation

**Implementation**:
```typescript
/**
 * Reads spec progress from a spec directory.
 *
 * Parses spec plan.md frontmatter to get total phases and status,
 * then scans phase task files to count completed phases. Also checks
 * if spec status is in sync with story status.
 *
 * @param specDir - Absolute path to spec directory (e.g., "D:/projects/lineage/specs/S93-...")
 * @param storyStatus - Status from parent story frontmatter
 * @returns SpecProgress if spec found and valid, null if not found or invalid
 *
 * @example
 * ```typescript
 * const progress = await readSpecProgress(
 *   'D:/projects/lineage/specs/S93-spec-progress-reader-utility',
 *   'In Progress'
 * );
 *
 * if (progress) {
 *   console.log(`Progress: ${progress.completedPhases}/${progress.totalPhases}`);
 * }
 * ```
 */
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // Step 1: Check if spec directory exists
  if (!(await directoryExists(specDir))) {
    return null;
  }

  // Continue in next task...
}
```

**Expected Outcome**: Function skeleton with directory check

**Validation**:
- ✅ Missing directory returns `null`
- ✅ No exceptions thrown for missing directory

---

### Task 6: Implement readSpecProgress() - Part 2 (Read plan.md)

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Add logic to read and parse plan.md frontmatter

**Implementation**:
```typescript
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // Step 1: Check if spec directory exists
  if (!(await directoryExists(specDir))) {
    return null;
  }

  // Step 2: Read spec plan.md
  const planPath = path.join(specDir, 'plan.md');

  let planContent: string;
  try {
    planContent = await fs.readFile(planPath, 'utf-8');
  } catch (error) {
    // plan.md doesn't exist or can't be read
    return null;
  }

  // Step 3: Parse frontmatter
  const parseResult = parseFrontmatter(planContent);

  if (!parseResult.success || !parseResult.frontmatter) {
    // Malformed frontmatter or validation failed
    return null;
  }

  const frontmatter = parseResult.frontmatter;

  // Extract total phases (may be undefined)
  let totalPhases = frontmatter.phases || 0;
  const specStatus = frontmatter.status;

  // Continue in next task...
}
```

**Expected Outcome**: plan.md read and parsed successfully

**Validation**:
- ✅ Missing plan.md returns `null`
- ✅ Malformed frontmatter returns `null`
- ✅ Valid frontmatter extracts phases and status

**Reference**: `vscode-extension/src/cache.ts:158-163` (file reading pattern)

---

### Task 7: Implement readSpecProgress() - Part 3 (Count Phases)

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Add logic to scan and count phase files

**Implementation**:
```typescript
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // ... previous code from Task 6 ...

  // Step 4: Find phase task files
  const tasksPattern = path.join(specDir, 'tasks', '*.md').replace(/\\/g, '/');
  const taskFiles = await glob(tasksPattern);

  // If no phases field in frontmatter, count actual files
  if (totalPhases === 0) {
    totalPhases = taskFiles.length;
  }

  // Step 5: Count completed phases
  let completedPhases = 0;

  for (const taskFile of taskFiles) {
    try {
      const taskContent = await fs.readFile(taskFile, 'utf-8');
      const taskParseResult = parseFrontmatter(taskContent);

      if (taskParseResult.success && taskParseResult.frontmatter) {
        if (taskParseResult.frontmatter.status === 'Completed') {
          completedPhases++;
        }
      }
      // Ignore malformed phase files - just don't count them
    } catch (error) {
      // Ignore unreadable phase files - just don't count them
      continue;
    }
  }

  // Continue in next task...
}
```

**Expected Outcome**: Phase files scanned and completed count accurate

**Validation**:
- ✅ Correctly counts phases with status "Completed"
- ✅ Ignores phases with other statuses
- ✅ Handles malformed phase files gracefully
- ✅ Falls back to counting files if phases field missing

**Reference**: Glob pattern matching for markdown files

---

### Task 8: Implement readSpecProgress() - Part 4 (Build Result)

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Complete function by building and returning SpecProgress object

**Implementation**:
```typescript
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // ... previous code from Tasks 5-7 ...

  // Step 6: Calculate current phase
  const currentPhase = Math.min(completedPhases + 1, totalPhases);

  // Step 7: Check sync status
  const inSync = checkSyncStatus(storyStatus, specStatus);

  // Step 8: Return result
  return {
    specDir,
    totalPhases,
    completedPhases,
    currentPhase,
    specStatus,
    inSync
  };
}
```

**Expected Outcome**: Complete working function returning SpecProgress

**Validation**:
- ✅ Returns SpecProgress object with all fields populated
- ✅ currentPhase correctly calculated (completedPhases + 1)
- ✅ currentPhase capped at totalPhases (doesn't exceed)
- ✅ inSync reflects result of checkSyncStatus()

---

### Task 9: Add Logging for Debugging

**File**: `vscode-extension/src/treeview/specProgressReader.ts`

**Action**: Add optional logging to help debug spec reading issues

**Implementation**:
```typescript
// At the top of the file, add logging constant
const LOG_PREFIX = '[SpecProgressReader]';

// In readSpecProgress(), add logging at key points:

export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // Log entry (optional - can be removed in production)
  // console.log(`${LOG_PREFIX} Reading spec: ${specDir}`);

  if (!(await directoryExists(specDir))) {
    // console.log(`${LOG_PREFIX} Directory not found: ${specDir}`);
    return null;
  }

  // ... rest of implementation ...

  // Log success (optional)
  // console.log(`${LOG_PREFIX} Spec progress: ${completedPhases}/${totalPhases}, inSync: ${inSync}`);

  return {
    specDir,
    totalPhases,
    completedPhases,
    currentPhase,
    specStatus,
    inSync
  };
}
```

**Expected Outcome**: Logging available for debugging (commented out by default)

**Note**: Logging is optional and can be removed or commented out for production

---

### Task 10: Verify TypeScript Compilation

**Action**: Compile module and check for type errors

**Command**:
```bash
cd vscode-extension && npm run compile
```

**Expected Outcome**: No TypeScript errors

**Validation**:
- ✅ Module compiles without errors
- ✅ All imports resolve correctly
- ✅ Return types match signatures
- ✅ No "any" types used (except in error handling)

**Reference**: `vscode-extension/package.json` (compile script)

---

## Completion Criteria

- ✅ `specProgressReader.ts` file created in `vscode-extension/src/treeview/`
- ✅ `SpecProgress` interface defined and exported
- ✅ `checkSyncStatus()` function implemented with correct logic
- ✅ `readSpecProgress()` function implemented with all steps:
  - Directory existence check
  - plan.md reading and parsing
  - Phase file scanning and counting
  - Result object construction
- ✅ Error handling for all failure cases (returns `null`)
- ✅ TypeScript compilation succeeds with no errors
- ✅ All type annotations present (no implicit `any`)
- ✅ JSDoc comments added for public functions

## Next Phase

Proceed to Phase 2: Unit Tests (`tasks/02-unit-tests.md`)

Write comprehensive unit tests to verify all functionality and edge cases.
