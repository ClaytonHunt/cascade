import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
import { FrontmatterCache } from '../cache';
import { Status, ViewMode } from '../types';
import { HierarchyNode, ItemPathParts } from './HierarchyNode';
import { getTreeItemIcon } from '../statusIcons';
import { StatusPropagationEngine } from './StatusPropagationEngine';
import { isItemArchived } from './archiveUtils';
import { renderStatusBadge } from './badgeRenderer';
import { renderProgressBar } from './progressRenderer';
import { readSpecProgress, SpecProgress } from './specProgressReader';
import { renderSpecPhaseIndicator } from './specPhaseRenderer';
import { formatItemLabel, getTypeLabel } from './labelFormatter';

/**
 * Progress information for a parent item (Epic or Feature).
 *
 * Captures completion statistics and formatted display string
 * for showing progress in TreeView.
 */
export interface ProgressInfo {
  /** Number of completed children */
  completed: number;

  /** Total number of children */
  total: number;

  /** Completion percentage (0-100, rounded) */
  percentage: number;

  /** Formatted display string for TreeItem description */
  display: string;  // e.g., "(3/5)" or "(60%)"
}

/**
 * TreeDataProvider implementation for Cascade planning items.
 *
 * This provider scans the plans/ directory, loads planning items using
 * the frontmatter cache, and provides hierarchical tree structure to VSCode.
 *
 * ## Tree Structure (S54 + S55)
 * - Root level: 6-7 status group nodes (Not Started → Completed [→ Archived])
 * - Status group children: Top-level items (epics + orphans)
 * - Epic children: Features under that epic
 * - Feature children: Stories/Bugs under that feature
 * - Story/Bug children: None (leaf nodes)
 *
 * ## Archive Filtering (S78)
 *
 * Archived items can be shown/hidden via toggle command:
 * - Default: Archived items filtered out (hidden)
 * - Toggle ON: Archived items visible in "Archived" status group
 *
 * Detection methods (S76):
 * - Frontmatter: `status: Archived`
 * - Directory: Items in `plans/archive/` directory
 *
 * Performance optimization:
 * - Archived detection cached per refresh (single pass)
 * - Filter operation < 10ms with 100+ items
 *
 * ## Performance Optimization (S58)
 *
 * ### Three-Tier Caching Strategy
 *
 * **Tier 1: Frontmatter Cache** (external, cache.ts)
 * - Caches parsed frontmatter per file (by file path)
 * - Staleness detection via mtime comparison
 * - Managed by FrontmatterCache singleton
 * - Invalidated automatically on file changes
 *
 * **Tier 2: Items Cache** (this.allItemsCache)
 * - Caches complete list of all planning items (all types, all statuses)
 * - Eliminates redundant file system scans
 * - Single cache for entire workspace (not per-status)
 * - Invalidated on refresh() (file watcher triggers)
 * - Hit rate: > 80% typical (multiple consumers per refresh cycle)
 *
 * **Tier 3: Derived Caches** (hierarchyCache, progressCache)
 * - Built on top of items cache data
 * - Hierarchy cache: Per-status group (6 cache entries max)
 * - Progress cache: Per parent item (epic/feature)
 * - Invalidated on refresh() (shares lifecycle with items cache)
 *
 * ### Data Flow
 * ```
 * File Change → refresh() called
 *   ↓
 * Clear allItemsCache, hierarchyCache, progressCache
 *   ↓
 * TreeView reloads → getChildren() called
 *   ↓
 * loadAllPlanningItems() called
 *   ↓
 * Cache MISS → loadAllPlanningItemsUncached()
 *   ↓
 * File system scan → FrontmatterCache.get() for each file
 *   ↓
 * Cache populated → Subsequent calls return cached data (cache HIT)
 * ```
 *
 * ### Performance Characteristics (100 items)
 * - Initial load: ~200ms (file system scan + parsing)
 * - Cache hit: < 1ms (array reference return)
 * - Status group expansion: < 100ms (hierarchy build from cached items)
 * - Hierarchy expansion: < 50ms (cached hierarchy lookup)
 * - Memory overhead: ~20KB for cached items array
 *
 * ### Cache Invalidation
 * All caches invalidated together on any file change (simple, safe strategy).
 * File watcher uses 300ms debouncing to batch rapid changes (prevents excessive refreshes).
 */
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  /**
   * Storage key for persisting showArchivedItems toggle state (S79).
   *
   * Convention: cascade.<featureName>
   * - Prefix: cascade (extension ID)
   * - Separator: . (dotted namespace)
   * - Name: showArchived (descriptive, matches field name)
   */
  private static readonly STORAGE_KEY_SHOW_ARCHIVED = 'cascade.showArchived';

  /**
   * Storage key for persisting view mode preference (F28).
   *
   * Convention: cascade.<featureName>
   * - Prefix: cascade (extension ID)
   * - Separator: . (dotted namespace)
   * - Name: viewMode (descriptive, matches field name)
   */
  private static readonly STORAGE_KEY_VIEW_MODE = 'cascade.viewMode';

  /**
   * Event emitter for tree data changes.
   * Fires when refresh() is called to notify VSCode to reload tree.
   */
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();

  /**
   * Event that VSCode subscribes to for tree updates.
   */
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   * Cache for hierarchy structures by status.
   *
   * Key: Status value ("Not Started", "Ready", etc.)
   * Value: Array of root-level hierarchy nodes for that status
   *
   * Invalidated when:
   * - File system changes detected (FileSystemWatcher events)
   * - refresh() called explicitly
   *
   * Benefits:
   * - Avoid rebuilding hierarchy on every expand/collapse
   * - Reduce file system reads
   * - Improve TreeView responsiveness
   */
  private hierarchyCache = new Map<Status, HierarchyNode[]>();

  /**
   * Cache for progress calculations by item.
   *
   * Key: Item identifier (e.g., "E4", "F16")
   * Value: Calculated progress information
   *
   * Invalidated when:
   * - File system changes detected (refresh() called)
   * - Hierarchy cache cleared (shares lifecycle)
   *
   * Benefits:
   * - Avoid recalculating progress for visible items
   * - O(1) lookup during getTreeItem() rendering
   * - Minimal memory overhead (~50-100 entries typical)
   */
  private progressCache = new Map<string, ProgressInfo | null>();

  /**
   * Progress cache hit/miss tracking for performance monitoring (S91).
   */
  private progressCacheHits = 0;
  private progressCacheMisses = 0;

  /**
   * Cache for spec progress data (S94).
   * Key: Story item number (e.g., "S75")
   * Value: SpecProgress object from readSpecProgress()
   *
   * Invalidated when:
   * - File system changes detected (refresh() called)
   * - Spec files modified (FileSystemWatcher events)
   *
   * Benefits:
   * - Avoid re-reading spec directories on every TreeView interaction
   * - O(1) lookup during getTreeItem() rendering
   * - Minimal memory overhead (SpecProgress objects are small)
   */
  private specProgressCache = new Map<string, SpecProgress>();

  /**
   * Spec progress cache hit/miss tracking for performance monitoring (S94).
   */
  private specProgressCacheHits = 0;
  private specProgressCacheMisses = 0;

  /**
   * Cache for all planning items loaded from plans/ directory.
   *
   * Key: None (single cache for entire workspace)
   * Value: Array of all planning items (all types, all statuses)
   *
   * Invalidated when:
   * - File system changes detected (refresh() called)
   * - Extension reloads
   *
   * Benefits:
   * - Single file scan per refresh cycle (vs multiple scans)
   * - Shared data source for status groups, filtering, hierarchy
   * - Reduces redundant vscode.workspace.findFiles() calls
   * - Memory overhead: ~20KB for 100 items (negligible)
   *
   * Usage pattern:
   * ```typescript
   * const items = await this.getAllPlanningItems();
   * const filtered = items.filter(item => item.status === 'Ready');
   * ```
   */
  private allItemsCache: PlanningTreeItem[] | null = null;

  /**
   * Engine for automatic status propagation from children to parents.
   *
   * Triggered during refresh() to update parent statuses based on
   * completed children. Ensures frontmatter status fields stay synchronized
   * with actual completion state.
   */
  private propagationEngine: StatusPropagationEngine;

  /**
   * Debounce timer for TreeView refreshes (S72).
   *
   * When multiple file changes occur in rapid succession (e.g., git merge),
   * this timer batches them into a single refresh operation instead of
   * refreshing after every individual file change.
   *
   * The timer is reset on each scheduleRefresh() call, and the actual
   * refresh executes only after the debounce delay elapses with no new calls.
   */
  private refreshDebounceTimer?: NodeJS.Timeout;

  /**
   * Debounce delay in milliseconds for TreeView refreshes (S72).
   *
   * Default: 300ms (balances responsiveness and performance)
   * Configurable via VSCode settings (cascade.refreshDebounceDelay)
   * Range: 0-5000ms (0 disables debouncing)
   */
  private debounceDelay: number = 300;

  /**
   * Controls visibility of archived items in TreeView (S77).
   *
   * When false (default), archived items are filtered out.
   * When true, archived items are shown in TreeView.
   *
   * State is session-scoped (lost on reload) until S79 implements persistence.
   *
   * Used by:
   * - S78 (Archive Filtering): Filter logic checks this flag
   * - S77 (Toggle Command): toggleArchivedItems() method flips this flag
   * - S79 (Persistence): Will read/write this from VSCode memento
   */
  private showArchivedItems: boolean = false;

  /**
   * Current TreeView display mode (F28).
   *
   * Controls whether TreeView displays items grouped by status or
   * organized by hierarchy (P→E→F→S structure).
   *
   * - 'status': Status-grouped view (current default behavior)
   * - 'hierarchy': Hierarchy view (P→E→F→S structure, F28 default)
   *
   * State persists across VSCode sessions via workspace storage.
   * Default: 'hierarchy' (aligns with ChatGPT reference design)
   */
  private viewMode: ViewMode;

  /**
   * Creates a new PlanningTreeProvider.
   *
   * Initializes the provider with workspace state storage for persisting
   * toggle preferences (e.g., showArchivedItems) across VSCode sessions.
   *
   * @param workspaceRoot - Absolute path to workspace root directory
   * @param cache - FrontmatterCache instance for parsing files
   * @param outputChannel - Output channel for logging
   * @param workspaceState - Workspace state storage for persisting toggle preferences (S79)
   */
  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel,
    private workspaceState: vscode.Memento
  ) {
    // Initialize propagation engine
    this.propagationEngine = new StatusPropagationEngine(
      workspaceRoot,
      cache,
      outputChannel
    );

    // Initialize debounce delay from VSCode configuration (S72 Phase 2)
    const config = vscode.workspace.getConfiguration('cascade');
    this.debounceDelay = config.get<number>('refreshDebounceDelay', 300);
    this.outputChannel.appendLine(`[TreeView] Debounce delay: ${this.debounceDelay}ms`);

    // Restore toggle state from workspace storage (S79)
    // Default to false if no saved state exists (first run)
    this.showArchivedItems = workspaceState.get<boolean>(
      PlanningTreeProvider.STORAGE_KEY_SHOW_ARCHIVED,
      false
    );
    this.outputChannel.appendLine(
      `[Archive] Initialized toggle state: ${this.showArchivedItems} (from workspace storage)`
    );

    // Load view mode from workspace state (F28)
    // Default to 'hierarchy' to match ChatGPT reference design
    this.viewMode = this.workspaceState.get<ViewMode>(
      PlanningTreeProvider.STORAGE_KEY_VIEW_MODE,
      'hierarchy'
    );

    // Validate loaded value (defensive programming)
    if (!this.isValidViewMode(this.viewMode)) {
      this.outputChannel.appendLine(
        `[ViewMode] ⚠️  Invalid stored value: ${this.viewMode}, resetting to 'hierarchy'`
      );
      this.viewMode = 'hierarchy';
      // Persist corrected value back to workspace state
      this.workspaceState.update(PlanningTreeProvider.STORAGE_KEY_VIEW_MODE, 'hierarchy');
    }

    this.outputChannel.appendLine(`[ViewMode] Initialized to: ${this.viewMode}`);

    // Log progress cache statistics every 60 seconds (S91)
    setInterval(() => {
      const total = this.progressCacheHits + this.progressCacheMisses;
      if (total > 0) {
        const hitRate = (this.progressCacheHits / total * 100).toFixed(1);
        this.outputChannel.appendLine(
          `[ProgressCache] Hit rate: ${hitRate}% (${this.progressCacheHits}/${total})`
        );
      }
    }, 60000);

    // Log spec progress cache statistics every 60 seconds (S94)
    setInterval(() => {
      const total = this.specProgressCacheHits + this.specProgressCacheMisses;
      if (total > 0) {
        const hitRate = (this.specProgressCacheHits / total * 100).toFixed(1);
        this.outputChannel.appendLine(
          `[SpecProgressCache] Hit rate: ${hitRate}% (${this.specProgressCacheHits}/${total})`
        );
      }
    }, 60000);
  }

  /**
   * Schedules a debounced TreeView refresh (S72).
   *
   * When multiple file changes occur in rapid succession (e.g., git merge),
   * this method batches them into a single refresh operation instead of
   * refreshing after every individual file change.
   *
   * Each call to scheduleRefresh() resets the debounce timer. The actual
   * refresh executes only after the debounce delay elapses with no new calls.
   *
   * Use Case Examples:
   * - File change events from FileSystemWatcher (S71)
   * - Batch operations (git merge, search-and-replace)
   * - Auto-save with rapid edits
   *
   * For immediate refreshes (user-initiated), use refresh() instead.
   *
   * @see refresh() - Immediate refresh that bypasses debounce
   */
  scheduleRefresh(): void {
    // Clear existing timer if present (reset debounce window)
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Refresh debounced (timer reset)');
    }

    // Handle delay=0 case (immediate refresh, no debouncing)
    if (this.debounceDelay === 0) {
      this.outputChannel.appendLine('[TreeView] Debounce disabled (delay=0), refreshing immediately');
      this.refresh();
      return;
    }

    // Start new debounce timer
    this.refreshDebounceTimer = setTimeout(() => {
      this.outputChannel.appendLine('[TreeView] Debounce timer expired, executing refresh');
      this.refresh();
      this.refreshDebounceTimer = undefined; // Clear timer reference
    }, this.debounceDelay);

    this.outputChannel.appendLine(`[TreeView] Refresh scheduled in ${this.debounceDelay}ms`);
  }

  /**
   * Schedules a partial TreeView refresh (single item updated) (S73).
   *
   * When only content fields change (title, priority), this method
   * refreshes only the specific item instead of rebuilding the entire tree.
   *
   * Uses the same debounce mechanism as full refresh (S72).
   *
   * @param item - Specific TreeNode to refresh
   */
  schedulePartialRefresh(item: TreeNode): void {
    // Clear existing timer if present (reset debounce window)
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Partial refresh debounced (timer reset)');
    }

    // Handle delay=0 case (immediate refresh)
    if (this.debounceDelay === 0) {
      this.outputChannel.appendLine('[TreeView] Debounce disabled (delay=0), refreshing immediately');
      this.refreshPartial(item);
      return;
    }

    // Start new debounce timer
    this.refreshDebounceTimer = setTimeout(() => {
      this.outputChannel.appendLine('[TreeView] Debounce timer expired, executing partial refresh');
      this.refreshPartial(item);
      this.refreshDebounceTimer = undefined;
    }, this.debounceDelay);

    const label = 'label' in item ? item.label : item.status;
    this.outputChannel.appendLine(
      `[TreeView] Partial refresh scheduled in ${this.debounceDelay}ms: ${label}`
    );
  }

  /**
   * Immediately refreshes a specific TreeView item (bypasses debounce) (S73).
   *
   * Fires _onDidChangeTreeData event with specific item, causing VSCode
   * to refresh only that item's TreeItem representation.
   *
   * Note: This does NOT rebuild hierarchy or clear caches. Only the
   * TreeItem label/icon/description is updated for the specific item.
   *
   * @param item - Specific TreeNode to refresh
   */
  refreshPartial(item: TreeNode): void {
    // Cancel any pending debounced refresh
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
      this.outputChannel.appendLine('[TreeView] Pending debounced refresh cancelled (manual partial refresh)');
    }

    const label = 'label' in item ? item.label : item.status;
    this.outputChannel.appendLine(`[TreeView] Refreshing TreeView (partial: ${label})...`);

    // Invalidate cache for specific item (will re-parse on next getTreeItem)
    if ('filePath' in item && item.filePath) {
      this.cache.invalidate(item.filePath);
      this.outputChannel.appendLine(`[TreeView] Cache invalidated: ${item.filePath}`);
    }

    // Fire change event for specific item (VSCode will call getTreeItem for this item)
    this._onDidChangeTreeData.fire(item);
    this.outputChannel.appendLine('[TreeView] Partial refresh complete');
  }

  /**
   * Finds a TreeNode by file path (S73).
   *
   * Searches through all loaded planning items to find the item
   * matching the specified file path.
   *
   * Used by selective refresh to locate the specific item to update.
   *
   * @param filePath - Absolute file path to search for
   * @returns TreeNode if found, undefined otherwise
   */
  async findItemByPath(filePath: string): Promise<PlanningTreeItem | undefined> {
    // Load all items from cache (will use cached data if available)
    const items = await this.loadAllPlanningItems();

    // Find item with matching file path
    const item = items.find(item => item.filePath === filePath);

    if (item) {
      this.outputChannel.appendLine(`[TreeView] Found item by path: ${item.item} - ${item.title}`);
    } else {
      this.outputChannel.appendLine(`[TreeView] ⚠️  Item not found for path: ${filePath}`);
    }

    return item;
  }

  /**
   * Updates debounce delay from configuration changes (S72 Phase 2).
   *
   * Called by configuration change listener when user modifies
   * cascade.refreshDebounceDelay setting. Allows delay changes
   * to take effect immediately without reloading extension.
   *
   * Note: If a debounce timer is currently active, it continues
   * with the old delay. The new delay applies to subsequent
   * scheduleRefresh() calls.
   *
   * @param newDelay - New debounce delay in milliseconds (0-5000)
   */
  updateDebounceDelay(newDelay: number): void {
    const oldDelay = this.debounceDelay;

    // Validate delay value (defensive programming)
    if (newDelay < 0) {
      this.outputChannel.appendLine(
        `[TreeView] Invalid debounce delay (${newDelay}ms), using 0ms instead`
      );
      newDelay = 0;
    }
    if (newDelay > 5000) {
      this.outputChannel.appendLine(
        `[TreeView] Warning: Debounce delay (${newDelay}ms) exceeds recommended maximum (5000ms)`
      );
    }

    this.debounceDelay = newDelay;

    this.outputChannel.appendLine(
      `[TreeView] Debounce delay updated: ${oldDelay}ms → ${newDelay}ms`
    );

    // Log special cases
    if (newDelay === 0) {
      this.outputChannel.appendLine('[TreeView] Debouncing disabled (delay=0), refreshes will be immediate');
    }
    if (newDelay > 1000) {
      this.outputChannel.appendLine(
        `[TreeView] High debounce delay (${newDelay}ms) may increase latency for file changes`
      );
    }
  }

  /**
   * Toggles visibility of archived items in TreeView (S77).
   *
   * Flips the showArchivedItems flag and triggers full refresh
   * to rebuild status groups with new filter.
   *
   * Triggered by:
   * - Command Palette: "Cascade: Toggle Archived Items"
   * - TreeView toolbar button (archive icon)
   *
   * Output channel logs state change for debugging.
   *
   * Enhanced in S79: Persists toggle state to workspace storage.
   */
  toggleArchivedItems(): void {
    this.showArchivedItems = !this.showArchivedItems;

    const state = this.showArchivedItems ? 'visible' : 'hidden';
    this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

    // Persist state to workspace storage (S79)
    this.workspaceState.update(
      PlanningTreeProvider.STORAGE_KEY_SHOW_ARCHIVED,
      this.showArchivedItems
    ).then(
      () => {
        this.outputChannel.appendLine(
          `[Archive] Persisted toggle state: ${this.showArchivedItems}`
        );
      },
      (error) => {
        // Log error but don't fail (graceful degradation)
        this.outputChannel.appendLine(
          `[Archive] Warning: Failed to persist toggle state: ${error}`
        );
      }
    );

    // Trigger full refresh to rebuild tree with new filter
    this.refresh();
  }

  /**
   * Validates if a view mode value is valid (F28).
   *
   * Helper method for defensive validation in constructor and setViewMode.
   *
   * @param mode - Value to validate
   * @returns true if mode is 'status' or 'hierarchy', false otherwise
   */
  private isValidViewMode(mode: any): mode is ViewMode {
    return mode === 'status' || mode === 'hierarchy';
  }

  /**
   * Gets the current TreeView display mode (F28).
   *
   * Used by:
   * - S86: getChildren() to determine display logic (status groups vs hierarchy)
   * - S87: Toolbar button to show current mode state
   * - Future features: Any component needing to inspect view mode
   *
   * @returns Current view mode ('status' or 'hierarchy')
   */
  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  /**
   * Sets the TreeView display mode and persists to workspace state (F28).
   *
   * This method:
   * 1. Validates the new mode value (must be 'status' or 'hierarchy')
   * 2. Updates the internal viewMode state
   * 3. Persists the change to workspace state for session persistence
   * 4. Triggers a TreeView refresh to rebuild with new mode
   *
   * Called by:
   * - S87: Toolbar button handler (user toggles view mode)
   * - Future features: Programmatic view mode changes
   *
   * @param mode - View mode to set ('status' or 'hierarchy')
   */
  public async setViewMode(mode: ViewMode): Promise<void> {
    // Validate mode (defensive programming)
    if (!this.isValidViewMode(mode)) {
      this.outputChannel.appendLine(
        `[ViewMode] ⚠️  Invalid mode: ${mode}, ignoring setViewMode() call`
      );
      return; // Early return, no state change
    }

    // Check if mode actually changed (avoid unnecessary refresh)
    if (this.viewMode === mode) {
      this.outputChannel.appendLine(
        `[ViewMode] Mode already set to: ${mode}, skipping update`
      );
      return; // Early return, no state change
    }

    // Update internal state
    const oldMode = this.viewMode;
    this.viewMode = mode;

    // Persist to workspace state (async operation)
    try {
      await this.workspaceState.update(
        PlanningTreeProvider.STORAGE_KEY_VIEW_MODE,
        mode
      );
      this.outputChannel.appendLine(`[ViewMode] Persisted to workspace state: ${mode}`);
    } catch (error) {
      // Log error but don't fail (graceful degradation)
      this.outputChannel.appendLine(
        `[ViewMode] ⚠️  Failed to persist to workspace state: ${error}`
      );
      // Continue with refresh despite persistence failure
    }

    // Log mode change
    this.outputChannel.appendLine(`[ViewMode] Switched: ${oldMode} → ${mode}`);

    // Trigger TreeView refresh to apply new display mode
    // This will cause VSCode to call getChildren() again,
    // which will use the new viewMode value (S86)
    this.refresh();
  }

  /**
   * Refreshes the tree view by firing change event.
   * Causes VSCode to call getChildren() again to reload data.
   * Also clears all caches to reflect file system changes.
   *
   * Cache invalidation order (dependency chain):
   * 1. Items cache (root data source)
   * 2. Hierarchy cache (built from items)
   * 3. Progress cache (built from hierarchy)
   *
   * Enhanced in S59: Triggers status propagation before TreeView refresh
   * to ensure parent statuses are up-to-date when tree renders.
   *
   * Enhanced in S72: Cancels pending debounced refreshes to ensure immediate
   * refresh for user-initiated actions (manual refresh command, button click).
   *
   * Enhanced in S73: Full refresh for STRUCTURE changes. For CONTENT changes,
   * use refreshPartial() instead for better performance.
   *
   * Enhanced in S91: Progress cache infrastructure (buildProgressCache)
   * enables eager progress calculation after hierarchy construction.
   *
   * Enhanced in S92: Progress cache integration with status propagation.
   * Ensures progress bars update correctly when child statuses change.
   *
   * **Refresh Flow (S92)**:
   * 1. Clear all caches (items, hierarchy, progress)
   * 2. Reload items and rebuild hierarchy
   * 3. Run status propagation (may update parent frontmatter)
   * 4. Clear caches again (handle propagation-modified files)
   * 5. Fire TreeView refresh event
   * 6. TreeView calls getChildren() → getHierarchyForStatus()
   * 7. First status group triggers buildProgressCache() (S91)
   * 8. Progress cache populated for all parent items
   *
   * **Cache Lifecycle (S92)**:
   * - progressCache.clear() called TWICE per refresh:
   *   1. Before propagation (line ~690): Prepare for propagation
   *   2. After propagation (line ~710): Handle propagation changes
   * - buildProgressCache() rebuilds on next getHierarchyForStatus() call
   *
   * All caches cleared together (simple, safe strategy).
   * File watcher debouncing (300ms) prevents excessive refresh calls.
   */
  async refresh(): Promise<void> {
    // Cancel any pending debounced refresh (if user manually refreshed)
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
      this.outputChannel.appendLine('[TreeView] Pending debounced refresh cancelled (manual refresh)');
    }

    // Clear items cache first (forces reload on next access)
    this.allItemsCache = null;
    this.outputChannel.appendLine('[ItemsCache] Cache cleared');

    // Clear hierarchy cache (depends on items data)
    this.hierarchyCache.clear();
    this.outputChannel.appendLine('[Hierarchy] Cache cleared');

    // Clear progress cache (depends on hierarchy data)
    this.progressCache.clear();
    this.outputChannel.appendLine('[Progress] Cache cleared');

    // Clear spec progress cache (S94)
    this.clearSpecProgressCache();

    // Trigger status propagation before TreeView refresh
    // This ensures parent statuses are up-to-date when tree renders
    try {
      // Load items and hierarchy (will repopulate caches)
      const items = await this.loadAllPlanningItems();

      // Build full hierarchy across all statuses for propagation
      const fullHierarchy = this.buildHierarchy(items);

      // Run propagation (may update parent frontmatter files)
      await this.propagationEngine.propagateStatuses(items, fullHierarchy);

      // S92: Log propagation completion for debugging
      this.outputChannel.appendLine('[PROPAGATE] Status propagation completed');

      // Clear caches again (propagation may have changed files)
      this.allItemsCache = null;
      this.hierarchyCache.clear();
      this.progressCache.clear();

      // S92: Enhanced logging for post-propagation cache clearing
      this.outputChannel.appendLine('[ItemsCache] Cache cleared (post-propagation)');
      this.outputChannel.appendLine('[Hierarchy] Cache cleared (post-propagation)');
      this.outputChannel.appendLine('[Progress] Cache cleared (post-propagation)');
      this.clearSpecProgressCache(); // S94: Clear again after propagation
      this.outputChannel.appendLine('[SpecProgressCache] Cache cleared (post-propagation)');

    } catch (error) {
      this.outputChannel.appendLine(`[PROPAGATE] ❌ Error during propagation: ${error}`);
      // Continue with refresh even if propagation fails (non-blocking)
    }

    // S92: Log before firing TreeView refresh event
    this.outputChannel.appendLine('[TreeView] Firing TreeView refresh event');

    // Notify VSCode to reload tree
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Converts TreeNode to VSCode TreeItem for display.
   *
   * Handles two node types:
   * - StatusGroupNode: Renders as collapsible folder with count badge
   * - PlanningTreeItem: Renders with type icon, status, tooltip, and click command
   *
   * For parent items (Epic, Feature, Project), calculates and displays Unicode
   * progress bars showing completion percentage of child items (S90).
   * Example: "$(sync) In Progress █████░░░░░ 50% (3/6)"
   *
   * Progress bar integration (S90):
   * - Uses calculateProgress() for child counting (S88)
   * - Uses renderProgressBar() for Unicode bar generation (S89)
   * - Format: "{statusBadge} {progressBar}" with space separator
   * - Leaf items (Story, Bug) show status badge only (no progress bar)
   *
   * Configures all TreeItem properties including label, icon, tooltip,
   * collapsible state, and command for click handling (S51).
   *
   * @param element - The tree node to convert (status group or planning item)
   * @returns VSCode TreeItem with all properties configured
   */
  async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
    // Handle status group nodes
    if (element.type === 'status-group') {
      const statusGroup = element as StatusGroupNode;

      // Create TreeItem with label (includes count badge)
      const treeItem = new vscode.TreeItem(
        statusGroup.label,
        statusGroup.collapsibleState
      );

      // Set folder icon for status groups
      treeItem.iconPath = new vscode.ThemeIcon('folder');

      // Set context value for context menu filtering (future use)
      treeItem.contextValue = 'status-group';

      // No command assignment (status groups aren't clickable/openable)
      // No resourceUri (not backed by file)

      return treeItem;
    }

    // Existing logic for PlanningTreeItem continues below...
    // Format label with type prefix: "Type # - Title"
    // Examples: "Epic E4 - Planning Kanban View", "Story S49 - TreeDataProvider Core Implementation"
    const labelText = formatItemLabel(element);

    // Calculate type prefix range for future highlighting (S102)
    const typeLabel = getTypeLabel(element.type);
    const highlightRanges: [number, number][] = [
      [0, typeLabel.length]  // Highlight "Story" in "Story S75 - Title"
    ];

    // Create TreeItemLabel object (interface, not constructor)
    const label: vscode.TreeItemLabel = {
      label: labelText,
      highlights: highlightRanges
    };

    // Determine collapsible state (parent items collapse, leaf items don't)
    const collapsibleState = this.getCollapsibleState(element);

    // Create TreeItem with TreeItemLabel
    const treeItem = new vscode.TreeItem(label, collapsibleState);

    // Set icon based on archived status or item status (S57, S80)
    // Archived items use archive icon regardless of status field
    const effectiveStatus = isItemArchived(element) ? 'Archived' : element.status;
    treeItem.iconPath = getTreeItemIcon(effectiveStatus);

    // Set resourceUri for file association (enables click handling)
    treeItem.resourceUri = vscode.Uri.file(element.filePath);

    // Set tooltip with comprehensive metadata
    treeItem.tooltip = await this.buildTooltip(element);

    // Set description (shows after label, dimmed)
    // Generate status badge using effective status from above (S82)
    const statusBadge = renderStatusBadge(effectiveStatus);

    // For Epic/Feature/Project: Include progress indicator if children exist
    if (element.type === 'epic' || element.type === 'feature' || element.type === 'project') {
      // Calculate progress for parent items
      const progress = await this.calculateProgress(element);

      if (progress) {
        // Has children - show status badge with progress bar (S90)
        const progressBar = renderProgressBar(progress);  // S89: Unicode bar generation
        treeItem.description = `${statusBadge} ${progressBar}`;
        // Example: "$(sync) In Progress █████░░░░░ 50% (3/5)"
      } else {
        // No children - show status badge only
        treeItem.description = statusBadge;
        // Example: "$(circle-filled) Ready"
      }
    } else {
      // Leaf items (story, bug)
      // For stories with specs, append phase indicator (S95)
      if (element.type === 'story' && element.spec) {
        // Get spec progress from cache (S94)
        const specProgress = await this.getSpecProgressCached(element);

        if (specProgress) {
          // Render spec phase indicator (S95)
          const phaseIndicator = renderSpecPhaseIndicator(specProgress);

          // Combine status badge with phase indicator
          // Example: "In Progress 📋 ↻ Phase 2/3"
          treeItem.description = `${statusBadge} ${phaseIndicator}`;
        } else {
          // Spec field present but spec directory not found/invalid
          // Show badge only (no indicator)
          treeItem.description = statusBadge;
        }
      } else {
        // Bug items or stories without specs - show status badge only
        treeItem.description = statusBadge;
      }
    }

    // Set context value for context menu filtering (used in F19)
    // Enables type-specific menu items via "when": "viewItem == [type]"
    treeItem.contextValue = element.type;

    // Assign command for click handling (S51)
    treeItem.command = {
      command: 'cascade.openFile',
      title: 'Open File',
      arguments: [element.filePath]
    };

    return treeItem;
  }

  /**
   * Gets spec progress for a story, using cache if available (S94).
   *
   * This method wraps readSpecProgress() with a caching layer to avoid
   * redundant file system reads when the same story's progress is requested
   * multiple times during a TreeView refresh cycle.
   *
   * Cache flow:
   * 1. Check if story item exists in cache (cache hit → return cached value)
   * 2. If not cached (cache miss → call readSpecProgress())
   * 3. Store result in cache (if non-null)
   * 4. Return result
   *
   * @param item - Planning tree item (must be a story with spec field)
   * @returns SpecProgress if spec exists, null if no spec or invalid
   */
  private async getSpecProgressCached(
    item: PlanningTreeItem
  ): Promise<SpecProgress | null> {
    // Check cache first
    if (this.specProgressCache.has(item.item)) {
      this.specProgressCacheHits++;
      this.outputChannel.appendLine(
        `[SpecProgressCache] Cache HIT for ${item.item}`
      );
      return this.specProgressCache.get(item.item)!;
    }

    // Cache miss - read from filesystem
    this.specProgressCacheMisses++;
    this.outputChannel.appendLine(
      `[SpecProgressCache] Cache MISS for ${item.item}, reading from filesystem...`
    );

    // Check if story has spec field in frontmatter
    if (!item.spec) {
      // No spec field → return null (not an error, just no spec)
      return null;
    }

    // Build absolute path to spec directory
    const specDir = path.join(this.workspaceRoot, item.spec);

    // Read spec progress (delegates to S93 utility)
    const progress = await readSpecProgress(specDir, item.status);

    if (progress !== null) {
      // Store in cache for future lookups
      this.specProgressCache.set(item.item, progress);
      this.outputChannel.appendLine(
        `[SpecProgressCache] Cached progress for ${item.item}: ${progress.completedPhases}/${progress.totalPhases}`
      );
    } else {
      this.outputChannel.appendLine(
        `[SpecProgressCache] No valid spec found for ${item.item}`
      );
    }

    return progress;
  }

  /**
   * Invalidates spec progress cache entry for a specific story (S94).
   *
   * Called when:
   * - Spec plan.md file is modified (FileSystemWatcher event)
   * - Phase task file is modified (FileSystemWatcher event)
   * - Manual cache invalidation needed
   *
   * Selective invalidation preserves cache hits for unmodified specs.
   *
   * @param storyItem - Story item number (e.g., "S75")
   */
  invalidateSpecProgress(storyItem: string): void {
    const hadEntry = this.specProgressCache.has(storyItem);

    this.specProgressCache.delete(storyItem);

    if (hadEntry) {
      this.outputChannel.appendLine(
        `[SpecProgressCache] Invalidated cache for ${storyItem}`
      );
    } else {
      this.outputChannel.appendLine(
        `[SpecProgressCache] No cache entry to invalidate for ${storyItem}`
      );
    }
  }

  /**
   * Clears entire spec progress cache (S94).
   *
   * Called during refresh() to clear all cached spec progress data
   * along with other caches (items cache, hierarchy cache, progress cache).
   *
   * Also resets hit/miss counters to prepare for new refresh cycle.
   */
  private clearSpecProgressCache(): void {
    const size = this.specProgressCache.size;

    this.specProgressCache.clear();
    // Note: Do NOT reset hit/miss counters here - they accumulate across
    // refresh cycles for performance monitoring (logged every 60s)

    this.outputChannel.appendLine(
      `[SpecProgressCache] Cache cleared (${size} entries removed)`
    );
  }

  /**
   * Returns child elements for the tree.
   *
   * Tree structure with hierarchy (S55):
   * - Root level (element = undefined): Returns 6 status group nodes
   * - Status group level (element = StatusGroupNode): Returns top-level items in hierarchy (epics + orphans)
   * - Epic level (element = epic PlanningTreeItem): Returns child features
   * - Feature level (element = feature PlanningTreeItem): Returns child stories/bugs
   * - Story/Bug level: Returns empty array (leaf nodes)
   *
   * Hierarchy is built using directory structure parsed from file paths.
   * Items are cached per status group to avoid rebuilding on every interaction.
   *
   * @param element - Parent element (undefined for root)
   * @returns Array of child nodes (status groups, or planning items)
   */
  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    // Root level: Check view mode (F28)
    if (!element) {
      if (this.viewMode === 'status') {
        // Status-grouped view (existing behavior)
        this.outputChannel.appendLine('[getChildren] Using status view mode');
        return await this.getStatusGroups();
      } else {
        // Hierarchy view (F28 - NEW)
        this.outputChannel.appendLine('[getChildren] Using hierarchy view mode');
        return await this.getHierarchyRoot();
      }
    }

    // Status group expanded: Return top-level items in hierarchy
    if (element.type === 'status-group') {
      const statusGroup = element as StatusGroupNode;

      // Enhanced logging for debugging (F22)
      this.outputChannel.appendLine(`[getChildren] Status group expanded: "${statusGroup.status}" (count: ${statusGroup.count})`);

      const hierarchy = await this.getHierarchyForStatus(statusGroup.status);

      // Enhanced logging for debugging (F22)
      const childCount = hierarchy.length;
      this.outputChannel.appendLine(`[getChildren] Returning ${childCount} root items for "${statusGroup.status}" group`);

      // Return root-level items (epics + orphans)
      return hierarchy.map(node => node.item);
    }

    // Planning item expanded: Return children based on type
    const item = element as PlanningTreeItem;

    if (item.type === 'project' || item.type === 'epic' || item.type === 'feature') {
      // Parent item - return children from hierarchy
      return await this.getChildrenForItem(item);
    }

    // Leaf item (story, bug, spec, phase) - no children
    return [];
  }

  /**
   * Generates status group nodes for the root level of the tree.
   *
   * Creates 6-7 status groups ordered by workflow progression:
   * Not Started → In Planning → Ready → In Progress → Blocked → Completed [→ Archived]
   *
   * The "Archived" status group appears conditionally:
   * - Shown when `showArchivedItems` flag is ON
   * - Hidden when flag is OFF
   * - Only included if archived items exist (never shows "Archived (0)")
   *
   * Archive filtering (S78):
   * - Archived items excluded from standard status groups (unless toggle ON)
   * - Archived items appear ONLY in "Archived" group (when visible)
   * - Detection via `isItemArchived()` from S76
   *
   * Performance optimization:
   * - Archived detection cached (single pass over items)
   * - Filter operation < 10ms with 100+ items
   *
   * @returns Array of status group nodes (6-7 groups depending on toggle state)
   */
  private async getStatusGroups(): Promise<StatusGroupNode[]> {
    const startTime = Date.now();

    // Define status order (workflow progression)
    const statuses: Status[] = [
      'Not Started',
      'In Planning',
      'Ready',
      'In Progress',
      'Blocked',
      'Completed'
    ];

    // Add Archived status ONLY when showArchivedItems flag is ON
    // This makes the Archived status group conditional (appears/disappears with toggle)
    if (this.showArchivedItems) {
      statuses.push('Archived');
      this.outputChannel.appendLine('[Archive] Including Archived status group');
    } else {
      this.outputChannel.appendLine('[Archive] Excluding Archived status group (toggle OFF)');
    }

    // Load all planning items once for efficient filtering
    // Reuses existing loadAllPlanningItems() logic to avoid duplication
    const allItems = await this.loadAllPlanningItems();

    // Performance optimization: Cache archived detection results
    // This avoids redundant isItemArchived() calls during filtering
    // With 100 items and 7 statuses: 700 calls → 100 calls (7x speedup)
    const archivedCache = new Map<string, boolean>();
    for (const item of allItems) {
      archivedCache.set(item.item, isItemArchived(item));
    }

    this.outputChannel.appendLine(
      `[Archive] Cached archived status for ${archivedCache.size} items`
    );

    // Build status group for each status
    const groups: StatusGroupNode[] = [];

    for (const status of statuses) {
      let itemsInStatus: PlanningTreeItem[];
      let count: number;

      // Special handling for Archived status group
      if (status === 'Archived') {
        // Include ALL items where isItemArchived() returns true
        // This includes:
        // - Items with status: Archived (any directory)
        // - Items in plans/archive/ directory (any status)
        itemsInStatus = allItems.filter(item => archivedCache.get(item.item) === true);
        count = itemsInStatus.length;

        // Only add Archived status group if archived items exist
        // This prevents "Archived (0)" from appearing when no items are archived
        if (count === 0) {
          this.outputChannel.appendLine('[Archive] No archived items found, skipping Archived status group');
          continue; // Skip to next status (don't push group)
        }

        this.outputChannel.appendLine(`[Archive] Archived status group: ${count} items`);

        // Create status group node (Archived group collapsed by default)
        groups.push({
          type: 'status-group',
          status: status,
          label: `${status} (${count})`,
          count: count,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });

        continue; // Skip normal group push below
      } else {
        // Normal status group - filter by status AND exclude archived items
        itemsInStatus = allItems.filter(item => {
          // Item must match this status
          const matchesStatus = item.status === status;

          // Check if item is archived (cache lookup)
          const isArchived = archivedCache.get(item.item) === true;

          // Include item if:
          // - Matches status AND
          // - Item is NOT archived (archived items only appear in "Archived" group)
          const includeItem = matchesStatus && !isArchived;

          return includeItem;
        });
        count = itemsInStatus.length;

        // Log filtered archived items for debugging
        if (!this.showArchivedItems) {
          const archivedInStatus = allItems.filter(item => item.status === status && archivedCache.get(item.item) === true);
          if (archivedInStatus.length > 0) {
            this.outputChannel.appendLine(
              `[Archive] Filtered ${archivedInStatus.length} archived items from "${status}" status group`
            );
          }
        }

        // Create status group node
        groups.push({
          type: 'status-group',
          status: status,
          label: `${status} (${count})`,
          count: count,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded
        });
      }
    }

    const duration = Date.now() - startTime;

    // Calculate summary stats
    const totalItems = allItems.length;
    const archivedCount = Array.from(archivedCache.values()).filter(v => v).length;
    const visibleCount = totalItems - (this.showArchivedItems ? 0 : archivedCount);

    this.outputChannel.appendLine(
      `[StatusGroups] Built ${groups.length} status groups in ${duration}ms (${totalItems} items scanned)`
    );

    if (archivedCount > 0) {
      this.outputChannel.appendLine(
        `[Archive] Summary: ${archivedCount} archived items (${visibleCount} visible in TreeView)`
      );
    }

    return groups;
  }

  /**
   * Gets root-level nodes for hierarchy view (F28).
   *
   * Returns the top-most items in the planning hierarchy:
   * - Projects (type: 'project')
   * - Orphan Epics (no parent Project via dependencies)
   * - Orphan Features (no parent Epic directory)
   * - Orphan Stories/Bugs (no parent Feature directory)
   *
   * This method powers the hierarchy view mode where items are
   * organized by parent-child relationships (P→E→F→S) instead of status groups.
   *
   * ## Hierarchy Structure
   *
   * ```
   * Root Level:
   * ├─ P1 - Lineage RPG Game Systems
   * │  ├─ E1 - Character Movement System (attached via dependencies)
   * │  └─ E2 - Testing System (attached via dependencies)
   * ├─ E3 - Orphan Epic (no project dependency)
   * ├─ F10 - Orphan Feature (no parent epic directory)
   * └─ S99 - Orphan Story (no parent feature directory)
   * ```
   *
   * ## Archive Filtering (S78)
   *
   * Archived items are excluded unless `showArchivedItems` toggle is ON:
   * - Uses existing `isItemArchived()` utility for detection
   * - Filters items BEFORE building hierarchy (efficient)
   * - Detection methods: `status: Archived` OR `/archive/` directory
   *
   * ## Performance
   *
   * - Reuses existing items cache (no additional file reads)
   * - O(n) hierarchy building where n = number of items
   * - Typical execution time < 100ms with 100+ items
   * - Logs hierarchy statistics to output channel for monitoring
   *
   * @returns Array of root-level tree nodes (Projects + orphans)
   */
  private async getHierarchyRoot(): Promise<TreeNode[]> {
    const startTime = Date.now();

    // Load all planning items (from cache)
    const allItems = await this.loadAllPlanningItems();

    // Filter archived items if toggle is OFF (S78)
    let filteredItems = allItems;
    if (!this.showArchivedItems) {
      const beforeCount = allItems.length;
      filteredItems = allItems.filter(item => !isItemArchived(item));
      const archivedCount = beforeCount - filteredItems.length;

      if (archivedCount > 0) {
        this.outputChannel.appendLine(
          `[Hierarchy] Filtered ${archivedCount} archived items (toggle OFF)`
        );
      }
    } else {
      this.outputChannel.appendLine(
        `[Hierarchy] Including archived items (toggle ON)`
      );
    }

    // Build hierarchy from filtered items
    // buildHierarchy() now handles Projects (Phase 1)
    const hierarchy = this.buildHierarchy(filteredItems);

    // Calculate duration
    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(
      `[Hierarchy] Built hierarchy with ${hierarchy.length} root nodes in ${duration}ms`
    );

    // Log performance warning if threshold exceeded
    if (duration > 100) {
      this.outputChannel.appendLine(
        `[Hierarchy] ⚠️  Performance warning: Root build exceeded 100ms threshold (${duration}ms)`
      );
    }

    // Return root-level items
    // buildHierarchy() returns HierarchyNode[], we need TreeNode[] (which is the item field)
    return hierarchy.map(node => node.item);
  }

  /**
   * Filters planning items by status.
   *
   * Returns all items that match the specified status value.
   * Used when expanding a status group node to show its children.
   *
   * @param status - The status to filter by (e.g., "Ready", "In Progress")
   * @returns Array of planning items with the specified status
   */
  private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
    const allItems = await this.loadAllPlanningItems();

    // Special handling for Archived status
    if (status === 'Archived') {
      // Return ALL items where isItemArchived() returns true
      // This includes items in plans/archive/ directory OR with status: Archived
      const archivedItems = allItems.filter(item => isItemArchived(item));

      this.outputChannel.appendLine(
        `[Archive] getItemsForStatus(Archived): ${archivedItems.length} items`
      );

      return archivedItems;
    }

    // Normal status - filter by status and exclude archived items
    return allItems.filter(item => {
      const matchesStatus = item.status === status;
      const isArchived = isItemArchived(item);

      // Include if matches status AND item is NOT archived
      // Archived items only appear in "Archived" status group
      return matchesStatus && !isArchived;
    });
  }

  /**
   * Loads all planning items from the plans/ directory (uncached version).
   *
   * This method performs the actual file system scan and parsing.
   * It should not be called directly - use loadAllPlanningItems() instead,
   * which provides caching.
   *
   * Scans the plans/ directory for .md files, parses frontmatter using
   * the cache, and converts to PlanningTreeItem objects.
   *
   * @returns Array of all planning items found in plans/
   */
  private async loadAllPlanningItemsUncached(): Promise<PlanningTreeItem[]> {
    try {
      // Scan plans/ directory for all .md files recursively
      const plansPath = path.join(this.workspaceRoot, 'plans');
      const pattern = new vscode.RelativePattern(plansPath, '**/*.md');

      // Find all markdown files
      const files = await vscode.workspace.findFiles(pattern);

      this.outputChannel.appendLine(`[TreeView] Found ${files.length} markdown files in plans/`);

      // Load and parse each file
      const items: PlanningTreeItem[] = [];

      for (const fileUri of files) {
        const filePath = fileUri.fsPath;

        // Parse frontmatter using cache
        const frontmatter = await this.cache.get(filePath);

        if (frontmatter) {
          // Convert Frontmatter to PlanningTreeItem
          const item: PlanningTreeItem = {
            item: frontmatter.item,
            title: frontmatter.title,
            type: frontmatter.type,
            status: frontmatter.status,
            priority: frontmatter.priority,
            filePath: filePath,
            parent: (frontmatter as any).parent, // Parent field for hierarchy
            dependencies: frontmatter.dependencies,
            spec: frontmatter.spec // S95: Path to spec directory for phase indicators
          };

          items.push(item);
        } else {
          // Parse failed - log warning and skip file
          const relativePath = path.relative(this.workspaceRoot, filePath);
          this.outputChannel.appendLine(`[TreeView] ⚠️  Skipping file with invalid frontmatter: ${relativePath}`);
        }
      }

      // Sort items by item number
      items.sort((a, b) => this.compareItemNumbers(a.item, b.item));

      this.outputChannel.appendLine(`[TreeView] Loaded ${items.length} planning items`);

      return items;

    } catch (error) {
      this.outputChannel.appendLine(`[TreeView] ❌ Error loading planning items: ${error}`);
      return [];
    }
  }

  /**
   * Loads all planning items from plans/ directory with caching.
   *
   * This is the primary entry point for accessing planning items.
   * It checks the cache first and only performs file system scan on cache miss.
   *
   * Cache hit: Returns cached data (O(1) operation, instant)
   * Cache miss: Scans file system, caches result, returns data
   *
   * Cache is invalidated by refresh() when file changes are detected.
   * This ensures data is always fresh while minimizing redundant file reads.
   *
   * Performance:
   * - Cache hit: < 1ms (array reference return)
   * - Cache miss: ~100-200ms for 100 files (file system scan + parsing)
   * - Hit rate: > 80% expected (multiple consumers per refresh cycle)
   *
   * @returns Array of all planning items (all types, all statuses)
   */
  private async loadAllPlanningItems(): Promise<PlanningTreeItem[]> {
    // Check cache first
    if (this.allItemsCache !== null) {
      // Cache hit - return cached data immediately
      this.outputChannel.appendLine('[ItemsCache] Cache HIT - returning cached items');
      return this.allItemsCache;
    }

    // Cache miss - load from file system
    this.outputChannel.appendLine('[ItemsCache] Cache MISS - loading from file system...');

    // Start timing
    const startTime = Date.now();

    // Load items using existing logic
    const items = await this.loadAllPlanningItemsUncached();

    // Calculate duration
    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(`[ItemsCache] Loaded ${items.length} items in ${duration}ms`);

    // Cache the result
    this.allItemsCache = items;

    return items;
  }

  /**
   * Compares two item numbers for sorting.
   *
   * Sorts by:
   * 1. Item type prefix (P, E, F, S, B)
   * 2. Item number (numeric comparison)
   *
   * Examples:
   * - P1 < E1 (Project before Epic)
   * - E1 < E2 (Lower number first)
   * - E2 < F1 (Epic before Feature)
   * - F5 < S1 (Feature before Story)
   * - S10 < B1 (Story before Bug)
   *
   * @param a - First item number
   * @param b - Second item number
   * @returns Negative if a < b, positive if a > b, zero if equal
   */
  private compareItemNumbers(a: string, b: string): number {
    // Extract prefix (P, E, F, S, B) and number
    const prefixA = a[0];
    const prefixB = b[0];
    const numberA = parseInt(a.substring(1), 10);
    const numberB = parseInt(b.substring(1), 10);

    // Define sort order for prefixes
    const prefixOrder: { [key: string]: number } = {
      'P': 1,
      'E': 2,
      'F': 3,
      'S': 4,
      'B': 5
    };

    // Compare by prefix first
    const orderA = prefixOrder[prefixA] ?? 999;
    const orderB = prefixOrder[prefixB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Same prefix - compare by number
    return numberA - numberB;
  }


  /**
   * Builds a formatted tooltip string for a planning item.
   *
   * Tooltip structure:
   * - Line 1: Item identifier and title (with [ARCHIVED] tag if archived)
   * - Line 2: Type, Status, Priority (pipe-separated)
   * - Line 3: Relative file path (for navigation context)
   *
   * Example (Active Item):
   * ```
   * E4 - Planning Kanban View
   * Type: epic | Status: In Progress | Priority: High
   * File: plans/epic-04-planning-kanban-view/epic.md
   * ```
   *
   * Example (Archived Item):
   * ```
   * S22 - Convert Manual Verification Scripts [ARCHIVED]
   * Type: story | Status: Archived | Priority: Low
   * File: plans/archive/epic-02/story-22-convert-scripts.md
   * ```
   *
   * Enhanced in S80: Adds [ARCHIVED] tag for archived items to improve
   * accessibility and provide explicit textual indication of archived status.
   *
   * @param element - Planning tree item
   * @returns Formatted tooltip string with metadata
   */
  private async buildTooltip(element: PlanningTreeItem): Promise<string> {
    // Calculate relative path from workspace root
    const relativePath = path.relative(this.workspaceRoot, element.filePath);

    // Check if item is archived (S80)
    const archivedTag = isItemArchived(element) ? ' [ARCHIVED]' : '';

    // Build tooltip with structured format
    const lines = [
      `${element.item} - ${element.title}${archivedTag}`,
      `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
      `File: ${relativePath}`
    ];

    // Add spec progress section if story has spec (S96)
    if (element.type === 'story' && element.spec) {
      // Get spec progress from cache (should be cache hit since getTreeItem() already called this)
      const specProgress = await this.getSpecProgressCached(element);

      if (specProgress) {
        // Add blank line separator
        lines.push('');

        // Add spec progress section
        lines.push('Spec Progress:');

        // Calculate relative spec directory path
        const relativeSpecDir = path.relative(this.workspaceRoot, specProgress.specDir);
        lines.push(`- Directory: ${relativeSpecDir}`);

        // Show phase progress
        lines.push(`- Phases: ${specProgress.completedPhases}/${specProgress.totalPhases} complete`);

        // Show spec status
        lines.push(`- Status: ${specProgress.specStatus}`);

        // Add sync warning if out of sync
        if (!specProgress.inSync) {
          lines.push('');
          lines.push('⚠️ Spec and Story status out of sync');
          lines.push('Run /sync to update story status');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Determines the collapsible state for a tree item based on its type.
   *
   * Collapsible state logic:
   * - Parent items (Project, Epic, Feature): Collapsed
   *   - These items can contain children in hierarchical view (F17)
   *   - Set to Collapsed even in flat tree (prepares for future hierarchy)
   * - Leaf items (Story, Bug, Spec, Phase): None
   *   - These items never have children (terminal nodes in hierarchy)
   *   - No collapse arrow shown
   *
   * Note: In current flat tree (S49), collapsible state has no effect because
   * getChildren() returns empty array for all items. However, setting the
   * correct state now avoids refactoring when hierarchy is implemented in F17.
   *
   * @param element - Planning tree item
   * @returns Collapsible state for the item
   */
  private getCollapsibleState(element: PlanningTreeItem): vscode.TreeItemCollapsibleState {
    // Parent types that can contain children in hierarchical view
    const parentTypes = ['project', 'epic', 'feature'];

    if (parentTypes.includes(element.type)) {
      return vscode.TreeItemCollapsibleState.Collapsed;
    }

    // Leaf types (story, bug, spec, phase) never have children
    return vscode.TreeItemCollapsibleState.None;
  }

  /**
   * Parses a file path to extract directory structure information.
   *
   * This method identifies epic and feature directories in the path hierarchy
   * to enable parent-child relationship detection for the TreeView.
   *
   * Path patterns:
   * - Epic: `plans/epic-XX-name/epic.md`
   * - Feature: `plans/epic-XX-name/feature-YY-name/feature.md`
   * - Story/Bug: `plans/epic-XX-name/feature-YY-name/story-ZZ-name.md`
   * - Orphan: `plans/story-ZZ-name.md` (no epic or feature dirs)
   *
   * Examples:
   * - Input: `/path/to/plans/epic-04-kanban-view/epic.md`
   *   Output: { epicDir: "epic-04-kanban-view", featureDir: null, fileName: "epic.md" }
   *
   * - Input: `/path/to/plans/epic-04-kanban-view/feature-16-foundation/feature.md`
   *   Output: { epicDir: "epic-04-kanban-view", featureDir: "feature-16-foundation", fileName: "feature.md" }
   *
   * - Input: `/path/to/plans/epic-04-kanban-view/feature-16-foundation/story-49-core.md`
   *   Output: { epicDir: "epic-04-kanban-view", featureDir: "feature-16-foundation", fileName: "story-49-core.md" }
   *
   * - Input: `/path/to/plans/story-19-standalone.md`
   *   Output: { epicDir: null, featureDir: null, fileName: "story-19-standalone.md" }
   *
   * @param filePath - Absolute path to the planning item file
   * @returns Parsed directory structure with epic/feature dirs and filename
   */
  private parseItemPath(filePath: string): ItemPathParts {
    // Extract path relative to workspace root
    const relativePath = path.relative(this.workspaceRoot, filePath);

    // Split path into parts (e.g., ["plans", "epic-04-kanban-view", "feature-16-foundation", "story-49-core.md"])
    const parts = relativePath.split(path.sep);

    // Initialize result
    const result: ItemPathParts = {
      projectDir: null,
      epicDir: null,
      featureDir: null,
      fileName: parts[parts.length - 1]
    };

    // Find project directory (matches "project-XX-*" pattern)
    const projectDirRegex = /^project-\d+-/;
    const projectDirIndex = parts.findIndex(part => projectDirRegex.test(part));
    if (projectDirIndex !== -1) {
      result.projectDir = parts[projectDirIndex];
    }

    // Find epic directory (matches "epic-XX-*" pattern)
    const epicDirRegex = /^epic-\d+-/;
    const epicDirIndex = parts.findIndex(part => epicDirRegex.test(part));
    if (epicDirIndex !== -1) {
      result.epicDir = parts[epicDirIndex];
    }

    // Find feature directory (matches "feature-XX-*" pattern)
    const featureDirRegex = /^feature-\d+-/;
    const featureDirIndex = parts.findIndex(part => featureDirRegex.test(part));
    if (featureDirIndex !== -1) {
      result.featureDir = parts[featureDirIndex];
    }

    return result;
  }

  /**
   * Builds hierarchical tree structure from flat list of planning items.
   *
   * This method parses file paths to detect parent-child relationships
   * and organizes items into a hierarchy following the directory structure:
   * - Epic → Feature → Story/Bug
   *
   * Algorithm:
   * 1. Group items by type using path parsing
   * 2. Create maps for quick lookup: epicDir → Epic, featureDir → Feature
   * 3. Build Epic nodes with child Features
   * 4. Build Feature nodes with child Stories/Bugs
   * 5. Collect orphan items (no parent directory)
   *
   * Example input (flat):
   * - E4 (epic-04-kanban-view/epic.md)
   * - F16 (epic-04-kanban-view/feature-16-foundation/feature.md)
   * - S49 (epic-04-kanban-view/feature-16-foundation/story-49-core.md)
   * - S19 (story-19-standalone.md)
   *
   * Example output (hierarchical):
   * - E4 (children: [F16])
   *   - F16 (children: [S49], parent: E4)
   *     - S49 (children: [], parent: F16)
   * - S19 (children: [], parent: null) [orphan]
   *
   * @param items - Flat array of planning items
   * @returns Array of root-level hierarchy nodes (epics + orphans)
   */
  private buildHierarchy(items: PlanningTreeItem[]): HierarchyNode[] {
    // Maps for quick lookup
    const projectMap = new Map<string, HierarchyNode>();   // item ID → Project node (NEW)
    const epicMap = new Map<string, HierarchyNode>();      // epicDir → Epic node
    const featureMap = new Map<string, HierarchyNode>();   // featureDir → Feature node
    const storyBugItems: PlanningTreeItem[] = [];          // Stories/bugs to process in Step 2
    const orphans: HierarchyNode[] = [];                   // Items with no parent

    // Step 1: Parse all items and categorize by type
    for (const item of items) {
      const pathParts = this.parseItemPath(item.filePath);

      // Create node for this item
      const node: HierarchyNode = {
        item: item,
        children: [],
        parent: null
      };

      // Categorize by item type and path structure
      // NEW: Handle projects (detected by type, not directory)
      if (item.type === 'project') {
        // Projects are indexed by their item ID (e.g., "P1", "P2")
        // because they live at root, not in subdirectories
        projectMap.set(item.item, node);
      } else if (item.type === 'epic' && pathParts.epicDir) {
        // Epic - store in epicMap for lookup
        epicMap.set(pathParts.epicDir, node);
      } else if (item.type === 'feature' && pathParts.featureDir) {
        // Feature - store in featureMap for lookup
        // Construct full feature path: epicDir/featureDir (or just featureDir if no epic)
        const featureKey = pathParts.epicDir
          ? `${pathParts.epicDir}/${pathParts.featureDir}`
          : pathParts.featureDir;
        featureMap.set(featureKey, node);
      } else if (item.type === 'story' || item.type === 'bug') {
        // Story/Bug - defer processing to Step 2 to avoid creating node twice
        storyBugItems.push(item);
      } else {
        // Specs, phases, or items without proper directory structure
        orphans.push(node);
      }
    }

    // Step 2: Build parent-child relationships
    const roots: HierarchyNode[] = [];

    // Process stories/bugs - attach to parent features
    for (const item of storyBugItems) {
      const pathParts = this.parseItemPath(item.filePath);
      const node: HierarchyNode = {
        item: item,
        children: [],
        parent: null
      };

      // Check if story/bug has 'parent' field in frontmatter (PRIMARY METHOD)
      if (item.parent) {
        const parentId = item.parent;

        // Find parent feature by ID (iterate through featureMap to find matching item ID)
        let parentFeature: HierarchyNode | undefined;
        for (const [key, featureNode] of featureMap) {
          if (featureNode.item.item === parentId) {
            parentFeature = featureNode;
            break;
          }
        }

        if (parentFeature) {
          node.parent = parentFeature;
          parentFeature.children.push(node);
        } else {
          this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent feature not found for ${item.item}: ${parentId}`);
          orphans.push(node);
        }
      }
      // FALLBACK: Use directory structure
      else if (pathParts.featureDir) {
        // Has parent feature - find it and attach
        const featureKey = pathParts.epicDir
          ? `${pathParts.epicDir}/${pathParts.featureDir}`
          : pathParts.featureDir;
        const parentFeature = featureMap.get(featureKey);

        if (parentFeature) {
          node.parent = parentFeature;
          parentFeature.children.push(node);
          this.outputChannel.appendLine(`[Hierarchy] Attached ${item.item} to feature (via directory - DEPRECATED)`);
        } else {
          // Feature not found (shouldn't happen, but handle gracefully)
          this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent feature not found for ${item.item}: ${featureKey}`);
          orphans.push(node);
        }
      } else {
        // No parent feature → orphan
        orphans.push(node);
      }
    }

    // Process features - attach to parent epics
    for (const [featureKey, featureNode] of featureMap) {
      const featureItem = featureNode.item;

      // Check if feature has 'parent' field in frontmatter (PRIMARY METHOD)
      if (featureItem.parent) {
        const parentId = featureItem.parent;

        // Find parent epic by ID (iterate through epicMap to find matching item ID)
        let parentEpic: HierarchyNode | undefined;
        for (const [key, epicNode] of epicMap) {
          if (epicNode.item.item === parentId) {
            parentEpic = epicNode;
            break;
          }
        }

        if (parentEpic) {
          featureNode.parent = parentEpic;
          parentEpic.children.push(featureNode);
        } else {
          this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent epic not found for ${featureItem.item}: ${parentId}`);
          roots.push(featureNode);
        }
      }
      // FALLBACK: Use directory structure
      else {
        const pathParts = this.parseItemPath(featureNode.item.filePath);

        if (pathParts.epicDir) {
          // Has parent epic - find it and attach
          const parentEpic = epicMap.get(pathParts.epicDir);

          if (parentEpic) {
            featureNode.parent = parentEpic;
            parentEpic.children.push(featureNode);
            this.outputChannel.appendLine(`[Hierarchy] Attached ${featureItem.item} to epic (via directory - DEPRECATED)`);
          } else {
            // Epic not found (shouldn't happen, but handle gracefully)
            this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent epic not found for ${featureNode.item.item}: ${pathParts.epicDir}`);
            roots.push(featureNode);
          }
        } else {
          // No parent epic → root-level feature
          roots.push(featureNode);
        }
      }
    }

    // NEW: Process epics - attach to parent projects
    for (const [epicDir, epicNode] of epicMap) {
      const epicItem = epicNode.item;

      // Check if epic has 'parent' field in frontmatter (PRIMARY METHOD)
      if (epicItem.parent) {
        const parentId = epicItem.parent;
        const parentProject = projectMap.get(parentId);

        if (parentProject) {
          epicNode.parent = parentProject;
          parentProject.children.push(epicNode);
          this.outputChannel.appendLine(`[Hierarchy] Attached ${epicItem.item} to project ${parentId} (via parent field)`);
        } else {
          this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent project not found for ${epicItem.item}: ${parentId}`);
          roots.push(epicNode); // Orphan epic
        }
      }
      // FALLBACK: Check if epic has dependencies that reference a project
      else if (epicItem.dependencies && epicItem.dependencies.length > 0) {
        // Find first project dependency (e.g., "P1", "P2")
        const projectDep = epicItem.dependencies.find(dep => dep.startsWith('P'));

        if (projectDep) {
          const parentProject = projectMap.get(projectDep);

          if (parentProject) {
            epicNode.parent = parentProject;
            parentProject.children.push(epicNode);
            this.outputChannel.appendLine(`[Hierarchy] Attached ${epicItem.item} to project ${projectDep} (via dependencies - DEPRECATED)`);
          } else {
            this.outputChannel.appendLine(`[Hierarchy] ⚠️  Parent project not found for ${epicItem.item}: ${projectDep}`);
            roots.push(epicNode); // Orphan epic
          }
        } else {
          // Epic has dependencies but none are projects → root-level epic
          roots.push(epicNode);
        }
      } else {
        // Epic has no parent or dependencies → root-level epic
        roots.push(epicNode);
      }
    }

    // Add all projects as root nodes (they have no parents)
    for (const projectNode of projectMap.values()) {
      roots.push(projectNode);
    }

    // Add all orphans as root nodes
    roots.push(...orphans);

    // Enhanced logging for debugging (F22)
    // Log hierarchy structure breakdown to diagnose missing items
    if (items.length > 0) {
      const totalItems = items.length;
      const projectCount = projectMap.size;
      const epicCount = epicMap.size;
      const featureCount = featureMap.size;
      const storyBugCount = storyBugItems.length;
      const orphanCount = orphans.length;
      const rootCount = roots.length;

      this.outputChannel.appendLine(`[Hierarchy] buildHierarchy summary:`);
      this.outputChannel.appendLine(`  - Total items: ${totalItems}`);
      this.outputChannel.appendLine(`  - Projects: ${projectCount}, Epics: ${epicCount}, Features: ${featureCount}, Stories/Bugs: ${storyBugCount}`);
      this.outputChannel.appendLine(`  - Orphans: ${orphanCount} (items without parents)`);
      this.outputChannel.appendLine(`  - Root nodes: ${rootCount}`);

      // Log first few orphans for debugging
      if (orphanCount > 0) {
        this.outputChannel.appendLine(`  - First orphans: ${orphans.slice(0, 5).map(n => n.item.item).join(', ')}`);
      }
    }

    // Step 3: Sort root nodes and children by item number
    this.sortHierarchyNodes(roots);

    return roots;
  }

  /**
   * Recursively sorts hierarchy nodes by item number.
   *
   * Sorts in place:
   * - Root-level items by item number
   * - Children of each node by item number (recursive)
   *
   * Sort order follows existing compareItemNumbers() logic:
   * P1 < E1 < F1 < S1 < B1 (type prefix), then by number
   *
   * @param nodes - Array of hierarchy nodes to sort
   */
  private sortHierarchyNodes(nodes: HierarchyNode[]): void {
    // Sort current level by item number
    nodes.sort((a, b) => this.compareItemNumbers(a.item.item, b.item.item));

    // Recursively sort children
    for (const node of nodes) {
      if (node.children.length > 0) {
        this.sortHierarchyNodes(node.children);
      }
    }
  }

  /**
   * Gets or builds hierarchy for a specific status group.
   *
   * Checks cache first. If not cached, loads items, builds hierarchy,
   * caches result, and returns.
   *
   * @param status - Status to get hierarchy for
   * @returns Array of root-level hierarchy nodes
   */
  private async getHierarchyForStatus(status: Status): Promise<HierarchyNode[]> {
    // Check cache
    if (this.hierarchyCache.has(status)) {
      const cached = this.hierarchyCache.get(status)!;
      this.outputChannel.appendLine(`[Hierarchy] Cache hit for status: ${status} (${cached.length} root nodes)`);
      return cached;
    }

    // Cache miss - build hierarchy
    this.outputChannel.appendLine(`[Hierarchy] Cache miss for status: ${status}, building...`);

    const hierarchyStartTime = Date.now();

    // Load items for this status (uses existing method)
    const items = await this.getItemsForStatus(status);

    // Enhanced logging for debugging (F22)
    this.outputChannel.appendLine(`[Hierarchy] getItemsForStatus(${status}) returned ${items.length} items`);
    if (status === 'Archived' && items.length > 0) {
      this.outputChannel.appendLine(`[Hierarchy] First 5 archived items: ${items.slice(0, 5).map(i => i.item).join(', ')}`);
    }

    // Build hierarchy
    const hierarchy = this.buildHierarchy(items);

    const hierarchyDuration = Date.now() - hierarchyStartTime;

    // Cache result
    this.hierarchyCache.set(status, hierarchy);

    // Build progress cache ONCE per refresh (S91)
    // Must use ALL items (not just status-filtered) because parents may be in different status groups
    if (this.progressCache.size === 0) {
      const allItems = await this.loadAllPlanningItems();
      await this.buildProgressCache(allItems);
    }

    this.outputChannel.appendLine(`[Hierarchy] Built hierarchy for ${status}: ${hierarchy.length} root nodes in ${hierarchyDuration}ms`);

    // Enhanced logging for debugging (F22)
    if (status === 'Archived') {
      this.outputChannel.appendLine(`[Hierarchy] Archived hierarchy breakdown:`);
      this.outputChannel.appendLine(`  - Root nodes: ${hierarchy.length}`);
      this.outputChannel.appendLine(`  - Root items: ${hierarchy.map(n => n.item.item).join(', ')}`);
    }

    return hierarchy;
  }

  /**
   * Returns child items for a planning item in the hierarchy.
   *
   * This method is called when a parent item (epic or feature) is expanded
   * in the TreeView. It finds the corresponding HierarchyNode and returns
   * its children as PlanningTreeItem array for VSCode to display.
   *
   * Flow:
   * 1. Get or build hierarchy for the item's status group
   * 2. Find the node matching the item
   * 3. Extract children and convert to PlanningTreeItem array
   *
   * @param item - Parent planning item to get children for
   * @returns Array of child planning items (empty if no children)
   */
  private async getChildrenForItem(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
    let hierarchy: HierarchyNode[];

    // In hierarchy view mode, use the full hierarchy (not filtered by status)
    if (this.viewMode === 'hierarchy') {
      // Load all items and build complete hierarchy
      const allItems = await this.loadAllPlanningItems();

      // Filter archived items if toggle is OFF
      let filteredItems = allItems;
      if (!this.showArchivedItems) {
        filteredItems = allItems.filter(item => !isItemArchived(item));
      }

      // Build full hierarchy across all statuses
      hierarchy = this.buildHierarchy(filteredItems);
    } else {
      // In status view mode, use hierarchy filtered by status
      // Determine effective status for hierarchy lookup (F22 fix)
      // Archived items (by directory or status) should use 'Archived' hierarchy
      // instead of their frontmatter status (e.g., E3 with status:Completed in archive/ dir)
      const effectiveStatus = isItemArchived(item) ? 'Archived' : item.status;

      // Get hierarchy for this item's effective status
      hierarchy = await this.getHierarchyForStatus(effectiveStatus);
    }

    // Find the node for this item
    const node = this.findNodeInHierarchy(hierarchy, item);

    if (!node) {
      this.outputChannel.appendLine(`[Hierarchy] ⚠️  Node not found for ${item.item} (status: ${item.status}, viewMode: ${this.viewMode})`);
      return [];
    }

    // Return children as PlanningTreeItem array
    const children = node.children.map(child => child.item);
    this.outputChannel.appendLine(`[Hierarchy] Returning ${children.length} children for ${item.item} (viewMode: ${this.viewMode})`);
    return children;
  }

  /**
   * Finds a specific item's node in the hierarchy tree.
   *
   * Performs depth-first search to locate the node matching the given item.
   * Matches by item identifier (unique within workspace).
   *
   * @param hierarchy - Root-level hierarchy nodes to search
   * @param item - Item to find
   * @returns Hierarchy node if found, null otherwise
   */
  private findNodeInHierarchy(hierarchy: HierarchyNode[], item: PlanningTreeItem): HierarchyNode | null {
    for (const node of hierarchy) {
      // Check if this node matches
      if (node.item.item === item.item) {
        return node;
      }

      // Recursively search children
      if (node.children.length > 0) {
        const found = this.findNodeInHierarchy(node.children, item);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Builds progress cache for all parent items (S91).
   *
   * Eagerly calculates progress for Epics, Features, and Projects to avoid
   * redundant calculations during TreeView rendering. Cache is populated once
   * per refresh cycle after hierarchy construction.
   *
   * Performance: O(N) where N = number of parent items (typically 10-30% of total).
   * Target: < 50ms with 100 items.
   *
   * @param items - All planning items in workspace
   */
  private async buildProgressCache(items: PlanningTreeItem[]): Promise<void> {
    const start = Date.now();
    let parentsCached = 0;
    let leafsCached = 0;

    try {
      for (const item of items) {
        if (item.type === 'epic' || item.type === 'feature' || item.type === 'project') {
          // Parent items: Calculate progress
          try {
            const progress = await this.calculateProgress(item);
            if (progress !== null) {
              parentsCached++;
            }
          } catch (itemError) {
            // Log error but continue with other items
            this.outputChannel.appendLine(
              `[ProgressCache] ⚠️ Failed to calculate progress for ${item.item}: ${itemError}`
            );
          }
        } else if (item.type === 'story' || item.type === 'bug') {
          // Leaf items: Store null (no progress to calculate)
          this.progressCache.set(item.item, null);
          leafsCached++;
        }
      }

      const elapsed = Date.now() - start;
      this.outputChannel.appendLine(
        `[ProgressCache] Built cache for ${parentsCached} parents + ${leafsCached} leaves in ${elapsed}ms`
      );
    } catch (error) {
      // Cache build failed entirely - log but don't crash
      this.outputChannel.appendLine(`[ProgressCache] ❌ Cache build failed: ${error}`);
      // TreeView will fall back to lazy calculation
    }
  }

  /**
   * Calculates progress for a parent item (Epic or Feature).
   *
   * Progress is determined by counting completed children:
   * - Epic: Percentage of Features with status "Completed"
   * - Feature: Percentage of Stories/Bugs with status "Completed"
   *
   * Uses cached hierarchy to avoid file system reads. Returns null
   * if the item has no children (nothing to calculate).
   *
   * Display format: "(completed/total)" - e.g., "(3/5)"
   * Alternative formats commented for future enhancement:
   * - Percentage only: "(60%)"
   * - Combined: "(3/5 - 60%)"
   *
   * @param item - Parent planning item (epic or feature)
   * @returns Progress information, or null if no children
   */
  private async calculateProgress(item: PlanningTreeItem): Promise<ProgressInfo | null> {
    // Check cache first for O(1) lookup
    if (this.progressCache.has(item.item)) {
      this.progressCacheHits++;
      return this.progressCache.get(item.item)!;
    }

    this.progressCacheMisses++;

    // Get all direct children of this item
    const children = await this.getDirectChildren(item);

    if (children.length === 0) {
      // No children - no progress to calculate
      return null;
    }

    // Count completed children
    const completed = children.filter(child => child.status === 'Completed').length;
    const total = children.length;
    const percentage = Math.round((completed / total) * 100);

    // Format display string (count format)
    const display = `(${completed}/${total})`;

    // Alternative display formats (for future consideration):
    // const display = `(${percentage}%)`;  // Percentage only
    // const display = `(${completed}/${total} - ${percentage}%)`;  // Combined

    // Build progress info object
    const progress: ProgressInfo = {
      completed,
      total,
      percentage,
      display
    };

    // Cache result for subsequent calls
    this.progressCache.set(item.item, progress);

    this.outputChannel.appendLine(`[Progress] Calculated for ${item.item}: ${display}`);

    return progress;
  }

  /**
   * Returns direct children of an item from the hierarchy.
   *
   * This method extracts the children array from the HierarchyNode
   * corresponding to the given item. Used by progress calculation
   * to count completed children.
   *
   * Children are filtered from cached hierarchy, avoiding file system reads.
   *
   * Examples:
   * - Epic → Features (children in hierarchy)
   * - Feature → Stories/Bugs (children in hierarchy)
   * - Story/Bug → Empty array (leaf nodes)
   *
   * @param item - Parent planning item to get children for
   * @returns Array of child planning items (empty if no children)
   */
  private async getDirectChildren(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
    // Determine effective status for hierarchy lookup (F22 fix)
    // Archived items (by directory or status) should use 'Archived' hierarchy
    // instead of their frontmatter status (e.g., E3 with status:Completed in archive/ dir)
    const effectiveStatus = isItemArchived(item) ? 'Archived' : item.status;

    // Get hierarchy for this item's effective status
    const hierarchy = await this.getHierarchyForStatus(effectiveStatus);

    // Find the node for this item
    const node = this.findNodeInHierarchy(hierarchy, item);

    if (!node) {
      this.outputChannel.appendLine(`[Progress] ⚠️  Node not found for ${item.item} (status: ${item.status}, effective: ${effectiveStatus})`);
      return [];
    }

    // Extract children as PlanningTreeItem array
    return node.children.map(child => child.item);
  }

  /**
   * Disposes of resources when extension is deactivated (S72).
   *
   * Cleanup Steps:
   * 1. Cancel pending debounced refresh timer (if any)
   * 2. Optionally execute pending refresh before cleanup
   *    (ensures final state is persisted)
   *
   * This prevents memory leaks from uncancelled timers and ensures
   * pending refreshes complete before extension unloads.
   *
   * Called automatically by VSCode when extension deactivates.
   */
  dispose(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Debounce timer cleared (extension deactivating)');

      // Execute pending refresh before cleanup (ensure final state persisted)
      // This is a judgment call - can be removed if you prefer
      // to skip pending refreshes on deactivation
      this.refresh();

      this.refreshDebounceTimer = undefined;
    }

    this.outputChannel.appendLine('[TreeView] PlanningTreeProvider disposed');
  }
}
