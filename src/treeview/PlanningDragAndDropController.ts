import * as vscode from 'vscode';
import { TreeNode, PlanningTreeItem, StatusGroupNode } from './PlanningTreeItem';
import { isValidTransition, getValidNextStatuses } from '../statusTransitions';
import { updateItemStatus } from '../fileUpdates';

/**
 * Drag-and-drop controller for Cascade TreeView.
 *
 * Implements VSCode's TreeDragAndDropController interface to enable
 * dragging Stories and Bugs between status groups for workflow transitions.
 *
 * ## Capabilities
 *
 * - **Drag Source Validation:** Only Stories and Bugs can be dragged
 * - **Drop Target Validation:** Only status groups accept drops
 * - **Data Serialization:** Items serialized to JSON for transfer
 * - **Event Logging:** All drag/drop events logged to output channel
 *
 * ## Integration Points
 *
 * ### S60 (Current Story)
 * - Core drag-and-drop infrastructure
 * - Validation and logging only
 * - No file updates or status changes
 *
 * ### S61 (Status Update and File Persistence)
 * Integration point in `handleDrop()`:
 * ```typescript
 * // TODO S61: Validate status transition
 * // TODO S61: Update file frontmatter
 * ```
 *
 * S61 will implement:
 * - Status transition validation (e.g., Ready → In Progress is valid)
 * - Frontmatter file updates (status and updated fields)
 * - File write error handling
 *
 * ### S62 (Visual Feedback and Notifications) - ✅ Completed
 * Implements three notification types:
 * - **Success**: `✅ S49 moved to "In Progress"` (auto-dismiss after 5s)
 * - **Warning**: `⚠️ Cannot move S49 from "Not Started" to "Completed". Valid transitions: In Planning`
 * - **Error**: `❌ Failed to update S49: EACCES: permission denied` (with "Open File" button)
 *
 * Visual feedback provided by VSCode TreeDragAndDropController API:
 * - Drag cursor shows item label while dragging
 * - Drop indicator highlights status groups
 * - Invalid drop targets show "no entry" cursor
 *
 * ## Usage Example
 *
 * ```typescript
 * // In extension.ts activate()
 * const dragDropController = new PlanningDragAndDropController(outputChannel);
 *
 * cascadeTreeView = vscode.window.createTreeView('cascadeView', {
 *   treeDataProvider: planningTreeProvider,
 *   dragAndDropController: dragDropController
 * });
 * ```
 *
 * ## MIME Type Configuration
 *
 * - Type: `application/vnd.code.tree.cascadeView`
 * - Scope: Cascade extension only (matches TreeView ID)
 * - Purpose: Prevent cross-extension drag pollution
 *
 * ## Serialized Item Data Format
 *
 * ```typescript
 * {
 *   item: string;      // e.g., "S49"
 *   title: string;     // e.g., "TreeDataProvider Core Implementation"
 *   filePath: string;  // Absolute path to .md file
 *   status: Status;    // Current status (for validation)
 *   type: ItemType;    // 'story' or 'bug'
 * }
 * ```
 *
 * @see S60 Story: plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-60-drag-drop-controller-implementation.md
 * @see S61 Story: plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-61-status-update-and-file-persistence.md
 */
export class PlanningDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  // MIME type for Cascade planning items
  // Matches TreeView ID 'cascadeView' to scope drag-and-drop to this extension
  readonly dropMimeTypes = ['application/vnd.code.tree.cascadeView'];
  readonly dragMimeTypes = ['application/vnd.code.tree.cascadeView'];

  /**
   * Creates a new PlanningDragAndDropController.
   *
   * @param outputChannel - Output channel for logging drag-and-drop events
   */
  constructor(
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Handles drag start event.
   *
   * Serializes dragged items to DataTransfer for drop handling.
   * Only allows dragging of Stories and Bugs (rejects Epics, Features, Status Groups).
   *
   * @param source - Array of tree nodes being dragged
   * @param dataTransfer - VSCode DataTransfer object for serialization
   * @param token - Cancellation token
   */
  handleDrag(
    source: TreeNode[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // Multi-item drag not supported in S60 (future enhancement)
    // Process only first item
    if (source.length === 0) {
      this.outputChannel.appendLine('[DragDrop] ⚠️  No items to drag');
      return;
    }

    const node = source[0];

    // Validate draggable using helper
    if (!this.isDraggable(node)) {
      this.outputChannel.appendLine(`[DragDrop] ⚠️  Cannot drag ${node.type} items`);
      return;
    }

    const item = node as PlanningTreeItem;

    // Serialize item data for drop handler
    // Include essential fields for validation and future status update (S61)
    const itemData = JSON.stringify({
      item: item.item,           // e.g., "S49"
      title: item.title,         // e.g., "TreeDataProvider Core Implementation"
      filePath: item.filePath,   // Absolute path to markdown file
      status: item.status,       // Current status (for transition validation)
      type: item.type            // 'story' or 'bug'
    });

    // Set DataTransfer with MIME type
    dataTransfer.set(
      this.dragMimeTypes[0],
      new vscode.DataTransferItem(itemData)
    );

    // Log drag start event
    this.outputChannel.appendLine(`[DragDrop] Drag started: ${item.item} - ${item.title}`);
    this.outputChannel.appendLine(`  Status: ${item.status}`);
    this.outputChannel.appendLine(`  Type: ${item.type}`);
  }

  /**
   * Handles drop event.
   *
   * Validates drop target (must be status group) and source items (must be Stories/Bugs).
   * Extracts target status and logs drop event.
   *
   * Status update logic is deferred to S61 - this handler only validates and logs.
   *
   * @param target - Tree node where items were dropped (or undefined if dropped on empty space)
   * @param dataTransfer - VSCode DataTransfer object containing serialized items
   * @param token - Cancellation token
   */
  async handleDrop(
    target: TreeNode | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // Validate drop target using helper
      if (!this.isValidDropTarget(target)) {
        this.outputChannel.appendLine('[DragDrop] ⚠️  Invalid drop target');
        if (target) {
          this.outputChannel.appendLine(`  Target type: ${target.type}`);
        } else {
          this.outputChannel.appendLine('  Target is undefined (dropped outside tree)');
        }
        return;
      }

      // Deserialize dragged item data
      const dataTransferItem = dataTransfer.get(this.dragMimeTypes[0]);
      if (!dataTransferItem) {
        this.outputChannel.appendLine('[DragDrop] ⚠️  No data in DataTransfer (MIME type mismatch?)');
        return;
      }

      let itemData: any;
      try {
        const itemDataStr = await dataTransferItem.asString();
        itemData = JSON.parse(itemDataStr);
      } catch (parseError) {
        this.outputChannel.appendLine('[DragDrop] ❌ Failed to deserialize item data');
        this.outputChannel.appendLine(`  Error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
        return;
      }

      // Validate required fields exist and are non-empty
      const requiredFields = ['item', 'filePath', 'status', 'type'];
      const missingFields = requiredFields.filter(field => !itemData[field]);
      if (missingFields.length > 0) {
        this.outputChannel.appendLine('[DragDrop] ❌ Invalid item data structure');
        this.outputChannel.appendLine(`  Missing fields: ${missingFields.join(', ')}`);
        return;
      }

      // Extract target status from status group
      const statusGroup = target as StatusGroupNode;
      const targetStatus = statusGroup.status;

      // Validate: Source must be Story or Bug (redundant check for safety)
      if (itemData.type !== 'story' && itemData.type !== 'bug') {
        this.outputChannel.appendLine('[DragDrop] ❌ Invalid source item type');
        this.outputChannel.appendLine(`  Type: ${itemData.type}`);
        return;
      }

      // Log successful drop event
      this.outputChannel.appendLine('[DragDrop] Drop received:');
      this.outputChannel.appendLine(`  Item: ${itemData.item} - ${itemData.title}`);
      this.outputChannel.appendLine(`  Source status: ${itemData.status}`);
      this.outputChannel.appendLine(`  Target status: ${targetStatus}`);
      this.outputChannel.appendLine(`  File: ${itemData.filePath}`);

      // Validate status transition
      if (!isValidTransition(itemData.status, targetStatus)) {
        this.outputChannel.appendLine('[DragDrop] ❌ Invalid status transition');
        this.outputChannel.appendLine(`  ${itemData.status} → ${targetStatus} is not allowed`);

        // Show warning notification with valid transition options
        const validStatuses = getValidNextStatuses(itemData.status);
        vscode.window.showWarningMessage(
          `⚠️ Cannot move ${itemData.item} from "${itemData.status}" to "${targetStatus}". ` +
          `Valid transitions: ${validStatuses.join(', ')}`
        );

        return;
      }

      // Check for same-status drop (no-op)
      if (itemData.status === targetStatus) {
        this.outputChannel.appendLine('[DragDrop] ℹ️  Same status (no update needed)');
        this.outputChannel.appendLine(`  Item already in ${targetStatus}`);
        return;
      }

      // Update file frontmatter
      try {
        await updateItemStatus(itemData.filePath, targetStatus, this.outputChannel);
        this.outputChannel.appendLine('[DragDrop] ✅ Status update successful');

        // Show success notification to user
        vscode.window.showInformationMessage(
          `✅ ${itemData.item} moved to "${targetStatus}"`
        );
      } catch (error) {
        this.outputChannel.appendLine('[DragDrop] ❌ File update failed');
        this.outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Show error notification with "Open File" action button
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `❌ Failed to update ${itemData.item}: ${errorMsg}`,
          'Open File'
        ).then(selection => {
          if (selection === 'Open File') {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(itemData.filePath));
          }
        });
      }

    } catch (error) {
      // Catch-all for unexpected errors
      this.outputChannel.appendLine('[DragDrop] ❌ Unexpected error in handleDrop');
      this.outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.outputChannel.appendLine(`  Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    }
  }

  /**
   * Validates if a tree node can be dragged.
   *
   * Draggable items:
   * - Stories (type === 'story')
   * - Bugs (type === 'bug')
   *
   * Non-draggable items:
   * - Status groups (virtual nodes)
   * - Epics (organizational containers)
   * - Features (organizational containers)
   * - Specs (implementation artifacts)
   * - Phases (implementation artifacts)
   *
   * @param node - Tree node to validate
   * @returns true if node can be dragged, false otherwise
   */
  private isDraggable(node: TreeNode): boolean {
    // Status groups are virtual nodes (not backed by files)
    if (node.type === 'status-group') {
      return false;
    }

    // Only Stories and Bugs can be dragged
    const item = node as PlanningTreeItem;
    return item.type === 'story' || item.type === 'bug';
  }

  /**
   * Validates if a tree node is a valid drop target.
   *
   * Valid drop targets:
   * - Status groups (type === 'status-group')
   *
   * Invalid drop targets:
   * - Planning items (Stories, Bugs, Epics, Features, etc.)
   * - undefined (dropped outside tree)
   *
   * @param node - Tree node to validate (or undefined)
   * @returns true if node is valid drop target, false otherwise
   */
  private isValidDropTarget(node: TreeNode | undefined): boolean {
    if (!node) {
      return false;
    }
    return node.type === 'status-group';
  }
}
