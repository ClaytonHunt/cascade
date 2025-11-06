/**
 * Manual test script for state propagation engine
 *
 * Run with: npx ts-node src/cascade/test-propagation.ts
 */

import * as path from 'path';
import { RegistryManager } from './RegistryManager';
import { StateManager } from './StateManager';
import { StatePropagationEngine } from './StatePropagationEngine';

const CASCADE_DIR = path.resolve(__dirname, '../../.cascade');

async function main() {
  console.log('='.repeat(60));
  console.log('Testing Cascade State Propagation Engine');
  console.log('='.repeat(60));
  console.log();

  try {
    // Initialize managers
    console.log('1. Initializing managers...');
    const registryManager = new RegistryManager(CASCADE_DIR);
    const stateManager = new StateManager();
    const propagationEngine = new StatePropagationEngine(CASCADE_DIR);
    console.log('✓ Managers initialized');
    console.log();

    // Test 1: Load registry
    console.log('2. Loading work item registry...');
    const registry = await registryManager.loadRegistry();
    console.log(`✓ Registry loaded: ${Object.keys(registry.work_items).length} items`);
    console.log(`  Version: ${registry.version}`);
    console.log(`  Last updated: ${registry.last_updated}`);
    console.log();

    // Test 2: Display hierarchy
    console.log('3. Work item hierarchy:');
    const allItems = await registryManager.getAllWorkItems();
    for (const item of allItems) {
      const indent = '  '.repeat(getDepth(item.id));
      console.log(`${indent}${item.id} - ${item.title} (${item.status})`);
    }
    console.log();

    // Test 3: Load all states
    console.log('4. Loading state files...');
    for (const item of allItems) {
      if (item.type === 'Task') {
        console.log(`  ${item.id}: [Task - no state.json]`);
        continue;
      }

      const statePath = await registryManager.getStatePath(item.id);
      if (statePath) {
        try {
          const state = await stateManager.loadState(statePath);
          console.log(`  ${item.id}: ${state.progress.completed}/${state.progress.total_items} completed (${state.progress.percentage}%)`);
        } catch (error) {
          console.log(`  ${item.id}: ❌ Error loading state - ${error}`);
        }
      }
    }
    console.log();

    // Test 4: Simulate state change - complete T0004
    console.log('5. Simulating state change: T0004 (planned → completed)...');
    console.log('   This should propagate: T0004 → S0001 → F0001 → E0001 → P0001');
    console.log();

    // Load S0001 state (parent of T0004)
    const s0001StatePath = await registryManager.getStatePath('S0001');
    if (!s0001StatePath) {
      throw new Error('Could not get state path for S0001');
    }

    const s0001State = await stateManager.loadState(s0001StatePath);
    console.log(`   Before: S0001 has ${s0001State.progress.completed}/${s0001State.progress.total_items} completed`);

    // Update T0004 status in S0001's children
    const updatedS0001 = stateManager.updateChildSummary(
      s0001State,
      'T0004',
      'completed',
      100
    );

    console.log(`   After:  S0001 has ${updatedS0001.progress.completed}/${updatedS0001.progress.total_items} completed (${updatedS0001.progress.percentage}%)`);

    // Save updated state
    await stateManager.saveState(s0001StatePath, updatedS0001);
    console.log('   ✓ Saved updated S0001 state');
    console.log();

    // Test 5: Propagate the change
    console.log('6. Propagating state change...');
    await propagationEngine.propagateStateChange(s0001StatePath);
    console.log('   ✓ Propagation completed');
    console.log();

    // Test 6: Verify propagation
    console.log('7. Verifying propagation results...');
    const itemsToCheck = ['S0001', 'F0001', 'E0001', 'P0001'];
    for (const itemId of itemsToCheck) {
      const statePath = await registryManager.getStatePath(itemId);
      if (statePath) {
        const state = await stateManager.loadState(statePath);
        console.log(`   ${itemId}: ${state.progress.completed}/${state.progress.total_items} completed (${state.progress.percentage}%)`);
      }
    }
    console.log();

    // Test 7: Validate hierarchy
    console.log('8. Validating hierarchy integrity...');
    const issues = await propagationEngine.validateHierarchy();
    if (issues.length === 0) {
      console.log('   ✓ No issues found - hierarchy is valid');
    } else {
      console.log(`   ⚠ Found ${issues.length} issues:`);
      for (const issue of issues) {
        console.log(`     [${issue.severity}] ${issue.itemId}: ${issue.message}`);
      }
    }
    console.log();

    console.log('='.repeat(60));
    console.log('✓ All tests completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ Test failed:', error);
    console.error();
    process.exit(1);
  }
}

function getDepth(itemId: string): number {
  if (itemId.startsWith('P')) return 0;
  if (itemId.startsWith('E')) return 1;
  if (itemId.startsWith('F')) return 2;
  if (itemId.startsWith('S') || itemId.startsWith('B')) return 3;
  if (itemId.startsWith('PH')) return 4;
  if (itemId.startsWith('T')) return 5;
  return 0;
}

main();
