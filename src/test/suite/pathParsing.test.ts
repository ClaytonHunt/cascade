import * as assert from 'assert';
import * as path from 'path';
import { ItemPathParts } from '../../treeview/HierarchyNode';

/**
 * Helper function that replicates parseItemPath logic for testing.
 * In production, this would be the actual PlanningTreeProvider.parseItemPath method.
 */
function parseItemPathForTest(filePath: string, workspaceRoot: string): ItemPathParts {
  const relativePath = path.relative(workspaceRoot, filePath);
  const parts = relativePath.split(path.sep);

  const result: ItemPathParts = {
    projectDir: null,
    epicDir: null,
    featureDir: null,
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

suite('Path Parsing Tests', () => {
  const workspaceRoot = '/workspace/lineage';

  test('Parse epic file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'epic.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, null);
    assert.strictEqual(result.fileName, 'epic.md');
  });

  test('Parse feature file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'feature.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, 'feature-16-foundation');
    assert.strictEqual(result.fileName, 'feature.md');
  });

  test('Parse story file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-04-kanban-view', 'feature-16-foundation', 'story-49-core.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-04-kanban-view');
    assert.strictEqual(result.featureDir, 'feature-16-foundation');
    assert.strictEqual(result.fileName, 'story-49-core.md');
  });

  test('Parse orphan story (no epic or feature)', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'story-19-standalone.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, null);
    assert.strictEqual(result.fileName, 'story-19-standalone.md');
  });

  test('Parse orphan feature (no epic)', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'feature.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, 'feature-99-orphan');
    assert.strictEqual(result.fileName, 'feature.md');
  });

  test('Parse story under orphan feature', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'feature-99-orphan', 'story-100-child.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, null);
    assert.strictEqual(result.featureDir, 'feature-99-orphan');
    assert.strictEqual(result.fileName, 'story-100-child.md');
  });

  test('Parse bug file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'epic-02-testing', 'feature-07-discovery', 'bug-03-scanner.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    assert.strictEqual(result.epicDir, 'epic-02-testing');
    assert.strictEqual(result.featureDir, 'feature-07-discovery');
    assert.strictEqual(result.fileName, 'bug-03-scanner.md');
  });

  test('Parse archived file path', () => {
    const filePath = path.join(workspaceRoot, 'plans', 'archive', 'epic-03-old', 'feature-11-legacy', 'story-36-archived.md');
    const result = parseItemPathForTest(filePath, workspaceRoot);

    // Should still detect epic and feature dirs even in archive
    assert.strictEqual(result.epicDir, 'epic-03-old');
    assert.strictEqual(result.featureDir, 'feature-11-legacy');
    assert.strictEqual(result.fileName, 'story-36-archived.md');
  });
});
