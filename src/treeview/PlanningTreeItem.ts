/**
 * Data models for tree nodes displayed in the Cascade TreeView.
 *
 * PlanningTreeItem: File-backed planning items (stories, epics, features, etc.)
 * StatusGroupNode: Virtual status grouping nodes (not backed by files)
 * TreeNode: Union type representing all possible tree nodes
 *
 * Conversion from Frontmatter to PlanningTreeItem happens in
 * PlanningTreeProvider.getChildren() when loading planning items.
 */

import * as vscode from 'vscode';
import { ItemType, Status, Priority } from '../types';

/**
 * Planning item displayed in TreeView.
 *
 * Each item corresponds to one markdown file in the plans/ directory.
 * The provider loads these items by scanning the directory and parsing
 * frontmatter using the FrontmatterCache.
 */
export interface PlanningTreeItem {
  /** Unique identifier (e.g., "E4", "F16", "S48") */
  item: string;

  /** Human-readable title */
  title: string;

  /** Item type (determines icon and hierarchy) */
  type: ItemType;

  /** Current lifecycle state */
  status: Status;

  /** Importance/urgency level */
  priority: Priority;

  /** Absolute path to the markdown file */
  filePath: string;

  /** Optional: Parent item ID for hierarchy (e.g., "P1", "E4", "F16") */
  parent?: string;

  /** Optional: Item numbers this depends on (e.g., ["P1", "S26"]) */
  dependencies?: string[];

  /** Optional: Path to spec directory relative to workspace root (e.g., "specs/S95-spec-phase-indicator-rendering") */
  spec?: string;
}

/**
 * Virtual node representing a status group in the TreeView.
 *
 * Status groups are container nodes that group planning items by their
 * current lifecycle status. They are not backed by files - they exist
 * only in memory as tree structure.
 *
 * Each status group displays a label with count badge (e.g., "Ready (5)")
 * and contains all planning items with that status as children.
 */
export interface StatusGroupNode {
  /** Discriminator field for type guards (always 'status-group') */
  type: 'status-group';

  /** Status this group represents (e.g., "Ready", "In Progress") */
  status: Status;

  /** Display label with count (e.g., "Ready (5)") */
  label: string;

  /** Number of items in this status group */
  count: number;

  /** Collapsible state (always Expanded by default) */
  collapsibleState: vscode.TreeItemCollapsibleState;
}

/**
 * Union type for all tree nodes displayed in Cascade TreeView.
 *
 * - PlanningTreeItem: File-backed planning items (stories, epics, features, etc.)
 * - StatusGroupNode: Virtual status grouping nodes (not backed by files)
 *
 * Use the `type` field for type discrimination:
 * - PlanningTreeItem: `type` is ItemType ('story', 'epic', etc.)
 * - StatusGroupNode: `type` is literal 'status-group'
 */
export type TreeNode = PlanningTreeItem | StatusGroupNode;
