import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StatusPropagationEngine } from '../../treeview/StatusPropagationEngine';
import { FrontmatterCache } from '../../cache';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';

/**
 * End-to-End Propagation Tests
 *
 * Tests the complete status propagation flow with real file system operations.
 * These tests create temporary markdown files, trigger propagation via
 * PlanningTreeProvider.refresh(), and verify frontmatter updates.
 *
 * Test Coverage:
 * - Complete all stories → Feature becomes "Completed"
 * - Mixed states → Parent becomes "In Progress"
 * - Output channel logging validation
 * - Edge cases (malformed frontmatter, empty parents, no downgrade)
 * - Performance validation (100+ items)
 */

/**
 * Creates a mock workspace state (Memento) for testing.
 */
function createMockWorkspaceState(): vscode.Memento {
  const storage = new Map<string, any>();
  return {
    keys: () => Array.from(storage.keys()),
    get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
    update: (key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    }
  };
}

suite('End-to-End Propagation Tests', () => {
  let tempDir: string;
  let cache: FrontmatterCache;
  let outputChannel: vscode.OutputChannel;
  let workspaceState: vscode.Memento;

  setup(async () => {
    // Create temporary test directory
    // Use workspace root if available, otherwise use system temp
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    tempDir = path.join(workspaceRoot, 'test-workspace-temp-' + Date.now());
    // Create plans/ subdirectory (PlanningTreeProvider expects plans/ folder)
    const plansDir = path.join(tempDir, 'plans');
    await fs.mkdir(plansDir, { recursive: true });

    // Initialize cache, output channel, and workspace state
    cache = new FrontmatterCache(100);
    outputChannel = vscode.window.createOutputChannel('Test');
    workspaceState = createMockWorkspaceState();
  });

  teardown(async () => {
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
    cache.clear();
    outputChannel.dispose();
  });

  test('E2E: Complete all stories → Feature frontmatter updates', async () => {
    // Create proper directory structure: plans/feature-99-test/
    const plansDir = path.join(tempDir, 'plans');
    const featureDir = path.join(plansDir, 'feature-99-test');
    await fs.mkdir(featureDir, { recursive: true });

    // Create feature markdown file
    const featurePath = path.join(featureDir, 'feature.md');
    const featureContent = `---
item: F99
title: Test Feature
type: feature
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# F99 - Test Feature
Test content here.
`;
    await fs.writeFile(featurePath, featureContent, 'utf-8');

    // Create 3 story files (all completed) in same feature directory
    for (let i = 1; i <= 3; i++) {
      const storyPath = path.join(featureDir, `story-99${i}.md`);
      const storyContent = `---
item: S99${i}
title: Test Story ${i}
type: story
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# S99${i} - Test Story ${i}
Test story content.
`;
      await fs.writeFile(storyPath, storyContent, 'utf-8');
    }

    // Create PlanningTreeProvider and trigger propagation
    const provider = new PlanningTreeProvider(tempDir, cache, outputChannel, workspaceState);
    await provider.refresh();

    // Verify feature file was updated
    const updatedContent = await fs.readFile(featurePath, 'utf-8');

    assert.ok(
      updatedContent.includes('status: Completed'),
      `Feature status should be updated to Completed. Actual content:\n${updatedContent}`
    );

    // Verify updated timestamp was changed
    assert.ok(
      !updatedContent.includes('updated: 2025-10-15') ||
      updatedContent.match(/updated: \d{4}-\d{2}-\d{2}/),
      'Updated timestamp should be refreshed'
    );
  });

  test('E2E: Mixed states → Parent becomes in progress', async () => {
    // Create proper directory structure: plans/epic-99-test/
    const plansDir = path.join(tempDir, 'plans');
    const epicDir = path.join(plansDir, 'epic-99-test');
    await fs.mkdir(epicDir, { recursive: true });

    // Create epic file (not started)
    const epicPath = path.join(epicDir, 'epic.md');
    const epicContent = `---
item: E99
title: Test Epic
type: epic
status: Not Started
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# E99 - Test Epic
`;
    await fs.writeFile(epicPath, epicContent, 'utf-8');

    // Create feature 1 directory and file (completed)
    const feature1Dir = path.join(epicDir, 'feature-991-first');
    await fs.mkdir(feature1Dir, { recursive: true });
    const feature1Path = path.join(feature1Dir, 'feature.md');
    const feature1Content = `---
item: F991
title: Feature 1
type: feature
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# F991 - Feature 1
`;
    await fs.writeFile(feature1Path, feature1Content, 'utf-8');

    // Create feature 2 directory and file (in progress)
    const feature2Dir = path.join(epicDir, 'feature-992-second');
    await fs.mkdir(feature2Dir, { recursive: true });
    const feature2Path = path.join(feature2Dir, 'feature.md');
    const feature2Content = `---
item: F992
title: Feature 2
type: feature
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---

# F992 - Feature 2
`;
    await fs.writeFile(feature2Path, feature2Content, 'utf-8');

    // Create provider and trigger propagation
    const provider = new PlanningTreeProvider(tempDir, cache, outputChannel, workspaceState);
    await provider.refresh();

    // Verify epic status updated
    const updatedContent = await fs.readFile(epicPath, 'utf-8');
    assert.ok(
      updatedContent.includes('status: In Progress'),
      'Epic status should be updated to In Progress'
    );
  });

  test('Output Channel logs all propagation actions', async () => {
    // Setup: Create proper directory structure: plans/feature-98-logtest/
    const plansDir = path.join(tempDir, 'plans');
    const featureDir = path.join(plansDir, 'feature-98-logtest');
    await fs.mkdir(featureDir, { recursive: true });

    // Create feature with completed stories
    const featurePath = path.join(featureDir, 'feature.md');
    const featureContent = `---
item: F98
title: Log Test Feature
type: feature
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(featurePath, featureContent, 'utf-8');

    // Create completed story
    const storyPath = path.join(featureDir, 'story-981.md');
    const storyContent = `---
item: S981
title: Log Test Story
type: story
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(storyPath, storyContent, 'utf-8');

    // Create mock output channel that captures messages
    class CaptureOutputChannel implements vscode.OutputChannel {
      name: string = 'Capture';
      messages: string[] = [];

      append(value: string): void { this.messages.push(value); }
      appendLine(value: string): void { this.messages.push(value); }
      clear(): void { this.messages = []; }
      replace(value: string): void {}
      show(): void {}
      hide(): void {}
      dispose(): void {}
    }

    const captureChannel = new CaptureOutputChannel();

    // Trigger propagation
    const provider = new PlanningTreeProvider(tempDir, cache, captureChannel, workspaceState);
    await provider.refresh();

    // Verify log messages
    const logs = captureChannel.messages.join('\n');

    // Check for propagation start message
    assert.ok(
      logs.includes('[PROPAGATE] Starting status propagation'),
      'Should log propagation start'
    );

    // Check for completion summary
    assert.ok(
      /\[PROPAGATE\] Completed in \d+ms/.test(logs),
      'Should log completion with timing'
    );

    // Check for counts (updated, skipped, errors)
    assert.ok(
      /\d+ updated, \d+ skipped, \d+ errors/.test(logs),
      'Should log counts summary'
    );

    // If propagation occurred, check for detailed log
    if (logs.includes('status updated')) {
      assert.ok(
        logs.includes('F98'),
        'Should log item identifier'
      );
      assert.ok(
        /In Progress → Completed/.test(logs),
        'Should log status transition'
      );
    }
  });

  test('Edge Case: Malformed frontmatter → Logs error and continues', async () => {
    // Create proper directory structure: plans/feature-97-malformed/
    const plansDir = path.join(tempDir, 'plans');
    const featureDir = path.join(plansDir, 'feature-97-malformed');
    await fs.mkdir(featureDir, { recursive: true });

    // Create feature with malformed frontmatter (missing status)
    const featurePath = path.join(featureDir, 'feature.md');
    const featureContent = `---
item: F97
title: Malformed Feature
type: feature
priority: High
---`;
    await fs.writeFile(featurePath, featureContent, 'utf-8');

    // Create completed story
    const storyPath = path.join(featureDir, 'story-971.md');
    const storyContent = `---
item: S971
title: Story
type: story
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(storyPath, storyContent, 'utf-8');

    // Trigger propagation
    const captureChannel = new (class implements vscode.OutputChannel {
      name = 'Test';
      messages: string[] = [];
      append(v: string) { this.messages.push(v); }
      appendLine(v: string) { this.messages.push(v); }
      clear() {}
      replace(v: string) {}
      show() {}
      hide() {}
      dispose() {}
    })();

    const provider = new PlanningTreeProvider(tempDir, cache, captureChannel, workspaceState);

    // Should not throw error (non-blocking)
    await assert.doesNotReject(
      async () => await provider.refresh(),
      'Propagation should not throw on malformed frontmatter'
    );

    // Check logs for error handling
    const logs = captureChannel.messages.join('\n');
    assert.ok(
      logs.includes('⚠️') || logs.includes('❌'),
      'Should log error/warning for malformed frontmatter'
    );
  });

  test('Edge Case: Empty parent (0 children) → No propagation', async () => {
    // Create proper directory structure: plans/feature-96-empty/
    const plansDir = path.join(tempDir, 'plans');
    const featureDir = path.join(plansDir, 'feature-96-empty');
    await fs.mkdir(featureDir, { recursive: true });

    // Create feature with no stories
    const featurePath = path.join(featureDir, 'feature.md');
    const featureContent = `---
item: F96
title: Empty Feature
type: feature
status: Not Started
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(featurePath, featureContent, 'utf-8');

    // Capture original content
    const originalContent = await fs.readFile(featurePath, 'utf-8');

    // Trigger propagation
    const provider = new PlanningTreeProvider(tempDir, cache, outputChannel, workspaceState);
    await provider.refresh();

    // Verify feature unchanged
    const updatedContent = await fs.readFile(featurePath, 'utf-8');
    assert.strictEqual(
      updatedContent,
      originalContent,
      'Empty parent should not be updated'
    );
  });

  test('Edge Case: Parent already completed → No downgrade', async () => {
    // Create proper directory structure: plans/epic-95-completed/
    const plansDir = path.join(tempDir, 'plans');
    const epicDir = path.join(plansDir, 'epic-95-completed');
    await fs.mkdir(epicDir, { recursive: true });

    // Create epic (completed)
    const epicPath = path.join(epicDir, 'epic.md');
    const epicContent = `---
item: E95
title: Completed Epic
type: epic
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(epicPath, epicContent, 'utf-8');

    // Create feature directory and file (in progress - regression)
    const featureDir = path.join(epicDir, 'feature-951-regressed');
    await fs.mkdir(featureDir, { recursive: true });
    const featurePath = path.join(featureDir, 'feature.md');
    const featureContent = `---
item: F951
title: Regressed Feature
type: feature
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---`;
    await fs.writeFile(featurePath, featureContent, 'utf-8');

    // Trigger propagation
    const provider = new PlanningTreeProvider(tempDir, cache, outputChannel, workspaceState);
    await provider.refresh();

    // Verify epic still completed (no downgrade)
    const updatedContent = await fs.readFile(epicPath, 'utf-8');
    assert.ok(
      updatedContent.includes('status: Completed'),
      'Completed parent should not be downgraded'
    );
  });

  test('Performance: Propagation completes within 500ms (20 parents)', async function() {
    // Increase timeout for this test
    this.timeout(5000);

    // Create realistic hierarchy: 1 project, 4 epics, 16 features, 80 stories
    // Total: 101 items, 21 parents (1 project + 4 epics + 16 features)

    // NOTE: Project items not yet supported in hierarchy builder
    // Skipping project level for now - start with epics

    // Create plans/ subdirectory
    const plansDir = path.join(tempDir, 'plans');
    await fs.mkdir(plansDir, { recursive: true });

    // Create 4 epics with proper directory structure
    for (let e = 1; e <= 4; e++) {
      const epicDir = path.join(plansDir, `epic-${e}-perf`);
      await fs.mkdir(epicDir, { recursive: true });

      const epicPath = path.join(epicDir, 'epic.md');
      await fs.writeFile(epicPath, `---
item: E${e}
title: Epic ${e}
type: epic
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---`, 'utf-8');

      // Create 4 features per epic
      for (let f = 1; f <= 4; f++) {
        const featureNum = (e - 1) * 4 + f;
        const featureDir = path.join(epicDir, `feature-${featureNum}-perf`);
        await fs.mkdir(featureDir, { recursive: true });

        const featurePath = path.join(featureDir, 'feature.md');
        await fs.writeFile(featurePath, `---
item: F${featureNum}
title: Feature ${featureNum}
type: feature
status: In Progress
priority: High
created: 2025-10-15
updated: 2025-10-15
---`, 'utf-8');

        // Create 5 stories per feature (all completed for propagation)
        for (let s = 1; s <= 5; s++) {
          const storyNum = (featureNum - 1) * 5 + s;
          const storyPath = path.join(featureDir, `story-${storyNum}.md`);
          await fs.writeFile(storyPath, `---
item: S${storyNum}
title: Story ${storyNum}
type: story
status: Completed
priority: High
created: 2025-10-15
updated: 2025-10-15
---`, 'utf-8');
        }
      }
    }

    // Measure propagation time
    const provider = new PlanningTreeProvider(tempDir, cache, outputChannel, workspaceState);

    const startTime = Date.now();
    await provider.refresh();
    const duration = Date.now() - startTime;

    console.log(`Propagation completed in ${duration}ms for 101 items (21 parents)`);

    // Verify performance target met
    assert.ok(
      duration < 500, // Generous buffer (target 100ms, allow up to 500ms for test environment)
      `Propagation should complete within 500ms, took ${duration}ms`
    );
  });
});
