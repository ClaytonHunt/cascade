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
  private stateWatcher: vscode.FileSystemWatcher | null = null;
  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private registryWatcher: vscode.FileSystemWatcher | null = null;
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

    // Watcher 1: state.json files (for state propagation)
    const statePattern = new vscode.RelativePattern(this.cascadeDir, '**/state.json');
    this.stateWatcher = vscode.workspace.createFileSystemWatcher(statePattern);

    this.stateWatcher.onDidChange(uri => {
      this.handleStateChange(uri);
    });

    this.stateWatcher.onDidCreate(uri => {
      this.log(`New state file created: ${path.basename(path.dirname(uri.fsPath))}/state.json`);
      this.handleStateChange(uri);
    });

    this.stateWatcher.onDidDelete(uri => {
      this.log(`State file deleted: ${path.basename(path.dirname(uri.fsPath))}/state.json`);
      this.handleStructureChange('state.json deleted');
    });

    context.subscriptions.push(this.stateWatcher);

    // Watcher 2: Markdown files (for new/deleted work items)
    const markdownPattern = new vscode.RelativePattern(this.cascadeDir, '**/*.md');
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(markdownPattern);

    this.markdownWatcher.onDidCreate(uri => {
      const relativePath = path.relative(this.cascadeDir, uri.fsPath);
      this.log(`📄 New markdown file created: ${relativePath}`);
      this.handleStructureChange('markdown file created');
    });

    this.markdownWatcher.onDidDelete(uri => {
      const relativePath = path.relative(this.cascadeDir, uri.fsPath);
      this.log(`🗑️  Markdown file deleted: ${relativePath}`);
      this.handleStructureChange('markdown file deleted');
    });

    this.markdownWatcher.onDidChange(uri => {
      // Markdown content changes don't affect structure, but log for debugging
      const relativePath = path.relative(this.cascadeDir, uri.fsPath);
      this.log(`📝 Markdown file changed: ${relativePath}`);
    });

    context.subscriptions.push(this.markdownWatcher);

    // Watcher 3: work-item-registry.json (for new work items added by CARL)
    const registryPath = path.join(this.cascadeDir, 'work-item-registry.json');
    const registryPattern = new vscode.RelativePattern(this.cascadeDir, 'work-item-registry.json');
    this.registryWatcher = vscode.workspace.createFileSystemWatcher(registryPattern);

    this.registryWatcher.onDidChange(uri => {
      this.log(`📋 Registry file changed: work-item-registry.json`);
      this.handleRegistryChange(uri);
    });

    context.subscriptions.push(this.registryWatcher);

    this.log(`✓ File watcher active`);
    this.log(`  Watching: **/state.json, **/*.md, work-item-registry.json`);
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

        // Propagate the change and get list of written files
        const writtenFiles = await this.propagationEngine.propagateStateChange(statePath);

        // Mark all written files as being written by Cascade (to ignore their file watcher events)
        writtenFiles.forEach(file => this.filesBeingWritten.add(file));

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

        // Clear write flags after a short delay (allow file system to settle)
        setTimeout(() => {
          this.filesBeingWritten.delete(statePath);
          // Also clear any files written during propagation
        }, 500);
      }
    }, this.DEBOUNCE_MS);

    this.debouncers.set(statePath, timeout);
  }

  /**
   * Handle structural changes (new/deleted work items)
   * Triggers TreeView refresh and validation
   */
  private handleStructureChange(reason: string): void {
    const debounceKey = 'structure-change';

    this.log(`🔄 Structure change detected: ${reason} (debouncing ${this.DEBOUNCE_MS}ms)`);

    // Clear existing debouncer
    if (this.debouncers.has(debounceKey)) {
      clearTimeout(this.debouncers.get(debounceKey)!);
      this.log(`   Clearing previous debounce timer`);
    }

    // Setup new debounced refresh
    const timeout = setTimeout(async () => {
      try {
        this.log(`🔄 Processing structure change: ${reason}`);

        // Reload registry to pick up new/deleted items
        const registry = await this.registryManager.loadRegistry();
        const itemCount = Object.keys(registry.work_items).length;
        this.log(`   Registry reloaded: ${itemCount} items`);

        // Refresh TreeView
        if (this.treeProvider) {
          await this.treeProvider.refresh();
          this.log(`   TreeView refreshed`);
        } else {
          this.log(`   ⚠️  TreeProvider not initialized`);
        }

        this.log(`✓ Structure change handled: ${reason}`);

      } catch (error) {
        this.log(`❌ Structure change handling failed: ${error}`);
      } finally {
        this.debouncers.delete(debounceKey);
      }
    }, this.DEBOUNCE_MS);

    this.debouncers.set(debounceKey, timeout);
  }

  /**
   * Handle registry changes (work-item-registry.json modified)
   * Reloads registry and refreshes TreeView
   */
  private handleRegistryChange(uri: vscode.Uri): void {
    const debounceKey = 'registry-change';

    this.log(`🔄 Registry change detected (debouncing ${this.DEBOUNCE_MS}ms)`);

    // Clear existing debouncer
    if (this.debouncers.has(debounceKey)) {
      clearTimeout(this.debouncers.get(debounceKey)!);
      this.log(`   Clearing previous debounce timer`);
    }

    // Setup new debounced refresh
    const timeout = setTimeout(async () => {
      try {
        this.log(`🔄 Processing registry change...`);

        // Reload registry
        const registry = await this.registryManager.loadRegistry();
        const itemCount = Object.keys(registry.work_items).length;
        this.log(`   Registry reloaded: ${itemCount} work items`);

        // Refresh TreeView
        if (this.treeProvider) {
          await this.treeProvider.refresh();
          this.log(`   TreeView refreshed`);
        } else {
          this.log(`   ⚠️  TreeProvider not initialized`);
        }

        this.log(`✓ Registry change handled successfully`);

      } catch (error) {
        this.log(`❌ Registry reload failed: ${error}`);
        vscode.window.showErrorMessage(`Cascade: Registry reload failed: ${error}`);
      } finally {
        this.debouncers.delete(debounceKey);
      }
    }, this.DEBOUNCE_MS);

    this.debouncers.set(debounceKey, timeout);
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
   * Toggle showing archived items
   */
  toggleArchivedItems(): void {
    if (this.treeProvider) {
      this.treeProvider.toggleArchived();
      const state = this.treeProvider.getShowArchived() ? 'shown' : 'hidden';
      vscode.window.showInformationMessage(`Archived items ${state}`);
    }
  }

  /**
   * Get tree view for expand/collapse operations
   */
  getTreeView(): vscode.TreeView<any> | null {
    return this.treeView;
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

    // Dispose watchers
    if (this.stateWatcher) {
      this.stateWatcher.dispose();
      this.stateWatcher = null;
    }

    if (this.markdownWatcher) {
      this.markdownWatcher.dispose();
      this.markdownWatcher = null;
    }

    if (this.registryWatcher) {
      this.registryWatcher.dispose();
      this.registryWatcher = null;
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
