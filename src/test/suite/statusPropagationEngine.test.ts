import * as assert from 'assert';
import { StatusPropagationEngine } from '../../treeview/StatusPropagationEngine';
import { HierarchyNode } from '../../treeview/HierarchyNode';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { Status } from '../../types';

// Mock helper to create hierarchy nodes
function createMockNode(status: Status, children: HierarchyNode[] = []): HierarchyNode {
  const item: PlanningTreeItem = {
    item: 'TEST',
    title: 'Test Item',
    type: 'feature',
    status: status,
    priority: 'Medium',
    filePath: '/test/path.md'
  };

  return {
    item,
    children,
    parent: null
  };
}

suite('StatusPropagationEngine - Class Instantiation', () => {
  test('Can instantiate StatusPropagationEngine with required parameters', () => {
    // Arrange
    const workspaceRoot = '/test/workspace';
    const cache = null as any; // Mock
    const outputChannel = null as any; // Mock

    // Act
    const engine = new StatusPropagationEngine(workspaceRoot, cache, outputChannel);

    // Assert
    assert.ok(engine, 'Engine should be instantiated');
    assert.strictEqual(typeof engine, 'object', 'Engine should be an object');
  });
});

suite('StatusPropagationEngine - determineParentStatus', () => {
  test('All children completed → Parent becomes completed', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('Completed'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('In Progress', children);

    // Access private method via type assertion for testing
    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, 'Completed', 'Parent should become Completed when all children completed');
  });

  test('Any child in progress → Parent becomes in progress', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('In Progress'),
      createMockNode('Ready')
    ];
    const parent = createMockNode('Not Started', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, 'In Progress', 'Parent should become In Progress when any child in progress');
  });

  test('No children → No status change', () => {
    const parent = createMockNode('Not Started', []);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null, 'Parent with no children should not change status');
  });

  test('Never downgrade from completed', () => {
    const children = [
      createMockNode('In Progress'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('Completed', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null, 'Parent should not downgrade from Completed');
  });

  test('Parent already in correct state → No change', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('Completed', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const newStatus = (engine as any).determineParentStatus(parent);

    assert.strictEqual(newStatus, null, 'Parent already completed should not change');
  });
});

suite('StatusPropagationEngine - Frontmatter Regex Patterns', () => {
  test('Status line regex matches and replaces correctly', () => {
    const content = `---
item: F16
title: Foundation
type: feature
status: In Progress
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Content here`;

    // Test regex pattern
    const statusRegex = new RegExp(`^status: In Progress$`, 'm');
    const newContent = content.replace(statusRegex, 'status: Completed');

    assert.ok(newContent.includes('status: Completed'), 'Content should include new status');
    assert.ok(!newContent.includes('status: In Progress'), 'Content should not include old status');
  });

  test('Updated line regex matches and replaces correctly', () => {
    const content = `---
updated: 2025-10-14
---`;

    const updatedRegex = new RegExp(`^updated: 2025-10-14$`, 'm');
    const newContent = content.replace(updatedRegex, 'updated: 2025-10-15');

    assert.ok(newContent.includes('updated: 2025-10-15'), 'Content should include new date');
    assert.ok(!newContent.includes('updated: 2025-10-14'), 'Content should not include old date');
  });

  test('Regex fails gracefully on malformed frontmatter', () => {
    const content = `---
status: In Progress Extra Text
---`;

    const statusRegex = new RegExp(`^status: In Progress$`, 'm');
    const newContent = content.replace(statusRegex, 'status: Completed');

    // No match - content unchanged
    assert.strictEqual(newContent, content, 'Malformed frontmatter should not match regex');
  });
});

suite('StatusPropagationEngine - Helper Methods', () => {
  test('allChildrenCompleted returns true when all children completed', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('Completed'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('In Progress', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const result = (engine as any).allChildrenCompleted(parent);

    assert.strictEqual(result, true, 'Should return true when all children completed');
  });

  test('allChildrenCompleted returns false when some children incomplete', () => {
    const children = [
      createMockNode('Completed'),
      createMockNode('In Progress'),
      createMockNode('Completed')
    ];
    const parent = createMockNode('In Progress', children);

    const engine = new StatusPropagationEngine('', null as any, null as any);
    const result = (engine as any).allChildrenCompleted(parent);

    assert.strictEqual(result, false, 'Should return false when some children incomplete');
  });
});
