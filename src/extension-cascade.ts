/**
 * Cascade Extension - Simplified entry point for .cascade/ integration
 *
 * This is a clean implementation focused on .cascade/ directory structure.
 * Replaces the complex plans/specs logic with Registry + StatePropagation.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CascadeExtension } from './cascade/CascadeExtension';

let outputChannel: vscode.OutputChannel;
let cascadeExtension: CascadeExtension | null = null;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Cascade');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('Cascade VSCode Extension');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Activated at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine('');

  // Check for workspace
  const workspaceRoot = CascadeExtension.getWorkspaceRoot();
  if (!workspaceRoot) {
    outputChannel.appendLine('❌ No workspace folder open');
    outputChannel.appendLine('   Extension requires an open workspace');
    return;
  }

  outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
  outputChannel.appendLine('');

  // Check for .cascade/ directory
  if (!CascadeExtension.hasCascadeDirectory(workspaceRoot)) {
    outputChannel.appendLine('ℹ️  No .cascade/ directory found');
    outputChannel.appendLine('   Extension will remain dormant');
    outputChannel.appendLine('');
    outputChannel.appendLine('   To activate: Create .cascade/ directory with work items');
    return;
  }

  // Initialize Cascade
  try {
    cascadeExtension = new CascadeExtension(workspaceRoot, outputChannel);
    cascadeExtension.activate(context);

    outputChannel.appendLine('');
    outputChannel.appendLine('✅ Cascade extension active and monitoring state changes');
    outputChannel.appendLine('');

  } catch (error) {
    outputChannel.appendLine(`❌ Failed to initialize Cascade: ${error}`);
    vscode.window.showErrorMessage(`Cascade activation failed: ${error}`);
  }

  // Register commands
  registerCommands(context);

  // Show output channel
  outputChannel.show(true);
}

/**
 * Open a work item file
 */
async function openWorkItemFile(filePath: string): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);

    // Open in markdown preview for better readability
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch (error) {
    outputChannel.appendLine(`❌ Failed to open file: ${filePath}`);
    outputChannel.appendLine(`   Error: ${error}`);
    vscode.window.showErrorMessage(`Failed to open file: ${error}`);
  }
}

/**
 * Register Cascade commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Open File (for TreeView clicks)
  context.subscriptions.push(
    vscode.commands.registerCommand('cascade.openFile', async (filePath: string) => {
      await openWorkItemFile(filePath);
    })
  );

  // Command: Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('cascade.refresh', async () => {
      outputChannel.appendLine('Refreshing Cascade...');
      if (cascadeExtension) {
        await cascadeExtension.refreshTreeView();
        await cascadeExtension.validateHierarchy();
        outputChannel.appendLine('✓ Refresh complete');
      }
    })
  );

  // Command: Validate Hierarchy
  context.subscriptions.push(
    vscode.commands.registerCommand('cascade.validateHierarchy', async () => {
      outputChannel.appendLine('Validating hierarchy...');
      if (cascadeExtension) {
        await cascadeExtension.validateHierarchy();
      }
    })
  );

  // Command: Show Cache Stats (placeholder)
  context.subscriptions.push(
    vscode.commands.registerCommand('cascade.showCacheStats', () => {
      if (cascadeExtension) {
        const registry = cascadeExtension.getRegistryManager();
        outputChannel.appendLine('Cache statistics not yet implemented');
        vscode.window.showInformationMessage('Cascade cache stats: Not yet implemented');
      }
    })
  );

  // Command: Toggle Archived Items
  context.subscriptions.push(
    vscode.commands.registerCommand('cascade.toggleArchived', () => {
      if (cascadeExtension) {
        cascadeExtension.toggleArchivedItems();
      }
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate() {
  outputChannel.appendLine('');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('Deactivating Cascade Extension');
  outputChannel.appendLine('='.repeat(60));

  if (cascadeExtension) {
    cascadeExtension.dispose();
    cascadeExtension = null;
  }

  outputChannel.appendLine('✓ Cascade extension deactivated');
}
