import * as vscode from 'vscode';
import * as path from 'path';
import { FrontmatterCache } from '../cache';
import { Status } from '../types';
import { HierarchyNode } from './HierarchyNode';
import { PlanningTreeItem } from './PlanningTreeItem';

/**
 * Handles automatic status propagation from children to parents.
 *
 * Triggered by FileSystemWatcher events after cache invalidation.
 * Uses cached hierarchy to identify parent-child relationships.
 * Writes status changes to parent markdown files atomically.
 */
export class StatusPropagationEngine {
  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {}

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

      // Replace status line (multiline mode, exact match)
      const statusRegex = new RegExp(`^status: ${oldStatus}$`, 'm');
      let newContent = content.replace(statusRegex, `status: ${newStatus}`);

      // Replace updated line (multiline mode, exact match)
      const updatedRegex = new RegExp(`^updated: ${oldUpdated}$`, 'm');
      newContent = newContent.replace(updatedRegex, `updated: ${newUpdated}`);

      // Verify changes were made
      if (newContent === content) {
        this.outputChannel.appendLine(
          `[PROPAGATE] ⚠️  Failed to update ${parent.item.item}: Pattern match failed`
        );
        return 'error';
      }

      // Write back to file (atomic operation)
      const newContentBytes = Buffer.from(newContent, 'utf8');
      await vscode.workspace.fs.writeFile(fileUri, newContentBytes);

      // Invalidate cache (will be reparsed on next access)
      this.cache.invalidate(filePath);

      // Log success
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
   * Checks if all children of a parent have "Completed" status.
   *
   * @param parent - Parent node to check
   * @returns true if all children completed, false otherwise
   */
  private allChildrenCompleted(parent: HierarchyNode): boolean {
    return parent.children.every(c => c.item.status === 'Completed');
  }

  /**
   * Propagates status for a single parent node.
   *
   * Determines new status and updates frontmatter if needed.
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
   * Visits children before parents (bottom-up traversal) to ensure
   * child status changes propagate upward correctly.
   *
   * Example hierarchy:
   * - E4 (children: [F16, F17])
   *   - F16 (children: [S49, S50])
   *     - S49 (no children) ← Visited first
   *     - S50 (no children) ← Visited second
   *   ← F16 processed after its children
   *   - F17 (children: [S51])
   *     - S51 (no children)
   *   ← F17 processed after its children
   * ← E4 processed after all children
   *
   * @param hierarchy - Root nodes to traverse
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

  /**
   * Propagates status changes from children to parents.
   *
   * Flow:
   * 1. Traverse hierarchy depth-first (children before parents)
   * 2. Analyze each parent to determine if status update needed
   * 3. Apply status updates to parent frontmatter files
   * 4. Log all actions to Output Channel
   *
   * This method is the main entry point called by PlanningTreeProvider.refresh().
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
    let errorCount = 0;

    // Traverse hierarchy depth-first (children before parents)
    // This ensures bottom-up propagation (Story → Feature → Epic → Project)
    await this.propagateNode(hierarchy, async (node) => {
      // Only propagate for parent types (epic, feature, project)
      if (node.item.type === 'epic' || node.item.type === 'feature' || node.item.type === 'project') {
        const result = await this.propagateParentStatus(node);

        if (result === 'updated') {
          updatedCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        } else if (result === 'error') {
          errorCount++;
        }
      }
    });

    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(
      `[PROPAGATE] Completed in ${duration}ms: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`
    );
  }
}
