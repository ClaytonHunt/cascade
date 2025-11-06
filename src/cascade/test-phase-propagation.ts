/**
 * Test script for Phase layer propagation
 *
 * Tests the 6-level hierarchy:
 * Task → Phase → Story → Feature → Epic → Project
 *
 * Run with: npx ts-node src/cascade/test-phase-propagation.ts
 */

import * as path from 'path';
import { RegistryManager } from './RegistryManager';
import { StateManager } from './StateManager';
import { StatePropagationEngine } from './StatePropagationEngine';

const CASCADE_DIR = path.resolve(__dirname, '../../.cascade');

async function main() {
  console.log('='.repeat(60));
  console.log('Testing Phase Layer Propagation');
  console.log('='.repeat(60));
  console.log();

  try {
    const registryManager = new RegistryManager(CASCADE_DIR);
    const stateManager = new StateManager();
    const propagationEngine = new StatePropagationEngine(CASCADE_DIR);

    // Load registry
    console.log('1. Loading registry...');
    const registry = await registryManager.loadRegistry();
    console.log(`✓ Registry loaded: ${Object.keys(registry.work_items).length} items`);
    console.log();

    // Display hierarchy with Phases
    console.log('2. Full hierarchy (including Phases):');
    const allItems = await registryManager.getAllWorkItems();
    for (const item of allItems) {
      const indent = '  '.repeat(getDepth(item.id));
      const icon = getStatusIcon(item.status);
      console.log(`${indent}${icon} ${item.id} - ${item.title} (${item.status})`);
    }
    console.log();

    // Show current state before propagation
    console.log('3. Current state (before propagation):');
    await showState(registryManager, stateManager, 'PH0002');
    await showState(registryManager, stateManager, 'S0002');
    await showState(registryManager, stateManager, 'F0001');
    console.log();

    // Simulate T0010 completion
    console.log('4. Simulating: T0010 (planned → completed)');
    console.log('   Expected propagation path:');
    console.log('   T0010 → PH0002 → S0002 → F0001 → E0001 → P0001');
    console.log();

    // Load PH0002 state and update T0010
    const ph0002StatePath = await registryManager.getStatePath('PH0002');
    if (!ph0002StatePath) {
      throw new Error('Could not get state path for PH0002');
    }

    const ph0002State = await stateManager.loadState(ph0002StatePath);
    console.log(`   Before: PH0002 has ${ph0002State.progress.completed}/${ph0002State.progress.total_items} completed (${ph0002State.progress.percentage}%)`);

    // Update T0010 to completed
    const updatedPH0002 = stateManager.updateChildSummary(
      ph0002State,
      'T0010',
      'completed',
      100
    );

    console.log(`   After:  PH0002 has ${updatedPH0002.progress.completed}/${updatedPH0002.progress.total_items} completed (${updatedPH0002.progress.percentage}%)`);

    // Save updated state
    await stateManager.saveState(ph0002StatePath, updatedPH0002);
    console.log('   ✓ Saved updated PH0002 state');
    console.log();

    // Propagate the change
    console.log('5. Propagating state change through Phase layer...');
    await propagationEngine.propagateStateChange(ph0002StatePath);
    console.log('   ✓ Propagation completed');
    console.log();

    // Verify propagation results
    console.log('6. State after propagation:');
    await showState(registryManager, stateManager, 'PH0002');
    await showState(registryManager, stateManager, 'S0002');
    await showState(registryManager, stateManager, 'F0001');
    await showState(registryManager, stateManager, 'E0001');
    await showState(registryManager, stateManager, 'P0001');
    console.log();

    // Test hierarchy validation
    console.log('7. Validating hierarchy with Phases...');
    const issues = await propagationEngine.validateHierarchy();
    if (issues.length === 0) {
      console.log('   ✓ No issues found - hierarchy is valid');
    } else {
      console.log(`   ⚠ Found ${issues.length} issues:`);
      for (const issue of issues.slice(0, 5)) {
        console.log(`     [${issue.severity}] ${issue.itemId}: ${issue.message}`);
      }
      if (issues.length > 5) {
        console.log(`     ... and ${issues.length - 5} more`);
      }
    }
    console.log();

    // Test complete hierarchy depth
    console.log('8. Testing maximum depth (6 levels):');
    const depths = [
      { id: 'P0001', level: 'Project', depth: 1 },
      { id: 'E0001', level: 'Epic', depth: 2 },
      { id: 'F0001', level: 'Feature', depth: 3 },
      { id: 'S0002', level: 'Story', depth: 4 },
      { id: 'PH0002', level: 'Phase', depth: 5 },
      { id: 'T0010', level: 'Task', depth: 6 }
    ];

    for (const { id, level, depth } of depths) {
      const item = await registryManager.getWorkItem(id);
      if (item) {
        const hasState = item.type !== 'Task';
        console.log(`   ${id} (${level}) - Depth ${depth} ${hasState ? '✓ has state.json' : '○ no state.json (Task)'}`);
      }
    }
    console.log();

    console.log('='.repeat(60));
    console.log('✓ Phase layer propagation test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ Test failed:', error);
    console.error();
    process.exit(1);
  }
}

async function showState(
  registryManager: RegistryManager,
  stateManager: StateManager,
  itemId: string
) {
  const statePath = await registryManager.getStatePath(itemId);
  if (statePath) {
    try {
      const state = await stateManager.loadState(statePath);
      const childCount = Object.keys(state.children).length;
      console.log(`   ${itemId}: ${state.progress.completed}/${state.progress.total_items} completed (${state.progress.percentage}%) [${childCount} children]`);
    } catch (error) {
      console.log(`   ${itemId}: ❌ Error loading state`);
    }
  } else {
    console.log(`   ${itemId}: [No state.json]`);
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

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'planned': '○',
    'in-progress': '◐',
    'completed': '●',
    'blocked': '⊗'
  };
  return icons[status] || '?';
}

main();
