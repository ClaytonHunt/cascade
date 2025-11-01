/**
 * Package.json validation tests for S64 Create Child Item Command
 *
 * Validates that cascade.createChildItem command is properly registered
 * with correct metadata and context menu contributions.
 *
 * These tests ensure the command:
 * - Exists in contributes.commands with proper title and icon
 * - Has context menu entry for epic and feature items only
 * - Is positioned correctly in the modification group
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

suite('S64 Create Child Item - package.json', () => {
  let packageJson: any;

  suiteSetup(() => {
    // Read and parse package.json from extension root
    // When compiled, tests are in dist/test/suite/, so need to go up 3 levels to reach root
    const packagePath = path.join(__dirname, '../../../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf-8');
    packageJson = JSON.parse(packageContent);
  });

  test('cascade.createChildItem command should be registered', () => {
    const commands = packageJson.contributes.commands;
    const createChildCommand = commands.find((cmd: any) => cmd.command === 'cascade.createChildItem');

    // Verify command exists with correct metadata
    assert.ok(createChildCommand, 'cascade.createChildItem command should exist in package.json');
    assert.strictEqual(createChildCommand.title, 'Create Child Item', 'Command title should be "Create Child Item"');
    assert.strictEqual(createChildCommand.icon, '$(add)', 'Command icon should be "$(add)"');
  });

  test('cascade.createChildItem context menu should be configured for epic and feature items', () => {
    const contextMenus = packageJson.contributes.menus['view/item/context'];
    const createChildMenu = contextMenus.find((menu: any) => menu.command === 'cascade.createChildItem');

    // Verify menu contribution exists with correct when clause and positioning
    assert.ok(createChildMenu, 'cascade.createChildItem should have context menu entry');
    assert.strictEqual(
      createChildMenu.when,
      'view == cascadeView && (viewItem == epic || viewItem == feature)',
      'Menu should only show for epic and feature items in cascadeView'
    );
    assert.strictEqual(
      createChildMenu.group,
      '1_modification@2',
      'Menu should be in modification group, positioned after Change Status (@1)'
    );
  });
});
