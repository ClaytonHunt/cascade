import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { updateItemStatus } from '../../fileUpdates';

suite('File Updates', () => {
  let testDir: string;
  let testFilePath: string;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    // Create temp directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cascade-test-'));

    // Create test file with sample frontmatter
    testFilePath = path.join(testDir, 'test-story.md');
    const sampleContent = `---
item: S99
title: Test Story
type: story
status: Ready
priority: High
estimate: M
dependencies: []
created: 2025-10-01
updated: 2025-10-01
---

# S99 - Test Story

Test content here.
`;
    fs.writeFileSync(testFilePath, sampleContent, 'utf-8');

    // Create mock output channel
    outputChannel = {
      appendLine: () => {},  // No-op for tests
      append: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
      replace: () => {},
      name: 'Test',
    } as vscode.OutputChannel;
  });

  teardown(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Updates status field successfully', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('status: In Progress'));
  });

  test('Updates updated timestamp to current date', async () => {
    const today = new Date().toISOString().split('T')[0];
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    // YAML outputs dates with double quotes (updated: "2025-10-16")
    assert.ok(updatedContent.includes(`updated: "${today}"`));
  });

  test('Preserves all other frontmatter fields', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('item: S99'));
    assert.ok(updatedContent.includes('title: Test Story'));
    assert.ok(updatedContent.includes('type: story'));
    assert.ok(updatedContent.includes('priority: High'));
    assert.ok(updatedContent.includes('estimate: M'));
    assert.ok(updatedContent.includes('dependencies: []'));
    // YAML outputs dates with double quotes (created: "2025-10-01")
    assert.ok(updatedContent.includes('created: "2025-10-01"'));
  });

  test('Preserves markdown content', async () => {
    await updateItemStatus(testFilePath, 'In Progress', outputChannel);

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    assert.ok(updatedContent.includes('# S99 - Test Story'));
    assert.ok(updatedContent.includes('Test content here.'));
  });

  test('Throws error for non-existent file', async () => {
    const invalidPath = path.join(testDir, 'nonexistent.md');

    await assert.rejects(
      async () => await updateItemStatus(invalidPath, 'In Progress', outputChannel),
      /Failed to read file/
    );
  });

  test('Throws error for malformed frontmatter', async () => {
    const malformedPath = path.join(testDir, 'malformed.md');
    fs.writeFileSync(malformedPath, '---\ninvalid yaml: [unclosed\n---\n# Content', 'utf-8');

    await assert.rejects(
      async () => await updateItemStatus(malformedPath, 'In Progress', outputChannel),
      /Failed to parse frontmatter/
    );
  });
});
