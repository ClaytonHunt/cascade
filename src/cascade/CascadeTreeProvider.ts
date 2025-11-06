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
        // Read progress from state file
        const progress = await this.getItemProgress(id, registryItem.path);

        // Create tree item
        const treeItem: CascadeTreeItem = {
          id: registryItem.id,
          type: registryItem.type,
          title: registryItem.title,
          status: registryItem.status,
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
   * Get progress percentage for a work item
   */
  private async getItemProgress(itemId: string, itemPath: string): Promise<number> {
    try {
      // Determine state file path
      const itemDir = path.dirname(path.join(this.cascadeDir, itemPath));
      const stateFilePath = path.join(itemDir, 'state.json');

      // Check if state file exists
      if (!fs.existsSync(stateFilePath)) {
        // No state file - could be a leaf task
        return 0;
      }

      // Load state file
      const state = await this.stateManager.loadState(stateFilePath);

      // Return progress percentage
      return state.progress?.percentage || 0;

    } catch (error) {
      // If state file doesn't exist or is invalid, return 0
      return 0;
    }
  }

  /**
   * Get tree item for display
   */
  getTreeItem(element: CascadeTreeItem): vscode.TreeItem {
    const hasChildren = this.childrenCache.has(element.id);

    const treeItem = new vscode.TreeItem(
      this.formatLabel(element),
      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    // Set icon based on type
    treeItem.iconPath = new vscode.ThemeIcon(this.getIconForType(element.type));

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

    // Convert IDs to tree items
    const children = childIds
      .map(id => this.itemCache.get(id))
      .filter((item): item is CascadeTreeItem => item !== undefined)
      .sort((a, b) => this.compareItems(a, b));

    return children;
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
