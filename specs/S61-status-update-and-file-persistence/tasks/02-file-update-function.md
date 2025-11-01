---
spec: S61
phase: 2
title: File Update Function
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 2: File Update Function

## Overview

This phase implements the file update function that reads markdown files, parses frontmatter, updates status and timestamp fields, and writes the updated content back atomically. The function integrates with existing parser utilities and VSCode Workspace FS API.

This phase establishes the file persistence layer that will be called from the drag-and-drop controller.

## Prerequisites

- Phase 1 completed: `statusTransitions.ts` with validation function
- Understanding of `parseFrontmatter()` function (`vscode-extension/src/parser.ts:171`)
- Familiarity with VSCode Workspace FS API
- js-yaml library available (`package.json:74`)

## Tasks

### Task 1: Create fileUpdates.ts Module

**Objective:** Create a module for file update operations with proper error handling.

**File:** `vscode-extension/src/fileUpdates.ts`

**Implementation:**

```typescript
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { parseFrontmatter } from './parser';
import { Status, Frontmatter } from './types';

/**
 * Updates the status field in a planning item's frontmatter.
 *
 * Performs atomic file update:
 * 1. Read file content
 * 2. Parse frontmatter
 * 3. Update status and updated fields
 * 4. Serialize frontmatter back to YAML
 * 5. Write file atomically
 *
 * ## Field Updates
 *
 * - `status`: Set to newStatus parameter
 * - `updated`: Set to current date (YYYY-MM-DD)
 * - All other fields: Preserved exactly as-is
 *
 * ## File Write Behavior
 *
 * Uses VSCode Workspace FS API for atomic writes:
 * - Temp file created
 * - Content written to temp
 * - Temp renamed to target (atomic operation)
 * - Prevents corruption on crash/timeout
 *
 * ## Auto-Refresh Trigger
 *
 * File write triggers FileSystemWatcher (S38):
 * - Watcher detects change after 300ms debounce
 * - Cache invalidation occurs (S40)
 * - TreeView refresh happens automatically
 * - No manual refresh needed
 *
 * @param filePath - Absolute path to markdown file
 * @param newStatus - New status value to set
 * @param outputChannel - Output channel for logging
 *
 * @throws Error if file read fails
 * @throws Error if frontmatter parse fails
 * @throws Error if file write fails
 *
 * @example
 * ```typescript
 * try {
 *   await updateItemStatus(
 *     'D:\\projects\\lineage\\plans\\story-49.md',
 *     'In Progress',
 *     outputChannel
 *   );
 *   outputChannel.appendLine('✅ Status updated successfully');
 * } catch (error) {
 *   outputChannel.appendLine(`❌ Update failed: ${error.message}`);
 * }
 * ```
 */
export async function updateItemStatus(
  filePath: string,
  newStatus: Status,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  // Implementation in Task 2
}
```

**Validation:**
- File created at `vscode-extension/src/fileUpdates.ts`
- TypeScript compiles without errors
- Function signature matches specification
- Documentation complete with all sections

**References:**
- Parser: `vscode-extension/src/parser.ts:171`
- Types: `vscode-extension/src/types.ts`

---

### Task 2: Implement File Read and Parse Logic

**Objective:** Read file content and parse frontmatter with error handling.

**Implementation:**

Add implementation to `updateItemStatus()` function:

```typescript
export async function updateItemStatus(
  filePath: string,
  newStatus: Status,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Step 1: Read file content
    const uri = vscode.Uri.file(filePath);
    let content: Uint8Array;
    try {
      content = await vscode.workspace.fs.readFile(uri);
    } catch (readError) {
      throw new Error(`Failed to read file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
    }

    // Convert buffer to string
    const contentStr = Buffer.from(content).toString('utf-8');

    // Step 2: Parse frontmatter using existing parser
    const parseResult = parseFrontmatter(contentStr);
    if (!parseResult.success) {
      throw new Error(`Failed to parse frontmatter: ${parseResult.error}`);
    }

    const frontmatter = parseResult.frontmatter!;
    const oldStatus = frontmatter.status;

    // Step 3: Extract markdown content (after frontmatter)
    // Frontmatter regex: /^---\s*\n([\s\S]*?)\n---\s*\n/
    // Content is everything after the closing "---"
    const frontmatterMatch = contentStr.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!frontmatterMatch) {
      throw new Error('Frontmatter delimiters not found (corrupted file)');
    }

    const markdownContent = contentStr.substring(frontmatterMatch[0].length);

    // Implementation continues in Task 3...
  } catch (error) {
    // Log error and re-throw for controller to handle
    outputChannel.appendLine(`[FileUpdate] ❌ Error updating ${filePath}`);
    outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
```

**Validation:**
- File read works with valid file paths
- Parse errors are caught and wrapped in Error
- Markdown content extracted correctly
- Error logging includes file path and error message

**Testing:**
- Create test file with valid frontmatter
- Call function and verify parse succeeds
- Test with invalid file path (should throw)
- Test with malformed frontmatter (should throw)

---

### Task 3: Implement Frontmatter Update Logic

**Objective:** Update status and timestamp fields while preserving all other fields.

**Implementation:**

Continue `updateItemStatus()` implementation after parsing:

```typescript
    // ... (continuing from Task 2)

    // Step 4: Update frontmatter fields
    // Generate current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create updated frontmatter object
    // Spread operator preserves all existing fields
    const updatedFrontmatter: Frontmatter = {
      ...frontmatter,
      status: newStatus,
      updated: today
    };

    // Step 5: Serialize frontmatter back to YAML
    let yamlStr: string;
    try {
      // yaml.dump() options:
      // - indent: 2 (standard YAML indentation)
      // - lineWidth: -1 (don't wrap long lines)
      // - noRefs: true (don't use YAML anchors/references)
      yamlStr = yaml.dump(updatedFrontmatter, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
    } catch (yamlError) {
      throw new Error(`Failed to serialize frontmatter: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}`);
    }

    // Step 6: Reconstruct file content
    // Format: ---\n{YAML}\n---\n{markdown content}
    const newContent = `---\n${yamlStr}---\n${markdownContent}`;

    // Implementation continues in Task 4...
```

**Validation:**
- Updated frontmatter preserves all original fields
- `status` field updated to `newStatus`
- `updated` field set to current date (YYYY-MM-DD format)
- YAML serialization succeeds
- File content reconstructed with correct delimiters

**Testing:**
- Verify spread operator preserves optional fields (dependencies, estimate, spec)
- Verify date format is YYYY-MM-DD
- Verify YAML structure is valid

---

### Task 4: Implement Atomic File Write

**Objective:** Write updated content to file atomically with error handling.

**Implementation:**

Complete `updateItemStatus()` implementation:

```typescript
    // ... (continuing from Task 3)

    // Step 7: Write file atomically
    try {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(newContent, 'utf-8'));
    } catch (writeError) {
      throw new Error(`Failed to write file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
    }

    // Step 8: Log success
    outputChannel.appendLine(`[FileUpdate] ✅ Updated status: ${filePath}`);
    outputChannel.appendLine(`  ${oldStatus} → ${newStatus}`);
    outputChannel.appendLine(`  Updated timestamp: ${today}`);

    // Note: FileSystemWatcher will automatically:
    // - Detect file change (300ms debounce)
    // - Invalidate frontmatter cache
    // - Trigger TreeView refresh
    // - No manual refresh needed

  } catch (error) {
    // Error already logged in outer try-catch
    throw error;
  }
}
```

**Validation:**
- File write succeeds with valid content
- Write errors are caught and wrapped
- Success logging shows old → new status
- Timestamp logged

**Testing:**
- Write to valid file path (should succeed)
- Verify file content matches expected format
- Test with read-only file (should throw)
- Verify FileSystemWatcher detects change (manual test)

---

### Task 5: Add Unit Tests for File Update Function

**Objective:** Create unit tests using mock file system.

**File:** `vscode-extension/src/test/suite/fileUpdates.test.ts`

**Implementation:**

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { updateItemStatus } from '../../fileUpdates';

suite('File Updates', () => {
  let testDir: string;
  let testFilePath: string;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    // Create temp directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cascade-test-'));

    // Create test file with sample frontmatter
    testFilePath = path.join(testDir, 'test-story.md');
    const sampleContent = `---
item: S99
title: Test Story
type: story
status: Ready
priority: High
estimate: M
dependencies: []
created: 2025-10-01
updated: 2025-10-01
---

# S99 - Test Story

Test content here.
`;
    fs.writeFileSync(testFilePath, sampleContent, 'utf-8');

    // Create mock output channel
    outputChannel = {
      appendLine: () => {},  // No-op for tests
      append: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
      replace: () => {},
      name: 'Test',
    } as vscode.OutputChannel;
  });

  teardown(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Updates status field successfully', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('status: In Progress'));
  });

  test('Updates updated timestamp to current date', async () => {
    const today = new Date().toISOString().split('T')[0];
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes(`updated: ${today}`));
  });

  test('Preserves all other frontmatter fields', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('item: S99'));
    assert.ok(updatedContent.includes('title: Test Story'));
    assert.ok(updatedContent.includes('type: story'));
    assert.ok(updatedContent.includes('priority: High'));
    assert.ok(updatedContent.includes('estimate: M'));
    assert.ok(updatedContent.includes('dependencies: []'));
    assert.ok(updatedContent.includes('created: 2025-10-01'));
  });

  test('Preserves markdown content', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('# S99 - Test Story'));
    assert.ok(updatedContent.includes('Test content here.'));
  });

  test('Throws error for non-existent file', async () => {
    const invalidPath = path.join(testDir, 'nonexistent.md');

    await assert.rejects(
      async () => await updateItemStatus(invalidPath, 'In Progress', outputChannel),
      /Failed to read file/
    );
  });

  test('Throws error for malformed frontmatter', async () => {
    const malformedPath = path.join(testDir, 'malformed.md');
    fs.writeFileSync(malformedPath, '---\ninvalid yaml: [unclosed\n---\n# Content', 'utf-8');

    await assert.rejects(
      async () => await updateItemStatus(malformedPath, 'In Progress', outputChannel),
      /Failed to parse frontmatter/
    );
  });
});
```

**Validation:**
- All tests pass
- Tests use temp directory (no side effects)
- File read/write tested with real file system
- Error cases tested (missing file, malformed YAML)
- Cleanup in teardown (no temp files left)

**Testing:**
Run tests with: `npm test`

---

## Completion Criteria

- [ ] `fileUpdates.ts` created with update function
- [ ] File read logic implemented with error handling
- [ ] Frontmatter parsing uses existing `parseFrontmatter()`
- [ ] Status and timestamp update logic implemented
- [ ] All other frontmatter fields preserved
- [ ] YAML serialization uses js-yaml library
- [ ] File write uses atomic VSCode API
- [ ] Success and error logging implemented
- [ ] Unit tests created with temp file setup
- [ ] All tests passing
- [ ] TypeScript compiles without errors

## Next Phase

Proceed to **Phase 3: Integration and Testing** to wire the file update function into the drag-and-drop controller and perform end-to-end testing.
