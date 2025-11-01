/**
 * Status Transition Validation Module
 *
 * Implements a state machine for planning item workflow transitions.
 * Used by drag-and-drop controller (S60/S61) to validate status changes.
 *
 * ## Workflow Philosophy
 *
 * The status lifecycle follows a structured planning and execution flow:
 *
 * 1. **Not Started** - Initial state for new work items
 * 2. **In Planning** - Active planning/specification phase
 * 3. **Ready** - Planned and ready for implementation
 * 4. **In Progress** - Actively being implemented
 * 5. **Completed** - Finished and verified
 * 6. **Blocked** - Cannot proceed (waiting on dependency/decision)
 *
 * The state machine enforces logical progression through these phases while
 * allowing necessary rollbacks (e.g., Ready → In Planning for clarification).
 *
 * ## Design Principles
 *
 * - **No Skipping Phases**: Cannot jump from "Not Started" to "In Progress"
 * - **Rollback Support**: Can return to previous states when needed
 * - **Blocker Flexibility**: Can enter "Blocked" from "In Progress" only
 * - **Reopen Support**: Can reopen "Completed" items to "In Progress"
 *
 * ## Integration
 *
 * Used by:
 * - S61: Drag-and-drop status updates
 * - Future: Bulk status update tools
 * - Future: CLI status management
 *
 * @module statusTransitions
 * @see vscode-extension/src/treeview/PlanningDragAndDropController.ts
 */

import { Status } from './types';

/**
 * Status transition state machine.
 *
 * Defines valid transitions between lifecycle states for planning items.
 * Each status maps to an array of allowed next statuses.
 *
 * ## Workflow Rules
 *
 * **Not Started → In Planning:**
 * - User starts planning/breaking down work item
 *
 * **In Planning → Ready:**
 * - Planning complete, item ready for implementation
 *
 * **In Planning → Not Started:**
 * - Rollback if planning abandoned
 *
 * **Ready → In Progress:**
 * - Implementation started
 *
 * **Ready → In Planning:**
 * - Needs more planning/clarification
 *
 * **In Progress → Completed:**
 * - Work finished and verified
 *
 * **In Progress → Blocked:**
 * - Cannot proceed due to blocker
 *
 * **In Progress → Ready:**
 * - Rollback if implementation paused
 *
 * **Blocked → Ready:**
 * - Blocker resolved, ready to resume
 *
 * **Blocked → In Progress:**
 * - Blocker resolved, actively working
 *
 * **Completed → In Progress:**
 * - Reopen for additional work or bug fix
 *
 * ## Invalid Transitions (Examples)
 *
 * - Not Started → In Progress (must plan first)
 * - Not Started → Completed (cannot skip workflow)
 * - Ready → Completed (must implement first)
 * - Completed → Ready (use Completed → In Progress)
 *
 * @see docs/frontmatter-schema.md for status definitions
 */
const validTransitions: Record<Status, Status[]> = {
  'Not Started': ['In Planning'],
  'In Planning': ['Ready', 'Not Started'],
  'Ready': ['In Progress', 'In Planning'],
  'In Progress': ['Completed', 'Blocked', 'Ready'],
  'Blocked': ['Ready', 'In Progress'],
  'Completed': ['In Progress'],
  'Archived': [] // No drag-and-drop transitions - S77 will add toggle command
};

/**
 * Validates if a status transition is allowed by workflow rules.
 *
 * Uses state machine to check if target status is in the list of valid
 * next statuses for the source status.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * // Valid transitions
 * isValidTransition('Ready', 'In Progress');  // true
 * isValidTransition('In Progress', 'Completed');  // true
 *
 * // Invalid transitions
 * isValidTransition('Not Started', 'Completed');  // false
 * isValidTransition('Ready', 'Blocked');  // false
 * ```
 */
export function isValidTransition(from: Status, to: Status): boolean {
  // Get list of valid next statuses for source status
  const allowedNextStatuses = validTransitions[from];

  // Transition is valid if target status is in allowed list
  return allowedNextStatuses?.includes(to) ?? false;
}

/**
 * Gets list of valid next statuses for a given status.
 *
 * Useful for UI hints (e.g., which status groups accept drops).
 *
 * @param status - Current status
 * @returns Array of valid next statuses
 *
 * @example
 * ```typescript
 * getValidNextStatuses('Ready');
 * // Returns: ['In Progress', 'In Planning']
 * ```
 */
export function getValidNextStatuses(status: Status): Status[] {
  return validTransitions[status] ?? [];
}
