import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Toggle View Mode Command (S87)', () => {
  // Ensure extension is activated before tests run
  suiteSetup(async () => {
    // Get the Cascade extension
    const extension = vscode.extensions.getExtension('undefined_publisher.cascade');
    if (extension && !extension.isActive) {
      await extension.activate();
    }

    // Wait for commands to be registered
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('cascade.toggleViewMode command is registered in VSCode', async () => {
    // Get all registered commands
    const commands = await vscode.commands.getCommands(true);

    // Verify our command exists
    const isRegistered = commands.includes('cascade.toggleViewMode');
    assert.strictEqual(
      isRegistered,
      true,
      'cascade.toggleViewMode command should be registered after extension activation'
    );
  });

  test('cascade.toggleViewMode command executes without throwing errors', async () => {
    // Attempt to execute command - should not throw
    await vscode.commands.executeCommand('cascade.toggleViewMode');

    // If we reach here, command executed successfully
    assert.ok(true, 'Command executed without throwing errors');
  });
});
