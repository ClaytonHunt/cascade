/**
 * StatePropagationEngine - Core state propagation logic for Cascade
 *
 * This is Cascade's PRIMARY RESPONSIBILITY per the integration spec.
 *
 * Responsibilities:
 * - Watch for state.json changes
 * - Propagate updates to parent state files recursively
 * - Recalculate progress percentages and rollup metrics
 * - Handle errors and edge cases
 *
 * Spec reference: CASCADE-INTEGRATION-SPEC.md lines 310-378
 *
 * Algorithm (spec lines 332-351):
 * 1. Load changed child state.json
 * 2. Extract child ID and parse state
 * 3. Look up parent from registry using child ID
 * 4. If no parent, stop (reached root)
 * 5. Load parent state.json
 * 6. Update parent.children[childId] with child status/progress
 * 7. Recalculate parent progress
 * 8. Update parent.updated timestamp
 * 9. Write parent state.json
 * 10. Recursively propagate to grandparent
 */

import * as path from 'path';
import { RegistryManager } from './RegistryManager';
import { StateManager } from './StateManager';
import { StateData } from './types';

export class StatePropagationEngine {
  private registryManager: RegistryManager;
  private stateManager: StateManager;

  // Track propagation chain to detect cycles
  private propagationChain: Set<string> = new Set();

  constructor(cascadeDir: string) {
    this.registryManager = new RegistryManager(cascadeDir);
    this.stateManager = new StateManager();
  }

  /**
   * Main propagation entry point
   * Called when a state.json file changes
   *
   * @param childStatePath - Absolute path to changed state.json file
   */
  async propagateStateChange(childStatePath: string): Promise<void> {
    // Reset propagation chain for new propagation
    this.propagationChain.clear();

    try {
      await this.propagateRecursive(childStatePath);
    } catch (error) {
      console.error(`State propagation failed for ${childStatePath}:`, error);
      throw error;
    } finally {
      // Always clear chain
      this.propagationChain.clear();
    }
  }

  /**
   * Recursive propagation implementation
   */
  private async propagateRecursive(childStatePath: string): Promise<void> {
    // Step 1: Load child state
    let childState: StateData;
    try {
      childState = await this.stateManager.loadState(childStatePath);
    } catch (error) {
      console.error(`Failed to load child state ${childStatePath}:`, error);
      throw new Error(`Cannot propagate from malformed state file: ${childStatePath}`);
    }

    // Step 2: Extract child ID
    const childId = childState.id;

    // Cycle detection: Check if we've already propagated this ID in current chain
    if (this.propagationChain.has(childId)) {
      console.error(`Circular dependency detected: ${Array.from(this.propagationChain).join(' → ')} → ${childId}`);
      throw new Error(`Circular dependency detected involving ${childId}`);
    }
    this.propagationChain.add(childId);

    // Step 3: Look up parent from registry
    const parentId = await this.registryManager.getParentId(childId);

    // Step 4: If no parent, stop (reached project root)
    if (!parentId) {
      console.log(`Propagation stopped at root: ${childId}`);
      return;
    }

    // Step 5: Get parent state path and load parent state
    const parentStatePath = await this.registryManager.getStatePath(parentId);
    if (!parentStatePath) {
      console.warn(`No state path for parent ${parentId} (might be Task)`);
      return;
    }

    let parentState: StateData;
    try {
      // Try to load existing parent state
      parentState = await this.stateManager.loadState(parentStatePath);
    } catch (error) {
      // Parent state missing or malformed - try to regenerate
      console.warn(`Parent state ${parentStatePath} missing/malformed, regenerating...`);
      try {
        parentState = await this.regenerateParentState(parentId, parentStatePath);
      } catch (regenError) {
        console.error(`Failed to regenerate parent state for ${parentId}:`, regenError);
        throw regenError;
      }
    }

    // Step 6-7: Update parent state with child's status/progress and recalculate
    const childProgress = childState.progress.percentage;
    const updatedParentState = this.stateManager.updateChildSummary(
      parentState,
      childId,
      childState.status,
      childProgress
    );

    // Step 8: Timestamp already updated in updateChildSummary

    // Step 9: Write parent state
    try {
      await this.stateManager.saveState(parentStatePath, updatedParentState);
      console.log(`Propagated ${childId} → ${parentId} (${updatedParentState.progress.percentage}% complete)`);
    } catch (error) {
      console.error(`Failed to save parent state ${parentStatePath}:`, error);
      throw error;
    }

    // Step 10: Recursively propagate to grandparent
    await this.propagateRecursive(parentStatePath);
  }

  /**
   * Regenerate parent state from children (recovery mechanism)
   */
  private async regenerateParentState(
    parentId: string,
    parentStatePath: string
  ): Promise<StateData> {
    // Get all children from registry
    const children = await this.registryManager.getChildren(parentId);

    // Get state paths for children
    const childStatePaths: string[] = [];
    for (const child of children) {
      const childStatePath = await this.registryManager.getStatePath(child.id);
      if (childStatePath && this.stateManager.stateExists(childStatePath)) {
        childStatePaths.push(childStatePath);
      }
    }

    // Regenerate state from children
    const regeneratedState = await this.stateManager.regenerateFromChildren(
      parentId,
      childStatePaths
    );

    // Save regenerated state
    await this.stateManager.saveState(parentStatePath, regeneratedState);

    console.log(`Regenerated state for ${parentId} from ${childStatePaths.length} children`);

    return regeneratedState;
  }

  /**
   * Batch propagation for multiple changes
   * Useful when multiple children change simultaneously
   */
  async propagateBatch(childStatePaths: string[]): Promise<void> {
    // Group by parent to optimize propagation
    const parentMap = new Map<string, string[]>();

    for (const childStatePath of childStatePaths) {
      try {
        const childState = await this.stateManager.loadState(childStatePath);
        const parentId = await this.registryManager.getParentId(childState.id);

        if (parentId) {
          if (!parentMap.has(parentId)) {
            parentMap.set(parentId, []);
          }
          parentMap.get(parentId)!.push(childStatePath);
        }
      } catch (error) {
        console.error(`Failed to process ${childStatePath} in batch:`, error);
        // Continue with other files
      }
    }

    // Propagate from each affected parent (deduplicated)
    const parentIds = Array.from(parentMap.keys());
    for (const parentId of parentIds) {
      const parentStatePath = await this.registryManager.getStatePath(parentId);
      if (parentStatePath) {
        try {
          await this.propagateStateChange(parentStatePath);
        } catch (error) {
          console.error(`Batch propagation failed for parent ${parentId}:`, error);
          // Continue with other parents
        }
      }
    }

    console.log(`Batch propagation completed for ${parentIds.length} parents`);
  }

  /**
   * Validate entire state hierarchy
   * Useful for detecting inconsistencies
   */
  async validateHierarchy(): Promise<ValidationResult[]> {
    const issues: ValidationResult[] = [];
    const allItems = await this.registryManager.getAllWorkItems();

    for (const item of allItems) {
      // Skip tasks (no state.json)
      if (item.type === 'Task') continue;

      const statePath = await this.registryManager.getStatePath(item.id);
      if (!statePath) continue;

      // Check if state file exists
      if (!this.stateManager.stateExists(statePath)) {
        issues.push({
          itemId: item.id,
          severity: 'error',
          message: `Missing state.json for ${item.id} at ${statePath}`
        });
        continue;
      }

      // Try to load and validate state
      try {
        const state = await this.stateManager.loadState(statePath);

        // Verify ID matches
        if (state.id !== item.id) {
          issues.push({
            itemId: item.id,
            severity: 'error',
            message: `State ID mismatch: registry=${item.id}, state=${state.id}`
          });
        }

        // Verify children exist in registry
        for (const childId of Object.keys(state.children)) {
          const childItem = await this.registryManager.getWorkItem(childId);
          if (!childItem) {
            issues.push({
              itemId: item.id,
              severity: 'warning',
              message: `Child ${childId} in state but not in registry`
            });
          } else if (childItem.parent !== item.id) {
            issues.push({
              itemId: item.id,
              severity: 'error',
              message: `Child ${childId} has wrong parent: expected=${item.id}, actual=${childItem.parent}`
            });
          }
        }

        // Verify registry children are in state
        const registryChildren = await this.registryManager.getChildren(item.id);
        for (const child of registryChildren) {
          if (!state.children[child.id]) {
            issues.push({
              itemId: item.id,
              severity: 'warning',
              message: `Child ${child.id} in registry but not in state.children`
            });
          }
        }
      } catch (error) {
        issues.push({
          itemId: item.id,
          severity: 'error',
          message: `Failed to load/validate state: ${error}`
        });
      }
    }

    return issues;
  }

  /**
   * Fix hierarchy issues automatically where possible
   */
  async repairHierarchy(): Promise<RepairResult[]> {
    const results: RepairResult[] = [];
    const issues = await this.validateHierarchy();

    for (const issue of issues) {
      if (issue.message.includes('Missing state.json')) {
        // Try to regenerate missing state
        try {
          const statePath = await this.registryManager.getStatePath(issue.itemId);
          if (statePath) {
            await this.regenerateParentState(issue.itemId, statePath);
            results.push({
              itemId: issue.itemId,
              action: 'regenerated',
              success: true
            });
          }
        } catch (error) {
          results.push({
            itemId: issue.itemId,
            action: 'regenerate_failed',
            success: false,
            error: String(error)
          });
        }
      }
    }

    return results;
  }
}

export interface ValidationResult {
  itemId: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface RepairResult {
  itemId: string;
  action: string;
  success: boolean;
  error?: string;
}
