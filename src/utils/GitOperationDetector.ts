import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface GitOperationDetectorConfig {
  enabled: boolean;
  debounceDelay: number;
}

export class GitOperationDetector implements vscode.Disposable {
  private gitOperationInProgress = false;
  private gitOperationTimer?: NodeJS.Timeout;
  private gitOperationStartTime: number = 0;
  private debounceDelay: number;
  private enabled: boolean;
  private watchers: vscode.FileSystemWatcher[] = [];

  // Callback triggered when git operation completes
  public onGitOperationComplete: () => void = () => {};

  constructor(
    private workspaceRoot: string,
    private outputChannel: vscode.OutputChannel,
    config: GitOperationDetectorConfig
  ) {
    this.enabled = config.enabled;
    this.debounceDelay = config.debounceDelay;

    this.outputChannel.appendLine(
      `[Git] Detector initialized (enabled: ${this.enabled}, debounce: ${this.debounceDelay}ms)`
    );
  }

  /**
   * Creates and registers git metadata file watchers.
   *
   * Monitors:
   * - .git/HEAD: Branch changes (checkout, commit)
   * - .git/index: Staging area changes (add, reset, merge)
   *
   * @returns Array of FileSystemWatcher instances
   */
  createGitWatchers(): vscode.FileSystemWatcher[] {
    if (!this.enabled) {
      this.outputChannel.appendLine('[Git] Detection disabled, skipping watcher creation');
      return [];
    }

    // Check if .git directory exists
    const gitDir = path.join(this.workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      this.outputChannel.appendLine('[Git] No .git directory found, disabling detection');
      this.enabled = false;
      return [];
    }

    // Watch .git/HEAD (branch changes, commits)
    const gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/HEAD'),
      true,  // ignoreCreateEvents
      false, // ignoreChangeEvents
      true   // ignoreDeleteEvents
    );

    // Watch .git/index (staging area changes)
    const gitIndexWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/index'),
      true,  // ignoreCreateEvents
      false, // ignoreChangeEvents
      true   // ignoreDeleteEvents
    );

    gitHeadWatcher.onDidChange(() => this.handleGitEvent('HEAD changed'));
    gitIndexWatcher.onDidChange(() => this.handleGitEvent('index changed'));

    this.watchers = [gitHeadWatcher, gitIndexWatcher];

    this.outputChannel.appendLine('[Git] Watchers created for .git/HEAD and .git/index');

    return this.watchers;
  }

  /**
   * Handles git metadata file changes.
   * Sets gitOperationInProgress flag and starts/resets debounce timer.
   *
   * @param eventType - Description of git event (e.g., "HEAD changed")
   */
  private handleGitEvent(eventType: string): void {
    this.outputChannel.appendLine(`[Git] ${eventType}`);

    // Mark operation as in progress
    if (!this.gitOperationInProgress) {
      this.gitOperationInProgress = true;
      this.gitOperationStartTime = Date.now();
      this.outputChannel.appendLine('[Git] Operation started');
    }

    // Clear existing timer
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
      this.outputChannel.appendLine('[Git] Operation timer reset');
    }

    // Start new timer (500ms default)
    this.gitOperationTimer = setTimeout(() => {
      this.gitOperationInProgress = false;
      this.gitOperationTimer = undefined;

      const duration = Date.now() - this.gitOperationStartTime;
      this.outputChannel.appendLine(
        `[Git] Operation completed (duration: ${duration}ms, timer expired)`
      );

      // Trigger callback
      this.onGitOperationComplete();
    }, this.debounceDelay);
  }

  /**
   * Checks if a git operation is currently in progress.
   *
   * @returns True if git operation is active
   */
  isGitOperationInProgress(): boolean {
    return this.gitOperationInProgress;
  }

  /**
   * Updates debounce delay from configuration.
   *
   * @param newDelay - New debounce delay in milliseconds
   */
  updateDebounceDelay(newDelay: number): void {
    this.debounceDelay = newDelay;
    this.outputChannel.appendLine(`[Git] Debounce delay updated: ${newDelay}ms`);
  }

  /**
   * Enables or disables git operation detection.
   *
   * @param enabled - True to enable, false to disable
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.outputChannel.appendLine(`[Git] Detection ${enabled ? 'enabled' : 'disabled'}`);

    if (!enabled && this.gitOperationInProgress) {
      // Cancel pending operation
      if (this.gitOperationTimer) {
        clearTimeout(this.gitOperationTimer);
        this.gitOperationTimer = undefined;
      }
      this.gitOperationInProgress = false;
      this.outputChannel.appendLine('[Git] Pending operation cancelled (detection disabled)');
    }
  }

  /**
   * Cleanup watchers and timers.
   * Called automatically by VSCode when extension deactivates.
   */
  dispose(): void {
    this.outputChannel.appendLine('[Git] Disposing detector');

    // Clear timer
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
      this.gitOperationTimer = undefined;
    }

    // Dispose watchers
    this.watchers.forEach(watcher => watcher.dispose());
    this.watchers = [];
  }
}
