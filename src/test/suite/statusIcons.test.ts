import * as assert from 'assert';
import * as vscode from 'vscode';
import { getTreeItemIcon } from '../../statusIcons';
import { Status } from '../../types';

suite('Status Icons Test Suite - TreeView Icons', () => {
  test('getTreeItemIcon - Not Started', () => {
    const status: Status = 'Not Started';
    const icon = getTreeItemIcon(status);

    // Verify icon is ThemeIcon instance
    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');

    // Verify icon ID
    assert.strictEqual(icon.id, 'circle-outline', 'Icon should be circle-outline');

    // Verify color
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.gray', 'Color should be charts.gray');
  });

  test('getTreeItemIcon - In Planning', () => {
    const status: Status = 'In Planning';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'sync', 'Icon should be sync (circular arrows)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.yellow', 'Color should be charts.yellow');
  });

  test('getTreeItemIcon - Ready', () => {
    const status: Status = 'Ready';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'debug-start', 'Icon should be debug-start (play button)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.green', 'Color should be charts.green');
  });

  test('getTreeItemIcon - In Progress', () => {
    const status: Status = 'In Progress';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'gear', 'Icon should be gear (cog/settings)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.blue', 'Color should be charts.blue');
  });

  test('getTreeItemIcon - Blocked', () => {
    const status: Status = 'Blocked';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'warning', 'Icon should be warning (triangle)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.red', 'Color should be charts.red');
  });

  test('getTreeItemIcon - Completed', () => {
    const status: Status = 'Completed';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'pass', 'Icon should be pass (checkmark)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'testing.iconPassed', 'Color should be testing.iconPassed');
  });

  test('getTreeItemIcon - Archived', () => {
    const status: Status = 'Archived';
    const icon = getTreeItemIcon(status);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');
    assert.strictEqual(icon.id, 'archive', 'Icon should be archive (box/folder)');
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.gray', 'Color should be charts.gray');
  });

  test('getTreeItemIcon - Unknown Status', () => {
    // Type assertion to test unknown status handling
    const unknownStatus = 'InvalidStatus' as Status;
    const icon = getTreeItemIcon(unknownStatus);

    assert.ok(icon instanceof vscode.ThemeIcon, 'Should return ThemeIcon instance');

    // Should return fallback icon (circle-outline)
    assert.strictEqual(icon.id, 'circle-outline', 'Icon should be circle-outline for unknown status');

    // Should return error color (red)
    assert.ok(icon.color instanceof vscode.ThemeColor, 'Color should be ThemeColor instance');
    assert.strictEqual((icon.color as vscode.ThemeColor).id, 'charts.red', 'Color should be charts.red for unknown status');
  });
});
