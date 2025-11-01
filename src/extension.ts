import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Export parser for testing
export { parseFrontmatter } from './parser';

// Export helper functions for testing (S64)
export { generateNextItemNumber, slugify, generateChildItemTemplate } from './createChildHelpers';

// Import cache for file watcher integration
import { FrontmatterCache } from './cache';

// Import Frontmatter type for type safety
import { Frontmatter } from './types';

// Import S73 change detection utilities
import { detectChangeType, ChangeType } from './utils/changeDetection';

// Import S74 git operation detection
import { GitOperationDetector } from './utils/GitOperationDetector';

// Import B1 path utilities
import { normalizePath } from './utils/pathUtils';

// Import S64 helper functions
import { generateNextItemNumber, slugify, generateChildItemTemplate } from './createChildHelpers';
import { PlanningTreeProvider, PlanningDragAndDropController } from './treeview';
import { updateItemStatus } from './fileUpdates';
import { Status } from './types';
import { PlanningTreeItem } from './treeview/PlanningTreeItem';

// Output channel for extension logging
let outputChannel: vscode.OutputChannel;

// Frontmatter cache for extension (module-level for deactivate access)
let frontmatterCache: FrontmatterCache | null = null;

// Previous data store for change detection (B1: Fix Status Change Detection)
// Stores last known state before file changes to enable proper change detection.
// Cache auto-invalidation on mtime change caused oldData === newData comparison bug.
let previousDataStore: Map<string, PlanningTreeItem> | null = null;

// PlanningTreeProvider for extension (module-level for disposal)
let planningTreeProvider: PlanningTreeProvider | null = null;

// Drag-and-drop controller for TreeView (module-level for disposal)
let dragDropController: PlanningDragAndDropController | null = null;

// TreeView instance for Cascade planning panel (module-level for disposal)
let cascadeTreeView: vscode.TreeView<any> | null = null;

// Constants for logging
const SEPARATOR = '='.repeat(60);

// File watcher debounce delay (milliseconds)
// Prevents excessive processing during rapid file saves (e.g., auto-save)
const DEBOUNCE_DELAY_MS = 300;

/**
 * Determines if the extension should activate based on workspace contents.
 * Checks all workspace folders for the presence of 'plans/' or 'specs/' directories.
 *
 * This function prevents unnecessary activation in unrelated projects by ensuring
 * the extension only activates where planning/spec directories exist. This optimizes
 * VSCode performance by avoiding file watchers and resource allocation in irrelevant workspaces.
 *
 * @returns {boolean} True if any workspace folder contains plans/ or specs/, false otherwise
 */
function shouldActivateExtension(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Handle edge case: No workspace folders open (single file or empty window)
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  // Check each workspace folder for required directories (multi-root support)
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath; // Convert VSCode URI to native file system path
    const plansPath = path.join(folderPath, 'plans'); // Windows-safe path joining
    const specsPath = path.join(folderPath, 'specs');

    // Short-circuit: Activate on first match (performance optimization)
    if (fs.existsSync(plansPath) || fs.existsSync(specsPath)) {
      return true;
    }
  }

  return false; // No qualifying folders found - extension remains dormant
}

/**
 * Logs detailed information about workspace detection for debugging.
 * Provides per-folder breakdown showing which directories were found and activation decision.
 *
 * Output format matches existing extension logging style with emoji indicators:
 * - ✅ Folders with plans/ or specs/ directories
 * - ❌ Folders without required directories
 * - ℹ️  Informational messages about dormant state
 * - 🔍 Analysis header
 *
 * @param outputChannel The output channel to log to
 */
function logWorkspaceDetection(outputChannel: vscode.OutputChannel): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Handle edge case: No workspace folders open
  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('ℹ️  No workspace folders open');
    outputChannel.appendLine('   Extension will remain dormant');
    return;
  }

  // Log header with folder count (useful for multi-root workspaces)
  outputChannel.appendLine(`🔍 Checking ${workspaceFolders.length} workspace folder(s):`);
  outputChannel.appendLine('');

  let foundAny = false;

  // Check each folder and log results
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    const plansPath = path.join(folderPath, 'plans');
    const specsPath = path.join(folderPath, 'specs');

    const hasPlans = fs.existsSync(plansPath);
    const hasSpecs = fs.existsSync(specsPath);

    // Log qualifying folders (has plans/ or specs/)
    if (hasPlans || hasSpecs) {
      outputChannel.appendLine(`   ✅ ${folder.name}`);
      outputChannel.appendLine(`      Path: ${folderPath}`);
      if (hasPlans) outputChannel.appendLine(`      Found: plans/`);
      if (hasSpecs) outputChannel.appendLine(`      Found: specs/`);
      foundAny = true;
    } else {
      // Log non-qualifying folders
      outputChannel.appendLine(`   ❌ ${folder.name}`);
      outputChannel.appendLine(`      Path: ${folderPath}`);
      outputChannel.appendLine(`      Missing: plans/ and specs/`);
    }
    outputChannel.appendLine('');
  }

  // Log final activation decision
  if (foundAny) {
    outputChannel.appendLine('✅ Extension activated - found required directories');
  } else {
    outputChannel.appendLine('ℹ️  Extension dormant - no plans/ or specs/ directories found');
  }
}

/**
 * Handles workspace folder changes by re-evaluating activation status.
 * This allows the extension to respond to folders being added or removed dynamically.
 *
 * @param event The workspace folders change event
 * @param outputChannel The output channel for logging
 */
function handleWorkspaceChange(
  event: vscode.WorkspaceFoldersChangeEvent,
  outputChannel: vscode.OutputChannel
): void {
  // Log the change event header
  outputChannel.appendLine('');
  outputChannel.appendLine(SEPARATOR);
  outputChannel.appendLine('🔄 Workspace Folders Changed');
  outputChannel.appendLine(SEPARATOR);
  outputChannel.appendLine(`Changed at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine('');

  // Log added folders (if any)
  if (event.added.length > 0) {
    outputChannel.appendLine(`➕ Added ${event.added.length} folder(s):`);
    event.added.forEach(folder => {
      outputChannel.appendLine(`   - ${folder.name} (${folder.uri.fsPath})`);
    });
    outputChannel.appendLine('');
  }

  // Log removed folders (if any)
  if (event.removed.length > 0) {
    outputChannel.appendLine(`➖ Removed ${event.removed.length} folder(s):`);
    event.removed.forEach(folder => {
      outputChannel.appendLine(`   - ${folder.name} (${folder.uri.fsPath})`);
    });
    outputChannel.appendLine('');
  }

  // Re-evaluate activation status and log updated workspace state
  const shouldActivate = shouldActivateExtension();

  outputChannel.appendLine('--- Updated Workspace Detection ---');
  logWorkspaceDetection(outputChannel);
  outputChannel.appendLine('');

  // Log activation status decision
  if (shouldActivate) {
    outputChannel.appendLine('✅ Extension remains active (qualifying folders present)');
  } else {
    outputChannel.appendLine('⏸️  Extension should deactivate (no qualifying folders)');
    outputChannel.appendLine('   (Note: VSCode extensions cannot deactivate at runtime)');
    outputChannel.appendLine('   (Features will not initialize until qualifying folder added)');
  }

  outputChannel.appendLine(SEPARATOR);
}

/**
 * Registers workspace folder change listener and adds it to extension subscriptions.
 * This listener enables dynamic activation monitoring without requiring window reloads.
 *
 * @param context VSCode extension context for subscription management
 * @param outputChannel The output channel for logging workspace changes
 */
function registerWorkspaceChangeListener(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
    (event) => handleWorkspaceChange(event, outputChannel)
  );
  context.subscriptions.push(workspaceChangeListener);
}

/**
 * Normalizes file path for consistent cache keys and timer lookups.
 *
 * Handles Windows path variations by:
 * - Converting backslashes to forward slashes
 * - Converting to lowercase (Windows file system is case-insensitive)
 *
 * This ensures that different representations of the same file path
 * (e.g., 'D:\\plans\\story.md' vs 'D:/plans/story.md' vs 'd:/Plans/story.md')
 * all map to the same normalized key.
 *
 * @param filePath - Raw file path from vscode.Uri.fsPath (may have backslashes)
 * @returns Normalized path (lowercase, forward slashes)
 *
 * @example
 * normalizeWatcherPath('D:\\Projects\\Lineage\\plans\\story-38.md')
 * // Returns: 'd:/projects/lineage/plans/story-38.md'
 */
function normalizeWatcherPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

/**
 * Creates a debounced file change handler.
 *
 * Wraps an event handler with debouncing logic to prevent excessive processing
 * during rapid file saves. Each file has an independent timer (300ms default).
 *
 * When a file event occurs:
 * 1. Clear any existing timer for this file
 * 2. Create new timer (300ms delay)
 * 3. Timer fires → Execute handler, remove timer from map
 *
 * This ensures:
 * - Multiple rapid saves to same file → Single handler execution (after 300ms silence)
 * - Different files → Concurrent processing (independent timers)
 *
 * Debouncing prevents excessive processing during rapid saves.
 *
 * Example: User has auto-save enabled (saves every 200ms).
 * Without debouncing: 10 saves in 2 seconds → 10 handler executions
 * With debouncing: 10 saves in 2 seconds → 1 handler execution (after 300ms silence)
 *
 * This is critical for:
 * - Cache invalidation efficiency (S40)
 * - UI update performance (F12, F13)
 * - Avoiding redundant file parsing (S39)
 *
 * Timer Management:
 * - Each file has independent timer (Map key = normalized path)
 * - New event clears old timer (resets countdown)
 * - Timer cleaned up after firing (prevents memory leak)
 *
 * Path Normalization:
 * - Windows: 'D:\\plans\\story.md' → 'd:/plans/story.md'
 * - Ensures same file always maps to same timer key
 * - Case-insensitive (Windows file system behavior)
 *
 * @param handler - Event handler function to debounce
 * @param changeTimers - Map storing active timers by file path
 * @param outputChannel - Output channel for logging
 * @param eventType - Event type label for logging ('FILE_CREATED', 'FILE_CHANGED', 'FILE_DELETED')
 * @returns Debounced event handler
 */
function createDebouncedHandler(
  handler: (uri: vscode.Uri) => Promise<void>,
  changeTimers: Map<string, NodeJS.Timeout>,
  outputChannel: vscode.OutputChannel,
  eventType: string
): (uri: vscode.Uri) => void {
  return (uri: vscode.Uri) => {
    const filePath = uri.fsPath; // Native OS path
    const normalizedPath = normalizeWatcherPath(filePath);

    // Clear existing timer for this file (if any)
    const existingTimer = changeTimers.get(normalizedPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
      // Old timer cancelled - new event will reset delay
    }

    // Create new timer (300ms debounce delay)
    const timer = setTimeout(() => {
      // Timer fired - process event

      // Execute handler
      handler(uri);

      // Log event with timestamp and relative path
      const timestamp = new Date().toLocaleTimeString();

      // Extract relative path (more readable than full path)
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      const relativePath = workspaceFolder
        ? path.relative(workspaceFolder.uri.fsPath, filePath)
        : filePath;

      outputChannel.appendLine(`[${timestamp}] ${eventType}: ${relativePath}`);

      // Clean up: Remove timer from map
      changeTimers.delete(normalizedPath);
    }, DEBOUNCE_DELAY_MS);

    // Store timer in map
    changeTimers.set(normalizedPath, timer);
  };
}

/**
 * Extracts story item number from a spec directory path (S94).
 *
 * Spec paths follow the pattern:
 * - specs/S{number}-{name}/plan.md
 * - specs/S{number}-{name}/tasks/*.md
 * - specs/story-{number}-{name}/plan.md (legacy format)
 *
 * This function parses the path to extract the story number and
 * format it as "S{number}" for cache lookup.
 *
 * @param specPath - Absolute path to spec file
 * @returns Story item number (e.g., "S75") or null if path doesn't match
 *
 * @example
 * ```typescript
 * extractStoryItemFromSpecPath('D:/projects/lineage/specs/S93-spec-progress-reader-utility/plan.md')
 * // Returns: "S93"
 *
 * extractStoryItemFromSpecPath('D:/projects/lineage/specs/story-75-type-system/tasks/01-core.md')
 * // Returns: "S75"
 *
 * extractStoryItemFromSpecPath('D:/projects/lineage/plans/epic-05/story-49.md')
 * // Returns: null (not a spec path)
 * ```
 */
function extractStoryItemFromSpecPath(specPath: string): string | null {
  // Normalize path separators (Windows uses backslash, need forward slash for regex)
  const normalizedPath = specPath.replace(/\\/g, '/');

  // Match pattern: specs/S{number}-{name}/...
  // Example: specs/S93-spec-progress-reader-utility/plan.md → S93
  let match = normalizedPath.match(/specs\/S(\d+)-/);
  if (match) {
    return `S${match[1]}`;
  }

  // Match legacy pattern: specs/story-{number}-{name}/...
  // Example: specs/story-75-type-system/tasks/01-core.md → S75
  match = normalizedPath.match(/specs\/story-(\d+)-/);
  if (match) {
    return `S${match[1]}`;
  }

  // Path doesn't match spec directory pattern
  return null;
}

/**
 * Creates file system watchers for plans/ and specs/ directories.
 *
 * Iterates through all workspace folders and creates watchers for folders
 * containing plans/ or specs/ directories. Each folder gets two watchers:
 * - plans watcher (monitors all .md files recursively)
 * - specs watcher (monitors all .md files recursively)
 *
 * Watchers use debounced event handlers (300ms) to prevent excessive processing
 * during rapid file saves (e.g., auto-save).
 *
 * Watchers automatically invalidate cache on file changes/deletions.
 *
 * Watchers are automatically registered in context.subscriptions for disposal.
 *
 * @param context VSCode extension context for subscription management
 * @param outputChannel Output channel for logging watcher creation
 * @param cache Frontmatter cache instance (for invalidation on file changes)
 * @returns Array of created FileSystemWatcher instances (for testing/debugging)
 */
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  cache: FrontmatterCache,
  gitDetector: GitOperationDetector  // S74: Git operation detection
): vscode.FileSystemWatcher[] {
  // Create debounce timer map (shared across all watchers)
  const changeTimers = new Map<string, NodeJS.Timeout>();

  // Event handlers (will be wrapped with debouncing)
  const handleCreate = async (uri: vscode.Uri) => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File created: ${relativePath}`);

    // Check if git operation in progress (S74)
    if (gitDetector.isGitOperationInProgress()) {
      outputChannel.appendLine('[FileWatcher] Create event suppressed (git operation in progress)');
      return;
    }

    // B1: Parse new file and add to previousDataStore
    const frontmatter = await cache.get(uri.fsPath);
    if (frontmatter) {
      const normalizedPath = normalizePath(uri.fsPath);
      const treeItem: PlanningTreeItem = {
        item: frontmatter.item,
        title: frontmatter.title,
        type: frontmatter.type,
        status: frontmatter.status,
        priority: frontmatter.priority,
        filePath: uri.fsPath
      };
      previousDataStore!.set(normalizedPath, treeItem);
      outputChannel.appendLine(`[FileWatcher] Added new file to previous data store`);
    }

    // Schedule debounced TreeView refresh (batches rapid file changes)
    if (planningTreeProvider) {
      planningTreeProvider.scheduleRefresh();
      outputChannel.appendLine('[TreeView] Full refresh scheduled (file created)');
    }
  };

  const handleChange = async (uri: vscode.Uri) => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

    // Check if git operation in progress (S74)
    if (gitDetector.isGitOperationInProgress()) {
      // Invalidate cache but don't refresh TreeView yet
      cache.invalidate(uri.fsPath);
      outputChannel.appendLine('[FileWatcher] Refresh suppressed (git operation in progress)');
      return; // Don't trigger refresh yet
    }

    // B1: Retrieve old data from previousDataStore
    const normalizedPath = normalizePath(uri.fsPath);
    const oldData = previousDataStore!.get(normalizedPath) || null;

    if (oldData) {
      outputChannel.appendLine(`[FileWatcher] Found previous data for change detection`);
    } else {
      outputChannel.appendLine(`[FileWatcher] ℹ️  No previous data (new file or first change)`);
    }

    // Detect change type (S73) - Pass oldData from previousDataStore
    const result = await detectChangeType(uri, cache, outputChannel, oldData);

    // B1: Update previousDataStore with new state
    if (result.newData) {
      previousDataStore!.set(normalizedPath, result.newData);
      outputChannel.appendLine(`[FileWatcher] Updated previous data store`);
    } else {
      // File deleted or parsing failed - remove from store
      previousDataStore!.delete(normalizedPath);
      outputChannel.appendLine(`[FileWatcher] Removed from previous data store`);
    }

    switch (result.type) {
      case ChangeType.STRUCTURE:
        // Full refresh needed (status groups may reorganize)
        if (planningTreeProvider) {
          planningTreeProvider.scheduleRefresh();
          outputChannel.appendLine('[TreeView] Full refresh scheduled (structure change)');
        }
        break;

      case ChangeType.CONTENT:
        // Partial refresh (update specific item)
        if (planningTreeProvider) {
          const item = await planningTreeProvider.findItemByPath(uri.fsPath);
          if (item) {
            planningTreeProvider.schedulePartialRefresh(item);
            outputChannel.appendLine(`[TreeView] Partial refresh scheduled (content change)`);
          } else {
            // Item not found, fall back to full refresh
            outputChannel.appendLine(
              `[ChangeDetect] ⚠️  Item not found for ${relativePath}, falling back to full refresh`
            );
            planningTreeProvider.scheduleRefresh();
          }
        }
        break;

      case ChangeType.BODY:
        // No refresh needed (body content doesn't affect TreeView)
        outputChannel.appendLine('[TreeView] Refresh skipped (body-only change)');
        break;
    }
  };

  const handleDelete = async (uri: vscode.Uri) => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File deleted: ${relativePath}`);

    // Invalidate cache entry (file no longer exists, cache entry invalid)
    cache.invalidate(uri.fsPath);

    // B1: Remove from previousDataStore
    const normalizedPath = normalizePath(uri.fsPath);
    previousDataStore!.delete(normalizedPath);
    outputChannel.appendLine(`[FileWatcher] Removed deleted file from previous data store`);

    // Check if git operation in progress (S74)
    if (gitDetector.isGitOperationInProgress()) {
      outputChannel.appendLine('[FileWatcher] Delete event suppressed (git operation in progress)');
      return;
    }

    // Schedule debounced TreeView refresh (batches rapid file changes)
    if (planningTreeProvider) {
      planningTreeProvider.scheduleRefresh();
      outputChannel.appendLine('[TreeView] Full refresh scheduled (file deleted)');
    }
  };

  const watchers: vscode.FileSystemWatcher[] = [];
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    outputChannel.appendLine('⚠️  No workspace folders to watch');
    return watchers;
  }

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    const plansPath = path.join(folderPath, 'plans');
    const specsPath = path.join(folderPath, 'specs');

    // Check if folder qualifies (has plans/ or specs/)
    const hasPlans = fs.existsSync(plansPath);
    const hasSpecs = fs.existsSync(specsPath);

    if (!hasPlans && !hasSpecs) {
      continue; // Skip non-qualifying folders
    }

    if (hasPlans) {
      // Create plans/ watcher
      const plansWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(folder, 'plans/**/*.md')
      );

      // Register event handlers with debouncing
      plansWatcher.onDidCreate(
        createDebouncedHandler(handleCreate, changeTimers, outputChannel, 'FILE_CREATED')
      );

      plansWatcher.onDidChange(
        createDebouncedHandler(handleChange, changeTimers, outputChannel, 'FILE_CHANGED')
      );

      plansWatcher.onDidDelete(
        createDebouncedHandler(handleDelete, changeTimers, outputChannel, 'FILE_DELETED')
      );

      // Register for disposal
      context.subscriptions.push(plansWatcher);
      watchers.push(plansWatcher);

      // Log creation
      outputChannel.appendLine(`   ✅ Watching: ${folder.name}/plans/**/*.md`);
    }

    if (hasSpecs) {
      // Create specs/ watcher
      const specsWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(folder, 'specs/**/*.md')
      );

      // Register event handlers with debouncing
      specsWatcher.onDidCreate(
        createDebouncedHandler(handleCreate, changeTimers, outputChannel, 'FILE_CREATED')
      );

      specsWatcher.onDidChange(
        (uri) => {
          // Standard file change handling (cache invalidation, refresh)
          createDebouncedHandler(handleChange, changeTimers, outputChannel, 'FILE_CHANGED')(uri);

          // S94: Spec progress cache invalidation
          // Extract story number from spec path (e.g., "specs/S93-.../plan.md" → "S93")
          const storyItem = extractStoryItemFromSpecPath(uri.fsPath);

          if (storyItem && planningTreeProvider) {
            // Invalidate spec progress cache for this specific story
            planningTreeProvider.invalidateSpecProgress(storyItem);
            outputChannel.appendLine(
              `[SpecProgressCache] File changed: ${path.basename(uri.fsPath)} → Invalidated cache for ${storyItem}`
            );
          } else {
            // Path doesn't match spec pattern (shouldn't happen, but log for debugging)
            outputChannel.appendLine(
              `[SpecProgressCache] ⚠️  Could not extract story item from spec path: ${uri.fsPath}`
            );
          }
        }
      );

      specsWatcher.onDidDelete(
        createDebouncedHandler(handleDelete, changeTimers, outputChannel, 'FILE_DELETED')
      );

      // Register for disposal
      context.subscriptions.push(specsWatcher);
      watchers.push(specsWatcher);

      // Log creation
      outputChannel.appendLine(`   ✅ Watching: ${folder.name}/specs/**/*.md`);
    }
  }

  return watchers;
}

/**
 * Logs cache statistics to output channel for debugging and monitoring.
 *
 * Called on-demand via command. Provides insights into cache performance (hit rate, evictions, size).
 *
 * @param cache The frontmatter cache instance
 * @param outputChannel Output channel for logging
 */
function logCacheStats(cache: FrontmatterCache, outputChannel: vscode.OutputChannel): void {
  const stats = cache.getStats();

  outputChannel.appendLine('');
  outputChannel.appendLine('--- Cache Statistics ---');
  outputChannel.appendLine(`Hits: ${stats.hits} | Misses: ${stats.misses}`);
  outputChannel.appendLine(`Evictions: ${stats.evictions} | Current Size: ${stats.size}`);

  // Calculate hit rate if there are any requests
  const totalRequests = stats.hits + stats.misses;
  if (totalRequests > 0) {
    const hitRate = ((stats.hits / totalRequests) * 100).toFixed(1);
    outputChannel.appendLine(`Hit Rate: ${hitRate}%`);
  } else {
    outputChannel.appendLine('Hit Rate: N/A (no requests yet)');
  }

  outputChannel.appendLine('');
}

/**
 * Returns valid status transitions for a given current status.
 *
 * Enforces workflow rules:
 * - Not Started → In Planning, Blocked
 * - In Planning → Ready, Blocked
 * - Ready → In Progress, Blocked
 * - In Progress → Completed, Blocked
 * - Blocked → Any previous state (Not Started, In Planning, Ready, In Progress)
 * - Completed → No transitions (final state)
 *
 * @param currentStatus - The item's current status
 * @returns Array of valid status values user can transition to
 */
function getValidTransitions(currentStatus: Status): Status[] {
  const transitions: Record<Status, Status[]> = {
    'Not Started': ['In Planning', 'Blocked'],
    'In Planning': ['Ready', 'Blocked'],
    'Ready': ['In Progress', 'Blocked'],
    'In Progress': ['Completed', 'Blocked'],
    'Blocked': ['Not Started', 'In Planning', 'Ready', 'In Progress'], // Return to any previous state
    'Completed': [], // Final state - no transitions
    'Archived': [] // Stored state - no drag-and-drop transitions (S77 will add toggle command)
  };

  return transitions[currentStatus] || [];
}

/**
 * Returns a user-friendly description for a status value.
 *
 * These descriptions appear in the quick pick menu to help users
 * understand what each status means.
 *
 * @param status - The status to describe
 * @returns Human-readable description string
 */
function getStatusDescription(status: Status): string {
  const descriptions: Record<Status, string> = {
    'Not Started': 'Initial state - not yet planned',
    'In Planning': 'Requirements being refined',
    'Ready': 'Ready for implementation',
    'In Progress': 'Currently being implemented',
    'Blocked': 'Waiting on dependency or issue',
    'Completed': 'Implementation finished',
    'Archived': 'Stored for reference - not active'
  };

  return descriptions[status] || '';
}

/**
 * Command handler for "Change Status" context menu action.
 *
 * Workflow:
 * 1. Get valid transitions for current status
 * 2. Show quick pick menu with status options
 * 3. If user selects status, update file and show notification
 * 4. If user cancels (ESC), do nothing
 *
 * File updates trigger FileSystemWatcher (S38) which automatically:
 * - Invalidates cache (S40)
 * - Refreshes TreeView
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function changeStatusCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[ChangeStatus] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[ChangeStatus] ℹ️  Item retrieved from TreeView selection');
  }

  // Validate input (defensive programming - handles both null and undefined)
  if (!item) {
    outputChannel.appendLine('[ChangeStatus] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (only Stories and Bugs can change status)
  if (item.type !== 'story' && item.type !== 'bug') {
    outputChannel.appendLine(`[ChangeStatus] ⚠️  Invalid item type: ${item.type}`);
    vscode.window.showWarningMessage('Change Status only works for Stories and Bugs');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[ChangeStatus] Command invoked for ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Current status: ${item.status}`);
  outputChannel.appendLine(`  File: ${item.filePath}`);

  // Step 1: Get valid transitions for current status
  const validStatuses = getValidTransitions(item.status);

  // Handle edge case: No valid transitions (e.g., Completed items)
  if (validStatuses.length === 0) {
    outputChannel.appendLine(`  ℹ️  No valid transitions from "${item.status}"`);
    vscode.window.showInformationMessage(
      `${item.item} is "${item.status}" - no status changes available`
    );
    return;
  }

  // Step 2: Show quick pick with status options
  const selected = await vscode.window.showQuickPick(
    validStatuses.map(s => ({
      label: s,
      description: getStatusDescription(s)
    })),
    {
      placeHolder: `Change status from "${item.status}" to...`,
      title: `${item.item} - ${item.title}`
    }
  );

  // Handle cancellation (user pressed ESC or clicked outside)
  if (!selected) {
    outputChannel.appendLine('  ℹ️  User cancelled status change');
    return;
  }

  outputChannel.appendLine(`  → Selected status: ${selected.label}`);

  // Step 3: Update file frontmatter
  try {
    await updateItemStatus(item.filePath, selected.label as Status, outputChannel);

    // Step 4: Show success notification
    vscode.window.showInformationMessage(
      `${item.item} status changed to "${selected.label}"`
    );

    outputChannel.appendLine(`  ✅ Status change successful`);

  } catch (error) {
    // Handle errors (file read/write failures, parse errors, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    outputChannel.appendLine(`  ❌ Status change failed: ${errorMsg}`);

    // Show error notification to user
    vscode.window.showErrorMessage(
      `Failed to update ${item.item}: ${errorMsg}`
    );
  }
}

/**
 * Command handler for "Create Child Item" context menu action (S64).
 *
 * Workflow:
 * 1. Determine child type based on parent (Epic → Feature, Feature → Story)
 * 2. Prompt user for child item title with validation
 * 3. Generate next item number by scanning existing items
 * 4. Create directory (if feature) and file with frontmatter
 * 5. Update parent file with child reference
 * 6. Open new file in editor
 *
 * File creation triggers FileSystemWatcher (S38) which automatically:
 * - Refreshes TreeView to show new item
 * - Parses frontmatter into cache (S40)
 *
 * @param parentItem - The Epic or Feature that was right-clicked
 */
/**
 * Updates parent file to add reference to newly created child item.
 *
 * Adds child reference to "## Child Items" section in parent markdown.
 * Creates section if it doesn't exist.
 *
 * Section format:
 * ```markdown
 * ## Child Items
 *
 * - **F20**: User Authentication
 * - **S65**: Test Story Creation
 * ```
 *
 * @param parentPath - Absolute path to parent item file
 * @param childItem - Child item number (e.g., "F20", "S65")
 * @param childTitle - Child item title
 * @throws Error if file read/write fails
 */
async function updateParentWithChild(
  parentPath: string,
  childItem: string,
  childTitle: string
): Promise<void> {
  // Read parent file
  const uri = vscode.Uri.file(parentPath);
  const content = await vscode.workspace.fs.readFile(uri);
  const contentStr = Buffer.from(content).toString('utf-8');

  let updatedContent: string;

  // Check if "## Child Items" section exists
  if (contentStr.includes('## Child Items')) {
    // Append to existing section (after header line)
    // Find section and add new item as first entry (prepend to list)
    updatedContent = contentStr.replace(
      /## Child Items\n\n/,
      `## Child Items\n\n- **${childItem}**: ${childTitle}\n`
    );
  } else {
    // Add new section at end of file
    updatedContent = contentStr.trimEnd() + `\n\n## Child Items\n\n- **${childItem}**: ${childTitle}\n`;
  }

  // Write updated parent file
  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(updatedContent, 'utf-8')
  );

  outputChannel.appendLine(`[CreateChild] Updated parent: ${parentPath}`);
  outputChannel.appendLine(`  Added child: ${childItem} - ${childTitle}`);
}

async function createChildItemCommand(parentItem?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!parentItem && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[CreateChild] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    parentItem = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[CreateChild] ℹ️  Item retrieved from TreeView selection');
  }

  // Validate input (defensive programming)
  if (!parentItem) {
    outputChannel.appendLine('[CreateChild] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (only Epics and Features can create children)
  if (parentItem.type !== 'epic' && parentItem.type !== 'feature') {
    outputChannel.appendLine(`[CreateChild] ⚠️  Invalid item type: ${parentItem.type}`);
    vscode.window.showWarningMessage('Create Child Item only works for Epics and Features');
    return;
  }

  // Determine child type based on parent
  const childType: 'feature' | 'story' = parentItem.type === 'epic' ? 'feature' : 'story';
  const childTypeDisplay = childType.charAt(0).toUpperCase() + childType.slice(1);

  outputChannel.appendLine('');
  outputChannel.appendLine(`[CreateChild] Creating child ${childType} for ${parentItem.item}`);

  // Prompt for title with validation
  const title = await vscode.window.showInputBox({
    prompt: `Enter ${childTypeDisplay} title`,
    placeHolder: `e.g., User Authentication`,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Title cannot be empty';
      }
      if (value.length > 100) {
        return 'Title too long (max 100 characters)';
      }
      return null;  // Valid
    }
  });

  // Handle cancellation (user pressed ESC)
  if (!title) {
    outputChannel.appendLine('[CreateChild] ℹ️  User cancelled');
    return;
  }

  outputChannel.appendLine(`[CreateChild] Title: ${title}`);

  try {
    // Load all planning items for item number generation
    const plansPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'plans');
    const pattern = new vscode.RelativePattern(plansPath, '**/*.md');
    const files = await vscode.workspace.findFiles(pattern);

    const allItems: PlanningTreeItem[] = [];
    for (const fileUri of files) {
      const frontmatter = await frontmatterCache!.get(fileUri.fsPath);
      if (frontmatter) {
        allItems.push({
          item: frontmatter.item,
          title: frontmatter.title,
          type: frontmatter.type,
          status: frontmatter.status,
          priority: frontmatter.priority,
          filePath: fileUri.fsPath
        });
      }
    }

    // Generate next item number
    const itemNumber = generateNextItemNumber(childType, allItems);
    outputChannel.appendLine(`[CreateChild] Generated item number: ${itemNumber}`);

    // Slugify title for file/directory name
    const slug = slugify(title);
    outputChannel.appendLine(`[CreateChild] Slugified title: ${slug}`);

    // Get parent directory
    const parentDir = path.dirname(parentItem.filePath);

    // Construct child path based on type
    let childPath: string;
    if (childType === 'feature') {
      // Features get their own directory: epic-XX-name/feature-YY-slug/feature.md
      const featureDir = path.join(
        parentDir,
        `${childType}-${itemNumber.substring(1)}-${slug}`  // "feature-20-user-auth"
      );
      childPath = path.join(featureDir, 'feature.md');
    } else {
      // Stories go in parent Feature directory: feature-XX-name/story-YY-slug.md
      childPath = path.join(
        parentDir,
        `${childType}-${itemNumber.substring(1)}-${slug}.md`  // "story-65-test-creation.md"
      );
    }

    outputChannel.appendLine(`[CreateChild] Target path: ${childPath}`);

    // Create directory for features (stories don't need directory)
    if (childType === 'feature') {
      const featureDir = path.dirname(childPath);
      fs.mkdirSync(featureDir, { recursive: true });
      outputChannel.appendLine(`[CreateChild] Created directory: ${featureDir}`);
    }

    // Generate frontmatter
    const today = new Date().toISOString().split('T')[0];
    const frontmatter: Frontmatter = {
      item: itemNumber,
      title: title,
      type: childType,
      status: 'Not Started',
      priority: 'Medium',
      dependencies: [],
      created: today,
      updated: today
    };

    outputChannel.appendLine(`[CreateChild] Frontmatter created:`);
    outputChannel.appendLine(`  Item: ${itemNumber}`);
    outputChannel.appendLine(`  Type: ${childType}`);
    outputChannel.appendLine(`  Status: Not Started`);
    outputChannel.appendLine(`  Priority: Medium`);

    // Generate file content using helper
    const content = generateChildItemTemplate(frontmatter, childType);

    // Write file atomically (VSCode Workspace FS API)
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(childPath),
      Buffer.from(content, 'utf-8')
    );

    outputChannel.appendLine(`[CreateChild] ✅ File created: ${childPath}`);

    // Update parent file with child reference
    await updateParentWithChild(parentItem.filePath, itemNumber, title);

    // Open file in editor
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(childPath));
    await vscode.window.showTextDocument(doc, {
      preview: false,        // Permanent tab
      preserveFocus: false   // Give editor focus
    });

    outputChannel.appendLine(`[CreateChild] File opened in editor`);

    // Show success notification
    vscode.window.showInformationMessage(
      `${itemNumber} - ${title} created successfully`
    );

    outputChannel.appendLine(`[CreateChild] ✅ Command completed successfully`);

  } catch (error) {
    // Log error to output channel
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    outputChannel.appendLine(`[CreateChild] ❌ Error: ${errorMsg}`);

    // Show error notification to user
    vscode.window.showErrorMessage(
      `Failed to create child item: ${errorMsg}`
    );
  }
}

/**
 * Command handler for "Open File" context menu action (S65).
 *
 * Opens the planning item's markdown file in the VSCode editor.
 * This is the same behavior as clicking the item in the TreeView,
 * but accessible via right-click context menu.
 *
 * Reuses existing openPlanningFile function (line 1331) which handles:
 * - URI conversion
 * - Permanent tab mode
 * - Editor focus
 * - Error handling
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function openFileContextCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[OpenFile] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[OpenFile] Opening file: ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Path: ${item.filePath}`);

  // Delegate to existing openPlanningFile function
  // This function already handles:
  // - URI conversion
  // - Document opening
  // - Permanent tab mode (preview: false)
  // - Editor focus (preserveFocus: false)
  // - Error handling and user notifications
  await openPlanningFile(item.filePath, outputChannel);

  outputChannel.appendLine(`[OpenFile] ✅ File opened successfully`);
}

/**
 * Command handler for "Copy Item Number" context menu action (S65).
 *
 * Copies the planning item's ID (e.g., "S39", "F16", "E4") to the clipboard
 * and shows a toast notification to confirm the operation.
 *
 * Uses VSCode clipboard API (vscode.env.clipboard) which provides cross-platform
 * clipboard access with proper error handling.
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function copyItemNumberCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[CopyItem] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[CopyItem] ℹ️  Item retrieved from TreeView selection');
  }

  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[CopyItem] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (status groups don't have item numbers)
  if (!item.item || item.item.trim() === '') {
    outputChannel.appendLine('[CopyItem] ⚠️  Item has no item number (likely status group)');
    vscode.window.showWarningMessage('Cannot copy item number - no item number found');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[CopyItem] Copying item number: ${item.item}`);
  outputChannel.appendLine(`  Title: ${item.title}`);

  try {
    // Copy to clipboard using VSCode API
    // This API handles platform differences (Windows/Mac/Linux clipboard)
    await vscode.env.clipboard.writeText(item.item);

    // Log success
    outputChannel.appendLine(`[CopyItem] ✅ Copied to clipboard: ${item.item}`);

    // Show success notification
    // Toast appears briefly in bottom-right corner
    vscode.window.showInformationMessage(`Copied: ${item.item}`);

  } catch (error) {
    // Handle errors (clipboard unavailable, permissions issue, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    outputChannel.appendLine(`[CopyItem] ❌ Error: ${errorMsg}`);

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to copy item number: ${errorMsg}`
    );
  }
}

/**
 * Command handler for "Reveal in Explorer" context menu action (S65).
 *
 * Opens the VSCode File Explorer view and highlights the planning item's file.
 * If the file's directory is collapsed, the explorer expands it to show the file.
 *
 * Uses VSCode built-in command 'revealInExplorer' which handles:
 * - Opening File Explorer view if closed
 * - Expanding parent directories
 * - Highlighting and scrolling to file
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function revealInExplorerCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[RevealExplorer] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[RevealExplorer] Revealing file: ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Path: ${item.filePath}`);

  try {
    // Convert file path to URI
    const uri = vscode.Uri.file(item.filePath);

    // Execute built-in VSCode command to reveal file in Explorer
    // This command:
    // - Opens File Explorer view if closed
    // - Expands parent directories to show file
    // - Highlights file in tree
    // - Scrolls to file if needed
    await vscode.commands.executeCommand('revealInExplorer', uri);

    // Log success
    outputChannel.appendLine(`[RevealExplorer] ✅ File revealed in Explorer`);

  } catch (error) {
    // Handle errors (file not found, command unavailable, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    outputChannel.appendLine(`[RevealExplorer] ❌ Error: ${errorMsg}`);

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to reveal file: ${errorMsg}`
    );
  }
}

/**
 * Called when the extension is activated.
 * Activation events are defined in package.json (currently: onStartupFinished).
 *
 * This function implements intelligent workspace detection (S37):
 * - Only initializes features if workspace contains plans/ or specs/ directories
 * - Creates output channel for logging regardless of activation state
 * - Provides clear feedback about activation decision
 * - Uses early return pattern to prevent unnecessary resource allocation
 *
 * @param context VSCode extension context for subscriptions and resource management
 */
export async function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging (always created for user visibility)
  outputChannel = vscode.window.createOutputChannel('Cascade');
  context.subscriptions.push(outputChannel);

  // Log activation header with environment details
  outputChannel.appendLine(SEPARATOR);
  outputChannel.appendLine('Cascade - Hierarchical Planning for AI Development');
  outputChannel.appendLine(SEPARATOR);
  outputChannel.appendLine(`Activated at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine(`Extension version: ${getExtensionVersion()}`);
  outputChannel.appendLine(`VSCode version: ${vscode.version}`);
  outputChannel.appendLine('');

  // Workspace detection: Check if current workspace qualifies for activation
  const shouldActivate = shouldActivateExtension();

  outputChannel.appendLine('--- Workspace Detection ---');
  logWorkspaceDetection(outputChannel);
  outputChannel.appendLine('');

  // Early return pattern: Stop initialization if workspace doesn't qualify
  if (!shouldActivate) {
    outputChannel.appendLine('⏸️  Extension will not initialize features');
    outputChannel.appendLine('   (Add plans/ or specs/ directory and reload window to activate)');
    outputChannel.appendLine('   (Workspace change monitoring active)');

    // Register workspace change listener even in dormant state
    // This allows extension to activate if qualifying folder added later
    registerWorkspaceChangeListener(context, outputChannel);

    outputChannel.appendLine(SEPARATOR);
    return; // Prevents file watchers, parsers, and cache initialization
  }

  // Register workspace change listener for active extension
  // Logs workspace structure changes for debugging multi-root scenarios
  registerWorkspaceChangeListener(context, outputChannel);

  // Create frontmatter cache instance
  outputChannel.appendLine('--- Frontmatter Cache ---');
  frontmatterCache = new FrontmatterCache(1000); // maxSize=1000 (default)
  outputChannel.appendLine('✅ Cache initialized (maxSize: 1000)');
  outputChannel.appendLine('');

  // Create previous data store for change detection (B1)
  previousDataStore = new Map<string, PlanningTreeItem>();
  outputChannel.appendLine('✅ Previous data store initialized');

  // Create git operation detector (S74) - Must be created before TreeProvider
  outputChannel.appendLine('--- Git Operation Detector ---');
  const gitConfig = vscode.workspace.getConfiguration('cascade');
  const gitDetector = new GitOperationDetector(
    vscode.workspace.workspaceFolders![0].uri.fsPath,
    outputChannel,
    {
      enabled: gitConfig.get<boolean>('enableGitOperationDetection', true),
      debounceDelay: gitConfig.get<number>('gitOperationDebounceDelay', 500)
    }
  );

  // Create git watchers (S74)
  const gitWatchers = gitDetector.createGitWatchers();
  outputChannel.appendLine('');

  // Initialize file system watchers for plans/ and specs/
  outputChannel.appendLine('--- File System Watchers ---');
  const watchers = createFileSystemWatchers(context, outputChannel, frontmatterCache, gitDetector);
  outputChannel.appendLine(`📁 Watching ${watchers.length} directories for file changes`);
  outputChannel.appendLine('');

  // Listen for configuration changes (S72 Phase 2, S74 Phase 3)
  const configListener = vscode.workspace.onDidChangeConfiguration(event => {
    // Check if our setting changed
    if (event.affectsConfiguration('cascade.refreshDebounceDelay')) {
      // Read new value from configuration
      const config = vscode.workspace.getConfiguration('cascade');
      const newDelay = config.get<number>('refreshDebounceDelay', 300);

      // Update PlanningTreeProvider
      if (planningTreeProvider) {
        planningTreeProvider.updateDebounceDelay(newDelay);
      }

      outputChannel.appendLine(
        `[Config] Refresh debounce delay changed to ${newDelay}ms`
      );
    }

    // Check if git detection enabled setting changed (S74)
    if (event.affectsConfiguration('cascade.enableGitOperationDetection')) {
      const config = vscode.workspace.getConfiguration('cascade');
      const enabled = config.get<boolean>('enableGitOperationDetection', true);
      gitDetector.setEnabled(enabled);
    }

    // Check if git debounce delay setting changed (S74)
    if (event.affectsConfiguration('cascade.gitOperationDebounceDelay')) {
      const config = vscode.workspace.getConfiguration('cascade');
      const delay = config.get<number>('gitOperationDebounceDelay', 500);
      gitDetector.updateDebounceDelay(delay);
    }
  });

  // Register configuration listener for disposal
  context.subscriptions.push(configListener);

  // Initialize Cascade TreeView
  outputChannel.appendLine('--- Cascade TreeView ---');

  // Get workspace root (guaranteed to exist after shouldActivateExtension check)
  const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

  // Create PlanningTreeProvider with dependencies
  planningTreeProvider = new PlanningTreeProvider(
    workspaceRoot,
    frontmatterCache,
    outputChannel,
    context.workspaceState  // Pass workspace state for toggle persistence (S79)
  );

  // Register git operation completion callback (S74)
  // Must be done after planningTreeProvider is created
  gitDetector.onGitOperationComplete = () => {
    outputChannel.appendLine('[Git] Clearing entire cache (post-operation)');
    frontmatterCache!.clear(); // Full cache clear

    outputChannel.appendLine('[Git] Triggering full TreeView refresh');
    planningTreeProvider!.refresh(); // Immediate refresh (bypass debounce)
  };

  // Create drag-and-drop controller for TreeView
  dragDropController = new PlanningDragAndDropController(outputChannel);
  outputChannel.appendLine('✅ Drag-and-drop controller created');

  // Register TreeView with provider and drag-and-drop support
  cascadeTreeView = vscode.window.createTreeView('cascadeView', {
    treeDataProvider: planningTreeProvider,
    dragAndDropController: dragDropController  // Enable drag-and-drop
  });

  context.subscriptions.push(cascadeTreeView);
  context.subscriptions.push(planningTreeProvider); // Register for disposal (S72)
  context.subscriptions.push(gitDetector); // Register for disposal (S74)
  context.subscriptions.push(...gitWatchers); // Register git watchers for disposal (S74)

  outputChannel.appendLine('✅ TreeView registered with PlanningTreeProvider');
  outputChannel.appendLine('   View: "Planning Items" in Activity Bar');
  outputChannel.appendLine('   Provider: Scanning plans/ directory for items');
  outputChannel.appendLine('   Drag-and-drop: Enabled for Stories and Bugs');
  outputChannel.appendLine('');

  // B1: Pre-populate previousDataStore with all planning files
  // This ensures change detection works even on first edit after extension activation
  outputChannel.appendLine('--- Previous Data Store Initialization ---');
  outputChannel.appendLine('[Init] Pre-populating previous data store...');
  const plansPattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders![0],
    'plans/**/*.md'
  );
  const existingFiles = await vscode.workspace.findFiles(plansPattern);

  let populatedCount = 0;
  for (const fileUri of existingFiles) {
    try {
      const frontmatter = await frontmatterCache!.get(fileUri.fsPath);
      if (frontmatter) {
        const normalizedPath = normalizePath(fileUri.fsPath);
        const treeItem: PlanningTreeItem = {
          item: frontmatter.item,
          title: frontmatter.title,
          type: frontmatter.type,
          status: frontmatter.status,
          priority: frontmatter.priority,
          filePath: fileUri.fsPath
        };
        previousDataStore!.set(normalizedPath, treeItem);
        populatedCount++;
      }
    } catch (error) {
      // Skip files that fail to parse
      outputChannel.appendLine(`[Init] ⚠️  Failed to parse ${fileUri.fsPath}`);
    }
  }

  outputChannel.appendLine(`✅ Pre-populated ${populatedCount} files in previous data store`);
  outputChannel.appendLine('');

  // Register file opening command for TreeView clicks
  const openFileCommand = vscode.commands.registerCommand(
    'cascade.openFile',
    (filePath: string) => {
      openPlanningFile(filePath, outputChannel);
    }
  );
  context.subscriptions.push(openFileCommand);

  // Register manual refresh command for TreeView
  const refreshCommand = vscode.commands.registerCommand(
    'cascade.refresh',
    async () => {
      if (planningTreeProvider) {
        // Trigger TreeView refresh (now async)
        await planningTreeProvider.refresh();

        // Log to output channel
        const timestamp = new Date().toLocaleTimeString();
        outputChannel.appendLine(`[${timestamp}] REFRESH: Manual refresh triggered by user`);

        // Show confirmation message to user
        vscode.window.showInformationMessage('Cascade TreeView refreshed');
      } else {
        // Provider not initialized (should not happen in normal use)
        vscode.window.showWarningMessage('TreeView provider not initialized');
        outputChannel.appendLine('[ERROR] Manual refresh failed - provider not initialized');
      }
    }
  );
  context.subscriptions.push(refreshCommand);

  // Register cache statistics command
  const showCacheStatsCommand = vscode.commands.registerCommand(
    'cascade.showCacheStats',
    () => {
      logCacheStats(frontmatterCache!, outputChannel);
      outputChannel.show(); // Bring output channel to front
    }
  );
  context.subscriptions.push(showCacheStatsCommand);

  // Register change status command (S63, S66)
  const changeStatusCommandDisposable = vscode.commands.registerCommand(
    'cascade.changeStatus',
    (item?: PlanningTreeItem) => {
      changeStatusCommand(item);
    }
  );
  context.subscriptions.push(changeStatusCommandDisposable);

  // Register create child item command (S64, S66)
  const createChildItemCommandDisposable = vscode.commands.registerCommand(
    'cascade.createChildItem',
    (item?: PlanningTreeItem) => {
      createChildItemCommand(item);
    }
  );
  context.subscriptions.push(createChildItemCommandDisposable);

  // Register utility commands (S65)
  const openFileContextCmd = vscode.commands.registerCommand(
    'cascade.openFileContext',
    (item: PlanningTreeItem) => openFileContextCommand(item)
  );
  context.subscriptions.push(openFileContextCmd);

  const copyItemNumberCmd = vscode.commands.registerCommand(
    'cascade.copyItemNumber',
    (item?: PlanningTreeItem) => copyItemNumberCommand(item)
  );
  context.subscriptions.push(copyItemNumberCmd);

  const revealInExplorerCmd = vscode.commands.registerCommand(
    'cascade.revealInExplorer',
    (item: PlanningTreeItem) => revealInExplorerCommand(item)
  );
  context.subscriptions.push(revealInExplorerCmd);

  // Register toggle archived items command (S77)
  const toggleArchivedCmd = vscode.commands.registerCommand(
    'cascade.toggleArchived',
    () => {
      if (planningTreeProvider) {
        planningTreeProvider.toggleArchivedItems();
      }
    }
  );
  context.subscriptions.push(toggleArchivedCmd);

  // Register view mode toggle command (S87)
  const toggleViewModeCmd = vscode.commands.registerCommand(
    'cascade.toggleViewMode',
    async () => {
      if (!planningTreeProvider) {
        outputChannel.appendLine('[ViewMode] ⚠️  Cannot toggle: TreeProvider not initialized');
        return;
      }

      const currentMode = planningTreeProvider.getViewMode();
      const newMode = currentMode === 'status' ? 'hierarchy' : 'status';

      outputChannel.appendLine(`[ViewMode] Toggle: ${currentMode} → ${newMode}`);

      await planningTreeProvider.setViewMode(newMode);

      // Optional: Show user-friendly notification
      const modeLabel = newMode === 'hierarchy' ? 'Hierarchy View' : 'Status Groups View';
      vscode.window.showInformationMessage(`Cascade: Switched to ${modeLabel}`);

      outputChannel.appendLine(`[ViewMode] ✅ View mode changed successfully`);
    }
  );
  context.subscriptions.push(toggleViewModeCmd);

  // Set up periodic cache statistics logging (every 60 seconds)
  const statsInterval = setInterval(() => {
    if (frontmatterCache) {
      const stats = frontmatterCache.getStats();

      // Only log if cache has been used
      if (stats.hits > 0 || stats.misses > 0) {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[CACHE STATS] ${new Date().toLocaleTimeString()}`);
        outputChannel.appendLine(`  Hits: ${stats.hits} | Misses: ${stats.misses} | Evictions: ${stats.evictions} | Size: ${stats.size}`);

        // Calculate hit rate
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0';
        outputChannel.appendLine(`  Hit rate: ${hitRate}%`);
      }
    }
  }, 60000); // Log every 60 seconds

  // Register interval for cleanup on deactivation
  context.subscriptions.push({
    dispose: () => clearInterval(statsInterval)
  });

  outputChannel.appendLine('✅ Extension features initialized successfully');
  outputChannel.appendLine('');
  outputChannel.appendLine('🔄 Workspace monitoring active (will detect folder changes)');
  outputChannel.appendLine('   💾 Cache invalidation active (file changes tracked)');
  outputChannel.appendLine('');
  outputChannel.appendLine('Available commands:');
  outputChannel.appendLine('  - Cascade: Refresh TreeView (manual refresh)');
  outputChannel.appendLine('  - Cascade: Open File (internal, triggered by TreeView clicks)');
  outputChannel.appendLine('  - Cascade: Show Cache Statistics');
  outputChannel.appendLine('  - Cascade: Change Status (context menu)');
  outputChannel.appendLine('  - Cascade: Create Child Item (context menu)');
  outputChannel.appendLine('  - Cascade: Open File (context menu)');
  outputChannel.appendLine('  - Cascade: Copy Item Number (context menu)');
  outputChannel.appendLine('  - Cascade: Reveal in Explorer (context menu)');
  outputChannel.appendLine('  - Cascade: Toggle Archived Items (command + toolbar button)');
  outputChannel.appendLine('  - Cascade: Toggle View Mode (toolbar + command palette)');
  outputChannel.appendLine('');
  outputChannel.appendLine('Active features:');
  outputChannel.appendLine('  - Cascade TreeView with status-based kanban layout');
  outputChannel.appendLine('  - Drag-and-drop for Stories and Bugs (status transitions)');
  outputChannel.appendLine('  - Context menu actions (Change Status, Create Child, etc.)');
  outputChannel.appendLine('  - Real-time synchronization with external file changes');
  outputChannel.appendLine('  - Keyboard shortcuts for context actions');
  outputChannel.appendLine('  - Planning items loaded from plans/ directory');
  outputChannel.appendLine(SEPARATOR);

  // Log to console as well (visible in Debug Console)
  console.log('Cascade extension activated');
}

/**
 * Called when the extension is deactivated.
 * Cleanup resources here.
 */
export function deactivate() {
  // Clear cache and log statistics
  if (frontmatterCache) {
    const stats = frontmatterCache.getStats();

    if (outputChannel) {
      outputChannel.appendLine('');
      outputChannel.appendLine('--- Cache Statistics (Final) ---');
      outputChannel.appendLine(`Hits: ${stats.hits}`);
      outputChannel.appendLine(`Misses: ${stats.misses}`);
      outputChannel.appendLine(`Evictions: ${stats.evictions}`);
      outputChannel.appendLine(`Final size: ${stats.size}`);

      // Calculate hit rate if there are any requests
      const totalRequests = stats.hits + stats.misses;
      if (totalRequests > 0) {
        const hitRate = ((stats.hits / totalRequests) * 100).toFixed(1);
        outputChannel.appendLine(`Hit rate: ${hitRate}%`);
      }

      outputChannel.appendLine('');
    }

    frontmatterCache.clear();

    if (outputChannel) {
      outputChannel.appendLine('✅ Cache cleared');
    }
  }

  // B1: Clear previousDataStore
  if (previousDataStore) {
    previousDataStore.clear();
    if (outputChannel) {
      outputChannel.appendLine('✅ Previous data store cleared');
    }
  }

  // Dispose TreeView
  if (cascadeTreeView) {
    cascadeTreeView.dispose();
    cascadeTreeView = null;

    if (outputChannel) {
      outputChannel.appendLine('✅ Cascade TreeView disposed');
    }
  }

  // Dispose PlanningTreeProvider
  if (planningTreeProvider) {
    // Provider doesn't need explicit disposal (no resources to clean up)
    // Set to null for consistency
    planningTreeProvider = null;

    if (outputChannel) {
      outputChannel.appendLine('✅ PlanningTreeProvider disposed');
    }
  }

  // Dispose drag-and-drop controller
  if (dragDropController) {
    // Controller doesn't need explicit disposal (no resources to clean up)
    // Set to null for consistency
    dragDropController = null;

    if (outputChannel) {
      outputChannel.appendLine('✅ Drag-and-drop controller disposed');
    }
  }

  if (outputChannel) {
    outputChannel.appendLine('');
    outputChannel.appendLine('👋 Extension deactivated');
    outputChannel.dispose();
  }

  console.log('Cascade extension deactivated');
}

/**
 * Opens a planning file in markdown preview mode.
 *
 * Converts the file path to a URI and displays the file in VSCode's markdown preview
 * (not raw editor). Uses the built-in markdown.showPreview command for a better
 * reading experience with rendered formatting, headers, and links.
 *
 * Handles errors gracefully by logging to output channel and showing user notifications.
 *
 * @param filePath - Absolute path to the markdown file to preview
 * @param outputChannel - Output channel for error logging
 * @returns Promise that resolves when preview is opened (or rejects on error)
 */
export async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Convert file path to VSCode URI (handles Windows/Unix differences)
    const uri = vscode.Uri.file(filePath);

    // Open in markdown preview instead of raw editor
    await vscode.commands.executeCommand('markdown.showPreview', uri);

  } catch (error) {
    // Build error message for user
    const errorMsg = `Failed to open file: ${filePath}`;

    // Log detailed error to output channel
    outputChannel.appendLine(`[ERROR] ${errorMsg}`);
    outputChannel.appendLine(`  ${error}`);

    // Show user notification
    vscode.window.showErrorMessage(errorMsg);
  }
}

/**
 * Get the extension version from package.json.
 */
function getExtensionVersion(): string {
  const extension = vscode.extensions.getExtension('cascade.cascade');
  return extension?.packageJSON?.version ?? 'unknown';
}
