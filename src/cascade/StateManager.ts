/**
 * StateManager - Manages state.json file operations
 *
 * Responsibilities:
 * - Read/write state.json files
 * - Validate state structure
 * - Update child summaries
 * - Calculate progress metrics
 * - Atomic write operations
 *
 * Spec reference: CASCADE-INTEGRATION-SPEC.md lines 194-244, 354-371
 */

import * as fs from 'fs';
import * as path from 'path';
import { StateData, CascadeStatus, ProgressMetrics, ChildSummary } from './types';

export class StateManager {
  /**
   * Load state from state.json file
   * Automatically validates and fixes mismatched progress calculations
   */
  async loadState(statePath: string): Promise<StateData> {
    // Check if file exists
    if (!fs.existsSync(statePath)) {
      throw new Error(`State file not found: ${statePath}`);
    }

    try {
      const content = await fs.promises.readFile(statePath, 'utf-8');
      const state = JSON.parse(content) as StateData;

      // Validate structure
      this.validateState(state);

      // Auto-fix: Validate and correct progress if children were updated but progress wasn't
      const correctedState = this.validateAndFixProgress(state, statePath);

      // If we fixed it, save the corrected version
      if (correctedState !== state) {
        await this.saveState(statePath, correctedState);
        console.log(`Auto-fixed progress mismatch in ${statePath}`);
      }

      return correctedState;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Malformed state JSON at ${statePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write state to state.json file atomically
   */
  async saveState(statePath: string, state: StateData): Promise<void> {
    // Validate before writing
    this.validateState(state);

    // Ensure directory exists
    const dir = path.dirname(statePath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Write atomically (write to temp file, then rename)
    const tempPath = `${statePath}.tmp`;
    try {
      await fs.promises.writeFile(
        tempPath,
        JSON.stringify(state, null, 2),
        'utf-8'
      );
      await fs.promises.rename(tempPath, statePath);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
      throw error;
    }
  }

  /**
   * Update child summary in parent state
   * Returns updated state (does not write to disk)
   */
  updateChildSummary(
    parentState: StateData,
    childId: string,
    childStatus: CascadeStatus,
    childProgress: number
  ): StateData {
    // Clone state to avoid mutation
    const updatedState = JSON.parse(JSON.stringify(parentState)) as StateData;

    // Update or add child summary
    updatedState.children[childId] = {
      status: childStatus,
      progress: childProgress
    };

    // Recalculate progress metrics
    updatedState.progress = this.calculateProgress(updatedState.children);

    // Update timestamp
    updatedState.updated = new Date().toISOString();

    return updatedState;
  }

  /**
   * Calculate progress metrics from children
   * Spec reference: lines 354-371
   */
  calculateProgress(children: Record<string, ChildSummary>): ProgressMetrics {
    const childArray = Object.values(children);
    const total = childArray.length;

    // Count children by status
    const completed = childArray.filter(c => c.status === 'completed').length;
    const inProgress = childArray.filter(c => c.status === 'in-progress').length;
    const planned = childArray.filter(c => c.status === 'planned').length;
    const blocked = childArray.filter(c => c.status === 'blocked').length;

    // Calculate percentage: (completed / total) * 100
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total_items: total,
      completed,
      in_progress: inProgress,
      planned,
      percentage
    };
  }

  /**
   * Validate state structure
   */
  private validateState(state: StateData): void {
    // Check required fields
    if (!state.id) {
      throw new Error('State missing id field');
    }
    if (!state.status) {
      throw new Error('State missing status field');
    }
    if (!state.progress) {
      throw new Error('State missing progress field');
    }
    if (!state.children) {
      throw new Error('State missing children field');
    }
    if (!state.updated) {
      throw new Error('State missing updated field');
    }

    // Validate status enum
    const validStatuses: CascadeStatus[] = ['planned', 'in-progress', 'completed', 'blocked'];
    if (!validStatuses.includes(state.status)) {
      throw new Error(`Invalid status: ${state.status}`);
    }

    // Validate progress structure
    const progress = state.progress;
    if (typeof progress.total_items !== 'number' ||
        typeof progress.completed !== 'number' ||
        typeof progress.in_progress !== 'number' ||
        typeof progress.planned !== 'number' ||
        typeof progress.percentage !== 'number') {
      throw new Error('Progress metrics must be numbers');
    }

    // Validate percentage range
    if (progress.percentage < 0 || progress.percentage > 100) {
      throw new Error(`Invalid percentage: ${progress.percentage} (must be 0-100)`);
    }

    // Validate children structure
    for (const [childId, summary] of Object.entries(state.children)) {
      if (!summary.status || typeof summary.progress !== 'number') {
        throw new Error(`Invalid child summary for ${childId}`);
      }
      if (!validStatuses.includes(summary.status)) {
        throw new Error(`Invalid child status for ${childId}: ${summary.status}`);
      }
      if (summary.progress < 0 || summary.progress > 100) {
        throw new Error(`Invalid child progress for ${childId}: ${summary.progress}`);
      }
    }
  }

  /**
   * Create initial state for a new work item
   */
  static createInitialState(id: string, status: CascadeStatus = 'planned'): StateData {
    return {
      id,
      status,
      progress: {
        total_items: 0,
        completed: 0,
        in_progress: 0,
        planned: 0,
        percentage: 0
      },
      children: {},
      updated: new Date().toISOString()
    };
  }

  /**
   * Check if state file exists
   */
  stateExists(statePath: string): boolean {
    return fs.existsSync(statePath);
  }

  /**
   * Validate and fix progress metrics if they don't match children
   * Returns corrected state if fix was needed, original state otherwise
   */
  private validateAndFixProgress(state: StateData, statePath: string): StateData {
    // Calculate what progress SHOULD be based on children
    const correctProgress = this.calculateProgress(state.children);

    // Check if current progress matches calculated progress
    const needsFix =
      state.progress.total_items !== correctProgress.total_items ||
      state.progress.completed !== correctProgress.completed ||
      state.progress.in_progress !== correctProgress.in_progress ||
      state.progress.planned !== correctProgress.planned ||
      state.progress.percentage !== correctProgress.percentage;

    if (needsFix) {
      console.log(`Progress mismatch detected in ${statePath}`);
      console.log(`  Current: ${state.progress.completed}/${state.progress.total_items} (${state.progress.percentage}%)`);
      console.log(`  Correct: ${correctProgress.completed}/${correctProgress.total_items} (${correctProgress.percentage}%)`);

      // Create corrected state
      const correctedState = { ...state };
      correctedState.progress = correctProgress;
      correctedState.updated = new Date().toISOString();

      // Also update status if all children are completed
      if (correctProgress.completed === correctProgress.total_items && correctProgress.total_items > 0) {
        correctedState.status = 'completed';
      }

      return correctedState;
    }

    return state;
  }

  /**
   * Generate state file from children (for recovery)
   * Scans directory for child state files and rebuilds parent state
   */
  async regenerateFromChildren(
    parentId: string,
    childStateFiles: string[]
  ): Promise<StateData> {
    const children: Record<string, ChildSummary> = {};

    // Load each child state and extract summary
    for (const childStatePath of childStateFiles) {
      try {
        const childState = await this.loadState(childStatePath);
        children[childState.id] = {
          status: childState.status,
          progress: childState.progress.percentage
        };
      } catch (error) {
        // Skip malformed child states
        console.error(`Failed to load child state ${childStatePath}:`, error);
      }
    }

    // Calculate progress from children
    const progress = this.calculateProgress(children);

    // Determine parent status based on children
    let status: CascadeStatus = 'planned';
    if (progress.completed === progress.total_items && progress.total_items > 0) {
      status = 'completed';
    } else if (progress.in_progress > 0 || progress.completed > 0) {
      status = 'in-progress';
    }

    return {
      id: parentId,
      status,
      progress,
      children,
      updated: new Date().toISOString()
    };
  }
}
