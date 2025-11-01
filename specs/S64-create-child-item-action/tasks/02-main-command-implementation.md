---
spec: S64
phase: 2
title: Main Command Implementation
status: Completed
priority: High
created: 2025-10-17
updated: 2025-10-17
---

# Phase 2: Main Command Implementation

## Overview

Implement the main command handler that orchestrates the complete workflow: determine child type, prompt user for title, generate paths, create files/directories, and provide user feedback. This phase integrates the helper functions from Phase 1 with VSCode APIs.

## Prerequisites

- Phase 1 completed (command registered, helper functions implemented)
- Understanding of VSCode input/notification APIs
- Knowledge of async file system operations

## Tasks

### Task 1: Access TreeView Items Cache

**Location:** `vscode-extension/src/extension.ts` (in createChildItemCommand function)

The command needs access to all planning items to generate next item number. Use the existing PlanningTreeProvider's cache:

```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // Access TreeView items cache through the provider
  // PlanningTreeProvider.loadAllPlanningItems() returns all items
  // We need to get this data - check how changeStatusCommand accesses item data

  // Solution: Load items directly from plans/ directory
  // Same pattern as PlanningTreeProvider.loadAllPlanningItemsUncached()
  const plansPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'plans');
  const pattern = new vscode.RelativePattern(plansPath, '**/*.md');
  const files = await vscode.workspace.findFiles(pattern);

  const allItems: PlanningTreeItem[] = [];
  for (const fileUri of files) {
    const frontmatter = await frontmatterCache!.get(fileUri.fsPath);
    if (frontmatter) {
      allItems.push({
        item: frontmatter.item,
        title: frontmatter.title,
        type: frontmatter.type,
        status: frontmatter.status,
        priority: frontmatter.priority,
        filePath: fileUri.fsPath
      });
    }
  }

  // Continue with item number generation...
}
```

**Alternative:** Access `planningTreeProvider.loadAllPlanningItems()` if provider is accessible in scope.

**Expected Outcome:** Command has access to all planning items for item number generation

### Task 2: Determine Child Type and Prompt User

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand function)

Based on parent type, determine child type and show appropriate input prompt:

```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // Validate input (defensive programming)
  if (!parentItem) {
    outputChannel.appendLine('[CreateChild] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Determine child type based on parent
  const childType = parentItem.type === 'epic' ? 'feature' : 'story';
  const childTypeDisplay = childType.charAt(0).toUpperCase() + childType.slice(1);

  outputChannel.appendLine('');
  outputChannel.appendLine(`[CreateChild] Creating child ${childType} for ${parentItem.item}`);

  // Prompt for title with validation
  const title = await vscode.window.showInputBox({
    prompt: `Enter ${childTypeDisplay} title`,
    placeHolder: `e.g., User Authentication`,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Title cannot be empty';
      }
      if (value.length > 100) {
        return 'Title too long (max 100 characters)';
      }
      return null;  // Valid
    }
  });

  // Handle cancellation (user pressed ESC)
  if (!title) {
    outputChannel.appendLine('[CreateChild] ℹ️  User cancelled');
    return;
  }

  outputChannel.appendLine(`[CreateChild] Title: ${title}`);

  // Continue with file creation...
}
```

**Input Validation Rules:**
- Not empty or whitespace-only
- Max 100 characters (prevent path length issues)
- Validation runs on every keystroke (instant feedback)

**Expected Outcome:** User sees appropriate prompt, validation prevents invalid input

### Task 3: Generate Item Number and File Paths

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand function, after title prompt)

Generate next item number and construct file paths:

```typescript
try {
  // Load all items for number generation
  const plansPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'plans');
  const pattern = new vscode.RelativePattern(plansPath, '**/*.md');
  const files = await vscode.workspace.findFiles(pattern);

  const allItems: PlanningTreeItem[] = [];
  for (const fileUri of files) {
    const frontmatter = await frontmatterCache!.get(fileUri.fsPath);
    if (frontmatter) {
      allItems.push({
        item: frontmatter.item,
        title: frontmatter.title,
        type: frontmatter.type,
        status: frontmatter.status,
        priority: frontmatter.priority,
        filePath: fileUri.fsPath
      });
    }
  }

  // Generate next item number
  const itemNumber = generateNextItemNumber(childType, allItems);
  outputChannel.appendLine(`[CreateChild] Generated item number: ${itemNumber}`);

  // Slugify title for file/directory name
  const slug = slugify(title);
  outputChannel.appendLine(`[CreateChild] Slugified title: ${slug}`);

  // Get parent directory
  const parentDir = path.dirname(parentItem.filePath);

  // Construct child path based on type
  let childPath: string;
  if (childType === 'feature') {
    // Features get their own directory: epic-XX-name/feature-YY-slug/feature.md
    const featureDir = path.join(
      parentDir,
      `${childType}-${itemNumber.substring(1)}-${slug}`  // "feature-20-user-auth"
    );
    childPath = path.join(featureDir, 'feature.md');
  } else {
    // Stories go in parent Feature directory: feature-XX-name/story-YY-slug.md
    childPath = path.join(
      parentDir,
      `${childType}-${itemNumber.substring(1)}-${slug}.md`  // "story-65-test-creation.md"
    );
  }

  outputChannel.appendLine(`[CreateChild] Target path: ${childPath}`);

  // Continue with file creation...
} catch (error) {
  // Error handling in Task 6
}
```

**Path Examples:**
- Feature: `plans/epic-04-kanban/feature-20-user-auth/feature.md`
- Story: `plans/epic-04-kanban/feature-19-context/story-65-test.md`

**Expected Outcome:** Valid file paths generated following existing directory patterns

### Task 4: Create Directory and Generate Frontmatter

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand function, after path generation)

Create directory (if needed) and build frontmatter object:

```typescript
// Create directory for features (stories don't need directory)
if (childType === 'feature') {
  const featureDir = path.dirname(childPath);

  // Create directory using Node.js fs (VSCode FS doesn't have mkdir)
  const fs = require('fs');
  fs.mkdirSync(featureDir, { recursive: true });

  outputChannel.appendLine(`[CreateChild] Created directory: ${featureDir}`);
}

// Generate frontmatter
const today = new Date().toISOString().split('T')[0];
const frontmatter: Frontmatter = {
  item: itemNumber,
  title: title,
  type: childType,
  status: 'Not Started',
  priority: 'Medium',
  dependencies: [],
  created: today,
  updated: today
};

outputChannel.appendLine(`[CreateChild] Frontmatter created:`);
outputChannel.appendLine(`  Item: ${itemNumber}`);
outputChannel.appendLine(`  Type: ${childType}`);
outputChannel.appendLine(`  Status: Not Started`);
outputChannel.appendLine(`  Priority: Medium`);
```

**Frontmatter Values:**
- `status`: 'Not Started' (initial state per frontmatter-schema.md)
- `priority`: 'Medium' (default per frontmatter-schema.md)
- `dependencies`: [] (empty array, no dependencies initially)
- `created`/`updated`: Current date in YYYY-MM-DD format

**Expected Outcome:** Directory created (if feature), frontmatter object ready for serialization

### Task 5: Write File and Open in Editor

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand function, after frontmatter generation)

Generate file content and write atomically:

```typescript
// Generate file content using helper
const content = generateChildItemTemplate(frontmatter, childType);

// Write file atomically (VSCode Workspace FS API)
await vscode.workspace.fs.writeFile(
  vscode.Uri.file(childPath),
  Buffer.from(content, 'utf-8')
);

outputChannel.appendLine(`[CreateChild] ✅ File created: ${childPath}`);

// Open file in editor
const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(childPath));
await vscode.window.showTextDocument(doc, {
  preview: false,        // Permanent tab
  preserveFocus: false   // Give editor focus
});

outputChannel.appendLine(`[CreateChild] File opened in editor`);

// Show success notification
vscode.window.showInformationMessage(
  `${itemNumber} - ${title} created successfully`
);

outputChannel.appendLine(`[CreateChild] ✅ Command completed successfully`);
```

**File Write Behavior:**
- Uses VSCode Workspace FS API (same as fileUpdates.ts)
- Atomic write (temp file + rename)
- FileSystemWatcher detects creation → triggers TreeView refresh

**Expected Outcome:** File created, opened in editor, success notification shown

### Task 6: Error Handling

**Location:** `vscode-extension/src/extension.ts` (createChildItemCommand try/catch block)

Wrap all operations in try/catch for comprehensive error handling:

```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // ... validation and setup ...

  try {
    // ... all file operations from Tasks 1-5 ...

  } catch (error) {
    // Log error to output channel
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    outputChannel.appendLine(`[CreateChild] ❌ Error: ${errorMsg}`);

    // Show error notification to user
    vscode.window.showErrorMessage(
      `Failed to create child item: ${errorMsg}`
    );
  }
}
```

**Error Scenarios:**
- File/directory permission errors
- Disk full
- Invalid paths (very long titles)
- Frontmatter serialization errors
- File system watcher failures (non-blocking)

**Expected Outcome:** All errors caught, logged, and shown to user with clear messages

### Task 7: Register Command Handler

**Location:** `vscode-extension/src/extension.ts` (activate function, after changeStatusCommand registration around line 774)

Register the command handler with VSCode:

```typescript
// Register create child item command (S64)
const createChildItemCommand = vscode.commands.registerCommand(
  'cascade.createChildItem',
  (item: PlanningTreeItem) => {
    createChildItemCommand(item);
  }
);
context.subscriptions.push(createChildItemCommand);
```

**Reference:** Same pattern as cascade.changeStatus registration (extension.ts:768-774)

**Expected Outcome:** Command handler registered and disposed properly on deactivation

## Completion Criteria

- ✅ Command accesses planning items for number generation
- ✅ User prompted with appropriate label ("Enter Feature title" or "Enter Story title")
- ✅ Input validation prevents empty/long titles
- ✅ Item number generated correctly (next sequential number)
- ✅ File paths follow existing directory structure patterns
- ✅ Directory created for features (not for stories)
- ✅ Frontmatter object has all required fields with correct values
- ✅ File written atomically using VSCode FS API
- ✅ File opens in editor after creation
- ✅ Success notification shows item number and title
- ✅ Error handling catches and reports all errors
- ✅ Command handler registered in activate() function

## Next Phase

Proceed to Phase 3: Parent File Update and Integration Testing
