/**
 * TypeScript interfaces for Cascade work item system.
 * Matches CASCADE-INTEGRATION-SPEC.md specification.
 */

/**
 * Work item type enum - categorizes hierarchy levels
 */
export type CascadeItemType = 'Project' | 'Epic' | 'Feature' | 'Story' | 'Bug' | 'Phase' | 'Task';

/**
 * Status enum - tracks item lifecycle state (spec lines 176-181)
 */
export type CascadeStatus = 'planned' | 'in-progress' | 'completed' | 'blocked';

/**
 * Priority enum - indicates importance/urgency (spec lines 182-186)
 */
export type CascadePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Complexity enum - effort estimate (spec lines 187-191)
 */
export type CascadeComplexity = 'simple' | 'medium' | 'complex' | 'very-complex';

/**
 * Frontmatter metadata from markdown files (spec lines 115-173)
 */
export interface CascadeFrontmatter {
  // Required fields
  id: string;                    // Work item ID (e.g., E0001)
  type: CascadeItemType;         // Work item type
  title: string;                 // Human-readable title
  status: CascadeStatus;         // Current status
  priority: CascadePriority;     // Priority level
  complexity: CascadeComplexity; // Complexity estimate
  parent: string | null;         // Parent work item ID (null for Project)
  created: string;               // Creation date (YYYY-MM-DD)
  updated: string;               // Last update date (YYYY-MM-DD)

  // Optional fields
  assignee?: string;             // Person assigned
  tags?: string[];               // Tags for categorization
  due_date?: string;             // Due date (YYYY-MM-DD)
}

/**
 * Progress metrics for a work item (spec lines 202-208)
 */
export interface ProgressMetrics {
  total_items: number;     // Total child items count
  completed: number;       // Completed items count
  in_progress: number;     // In-progress items count
  planned: number;         // Planned items count
  percentage: number;      // Completion percentage (0-100)
}

/**
 * Child summary in parent state (spec lines 240-241)
 */
export interface ChildSummary {
  status: CascadeStatus;   // Child's current status
  progress: number;        // Child's completion percentage
}

/**
 * State data from state.json files (spec lines 197-244)
 */
export interface StateData {
  id: string;                              // Work item ID
  status: CascadeStatus;                   // Current status
  progress: ProgressMetrics;               // Progress metrics
  children: Record<string, ChildSummary>;  // Map of child ID to summary
  updated: string;                         // Last update timestamp (ISO 8601)
}

/**
 * Work item registry entry (spec lines 295-304)
 */
export interface RegistryEntry {
  id: string;              // Work item ID
  type: CascadeItemType;   // Work item type
  path: string;            // Relative path to markdown file
  title: string;           // Work item title
  status: CascadeStatus;   // Current status
  parent: string | null;   // Parent work item ID
  created: string;         // Creation date (YYYY-MM-DD)
  updated: string;         // Last update date (YYYY-MM-DD)
  deleted?: boolean;       // Soft delete flag (optional)
}

/**
 * ID counters by type (spec lines 282-290)
 */
export interface IDCounters {
  P: number;   // Project counter
  E: number;   // Epic counter
  F: number;   // Feature counter
  S: number;   // Story counter
  B: number;   // Bug counter
  PH: number;  // Phase counter
  T: number;   // Task counter
}

/**
 * Work item registry structure (spec lines 249-306)
 */
export interface WorkItemRegistry {
  version: string;                          // Registry format version (semver)
  last_updated: string;                     // Last modification timestamp (ISO 8601)
  work_items: Record<string, RegistryEntry>; // Map of ID to registry entry
  id_counters: IDCounters;                  // Current counter for each type
}

/**
 * Result of parsing frontmatter
 */
export interface CascadeParseResult {
  success: boolean;              // Whether parsing succeeded
  frontmatter?: CascadeFrontmatter; // Parsed frontmatter (if success)
  error?: string;                // Error message (if !success)
}
