import { PlanningTreeItem } from './PlanningTreeItem';

/**
 * Represents a node in the hierarchical tree structure.
 *
 * This structure captures the parent-child relationships between
 * planning items (Project → Epic → Feature → Story/Bug) for display in TreeView.
 *
 * Each node contains:
 * - item: The actual planning item data
 * - children: Child nodes in the hierarchy
 * - parent: Reference to parent node (null for root/orphan items)
 *
 * Examples:
 * - Project node: children = [Epic nodes], parent = null
 * - Epic node: children = [Feature nodes], parent = Project node (or null if orphan)
 * - Feature node: children = [Story/Bug nodes], parent = Epic node (or null if orphan)
 * - Story/Bug node: children = [], parent = Feature node (or null if orphan)
 * - Orphan Epic: children = [Feature nodes], parent = null (no parent project)
 * - Orphan Story: children = [], parent = null (no parent feature)
 */
export interface HierarchyNode {
  /** The planning item at this node */
  item: PlanningTreeItem;

  /** Child nodes in the hierarchy (empty array for leaf nodes) */
  children: HierarchyNode[];

  /** Parent node (null for root-level or orphan items) */
  parent: HierarchyNode | null;
}

/**
 * Parsed directory structure extracted from a file path.
 *
 * This interface captures the project, epic, and feature directory names
 * parsed from a planning item's file path, enabling hierarchy detection.
 *
 * Examples:
 * - Project file: `plans/project.md` or `plans/project-cascade.md`
 *   - projectDir: null (projects live at root, not in subdirectory)
 *   - epicDir: null
 *   - featureDir: null
 *   - fileName: "project.md"
 *
 * - Epic file: `plans/epic-04-kanban-view/epic.md`
 *   - projectDir: null (not in project subdirectory)
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: null
 *   - fileName: "epic.md"
 *
 * - Feature file: `plans/epic-04-kanban-view/feature-16-foundation/feature.md`
 *   - projectDir: null
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "feature.md"
 *
 * - Story file: `plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md`
 *   - projectDir: null
 *   - epicDir: "epic-04-kanban-view"
 *   - featureDir: "feature-16-foundation"
 *   - fileName: "story-49-core.md"
 *
 * - Orphan story: `plans/story-19-standalone.md`
 *   - projectDir: null
 *   - epicDir: null
 *   - featureDir: null
 *   - fileName: "story-19-standalone.md"
 */
export interface ItemPathParts {
  /** Project directory name (e.g., "project-01-planning") or null if no project */
  projectDir: string | null;

  /** Epic directory name (e.g., "epic-04-kanban-view") or null if no epic */
  epicDir: string | null;

  /** Feature directory name (e.g., "feature-16-foundation") or null if no feature */
  featureDir: string | null;

  /** File name (e.g., "epic.md", "story-49-core.md") */
  fileName: string;
}
