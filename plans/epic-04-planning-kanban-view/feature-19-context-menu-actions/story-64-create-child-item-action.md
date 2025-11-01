---
item: S64
title: Create Child Item Context Menu Action
type: story
parent: F19
status: Completed
priority: High
dependencies: []
estimate: M
created: 2025-10-16
updated: 2025-10-17
spec: specs/S64-create-child-item-action/
---

# S64 - Create Child Item Context Menu Action

## Description

Implement "Create Child Item" context menu action for Epics and Features in the Cascade TreeView. When right-clicking on an Epic or Feature, users can select "Create Child Item" to generate a new Feature (under Epic) or Story (under Feature) with proper frontmatter and directory structure.

This story implements intelligent item number generation, file creation with template frontmatter, and automatic parent file updates.

### User Workflow

1. Right-click on Epic or Feature in TreeView
2. Select "Create Child Item" from context menu
3. Input box appears: "Enter Feature title" or "Enter Story title"
4. User enters title (e.g., "User Authentication")
5. Extension generates:
   - Next available item number (F20, S65, etc.)
   - Directory path with slugified title
   - Markdown file with complete frontmatter
6. Parent file updated with reference to new child
7. TreeView refreshes automatically
8. New file opens in editor for user to add description

### Item Number Generation

**Algorithm:**
1. Scan cache for all items of child type (Feature or Story)
2. Extract numeric parts (e.g., "F18" → 18, "S62" → 62)
3. Find maximum number
4. Increment by 1
5. Format with prefix (F19, S63, etc.)

**Child Type Mapping:**
- Epic → Feature (F prefix)
- Feature → Story (S prefix)

### Directory Structure

**Feature Under Epic:**
```
plans/epic-04-planning-kanban-view/
├── epic.md
├── feature-18-drag-drop-status-transitions/
├── feature-19-context-menu-actions/
└── feature-20-user-authentication/     ← New
    └── feature.md                       ← New
```

**Story Under Feature:**
```
plans/epic-04-planning-kanban-view/feature-19-context-menu-actions/
├── feature.md
├── story-63-change-status-action.md
└── story-64-create-child-item-action.md  ← New
```

### Title Slugification

Convert user input to filesystem-safe directory names:
```typescript
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}

// Examples:
// "User Authentication" → "user-authentication"
// "Drag & Drop Status" → "drag-drop-status"
// "API v2 Integration!" → "api-v2-integration"
```

### File Template

**New Child Item Frontmatter:**
```yaml
---
item: F20
title: User Authentication
type: feature
parent: F19
status: Not Started
priority: Medium
dependencies: []
created: 2025-10-16
updated: 2025-10-16
---

# F20 - User Authentication

## Description

[User adds description here]

## Acceptance Criteria

- [ ]

## Child Items

Stories will be created when this Feature is selected for implementation via `/plan #F20`.
```

### Technical Details

**Command Registration (package.json):**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "cascade.createChildItem",
        "title": "Create Child Item",
        "icon": "$(add)"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "cascade.createChildItem",
          "when": "view == cascadeView && (viewItem == epic || viewItem == feature)",
          "group": "1_modification@2"
        }
      ]
    }
  }
}
```

**Command Implementation (extension.ts):**
```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // Determine child type based on parent
  const childType = parentItem.type === 'epic' ? 'feature' : 'story';
  const childTypeDisplay = childType.charAt(0).toUpperCase() + childType.slice(1);

  // Prompt for title
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
      return null;
    }
  });

  if (!title) return; // User cancelled

  try {
    // Generate next item number
    const itemNumber = generateNextItemNumber(childType, frontmatterCache!);

    // Create file path
    const slug = slugify(title);
    const parentDir = path.dirname(parentItem.filePath);

    let childPath: string;
    if (childType === 'feature') {
      // Features get their own directory
      const featureDir = path.join(parentDir, `${childType}-${itemNumber.substring(1)}-${slug}`);
      fs.mkdirSync(featureDir, { recursive: true });
      childPath = path.join(featureDir, 'feature.md');
    } else {
      // Stories go in parent Feature directory
      childPath = path.join(parentDir, `${childType}-${itemNumber.substring(1)}-${slug}.md`);
    }

    // Generate frontmatter
    const today = new Date().toISOString().split('T')[0];
    const frontmatter: Frontmatter = {
      item: itemNumber,
      title,
      type: childType,
      status: 'Not Started',
      priority: 'Medium',
      dependencies: [],
      created: today,
      updated: today
    };

    // Generate file content
    const content = generateChildItemTemplate(frontmatter, childType);

    // Write file
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(childPath),
      Buffer.from(content, 'utf-8')
    );

    outputChannel.appendLine(`[CreateChild] ✅ Created ${childType}: ${childPath}`);
    outputChannel.appendLine(`  Item: ${itemNumber}`);
    outputChannel.appendLine(`  Title: ${title}`);

    // Update parent file with child reference
    await updateParentWithChild(parentItem.filePath, itemNumber, title);

    // Open new file in editor
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(childPath));
    await vscode.window.showTextDocument(doc, { preview: false });

    // Success notification
    vscode.window.showInformationMessage(
      `${itemNumber} - ${title} created successfully`
    );

  } catch (error) {
    // Error notification
    vscode.window.showErrorMessage(
      `Failed to create child item: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    outputChannel.appendLine(`[CreateChild] ❌ Error: ${error}`);
  }
}
```

**Helper Functions:**
```typescript
function generateNextItemNumber(type: string, cache: FrontmatterCache): string {
  // Get all items of this type from cache
  const items = cache.getAll();
  const typedItems = items.filter(i => i.type === type);

  // Extract numbers from item IDs (e.g., "F18" → 18)
  const numbers = typedItems.map(item => {
    const match = item.item.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  });

  // Get max and increment
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  // Format with prefix
  const prefix = type === 'feature' ? 'F' : 'S';
  return `${prefix}${nextNumber}`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateChildItemTemplate(frontmatter: Frontmatter, childType: string): string {
  const yaml = require('js-yaml');
  const yamlStr = yaml.dump(frontmatter, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });

  const childLabel = childType === 'feature' ? 'Feature' : 'Story';
  const childItems = childType === 'feature'
    ? `Stories will be created when this Feature is selected for implementation via \`/plan #${frontmatter.item}\`.`
    : '';

  return `---
${yamlStr}---

# ${frontmatter.item} - ${frontmatter.title}

## Description

[Add description here]

## Acceptance Criteria

- [ ]

${childItems ? `## Child Items\n\n${childItems}` : ''}
`;
}

async function updateParentWithChild(parentPath: string, childItem: string, childTitle: string): Promise<void> {
  // Read parent file
  const uri = vscode.Uri.file(parentPath);
  const content = await vscode.workspace.fs.readFile(uri);
  const contentStr = Buffer.from(content).toString('utf-8');

  // Check if "## Child Items" section exists
  let updatedContent: string;
  if (contentStr.includes('## Child Items')) {
    // Append to existing section
    updatedContent = contentStr.replace(
      /## Child Items\n\n/,
      `## Child Items\n\n- **${childItem}**: ${childTitle}\n`
    );
  } else {
    // Add new section at end
    updatedContent = contentStr.trimEnd() + `\n\n## Child Items\n\n- **${childItem}**: ${childTitle}\n`;
  }

  // Write updated parent file
  await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedContent, 'utf-8'));

  outputChannel.appendLine(`[CreateChild] Updated parent: ${parentPath}`);
}
```

## Acceptance Criteria

- [ ] Right-click on Epic/Feature shows "Create Child Item" in context menu
- [ ] Context menu item only visible for Epics and Features (not Stories/Bugs/StatusGroups)
- [ ] Clicking "Create Child Item" opens input box with correct label ("Enter Feature title" or "Enter Story title")
- [ ] Input box validates title (not empty, max 100 chars)
- [ ] ESC key cancels operation
- [ ] Next item number generated correctly (no duplicates)
- [ ] Title slugified correctly for directory/file names
- [ ] Feature directory created with feature.md file
- [ ] Story file created in parent Feature directory
- [ ] Frontmatter includes all required fields with valid values
- [ ] Frontmatter dates in YYYY-MM-DD format
- [ ] File content uses template format with item number and title
- [ ] Parent file updated with child reference in "## Child Items" section
- [ ] New file opens in editor after creation
- [ ] TreeView refreshes automatically (FileSystemWatcher)
- [ ] Success toast notification shows item number and title
- [ ] Error toast shown if file creation fails
- [ ] Handles filesystem errors gracefully (permissions, disk full, etc.)

## Testing Notes

**Manual Test:**
1. Package and install extension
2. Reload window
3. Open Cascade TreeView
4. Right-click on Feature 19 (Context Menu Actions)
5. Select "Create Child Item"
6. Enter title: "Test Story Creation"
7. Verify:
   - Story file created: `story-65-test-story-creation.md`
   - File has complete frontmatter (S65, Not Started, Medium priority)
   - Feature 19 file updated with child reference
   - New file opens in editor
   - Toast notification: "S65 - Test Story Creation created successfully"
   - TreeView refreshes and shows new story

**Edge Cases:**
- Empty title → Validation error
- Very long title (>100 chars) → Validation error
- Special characters in title → Slugified correctly
- Cancel input box → No files created
- Filesystem permission error → Error toast shown

## File References

- Command registration: `vscode-extension/package.json`
- Command implementation: `vscode-extension/src/extension.ts` (new createChildItemCommand)
- Item number generation: `vscode-extension/src/extension.ts` (new generateNextItemNumber)
- Cache access: `vscode-extension/src/cache.ts` (getAll method)
- Type definitions: `vscode-extension/src/types.ts`

## Dependencies

- **F17**: TreeView foundation with contextValue - already implemented
- **S39**: Frontmatter parser - already implemented
- **S38**: FileSystemWatcher for auto-refresh - already implemented
