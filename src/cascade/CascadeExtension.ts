/**
 * CascadeExtension - Main integration class for Cascade VSCode extension
 *
 * Responsibilities:
 * - Initialize Cascade managers (Registry, State, Propagation)
 * - Setup file watcher for state.json files
 * - Provide TreeView for work item display
 * - Handle workspace activation
 *
 * Integration point between core engine and VSCode API
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RegistryManager } from './RegistryManager';
import { StateManager } from './StateManager';
import { StatePropagationEngine } from './StatePropagationEngine';
import { CascadeTreeProvider } from './CascadeTreeProvider';

export class CascadeExtension {
  private cascadeDir: string;
  private registryManager: RegistryManager;
  private stateManager: StateManager;
  private propagationEngine: StatePropagationEngine;
  private treeProvider: CascadeTreeProvider | null = null;
  private treeView: vscode.TreeView<any> | null = null;
  private watcher: vscode.FileSystemWatcher | null = null;
  private outputChannel: vscode.OutputChannel;

  // Debouncing for file changes
  private debouncers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_MS = 250; // Spec recommendation: 250ms

  // Track files being written by Cascade to avoid recursive propagation
  private filesBeingWritten = new Set<string>();

  constructor(workspaceRoot: string, outputChannel: vscode.OutputChannel) {
    this.cascadeDir = path.join(workspaceRoot, '.cascade');
    this.outputChannel = outputChannel;

    // Initialize managers
    this.registryManager = new RegistryManager(this.cascadeDir);
    this.stateManager = new StateManager();
    this.propagationEngine = new StatePropagationEngine(this.cascadeDir);

    this.log('Cascade extension initialized');
    this.log(`Cascade directory: ${this.cascadeDir}`);
  }

  /**
   * Activate Cascade - setup file watcher and verify structure
   */
  async activate(context: vscode.ExtensionContext): Promise<void> {
    this.log('='.repeat(60));
    this.log('Activating Cascade Extension');
    this.log('='.repeat(60));

    // Verify .cascade/ directory exists
    if (!fs.existsSync(this.cascadeDir)) {
      this.log('❌ .cascade/ directory not found');
      vscode.window.showWarningMessage('Cascade: .cascade/ directory not found in workspace');
      return;
    }

    // Verify registry exists
    if (!this.registryManager.registryExists()) {
      this.log('❌ work-item-registry.json not found');
      vscode.window.showWarningMessage('Cascade: work-item-registry.json not found');
      return;
    }

    // Load and validate registry
    try {
      const registry = await this.registryManager.loadRegistry();
      const itemCount = Object.keys(registry.work_items).length;
      this.log(`✓ Registry loaded: ${itemCount} work items`);
      this.log(`  Version: ${registry.version}`);
      this.log(`  Last updated: ${registry.last_updated}`);
    } catch (error) {
      this.log(`❌ Failed to load registry: ${error}`);
      vscode.window.showErrorMessage(`Cascade: Failed to load registry: ${error}`);
      return;
    }

    // Setup TreeView
    this.setupTreeView(context);

    // Setup file watcher
    this.setupFileWatcher(context);

    // Run initial validation
    await this.validateHierarchy();

    this.log('✓ Cascade extension activated successfully');
    this.log('');
  }

  /**
   * Setup TreeView for work item display
   */
  private setupTreeView(context: vscode.ExtensionContext): void {
    this.log('Setting up TreeView...');

    // Create tree provider
    this.treeProvider = new CascadeTreeProvider(
      this.cascadeDir,
      this.registryManager,
      this.stateManager,
      this.outputChannel
    );

    // Register tree view
    this.treeView = vscode.window.createTreeView('cascadeView', {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true
    });

    context.subscriptions.push(this.treeView);

    this.log('✓ TreeView registered');
    this.log('  View ID: cascadeView');
    this.log('  Provider: CascadeTreeProvider');
  }

  /**
   * Setup file watcher for state.json files
   * Spec reference: CASCADE-INTEGRATION-SPEC.md lines 312-327
   */
  private setupFileWatcher(context: vscode.ExtensionContext): void {
    this.log('Setting up file watcher...');

    // Watch pattern: **/.cascade/**/state.json
    const pattern = new vscode.RelativePattern(this.cascadeDir, '**/state.json');
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Watch for state.json changes
    this.watcher.onDidChange(uri => {
      this.handleStateChange(uri);
    });

    // Watch for new state.json files
    this.watcher.onDidCreate(uri => {
      this.log(`New state file created: ${path.basename(path.dirname(uri.fsPath))}/state.json`);
      this.handleStateChange(uri);
    });

    // Watch for deleted state.json files
    this.watcher.onDidDelete(uri => {
      this.log(`State file deleted: ${path.basename(path.dirname(uri.fsPath))}/state.json`);
      // Could trigger validation or warning
    });

    context.subscriptions.push(this.watcher);

    this.log(`✓ File watcher active`);
    this.log(`  Pattern: **/state.json in ${this.cascadeDir}`);
    this.log(`  Debounce: ${this.DEBOUNCE_MS}ms`);
  }

  /**
   * Handle state.json file change with debouncing
   */
  private handleStateChange(uri: vscode.Uri): void {
    const statePath = uri.fsPath;
    const relativePath = path.relative(this.cascadeDir, statePath);

    // Ignore changes to files we're currently writing
    if (this.filesBeingWritten.has(statePath)) {
      this.log(`  [Ignored] Write by Cascade: ${relativePath}`);
      return;
    }

    // Clear existing debouncer for this file
    if (this.debouncers.has(statePath)) {
      clearTimeout(this.debouncers.get(statePath)!);
    }

    // Setup new debounced propagation
    const timeout = setTimeout(async () => {
      try {
        this.log(`State changed: ${relativePath}`);

        // Mark files as being written during propagation
        this.filesBeingWritten.add(statePath);

        // Propagate the change
        await this.propagationEngine.propagateStateChange(statePath);

        this.log(`✓ Propagation completed for ${relativePath}`);

        // Refresh TreeView to show updated progress
        if (this.treeProvider) {
          await this.treeProvider.refresh();
        }

      } catch (error) {
        this.log(`❌ Propagation failed for ${relativePath}: ${error}`);
        vscode.window.showErrorMessage(`Cascade propagation failed: ${error}`);
      } finally {
        this.debouncers.delete(statePath);

        // Clear write flag after a short delay (allow file system to settle)
        setTimeout(() => {
          this.filesBeingWritten.delete(statePath);
        }, 500);
      }
    }, this.DEBOUNCE_MS);

    this.debouncers.set(statePath, timeout);
  }

  /**
   * Validate hierarchy and show issues in Problems panel
   */
  async validateHierarchy(): Promise<void> {
    this.log('Running hierarchy validation...');

    const issues = await this.propagationEngine.validateHierarchy();

    if (issues.length === 0) {
      this.log('✓ No validation issues found');
      return;
    }

    this.log(`⚠ Found ${issues.length} validation issues:`);
    for (const issue of issues.slice(0, 10)) {
      this.log(`  [${issue.severity}] ${issue.itemId}: ${issue.message}`);
    }
    if (issues.length > 10) {
      this.log(`  ... and ${issues.length - 10} more`);
    }

    // TODO: Add issues to VSCode Problems panel
    // const diagnostics = vscode.languages.createDiagnosticCollection('cascade');
    // ... convert issues to diagnostics
  }

  /**
   * Refresh TreeView manually
   */
  async refreshTreeView(): Promise<void> {
    if (this.treeProvider) {
      await this.treeProvider.refresh();
      this.log('✓ TreeView refreshed manually');
    }
  }

  /**
   * Deactivate - cleanup resources
   */
  dispose(): void {
    this.log('Deactivating Cascade extension');

    // Clear all pending debouncers
    for (const timeout of this.debouncers.values()) {
      clearTimeout(timeout);
    }
    this.debouncers.clear();

    // Dispose TreeView
    if (this.treeView) {
      this.treeView.dispose();
      this.treeView = null;
    }

    // Dispose watcher
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }

    this.log('✓ Cascade extension deactivated');
  }

  /**
   * Log to output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(message);
  }

  /**
   * Get registry manager (for external access)
   */
  getRegistryManager(): RegistryManager {
    return this.registryManager;
  }

  /**
   * Get state manager (for external access)
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Get propagation engine (for external access)
   */
  getPropagationEngine(): StatePropagationEngine {
    return this.propagationEngine;
  }

  /**
   * Static helper: Check if workspace has .cascade/ directory
   */
  static hasCascadeDirectory(workspaceRoot: string): boolean {
    const cascadePath = path.join(workspaceRoot, '.cascade');
    return fs.existsSync(cascadePath);
  }

  /**
   * Static helper: Get workspace root from context
   */
  static getWorkspaceRoot(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }
    return workspaceFolders[0].uri.fsPath;
  }
}
