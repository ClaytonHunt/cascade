/**
 * Spec Progress Reader Utility
 *
 * Reads spec phase progress from spec directories for integration with
 * VSCode extension TreeView and /plan command reporting.
 *
 * ## Purpose
 *
 * This module provides a clean interface for reading spec progress without
 * duplicating file reading logic across multiple consumers. It encapsulates:
 * - Reading spec plan.md frontmatter
 * - Counting completed phases from task files
 * - Detecting sync issues between story and spec status
 *
 * ## Usage
 *
 * ```typescript
 * import { readSpecProgress, SpecProgress } from './treeview/specProgressReader';
 *
 * // Read progress for a story with spec
 * const progress = await readSpecProgress(specDir, storyStatus);
 *
 * if (progress) {
 *   // Display progress in TreeView: "S93 [2/3]"
 *   const label = `${item.item} [${progress.completedPhases}/${progress.totalPhases}]`;
 * }
 * ```
 *
 * ## Integration Points
 *
 * S95 (Phase Indicator Rendering): Calls readSpecProgress() to display phase indicators.
 * S94 (Spec Progress Cache): May wrap this module with caching layer.
 * /plan Command (Future): Uses readSpecProgress() for spec status reporting.
 *
 * ## Performance
 *
 * Target: Less than 10ms per spec directory.
 * Single pass through phase files.
 * Async/non-blocking file operations.
 * No caching at this layer (handled by S94).
 *
 * @module specProgressReader
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import { Status } from '../types';

// Logging constant for debugging (optional, can be enabled for troubleshooting)
const LOG_PREFIX = '[SpecProgressReader]';

/**
 * Progress information for a spec directory.
 *
 * Contains phase completion statistics and sync status relative to parent story.
 * Return value from readSpecProgress() when spec is found and valid.
 *
 * @example
 * ```typescript
 * const progress = await readSpecProgress(
 *   'D:/projects/lineage/specs/S93-spec-progress-reader-utility',
 *   'In Progress'
 * );
 *
 * if (progress) {
 *   console.log(`Progress: ${progress.completedPhases}/${progress.totalPhases}`);
 *   console.log(`Current Phase: ${progress.currentPhase}`);
 *   console.log(`In Sync: ${progress.inSync}`);
 * }
 * ```
 */
export interface SpecProgress {
  /** Absolute path to spec directory */
  specDir: string;

  /** Total number of phases in spec (from plan.md frontmatter or counted from files) */
  totalPhases: number;

  /** Number of phases with status: Completed */
  completedPhases: number;

  /**
   * Current phase number (completedPhases + 1).
   * Capped at totalPhases (doesn't exceed total).
   * Represents the next phase to work on.
   */
  currentPhase: number;

  /** Spec status from plan.md frontmatter */
  specStatus: Status;

  /**
   * True if spec status matches story status, false if spec is ahead.
   * Spec is "ahead" when:
   * - Spec is "Completed" but story is not "Completed"
   * - Spec is "In Progress" but story is "Ready"
   */
  inSync: boolean;
}

/**
 * Checks if story status and spec status are in sync.
 *
 * A spec is considered "out of sync" when it has advanced beyond the story status,
 * indicating the story status needs to be updated to match spec progress.
 *
 * ## Sync Rules
 *
 * **Out of Sync (returns false)**:
 * - Spec "Completed" but story not "Completed"
 * - Spec "In Progress" but story "Ready"
 *
 * **In Sync (returns true)**:
 * - Story "Ready" + Spec "Not Started" or "Ready"
 * - Story "In Progress" + Spec "Not Started", "Ready", or "In Progress"
 * - Story "Completed" + Spec "Completed"
 * - Any other combination
 *
 * ## Use Cases
 *
 * - TreeView rendering: Display warning icon for out-of-sync specs
 * - /plan command: Report specs that need story status updates
 * - Status validation: Ensure story status reflects spec progress
 *
 * @param storyStatus - Status from parent story frontmatter
 * @param specStatus - Status from spec plan.md frontmatter
 * @returns true if in sync, false if spec is ahead of story
 *
 * @example
 * ```typescript
 * // Check if story needs status update
 * const inSync = checkSyncStatus('Ready', 'In Progress');
 * if (!inSync) {
 *   console.warn('Spec is ahead - update story status to In Progress');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // All combinations
 * checkSyncStatus('Ready', 'Not Started')      // true (in sync)
 * checkSyncStatus('Ready', 'Ready')            // true (in sync)
 * checkSyncStatus('Ready', 'In Progress')      // false (spec ahead)
 * checkSyncStatus('Ready', 'Completed')        // false (spec ahead)
 * checkSyncStatus('In Progress', 'In Progress') // true (in sync)
 * checkSyncStatus('In Progress', 'Completed')   // false (spec ahead)
 * checkSyncStatus('Completed', 'Completed')     // true (in sync)
 * ```
 */
export function checkSyncStatus(
  storyStatus: Status,
  specStatus: Status
): boolean {
  // Spec completed but story not completed → out of sync
  if (specStatus === 'Completed' && storyStatus !== 'Completed') {
    return false;
  }

  // Spec in progress but story still ready → out of sync
  if (specStatus === 'In Progress' && storyStatus === 'Ready') {
    return false;
  }

  // All other combinations are in sync
  return true;
}

/**
 * Extracts YAML frontmatter from markdown content.
 *
 * Simpler than parseFrontmatter() - just extracts YAML without validation.
 * Suitable for spec files which have different field requirements than planning items.
 *
 * @param content - Markdown file content
 * @returns Parsed frontmatter object or null if invalid
 */
function extractFrontmatter(content: string): any | null {
  try {
    // Extract YAML between --- delimiters
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);

    if (!match) {
      return null;
    }

    const yamlContent = match[1];
    const frontmatter = yaml.load(yamlContent);

    // Verify it's an object
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      return null;
    }

    return frontmatter;
  } catch (error) {
    // YAML parse error
    return null;
  }
}

/**
 * Checks if a directory exists and is accessible.
 *
 * @param dirPath - Absolute path to directory
 * @returns true if directory exists, false otherwise
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    // Directory doesn't exist or permission denied
    return false;
  }
}

/**
 * Reads spec progress from a spec directory.
 *
 * Parses spec plan.md frontmatter to get total phases and status,
 * then scans phase task files to count completed phases. Also checks
 * if spec status is in sync with story status.
 *
 * ## Behavior
 *
 * Returns `null` in the following cases (not errors):
 * - Spec directory doesn't exist
 * - plan.md doesn't exist or can't be read
 * - plan.md has malformed frontmatter
 * - plan.md is missing required fields (status, etc.)
 *
 * Phase counting:
 * - Uses `phases` field from plan.md frontmatter if present
 * - Falls back to counting actual task files if `phases` field missing
 * - Scans all `*.md` files in `tasks/` subdirectory
 * - Counts phases where frontmatter has `status: Completed`
 * - Ignores malformed phase files (doesn't throw)
 *
 * Sync detection:
 * - Compares story status vs spec status
 * - Returns `false` if spec is ahead (In Progress when story is Ready, etc.)
 * - Returns `true` if statuses are aligned
 *
 * @param specDir - Absolute path to spec directory (e.g., "D:/projects/lineage/specs/S93-...")
 * @param storyStatus - Status from parent story frontmatter
 * @returns SpecProgress if spec found and valid, null if not found or invalid
 *
 * @example
 * ```typescript
 * // Read progress for a story with spec
 * const item: PlanningTreeItem = {
 *   item: 'S93',
 *   title: 'Spec Progress Reader',
 *   type: 'story',
 *   status: 'In Progress',
 *   priority: 'High',
 *   filePath: '/path/to/story.md',
 *   spec: 'specs/S93-spec-progress-reader-utility'
 * };
 *
 * const specDir = path.join(workspaceRoot, item.spec);
 * const progress = await readSpecProgress(specDir, item.status);
 *
 * if (progress) {
 *   console.log(`Spec: ${progress.specDir}`);
 *   console.log(`Progress: ${progress.completedPhases}/${progress.totalPhases}`);
 *   console.log(`Current Phase: ${progress.currentPhase}`);
 *   console.log(`In Sync: ${progress.inSync ? 'Yes' : 'No'}`);
 * } else {
 *   console.log('Spec not found or invalid');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Check if spec exists for a story
 * const hasSpec = (await readSpecProgress(specDir, status)) !== null;
 * ```
 */
export async function readSpecProgress(
  specDir: string,
  storyStatus: Status
): Promise<SpecProgress | null> {
  // Step 1: Check if spec directory exists
  if (!(await directoryExists(specDir))) {
    // console.log(`${LOG_PREFIX} Directory not found: ${specDir}`);
    return null;
  }

  // Step 2: Read spec plan.md
  const planPath = path.join(specDir, 'plan.md');

  let planContent: string;
  try {
    planContent = await fs.readFile(planPath, 'utf-8');
  } catch (error) {
    // plan.md doesn't exist or can't be read
    return null;
  }

  // Step 3: Parse frontmatter (using simple extraction, not strict validation)
  const frontmatter = extractFrontmatter(planContent);

  if (!frontmatter) {
    // Malformed frontmatter
    return null;
  }

  // Verify required fields for spec files
  if (!frontmatter.status) {
    return null;
  }

  // Extract total phases (may be undefined)
  let totalPhases = frontmatter.phases || 0;
  const specStatus = frontmatter.status;

  // Step 4: Find phase task files
  const tasksPattern = path.join(specDir, 'tasks', '*.md').replace(/\\/g, '/');
  const taskFiles = await glob(tasksPattern);

  // If no phases field in frontmatter, count actual files
  if (totalPhases === 0) {
    totalPhases = taskFiles.length;
  }

  // Step 5: Count completed phases
  let completedPhases = 0;

  for (const taskFile of taskFiles) {
    try {
      const taskContent = await fs.readFile(taskFile, 'utf-8');
      const taskFrontmatter = extractFrontmatter(taskContent);

      if (taskFrontmatter && taskFrontmatter.status === 'Completed') {
        completedPhases++;
      }
      // Ignore malformed phase files - just don't count them
    } catch (error) {
      // Ignore unreadable phase files - just don't count them
      continue;
    }
  }

  // Step 6: Calculate current phase
  const currentPhase = Math.min(completedPhases + 1, totalPhases);

  // Step 7: Check sync status
  const inSync = checkSyncStatus(storyStatus, specStatus);

  // Step 8: Return result
  return {
    specDir,
    totalPhases,
    completedPhases,
    currentPhase,
    specStatus,
    inSync
  };
}
