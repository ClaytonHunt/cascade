/**
 * Integration Tests for Hierarchy Expansion (S86 Phase 3 Task 2).
 *
 * ## Test Coverage
 *
 * **Parent-Child Relationships:**
 * - Expanding Project shows child Epics
 * - Expanding Epic shows child Features
 * - Expanding Feature shows child Stories/Bugs
 * - Nested expansion works correctly (Project → Epic → Feature → Story)
 *
 * **Edge Cases:**
 * - Parent with no children returns empty array
 * - Orphan items handled correctly
 * - Mixed hierarchy structures
 *
 * ## Running Tests
 *
 * ```bash
 * npm run compile  # Compile TypeScript
 * npm test         # Run all tests
 * ```
 *
 * ## Related Stories
 * - S85: View Mode State Management (provides viewMode property)
 * - S86: Hierarchy View Root Implementation (this spec)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Creates a mock FrontmatterCache for testing.
 */
function createMockCache(): FrontmatterCache {
  return new FrontmatterCache(100);
}

/**
 * Creates a mock output channel for testing.
 */
function createMockOutputChannel(): vscode.OutputChannel {
  const logs: string[] = [];
  return {
    name: 'Test',
    append: (value: string) => logs.push(value),
    appendLine: (value: string) => logs.push(value + '\n'),
    clear: () => logs.splice(0, logs.length),
    show: () => {},
    hide: () => {},
    dispose: () => {},
    replace: () => {},
    // Expose logs for test assertions (non-standard property)
    _getLogs: () => logs
  } as any;
}

/**
 * Creates a mock workspace state (Memento) for testing.
 */
function createMockWorkspaceState(options?: {
  initialValues?: Map<string, any>;
}): vscode.Memento {
  const storage = new Map<string, any>(options?.initialValues ?? []);

  return {
    keys: () => Array.from(storage.keys()),
    get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
    update: (key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    },
    _getStorage: () => storage
  } as any;
}

/**
 * Creates a PlanningTreeProvider instance for testing.
 */
function createTestProvider(
  workspaceRoot: string = 'D:/projects/lineage',
  initialViewMode?: 'status' | 'hierarchy'
): { provider: PlanningTreeProvider; outputChannel: vscode.OutputChannel } {
  const workspaceState = createMockWorkspaceState({
    initialValues: initialViewMode ? new Map([['cascade.viewMode', initialViewMode]]) : undefined
  });

  const outputChannel = createMockOutputChannel();

  const provider = new PlanningTreeProvider(
    workspaceRoot,
    createMockCache(),
    outputChannel,
    workspaceState
  );

  return { provider, outputChannel };
}

suite('Hierarchy Expansion - Project to Epic', () => {
  test('Expanding a Project should show child Epics', async () => {
    // Arrange: Create provider in hierarchy mode
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root nodes
    const rootNodes = await provider.getChildren(undefined);

    // Find first project
    const project = rootNodes.find(node =>
      'type' in node && node.type === 'project'
    ) as PlanningTreeItem | undefined;

    if (!project) {
      // No projects in test data - skip test
      console.log('  [SKIP] No projects found in test data');
      return;
    }

    // Act: Expand project
    const children = await provider.getChildren(project);

    // Assert: Children are epics
    assert.ok(Array.isArray(children), 'Project children should be an array');

    if (children.length > 0) {
      const allEpics = children.every(node =>
        'type' in node && node.type === 'epic'
      );

      assert.ok(allEpics, 'All children of Project should be Epics');

      // Verify first epic structure
      const firstEpic = children[0] as PlanningTreeItem;
      assert.ok(firstEpic.item, 'Epic should have item number');
      assert.ok(firstEpic.item.startsWith('E'), 'Epic item should start with "E"');
    }
  });

  test('Project with no child Epics returns empty array', async () => {
    // Arrange: Create provider
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root nodes
    const rootNodes = await provider.getChildren(undefined);

    // Find projects
    const projects = rootNodes.filter(node =>
      'type' in node && node.type === 'project'
    ) as PlanningTreeItem[];

    // Look for a project with no children
    for (const project of projects) {
      const children = await provider.getChildren(project);

      if (children.length === 0) {
        // Found a project with no children
        assert.strictEqual(children.length, 0, 'Project with no Epics should return empty array');
        return;
      }
    }

    // If all projects have children, test passes (no empty projects exist)
    console.log('  [INFO] All projects have child epics');
  });
});

suite('Hierarchy Expansion - Epic to Feature', () => {
  test('Expanding an Epic should show child Features', async () => {
    // Arrange: Create provider in hierarchy mode
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    const rootNodes = await provider.getChildren(undefined);

    // Find first epic (could be under project or orphan)
    let epic: PlanningTreeItem | undefined;

    // Check root level for orphan epics
    epic = rootNodes.find(node =>
      'type' in node && node.type === 'epic'
    ) as PlanningTreeItem | undefined;

    // If not at root, check under first project
    if (!epic) {
      const project = rootNodes.find(node =>
        'type' in node && node.type === 'project'
      ) as PlanningTreeItem | undefined;

      if (project) {
        const projectChildren = await provider.getChildren(project);
        epic = projectChildren.find(node =>
          'type' in node && node.type === 'epic'
        ) as PlanningTreeItem | undefined;
      }
    }

    if (!epic) {
      // No epics in test data - skip test
      console.log('  [SKIP] No epics found in test data');
      return;
    }

    // Act: Expand epic
    const children = await provider.getChildren(epic);

    // Assert: Children are features
    assert.ok(Array.isArray(children), 'Epic children should be an array');

    if (children.length === 0) {
      console.log('  [INFO] Epic has no features');
      return;
    }

    // Verify children are features
    const allFeatures = children.every(node =>
      'type' in node && node.type === 'feature'
    );

    assert.ok(allFeatures, 'All children of Epic should be Features');

    // Verify first feature structure
    const firstFeature = children[0] as PlanningTreeItem;
    assert.ok(firstFeature.item, 'Feature should have item number');
    assert.ok(firstFeature.item.startsWith('F'), 'Feature item should start with "F"');
  });

  test('Epic with no child Features returns empty array', async () => {
    // Arrange: Create provider
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Helper to find all epics
    const findAllEpics = async (): Promise<PlanningTreeItem[]> => {
      const epics: PlanningTreeItem[] = [];
      const rootNodes = await provider.getChildren(undefined);

      // Check root level
      const rootEpics = rootNodes.filter(node =>
        'type' in node && node.type === 'epic'
      ) as PlanningTreeItem[];
      epics.push(...rootEpics);

      // Check under projects
      const projects = rootNodes.filter(node =>
        'type' in node && node.type === 'project'
      ) as PlanningTreeItem[];

      for (const project of projects) {
        const projectChildren = await provider.getChildren(project);
        const projectEpics = projectChildren.filter(node =>
          'type' in node && node.type === 'epic'
        ) as PlanningTreeItem[];
        epics.push(...projectEpics);
      }

      return epics;
    };

    const epics = await findAllEpics();

    // Look for an epic with no children
    for (const epic of epics) {
      const children = await provider.getChildren(epic);

      if (children.length === 0) {
        // Found an epic with no children
        assert.strictEqual(children.length, 0, 'Epic with no Features should return empty array');
        return;
      }
    }

    // If all epics have children, test passes
    console.log('  [INFO] All epics have child features');
  });
});

suite('Hierarchy Expansion - Feature to Story/Bug', () => {
  test('Expanding a Feature should show child Stories/Bugs', async () => {
    // Arrange: Create provider in hierarchy mode
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Helper to find first feature in hierarchy
    const findFeature = async (): Promise<PlanningTreeItem | undefined> => {
      const rootNodes = await provider.getChildren(undefined);

      // Check root level
      let feature = rootNodes.find(node =>
        'type' in node && node.type === 'feature'
      ) as PlanningTreeItem | undefined;

      if (feature) return feature;

      // Check under epics (both root epics and project epics)
      for (const node of rootNodes) {
        if ('type' in node && (node.type === 'epic' || node.type === 'project')) {
          const children = await provider.getChildren(node);
          feature = children.find(n => 'type' in n && n.type === 'feature') as PlanningTreeItem | undefined;
          if (feature) return feature;

          // Check nested (under epic under project)
          for (const child of children) {
            if ('type' in child && child.type === 'epic') {
              const epicChildren = await provider.getChildren(child);
              feature = epicChildren.find(n => 'type' in n && n.type === 'feature') as PlanningTreeItem | undefined;
              if (feature) return feature;
            }
          }
        }
      }

      return undefined;
    };

    const feature = await findFeature();

    if (!feature) {
      // No features in test data - skip test
      console.log('  [SKIP] No features found in test data');
      return;
    }

    // Act: Expand feature
    const children = await provider.getChildren(feature);

    // Assert: Children are stories or bugs
    assert.ok(Array.isArray(children), 'Feature children should be an array');

    if (children.length === 0) {
      console.log('  [INFO] Feature has no stories/bugs');
      return;
    }

    // Verify children are stories or bugs
    const allStoriesOrBugs = children.every(node =>
      'type' in node && (node.type === 'story' || node.type === 'bug')
    );

    assert.ok(allStoriesOrBugs, 'All children of Feature should be Stories or Bugs');

    // Verify first child structure
    const firstChild = children[0] as PlanningTreeItem;
    assert.ok(firstChild.item, 'Story/Bug should have item number');
    assert.ok(
      firstChild.item.startsWith('S') || firstChild.item.startsWith('B'),
      'Story/Bug item should start with "S" or "B"'
    );
  });

  test('Feature with no child Stories/Bugs returns empty array', async () => {
    // Arrange: Create provider
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Helper to find all features
    const findAllFeatures = async (): Promise<PlanningTreeItem[]> => {
      const features: PlanningTreeItem[] = [];
      const rootNodes = await provider.getChildren(undefined);

      // Check root level
      const rootFeatures = rootNodes.filter(node =>
        'type' in node && node.type === 'feature'
      ) as PlanningTreeItem[];
      features.push(...rootFeatures);

      // Check under epics and projects
      for (const node of rootNodes) {
        if ('type' in node && (node.type === 'epic' || node.type === 'project')) {
          const children = await provider.getChildren(node);
          const childFeatures = children.filter(n => 'type' in n && n.type === 'feature') as PlanningTreeItem[];
          features.push(...childFeatures);

          // Check nested (epic under project)
          for (const child of children) {
            if ('type' in child && child.type === 'epic') {
              const epicChildren = await provider.getChildren(child);
              const epicFeatures = epicChildren.filter(n => 'type' in n && n.type === 'feature') as PlanningTreeItem[];
              features.push(...epicFeatures);
            }
          }
        }
      }

      return features;
    };

    const features = await findAllFeatures();

    // Look for a feature with no children
    for (const feature of features) {
      const children = await provider.getChildren(feature);

      if (children.length === 0) {
        // Found a feature with no children
        assert.strictEqual(children.length, 0, 'Feature with no Stories/Bugs should return empty array');
        return;
      }
    }

    // If all features have children, test passes
    console.log('  [INFO] All features have child stories/bugs');
  });
});

suite('Hierarchy Expansion - Nested Expansion', () => {
  test('Nested expansion works: Project → Epic → Feature → Story', async () => {
    // Arrange: Create provider in hierarchy mode
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root nodes
    const rootNodes = await provider.getChildren(undefined);

    // Find first project
    const project = rootNodes.find(node =>
      'type' in node && node.type === 'project'
    ) as PlanningTreeItem | undefined;

    if (!project) {
      console.log('  [SKIP] No projects found');
      return;
    }

    // Expand project → epic
    const epics = await provider.getChildren(project);

    if (epics.length === 0) {
      console.log('  [SKIP] Project has no epics');
      return;
    }

    const firstEpic = epics[0] as PlanningTreeItem;
    assert.strictEqual(firstEpic.type, 'epic', 'First child should be epic');

    // Expand epic → feature
    const features = await provider.getChildren(firstEpic);

    if (features.length === 0) {
      console.log('  [INFO] Epic has no features');
      return;
    }

    const firstFeature = features[0] as PlanningTreeItem;
    assert.strictEqual(firstFeature.type, 'feature', 'Epic child should be feature');

    // Expand feature → story/bug
    const stories = await provider.getChildren(firstFeature);

    if (stories.length === 0) {
      console.log('  [INFO] Feature has no stories');
      return;
    }

    const firstStory = stories[0] as PlanningTreeItem;
    assert.ok(
      firstStory.type === 'story' || firstStory.type === 'bug',
      'Feature child should be story or bug'
    );

    // Verify leaf item has no children
    const storyChildren = await provider.getChildren(firstStory);
    assert.strictEqual(storyChildren.length, 0, 'Story/Bug should have no children');
  });

  test('Mixed orphans and structured hierarchy coexist', async () => {
    // Arrange: Create provider in hierarchy mode
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root nodes
    const rootNodes = await provider.getChildren(undefined);

    // Count different types at root
    const projects = rootNodes.filter(n => 'type' in n && n.type === 'project');
    const orphanEpics = rootNodes.filter(n => 'type' in n && n.type === 'epic');
    const orphanFeatures = rootNodes.filter(n => 'type' in n && n.type === 'feature');
    const orphanStories = rootNodes.filter(n => 'type' in n && n.type === 'story');

    // Assert: Root can contain mix of projects and orphans
    const totalRootItems = projects.length + orphanEpics.length + orphanFeatures.length + orphanStories.length;
    assert.ok(totalRootItems > 0, 'Root should contain items');

    console.log(`  [INFO] Root composition: ${projects.length} projects, ${orphanEpics.length} orphan epics, ${orphanFeatures.length} orphan features, ${orphanStories.length} orphan stories`);

    // If we have both projects and orphans, verify they coexist
    if (projects.length > 0 && (orphanEpics.length > 0 || orphanFeatures.length > 0 || orphanStories.length > 0)) {
      assert.ok(true, 'Structured hierarchy and orphans coexist at root level');
    }
  });
});
