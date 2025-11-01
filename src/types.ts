/**
 * TypeScript interfaces for frontmatter metadata.
 * Matches schema defined in docs/frontmatter-schema.md
 */

/**
 * Item type enum - categorizes planning hierarchy
 */
export type ItemType = 'project' | 'epic' | 'feature' | 'story' | 'bug' | 'spec' | 'phase';

/**
 * Status enum - tracks item lifecycle state
 */
export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed' | 'Archived';

/**
 * Priority enum - indicates importance/urgency
 */
export type Priority = 'High' | 'Medium' | 'Low';

/**
 * Estimate enum - t-shirt sizing for stories/bugs
 */
export type Estimate = 'XS' | 'S' | 'M' | 'L' | 'XL';

/**
 * TreeView display mode.
 * - 'status': Items grouped by status (Not Started, In Progress, etc.)
 * - 'hierarchy': Items organized by parent-child relationships (P→E→F→S)
 */
export type ViewMode = 'status' | 'hierarchy';

/**
 * Frontmatter metadata extracted from markdown files.
 *
 * All planning and specification files use YAML frontmatter with this structure.
 * Required fields must be present for parsing to succeed.
 * Optional fields may be present depending on item type.
 */
export interface Frontmatter {
  // ===== Required Fields (all item types) =====

  /** Unique identifier (P1, E2, F11, S36, B1) */
  item: string;

  /** Human-readable title */
  title: string;

  /** Item type for categorization */
  type: ItemType;

  /** Current lifecycle state */
  status: Status;

  /** Importance/urgency level */
  priority: Priority;

  /** Creation date (YYYY-MM-DD) */
  created: string;

  /** Last modified date (YYYY-MM-DD) */
  updated: string;

  // ===== Optional Fields =====

  /** Item numbers this depends on (e.g., [S26, F11] or []) */
  dependencies?: string[];

  /** Size/complexity estimate (stories/bugs only) */
  estimate?: Estimate;

  /** Reference to spec directory or parent spec number */
  spec?: string;

  /** Phase sequence number (phase files only) */
  phase?: number;

  /** Total phases in spec (spec plan.md only) */
  phases?: number;
}

/**
 * Result of parsing frontmatter from markdown content.
 *
 * Success case includes parsed frontmatter object.
 * Failure case includes error message explaining what went wrong.
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;

  /** Parsed frontmatter (only present if success=true) */
  frontmatter?: Frontmatter;

  /** Error message (only present if success=false) */
  error?: string;
}
