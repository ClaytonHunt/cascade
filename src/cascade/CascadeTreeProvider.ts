/**
 * CascadeTreeProvider - TreeView provider for hierarchical work item display
 *
 * Displays work items from .cascade/ directory in a hierarchical tree:
 * - Project → Epic → Feature → Story/Bug → Phase → Task
 * - Shows status and progress percentage for each item
 * - Single representation (each item appears once under its parent)
 * - Uses work-item-registry.json for hierarchy
 * - Uses state.json files for progress data
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RegistryManager } from './RegistryManager';
import { StateManager } from './StateManager';
import { WorkItemRegistry, WorkItemType } from './types';

/**
 * Tree item data structure
 */
export interface CascadeTreeItem {
  id: string;
  type: WorkItemType;
  title: string;
  status: string;
  progress: number;
  parent: string | null;
  filePath: string;
}

/**
 * TreeDataProvider for Cascade work items
 */
export class CascadeTreeProvider implements vscode.TreeDataProvider<CascadeTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CascadeTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cascadeDir: string;
  private registryManager: RegistryManager;
  private stateManager: StateManager;
  private outputChannel: vscode.OutputChannel;

  // Cache for tree items
  private itemCache = new Map<string, CascadeTreeItem>();
  private childrenCache = new Map<string, string[]>(); // parent ID -> child IDs

  // Filter settings
  private showArchived = false;

  constructor(
    cascadeDir: string,
    registryManager: RegistryManager,
    stateManager: StateManager,
    outputChannel: vscode.OutputChannel
  ) {
    this.cascadeDir = cascadeDir;
    this.registryManager = registryManager;
    this.stateManager = stateManager;
    this.outputChannel = outputChannel;
  }

  /**
   * Refresh the tree view
   */
  async refresh(): Promise<void> {
    this.outputChannel.appendLine('[TreeView] Refreshing...');

    // Clear caches
    this.itemCache.clear();
    this.childrenCache.clear();

    // Rebuild caches
    await this.buildCache();

    // Trigger UI refresh
    this._onDidChangeTreeData.fire(undefined);

    this.outputChannel.appendLine('[TreeView] Refresh complete');
  }

  /**
   * Build item cache from registry and state files
   */
  private async buildCache(): Promise<void> {
    try {
      // Load registry
      const registry = await this.registryManager.loadRegistry();
      const items = registry.work_items;

      this.outputChannel.appendLine(`[TreeView] Building cache for ${Object.keys(items).length} items`);

      // Build item cache and children map
      for (const [id, registryItem] of Object.entries(items)) {
        let status = registryItem.status;
        let progress = 0;

        if (registryItem.type === 'Task') {
          // Tasks don't have state.json - read from parent state
          const parentStateData = await this.getParentState(registryItem.parent);
          if (parentStateData && parentStateData.children[id]) {
            status = parentStateData.children[id].status;
            progress = parentStateData.children[id].progress;
          }
        } else {
          // Non-task items have their own state.json - read status and progress from it
          const stateData = await this.getItemState(id, registryItem.path);
          if (stateData) {
            status = stateData.status;
            progress = stateData.progress?.percentage || 0;
          }
        }

        // Create tree item
        const treeItem: CascadeTreeItem = {
          id: registryItem.id,
          type: registryItem.type,
          title: registryItem.title,
          status: status,
          progress: progress,
          parent: registryItem.parent,
          filePath: path.join(this.cascadeDir, registryItem.path)
        };

        this.itemCache.set(id, treeItem);

        // Add to children map
        const parentId = registryItem.parent || 'ROOT';
        if (!this.childrenCache.has(parentId)) {
          this.childrenCache.set(parentId, []);
        }
        this.childrenCache.get(parentId)!.push(id);
      }

      this.outputChannel.appendLine(`[TreeView] Cache built: ${this.itemCache.size} items`);
    } catch (error) {
      this.outputChannel.appendLine(`[TreeView] Cache build failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get state.json data for a work item (used for non-Task items)
   */
  private async getItemState(itemId: string, itemPath: string): Promise<any> {
    try {
      // Determine state file path
      const itemDir = path.dirname(path.join(this.cascadeDir, itemPath));
      const stateFilePath = path.join(itemDir, 'state.json');

      // Check if state file exists
      if (!fs.existsSync(stateFilePath)) {
        return null;
      }

      // Load and return state file
      return await this.stateManager.loadState(stateFilePath);

    } catch (error) {
      return null;
    }
  }

  /**
   * Get parent state.json data for reading Task status/progress
   */
  private async getParentState(parentId: string | null): Promise<any> {
    if (!parentId) {
      return null;
    }

    try {
      // Get parent item from registry
      const registry = await this.registryManager.loadRegistry();
      const parentItem = registry.work_items[parentId];
      if (!parentItem) {
        return null;
      }

      // Get parent state file path
      const parentDir = path.dirname(path.join(this.cascadeDir, parentItem.path));
      const stateFilePath = path.join(parentDir, 'state.json');

      if (!fs.existsSync(stateFilePath)) {
        return null;
      }

      // Load and return parent state
      return await this.stateManager.loadState(stateFilePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get tree item for display
   */
  getTreeItem(element: CascadeTreeItem): vscode.TreeItem {
    const hasChildren = this.childrenCache.has(element.id);

    // Determine initial collapse state
    let collapsibleState = vscode.TreeItemCollapsibleState.None;
    if (hasChildren) {
      // Completed items start collapsed, non-completed start expanded
      const isCompleted = element.status.toLowerCase() === 'completed';
      collapsibleState = isCompleted
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.Expanded;
    }

    const treeItem = new vscode.TreeItem(
      this.formatLabel(element),
      collapsibleState
    );

    // Set icon based on type with progress-based color
    const iconColor = this.getProgressColor(element.progress);
    treeItem.iconPath = new vscode.ThemeIcon(this.getIconForType(element.type), iconColor);

    // Set tooltip
    treeItem.tooltip = this.formatTooltip(element);

    // Set context value for commands
    treeItem.contextValue = element.type.toLowerCase();

    // Set command to open file on click
    treeItem.command = {
      command: 'cascade.openFile',
      title: 'Open File',
      arguments: [element.filePath]
    };

    // Set description (shown in gray after the label)
    treeItem.description = this.formatDescription(element);

    return treeItem;
  }

  /**
   * Get color based on progress percentage
   * 0% = blue
   * 1-100% = red -> yellow -> green gradient
   */
  private getProgressColor(progress: number): vscode.ThemeColor {
    if (progress === 0) {
      // 0% = Blue (not started)
      return new vscode.ThemeColor('charts.blue');
    } else if (progress < 50) {
      // 1-49% = Red to Yellow gradient
      return new vscode.ThemeColor('charts.red');
    } else if (progress < 75) {
      // 50-74% = Yellow
      return new vscode.ThemeColor('charts.yellow');
    } else if (progress < 100) {
      // 75-99% = Yellow to Green gradient
      return new vscode.ThemeColor('charts.orange');
    } else {
      // 100% = Green (completed)
      return new vscode.ThemeColor('charts.green');
    }
  }

  /**
   * Get children of a tree item
   */
  async getChildren(element?: CascadeTreeItem): Promise<CascadeTreeItem[]> {
    // Ensure cache is built
    if (this.itemCache.size === 0) {
      await this.buildCache();
    }

    // Get children IDs
    const parentId = element ? element.id : 'ROOT';
    const childIds = this.childrenCache.get(parentId) || [];

    // Convert IDs to tree items and filter based on settings
    const children = childIds
      .map(id => this.itemCache.get(id))
      .filter((item): item is CascadeTreeItem => item !== undefined)
      .filter(item => this.shouldShowItem(item))
      .sort((a, b) => this.compareItems(a, b));

    return children;
  }

  /**
   * Determine if an item should be shown based on filter settings
   */
  private shouldShowItem(item: CascadeTreeItem): boolean {
    // Filter archived items if showArchived is false
    if (!this.showArchived && item.status.toLowerCase() === 'archived') {
      return false;
    }
    return true;
  }

  /**
   * Toggle showing archived items
   */
  toggleArchived(): void {
    this.showArchived = !this.showArchived;
    this.outputChannel.appendLine(`[TreeView] Archived items: ${this.showArchived ? 'shown' : 'hidden'}`);
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Get current archived toggle state
   */
  getShowArchived(): boolean {
    return this.showArchived;
  }

  /**
   * Format label for tree item
   * Format: [ID] Title
   */
  private formatLabel(element: CascadeTreeItem): string {
    return `${element.id} ${element.title}`;
  }

  /**
   * Format description (shown after label in gray)
   * Format: status (progress%)
   */
  private formatDescription(element: CascadeTreeItem): string {
    const statusStr = element.status;
    const progressStr = element.progress > 0 ? ` (${element.progress}%)` : '';
    return `${statusStr}${progressStr}`;
  }

  /**
   * Format tooltip
   */
  private formatTooltip(element: CascadeTreeItem): string {
    const lines = [
      `${element.type}: ${element.title}`,
      `Status: ${element.status}`,
      `Progress: ${element.progress}%`,
      `ID: ${element.id}`,
      `Path: ${element.filePath}`
    ];
    return lines.join('\n');
  }

  /**
   * Get icon for work item type
   */
  private getIconForType(type: WorkItemType): string {
    const icons: Record<WorkItemType, string> = {
      'Project': 'project',
      'Epic': 'layers',
      'Feature': 'package',
      'Story': 'note',
      'Bug': 'bug',
      'Phase': 'fold',
      'Task': 'check'
    };
    return icons[type] || 'file';
  }

  /**
   * Compare items for sorting
   * Sort order: by ID (which maintains creation order)
   */
  private compareItems(a: CascadeTreeItem, b: CascadeTreeItem): number {
    return a.id.localeCompare(b.id);
  }
}
