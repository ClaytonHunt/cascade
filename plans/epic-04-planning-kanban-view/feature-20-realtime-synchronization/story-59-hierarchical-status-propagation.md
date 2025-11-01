---
item: S59
title: Hierarchical Status Propagation
type: story
parent: F20
status: Completed
priority: High
dependencies: []
estimate: L
spec: specs/S59-hierarchical-status-propagation/
created: 2025-10-15
updated: 2025-10-23
---

# S59 - Hierarchical Status Propagation

## Description

Automatically propagate status updates from child items to parent items (Story → Feature → Epic → Project) when all children reach a completed state. This ensures that parent item frontmatter status fields stay synchronized with their actual completion state, eliminating manual status management overhead.

Currently, S56 calculates and displays progress indicators (e.g., "3/5" or "75%") but doesn't update the parent's actual `status:` field in frontmatter. When all stories in a feature complete, the feature's progress shows "(5/5)" but its status remains "In Progress" or "Not Started" until manually updated.

This story implements automatic status propagation in the VSCode extension's TypeScript code, triggered by file system changes detected via the existing FileSystemWatcher infrastructure.

### The Problem

**Current Behavior:**
1. User completes Story S49 (status: Completed)
2. Feature F16 contains S48-S53 (all now Completed)
3. F16 progress indicator shows "(6/6)" ✅
4. F16 status frontmatter still says "In Progress" ❌
5. Epic E4 progress shows incomplete because F16 not marked completed
6. User must manually edit `plans/.../feature.md` to update status

**Impact:**
- Manual status management required for 50+ parent items
- Progress indicators conflict with actual status values
- Pipeline reports (via `/plan`) show inaccurate completion
- Drag-and-drop status changes don't trigger parent updates
- Git history doesn't reflect actual completion timestamps

### The Solution

**Automatic Status Propagation:**
```
File Change Detected (FileSystemWatcher)
  ↓
Story status changes to "Completed"
  ↓
Propagation engine analyzes parent Feature
  ↓
All stories in Feature completed?
  ↓ YES
Update Feature status to "Completed"
  ↓
Propagation engine analyzes parent Epic
  ↓
All features in Epic completed?
  ↓ YES
Update Epic status to "Completed"
  ↓
Propagation engine analyzes parent Project
  ↓
All epics in Project completed?
  ↓ YES
Update Project status to "Completed"
```

**Propagation Rules:**
| Child States | Parent Status | Action |
|--------------|---------------|--------|
| All "Completed" | Any status → "Completed" | Update parent |
| Any "In Progress" | "Not Started" → "In Progress" | Update parent |
| Any "In Progress" | "In Planning" → "In Progress" | Update parent |
| Any "In Progress" | "In Progress" | No change |
| Mixed states | "Not Started" → "In Progress" | Update parent |
| Mixed states | "In Planning" → "In Progress" | Update parent |
| All "Not Started" | Any status | No change (not started yet) |

**Integration Points:**
1. **FileSystemWatcher Events** (S38) - Detect when child items change status
2. **PlanningTreeProvider.refresh()** - Trigger propagation after cache invalidation
3. **Hierarchy Cache** - Use existing hierarchy to identify parent-child relationships
4. **Frontmatter Updates** - Write status changes to parent markdown files
5. **Cascade Logging** - Log all propagation actions to Output Channel

## Acceptance Criteria

### Automatic Propagation
- [ ] When all stories in feature complete → Feature status becomes "Completed"
- [ ] When all features in epic complete → Epic status becomes "Completed"
- [ ] When all epics in project complete → Project status becomes "Completed"
- [ ] When any child enters "In Progress" → Parent becomes "In Progress" (if was "Not Started" or "In Planning")
- [ ] Propagation triggered automatically by FileSystemWatcher events
- [ ] Propagation runs after cache invalidation but before TreeView refresh
- [ ] Parent `updated:` timestamp refreshed on status change

### Status Transition Safety
- [ ] Never downgrade status (Completed → In Progress not allowed)
- [ ] Manual status overrides respected (user can set parent status explicitly)
- [ ] Blocked children don't trigger propagation (wait for resolution)
- [ ] Empty parents (0 children) not propagated (no basis for status)
- [ ] Propagation is idempotent (running twice doesn't cause side effects)

### Logging and Observability
- [ ] All propagation actions logged to Cascade Output Channel
- [ ] Log format: `[PROPAGATE] F16 status updated: In Progress → Completed (all stories complete)`
- [ ] Log parent-child relationship causing propagation
- [ ] Log when propagation skipped (e.g., manual override detected)
- [ ] Log errors during frontmatter writes (non-blocking)

### Performance
- [ ] Propagation completes within 100ms for typical hierarchy (20 parents)
- [ ] Uses cached hierarchy (no additional file system scans)
- [ ] Batched with refresh debouncing (leverages 300ms debounce)
- [ ] No UI blocking during propagation
- [ ] Propagation runs in background (async)

### Edge Cases
- [ ] Orphan items (no parent directory) skipped gracefully
- [ ] Concurrent file modifications handled (last write wins)
- [ ] Malformed parent frontmatter logged as error, propagation continues
- [ ] Partial propagation on error (some parents update, others skip)
- [ ] Works with existing files created before S59 (backward compatible)

## Analysis Summary

### Architectural Integration

**Existing Infrastructure Reuse:**
- **FileSystemWatcher** (S38): Already detects file changes in `plans/`
- **PlanningTreeProvider.refresh()**: Entry point for propagation logic
- **Hierarchy Cache**: Provides parent-child relationships via `parseItemPath()`
- **FrontmatterCache**: Parses and validates frontmatter before writes
- **Output Channel**: Logs propagation events for debugging

**New Components Required:**
- **StatusPropagationEngine**: Core propagation logic class
- **FrontmatterWriter**: Atomic frontmatter status updates (uses Edit pattern from `/build`)
- **PropagationRules**: Status transition validation logic

### Technical Implementation

#### 1. StatusPropagationEngine Class

```typescript
/**
 * Handles automatic status propagation from children to parents.
 *
 * Triggered by FileSystemWatcher events after cache invalidation.
 * Uses cached hierarchy to identify parent-child relationships.
 * Writes status changes to parent markdown files atomically.
 */
class StatusPropagationEngine {
  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Propagates status changes from children to parents.
   *
   * Flow:
   * 1. Load all planning items (cached)
   * 2. Build hierarchy to identify parent-child relationships
   * 3. Analyze each parent to determine if status update needed
   * 4. Apply status updates to parent frontmatter files
   * 5. Log all actions to Output Channel
   *
   * @param items - All planning items (from cache)
   * @param hierarchy - Hierarchical structure (from cache)
   */
  async propagateStatuses(
    items: PlanningTreeItem[],
    hierarchy: HierarchyNode[]
  ): Promise<void> {
    this.outputChannel.appendLine('[PROPAGATE] Starting status propagation...');

    const startTime = Date.now();
    let updatedCount = 0;
    let skippedCount = 0;

    // Traverse hierarchy depth-first (children before parents)
    // This ensures bottom-up propagation (Story→Feature→Epic→Project)
    await this.propagateNode(hierarchy, async (node) => {
      if (node.item.type === 'epic' || node.item.type === 'feature' || node.item.type === 'project') {
        const result = await this.propagateParentStatus(node);
        if (result === 'updated') {
          updatedCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        }
      }
    });

    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(
      `[PROPAGATE] Completed in ${duration}ms: ${updatedCount} updated, ${skippedCount} skipped`
    );
  }

  /**
   * Determines new status for a parent based on children states.
   *
   * Rules:
   * - All children "Completed" → Parent "Completed"
   * - Any child "In Progress" → Parent "In Progress" (if not already)
   * - Mixed states (not all completed) → Parent "In Progress" (if was "Not Started" or "In Planning")
   * - No status downgrade (Completed → In Progress not allowed)
   *
   * @param parent - Parent node with children
   * @returns New status for parent, or null if no change needed
   */
  private determineParentStatus(parent: HierarchyNode): Status | null {
    const children = parent.children;

    if (children.length === 0) {
      // No children - no basis for status update
      return null;
    }

    const currentStatus = parent.item.status;
    const completedCount = children.filter(c => c.item.status === 'Completed').length;
    const inProgressCount = children.filter(c => c.item.status === 'In Progress').length;
    const totalCount = children.length;

    // Rule 1: All children completed → Parent completed
    if (completedCount === totalCount) {
      if (currentStatus !== 'Completed') {
        return 'Completed';
      }
    }

    // Rule 2: Any child in progress → Parent in progress (if not already)
    if (inProgressCount > 0) {
      if (currentStatus === 'Not Started' || currentStatus === 'In Planning') {
        return 'In Progress';
      }
    }

    // Rule 3: Mixed states → Parent in progress (if was "Not Started" or "In Planning")
    if (completedCount > 0 && completedCount < totalCount) {
      if (currentStatus === 'Not Started' || currentStatus === 'In Planning') {
        return 'In Progress';
      }
    }

    // Rule 4: Never downgrade status
    if (currentStatus === 'Completed') {
      // Parent already completed - don't change even if children regress
      return null;
    }

    // No change needed
    return null;
  }

  /**
   * Updates parent item status in frontmatter file.
   *
   * Atomic updates using vscode.workspace.fs.writeFile:
   * 1. Read current file content
   * 2. Parse frontmatter
   * 3. Replace status line
   * 4. Replace updated timestamp line
   * 5. Write back to file
   *
   * @param parent - Parent node to update
   * @param newStatus - New status value
   * @returns 'updated' | 'skipped' | 'error'
   */
  private async updateParentFrontmatter(
    parent: HierarchyNode,
    newStatus: Status
  ): Promise<'updated' | 'skipped' | 'error'> {
    try {
      const filePath = parent.item.filePath;
      const fileUri = vscode.Uri.file(filePath);

      // Read current file content
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      const content = Buffer.from(contentBytes).toString('utf8');

      // Parse frontmatter to get current values
      const frontmatter = await this.cache.get(filePath);

      if (!frontmatter) {
        this.outputChannel.appendLine(
          `[PROPAGATE] ⚠️  Skipping ${parent.item.item}: Invalid frontmatter`
        );
        return 'error';
      }

      const oldStatus = frontmatter.status;
      const oldUpdated = frontmatter.updated;
      const newUpdated = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Replace status line
      const statusRegex = new RegExp(`^status: ${oldStatus}$`, 'm');
      let newContent = content.replace(statusRegex, `status: ${newStatus}`);

      // Replace updated line
      const updatedRegex = new RegExp(`^updated: ${oldUpdated}$`, 'm');
      newContent = newContent.replace(updatedRegex, `updated: ${newUpdated}`);

      // Verify changes were made
      if (newContent === content) {
        this.outputChannel.appendLine(
          `[PROPAGATE] ⚠️  Failed to update ${parent.item.item}: Pattern match failed`
        );
        return 'error';
      }

      // Write back to file
      const newContentBytes = Buffer.from(newContent, 'utf8');
      await vscode.workspace.fs.writeFile(fileUri, newContentBytes);

      // Invalidate cache (will be reparsed on next access)
      this.cache.invalidate(filePath);

      this.outputChannel.appendLine(
        `[PROPAGATE] ✅ ${parent.item.item} status updated: ${oldStatus} → ${newStatus}`
      );
      this.outputChannel.appendLine(
        `[PROPAGATE]    File: ${path.relative(this.workspaceRoot, filePath)}`
      );
      this.outputChannel.appendLine(
        `[PROPAGATE]    Children: ${parent.children.length} (all completed: ${this.allChildrenCompleted(parent)})`
      );

      return 'updated';

    } catch (error) {
      this.outputChannel.appendLine(
        `[PROPAGATE] ❌ Error updating ${parent.item.item}: ${error}`
      );
      return 'error';
    }
  }

  /**
   * Propagates status for a single parent node.
   *
   * @param node - Parent node to check and update
   * @returns 'updated' | 'skipped' | 'error'
   */
  private async propagateParentStatus(node: HierarchyNode): Promise<'updated' | 'skipped' | 'error'> {
    // Determine new status based on children
    const newStatus = this.determineParentStatus(node);

    if (!newStatus) {
      // No change needed
      return 'skipped';
    }

    // Update parent frontmatter
    return await this.updateParentFrontmatter(node, newStatus);
  }

  /**
   * Traverses hierarchy depth-first and calls callback for each node.
   *
   * @param hierarchy - Root nodes
   * @param callback - Async function to call for each node
   */
  private async propagateNode(
    hierarchy: HierarchyNode[],
    callback: (node: HierarchyNode) => Promise<void>
  ): Promise<void> {
    for (const node of hierarchy) {
      // Process children first (depth-first, bottom-up)
      if (node.children.length > 0) {
        await this.propagateNode(node.children, callback);
      }

      // Then process this node
      await callback(node);
    }
  }

  private allChildrenCompleted(parent: HierarchyNode): boolean {
    return parent.children.every(c => c.item.status === 'Completed');
  }
}
```

#### 2. Integration with PlanningTreeProvider

```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  // ... existing code ...

  private propagationEngine: StatusPropagationEngine;

  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {
    // Initialize propagation engine
    this.propagationEngine = new StatusPropagationEngine(
      workspaceRoot,
      cache,
      outputChannel
    );
  }

  /**
   * Refreshes the tree view by firing change event.
   * Enhanced to trigger status propagation after cache invalidation.
   */
  async refresh(): Promise<void> {
    // Clear items cache first (forces reload on next access)
    this.allItemsCache = null;
    this.outputChannel.appendLine('[ItemsCache] Cache cleared');

    // Clear hierarchy cache (depends on items data)
    this.hierarchyCache.clear();
    this.outputChannel.appendLine('[Hierarchy] Cache cleared');

    // Clear progress cache (depends on hierarchy data)
    this.progressCache.clear();
    this.outputChannel.appendLine('[Progress] Cache cleared');

    // Trigger status propagation before TreeView refresh
    // This ensures parent statuses are up-to-date when tree renders
    try {
      // Load items and hierarchy (will repopulate caches)
      const items = await this.loadAllPlanningItems();

      // Build full hierarchy across all statuses for propagation
      const fullHierarchy = this.buildHierarchy(items);

      // Run propagation
      await this.propagationEngine.propagateStatuses(items, fullHierarchy);

      // Clear caches again (propagation may have changed files)
      this.allItemsCache = null;
      this.hierarchyCache.clear();
      this.progressCache.clear();

    } catch (error) {
      this.outputChannel.appendLine(`[PROPAGATE] ❌ Error during propagation: ${error}`);
      // Continue with refresh even if propagation fails (non-blocking)
    }

    // Notify VSCode to reload tree
    this._onDidChangeTreeData.fire(undefined);
  }
}
```

#### 3. FileSystemWatcher Integration (Already Exists)

FileSystemWatcher from S38 already calls `refresh()` on file changes:
```typescript
// In extension.ts
function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher(
    '**/plans/**/*.md',
    false, // onCreate
    false, // onChange
    false  // onDelete
  );

  // Debounced refresh (300ms) - already includes cache invalidation
  planWatcher.onDidChange(uri => {
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // <-- This will now trigger propagation
  });

  return [planWatcher];
}
```

### Performance Optimization

**Batching Strategy:**
- Propagation runs once per refresh cycle (after 300ms debounce)
- Multiple file changes batched into single propagation pass
- Uses cached hierarchy (no additional file scans)

**Worst-Case Scenario (100 items, 20 parents):**
- Hierarchy traversal: O(n) = 100 iterations
- Parent status checks: 20 checks
- Frontmatter writes: < 5 writes (typically few parents need updates)
- Total time: < 100ms

**Optimization Opportunities:**
- Skip propagation if change was to non-status field (title, description)
- Cache parent status decisions between refresh cycles
- Parallel frontmatter writes using Promise.all()

### Error Handling

**Non-Blocking Design:**
- Propagation errors logged but don't block TreeView refresh
- Individual parent update failures don't stop other parents
- Malformed frontmatter handled gracefully (skip item, log warning)
- File write errors logged with full context

**Recovery:**
- User can manually fix parent status in markdown file
- Next propagation cycle will correct any missed updates
- Cache invalidation ensures fresh data after errors

### User Experience

**Transparency:**
- All propagation actions logged to Output Channel
- User sees which parents were updated and why
- Manual overrides respected (user retains control)

**Performance:**
- No UI blocking (async propagation)
- Debouncing prevents excessive writes during batch operations
- TreeView refresh shows updated statuses immediately

## Test Strategy

### Unit Tests

**StatusPropagationEngine Tests:**
```typescript
// Test determineParentStatus() logic
test('all children completed → parent completed', () => {
  const parent = createMockParent('In Progress', [
    createMockChild('Completed'),
    createMockChild('Completed'),
    createMockChild('Completed')
  ]);

  const newStatus = engine.determineParentStatus(parent);
  expect(newStatus).toBe('Completed');
});

test('mixed states → parent in progress', () => {
  const parent = createMockParent('Not Started', [
    createMockChild('Completed'),
    createMockChild('In Progress'),
    createMockChild('Ready')
  ]);

  const newStatus = engine.determineParentStatus(parent);
  expect(newStatus).toBe('In Progress');
});

test('no children → no status change', () => {
  const parent = createMockParent('Not Started', []);

  const newStatus = engine.determineParentStatus(parent);
  expect(newStatus).toBeNull();
});

test('never downgrade from completed', () => {
  const parent = createMockParent('Completed', [
    createMockChild('In Progress'),  // Child regressed
    createMockChild('Completed')
  ]);

  const newStatus = engine.determineParentStatus(parent);
  expect(newStatus).toBeNull(); // No downgrade
});
```

**Frontmatter Update Tests:**
```typescript
test('updateParentFrontmatter() replaces status line', async () => {
  const mockFile = `---
status: In Progress
updated: 2025-10-14
---
Content`;

  // Mock file system
  mockFs.writeFile(filePath, mockFile);

  await engine.updateParentFrontmatter(parent, 'Completed');

  const result = mockFs.readFile(filePath);
  expect(result).toContain('status: Completed');
  expect(result).toContain('updated: 2025-10-15');
});
```

### Integration Tests

**End-to-End Propagation:**
1. Create test hierarchy with 1 Epic, 2 Features, 6 Stories
2. Mark all stories in Feature 1 as "Completed"
3. Trigger FileSystemWatcher event
4. Verify Feature 1 status updated to "Completed"
5. Mark all stories in Feature 2 as "Completed"
6. Trigger FileSystemWatcher event
7. Verify Epic status updated to "Completed"

**Concurrency Tests:**
1. Rapidly change multiple child statuses (< 300ms apart)
2. Verify debouncing batches changes into single propagation
3. Verify all parent statuses updated correctly

### Manual Testing

**TreeView Verification:**
1. Open Cascade TreeView
2. Complete final story in a feature (via drag-drop or manual edit)
3. Wait for refresh (< 1 second)
4. Verify feature status shows "Completed"
5. Verify feature progress shows "(N/N)"
6. Verify feature moved to "Completed" status group

**Output Channel Verification:**
1. Open "Cascade" output channel
2. Trigger propagation by completing child items
3. Verify propagation log entries appear
4. Check for any warnings or errors
5. Verify timing logs show acceptable performance

## Dependencies

**Existing Infrastructure:**
- S38 (FileSystemWatcher) - Detects file changes
- S40 (FrontmatterCache) - Parses and caches frontmatter
- S55 (Hierarchical Item Display) - Provides parent-child relationships
- S56 (Progress Indicators) - Uses same hierarchy for progress calculation

**No New External Dependencies:**
All functionality implemented using existing VSCode APIs and extension infrastructure.

## Future Enhancements

**Not in Scope for S59:**
- Bi-directional propagation (parent status propagating to children)
- Custom propagation rules per item type (via frontmatter configuration)
- Propagation history tracking (audit log of status changes)
- UI confirmation before propagating (automatic only for now)
- Spec status propagation (currently only plans/ items)

**Potential Future Stories:**
- S60: Configurable propagation rules (enable/disable per workspace)
- S61: Propagation conflict resolution UI (handle manual override conflicts)
- S62: Spec-to-Story-to-Feature-to-Epic full propagation chain
- S63: Propagation preview mode (show proposed changes before applying)
