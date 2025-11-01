---
spec: S73
phase: 1
title: Change Detection Infrastructure
status: Completed
priority: Medium
created: 2025-10-22
updated: 2025-10-22
---

# Phase 1: Change Detection Infrastructure

## Overview

Create the change detection utility module that analyzes file changes and classifies them as STRUCTURE, CONTENT, or BODY changes. This infrastructure provides the foundation for selective refresh strategies.

## Prerequisites

- S71 (FileSystemWatcher to TreeView Integration) completed
- S72 (Debounced Refresh Mechanism) completed
- Understanding of VSCode TreeDataProvider API
- Familiarity with FrontmatterCache implementation

## Tasks

### Task 1: Create Change Detection Types and Enums

**File:** `vscode-extension/src/utils/changeDetection.ts` (NEW)

**Create new file with type definitions:**

```typescript
import * as vscode from 'vscode';
import { FrontmatterCache } from '../cache';
import { PlanningTreeItem } from '../types';

/**
 * Classification of file change types based on UI impact.
 *
 * STRUCTURE: Changes that affect tree structure (status, file add/delete)
 *           Requires full TreeView refresh.
 *
 * CONTENT:   Changes that affect display but not structure (title, priority)
 *           Can use partial TreeView refresh (single item update).
 *
 * BODY:      Changes to non-frontmatter content (description, acceptance criteria)
 *           No TreeView refresh needed (invisible to TreeView).
 */
export enum ChangeType {
  STRUCTURE = 'STRUCTURE',
  CONTENT = 'CONTENT',
  BODY = 'BODY'
}

/**
 * Result of change detection analysis.
 *
 * Contains change classification, before/after data, and list of
 * specific frontmatter fields that changed.
 */
export interface ChangeDetectionResult {
  /** Type of change detected */
  type: ChangeType;

  /** Frontmatter data before change (null if file created) */
  oldData?: PlanningTreeItem | null;

  /** Frontmatter data after change (null if file deleted) */
  newData?: PlanningTreeItem | null;

  /** List of frontmatter field names that changed */
  changedFields: string[];
}
```

**Expected Outcome:**
- ChangeType enum exported
- ChangeDetectionResult interface exported
- Clear JSDoc documentation for each type

---

### Task 2: Implement Core Change Detection Function

**File:** `vscode-extension/src/utils/changeDetection.ts`

**Add detectChangeType() function:**

```typescript
/**
 * Detects the type of change made to a markdown file.
 *
 * Strategy:
 * 1. Retrieve cached frontmatter before invalidation (oldData)
 * 2. Invalidate cache and re-parse file (newData)
 * 3. Compare frontmatter fields to determine change type
 * 4. Return ChangeDetectionResult with classification and metadata
 *
 * Performance: ~5ms per file (includes cache invalidation + re-parse)
 *
 * @param uri - URI of changed file
 * @param cache - FrontmatterCache instance
 * @param outputChannel - Output channel for logging
 * @returns Promise<ChangeDetectionResult> with change classification
 */
export async function detectChangeType(
  uri: vscode.Uri,
  cache: FrontmatterCache,
  outputChannel: vscode.OutputChannel
): Promise<ChangeDetectionResult> {
  const startTime = Date.now();
  const filePath = uri.fsPath;

  // Step 1: Get cached data (before invalidation)
  const oldData = cache.get(filePath);

  // Step 2: Invalidate cache and re-parse
  cache.invalidate(filePath);
  const newData = await cache.get(filePath);

  const duration = Date.now() - startTime;
  outputChannel.appendLine(`[ChangeDetect] Analyzed in ${duration}ms: ${filePath}`);

  // Step 3: Classify change based on data availability
  // (Implementation continues in Task 3)

  // Placeholder return
  return {
    type: ChangeType.STRUCTURE,
    oldData,
    newData,
    changedFields: []
  };
}
```

**Expected Outcome:**
- Function signature defined
- Cache read → invalidate → re-parse flow implemented
- Performance timing logged
- Placeholder return structure

---

### Task 3: Implement File Creation/Deletion Detection

**File:** `vscode-extension/src/utils/changeDetection.ts`

**Add logic after Step 2 in detectChangeType():**

```typescript
  // Step 3: Handle file creation
  if (!oldData && newData) {
    outputChannel.appendLine(`[ChangeDetect] File created (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      newData,
      changedFields: ['created']
    };
  }

  // Step 4: Handle file deletion
  if (oldData && !newData) {
    outputChannel.appendLine(`[ChangeDetect] File deleted (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      changedFields: ['deleted']
    };
  }

  // Step 5: Handle error state (both null)
  if (!oldData && !newData) {
    outputChannel.appendLine(`[ChangeDetect] ⚠️  No data (STRUCTURE fallback)`);
    return {
      type: ChangeType.STRUCTURE,
      changedFields: []
    };
  }
```

**Expected Outcome:**
- File creation detected as STRUCTURE
- File deletion detected as STRUCTURE
- Error state handled with STRUCTURE fallback
- Logging confirms detection type

---

### Task 4: Implement Frontmatter Field Comparison

**File:** `vscode-extension/src/utils/changeDetection.ts`

**Add after Step 5:**

```typescript
  // Step 6: Compare frontmatter fields to detect changes
  const changedFields: string[] = [];

  // Critical fields that affect structure/display
  if (oldData!.status !== newData!.status) {
    changedFields.push('status');
  }
  if (oldData!.priority !== newData!.priority) {
    changedFields.push('priority');
  }
  if (oldData!.title !== newData!.title) {
    changedFields.push('title');
  }
  if (oldData!.item !== newData!.item) {
    changedFields.push('item');
  }

  // Compare dependencies array (JSON stringify for deep comparison)
  const oldDeps = JSON.stringify(oldData!.dependencies || []);
  const newDeps = JSON.stringify(newData!.dependencies || []);
  if (oldDeps !== newDeps) {
    changedFields.push('dependencies');
  }

  outputChannel.appendLine(
    `[ChangeDetect] Changed fields: ${changedFields.length > 0 ? changedFields.join(', ') : 'none'}`
  );
```

**Expected Outcome:**
- All relevant frontmatter fields compared
- changedFields array populated
- Logging shows which fields changed

---

### Task 5: Implement Change Type Classification

**File:** `vscode-extension/src/utils/changeDetection.ts`

**Add after Step 6:**

```typescript
  // Step 7: Classify change based on which fields changed

  // STRUCTURE: Status change (affects status group membership)
  if (changedFields.includes('status')) {
    outputChannel.appendLine(
      `[ChangeDetect] Status changed: ${oldData!.status} → ${newData!.status} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // STRUCTURE: Item number change (affects hierarchy position)
  if (changedFields.includes('item')) {
    outputChannel.appendLine(
      `[ChangeDetect] Item number changed: ${oldData!.item} → ${newData!.item} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // STRUCTURE: Dependencies change (may affect hierarchy)
  if (changedFields.includes('dependencies')) {
    outputChannel.appendLine(`[ChangeDetect] Dependencies changed (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      oldData,
      newData,
      changedFields
    };
  }

  // CONTENT: Title or priority change (affects display only)
  if (changedFields.includes('title') || changedFields.includes('priority')) {
    outputChannel.appendLine(
      `[ChangeDetect] Display fields changed: ${changedFields.join(', ')} (CONTENT)`
    );
    return {
      type: ChangeType.CONTENT,
      oldData,
      newData,
      changedFields
    };
  }

  // BODY: No frontmatter changes (description, acceptance criteria, etc.)
  if (changedFields.length === 0) {
    outputChannel.appendLine(`[ChangeDetect] Body-only change (BODY)`);
    return {
      type: ChangeType.BODY,
      oldData,
      newData,
      changedFields: []
    };
  }

  // Unknown change → STRUCTURE (safe fallback)
  outputChannel.appendLine(
    `[ChangeDetect] ⚠️  Unknown changes: ${changedFields.join(', ')} (STRUCTURE fallback)`
  );
  return {
    type: ChangeType.STRUCTURE,
    oldData,
    newData,
    changedFields
  };
```

**Expected Outcome:**
- STRUCTURE changes: status, item, dependencies
- CONTENT changes: title, priority
- BODY changes: no frontmatter changes
- Unknown changes: fallback to STRUCTURE (safe)
- Comprehensive logging for each case

---

### Task 6: Export Change Detection Module

**File:** `vscode-extension/src/utils/changeDetection.ts`

**Verify exports at top of file:**

```typescript
// These should already be exported from previous tasks
export { ChangeType, ChangeDetectionResult, detectChangeType };
```

**File:** `vscode-extension/src/utils/index.ts` (if exists, otherwise skip)

**Add re-export:**

```typescript
export * from './changeDetection';
```

**Expected Outcome:**
- All types and functions exported
- Module ready for import in extension.ts and other files

---

## Completion Criteria

### Code Verification
- [ ] changeDetection.ts file created in vscode-extension/src/utils/
- [ ] ChangeType enum defined (STRUCTURE, CONTENT, BODY)
- [ ] ChangeDetectionResult interface defined
- [ ] detectChangeType() function implemented
- [ ] File creation/deletion detected as STRUCTURE
- [ ] Status changes detected as STRUCTURE
- [ ] Title/priority changes detected as CONTENT
- [ ] No frontmatter changes detected as BODY
- [ ] Comprehensive logging for all cases
- [ ] Exports correctly configured

### Compilation Verification
- [ ] TypeScript compiles without errors: `npm run compile`
- [ ] No type errors in changeDetection.ts
- [ ] Imports resolve correctly (FrontmatterCache, PlanningTreeItem)

### Testing Checklist
- [ ] Manual test: Edit status → Verify STRUCTURE logged
- [ ] Manual test: Edit title → Verify CONTENT logged
- [ ] Manual test: Edit description → Verify BODY logged
- [ ] Manual test: Create file → Verify STRUCTURE logged
- [ ] Manual test: Check output channel for all logs
- [ ] Manual test: Verify timing logs (should be < 10ms)

## Next Phase

Proceed to **Phase 2: Selective Refresh Integration** to:
- Add schedulePartialRefresh() to PlanningTreeProvider
- Add refreshPartial() method
- Update FileSystemWatcher to use change detection
- Integrate with existing debouncing (S72)
- Manual testing and validation
