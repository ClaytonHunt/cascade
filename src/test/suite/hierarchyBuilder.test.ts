import * as assert from 'assert';
import * as path from 'path';
import { HierarchyNode } from '../../treeview/HierarchyNode';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Test suite for hierarchy building logic.
 *
 * Tests the buildHierarchy() method indirectly by creating a test harness
 * that replicates the logic. In production, this logic lives in
 * PlanningTreeProvider.buildHierarchy().
 *
 * These tests verify correct parent-child relationship detection,
 * orphan handling, and sorting behavior.
 */

/**
 * Test harness: Simplified version of parseItemPath for testing
 */
function parseItemPathForTest(filePath: string, workspaceRoot: string): {
  epicDir: string | null;
  featureDir: string | null;
  fileName: string;
} {
  const relativePath = path.relative(workspaceRoot, filePath);
  const parts = relativePath.split(path.sep);

  const result = {
    epicDir: null as string | null,
    featureDir: null as string | null,
    fileName: parts[parts.length - 1]
  };

  const epicDirRegex = /^epic-\d+-/;
  const epicDirIndex = parts.findIndex(part => epicDirRegex.test(part));
  if (epicDirIndex !== -1) {
    result.epicDir = parts[epicDirIndex];
  }

  const featureDirRegex = /^feature-\d+-/;
  const featureDirIndex = parts.findIndex(part => featureDirRegex.test(part));
  if (featureDirIndex !== -1) {
    result.featureDir = parts[featureDirIndex];
  }

  return result;
}

/**
 * Test harness: Compare item numbers for sorting
 */
function compareItemNumbers(a: string, b: string): number {
  const prefixA = a[0];
  const prefixB = b[0];
  const numberA = parseInt(a.substring(1), 10);
  const numberB = parseInt(b.substring(1), 10);

  const prefixOrder: { [key: string]: number } = {
    'P': 1,
    'E': 2,
    'F': 3,
    'S': 4,
    'B': 5
  };

  const orderA = prefixOrder[prefixA] ?? 999;
  const orderB = prefixOrder[prefixB] ?? 999;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return numberA - numberB;
}

/**
 * Test harness: Sort hierarchy nodes recursively
 */
function sortHierarchyNodes(nodes: HierarchyNode[]): void {
  nodes.sort((a, b) => compareItemNumbers(a.item.item, b.item.item));

  for (const node of nodes) {
    if (node.children.length > 0) {
      sortHierarchyNodes(node.children);
    }
  }
}

/**
 * Test harness: Build hierarchy from flat item list
 * This replicates the logic that will be in PlanningTreeProvider.buildHierarchy()
 */
function buildHierarchyForTest(items: PlanningTreeItem[], workspaceRoot: string): HierarchyNode[] {
  const epicMap = new Map<string, HierarchyNode>();
  const featureMap = new Map<string, HierarchyNode>();
  const orphans: HierarchyNode[] = [];

  // Step 1: Parse all items and categorize by type
  for (const item of items) {
    const pathParts = parseItemPathForTest(item.filePath, workspaceRoot);

    const node: HierarchyNode = {
      item: item,
      children: [],
      parent: null
    };

    if (item.type === 'epic' && pathParts.epicDir) {
      epicMap.set(pathParts.epicDir, node);
    } else if (item.type === 'feature' && pathParts.featureDir) {
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      featureMap.set(featureKey, node);
    } else if (item.type === 'story' || item.type === 'bug') {
      // Will be processed in step 2
    } else {
      orphans.push(node);
    }
  }

  // Step 2: Build parent-child relationships
  const roots: HierarchyNode[] = [];

  // Process stories/bugs - attach to parent features
  for (const item of items) {
    if (item.type !== 'story' && item.type !== 'bug') continue;

    const pathParts = parseItemPathForTest(item.filePath, workspaceRoot);
    const node: HierarchyNode = {
      item: item,
      children: [],
      parent: null
    };

    if (pathParts.featureDir) {
      const featureKey = pathParts.epicDir
        ? `${pathParts.epicDir}/${pathParts.featureDir}`
        : pathParts.featureDir;
      const parentFeature = featureMap.get(featureKey);

      if (parentFeature) {
        node.parent = parentFeature;
        parentFeature.children.push(node);
      } else {
        orphans.push(node);
      }
    } else {
      orphans.push(node);
    }
  }

  // Process features - attach to parent epics
  for (const [featureKey, featureNode] of featureMap) {
    const pathParts = parseItemPathForTest(featureNode.item.filePath, workspaceRoot);

    if (pathParts.epicDir) {
      const parentEpic = epicMap.get(pathParts.epicDir);

      if (parentEpic) {
        featureNode.parent = parentEpic;
        parentEpic.children.push(featureNode);
      } else {
        roots.push(featureNode);
      }
    } else {
      roots.push(featureNode);
    }
  }

  // Add all epics as root nodes
  for (const epicNode of epicMap.values()) {
    roots.push(epicNode);
  }

  // Add all orphans as root nodes
  roots.push(...orphans);

  // Step 3: Sort root nodes and children
  sortHierarchyNodes(roots);

  return roots;
}

suite('Hierarchy Building Tests', () => {
  const workspaceRoot = '/workspace/lineage';

  test('Build simple hierarchy: Epic → Feature → Story', () => {
    const epic: PlanningTreeItem = {
      item: 'E4',
      title: 'Planning Kanban View',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'epic.md')
    };

    const feature: PlanningTreeItem = {
      item: 'F16',
      title: 'TreeView Foundation',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'feature.md')
    };

    const story: PlanningTreeItem = {
      item: 'S49',
      title: 'Core Implementation',
      type: 'story',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'story-49-core.md')
    };

    const hierarchy = buildHierarchyForTest([epic, feature, story], workspaceRoot);

    // Expected: E4 (children: [F16 (children: [S49])])
    assert.strictEqual(hierarchy.length, 1, 'Should have 1 root node');
    assert.strictEqual(hierarchy[0].item.item, 'E4', 'Root should be E4');
    assert.strictEqual(hierarchy[0].children.length, 1, 'E4 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].item.item, 'F16', 'E4 child should be F16');
    assert.strictEqual(hierarchy[0].children[0].children.length, 1, 'F16 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].children[0].item.item, 'S49', 'F16 child should be S49');
    assert.strictEqual(hierarchy[0].children[0].children[0].children.length, 0, 'S49 should have no children');
  });

  test('Handle orphan story (no parent)', () => {
    const orphanStory: PlanningTreeItem = {
      item: 'S19',
      title: 'Standalone Story',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: path.join(workspaceRoot, 'plans', 'story-19-standalone.md')
    };

    const hierarchy = buildHierarchyForTest([orphanStory], workspaceRoot);

    assert.strictEqual(hierarchy.length, 1, 'Should have 1 root node');
    assert.strictEqual(hierarchy[0].item.item, 'S19', 'Root should be orphan S19');
    assert.strictEqual(hierarchy[0].parent, null, 'Orphan should have no parent');
    assert.strictEqual(hierarchy[0].children.length, 0, 'Orphan story should have no children');
  });

  test('Handle orphan feature (no epic)', () => {
    const orphanFeature: PlanningTreeItem = {
      item: 'F99',
      title: 'Orphan Feature',
      type: 'feature',
      status: 'Not Started',
      priority: 'Low',
      filePath: path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'feature.md')
    };

    const story: PlanningTreeItem = {
      item: 'S100',
      title: 'Child Story',
      type: 'story',
      status: 'Not Started',
      priority: 'Low',
      filePath: path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'story-100-child.md')
    };

    const hierarchy = buildHierarchyForTest([orphanFeature, story], workspaceRoot);

    assert.strictEqual(hierarchy.length, 1, 'Should have 1 root node');
    assert.strictEqual(hierarchy[0].item.item, 'F99', 'Root should be orphan F99');
    assert.strictEqual(hierarchy[0].parent, null, 'Orphan feature should have no parent');
    assert.strictEqual(hierarchy[0].children.length, 1, 'F99 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].item.item, 'S100', 'F99 child should be S100');
  });

  test('Handle multiple epics with features and stories', () => {
    const epic1: PlanningTreeItem = {
      item: 'E1',
      title: 'Epic One',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-01-one', 'epic.md')
    };

    const epic2: PlanningTreeItem = {
      item: 'E2',
      title: 'Epic Two',
      type: 'epic',
      status: 'Ready',
      priority: 'Medium',
      filePath: path.join(workspaceRoot, 'plans', 'epic-02-two', 'epic.md')
    };

    const feature1: PlanningTreeItem = {
      item: 'F1',
      title: 'Feature One',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-01-one', 'feature-01-one', 'feature.md')
    };

    const feature2: PlanningTreeItem = {
      item: 'F2',
      title: 'Feature Two',
      type: 'feature',
      status: 'Ready',
      priority: 'Medium',
      filePath: path.join(workspaceRoot, 'plans', 'epic-02-two', 'feature-02-two', 'feature.md')
    };

    const hierarchy = buildHierarchyForTest([epic1, epic2, feature1, feature2], workspaceRoot);

    assert.strictEqual(hierarchy.length, 2, 'Should have 2 root nodes');
    assert.strictEqual(hierarchy[0].item.item, 'E1', 'First root should be E1');
    assert.strictEqual(hierarchy[1].item.item, 'E2', 'Second root should be E2');
    assert.strictEqual(hierarchy[0].children.length, 1, 'E1 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].item.item, 'F1', 'E1 child should be F1');
    assert.strictEqual(hierarchy[1].children.length, 1, 'E2 should have 1 child');
    assert.strictEqual(hierarchy[1].children[0].item.item, 'F2', 'E2 child should be F2');
  });

  test('Sort items by item number', () => {
    const story10: PlanningTreeItem = {
      item: 'S10',
      title: 'Story Ten',
      type: 'story',
      status: 'Ready',
      priority: 'Low',
      filePath: path.join(workspaceRoot, 'plans', 'story-10.md')
    };

    const story2: PlanningTreeItem = {
      item: 'S2',
      title: 'Story Two',
      type: 'story',
      status: 'Ready',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'story-02.md')
    };

    const story5: PlanningTreeItem = {
      item: 'S5',
      title: 'Story Five',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: path.join(workspaceRoot, 'plans', 'story-05.md')
    };

    // Pass in unsorted order
    const hierarchy = buildHierarchyForTest([story10, story2, story5], workspaceRoot);

    // Should be sorted: S2, S5, S10
    assert.strictEqual(hierarchy.length, 3, 'Should have 3 root nodes');
    assert.strictEqual(hierarchy[0].item.item, 'S2', 'First should be S2');
    assert.strictEqual(hierarchy[1].item.item, 'S5', 'Second should be S5');
    assert.strictEqual(hierarchy[2].item.item, 'S10', 'Third should be S10');
  });

  test('Handle empty input', () => {
    const hierarchy = buildHierarchyForTest([], workspaceRoot);
    assert.strictEqual(hierarchy.length, 0, 'Empty input should produce empty hierarchy');
  });

  test('Handle single item', () => {
    const singleItem: PlanningTreeItem = {
      item: 'E1',
      title: 'Single Epic',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-01-single', 'epic.md')
    };

    const hierarchy = buildHierarchyForTest([singleItem], workspaceRoot);

    assert.strictEqual(hierarchy.length, 1, 'Should have 1 root node');
    assert.strictEqual(hierarchy[0].item.item, 'E1', 'Root should be E1');
    assert.strictEqual(hierarchy[0].children.length, 0, 'E1 should have no children');
    assert.strictEqual(hierarchy[0].parent, null, 'E1 should have no parent');
  });

  test('Handle bug items in hierarchy', () => {
    const epic: PlanningTreeItem = {
      item: 'E2',
      title: 'Testing Epic',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-02-testing', 'epic.md')
    };

    const feature: PlanningTreeItem = {
      item: 'F7',
      title: 'Discovery Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-02-testing', 'feature-07-discovery', 'feature.md')
    };

    const bug: PlanningTreeItem = {
      item: 'B3',
      title: 'Scanner Bug',
      type: 'bug',
      status: 'In Progress',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-02-testing', 'feature-07-discovery', 'bug-03-scanner.md')
    };

    const hierarchy = buildHierarchyForTest([epic, feature, bug], workspaceRoot);

    assert.strictEqual(hierarchy.length, 1, 'Should have 1 root node');
    assert.strictEqual(hierarchy[0].item.item, 'E2', 'Root should be E2');
    assert.strictEqual(hierarchy[0].children.length, 1, 'E2 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].item.item, 'F7', 'E2 child should be F7');
    assert.strictEqual(hierarchy[0].children[0].children.length, 1, 'F7 should have 1 child');
    assert.strictEqual(hierarchy[0].children[0].children[0].item.item, 'B3', 'F7 child should be B3');
  });

  test('Handle mixed orphans and structured hierarchy', () => {
    const epic: PlanningTreeItem = {
      item: 'E4',
      title: 'Planning Kanban',
      type: 'epic',
      status: 'Ready',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-04-kanban', 'epic.md')
    };

    const feature: PlanningTreeItem = {
      item: 'F16',
      title: 'Foundation',
      type: 'feature',
      status: 'Ready',
      priority: 'High',
      filePath: path.join(workspaceRoot, 'plans', 'epic-04-kanban', 'feature-16-foundation', 'feature.md')
    };

    const orphanStory: PlanningTreeItem = {
      item: 'S19',
      title: 'Standalone',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: path.join(workspaceRoot, 'plans', 'story-19-standalone.md')
    };

    const hierarchy = buildHierarchyForTest([epic, feature, orphanStory], workspaceRoot);

    // Expected: E4 (with F16), S19 (orphan)
    assert.strictEqual(hierarchy.length, 2, 'Should have 2 root nodes');

    // Find epic and orphan in roots (order: E4, S19 based on type then number)
    const epicNode = hierarchy.find(n => n.item.item === 'E4');
    const orphanNode = hierarchy.find(n => n.item.item === 'S19');

    assert.ok(epicNode, 'E4 should be in roots');
    assert.ok(orphanNode, 'S19 should be in roots');
    assert.strictEqual(epicNode?.children.length, 1, 'E4 should have 1 child');
    assert.strictEqual(epicNode?.children[0].item.item, 'F16', 'E4 child should be F16');
    assert.strictEqual(orphanNode?.children.length, 0, 'S19 should have no children');
    assert.strictEqual(orphanNode?.parent, null, 'S19 should have no parent');
  });
});
